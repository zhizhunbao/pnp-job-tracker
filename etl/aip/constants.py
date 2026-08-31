"""
aip 域常量 —— 域词汇表(大西洋移民计划:四省官方指定雇主名录 + 申请人门槛库;
照 company/noc 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

沿革:2026-08-31 批E 从 pilot 域拆出(Frank「拆成三个 很少有人有法语」)。
本域是**纯移动**:原 pilot/constants.py 第 2 段(employers)与第 6 段(aip_rules)
整段搬来,常量名、常量值、正则、模板、每条 docstring 全部逐字未改,产物路径一字不动。
批E 拆分改动仅两处形式项,均不改值:
  · 段号重编 2/6 → 2/3(本域只有两步,镜像编号跟着收);
  · ENC_UTF8 从原第 1 段「共享词汇」搬进本文件第 1 段(它仍是两段共用的唯一共享项);
    原第 1 段的 ERRORS_IGNORE / K_PROVINCE 在本域只有 employers 一个消费者,
    随该段搬进第 2 段(其 docstring 里提到的 quota/communities 两步归 rcip/fcip 两域)。
extractors/ 私件群不随本域(那是社区抽取器,归 rcip/fcip)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串/数值/to_* 体内字典键外,一切字面量住这;
文案模板一律 *_TPL,JSON/wire 键一律 K_ 词族,官方原句一律 *_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(两段共用:统一编码)
# =========================================================================

ENC_UTF8 = "utf-8"
"""文本读写的统一编码(五个步骤全用)。"""

# =========================================================================
# 2. employers 步(AIP 官方指定雇主名录:NL/NB/NS/PE 四省)
# =========================================================================

ERRORS_IGNORE = "ignore"
"""读外来文本的容错模式:坏字节直接丢(employers 读 NL 语料 md、quota 读 crawl 缓存 html
两处原样沿用 —— 与 communities 的 replace 不是一档,别并)。"""

K_PROVINCE = "province"
"""行键:省码(employers/details/quota/communities 四步共用)。"""

EMP_DOC = """AIP designated-employer list — the OFFICIAL per-province "sponsoring employer"
list for the Atlantic Immigration Program (the only PNP route that publishes one).
For a tech grad, this is the authoritative sponsor pool for Atlantic Canada; but as
the data shows, it is overwhelmingly food/retail/care, so the tech-relevant subset
is tiny (this step highlights it).

Sources (official):
  NL — already crawled to data/crawl/nl-immigration/md/employer (has NAICS + NOC)
  NB — https://www2.gnb.ca/.../designated-employers-employeurs-designes.pdf
  NS — https://liveinnovascotia.com/.../Designated_AIP_employers.pdf
  PE — list source not yet located on princeedwardisland.ca (TODO)

B4 判定留痕(2026-08-08,docs/implementation/在招担保雇主/04_B4 §3c):
  NS/NB 官方名录 PDF **不带 NOC 维度**(列=雇主名/地点;本步 parse 实核)——职业级精筛
  只能走岗位侧(jobs.noc × aip),别在名录侧造字段。NL 的 NOC 维度在 nl-imm crawl(C4 已入库)。
  保鲜=本步在 pnp 源容器时更(docker-compose SOURCE=pnp,SCRAPE_INTERVAL 3600)。

(原脚本还挂了 `PROJECT_ROOT = paths.ROOT` —— 2026-08-31 批C 全溶时全文 grep 零消费者,
按方言律⑨「零消费者退役」摘除,记录在此。)"""
"""本步的来源与判定留痕(原 scrape_aip_employers.py 文件头,逐字折进;
Frank 的方言律「注释只许 docstring」下,长篇背景以常量 docstring 存档)。"""

IN_NL_EMP_DIR = paths.POLICY / "nl-immigration" / "md" / "employer"
"""NL 雇主页语料目录(nl-immigration crawl 役产,每雇主一个 md,带 NAICS + NOC)。"""

OUT_AIP_DIR = paths.AIP
"""AIP 名录两件产出的目录。"""

OUT_AIP_JSON = paths.AIP / "aip-designated-employers.json"
"""四省全量指定雇主行(下游 09 与判定层消费的正本)。"""

OUT_AIP_MD = paths.AIP / "aip-designated-employers.md"
"""人读版报告(省级总数/科技子集 + 三省科技雇主明细)。
⚠️ 2026-08-31 批C 全溶时 grep 全仓:除本步自己外没有别的消费者,疑似零消费者产出;
按「本批只溶解,简化要单独举证」原则**照旧生成**,候选清单进交付报告由 Frank 拍。"""

EMP_TIMEOUT_S = 40
"""NB/NS 官方 PDF 的下载超时秒数。"""

PDF_FILETYPE = "pdf"
"""fitz.open 的 filetype 参数(从内存流开 PDF 必须显式给)。"""

PDFS = {
    "NB": "https://www2.gnb.ca/content/dam/gnb/Corporate/Promo/Immigration/designated-employers-employeurs-designes.pdf",
    "NS": "https://liveinnovascotia.com/sites/default/files/2024-07/Designated_AIP_employers.pdf",
}
"""走 PDF 的两省(省码 → 官方名录 PDF 直链)。"""

TECH_NAME = re.compile(
    r"\b(tech|software|systems?|solutions?|digital|data|cyber|network|fibre?net|robotic|"
    r"analytic|computer|electronic|semiconductor|wireless|innovation|labs?|\.io|telecom|"
    r"informatics?|automation|aerospace|engineering|consult)\b", re.I)
"""按公司名判「科技相关」的弱信号(NB/NS 名单不给行业字段;weak but all we have there)。"""

TECH_NOC = {"20012", "21211", "21221", "21222", "21223", "21230", "21231", "21232",
            "21233", "21234", "21311", "22220", "22221", "22222"}
"""核心科技 NOC(只有 NL 名录带 NOC 码 —— 那一路是精确判定,不靠公司名猜)。"""

SKIP_WORDS = ("designated", "employeurs", "current as", "the following", "voici une",
              "this list", "cette liste", "p a g e", "atlantic immigration", "programme",
              "positions with", "if you are", "les postes", "si vous")
"""PDF 正文里的套话/页眉页脚词(命中即不是雇主名;原 `_SKIP`,2026-08-31 下划线名退役)。"""

BULLET = "•"
"""PDF 里每个雇主的引导符 —— 名字是它后面第一个非空行(「• name」与「•\\n name」两种都吃)。"""

NAME_MIN_LEN = 3
"""雇主名的最短长度(短于它的一律当解析噪音丢)。"""

NAME_TRIM_CHARS = " ."
"""雇主名首尾要剥的字符(PDF 行尾常带句点)。"""

NOISE_RE = re.compile(r"[\d()/\-, ]+")
"""纯数字/标点行(fullmatch 命中 = 页码或表格残渣,不是雇主名)。"""

NS_LOC_RE = re.compile(r"\s[-–]\s([A-Za-z .'/]+)$")
"""NS 名单在雇主名后追加「 - City」的地点尾巴(只对 NS 生效)。"""

PROV_NS = "NS"
"""省码 NS —— 地点尾巴只在这一省剥。"""

NL_MARKER = "NOC's Requested"
"""NL 雇主页的判据串:有它才是一份真雇主档(没有的 md 是别的页)。"""

NL_MD_GLOB = "*.md"
"""NL 语料目录的文件通配。"""

NL_TITLE_RE = re.compile(r'^title:\s*"?(.+?)"?\s*$', re.M)
"""NL md front-matter 的 title 行(取不到就退回文件名 stem)。"""

NL_OFFICE_RE = re.compile(r"\s+-\s+Office")
"""NL 雇主名后的站点后缀(「 - Office …」),按它切掉。"""

NL_LOC_RE = re.compile(r"\*\*Location\*\*\s*\n\s*(.+)")
"""NL md 里的地点行。"""

NOC5_RE = re.compile(r"\b\d{5}\b")
"""五位 NOC 码(NL 页里 NOC's Requested 段落的码)。"""

PROV_NL = "NL"
"""省码 NL。"""

PROV_PE = "PE"
"""省码 PE。"""

PE_DOC = """PE(B4 §3b,2026-08-08):官方只发网页不发文件,页面在 Radware WAF 后(不绕验证码)。
数据经 web.archive.org 存档快照 httpx 直取(存档站公开;快照 1-3 月一存)——staleness 以快照里
页面自带的 Published date 为准。2026-04-19 快照实核 391 家(A-Z <li> 列表,首条 100066 PEI Inc.)。"""
"""PE 一路为何走 Wayback 的举证(原行内注释,逐字折进)。"""

PE_PAGE = ("https://www.princeedwardisland.ca/en/information/office-of-immigration/"
           "atlantic-immigration-program-designated-employers")
"""PE 官方名单页(本体在 WAF 后,只经存档快照取)。"""

PE_MIN_ROWS = 300
"""PE 解析量 sanity 下限:低于它 = 解析坏了/快照残缺 → 保旧不清空(宁可留旧)。"""

CDX_URL = "http://web.archive.org/cdx/search/cdx"
"""Wayback 快照索引接口。"""

CDX_PARAMS = {"url": PE_PAGE, "output": "json", "filter": "statuscode:200", "limit": "-5"}
"""快照索引的查询参数:只要 200 的最近 5 条(limit 负数 = 从最新往回数)。"""

CDX_TIMEOUT_S = 90
"""快照索引查询的超时秒数。"""

WAYBACK_TPL = "http://web.archive.org/web/{ts}/{url}"
"""按时间戳取某一份快照正文的 URL 模板。"""

WAYBACK_TIMEOUT_S = 60
"""快照正文的下载超时秒数。"""

PE_TS_LEN = 8
"""快照时间戳里取作 asOf 的前缀长度(YYYYMMDD)。"""

PE_LI_RE = re.compile(r"<li[^>]*>\s*([^<]+?)\s*</li>")
"""名单区的 <li> 纯文本项(快照实核干净,无导航混入)。"""

PE_NAME_MAX_LEN = 120
"""单条名字的长度上限(超了必是整段正文被当成 li 抓进来)。"""

PE_NAV_RE = re.compile(r"(?i)(home|contact|privacy|feedback|government|service|about pei|français)$")
"""导航/页脚 li 的典型词(真雇主名不含这些,命中即剔)。"""

MIN_ROWS_DOC = """解析量护栏(2026-08-12 实撞):NB 官方 PDF 换版 → bullet 切不出来,**1263 家被 29 家静默覆盖**,
一路灌进 mart(3322→2088)与判定层,没有任何报错。PE 早就有这道闸(PE_MIN_ROWS),
只是没推广到别的省 —— 一个省栽过的坑,别的省照样能栽。
规矩:解析量低于下限 = 解析坏了,**保旧不清空**并大声喊;宁可数据旧,不可数据没。
NL 在**本步**里是旧聚合源(94 家);官方全量 639 家走 raw/pnp/nl-employers.json,
由 09_build_mart 整省让位替换 —— 所以这里的 NL 下限按 94 定,别拿 639 当基线。"""
"""MIN_ROWS 的实撞留痕(原行内注释,逐字折进)。"""

MIN_ROWS = {"NL": 80, "NB": 800, "NS": 1000, "PE": PE_MIN_ROWS}
"""各省解析量下限(见 MIN_ROWS_DOC 的 NB 实撞)。"""

K_TECH = "tech"
"""雇主行键:是否科技相关。"""

K_EMPLOYER = "employer"
"""雇主行键:雇主名。"""

K_LOCATION = "location"
"""雇主行键:地点(NB/NL 常为空)。"""

PE_FAIL_TPL = "  PE: Wayback 取档失败({err}),本轮保旧"
"""PE 快照取不回来时的留痕行。"""

PE_SHORT_TPL = "  PE: 解析仅 {n} 行(<{floor}),疑残缺,本轮保旧"
"""PE 解析量不足下限时的留痕行。"""

PE_OK_TPL = "  PE: Wayback {ts} 快照 {n} 家"
"""PE 正常产出时的报数行。"""

PDF_FAIL_TPL = "  [WARN] {prov}: 取 PDF 失败({err})"
"""单省 PDF 取档失败(不拖垮整份名录)的留痕行。"""

GUARD_WARN_TPL = "  [WARN] {prov}: 解析仅 {n} 行(下限 {floor})—— 疑似官方页/PDF 换版,{tail}"
"""解析量塌方的告警行(尾巴见 GUARD_KEEP_TPL / GUARD_NO_OLD)。"""

GUARD_KEEP_TPL = "保旧 {n} 行不清空"
"""塌方且有旧档时的处置说法。"""

GUARD_NO_OLD = "且无旧档可退,按解析结果落盘"
"""塌方且连旧档都没有时的处置说法。"""

PROV_NAME = {"NL": "纽芬兰与拉布拉多（NL）", "NB": "新不伦瑞克（NB）",
             "NS": "新斯科舍（NS）", "PE": "爱德华王子岛（PE）"}
"""md 报告里的省份人话名。"""

PROV_ORDER_ALL = ("NL", "NB", "NS", "PE")
"""md 汇总表的省序(四省全上)。"""

PROV_ORDER_TECH = ("NL", "NB", "NS")
"""md 科技明细的省序(PE 快照只有名字没有地点,不出明细)。"""

MD_HEAD = ("# 大西洋四省 · AIP 官方指定（担保）雇主名单\n",
           "> AIP 是唯一公布官方指定雇主名单的路线。下表是各省**全量**雇主数与**科技相关**子集。",
           "> 现实：名单 90%+ 是餐饮/零售/护理，科技雇主极少——印证了'大西洋雇主路对科技背景太窄'。\n",
           "| 省 | 指定雇主总数 | 科技相关 | 占比 |", "|---|---:|---:|---:|")
"""md 报告的抬头与汇总表表头。"""

MD_ROW_EMPTY_TPL = "| {name} | （未抓到/无源）| — | — |"
"""汇总表里该省一行都没有时的占位行。"""

MD_ROW_TPL = "| {name} | {total} | {tech} | {pct:.0f}% |"
"""汇总表的省份行。"""

PERCENT_BASE = 100
"""占比换算的百分号基数。"""

MD_TECH_HEAD_TPL = "\n## {name} — 科技相关指定雇主（{n} 家）\n"
"""科技明细的分省小标题。"""

MD_TECH_COLS = ("| 雇主 | 地点 |", "|---|---|")
"""科技明细表的表头两行。"""

MD_TECH_ROW_TPL = "| {employer} | {location} |"
"""科技明细表的雇主行。"""

MD_TAIL = ("\n> 注：NB/NS 名单无行业字段，科技判定靠公司名关键词（偏宽，含工程/咨询）；NL 用 NOC（精确）。",
           "> PE（爱德华王子岛）官方名单源未在 topic 页找到，待定位后补入。",
           "\n*由 `scripts/jobs/aip_designated_employers.py` 生成。*")
"""md 报告的脚注三行(末行的生成者路径是历史原文,原样保留 —— 改它 = 改产物)。"""

MD_LINE_SEP = "\n"
"""md 各行的拼接符。"""

EMP_TABLE_HEAD = "Province | total | tech"
"""收尾报数的表头行。"""

EMP_PROV_TPL = "  {prov}: {total:4} | {tech}"
"""收尾报数的省份行。"""

EMP_OUT_TPL = "\n→ {path}"
"""收尾指向 md 产物的一行。"""

# =========================================================================
# 3. aip_rules 步(AIP 申请人门槛库,quote-anchored)
# =========================================================================

RULES_DOC = """build_aip_rules — 联邦大西洋移民计划(AIP)申请人门槛库(G-AIP,2026-08-09;
设计 docs/design/一键三合一判定-20260809.md §4:#287 的硬前置,AIP 申请人侧生产 0 行)。

**quote-anchored**(照 build_pgwp / build_ee_rules 惯例):每条规则由人从官方原文抄成
结构化行,本步每轮实抓核对,**逐条验证引用仍逐字存在于对应页面**——页面改版引用消失
→ 保留旧表 + exit 1,绝不拿半份数据盖好数据。

只读 crawl 缓存(URL 铁律:先 grep manifest,再谈抓不到,禁猜 URL、禁现场上网抓)。
`data/crawl/fed-aip/` 首轮只到 depth 2(17 页),**申请人门槛细节页(work-experience /
proof-funds / settlement-service-provider-organizations 等)全挂在 how-to-immigrate/
eligibility.html 之下一跳、是 depth 3**,depth=2 探不到 —— 本批把 etl/crawl 的
discover_sources 的 fed-aip 种子深度 2→3 重跑过一次(照 fed-ee depth=4 同款先例),
缺失页已在缓存里,本步不再自己发请求。

产出 raw/ircc/aip_rules.json,形状对齐 raw/ircc/pgwp_rules.json / raw/ee/fed-eligibility.json
(province='FED' program='AIP',09 IN_REQ_TABLES 直接消费 → mart pnp_requirements →
引擎 facts.requirements 免费拿到)。

收的门槛:工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、语言(CLB 按 TEER 分档)、
学历(境内/境外 + ECA)、job offer 条款(全职/非季节性/时长/雇主指定/健康照护职业互认)、
安家资金(按家庭人数档)。页面上没写的一律不编(如「官方不公布」需要举证,举不出来落
not-collected —— 本表目前每条都有官方原句,不存在这种行)。"""
"""本步的判据与产出形状(原 build_aip_rules.py 文件头,逐字折进)。"""

AIP_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
            "immigrate-canada/atlantic-immigration")
"""AIP 官方页的公共前缀(原 `_BASE`,2026-08-31 下划线名退役)。"""

IN_URL_ELIG = AIP_BASE + "/how-to-immigrate/eligibility.html"
"""Who can apply(索引页)。"""

IN_URL_WORK = AIP_BASE + "/how-to-immigrate/work-experience.html"
"""工作经验门槛 + 国际毕业生豁免。"""

IN_URL_FUNDS = AIP_BASE + "/proof-funds.html"
"""安家资金(按家庭人数档)。"""

IN_URL_JOBOFFER = AIP_BASE + "/how-to-immigrate/job-offer.html"
"""job offer 条款。"""

IN_URL_LANG = AIP_BASE + "/language-testing.html"
"""语言 CLB 门槛(按 TEER 分档)。"""

IN_URL_EDU = AIP_BASE + "/education-assessment.html"
"""学历要求 + ECA。"""

OUT_AIP_RULES = paths.IRCC / "aip_rules.json"
"""AIP 申请人门槛表(09 IN_REQ_TABLES 直接消费)。"""

PAGE_URLS = {"elig": IN_URL_ELIG, "work": IN_URL_WORK, "funds": IN_URL_FUNDS,
             "joboffer": IN_URL_JOBOFFER, "lang": IN_URL_LANG, "edu": IN_URL_EDU}
"""页键 → 官方 URL(RULES 每条的 page 指的就是这里的键)。"""

QUOTE_FIXES = (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'))
"""归一化替换表:弯引号 → 直引号 —— 引用核对不被排版噪音干扰(同 build_pgwp/build_ee_rules)。"""

MAIN_TAG = "main"
"""正文容器标签(官方页的正文全在 <main> 里)。"""

HTML_PARSER = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml。"""

MISSING_QUOTE_LEN = 90
"""引用消失报告里原句的截断长度。"""

SUBJECT_APPLICANT = "applicant"
"""本表全部规则的主体:申请人(与雇主侧门槛表分开)。"""

K_PAGE = "page"
"""RULES 行键:这条规则的官方页(PAGE_URLS 的键)。"""

K_QUOTE = "quote"
"""RULES 行键:官方原句(逐字,核验用)。"""

K_FACTOR = "factor"
"""RULES 行键:门槛因子名。"""

K_STREAM = "stream"
"""RULES 行键:适用分流(teer-0-3 等;缺省空串)。"""

K_FAMILY_SIZE = "familySize"
"""RULES 行键:家庭人数档(只有安家资金分档规则才有,条件加键)。"""

K_TEXT = "text"
"""pages 表的记录键:归一化后的官方正文(引用核对的底本)。"""

RULES_OUT_NOTE = ("quote-anchored:valueText=官方原文,本脚本每轮验证其仍逐字在页面上;字段语义见 basis。"
                  "覆盖工作经验(小时数/时间窗/TEER 匹配/国际毕业生豁免)、job offer 条款(全职/非季节性/"
                  "时长/雇主指定/健康照护职业互认)、语言(CLB 按 TEER 分档)、学历(境内/境外+ECA)、"
                  "安家资金(fundsMinimum 按 familySize 分档,fundsPerAdditionalMember 是超 7 人后的"
                  "每人递增,value=None 编码进 basis,照 22P02 教训)。"
                  "AIP 只是三个大西洋省(NB/NS/PE/NL)共用的联邦项目框架——省一级各自的紧缺职业清单/"
                  "雇主指定名单不在本表,那是各省 <省>-req.json 的事。")
"""aip_rules.json 的口径说明(产物字段,逐字不改)。"""

RULES_PROVINCE = "FED"
"""产出表的省码:联邦项目。"""

RULES_PROGRAM = "AIP"
"""产出表的项目码。"""

RULES_IN_TPL = "IN  : {url}  (crawl 缓存 {fetched})"
"""逐页报出处的一行。"""

RULES_OUT_TPL = "OUT : {path}"
"""开跑时报落盘口的一行。"""

RULES_NO_CACHE_TPL = "✗ crawl 缓存里没有这一页(先跑 etl/crawl 的 discover_sources fed-aip):{url}"
"""缓存缺页时的 SystemExit 文案(**报错退出,不偷偷 httpx 补** —— 那正是「猜 URL」的老病根)。"""

RULES_MISSING_TPL = "✗ {n}/{total} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:"
"""引用核验失败的抬头行(其后逐条列出,再 exit 1)。"""

RULES_MISSING_ROW_TPL = "✗   [{factor}/{stream}] {quote}"
"""引用核验失败时的逐条明细行。"""

RULES_DONE_TPL = "✓ {n} 条规则全部引用核验通过 → {name}"
"""收尾报数行。"""

RULES = [
    {"page": "work", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=5;hoursPerWeek=30;minYears=1",
     "label": "At least 1,560 hours (30 hrs/week for 1 year) of related work experience in the past 5 years",
     "quote": "You need at least 1,560 hours of related work experience over the past 5 years."},
    {"page": "work", "factor": "workPeriodMin", "op": ">=", "value": 1, "unit": "years",
     "basis": "windowYears=5",
     "label": "The 1,560 hours must be worked over a period of at least 1 year",
     "quote": "You must have worked these hours over a period of at least 1 year."},
    {"page": "work", "factor": "workTeerMatch", "op": "rule", "value": "same-or-higher", "unit": "",
     "basis": "jobOfferTeer0->workTeer0,1,2,3,4;jobOfferTeer1->workTeer1,2,3,4;"
              "jobOfferTeer2->workTeer2,3,4;jobOfferTeer3->workTeer3,4;jobOfferTeer4->workTeer4",
     "label": "Work experience must be in the same TEER category as the job offer, or higher",
     "quote": "be in the same TEER category as your job offer or higher"},
    {"page": "work", "factor": "workPaid", "op": "rule", "value": "paid-only", "unit": "",
     "label": "Work experience must be from a paid job; volunteer work and unpaid internships don't count",
     "quote": "have been for a paid job"},
    {"page": "work", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "Self-employment does not count toward the work experience requirement",
     "quote": "not be from a self-employed job"},
    {"page": "work", "factor": "workExemptGrad", "op": "rule", "value": "exempt-if-atlantic-grad", "unit": "",
     "label": "International graduates of a recognized Atlantic Canada post-secondary institution "
              "are exempt from the work experience requirement",
     "quote": "You do not need to meet the work experience requirements if you're an international "
              "graduate and you:"},
    {"page": "work", "factor": "workExemptGradCredentialYears", "op": ">=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential (degree/diploma/certificate/trade or apprenticeship) must have taken at least 2 years",
     "quote": "took at least 2 years"},
    {"page": "work", "factor": "workExemptGradRecency", "op": "<=", "value": 2, "unit": "years",
     "basis": "appliesTo=workExemptGrad",
     "label": "Exemption credential must have been received less than 2 years before applying for PR",
     "quote": "you received less than 2 years before you applied for permanent residence"},
    {"page": "work", "factor": "workExemptGradResidencyMonths", "op": ">=", "value": 16, "unit": "months",
     "basis": "appliesTo=workExemptGrad;windowYears=2",
     "label": "Must have lived in 1 of the 4 Atlantic provinces for at least 16 months during the last "
              "2 years before graduating",
     "quote": "lived in 1 of the 4 Atlantic provinces for at least 16 months during the last 2 years "
              "before you graduated"},

    {"page": "joboffer", "factor": "offerFullTime", "op": ">=", "value": 30, "unit": "hoursPerWeek",
     "label": "Job offer must be full-time: at least 30 hours a week",
     "quote": "full-time (at least 30 hours a week)"},
    {"page": "joboffer", "factor": "offerNonSeasonal", "op": "rule", "value": "non-seasonal", "unit": "",
     "label": "Job offer must be non-seasonal (consistent and paid all year)",
     "quote": "non-seasonal (consistent and paid all year)"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-0-3", "op": ">=", "value": 1, "unit": "years",
     "label": "TEER 0/1/2/3 job offers: at least 1 year of employment from the date of becoming a permanent resident",
     "quote": "for at least 1 year from the time you become a permanent resident for TEER 0, 1, 2 or 3 job offers"},
    {"page": "joboffer", "factor": "offerDuration", "stream": "teer-4", "op": "rule", "value": "indefinite", "unit": "",
     "label": "TEER 4 job offers: permanent employment with no set end date",
     "quote": "for permanent employment with no set end date for TEER 4 job offers"},
    {"page": "joboffer", "factor": "offerSkillLevel", "op": "rule", "value": "same-or-higher", "unit": "",
     "label": "Job offer must be at the same or higher skill level as the qualifying work experience",
     "quote": "at the same or higher skill level as your qualifying work experience"},
    {"page": "joboffer", "factor": "offerDesignatedEmployer", "op": "rule", "value": "required", "unit": "",
     "label": "The job offer must come from a provincially designated employer",
     "quote": "Each province designates employers who can offer jobs under this program."},
    {"page": "joboffer", "factor": "offerOwnershipExclusion", "op": "rule", "value": "excluded", "unit": "",
     "label": "The job offer can't come from a company where you (or your spouse/common-law partner) "
              "are a majority owner",
     "quote": "The job offer can't come from a company in which you, your spouse or common-law partner "
              "are a majority owner."},
    {"page": "joboffer", "factor": "workHealthcareCrossQualify", "op": "rule",
     "value": "NOC31201/31301-experience->NOC33102/44101-offer", "unit": "",
     "label": "Work experience as a licensed practical nurse (NOC 31201) or registered nurse (NOC 31301) "
              "can be used for a job offer in NOC 33102 or NOC 44101",
     "quote": "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) "
              "can be used for a job offer in"},

    {"page": "lang", "factor": "language", "stream": "teer-0-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CLB 5 minimum for a job offer in TEER 0, 1, 2 or 3",
     "quote": "CLB 5 for job offer in TEER 0, 1, 2 or 3"},
    {"page": "lang", "factor": "language", "stream": "teer-4", "op": ">=", "value": 4, "unit": "CLB",
     "label": "CLB 4 minimum for a job offer in TEER 4",
     "quote": "CLB 4 for job offer in TEER 4"},
    {"page": "lang", "factor": "languageTestRecency", "op": "<=", "value": 2, "unit": "years",
     "label": "Language test results must be less than 2 years old when you apply",
     "quote": "These results must be less than 2 years old when you apply."},

    {"page": "edu", "factor": "education", "stream": "teer-0-1", "op": "rule",
     "value": "canadian-1yr-postsecondary", "unit": "",
     "label": "Education in Canada, TEER 0/1: a Canadian one-year post-secondary (or higher) credential",
     "quote": "a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "education", "stream": "teer-2-4", "op": "rule",
     "value": "canadian-high-school", "unit": "",
     "label": "Education in Canada, TEER 2/3/4: a Canadian high school diploma (or higher)",
     "quote": "a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-0-1", "op": "rule",
     "value": "foreign-equivalent-1yr-postsecondary", "unit": "",
     "label": "Education outside Canada, TEER 0/1: the foreign equivalent of a Canadian one-year "
              "post-secondary (or higher) credential",
     "quote": "the foreign equivalent of a Canadian one-year post-secondary (or higher) educational credential"},
    {"page": "edu", "factor": "educationForeign", "stream": "teer-2-4", "op": "rule",
     "value": "foreign-equivalent-high-school", "unit": "",
     "label": "Education outside Canada, TEER 2/3/4: the foreign equivalent of a Canadian high school diploma (or higher)",
     "quote": "the foreign equivalent of a Canadian high school diploma (or higher)"},
    {"page": "edu", "factor": "educationEcaRequired", "op": "rule", "value": "eca-required", "unit": "",
     "label": "Foreign education needs an Educational Credential Assessment (ECA) for immigration",
     "quote": "You must get an educational credential assessment (ECA) for immigration."},
    {"page": "edu", "factor": "educationEcaValidity", "op": "<=", "value": 5, "unit": "years",
     "label": "An ECA is only valid for 5 years",
     "quote": "ECAs are only valid for 5 years."},

    {"page": "funds", "factor": "fundsRequired", "op": "rule", "value": "required", "unit": "",
     "label": "Must prove enough money to support yourself and your family after arriving in Canada",
     "quote": "You must prove to us that you have enough money to support yourself and your family "
              "after you get to Canada."},
    {"page": "funds", "factor": "fundsWaivedIfWorking", "op": "rule", "value": "waived-if-authorized-worker", "unit": "",
     "label": "Proof of funds is waived if already working in Canada with a valid work permit",
     "quote": "You do not need to show proof of funds if you're already working in Canada with a valid work permit."},
    {"page": "funds", "factor": "fundsPerAdditionalMember", "op": "rule", "value": None, "unit": "CAD",
     "basis": "perAdditionalMemberCAD=1028;baseFamilySize=7",
     "label": "For each additional family member beyond 7, add $1,028",
     "quote": "If more than 7 people, for each additional family member, add $1,028"},

    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 3815, "unit": "CAD",
     "familySize": 1, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 1: $3,815 CAD",
     "quote": "1 $3,815"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 4750, "unit": "CAD",
     "familySize": 2, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 2: $4,750 CAD",
     "quote": "2 $4,750"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 5840, "unit": "CAD",
     "familySize": 3, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 3: $5,840 CAD",
     "quote": "3 $5,840"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 7090, "unit": "CAD",
     "familySize": 4, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 4: $7,090 CAD",
     "quote": "4 $7,090"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 8042, "unit": "CAD",
     "familySize": 5, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 5: $8,042 CAD",
     "quote": "5 $8,042"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 9070, "unit": "CAD",
     "familySize": 6, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 6: $9,070 CAD",
     "quote": "6 $9,070"},
    {"page": "funds", "factor": "fundsMinimum", "op": ">=", "value": 10098, "unit": "CAD",
     "familySize": 7, "basis": "asOf=2025-07-29",
     "label": "Minimum settlement funds for a family of 7: $10,098 CAD",
     "quote": "7 $10,098"},
]
"""AIP 申请人门槛的全部规则:一条规则一条官方原文。`page` 指 PAGE_URLS 的键,
`quote` 必须逐字(归一化后)出现在该页上,否则整表不更新(照 build_pgwp/build_ee_rules)。

分组:工作经验(work-experience.html)含国际毕业生豁免(「Exemption if you studied and
graduated in Atlantic Canada」段);Job offer 条款(how-to-immigrate/job-offer.html)含
健康照护职业互认(直接命中 #287 完美案例 NOC 33102 continuing care assistant 的路径:
LPN/RN 工作经验可用来满足 NOC 33102/44101 岗位的 job offer 门槛);语言
(language-testing.html);学历(education-assessment.html);安家资金(proof-funds.html)。

末 7 条 fundsMinimum 是安家资金表(proof-funds.html,「Minimum amount of money you need
to immigrate to Canada based on the size of your family」,Updated July 29, 2025):
一行一个家庭规模档,用 familySize 列(schema 已有,ON/其余省份门槛表同款用法)而不是
塞进 basis 编码。**2026-08-31 批C 全溶时把原来的 `FUNDS_TABLE` 推导式展开成 7 条字面量**
(推导式在方言律④下退役;FUNDS_TABLE 常量随之退役),展开结果与旧脚本逐条比对相等。"""


# =========================================================================
# 4. flag 步(官方名录 × 岗位雇主名 → 岗位表的 aip 字段)
# =========================================================================

IN_AIP_LIST = OUT_AIP_JSON
"""段4 输入①:段2 自己落的四省指定雇主名录(域内前后步,同一文件两个身份 ——
路径写两遍就是两份真相,故取别名不复制)。"""

IN_OUT_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"
"""段4 输入②兼输出①:Job Bank 全国岗位表(读雇主名 → 原地写回 aip 字段)。"""

IN_OUT_COMPANIES_DIR = paths.COMPANIES
"""段4 输入③兼输出②:ATS 各 <slug>/jobs.json 的根目录(原地写回)。"""

ATS_JOBS_GLOB = "jobs.json"
"""ATS 岗位文件名(rglob 模式)。"""

ATLANTIC = {"NL", "NB", "NS", "PE"}
"""AIP 只限大西洋四省;别省同名 franchise 不算。"""

INDENT_2 = 2
"""岗位表落盘缩进(与 05/05b 抓岗件一致,原值)。"""

K_AIP = "aip"
"""岗位行键:是否 AIP 指定雇主(本步产出的唯一字段)。"""

K_JOBS = "jobs"
"""ATS 岗位文件的行清单键。"""

SUFFIX_RE = re.compile(
    r"\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|lt[eé]e|"
    r"holdings?|group|services?|enterprises?)\b\.?", re.I)
"""公司后缀词(归一时整体去掉;原脚本常量名 `_SUFFIX`,溶段时按「主题_角色」改名,值一字未改)。"""

ALIAS_SPLIT_RE = re.compile(r"\bo/a\b|\bdba\b|\bd/b/a\b|\bo\.a\.\b")
"""「operating as」别名分隔:切开取前面的主名(输入已小写,故不带 re.I,原值)。"""

ALIAS_RE = re.compile(r"\bo/a\b(.+)", re.I)
"""名录行里的 o/a 别名(别名也单独入集合,两种写法都能匹配到)。"""

KEEP_RE = re.compile(r"[^a-z0-9& ]")
"""归一后允许保留的字符之外的一切(标点全换空格)。"""

FLAG_IN_LIST_TPL = "IN aip list      : {path}"
"""段4 开工报输入名录(原脚本对齐空格原样保留)。"""

FLAG_IN_OUT_TPL = "IN/OUT job bank  : {path}"
"""段4 开工报原地写回的岗位表(同上,对齐空格原样)。"""

FLAG_NAMES_TPL = "  designated employers (normalized): {n}"
"""段4 报归一化后的名录规模。"""

FLAG_DONE_TPL = "AIP flagged {flagged}/{total} jobs (employer on official AIP designated list)."
"""段4 收尾报命中数(原脚本英文原句,原样保留)。"""
