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
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402
import noc as NOC  # noqa: E402  NOC 分类法(单一来源)
import grades as GR  # noqa: E402  E12-08 档位(1-5,单一来源;职位三维+公司四维)
from clean import visa_flag  # noqa: E402  GAP1③ 身份预筛(JD 正文 → 红旗+quote)

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
IN_DLI = _paths.DLI / "dli.json"                # PGWP 可申 DLI 子集(build_dli.py 产,E12-03)
IN_LMIA = _paths.LMIA / "lmia-employers.json"   # ESDC 正面 LMIA 雇主聚合(build_lmia.py 产,E6-02)
IN_ENRICH = _paths.PROCESSED / "company_enrich.json"  # 公司官网富化(简介/行业,enrich_companies.py 产,E8-04)
IN_NEWS = _paths.NEWS / "news.json"              # 官方移民新闻累积表(etl/news/ 产,E12-06)
IN_IRCC_TR = _paths.IRCC / "temp_residents.json"      # E8-12 省弹框体量卡:学签/工签年末存量
IN_IRCC_PR = _paths.IRCC / "pnp_admissions.json"      # PNP 类别 PR 登陆数
IN_IRCC_ALLOC = _paths.IRCC / "pnp_allocations.json"  # PNP 年度提名配额(人工核对维护表)
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
                    if k == "description":
                        # WordPress 摘要尾巴「[…]/[...]」剥掉(源站自动截断标记,66/3492 家;Frank 2026-07-19 报障)
                        extra[k] = re.sub(r"\s*\[(?:\.\.\.|…)\]\s*$", "", extra[k])
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
        # E12-08 职位三维档(1-5,grades.py 单一来源):通道档单列下发主表「通道」列,明细 jsonb 走额度 API
        apply_url = fields.get("applyUrl", "")
        direct = ("jobbank.gc.ca" not in apply_url) or (fields.get("source") == "Job Bank")
        g_channel, g_detail = GR.job_grades(
            sc.get("noc") or "", cls["teer"], sc.get("pnpStream"), bool(sc.get("pnpEligible")),
            fields.get("salaryAnnual"), w.get("annual"),
            fields.get("employmentTerm"), fields.get("employmentHours"), direct)
        # #100(Frank「移民价值分一片 87」):08 基分是 5 项粗加合、**无薪资项** → TEER0/1 首发紧缺岗全落 87。
        # 此处补一项「薪资相对该 NOC 当地中位的分位」拉开区分度——薪资是连续信号又直接挂钩 PNP 工资门槛/EE 分数。
        # 高于中位加分(≤+15)、低于中位减分(≥−12);缺薪资或缺中位则不动(宁可留空不瞎猜,与全站口径一致)。
        base_score = sc.get("score")
        sal_ann, med_ann = fields.get("salaryAnnual"), w.get("annual")
        if base_score is not None and sal_ann and med_ann:
            adj = round(max(-12, min(15, (sal_ann / med_ann - 1.0) * 30)))
            mv_score = max(0, min(100, base_score + adj))
        else:
            mv_score = base_score
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
            "accessibility": sc.get("accessibility") or None, "score": mv_score,
            "gradeChannel": g_channel, "scoreDetail": g_detail,
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
                    aip=bool(j.get("aip")), datePosted=j.get("date"), lastSeen=j.get("last_seen"),
                    # 雇佣形态 + 入职要求(E6-06/E6-07A,05b 解析):空值靠 add_job 的 (None,"") 过滤/or None 剔除
                    employmentTerm=j.get("employment_term"), employmentHours=j.get("employment_hours"),
                    certificates=j.get("certificates") or None, education=j.get("education"))

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

    # E12-08 公司四维档(1-5,grades.py 单一来源):担保/活跃/薪资/知名——全部从在库聚合+LMIA 列现算,零新抓取。
    # 知名依据=processed/company_facts.json 的 wiki(D 批产物;K 懒探索回填的 wiki 在 DB 侧,mart 不可见——
    # 代理可接受:facts 文件覆盖批量查过的存量,懒回填增量待下轮 facts 重导;fame 档差最多 1 档)。
    facts_wiki: set[str] = set()
    facts_f = _paths.PROCESSED / "company_facts.json"
    if facts_f.exists():
        try:
            facts_wiki = {sl for sl, c in json.loads(facts_f.read_text(encoding="utf-8")).get("by_slug", {}).items() if c.get("wiki")}
        except Exception:  # noqa: BLE001
            pass
    cutoff30 = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    agg: dict[str, dict] = {}
    for j in jobs:
        a = agg.setdefault(j["companySlug"], {"open": 0, "new30": 0, "pcts": [], "provs": set(), "aip": False})
        a["open"] += 1
        if (j.get("datePosted") or "") >= cutoff30:
            a["new30"] += 1
        if j.get("salaryAnnual") and j.get("wageMedAnnual"):
            a["pcts"].append((j["salaryAnnual"] / j["wageMedAnnual"] - 1) * 100)
        if j.get("province"):
            a["provs"].add(j["province"])
        if j.get("aip"):
            a["aip"] = True
    for slug, c in companies.items():
        a = agg.get(slug, {"open": 0, "new30": 0, "pcts": [], "provs": set(), "aip": False})
        sponsor_g, detail = GR.company_grades(
            c.get("lmiaPositionsSkilled"), c.get("lmiaPositions"), c.get("lmiaLastQuarter"), a["aip"],
            a["open"], a["new30"], (sum(a["pcts"]) / len(a["pcts"])) if a["pcts"] else None,
            slug in facts_wiki, len(a["provs"]))
        c["sponsorGrade"] = sponsor_g
        c["scoreDetail"] = detail

    # JD 正文下沉到 DB:按 applyUrl 匹配已抓的 .md → job.description(seed 自动透传;列表 SQL 不读它)
    # GAP1③ 身份预筛:同一循环里跑 visa_flag.detect(不另起脚本重扫 43k 文件)——
    # 「明确不担保/须 PR」红旗 + 命中原句(quote=可核验出处,citation 惯例)
    jd_idx = build_jd_index()
    matched = 0
    flagged = {"no_sponsorship": 0, "pr_required": 0}
    for j in jobs:
        p = jd_idx.get(j.get("applyUrl", ""))
        body = jd_body(p) if p else None
        if body:
            j["description"] = body
            matched += 1
            flag, quote = visa_flag.detect(body)
            if flag:
                j["eligibilityFlag"] = flag
                j["eligibilityQuote"] = quote
                flagged[flag] += 1
    print(f"  JD 正文匹配: {matched}/{len(jobs)} 岗写入 description;身份预筛: {flagged}")

    # #147/#151:NOC 职业名与城市名的中/韩译名(clean/04f、04g 产;**固定参考集翻一次永久用**)——
    # 缺文件/缺条目=留空,前端回退只显英文(宁可留空也不瞎猜;小镇本来就没有通行译名,不硬音译)
    def _load_i18n(fname: str) -> dict:
        p = _paths.PROCESSED / fname
        if not p.exists():
            return {}
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return {}

    noc_i18n = _load_i18n("noc_titles_i18n.json")
    city_i18n = _load_i18n("city_names_i18n.json")

    # ── 维度表 ──
    # E8-12 省弹框体量卡:每省挂 info(IRCC 学签/工签存量、PR 登陆、提名配额)。
    # 全读既有 raw(零新抓取);任一文件缺失 → 对应键留空不瞎猜(宁缺毋假)。
    def _prov_info() -> dict:
        info: dict[str, dict] = {c: {} for c in PROV_FULL}
        if IN_IRCC_TR.exists():
            tr = json.loads(IN_IRCC_TR.read_text(encoding="utf-8"))
            for key, out in (("study", "study"), ("tfwp", "tfwp"), ("imp", "imp")):
                blk = tr.get(key) or {}
                for c, v in (blk.get("byProv") or {}).items():
                    if c in info:
                        info[c][out] = {"n": v, "year": blk.get("year", "")}
        if IN_IRCC_PR.exists():
            pr = json.loads(IN_IRCC_PR.read_text(encoding="utf-8"))
            for c, v in (pr.get("byProv") or {}).items():
                if c in info:
                    info[c]["pnpPr"] = {"n": v, "year": pr.get("year", "")}
        if IN_IRCC_ALLOC.exists():
            alloc = json.loads(IN_IRCC_ALLOC.read_text(encoding="utf-8"))
            for r in alloc.get("rows", []):
                c = r.get("prov")
                if c in info:
                    info[c]["alloc"] = {"y2026": r.get("y2026"), "y2025": r.get("y2025")}
        return info

    prov_info = _prov_info()
    provinces = [{"code": c, "name": n, "info": prov_info.get(c) or None} for c, n in PROV_FULL.items()]
    city_keys = sorted({(j.get("city"), j.get("province")) for j in jobs if j.get("city")},
                       key=lambda t: (t[0] or "", t[1] or ""))
    cities = [{"name": c, "province": p or "",
               "nameZh": city_i18n.get(f"{c}|{p or ''}", {}).get("zh", ""),
               "nameKo": city_i18n.get(f"{c}|{p or ''}", {}).get("ko", "")} for c, p in city_keys]
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
    ee_draws, ee_hist, ee_fetched = {}, {}, ""
    if IN_EE_DRAWS.exists():
        try:
            _eed = json.loads(IN_EE_DRAWS.read_text(encoding="utf-8"))
            ee_draws, ee_hist, ee_fetched = _eed.get("byCategory", {}), _eed.get("history", {}), _eed.get("fetched", "")
        except Exception:  # noqa: BLE001
            ee_draws, ee_hist = {}, {}

    # #135(Frank「点开按时间线看每一轮」):联邦 EE 历次抽选并进 pnp_draws 表(province="FED")——
    # 该表列型完全够用(scale/score/invitations/stream/drawDate),**零新表零 DDL**;省块按 province 过滤
    # 天然不串味;时间线页改读这里的 FED 行(原来单独查 ee_categories 只有最近一期,现在有历史且不重复)。
    for cat_key, rounds_ in (ee_hist or {}).items():
        for dr in rounds_:
            pnp_draws.append({
                "province": "FED", "label": cat_key, "scale": "CRS",
                "url": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html",
                "fetched": ee_fetched, "kind": "draw", "drawDate": dr.get("date"),
                "stream": dr.get("drawName", ""), "score": dr.get("crs"),
                "invitations": dr.get("size"), "note": "",
            })

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
                tr = noc_i18n.get(n, {})
                noc_descriptions.append({
                    "noc": n, "title": v.get("title", ""),
                    "titleZh": tr.get("zh", ""), "titleKo": tr.get("ko", ""),
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

    # 官方移民新闻(E12-06):raw 全量累积,mart 只带近 60 条(老的留 raw 不进站)。
    # slug=date+标题 slug 化(稳定、可读、进 URL);bodyZh/summaryZh 照灌(v3 拍板前端暂不渲,DB 留列开关式恢复)。
    # P1c:① excerpt 在这清洗(剥「From:/Media advisory/News release/标题复读」样板行,前端只显);
    #     ② 同稿去重(同 region+标题多 URL 只留最新,federal feed 会同稿两条)。
    def news_excerpt(title: str, body: str) -> str:
        noise = {"media advisory", "news release", "statement", "backgrounder", "joint statement", "speech"}
        tnorm = re.sub(r"\W+", "", title).lower()
        for para in body.split("\n\n"):
            p = " ".join(para.split())
            low = p.lower()
            if not p or low.startswith("from:") or low.rstrip(":") in noise:
                continue
            if re.sub(r"\W+", "", p).lower() == tnorm:   # 标题复读行
                continue
            return p[:240]
        return ""

    news = []
    if IN_NEWS.exists():
        try:
            nd = json.loads(IN_NEWS.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            nd = {}
        seen_slug: set[str] = set()
        seen_story: set[tuple] = set()
        items = sorted(nd.get("items", []), key=lambda r: (r.get("date") or "", r.get("fetchedAt") or ""), reverse=True)
        for r in items:
            if len(news) >= 60:
                break
            if not (r.get("title") and r.get("url") and r.get("bodyEn")):
                continue  # 卡片三要素不齐不进站(抓不到正文=不出详情页,不硬造)
            story = (r.get("region", ""), re.sub(r"\W+", "", r["title"]).lower())
            if story in seen_story:
                continue  # 同稿多 URL(date 倒序在前=最新)只留一条
            seen_story.add(story)
            slug = f"{(r.get('date') or '')[:10]}-{slugify(r['title'])}"
            n = 2
            while slug in seen_slug:
                slug = f"{(r.get('date') or '')[:10]}-{slugify(r['title'])}-{n}"
                n += 1
            seen_slug.add(slug)
            news.append({
                "region": r.get("region", ""), "title": r["title"], "date": (r.get("date") or "")[:10],
                "slug": slug, "url": r["url"], "ogImage": r.get("ogImage") or None,
                "excerpt": news_excerpt(r["title"], r["bodyEn"]) or None,
                "bodyEn": r["bodyEn"], "bodyZh": r.get("bodyZh") or None, "summaryZh": r.get("summaryZh") or None,
                "bodyKo": r.get("bodyKo") or None, "summaryKo": r.get("summaryKo") or None,
                # P1d:AI 重要度(1-5,对找工/移民读者的实际影响;展示=「重要」徽标,非资格判定)
                "importance": r.get("importance"), "importanceNote": r.get("importanceNote") or None,
                "citation": r.get("citation") or "", "fetched": r.get("fetchedAt") or nd.get("fetched", "")})

    # PGWP 可申 DLI 子集(E12-03):build_dli.py 已过滤去重,这里直通并带上着陆页 url+抓取日期(逐行出处)
    dli = []
    if IN_DLI.exists():
        try:
            dd = json.loads(IN_DLI.read_text(encoding="utf-8"))
            dli = [{**r, "url": dd.get("url", ""), "fetched": dd.get("fetched", "")} for r in dd.get("rows", [])]
        except Exception:  # noqa: BLE001
            dli = []

    return {
        "companies": list(companies.values()), "jobs": jobs,
        "provinces": provinces, "cities": cities, "districts": districts,
        "designated_employers": designated,
        "noc_categories": noc_categories, "sources": sources, "experience_levels": experience_levels,
        "pnp_occupations": pnp_occupations, "pnp_draws": pnp_draws, "ee_categories": ee_categories,
        "noc_descriptions": noc_descriptions,
        "field_sources": field_sources,
        "dli": dli,
        "news": news,
    }


def main() -> None:
    OUT_MART.mkdir(parents=True, exist_ok=True)
    mart = build()
    for table, rows in mart.items():
        # 原子写(tmp+replace,04c 惯例):直写遇并发跑 09(手动 exec × 每小时例行轮)会截断失败留尾部垃圾
        # ——2026-07-18 news.json 实撞;upload_mart 上传前验 JSON 是下游防线,这里断根
        tmp = OUT_MART / f".{table}.json.tmp"
        tmp.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(OUT_MART / f"{table}.json")
    print("MART built →", OUT_MART)
    for table, rows in mart.items():
        print(f"  {table:22} {len(rows):5} 行")


if __name__ == "__main__":
    main()
