"""
mart/rank 子域常量 —— 抽选页排名表的词汇(与 functions.py 同名同序镜像;方言同 mart/constants.py:
每个常量赋值后裸字符串 docstring,决策记录连人带日期原样折进所属常量)。

唯一特批 import = `re`。上游 mart 行的键名在这里自抄一份(依赖单向:mart → 本子域,本子域不取 mart 共用段)。

@author Frank
@time 2026-10-12 16:40:00
"""
import re

# =========================================================================
# 1. 上游行的键与值(抽选 / 运营统计 / 通道 / 宏观序列;键名照 mart 行原样)
# =========================================================================

K_PROVINCE = "province"
"""省码键(抽选 / 运营统计 / 通道三表同名;联邦 = FED)。"""

K_KIND = "kind"
"""抽选行的类型键(draw 抽选 / notice 改制通告)。"""

K_DRAW_DATE = "drawDate"
"""抽选日期键(ISO 到日;NS 按月公布只到月 `2026-07`)。"""

K_STREAM = "stream"
"""抽选流名键(官方原文;联邦 = 带版本号的类别全名)。"""

K_STREAM_ZH = "streamZh"
"""抽选流名中文灰注键(没挂上通道的抽选流取它当卡片中文名的兜底)。"""

K_INVITATIONS = "invitations"
"""邀请人数键(None = 官方这期没公布)。"""

K_LABEL = "label"
"""项目名键(省 = AAIP 这类;联邦 = EE 类别英文键 trade / cec / pnp …)。"""

K_UNIT = "unit"
"""人数口径键(invitation 邀请 / selection 入选的人 / application 入选的申请)。"""

K_SCALE = "scale"
"""分制键(WEOI / SIRS / CRS …)。"""

K_METRIC = "metric"
"""运营统计的指标键。"""

K_SCOPE_KIND = "scopeKind"
"""运营统计的口径层级键('' = 全省;stream = 通道级)。"""

K_STREAM_KEY = "streamKey"
"""运营统计通道级行的通道键(小写官方名;对通道表的 quotaKey)。"""

K_PERIOD = "period"
"""运营统计 / 宏观序列的统计期键(年 `2026` / 季 `2026Q3` / 月段 `2026 Jan-Aug`)。"""

K_AS_OF = "asOf"
"""运营统计的截至日键。"""

K_VALUE = "value"
"""数值键(None = 官方没给数)。"""

K_KEY = "key"
"""通道稳定键 / 宏观序列指标键(两表同名)。"""

K_OFFICIAL_NAME = "officialName"
"""通道官方英文名键。"""

K_PLAIN_ZH = "plainZh"
"""通道中文白话名键(带省码前缀「AB 机会通道」;卡片左边已有省码胶囊,出卡时剥掉)。"""

K_PLAIN_KO = "plainKo"
"""通道韩文白话名键(同上带省码前缀)。"""

K_DRAW_STREAMS = "drawStreams"
"""通道挂的抽选流名清单键(照抄抽选行 stream 原值;空 = 这条通道不经抽选)。"""

K_QUOTA_KEY = "quotaKey"
"""通道对运营统计通道级行的键(= streamKey;None = 官方没分通道公布)。"""

K_STATUS = "status"
"""通道状态键(closed = 已关,不出卡)。"""

K_GEO = "geo"
"""宏观序列的地域键(CA = 全国)。"""

KIND_DRAW = "draw"
"""抽选行的「抽选」类型值(改制通告不进统计)。"""

PROV_FED = "FED"
"""联邦的省码值。"""

EE_LABEL_PNP = "pnp"
"""联邦「省提名专场」的类别键:只有已拿省提名的人能进,不是一条能直接申请的通道,
人数在省那边已算过一次(2026-10-12 Frank「去掉」)—— 不出节奏卡;配额卡的联邦今年邀请照算(联邦邀请总数)。"""

PATHWAY_CLOSED = "closed"
"""通道状态「已关」的值。"""

METRIC_ALLOCATION = "allocation"
"""运营统计:年度配额(提名证书个数)。"""

METRIC_ISSUED = "issued"
"""运营统计:已发提名(AB 官方按日更新)。"""

METRIC_NOMINATIONS_YTD = "nominations_ytd"
"""运营统计:今年已发提名(MB 按月 / SK 按季 / NS 按半年)。"""

SCOPE_PROVINCE = ""
"""运营统计口径:全省(scopeKind 空)。"""

SCOPE_STREAM = "stream"
"""运营统计口径:通道级。"""

MACRO_EE_TARGET = "eeTarget"
"""宏观序列:IRCC 移民水平计划的联邦 EE(Federal High Skilled)永居目标(人头含随行家属,不是提名证书个数)。"""

GEO_CA = "CA"
"""宏观序列的全国地域值。"""

UNIT_INVITATION = "invitation"
"""人数口径:邀请(默认)。"""

# =========================================================================
# 2. 抽选节奏卡(一条通道一张)
# =========================================================================

DATE_FULL_LEN = 10
"""到日的 ISO 日期长度(只到月的 NS 行不进间隔 / 距今统计)。"""

YEAR_LEN = 4
"""年份前缀长度(今年 = 抽选日期 / 统计期以今年开头)。"""

PLAIN_PREFIX_TPL = "{prov} "
"""通道白话名的省码前缀(出卡时剥掉)。"""

FAMILY_TAIL_RE = re.compile(r"\s*\([^)]*\)\s*$")
"""没挂上通道的抽选流按「流名族」合卡:剥掉末尾括号(AB「… Priority Sectors (Aviation)」「… (Agriculture)」同族)。"""

ORPHAN_KEY_TPL = "{prov}:{family}"
"""没挂上通道的那族抽选的卡片键(省码 + 流名族,稳定)。"""

ORPHAN_NAMES = {
    "Alberta Express Entry Stream – Priority Sectors": ("行业优先抽选", "산업 우선 선발"),
}
"""没挂上通道的抽选流名族 → (中文, 韩文) 卡名。2026-10-12:通道表没登 AB 的 Alberta Express Entry Stream 本身,
它名下按行业定向的抽选(航空 / 农业 / 建筑 / 制造 / 医疗 / 综合)挂不上任何通道,合一张卡。
表外的族:中文取最近一期抽选行的 streamZh,韩文留空(前端只出英文)。"""

ORPHAN_CLOSED = {
    ("ON", "Employer Job Offer: In-Demand Skills stream"),
    ("ON", "Masters Graduate stream"),
    ("ON", "PhD Graduate stream"),
}
"""没登进通道表、但官网已关停的抽选流(省码, 流名族)—— 不出节奏卡(2026-10-12 Frank「ON 硕士和博士通道 不都关闭了吗」)。
举证(三页都在 crawl 缓存 on-oinp,标题前缀「Archived -」,原句同一句):
  https://www.ontario.ca/page/oinp-employer-job-offer-demand-skills-stream
  https://www.ontario.ca/page/oinp-masters-graduate-stream
  https://www.ontario.ca/page/oinp-phd-graduate-stream
  「Please note that this stream was closed as of May 30, 2026, as part of the OINP redesign.」
登进了通道表的已关通道(ON 海外工人 / 国际学生)走通道表的 status = closed,不用进这张表。"""

ORPHAN_HIDDEN = {
    ("AB", "Alberta Opportunity Stream – Priority Sectors"),
}
"""没登进通道表、官网也没写关停,但不出节奏卡的抽选流(省码, 流名族)—— 与 ORPHAN_CLOSED 分开放,那张只装有官方关停原句的。
2026-10-12 Frank「去掉吧」:AB 机会通道的行业优先抽选全年只在 2026-02-20 抽过一次,看着是一次性定向抽选,不当一条通道排名。"""

EE_KEY_TPL = "ee-{label}"
"""联邦类别卡的卡片键。"""

EE_NAME_EN = {
    "trade": "Trade occupations",
    "cec": "Canadian Experience Class",
    "senior-managers": "Senior managers with Canadian work experience",
    "healthcare": "Healthcare and social services occupations",
    "physicians": "Physicians with Canadian work experience",
    "french": "French-language proficiency",
    "transport": "Transport occupations",
    "military": "Skilled military recruits",
    "education": "Education occupations",
    "stem": "STEM occupations",
    "researchers": "Researchers with Canadian work experience",
    "agriculture": "Agriculture and agri-food occupations",
    "fsw": "Federal Skilled Worker Program",
    "fst": "Federal Skilled Trades Program",
    "general": "No program specified",
}
"""联邦 EE 类别键 → IRCC 官方英文类别名(去版本号;抽选行 stream 带「2026-Version 3」这类后缀)。
中 / 韩名前端按类别键查 i18n 的 ee.* 词条,数据层不另存。表外的键:英文取最近一期的流名族。"""

STATUS_OK = "ok"
"""节奏状态:正常。"""

STATUS_LATE = "late"
"""节奏状态:比平常晚(距今超过平均间隔 1.5 倍,且至少晚出 7 天)。"""

STATUS_IDLE = "idle"
"""节奏状态:久未抽选(距今超过平均间隔 3 倍,且至少晚出 7 天)。"""

LATE_MIN_DAYS = 7
"""比平均间隔至少多晚几天才算晚(2026-10-12 Frank 看 AB 平均 3 天、距今 5 天被标「比平常晚」后定:晚两天不算)。"""

LATE_RATIO = 1.5
"""距今超过平均间隔的几倍算「比平常晚」。"""

IDLE_RATIO = 3
"""距今超过平均间隔的几倍算「久未抽选」。"""

GAP_FALLBACK_DAYS = 90
"""只抽过一期(算不出间隔)时判状态 / 打频率分用的假定间隔(季度一抽)。"""

# =========================================================================
# 3. 综合排名(两种卡各排各的)
# =========================================================================

CAD_W_INV = 0.4
"""节奏卡权重:今年邀请人数(分位;2026-10-12 Frank「这个邀请这么多 不应该往前排名吗」—— 邀请人数权重最高)。"""

CAD_W_COUNT = 0.2
"""节奏卡权重:今年抽选次数(分位;2026-10-12 Frank「抽选次数 和 人数,也要用于排名判断」)。"""

CAD_W_FREQ = 0.2
"""节奏卡权重:抽选频率(1 / 平均间隔,分位)。"""

CAD_W_ACT = 0.2
"""节奏卡权重:还在不在抽(按状态取 ACT_BY_STATUS)。"""

ACT_BY_STATUS = {STATUS_OK: 1.0, STATUS_LATE: 0.5, STATUS_IDLE: 0.1}
"""状态 → 活跃分。"""

ACT_MONTH_ONLY = 0.5
"""日期只到月(NS)的卡的活跃分:算不出距今,给中间值。"""

QUOTA_W_INV = 0.4
"""配额卡权重:今年邀请人数(分位;缺数记 0)。"""

QUOTA_W_ALLOC = 0.4
"""配额卡权重:2026 配额(分位;缺数记 0)。"""

QUOTA_W_ACT = 0.2
"""配额卡权重:最近一次抽选距今(30 天内 1 / 90 天内 0.5 / 更久 0.1 / 今年没抽过 0)。"""

QUOTA_FRESH_DAYS = 30
"""配额卡活跃分满分的距今上限。"""

QUOTA_STALE_DAYS = 90
"""配额卡活跃分半分的距今上限。"""

QUOTA_ACT_FRESH = 1.0
"""配额卡活跃分:30 天内抽过。"""

QUOTA_ACT_STALE = 0.5
"""配额卡活跃分:90 天内抽过。"""

QUOTA_ACT_OLD = 0.1
"""配额卡活跃分:更久以前。"""

QUOTA_ACT_NONE = 0.0
"""配额卡活跃分:库里没有它到日的抽选。"""

SCORE_DIGITS = 4
"""综合分落盘保留几位小数。"""

# =========================================================================
# 4. 配额卡(联邦 + 各省一张)
# =========================================================================

CARD_QUOTA = "quota"
"""卡种:配额卡。"""

CARD_CADENCE = "cadence"
"""卡种:抽选节奏卡。"""

ALLOC_QUOTA = "quota"
"""配额口径:省年度配额(提名证书个数)。"""

ALLOC_PR_TARGET = "prTarget"
"""配额口径:联邦永居目标(人头含随行家属;2026-10-12 Frank 问「邀请和提名 是一回事吗」后定 —— 格名写「2026 永居目标」,不叫配额)。"""
