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

K_STATUS = "status"
"""StatCan WDS 响应块键:成功与否。"""

K_OBJECT = "object"
"""StatCan WDS 响应块键:数据体。"""

K_VECTOR_DATA_POINT = "vectorDataPoint"
"""StatCan WDS 数据体键:时点序列。"""

K_REF_PER = "refPer"
"""StatCan 时点键:季度参考日(1/1、4/1、7/1、10/1)。"""

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

STATUS_SUCCESS = "SUCCESS"
"""StatCan WDS 的成功状态字。"""

WDS_STATUS_FAIL_TPL = "WDS 返回 {status}"
"""WDS 非成功状态的报错(分省存量段用;NPR 段带 vector 另有模板)。"""


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

STATS_FLOW_TPL = "study flow: {n} 省 · 年份 {first}–{last} · ON {tail}"
"""流量表收尾报数。"""


# =========================================================================
# 3. NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
# =========================================================================

OUT_NPR = paths.IRCC / "npr_share.json"
"""段3 输出:季度序列 + 最新占比 + 距 5% 目标的人数缺口。
2026-08-03 立项(Frank:「政府说要把临时人口降低到 5% 以下,现在是多少了」)。这个数
**不在 IRCC 口径里**:IRCC 开放数据给的是学签/工签**许可持有人**(会重复计人、不含访客与
庇护申请人),分母「加拿大总人口」它也不发。占比只能取 StatCan 季度人口估算。
为什么值钱:它是各省提名配额被砍、PNP 越来越卷的**上游原因**。峰值 2024-10 的 7.59% →
2026-04 的 6.18%,配额同步下滑;用户在报告里看到的「难度」变化,根子在这条曲线上。"""

NPR_WDS = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods"
"""StatCan WDS(免密钥 REST)的取序列端点。"""

V_POP = 1
"""向量号:加拿大总人口(季度)。"""

V_NPR = 1566927590
"""向量号:非永久居民(NPR)总数(季度)。"""

NPR_QUARTERS = 20
"""取近 5 年,够画趋势也够算年化降速。
口径注:refPer 是季度**参考日**(1/1、4/1、7/1、10/1),StatCan 每季度发布并会修订前序季度 →
本段每次全量重取近 N 个季度,不做增量拼接(修订才不会被旧值盖住)。"""

NPR_TARGET = 0.05
"""联邦目标:临时人口占比 5%。"""

NPR_SRC_URLS = {
    "population": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901",
    "npr": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710012101",
}
"""两条序列的人可读出处页(落盘 source 块)。"""

NPR_UA = "offer2pr-npr/1.0"
"""段3 的自报家门 UA。"""

NPR_TIMEOUT_S = 60
"""WDS 取序列超时。"""

NPR_MIN_QUARTERS = 4
"""季度数防线(少于这个疑似 WDS 改版 → 保留旧表)。"""

NPR_SPAN = 5
"""年化降速的取样跨度:最近 4 个季度(5 个点)。"""

SHARE_ROUND = 5
"""占比与降速的小数位。"""

QUARTERS_ROUND = 1
"""外推季度数的小数位。"""

TIMESPEC_SECONDS = "seconds"
"""fetchedAt 的时间精度。"""

K_VECTOR_ID = "vectorId"
"""WDS 请求键:向量号。"""

K_LATEST_N = "latestN"
"""WDS 请求键:取最近几期。"""

K_POPULATION = "population"
"""季度行键:总人口。"""

K_NPR = "npr"
"""季度行键:非永久居民数。"""

K_SHARE = "share"
"""季度行键:占比。"""

K_TARGET = "target"
"""表键:5% 目标。"""

K_QUARTERS = "quarters"
"""表键:季度序列。"""

K_LATEST = "latest"
"""表键:最新一季。"""

K_PEAK = "peak"
"""表键:峰值那一季。"""

K_PER_QUARTER_CHANGE = "perQuarterChange"
"""表键:每季度变化(负=在降)。"""

K_GAP_TO_TARGET = "gapToTargetPeople"
"""表键:距 5% 目标还差多少人。"""

K_QUARTERS_TO_TARGET = "quartersToTarget"
"""表键:按最近四季降速线性外推还需几季(不降=None)。"""

K_FETCHED_AT = "fetchedAt"
"""表键:抓取时刻(秒级 UTC)。"""

NPR_NOTE = ("NPR=非永久居民(含学签/工签持有人及其家属、访客、庇护申请人),分母=StatCan 季度总人口估算。"
            "**与 IRCC 许可持有人数不可混用**(后者会重复计人且不含访客/庇护)。"
            "StatCan 每季度发布并修订前序季度,故每轮全量重取。quartersToTarget 是按最近四季降速的"
            "线性外推,不是官方预测。")
"""段3 表级口径注。"""

WDS_VECTOR_FAIL_TPL = "WDS 返回 {status} (vector {vector})"
"""某条向量取回失败。"""

NPR_PRINT_OUT_TPL = "OUT={path}"
"""段3 开工报输出(原脚本模块级 print,溶后挪进入口函数首行)。"""

NPR_FAIL_TPL = "  ✗ StatCan 抓取失败: {name} {detail}(保留旧表)"
"""抓取失败 → 保留旧表(宁可留旧也不留空)。"""

NPR_TOO_FEW_TPL = "  ✗ 只取到 {n} 个季度(<4,疑似 WDS 改版)—— 保留旧表"
"""季度数不足 → 保留旧表。"""

NPR_DONE_TPL = "  ✓ NPR 占比 {n} 个季度 → {out}"
"""段3 收尾报数。"""

NPR_LATEST_TPL = "      最新 {ref}: {pct:.2f}%  ({npr:,} / {pop:,})"
"""段3 收尾:最新一季。"""

NPR_PEAK_TPL = "      峰值 {ref}: {pct:.2f}%   目标 5% 还差 {gap:,} 人"
"""段3 收尾:峰值与缺口。"""

NPR_SPEED_TPL = "      降速 {per:+.2f} 个百分点/季度 → 按此外推还需约 {quarters} 个季度"
"""段3 收尾:降速与外推。"""

PCT_SCALE = 100
"""占比 → 百分数的倍率。"""


# =========================================================================
# 4. StatCan 分省临时居民存量(IRCC 年末存量停在 2024 后唯一的官方分省刻度)
# =========================================================================

OUT_TR_PROV = paths.IRCC / "statcan_tr_prov.json"
"""段4 输出:分省 × 证型 × 季度的常住估算。
2026-08-14 立项(竞争卡年份列缺口探索):StatCan 表 17-10-0121-01 分省 × 证型
(仅学签 / 仅工签 / 学+工)× 季度,WDS 免密钥,最新参考日领先 IRCC 年末表一年半。
**口径与 IRCC 不可混列**:StatCan=常住人口估算(净掉已离境/未入境),IRCC=有效许可持有人 ——
ON 学签 IRCC 2024-12=482,100 vs StatCan 同期常住估算约六成。竞争卡要不要用、怎么标注
是产品拍板(2026-08-14 Frank 批的是「接入落 raw」),本段不进 mart、不灌库。
口径注:refPer 是季度参考日(1/1、4/1、7/1、10/1);"2026-01-01" ≈ 2025 年末快照。
StatCan 每季度发布并修订前序季度 → 每轮全量重取近 N 季,不做增量拼接。"""

TRP_META_URL = "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata"
"""WDS 表元数据端点(解析维度成员 id)。"""

TRP_DATA_URL = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods"
"""WDS 按坐标取数端点。"""

TRP_PID = 17100121
"""StatCan 表号 17-10-0121-01。"""

TRP_QUARTERS = 8
"""近 2 年:覆盖「IRCC 停更后」的全部空窗。"""

TRP_SRC_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710012101"
"""人可读出处页。"""

TRP_UA = "offer2pr-tr-prov/1.0"
"""段4 的自报家门 UA。"""

TRP_TYPES = {
    "studyOnly": "Study permit holders only",
    "workOnly": "Work permit holders only",
    "workStudy": "Work and study permit holders",
}
"""输出键 → StatCan 维度成员名(改名=改版,靠 metadata 解析兜住)。"""

TRP_META_TIMEOUT_S = 60
"""元数据请求超时。"""

TRP_DATA_TIMEOUT_S = 120
"""取数请求超时(30 个坐标一发)。"""

GEO_DIM = "Geography"
"""地理维度名(精确匹配)。"""

TYPE_DIM_WORD = "type"
"""证型维度名的判词(小写含它即认)。"""

COORD_TPL = "{geo}.{typ}.0.0.0.0.0.0.0.0"
"""WDS 坐标形(前两维=省/证型,其余补零)。"""

COORD_SEP = "."
"""坐标分隔符。"""

TRP_MIN_PROV = 10
"""省维度成员数防线。"""

TRP_MIN_TYPES = 3
"""证型维度成员数防线。"""

TRP_ON_MIN = 50000
"""ON 最新学签存量的量级防线(低于此疑似坐标错位/表改版)。"""

K_PRODUCT_ID = "productId"
"""WDS 请求键:表号。"""

K_COORDINATE = "coordinate"
"""WDS 请求/响应键:坐标。"""

K_DIMENSION = "dimension"
"""元数据键:维度清单。"""

K_DIMENSION_NAME_EN = "dimensionNameEn"
"""元数据键:维度英文名。"""

K_MEMBER = "member"
"""元数据键:维度成员清单。"""

K_MEMBER_NAME_EN = "memberNameEn"
"""元数据键:成员英文名。"""

K_MEMBER_ID = "memberId"
"""元数据键:成员 id。"""

K_STUDY_ONLY = "studyOnly"
"""证型键:仅学签。"""

K_WORK_ONLY = "workOnly"
"""证型键:仅工签。"""

K_WORK_STUDY = "workStudy"
"""证型键:学+工双持。"""

K_TYPES = "types"
"""表键:证型键 → StatCan 成员名。"""

K_LATEST_REF_PER = "latestRefPer"
"""表键:最新季度参考日。"""

TRP_DIM_FAIL_TPL = "维度成员缺位(省 {geo}/10,证型 {typ}/3)—— 疑似表改版"
"""维度成员数不足。"""

TRP_COORD_FAIL_TPL = "响应坐标 {coord} 对不上请求的省/证型"
"""响应块**不按请求顺序**回来(实测乱序)—— 只能从块自带 coordinate 反解 (省, 证型);
反解不出即报错。"""

TRP_SANITY_FAIL = "ON 最新学签存量 <5 万 —— 量级失真,疑似坐标错位/表改版"
"""收口探针未过。"""

TRP_NOTE = ("StatCan 17-10-0121-01 分省临时居民**常住估算**(季度参考日快照;每季修订前序,故每轮全量重取)。"
            "**与 IRCC 有效许可持有人口径不可混列**(后者不净离境,量级高约四成)。"
            "refPer 2026-01-01 ≈ 2025 年末。消费端待拍板:落 raw 不进 mart。")
"""段4 表级口径注。"""

TRP_PRINT_OUT_TPL = "OUT={path}"
"""段4 开工报输出(原脚本模块级 print,溶后挪进入口函数首行)。"""

TRP_FAIL_TPL = "  ✗ StatCan 分省存量抓取失败: {name} {detail}(保留旧表)"
"""抓取失败 → 保留旧表(宁可留旧也不留空)。"""

TRP_DONE_TPL = "  ✓ 分省存量 {n} 省 × {q} 季 → {out}"
"""段4 收尾报数。"""

TRP_ROW_TPL = "      最新 {ref}: ON 仅学签 {study:,} · 仅工签 {work:,} · 学+工 {both:,}"
"""段4 收尾:ON 三档抽样。"""


# =========================================================================
# 5. 省移民难度因子重算(清洗横切层 04e 的包装;本域只负责按序跑起来)
# =========================================================================

DIFFICULTY_SCRIPT = paths.ROOT / "etl" / "clean" / "04e_difficulty.py"
"""被调的清洗脚本(**不属本域、不溶进来**:clean/ 是清洗横切层,一个关注点一个脚本、
跨源生效)。它消费本域前三步的 raw + pnp 域 draws + 人工配额表,产出 processed/difficulty.json;
11_build_stats 读它挂进 mart。路径经 paths 解析,不写死相对路径。"""

DIFFICULTY_PY = "python"
"""跑子进程用的解释器名 —— **原 _steps.STEPS 的 `["python", ...]` 原值照搬**
(容器与 uv run 下都解析到同一个 venv python;换 sys.executable 是行为变更,不在本批范围)。"""

DIFFICULTY_FAIL_TPL = "04e 难度因子重算失败(exit {code}),本域本轮中止"
"""子进程非零 → 抛错,「一步失败中止本轮」的语义与旧 _steps 逐字相同。"""


# =========================================================================
# 6. PGWP 规则库(B1-4;quote-anchored,引用消失即保留旧表 exit 1)
# =========================================================================

OUT_PGWP = paths.IRCC / "pgwp_rules.json"
"""段6 输出:raw/ircc/pgwp_rules.json。
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

PGWP_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
           "Chrome/120 Safari/537.36")
"""段6 的伪装 UA(原脚本原值 Chrome/120)。⚠ 与 fetch.constants.BROWSER_UA(Chrome/131)
不是一份 —— 2026-08-30 批C 是「行为逐字不变」的溶解批,抓取头不在本批变换范围内。"""

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
"""段6 表级口径注。"""

PGWP_PRINT_OUT_TPL = "OUT : {path}"
"""段6 开工报输出。"""

PGWP_MISSING_TPL = "✗ {n}/{total} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:"
"""引用核验未过的抬头。"""

PGWP_MISSING_ROW_TPL = "✗   [{factor}/{stream}] {quote}"
"""引用核验未过的逐条明细。"""

PGWP_QUOTE_CLIP = 80
"""未过引用在日志里的截断长度。"""

PGWP_DONE_TPL = "✓ {n} 条规则全部引用核验通过 → {out}"
"""段6 收尾报数。"""


# =========================================================================
# 7. 联邦段官方规费(G8 v1;段落定位 + 交叉自校硬闸)
# =========================================================================

OUT_FEES = paths.IRCC / "fees.json"
"""段7 输出:raw/ircc/fees.json。
案例库 C14「中介开价 3 万值吗」的拆账原料。产出走 pnp_requirements 形状
(province='FED' program='PR-fees',factor='fee',stream 区分条目)—— 第三次复用同一张表
(PGWP 同款先例):零新表零 DDL,引擎 facts.requirements 免费拿到;requirementLines 不认识
factor='fee' → 天然不进门槛节,只被 fees 消费点读。
省级申请费(BC/ON/SK/MB…)= G8 二期,各省官方页原句待逐个核。"""

FEES_URL = "https://ircc.canada.ca/english/information/fees/fees.asp"
"""IRCC 官方费用总表(httpx 直连 200)。"""

FEES_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
"""段7 的伪装 UA(原脚本原值 Chrome/126)。"""

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
"""段7 表级口径注。"""

FEES_PRINT_OUT_TPL = "OUT: {path}"
"""段7 开工报输出(原脚本 `OUT:` 无空格,与段6 的 `OUT :` 不同,原样保留)。"""

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
"""段7 收尾报数(by = stream → 金额)。"""
