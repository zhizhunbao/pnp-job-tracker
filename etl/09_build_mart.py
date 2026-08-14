"""
09 — build the MART (数据仓库集市层): 把清洗好的各源拼成「列和 DB 表一一对应」的最终表。
seed 从此只读 mart 直接灌库,不再在加载器里东拼西凑(中介过滤/去重/评分关联都下沉到这)。

产出 data/mart/(每个文件 = 一张 Payload 表):
  事实表  companies.json  jobs.json
  维度表  provinces.json  cities.json  districts.json  designated_employers.json
  对账表  closed_jobs.json(实测判死名单)  seen_ids.json(本轮**真实见过**的全部 posting id,
          含被展示去重丢掉的——seed 的下架对账只认它,展示去重不许有下架副作用)

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

# 薪资归一(clean/04d)同一把尺子 —— 这里只做**兜底**,不是第二套清洗逻辑。
# 为什么需要:抓取(jobbank 容器)与建表(build 容器)并行,jobbank 整文件重写 postings.json,
# 落在「04d 跑完 → 09 建表」之间的新帖就没人给它算过薪资,带着空值进库(2026-08-05 实撞:
# 00:22 跑 04d → 00:25 写入 24 条新帖 → 00:42 建表 → 那 24 条在页面上薪资列全空,下一轮才自愈)。
# 编排顺序已把窗口从 20 分钟压到十几秒,但窗口不为零 —— **mart 是最终表,它不该依赖谁先跑**。
_sal_spec = importlib.util.spec_from_file_location("clean_salary", Path(__file__).resolve().parent / "clean" / "04d_clean_salary.py")
_sal_mod = importlib.util.module_from_spec(_sal_spec)
_sal_spec.loader.exec_module(_sal_mod)
LATE_SALARY = [0]


def fill_salary(j: dict) -> None:
    """有原文却没归一产物 → 当场补(apply_to 幂等,已有值一律不动)。"""
    if j.get("salary") and j.get("salaryText") is None and _sal_mod.apply_to(j):
        LATE_SALARY[0] += 1

# ── 输入/输出全路径 ──────────────────────────────────────────────
IN_JOBBANK = _paths.PROCESSED_JOBBANK / "postings.json"
IN_EXPIRED = _paths.PROCESSED_JOBBANK / "expired_ids.json"   # #124 批C:verify_expired.py 判死累积
IN_ATS_COMPANIES = _paths.COMPANIES                       # processed/ats/.../companies/<slug>/
IN_SCORED = _paths.PROCESSED / "all-scored.json"
IN_AIP = _paths.AIP / "aip-designated-employers.json"
IN_NL_EMPLOYERS = _paths.PNP / "nl-employers.json"  # NL 官网指定雇主 645 家(C4-W4,含申报 NOC)
IN_WAGES = _paths.WAGES / "wages.json"   # NOC×省 中位工资(build_wages.py 从 ESDC 开放数据建)
IN_PNP = _paths.PNP                      # raw/pnp/*.json(各省具名通道:每文件一条通道)
IN_PNP_DRAWS = _paths.PNP / "draws.json"  # 省抽选事实(BC/AB/MB+ON通告,build_draws.py 产,E6-04)
# #280:抽选流名中文灰注缓存(etl/pnp/translate_draw_streams.py 本地 qwen 批译产,增量缓存)——
# 缺这个文件(还没跑过批译)= streamZh 全列 None,前端优雅回退纯英文,不是报错
IN_DRAW_STREAM_ZH = _paths.PROCESSED / "draw_stream_zh.json"
# 省提名官方打分表(E12-09)——一省一个文件,加省就往这个 list 里加,下面的组装逻辑不用改。
# BC=SIRS 200 分制(build_bc_sirs.py 从官方 PDF 抓)/ SK=SINP Points Grid 110 分制(build_sk_points.py 抓官网表)
# AB=AAIP Worker EOI Points Grid 100 分制(2026-08-14 加,官方 PDF 人工核对:
#   data/crawl/ab-aaip/im-worker-stream-expression-of-interest-points-grid.pdf)
IN_SCORE_TABLES = [_paths.PNP / "bc-sirs.json", _paths.PNP / "sk-points.json", _paths.PNP / "on-points.json",
                   _paths.PNP / "mb-points.json", _paths.PNP / "nl-points.json", _paths.PNP / "ab-eoi-points.json"]
# NL 只对 Express Entry Skilled Worker 使用 Annex A 100 分表(67 分门槛);普通 NL EOI 仍按公开优先标准择优,
# 没有数值权重。两者不能混成“整个纽省都按 67 分”。
# 省提名官方**门槛**(规则引擎第一刀)——打分表管「能打几分」,这张管「打分之前先要满足什么」。
# 一省一个文件,加省=往这个 list 里加一个(build_<省>_req.py 产,列同一套)。
IN_REQ_TABLES = [_paths.PNP / f"{p}-req.json"
                 for p in ("bc", "on", "ab", "sk", "mb", "ns", "nb", "pe", "nl")] + [
                 # B1-4:联邦 PGWP 规则库(province='FED' program='PGWP',build_pgwp.py 产,quote-anchored)。
                 # 走同一张表=引擎 facts.requirements 免费拿到;FED 行不会漏进省级门槛节(那边按省名挑行)
                 _paths.IRCC / "pgwp_rules.json",
                 # G8:联邦段官方规费(program='PR-fees',build_fees.py 产)—— 第三次复用,同上安全
                 _paths.IRCC / "fees.json",
                 # G9:联邦 Express Entry 三个项目的资格门槛(province='FED',build_ee_rules.py 产,
                 # quote-anchored)。**一个文件三个项目** → program 逐行写在 requirements[].program
                 # ('CEC'/'FSW'/'FST'),表级只有 province —— 下面按行覆盖 program,零新表
                 _paths.EE / "fed-eligibility.json",
                 # G-AIP:联邦大西洋移民计划(AIP)申请人门槛(province='FED' program='AIP',
                 # build_aip_rules.py 产,quote-anchored)——#287 一键三合一判定的硬前置
                 # (设计 docs/design/一键三合一判定-20260809.md §4:此前 AIP 申请人侧生产 0 行)
                 _paths.IRCC / "aip_rules.json"]
# G5 省级官方运营统计(配额/已发/剩余、积压游标、EOI 池、处理时长、SIRS 池分布)——
# 一省一个文件,加省=往这个 list 里加一个;各省字段形状不同,按 province 分派(下面 build_pnp_ops_stats)。
IN_PNP_STATS = [_paths.PNP / f"{p}-stats.json" for p in ("ab", "sk", "bc", "mb", "on")]
IN_EE = _paths.EE / "federal-categories.json"  # 联邦 Express Entry 类别抽选(全国单一源)
IN_EE_DRAWS = _paths.EE / "draws.json"          # 各类别最近一次抽选(CRS/日期/邀请数,build_ee_draws.py 产)
# G9 联邦官方计分表(两套分,同一张窄表,grid 列区分)——build_ee_rules.py 产,只读 crawl 缓存。
IN_EE_CRS = _paths.EE / "crs-grid.json"         # CRS 排名分 A/B/C/D 四段(rows)
IN_EE_ELIG = _paths.EE / "fed-eligibility.json"  # 资格门槛(上面 IN_REQ_TABLES 消费)+ FSW 67 分表(selectionFactors)
IN_EE_LANG = _paths.EE / "language-grid.json"    # T4–T26 语言成绩 ↔ CLB/NCLC(独立表,绝不参与 points 求和)
IN_NOC_DESC = _paths.NOC / "descriptions.json"  # NOC 官方名+主要职责(build_noc_descriptions.py 产)
IN_FIELD_SOURCES = _paths.RAW / "sources" / "field-sources.json"  # 字段级来源注册表(build_field_sources.py 产,E4-04)
IN_DLI = _paths.DLI / "dli.json"                # PGWP 可申 DLI 子集(build_dli.py 产,E12-03)
IN_LMIA = _paths.LMIA / "lmia-employers.json"   # ESDC 正面 LMIA 雇主聚合(build_lmia.py 产,E6-02)
IN_ENRICH = _paths.PROCESSED / "company_enrich.json"  # 公司官网富化(简介/行业,enrich_companies.py 产,E8-04)
IN_NEWS = _paths.NEWS / "news.json"              # 官方移民新闻累积表(etl/news/ 产,E12-06)
IN_IRCC_TR = _paths.IRCC / "temp_residents.json"      # E8-12 省弹框体量卡:学签/工签年末存量
IN_IRCC_PR = _paths.IRCC / "pnp_admissions.json"      # PNP 类别 PR 登陆数
IN_IRCC_ALLOC = _paths.IRCC / "pnp_allocations.json"  # PNP 年度提名配额(人工核对维护表)
IN_IRCC_FLOW = _paths.IRCC / "study_flow.json"        # 新发学签流量(月度;2026-08-03 接入,存量停在 2024 时的当期口径)
OUT_MART = _paths.DATA / "mart"
# 「还在板上」的 jobbank 帖号(verify_expired 拿它筛掉已 closed / 已被同名去重丢掉的帖,别白验)
OUT_MART_OPEN_IDS = _paths.PROCESSED_JOBBANK / "mart_open_ids.json"

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


def _stat_val(v, text: str = "") -> tuple:
    """整数才进 value;官方隐私抑制/不适用值(AB「Less than 10」「Not applicable」、BC「<5」、SK「N/A」/null)
    → value=None + valueText=原文,**绝不折成 0**。这张表存在的全部意义就是让
    「0」「本站没有」「官方不公布」三件事分得开——折成 0 等于自毁。"""
    if isinstance(v, int) and not isinstance(v, bool):
        return v, ""
    return None, (text or ("" if v is None else str(v)))


# ── 通道名归一(streamKey):跨指标 join 的键,**不展示给用户** ──────────────────
# 病根:官网两张表对同一条通道措辞不同 —— streams[] 写
# 「Accelerated Tech Pathway (eligible list of occupations includes jobs that support data centre needs…)」,
# eoiPool[] 只写「Accelerated Tech Pathway」;「Dedicated Health Care Pathways (Express Entry and Non-Express Entry)」同理。
# 编排层要把「配额 + 池内人数 + 积压游标」拼成一条通道的全貌,靠 scope 字符串等值就会**静默漏配**(join 不上=当没有)。
# 规则而不是映射表(官网改个字映射表就失效):括号里一律是补充说明不是通道身份 → 去括号;再小写、压空白、去首尾标点。
# scope 原样保留(官方措辞,报告要引用);streamKey 只做键。
_PAREN = re.compile(r"\s*\([^()]*\)")
# 规则切不动的个例才手写进来(照 04g 的 SHORT_FIX 惯例;留空是**有意**的,不是忘了)。撞车检测见函数末尾。
STREAM_KEY_FIX: dict[str, str] = {}


def stream_key(scope: str) -> str:
    k = _PAREN.sub("", scope or "")                       # 去括号补充说明(可能不止一处)
    k = re.sub(r"\s+", " ", k).strip().lower()            # 压空白 + 小写
    k = re.sub(r"^[^\w]+|[^\w]+$", "", k)                 # 去首尾标点(「Total:」→ total)
    return STREAM_KEY_FIX.get(k, k)


def expand_applies(applies: dict, universe) -> dict:
    """行级适用范围 → 前端能直接判的 NOC 清单。

    官方那条「Any Trade」不给 NOC,只说「持 SkilledTradesBC 证书的技工」。把它展开成
    **本站分类树的「技工」大类**(noc.broad_of)——注意这是决定「问不问」,不是断言资格:
    问了用户还得自己勾,过度包含只会多问一句,漏掉才会让人白丢 5 分。
    """
    nocs = dict(applies.get("nocs") or {})
    trade = (applies.get("anyTrade") or "").strip()
    if trade:
        for code in universe:
            if code not in nocs and NOC.broad_of(code) == "技工":
                nocs[code] = trade
    return {"appliesNoc": nocs}


def build_pnp_requirements(files) -> list:
    """省提名官方门槛维度(规则引擎):一行一条可核验的官方门槛,列对齐 DB。
    与 pnp_occupations(在不在清单)、pnp_score_factors(能打几分)并列,三张表各答一个问题。
    applies*(Teer/Area/Condition/familySize)是**适用条件**(该条只对某些 TEER / 某个区域 /
    某个非地域条件 / 某个家庭人数生效),引擎按它挑行;挑不到就是 unknown —— 不拿别省别档的门槛套(设计 §3)。
    抽成函数是为了能单独重算这张表:改了某个省的 build_<省>_req.py 之后不必跑全量 09。"""
    pnp_requirements = []
    for src in files:
        if not src.exists():
            continue
        try:
            tbl = json.loads(src.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单省表坏了不拖垮整个 mart
            continue
        base = {"province": tbl.get("province", ""), "program": tbl.get("program", "PNP"),
                "url": tbl.get("url", ""), "pageUrl": tbl.get("pageUrl", ""),
                "effective": tbl.get("guideEffective", ""), "fetched": tbl.get("fetched", "")}
        # 源表没写 province = 引擎按省挑行永远挑不到这几条,而且一声不吭(G9 实撞:
        # fed-eligibility.json 起初没有表级 province)。宁可吵一句,别静默丢门槛。
        if not base["province"] and tbl.get("requirements"):
            print(f"  ⚠ {src.name} 缺表级 province → {len(tbl['requirements'])} 条门槛会落成 province='',引擎挑不到")
        for i, r in enumerate(tbl.get("requirements", [])):
            # value 列是 **integer**。G9 的 EE 规则里 13/23 条的 value 是编码字符串
            # ('0,1,2,3' / 'outside-QC' / 'eca-required' …),直灌 → 22P02 → 整个 seed 事务回滚。
            # 照 pgwp 的 rule 行先例:value 留空,机器可读的编码折进 basis 那个 `k=v;k=v` 包
            # (它已经装着 windowYears=3;minYears=1 这类口径)。valueText=官方原文,一个字不动。
            # 为什么不塞 appliesNoc/appliesTeer:那两列是**适用范围**(不在范围内=本条不适用),
            # 而这里是**门槛**(不在名单内=不合格),两者对同一个人给出相反结论。
            val, basis = r.get("value"), r.get("basis", "")
            if isinstance(val, str):
                basis = ";".join(x for x in (basis, f"valueCode={val}") if x)
                val = None
            pnp_requirements.append({
                **base, "seq": i,
                # 一条门槛可以自带出处页(ON 的申请人侧在通道页、雇主侧在雇主指南)——没写才回退表级 url
                **({"url": r["url"]} if r.get("url") else {}),
                # 一条门槛也可以自带 program:联邦 EE 一个文件装 CEC/FSW/FST 三个项目(G9),
                # 三者的门槛互不通用 —— 落成同一个 program 会让引擎拿 FST 的工时去卡 CEC 申请人。
                # 逐行覆盖,表级 program 仍是默认(省级文件一个文件一个 program,行内不写)
                **({"program": r["program"]} if r.get("program") else {}),
                **({"fetched": r["fetched"]} if r.get("fetched") else {}),
                "stream": r.get("stream", ""), "subject": r.get("subject", "applicant"),
                "factor": r.get("factor", ""), "op": r.get("op", ">="),
                "value": val, "valueText": r.get("valueText", ""), "unit": r.get("unit", ""),
                # TEER 列表存成 "2,3,4,5" 文本(Payload 没有整型数组列;前端 split 即可)。
                # ⚠️ 源里既有 list[int](BC 及本轮七省)也有现成字符串(ON):对字符串 join 会逐字符
                # 插逗号,ON 那几行一直是 "0,,,1,,,2,,,3",引擎 split(',') 按 TEER 挑行永远挑空
                # (2026-08-03 修)。两种形态都归一到同一串。
                "appliesTeer": (r["appliesTeer"] if isinstance(r.get("appliesTeer"), str)
                                else ",".join(str(x) for x in (r.get("appliesTeer") or []))),
                # NOC 适用范围(E13-02):ON 的技工低档语言门槛靠它区分;存 NOC 码前缀,引擎按前缀匹配
                "appliesNoc": r.get("appliesNoc", ""), "excludesNoc": r.get("excludesNoc", ""),
                "appliesArea": r.get("appliesArea", ""),
                # 非地域的适用条件(G6:MB SWM「在加拿大其他省/地区读的书」那一档 = grad-other-province)。
                # 空 = 该条对谁都适用。为什么不塞进 appliesArea:那一列存的是**官方枚举的行政区**
                # (rules.areaOfPlace 按岗位地点算出来的键),混进一个非地理值,按区域挑行的那几处
                # (收入表 / 雇主雇员数)迟早挑到不该挑的行。
                "appliesCondition": r.get("appliesCondition", ""), "familySize": r.get("familySize"),
                "basis": basis, "label": r.get("label", ""), "section": r.get("section", ""),
            })
    return pnp_requirements

def build_pnp_ops_stats(files) -> list:
    """省级官方运营统计 → 一行一指标(metric 固定词表;scope=通道/行业/分数段/阶段,省级留空)。
    label 一律官方措辞原文(不翻译不改写);AB/SK/BC 池分布三份 raw 没有节号 → section 留空不编,
    BC 处理时长与 MB(月度页/年报)自带官方小标题,照原文写进 section。
    streamKey:scope 的归一键,只对 scopeKind='stream' 算,供跨指标拼装用(见上)。

    ⚠️ 单位不换算:官方发 months 就 processing_months、发 weeks 就 processing_weeks、发 days 就
    processing_days。3 个月折成 13 周 = 替官方编了个它没给的精度(BC 只说「约 80% 的案子在 3 个月内」)。
    metric 名带单位后缀,消费端一眼看得出官方到底给的是什么。"""
    rows: list = []
    seqs: dict = {}

    def add(base, metric, scope, kind, label, raw, unit, text="", section="", period=None):
        val, vtext = _stat_val(raw, text)
        k = (base["province"], metric)
        seqs[k] = seqs.get(k, -1) + 1   # 每 (province, metric) 组内稳定序号,重跑顺序一致
        rows.append({**base, "metric": metric, "scope": scope, "scopeKind": kind, "label": label,
                     "streamKey": stream_key(scope) if kind == "stream" else "",
                     "value": val, "valueText": vtext, "unit": unit, "section": section,
                     "seq": seqs[k], **({} if period is None else {"period": period})})

    for src in files:
        if not src.exists():
            continue
        try:
            d = json.loads(src.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单省表坏了不拖垮整个 mart
            continue
        prov = d.get("province", "")
        # SK 官方没有 asOf,只有季度口径 → asOf 留空、period 放 quarter(其余省 period 留空)
        base = {"province": prov, "program": d.get("program", "PNP"),
                "asOf": d.get("asOf", ""), "period": d.get("quarter", ""),
                "url": d.get("url", ""), "fetched": d.get("fetched", "")}
        if prov == "AB":
            for m, key in (("allocation", "allocation"), ("issued", "issued"),
                           ("remaining", "remaining"), ("to_process", "toProcess")):
                unit = "spots" if m in ("allocation", "remaining") else "people"
                add(base, m, "", "", "", (d.get("summary") or {}).get(key), unit)   # 省级汇总
                for s in d.get("streams", []):
                    add(base, m, s.get("stream", ""), "stream", s.get("stream", ""), s.get(key), unit)
            for s in d.get("streams", []):   # 积压游标:自由文本日期 → 永远 value=None + 原文
                add(base, "assessing_up_to", s.get("stream", ""), "stream", s.get("stream", ""),
                    None, "text", text=str(s.get("assessingUpTo") or ""))
            for e in d.get("eoiPool", []):
                st = e.get("stream", "")
                tot = st.strip().rstrip(":").lower() == "total"   # 哨兵行「Total:」→ 省级 eoi_pool_total
                add(base, "eoi_pool_total" if tot else "eoi_pool",
                    "" if tot else st, "" if tot else "stream", st, e.get("count"), "people")
            # draws[] 忽略:抽选史 canonical 归 build_draws.py(本表不重复)
        elif prov == "SK":
            for p in d.get("processing", []):
                add(base, "processing_weeks", p.get("category", ""), "category",
                    f"{p.get('group', '')}: {p.get('category', '')}", p.get("weeks"), "weeks",
                    text=str(p.get("raw") or ""))   # weeks=null → 原文 raw(「N/A」)
            for a in d.get("allocation", []):
                sec = a.get("sector", "")
                tot = sec.strip().lower() == "total"
                for m, key, unit in (("allocation", "allocation", "spots"),
                                     ("nominations_ytd", "nominationsYtd", "nominations")):
                    add(base, m, "" if tot else sec, "" if tot else "sector", sec, a.get(key), unit)
            for c in d.get("cappedSectors", []):
                add(base, "capped_pct", c.get("sector", ""), "sector", c.get("sector", ""), c.get("pct"), "percent")
                add(base, "capped_spots", c.get("sector", ""), "sector", c.get("sector", ""), c.get("spots"), "spots")
            for s in d.get("prioritySectors", []):   # 标记行:value=1 表「在清单里」(留 None 会和「官方不公布」混淆)
                add(base, "priority_sector", s, "sector", s, 1, "flag")
        elif prov == "BC":
            for p in d.get("pool", []):
                add(base, "sirs_pool", p.get("scoreRange", ""), "scoreRange", p.get("scoreRange", ""),
                    p.get("registrations"), "people")   # 「<5」= 官方隐私抑制 → None + 原文
            # 处理时长与池分布**不同源、不同口径日**(池子那页印 as-of,时长这页不印)→ 用自己那一节的出处,
            # 别让报告拿池子的 as-of 去给时长背书。「约 80% 的案子」这句进每一行 label:
            # 它就是这三个数的全部意义,分开存迟早会有人把它读成「所有案子」。
            pr = d.get("processing") or {}
            pbase = {**base, "url": pr.get("url", ""), "fetched": pr.get("fetched", ""), "asOf": pr.get("asOf", "")}
            pctl = pr.get("percentileLabel", "")
            for p in pr.get("rows", []):
                stage, raw_txt = p.get("stage", ""), p.get("raw", "")
                add(pbase, f"processing_{p.get('unit') or 'months'}", stage, "stage",
                    f"{pctl}: {stage} — {raw_txt}" if pctl else f"{stage} — {raw_txt}",
                    p.get("value"), p.get("unit", ""), section="Skills Immigration — Processing times")
        elif prov == "MB":
            # MB 有**两个**官方源(月度数据页 + 年报),各自的 url/fetched/统计期都不一样 ——
            # 一行的出处必须指向那个数字真正的来源页,别拿月度页给年报的处理天数背书。
            m = d.get("monthly") or {}
            page = m.get("section", "")                       # 「MPNP Monthly Data 2026」
            year = str(m.get("year") or "")
            thru = str(m.get("throughMonth") or "")
            ytd = f"{year} Jan-{thru[:3]}" if thru else year   # 月度表是**年初至今累计**,期次必须写明到哪个月
            mbase = {**base, "url": m.get("url", ""), "fetched": m.get("fetched", ""), "asOf": ""}
            a = m.get("allocation") or {}
            add(mbase, "allocation", "", "", a.get("label", ""), a.get("value"), "spots",
                section=f"{page} — {a.get('section', '')}", period=year)
            e = m.get("enhancedYtd") or {}
            add(mbase, "nominations_enhanced_ytd", "", "", e.get("label", ""), e.get("value"), "nominations",
                section=f"{page} — {e.get('section', '')}", period=ytd)
            for key, metric, unit in (("nominationsYtd", "nominations_ytd", "nominations"),
                                      ("refusalsYtd", "refusals_ytd", "applications"),
                                      ("laaYtd", "laa_ytd", "invitations"),
                                      ("receivedYtd", "applications_received_ytd", "applications")):
                g = m.get(key) or {}
                for r in g.get("rows", []):
                    scope = r.get("scope", "")
                    add(mbase, metric, scope, "stream" if scope else "", f"{g.get('section', '')}: {r.get('label', '')}",
                        r.get("value"), unit, section=f"{page} — {g.get('section', '')}", period=ytd)
            inv = m.get("inventory") or {}
            for metric, key, lab in (("in_assessment", "inAssessment", "In Assessment"),
                                     ("pending_assessment", "pending", "Pending"),
                                     ("inventory", "total", "Total")):
                # 库存是**某个月首个工作日的快照**,不是「当前」:period 写死到月份,谁引用都得带上
                add(mbase, metric, "", "", f"{inv.get('section', '')}: {lab}", inv.get(key), "applications",
                    section=f"{page} — {inv.get('section', '')}", period=inv.get("month", ""))
            an = d.get("annual") or {}
            abase = {**base, "url": an.get("url", ""), "fetched": an.get("fetched", ""), "asOf": ""}
            ayear, asec = str(an.get("year") or ""), an.get("section", "")
            add(abase, "processing_commitment", "", "", an.get("commitmentLabel", ""),
                an.get("commitmentMonths"), "months", section=asec, period=ayear)
            # EOI 池在册人数(年报 §10)。**period 取官方标签里写的那一年,不按报告年推** ——
            # 2024 年报把它标成「end of 2023」而 2023 年报同年份给 20,392,官方自相矛盾;
            # 我们只做两件事:取最新一份年报、把官方原句原样放进 label。谁要纠这个错去找 MPNP。
            # 口径是**年度快照**,与 AB 的实时池不可混用(显示层分别标注,见 caseFacts 的注释)。
            ep = an.get("eoiPool") or {}
            add(abase, "eoi_pool_total", "", "", ep.get("label", ""), ep.get("value"), "people",
                section=f"MPNP Annual Report {ayear} — 10. Expression of Interest Pool",
                period=str(ep.get("labelYear") or ""))
            for p in an.get("processing", []):
                st = p.get("stream", "")
                for metric, key, lab in (("processing_days", "overallDays", "Overall Average"),
                                         ("processing_days_approved", "approvedDays", "Approved Applications"),
                                         ("processing_days_refused", "refusedDays", "Refused Applications")):
                    add(abase, metric, st, "stream", f"{st} — {lab}: {p.get(key)} days",
                        p.get(key), "days", section=asec, period=ayear)
        elif prov == "ON":
            # ON(C4-W5):官方「审理时长与提名数」专页 2026 改制后已 302 下线(raw 的 pageRedirect
            # 存了官方注册的 redirect 证据)→ 审理时长无行可出,这是举证过的「本站未收录」。
            # 配额/历年提名数出自逐年 Program Updates 页 —— 每条自带出处页,用自己的 url/fetched,
            # 别拿顶层(已下线那页)给数字背书。label = 官方原句(quote-anchored)。
            for m, key in (("allocation", "allocation"), ("nominations_issued", "nominationsIssued")):
                for e in d.get(key, []):
                    ebase = {**base, "url": e.get("url", ""), "fetched": e.get("fetched", ""), "asOf": ""}
                    add(ebase, m, "", "", e.get("label", ""), e.get("value"), e.get("unit", "nominations"),
                        section=e.get("section", ""), period=str(e.get("year") or ""))
    # 撞车检测:**同一个 (province, metric) 内**两个不同的官方通道名压出同一个 key = 归一切过头了
    # (跨 metric 同键正是要的效果,不算撞)。撞了就报出来 —— 静默合并两条通道比漏配更毒。
    seen_key: dict = {}
    for r in rows:
        if not r.get("streamKey"):
            continue
        k = (r["province"], r["metric"], r["streamKey"])
        if seen_key.setdefault(k, r["scope"]) != r["scope"]:
            print(f"  ⚠ streamKey 撞车 {r['province']}/{r['metric']}: "
                  f"「{seen_key[k]}」与「{r['scope']}」都压成 '{r['streamKey']}' → 加 STREAM_KEY_FIX 裁决")
    return rows


def build_ee_points_grid(crs_src, elig_src) -> list:
    """联邦官方计分表 → 窄表:一行 = 一个 criterion × 一个列表头(build_ee_rules.py 已解析成这个形状,这里直通+加列)。

    **两套分,一张表**:CRS 排名分(池子里排队用)与 FSW 67 分选择因素(够不够格进池子用)是官方
    明确写明的两回事,但表格形状完全一样(段/小标题/因素/档位/列表头/分值)→ 同一张窄表用 `grid`
    列区分('CRS' / 'FSW67')。拆两张表只会逼消费端把同一套查表逻辑写两遍,还得记住哪张表叫什么。
    消费端一律先按 grid 过滤,再按 section/factor/criterion 挑行 —— 不过滤就会把两套分加在一起。

    🔴 points 可空:官方非数字格(「n/a」「Not eligible to apply」)一律 None + 原文留 pointsText,
    绝不折成 0 —— 折了就等于替官方说「这档 0 分」,而官方说的是「这档根本不能申」。

    与 pnp_* 四表的分工:那四张答省提名的四个问题,本表答联邦段「这一格官方给几分」。
    抽成函数是为了能单独重算这张表(改了 build_ee_rules.py 之后不必跑全量 09)。"""
    rows: list = []
    for grid, src, key in (("CRS", crs_src, "rows"), ("FSW67", elig_src, "selectionFactors")):
        if not src.exists():
            continue
        try:
            d = json.loads(src.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单个源坏了不拖垮整个 mart
            continue
        for i, r in enumerate(d.get(key, [])):
            rows.append({
                "grid": grid,
                "section": r.get("section", ""), "sectionLabel": r.get("sectionLabel", ""),
                # summary=各段封顶速览表 / detail=逐档明细表:两者的分值不能相加(明细是速览的展开)
                "kind": r.get("kind", ""),
                "tableNo": r.get("table"),     # 页内第几张表(0 起)——列名不叫 table:SQL 保留字
                "heading": r.get("heading", ""), "factor": r.get("factor", ""),
                "criterion": r.get("criterion", ""),
                "columnLabel": r.get("column", ""),   # 同上:column 也是 SQL 保留字
                "points": r.get("points"), "pointsText": r.get("pointsText", ""),
                "seq": i,                      # 官方页内原序,重跑稳定(报告要按官方顺序摆)
                "url": r.get("url", ""), "fetched": r.get("fetched", ""),
            })
    return rows


def numeric_range(text: str) -> tuple[float | None, float | None, str]:
    """官方分数格的保守数值化;识别不了就双空并保留 valueText,绝不替官方补 0。"""
    value = re.sub(r"\s+", "", (text or "").replace("–", "-").replace("—", "-"))
    # CELPIP 的部分 CLB 单元格含无障碍隐藏后缀(如「7 CELPIP-G」);原文仍在 *Text,
    # 数值边界只移除这个页面真实存在且已由 table.test 另列保存的测试名。
    value = re.sub(r"CELPIP-G$", "", value, flags=re.I)
    value = re.sub(r"andabove$", "+", value, flags=re.I)
    number = r"\d+(?:\.\d+)?"
    if m := re.fullmatch(f"({number})", value):
        n = float(m.group(1))
        return n, n, "exact"
    if m := re.fullmatch(f"({number})\\+", value):
        return float(m.group(1)), None, "minimum"
    if m := re.fullmatch(f"({number})-({number})", value):
        return float(m.group(1)), float(m.group(2)), "range"
    # 官方有「226-371+」这类“某分起及以上”写法;下界可证,上界不可封死。
    if m := re.fullmatch(f"({number})-({number})\\+", value):
        return float(m.group(1)), None, "minimum"
    return None, None, "text"


def language_metric(column: str) -> str:
    label = (column or "").lower()
    for ability in ("speaking", "listening", "reading", "writing"):
        if label.startswith(ability):
            return ability
    if "points" in label and "total" in label:
        return "points_total"
    if "points" in label and "per ability" in label.replace("(", "").replace(")", ""):
        return "points_per_ability"
    return re.sub(r"[^a-z0-9]+", "_", label).strip("_")


def build_ee_language_grid(src) -> list:
    """语言成绩换算单独成表,不复用 ee_points_grid:换算区间不是 CRS/FSW 分,不能被求和。"""
    if not src.exists():
        return []
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — 单个源坏了不拖垮整个 mart
        return []

    out: list = []
    seq = 0
    for table in data.get("tables", []):
        for row in table.get("rows", []):
            level_min, level_max, level_kind = numeric_range(row.get("levelText", ""))
            for cell in row.get("cells", []):
                score_min, score_max, range_kind = numeric_range(cell.get("valueText", ""))
                out.append({
                    "program": table.get("program", ""), "test": table.get("test", ""),
                    "tableNo": table.get("tableNo"), "rowNo": row.get("rowNo"),
                    "benchmark": table.get("benchmark", ""), "levelText": row.get("levelText", ""),
                    "levelMin": level_min, "levelMax": level_max, "levelRangeKind": level_kind,
                    "nocTeer": row.get("nocTeer", ""),
                    "metric": language_metric(cell.get("column", "")),
                    "scoreText": cell.get("valueText", ""),
                    "scoreMin": score_min, "scoreMax": score_max, "rangeKind": range_kind,
                    "seq": seq, "url": table.get("url", ""), "fetched": table.get("fetched", ""),
                })
                seq += 1
    return out


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
    seen: set[str] = set()            # company-slug|title 去重(**只服务展示**:前端不该出现一堆同公司同岗名)
    seen_ext: set[str] = set()        # externalId 去重
    # 2026-08-04 数据销毁修:本轮**真实见到**的全部 posting(不受上面那把展示去重的尺子影响)。
    # 病根——被 `company|title` 去重丢掉的帖同时退出了 seed 的「本次见过」集,满 30 天被静默 closed,
    # 而 DB 侧的重复判定带城市(company×title×city),两套口径打架 → 实测 5.4k 个「不在本轮 mart」的
    # 在招岗里抽样 60% 官方仍在招。展示去重与「我们这轮见过什么」是两件事,从此各走各的集合。
    seen_ids: set[str] = set()

    # #124 批C:验尸判死帖不进 mart → 退出 seed 的 seen 集 → 既有「不在 seen 且发布>30天」规则自然置 closed。
    # 首跑教训:mart externalId 是 jb:<posting_id> 前缀形,验尸文件存裸 posting_id——比对必须加前缀(0 剔除实锤)
    expired: set[str] = set()
    if IN_EXPIRED.exists():
        expired = {f"jb:{pid}" for pid in json.loads(IN_EXPIRED.read_text(encoding="utf-8")).get("dead", {})}
    dropped_expired = [0]

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
        if external_id in expired:
            dropped_expired[0] += 1
            return
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
                ext = j.get("url") or key
                if ext not in expired:
                    seen_ids.add(ext)   # 先记「见过」,再做展示去重(顺序不能倒)
                if key in seen:
                    continue
                seen.add(key)
                fill_salary(j)   # 兜底:04d 之后才落盘的行(见文件头),现算现补
                add_job(ext, slug, title=j.get("title"), source=jd.get("ats") or "ats", origin="ats",
                        country=j.get("country"), province=j.get("province") or guess_prov(j.get("location", "")),
                        city=j.get("city"), district=j.get("district"), address=j.get("address"),
                        applyUrl=j.get("url"), officialUrl=prof.get("website"),
                        salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                        aip=bool(j.get("aip")), apprenticeFriendly=False, datePosted=j.get("posted"), lastSeen=ats_seen)

    # 2) Job Bank(全国全职业)
    if IN_JOBBANK.exists():
        for j in json.loads(IN_JOBBANK.read_text(encoding="utf-8")):
            if AGENCY.search(j.get("employer", "")):  # 跳过中介
                continue
            if AGENCY_NOTE in (j.get("title") or "").lower():  # 中介代发标记(#41):整帖过滤
                continue
            cslug = slugify(j.get("employer") or "unknown")
            key = f"{cslug}|{norm(j.get('title',''))}"
            # 稳定 ID:Job Bank 帖子 ID(posting_id 字段优先,否则从 URL 的 /jobposting/<id> 取),
            # 不用含 ?source= 查询串的完整 URL(见 docs/source-framework.md)
            m = re.search(r"/jobposting/(\d+)", j.get("url", ""))
            pid = str(j.get("posting_id") or (m.group(1) if m else ""))
            ext = f"jb:{pid}" if pid else (j.get("url") or key)
            if ext not in expired:
                seen_ids.add(ext)   # 「见过」= 本轮源数据里还在、且没被验尸判死;与展示去重无关
            if key in seen:
                continue
            seen.add(key)
            add_company(j.get("employer") or "—", cslug, website=j.get("website"),
                        address=j.get("address"), region=j.get("province"), source="jobbank")
            fill_salary(j)   # 兜底:04d 之后才落盘的行(见文件头),现算现补
            add_job(ext, cslug, title=j.get("title"), source=j.get("source") or "Job Bank", origin="jobbank",
                    country=j.get("country"), province=j.get("province") or guess_prov(j.get("city", "")),
                    city=j.get("city"), district=j.get("district"), address=j.get("address"),
                    applyUrl=j.get("url"), officialUrl=j.get("website"),
                    salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                    aip=bool(j.get("aip")), apprenticeFriendly=bool(j.get("apprentice_friendly")),
                    datePosted=j.get("date"), lastSeen=j.get("last_seen"),
                    # 雇佣形态 + 入职要求(E6-06/E6-07A,05b 解析):空值靠 add_job 的 (None,"") 过滤/or None 剔除
                    employmentTerm=j.get("employment_term"), employmentHours=j.get("employment_hours"),
                    certificates=j.get("certificates") or None, education=j.get("education"))

    # LMIA 外劳雇佣记录(E6-02):按 norm_name 精确匹配(3.2 统计:公司命中 18.2%,抽检零误报)。
    # 只挂 companies(列表 SQL 已 join companies,jobs 零改动);语义=历史事实,展示层必须带股别/季度。
    if IN_LMIA.exists():
        lmia = json.loads(IN_LMIA.read_text(encoding="utf-8")).get("employers", {})
        # B4 时间窗(Frank 08-08「最近一年/6个月/3个月也有价值」):官方粒度=季度,
        # 窗=全表最新季往回 4/2/1 季(≈近一年/近半年/最近一季);逐季明细 quarters 维护表里现成,零新抓。
        all_qs = sorted({q for e in lmia.values() for q in e.get("quarters", {})})
        w4, w2, w1 = set(all_qs[-4:]), set(all_qs[-2:]), set(all_qs[-1:])
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
            qmap = e.get("quarters", {})
            c["lmiaPositions4q"] = sum(v[1] for q, v in qmap.items() if q in w4)
            c["lmiaPositions2q"] = sum(v[1] for q, v in qmap.items() if q in w2)
            c["lmiaPositions1q"] = sum(v[1] for q, v in qmap.items() if q in w1)
            # #286 职业拆分(raw nocs 字典即近两年窗口聚合,与 positions 同口径):JSON 串直下沉,排序归消费端
            c["lmiaNocs"] = json.dumps(e["nocs"], ensure_ascii=False) if e.get("nocs") else None
            lmia_hit += 1
        print(f"  LMIA 雇佣记录匹配: {lmia_hit}/{len(companies)} 公司(窗口 {all_qs[-4:] if all_qs else []})")

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
    if dropped_expired[0]:
        print(f"  #124 验尸剔除: {dropped_expired[0]} 个已过期帖不进 mart(seed 将按既有规则置 closed)")
    if LATE_SALARY[0]:
        # 留痕:这个数 = 本轮抢在 04d 之后落盘的新帖。恒为 0 说明窗口已关;持续偏大 = 抓取与建表撞得厉害,
        # 该去看编排顺序而不是加大兜底。
        print(f"  薪资兜底: {LATE_SALARY[0]} 个新帖在 04d 之后落盘,09 现算现补(否则页面薪资列为空)")

    # #125 批C 首跑教训:重复跨轮累积在 DB(同岗重发 externalId 会换),单轮 mart 快照内每岗唯一 →
    # 快照内标记恒 0。isDup 改由 seed 事务内窗口 UPDATE 全量重算(见 cms seed route),mart 不再携带该位

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
            # 年份序列(2026-08-14 竞争卡年份筛选):近 3 年存量,学签单列、工签=TFWP+IMP 合计。
            # 官方存量停在 2024 → 2025/2026 自然缺位,前端显「—」不编数
            years = sorted((tr.get("study") or {}).get("byYear") or {})[-3:]
            for y in years:
                for c in info:
                    s = ((tr.get("study") or {}).get("byYear") or {}).get(y, {}).get(c)
                    w1 = ((tr.get("tfwp") or {}).get("byYear") or {}).get(y, {}).get(c)
                    w2 = ((tr.get("imp") or {}).get("byYear") or {}).get(y, {}).get(c)
                    if s is None and w1 is None and w2 is None:
                        continue
                    info[c].setdefault("trSeries", {})[y] = {
                        "study": s, "work": (w1 or 0) + (w2 or 0) if (w1 is not None or w2 is not None) else None}
        if IN_IRCC_PR.exists():
            pr = json.loads(IN_IRCC_PR.read_text(encoding="utf-8"))
            for c, v in (pr.get("byProv") or {}).items():
                if c in info:
                    info[c]["pnpPr"] = {"n": v, "year": pr.get("year", "")}
        # 新发学签流量(2026-08-03):存量表官方停在 2024,这条是唯一能反映当期的官方学签数字。
        # **口径独立不混用**——存量=在库人数(竞争比分母),流量=当期新增;各带自己的年份与「至几月」。
        if IN_IRCC_FLOW.exists():
            fl = json.loads(IN_IRCC_FLOW.read_text(encoding="utf-8"))
            for c, years in (fl.get("byProv") or {}).items():
                if c not in info or not years:
                    continue
                latest = max(years)
                info[c]["studyFlow"] = {"year": latest, **years[latest],
                                        "prev": (years.get(str(int(latest) - 1)) or {}).get("n")}
                # 流量年份序列(近 5 年,竞争卡年份筛选用;进行年 complete=false 带 throughMonth)
                info[c]["flowSeries"] = {y: years[y] for y in sorted(years)[-5:]}
        if IN_IRCC_ALLOC.exists():
            alloc = json.loads(IN_IRCC_ALLOC.read_text(encoding="utf-8"))
            for r in alloc.get("rows", []):
                c = r.get("prov")
                if c in info:
                    info[c]["alloc"] = {"y2026": r.get("y2026"), "y2025": r.get("y2025"), "y2024": r.get("y2024")}
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
    # NL 官网指定雇主名录(C4-W4,build_nl_employers.py 产,639 家):它就是 NL 的 AIP 指定雇主
    # 官方全量名录(与旧聚合源同一体系,Strobel TEK 两边都在)——旧源只收到 94 家,官方名录 639 家
    # 且带申报 NOC → **有官方名录时旧源的 NL 行整省让位**,否则同一雇主出两行。
    # nocs = 雇主页「NOC's Requested」明文的码(逗号连接,去重);只有职位名没有码的不反推,宁缺毋滥。
    designated, nl_official = [], []
    if IN_NL_EMPLOYERS.exists():
        try:
            nle = json.loads(IN_NL_EMPLOYERS.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单文件坏了不拖垮整个 mart
            nle = {}
        for e in nle.get("employers", []):
            codes = sorted({n["noc"] for n in e.get("nocs", []) if n.get("noc")})
            nl_official.append({"name": e.get("name"), "province": "NL",
                                "location": e.get("location") or "", "isTech": False,
                                "source": "AIP", "nocs": ",".join(codes),
                                # 出处随行(C5b 发现):判定层要引「639 家里 3 家申报过 72310」,
                                # 没有 url/fetched 这条 supporting fact 挂不上 evidence,只能闭嘴。
                                "url": e.get("url") or "", "fetched": nle.get("fetched", "")})
    if IN_AIP.exists():
        for e in json.loads(IN_AIP.read_text(encoding="utf-8")):
            if nl_official and e.get("province") == "NL":
                continue
            # PE(B4):出处=官方名单页(经 Wayback 存档取),fetched=快照日期——引证惯例出处随行
            pe_url = ("https://www.princeedwardisland.ca/en/information/office-of-immigration/"
                      "atlantic-immigration-program-designated-employers") if e.get("province") == "PE" else ""
            designated.append({"name": e.get("employer"), "province": e.get("province"),
                               "location": e.get("location"), "isTech": bool(e.get("tech")), "source": "AIP",
                               "nocs": "", "url": pe_url, "fetched": e.get("asOf", "")})  # 旧聚合源不含申报职位/逐家页 —— 空串是「来源没有」,不是「没申报」
    designated += nl_official

    # NOC 分类维度(大/中/小 + TEER,数据集出现的层级组合)
    # 维度行带上中/小类的英韩名(2026-08-03):先前显示层靠 i18n 里人肉维护的 cat.*,
    # 分类一变就漏成「中文混进英文界面」。名字跟着分类走同一条管线,前端只读维度表。
    cat_keys = sorted({(j["broad"], j["mid"], j["fine"], j["teer"] if j["teer"] is not None else -1) for j in jobs})
    cat_i18n = {}
    for n in {j.get("noc") for j in jobs if j.get("noc")}:
        c = NOC.classify(n)
        cat_i18n.setdefault(c["broad"], (c["broadEn"], c["broadKo"]))
        cat_i18n.setdefault(c["mid"], (c["midEn"], c["midKo"]))
        cat_i18n.setdefault(c["fine"], (c["fineEn"], c["fineKo"]))
    noc_categories = [{
        "broad": b, "mid": m, "fine": f, "teer": (t if t >= 0 else None),
        "broadEn": cat_i18n.get(b, (None, None))[0], "broadKo": cat_i18n.get(b, (None, None))[1],
        "midEn": cat_i18n.get(m, (None, None))[0], "midKo": cat_i18n.get(m, (None, None))[1],
        "fineEn": cat_i18n.get(f, (None, None))[0], "fineKo": cat_i18n.get(f, (None, None))[1],
    } for b, m, f, t in cat_keys]
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
                        # program:PNP(默认)/AIP —— 前端按项目分开判(AIP 与省提名是两条路,E6-09)
                        "program": d.get("program", "PNP"),
                        "type": d.get("type", "indemand"), "url": d.get("url", ""), "fetched": d.get("fetched", ""),
                        # appliesTo:清单管哪几条子通道(空=全项目)。SK 排除清单只管 OID/EE,
                        # Employment Offer 不受约束 —— 少这一列判定层会把「SK 走不通」判给不该判的人(C4)。
                        "appliesTo": d.get("appliesTo", ""),
                        "noc": o["noc"], "name": o.get("name", ""), "gtaRestricted": bool(o.get("gtaRestricted"))})

    # #280:抽选流名中文灰注(本地 qwen 批译缓存,translate_draw_streams.py 产)——
    # 缓存没有的 stream(还没翻/翻译校验没过)streamZh 留 None,前端回退纯英文,不是报错
    draw_stream_zh: dict = {}
    if IN_DRAW_STREAM_ZH.exists():
        try:
            draw_stream_zh = {k: v.get("zh") for k, v in json.loads(IN_DRAW_STREAM_ZH.read_text(encoding="utf-8")).items()}
        except Exception:  # noqa: BLE001
            draw_stream_zh = {}

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
            # 截断放宽(C4):普通省 8→12;NB 按类别定向邀请、一轮拆多行,判定层要数
            # 「某职业类别 2026 年被选中几轮」→ 给一年的量(48,与 build_draws.NB_MAX 一致)。
            for dr in v.get("draws", [])[:48 if prov == "NB" else 12]:
                stream = dr.get("stream", "")
                pnp_draws.append({**base, "kind": "draw", "drawDate": dr.get("date"),
                                  "stream": stream, "streamZh": draw_stream_zh.get(stream), "score": dr.get("score"),
                                  "invitations": dr.get("invitations"), "note": dr.get("note", "")})
            if v.get("notice"):
                pnp_draws.append({**base, "kind": "notice", "drawDate": v["notice"].get("date"),
                                  "stream": "", "streamZh": None, "score": None, "invitations": None,
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

    # 省提名打分表维度(E12-09):一行一档 —— province/factor/kind(row|bonus)/label/points/xor + 该节上限。
    # 摊平存,前端算分只做加法;wage 那类「规则不穷举」的存 rule 行(points 为空,rule 里写公式)。
    # 省提名官方打分表(E12-09):一行一档,各省表结构不同但列同一套。
    # factorGroup/groupMax 是 SK 那种「官方分了 FACTOR I/II 且各有上限」的省才有(BC 无分组 → 留空);
    # passMark 是官方硬门槛(SK 60 分才能申请),BC 没有这种门槛 → 留空,前端改对照真实抽选线。
    # 展开「任何技工工种」要一份 NOC 全集:用官方名录而不是「库里出现过的岗位」——
    # 后者随每日抓取涨落,同一份分值表今天问、明天不问,用户会以为我们在乱改规则
    noc_universe: list[str] = []
    if IN_NOC_DESC.exists():
        try:
            noc_universe = list((json.loads(IN_NOC_DESC.read_text(encoding="utf-8")).get("byNoc") or {}).keys())
        except Exception:  # noqa: BLE001 — 名录读不到就只留官方那 10 个 NOC,不猜技工
            noc_universe = []

    pnp_score_factors = []
    for src in IN_SCORE_TABLES:
        if not src.exists():
            continue
        try:
            tbl = json.loads(src.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单省表坏了不拖垮整个 mart
            continue
        gmax = tbl.get("groupMax") or {}
        base = {"province": tbl.get("province", ""), "system": tbl.get("system", ""),
                "maxTotal": tbl.get("maxTotal"), "passMark": tbl.get("passMark"), "url": tbl.get("url", ""),
                "guideEffective": tbl.get("guideEffective", ""), "fetched": tbl.get("fetched", "")}
        for fname, f in (tbl.get("factors") or {}).items():
            fbase = {**base, "factor": fname, "factorMax": f.get("max"),
                     "factorGroup": f.get("group", ""), "groupMax": gmax.get(f.get("group", ""))}
            for kind in ("rows", "bonus"):
                for i, x in enumerate(f.get(kind, [])):
                    # appliesTo:这一行的**适用范围**(现在只有 BC「执业资格 +5」有 —— 官方写明只对
                    # 表内 11 类职业成立)。搭 rule 这个既有的规则串走,不为 11 行另起一张表;
                    # 「任何技工工种」在数据层就展开成 NOC 清单,前端只做集合判断,不在 UI 里分类。
                    applies = x.get("appliesTo")
                    pnp_score_factors.append({**fbase, "kind": kind[:-1] if kind == "rows" else kind,
                                              "seq": i, "label": x.get("label", ""), "points": x.get("points"),
                                              "xorPrev": bool(x.get("xorWithPrev")),
                                              "rule": json.dumps(expand_applies(applies, noc_universe), ensure_ascii=False) if applies else ""})
            if f.get("rule"):
                pnp_score_factors.append({**fbase, "kind": "rule", "seq": 0,
                                          "label": f.get("rule", ""), "points": None, "xorPrev": False,
                                          "rule": json.dumps({k: f.get(k) for k in ("rule", "floorAt", "capAt")}, ensure_ascii=False)})

    pnp_requirements = build_pnp_requirements(IN_REQ_TABLES)

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
                    # 窄位(图表横轴/chip/报告 H1)用的短名(04g 产,2026-08-02 起三语);
                    # 没有就留空,前端回退完整译名 —— 官方英文 title 一个字不动,短名是**另一列**
                    "titleZhShort": tr.get("zhShort", ""),
                    "titleKoShort": tr.get("koShort", ""),
                    "titleEnShort": tr.get("enShort", ""),
                    "titleZh": tr.get("zh", ""), "titleKo": tr.get("ko", ""),
                    "duties": "\n".join(v.get("duties", [])),
                    "requirements": "\n".join(v.get("requirements", [])),
                    "fetched": fetched})

    # ── 职业在招量聚合(2026-08-12 Frank「把这个数据现在数据库里聚合好」)────────────
    # 先前选职业控件的热门榜是**每次请求现算**一个 GROUP BY(还带 percentile_cont 求中位),
    # 慢到要靠进程内缓存 + 前端分两次拉(先内置 14 个兜底、再换真榜)—— 用户看到的就是「一点一点刷出来」。
    # 脏活归 ETL:这里一次算完落 mart,库里按 open 建索引,前端(甚至 SSR)一次读出直接画。
    noc_openings = []
    if True:
        by_noc: dict = {}
        for j in jobs:
            n = j.get("noc")
            if not n or j.get("status") != "open":
                continue
            b = by_noc.setdefault(n, {"open": 0, "eligible": 0, "sal": [], "broad": {}})
            b["open"] += 1
            if j.get("pnpEligible"):
                b["eligible"] += 1
            if isinstance(j.get("salaryAnnual"), (int, float)):
                b["sal"].append(float(j["salaryAnnual"]))
            if j.get("broad"):
                b["broad"][j["broad"]] = b["broad"].get(j["broad"], 0) + 1
        desc_by_noc = {d["noc"]: d for d in noc_descriptions}
        for n, b in by_noc.items():
            d = desc_by_noc.get(n, {})
            sal = sorted(b["sal"])
            med = None
            if sal:                                   # 中位数与 SQL 的 percentile_cont(0.5) 同口径(偶数取两数均值)
                mid = len(sal) // 2
                med = sal[mid] if len(sal) % 2 else (sal[mid - 1] + sal[mid]) / 2
            noc_openings.append({
                "noc": n, "open": b["open"], "eligible": b["eligible"],
                "medianSalary": round(med) if med is not None else None,
                # 大类取该职业岗位里出现最多的那个(与 SQL 的 mode() 同口径)
                "broad": max(b["broad"].items(), key=lambda kv: kv[1])[0] if b["broad"] else "",
                "title": d.get("title", ""), "titleZh": d.get("titleZh", ""),
                "titleZhShort": d.get("titleZhShort", ""), "titleKoShort": d.get("titleKoShort", ""),
                "titleEnShort": d.get("titleEnShort", ""),
            })
        noc_openings.sort(key=lambda r: (-r["open"], r["noc"]))   # 落盘即有序,消费端不用再排


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
                "region": r.get("region", ""), "title": r["title"], "titleZh": r.get("titleZh") or None,
                "date": (r.get("date") or "")[:10],
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

    # 判死名单显式下发(2026-08-03):光把死帖剔出 mart 不够 —— seed 的下架规则还要求「发布>30 天」,
    # 于是 28 天前就死掉的岗一直挂着「在招」(Fort Qu'Appelle 用户点两次申请撞过期页的那一单)。
    # 验尸拿到的 410/过期页是**事实**,不是「本次没抓到」的推断,不该受那条防误杀规则约束 →
    # 单独出一张 closed_jobs,seed 见名单即置 closed,closedAt 用判死时刻(喂 JSON-LD 的 validThrough)。
    closed_jobs = [{"externalId": f"jb:{pid}", "closedAt": ts} for pid, ts in
                   (json.loads(IN_EXPIRED.read_text(encoding="utf-8")).get("dead", {}).items()
                    if IN_EXPIRED.exists() else [])]

    # 「本轮见过」名单(2026-08-04):seed 的下架对账**只**认它,不再拿去重后的 mart.jobs 当见过集。
    # 一个岗被下架从此只剩两条路:① 命中 closed_jobs 判死名单(410/过期页=事实);
    # ② 真的不在这张表里 且 发布已超 30 天(推断,保守兜底)。展示去重不再有下架副作用。
    print(f"  seen_ids(本轮见过): {len(seen_ids)} · mart.jobs(展示去重后): {len(jobs)} · "
          f"见过但不进 mart(展示去重/同 ext 重复): {len(seen_ids) - len(jobs)}")

    return {
        "companies": list(companies.values()), "jobs": jobs, "closed_jobs": closed_jobs,
        "seen_ids": sorted(seen_ids),
        "provinces": provinces, "cities": cities, "districts": districts,
        "designated_employers": designated,
        "noc_categories": noc_categories, "sources": sources, "experience_levels": experience_levels,
        "pnp_occupations": pnp_occupations, "pnp_draws": pnp_draws, "pnp_score_factors": pnp_score_factors,
        "pnp_requirements": pnp_requirements, "pnp_ops_stats": build_pnp_ops_stats(IN_PNP_STATS),
        "ee_categories": ee_categories,
        "ee_points_grid": build_ee_points_grid(IN_EE_CRS, IN_EE_ELIG),
        # 语言原始成绩区间不是“分数项”:独立 mart,从结构上杜绝与 CRS/FSW67 相加。
        "ee_language_grid": build_ee_language_grid(IN_EE_LANG),
        "noc_descriptions": noc_descriptions,
        "noc_openings": noc_openings,
        "field_sources": field_sources,
        "dli": dli,
        "news": news,
    }


def main() -> None:
    OUT_MART.mkdir(parents=True, exist_ok=True)
    mart = build()
    # 验尸用的「还在板上」名单(2026-08-03;2026-08-04 改口径):verify_expired 的预算只该花在
    # 用户看得见的岗上。**改用 seen_ids 而不是去重后的 jobs**——修完去重副作用后,被展示去重丢掉的帖
    # 仍以 open 留在库里、用户仍点得到(DB 的重复判定带城市),它们必须继续被验尸,否则永不判死。
    # 剩下被筛掉的仍是库里早已 closed / 中介过滤掉的帖,预算照样不白花。
    # 写 processed/ 不写 mart/:mart 目录整个会被 upload_mart 传去 cms,这张表纯属 ETL 内部协作。
    OUT_MART_OPEN_IDS.write_text(json.dumps(sorted(
        e[3:] for e in mart["seen_ids"] if e.startswith("jb:")
    )), encoding="utf-8")
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
