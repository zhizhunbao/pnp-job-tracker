"""
statcan 域常量 —— 域词汇表(StatCan WDS:通用取数 + NPR 占总人口比 + 分省临时居民存量 +
四张宏观表;照 ircc/company 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/表清单)+ IN/OUT 路径。
唯一特批 import = `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除字典键(K_ 词族)、空串、语法位外,一切字面量住这;
文案模板一律 *_TPL。
2026-09-06 立域:段3/段4 的常量整批自 etl/ircc/constants.py **原样搬来**(docstring 一字未改),
产物路径不动(仍指 paths.IRCC);ircc 段1 里被这两段共用的几个(省码表/缩进/表键)按叶子律
**各域自声明**——本域自留一份,不跨域取常量。段2/段5 是新写。
"""

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:省码表 / 落盘缩进 / 表键)
# =========================================================================

PROV_CODE = {
    "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE", "Nova Scotia": "NS",
    "New Brunswick": "NB", "Quebec": "QC", "Ontario": "ON", "Manitoba": "MB",
    "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
}
"""省全名 → 省码(StatCan 各表的 Geography 成员名都是这一套英文省名)。
2026-09-06 立域时自 ircc/constants.py 段1 **各域自声明**一份(叶子律:域间不互取常量;
ircc 侧那份仍被它的开放数据段消费,两边是同一张官方省名表,不是本域派生的判定)。
领地(YT/NT/NU)与 Outside Canada 不在表里 = 不收(契约 §1:CA + 十省)。"""

PROV_ON = "ON"
"""安省省码 —— 三处收口探针的抽样省(量最大,最能看出坐标错位/量级失真)。"""

INDENT_1 = 1
"""本域全部产出表的 JSON 缩进(大表省体积,与 ircc 域产出同档)。"""

K_SOURCE = "source"
"""表键:来源(URL 或来源名)。"""

K_FETCHED = "fetched"
"""表键:本轮抓取日(B3-3:要拿来下结论的数据必须知道是哪天的;新鲜度哨兵 check_freshness 读它)。"""

K_NOTE = "note"
"""表键:口径注(消费端读得到的免责与语义说明)。"""

K_VALUE = "value"
"""StatCan 时点键:数值。"""

K_REF_PER = "refPer"
"""StatCan 时点键:参考日(季度 1/1、4/1、7/1、10/1;月度当月 1 日;年度当年 1/1)。"""


# =========================================================================
# 2. WDS 通用取数(免密钥 REST:元数据解成员 id → 坐标一发全取)
# =========================================================================

WDS_META_URL = "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata"
"""WDS 表元数据端点(解析维度成员 id)。"""

WDS_DATA_URL = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods"
"""WDS 按坐标取数端点。"""

WDS_UA = "offer2pr-statcan/1.0"
"""段2/段5 的自报家门 UA(不伪装:WDS 是开放 REST)。"""

WDS_META_TIMEOUT_S = 60
"""元数据请求超时。"""

WDS_DATA_TIMEOUT_S = 180
"""取数请求超时(一张表一发几十个坐标 × 上百期)。"""

K_PRODUCT_ID = "productId"
"""WDS 请求键:表号。"""

K_COORDINATE = "coordinate"
"""WDS 请求/响应键:坐标。"""

K_LATEST_N = "latestN"
"""WDS 请求键:取最近几期(CUBES 行里同名同义)。"""

K_STATUS = "status"
"""StatCan WDS 响应块键:成功与否。"""

K_OBJECT = "object"
"""StatCan WDS 响应块键:数据体。"""

K_VECTOR_DATA_POINT = "vectorDataPoint"
"""StatCan WDS 数据体键:时点序列。"""

STATUS_SUCCESS = "SUCCESS"
"""StatCan WDS 的成功状态字。"""

K_DIMENSION = "dimension"
"""元数据键:维度清单。"""

K_DIMENSION_NAME_EN = "dimensionNameEn"
"""元数据键:维度英文名。"""

K_DIMENSION_POSITION_ID = "dimensionPositionId"
"""元数据键:维度段位(1 起)—— 坐标各段的顺序即此,不按响应里的数组序想当然。"""

K_MEMBER = "member"
"""元数据键:维度成员清单。"""

K_MEMBER_NAME_EN = "memberNameEn"
"""元数据键:成员英文名。"""

K_MEMBER_ID = "memberId"
"""元数据键:成员 id。"""

K_CUBE_TITLE_EN = "cubeTitleEn"
"""元数据键:表的英文标题(落盘 title,也是 crawl 页行的标题)。"""

GEO_DIM = "Geography"
"""地理维度名(精确匹配)。"""

COORD_SEP = "."
"""坐标分隔符。"""

COORD_DIMS = 10
"""WDS 坐标恒十段:表用到几维就填几维,其余补零(与 COORD_TPL 同形,只是维数按表算)。"""

COORD_ZERO = "0"
"""坐标里「本维未用」的填充值。"""

WDS_STATUS_FAIL_TPL = "WDS 返回 {status}"
"""WDS 非成功状态的报错(分省存量段与表清单段共用;NPR 段带 vector 另有模板)。"""


# =========================================================================
# 3. NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
# =========================================================================

OUT_NPR = paths.IRCC / "npr_share.json"
"""段3 输出:季度序列 + 最新占比 + 距 5% 目标的人数缺口。
2026-08-03 立项(Frank:「政府说要把临时人口降低到 5% 以下,现在是多少了」)。这个数
**不在 IRCC 口径里**:IRCC 开放数据给的是学签/工签**许可持有人**(会重复计人、不含访客与
庇护申请人),分母「加拿大总人口」它也不发。占比只能取 StatCan 季度人口估算。
为什么值钱:它是各省提名配额被砍、PNP 越来越卷的**上游原因**。峰值 2024-10 的 7.59% →
2026-04 的 6.18%,配额同步下滑;用户在报告里看到的「难度」变化,根子在这条曲线上。
⚠ 2026-09-06 本段搬进 statcan 域:**产物路径不动**(仍是 raw/ircc/npr_share.json),
消费端一个字不用改 —— 换目录等于换契约,不在立域批。"""

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
"""占比 → 百分数的倍率。
2026-09-06 立域:ircc 侧那份留给它的难度指数段(段7 分位换算),本域自声明一份(叶子律)。"""


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
StatCan 每季度发布并修订前序季度 → 每轮全量重取近 N 季,不做增量拼接。
⚠ 2026-09-06 本段搬进 statcan 域:**产物路径不动**(仍是 raw/ircc/statcan_tr_prov.json)——
ircc 域的难度指数段还按这个路径读它,换目录等于换契约。"""

TRP_META_URL = WDS_META_URL
"""WDS 表元数据端点(解析维度成员 id)。
2026-09-06 立域后改取段2 的通用端点常量(同一个 URL 写两遍就是两份真相,故取别名不复制;
IN_TR_PROV = OUT_TR_PROV 同款手法)—— 值与搬来前逐字相同。"""

TRP_DATA_URL = WDS_DATA_URL
"""WDS 按坐标取数端点。
2026-09-06 立域后改取段2 的通用端点常量(理由同上一条)—— 值与搬来前逐字相同。"""

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

TYPE_DIM_WORD = "type"
"""证型维度名的判词(小写含它即认)。"""

COORD_TPL = "{geo}.{typ}.0.0.0.0.0.0.0.0"
"""WDS 坐标形(前两维=省/证型,其余补零)。"""

TRP_MIN_PROV = 10
"""省维度成员数防线。"""

TRP_MIN_TYPES = 3
"""证型维度成员数防线。"""

TRP_ON_MIN = 50000
"""ON 最新学签存量的量级防线(低于此疑似坐标错位/表改版)。"""

K_BY_PROV = "byProv"
"""表键:按省的值。"""

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
# 5. 表清单取数(把脉页省份段四张宏观表:人口 / 临时居民 / GDP / 失业率)
# =========================================================================

CRAWL_SLUG = "statcan"
"""crawl 层站点 slug:WDS 响应原文落 data/crawl/statcan/(2026-09-02 数据链拍板
crawl → raw → processed → mart:原文先进 crawl 写门,再抽 raw)。"""

CACHE_URL_TPL = "{url}#pid={pid}"
"""crawl 页行的地址:取数端点 + 表号锚(一表一份缓存;端点本身对所有表同一个 URL,
不带锚会互相覆盖)。"""

CUBE_SRC_TPL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid={pid}01"
"""人可读出处页(落盘 source):StatCan 表页地址 = 8 位 pid + 版本尾 01。"""

OUT_NAME_TPL = "{pid}.json"
"""产物文件名:一表一文件 raw/statcan/<pid>.json(契约 §1)。"""

GEO_CA_NAME = "Canada"
"""全国的 Geography 成员名。"""

GEO_CA_CODE = "CA"
"""全国的 geo 码(契约 §1:CA + 十省两位码,领地不收)。"""

GEO_MUST = ("CA", "ON")
"""自校:这两个 geo 必须都有数据点,否则该表算失败保留旧表
(CA 缺=全表塌方,ON 缺=省维度错位;两者一起看,单看一个都可能蒙混过关)。"""

SERIES_SEP = " / "
"""落盘 series 标签里多个维度成员名的连接符(GDP/失业率是多维交叉,一个键对多个成员名)。"""

K_PID = "pid"
"""CUBES 行键 / 表键:StatCan 8 位表号。"""

K_TITLE = "title"
"""表键:官方英文表名(取自 metadata cubeTitleEn)。"""

K_FREQ = "freq"
"""CUBES 行键 / 表键:期频(Q 季度 / M 月度 / A 年度)。"""

K_SERIES = "series"
"""CUBES 行键:输出键 → {维度名: 成员名};表键:输出键 → 成员名标签。"""

K_BY_GEO = "byGeo"
"""表键:geo → 期 → {输出键: 值}。"""

K_PROBE = "probe"
"""CUBES 行键:量级自校(抽 ON 最新期的某个键比门槛)。"""

K_PROBE_KEY = "key"
"""probe 内键:拿哪个输出键做量级自校。"""

K_PROBE_MIN = "min"
"""probe 内键:量级下线(0 = 只要求「有值」—— 人口/NPR 有官方量级可依,GDP/失业率
不拍脑袋定线,缺数留空不猜)。"""

CUBES = (
    {"pid": 17100009, "freq": "Q", "latestN": 46,
     "series": {"pop": {}},
     "probe": {"key": "pop", "min": 10000000}},
    {"pid": 17100121, "freq": "Q", "latestN": 46,
     "series": {
         "npr": {"Non-permanent resident types": "Total, non-permanent residents"},
         "asylum": {"Non-permanent resident types":
                    "Total, asylum claimants, protected persons and related groups"},
         "workOnly": {"Non-permanent resident types": "Work permit holders only"},
         "studyOnly": {"Non-permanent resident types": "Study permit holders only"},
         "workStudy": {"Non-permanent resident types": "Work and study permit holders"},
         "other": {"Non-permanent resident types": "Other"},
     },
     "probe": {"key": "npr", "min": 500000}},
    {"pid": 36100222, "freq": "A", "latestN": 12,
     "series": {"gdp": {"Prices": "Chained (2017) dollars",
                        "Estimates": "Gross domestic product at market prices"}},
     "probe": {"key": "gdp", "min": 0}},
    {"pid": 14100287, "freq": "M", "latestN": 140,
     "series": {"unemp": {"Labour force characteristics": "Unemployment rate",
                          "Gender": "Total - Gender",
                          "Age group": "15 years and over",
                          "Statistics": "Estimate",
                          "Data type": "Seasonally adjusted"}},
     "probe": {"key": "unemp", "min": 0}},
)
"""四张表的取数清单(契约 docs/design/把脉页省份段-契约-20260906.md §1 的机读版)。
一行一表:pid=8 位表号,freq=期频,latestN=取最近几期,series=输出键 → {维度名: 成员名}
(**Geography 维不写**,由 geo 清单笛卡尔展开;单维表的 series 值是空表 = 该表只有一条序列),
probe=量级自校。维度名与成员名**逐字**取自 getCubeMetadata,改名即改版 —— 解析不到当场报错
保留旧表,不静默降级。
latestN 口径:17100009/17100121 取 46 期(≈2015 起;17100121 表本身自 2021-07 起,取满即止),
36100222 取 12 年,14100287 取 140 月(≈2015 起)。
36100222 的 Estimates 成员名 2026-09-06 现查 metadata 定案:含
「Gross domestic product at market prices」的成员有两个 —— memberId 38
「Gross domestic product at market prices」与 memberId 53「Gross domestic product at market
prices, adjusting entry」(平衡项),取前者(精确名写死在上)。
17100121 六个键的成员名同日现查核对:11 个成员里 Total/asylum 汇总行与四个明细行逐字命中。"""

DIM_MISS_TPL = "表 {pid} 缺维度「{dim}」—— 疑似表改版"
"""CUBES 点名的维度在 metadata 里找不到。"""

MEMBER_MISS_TPL = "表 {pid} 维度「{dim}」缺成员「{member}」—— 疑似表改版"
"""CUBES 点名的成员在维度里找不到(成员改名即改版,不猜近似名)。"""

GEO_MISS_TPL = "表 {pid} 的 Geography 维只解出 {n} 个 geo(要 CA + 十省)—— 疑似表改版"
"""地理成员缺位。"""

COORD_UNKNOWN_TPL = "表 {pid} 的响应坐标 {coord} 对不上请求的 geo/键"
"""响应块**不按请求顺序**回来(分省存量段实测乱序)—— 只能从块自带 coordinate 反解;
反解不出即报错。"""

PROBE_GEO_FAIL_TPL = "自校未过:geo {geo} 一个数据点都没有"
"""GEO_MUST 里的 geo 缺数据。"""

PROBE_MIN_FAIL_TPL = "自校未过:最新期 {ref} 的 ON.{key}={value} 低于量级线 {min}"
"""量级探针未过(疑似坐标错位/表改版)。"""

CUBES_PRINT_OUT_TPL = "OUT_DIR={path}  ({n} 张表)"
"""段5 开工报输出。"""

CUBE_FAIL_TPL = "  ⚠ {pid} 未更新: {name} {detail}(保留旧表)"
"""一张表失败:打 ⚠ 保留旧文件,不中止其余表(auto_update 按 ✗/! 行首升级,⚠ 行留痕,
最后的 ✗ 汇总行负责让本轮红)。"""

CUBE_DONE_TPL = "  ✓ {pid} {title}: {geos} 个 geo × {periods} 期 → {out}"
"""一张表的收尾报数。"""

CUBE_ROW_TPL = "      最新 {ref}: ON {key}={value}"
"""一张表的 ON 抽样行。"""

CUBES_FAIL_TPL = "✗ {n}/{total} 张表未更新(见上)—— 保留旧表,本轮红"
"""段5 汇总:有表失败即 exit 1(整域链尾,失败拖不到别的步)。"""

CUBES_DONE_TPL = "✓ {n} 张表全过 → {path}"
"""段5 收尾报数。"""

# =========================================================================
# 6. 城市刻度(把脉页城市段批二:CSD 人口 + CMA 失业率;2026-09-11 Frank「城市的人口 gdp 失业率 没有吗」)
# =========================================================================

CITY_POP_PID = 17100155
"""CSD 人口表(Population estimates, July 1, by census subdivision, 2021 boundaries;年度,CURRENT)。
2026-09-11 WDS metadata 现查定案:前代 17100142(2016 边界)已 inactive 止于 2022。"""

CITY_UNEMP_PID = 14100459
"""CMA 失业率表(Labour force characteristics by census metropolitan area, three-month moving
average, seasonally adjusted;月度,CURRENT,现查数据到 2026-08)。前代 14100380 已 inactive。
🔴 口径:失业率官方只到都会区(CMA)级 —— 素里显示的是温哥华都会区的值,展示层列名必须
写「都会区失业率」,不假装是本市;不在任何 CMA 的城市这格留空(宁缺不混省级口径,省级在省份段)。
GDP 同日评估结论:城市级只有 36100468(CMA 年度)且现查止于 2022(滞后 4 年)—— 不上,省级已有。"""

CITY_LF_DIM = "Labour force characteristics"
"""14100459 的特征维名。"""

CITY_LF_MEMBER = "Unemployment rate"
"""特征维成员:失业率。"""

CITY_STAT_DIM = "Statistics"
"""14100459 的统计维名。"""

CITY_STAT_MEMBER = "Estimate"
"""统计维成员:估计值。"""

CITY_DT_DIM = "Data type"
"""14100459 的数据类型维名。"""

CITY_DT_MEMBER = "Seasonally adjusted"
"""数据类型维成员:季调。"""

CITY_POP_LATEST_N = 2
"""人口取最近两期(最新期偶有空点,退一期)。"""

CITY_UNEMP_LATEST_N = 3
"""失业率取最近三月(月度表,最新月偶有空点)。"""

CITY_KEY_SEP = "|"
"""城市键分隔(City|省码;与 mart 译名表同形)。"""

CSD_NAME_RE = r"^(?P<base>.+?) \((?P<typ>[^()]*)\), (?P<prov>[A-Za-z .]+)$"
"""CSD 成员名拆形('Surrey (CY), British Columbia' → base + 市制类型 + 省全名;双语名 base
再取 ' / ' 前的英文半)。base 里带逗号的('Thunder Bay, Unorganized')自然匹配不上任何城市键,
不用另滤。"""

CSD_TYPE_PREF = ("CV", "CY", "C", "V", "RGM", "SM", "T", "MU", "VL", "DM")
"""同省同名多个 CSD 时的市制优先序(城 > 镇 > 区):Langley 城(CY)与 Langley 乡(DM)、
North Vancouver 城与区、Hamilton 城(C)与乡镇(TP)、Moncton/Bathurst 城(C)与堂区(P)同名 ——
取排前的;优先序里都没有或同级撞名 = 歧义整城丢弃(打 ⚠ 不猜)。首跑实撞补 C(安省/NB 的
「City」在这张表缩写 C 不是 CY)。"""

CSD_BILINGUAL_SEP = " / "
"""双语 CSD 名分隔('Greater Sudbury / Grand Sudbury')。"""

OUT_CITY_MACRO = paths.STATCAN / "city_macro.json"
"""段6 输出:一城一行(population/popPeriod/unempRate/unempPeriod/cma;官方没有 = null,
不折 0)。消费端 = mart 段9 维度装配并进 cities 表。"""

CITY_MACRO_SRC = (
    "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501",
    "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410045901",
)
"""两张表的官方页(落盘 source;URL→数据→SQL 铁律的 URL 一环)。"""

CITY_CMA = {
    # ── 大多伦多(Toronto CMA)──
    "Toronto|ON": "Toronto, Ontario", "Mississauga|ON": "Toronto, Ontario",
    "Brampton|ON": "Toronto, Ontario", "Markham|ON": "Toronto, Ontario",
    "Vaughan|ON": "Toronto, Ontario", "Richmond Hill|ON": "Toronto, Ontario",
    "Oakville|ON": "Toronto, Ontario", "Milton|ON": "Toronto, Ontario",
    "Pickering|ON": "Toronto, Ontario", "Ajax|ON": "Toronto, Ontario",
    "Newmarket|ON": "Toronto, Ontario", "Aurora|ON": "Toronto, Ontario",
    "Caledon|ON": "Toronto, Ontario", "Halton Hills|ON": "Toronto, Ontario",
    "Stouffville|ON": "Toronto, Ontario", "Georgetown|ON": "Toronto, Ontario",
    "Bolton|ON": "Toronto, Ontario",
    "Scarborough|ON": "Toronto, Ontario", "North York|ON": "Toronto, Ontario",
    "Etobicoke|ON": "Toronto, Ontario", "East York|ON": "Toronto, Ontario",
    "York|ON": "Toronto, Ontario", "Thornhill|ON": "Toronto, Ontario",
    "Concord|ON": "Toronto, Ontario", "Woodbridge|ON": "Toronto, Ontario",
    "Maple|ON": "Toronto, Ontario",
    # ── 安省其余 CMA ──
    "Oshawa|ON": "Oshawa, Ontario", "Whitby|ON": "Oshawa, Ontario",
    "Hamilton|ON": "Hamilton, Ontario", "Burlington|ON": "Hamilton, Ontario",
    "Stoney Creek|ON": "Hamilton, Ontario",
    "Kitchener|ON": "Kitchener-Cambridge-Waterloo, Ontario",
    "Waterloo|ON": "Kitchener-Cambridge-Waterloo, Ontario",
    "Cambridge|ON": "Kitchener-Cambridge-Waterloo, Ontario",
    "St. Catharines|ON": "St. Catharines-Niagara, Ontario",
    "Niagara Falls|ON": "St. Catharines-Niagara, Ontario",
    "Welland|ON": "St. Catharines-Niagara, Ontario",
    "Niagara-on-the-Lake|ON": "St. Catharines-Niagara, Ontario",
    "London|ON": "London, Ontario", "Windsor|ON": "Windsor, Ontario",
    "Guelph|ON": "Guelph, Ontario", "Brantford|ON": "Brantford, Ontario",
    "Kingston|ON": "Kingston, Ontario", "Peterborough|ON": "Peterborough, Ontario",
    "Barrie|ON": "Barrie, Ontario", "Belleville|ON": "Belleville - Quinte West, Ontario",
    "Greater Sudbury|ON": "Greater Sudbury, Ontario", "Sudbury|ON": "Greater Sudbury, Ontario",
    "Thunder Bay|ON": "Thunder Bay, Ontario",
    "Ottawa|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    "Nepean|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    "Kanata|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    "Orléans|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    "Gloucester|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    "Stittsville|ON": "Ottawa-Gatineau, Ontario part, Ontario/Quebec",
    # ── 魁省 ──
    "Gatineau|QC": "Ottawa-Gatineau, Quebec part, Ontario/Quebec",
    "Montréal|QC": "Montréal, Quebec", "Laval|QC": "Montréal, Quebec",
    "Longueuil|QC": "Montréal, Quebec", "Brossard|QC": "Montréal, Quebec",
    "Terrebonne|QC": "Montréal, Quebec", "Repentigny|QC": "Montréal, Quebec",
    "Dorval|QC": "Montréal, Quebec", "Pointe-Claire|QC": "Montréal, Quebec",
    "Westmount|QC": "Montréal, Quebec", "Mont-Royal|QC": "Montréal, Quebec",
    "Outremont|QC": "Montréal, Quebec", "LaSalle|QC": "Montréal, Quebec",
    "Lachine|QC": "Montréal, Quebec", "Saint-Laurent|QC": "Montréal, Quebec",
    "Saint-Léonard|QC": "Montréal, Quebec", "Anjou|QC": "Montréal, Quebec",
    "Côte-Saint-Luc|QC": "Montréal, Quebec", "Cote-Saint-Luc|QC": "Montréal, Quebec",
    "Hampstead|QC": "Montréal, Quebec", "Boucherville|QC": "Montréal, Quebec",
    "Saint-Hubert|QC": "Montréal, Quebec", "Sainte-Julie|QC": "Montréal, Quebec",
    "La Prairie|QC": "Montréal, Quebec", "Vaudreuil-Dorion|QC": "Montréal, Quebec",
    "Mirabel|QC": "Montréal, Quebec", "Blainville|QC": "Montréal, Quebec",
    "Boisbriand|QC": "Montréal, Quebec", "Mascouche|QC": "Montréal, Quebec",
    "Saint-Eustache|QC": "Montréal, Quebec", "Beloeil|QC": "Montréal, Quebec",
    "Saint-Bruno-de-Montarville|QC": "Montréal, Quebec",
    "Pointe-aux-Trembles|QC": "Montréal, Quebec",
    "Québec|QC": "Québec, Quebec", "Quebec City|QC": "Québec, Quebec",
    "Lévis|QC": "Québec, Quebec", "L'Ancienne-Lorette|QC": "Québec, Quebec",
    "Saint-Augustin-de-Desmaures|QC": "Québec, Quebec",
    "Sherbrooke|QC": "Sherbrooke, Quebec", "Magog|QC": "Sherbrooke, Quebec",
    "Trois-Rivières|QC": "Trois-Rivières, Quebec", "Bécancour|QC": "Trois-Rivières, Quebec",
    "Saguenay|QC": "Saguenay, Quebec", "Chicoutimi|QC": "Saguenay, Quebec",
    "Jonquière|QC": "Saguenay, Quebec", "Drummondville|QC": "Drummondville, Québec",
    # ── 草原三省 ──
    "Winnipeg|MB": "Winnipeg, Manitoba", "Rosser|MB": "Winnipeg, Manitoba",
    "Regina|SK": "Regina, Saskatchewan", "Saskatoon|SK": "Saskatoon, Saskatchewan",
    "Calgary|AB": "Calgary, Alberta", "Airdrie|AB": "Calgary, Alberta",
    "Chestermere|AB": "Calgary, Alberta", "Rocky View|AB": "Calgary, Alberta",
    "Edmonton|AB": "Edmonton, Alberta", "St. Albert|AB": "Edmonton, Alberta",
    "Sherwood Park|AB": "Edmonton, Alberta", "Spruce Grove|AB": "Edmonton, Alberta",
    "Leduc|AB": "Edmonton, Alberta", "Nisku|AB": "Edmonton, Alberta",
    "Lethbridge|AB": "Lethbridge, Alberta", "Red Deer|AB": "Red Deer, Alberta",
    # ── BC ──
    "Vancouver|BC": "Vancouver, British Columbia", "Surrey|BC": "Vancouver, British Columbia",
    "Burnaby|BC": "Vancouver, British Columbia", "Richmond|BC": "Vancouver, British Columbia",
    "Coquitlam|BC": "Vancouver, British Columbia",
    "Port Coquitlam|BC": "Vancouver, British Columbia",
    "Langley|BC": "Vancouver, British Columbia", "Aldergrove|BC": "Vancouver, British Columbia",
    "Delta|BC": "Vancouver, British Columbia",
    "North Vancouver|BC": "Vancouver, British Columbia",
    "West Vancouver|BC": "Vancouver, British Columbia",
    "New Westminster|BC": "Vancouver, British Columbia",
    "Maple Ridge|BC": "Vancouver, British Columbia",
    "Pitt Meadows|BC": "Vancouver, British Columbia",
    "Port Moody|BC": "Vancouver, British Columbia",
    "White Rock|BC": "Vancouver, British Columbia",
    "Abbotsford|BC": "Abbotsford-Mission, British Columbia",
    "Mission|BC": "Abbotsford-Mission, British Columbia",
    "Kelowna|BC": "Kelowna, British Columbia", "West Kelowna|BC": "Kelowna, British Columbia",
    "Kamloops|BC": "Kamloops, British Columbia", "Chilliwack|BC": "Chilliwack, British Columbia",
    "Nanaimo|BC": "Nanaimo, British Columbia",
    "Victoria|BC": "Victoria, British Columbia", "Saanich|BC": "Victoria, British Columbia",
    "Saanichton|BC": "Victoria, British Columbia", "Langford|BC": "Victoria, British Columbia",
    "Sidney|BC": "Victoria, British Columbia", "Esquimalt|BC": "Victoria, British Columbia",
    # ── 大西洋四省 ──
    "Halifax|NS": "Halifax, Nova Scotia", "Dartmouth|NS": "Halifax, Nova Scotia",
    "Bedford|NS": "Halifax, Nova Scotia", "Lower Sackville|NS": "Halifax, Nova Scotia",
    "Moncton|NB": "Moncton, New Brunswick", "Dieppe|NB": "Moncton, New Brunswick",
    "Saint John|NB": "Saint John, New Brunswick", "Fredericton|NB": "Fredericton, New Brunswick",
    "St. John's|NL": "St. John's, Newfoundland and Labrador",
    "Mount Pearl|NL": "St. John's, Newfoundland and Labrador",
}
"""城市 → 所在 CMA 的 Geography 成员名(14100459 逐字)。人工核定表(机制照译名表 #151:
只收拿得准的 2021 普查 CMA 构成,拿不准不收显空;多伦多市内社区/自治市并 Toronto CMA,
渥太华社区并 Ottawa-Gatineau 安省半)。2026-09-11 lead 逐键核定。"""

CITY_POP_EXTRA = (
    "Fort McMurray|AB", "Grande Prairie|AB", "Medicine Hat|AB", "Cold Lake|AB", "Canmore|AB",
    "Banff|AB", "Okotoks|AB",
    "Moose Jaw|SK", "Prince Albert|SK", "Swift Current|SK", "Yorkton|SK", "North Battleford|SK",
    "Estevan|SK", "Weyburn|SK",
    "Brandon|MB", "Steinbach|MB", "Altona|MB",
    "Sault Ste. Marie|ON", "North Bay|ON", "Timmins|ON", "Cornwall|ON", "Sarnia|ON",
    "Woodstock|ON", "Stratford|ON", "Collingwood|ON", "Orillia|ON", "Leamington|ON",
    "Orangeville|ON",
    "Prince George|BC", "Vernon|BC", "Penticton|BC", "Squamish|BC", "Whistler|BC",
    "Courtenay|BC", "Campbell River|BC", "Duncan|BC", "Fernie|BC", "Cranbrook|BC",
    "Revelstoke|BC", "Prince Rupert|BC", "Fort St. John|BC", "Dawson Creek|BC",
    "Williams Lake|BC", "Terrace|BC", "Golden|BC", "Parksville|BC", "Port Alberni|BC",
    "Rimouski|QC", "Granby|QC", "Victoriaville|QC", "Val-d'Or|QC", "Rouyn-Noranda|QC",
    "Sept-Îles|QC", "Shawinigan|QC", "Joliette|QC", "Saint-Georges|QC", "Saint-Hyacinthe|QC",
    "Saint-Jean-sur-Richelieu|QC", "Salaberry-de-Valleyfield|QC", "Alma|QC", "Baie-Comeau|QC",
    "Thetford Mines|QC", "Matane|QC", "Saint-Jérôme|QC", "Montmagny|QC",
    "Truro|NS", "Summerside|PE", "Charlottetown|PE", "Corner Brook|NL", "Gander|NL",
    "Bathurst|NB", "Miramichi|NB",
)
"""CMA 外还要人口的城市(试点社区 + 职位板长尾大城;失业率无 CMA 口径留空)。
CSD 表里没有同名条目的(如 Fort McMurray 归 Wood Buffalo 特设市)自然落空,不做别名映射 ——
拿不准不编(#151 同判)。"""

CITY_POP_PROBE_CITY = "Toronto|ON"
"""人口自校抽样键。"""

CITY_POP_PROBE_MIN = 2_000_000
"""多伦多市人口量级线(2021 普查 279 万;低于 200 万 = 坐标错位/表改版)。"""

CITY_UNEMP_PROBE_CMA = "Toronto, Ontario"
"""失业率自校抽样 CMA。"""

CITY_UNEMP_PROBE_MIN = 2.0
"""失业率下限(百分点;低于 2 = 疑似取错格)。"""

CITY_UNEMP_PROBE_MAX = 25.0
"""失业率上限(高于 25 = 疑似取错格)。"""

CITY_PRINT_OUT_TPL = "OUT={path}"
"""段6 开工报输出。"""

CITY_DONE_TPL = "✓ city_macro: {rows} 城(人口 {pops} 城 / 失业率 {unemps} 城,CMA {cmas} 个)→ {out}"
"""段6 收尾报数。"""

CITY_AMBIG_TPL = "  ⚠ CSD 同名歧义丢弃: {key}"
"""同省同名多个 CSD(不猜哪个,整城留空)。"""

CITY_PROBE_FAIL_TPL = "city_macro 自校未过: {what}={value}"
"""段6 自校报错。"""

K_CITY_ROWS = "rows"
"""city_macro 落盘键:行清单。"""

K_CITY = "city"
"""行键:城市英文名。"""

K_PROVINCE = "province"
"""行键:两位省码。"""

K_POP_VAL = "population"
"""行键:CSD 人口(官方没有 = null)。"""

K_POP_PERIOD = "popPeriod"
"""行键:人口的期标(refPer)。"""

K_UNEMP_RATE = "unempRate"
"""行键:所在 CMA 失业率(百分点;不在 CMA = null)。"""

K_UNEMP_PERIOD = "unempPeriod"
"""行键:失业率的期标(refPer,月)。"""

K_CMA = "cma"
"""行键:所在 CMA 成员名(有失业率才有)。"""

K_PIDS = "pids"
"""city_macro 落盘键:两张表号。"""
