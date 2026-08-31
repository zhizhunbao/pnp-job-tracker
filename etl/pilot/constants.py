"""
pilot 域常量 —— 域词汇表(试点家族 AIP/RCIP/FCIP:指定雇主名录、社区清单、名额状态、
申请人门槛库;照 company/noc 三件套样张,段横幅三行框 + N. 编号,与 functions.py
同名同序镜像)。

沿革:2026-08-31 批C 全溶 —— 原五个步骤文件(scrape_aip_employers / build_pilot_details /
build_pilot_quota / build_pilot_communities / build_aip_rules)溶进本域五件,
步骤文件消失;各文件头与行内注释的决策记录逐字折进对应常量的 docstring,一条不删。
extractors/ 子目录原样不动(私件群,crawl/converters 先例)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串/数值/to_* 体内字典键外,一切字面量住这;
文案模板一律 *_TPL,JSON/wire 键一律 K_ 词族,官方原句一律 *_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:编码 / JSON 键词表 K_* / 跨步共用路径)
# =========================================================================

ENC_UTF8 = "utf-8"
"""文本读写的统一编码(五个步骤全用)。"""

ERRORS_IGNORE = "ignore"
"""读外来文本的容错模式:坏字节直接丢(employers 读 NL 语料 md、quota 读 crawl 缓存 html
两处原样沿用 —— 与 communities 的 replace 不是一档,别并)。"""

IN_COMMUNITIES = paths.PILOT / "pilot-communities.json"
"""社区名单表 —— communities 步产出、details/quota 两步读入(同一个文件;
本步自己的落盘口见第 5 段 OUT_COMMUNITIES)。"""

K_PROVINCE = "province"
"""行键:省码(employers/details/quota/communities 四步共用)。"""

K_NAME = "name"
"""行键:社区官方名 / 雇主名(details 的社区索引、quota 的社区对表、communities 的产出行)。"""

K_TYPE = "type"
"""行键:试点类型(RCIP / FCIP / RCIP+FCIP)。"""

K_ROWS = "rows"
"""产出 JSON 顶层键:行清单(details/quota/communities 三步的读写口)。"""

K_COMMUNITY = "community"
"""行键:所属社区官方名(details 的保旧索引、quota 的社区级行)。"""

K_URL = "url"
"""行键 / manifest 页键:出处 URL。"""

K_PAGES = "pages"
"""crawl manifest 顶层键:页清单(quota/communities 两步读)。"""

K_HTML = "html"
"""crawl manifest 页键:缓存文件名(html_cache 下的相对名)。"""

HTML_CACHE_DIR = "html_cache"
"""crawl 缓存实体目录名(manifest 同级)。"""

# =========================================================================
# 2. employers 步(AIP 官方指定雇主名录:NL/NB/NS/PE 四省)
# =========================================================================

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
# 3. details 步(社区指定雇主/职业清单自动刷新)
# =========================================================================

DET_DOC = """build_pilot_details — 社区指定雇主/职业清单**自动刷新**(E6-11 批C,2026-08-15)。

批B 用 agent 一次性抽了 18 社区;本步把它变成周更:pilot/extractors 里每社区一个抽取函数,
总控逐社区跑,**塌方保旧**:行数掉到基线一半以下、或抽取抛异常 → 该社区沿用上一版行并打「!」
(auto_update 记 ERROR 级);其余社区正常刷新。整步永远 exit 0,不拦役。

  IN : 各社区官方源(pilot.extractors 直连) + raw/pilot/pilot-{employers,occupations}.json(保旧底本)
       raw/pilot/pilot-communities.json(社区 → 省/类型)
  OUT: raw/pilot/pilot-employers.json + pilot-occupations.json(原地刷新)"""
"""本步的沿革与 IN→OUT(原 build_pilot_details.py 文件头,逐字折进)。"""

OUT_EMP = paths.PILOT / "pilot-employers.json"
"""各社区官方公示的指定雇主行(原地刷新,塌方保旧)。"""

OUT_OCC = paths.PILOT / "pilot-occupations.json"
"""各社区官方优先/在收职业行(原地刷新,塌方保旧)。"""

BASELINE_EMP = {
    "North Bay and Area": 228, "Sudbury, ON": 426, "Timmins, ON": 153, "Sault Ste. Marie, ON": 151,
    "Thunder Bay, ON": 406, "Superior East Region, ON": 15, "West Kootenay, BC": 263,
    "North Okanagan Shuswap, BC": 450, "Peace Liard, BC": 0, "Kelowna, BC": 52, "Moose Jaw, SK": 147,
    "Claresholm, AB": 23, "Steinbach, MB": 42, "Altona/Rhineland, MB": 23, "Brandon, MB": 39,
    "St. Pierre Jolys, MB": 6, "Pictou County, NS": 60, "Acadian Peninsula, NB": 32,
}
"""批B 基线(2026-08-15 实抽行数);哨兵 = 新抽 < 基线一半 → 疑似改版塌方,保旧。
Peace Liard 雇主基线 0(官方待公示):>0 即收,不设下限。"""

MIN_OCC = 10
"""职业清单的行数下限(各社区都是 ~25 条量级,低于它即疑改版塌方)。"""

CTYPE_BOTH = "RCIP+FCIP"
"""同名社区双类型(Sudbury/Timmins 各有 RCIP+FCIP 两行)时的类型说法。"""

K_EMPLOYERS = "employers"
"""抽取器出参键:雇主清单。"""

K_OCCUPATIONS = "occupations"
"""抽取器出参键:职业清单。"""

K_EMPLOYERS_URL = "employersUrl"
"""抽取器出参键:雇主清单的官方出处。"""

K_OCCUPATIONS_URL = "occupationsUrl"
"""抽取器出参键:职业清单的官方出处。"""

DET_IO_TPL = "IN_COMMUNITIES={comm}\nOUT_EMP={emp}\nOUT_OCC={occ}"
"""本步开跑时打印的 IN/OUT 路径(宪法既有:运行时打印)。"""

DET_CRASH_EXTRACT_TPL = "! {name} 抽取异常({kind}: {detail})—— 保旧"
"""单社区抽取抛异常时的留痕行(auto_update 按「!」升 ERROR 级)。"""

DET_EMP_SHORT_TPL = "! {name} 雇主 {n} 行(基线 {base})—— 疑似改版塌方,保旧"
"""单社区雇主行数塌方的留痕行。"""

DET_OCC_SHORT_TPL = "! {name} 职业 {n} 行(< {floor})—— 疑似改版塌方,保旧"
"""单社区职业行数塌方的留痕行。"""

DET_ERR_DETAIL_LEN = 80
"""抽取异常详情在留痕行里的截断长度。"""

DET_EMP_NOTE = ("各社区官方公示的指定雇主名单(批C 自动刷新,pilot_extractors 逐社区抽取;塌方保旧)。"
                "『指定』≠『在招』;excluded/de-designated 已在抽取层剔除;Peace Liard 官方待公示。")
"""pilot-employers.json 的口径说明(产物字段,逐字不改)。"""

DET_OCC_NOTE = "各社区官方优先/在收职业清单(批C 自动刷新;当前有效版)。sectorOnly=官方只给行业名。"
"""pilot-occupations.json 的口径说明(产物字段,逐字不改)。"""

DET_DONE_TPL = "  ✓ 雇主 {emp} 行 · 职业 {occ} 行 · 刷新 {n} 社区{tail}"
"""收尾报数行。"""

DET_KEPT_TPL = " · 保旧 {names}"
"""收尾报数行的保旧尾巴。"""

DET_KEPT_SEP = "、"
"""保旧社区名的拼接符。"""

DET_CRASH_TPL = "✗ build_pilot_details 异常退出({kind}: {detail})—— raw 保持原样,不拦役"
"""总控自身失败的留痕行 —— **本步永远 exit 0 不拦役**,所以这道 catch 住在入口函数体内,
异常不许漏到门里变 return 1(原脚本 `__main__` 外层那道 try/except 的逐字对应物)。"""

# =========================================================================
# 4. quota 步(RCIP 社区名额状态)
# =========================================================================

QUOTA_DOC = """build_pilot_quota — RCIP 社区**名额状态**抽取(2026-08-15,Frank「如果没有竞争,我怎么知道要不要选 RCIP」)。

为什么要有这一步:省提名那套「存量 ÷ 名额 = 34.7:1」在 RCIP 上不成立 —— 没有 EOI 池、不排队、不打分,
它是**先到先得 + 逐职业限额**。所以「该不该押这条路」的判据不是比值,是四件事:
职业在不在清单、**该职业额度用完没有**、**现在收不收**、每雇主能报几个。
联邦不按社区公布名额(fed-rcip 30 页命中 0 条),得逐个社区去它自己的官网上找 —— 就抓这个。
2026-08-16 全 20 社区实测:10 个官网写了(本步产出 10 行),其余 10 个**全站不提名额**(逐社区举证见
交付报告),那是「官方没写」,不是「我们没抓」—— 两者在用户那里意思相反,别混。

  IN : data/crawl/{rcip,fcip}-*/{manifest.json,html_cache}  (crawl 役周更;URL→数据→SQL 的第一站)
       raw/pilot/pilot-communities.json                     (社区官方名 → 省/类型,与既有表对齐)
       两个社区的官网(缓存够不着,直连补抓 —— 见 LIVE_DOC 的举证)
  OUT: raw/pilot/pilot-quota.json                    ({communities: [...], occupations: [...]})

红线(同 pilot.extractors):**宁缺勿猜**。每一行必须锚定一句官网原文(quote)与它的 URL;
正则拿不准的句子一律不产出行 —— 名额状态直接决定用户押不押这条路,编一个比不给更糟。"""
"""本步的判据与 IN→OUT(原 build_pilot_quota.py 文件头,逐字折进)。"""

IN_CRAWL = paths.DATA / "crawl"
"""crawl 役的缓存根(逐 slug 一目录:manifest.json + html_cache/)。"""

OUT_QUOTA = paths.PILOT / "pilot-quota.json"
"""社区级名额状态 + 职业满额行(每行锚定官网原句)。"""

MANIFEST_FILE = "manifest.json"
"""每个 crawl slug 目录下的清单文件名。"""

K_CRAWLED_AT = "crawled_at"
"""manifest 顶层键:该轮 crawl 的时间(取前 10 位作 asOf)。"""

ASOF_LEN = 10
"""从 crawled_at 里截出 ISO 日期的长度(YYYY-MM-DD)。"""

SLUG_TO_COMMUNITY = {
    "rcip-altona": "Altona/Rhineland, MB",
    "rcip-brandon": "Brandon, MB",
    "rcip-claresholm": "Claresholm, AB",
    "rcip-moose-jaw": "Moose Jaw, SK",
    "rcip-north-bay": "North Bay and Area",
    "rcip-okanagan-shuswap": "North Okanagan Shuswap, BC",
    "rcip-peace-liard": "Peace Liard, BC",
    "rcip-pictou": "Pictou County, NS",
    "rcip-ssm": "Sault Ste. Marie, ON",
    "rcip-steinbach": "Steinbach, MB",
    "rcip-sudbury": "Sudbury, ON",
    "rcip-thunder-bay": "Thunder Bay, ON",
    "rcip-timmins": "Timmins, ON",
    "rcip-west-kootenay": "West Kootenay, BC",
    "fcip-acadian": "Acadian Peninsula, NB",
    "fcip-kelowna": "Kelowna, BC",
    "fcip-st-pierre": "St. Pierre Jolys, MB",
    "fcip-superior-east": "Superior East Region, ON",
}
"""crawl slug → 社区官方名(与 pilot-communities.json 的 name 逐字一致,不然接不上既有表)。
末四行是 FCIP 四社区(RCIP 之外的独立站;首版漏挂 → 它们的缓存从没被扫过)。
2026-08-16 实测四站全文都不提名额,所以挂上去也不产行 —— 挂的是**覆盖**,不是结论。"""

RE_OCC_FULL = re.compile(
    r"(reached the maximum allowable recommendations|"
    r"reached the cap imposed by|"
    r"have been successfully met|"
    r"(?:can |will )?no longer accept\w*)",
    re.I,
)
"""职业满额的明文说法(一条规则 = 一个可证伪的正则 + 它证出来的字段)。
句子里必须同时有「满/不再收」的明文和五位 NOC 码,两者缺一不产出行。
🔴 首版这里写宽了(`maximum .{0,20}recommendations`),把 Timmins 的
   「**Added to** the RCIP Priority Occupation List: NOC 74200…」抓成了满额 —— 那是**新增**职业,
   意思正好相反。收窄成官方实际用过的三种说法,再加一道否定闸(RE_OCC_NOT_FULL)挡住
   「新增/加入清单」的句子。
   2026-08-16 加第四种:Peace Liard 写「reached the cap imposed by IRCC … (NOC 62010)」——
   同句自带 NOC 码,与前三种一样是「这个职业不再发了」的明文,不是「新增」。"""

RE_OCC_NOT_FULL = re.compile(r"(added to the|adding to the|newly added|now (?:open|accepting))", re.I)
"""否定闸:命中即这句在说「新增/开收」,与满额意思相反,不产行。"""

RE_NOC = re.compile(r"\bNOC\s*(\d{5})\b")
"""句内的五位 NOC 码(分句抓正是为了不跨句乱配)。"""

RE_REMAINING = re.compile(r"remaining allocation[s]?\s*[\(\:]?\s*(\d{1,4})\b", re.I)
"""剩余名额:官方写成 remaining allocations (153) 这种;只认带括号或紧跟的数字。"""

RE_FIRST_COME = re.compile(r"first[-\s]come,?\s*first[-\s]serve", re.I)
"""先到先得的明文。"""

RE_PER_INTAKE = re.compile(
    r"issue up to\s*(\d{1,4})\s*(?:community |candidate )?recommendations", re.I)
"""每轮名额上限:核原句时从 Moose Jaw/Steinbach 的引语里发现的,比「先到先得」这个布尔具体得多
(「Per intake period, … will issue up to 12 recommendations」)。
2026-08-16 放宽定语:Peace Liard 写的是「authorized to issue up to 60 **candidate** recommendations
… in the 2026 intake year」(该社区一年就一轮 intake,官网自己也叫「this intake cycle」)。"""

PER_EMPLOYER_CAP_DOC = """⚠️「每雇主上限」本版**不抽**:实测各社区写的根本不是同一件事 —— Peace Liard 是
「capped at 5% of allocations」(百分比,不是人数)、Moose Jaw 只限「10 人以下的餐饮企业」、
Steinbach 是「某个 NOC 下 may be limited to 1」。塞成一个数字会把条件全丢了,比不给更误导。
要做得连同它的适用条件一起建模,那是另一件事。"""
"""不抽「每雇主上限」的理由(原行内注释,逐字折进 —— 这是判定留痕不是待办)。"""

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
"""分句(句末标点 + 空白)。"""

SCRIPT_STYLE_RE = re.compile(r"(?is)<(script|style).*?</\1>")
"""取正文前先拆掉的脚本/样式块。"""

TAG_RE = re.compile(r"(?s)<[^>]+>")
"""HTML 标签(去 tag 取纯文本)。"""

QUOTE_BEFORE = 130
"""原句窗口:匹配点**之前**留多少字。"""

QUOTE_AFTER = 200
"""原句窗口:匹配点**之后**留多少字。
原句取**匹配点周围的窗口**,不取句首。有些社区页整页没标点,一「句」上千字,
从句首截 400 字会截出一段看不见匹配短语的话 —— 那种 quote 没法复核,等于没举证。"""

STATUS_FULL = "full"
"""职业满额行的状态值。"""

K_REMAINING = "remaining"
"""社区级键:剩余名额数。"""

K_REMAINING_QUOTE = "remainingQuote"
"""社区级键:剩余名额的官网原句。"""

K_REMAINING_URL = "remainingUrl"
"""社区级键:剩余名额的出处 URL。"""

K_FIRST_COME = "firstCome"
"""社区级键:是否先到先得。"""

K_FIRST_COME_QUOTE = "firstComeQuote"
"""社区级键:先到先得的官网原句。"""

K_FIRST_COME_URL = "firstComeUrl"
"""社区级键:先到先得的出处 URL。"""

K_PER_INTAKE = "perIntake"
"""社区级键:每轮名额上限。"""

K_PER_INTAKE_QUOTE = "perIntakeQuote"
"""社区级键:每轮名额上限的官网原句。"""

K_PER_INTAKE_URL = "perIntakeUrl"
"""社区级键:每轮名额上限的出处 URL。"""

K_ASOF = "asOf"
"""行键:该行证据的日期(crawl 轮次日期 / 直连当天)。"""

LIVE_DOC = """直连补抓:缓存够不着的两个社区。为什么破例走网络(其余社区一律吃 crawl 缓存):
  Claresholm, AB —— 缓存里那一页是 **403 Forbidden**(爬役 UA 被站点挡),正文一个字没落地。
    「爬完零命中」在这里根本不是证据,而官网首页白纸黑字写着月度名额 → 换浏览器 UA 直连即可。
  West Kootenay, BC —— 官网**换域**(wk-rnip.ca → westkootenayimmigration.ca),爬役停在旧域首页,
    名额写在换域后的公告贴里。贴子 URL 每年变,所以从 /updates/ 索引现取,不写死某一篇。
形态照 pilot.extractors:一社区一个函数,httpx + 浏览器 UA,句子对不上就返回空(宁缺勿猜)。"""
"""两个直连破例的举证(原行内注释,逐字折进)。"""

LIVE_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
"""直连补抓用的浏览器 UA —— **本域自留一份**:与 fetch.constants.BROWSER_UA(Chrome/131)
不是同一个串,换成那份等于换 UA,不属「行为不变」的搬运。"""

LIVE_TIMEOUT_S = 60
"""直连补抓的超时秒数。"""

CL_COMMUNITY = "Claresholm, AB"
"""直连补抓社区一:Claresholm(与 pilot-communities.json 的 name 逐字一致)。"""

CL_URL = "https://claresholm-rcip.ca/"
"""Claresholm 官网首页(月度名额写在首页)。"""

WK_COMMUNITY = "West Kootenay, BC"
"""直连补抓社区二:West Kootenay。"""

WK_UPDATES_URL = "https://westkootenayimmigration.ca/updates/"
"""West Kootenay 换域后的公告索引页。"""

RE_CL_PER_INTAKE = re.compile(r"We will issue \w+ \((\d{1,3})\) allocations per month[^.]*\.", re.I)
"""Claresholm 的「三(3)个 allocation/月」——「per month」正是本社区的 intake 周期(官网:intake 逐月开)。
quote 从「We will issue…」起头,不带前面那串导航/标题 —— 这两站整段没有句号,
从「句」首截会截出一大坨看不见匹配短语的话,那种举证没法复核。"""

RE_WK_PER_INTAKE = re.compile(
    r"Approximately (\d{1,4}) Community Recommendations may be issued per intake[^.]*\.", re.I)
"""West Kootenay 2026-05 改制后的现行口径(改制前的「~18/月、先到先得」已作废,故只认这一句)。"""

WK_HREF_RE = re.compile(r'href="([^"#?]+)"')
"""公告索引页里的站内链接。"""

WK_POST_RE = re.compile(r"intake|allocation", re.I)
"""公告贴 URL 的判据词(命中才值得点进去看)。"""

WK_HOST_INDEX = 2
"""URL 按 / 切开后主机名所在的下标(https://host/... → 第 2 段)。"""

WK_POST_LIMIT = 8
"""最多点开几篇公告(索引按时间倒序 → 先命中的就是最新一篇)。"""

URL_SEP = "/"
"""URL 的路径分隔符(切主机名用)。"""

QUOTA_IO_TPL = "IN_CRAWL={crawl}\nIN_COMMUNITIES={comm}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

QUOTA_SKIP_TPL = "  ! {slug}: 社区名对不上 pilot-communities.json({name})—— 跳过,不猜省份"
"""slug 对不上社区表时的留痕行。"""

QUOTA_LIVE_SKIP_TPL = "  ! live {name}: 对不上 pilot-communities.json —— 跳过"
"""直连社区对不上社区表时的留痕行。"""

QUOTA_LIVE_FAIL_TPL = "  ! live {name}: 抓取/解析失败({kind}: {detail})—— 本轮不产行"
"""直连抓取/解析失败的留痕行(官网抖动不该炸掉整步,保其余社区)。"""

QUOTA_ROW_TPL = "  {name:<28} {flags}"
"""逐社区的缓存扫描结果行。"""

QUOTA_LIVE_ROW_TPL = "  {name:<28} [直连] {flag}"
"""逐社区的直连补抓结果行。"""

QUOTA_FLAG_NONE = "—"
"""该社区什么都没抓到时的占位。"""

QUOTA_FLAG_SEP = "、"
"""多个 flag 的拼接符。"""

QUOTA_FLAG_OCC_TPL = "满额职业 {n}"
"""flag:满额职业条数。"""

QUOTA_FLAG_KV_TPL = "{label}={value}"
"""flag:带值的社区级字段(剩余名额=153)。"""

QUOTA_FLAG_LABELS = ((K_REMAINING, "剩余名额"), (K_FIRST_COME, "先到先得"))
"""要报进 flag 的社区级字段与它们的人话名(firstCome 是布尔,只报名字不报值)。"""

QUOTA_LIVE_FLAG_TPL = "每期名额=%s"
"""直连结果行里的每期名额说法(原脚本用 % 取模拼,原样保留)。"""

QUOTA_NOTE = "RCIP 社区名额状态;每行锚定官网原句(quote+url)。空 = 官网没写,不是没有限额。"
"""pilot-quota.json 的口径说明(产物字段,逐字不改)。"""

QUOTA_DONE_TPL = "\nOUT {path}  社区级 {comm} 行 / 职业满额 {occ} 行"
"""收尾报数行。"""

# =========================================================================
# 5. communities 步(RCIP/FCIP 试点社区名单)
# =========================================================================

COMM_DOC = """build_pilots — RCIP/FCIP 试点社区名单(E6-11 3.1/3.2,2026-08-15)。

社区名单从 fed-rcip 周更 crawl 的 IRCC 官方名单页缓存解析(URL→数据铁律,不发新请求);
社区 → Job Bank 城市映射是**人工核对表**(CITY_MAP,3.2 红线:宁漏勿错):
  · 单城社区:社区名即城市名(IRCC 官方表原文),对照 jobs.city 实测存在才映射
  · 区域型社区(West Kootenay/Peace Liard 等 6 个):界线未逐社区举证 → cities=[] 不参与打标,
    种子已进 crawl(crawl.constants SEEDS),界线页举证后补
口径:试点=社区推荐制且雇主须先被社区指定;本表只回答「岗在不在试点社区」这一层。

  IN : data/crawl/fed-rcip/manifest.json + html_cache(rural-franco-pilots.html 官方名单)
  OUT: raw/pilot/pilot-communities.json"""
"""本步的口径与 IN→OUT(原 build_pilot_communities.py 文件头,逐字折进)。"""

IN_MANIFEST = paths.CRAWL / "fed-rcip" / "manifest.json"
"""fed-rcip crawl 役的页清单(官方名单页的缓存入口)。"""

OUT_COMMUNITIES = IN_COMMUNITIES
"""本步的落盘口 —— 与第 1 段 IN_COMMUNITIES 是同一个文件,两个名字说的是本步的角色
(communities 写、details/quota 读)。"""

ERRORS_REPLACE = "replace"
"""读 IRCC 缓存 html 的容错模式:坏字节替换不炸(与 employers/quota 那两处的 ignore
不是一档 —— 原脚本各写各的,收拢时不并,免得悄悄改了正文)。"""

COMM_PAGE_SUFFIX = "rural-franco-pilots.html"
"""官方名单页在 manifest 里的 URL 尾巴。"""

RE_RURAL_H3 = re.compile(r"<h3[^>]*>\s*Rural communities\s*</h3>")
"""「Participating communities」节里 RCIP 的 h3 标题锚
(页顶导语也含 Francophone 字样,只认 h3 标题锚)。"""

RE_FRANCO_H3 = re.compile(r"<h3[^>]*>\s*Francophone communities\s*</h3>")
"""同上,FCIP 的 h3 标题锚。"""

RE_COMM_LINK = re.compile(r'<a[^>]+href="(https?://[^"]+)"[^>]*>\s*([^<]{3,60})\s*</a>')
"""名单区里的社区链接(URL + 显示名)。"""

TYPE_RCIP = "RCIP"
"""乡村试点类型码。"""

TYPE_FCIP = "FCIP"
"""法语社区试点类型码。"""

OFFICIAL_HOSTS = ("canada.ca", "gc.ca")
"""联邦域名 —— 名单区里指向它们的链接是导航不是社区,剔除。"""

CITY_MAP_DOC = """社区 → Job Bank 城市(2026-08-15 生产库实测城市名;Sudbury 库里双写名并存都收)。
区域型社区界线 2026-08-15 批B 举证补齐(各社区官方站原句,agent 抽取归档 raw/pilot 备查):
  Pictou=五镇+县;WK=官方首页 Discover our Region(正向名单,非穷尽);NOS=官方首页原句 20 社区;
  Peace=PRRD+NRRM 八城镇;Acadian=官方首页八市镇(取库内实拼,Tracadie 双写名并存都收,
  Bas-Caraquet 因官方只点名上级市政区 Rivière-du-Nord 不单列 → 不映射);Superior East=官方六镇;
  Claresholm 官方注明 25km 含 Granum/Stavely(Stavely 库内暂无岗,留名);Rhineland 辖内官方未列名 → 只保 Altona"""
"""CITY_MAP 的逐社区界线举证(原行内注释,逐字折进)。"""

CITY_MAP: dict[str, list[str]] = {
    "North Bay and Area": ["North Bay"],
    "Sudbury, ON": ["Sudbury", "Greater Sudbury"],
    "Timmins, ON": ["Timmins"],
    "Sault Ste. Marie, ON": ["Sault Ste. Marie"],
    "Thunder Bay, ON": ["Thunder Bay"],
    "Superior East Region, ON": ["Chapleau", "Dubreuilville", "Wawa", "White River", "Hornepayne", "Manitouwadge"],
    "Steinbach, MB": ["Steinbach"],
    "Altona/Rhineland, MB": ["Altona"],
    "Brandon, MB": ["Brandon"],
    "Moose Jaw, SK": ["Moose Jaw"],
    "Claresholm, AB": ["Claresholm", "Granum", "Stavely"],
    "St. Pierre Jolys, MB": ["St-Pierre-Jolys"],
    "Kelowna, BC": ["Kelowna"],
    "Pictou County, NS": ["New Glasgow", "Pictou", "Stellarton", "Trenton", "Westville"],
    "West Kootenay, BC": ["Nelson", "Castlegar", "Trail", "Rossland", "Kaslo", "Nakusp", "Creston", "Grand Forks"],
    "North Okanagan Shuswap, BC": ["Vernon", "Salmon Arm", "Armstrong", "Enderby", "Lumby", "Coldstream", "Lavington",
                                    "Sicamous", "Falkland", "Sorrento", "Blind Bay", "Spallumcheen", "Grindrod",
                                    "Cherryville", "Malakwa", "Celista", "Scotch Creek", "Anglemont", "Ashton Creek", "Deep Creek"],
    "Peace Liard, BC": ["Fort St. John", "Dawson Creek", "Fort Nelson", "Chetwynd", "Tumbler Ridge", "Taylor",
                         "Pouce Coupe", "Hudson's Hope"],
    "Acadian Peninsula, NB": ["Caraquet", "Shippagan", "Tracadie", "Tracadie-Sheila", "Neguac", "Lamèque"],
}
"""社区 → Job Bank 城市的人工核对表(界线举证见 CITY_MAP_DOC;空 = 不参与打标)。"""

PROV_RE = re.compile(r",\s*(ON|MB|SK|AB|BC|NS|NB)\s*$")
"""社区名尾巴自带的省码(「Sudbury, ON」)。"""

PROV_HINT = {"North Bay and Area": "ON", "Pictou County, NS": "NS", "Acadian Peninsula, NB": "NB",
             "West Kootenay, BC": "BC", "North Okanagan Shuswap, BC": "BC", "Peace Liard, BC": "BC",
             "Superior East Region, ON": "ON"}
"""名字里读不出省码(或读出来不可靠)的社区的人工省份表。"""

K_CITIES = "cities"
"""社区行键:映射到的 Job Bank 城市清单。"""

MIN_RCIP = 10
"""RCIP 行数哨兵下限(官方名单 14 个;低于它即疑改版)。"""

MIN_FCIP = 4
"""FCIP 行数哨兵下限(官方名单 6 个;低于它即疑改版)。"""

COMM_IO_TPL = "IN_MANIFEST={manifest}\nOUT={out}"
"""本步开跑时打印的 IN/OUT 路径。"""

COMM_NO_ANCHOR = "  ✗ 找不到 Rural/Francophone communities 标题 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""标题锚缺失时的留痕行 —— **print + return,不 raise 不拦役**(语义原样)。"""

COMM_COLLAPSE_TPL = "  ✗ 解析塌方:RCIP {rcip}/14 · FCIP {fcip}/6 —— 疑似 IRCC 页改版,保留旧表(不拦役)"
"""行数塌方时的留痕行 —— 同样 print + return,不拦役。"""

COMM_NOTE = ("IRCC 官方参与社区名单(fed-rcip crawl 缓存解析)。cities=人工核对的 Job Bank 城市映射,"
             "空=区域型社区界线未举证不打标(宁漏勿错);试点须雇主被社区指定,城市命中只是粗筛信号。")
"""pilot-communities.json 的口径说明(产物字段,逐字不改)。"""

COMM_DONE_TPL = "  ✓ 社区 {n}(RCIP {rcip} + FCIP {fcip})· 已映射城市 {mapped} 个社区 → {name}"
"""收尾报数行。"""

# =========================================================================
# 6. aip_rules 步(AIP 申请人门槛库,quote-anchored)
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
