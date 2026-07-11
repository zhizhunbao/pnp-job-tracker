"""
09 — build the MART (数据仓库集市层): 把清洗好的各源拼成「列和 DB 表一一对应」的最终表。
seed 从此只读 mart 直接灌库,不再在加载器里东拼西凑(中介过滤/去重/评分关联都下沉到这)。

产出 data/mart/(每个文件 = 一张 Payload 表):
  事实表  companies.json  jobs.json
  维度表  provinces.json  cities.json  districts.json  designated_employers.json

Usage:  uv run python etl/09_build_mart.py
"""
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402
import noc as NOC  # noqa: E402  NOC 分类法(单一来源)

# 公司名归一(o/a 前缀、公司后缀、标点)单一来源在 clean/05c —— LMIA 匹配与 AIP 用同一把尺子
_spec = importlib.util.spec_from_file_location("flag_aip", Path(__file__).resolve().parent / "clean" / "05c_flag_aip.py")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
norm_name = _mod.norm_name

# ── 输入/输出全路径 ──────────────────────────────────────────────
IN_JOBBANK = _paths.PROCESSED_JOBBANK / "postings.json"
IN_ATS_COMPANIES = _paths.COMPANIES                       # processed/ats/.../companies/<slug>/
IN_SCORED = _paths.PROCESSED / "all-scored.json"
IN_AIP = _paths.AIP / "aip-designated-employers.json"
IN_WAGES = _paths.WAGES / "wages.json"   # NOC×省 中位工资(build_wages.py 从 ESDC 开放数据建)
IN_PNP = _paths.PNP                      # raw/pnp/*.json(各省具名通道:每文件一条通道)
IN_PNP_DRAWS = _paths.PNP / "draws.json"  # 省抽选事实(BC/AB/MB+ON通告,build_draws.py 产,E6-04)
IN_EE = _paths.EE / "federal-categories.json"  # 联邦 Express Entry 类别抽选(全国单一源)
IN_EE_DRAWS = _paths.EE / "draws.json"          # 各类别最近一次抽选(CRS/日期/邀请数,build_ee_draws.py 产)
IN_NOC_DESC = _paths.NOC / "descriptions.json"  # NOC 官方名+主要职责(build_noc_descriptions.py 产)
IN_FIELD_SOURCES = _paths.RAW / "sources" / "field-sources.json"  # 字段级来源注册表(build_field_sources.py 产,E4-04)
IN_LMIA = _paths.LMIA / "lmia-employers.json"   # ESDC 正面 LMIA 雇主聚合(build_lmia.py 产,E6-02)
IN_ENRICH = _paths.PROCESSED / "company_enrich.json"  # 公司官网富化(简介/行业,enrich_companies.py 产,E8-04)
OUT_MART = _paths.DATA / "mart"

PROV_FULL = {
    "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia", "AB": "Alberta",
    "SK": "Saskatchewan", "MB": "Manitoba", "NB": "New Brunswick", "NS": "Nova Scotia",
    "NL": "Newfoundland and Labrador", "PE": "Prince Edward Island",
}
AGENCY = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad|source code|manpower", re.I)
# Job Bank 官方中介标记(第 17 轮 #41 拍板「视同中介整帖过滤」):帖面这句提示会被黏进 title,
# 出现即中介代发,零误报——比公司名正则可靠(Manpower/Rapihire/The Hiring Partner 等全靠它抓出)
AGENCY_NOTE = "this job posting is posted by a recruitment agency"
SKIP_SLUGS = {"cmc-microsystems"}
# 来源显示标签清洗:JB 聚合的各原始板统一显示「Job Bank」;ATS 板美化。原始 source 仍保留。
SOURCE_PRETTY = {"lever": "Lever", "bamboohr": "BambooHR", "greenhouse": "Greenhouse",
                 "smartrecruiters": "SmartRecruiters", "workable": "Workable", "recruitee": "Recruitee",
                 "myworkdayjobs": "Workday", "workday": "Workday"}


def source_label(apply_url: str, source: str) -> str:
    if apply_url and "jobbank.gc.ca" in apply_url.lower():
        return "Job Bank"
    return SOURCE_PRETTY.get((source or "").lower(), source or "—")


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "company"


def norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (t or "").lower())


def guess_prov(loc: str) -> str:
    return "ON" if re.search(r"\b(on|ontario)\b", loc or "", re.I) else ""


# ── JD 正文下沉:把已抓的职位描述 .md 灌进 job.description(去掉前端/顾问的运行时文件依赖)──
def build_jd_index() -> dict:
    """扫已抓的 JD .md(processed/jobbank/details + processed/ats),按 frontmatter `url` 建 url→路径 索引。"""
    idx: dict[str, "object"] = {}
    for root in (_paths.PROCESSED / "jobbank" / "details", _paths.PROCESSED_ATS):
        if not root.exists():
            continue
        for p in root.rglob("*.md"):
            try:
                head = p.read_text(encoding="utf-8", errors="replace")[:600]
            except Exception:  # noqa: BLE001
                continue
            m = re.search(r"^url:\s*(.+)$", head, re.M)
            if m:
                idx.setdefault(m.group(1).strip(), p)
    return idx


# Job Bank 页面样板噪音(E8-04 文案审计,2026-07-07 用户点名「莫名其妙+重复」):
# 帮助浮层(「Green job – Help」×3)/通用解释/免责腿被抓进 JD 正文。按行剔除 + 长行全局去重。
JD_NOISE = [
    re.compile(r"–\s*Help\b", re.I),   # tooltip 标题行(xxx – Help,JB 用长横线;不匹配连字符,防误杀「- Help customers」类真内容)
    re.compile(r"^Green jobs contribute to environmental", re.I),          # 通用解释(非本岗内容)
    re.compile(r"Learn more about green jobs", re.I),
    re.compile(r"provided by the employer; it was not verified by Job Bank", re.I),
]


def clean_jd(text: str) -> str:
    """剔样板行 + 去重复长行(同一行在正文出现多次=抓取浮层伪影,首现保留)。"""
    seen: set[str] = set()
    out: list[str] = []
    for line in text.split("\n"):
        s = line.strip()
        if s and any(p.search(s) for p in JD_NOISE):
            continue
        if len(s) > 40:  # 只对长行去重,短行(Yes/标签)合法重复
            if s in seen:
                continue
            seen.add(s)
        out.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def iso_date(v) -> str | None:
    """日期串归一 ISO(YYYY-MM-DD)。认:ISO(原样)/「June 26, 2026」(Job Bank 展示格式);认不出=原样保留(宁可不猜)。"""
    s = (str(v) if v is not None else "").strip()
    if not s:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    try:
        return datetime.strptime(s, "%B %d, %Y").date().isoformat()
    except ValueError:
        return s


def jd_body(path) -> str | None:
    """读 .md → 去 frontmatter → 清样板噪音 → 正文(与 jobtext/advisor 同口径)。"""
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return None
    body = re.sub(r"^---.*?\n---\s*", "", raw, count=1, flags=re.S).strip()
    return clean_jd(body) or None


def build():
    scored = {}
    if IN_SCORED.exists():
        scored = {s["externalId"]: s for s in json.loads(IN_SCORED.read_text(encoding="utf-8"))}
    wages = json.loads(IN_WAGES.read_text(encoding="utf-8")) if IN_WAGES.exists() else {}

    # 公司官网富化(E8-04):slug → 简介/行业(enrich_companies.py 逐轮累积)。
    # 取:抓到简介的(ok)+ 找官网阶梯命中但简介待抓/抓失败的(found 带 website——官网本身就有展示价值)
    enrich = {}
    if IN_ENRICH.exists():
        enrich = {sl: c for sl, c in json.loads(IN_ENRICH.read_text(encoding="utf-8")).items()
                  if c.get("status") == "ok" or (c.get("found") and c.get("website"))}

    companies: dict[str, dict] = {}   # slug -> company row
    jobs: list[dict] = []
    seen: set[str] = set()            # company-slug|title 去重
    seen_ext: set[str] = set()        # externalId 去重

    def add_company(name, slug, **extra):
        if slug not in companies:
            # 富化并入(Job Bank 公司无 profile;ATS 已自带 profile 的 description/sectors 优先,富化只填空)
            en = enrich.get(slug, {})
            for k in ("description", "sectors", "website"):
                if not extra.get(k) and en.get(k):
                    extra[k] = en[k]
                    if k == "website" and en.get("found"):
                        extra["websiteSource"] = en["found"]  # jd/searched(searched 前端加小字,D2)
            companies[slug] = {"slug": slug, "name": name, **{k: v for k, v in extra.items() if v}}

    def add_job(external_id, company_slug, **fields):
        if external_id in seen_ext:
            return
        seen_ext.add(external_id)
        # datePosted 归一 ISO(2026-07-07 全站走查):Job Bank 原样是「June 26, 2026」英文串——
        # DB date 列灌入时被 Postgres 悄悄解析所以列表没炸,但 10/11 拿它和 ISO 做字符串比较永真
        # (weekly-top 全库入池、stats 7天新增=在招总数),前端 slice(0,10) 还截出「June 26, 2」。单点断根。
        fields["datePosted"] = iso_date(fields.get("datePosted"))
        sc = scored.get(external_id, {})
        cls = NOC.classify(sc.get("noc"))  # noc → teer/broad/mid/fine(分类法在 etl/noc.py)
        # 该 NOC 当地中位工资:优先省级,无则国家级(ESDC 开放数据)
        wnoc = wages.get(sc.get("noc") or "", {})
        w = wnoc.get(fields.get("province", "")) or wnoc.get("NAT") or {}
        jobs.append({
            "externalId": external_id, "companySlug": company_slug,
            **{k: v for k, v in fields.items() if v not in (None, "")},
            "sourceLabel": source_label(fields.get("applyUrl", ""), fields.get("source", "")),
            "wageMedHourly": w.get("hourly"), "wageMedAnnual": w.get("annual"),
            "wageLowHourly": w.get("lowHourly"), "wageLowAnnual": w.get("lowAnnual"),
            "wageHighHourly": w.get("highHourly"), "wageHighAnnual": w.get("highAnnual"),
            "wageYear": w.get("year"),
            "noc": sc.get("noc") or None, "category": cls["teerLabel"],
            "teer": cls["teer"], "broad": cls["broad"], "mid": cls["mid"], "fine": cls["fine"],
            "accessibility": sc.get("accessibility") or None, "score": sc.get("score"),
            "pnpEligible": bool(sc.get("pnpEligible")), "pnpStream": sc.get("pnpStream") or None,
            "eeCategory": sc.get("eeCategory") or None, "status": "open",
        })

    # 1) ATS 公司岗(processed/ats/.../companies/<slug>/)
    if IN_ATS_COMPANIES.exists():
        for cdir in sorted(IN_ATS_COMPANIES.iterdir()):
            if not cdir.is_dir() or cdir.name in SKIP_SLUGS:
                continue
            pf, jf = cdir / "profile.json", cdir / "jobs.json"
            if not (pf.exists() and jf.exists()):
                continue
            prof = json.loads(pf.read_text(encoding="utf-8"))
            jd = json.loads(jf.read_text(encoding="utf-8"))
            if not jd.get("jobs"):
                continue
            slug = prof.get("slug") or cdir.name
            add_company(prof.get("name") or slug, slug, website=prof.get("website"),
                        email=prof.get("email"), address=prof.get("address"),
                        sectors=prof.get("sectors"), description=prof.get("description"),
                        region=prof.get("region"), source="ats")
            # ATS 的抓取时刻 = jobs.json 落盘时间(04 每轮整写);与 JB 的 last_seen 同义
            ats_seen = datetime.fromtimestamp(jf.stat().st_mtime, tz=timezone.utc).isoformat().replace("+00:00", "Z")
            for j in jd["jobs"]:
                key = f"{slug}|{norm(j.get('title',''))}"
                if key in seen:
                    continue
                seen.add(key)
                ext = j.get("url") or key
                add_job(ext, slug, title=j.get("title"), source=jd.get("ats") or "ats", origin="ats",
                        country=j.get("country"), province=j.get("province") or guess_prov(j.get("location", "")),
                        city=j.get("city"), district=j.get("district"), address=j.get("address"),
                        applyUrl=j.get("url"), officialUrl=prof.get("website"),
                        salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                        aip=bool(j.get("aip")), datePosted=j.get("posted"), lastSeen=ats_seen)

    # 2) Job Bank(全国全职业)
    if IN_JOBBANK.exists():
        for j in json.loads(IN_JOBBANK.read_text(encoding="utf-8")):
            if AGENCY.search(j.get("employer", "")):  # 跳过中介
                continue
            if AGENCY_NOTE in (j.get("title") or "").lower():  # 中介代发标记(#41):整帖过滤
                continue
            cslug = slugify(j.get("employer") or "unknown")
            key = f"{cslug}|{norm(j.get('title',''))}"
            if key in seen:
                continue
            seen.add(key)
            add_company(j.get("employer") or "—", cslug, website=j.get("website"),
                        address=j.get("address"), region=j.get("province"), source="jobbank")
            # 稳定 ID:Job Bank 帖子 ID(posting_id 字段优先,否则从 URL 的 /jobposting/<id> 取),
            # 不用含 ?source= 查询串的完整 URL(见 docs/source-framework.md)
            m = re.search(r"/jobposting/(\d+)", j.get("url", ""))
            pid = str(j.get("posting_id") or (m.group(1) if m else ""))
            ext = f"jb:{pid}" if pid else (j.get("url") or key)
            add_job(ext, cslug, title=j.get("title"), source=j.get("source") or "Job Bank", origin="jobbank",
                    country=j.get("country"), province=j.get("province") or guess_prov(j.get("city", "")),
                    city=j.get("city"), district=j.get("district"), address=j.get("address"),
                    applyUrl=j.get("url"), officialUrl=j.get("website"),
                    salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                    aip=bool(j.get("aip")), datePosted=j.get("date"), lastSeen=j.get("last_seen"))

    # LMIA 外劳雇佣记录(E6-02):按 norm_name 精确匹配(3.2 统计:公司命中 18.2%,抽检零误报)。
    # 只挂 companies(列表 SQL 已 join companies,jobs 零改动);语义=历史事实,展示层必须带股别/季度。
    if IN_LMIA.exists():
        lmia = json.loads(IN_LMIA.read_text(encoding="utf-8")).get("employers", {})
        lmia_hit = 0
        for c in companies.values():
            e = lmia.get(norm_name(c.get("name", "")))
            if not e:
                continue
            streams = sorted(((s.strip(), n) for s, n in e["streams"].items()), key=lambda t: -t[1])
            c["lmiaPositions"] = e["positions"]
            c["lmiaLmias"] = e["lmias"]
            c["lmiaLastQuarter"] = e["lastQuarter"]
            c["lmiaStreams"] = " · ".join(f"{s} {n}" for s, n in streams[:3])
            c["lmiaPositionsSkilled"] = e.get("positionsSkilled", 0)  # 非农业/季节股(仅榜单口径用,不进 DB)
            lmia_hit += 1
        print(f"  LMIA 雇佣记录匹配: {lmia_hit}/{len(companies)} 公司")

    # JD 正文下沉到 DB:按 applyUrl 匹配已抓的 .md → job.description(seed 自动透传;列表 SQL 不读它)
    jd_idx = build_jd_index()
    matched = 0
    for j in jobs:
        p = jd_idx.get(j.get("applyUrl", ""))
        body = jd_body(p) if p else None
        if body:
            j["description"] = body
            matched += 1
    print(f"  JD 正文匹配: {matched}/{len(jobs)} 岗写入 description")

    # ── 维度表 ──
    provinces = [{"code": c, "name": n} for c, n in PROV_FULL.items()]
    city_keys = sorted({(j.get("city"), j.get("province")) for j in jobs if j.get("city")},
                       key=lambda t: (t[0] or "", t[1] or ""))
    cities = [{"name": c, "province": p or ""} for c, p in city_keys]
    # 区维度也从 job 数据洗(district 由 04c 从地址/邮编归一);只列实际有岗的区
    dist_keys = sorted({(j.get("district"), j.get("city"), j.get("province")) for j in jobs if j.get("district")},
                       key=lambda t: (t[0] or "", t[1] or "", t[2] or ""))
    districts = [{"name": d, "city": c or "", "province": p or ""} for d, c, p in dist_keys]
    designated = []
    if IN_AIP.exists():
        for e in json.loads(IN_AIP.read_text(encoding="utf-8")):
            designated.append({"name": e.get("employer"), "province": e.get("province"),
                               "location": e.get("location"), "isTech": bool(e.get("tech")), "source": "AIP"})

    # NOC 分类维度(大/中/小 + TEER,数据集出现的层级组合)
    cat_keys = sorted({(j["broad"], j["mid"], j["fine"], j["teer"] if j["teer"] is not None else -1) for j in jobs})
    noc_categories = [{"broad": b, "mid": m, "fine": f, "teer": (t if t >= 0 else None)} for b, m, f, t in cat_keys]
    sources = [{"name": s} for s in sorted({j.get("sourceLabel") for j in jobs if j.get("sourceLabel")})]
    experience_levels = [{"name": e} for e in sorted({j.get("accessibility") for j in jobs if j.get("accessibility")})]

    # 省提名通道维度(每行=某通道内一个职业;前端按 province+label 分组渲染清单/高亮)
    pnp_occupations = []
    if IN_PNP.exists():
        for f in sorted(IN_PNP.glob("*.json")):
            try:
                d = json.loads(f.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            prov, label = d.get("province"), d.get("label") or d.get("stream")
            if not (prov and label):
                continue
            for o in d.get("occupations", []):
                if o.get("noc"):
                    pnp_occupations.append({
                        "province": prov, "stream": d.get("stream", ""), "label": label,
                        "type": d.get("type", "indemand"), "url": d.get("url", ""), "fetched": d.get("fetched", ""),
                        "noc": o["noc"], "name": o.get("name", ""), "gtaRestricted": bool(o.get("gtaRestricted"))})

    # 省 PNP 抽选事实维度(E6-04):每行=一省一次抽选(kind=draw)或改制通告(kind=notice)。
    # 各省分制互不相通且都非 CRS(scale 标注),纯事实展示层,不进评分/匹配。每省 ≤8 条,全量历史在 raw。
    pnp_draws = []
    if IN_PNP_DRAWS.exists():
        try:
            pd = json.loads(IN_PNP_DRAWS.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pd = {}
        for prov, v in pd.get("provinces", {}).items():
            base = {"province": prov, "label": v.get("label", ""), "scale": v.get("scale"),
                    "url": v.get("url", ""), "fetched": pd.get("fetched", "")}
            for dr in v.get("draws", [])[:8]:
                pnp_draws.append({**base, "kind": "draw", "drawDate": dr.get("date"),
                                  "stream": dr.get("stream", ""), "score": dr.get("score"),
                                  "invitations": dr.get("invitations"), "note": dr.get("note", "")})
            if v.get("notice"):
                pnp_draws.append({**base, "kind": "notice", "drawDate": v["notice"].get("date"),
                                  "stream": "", "score": None, "invitations": None,
                                  "note": v["notice"].get("note", "")})

    # 各类别最近抽选(CRS/日期/邀请数)—— join 进每行,EE 弹框显示「近期抽选」
    ee_draws = {}
    if IN_EE_DRAWS.exists():
        try:
            ee_draws = json.loads(IN_EE_DRAWS.read_text(encoding="utf-8")).get("byCategory", {})
        except Exception:  # noqa: BLE001
            ee_draws = {}

    # 联邦 EE 类别维度(每行=某类别内一个职业)
    ee_categories = []
    if IN_EE.exists():
        try:
            d = json.loads(IN_EE.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            d = {}
        for c in d.get("categories", []):
            dr = ee_draws.get(c.get("key", ""), {})
            for o in c.get("occupations", []):
                if o.get("noc"):
                    ee_categories.append({
                        "category": c.get("key", ""), "label": c.get("label", ""),
                        "url": d.get("url", ""), "fetched": d.get("fetched", ""),
                        "noc": o["noc"], "teer": o.get("teer"), "title": o.get("title", ""),
                        "drawCrs": dr.get("crs"), "drawDate": dr.get("date"), "drawSize": dr.get("size")})

    # NOC 官方名+主要职责维度(只收数据集出现过的 NOC,控制前端 payload;duties/requirements 存换行拼接文本)
    noc_descriptions = []
    if IN_NOC_DESC.exists():
        try:
            nd = json.loads(IN_NOC_DESC.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            nd = {}
        fetched = nd.get("fetched", "")
        used_nocs = {j.get("noc") for j in jobs if j.get("noc")}
        for n, v in nd.get("byNoc", {}).items():
            if n in used_nocs:
                noc_descriptions.append({
                    "noc": n, "title": v.get("title", ""),
                    "duties": "\n".join(v.get("duties", [])),
                    "requirements": "\n".join(v.get("requirements", [])),
                    "fetched": fetched})

    # 字段级来源维度(E4-04):build_field_sources.py 已抓取验证,这里直通(缺文件→空表,宁可留空)
    field_sources = []
    if IN_FIELD_SOURCES.exists():
        try:
            field_sources = json.loads(IN_FIELD_SOURCES.read_text(encoding="utf-8")).get("rows", [])
        except Exception:  # noqa: BLE001
            field_sources = []

    return {
        "companies": list(companies.values()), "jobs": jobs,
        "provinces": provinces, "cities": cities, "districts": districts,
        "designated_employers": designated,
        "noc_categories": noc_categories, "sources": sources, "experience_levels": experience_levels,
        "pnp_occupations": pnp_occupations, "pnp_draws": pnp_draws, "ee_categories": ee_categories,
        "noc_descriptions": noc_descriptions,
        "field_sources": field_sources,
    }


def main() -> None:
    OUT_MART.mkdir(parents=True, exist_ok=True)
    mart = build()
    for table, rows in mart.items():
        (OUT_MART / f"{table}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print("MART built →", OUT_MART)
    for table, rows in mart.items():
        print(f"  {table:22} {len(rows):5} 行")


if __name__ == "__main__":
    main()
