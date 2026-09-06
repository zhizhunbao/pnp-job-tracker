"""
ircc 域常量 —— 域词汇表(联邦开放数据:学签/工签存量与流量、NPR 刻度、分省临时居民、
难度因子、PGWP 规则、官方规费;照 company 三件套样张,段横幅三行框 + N. 编号,
与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/规则表)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除字典键(K_ 词族)、空串、语法位外,一切字面量住这;
文案模板一律 *_TPL,官方原句一律 *_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:省码表 / 落盘缩进 / JSON 键词表 K_* / 自校抬头)
# =========================================================================

PROV_CODE = {
    "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE", "Nova Scotia": "NS",
    "New Brunswick": "NB", "Quebec": "QC", "Ontario": "ON", "Manitoba": "MB",
    "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
}
"""省全名 → 省码(IRCC 与 StatCan 两家表用的是同一套英文省名)。
2026-08-30 批C 收拢:scrape_ircc_stats 与 scrape_statcan_tr_prov 各抄了一份 **逐字相同**
的十省表(diff 零差异)—— 行为/判据复制=口径开岔的现行犯,合成本域唯一来源。
QC 在表里(源表就有),但难度因子等消费端自行排除(QC 自有体系不属 PNP)。"""

PROV_ON = "ON"
"""安省省码 —— 三处收口探针的抽样省(量最大,最能看出坐标错位/量级失真)。"""

INDENT_1 = 1
"""本域全部产出表的 JSON 缩进(大表省体积,五个步骤原值一致)。"""

COMMA = ","
"""千分位逗号(转数字前去掉)。"""

SPACE = " "
"""压空白/get_text 的单空格(统一口径)。"""

SUBJECT_APPLICANT = "applicant"
"""门槛行的 subject 固定值(PGWP 与规费两段都只约束申请人)。"""

PROVINCE_FED = "FED"
"""表级 province:联邦源统一 FED(与 raw/ee/fed-eligibility.json 同款)——
09 的 build_pnp_requirements 从这里取,少了它引擎按省挑行永远挑不到。"""

K_SOURCE = "source"
"""表键:来源(URL 或来源名)。"""

K_URL = "url"
"""表/行键:出处地址。"""

K_FETCHED = "fetched"
"""表键:本轮抓取日(B3-3:要拿来下结论的数据必须知道是哪天的;新鲜度哨兵 check_freshness 读它)。"""

K_NOTE = "note"
"""表键:口径注(消费端读得到的免责与语义说明)。"""

K_YEAR = "year"
"""表键:年份(存量表的最新有数年 / PR 表的最新完整年)。"""

K_BY_PROV = "byProv"
"""表键:按省的值。"""





K_VALUE = "value"
"""StatCan 时点键 / 门槛行键:数值。"""

K_STREAM = "stream"
"""门槛行键:通道/条目。"""

K_SUBJECT = "subject"
"""门槛行键:约束对象。"""

K_FACTOR = "factor"
"""门槛行键:因子名。"""

K_OP = "op"
"""门槛行键:比较算子。"""

K_UNIT = "unit"
"""门槛行键:单位。"""

K_VALUE_TEXT = "valueText"
"""门槛行键:官方原文(quote-anchored 的锚)。"""

K_BASIS = "basis"
"""门槛行键:字段语义(人读)。"""

K_LABEL = "label"
"""门槛行键:一句话说明。"""

K_SECTION = "section"
"""门槛行键:出处小节。"""

K_PROVINCE = "province"
"""表键:省码(联邦源恒 FED)。"""

K_PROGRAM = "program"
"""表键:项目码。"""

K_REQUIREMENTS = "requirements"
"""表键:门槛行清单。"""

K_QUOTE = "quote"
"""规则表内键:官方原句(核验对象;落盘时改名 valueText)。"""

K_PAGE = "page"
"""规则表内键:该引用出自哪一页。"""




# =========================================================================
# 2. IRCC 开放数据:学签/工签年末存量 + PNP 登陆数 + 新发学签流量
# =========================================================================

STATS_BASE = "https://www.ircc.canada.ca/opendata-donneesouvertes/data/"
"""IRCC 开放数据(月更包)的 XLSX 目录。"""

SRC_STUDY = "study"
"""源键:学签年末存量。"""

SRC_TFWP = "tfwp"
"""源键:TFWP 工签年末存量。"""

SRC_IMP = "imp"
"""源键:IMP 工签年末存量。"""

SRC_PR = "pr"
"""源键:PR 按省 × 类别(PNP 登陆数的出处)。"""

SRC_STUDY_FLOW = "study_flow"
"""源键:新发学签**流量**(月度粒度)。
2026-08-03 补:study/tfwp/imp 全是**年末存量**(Dec 31),官方那张表最后一列就停在 2024,
2025 年末存量至今未发(数据集本身 2026-07-21 还更新过,不是僵尸文件)。
但同一数据集的**新发流量**表是**月度**粒度、年份列一直排到 2026 —— 我们一列都没碰过。
Frank「是他们没公布还是我们没抓到」→ 存量是他们没发,流量是我们没抓。这一步补后者。"""

STATS_SRC = {
    SRC_STUDY: STATS_BASE + "EN_ODP_annual-TR-Study-IS_PT_study_level_year_end.xlsx",
    SRC_TFWP: STATS_BASE + "EN_ODP_annual-TR-work-TFW_PT_program_year_end.xlsx",
    SRC_IMP: STATS_BASE + "EN_ODP_annual-TR-work-IMP_PT_program_year_end.xlsx",
    SRC_PR: STATS_BASE + "EN_ODP-PR-ProvImmCat.xlsx",
    SRC_STUDY_FLOW: STATS_BASE + "EN_ODP-TR-Study-IS_PT_study_level_sign.xlsx",
}
"""五张官方 XLSX 的下载地址。"""

STOCK_KEYS = (SRC_STUDY, SRC_TFWP, SRC_IMP)
"""三张年末存量表(同一套解析器,同一份 source 块)。"""

OUT_TR = paths.IRCC / "temp_residents.json"
"""段2 输出:学签/工签年末存量(含全年份序列 byYear)。"""

OUT_PNP = paths.IRCC / "pnp_admissions.json"
"""段2 输出:PNP 类别 PR 登陆数(最新完整年)。"""

OUT_FLOW = paths.IRCC / "study_flow.json"
"""段2 输出:新发学签流量(月度,进行年为 YTD)。"""

OUT_PNP_YEARS = paths.IRCC / "pnp_admissions_years.json"
"""段2 输出:PR 登陆数**按年**(2026-09-06 把脉页省份段):同一张 PR 按省×类别表,
既有 OUT_PNP 只留最新完整年一格,本表留全部年列 —— 省 Total 行(全部类别)与
Provincial Nominee 组行各一块,进行年(表头最后一个 Total 列)在 ytdYear 里标出。"""

STATS_UA = "offer2pr-difficulty/1.0"
"""开放数据下载的自报家门 UA(不伪装:官方开放数据平台不需要)。"""

STATS_TIMEOUT_S = 120
"""XLSX 下载超时(几十 MB 的月更包)。"""

ENC_UTF8 = "utf-8"
"""读旧表(年份哨兵比对基准)的编码。"""

SUPPRESSED = "--"
"""IRCC 的小值抑制记号 —— 当 0(比值用途可接受)。
数字口径=IRCC 四舍五入到 5、小值 '--' 抑制 → 当 0,比值用途足够,绝对数不作精算
(脚本与前端口径注一致)。"""

BLANK_VALUES = ("", SUPPRESSED)
"""「这格没数」的两种写法(空 / 小值抑制)。"""

TOTAL_WORD = "Total"
"""省行/年总列的判词。"""

TOTAL_DASH_SUFFIX = " - Total"
"""省行名的尾巴之一(「Ontario - Total」)。"""

TOTAL_SUFFIX = " Total"
"""省行名的尾巴之二(「Ontario Total」)。"""

YEAR_PREFIX = "20"
"""年份列的前两位(21 世纪)。"""

HDR_PROBE_YEAR = "2019"
"""表头行的探针年份(命中即认表头)。"""

HDR_MIN_DIGITS = 5
"""探针没命中时的兜底:一行里纯数字格超过这个数即认表头。"""

STATS_NO_HEADER = "年末存量表找不到年份表头行(源表可能改版)"
"""表头定位失败(原 next() 的 StopIteration,2026-08-30 批C 换成带话的报错)。"""

STATS_NO_PNP_HEADER = "PR 按省×类别表找不到「YYYY Total」表头行(源表可能改版)"
"""PR 表头定位失败。"""

STATS_NO_FLOW_HEADER = "新发学签流量表找不到年份行(源表可能改版)"
"""流量表年份行定位失败。"""

PNP_CATEGORY_WORD = "Provincial Nominee"
"""PR 表里 PNP 类别行的判词(同块成对出现,值相同,留最后一次)。"""

K_BY_YEAR = "byYear"
"""存量表键:全年份序列(2026-08-14 竞争卡年份筛选)。"""

K_YTD_YEAR = "ytdYear"
"""PR 按年表键:哪一年是进行年(表头最后一个「YYYY Total」列 = 年内累计,不是完整年)。"""

K_PR_ALL = "prAll"
"""PR 按年表键:省 Total 行(全部类别)× 全部年列。"""

K_PR_PNP = "prPnp"
"""PR 按年表键:Provincial Nominee 组行 × 全部年列(含进行年 YTD 列)。"""

K_N = "n"
"""流量年块键:人数(整年=官方年总计,进行年=已公布月份求和)。"""

K_COMPLETE = "complete"
"""流量年块键:这一年 12 个月是否齐。"""

K_THROUGH_MONTH = "throughMonth"
"""流量年块键:最后一个有数月份(complete=false 时才有意义)。"""

MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
"""流量表的月份列名。
表头三层:第 3 行=年(每年起始列,步长 17)、第 4 行=Q1..Q4 与「YYYY Total」、第 5 行=月份。
年总计 = 起始列 + 16;进行年(2026)没有年总计列 → 按已有月份列求和作 YTD,并记最后一个有数月份。"""

MONTH_SPAN = 16
"""从年份起始列往后扫多少列找月份格。"""

YEAR_TOTAL_OFFSET = 16
"""年总计列 = 年份起始列 + 本值。"""

MONTHS_FULL = 12
"""整年的月份数(齐了才用官方年总计列)。"""

FLOW_YEAR_ROW_MIN = 3
"""年份行的判据:一行里 20xx 纯数字格超过这个数。"""

FLOW_BLANKS = ("", "None")
"""流量格的两种「没数」写法。"""

FLOW_TAIL_YEARS = 3
"""收尾报数只列最近几年。"""

FLOW_TAIL_TPL = "{year}={n:,}"
"""收尾报数的一年一段。"""

FLOW_TAIL_PARTIAL_TPL = " (至 {month})"
"""进行年的尾巴(YTD 到哪个月)。"""

FLOW_TAIL_SEP = "  "
"""收尾报数各年之间的分隔(两空格)。"""

STATS_TR_NOTE = "IRCC 年末存量(Dec 31 holders);数值官方四舍五入到 5,'--' 小值抑制当 0"
"""存量表口径注。"""

STATS_PNP_NOTE = "PNP 类别 PR 登陆数(含随行家属,人头口径)最新完整年"
"""PNP 登陆数口径注。"""

STATS_PNP_YEARS_NOTE = ("PR 登陆数按年:prAll = 省 Total 行(全部移民类别),prPnp = Provincial Nominee "
                        "组行;两者同为含随行家属的人头口径。ytdYear 那一年是年内累计(YTD),"
                        "与完整年不可直接比较。数值官方四舍五入到 5,'--' 小值抑制当 0。")
"""PR 按年表口径注。"""

STATS_FLOW_NOTE = ("新发学签**流量**(按许可生效月份,非年末存量)。月度粒度,进行年为 YTD(complete=false 时 "
                   "n 是已公布月份求和,throughMonth 是最后一个有数月份)。与存量口径不可混用:"
                   "存量=在库人数(竞争比分母),流量=当期新增趋势。")
"""流量表口径注。"""

STATS_PRINT_OUT_TPL = "OUT_TR={tr}\nOUT_PNP={pnp}"
"""段2 开工报输出(原脚本模块级两行 print,溶后挪进入口函数首行)。"""

STATS_YEAR_ALERT_TPL = ("! {key} 年末存量最新年份 {old} → {year}:IRCC 补发了新年份 —— "
                        "去 pnp_allocations.json 核对 {year} 名额,并复核竞争卡该年列")
"""年份哨兵(2026-08-14):存量最新年份一变(IRCC 补发 2025)就大声喊 —— 竞争卡年份列会自动亮,
但当年名额(pnp_allocations 人工表)与竞争比口径要人跟着核,静默自愈=没人知道该去补。
行首 ! 是本域的告警通道(auto_update 按 ✗/! 行首升 ERROR 级)。"""

STATS_STOCK_TPL = "{key}: {year} · {n} 省 · ON={on} · 序列 {first}–{last}"
"""三张存量表各自的收尾报数。"""

STATS_PNP_TPL = "pnp admissions: {year} · {n} 省 · ON={on}"
"""PNP 登陆数收尾报数。"""

STATS_PNP_YEARS_TPL = "pnp admissions years: {first}–{last} · YTD {ytd} · ON {year}={on}"
"""PR 按年表收尾报数(核对锚点:ON 的最新完整年 prPnp 应与 OUT_PNP 同值)。"""

STATS_FLOW_TPL = "study flow: {n} 省 · 年份 {first}–{last} · ON {tail}"
"""流量表收尾报数。"""


# =========================================================================
# 3.+4.(已迁出)NPR 占总人口比 / StatCan 分省临时居民存量
#      —— 2026-09-06 两段常量整批搬去 etl/statcan/constants.py 的段3、段4(docstring 一字未改,
#      **产物路径不动**:OUT_NPR / OUT_TR_PROV 仍指 paths.IRCC 下的原文件名)。
#      段号留空位不前移(存量注释里到处引用「段5/段6/段7」);段1 里只被这两段消费的
#      WDS 响应键(K_STATUS / K_OBJECT / K_VECTOR_DATA_POINT / K_REF_PER / STATUS_SUCCESS /
#      WDS_STATUS_FAIL_TPL)随迁,PCT_SCALE 与 K_LATEST_REF_PER 因段7 仍在用而留守(住段7 末尾)。
# =========================================================================


# =========================================================================
# 5. PGWP 规则库(B1-4;quote-anchored,引用消失即保留旧表 exit 1)
# =========================================================================

OUT_PGWP = paths.IRCC / "pgwp_rules.json"
"""段5 输出:raw/ircc/pgwp_rules.json。
设计 docs/design/PGWP规则库-20260803.md。形状对齐 raw/pnp/<省>-req.json
(province='FED' program='PGWP',09 IN_REQ_TABLES 直接消费 → mart pnp_requirements →
引擎 facts.requirements 免费拿到;pnp_draws 的 FED 行是同款先例)。
第一期只收时长档/合并/一生一次/申请窗/最低时长/语言;field-of-study CIP 六表 = 第二期
(Frank 拍板)。"""

PGWP_BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/"
             "work/after-graduation")
"""PGWP 官方页前缀。"""

PGWP_URL_ABOUT = PGWP_BASE + "/about.html"
"""时长档/合并/一生一次的出处页。"""

PGWP_URL_ELIG = PGWP_BASE + "/eligibility.html"
"""申请窗/最低时长/语言的出处页。"""

PGWP_TIMEOUT_S = 40
"""两页抓取超时。"""

PGWP_STAR = "*"
"""md 强调星号(归一化时去掉)。"""

QUOTE_CURLY_RIGHT = "’"
"""右弯单引号(归一成直引号再比对)。"""

QUOTE_CURLY_LEFT = "‘"
"""左弯单引号。"""

QUOTE_STRAIGHT = "'"
"""直单引号(归一目标)。"""

PGWP_PAGE_ABOUT = "about"
"""页键:about.html。"""

PGWP_PAGE_ELIG = "elig"
"""页键:eligibility.html。"""

PGWP_PROGRAM = "PGWP"
"""表级项目码。"""

K_EFFECTIVE = "effective"
"""门槛行键:生效日(没有=空串)。"""

PGWP_RULES = (
    {"page": "about", "factor": "pgwpLength", "stream": "masters", "op": ">=", "value": 36, "unit": "months",
     "effective": "2024-02-15", "basis": "permit=36;minProgramMonths=8;level=master",
     "label": "Master's degree >=8 months -> 3-year PGWP",
     "quote": "You can apply for a 3-year PGWP, even if your master's program was less than 2 years"},
    {"page": "about", "factor": "pgwpLength", "stream": "short", "op": "=", "value": None, "unit": "months",
     "basis": "permitEqualsProgram;minProgramMonths=8;maxMonthsExclusive=24",
     "label": "Program 8 months to <2 years -> PGWP up to same length",
     "quote": "We may give you a PGWP that's valid for up to the same length as your study program"},
    {"page": "about", "factor": "pgwpLength", "stream": "long", "op": ">=", "value": 36, "unit": "months",
     "basis": "permit=36;minProgramMonths=24",
     "label": "Program 2 years or more -> 3-year PGWP",
     "quote": "If your program was 2 years or more"},
    {"page": "about", "factor": "pgwpCombine", "stream": "", "op": "rule", "value": None, "unit": "",
     "basis": "eachMinProgramMonths=8;languageTakesHigher",
     "label": "More than 1 program: lengths may combine (each PGWP-eligible & >=8 months; higher language req applies)",
     "quote": "You may be able to get a PGWP that combines the length of each program as long as you meet the eligibility requirement for each program"},
    {"page": "about", "factor": "pgwpOnce", "stream": "", "op": "rule", "value": 1, "unit": "lifetime",
     "basis": "oncePerLifetime",
     "label": "One PGWP per lifetime",
     "quote": "You can't get a PGWP if you already had one after completing an earlier program of study"},
    {"page": "elig", "factor": "pgwpWindow", "stream": "", "op": "<=", "value": 180, "unit": "days",
     "basis": "applyWithinDaysOfCompletion=180",
     "label": "Apply within 180 days of completion confirmation",
     "quote": "you apply for your PGWP within 180 days of confirmation that you completed your program of study"},
    {"page": "elig", "factor": "pgwpMinProgram", "stream": "", "op": ">=", "value": 8, "unit": "months",
     "basis": "minProgramMonths=8;quebecHours=900",
     "label": "Program must be at least 8 months (900 hours for Quebec programs)",
     "quote": "was at least 8 months long (or 900 hours for Quebec programs)"},
    {"page": "elig", "factor": "pgwpLanguage", "stream": "degree", "op": ">=", "value": 7, "unit": "CLB",
     "effective": "2024-11-01", "basis": "appliesSince=2024-11-01(PGWP application date)",
     "label": "University degree/program graduates: CLB 7 in all 4 areas",
     "quote": "minimum level of Canadian Language Benchmarks (CLB) 7 in English"},
    {"page": "elig", "factor": "pgwpLanguage", "stream": "college", "op": ">=", "value": 5, "unit": "CLB",
     "effective": "2024-11-01", "basis": "appliesSince=2024-11-01(PGWP application date)",
     "label": "College/polytechnic/non-university graduates: CLB 5 in all 4 areas",
     "quote": "minimum level of Canadian Language Benchmarks (CLB) 5 in English"},
)
"""每行 = 一条官方规则:quote 必须逐字(归一化后)出现在 page 页面上,否则整表不更新。
subject 恒 applicant;stream 区分时长档/学位层级;数值语义见 basis(人读)与引擎
(机读 factor+stream+value)。
**quote-anchored**(Frank 拍板「原文为准」):规则表每行带官方原文引用(valueText),
本段每轮实抓 about/eligibility 两页,**逐条验证引用仍逐字存在于页面**——
页面改版引用消失 → 保留旧表 + exit 1(钉 ircc 役末尾,红了触发 healthchecks 报警;
crawl 役的 fed-pgwp 地图 diff 是第二道雷达)。规则是人工从原文抄的,机器管的是「原文没变」。
沿革注(原表内行内注释 2026-08-30 批C 逐字折进本 docstring):合并条款位于官方页
「How long is a PGWP valid」下:各段时长用于确定工签长度;最终仍是 may、不是保证签发。"""

PGWP_NOTE = ("quote-anchored:valueText=官方原文,本脚本每轮验证其仍在页面上;字段语义见 basis。"
             "多个合格课程可合并时长来确定 PGWP 长度;官方措辞为 may,不保证签发。")
"""段5 表级口径注。"""

PGWP_PRINT_OUT_TPL = "OUT : {path}"
"""段5 开工报输出。"""

PGWP_MISSING_TPL = "✗ {n}/{total} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:"
"""引用核验未过的抬头。"""

PGWP_MISSING_ROW_TPL = "✗   [{factor}/{stream}] {quote}"
"""引用核验未过的逐条明细。"""

PGWP_QUOTE_CLIP = 80
"""未过引用在日志里的截断长度。"""

PGWP_DONE_TPL = "✓ {n} 条规则全部引用核验通过 → {out}"
"""段5 收尾报数。"""


# =========================================================================
# 6. 联邦段官方规费(G8 v1;段落定位 + 交叉自校硬闸)
# =========================================================================

OUT_FEES = paths.IRCC / "fees.json"
"""段6 输出:raw/ircc/fees.json。
案例库 C14「中介开价 3 万值吗」的拆账原料。产出走 pnp_requirements 形状
(province='FED' program='PR-fees',factor='fee',stream 区分条目)—— 第三次复用同一张表
(PGWP 同款先例):零新表零 DDL,引擎 facts.requirements 免费拿到;requirementLines 不认识
factor='fee' → 天然不进门槛节,只被 fees 消费点读。
省级申请费(BC/ON/SK/MB…)= G8 二期,各省官方页原句待逐个核。"""

FEES_URL = "https://ircc.canada.ca/english/information/fees/fees.asp"
"""IRCC 官方费用总表(httpx 直连 200)。"""

FEES_TIMEOUT_S = 45
"""费用页抓取超时。"""

FEES_DROP_TAGS = ["script", "style", "nav", "header", "footer"]
"""取正文前先拆掉的噪音标签。"""

FEES_SECTION = "Economic immigration (including Express Entry)"
"""只收这一节(官方明示适用于 PNP/EE/AIP/RCIP)+ 生物识别两档。"""

FEES_SECTION_BIO = "Biometrics"
"""生物识别两档的 section 值。"""

FEES_SEG_LEN = 3000
"""该节自己的费率块长度;下一节标题前肯定覆盖到。"""

FEES_VALUE_CLIP = 180
"""valueText 的截断长度。"""

FEES_ITEMS = (
    (re.compile(r"Your application This amount includes the processing fee and the right of permanent residence fee\.?\s*([\d,]+)\.00"),
     "principal", "Principal applicant — processing + right of permanent residence fee"),
    (re.compile(r"Your application \(without right of permanent residence fee\)\s*([\d,]+)\.00"),
     "principalNoRprf", "Principal applicant — processing only (without RPRF)"),
    (re.compile(r"Include your spouse or partner[^$]*?([\d,]+)\.00"),
     "spouse", "Spouse or partner — processing + RPRF"),
    (re.compile(r"Include a dependent child\s*([\d,]+)\.00"),
     "child", "Dependent child (per child)"),
)
"""段内条目:label 正则 → stream 名 + 落盘 label。金额格式恒为 1,234.00。
**段落定位后逐项正则**,任何一项没解析到 → 保留旧表 exit 1(硬闸,照 build_pgwp)。"""

RE_BIO_P = re.compile(r"Biometrics [–-] per individual\s*([\d,]+)\.00", re.I)
"""官方措辞:「Biometrics – per individual 85.00」。"""

RE_BIO_F = re.compile(r"Biometrics [–-] per family of 2 or more.{0,400}?([\d,]+)\.00", re.I)
"""官方措辞:「Biometrics – per family of 2 or more … 170.00」
(family 行的金额隔着一整段资格说明,允许中间最多 400 字符)。"""

FEES_BIO_ITEMS = (
    (RE_BIO_P, "biometricsPerson", "Biometrics — per person"),
    (RE_BIO_F, "biometricsFamily", "Biometrics — per family (2+ people)"),
)
"""生物识别两档:正则 → stream 名 + 落盘 label。"""

FEE_FACTOR = "fee"
"""费用行的 factor 固定值(requirementLines 不认识它 → 天然不进门槛节)。"""

FEE_OP = "="
"""费用行的算子固定值。"""

FEE_UNIT = "CAD"
"""费用行的单位。"""

STREAM_PRINCIPAL = "principal"
"""交叉自校用:主申请人(含永居权费)。"""

STREAM_PRINCIPAL_NO_RPRF = "principalNoRprf"
"""交叉自校用:主申请人(不含永居权费)。"""

K_APPLIES_TEER = "appliesTeer"
"""费用行键:适用 TEER(费用与 TEER 无关,恒空表)。"""

K_APPLIES_NOC = "appliesNoc"
"""费用行键:适用 NOC(恒空)。"""

K_EXCLUDES_NOC = "excludesNoc"
"""费用行键:排除 NOC(恒空)。"""

K_APPLIES_AREA = "appliesArea"
"""费用行键:适用地域(恒空)。"""

K_FAMILY_SIZE = "familySize"
"""费用行键:家庭人数(恒 None)。"""

FEES_PROGRAM = "PR-fees"
"""表级项目码。"""

FEES_SOURCE = "IRCC — fee list (Economic immigration incl. Express Entry / PNP / AIP / RCIP)"
"""表级来源名。"""

FEES_NOTE = "官方原文锚在每行 valueText;RPRF = principal - principalNoRprf。省级申请费 = G8 二期。"
"""段6 表级口径注。"""

FEES_PRINT_OUT_TPL = "OUT: {path}"
"""段6 开工报输出(原脚本 `OUT:` 无空格,与段5 的 `OUT :` 不同,原样保留)。"""

FEES_PROBLEM_NO_SECTION_TPL = "没找到段落标题「{section}」(页面可能改版)"
"""段落定位失败。"""

FEES_PROBLEM_ITEM_TPL = "「{stream}」没解析到"
"""某个条目正则没命中。"""

FEES_PROBLEM_RPRF_TPL = "永居权费差值异常:{principal} - {no_rprf} = {rprf}"
"""交叉自校:principal - principalNoRprf = 永居权费,应为正数且 ≤ principal 的一半
(改版最容易先烂在这)。"""

FEES_FAIL_HEADER = "✗ 自校未过,保留旧表不覆盖:"
"""自校未过的抬头。"""

FEES_BULLET_TPL = "   - {problem}"
"""自校未过的逐条明细。"""

FEES_DONE_TPL = "✓ {n} 条费用: {by}"
"""段6 收尾报数(by = stream → 金额)。"""


# =========================================================================
# 7. 省移民难度指数(E12-07;纯算件,零网络,只吃前三步落好的 raw + pnp draws)
# =========================================================================

IN_TR_PROV = paths.IRCC / "statcan_tr_prov.json"
"""段7 输入①:段4 自己落的分省临时居民存量(域内前后步,同一文件两个身份 —— 路径写两遍
就是两份真相,故取别名不复制)。
2026-09-06 段4 搬去 statcan 域后,别名的另一头(OUT_TR_PROV)不在本域了 —— 域间不互取常量,
故这里写回字面路径。**产物路径不动**是两域共同的契约:那边写它,这边读它。
2026-08-15 方案C(Frank「那就换 C 吧」):竞争比分子整体换 StatCan 常住估算口径 ——
IRCC 年末许可表停在 2024 且高估(含已离境者),StatCan 季度估算的才是「还在境内抢名额的人」。
temp_residents.json(IRCC)不再进本段;其余消费端(省弹框体量卡等)不受影响。"""

IN_ALLOC = paths.IRCC / "pnp_allocations.json"
"""段7 输入②:人工核定的九省 PNP 配额表(逐年官方原句 + 出处,不是本域抓的)。"""

IN_DRAWS = paths.PNP / "draws.json"
"""段7 输入③:pnp 域的省抽选记录(仅 BC/AB/MB/ON/NL/NB 有官方抽选数据)。"""

OUT_DIFFICULTY = paths.PROCESSED / "difficulty.json"
"""段7 输出:processed/difficulty.json(唯一消费者 = mart 的 build_mart_stats)。
因子:①竞争比=(学签+工签存量)÷ PNP 配额(横向可比,纯人数);②配额趋势=2026/2025-1
(腰斩类硬事件压档);③抽选活跃=近 180 天抽选次数+邀请量;④分数线水位=最新分在自身近
24 个月分布的分位(分制不可比红线:只跟自己比)。
档位:easy/mid/tight(前端人话「机会较多/一般/竞争激烈」)。
红线:缺数留空不猜;逐因子带 source+asOf;禁概率。QC 不入(自有体系)。"""

DIFF_PROVS = ["ON", "BC", "AB", "SK", "MB", "NS", "NB", "NL", "PE"]
"""段7 逐省重算的九省(QC 不在:自有体系不属 PNP)。"""

COMP_EASY = 20
"""竞争比 easy 档上界(首跑分布:MB~12 AB~34 ON~77 BC~84 → 三档切 20/50;定案见设计文档 §4)。"""

COMP_TIGHT = 50
"""竞争比 tight 档下界(同上一条的分档实据)。"""

COMP_ROUND = 1
"""竞争比的小数位。"""

TREND_ROUND = 3
"""配额趋势的小数位。"""

TREND_TIGHT = -0.3
"""配额腰斩线:趋势 ≤ -30% 直接压 tight(硬事件压档)。"""

QUOTA_YEAR_LATEST = 2026
"""配额取数优先年(有值就用它)。"""

QUOTA_YEAR_PREV = 2025
"""配额取数退档年(最新年没值时用)。"""

ACTIVITY_DAYS = 180
"""抽选活跃的回看窗(天)。"""

ACTIVITY_EASY = 8
"""窗内抽选次数 ≥ 此数 = easy。"""

ACTIVITY_TIGHT = 2
"""窗内抽选次数 ≤ 此数 = tight。"""

SCORE_DAYS = 730
"""分数线水位的回看窗(天;近 24 个月)。"""

SCORE_MIN_DRAWS = 6
"""窗内带分抽选少于此数就不出水位因子(样本太少的分位无意义)。"""

SCORE_EASY_PCT = 40
"""水位分位 < 此数 = easy。"""

SCORE_TIGHT_PCT = 70
"""水位分位 > 此数 = tight。"""

ASOF_MONTH_LEN = 7
"""季度参考日 → 快照月的截断长度(如 2026-04-01 取前 7 位;前端原样显示不再拼 -12)。"""

TIER_EASY = "easy"
"""档位:机会较多。"""

TIER_MID = "mid"
"""档位:一般。"""

TIER_TIGHT = "tight"
"""档位:竞争激烈。"""

FACTOR_COMP = "comp"
"""因子键:竞争比。"""

FACTOR_QUOTA_TREND = "quotaTrend"
"""因子键:配额趋势。"""

FACTOR_ACTIVITY = "activity"
"""因子键:抽选活跃。"""

FACTOR_SCORE_LEVEL = "scoreLevel"
"""因子键:分数线水位。"""

K_SCALE = "scale"
"""省抽选块键:分制(BC 的 SIRS 与 AB 的 CRS 不可比,只跟自己比)。"""

DIFF_PRINT_TPL = "IN_TR={tr}\nIN_ALLOC={alloc}\nIN_DRAWS={draws}\nOUT={out}"
"""段7 开工报四条路径(原脚本一次 print 四行,原样保留 —— 旧输出序是「→ difficulty」在前、
路径行在后,故这行由入口函数首行打,不在模块级)。"""

DIFF_ROW_TPL = "{prov}: tier={tier} comp={comp} factors={n}"
"""段7 逐省报数(tier/comp 可能是 None,原 f-string 直接打 None,原样保留)。"""

DIFF_DONE_TPL = "done → {path}"
"""段7 收尾报输出路径。"""

K_LATEST_REF_PER = "latestRefPer"
"""表键:最新季度参考日。
2026-09-06 段4 迁出后留守:段7 读 statcan 域落的表要用它,statcan 侧另有一份同名件(叶子律)。"""

DIFF_NO_LATEST_REF = ("difficulty: raw/ircc/statcan_tr_prov.json 缺 latestRefPer —— statcan 域段4 契约破了,"
                      "不在本域重算(域间不互借)")
"""段7 读 StatCan 分省表最新参考日的硬闸文案(2026-09-06 latest_ref_of 随段4 搬去 statcan 后立)。"""

PCT_SCALE = 100
"""占比 → 百分数的倍率。
2026-09-06 段3 迁出后留守:段7 的分数线水位分位换算要用它。"""
