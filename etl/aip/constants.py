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

IN_NL_EMPLOYERS = paths.PNP / "nl-employers.json"
"""NL 官方指定雇主名录(pnp 域 nl_employers 步产:gov.nl.ca 逐雇主页解析,645 家,每家带申报 NOC)。
2026-09-05 换源(/fe 把脉 AIP 批,Frank「不应该补在 aip 目录下吗」):此前读
`data/raw/policy/nl-immigration/md/employer` 的 md 语料 —— 那份语料是早期一次性抓的,
只到字母 B 就停了(95 份 md → 94 家),且仓库里已无役再产它;本域名录 NL 段因此只有 94 家,
岗位侧打标跟着漏(生产库核对:16 家在招雇主在官方名单上却没标)。pnp 域的 nl-employers.json
就是同一份官方名录的全量(mart 汇装维度表早已按它让位,见 mart build_designated 的 docstring),
本域直接读它的产物文件(跨域只读产物,不借函数);语料路径与解析它的六个常量
(IN_NL_EMP_DIR / NL_MARKER / NL_MD_GLOB / NL_TITLE_RE / NL_OFFICE_RE / NL_LOC_RE / NOC5_RE)
按方言律⑨「零消费者退役」一并摘除,记录在此;第 1 段的 ERRORS_IGNORE(坏字节直接丢的读模式)
只有 md 语料这一个读者,同批退役。"""

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
    "NB": "https://www.gnb.ca/content/dam/GNB3/t/fhc-fmc/immigration/docs/designated-employers-employeurs-designes.pdf",
    # NB 2026-08-31 换址:官网迁版 www2→www,旧 PDF 404(错误页被当 PDF 解析出 29 行,
    # MIN_ROWS 护栏保旧 1263 行三周);新址同名文件,住新站 AIP 页 docs/ 下
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

K_EMPLOYERS = "employers"
"""NL 官方名录文件的行表键(pnp 域产物的 wire 键,本域只读)。"""

K_NAME = "name"
"""NL 官方名录一行的雇主名键。"""

K_NOCS = "nocs"
"""NL 官方名录一行的申报 NOC 表键(每项一个 dict,码在 K_NOC)。"""

K_NOC = "noc"
"""NL 官方名录 NOC 项的码键;岗位行的 NOC 键也是它(段4 打标按它取 TEER)。"""

PROV_NL = "NL"
"""省码 NL。"""

PROV_PE = "PE"
"""省码 PE。"""

PE_DOC = """PE(B4 §3b,2026-08-08):官方只发网页不发文件,页面在 Radware WAF 后(不绕验证码)。
数据经 web.archive.org 存档快照 httpx 直取(存档站公开;快照 1-3 月一存)——staleness 以快照里
页面自带的 Published date 为准。2026-04-19 快照实核 391 家(A-Z <li> 列表,首条 100066 PEI Inc.)。
2026-08-31 批P 追记:官方页直连从 403 变 200 **挑战壳**(125KB 混淆 JS,正文零处
employer/designated 字样)—— WAF 没撤只是换演法,直连仍不可用,勿因 200 误判已开闸。"""
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

WAYBACK_TRIES = 3
"""单份快照的取档尝试次数(2026-08-31 批P 实撞:archive.org 内容服务整晚 503 ——
CDX 索引活着、取正文全趴;阵发性故障靠重试兜)。"""

WAYBACK_RETRY_S = 15
"""两次尝试之间的等待秒数。"""

HTTP_OK = 200
"""快照取档的成功状态码(503 等一律进重试)。"""

PE_SNAP_RETRY_TPL = "  PE: Wayback {ts} 第 {attempt} 次取档未成({status})"
"""单份快照一次尝试失败的留痕行(状态码或异常名)。"""

PE_SNAP_THIN_TPL = "  PE: Wayback {ts} 快照仅解析 {n} 行,跳过试更旧一份"
"""某份快照残缺/是被存档的挑战壳 → 跳过留痕(逐份从新到旧试)。"""

PE_ALL_FAIL_MSG = "  PE: 近 5 份快照全部取不回或残缺,本轮保旧"
"""全部快照都不可用时的收口行(保旧不清空)。"""

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
# 3. flag 步(官方名录 × 岗位雇主名 → 岗位表的 aip 字段)
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

AIP_TEER_MAX = 4
"""AIP 认的 job offer 只到 TEER 4(2026-09-05 /fe 把脉 AIP 批加门,Frank「现在看着只要去
tim hortons 打工就能走 AIP 稳拿 PR 一样」):官方 job-offer 页只给 TEER 0/1/2/3 与 TEER 4 两档条款
——「for at least 1 year from the time you become a permanent resident for TEER 0, 1, 2 or 3 job offers」
「for permanent employment with no set end date for TEER 4 job offers」(quote-anchored,
raw/ircc/aip_rules.json offerDuration 两行,fetched 2026-09-05;
https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/job-offer.html),
TEER 5 岗不在 AIP 之内。加门前四省指定雇主的 891 个在招岗里 170 个是 TEER 5(Tim Hortons 26 个里 12 个),
全被标成 AIP 岗;TEER 取自岗位 NOC 第二位(noc 基建叶 teer_of,单一来源),码非法/缺失 = 不算。"""

INDENT_2 = 2
"""岗位表落盘缩进(与 05/05b 抓岗件一致,原值)。"""

K_AIP = "aip"
"""岗位行键:是否 AIP 指定雇主(本步产出的唯一字段)。"""

K_JOBS = "jobs"
"""ATS 岗位文件的行清单键。"""

ALIAS_RE = re.compile(r"\bo/a\b(.+)", re.I)
"""名录行里的 o/a 别名(别名也单独入集合,两种写法都能匹配到)。
(SUFFIX_RE / ALIAS_SPLIT_RE / KEEP_RE 三条归一正则 2026-08-31 随 norm_name 迁基建叶
names 域 —— 洗名尺子收拢批,沿革注释随迁。)"""

FLAG_IN_LIST_TPL = "IN aip list      : {path}"
"""段4 开工报输入名录(原脚本对齐空格原样保留)。"""

FLAG_IN_OUT_TPL = "IN/OUT job bank  : {path}"
"""段4 开工报原地写回的岗位表(同上,对齐空格原样)。"""

FLAG_NAMES_TPL = "  designated employers (normalized): {n}"
"""段4 报归一化后的名录规模。"""

FLAG_DONE_TPL = "AIP flagged {flagged}/{total} jobs (employer on official AIP designated list)."
"""段4 收尾报命中数(原脚本英文原句,原样保留)。"""
