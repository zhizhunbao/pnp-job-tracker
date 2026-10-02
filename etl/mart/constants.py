"""
mart 域常量 —— 域词汇表(评分割点 / 档位割点 / 红旗词表 / 27 张 mart 表的输入输出路径 +
JSON 边界键词族 K_*;照 pnp 三件套样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
特批 import 三个:`re`(正则字面量)、`paths`(IN/OUT 路径唯一真相)、`datetime.date`
(COVERAGE_COMPLETE 是一个日历事实,写成三元组再到 functions 里拼反而把常量拆成两处)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除 `to_*` 行构造器内的 JSON 键、空串、语法位外,一切字面量住这;
文案模板一律 *_TPL,官方原句/口径注一律 *_NOTE。
"""
import re
from datetime import date

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:读盘 / 归一 / 落盘 / 报数的公共件 + 通用 K_* 键词族)
# =========================================================================

ENC_UTF8 = "utf-8"
"""文本读写的统一编码。"""

ERRORS_REPLACE = "replace"
"""读外来文本的容错模式:坏字节替换不炸(JD 的 .md 抓自各家页面,编码不齐)。"""

INDENT_2 = 2
"""mart/processed 全表的落盘缩进(既有惯例,diff 可读)。"""

GLOB_JSON = "*.json"
"""目录驱动扫表的样式(raw/pnp/*.json:加新省=丢一个 json,汇装点不改代码)。"""

GLOB_MD = "*.md"
"""JD 正文缓存的文件样式。"""

NL = "\n"
"""换行符(JD 逐行清洗 + duties/requirements 拼接)。"""

PARA_SEP = "\n\n"
"""段分隔(JD 空行折叠的目标形 + 新闻正文分段)。"""

SPACE = " "
"""空格(压平空白的目标形)。"""

COMMA = ","
"""逗号(appliesTeer / nocs 这类「Payload 没有数组列,存成文本」的分隔符)。"""

COLON = ":"
"""冒号(externalId 前缀分隔 + 官方标签尾巴的剥除字符)。"""

SLASH = "/"
"""斜杠(一个 NOC 命中多个 EE 类别时的标签连接 + 省份集合展示)。"""

PLUS = "+"
"""加号(双身份试点社区 'RCIP+FCIP' 的连接 + 「某分起及以上」的归一记号)。"""

SEP_ZH = "、"
"""中文顿号(通道名/省份/城市清单的连接;全站禁「·」「/」杂糅,枚举一律顿号)。"""

EM_DASH = "—"
"""破折号:公司名缺失时的占位、来源标签兜底(「没有」不是空串)。"""

HYPHEN = "-"
"""连字符(官方分数格里各种横线的归一目标)。"""

EN_DASH = "–"
"""半角破折号(官方页里的区间横线之一,归一成 HYPHEN)。"""

UNDERSCORE = "_"
"""下划线(语言表列头压成 snake 的连接字符)。"""

PAREN_OPEN = "("
"""左括号(语言表列头判「per ability」时先剥括号)。"""

PAREN_CLOSE = ")"
"""右括号(同上)。"""

ALL = "all"
"""汇总行的哨兵值:stats 的 broad/mid、stats_occupation 的 province、流量桶的省位。"""

EMPTY_VALUES = (None, "")
"""岗位行「不落列」的判据:None 与空串才算空 —— False/0 是事实,要留。"""

SLUG_APOSTROPHE_RE = re.compile(r"['’]")
"""slug 化前先整个删掉的撇号(直、弯两种)。2026-09-06 Frank「怎么有两个」:「Tim Horton's」slug 成
tim-horton-s、与「Tim Hortons」的 tim-hortons 各成一家(生产库 56 组只差撇号的同名公司);删撇号再压连字符,
两种写法落同一 slug 同一家。⚠️ 带撇号的 2,511 家公司 slug 随之变(domino-s → dominos),旧 /companies/ URL 不再命中,
只影响公司页不影响职位页(职位页靠 external_id)。"""

SLUG_RE = re.compile(r"[^a-z0-9]+")
"""slug 化:非字母数字压成连字符(撇号已在前一步删掉)。"""

SLUG_DASH = "-"
"""slug 的连接字符(也是首尾修剪的字符)。"""

SLUG_MAX = 60
"""slug 截断长度(URL 段上限)。"""

SLUG_FALLBACK = "company"
"""slug 压空后的兜底(公司名全是符号时)。"""

SLUG_UNKNOWN = "unknown"
"""雇主名缺失时进 slugify 的占位。"""

NORM_RE = re.compile(r"[^a-z0-9]")
"""标题归一:只留小写字母数字(展示去重键 `company-slug|title` 的第二段)。"""

ON_RE = re.compile(r"\b(on|ontario)\b", re.I)
"""地点文本里的安省判据(明写才认,宁可留空不猜)。"""

ISO_PREFIX_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")
"""已是 ISO 日期的判据(原样截十位)。"""

DATE_FMT_LONG = "%B %d, %Y"
"""Job Bank 展示格式(「June 26, 2026」)。"""

DATE_FMT_ISO = "%Y-%m-%d"
"""ISO 日期格式。"""

DATE_FMTS = (DATE_FMT_LONG, DATE_FMT_ISO)
"""postings.json 的 date 字段两种形态(与验尸件同一套解法,顺序即尝试序)。"""

DATE_LEN = 10
"""ISO 日期的长度(带时区的时间戳只取日期部分)。"""

WEBSITE_HOST_RE = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$")
"""官网主机名的形状:点分多段、每段字母数字连字符、末段纯字母 ≥2(website_of 的判据;
2026-09-08 Frank「修」:来源侧把邮箱当网址填进 href(http://info@alfiri.com)、多斜杠(http:///www.x.ca)、
尾点(https://x.com.)、字黏尾(krg.cafax 过不了这条 —— 靠 jobbank 侧正则挡)全归这一道跨源闸)。"""

WEBSITE_SCHEMES = ("http", "https")
"""官网只认这两种协议(mailto: / ftp: / 裸串一律不算)。"""

URL_SCHEME_SEP = "://"
"""协议与主机之间的分隔(website_of 重拼 URL 用)。"""

URL_QUERY_SEP = "?"
"""路径与查询串之间的分隔。"""

HOST_AT_MARK = "@"
"""主机名里出现 @ = 雇主把邮箱填进了网址栏。"""

HOST_PORT_SEP = ":"
"""主机名里出现 : = 带端口,官网不该有。"""

HOST_TAIL_DOT = "."
"""主机名尾点(https://x.com. 这种句末点混进来的)去掉再判。"""

TLD_CC_LEN = 2
"""两字母末段一律当国家域放行(ca / us / fr / de…,不逐个列)。"""

WEBSITE_TLDS = frozenset((
    "com", "net", "org", "edu", "gov", "info", "biz", "coop", "mobi", "pro", "aero", "app", "site", "online",
    "store", "shop", "tech", "cloud", "club", "bar", "pub", "farm", "vet", "care", "health", "healthcare",
    "catering", "events", "games", "life", "live", "work", "one", "space", "earth", "eco", "green", "guru",
    "ink", "buzz", "ltd", "inc", "group", "agency", "auto", "autos", "homes", "realestate", "engineering",
    "software", "solutions", "quebec", "dev", "xyz", "clinic", "dental", "restaurant", "cafe", "pizza", "law",
    "design", "studio", "photography", "travel", "hotel", "consulting", "services", "education", "academy",
    "school", "church", "ngo", "foundation", "network", "systems", "digital", "media", "marketing", "energy",
    "construction", "plumbing", "io", "ai", "co", "me", "tv", "cc", "crs", "company",
))
"""三字母以上末段的放行表(真顶级域;2026-09-08 Frank「修」:companies 13,599 个官网里末段 127 种,
三字母以上的一半是邮箱域黏了后面的字 —— cawe / cafax / cathe / comby / caapplications / cadeadline…,
这些永远不在表里;表照 2026-09-08 现场真出现过的合法域 + 常见 gTLD 列,漏的宁可留空)。"""

WS_RE = re.compile(r"\s+")
"""连续空白(压平成一个空格 / 数值化前整段清空)。"""

TABLE_FILE_TPL = "{table}.json"
"""mart 表的落盘文件名(表名 = 文件名 = DB 表名)。"""

TABLE_COUNT_TPL = "  {table} {n} 行"
"""收尾逐表报行数(etl 版四道闸地基:行数异常当场看得见)。"""

TABLE_NAME_WIDTH = 22
"""报数时表名列宽。"""

COUNT_WIDTH = 5
"""报数时行数列宽。"""

K_NOC = "noc"
"""NOC 码。"""

K_TITLE = "title"
"""标题。"""

K_NAME = "name"
"""名字(公司 / 社区 / 维度行)。"""

K_URL = "url"
"""出处地址。"""

K_FETCHED = "fetched"
"""取回日(表级)。"""

K_PROVINCE = "province"
"""省码。"""

K_CITY = "city"
"""城市。"""

K_DISTRICT = "district"
"""区(大渥太华社区这类;由 04c 从地址/邮编归一)。"""

K_LOCATION = "location"
"""地点自由文本(ATS 岗只有这一格)。"""

K_ROWS = "rows"
"""通用行清单键(各 raw 表的主体)。"""

K_TYPE = "type"
"""类型(PNP 表的 inclusion/exclusion;试点社区的 RCIP/FCIP)。"""

K_LABEL = "label"
"""官方措辞标签。"""

K_STREAM = "stream"
"""通道名。"""

K_STATUS = "status"
"""状态(岗位在招/关闭;富化结果;试点职业满额)。"""

K_SOURCE = "source"
"""原始来源板。"""

K_SCORE = "score"
"""评分。"""

K_TEER = "teer"
"""TEER 档。"""

K_BROAD = "broad"
"""职业大类(本站分类树)。"""

K_MID = "mid"
"""职业中类。"""

K_FINE = "fine"
"""职业小类。"""

K_DATE = "date"
"""日期(postings 的发布日 / 新闻发布日 / EE 一轮的抽选日)。"""

K_POOL = "pool"
"""池分布块(BC 的 SIRS 池 / ee draws.json 的 CRS 池快照清单)。
2026-09-11 从 BC 段搬来段1:第二个消费者(EE 池存量)进来后它就是共用键词了。"""

K_VALUE = "value"
"""官方给的数值。"""

K_UNIT = "unit"
"""单位(不换算,官方发什么记什么)。"""

K_SECTION = "section"
"""官方小标题。"""

K_YEAR = "year"
"""年份。"""

K_QUARTER = "quarter"
"""季度('YYYYQN')。"""

K_QUARTERS = "quarters"
"""季度清单/逐季明细(LMIA 雇主记录 与 JVWS 表级两处同名同义)。"""

K_OCCUPATIONS = "occupations"
"""职业清单。"""

K_EMPLOYERS = "employers"
"""雇主表。"""

K_DEAD = "dead"
"""验尸判死台账(posting_id → 判死时刻)。"""

K_POSTING_ID = "posting_id"
"""Job Bank 帖号。"""

K_EMPLOYER = "employer"
"""雇主名(postings 侧的列名)。"""

K_SLUG = "slug"
"""公司 slug。"""

K_EXTERNAL_ID = "externalId"
"""外部 ID(loader 的 join 键)。"""

PRINT_INOUT_COMPANIES_TPL = "IN/OUT companies : {dir}"
"""跨源清洗三段(地点/薪资/试点)起手的「ATS 公司档原地清洗」路径行 —— 三段里两段用它,
逐字沿用原 clean/04c/04d 的对齐空格。2026-08-31 批J 收进本段(≥2 段消费的判据)。"""

PRINT_INOUT_JOBBANK_TPL = "IN/OUT job bank  : {out}"
"""同上,Job Bank 累积 store 原地清洗的路径行(地点/薪资/试点三段全用)。"""

# =========================================================================
# 2. 档位库:职位三维档(E12-08,2026-07-20 Frank 拍板)
# =========================================================================

GRADE_1 = 1
"""最低档。"""

GRADE_2 = 2
"""次低档。"""

GRADE_3 = 3
"""中档。"""

GRADE_4 = 4
"""次高档。"""

GRADE_5 = 5
"""最高档。全维度 1-5,**不加权不合成**(Frank「权重怎么算都不合理,所有维度按 1-5」);
缺数返 None=该维不评(拆解层灰显,禁硬算)。割点=implementation/E12-移民路径引擎/08 附表(已批「按推荐」)。
jsonb 只存 {g: 档, v: 原始值};依据句由前端按 维度×档 走 i18n 三语生成(数据层不存文案)。"""

K_G = "g"
"""档位格(jsonb 的第一格)。"""

TEER_SKILLED_MAX = 3
"""技能岗 TEER 上界(0-3 可走雇主 offer 省提名粗筛)。"""

NOC_MAJOR_LEN = 2
"""NOC 前两位 = 大分类段(紧缺判定按它)。"""

INDEMAND2 = {"21", "22", "31", "32", "72", "73", "42"}
"""PNP 优先紧缺职业(前 2 位):21/22 科技,31/32 医疗,72/73 技工运输,42 教育社区。
⚠ 与评分段的紧缺段**同源同值**:2026-08-31 批I 全溶前它是 grades.INDEMAND2 与
08_score.INDEMAND2 两份抄本(原注「两处同改」),溶进同一文件后收成这一份,口径从此不可能分叉。"""

TEER_LABEL_TPL = "TEER {teer}"
"""TEER 的展示串(评分行的 category 列 + 通道档的 v 格,两处同一形)。"""

PCT_SCALE = 100
"""比率转百分数。"""

SALARY_CUTS = ((20, GRADE_5), (5, GRADE_4), (-5, GRADE_3), (-15, GRADE_2))
"""职位薪资质量割点(vs 官方中位 %,从高到低取第一个够得着的档;都够不着落 1)。"""

EMP_PERMANENT = "permanent"
"""雇佣期限:永久(命中记一分,也是 v 格里的原始值)。"""

EMP_FULL = "full"
"""工时:全职。"""

EMP_DIRECT = "direct"
"""渠道:第一方直发。"""

EMP_HITS_GRADE = {3: GRADE_5, 2: GRADE_4, 1: GRADE_2, 0: GRADE_1}
"""雇佣质量命中数 → 档(**跳 3 档**是有意的:两项与一项之间的差距比档距大;
未标注项不计入命中 —— 官方没写 ≠ 不是永久)。"""


# =========================================================================
# 3. 档位库:公司四维档(E12-08)
# =========================================================================

QUARTER_MARK = "Q"
"""季度串的分隔字母('2025Q4')。"""

QUARTER_MIN_LEN = 6
"""季度串的最短合法长度。"""

QUARTERS_PER_YEAR = 4
"""一年四季(距今季数换算)。"""

MONTHS_PER_QUARTER = 3
"""一季三月(同上)。"""

SPONSOR_RECENT_Q = 4
"""「近」的判据:4 个季度内。"""

SPONSOR_STALE_Q = 8
"""「稍旧」的判据:8 季 = ESDC 聚合窗。"""

SPONSOR_SKILLED_HIGH = 5
"""技能类获批岗位数的高档门槛。"""

ACTIVE_BUSY = 20
"""在库活跃度的高档门槛(在招岗数)。"""

ACTIVE_MID = 5
"""在库活跃度的中档门槛。"""

CO_SALARY_CUTS = ((10, GRADE_5), (3, GRADE_4), (-3, GRADE_3), (-10, GRADE_2))
"""公司薪资水平割点(该司帖面 vs 同 NOC 中位的均值 %)。"""

FAME_MULTI_PROV = 2
"""「多省」的判据。"""

FAME_BIG_OPEN = 50
"""知名度的在库规模代理门槛(割点表「累计岗」以在库岗数为代理 —— mart 无历史累计)。"""

FAME_TINY_OPEN = 1
"""「极小」的判据(在库 ≤1 且单省)。"""


# =========================================================================
# 4. 身份预筛(GAP1③,痛点 C14/C15:「no sponsorship / 须 PR」藏 JD 深处,投完才发现)
# =========================================================================

FLAG_NO_SPONSORSHIP = "no_sponsorship"
"""红旗一:雇主自述不提供 visa/work permit sponsorship。"""

FLAG_PR_REQUIRED = "pr_required"
"""红旗二:须 PR/公民(把持有工签者排除在外的硬条件)。"""

NO_SPONSOR_RES = (
    re.compile(r"\bno (?:visa |work(?: permit)? |employment |immigration )?sponsorships?\b", re.I),
    re.compile(r"\bsponsorships? (?:is |are )?not (?:available|offered|provided|possible)\b", re.I),
    re.compile(r"\b(?:unable|not able|not in a position) to (?:provide|offer|support)(?: a| any)? "
               r"(?:visa |work(?: permit)? |immigration )?sponsorships?\b", re.I),
    re.compile(r"\b(?:cannot|can ?not|will not|won'?t|do(?:es)? not|don'?t) "
               r"(?:provide|offer|support|assist with)(?: a| any)? "
               r"(?:visa |work(?: permit)? |immigration )?sponsorships?\b", re.I),
    re.compile(r"\bnot (?:currently )?sponsor(?:ing)?\b.{0,40}\b(?:visa|work permit|candidate|applicant)", re.I),
    re.compile(r"\bwithout (?:the )?need (?:for|of) sponsorships?\b", re.I),
)
"""明确不担保的六条句式(精确优先宁可漏 —— 误伤=帮雇主赶走本可投的人)。"""

PR_ONLY_RES = (
    re.compile(r"\bmust be (?:a |an )?(?:canadian )?(?:citizens?|permanent residents?)\b", re.I),
    re.compile(r"\b(?:canadian )?citizens?(?: (?:and|or) permanent residents?)? only\b", re.I),
    re.compile(r"\bpermanent residents?(?: (?:and|or) (?:canadian )?citizens?)? only\b", re.I),
    re.compile(r"\bonly (?:open to )?(?:canadian )?citizens?(?: (?:and|or) permanent residents?)?\b", re.I),
    re.compile(r"\bmust (?:hold|have|possess) (?:canadian )?(?:citizenship|permanent residen(?:ce|t status))\b", re.I),
    re.compile(r"\b(?:canadian citizenship|permanent residen(?:ce|t status)) (?:is )?(?:required|mandatory)\b", re.I),
    re.compile(r"\brestricted to (?:canadian )?citizens?(?: (?:and|or) permanent residents?)?\b", re.I),
)
"""须 PR/公民的七条句式。"""

VISA_RULES = ((NO_SPONSOR_RES, FLAG_NO_SPONSORSHIP), (PR_ONLY_RES, FLAG_PR_REQUIRED))
"""判定顺序(先「不担保」后「须 PR」;先命中先返回)。"""

SAFE_RE = re.compile(r"legally (?:eligible|entitled|able|authorized) to work|"
                     r"authoriz(?:ed|ation) to work in canada|eligible to work in canada", re.I)
"""样板句护栏:出现也不算排斥 ——「legally eligible to work in Canada」是任何有效工签都满足的
样板句,不是排斥信号,明确不匹配。"""

PR_ESCAPE_RE = re.compile(r"\b(?:or|and)\b.{0,70}?"
                          r"(?:work(?:ing)? (?:permit|holiday)|proper documentation|"
                          r"documentation that allows|valid work|open work|authoriz)", re.I | re.S)
"""PR 规则的 or 逃逸护栏(全量实测抓到的假阳性):「citizen, PR, **or** hold a valid work
permit / proper documentation / working holiday」= 不排斥工签,不标。"""

BENEFIT_RE = re.compile(r"benefit|insurance|dental|medical|pension", re.I)
"""福利条款护栏:「benefits … Canadians and Permanent Residents only」说的是福利资格不是岗位资格。"""

QUOTE_PAD = 80
"""命中处两端各扩多少字取原句。"""

QUOTE_MAX = 180
"""原句上限(citation 惯例,可核验但不灌全文)。"""

ESCAPE_WINDOW = 110
"""or 逃逸句的后视窗口。"""

BENEFIT_WINDOW = 70
"""福利条款的前视窗口。"""


# =========================================================================
# 5. 评分:省表装载与资格判定(原 08_score 上半)
# =========================================================================

IN_PNP_DIR = paths.PNP
"""各省 PNP 维护表目录 raw/pnp/*.json(每文件一省一通道,pnp 域 build_<prov> 产出)。"""

IN_EE_CATEGORIES = paths.EE / "federal-categories.json"
"""联邦 Express Entry「类别抽选」清单(全国单一源,与 PNP 是两条不同路 → 独立信号,
不混 pnpEligible)。文件无 = 不标。"""

EE_SUPERSEDED_BY = {"医疗社服": "医生"}
"""EE 类别的覆盖关系:一个职业同时在键、值两类里时只标值那一类(键被值盖住)。
2026-09-23 Frank「对于 EE 医生类,在这找医生类的工作肯定对标的是医生类啊」:医生(31100 / 31101 / 31102)官方同时列在
「医疗社服」与「医生」两类 —— 区别只在经验在哪:医疗社服类「近 3 年 12 个月,in Canada or abroad」,医生类「in Canada」
(canada.ca category-based-selection 页原句,crawl fed-ee)。本站是加拿大职位板,找医生岗的人对标医生类(最近一轮 198 分 vs 475),
岗上只标「医生」;类别清单(维度表)照官方原样两类都列。"""

NON_EE_PROV = {"QC"}
"""岗上不挂联邦 EE 类别的省:EE 三个项目官方都要求住魁省以外 —— FSW 页原句「You must plan to live outside the province of
Quebec」(canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/
federal-skilled-workers.html),CEC、FST 两页同句(同目录 canadian-experience-class.html、federal-skilled-trades.html;
crawl fed-ee 2026-09-26 复核)。魁省的 offer 拿去走 EE 就得离开魁省,岗上挂类别 = 拿假前提指路;类别维度表照官方原样列全。
2026-09-26 /fe Frank 勾(首页评估:魁省岗照挂 EE 类别 4,866 条)。"""

PROGRAM_PNP = "PNP"
"""项目码:省提名(表级默认)。"""

K_PROGRAM = "program"
"""项目码键。program=AIP 的表(如 NB 的 AIP 背书不受理清单)只作展示维度:AIP 与省提名是
两条路,混进来会让 pnpEligible 被 AIP 的规则误伤 → 装载时跳过,前端在 AIP 那一行单独判。"""

PNP_TYPE_INDEMAND = "indemand"
"""表语义一:inclusion(如 OINP)—— TEER4-5 默认不符合,只有清单内 NOC 才符合。"""

PNP_TYPE_INELIGIBLE = "ineligible"
"""表语义二:exclusion/permissive(如 AAIP)—— TEER0-5 默认都符合,清单内 NOC 不符合。"""

K_SIGNAL = "signal"
"""表键:只作参考信号的表(MB 在需职业 / 乡镇在需、NS 紧缺空缺)—— load_pnp_by_prov 跳过:不当具名通道、不进资格
(2026-09-24 Frank 批,九省通道审计)。"""

K_OVERLAY = "overlay"
"""表语义三的开关:ineligible + overlay=true(如 NB 不受理清单)= **叠加式排除** ——
不改该省默认规则(NB Skilled Worker 仍要技能岗 offer,TEER4-5 不因此放开),只是命中清单即不可。
某省没文件 = 无 TEER4-5 专门通道,只吃 TEER0-3 粗筛(留空不猜,符合「宁可留空」)。"""

PNP_TABLE_SEMANTICS = (PNP_TYPE_INDEMAND, PNP_TYPE_INELIGIBLE)
"""两种基本表语义(第三种由 overlay 开关叠加,不是独立值)。"""

K_BLOCKED = "blocked"
"""省桶格:叠加式排除的 NOC 集(命中即不可,先于一切判)。"""

K_NOCS = "nocs"
"""省桶格:该省资格 NOC 集(inclusion 并入 / exclusion 独占重置)。
⚠ 同名同义复用:指定雇主行的 nocs 列(逗号连接的申报 NOC)也是这个键。"""

K_STREAMS = "streams"
"""省桶格:具名通道清单(与资格 type 解耦 —— exclusion 省也能挂通道标签)。"""

K_CATEGORIES = "categories"
"""联邦类别清单键。"""

K_KEY = "key"
"""类别短 key(label 缺失时的兜底标签)。"""

NOC_LEN = 5
"""NOC 码位数。"""

NOC_RULES = [
    (r"data scientist|machine learning|\bml engineer|\bai engineer|data engineer", "21211"),
    (r"software engineer|\bswe\b", "21231"),
    (r"software develop|\bsde\b|full[-\s]?stack|back[-\s]?end|front[-\s]?end develop|devops|"
     r"site reliability|cloud (engineer|developer)", "21232"),
    (r"web developer|\bprogrammer\b", "21234"),
    (r"database|\bdba\b", "21223"),
    (r"cyber|security engineer|infosec", "21220"),
    (r"\bqa\b|quality assurance|\bsdet\b|test engineer", "22222"),
    (r"network engineer|it support|support (analyst|specialist)|help ?desk|desktop support", "22221"),
    (r"computer engineer|firmware|embedded|hardware engineer|fpga", "21311"),
    (r"systems analyst|business systems|information systems|solutions? (engineer|architect)|"
     r"sales engineer", "21222"),
    (r"(it|information systems|computer).*(manager|director)|engineering manager", "20012"),
    (r"registered nurse|\brn\b|nurse practitioner", "31301"),
    (r"practical nurse|\blpn\b|\brpn\b", "32101"),
    (r"personal support worker|\bpsw\b|nurse aide|health ?care aide|patient care", "44101"),
    (r"pharmacist", "31120"),
    (r"physiotherap|physical therap|occupational therap", "31202"),
    (r"medical lab|laboratory tech|x-?ray|imaging tech", "32120"),
    (r"dentist|dental hygien", "31110"),
    (r"physician|family doctor|general practitioner", "31102"),
    (r"electrician", "72200"),
    (r"plumber|plumbing|pipefitter", "72300"),
    (r"welder|welding", "72106"),
    (r"carpenter", "72310"),
    (r"machinist|cnc|tool and die", "72100"),
    (r"hvac|refrigeration|gas (fitter|technician)", "72402"),
    (r"(automotive|auto) (technician|mechanic)|\bmechanic\b|millwright", "72410"),
    (r"truck driver|long haul|class (a|1) driver", "73300"),
    (r"construction (labour|labor|helper)|general labour|general labor", "75110"),
    (r"\bchef\b|sous[-\s]?chef|kitchen manager", "62200"),
    (r"\bcook\b", "63200"),
    (r"\bserver\b|waiter|waitress|bartender|barista", "65200"),
    (r"\baccountant\b|financial analyst", "11100"),
    (r"bookkeep|payroll|accounting (clerk|tech)", "12200"),
    (r"administrative (assistant|officer)|office (manager|admin)|executive assistant", "13110"),
    (r"receptionist|office clerk|data entry", "14101"),
    (r"human resources|\bhr\b (manager|generalist|advisor)|recruiter", "11200"),
    (r"early childhood educator|\bece\b|daycare|childcare", "42202"),
    (r"social worker|community (worker|support)", "41300"),
    (r"teacher|instructor|educator|professor|tutor", "41220"),
    (r"retail (sales|associate)|sales associate|store (clerk|associate)|cashier", "64100"),
    (r"customer service|call (centre|center)|security guard", "64409"),
    (r"cleaner|janitor|housekeep|custodian|dishwasher", "65310"),
    (r"warehouse|order picker|shipper|material handler|delivery driver|courier", "75101"),
    (r"\bsales (manager|representative)|account (executive|manager)|business develop", "60010"),
    (r"product (manager|owner)|project manager|program manager|scrum master|delivery manager", "20012"),
    (r"marketing|digital (marketing|media)|\bseo\b|content (manager|specialist|writer)|"
     r"communications|brand", "11202"),
    (r"\bux\b|\bui\b|product designer|graphic design|\bdesigner\b", "52120"),
    (r"business analyst|operations (analyst|manager|coordinator|specialist)", "21222"),
    (r"finance (manager|analyst)|controller|treasur", "11100"),
    (r"customer success|client (success|services)|implementation (specialist|manager)|"
     r"onboarding|technical writer", "12013"),
    (r"food (counter|service) (attendant|worker)|kitchen helper|food (prep|preparer)|fast food", "65201"),
    (r"production (labourer|labour|worker|associate)|food processing|process(ing)? (worker|labourer)|"
     r"\bassembler\b|packaging", "95106"),
    (r"farm (machinery|equipment) operator|general farm worker|farm hand|nursery worker|"
     r"greenhouse worker", "84120"),
    (r"harvest|fruit picker|livestock (labour|worker)|agricultur(e|al) (worker|labour)", "85100"),
    (r"automotive (service )?(technician|tech)|auto (body|service) (technician|tech)", "72410"),
    (r"landscap|groundskeep|lawn (care|maintenance)|grounds maintenance", "85121"),
    (r"(transport |long[-\s]?haul )?truck driver|tractor[-\s]?trailer|class (a|1) driver", "73300"),
    (r"(delivery|courier|transport) driver|driver[-\s]?helper|\bchauffeur\b", "75101"),
    (r"home support|personal care|care (aide|attendant|worker)|caregiver|continuing care", "44101"),
    (r"general office|office (clerk|support)|administrative clerk|filing clerk|\bclerk\b", "14100"),
    (r"shipper|receiver|material handler|warehouse (worker|associate)|order (picker|fulfilment)|"
     r"forklift", "75101"),
    (r"food service supervisor|(restaurant|kitchen|cafeteria|dining room|banquet|food (assembly|services?)) supervisor|"
     r"supervisor[,\s-]+food services?", "62020"),
    (r"retail (supervisor|team lead)", "62010"),
    (r"service station attendant|gas (bar |station )?attendant|parking attendant|\battendant\b", "65100"),
    (r"painter|drywall|roofer|flooring|insulation|glazier", "73100"),
    (r"\binstaller\b|installation tech", "72404"),
    (r"general (labour|labourer|help|helper)|\blabourer\b|manual labour", "75110"),
    (r"\b(senior |sr )?(manager|director|\bvp\b|head of|chief|president)\b", "00012"),
]
"""标题关键词 → NOC(用于推断 TEER 和职业紧缺度);**顺序即优先级**,先命中先返回。

前 50 条是科技/医疗/技工/商务的主干 + 科技公司常见商业/专业岗(product/marketing/UX/BA/
finance/customer success 六条)。
后 18 条是「全职业职位板:常见非科技岗扩充」(降低未分类;首位=大分类、次位=TEER 已核对),
逐条 TEER 标注(原行尾注逐字折此,2026-08-31 批I 方言律①):
  65201 服务 T5 / 95106 制造 T5 / 84120 资源 T4 / 85100 资源 T5 / 72410 技工 T2 /
  85121 资源 T5 / 73300 技工 T3 / 75101 技工 T5 / 44101 教育·社区 T4 / 14100 商务 T4 /
  75101 技工 T5 / 62020 服务 T2 / 65100 服务 T5 / 73100 技工 T3 / 72404 技工 T2 /
  75110 技工 T5。
最后一条 00012 是**兜底**:管理岗 → TEER0。
2026-09-27 九省体检(Frank「问题太多了」「能用多 agent 修么」)实撞:62020 那条原写
「food service supervisor|retail (supervisor|team lead)|shift supervisor|单词边界 supervisor」,裸 supervisor 把源里没写 NOC 的
「XX Supervisor」一律落进餐饮服务主管(NB 医院放射技师主管、UNB 交通主管、省交通厅公路主管因此被餐饮住宿清单挡掉;
Jobillico / Jobboom / CareerBeacon 这类不写 NOC 的源里,Home Depot 部门主管、维修主管、学生督导都落了进来)。改为:
只有带餐饮语境的主管归 62020;零售主管归 62010(Retail sales supervisors,原先也错落 62020);shift supervisor 撤
(在招 3 条全是零售:Costco 试吃、Familiprix)。其余「XX Supervisor」不硬塞,交官方示例职称表(noc_of_title),
查不到 = 未分类(CLAUDE.md「未匹配 NOC 标未分类」)。
"""

NON_PNP_PROV = {"QC", "NU"}
"""不属 PNP 体系的省:魁省走自己的甄选(CSQ/Arrima),不发省提名 → 一律不标 pnpEligible。
NU 同理:IRCC EE 年报脚注原句「Quebec and Nunavut do not operate Provincial Nominee Programs」
(canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/express-entry-year-end-report-2022.html,
2021 年报同句;crawl fed-ee 2026-09-26 复核)。2026-09-26 Frank 拍「NU 一律不可提名」(此前 NU 的 TEER 0-3 岗落进「粗筛通用」
被标可提名)。宏观序列 prPnp 行同一口径跳过(IRCC 那张表眼下没有 NU 行,实际不变)。"""

PROV_OFFER_BLOCKED = {
    "ON": ("part", "term", "seasonal", "casual"),
    "BC": ("part", "term", "seasonal", "casual"),
    "SK": ("part", "term", "seasonal", "casual"),
    "NS": ("part", "term", "seasonal", "casual"),
    "YT": ("part", "term", "seasonal", "casual"),
    "NT": ("part", "term", "seasonal", "casual"),
    "AB": ("part", "seasonal", "casual"),
    "MB": ("part", "seasonal", "casual"),
    "NB": ("part", "seasonal"),
    "NL": ("part", "seasonal"),
    "PE": ("part", "seasonal", "casual"),
}
"""雇主 offer 省提名对 offer 形态的官方门槛:省 → 过不了的工时 / 雇佣期取值(employmentHours 的 part;employmentTerm 的
term / seasonal / casual —— 两格值域不相交,并在一张表)。
2026-09-29 PE 补 casual(七省门槛卡合并,PE 子代理核):官方申请指南「You may not eligible to apply if you … have been offered a
seasonal, part-time or casual job in Prince Edward Island」(pei_workforce_application_guide.pdf;当时 PE 只 3 个 casual 岗,且本就不可提名,改判 0)。只卡源写明的值:空串 = 没标注,放行(源没写 ≠ 兼职);
QC、NU 不在表里:两地不属 PNP,pnp_eligible 按 NON_PNP_PROV 先判掉(依据见该常量)。逐省原句(crawl 缓存,2026-09-26 复核):
ON「Your employer’s job offer must: be for a full-time and permanent position in Ontario」
  ontario.ca/page/ontario-workforce-priority-stream(「Employer’s job offer requirements」小节的第一条,crawl 缓存 on-oinp
  2026-09-27 原样)。2026-09-27 九省体检换出处(Frank「问题太多了」「能用多 agent 修么」):原引(下一行)那页已归档,页上写
  「this stream was closed as of May 30, 2026, as part of the OINP redesign」,不能再当现行门槛的出处;新页同样是
  全职 + 永久,ON 这一格卡的四个值不变。原引原文保留作沿革 ——
  原引:「The job offer must be for a full-time and permanent position.」ontario.ca/page/oinp-employer-job-offer-foreign-worker-stream
  (International Student 页同句;2026 改制页 TEER 0-3、TEER 4-5 两条路都写「with a full-time and permanent job offer」)
BC「Must have a full-time, indeterminate (no end date) job offer from an eligible B.C. employer」
  welcomebc.ca/immigrate-to-b-c/skills-immigration(Health Authority 同句)
SK「You must have a letter of offer for full-time, permanent job from a Saskatchewan employer」saskatchewan.ca …/
  applicants-international-skilled-workers/international-skilled-worker-with-employment-offer(Existing Work Permit 页
  「Have a permanent full-time job offer from a Saskatchewan employer.」)
MB「a Manitoba company has offered you a full-time, long-term job after you have completed six months or more of
  continuous full-time employment with that company」immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility;
  毕业生通道原句「You must have a full-time job offer from an eligible Manitoba employer with a minimum 1-year contract」
  immigratemanitoba.com/mpnp/ies/cep/eligibility —— 合同工只要够一年就能走,term 源头不写时长,不卡
  (2026-09-26 Frank「不卡」);季节工、casual 不是 long-term,照卡
NS「have a full-time permanent job offer from a Nova Scotia employer」liveinnovascotia.com/skilled-worker
  (Occupations in Demand 同页「have a permanent, full-time job offer」)
YT「have a full-time and year-round job offer from an eligible Yukon employer」yukon.ca/en/immigrate-yukon;
  「The employer offers a full-time, permanent position to an eligible foreign worker.」yukon.ca/en/yukon-nominee-program
NT「you must have a valid full-time and permanent job offer from an NWT employer」
  immigratenwt.ca/newsroom/nwt-nominee-program-opens-updated-selection-process
AB「must have a full-time job offer or employment contract from an Alberta employer」+ 同页「not eligible … part-time,
  casual or seasonal employees, regardless of their working hours」alberta.ca/aaip-alberta-opportunity-stream-eligibility
  (Tourism and Hospitality、Rural Renewal、Express Entry 三页同句;term 合同不在排除之列,不卡)
NB「A pathway for foreign workers with a full-time, non-seasonal job or job offer in New Brunswick.」
  gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html
  (同页三条路逐条写「full time non-seasonal position」/「full-time, non-seasonal job offer」)
NL「Not seasonal, part-time, or short-term (under 12 months)」gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/
  provincial-nominee-program/employers/employer-criteria(term 合同源不写时长,够不够 12 个月判不了,不卡)
PE「have a full-time, non-seasonal (i.e. permanent or minimum of two years) job offer from a PEI employer」
  princeedwardisland.ca/en/information/office-of-immigration/skilled-workers-in-pei(term 同理不卡)
2026-09-26 /fe Frank 勾「省提名标签吃工时与雇佣期」(首页评估:在招去重里 7,790 条兼职或非长期岗照挂通道名,ON 3,721);
同日拍「按官方原句落」,曼省合同工「不卡」。"""

PROV_OFFER_QUOTE = {
    "AB": (
        "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility",
        ("All applicants, including PGWP holders, must have a full-time job offer or employment contract from an "
         "Alberta employer to work in their current occupation in Alberta when the application is submitted and when "
         "we assess it."),
        ("The following individuals are not eligible to apply for or be nominated under the Alberta Opportunity "
         "Stream, even if they have a job offer to work 30 hours a week or more in a 12-month period: part-time, "
         "casual or seasonal employees, regardless of their working hours"),
    ),
    "ON": (
        "https://www.ontario.ca/page/ontario-workforce-priority-stream",
        "Your employer’s job offer must: be for a full-time and permanent position in Ontario",
    ),
    "BC": (
        "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration",
        "Must have a full-time, indeterminate (no end date) job offer from an eligible B.C. employer",
    ),
    "SK": (
        ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
         "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/"
         "international-skilled-worker-with-employment-offer"),
        "Have an offer for an eligible permanent, full-time job in Saskatchewan.",
    ),
    "MB": (
        "https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility",
        ("Ongoing Manitoba employment means that you possess a valid work permit and a Manitoba company has offered you a "
         "full-time, long-term job after you have completed six months or more of continuous full-time employment with "
         "that company"),
    ),
    "NS": (
        "https://liveinnovascotia.com/skilled-worker",
        "To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer",
    ),
    "NB": (
        "https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html",
        "A pathway for foreign workers with a full-time, non-seasonal job or job offer in New Brunswick.",
    ),
    "NL": (
        ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/"
         "employers/employer-criteria"),
        "Full-time, at least 2 years, located in NL",
        "Not seasonal, part-time, or short-term (under 12 months)",
    ),
    "PE": (
        "https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf",
        "Employment is full‐time, non-seasonal with a contract for a permanent position or a minimum length of two years",
        "have been offered a seasonal, part-time or casual job in Prince Edward Island",
    ),
}
"""省 → offer 形态门槛的出处页与官方原句(出处页, 原句…)(2026-09-27 Frank 勾「门槛卡」:省提名弹框「本岗通道的门槛」卡的
「雇主 offer」行读它)。过不了的取值照旧只写在 PROV_OFFER_BLOCKED 一处,offer_form_rows 按省把两张表拼成 pnp_requirements 行
—— 评分段 offer_fits 与展示读同一份取值。原句逐字取自 crawl 缓存里的官方页(ab-aaip 缓存,2026-09-27 核);先上 AB,
其余省随门槛卡分批逐省核网址与原句再补(PROV_OFFER_BLOCKED 注释里的旧路径不拿来拼网址)。
2026-09-29 补 ON(劳动力优先通道页「Employer’s job offer requirements」一节原句,on-oinp 缓存核过;Frank「都接上,开工吧」)。
同日七省门槛卡合并补 BC / SK / MB / NS / NB / NL / PE(各省子代理对缓存或官方指南逐字核过;NL 雇主页写「at least 2 years」、
技术工人政策页写 12 个月,两页不一,照录雇主页原句 —— 卡片只用 PROV_OFFER_BLOCKED 的取值,不读这句的年限)。"""

OFFER_FORM_STREAM = "Job offer (all streams)"
"""offer 形态门槛行的通道名:本省凡要雇主 offer 的流都成立。名字里不带任何流名 —— 判定引擎按通道名正则挑行
(lib/pathways 的 reqStream),挑不到它。"""

OFFER_FORM_SUBJECT = "offer"
"""offer 形态门槛行的主体:不写 applicant / employer —— 判定引擎与门槛量尺只按这两个值分派,新行不进判定(判定已在评分段)。"""

OFFER_FORM_FACTOR = "offerForm"
"""offer 形态门槛的因素名。"""

OFFER_FORM_OP = "notIn"
"""offer 形态门槛的算子:工时 / 雇佣期取值不在 valueCode 那几个里才过。"""

OFFER_FORM_VALUE_SEP = ","
"""过不了的取值拼成编码串的分隔符(value 列是整数,编码串按惯例折进 basis 的 valueCode)。"""

OFFER_QUOTE_SEP = " … "
"""同一页两句原文之间的省略号(两句都是逐字原文,中间隔了别的段落)。"""

OFFER_FORM_LABEL_TPL = "Full-time job offer; not eligible: {forms}"
"""offer 形态门槛行的英文摘要(同别的条文行:label 是摘要,valueText 是原文)。"""

OFFER_FORM_LABEL_SEP = ", "
"""英文摘要里取值之间的分隔符。"""

OFFER_FORM_SECTION = "Job offer"
"""offer 形态门槛行的出处节名。"""

OFFER_FORM_FETCHED = "2026-09-27"
"""offer 形态原句的核对日(逐字对过 crawl 缓存里的官方页)。"""

TEER_SKILLED = (0, 1, 2, 3)
"""技能岗 TEER 集(粗筛通用档)。"""

UNIVERSAL_DIRECT_PROVS = {"NL"}
"""E13-09 五省「普通通道」之 direct = 拿 offer 即可入池:NL Skilled Worker「a full-time job
or job offer: In a TEER 0, 1, 2, 3, 4 or 5 occupation」
(gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria)。
2026-08-07 深夜拍板修口径根:inclusion 模型对 TEER4-5 系统性低估 —— 不看职业清单的
雇主/经验锚定通道,逐省锚官方原句(全文见 docs/implementation/E13-把脉首页/09_*.md §2)。"""

UNIVERSAL_COND_PROVS = {"MB", "NS", "NB", "PE"}
"""同上之 cond = 须先省内同雇主干满 6 个月:MB SWM
(immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility)、NS Skilled Worker TEER4-5
(liveinnovascotia.com/skilled-worker)、NB Experience(gnb.ca …/nb-skilled-worker-stream.html;2026-09-24 官网迁版后现址
www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html)、
PE Critical Worker TEER4-5(pei_workforce_application_guide.pdf)。"""

EXCL_TEER03_PROVS = {"BC"}
"""排除式省里只收 TEER 0-3 的(TEER 4-5 只有落在本省具名清单里才算):BC skills-immigration 页 Skilled Worker 一栏原句
「Must be in a NOC TEER 0, 1, 2, or 3 occupation」。2026-09-24 Frank 批「BC 只收 TEER 0-3」(九省通道审计;原模型把 BC
当 TEER 0-5 默认可,3,257 条 TEER 4-5 在招岗被标可提名)。ANY_PR_PATH_NOTE 里「BC/AB/SK/ON 排除式 TEER0-5 默认可」对 BC 不成立。"""

SK_EWP_PROV = "SK"
"""SK:TEER 4-5 与卡车司机只能走 Existing Work Permit(条件档)。ISW Employment Offer 页原句「your offer must be in an
occupation in the NOC TEER level "0", "1", "2" or "3"」「Truck Drivers must apply under the Existing Work Permit sub-category」;
EWP 页「working in Saskatchewan for at least six months on a valid work permit」、持 LMIA 工签可 TEER 0-5。
2026-09-24 Frank 批「SK 的 TEER 4-5 改走现有工签」(九省通道审计;原模型标 Employment Offer,670 条)。"""

SK_EWP_LABEL = "SK 现有工签"
"""SK Existing Work Permit 的前端短标签(pnp_stream 在具名清单都没命中时给它)。"""

SK_EWP_NOCS = {"73300"}
"""SK 明文改走 EWP 的职业(卡车司机 73300,TEER 3 也不走 Employment Offer)。"""

SK_HEALTH_BROAD = "3"
"""SK 医护大类(NOC 大类 3 = 职业码首位 3):Employment Offer 页原句「Health care occupations that fall under the National
Occupational Classification (NOC) Broad Occupational Category structure 3 must apply under the Health Talent Pathway」——
不在医疗人才清单上的医护岗只剩现有工签(2026-09-24 九省通道审计第三批)。"""

PNP_TYPE_COMMUNITY = "community"
"""raw/pnp 表类型:按社区名单判的通道(AB 乡村振兴;带 communities / excluded,不带 occupations)。"""

K_EXCLUDED = "excluded"
"""社区表键:该通道排除的职业码。"""

K_PLACES = "places"
"""社区表装载后的地名集合(小写)。"""

UNIVERSAL_PROVS = UNIVERSAL_DIRECT_PROVS | UNIVERSAL_COND_PROVS
"""五省普通通道兜底集(清单没命中也可,直可/需前置的区分由 pnp_direct 承担)。"""

AIP_PROVS = {"NB", "NS", "PE", "NL"}
"""AIP 大西洋四省。"""

AIP_TEERS = {0, 1, 2, 3, 4}
"""AIP 的 job offer 须 TEER 0-4 —— 原句「for TEER 0, 1, 2 or 3 job offers … for TEER 4 job
offers at the same or higher skill level as your qualifying work experience」
https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/job-offer.html"""

CAREGIVER_NOCS = {"44100", "42202", "44101", "33102"}
"""联邦保育专项(Home Care Worker Immigration Pilots)四 NOC 逐字锚 —— 原句
「HCWIP: Child Care — Home child care providers (NOC 44100) / Early childhood educators and
assistants (NOC 42202)」「HCWIP: Home Support — Home support workers, caregivers and related
occupations (NOC 44101) / Nurse aides, orderlies and patient service associates (NOC 33102)」
https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots/child-care-home-support/eligibility.html
⚠️ 2026-04 起两 stream 暂停收件(积压处理中,通道本身仍在 → 原则判定计入,不因暂停判死):
https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/pausing-home-care-worker-immigration-pilots-application-intake.html"""

ANY_PR_PATH_NOTE = (
    "E13-08 跨通道「完全无路可走」判定:「无路可走」是强负断言,举证标准高于正向 —— "
    "每条通道锚官方原句,举不出就保守=不判死。九省逐省锚句:"
    "BC/AB/SK/ON 排除式资格(pnp_eligible 既有模型,TEER0-5 默认可);"
    "MB SWM 同雇主 6 个月全职 + 长期 offer,无职业清单 —— immigratemanitoba.com/mpnp/"
    "skilled-worker/swm/eligibility「a Manitoba company has offered you a full-time, long-term "
    "job after you have completed six months or more of continuous full-time employment with "
    "that company」;NS Skilled Worker TEER4-5 同雇主 6 个月可走 —— liveinnovascotia.com/"
    "skilled-worker「Workers in TEER 4 or 5 … must already have six months' experience with "
    "the employer」;NB Experience:NB 雇主 + 同雇主 6 个月 + 住满 6 个月,无清单 —— "
    "…/nb-skilled-worker-stream.html;NL Skilled Worker「a full-time job or job offer: In a "
    "TEER 0, 1, 2, 3, 4 or 5 occupation」—— gov.nl.ca/immigration/"
    "4-skilled-worker-category-eligibility-criteria;PE 官方指南 PDF"
    "(pei_workforce_application_guide.pdf)为源:负断言举证不出「无路」→ 不判死。"
)
"""口径 v2(2026-08-07 深夜 Frank 拍板「排除清单口径」,v1 的 inclusion 模型被官方原句证伪)
的逐省锚句台账 —— 判定函数 any_pr_path 的举证在此,代码里只留一句指路。"""

K_EMPLOYER_SECTOR = "employerSector"
"""raw/pnp 表键:这张清单只对这个行业的雇主成立,值是下面 SECTOR_* 行业键之一(pnp 域 build_* 写,本域读)。可以挂在表级
(整张表都带条件:NB 餐饮住宿、BC 法语教师),也可以挂在 occupations 行级(只这一码带条件:SK 农业带星号码)。
纳入式清单:看得出雇主在该行业才贴通道名;叠加式排除(NB 餐饮住宿):看得出雇主不在该行业才放行 —— 两边「看不出」都照原判
(不贴 / 照挡)。2026-09-27 Frank 拍板「看得出才改判」(第一步只用官方名单与雇主名里一眼能认的行业词,模型判行业是第二步、另立项)。
同日 Frank 选「只上纯属改对的」:NS 建筑、AB 科技两张表本批不带这个键(维持现状,见 SECTOR_NAICS23 / SECTOR_AB_TECH)。
值与 pnp 域那份逐字相同(两域各自声明,不互取常量)。"""

K_PARTIAL = "partial"
"""raw/pnp 表键(排除表的 occupations 行级,布尔):该码官方带星号 —— AOS / 乡村振兴两页表头注原句「This National Occupation
Classification (NOC) code consists of both eligible occupations and ineligible occupations. The ‘Occupation’ column specifies which
occupations are ineligible for each NOC Code listed.」,同码里只一小类不合格;省桶 / 社区桶里同名格 = 这些码的集合。
2026-09-27 Frank 拍板「看得出才改判」:看得出这岗不属那一小类才不排除(判据 PARTIAL_OUTSIDE_WORDS),看不出照旧整码排除。"""

K_EXCLUDED_PARTIAL = "excludedPartial"
"""社区表键(ab-rural.json):排除码里官方带星号的那几个(乡村振兴页 Table 1 的 60040 / 42200 / 33100;2026-09-27 起 pnp 域写)。"""

K_COND = "cond"
"""省桶 / 通道桶格:带雇主行业条件的码 → 行业键。省桶里是条件式叠加排除(NB 餐饮住宿 13 码),通道桶里是条件式具名清单
(整表带条件的每码都在,SK 农业只有带星号的码在);不带条件的码不进这一格(2026-09-27)。"""

K_NAMED = "named"
"""通道桶格:这条通道算进「省点名」的码(score 的 +12、职业级通道档 named_any 都按它)= 清单码减去**行级**带条件的码
(SK 农业带星号码)。2026-09-27 Frank 选「只上纯属改对的」:带星号码按雇主贴回通道名,但分数与通道档照原样 —— 合入前这几码
不在表上、不算点名;整表带条件的(BC 法语教师)合入前就在表上,照算。省点名要不要跟着雇主判,等 Frank 拍板再改。"""

SECTOR_IN = "in"
"""雇主行业三态之一:雇主名里一眼看得出在该行业(命中该行业的 SECTOR_IN_WORDS、不命中 SECTOR_OUT_WORDS)。"""

SECTOR_OUT = "out"
"""雇主行业三态之一:一眼看得出不在该行业(命中 SECTOR_OUT_WORDS、不命中 SECTOR_IN_WORDS)。"""

SECTOR_UNKNOWN = "unknown"
"""雇主行业三态之一:看不出 —— 两边都没命中、两边都命中(名字自相矛盾)、名字空、名字里并列多个商号(SECTOR_MULTI_MARK),
或表上写的行业键本域不认得。看不出一律照原判(2026-09-27 Frank 拍板「看不出的照原样挡,具名通道退回默认通道」)。"""

SECTOR_NAICS72 = "naics72"
"""行业键:住宿餐饮业(NAICS 72)—— NB 餐饮住宿 13 码的叠加排除只对它成立。"""

SECTOR_NAICS23 = "naics23"
"""行业键:建筑业(NAICS 23)—— NS 建筑子条件的 22 码只对它成立。
2026-09-27 Frank 选「只上纯属改对的」,本批不接线:ns-construction.json 不写这个键、照旧 20 码(剔 75101 / 75119),NS 建筑照旧按码贴;
这里的词表与出处留着,当第二步(模型判雇主行业)的高置信层。"""

SECTOR_BC_PUBLIC_SCHOOL = "bcPublicSchool"
"""行业键:BC 公立 K-12(学区 / 法语学区 Conseil scolaire francophone)—— BC 法语教师定向邀请只对它成立。"""

SECTOR_AB_TECH = "abTech"
"""行业键:阿省科技业(AAIP 科技 NAICS 清单)—— AB 加速科技通道只对它成立。
2026-09-27 Frank 选「只上纯属改对的」,本批不接线:ab-tech.json 不写这个键,AB 科技照旧按码贴;词表与出处留着,当第二步的高置信层。"""

SECTOR_SK_AGRI_FOOD = "skAgriFood"
"""行业键:萨省农业通道星号脚注的五个 NAICS(11 / 311 / 33311 / 411 / 49313)—— SK 农业带星号的七码只对它成立。"""

SECTOR_SOURCE = {
    SECTOR_NAICS72: (
        "https://www.gnb.ca/en/topic/family-home-community/immigration/important-notices.html",
        ("Immigration New Brunswick is not considering any expressions of interest for issuing any invitations to apply to "
         "candidates working in the accommodation and food services sector (NAICS 72). … However, candidates in these types "
         "of jobs can still submit an expression of interest if they are employed by a business not directly in the "
         "accommodation or food service sector (NAICS 72)."),
    ),
    SECTOR_NAICS23: (
        "https://liveinnovascotia.com/skilled-worker",
        ("To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer "
         "in the construction sector (NAICS 23) in one of these NOCs:"),
    ),
    SECTOR_BC_PUBLIC_SCHOOL: (
        "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
        ("To receive a targeted invitation to apply, French-speaking teachers (NOC 41220 or 41221) must be employed in B.C.’s "
         "public K-12 system and have a CLB 5 or higher in French."),
    ),
    SECTOR_AB_TECH: (
        "https://www.alberta.ca/aaip-alberta-express-entry-stream-eligibility",
        ("is for an Alberta employer whose primary business activities belong to the Alberta tech industry, as defined by the "
         "AAIP list of eligible North American Industry Classification System (NAICS) codes … The following individuals are "
         "not eligible to apply for or be nominated under the Accelerated Tech Pathway … independent contractors or temporary "
         "agency workers"),
    ),
    SECTOR_SK_AGRI_FOOD: (
        ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
         "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/"
         "agriculture-talent-pathway"),
        ("*Occupations that require the sponsoring employer to be under: NAICS 11 – Agriculture, forestry, fishing and hunting "
         "NAICS 311 – Food manufacturing NAICS 33311 – Agricultural implement manufacturing NAICS 411 – Farm product merchant "
         "wholesalers NAICS 49313 – Farm product and warehousing"),
    ),
}
"""行业键 → (官方出处页, 官方原句)。原句逐字取自 crawl 缓存(2026-09-27 核):nb-imm 7d81dd6b…、ns-root 495d2957…(CONSTRUCTION 页签)、
bc-immigrate 806e0e95…(Education 一节)、ab-aaip 85fb5efa…(Accelerated Tech Pathway 一段)、sk-sinp 6e54338d…(职业表下的星号脚注)。
⚠ AB 科技:原句里的「AAIP list of eligible NAICS codes」是一份 PDF(页上链到 lbr-aaip-tech-pathway-naics-codes-list.pdf),不在
crawl 缓存里 —— 词表只收「软件 / IT 服务 / 网络安全」这类任何科技业定义都覆盖的核心词,不拿印象去对那份清单(2026-09-27)。
⚠ BC 卫生局(Health Authority stream)本批不立行业键:官方只写「a full-time, indeterminate (no end date) job offer from a B.C.
health authority employer」,crawl 缓存里找不到列出卫生局名单的官方原句,不凭印象列名(Frank 派工「找不到官方列名就停下」)。
⚠ naics23 / abTech 两条出处留着但本批不接线(2026-09-27 Frank 选「只上纯属改对的」,见 SECTOR_NAICS23 / SECTOR_AB_TECH)。"""

SECTOR_IN_WORDS = {
    SECTOR_NAICS72: (
        re.compile(r"\brestaurants?\b", re.I), re.compile(r"\bresto\b", re.I), re.compile(r"\bcaf[eé]s?\b", re.I),
        re.compile(r"\bcafeteria\b", re.I), re.compile(r"\bbistro\b", re.I), re.compile(r"\bbrasserie\b", re.I),
        re.compile(r"\bpizz(?:a|eria)\b", re.I), re.compile(r"\bsushi\b", re.I), re.compile(r"\bdiner\b", re.I),
        re.compile(r"\btavern\b", re.I), re.compile(r"\beatery\b", re.I), re.compile(r"\bcatering\b", re.I),
        re.compile(r"\bcaterers?\b", re.I), re.compile(r"\bbuffet\b", re.I), re.compile(r"\bdonair\b", re.I),
        re.compile(r"\bshawarma\b", re.I), re.compile(r"\bramen\b", re.I), re.compile(r"\bhotels?\b", re.I),
        re.compile(r"\bmotels?\b", re.I), re.compile(r"\bresorts?\b", re.I), re.compile(r"\bhostel\b", re.I),
        re.compile(r"\bbed (?:and|&) breakfast\b", re.I), re.compile(r"\bpub\b", re.I),
        re.compile(r"\bbar (?:and|&) grill\b", re.I), re.compile(r"\bfood services?\b", re.I),
        re.compile(r"\btim hortons?\b", re.I), re.compile(r"\bmcdonald'?s\b", re.I), re.compile(r"\bdairy queen\b", re.I),
        re.compile(r"\bburger king\b", re.I), re.compile(r"\bstarbucks\b", re.I), re.compile(r"\bmarriott\b", re.I),
        re.compile(r"\bhilton\b", re.I), re.compile(r"\bbest western\b", re.I), re.compile(r"\bholiday inn\b", re.I),
        re.compile(r"\bdays inn\b", re.I), re.compile(r"\bcomfort inn\b", re.I), re.compile(r"\bquality inn\b", re.I),
        re.compile(r"\bramada\b", re.I), re.compile(r"\bwyndham\b", re.I), re.compile(r"\bsheraton\b", re.I),
        re.compile(r"\bsodexo\b", re.I), re.compile(r"\baramark\b", re.I), re.compile(r"\bcompass group\b", re.I),
    ),
    SECTOR_NAICS23: (
        re.compile(r"\bconstruction\b", re.I), re.compile(r"\bcontracting\b", re.I), re.compile(r"\bcontractors?\b", re.I),
        re.compile(r"\broofing\b", re.I), re.compile(r"\bdrywall\b", re.I), re.compile(r"\bformwork\b", re.I),
        re.compile(r"\bpaving\b", re.I), re.compile(r"\bexcavating\b", re.I), re.compile(r"\bexcavation\b", re.I),
        re.compile(r"\bmasonry\b", re.I), re.compile(r"\bplumbing\b", re.I), re.compile(r"\brenovations?\b", re.I),
    ),
    SECTOR_BC_PUBLIC_SCHOOL: (
        re.compile(r"\bschool district\b", re.I), re.compile(r"\bconseil scolaire\b", re.I),
    ),
    SECTOR_AB_TECH: (
        re.compile(r"\bsoftware\b", re.I), re.compile(r"(?-i:\bIT\b) (?:solutions|services|consulting)\b", re.I),
        re.compile(r"\bcyber ?security\b", re.I),
    ),
    SECTOR_SK_AGRI_FOOD: (
        re.compile(r"\bfarms?\b", re.I), re.compile(r"\bcattle\b", re.I), re.compile(r"\blivestock\b", re.I),
        re.compile(r"\bgrain\b", re.I), re.compile(r"\bpulses\b", re.I), re.compile(r"\bfrozen foods\b", re.I),
        re.compile(r"\bpackers\b", re.I), re.compile(r"\bpoultry (?:processors?|farms?|breeders?)\b", re.I),
        re.compile(r"\bflour mills?\b", re.I), re.compile(r"\bdairy products\b", re.I),
    ),
}
"""行业键 → 雇主名里「一眼看得出在该行业」的词,一词一条(2026-09-27 Frank 拍板「看得出才改判」:行业词只收一眼能认的)。
每个词都拿在招真岗的雇主名人工核过(抽样清单见本批交付报告;误判为 0 才收),且每个词都在自测金标里有一家「删了这个词判法就变」的
在招真雇主作证(MartEmployerSectorTest 的变异探针逐词删);在招里找不到这种雇主的词不收(核不了)。核的时候删掉的词与理由(例子都是在招岗原样):
· 住宿餐饮:不收裸 inn / lodge / bar / grill / kitchen —— 「Inn Style Ltd」招的是发廊经理、「Lanark Lodge Long Term Care Home」是
  养老院、「Gloss nail bar」招美甲店经理、kitchen 撞橱柜安装;fairmont 撞「Fairmont Dentistry」;fast food / boston pizza 与
  restaurant / pizza 重复(没有只靠它们认出的雇主)。本表本批只当否决用(NB 规则里「在行业」与「看不出」同判,见 is_blocked)。
· 建筑:不收 builders(「COMMUNITY BUILDERS」招居家护理员)、insulation(「SOL Thermal Insulation Covers」招生产协调员)、裸 electric /
  electrical / HVAC / concrete(公用事业、制造、批发都用),宁可看不出。
· BC 公立 K-12:school district(BC 公立学区的名字就叫 School District No. N)与 conseil scolaire(公立法语学区;BC 只有一家,
  Conseil scolaire francophone de la Colombie-Britannique —— 在招里还没有它的岗,拿安省三家公立法语学区作证)。
· 科技:官方 NAICS 清单 PDF 不在缓存(见 SECTOR_SOURCE),只收 software / 大写 IT 的 solutions·services·consulting / cyber security;
  technolog* / tech / systems / networks / cloud 撞得太多(「SSN Networks Inc Canada」招保安、「Cloud 9 Vape」「Cloud Naan Inc.」是烟具店与
  餐馆、手机维修店也叫 Tech),小写 it 是代词(Fix It 一类),故只认大写 IT。
· 萨省农业:不收 foods / food / meats / agri* / seeds / feedlot —— 「Foods」常见于餐饮与零售的公司名(「LUXORE FOODS 8TH STREET LTD.」
  招快餐店经理、「Lucky Dollar Foods」招零售店长、「Global Pet Foods」招宠物店店员、「Umami Foods Canada」招批发采购);agri* 撞联邦农业部
  (「AGRICULTURE AND AGRI-FOOD CANADA」)与设备经销(「Centre Agricole CASE IH」招零件专员);seeds 撞「Orange Seeds Montessori Centre」;
  feedlot 在招里没有。grain 的木纹义(「Edge Grain」招木匠)与 farm 的零售 / 金融义(「Caledonia Clover Farm」、「Farm Lending Canada Inc」)
  交 SECTOR_OUT_WORDS 否决。因此派工例子里 Maple Leaf Foods / NutraSun Foods / Canada Golden Foods / Bourgault / Flaman 名字里没有能单独
  成立的行业词,本批看不出(按品牌名认会认错:在招里另有「Flaman Fitness」与「BOURGAULT MACHINES INC」两家同名不同业的),留给第二步。
· 2026-09-27 Frank 选「只上纯属改对的」:建筑、科技两张词表(连同 SECTOR_OUT_WORDS 里的同键两张)本批不接线 —— NS 建筑、AB 科技两张
  清单不带行业键、照旧按码贴;词表留着(逐词探针照跑),当第二步(模型判雇主行业)的高置信层。"""

SECTOR_OUT_WORDS = {
    SECTOR_NAICS72: (
        re.compile(r"\bhospitals?\b", re.I),
        re.compile(r"\bhealth (?:network|authority|authorities|services|centre|center|region)\b", re.I),
        re.compile(r"\bnursing homes?\b", re.I), re.compile(r"\blong[- ]term care\b", re.I),
        re.compile(r"\bretirement (?:residence|home|living|community|village)\b", re.I),
        re.compile(r"\bspecial care home\b", re.I), re.compile(r"\bgovernment\b", re.I),
        re.compile(r"^(?:the )?(?:city|town|village|county|municipality|regional municipality|municipal district|district"
                   r"|province) of\b", re.I),
        re.compile(r"\bdepartment of\b", re.I), re.compile(r"\bnational defence\b", re.I),
        re.compile(r"\bcanadian forces\b", re.I), re.compile(r"\bcorrectional service", re.I),
        re.compile(r"\bcoast guard\b", re.I), re.compile(r"\bparks canada\b", re.I), re.compile(r"\bpublic service\b", re.I),
        re.compile(r"\bschool (?:district|division|board)\b", re.I), re.compile(r"\bconseil scolaire\b", re.I),
        re.compile(r"\bcleaning\b", re.I), re.compile(r"\bjanitorial\b", re.I), re.compile(r"\baquaculture\b", re.I),
        re.compile(r"\bgrocery\b", re.I), re.compile(r"\bgroceries\b", re.I), re.compile(r"\bsupermarkets?\b", re.I),
        re.compile(r"\bconvenience\b", re.I), re.compile(r"\bwholesale\b", re.I),
    ),
    SECTOR_NAICS23: (
        re.compile(r"\blandscap\w*", re.I), re.compile(r"\blawn\b", re.I), re.compile(r"\bshipbuild\w*", re.I),
        re.compile(r"\bshipyards?\b", re.I), re.compile(r"\bboat ?(?:builders?|works)\b", re.I),
        re.compile(r"\baerospace\b", re.I), re.compile(r"\bfoods?\b", re.I), re.compile(r"\bfarms?\b", re.I),
        re.compile(r"\blumber\b", re.I), re.compile(r"\bmills?\b", re.I), re.compile(r"\buniversit\w*", re.I),
        re.compile(r"\bcollege\b", re.I), re.compile(r"\bschools?\b", re.I), re.compile(r"\bhospitals?\b", re.I),
        re.compile(r"\bgovernment\b", re.I),
        re.compile(r"^(?:the )?(?:city|town|village|county|municipality|district) of\b", re.I),
        re.compile(r"\bsuppl(?:y|ies|iers?)\b", re.I), re.compile(r"\bmaterials?\b", re.I),
        re.compile(r"\bmat[ée]riaux\b", re.I), re.compile(r"\bequipment\b", re.I), re.compile(r"\brentals?\b", re.I),
        re.compile(r"\bmodul\w*", re.I), re.compile(r"\bmanufactur\w*", re.I), re.compile(r"\blabou?r contractors?\b", re.I),
        re.compile(r"\bforest\w*", re.I), re.compile(r"\blogging\b", re.I), re.compile(r"\bcleaning\b", re.I),
        re.compile(r"\bjanitorial\b", re.I), re.compile(r"\bcommunity\b", re.I), re.compile(r"\bmoving\b", re.I),
        re.compile(r"\btrucking\b", re.I), re.compile(r"\btransport\w*", re.I), re.compile(r"\bhauling\b", re.I),
        re.compile(r"\bgardens?\b", re.I), re.compile(r"\bgardening\b", re.I), re.compile(r"\bjcb\b", re.I),
        re.compile(r"\bon demand\b", re.I),
    ),
    SECTOR_BC_PUBLIC_SCHOOL: (
        re.compile(r"\bindependent\b", re.I), re.compile(r"\bprivate\b", re.I),
    ),
    SECTOR_AB_TECH: (
        re.compile(r"\bworkforce\b", re.I), re.compile(r"\bemployment (?:agency|services)\b", re.I),
    ),
    SECTOR_SK_AGRI_FOOD: (
        re.compile(r"\bsuppl(?:y|ies)\b", re.I), re.compile(r"\bmarkets?\b", re.I), re.compile(r"\bcent(?:re|er)\b", re.I),
        re.compile(r"\bequipment\b", re.I), re.compile(r"\bmachinery\b", re.I), re.compile(r"\bdealers?\b", re.I),
        re.compile(r"\bsales\b", re.I), re.compile(r"\brentals?\b", re.I), re.compile(r"\bfarm boy\b", re.I),
        re.compile(r"\bclover farm\b", re.I), re.compile(r"\bcredit\b", re.I), re.compile(r"\blending\b", re.I),
        re.compile(r"\binsurance\b", re.I), re.compile(r"\bfinanc\w*", re.I), re.compile(r"\bretail\b", re.I),
        re.compile(r"\bstores?\b", re.I), re.compile(r"\bgrocer\w*", re.I), re.compile(r"\bsupermarkets?\b", re.I),
        re.compile(r"\brestaurants?\b", re.I), re.compile(r"\bfood services?\b", re.I), re.compile(r"\bcatering\b", re.I),
        re.compile(r"\bwholesale\b", re.I), re.compile(r"\bdistribut\w*", re.I), re.compile(r"\btransport\w*", re.I),
        re.compile(r"\btrucking\b", re.I), re.compile(r"\bhauling\b", re.I), re.compile(r"\bexpress\b", re.I),
        re.compile(r"\blabou?r (?:services|contractors?)\b", re.I), re.compile(r"\bemploi\b", re.I),
        re.compile(r"\bemployment\b", re.I), re.compile(r"\bwood\w*", re.I), re.compile(r"\bcabinet\w*", re.I),
        re.compile(r"\bmillwork\b", re.I), re.compile(r"\bedge grain\b", re.I),
    ),
}
"""行业键 → 雇主名里「一眼看得出不在该行业」的词,一词一条。两个用处:① 三态的「不在该行业」(NB 餐饮住宿靠它放行:医院 / 卫生网络 /
养老院 / 政府 / 学区 / 保洁公司 / 水产养殖 / 超市便利店 / 批发);② 否决 —— 同一个名字两边都命中 = 名字自相矛盾,一律看不出
(「CRB Supermarket / Riverside Restaurant」「Lawncraft Landscaping & construction Ltd.」「Steve's Livestock Transport」「Edge Grain」)。
收词口径与 SECTOR_IN_WORDS 相同(每个词在自测里有一家在招真雇主作证)。核的时候删掉的词:住宿餐饮这边不收 golf(「19th Hole Indoor
Golf & Social」招厨师)、university / college(「EDO JAPAN University Heights」「Osmow's College SQ」是餐馆,地名里带)、ministry of /
custodial / réseau de santé / hotel-dieu / board of education(在招里没有只靠它们认出的雇主);建筑与科技这边的 staffing / recruit /
personnel / talent / placement / prefab、萨省农业这边的 implements / state farm / end grain 同理不收(中介岗在汇装时整条滤掉)。
2026-09-27 Frank 拍板「看得出才改判」。"""

SECTOR_MULTI_MARK = "/"
"""雇主名里并列多个商号的记号(「Greco Xpress Petawawa / Becker's Convenience Store」「… O/A McDonald's Restaurant」):
一个名字里两家店,看不出是哪家雇的,一律看不出(2026-09-27)。"""

SECTOR_UNKNOWN_TPL = "  ⚠ raw/pnp/{file} 写的雇主行业键 {sector} 本域不认得:这张表带条件的码一律按看不出判(补 SECTOR_IN_WORDS 再跑)"
"""表上写了本域不认得的行业键时的报数(pnp 域先加了新行业、本域还没跟上;照看不出判 = 纳入式不贴、排除式照挡,不静默放行)。"""

PARTIAL_INSIDE_WORDS = {
    "60040": (
        re.compile(r"massage", re.I), re.compile(r"escort", re.I), re.compile(r"body ?rub", re.I),
        re.compile(r"parlou?r", re.I), re.compile(r"erotic", re.I), re.compile(r"sensual", re.I),
        re.compile(r"adult (?:entertainment|services?)", re.I),
    ),
    "33100": (
        re.compile(r"\blabs?\b", re.I), re.compile(r"laborator", re.I), re.compile(r"\bbench\b", re.I),
        re.compile(r"denture", re.I), re.compile(r"dental techn", re.I),
    ),
    "42200": (
        re.compile(r"justices? of (?:the )?peace", re.I), re.compile(r"juges? de paix", re.I),
    ),
    "42202": (
        re.compile(r"level\s*(?:1|i|one)\b", re.I), re.compile(r"\bassistant\b", re.I),
        re.compile(r"uncertified|without certification", re.I),
    ),
}
"""带星号码 → 这岗落在官方点名不合格的那一小类里的迹象(职位名 + 雇主名 + Job Bank 证书栏里任一处命中即算;命中一律照旧排除),一词一条。
官方点名的一小类(AOS 页 Table 1 与乡村振兴页 Table 1 的 Occupation 栏,crawl 缓存 ab-aaip bbf84819… / 0cf7f671… 原样;
出处页 https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility
与 https://www.alberta.ca/aaip-rural-renewal-stream-eligibility):
60040「Escort agency managers, massage parlour managers」;33100「Dental laboratory assistants/bench workers」(乡村振兴页写
「Dental laboratory bench workers」);42200「Justices of the peace」;42202「Early childhood educators who do not have certification through
Alberta Children's Services – Child Care Staff Certification Office or who have been certified as Level 1 Early Childhood Educator
(formerly Child Development Assistant)」(只 AOS 表带,乡村振兴表不排 42202)。42202 这格也收「assistant」(一级证旧名 Child Development
Assistant 也由它认;幼教助理岗多半收一级证)。这些词只作否决,在招里多数没有「只靠它挡住」的岗,自测拿现造职位名作证。
2026-09-27 Frank 拍板「看得出才改判」:「幼教证书看不出(除非正文明写 Level 2 / Level 3 认证),看不出的照旧挡」。"""

PARTIAL_OUTSIDE_WORDS = {
    "60040": (
        re.compile(r"\bnails?\b", re.I), re.compile(r"\bhair\w*", re.I), re.compile(r"\bbarber\w*", re.I),
        re.compile(r"\bwash\b", re.I), re.compile(r"\bcleaning\b", re.I), re.compile(r"\bjanitorial\b", re.I),
        re.compile(r"\blaundry\b", re.I), re.compile(r"\btattoo\w*", re.I), re.compile(r"\bgrooming\b", re.I),
        re.compile(r"\bdriving school\b", re.I), re.compile(r"\bhome care\b", re.I),
    ),
    "33100": (
        re.compile(r"\bdental assistant\b", re.I), re.compile(r"\bchair-?side assistant\b", re.I),
    ),
    "42200": (
        re.compile(r"\w"),
    ),
    "42202": (
        re.compile(r"level\s*(?:2|3|ii|iii|two|three)\b", re.I),
    ),
}
"""带星号码 → 看得出不属那一小类的迹象(同一段文字;PARTIAL_INSIDE_WORDS 一个都没命中、这里命中一个才放行),一词一条
(2026-09-27 Frank 拍板「看得出才改判」):
60040 = 美甲 / 美发 / 理发 / 洗车 / 保洁 / 洗衣 / 纹身 / 宠物美容 / 驾校 / 居家护理 这类(NOC 60040 自己的示例职称里与按摩院、陪侍公司
并列的那些;spa、beauty、esthetic 不收 —— 看不出是不是按摩);33100 = 职位名写明牙医诊所的 dental assistant / chair-side assistant
(不是技工所);42200 = 任何职位名(派工原话「标题不是 justice of the peace 的 42200」放行 —— 太平绅士交 PARTIAL_INSIDE_WORDS 否决);
42202 = 证书栏或职位名明写二级 / 三级证(Job Bank 证书栏原样写「Child development worker (ECE level 2)」「Child development supervisor
(ECE level 3)」),同时提到一级证的交 PARTIAL_INSIDE_WORDS 否决。正文自由文本本步不读(评分段读不到正文,见交付报告),只认职位名、
雇主名与证书栏。每个词在自测金标里有在招真岗作证(删了这个词这岗就不放行);cleaners / dry clean / pest control / dental assisting /
child development worker·supervisor 与别的词重复或在招里没有,不收。表上带星号、这里没有判据的码(官方以后新加星号)一律看不出、照旧排除。"""


# =========================================================================
# 6. 评分:打分与产出(原 08_score 下半)
# =========================================================================

ACC_UNKNOWN = "unknown"
"""可及性档:判不出。"""

ACC_RULES = (
    (r"co[-\s]?op|intern|new grad", "co-op"),
    (r"\bjunior\b|\bjr\b|associate|entry[-\s]?level|apprentice", "junior"),
    (r"senior|\bsr\b|staff|principal|lead|\biii\b|director|manager|supervisor", "senior"),
    (r"intermediate|\bii\b", "intermediate"),
)
"""标题 → 可及性档(顺序即优先级:co-op → junior → senior → intermediate,都不中落 unknown)。"""

ACC_POINTS = {"co-op": 6, "junior": 6, "intermediate": 4, "senior": 2, "unknown": 3}
"""可及性档的加分(越容易进门加得越多 —— 职位板的读者是「能不能投得上」)。"""

ACC_POINTS_DEFAULT = 3
"""可及性档不在表内时的加分(等同 unknown)。"""

TEER_BASE = {0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20}
"""每个 TEER 的评分基线(移民可行性导向)。TEER = NOC 5 位码的第 2 位:
0 管理 · 1 学位 · 2 大专/学徒(2年+)· 3 大专/培训 · 4 高中 · 5 无正式教育。
移民含义:TEER 0-3 = 技能岗,可走雇主 Offer 省提名(OINP 等);TEER 4-5 受限,除非在紧缺清单。"""

SCORE_UNCLASSIFIED = 18
"""未分类(TEER 判不出)的基线。"""

SCORE_INDEMAND = 10
"""紧缺技能职业加分。"""

SCORE_NAMED_STREAM = 12
"""省具名通道(点名招)加分 —— 按**具名通道命中**算,与资格 inclusion/exclusion 解耦。
对 indemand 省这等于其 inclusion nocs(分数不变);新覆盖的是 exclusion 省(如 AB)的具名通道。"""

SCORE_NOT_AGENCY = 12
"""非中介发布加分。"""

SCORE_OUTSIDE_ON = 6
"""非安省扣分。"""

SCORE_MAX = 100
"""分数上限(下限 0)。"""

CATEGORY_UNCLASSIFIED = "未分类"
"""TEER 判不出时的分类标签(评分行 category 列 / stats 的 broad·mid 桶名,同一个词)。"""

SRC_NOC_BLOCKLIST = {
    ("testing, adjusting and balancing (tab) technician for heating, ventilating and air conditioning (hvac)", "11201"),
}
"""源码-标题具名冲突黑名单(2026-09-22 Frank「怎么匹配的是 HVAC」实撞):(标题小写全等, 源给的 NOC)。
Job Bank 把 98 条(54 家 HVAC 雇主)indeed 转贴的 TAB 技师帖全归到 11201(企业管理咨询)——
官方 NOC 2021 职称索引(noc-elements.csv)里根本没有这个职称,是 JB 机器归类错;照抄就把暖通技师
灌进管理咨询同职业推荐。命中的不认源码,落回标题规则 → classify,兜不住「未分类」—— 不替官方编码。"""

K_CATEGORY = "category"
"""分类标签键(评分行 / SK 处理时长的类别列,同名不同表)。"""

IN_ATS_COMPANIES = paths.COMPANIES
"""ATS 公司档根(processed/<region>/companies/<slug>/,已含地域)。"""

PROFILE_FILE = "profile.json"
"""公司档里的档案文件名。"""

JOBS_FILE = "jobs.json"
"""公司档里的岗位文件名。"""

K_JOBS = "jobs"
"""岗位清单键。"""

K_SECTORS = "sectors"
"""行业(中介判定的输入之一)。"""

AGENCY_RE = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad", re.I)
"""**评分层**的中介判据(九词)。⚠ 与汇装/榜单层的 MART_AGENCY_RE 不是一份:那边多
「source code|manpower」两词。两处历史口径不同,批I 全溶时逐字保留,不合并 ——
合并会悄悄改掉评分分布(非中介 +12)。"""

ATS_EXT_TPL = "{folder}:{title}"
"""ATS 岗没有 URL 时的 externalId 兜底(公司目录名:标题)。"""

IN_JOBBANK = paths.PROCESSED_JOBBANK / "postings.json"
"""Job Bank 累积当前态(全国单文件,province 作字段,posting_id 增量去重)。
三个角色共用同一份:评分层扫它算分、汇装层拼 jobs 表、统计层推流量指标。"""

SEARCH_NOC_RE = re.compile(r"NOC\s*(\d{5})")
"""搜索关键词里的 NOC(旧关键词模式;详情页抽的官方 NOC 优先于它)。"""

K_SEARCH_OCCUPATION = "search_occupation"
"""搜索时用的职业词键。"""

K_SRC_EMPLOYMENT_HOURS = "employment_hours"
"""Job Bank / 板仓帖子行的工时键(full / part;没标注 = 空)。评分段判通道要看(PROV_OFFER_BLOCKED),
与汇装段 to_jb_job_fields 读的是同一格。"""

K_SRC_EMPLOYMENT_TERM = "employment_term"
"""Job Bank / 板仓帖子行的雇佣期键(permanent / term / seasonal / casual;没标注 = 空)。用途同上。"""

K_CERTIFICATES = "certificates"
"""Job Bank 帖子行的证书栏键(详情页「Certificates, licences, memberships, and courses」逐条,清单;没有 = 空清单)。
评分段判 AB 带星号码要看(42202 幼教:证书栏写明 ECE level 2 / level 3 才看得出不属一级证那一小类,见 PARTIAL_OUTSIDE_WORDS;
2026-09-27 Frank 拍板「看得出才改判」)。板仓与 ATS 没有这一栏。逐条以 NL 连成一段文字交判定(判据正则按行内词找)。"""

POSTING_URL_RE = re.compile(r"/jobposting/(\d+)")
"""帖 URL 里的稳定帖号(不用含 ?source= 查询串的完整 URL;见 docs/source-framework.md)。"""

JB_EXT_TPL = "jb:{pid}"
"""Job Bank 岗的 externalId 形。"""

JB_EXT_PREFIX = "jb:"
"""同上的前缀(验尸名单比对与「还在板上」名单剥前缀用;首跑教训:验尸文件存裸
posting_id,mart 存前缀形,比对必须加前缀,否则 0 剔除)。"""

OUT_SCORED = paths.PROCESSED / "all-scored.json"
"""评分步产物(externalId 为键,给汇装层 join)。"""

SCORE_DONE_TPL = "Scored {n} jobs → all-scored.json"
"""评分步收尾报数。"""

SCORE_TEER_TPL = "TEER 分布: {dist}"
"""评分步的 TEER 分布留痕。"""

K_NOC_FROM = "nocFrom"
"""评分行:职业码的来路(2026-09-28 缺数据修复批立)。汇装判「全」时 qwen 判的码不算(Frank「qwen 不准」;
设计稿 docs/design/缺数据不上线与Opus修复-20260928.md 第二节);只进 all-scored.json 中间产物,不进 jobs 表。"""

NOC_FROM_SOURCE = "source"
"""来路:源带码(Job Bank 官方码;修复库写回各仓的码也走这一路)。"""

NOC_FROM_RULE = "rule"
"""来路:本站标题规则(classify_title)。"""

NOC_FROM_MODEL = "model"
"""来路:classify 域 qwen 判的码(判「全」时不算)。"""


# =========================================================================
# 7. mart:公司装配(ATS/JB 公司行 + 官网富化 + LMIA 雇佣记录 + 四维档)
# =========================================================================

IN_ENRICH = paths.PROCESSED / "company_enrich.json"
"""公司官网富化(简介/行业,company 域 enrich 步产,E8-04)。
(官网富化已拆独立角色,2026-07-16「分开来跑」拍板:每轮 10-17 分钟拖垮 seed 时效;
汇装链只消费它落好的这份,不再现抓。)"""

ENRICH_OK = "ok"
"""富化状态:简介抓到了。"""

K_FOUND = "found"
"""富化的官网发现路径(jd/searched;searched 前端加小字,D2)。"""

K_WEBSITE = "website"
"""官网列。"""

K_WEBSITE_SOURCE = "websiteSource"
"""官网发现路径落进 companies 的列名。"""

K_DESCRIPTION = "description"
"""公司简介 / 岗位正文,两处同名不同表。"""

K_SRC_VALID_THROUGH = "valid_through"
"""板仓帖子行:发帖方自己写的截止日(Jobillico / Jobboom / CareerBeacon / GC Jobs / HireAC 的 ld+json 带,100% 有;
Job Bank 仓没有这一格)。
2026-09-27 Frank 勾「Job Bank 截止日」:Job Bank 仓起也有这一格(jobbank 详情解析抽帖页「Advertised until」,键同;
帖页没写的 Indeed 转帖是空串),to_jb_job_fields 照读;ATS 仓 jobs.json 同键(2026-09-26 起)。"""

K_VALID_THROUGH = "validThrough"
"""jobs 行:截止日(2026-09-16 Frank「有就写,没有就不写」:板帖照搬发帖方的截止日,Job Bank 帖没有就不落键)。"""

ENRICH_KEYS = ("description", "sectors", "website")
"""富化只填这三格,且**只填空**:ATS 已自带 profile 的 description/sectors 优先,
Job Bank 公司无 profile 全靠它。"""

IN_CAREERS = paths.RAW_ATS / "national-careers.json"
"""全国公司招聘页发现清单(ats 域产,一行一家:slug / website / careers_url / status;2026-09-16 Frank「公司的 ATS 链接要不要列出来」
→ 效果图点头「可以,就这样做」:companies 多一列 careersUrl,公司页「基本信息」官网下出「招聘页」一行)。缺文件 = 空表。"""

K_SRC_CAREERS_URL = "careers_url"
"""招聘页发现清单行:招聘页链接。"""

K_CAREERS_URL = "careersUrl"
"""companies 列:公司官方招聘页。只收探测回 200 的;与官网同址的不落(页面上两行重复)。"""

NOT_OFFICIAL_HOSTS = {
    "facebook.com": "facebook", "instagram.com": "instagram", "linkedin.com": "linkedin", "x.com": "twitter",
    "twitter.com": "twitter", "tiktok.com": "tiktok", "youtube.com": "youtube", "linktr.ee": "linktree",
    "sites.google.com": "google", "google.com": "google", "wixsite.com": "wix", "wix.com": "wix",
    "monsitew.com": "monsitew", "gw.micro-acces.com": "microacces", "mail.com": "mailcom",
    "gmail.com": "gmail", "hotmail.com": "hotmail", "outlook.com": "outlook", "yahoo.com": "yahoo", "yahoo.ca": "yahoo",
    "sasktel.net": "sasktel", "telus.net": "telus", "shaw.ca": "shaw", "rogers.com": "rogers", "bell.net": "bell",
    "sympatico.ca": "sympatico", "videotron.ca": "videotron", "eastlink.ca": "eastlink", "mts.net": "mts",
    "indeed.com": "indeed", "jobbank.gc.ca": "jobbank", "healthassociation.ns.ca": "healthassociation",
}
"""不算官网的主机(值 = 这台主机自己的名字,压平小写):社交主页、运营商邮箱域名(雇主把邮箱域名填成了网址)、
建站平台的公共域、招聘平台与**点名的代招门户**。公司行的官网 / 招聘页落在这些主机上的一律留空 —— 除非雇主名里
带这台主机自己的名字(Rogers Communications 的 rogers.com、Health Association Nova Scotia 的 healthassociation.ns.ca 是真官网)。
2026-09-19 Frank「做规则,代招门户不当官网」:起因 VON Canada 的官网被记成 healthassociation.ns.ca
(新斯科舍卫生行业协会替成员代发招聘的门户;VON 自己是 von.ca),雇主板点雇主名直接去官网后,这类错很显眼。
🔴 试过「多家雇主共用一个域名 = 门户」的自动判据,实测不成立:共用域名的 62 组里绝大多数是正当的总部 / 运营方 / 加盟品牌站
(wyndhamhotels.com、ihg.com、macleodcares.com、legroupemaurice.com、timhortons.com),按它删会误杀几百家;
真该剔的只有上面这一小类,所以用点名清单。发现新的代招门户往这里加一行。"""

NAME_FLAT_RE = re.compile(r"[^a-z0-9]+")
"""压平雇主名用:只留小写字母数字(与 NOT_OFFICIAL_HOSTS 的值比对)。"""

HOST_WWW_PREFIX = "www."
"""主机名前的 www. 前缀(比对前削掉)。"""

NAME_FLAT_REPL = ""
"""压平时的替身。"""


CAREERS_STATUS_OK = "200"
"""招聘页探测通过的状态码(清单里全国件存成字符串、Kanata 件存成数字,比较前一律转串)。"""

CAREERS_HOST_WWW = "www."
"""比招聘页主机名时剥掉的前缀。"""

CAREERS_ATS_HOSTS = ("greenhouse", "lever", "workable", "bamboohr", "smartrecruiters", "jazzhr", "breezy",
                     "applytojob", "recruitee", "myworkdayjobs", "workday", "ashbyhq", "successfactors",
                     "oraclecloud", "eightfold", "icims", "jobvite", "phenom", "taleo", "adp")
"""招聘页允许的外域主机词(已知 ATS;与 MART_ATS_NAMES 的键同族,另加几家常见的)。
2026-09-22 OPS 实撞:gojobs.gov.on.ca 的招聘页发现被 Radware 重定向到 validate.perfdrive.com,
status 200 照单全收 —— 招聘页主机必须与官网同域 / 子域,或落在这份 ATS 名单里,其余一律丢。"""

PORTAL_SUB_LABELS = frozenset({"jobs", "job", "careers", "career", "carriere", "carrieres", "gojobs",
                               "recruit", "recruiting", "recruitment", "emploi", "emplois"})
"""官网主机名的第一段是这些词 = 雇主自己的招聘子站(careers.mcdonalds.ca / gojobs.gov.on.ca / jobs.uhaul.com)。
2026-09-22 Frank「有很多招聘网站啊」(OPS gojobs 实拍,生产扫出 61 家「官网」其实是招聘站):
官网格不装招聘站 —— 挪去招聘页格,官网留空等阶梯重找。"""

PORTAL_ATS_DOMAINS = ("greenhouse.io", "lever.co", "workable.com", "bamboohr.com", "smartrecruiters.com",
                      "jazzhr.com", "breezy.hr", "applytojob.com", "applytojobs.ca", "recruitee.com",
                      "myworkdayjobs.com", "ashbyhq.com", "successfactors.com", "oraclecloud.com",
                      "eightfold.ai", "icims.com", "jobvite.com", "phenompeople.com", "taleo.net",
                      "njoyn.com", "ultipro.com", "dayforcehcm.com")
"""第三方 ATS 的整域名(主机等于它或以「.它」收尾才算 —— 检测闸要精确,别学 CAREERS_ATS_HOSTS 的宽词:
greenhouse / workday 当子串会把蔬菜大棚公司的真官网(witzkesgreenhouses.ca)和 Workday 母公司自己误伤)。"""

SCRIPT_JUNK_RE = re.compile(r"var __|__uzdbm|SSJSConnectorObj|<script|function\s*\(", re.I)
"""富化 description 的脚本判据(2026-09-22 OPS 实撞:官网撞 Radware 墙,挑战页 JS 源码被当简介存了
—— enrich 老记录带着这坨,消费端拒收)。"""

IN_SITE_PAGES = paths.PROCESSED_SITES / "pages.json"
"""公司官网抓取记录(sites 域 fetch / visit 步产,slug → 抓取状态 + 官网主机名;2026-09-20 自动纠错:status = dead 的是死站 ——
域名连续两轮不解析,公司行的官网格清空,company 域找官网阶梯重找。设计稿 docs/design/点开优先抓取与纠错-20260920.md)。缺文件 = 空表。"""

SITE_PAGES_DEAD = "dead"
"""sites 域抓取记录的死站状态。"""

K_SITE_HOST = "host"
"""sites 域抓取记录键:官网主机名(去 www.)。"""

K_REPLACES = "replaces"
"""官网富化缓存键:这条官网顶掉的旧官网主机名(company 域 findsite 步记;旧的是死站 / 名字对不上的别家站)。"""

IN_SITE_FACTS = paths.PROCESSED_SITES / "facts.json"
"""公司官网整理记录(sites 域 facts 步产,slug → 七节的值 + 每节过了核对的页面原句 + 出处网址;2026-09-20 进库批:
Frank 定的判据「凡是给用户看的公司事实,必须能指回一句官网原文」,设计稿 docs/design/公司官网定期抓取-20260919.md)。缺文件 = 空表。"""

IN_SEARCH_HQ = paths.PROCESSED / "company_search_hq.json"
"""搜总部记录(company 域 findsite 役产出;2026-09-22 Frank「用有头浏览器一搜不就搜到了吗」——
官网与维基都没给总部时的第三来路,带落地页原句与出处)。"""

IN_WIKI_HQ = paths.PROCESSED / "company_wiki_hq.json"
"""维基总部兜底(company 域 wikihq 步产,slug → Wikidata「总部所在地」属性查到的市 / 省 + 条目链接):
官网没标总部的公司才用它(来路排序 Frank 定:官网 → 维基 → 联网搜索)。缺文件 = 空表。"""

SITE_FACTS_OK = "ok"
"""官网整理记录 / 维基总部记录的状态:做成(只取 ok 行)。"""

K_SITE_NAME_OK = "name_ok"
"""官网整理记录:官网归属闸(sites 域判的:这个官网是不是这家公司的;2026-09-20 Frank「这个是错的啊」——
Best Buy Express 的官网记成了 bell.ca,进库的是 Bell 的总部)。不是 True 的整条不进库。"""

K_SITE_QUOTES = "quotes"
"""官网整理记录:节标记 → 过了核对的页面原句(没过核对的节不在里面,它的值不算数)。"""

SITE_SEC_HQ = "HQ"
"""官网整理记录里总部那一节的标记(quotes 里有它,总部三格才带进库)。"""

K_SITE_AT = "at"
"""官网整理记录 / 维基总部记录:做成时刻(ISO)。"""

K_SRC_HQ_ADDRESS = "hq_address"
"""官网整理记录:总部街址(模型照页面抄的,常连着市 / 省 / 邮编一起抄,见 hq_street_of)。"""

K_SRC_HQ_CITY = "hq_city"
"""官网整理记录 / 维基总部记录:总部所在市。"""

K_SRC_HQ_PROVINCE = "hq_province"
"""官网整理记录 / 维基总部记录:总部所在省(加拿大的是两位省码;外国总部是州码 / 国名,原样留着)。"""

K_SRC_HQ_SOURCE = "hq_source"
"""官网整理记录:总部原句出自哪一页;维基总部记录:Wikidata 条目链接。"""

K_SRC_HQ_PARENT = "hq_parent"
"""维基总部记录:这是母公司的总部(2026-09-22 Frank「显,但注明是母公司」;官网整理记录没有这个键)。"""

K_SRC_HQ_QUOTE = "hq_quote"
"""搜总部记录:落地页原句(出处凭据;维基记录没有这个键)。"""

K_HQ_ADDRESS = "hqAddress"
"""companies 列:总部街址(只到街,市 / 省各有一列;官网没写到街就空着)。"""

K_HQ_CITY = "hqCity"
"""companies 列:总部所在市。"""

K_HQ_PROVINCE = "hqProvince"
"""companies 列:总部所在省(加拿大两位省码一律大写;外国总部原样)。"""

K_HQ_QUOTE = "hqQuote"
"""companies 列:总部那一节的官网页面原句(出处凭据;维基来的没有原句,缺键)。"""

K_HQ_SOURCE = "hqSource"
"""companies 列:总部的出处网址(官网那一页 / Wikidata 条目)。"""

K_HQ_PARENT = "hqParent"
"""companies 列:总部是母公司的(2026-09-22 Frank「显,但注明是母公司」;只在维基兜底按备选名命中外国总部时为真,
页面总部行灰注母公司)。"""

K_SITE_CHECKED_AT = "siteCheckedAt"
"""companies 列:官网最近一次整理成的时刻(有官网整理记录就带,不管有没有抽出总部)。"""

HQ_CA_PROVS = frozenset({"ON", "QC", "BC", "AB", "SK", "MB", "NB", "NS", "NL", "PE", "YT", "NT", "NU"})
"""加拿大十省三地区的两位码:总部省是其中之一才拿去盖公司行的 region(2026-09-19 Frank「省改成总部的省」;
外国总部 / 没总部的 region 维持来源侧的值 —— 相似雇主按它找同省、雇主池主省拿它兜底)。"""

PROV_CODE_LEN = 2
"""省码的长度(两位的才转大写当省码比;「Ontario」「England」这类原样留)。"""

HQ_TRIM_CHARS = " ,"
"""街址截掉市名以后,尾巴上要抹掉的空格与逗号。"""

HQ_SEG_SEP = ","
"""街址里另起一段的逗号:街址末尾的市名前面有它 = 另起的一段市名(「100 Toronto St, Toronto」),该截;
没有 = 街名本身(「53 chemin Lavaltrie」),不截(2026-09-21,与 sites 域同名常量同值)。"""

SITE_BRIEF_SECS = (("OFFICES", "offices"), ("NEWCOMERS", "newcomers"), ("BENEFITS", "benefits"))
"""官网整理记录里并进简介文本的三节(节标记, 记录里的值键;设计稿第四节「第 5~7 节进现有的简介文本,多三个节标记,不加列」):
其他办公地点 / 对新移民与外籍员工的态度 / 福利与招聘。顺序即简介里的节序;cms 那头的节标记表同名同序。"""

SITE_SEC_LINE_TPL = "[{mark}] {text}"
"""简介文本里一节的行形(与 company 域五节简介同形:方括号标记 + 空格 + 正文,一节一行)。"""

BRIEF_LINE_SEP = "\n"
"""简介文本的节间分隔(一节一行)。"""

EMPTY_JSON_LIST = "[]"
"""空 JSON 数组串(aiSources 还没值时的起点)。"""

IN_PLACES = paths.RAW_COMPANIES / "company_places.json"
"""Google Places 查得的官网/地址(company 域 places 步产,2026-09-05):只填空,来源侧已有的不覆盖;
官网由此来的 websiteSource 记 places。"""

PLACES_HIT = "hit"
"""Places 记录状态:命中(只取命中行)。"""

FOUND_PLACES = "places"
"""官网发现路径:Google Places(与 jd/searched 并列,前端小字标注)。"""

IN_CURATED = paths.PROCESSED / "company_curated.json"
"""人工核定表(company 域 write_curated 写,2026-10-01 Frank「opus 修的优先级最高」):官网 / 总部最后生效,
压过来源侧、富化、Places、官网整理、维基、搜总部;空格不动自动来源的值。"""

FOUND_CURATED = "curated"
"""官网来路:人工核定(websiteSource;cms 点开探索见它就不再探索这家)。"""

K_CUR_BRIEF_SOURCES = "brief_sources"
"""人工核定表:简介出处页网址表(2026-10-01 Frank「简介也要核对啊」;英 / 中 / 韩三格与简介记录同键 K_BRIEF*)。"""

K_CUR_AT = "curated_at"
"""人工核定表:核定时刻(核定简介的产出时刻 aiFetched 用它)。"""

IN_BRIEF = paths.PROCESSED / "company_brief.json"
"""官网正文 → qwen 五节简介(company 域 brief 步产,2026-09-05):进 companies 的 aiBrief 四列。
mart 有就覆盖库里懒检索版(官网原文比网页搜索可靠);mart 没有的公司列缺键,seed 侧 COALESCE 保旧值。"""

BRIEF_OK = "ok"
"""简介记录状态:做成(只取 ok 行)。"""

K_BRIEF = "brief"
"""简介记录里的英文五节键。"""

K_BRIEF_ZH = "brief_zh"
"""简介记录里的中文五节键。"""

K_BRIEF_KO = "brief_ko"
"""简介记录里的韩文五节键(2026-09-05 加)。"""

BRIEF_ZH_SCRIPT_RE = re.compile(r"[\u4e00-\u9fff]")
"""中文简介里真有汉字才进 aiBriefZh 列(2026-09-17:company 域存量里有模型原样交回英文 / 法文的坏译文,
补翻完之前别再灌进库;company 域自己的同款尺子在它的 constants,域间不互取常量)。"""

BRIEF_KO_SCRIPT_RE = re.compile(r"[\uac00-\ud7a3]")
"""韩文简介里真有韩文字才进 aiBriefKo 列(同上)。"""

K_AI_BRIEF_KO = "aiBriefKo"
"""companies 列:简介韩文。"""

K_SOURCES = "sources"
"""简介记录里的出处 URL 表键。"""

K_AI_BRIEF = "aiBrief"
"""companies 列:AI 整理的五节简介。"""

K_AI_BRIEF_ZH = "aiBriefZh"
"""companies 列:简介中文。"""

K_AI_SOURCES = "aiSources"
"""companies 列:出处 URL 列表(JSON 数组串)。"""

K_AI_FETCHED = "aiFetched"
"""companies 列:简介产出时刻。"""

JD_LABEL_HEAD_RE = re.compile(
    r"^\s*(?:##\s+)?(?:(?:job description|description du poste|description de l'emploi)\b\s*[:\-–]?\s*"
    r"|description\s*(?:[:\-–]\s*|\n\s*))(?=\S)", re.I)
"""正文开头的纯标签(「Job Description」「Description du poste」…):来源平台的版式套话,不是岗位内容。
2026-09-19 Frank「原版这个 Job Description 不需要显示吧」;在招岗里约 1,900 条以它开头(Jobillico 1,367、ZipRecruiter 295、
Talent.com 56、indeed 53 …)。只剥开头这一处;「Job Summary」「About the job」后面跟的是内容小节,不剥。
2026-09-20 容一个可选的节头标记「## 」:这条套话在源头本来就是加粗的一行,块级序列化后带上标记,
不放进正则的话整条规则失效、1,900 条又会冒出来(设计稿 docs/design/职位正文结构下沉-20260920.md)。"""

WP_TAIL_RE = re.compile(r"\s*\[(?:\.\.\.|…)\]\s*$")
"""WordPress 摘要尾巴「[…]/[...]」(源站自动截断标记,66/3492 家;Frank 2026-07-19 报障)。"""

IN_LMIA = paths.LMIA / "lmia-employers.json"
"""ESDC 正面 LMIA 雇主聚合(lmia 域 build 产,E6-02)。"""

LMIA_STREAM_TOP = 3
"""LMIA 项目股别只展示前三(按岗位数降序)。"""

LMIA_STREAM_TPL = "{stream} {n}"
"""一个股别的展示形。"""

LMIA_STREAM_SEP = " · "
"""股别之间的分隔(本列是**单一信息的分级**不是多信息杂糅,故仍用点号)。"""

BRANCH_CITY_MIN = 2
"""在招岗跨这么多座城(省 + 市算一座)起,公司行抄自帖子的地址判为分店地址、留空
(2026-09-19 Frank 实拍 Compass Group Canada 总部显示成 Windsor, NS:Job Bank / 板帖没有公司档,
address 抄的是某一条帖子的上班地点,单店雇主碰巧对、全国连锁全错;留空不猜,真总部 Job Bank 给不了)。"""

BRANCH_DROP_TPL = "  分店地址留空: {n} 家(在招岗跨 ≥{min} 城,地址抄自帖子)"
"""分店地址留空留痕。"""

LMIA_HIT_TPL = "  LMIA 雇佣记录匹配: {hit}/{total} 公司(窗口 {window})"
"""LMIA 匹配留痕(3.2 统计:公司命中 18.2%,抽检零误报)。"""

IN_COMPANY_FACTS = paths.PROCESSED / "company_facts.json"
"""公司事实表(D 批产物;fame 档的 wiki 依据)。"""

K_BY_SLUG = "by_slug"
"""按 slug 索引的键。"""

K_WIKI = "wiki"
"""有没有维基条目。"""

AGG_NEW_DAYS = 30
"""公司活跃度的「近 30 天新发」窗口。"""

K_COMPANY_SLUG = "companySlug"
"""岗位行里的公司外键。"""

K_DATE_POSTED = "datePosted"
"""岗位行的发布日(已归一 ISO)。"""

K_SALARY_ANNUAL = "salaryAnnual"
"""岗位行的帖面折算年薪。"""

K_WAGE_MED_ANNUAL = "wageMedAnnual"
"""岗位行的 ESDC 中位年薪。"""

K_WAGE_LOW_ANNUAL = "wageLowAnnual"
"""岗位行的 ESDC 低位年薪。"""

K_WAGE_HIGH_ANNUAL = "wageHighAnnual"
"""岗位行的 ESDC 高位年薪。"""

K_WAGE_MED_HOURLY = "wageMedHourly"
"""岗位行的 ESDC 中位时薪(2026-09-11 Frank 把脉页招聘对比改时薪三件,省级聚合取列用)。"""

K_WAGE_LOW_HOURLY = "wageLowHourly"
"""岗位行的 ESDC 低位时薪(同上)。"""

K_WAGE_HIGH_HOURLY = "wageHighHourly"
"""岗位行的 ESDC 高位时薪(同上)。"""

K_AIP = "aip"
"""岗位行的 AIP 指定雇主位。"""

K_LMIA_POSITIONS = "lmiaPositions"
"""公司行:LMIA 获批岗位总数。"""

K_LMIA_POSITIONS_SKILLED = "lmiaPositionsSkilled"
"""公司行:非农业/季节股的获批岗位数(榜单口径与担保档用)。"""

K_LMIA_LAST_QUARTER = "lmiaLastQuarter"
"""公司行:LMIA 最近有记录的季度。"""

ORIGIN_ATS = "ats"
"""来源渠道:公司自有 ATS(也是 ATS 板名缺失时的 source 兜底)。"""

ORIGIN_JOBBANK = "jobbank"
"""来源渠道:Job Bank。"""

ORIGIN_HIREAC = "hireac"
"""校内板渠道(2026-09-13 hireac 域;这一渠道的帖 status 记 campus 不记 open —— 只进 /coop 页,
职位板 / 统计 / 榜单 / 雇主池按 status=open 取数时自然剔掉,Frank「不应该放到职位里面吧」)。
2026-09-15 /coop 页撤销(Frank「撤吧 校内版 只是一个渠道而已」):campus 帖改由主板渠道下拉选 HireAC 看到,「只进 /coop 页」一句作废;不进统计 / 榜单 / 雇主池照旧。"""

IN_BOARD_STORES = ((paths.PROCESSED_JOBILLICO / "postings.json", "jobillico"),
                   (paths.PROCESSED_JOBBOOM / "postings.json", "jobboom"),
                   (paths.PROCESSED_CAREERBEACON / "postings.json", "careerbeacon"),
                   (paths.PROCESSED_HIREAC / "postings.json", ORIGIN_HIREAC),
                   (paths.PROCESSED_GCJOBS / "postings.json", "gcjobs"))
"""第三方招聘板的 postings 仓 → (路径, origin) 表(2026-09-06 jobillico/jobboom 立域,Frank「两站都接,
Jobboom 剔 Job Bank 转载」)。仓与 Job Bank 仓同键(各板域自己归一成同形),评分 / 岗位装配 /
三段跨源清洗都按这张表多走一轮;origin 记板名(jobs.origin 渠道筛选随之多两个值),source 是板域
写的板名。板帖不进验尸(过期由板域按 validThrough 出仓)。加第三个板 = 这里加一行
(2026-09-11 careerbeacon 照此加行:大西洋四省板,仓同键同形)。
2026-09-13 hireac(Algonquin 校内板登录源)加行:当晚首灌 376 帖上了公开职位板(渠道列显裸键 origin.hireac),
Frank「不应该放到职位里面吧」→ 同日改成**按渠道给 status**(to_job_row:hireac → campus,其余 open):行照样进 jobs 表
(详情页免造),但职位板 / 统计 / 榜单 / 雇主池全按 status=open 取数,campus 只进一级导航「校内板」页 /coop
(枚举 DDL:docs/sql/jobs-origin-hireac.sql + jobs-status-campus.sql)。
2026-09-15 一级导航「校内板」与 /coop 页撤销(Frank「校内版只是一个渠道而已」),campus 帖改由主板渠道筛选看到。
2026-09-13 gcjobs 照此加行(联邦公务员招聘站公开搜索 ≈ 400 帖,Frank「那 GC Jobs 接一下吧」;枚举 DDL jobs-origin-gcjobs.sql)。
2026-09-25 过期兜底(/fe hireAC,Frank「过期兜底做吧」):评分与汇装两处读仓时按板域同一口径再剔一遍过截止日的帖
(read_board_rows),板域停轮也不上板;库里已在架的由 seed 的 CLOSE_PAST_DEADLINE 收关。三段原地清洗照读全仓,不替板域删行。"""

BOARD_EXT_TPL = "{origin}:{pid}"
"""板帖的 externalId(`jobillico:<帖号>`;与 jb: 前缀同律 —— 帖号只在各自板内唯一,前缀防撞)。"""

K_ORIGIN = "origin"
"""jobs 行的来源渠道键(板帖装配时覆盖成板名)。"""

PRINT_INOUT_BOARD_TPL = "IN/OUT board     : {out}"
"""三段跨源清洗对每个板仓的 IN/OUT 留痕。"""

PRINT_BOARD_EXPIRED_TPL = "board expired    : {out} 过截止日 {n} 帖不上板"
"""读板仓时按截止日剔掉的帖数留痕(2026-09-25 过期兜底;板域照常出仓时是 0,不是 0 = 那个板域停轮了)。"""


# =========================================================================
# 8. mart:岗位装配(ATS/JB 两源 → jobs 行;JD 正文下沉 + 身份预筛)
# =========================================================================

IN_JDFORMAT = paths.PROCESSED_JDFORMAT / "formatted.json"
"""岗位正文 → qwen 五节整理版(jdformat 域 format 步产,2026-09-15):进 jobs 行的 jdFormatted / jdFormattedAt
两列,就业性质 / 工时两格只填空(官方标注优先,同 cms 懒生成路)。mart 有就覆盖库里懒生成版(同一套提示词
与校验,盒子版更新);mart 没有的岗不落键,seed 侧 COALESCE 保留线上版 —— 判据同 IN_BRIEF。
起因:正文区 2026-09-14 起只出整理版,没被点开过的岗对 Googlebot 是一页转圈(Search Console 塌方病因之二)。"""

FORMAT_OK = "ok"
"""整理记录状态:做成(只取 ok 行)。"""

IN_CLASSIFY = paths.PROCESSED_CLASSIFY / "jobs.json"
"""classify 域判出的职业码(2026-09-16 接线):externalId → 分类记录。评分段只在**源带码与标题规则都落空**时
拿它填 noc —— 层序 源带码 → 规则 → 模型 → 留空,已判出的一律不覆盖。域没跑过 = 缺文件 = 空表,照常汇装。"""

CLASSIFY_OK = "ok"
"""分类记录状态:判出了码(弃权与失败都是 fail,不进表)。"""

K_FORMAT_TEXT = "formatted"
"""整理记录里的五节整理版键。"""

K_FORMAT_TERM = "term"
"""整理记录里模型抽出的就业性质键(已过合法值闸;空串 = 没抽到)。"""

K_FORMAT_HRS = "hrs"
"""整理记录里模型抽出的工时类型键(同上)。"""

K_FORMAT_AT = "at"
"""整理记录里的生成时刻键(ISO)。"""

K_JD_FORMATTED = "jdFormatted"
"""jobs 行:五节整理版列(DB jobs.jd_formatted)。"""

K_JD_FORMATTED_AT = "jdFormattedAt"
"""jobs 行:整理时刻列(DB jobs.jd_formatted_at)。"""

JOBBANK_HOST = "jobbank.gc.ca"
"""Job Bank 域名(第一方直发判定用;2026-09-15 前也管来源标签归一,随改判撤出,见 source_label)。"""

SOURCE_JOB_BANK = "Job Bank"
"""Job Bank 的板名:第一方直发判定(source 等于它 = 雇主在 Job Bank 直发)与缺省 source 共用。
原判(2026-09-15 前,原文保留):「来源真相:Job Bank 聚合 indeed/Talent 等 → 统一显示「Job Bank」,`source` 保留原始板。」
2026-09-15 Frank 改判:来源列显示原始板,不再统一成 Job Bank(见 source_label)。"""

SOURCE_PRETTY = {"lever": "Lever", "bamboohr": "BambooHR", "greenhouse": "Greenhouse",
                 "smartrecruiters": "SmartRecruiters", "workable": "Workable",
                 "recruitee": "Recruitee", "myworkdayjobs": "Workday", "workday": "Workday", "ashbyhq": "Ashby",
                 "successfactors": "SuccessFactors", "oraclecloud": "Oracle", "eightfold": "Eightfold", "wpcareers": "Company site", "phenom": "Phenom"}
"""ATS 板名美化表(查不到就用原始 source,再没有落 EM_DASH)。"""

MART_AGENCY_RE = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|"
                            r"adecco|randstad|source code|manpower", re.I)
"""**汇装层与榜单层**的中介判据(十一词,比评分层多 source code / manpower)。见 AGENCY_RE 的
分叉说明 —— 两处历史口径不同,批I 全溶时逐字保留。"""

AGENCY_NOTE = "this job posting is posted by a recruitment agency"
"""Job Bank 官方中介标记(第 17 轮 #41 拍板「视同中介整帖过滤」):帖面这句提示会被黏进
title,出现即中介代发,零误报 —— 比公司名正则可靠(Manpower/Rapihire/The Hiring Partner
等全靠它抓出)。"""

SKIP_SLUGS = {"cmc-microsystems"}
"""整个跳过的 ATS 公司目录。"""

K_ATS = "ats"
"""ATS 板名键(公司档的 jobs.json 表级)。"""

K_SALARY = "salary"
"""薪资原文。"""

K_SALARY_TEXT = "salaryText"
"""薪资归一产物(有原文却没它 = 04d 之后才落盘的新帖)。"""

MART_LATE_SALARY_NOTE = (
    "薪资兜底的病根(2026-08-05 实撞):抓取(jobbank 容器)与建表(build 容器)并行,"
    "jobbank 整文件重写 postings.json,落在「04d 跑完 → 09 建表」之间的新帖就没人给它算过薪资,"
    "带着空值进库 —— 00:22 跑 04d → 00:25 写入 24 条新帖 → 00:42 建表 → 那 24 条在页面上薪资列"
    "全空,下一轮才自愈。编排顺序已把窗口从 20 分钟压到十几秒,但窗口不为零 —— "
    "**mart 是最终表,它不该依赖谁先跑**。"
)
"""兜底存在的理由(它不是第二套清洗逻辑,用的是 04d 同一把尺子)。"""

PILOT_OCC_YES = "yes"
"""试点职业交叉:NOC 在所在社区在收清单。"""

PILOT_OCC_NO = "no"
"""同上:不在(RCIP 要求 offer 职业在清单内,官方清单为据的负判定)。"""

K_PILOT_COMMUNITY = "pilotCommunity"
"""岗位行的试点社区列。"""

K_PILOT_OCC = "pilotOcc"
"""岗位行的试点职业交叉列(''=非试点岗/该社区清单无 NOC/岗位无 NOC,判不了不硬判)。"""

WAGE_NATIONAL = "NAT"
"""工资表的国家级键(省级查不到时的退档)。"""

K_ANNUAL = "annual"
"""工资格里的中位年薪。"""

K_PNP_STREAM = "pnpStream"
"""省具名通道标签列。"""

K_PNP_ELIGIBLE = "pnpEligible"
"""省提名粗筛位列。"""

K_PNP_BLOCK = "pnpBlock"
"""评分行 / 岗位行:走不了省提名的原因码(2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」「就直接说 兼职」;
空串 = 走得了;列 jobs.pnp_block,docs/sql/jobs-pnp-block-20260929.sql)。工作性质那四个码直接用卡住的工时 / 雇佣期取值
(part / term / seasonal / casual,与 PROV_OFFER_BLOCKED 同一套词),其余见 BLOCK_*。"""

BLOCK_LIST = "list"
"""原因码:落在本省排除清单(排除式省的排除表 / NB 叠加式不受理);前端照旧走「不符合清单」那条路。"""

BLOCK_OCC = "occ"
"""原因码:职业不在本省收的职业里(TEER 4-5 没进清单,或职业没分类);前端写「职业不收」。"""

BLOCK_WAGE = "wage"
"""原因码:工资不够 —— 汇装段判(评分段手里没有薪资),见 wage_short_of;前端写「工资低于中位」。"""

REQ_K_FACTOR = "factor"
"""门槛行(pnp_requirements)的因素键 —— wage_floors_of 读工资行用。"""

REQ_K_BASIS = "basis"
"""门槛行的口径键。"""

REQ_K_TEER = "appliesTeer"
"""门槛行的适用 TEER 键("0,1,2,3";空 = 0-5 全管)。"""

REQ_K_COND = "appliesCondition"
"""门槛行的适用条件键。"""

REQ_FACTOR_WAGE = "wage"
"""门槛行的工资因素值。"""

REQ_BASIS_MEDIAN = "occMedian"
"""工资门槛口径:该职业该地区中位(安省)。"""

REQ_BASIS_LOW = "occLow"
"""工资门槛口径:该职业该地区低位(安省应届毕业生且 TEER 0-3;pnp on-req 的应届款那行)。"""

REQ_COND_RECENT_GRAD = "recent-on-graduate"
"""门槛行条件:安省应届毕业生。"""

TEER_ALL = (0, 1, 2, 3, 4, 5)
"""全部 TEER 档(门槛行 appliesTeer 为空 = 全管)。"""

K_LOW_ANNUAL = "lowAnnual"
"""工资格里的低位年薪(wage_of 那份 ESDC 工资的键)。"""

K_ACCESSIBILITY = "accessibility"
"""可及性档列。"""

K_SOURCE_LABEL = "sourceLabel"
"""来源显示标签列。"""

K_EMPLOYMENT_TERM = "employmentTerm"
"""雇佣期限列(E6-06/E6-07A,详情解析)。"""

K_EMPLOYMENT_HOURS = "employmentHours"
"""工时列。"""

K_APPLY_URL = "applyUrl"
"""投递地址列。"""

K_OFFICIAL_URL = "officialUrl"
"""官网列。"""

STATUS_OPEN = "open"
"""岗位状态:在招(mart 只出在招行,下架由 seed 按 closed_jobs/seen_ids 对账)。"""

STATUS_CAMPUS = "campus"
"""校内板帖的状态值(2026-09-13):在 jobs 表里与 open 并列的第三态 —— 不是 open(不上职位板、不进统计),
也不是 closed(详情页照常可看、seed 对账照常收关)。只有 ORIGIN_HIREAC 的帖用它。
2026-09-15 /coop 页撤销后,campus 帖在主板按渠道 HireAC 可见(主板取数本就是非 closed)。"""

UTC_OFFSET = "+00:00"
"""isoformat 的 UTC 偏移写法。"""

UTC_Z = "Z"
"""归一成 Z 结尾(与 JB 的 last_seen 同形)。"""

DEDUP_KEY_TPL = "{slug}|{title}"
"""展示去重键(**只服务展示**:前端不该出现一堆同公司同岗名)。
⚠ 与「本轮见过」是两件事:见过集不受这把尺子影响(2026-08-04 数据销毁修)。
2026-09-28 起展示去重改用 DEDUP_CITY_KEY_TPL(加城市);本键只剩「没帖号也没网址的岗」拿它当 externalId 兜底的旧形,
不改,免得这些岗换身份。"""

DEDUP_CITY_KEY_TPL = "{slug}|{title}|{city}"
"""展示去重键(2026-09-28 起;Frank 勾「检查,不全的下线」):公司 + 标题 + 城市,与库里 MARK_DUPS 的展示口径
(company_id × lower(title) × city)同一把尺子。原先只按公司 + 标题去重,连锁在几个城市招同一岗只有一条进 mart,
其余城市的那几条留在库里照常显示、却从不经过「全不全」的检查,数据也停在入库那一刻(接闸当晚实查 5,716 条,
至少 1,766 条缺数据)。城市与标题同一个归一(norm_title:只留小写字母数字)。"""

IN_JB_JD_INDEX = paths.PROCESSED_JOBBANK / "details" / "index.json"
"""Job Bank 详情索引(url → {pid, file, mtime, experience};jobbank 写侧维护,2026-09-13 汇装提速批 2(设计稿 docs/design/汇装提速-20260912.md §5;Frank「批2」))。"""

IN_JB_JD_BODIES = paths.PROCESSED_JOBBANK / "details" / "bodies"
"""Job Bank 正文桶目录(每桶 {url: 原文},桶 = 帖号 // JD_BUCKET_DIV;按命中懒读)。"""

IN_ATS_JD_INDEX = paths.PROCESSED_ATS / "index.json"
"""ATS 职位索引(url → {file, mtime, body};ats 写侧维护)。"""

JD_BUCKET_DIV = 100000
"""正文分桶的除数(jobbank 的分桶律本域自抄;两边改要一起改)。"""

JD_BUCKET_TPL = "{bucket}.json"
"""正文桶的文件名。"""

JD_BUCKET_NO_PID = "0"
"""取不到帖号的帖落的桶。"""

K_JD_PID = "pid"
"""Job Bank 索引行:帖号。"""

K_JD_BODY = "body"
"""ATS 索引行:正文。"""

DOMAIN_JOBBANK = "jobbank"
"""索引缺失提示里的域名。"""

DOMAIN_ATS = "ats"
"""同上。"""

MART_JD_INDEX_MISSING_TPL = ("✗ JD 索引不存在:{path} —— 先跑 python etl/{domain}/main.py --only jd_index 回填"
                             "(2026-09-13 批 2 起 mart 只认索引,不再扫 .md)")
"""索引缺失时的中止行。"""

FRONTMATTER_RE = re.compile(r"^---.*?\n---\s*", re.S)
"""frontmatter 整块(只剥第一处)。"""

JD_NOISE = (
    re.compile(r"–\s*Help\b", re.I),
    re.compile(r"^Green jobs contribute to environmental", re.I),
    re.compile(r"Learn more about green jobs", re.I),
    re.compile(r"provided by the employer; it was not verified by Job Bank", re.I),
)
"""Job Bank 页面样板噪音(E8-04 文案审计,2026-07-07 用户点名「莫名其妙+重复」):
帮助浮层(「Green job – Help」×3)/通用解释/免责腿被抓进 JD 正文。逐条:
① tooltip 标题行(xxx – Help,JB 用长横线;**不匹配连字符**,防误杀「- Help customers」类真内容);
② 通用解释(非本岗内容);③ 同上;④ 免责腿。
2026-09-12 汇装提速批 1:jobbank 已有同一份;过渡副本,批 2 随 mart 的 clean_jd 整段删。"""

JD_DEDUP_MIN = 40
"""只对长行去重(短行如 Yes/标签合法重复)。"""

MD_UNDERSCORE_RE = re.compile(r"(?<![\w\\/])_(?=\S)(.+?)(?<=\S)_(?!\w)")
"""正文里成对的下划线强调(雇主在招聘板的正文框里写了 markdown:`_Join a purpose-driven … day._`)。
2026-09-20 Frank 实拍「前后有下划线」。在招 886 条带这个。护栏:开合两端都不许贴单词字符 ——
snake_case、邮箱 a_b@c.com、文件名 my_file.txt、URL 末段一律不碰;`.` 不跨行,只在一行内配对。
⚠ 星号那档(`*full-time*`)现由 jobbank 域的 STAR_RE 在解析时剥,两档不在同一层,记欠账。"""

QMARK_APOS_RE = re.compile(r"(?<=[A-Za-z])\?(?=(?:re|ll|ve|s|t|d|m)(?![\w=&]))")
"""缩写里被打成问号的撇号(`We?re` / `You?ll` / `It?s`)。**源头就是坏的** —— Job Bank 页面的原始字节
存的就是单字节 0x3F,不是我们的编码问题(2026-09-20 取证:b'We?re');雇主那边 `’` 在进板之前就掉了。
在招 3,804 条带这个。还原成 `’` 而不是留着问号:英语里问号后面不会紧跟小写词缀还不空格,
这个形态几乎不可能是真问号。后瞻挡掉查询串(`example.com?s=1` 的 `?s` 后面跟 `=`,不动)。"""

QMARK_DASH_RE = re.compile(r"\s\?\s(?=[\d$])")
"""区间里被打成问号的破折号(`8:00 AM ? 4:30 PM`、`$19 ? $22`)。同上是源头坏的,在招 5,085 条。
只在**右边是数字或 $** 时还原 —— 英语里真问号前面不空格,加上这道后瞻就只剩区间形态;
`Monday ? Friday` 这种两侧都是词的不碰(宁可不改不瞎改)。"""

JD_DASH_MARK = " – "
"""区间破折号(en dash 两侧留空格,与原帖写法同形)。"""

JD_APOS_MARK = "’"
"""撇号(弯引号;正文里其余撇号也是这一种)。"""

JD_KEEP_GROUP = r"\1"
"""保留第一个捕获组(剥掉两端记号、正文原样)。"""

JD_HEAD_MARK_RE = re.compile(r"(?m)^##\s+")
"""行首节头标记(richtext 叶落的「## 」)。本域的清洗一律**先把它摘掉再比对**:
去噪与「Job Description」套话剥除都是锚在行首的正则,标记横在前面会让它们整体失效
(2026-09-20 立,设计稿 docs/design/职位正文结构下沉-20260920.md「mart 放行」一节)。
⚠ 只在比对时摘,落盘的行仍带标记 —— 标记是给原文轨用的,消费端各自剥。"""

BLANK_RUN_RE = re.compile(r"\n{3,}")
"""三个以上换行折成一个空行。"""



K_ELIGIBILITY_FLAG = "eligibilityFlag"
"""身份预筛红旗列。"""

K_ELIGIBILITY_QUOTE = "eligibilityQuote"
"""红旗的命中原句列(citation 惯例,可核验出处)。"""

JD_MATCH_TPL = ("  JD 正文匹配: {matched}/{total} 岗写入 description;"
                "身份预筛: no_sponsorship {no_sponsorship} · pr_required {pr_required}")
"""JD 下沉与身份预筛的收尾留痕。"""

MV_ADJ_MIN = -12
"""移民价值分的薪资分位调整下限(低于中位最多减 12)。"""

MV_ADJ_MAX = 15
"""同上上限(高于中位最多加 15)。"""

MV_ADJ_SCALE = 30
"""薪资相对中位的偏离 → 分数的换算系数。#100(Frank「移民价值分一片 87」):08 基分是 5 项
粗加合、**无薪资项** → TEER0/1 首发紧缺岗全落 87;补一项「薪资相对该 NOC 当地中位的分位」
拉开区分度 —— 薪资是连续信号又直接挂钩 PNP 工资门槛/EE 分数。
缺薪资或缺中位则不动(宁可留空不瞎猜,与全站口径一致)。"""

MART_DUP_NOTE = (
    "#125 批C 首跑教训:重复跨轮累积在 DB(同岗重发 externalId 会换),单轮 mart 快照内每岗"
    "唯一 → 快照内标记恒 0。isDup 改由 seed 事务内窗口 UPDATE 全量重算(见 cms seed route),"
    "mart 不再携带该位。"
)
"""为什么 jobs 行没有 isDup 列(删掉的东西也要留下「当初为什么」)。"""


# =========================================================================
# 9. mart:维度表(省/市/区/职业分类/来源/经验档/指定雇主)
# =========================================================================

I18N_NOC_FILE = "noc_titles_i18n.json"
"""NOC 职业名的中/韩译名缓存(#147,clean/04f 产;**固定参考集翻一次永久用**)。"""

I18N_CITY_FILE = "city_names_i18n.json"
"""城市名的中/韩译名缓存(#151,clean/04g 产)。缺条目=留空,前端回退只显英文
(宁可留空也不瞎猜;小镇本来就没有通行译名,不硬音译)。"""

PROV_FULL = {
    "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia", "AB": "Alberta",
    "SK": "Saskatchewan", "MB": "Manitoba", "NB": "New Brunswick", "NS": "Nova Scotia",
    "NL": "Newfoundland and Labrador", "PE": "Prince Edward Island",
}
"""省码 → 全名(provinces 维度表的十行;顺序即落盘序)。"""

PROV_ON = "ON"
"""安省(评分的基准省:非 ON 扣分)。"""

PROV_NL = "NL"
"""纽芬兰(官方指定雇主名录整省让位旧聚合源)。"""

PROV_PE = "PE"
"""爱德华王子岛(指定雇主出处走 Wayback 存档页)。"""

PROV_AB = "AB"
"""阿尔伯塔(运营统计分派)。"""

PROV_SK = "SK"
"""萨斯喀彻温(同上)。"""

PROV_BC = "BC"
"""不列颠哥伦比亚(同上)。"""

PROV_NS = "NS"
"""NS 省码(ops 统计分发用;2026-09-08 ns-stats.json 接入)。"""

PROV_NB = "NB"
"""NB 省码(ops 统计分发用;2026-09-29 nb-stats.json 接入:PETL 年报的往年已发提名,走逐年通用填法)。"""

PROV_MB = "MB"
"""曼尼托巴(同上)。"""

PROV_FED = "FED"
"""联邦(pnp_draws 里 EE 历次抽选的 province 值;省块按 province 过滤天然不串味)。"""

PROV_QC = "QC"
"""魁省省码(ops 统计分发用;2026-09-30 qc-stats.json 接入:年度移民计划的技术工人甄选计划区间当配额)。"""

IN_IRCC_TR = paths.IRCC / "temp_residents.json"
"""E8-12 省弹框体量卡:学签/工签年末存量。"""

IN_STATCAN = paths.IRCC / "statcan_tr_prov.json"
"""竞争卡存量(StatCan 常住估算,方案C 2026-08-15 —— IRCC 年末表停在 2024)。"""

IN_IRCC_PR = paths.IRCC / "pnp_admissions.json"
"""PNP 类别 PR 登陆数。"""

IN_IRCC_ALLOC = paths.IRCC / "pnp_allocations.json"
"""PNP 年度提名配额(人工核对维护表)。"""

IN_IRCC_FLOW = paths.IRCC / "study_flow.json"
"""新发学签流量(月度;2026-08-03 接入,存量停在 2024 时的当期口径)。"""

TR_STOCK_KEYS = (("study", "study"), ("tfwp", "tfwp"), ("imp", "imp"))
"""体量卡三块存量的(源键, 落盘键)。"""

K_BY_PROV = "byProv"
"""按省索引的键(IRCC/StatCan 各表通用)。"""

K_PROV = "prov"
"""配额维护表里的省列(与 K_PROVINCE 不同名,源表如此)。"""

K_TR_SERIES = "trSeries"
"""常住估算年份序列的挂点。"""

K_PNP_PR = "pnpPr"
"""PR 登陆数的挂点。"""

K_STUDY_FLOW = "studyFlow"
"""新发学签流量最新年的挂点。"""

K_FLOW_SERIES = "flowSeries"
"""流量年份序列的挂点(近 5 年,竞争卡年份筛选用;进行年 complete=false 带 throughMonth)。"""

K_ALLOC = "alloc"
"""年度提名配额的挂点。"""

YEAR_LEN = 4
"""年份串长度(从 'YYYY-MM-01' 取年)。"""

MONTH_LEN = 7
"""'YYYY-MM' 长度(进行年的 asOf 标到季度月)。"""

YEAR_START_TPL = "{year}-01-01"
"""次年 1/1 参考日(≈年末 12/31 的 StatCan 口径)。"""

YEAR_END_TPL = "{year}-12"
"""年末档的 asOf 标注。"""

TR_SERIES_YEARS = 3
"""常住估算只带最近 3 年。"""

FLOW_SERIES_YEARS = 5
"""学签流量序列只带最近 5 年。"""

CITY_I18N_KEY_TPL = "{city}|{province}"
"""城市译名表的键形。"""

IN_CITY_MACRO = paths.STATCAN / "city_macro.json"
"""段9 输入:城市刻度(statcan 域段6 产,CSD 人口 + CMA 失业率;2026-09-11 城市段批二)。
文件缺席 = 五格全空(维度装配照跑,城市段人口/失业率列整列不渲)。"""

K_CM_POP = "population"
"""city_macro 行键 / cities 行键:CSD 人口(官方没有 = null,不折 0)。"""

K_CM_POP_PERIOD = "popPeriod"
"""city_macro 行键 / cities 行键:人口期标。"""

K_CM_UNEMP_RATE = "unempRate"
"""city_macro 行键 / cities 行键:所在 CMA 失业率(百分点;🔴 CMA 口径,展示层列名必须写
「都会区失业率」;不在 CMA = null)。"""

K_CM_UNEMP_PERIOD = "unempPeriod"
"""city_macro 行键 / cities 行键:失业率期标(月)。"""

K_CM_CMA = "cma"
"""city_macro 行键 / cities 行键:所在 CMA 成员名。"""

TEER_NONE_SORT = -1
"""noc_categories 去重排序时 TEER=None 的替身(落盘时还原成 None)。"""

K_BROAD_EN = "broadEn"
"""大类英文名。"""

K_BROAD_KO = "broadKo"
"""大类韩文名。"""

K_MID_EN = "midEn"
"""中类英文名。"""

K_MID_KO = "midKo"
"""中类韩文名。"""

K_FINE_EN = "fineEn"
"""小类英文名。"""

K_FINE_KO = "fineKo"
"""小类韩文名。"""

I18N_BLANK = (None, None)
"""分类译名查不到时的空对(英/韩两格都留空,前端回退)。"""

IN_NL_EMPLOYERS = paths.PNP / "nl-employers.json"
"""NL 官网指定雇主 645 家(C4-W4,含申报 NOC)。"""

IN_AIP = paths.AIP / "aip-designated-employers.json"
"""旧 AIP 指定雇主聚合源(不含申报职位/逐家页)。"""

SOURCE_AIP = "AIP"
"""指定雇主的制度来源标签:大西洋移民计划。"""

SOURCE_RCIP = "RCIP"
"""同上:乡村社区试点(社区雇主行没写 type 时的兜底)。"""

PE_DESIGNATED_URL = ("https://www.princeedwardisland.ca/en/information/office-of-immigration/"
                     "atlantic-immigration-program-designated-employers")
"""PE(B4)指定雇主的出处 = 官方名单页(经 Wayback 存档取),fetched=快照日期 ——
引证惯例出处随行。"""

IN_PILOT_EMP = [paths.RCIP / "rcip-employers.json", paths.FCIP / "fcip-employers.json"]
"""批B:社区指定雇主(人工核对整理,agent 抽取+抽查)。批E(2026-08-31 pilot 拆三域
rcip/fcip,Frank「拆成三个 很少有人有法语」)后一分为二,汇装读**并集**(mart 表形状不变);
顺序 rcip 前 fcip 后 = 旧单文件内的相对序。"""

DESIGNATED_DEDUP_TPL = "  designated 全同去重: {before} -> {after}"
"""全同去重的留痕。"""


# =========================================================================
# 10. mart:pnp 五表(通道清单 / 抽选事实 / 分值表 / 门槛 / 运营统计)
# =========================================================================

IN_DRAW_STREAM_ZH = paths.PROCESSED / "draw_stream_zh.json"
"""#280:抽选流名中文灰注缓存(pnp 域 translate_draw_streams 本地 qwen 批译产,增量缓存)——
缺这个文件(还没跑过批译)= streamZh 全列 None,前端优雅回退纯英文,不是报错。"""

K_ZH = "zh"
"""译名缓存里的中文格。"""

IN_DRAW_CHECKLISTS = paths.PROCESSED / "draw_checklists.json"
"""抽选类别门槛清单(人工核定表,2026-09-13 Frank「用户只想知道门槛是什么。比如 1 2 3 这种」「先简化」「先出一版」):
键=抽选类别官方名(pnp_draws.stream),值 = {url: 官方页, items: [{zh, en, ko}]}。整个对象序列化成 JSON 串进 pnp_draws.checklist;
缺键的类别留 None(弹框出「本站未收录」)。写清单的依据是 pnp_requirements 里抓的官方条文,条文本身不上页面。
(前身:对照表 draw_rule_streams.json 按通道 / 项目 / 职业清单筛官方条文,同日 Frank「需要这么复杂吗」撤。)"""

K_CL_URL = "url"
"""清单里的官方页格。"""

K_CL_ITEMS = "items"
"""清单里的条目格。"""

IN_PNP_DRAWS_DIR = paths.PNP
"""省抽选事实(BC/AB/MB+ON 通告,pnp 域 build_draws 产,E6-04)。
2026-09-26 晚 pnp 抽选按省拆(Frank 选「按省拆」):原 `IN_PNP_DRAWS = paths.PNP / "draws.json"` 九省一份,
改为本目录下一省一份(IN_PNP_DRAWS_GLOB),每份外形照旧 {source, fetched, provinces: {省: 块}}、只装一省;
产出方 pnp 域 put_prov_draws。某省单元失败时它那份文件保留上一版(fetched 不前移),其余省照常。"""

IN_PNP_DRAWS_GLOB = "draws-*.json"
"""各省抽选文件的样式(2026-09-26 晚;与 pnp 域 DRAWS_FILE_GLOB 同形,域间不互取常量,各自声明)。"""

NO_PNP_DRAWS_TPL = "{dir} 下一份 {glob} 都没有 —— pnp 抽选单元出事了,不出空表(空表灌库会清掉线上全部省抽选)"
"""省抽选一份都读不到的报错(2026-09-26 晚按省拆时立;原先文件缺失静默出 0 行)。"""

K_PROVINCES = "provinces"
"""抽选表按省索引的键。"""

K_DRAWS = "draws"
"""某省的历次抽选。"""

K_NOTICE = "notice"
"""某省的改制通告。"""

DRAW_MAX = 12
"""普通省的抽选截断(C4 放宽:8→12)。
2026-09-26 改判(lead 定;依据:弹框新上的「近 90 天 N 轮 / 共邀请 X 人」按本表算,BC 一轮拆多行,12 行盖不住
90 天会少算):每省不再按「最新 N 行」截,改成「最近 DRAW_WINDOW_MONTHS 个月的全部行」(按 drawDate;
只到月的 NS 行按月末算,见 functions.draw_day_of)。本常量不再被引用,原文保留作沿革。"""

DRAW_MAX_WIDE = 48
"""NB/MB 的抽选截断 = 一年的量(与 pnp 域 build_draws 的 NB 上限一致)。
NB 按类别定向邀请、一轮拆多行,判定层要数「某职业类别 2026 年被选中几轮」。
MB 2026-08-31 并入同档:同为一轮拆 4-5 行(总行+分流细分行),12 行只装两三轮,
08-27 新轮落地把 #275 的 825 细分行挤出窗口 —— c01 金标当场红,判据与 NB 全同。
2026-09-26 改判(lead 定;依据:弹框新上的「近 90 天 N 轮 / 共邀请 X 人」按本表算,BC 一轮拆多行,12 行盖不住
90 天会少算):每省不再按「最新 N 行」截,改成「最近 DRAW_WINDOW_MONTHS 个月的全部行」(按 drawDate;
只到月的 NS 行按月末算,见 functions.draw_day_of)。本常量不再被引用,原文保留作沿革。
判定层「数一年被选中几轮」的需要,12 个月窗口同样满足(整年的轮次都在窗里)。"""

DRAW_WIDE_PROVS = ("NB", "MB", "AB")
"""吃 DRAW_MAX_WIDE 的省。2026-09-24 加 AB(九省通道审计:12 条只装得下最近几个月,旅游酒店、警务两组被截在外面)。
2026-09-26 改判(lead 定;依据:弹框新上的「近 90 天 N 轮 / 共邀请 X 人」按本表算,BC 一轮拆多行,12 行盖不住
90 天会少算):每省不再按「最新 N 行」截,改成「最近 DRAW_WINDOW_MONTHS 个月的全部行」(按 drawDate;
只到月的 NS 行按月末算,见 functions.draw_day_of)。本常量不再被引用,原文保留作沿革。"""

DRAW_WINDOW_MONTHS = 12
"""pnp_draws 每省收多少个月的抽选(2026-09-26 lead 定,替代 DRAW_MAX / DRAW_MAX_WIDE 的「最新 N 行」):
今天往前 12 个月的同一天起(含),该省全部抽选行都进表;改制通告行照旧不受窗口限制。
原 functions.draw_limit_of 的注释随函数退役搬来,原文:「截断放宽(C4):普通省 8→12;NB 按类别定向邀请、一轮拆多行,
判定层要数「某职业类别 2026 年被选中几轮」→ 给一年的量(48,与 build_draws 的 NB 上限一致)。
MB 2026-08-31 并入同档:同为一轮拆 4-5 行(总行+分流细分行),12 行只装两三轮,
08-27 新轮落地把 #275 的 825 细分行挤出窗口 —— c01 金标当场红,判据与 NB 全同。」"""

DRAW_MONTHS_PER_YEAR = 12
"""月份进位(窗口起点按「年 × 12 + 月」倒推)。"""

DRAW_MONTH_RE = re.compile(r"(\d{4})-(\d{2})")
"""只到月的 drawDate(NS 月度选取行「2026-07」;fullmatch 用)。"""

DRAW_KIND_DRAW = "draw"
"""行类型:一次抽选。"""

DRAW_KIND_NOTICE = "notice"
"""行类型:改制通告。"""

SCALE_CRS = "CRS"
"""联邦 EE 的分制(各省分制互不相通且都非 CRS,scale 标注,纯事实展示层,不进评分/匹配)。"""

EE_ROUNDS_URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/"
                 "policies-operational-instructions-agreements/ministerial-instructions/"
                 "express-entry-rounds.html")
"""#135(Frank「点开按时间线看每一轮」):联邦 EE 历次抽选的官方出处。该表列型完全够用
(scale/score/invitations/stream/drawDate),**零新表零 DDL**;时间线页改读这里的 FED 行
(原来单独查 ee_categories 只有最近一期,现在有历史且不重复)。"""

IN_NOC_DESC = paths.NOC / "descriptions.json"
"""NOC 官方名+主要职责(noc 域 build_statcan_noc_descriptions 产)。"""

K_BY_NOC = "byNoc"
"""按 NOC 索引的键。"""

K_ANY_TRADE = "anyTrade"
"""官方那条「Any Trade」(不给 NOC,只说「持 SkilledTradesBC 证书的技工」)。"""

BROAD_TRADES = "技工"
"""本站分类树的技工大类(anyTrade 展开成它)。2026-09-23 大类重排后这是**桶级**大类名(noc.bucket_broad_of):
技工桶拆进了建筑 / 机修技工两个新大类,按桶级「技工」展开口径不变。"""

IN_SCORE_TABLES = [paths.PNP / "bc-sirs.json", paths.PNP / "sk-points.json",
                   paths.PNP / "on-points.json", paths.PNP / "mb-points.json",
                   paths.PNP / "nl-points.json", paths.PNP / "ab-eoi-points.json"]
"""省提名官方打分表(E12-09)—— 一省一个文件,加省就往这个 list 里加,组装逻辑不用改。
BC=SIRS 200 分制(pnp 域 build_bc_sirs 从官方 PDF 抓)/ SK=SINP Points Grid 110 分制
(build_sk_points 抓官网表)/
AB=AAIP Worker EOI Points Grid 100 分制(2026-08-14 加,官方 PDF 人工核对:
data/crawl/ab-aaip/im-worker-stream-expression-of-interest-points-grid.pdf)。
⚠ NL 只对 Express Entry Skilled Worker 使用 Annex A 100 分表(67 分门槛);普通 NL EOI 仍按
公开优先标准择优,没有数值权重。两者不能混成「整个纽省都按 67 分」。"""

K_GROUP_MAX = "groupMax"
"""官方分组上限表(SK 那种「分了 FACTOR I/II 且各有上限」的省才有;BC 无分组 → 留空)。"""

K_FACTORS = "factors"
"""分值表的因素表。"""

K_RULE = "rule"
"""因素级规则串(wage 那类「规则不穷举」的:points 为空,rule 里写公式)。"""

SCORE_FACTOR_KINDS = ("rows", "bonus")
"""一个因素下的两种档位块(顺序即落盘序)。"""

SCORE_KIND_ROW = "row"
"""落盘的档位行类型(源键 'rows' 去掉复数)。"""

SCORE_KIND_RULE = "rule"
"""落盘的规则行类型。"""

SCORE_RULE_KEYS = ("rule", "floorAt", "capAt")
"""规则行的 json 串带哪三格。"""

IN_REQ_TABLES = [paths.PNP / "bc-req.json", paths.PNP / "on-req.json", paths.PNP / "ab-req.json",
                 paths.PNP / "sk-req.json", paths.PNP / "mb-req.json", paths.PNP / "ns-req.json",
                 paths.PNP / "nb-req.json", paths.PNP / "pe-req.json", paths.PNP / "nl-req.json",
                 paths.IRCC / "pgwp_rules.json", paths.IRCC / "fees.json",
                 paths.EE / "fed-eligibility.json", paths.EE / "category-rules.json", paths.IRCC / "aip_rules.json",
                 paths.IRCC / "rcip_rules.json", paths.IRCC / "fcip_rules.json",
                 paths.PNP / "qc-req.json", paths.PNP / "qc-peq-req.json"]
"""省提名官方**门槛**(规则引擎第一刀)—— 打分表管「能打几分」,这张管「打分之前先要满足什么」。
一省一个文件,加省=往这个 list 里加一个(pnp 域 build_<省>_req 产,列同一套)。后四份是联邦段:
  B1-4 PGWP 规则库(province='FED' program='PGWP',ircc 域产,quote-anchored)——
       走同一张表=引擎 facts.requirements 免费拿到;FED 行不会漏进省级门槛节(那边按省名挑行);
  G8  联邦段官方规费(program='PR-fees',ircc 域产)—— 第三次复用,同上安全;
  G9  联邦 Express Entry 三个项目的资格门槛(province='FED',ee 域产,quote-anchored)。
  2026-09-06 再加 rcip_rules / fcip_rules(eligibility 域产,program='RCIP'/'FCIP',与 aip_rules 同形,
       aip_rules 本身也随 aip 域规则步搬入 eligibility 域,路径不变)。
      **一个文件三个项目** → program 逐行写在 requirements[].program('CEC'/'FSW'/'FST'),
      表级只有 province —— 按行覆盖 program,零新表;
  G-AIP 联邦大西洋移民计划(AIP)申请人门槛(province='FED' program='AIP',aip 域产,
      quote-anchored)—— #287 一键三合一判定的硬前置(设计
      docs/design/一键三合一判定-20260809.md §4:此前 AIP 申请人侧生产 0 行)。
  魁省两份(pnp/qc 子域产 qc-req.json / qc-peq-req.json,province='QC',program 'PSTQ' / 'PEQ')**暂不加**
      (2026-09-29;设计 docs/design/魁省门槛弹框-20260929.md 批 C):判定引擎 / 官方规则页那条读全表的 SQL 先上排除挡板、
      门槛卡的读取 SQL 先放行 province='QC',cms 换版之后再把两份加进来 —— 先加这里,build 容器下一轮就把魁省行灌进生产库,
      挡板没上线的那几个页面会先读到。
      2026-09-30 cms 换版到 443d78b6(挡板与放行都已上线)后加进来(Frank「可以,按四步执行」第三步)。"""

K_REQUIREMENTS = "requirements"
"""门槛表的行清单键。"""

REQ_NO_PROVINCE_TPL = "  ⚠ {name} 缺表级 province → {n} 条门槛会落成 province='',引擎挑不到"
"""源表没写 province = 引擎按省挑行永远挑不到这几条,而且一声不吭(G9 实撞:
fed-eligibility.json 起初没有表级 province)。宁可吵一句,别静默丢门槛。"""

REQ_ROW_OVERRIDES = ("url", "program", "fetched", "pageUrl")
"""一条门槛可以自带的三格出处/项目(没写才回退表级)。
2026-09-30 通道补全批一 1b 加第四格 pageUrl:一张省表装几条通道时(NL 技术工人 / 国际毕业生 / 快速通道技术工人)各通道的人可读页
不同,判定引擎按行读它当「官网」链接 —— 原先 NL 国际毕业生三行都落在技术工人页。
url:ON 的申请人侧在通道页、雇主侧在雇主指南;
program:联邦 EE 一个文件装 CEC/FSW/FST 三个项目(G9),三者的门槛互不通用 —— 落成同一个
program 会让引擎拿 FST 的工时去卡 CEC 申请人。逐行覆盖,表级 program 仍是默认。"""

REQ_BASIS_SEP = ";"
"""basis 包的 `k=v;k=v` 分隔符。"""

REQ_VALUE_CODE_TPL = "valueCode={code}"
"""编码字符串折进 basis 的形。value 列是 **integer**:G9 的 EE 规则里 13/23 条的 value 是编码
字符串('0,1,2,3' / 'outside-QC' / 'eca-required' …),直灌 → 22P02 → 整个 seed 事务回滚。
照 pgwp 的 rule 行先例:value 留空,机器可读的编码折进 basis(它已经装着
windowYears=3;minYears=1 这类口径)。valueText=官方原文,一个字不动。"""

SUBJECT_APPLICANT = "applicant"
"""门槛的默认主体(另一种是雇主侧)。"""

OP_GTE = ">="
"""门槛的默认比较符。"""

IN_PNP_STATS = [paths.PNP / "ab-stats.json", paths.PNP / "sk-stats.json",
                paths.PNP / "bc-stats.json", paths.PNP / "mb-stats.json",
                paths.PNP / "on-stats.json", paths.PNP / "ns-stats.json",
                paths.PNP / "bc-nominations.json", paths.PNP / "pe-stats.json",
                paths.PNP / "nb-stats.json", paths.PNP / "nl-stats.json",
                paths.PNP / "qc-stats.json"]
"""G5 省级官方运营统计(配额/已发/剩余、积压游标、EOI 池、处理时长、SIRS 池分布)——
一省一个文件,加省=往这个 list 里加一个;各省字段形状不同,按 province 分派。
2026-09-29 加 NB / NL 两份(省年报 PDF:NB 往年已发提名、NL 往年提名人数;pnp 域 nb_stats / nl_stats 两步产出)。"""

PAREN_RE = re.compile(r"\s*\([^()]*\)")
"""通道名归一第一刀:去括号补充说明(可能不止一处)。
规则而不是映射表(官网改个字映射表就失效):括号里一律是补充说明不是通道身份。"""

EDGE_PUNCT_RE = re.compile(r"^[^\w]+|[^\w]+$")
"""通道名归一第三刀:去首尾标点(「Total:」→ total)。"""

STREAM_KEY_FIX: dict = {}
"""规则切不动的个例才手写进来(照 04g 的 SHORT_FIX 惯例;**留空是有意的,不是忘了**)。
撞车检测在 warn_stream_key_clash。"""

K_STREAM_KEY = "streamKey"
"""通道名归一键的列名(跨指标 join 用,**不展示给用户**;scope 原样保留官方措辞,报告要引用)。"""

K_METRIC = "metric"
"""指标名列。"""

K_SCOPE = "scope"
"""指标的范围列(通道/行业/分数段/阶段,省级留空)。"""

STREAM_CLASH_TPL = ("  ⚠ streamKey 撞车 {province}/{metric}: "
                    "「{first}」与「{second}」都压成 '{key}' → 加 STREAM_KEY_FIX 裁决")
"""撞车留痕(静默合并两条通道比漏配更毒)。"""

UNIT_SPOTS = "spots"
"""单位:名额。"""

UNIT_PEOPLE = "people"
"""单位:人。"""

UNIT_TEXT = "text"
"""单位:自由文本(积压游标这类永远 value=None + 原文)。"""

UNIT_WEEKS = "weeks"
"""单位:周。"""

UNIT_MONTHS = "months"
"""单位:月。"""

UNIT_DAYS = "days"
"""单位:天。⚠️ 单位不换算:官方发 months 就 processing_months、发 weeks 就 processing_weeks、
发 days 就 processing_days。3 个月折成 13 周 = 替官方编了个它没给的精度(BC 只说「约 80% 的
案子在 3 个月内」)。metric 名带单位后缀,消费端一眼看得出官方到底给的是什么。"""

UNIT_FLAG = "flag"
"""单位:标记(value=1 表「在清单里」—— 留 None 会和「官方不公布」混淆)。"""

UNIT_PERCENT = "percent"
"""单位:百分比。"""

UNIT_NOMINATIONS = "nominations"
"""单位:提名数。"""

UNIT_APPLICATIONS = "applications"
"""单位:申请件数。"""

SCOPE_STREAM = "stream"
"""scopeKind:通道(**只有它算 streamKey**)。"""

SCOPE_SECTOR = "sector"
"""scopeKind:行业。"""

SCOPE_CATEGORY = "category"
"""scopeKind:类别。"""

SCOPE_SCORE_RANGE = "scoreRange"
"""scopeKind:分数段。"""

SCOPE_STAGE = "stage"
"""scopeKind:处理阶段。"""

SCOPE_PROGRAM = "program"
"""scopeKind:项目(2026-09-29 抽选卡重排:全年合计 AIP 那一份,scope = AIP)。"""

SCOPE_DRAW_STREAM = "drawStream"
"""scopeKind:抽选组(scope = 抽选行 stream 原值;2026-09-29 Frank「每一个通道也需要一个总数吧」,选「单独一行靠右」:省提名弹框
各组组头第三行读它)。不用 SCOPE_STREAM —— 那一种是配额表的通道级行(按 stream_key 归一、配额卡「本岗通道」那一行按它挑),
抽选组名与配额通道名写法不同,混在一起会让配额卡挑到抽选合计。"""

PRINT_STREAM_YTD_SKIP_TPL = "  · pnp_ops_stats {prov}「{stream}」不出本年合计:{year} 年有 {n} 轮人数没公布、日期认不出或项目认不出"
"""抽选组本年合计不出的留痕(一组一行;2026-09-29)。"""

PRINT_YTD_MIXED_TPL = "  · pnp_ops_stats {prov} {share} 不出本年合计:{year} 年计入的各轮人数口径不一(见抽选行 unit 格)"
"""一份合计里各行 unit 格不一的留痕(2026-09-29;邀请与选取人数加在一起是假数)。"""

TOTAL_WORD = "total"
"""哨兵行判据(AB「Total:」→ 省级 eoi_pool_total;SK「Total」行 → 省级配额)。"""

AB_SUMMARY_METRICS = (("allocation", "allocation"), ("issued", "issued"),
                      ("remaining", "remaining"), ("to_process", "toProcess"))
"""AB 的四个(指标名, 源键):省级汇总 + 逐通道各出一行。"""

AB_SPOT_METRICS = ("allocation", "remaining")
"""AB 四指标里单位是 spots 的两个(其余是 people)。"""

K_SUMMARY = "summary"
"""AB 的省级汇总块。"""

K_ASSESSING_UP_TO = "assessingUpTo"
"""AB 的积压游标(自由文本日期 → 永远 value=None + 原文)。"""

METRIC_ASSESSING = "assessing_up_to"
"""同上的指标名。"""

K_EOI_POOL = "eoiPool"
"""EOI 池块。"""

K_COUNT = "count"
"""池内人数。"""

METRIC_EOI_POOL = "eoi_pool"
"""逐通道池内人数。"""

METRIC_EOI_POOL_TOTAL = "eoi_pool_total"
"""省级池内人数总计。"""

AB_DRAWS_NOTE = "AB 的 draws[] 忽略:抽选史 canonical 归 pnp 域 build_draws(本表不重复)。"
"""为什么 AB 运营统计不出抽选行。"""

K_ADDITIONAL_FEDERAL = "additionalFederal"
"""ab-stats.json 里额外联邦名额的键(一类一行:category / issued / label;2026-09-29 立。域间不互取常量,键名照 pnp 域
各自声明)。"""

K_ISSUED = "issued"
"""额外联邦名额一行的已发提名数。"""

METRIC_NOM_ADDITIONAL_FEDERAL = "nominations_additional_federal"
"""AB 额外联邦名额的已发提名(医生 / 法语者一类一行,scope = 官方类别名;2026-09-29 立)。官方原句「… will not count
toward Alberta’s 6,603 nomination allocation.」—— 不占本省配额,所以单立指标名:不并进 issued、不碰 allocation /
remaining(省提名弹框配额卡与把脉页「已发提名」读 issued,并进去 = 把配额外的提名算成占了配额)。"""

METRIC_PROCESSING_WEEKS = "processing_weeks"
"""SK 的处理时长(周)。"""

K_GROUP = "group"
"""SK 处理时长的分组。"""

K_WEEKS = "weeks"
"""SK 处理时长的周数(null → 原文 raw「N/A」)。"""

K_RAW = "raw"
"""官方原文格。"""

SK_PROC_LABEL_TPL = "{group}: {category}"
"""SK 处理时长的 label 形。"""

K_ALLOCATION = "allocation"
"""配额块。"""

K_SECTOR = "sector"
"""行业键。"""

SK_ALLOCATION_METRICS = (("allocation", "allocation", UNIT_SPOTS),
                         ("nominations_ytd", "nominationsYtd", UNIT_NOMINATIONS))
"""SK 配额块的两个(指标名, 源键, 单位)。"""

K_CAPPED_SECTORS = "cappedSectors"
"""SK 的封顶行业块。"""

SK_CAPPED_METRICS = (("capped_pct", "pct", UNIT_PERCENT),
                     ("capped_spots", "spots", UNIT_SPOTS))
"""SK 封顶行业的两个(指标名, 源键, 单位)。"""

K_PRIORITY_SECTORS = "prioritySectors"
"""SK 的优先行业清单。"""

METRIC_PRIORITY_SECTOR = "priority_sector"
"""优先行业的标记行指标名。"""

K_SCORE_RANGE = "scoreRange"
"""BC 池分布的分数段。"""

K_REGISTRATIONS = "registrations"
"""BC 池分布的注册人数(「<5」= 官方隐私抑制 → None + 原文)。"""

METRIC_SIRS_POOL = "sirs_pool"
"""BC 池分布的指标名。"""

K_PROCESSING = "processing"
"""处理时长块(BC 是 dict、SK/MB 年报是 list —— 各表形状不同,按省分派)。"""

K_AS_OF = "asOf"
"""口径日。"""

K_PERCENTILE_LABEL = "percentileLabel"
"""BC 处理时长的百分位标签(「约 80% 的案子」)。"""

K_STAGE = "stage"
"""BC 处理时长的阶段。"""

BC_PROC_METRIC_TPL = "processing_{unit}"
"""BC 处理时长的指标名(单位入名)。"""

BC_PROC_LABEL_TPL = "{pctl}: {stage} — {raw}"
"""BC 处理时长的 label(带百分位)。「约 80% 的案子」这句进每一行 label:它就是这三个数的
全部意义,分开存迟早会有人把它读成「所有案子」。"""

BC_PROC_PLAIN_TPL = "{stage} — {raw}"
"""同上(官方没印百分位时)。"""

BC_PROC_SECTION = "Skills Immigration — Processing times"
"""BC 处理时长的节名。处理时长与池分布**不同源、不同口径日**(池子那页印 as-of,时长这页
不印)→ 用自己那一节的出处,别让报告拿池子的 as-of 去给时长背书。"""

K_MONTHLY = "monthly"
"""MB 的月度数据页块。"""

K_ANNUAL = "annual"
"""MB 的年报块。MB 有**两个**官方源,各自的 url/fetched/统计期都不一样 —— 一行的出处必须
指向那个数字真正的来源页,别拿月度页给年报的处理天数背书。"""

K_THROUGH_MONTH = "throughMonth"
"""MB 月度表的截止月(月度表是**年初至今累计**,期次必须写明到哪个月)。"""

MONTH_ABBR_LEN = 3
"""月份缩写取三个字母(Jan/Feb/…)。"""

MB_YTD_TPL = "{year} Jan-{month}"
"""MB 年内累计的期次形。"""

QUARTER_RE = re.compile(r"(\d{4})Q([1-4])")
"""季度口径的期次(SK 官方统计表「2026Q2」;fullmatch 用)。"""

QUARTER_END_MONTH = {"1": "03", "2": "06", "3": "09", "4": "12"}
"""季度号 → 该季最后一个月的两位月号(季度口径的截至月;2026-09-27 省提名弹框「2026 年配额」卡的「截至」行用)。"""

METRIC_ALLOCATION = "allocation"
"""配额指标名。"""

K_ENHANCED_YTD = "enhancedYtd"
"""MB 的 Enhanced 年内已发块。"""

METRIC_NOM_ENHANCED_YTD = "nominations_enhanced_ytd"
"""同上的指标名。"""

MB_YTD_GROUPS = (("nominationsYtd", "nominations_ytd", UNIT_NOMINATIONS),
                 ("refusalsYtd", "refusals_ytd", UNIT_APPLICATIONS),
                 ("laaYtd", "laa_ytd", "invitations"),
                 ("receivedYtd", "applications_received_ytd", UNIT_APPLICATIONS))
"""MB 月度页的四组年内累计(源键, 指标名, 单位)。"""

MB_SECTION_TPL = "{page} — {section}"
"""MB 行的节名形(页名 — 节名)。"""

MB_GROUP_LABEL_TPL = "{section}: {label}"
"""MB 行的 label 形。"""

K_INVENTORY = "inventory"
"""MB 的库存块。"""

MB_INVENTORY_METRICS = (("in_assessment", "inAssessment", "In Assessment"),
                        ("pending_assessment", "pending", "Pending"),
                        ("inventory", "total", "Total"))
"""MB 库存的三个(指标名, 源键, 官方标签)。库存是**某个月首个工作日的快照**,不是「当前」:
period 写死到月份,谁引用都得带上。"""

K_MONTH = "month"
"""MB 库存快照的月份。"""

K_EOI_POOL_QUARTERS = "eoiPoolQuarters"
"""ns-stats.json 里 NS 候选池季末库存清单的键(新到旧,一季一行;2026-09-29 立。域间不互取常量,键名照 pnp 域各自声明)。"""

K_ASSESSMENTS_YTD = "assessmentsYtd"
"""ns-stats.json 里 NS 本年审批结果累计的键(批准 / 拒签 / 撤回各一行;2026-09-29 立)。"""

K_RESULT = "result"
"""NS 审批结果行的官方结果词键。"""

NS_RESULT_METRICS = {"Approved": ("nominations_ytd", UNIT_NOMINATIONS),
                     "Refused": ("refusals_ytd", UNIT_APPLICATIONS),
                     "Withdrawn": ("withdrawals_ytd", UNIT_APPLICATIONS)}
"""NS 官方结果词 → (指标名, 单位)(2026-09-29 立)。批准与 MB / SK 的年内已发提名同名 nominations_ytd —— 省提名弹框
「{年} 年配额」卡的「已发提名」那列直接读;拒签与 MB 同名 refusals_ytd;撤回是新指标 withdrawals_ytd。"""

NS_RESULT_SKIP_TPL = "  · pnp_ops_stats NS 审批结果词「{result}」不认识,不出行(官方加了新结果类别?核对 NS_RESULT_METRICS)"
"""认不出的结果词留痕(不静默丢)。"""

METRIC_PROC_COMMITMENT = "processing_commitment"
"""MB 年报的处理承诺指标名。"""

K_COMMITMENT_LABEL = "commitmentLabel"
"""处理承诺的官方标签。"""

K_COMMITMENT_MONTHS = "commitmentMonths"
"""处理承诺的月数。"""

K_LABEL_YEAR = "labelYear"
"""EOI 池在册人数的官方标签年。**period 取官方标签里写的那一年,不按报告年推** ——
2024 年报把它标成「end of 2023」而 2023 年报同年份给 20,392,官方自相矛盾;我们只做两件事:
取最新一份年报、把官方原句原样放进 label。谁要纠这个错去找 MPNP。口径是**年度快照**,
与 AB 的实时池不可混用(显示层分别标注,见 caseFacts 的注释)。
2026-09-29 Frank 拍板改判(见 fill_mb_annual_ops):period 改记年报年;本格只剩一个用处 —— 认「原句里写的年 ≠ 年报年」,
认出来就在 label 句尾加「 [sic]」。"""

K_EOI_POOL_YEARS = "eoiPoolYears"
"""mb-stats.json 里年报池子人数历年清单的键(一年一行,每行自带年报网址 / 抓取日 / 出处节名;2026-09-29 立。
域间不互取常量,键名照 pnp 域各自声明)。"""

MB_POOL_AS_OF_TPL = "{year}-12"
"""MB 年报池子一行的截至月(2026-09-29 立):年报原句都是「N Active EOI profiles at the end of <年>」= 年末快照 → 该年
12 月(只到月,不编日子;同 NS 季表记季末月的口径)。历年多行后案例页 PNP_OPS_STATS 按 COALESCE(as_of, period) 取每省
最新一行 —— asOf 全是空串时八行并列,取哪行看运气;记上年末月,最新一年稳居第一。"""

MB_POOL_SIC_TPL = "{label} [sic]"
"""原句里写的年 ≠ 年报年时的 label:官方原句原样 + 句尾「 [sic]」(2026-09-29 Frank 拍板)—— 标明原文如此、不是我们抄错,
也不静默替官方改。"""

PRINT_MB_POOL_SIC_TPL = "  · pnp_ops_stats MB 年报 {year} 池子句写的是 end of {label_year} ≠ 年报年 → period 记 {year}、label 句尾加 [sic]"
"""上面那种改判的留痕(每轮打一行,不静默)。"""

MB_ANNUAL_PROC_METRICS = (("processing_days", "overallDays", "Overall Average"),
                          ("processing_days_approved", "approvedDays", "Approved Applications"),
                          ("processing_days_refused", "refusedDays", "Refused Applications"))
"""MB 年报逐通道处理天数的三个(指标名, 源键, 官方标签)。"""

MB_PROC_LABEL_TPL = "{stream} — {kind}: {days} days"
"""MB 年报处理天数的 label 形。"""

K_SELECTIONS = "selections"
"""qc-stats.json 里年度计划表 3(甄选数)的键:一年一种口径一行 {year, kind, value, valueMax, unit, label, section, url}
(2026-09-30 立。域间不互取常量,键名照 pnp 域各自声明)。"""

K_PLAN_YEAR = "planYear"
"""qc-stats.json 的计划年键(这份计划是哪一年的)。"""

K_VALUE_MAX = "valueMax"
"""qc-stats.json 一行的区间上限(计划数是区间;实际数 / 预测数为 None)。"""

QC_KIND_PLAN = "plan"
"""qc-stats.json 一行的口径:计划数(另有 actual 实际数、forecast 预测数)。"""

QC_RANGE_TPL = "{lo:,}–{hi:,}"
"""魁省甄选计划区间的写法(千分位 + 连接号;官方表写最少 / 最多两格,这里原数照写,不取中不取一头)。"""

ON_YEAR_METRICS = (("allocation", "allocation"), ("nominations_issued", "nominationsIssued"),
                   ("nominations_issued_fy", "nominationsIssuedFiscal"),
                   ("nominated_individuals", "nominatedIndividuals"),
                   ("si_decisions", "siDecisions"), ("si_itas_issued", "siItasIssued"),
                   ("si_ita_applications", "siItaApplications"), ("si_applications_received", "siApplicationsReceived"))
"""逐年清单的(指标名, 源键):ON 两个;第三个是 PE 按**财年**的已发提名(pe-stats.json,2026-09-09),
指标名另立 —— 消费端拿自然年配额算用尽率时不能混进财年数。
第四个是 NL 按**人头**的提名人数(nl-stats.json,2026-09-29):官方年报数的是人(individuals / newcomers,含随行家属),
不是提名证书 —— 与别省按证书 / 申请计的已发提名不同口径,指标名另立 nominated_individuals,单位 people 由行自带
(fill_year_metric_ops 读行里的 unit),消费端不能拿它与配额相除,也不能并进已发提名。
2026-09-29 加后四个:BC 统计年报(bc-nominations.json)同一批 PDF 多抽的四组 SI(Skills Immigration)逐年数 —— 审理决定数
si_decisions(当年审完的件数,不是收件)、全年发出邀请 si_itas_issued、当年邀请转成申请 si_ita_applications(比全部收件少,
不经注册的通道不在内)、收件数 si_applications_received(年报 2021 版止,2022 版起官方改发决定数)。名字带 si_ 前缀与口径,
不与 MB 月度的 applications_received_ytd、抽选加总的 invitations_ytd 这些年内累计指标混;单位随行(pnp 域写
applications / invitations,fill_year_metric_ops 照行上的 unit 落)。别的省文件没有这四个键,这一步对它们空转。"""

ON_PROCESSING_NOTE = (
    "ON(C4-W5):官方「审理时长与提名数」专页 2026 改制后已 302 下线(raw 的 pageRedirect 存了"
    "官方注册的 redirect 证据)→ 审理时长无行可出,这是举证过的「本站未收录」。"
    "配额/历年提名数出自逐年 Program Updates 页 —— 每条自带出处页,用自己的 url/fetched,"
    "别拿顶层(已下线那页)给数字背书。label = 官方原句(quote-anchored)。"
)
"""ON 为什么没有处理时长行。"""

K_ALLOC_NOTE = "note"
"""人工核对表(IN_IRCC_ALLOC)一行的 note 格:逐年出处说明,官方原句一律用「」括着(2026-09-27 补配额行取 label 用)。"""

ALLOC_QUOTE_RE = re.compile(r"「([^」]+)」")
"""核对表 note 里的一句官方原句。"""

ALLOC_NUM_TPL = "{n:,}"
"""配额数的千分位写法(在 note 的原句里认「6,254」这种写法)。"""

DATASET_ID_RE = re.compile(r"^[a-z0-9]{4}-[a-z0-9]{4}$")
"""开放数据平台(Socrata)数据集页 URL 的末段 ID(「8rf7-hw2p」)。末段是它 = 出处是官方数据集页,倒数第二段是数据集名
(连字符还原成空格:「Annual-Allocations-for-Immigration-Programs」→「Annual Allocations for Immigration Programs」)。"""

PRINT_ALLOC_GAP_TPL = "  + pnp_ops_stats {prov} {year} allocation = {value:,}(人工核对表;label:{label})"
"""配额补行的留痕(一省一行)。"""

METRIC_INVITATIONS_YTD = "invitations_ytd"
"""省级「全年已邀请」(2026-09-27 Frank 勾「2026 名额小表」:省提名弹框「2026 年配额」卡读)—— 本年(抽选日期所在年 = 今年)
带日期的抽选行人数加总,一省一行。口径四条:① 本年任一轮人数没公布(null)或日期认不出 → 该省不出这一行(少算一轮的合计
是假数);② NB 的 AIP 组是「选中进入审理的申请」不是邀请,不并进来(DRAW_NOT_INVITE_STREAMS);③ NS 按月公布的是 EOI 选取人数,
另出 METRIC_SELECTIONS_YTD,不叫邀请;④ QC / FED 不出(不属 PNP)。asOf = 本年最近一轮的日期,url = 该省抽选页。
⚠ NL 的 ITA 批次是 NLPNP 与 AIP 同批发的邀请(每轮 note 里分列),按上面四条照计入,label 不另拆。
2026-09-27 同日改判(Frank 勾「补抓缺的省 2026 配额」补进 NL 配额 2,379 = NLPNP 单列):合计旁边就是只算省提名的配额,
带 AIP 的合计(2,695)看着像超发 —— NL 改为只加省提名那一份(DRAW_PNP_PART_PROVS,读 pnp 域拆好的 K_PNP_INVITATIONS),
与 ② NB 剔 AIP 同口径:「全年已邀请」一律只算省提名。
2026-09-29 抽选卡重排改判(Frank「按你建议」「如果改一个地方,是不是所有省份都得改一遍」):② 与 NL 那条不再按省名写死,改读
pnp 域逐行打好的 program / unit 两格(DRAW_CARD_PROGRAMS、DRAW_UNIT_METRIC);AIP 那一份另出 scope=AIP 的行(省提名弹框
「AIP 抽选」卡底读);官方人数格只写上限的轮次(AB「Less than 10」、BC「<5」)不再让整省不出 —— 按 0 计、指标名加 _min
(见 METRIC_MIN_SUFFIX),① 只对真缺(人数空、日期认不出、项目认不出)保留。"""

K_INVITATIONS_BELOW = "invitationsBelow"
"""抽选行键:官方人数格只写了上限时的那个上限(pnp 域 K_INVITATIONS_BELOW;2026-09-29)。域间不互取常量,键名照 pnp 域各自声明。
沿革:2026-09-27 起这里还有一个 K_PNP_INVITATIONS = "pnpInvitations"(NL 一批里省提名那一份,pnp 域从 Notes 拆),09-29 pnp 域
改为把一批拆成省提名、AIP 两行,这一格退役。"""

PROGRAM_AIP = "AIP"
"""抽选行 program 格:人数只属 AIP(pnp 域 PROGRAM_AIP;2026-09-29)。"""

PROGRAM_POOL = "PNP+AIP"
"""抽选行 program 格:省提名与 AIP 同池、官方只发一个合计(NS;pnp 域 PROGRAM_POOL;2026-09-29)。"""

PROGRAM_PSTQ = "PSTQ"
"""抽选行 program 格:魁省技术工人甄选(PSTQ 邀请轮次;2026-09-30 Frank「和其他省保持一致吧」,魁省抽选卡 / 配额卡照九省接上)。"""

DRAW_CARD_PROGRAMS = {"": (PROGRAM_PNP, PROGRAM_POOL, PROGRAM_PSTQ), PROGRAM_AIP: (PROGRAM_AIP,)}
"""全年合计分两份:scope → 算进这一份的 program(2026-09-29 抽选卡重排)。scope 空串 = 省提名那一份(配额卡「已发邀请」、
「本省抽选」卡底读;NS 的同池选取也算这一份,label 与单位写明含 AIP);scope「AIP」= AIP 那一份(「AIP 抽选」卡底读,
scopeKind = SCOPE_PROGRAM)。program 空串或缺格(pnp 域认不出项目、或还没按新代码重跑的旧文件)的行两份都记 unknown。
沿革:2026-09-27 起两张按省写死的表 —— DRAW_NOT_INVITE_STREAMS {"NB": ("AIP",)}(不算邀请的 stream 不进合计,NB 抽选页原句
「Atlantic Immigration Program figures show applications selected for processing; all other streams show invitations issued.」)
与 DRAW_PNP_PART_PROVS ("NL",)(ITA 批次里夹着 AIP 的省只加 K_PNP_INVITATIONS 那一份,缺这一格整省不出);09-29 两表撤,
改读 pnp 域逐行打好的 program / unit 两格 —— NB 的 AIP 组、NL 拆出来的 AIP 行都是 program=AIP,进 AIP 那一份。
2026-09-30 魁省 PSTQ 轮次进 scope 空串那一份(魁省没有省提名,这一份就是它本省的主项目;配额卡「已发邀请」与抽选卡卡底读)。"""

DRAW_KNOWN_PROGRAMS = (PROGRAM_PNP, PROGRAM_POOL, PROGRAM_AIP, PROGRAM_PSTQ)
"""认得的 program 值(2026-09-29;09-30 加 PSTQ);不在这里的(空串 / 缺格)= 项目认不出,记 unknown。"""

DRAW_YTD_SKIP_PROV = {"NU"}
"""不出全年抽选合计的省(2026-09-30 自 NON_PNP_PROV 拆出:魁省 PSTQ 轮次要合计,配额卡与抽选卡卡底照九省读;NU 没有抽选)。"""

METRIC_MIN_SUFFIX = "_min"
"""下限指标的后缀(2026-09-29 抽选卡重排,Frank「按你建议」:AB、BC 的已邀请写「至少 X」):本年有轮次官方人数格只写上限
(K_INVITATIONS_BELOW)时,那几轮按 0 计,合计是下限,指标名 = 原指标名 + 本后缀(invitations_ytd_min);label 写明几轮、上限几。"""

METRIC_SELECTIONS_YTD = "selections_ytd"
"""省级「全年已选取」:NS 按月公布从 EOI 池选中的人数(官方原句「Nova Scotia selected the following number of candidates from
the Expression of Interest (EOI) pool during the months noted below」,liveinnovascotia.com/eoi-selection;2026-09-27)。"""

UNIT_INVITATIONS = "invitations"
"""单位:邀请数(与 MB 月度页 laa_ytd 同一个单位词)。"""

METRIC_APPLICATIONS_YTD = "applications_ytd"
"""「全年选中进入审理的申请」(2026-09-29 抽选卡重排):NB 的 AIP 组(pnp 域 unit=application),出在 AIP 那一份。"""

DRAW_YTD_INVITE_LABEL_TPL = "Sum of {n} rounds in {year}"
"""「全年已邀请」行的 label(N = 计入的抽选行数,一行 = 一条通道的一轮)。本表 label 列装英文(DDL 注「官方原文(英文)」),
三语界面原样显示,不写中文 —— 同 pnp 域 DRAWS_NL_LABEL 撤中文括注的先例。"""

DRAW_YTD_SELECT_LABEL_TPL = "Sum of {n} monthly selections in {year}"
"""「全年已选取」行的 label(NS:一行 = 一个月的选取人数)。"""

DRAW_YTD_APPLICATION_LABEL_TPL = "Sum of {n} rounds in {year} (applications selected for processing)"
"""「全年选中进入审理的申请」行的 label(NB 的 AIP 组;2026-09-29)。
沿革:2026-09-27 起 NB 省提名那一份的 label 补一句 DRAW_YTD_DROP_TPL「{label}, excluding {n} {streams} rows (applications selected
for processing, not invitations)」(剔出合计的 AIP 行);09-29 AIP 行另出一份,这一句随之撤。"""

DRAW_YTD_BELOW_TPL = "{label}, at least: {n} of them published only as fewer than {bounds}, counted as 0"
"""下限行 label 补的一句(2026-09-29;见 METRIC_MIN_SUFFIX):几轮只写了上限、上限几(几种上限用 / 连)。"""

DRAW_UNIT_INVITATION = "invitation"
"""抽选行 unit 格:发出的邀请(pnp 域 UNIT_INVITATION;2026-09-29)。"""

DRAW_UNIT_SELECTION = "selection"
"""抽选行 unit 格:从 EOI 池选中的人(pnp 域 UNIT_SELECTION;2026-09-29)。"""

DRAW_UNIT_APPLICATION = "application"
"""抽选行 unit 格:选中进入审理的申请(pnp 域 UNIT_APPLICATION;2026-09-29)。"""

PROGRAM_EE = "EE"
"""抽选行 program 格:联邦快速通道(本表 province=FED 的行;2026-09-29)。"""

DRAW_UNIT_METRIC = {
    DRAW_UNIT_INVITATION: (METRIC_INVITATIONS_YTD, UNIT_INVITATIONS, DRAW_YTD_INVITE_LABEL_TPL),
    DRAW_UNIT_SELECTION: (METRIC_SELECTIONS_YTD, UNIT_PEOPLE, DRAW_YTD_SELECT_LABEL_TPL),
    DRAW_UNIT_APPLICATION: (METRIC_APPLICATIONS_YTD, UNIT_APPLICATIONS, DRAW_YTD_APPLICATION_LABEL_TPL),
}
"""抽选行 unit 格(pnp 域 UNIT_*)→(指标, 单位, label 模板)(2026-09-29)。一份合计里各行 unit 不一 = 不出(留痕)。
沿革:2026-09-27 起按省名判 —— DRAW_SELECT_PROVS ("NS",)「按「选取」而不是「邀请」公布的省:出 METRIC_SELECTIONS_YTD,单位 people
(官方原句数的是 candidates)」;09-29 改读 unit 格。"""

PRINT_YTD_SKIP_TPL = "  · pnp_ops_stats {prov} {share} 不出本年合计:{year} 年有 {n} 轮人数没公布、日期认不出或项目认不出(少算一轮的合计是假数)"
"""省级全年合计因缺数不出行时的留痕。"""


# =========================================================================
# 11. mart:ee 三表(类别抽选 / 官方计分表 / 语言换算表)
# =========================================================================

IN_EE_DRAWS = paths.EE / "draws.json"
"""各类别最近一次抽选(CRS/日期/邀请数,ee 域 build_ircc_ee_draws 产)——
join 进 ee_categories 每行,EE 弹框显示「近期抽选」。"""

K_BY_CATEGORY = "byCategory"
"""按类别索引的最近一次抽选。"""

K_HISTORY = "history"
"""历次抽选(#135 时间线页的料)。"""

K_BY_YEAR = "byYear"
"""ee 域 draws.json 的按年合计块(全部轮次求和;把脉页全国块 EE 邀请历年,2026-09-08)。"""

K_INVITATIONS = "invitations"
"""byYear 年块:该年邀请数合计。"""

K_INV_BY_YEAR = "invByYear"
"""ee 域 draws.json 的年 × 专场合计块(2026-09-11 Frank「EE 的还是拆一下吧」:
年 → {专场 key → 邀请合计},全口径,各类求和恒等 byYear.invitations)。"""

EE_INV_CAT_KEY = {
    "cec": "eeInvCec", "french": "eeInvFrench", "healthcare": "eeInvHealth", "pnp": "eeInvPnp",
    "general": "eeInvGeneral", "trade": "eeInvTrade", "stem": "eeInvStem",
    "education": "eeInvEdu", "agriculture": "eeInvAgri", "physicians": "eeInvPhys",
    "senior-managers": "eeInvMgr", "transport": "eeInvTransport", "military": "eeInvMilitary",
    "fsw": "eeInvFsw", "fst": "eeInvFst", "other": "eeInvOther",
}
"""invByYear 专场 key → macro_series 键(eeInvites 的折叠细行;全史实出现 14 类,fst/other
两键当前 0 行,词表补齐防漏)。⚠ 早年 FST 项目专轮的 drawName 含「Trades」,在 ee 域词表里
先命中 trade(顺序即语义的既有契约)—— trade 行 2023 前 = FST 项目轮、2023 起 = 技工类定向轮,
两者都是「技工向」专轮,同键不拆。词表认不出的新专场名归 other(ee 域落格时已兜底)。"""

K_AS_ON = "asOn"
"""ee 域 draws.json 的 pool 行:这份池快照的截至日(ISO;比抽选日早几天,官方原话
「a few days before an invitation round」)。解析不出 = None。"""

K_TOTAL = "total"
"""ee 域 draws.json 的 pool 行:池子总人数(官方 CRS 分布表的 Total 行)。"""

IN_EE_CRS = paths.EE / "crs-grid.json"
"""G9 联邦官方计分表之 CRS 排名分 A/B/C/D 四段(ee 域 build 产,只读 crawl 缓存)。"""

IN_EE_ELIG = paths.EE / "fed-eligibility.json"
"""资格门槛(IN_REQ_TABLES 也消费)+ FSW 67 分表(selectionFactors)。"""

IN_EE_LANG = paths.EE / "language-grid.json"
"""T4–T26 语言成绩 ↔ CLB/NCLC(**独立表,绝不参与 points 求和**)。
语言原始成绩区间不是「分数项」:独立成一张 mart 表,**从结构上杜绝**与 CRS/FSW67 相加。"""

GRID_CRS = "CRS"
"""窄表的分制列:池子里排队用的排名分。"""

GRID_FSW67 = "FSW67"
"""窄表的分制列:够不够格进池子用的选择因素分。
**两套分,一张表**:官方明确写明是两回事,但表格形状完全一样(段/小标题/因素/档位/列表头/
分值)→ 同一张窄表用 grid 列区分。拆两张表只会逼消费端把同一套查表逻辑写两遍,还得记住哪张
表叫什么。消费端一律先按 grid 过滤,再按 section/factor/criterion 挑行 —— 不过滤就会把两套
分加在一起。"""

K_SELECTION_FACTORS = "selectionFactors"
"""FSW 67 分表在资格门槛文件里的键。"""

EE_POINTS_NULL_NOTE = (
    "🔴 points 可空:官方非数字格(「n/a」「Not eligible to apply」)一律 None + 原文留 "
    "pointsText,绝不折成 0 —— 折了就等于替官方说「这档 0 分」,而官方说的是「这档根本不能申」。"
)
"""联邦计分表的空值红线。"""

CELPIP_TAIL_RE = re.compile(r"CELPIP-G$", re.I)
"""CELPIP 的部分 CLB 单元格含无障碍隐藏后缀(如「7 CELPIP-G」);原文仍在 *Text,数值边界
只移除这个页面真实存在且已由 table.test 另列保存的测试名。"""

AND_ABOVE_RE = re.compile(r"andabove$", re.I)
"""「and above」归一成 +。"""

NUM_EXACT_RE = re.compile(r"(\d+(?:\.\d+)?)")
"""单值。"""

NUM_MIN_RE = re.compile(r"(\d+(?:\.\d+)?)\+")
"""某分起(上界不封)。"""

NUM_RANGE_RE = re.compile(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)")
"""闭区间。"""

NUM_RANGE_MIN_RE = re.compile(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\+")
"""官方有「226-371+」这类「某分起及以上」写法;下界可证,上界不可封死。"""

RANGE_EXACT = "exact"
"""区间种类:单值。"""

RANGE_MINIMUM = "minimum"
"""区间种类:下界可证、上界开放。"""

RANGE_RANGE = "range"
"""区间种类:闭区间。"""

RANGE_TEXT = "text"
"""区间种类:识别不了(双空并保留 valueText,绝不替官方补 0)。"""

LANG_ABILITIES = ("speaking", "listening", "reading", "writing")
"""语言四项能力(列头前缀命中即取)。"""

LANG_POINTS_WORD = "points"
"""分值列的判据词之一。"""

LANG_TOTAL_WORD = "total"
"""总分列的判据词。"""

LANG_PER_ABILITY = "per ability"
"""每项分列的判据词(先剥括号再判)。"""

LANG_POINTS_TOTAL = "points_total"
"""总分列的指标名。"""

LANG_POINTS_PER_ABILITY = "points_per_ability"
"""每项分列的指标名。"""

SNAKE_RE = re.compile(r"[^a-z0-9]+")
"""其余列头压成 snake。"""

K_TABLES = "tables"
"""语言换算表的表清单键。"""

K_LEVEL_TEXT = "levelText"
"""一行的档位原文。"""

K_CELLS = "cells"
"""一行的各成绩格。"""


# =========================================================================
# 12. mart:试点三表(RCIP/FCIP 社区 / 社区×职业 / 名额状态)
# =========================================================================

IN_PILOT = [paths.RCIP / "rcip-communities.json", paths.FCIP / "fcip-communities.json"]
"""RCIP/FCIP 试点社区名单(E6-11)。批E(2026-08-31 pilot 拆三域)后一分为二,汇装读**并集**
(mart 表形状不变);顺序 rcip 前 fcip 后 = 旧单文件内的相对序。"""

IN_PILOT_OCC = [paths.RCIP / "rcip-occupations.json", paths.FCIP / "fcip-occupations.json"]
"""批B:社区 × 职业清单。"""

IN_PILOT_QUOTA = [paths.RCIP / "rcip-quota.json", paths.FCIP / "fcip-quota.json"]
"""社区名额状态(quota 步周更,quote-anchored)。"""

K_COMMUNITY = "community"
"""社区名列。"""

K_COMMUNITIES = "communities"
"""名额状态表里的社区级块。"""

PILOT_TYPES = ("RCIP", "FCIP")
"""两制的判定顺序(身兼两制 → 'RCIP+FCIP',同 jobs.pilot 口径;
Sudbury/Timmins 的 quota 行住 rcip 文件,type 仍须并集才判得出双身份)。"""

QUOTA_BLANK = {"firstCome": None, "firstComeQuote": "", "firstComeUrl": "",
               "perIntake": None, "perIntakeQuote": "", "perIntakeUrl": "",
               "remaining": None, "remainingQuote": "", "remainingUrl": ""}
"""名额三格的空档(键序即落盘列序)。宁缺勿猜:数值只透传官网原句里的数,
缺 = None(官网没写 ≠ 0,firstCome 同理只有 True/None)。"""

QUOTA_VALUE_KEYS = ("firstCome", "perIntake", "remaining")
"""三个数值格(自检:值与 quote/url 必须成对)。"""

K_PER_INTAKE = "perIntake"
"""每期名额(必须是整数或 None)。"""

K_REMAINING = "remaining"
"""剩余名额(同上)。"""

K_QUOTE = "quote"
"""官方原句列。"""

QUOTA_QUOTE_TPL = "{key}Quote"
"""三个数值格各自的原句列名。"""

QUOTA_URL_TPL = "{key}Url"
"""三个数值格各自的出处列名。"""

QUOTA_EMPTY_MSG = ("pilot_quota: 名额状态文件存在但并集 0 行 —— 抽取器契约破了,不许空灌"
                   "(22c8d6a 空灌事故同款防线;⚠ 断言在并集不在单文件 —— fcip 四站官网全文"
                   "不提名额,fcip-quota 0 行是举证过的事实)")
"""空灌防线的断言语。文件全缺 → [](seed 侧 -1 跳过保留旧行);文件在但并集 0 行 → 抛错断整个
mart,不许「清空+重灌 0 行」把生产表静默抹掉。"""

QUOTA_REQUIRED_TPL = "pilot_quota 必填缺失: {row}"
"""社区/省/口径日三格必填。"""

QUOTA_PAIR_TPL = "pilot_quota {key} 的值与 quote/url 不成对: {community}"
"""值与出处必须同生共死(有数就必须有官方原句和出处页)。"""

QUOTA_INT_TPL = "pilot_quota {key} 非整数: {row}"
"""名额只透传整数。"""

QUOTA_OCC_TPL = "pilot_quota 职业行缺 status/quote/url: {row}"
"""社区 × NOC 满额行必须带状态与出处。"""


# =========================================================================
# 13. mart:新闻与直通表(news / dli / field_sources / noc 两表 / 判死名单)
# =========================================================================

IN_NEWS = paths.NEWS / "news.json"
"""官方移民新闻累积表(news 域产,E12-06)。"""

NEWS_MAX = 60
"""mart 只带近 60 条(老的留 raw 不进站)。"""

K_ITEMS = "items"
"""新闻累积表的条目键。"""

K_BODY_EN = "bodyEn"
"""英文正文(卡片三要素之一:标题/链接/正文不齐不进站,抓不到正文=不出详情页,不硬造)。"""

K_REGION = "region"
"""新闻的地区(同稿去重的第一维)。"""

K_FETCHED_AT = "fetchedAt"
"""条目级抓取时刻(排序第二键;也是落盘 fetched 的首选)。"""

NON_WORD_RE = re.compile(r"\W+")
"""标题归一(同稿去重 + 标题复读行判定)。"""

NEWS_NOISE = {"media advisory", "news release", "statement", "backgrounder",
              "joint statement", "speech"}
"""excerpt 要跳过的样板行(整段就是这几个词之一)。"""

NEWS_FROM_PREFIX = "from:"
"""excerpt 要跳过的发文机关行前缀。"""

NEWS_HEAD_PREFIX = "#"
"""excerpt 要跳过的小标题段前缀(2026-09-30 起 news 正文小标题段首挂「## / ###」,标题不当摘要)。"""

NEWS_BOLD_MARK = "**"
"""excerpt 要剥掉的加粗标记(同日起 news 正文加粗包「**」;卡片摘要是纯文本)。"""

NEWS_EXCERPT_MAX = 240
"""excerpt 截断。"""

NEWS_SLUG_TPL = "{date}-{title}"
"""新闻 slug 形(稳定、可读、进 URL)。"""

NEWS_SLUG_N_TPL = "{date}-{title}-{n}"
"""同 slug 撞车时加序号。"""

IN_DLI = paths.DLI / "dli.json"
"""PGWP 可申 DLI 子集(dli 域 build_ircc_dli_pgwp 产,E12-03;已过滤去重,汇装层直通)。"""

IN_QS = paths.QS / "qs.json"
"""QS 世界大学排名·加拿大子集(qs 域产;2026-09-12 Frank「再加上 qs 排名」——
装配层按 dliName 给 dli 行挂 qsRank/qsRankDisplay,榜外留空)。"""

K_DLI_NAME = "dliName"
"""qs 行里「IRCC DLI 名单侧校名」键(join 键)。"""

K_QS_RANK = "qsRank"
"""dli 行产出键:QS 名次(排序用纯数;榜外 None)。"""

K_QS_RANK_DISPLAY = "qsRankDisplay"
"""dli 行产出键:QS 展示名次(如 "=45";榜外空串)。"""

K_RANK = "rank"
"""qs 行里名次键。"""

K_RANK_DISPLAY = "rankDisplay"
"""qs 行里展示名次键。"""

TABLE_DLI = "dli"
"""dli 表名(单表增量件 build_dli_table 落盘用;与 to_mart_tables 字典键同字)。"""

TABLE_PATHWAYS = "pathways"
"""pathways 表名(单表增量件 build_pathways_table 落盘用;与 to_mart_tables 字典键同字;2026-09-30 通道补全批一立)。"""

TABLE_PNP_OPS = "pnp_ops_stats"
"""pnp_ops_stats 表名(单表增量件 build_pnp_ops_table 落盘用;2026-09-30 来源定位 ③-2 立)。"""

TABLE_PNP_OCCUPATIONS = "pnp_occupations"
"""pnp_occupations 表名(单表增量件 build_pnp_occ_table 落盘用;2026-09-30 来源定位 ③-4 立)。"""

TABLE_PNP_DRAWS = "pnp_draws"
"""pnp_draws 表名(单表增量件 build_pnp_draws_table 落盘用;与 to_mart_tables 字典键同字;2026-09-30 来源定位 ③-1 立)。"""

TABLE_PNP_REQUIREMENTS = "pnp_requirements"
"""pnp_requirements 表名(单表增量件 build_pnp_req_table 落盘用;与 to_mart_tables 字典键同字;2026-09-30 通道补全批一 1b 立 ——
各省补门槛行逐省重跑,不陪跑约 9 分钟的跨源汇装)。"""

IN_FIELD_SOURCES = paths.RAW / "sources" / "field-sources.json"
"""字段级来源注册表(citations 域 verify_field_source_pages 产,E4-04;汇装层直通)。"""

IN_PATHWAYS = paths.PROCESSED / "pathways" / "pathways.json"
"""全国通道对照表(pathways 域每轮自校过才写,2026-09-28 立域;汇装层直通,只多算一格配额行 join 键)。"""

PATHWAYS_MISSING_TPL = "✗ 通道对照表不在:{path} —— 先跑 python etl/pathways/main.py(本轮 pathways 表出空表)"
"""通道对照表缺文件(仓库里跟踪着这份产物,缺了就是出事了,喊出来)。"""

IN_QC_NOC_STREAMS = paths.PNP / "qc-noc-streams.json"
"""魁省职业 → PSTQ 通道官方对照(pnp/qc 子域产,2026-09-29;设计 docs/design/魁省门槛弹框-20260929.md)。"""

IN_QC_REQ = paths.PNP / "qc-req.json"
"""魁省 PSTQ 门槛表(取四个通道的官方名,给对照表的通道号配上门槛行的 stream)。"""

IN_QC_PEQ_REQ = paths.PNP / "qc-peq-req.json"
"""魁省 PEQ 门槛表(取临时工分支的通道名与 TEER 档,给对照表每个 NOC 判要不要挂 PEQ)。"""

QC_NOC_MISSING_TPL = "✗ 魁省职业对照不在:{path} —— 先跑 python etl/pnp/main.py --only pnp_qc(本轮 qc_noc_streams 表出空表)"
"""魁省对照缺文件(同 pathways,喊出来)。"""

QC_STREAM_MISS_TPL = "  ⚠ 魁省通道 {n} 在 qc-req.json 里找不到「Stream {n}:」开头的门槛流 —— 这个通道不挂到岗位上"
"""对照表的通道号配不上门槛行的 stream(官网改了通道名的写法)。"""

QC_STREAM_PREFIX_TPL = "Stream {n}:"
"""PSTQ 门槛流名的通道号前缀(qc-req.json 的 stream 原文「Stream 1: Highly qualified …」)。"""

QC_PROGRAM_PSTQ = PROGRAM_PSTQ
"""魁省技术工人甄选项目。"""

QC_PROGRAM_PEQ = "PEQ"
"""魁省经验类项目。"""

QC_FACTOR_OCC = "occupationPathway"
"""PEQ 门槛表里「职业档」那一行的因素名(它的 appliesTeer 决定 PEQ 挂到哪些岗)。"""

QC_PEQ_TFW_PREFIX = "PEQ – Travailleurs"
"""PEQ 临时工分支的通道名前缀(毕业生分支只看学历、不看岗位,不挂到岗位上)。"""

QC_TEER_DIGIT = 1
"""NOC 五位码里 TEER 那一位的下标(第二位)。"""

QC_KIND_ALL = "all"
"""通道细分类:该职业的工作都进这个通道(PEQ 挂上来的一律是它)。"""

QC_KIND_PARTLY = "partlyRegulated"
"""部分受监管细分码的类(只有这一类的括号原文逐码不同、要逐条翻;其余几类是定句,界面词条管)。"""

K_CHANNELS = "channels"
"""qc_noc_streams 表一行的通道清单(卡片顺序:PSTQ 1 → 2 → 3 → PEQ)。"""

K_CODE = "code"
"""官方细分码(「3-PNER16」;PEQ 为空串)。"""

K_KIND = "kind"
"""细分码的类(all / citizenOnly / residentOnly / regulated / regulatedQcDiploma / partlyRegulated)。"""

K_REGULATED = "regulated"
"""受监管明细 [{jobs, authorities}](法文原文);非受监管通道为 None。"""

QC_KEY_PSTQ_TPL = "pstq-{n}"
"""PSTQ 通道稳定键。"""

QC_KEY_PEQ_TFW = "peq-tfw"
"""PEQ 临时工分支稳定键。"""

QC_TITLE_PSTQ_TPL = "Skilled Worker Selection Program (PSTQ) – {stream}"
"""PSTQ 通道卡标题(官方项目英文名 + 门槛流名原文)。"""

QC_TITLE_PEQ_TPL = "Programme de l'expérience québécoise (PEQ) – {branch}"
"""PEQ 通道卡标题(官方项目法文名 + 分支名;PEQ 只有法文页)。"""

QC_PEQ_NAME_SEP = " – "
"""PEQ 门槛流名「PEQ – Travailleurs étrangers temporaires」里项目名与分支名的分隔。"""

QC_SCOPE_RE = re.compile(r"\(\s*(.+?)\s*\)\s*$")
"""官方说明末尾括号里的适用范围(「Stream 3: Regulated professions (only …)」)。"""

K_SCOPE_ZH = "scopeZh"
"""适用范围中文(魁省通道;整类为空串)。"""

K_SCOPE_KO = "scopeKo"
"""适用范围韩文(魁省通道;整类为空串)。"""

QC_SCOPE_MISS_TPL = "  ⚠ 魁省适用范围缺译 {code}:{scope} —— 补 QC_SCOPE_ZH / QC_SCOPE_KO(本轮中韩界面先显示官方原文)"
"""部分受监管细分码在翻译表里查不到时的喊话。"""

QC_SCOPE_ZH = {
    "3-PNER1": "仅限地质学家、地球物理学家与水文地质学家",
    "3-PNER2": "仅限农学家、农业科学家与农业专家",
    "3-PNER3": "仅限建筑业的土地测量技术员",
    "3-PNER4": "仅限锅炉检测员、压力罐检测员与压力容器检测员",
    "3-PNER5-DQ": "仅限持魁省文凭的房屋检查员",
    "3-PNER6": "仅限建筑业的报警系统技术员",
    "3-PNER7": "仅限足病医师",
    "3-PNER8": "仅限助产士与视轴矫正师",
    "3-PNER9": "仅限针灸师",
    "3-PNER10": "仅限心理治疗师、心理教育师、婚姻与家庭治疗师及性学家",
    "3-PNER11": "仅限犯罪学家",
    "3-PNER12": "仅限合格幼儿教育工作者",
    "3-PNER13": "仅限建筑业的白铁工",
    "3-PNER14": "仅限建筑业的锅炉制造工",
    "3-PNER15": "仅限建筑业的钢铁工",
    "3-PNER16": "建筑业仅限焊工与压力容器焊工;建筑业以外仅限压力容器焊工与从事受监管作业的焊工",
    "3-PNER17": "仅限建筑业的电力线路工",
    "3-PNER18": "建筑业仅限消防设备安装工与供暖设备安装工;建筑业以外仅限管道安装工与供暖设备安装工",
    "3-PNER19": "仅限建筑业的木工与细木工",
    "3-PNER20": "仅限建筑业的砌砖工",
    "3-PNER21": "仅限建筑业的保温工",
    "3-PNER22": "仅限建筑业的工业机械工与工地机械工",
    "3-PNER23": "仅限建筑业的重型设备机械工",
    "3-PNER24": "建筑业仅限供暖系统安装工;建筑业以外仅限燃油炉安装工与炉具机械工",
    "3-PNER25": "仅限建筑业的潜水员",
    "3-PNER26": "仅限建筑业的水泥工、混凝土抹面工与混凝土抛光工",
    "3-PNER27": "仅限建筑业的瓷砖工",
    "3-PNER28": "仅限建筑业的抹灰工与石膏抹灰工",
    "3-PNER29": "仅限建筑业的屋面工与铺瓦工",
    "3-PNER30": "仅限建筑业的玻璃安装工",
    "3-PNER31": "仅限建筑业的油漆工、维修油漆工、房屋油漆工与装饰油漆工",
    "3-PNER32": "仅限建筑业的弹性地板、硬木地板、乙烯基地板、住宅地面与墙面及地毯铺装工",
    "3-PNER33": "仅限建筑业的重型设备驾驶员与操作员",
    "3-PNER34": "仅限燃气泄漏探测员、燃气管道维护工、燃气配送服务操作员与供水系统维护工",
    "3-PNER35": "仅限建筑业的普工",
    "3-PNER36": "仅限注册会计师与注册会计师审计师",
    "3-PNER37": "仅限投资组合经理",
    "3-PNER38": "仅限按揭经纪",
    "3-PNER39": "仅限法庭速记员",
    "3-PNER40": "仅限林业工程师",
    "3-PNER41": "仅限数据通信工程师、计算机工程师、通信设备工程师与网络系统工程师",
    "3-PNER42": "仅限工业工程师、工业顾问工程师、工厂工程师、制造工程师与生产工程师",
    "3-PNER43": "仅限农业与生物资源工程师、纺织工程师、生物医学工程师与船舶工程师",
    "3-PNER44": "仅限建筑技术员",
    "3-PNER45": "仅限土木工程技术员",
    "3-PNER46": "仅限机械工程技术员、航空航天工程技术员与核工程技术员",
    "3-PNER47": "仅限制造工程技术员",
    "3-PNER48": "仅限电气工程技术员",
    "3-PNER49": "仅限助听器验配师与物理治疗技术员",
    "3-PNER50": "仅限矫形器师、假肢师与假肢矫形器师",
    "3-PNER51": "仅限学校升学指导顾问",
    "3-PNER52": "仅限职业指导顾问(学校以外)",
    "3-PNER53": "仅限移民顾问",
    "3-PNER54": "仅限执达员",
    "3-PNER55": "仅限金融服务代表",
    "3-PNER56": "仅限机动车损失评估员",
    "3-PNER57": "仅限燃气器具维护维修人员",
    "3-PNER58": "仅限电气设备机械工",
    "3-PNER59": "仅限建筑业的起重机操作员",
    "3-PNER60": "仅限固定机械机械工与电厂机械工",
}
"""受监管职业通道「部分受监管」细分码 → 适用范围中文(2026-09-30 Frank「适用行也翻成中文吧」;官方 xlsx 4Configuration 括号原文逐条手译,不走模型;
键 = 官方细分码,官方加码或改文要回来补;缺译 mart 喊一声并先放原文)。"""

QC_SCOPE_KO = {
    "3-PNER1": "지질학자, 지구물리학자, 수문지질학자만 해당",
    "3-PNER2": "농학자, 농업과학자, 농업 전문가만 해당",
    "3-PNER3": "건설업 토지측량 기술자만 해당",
    "3-PNER4": "보일러 검사원, 압력탱크 검사원, 압력용기 검사원만 해당",
    "3-PNER5-DQ": "퀘벡 학위를 가진 주택 검사원만 해당",
    "3-PNER6": "건설업 경보 시스템 기술자만 해당",
    "3-PNER7": "족부 전문의만 해당",
    "3-PNER8": "조산사, 사시 교정사만 해당",
    "3-PNER9": "침술사만 해당",
    "3-PNER10": "심리치료사, 심리교육사, 부부 및 가족 치료사, 성과학자만 해당",
    "3-PNER11": "범죄학자만 해당",
    "3-PNER12": "자격을 갖춘 유아 교육자만 해당",
    "3-PNER13": "건설업 판금공만 해당",
    "3-PNER14": "건설업 보일러 제작공만 해당",
    "3-PNER15": "건설업 철골공만 해당",
    "3-PNER16": "건설업은 용접공과 압력용기 용접공만, 건설업 외는 압력용기 용접공과 규제 작업 용접공만 해당",
    "3-PNER17": "건설업 송전선 작업자만 해당",
    "3-PNER18": "건설업은 소방설비 기계공과 난방설비 설치공만, 건설업 외는 배관공과 난방설비 설치공만 해당",
    "3-PNER19": "건설업 목수, 소목공만 해당",
    "3-PNER20": "건설업 벽돌공만 해당",
    "3-PNER21": "건설업 단열공만 해당",
    "3-PNER22": "건설업 산업 기계공, 현장 기계공만 해당",
    "3-PNER23": "건설업 중장비 정비공만 해당",
    "3-PNER24": "건설업은 난방 시스템 설치공만, 건설업 외는 유류 난로 설치공과 난로 정비공만 해당",
    "3-PNER25": "건설업 잠수사만 해당",
    "3-PNER26": "건설업 시멘트공, 콘크리트 마감공, 콘크리트 연마공만 해당",
    "3-PNER27": "건설업 타일공만 해당",
    "3-PNER28": "건설업 미장공, 석고 미장공만 해당",
    "3-PNER29": "건설업 지붕공, 슁글 시공공만 해당",
    "3-PNER30": "건설업 유리공만 해당",
    "3-PNER31": "건설업 도장공, 유지보수 도장공, 주택 도장공, 장식 도장공만 해당",
    "3-PNER32": "건설업 탄성 바닥재, 원목 마루, 비닐 바닥재, 주거용 바닥 및 벽 마감재, 카펫 시공공만 해당",
    "3-PNER33": "건설업 중장비 운전원 및 조종원만 해당",
    "3-PNER34": "가스 누출 탐지원, 가스관 유지보수원, 가스 배급 서비스 운영원, 상수도 시스템 유지보수원만 해당",
    "3-PNER35": "건설업 일반 노무자만 해당",
    "3-PNER36": "공인회계사, 공인회계사 감사인만 해당",
    "3-PNER37": "포트폴리오 매니저만 해당",
    "3-PNER38": "모기지 브로커만 해당",
    "3-PNER39": "법원 속기사만 해당",
    "3-PNER40": "산림 공학자만 해당",
    "3-PNER41": "데이터 통신 엔지니어, 컴퓨터 엔지니어, 통신장비 엔지니어, 네트워크 시스템 엔지니어만 해당",
    "3-PNER42": "산업 엔지니어, 산업 컨설팅 엔지니어, 공장 엔지니어, 제조 엔지니어, 생산 엔지니어만 해당",
    "3-PNER43": "농업 및 생물자원 엔지니어, 섬유 엔지니어, 생체의공학 엔지니어, 조선 엔지니어만 해당",
    "3-PNER44": "건축 기술자만 해당",
    "3-PNER45": "토목공학 기술자만 해당",
    "3-PNER46": "기계공학 기술자, 항공우주공학 기술자, 원자력공학 기술자만 해당",
    "3-PNER47": "제조공학 기술자만 해당",
    "3-PNER48": "전기공학 기술자만 해당",
    "3-PNER49": "보청기 전문가, 물리치료 기술자만 해당",
    "3-PNER50": "보조기 기사, 의지 기사, 의지보조기 기사만 해당",
    "3-PNER51": "학교 진로 상담사만 해당",
    "3-PNER52": "진로 상담사(학교 제외)만 해당",
    "3-PNER53": "이민 컨설턴트만 해당",
    "3-PNER54": "집행관만 해당",
    "3-PNER55": "금융 서비스 담당자만 해당",
    "3-PNER56": "자동차 손해 사정원만 해당",
    "3-PNER57": "가스기기 유지보수 담당자만 해당",
    "3-PNER58": "전기설비 정비공만 해당",
    "3-PNER59": "건설업 크레인 운전원만 해당",
    "3-PNER60": "고정 기계 정비공, 발전소 정비공만 해당",
}
"""同上,韩文。"""

K_OPEN = "open"
"""在招计数格(职业在招量桶 / rankings 聚合桶)。"""

K_ELIGIBLE = "eligible"
"""可走省提名的岗数格。"""

K_SAL = "sal"
"""薪资样本格。"""

IN_EXPIRED = paths.PROCESSED_JOBBANK / "expired_ids.json"
"""验尸判死台账(jobbank 域 verify 产,#124 批C:posting_id → 判死时刻,7-25 起累积)。
三处消费:剔出 mart、下发 closed_jobs、推 closed30d。"""

K_CLOSED_AT = "closedAt"
"""判死时刻列(喂 JSON-LD 的 validThrough)。"""


# =========================================================================
# 14. mart:装配与落盘(28 张表一次算齐;跨源汇装的收口点)
# =========================================================================

IN_SCORED = OUT_SCORED
"""汇装层读的评分产物 = 评分步的落盘处(同一份,两个角色各自具名)。"""

IN_WAGES = paths.WAGES / "wages.json"
"""NOC×省 中位工资(wages 域 build_esdc_wage_medians 从 ESDC 开放数据建)。"""

OUT_MART = paths.DATA / "mart"
"""mart 目录(一文件 = 一张 DB 表)。"""

OUT_MART_OPEN_IDS = paths.PROCESSED_JOBBANK / "mart_open_ids.json"
"""「还在板上」的 jobbank 帖号(验尸拿它筛掉已 closed / 已被同名去重丢掉的帖,别白验)。
⚠ 2026-08-31 批I 起走 paths.write_json 的 compact 档落盘:与原先 `json.dumps(sorted(...))`
默认分隔符只差空格,json.loads 逐字节等价;换的是写盘方式(原子 + Errno 22 重试),不是内容。"""

MART_EXPIRED_TPL = "  #124 验尸剔除: {n} 个已过期帖不进 mart(seed 将按既有规则置 closed)"
"""验尸剔除留痕。"""

MART_LATE_SALARY_TPL = "  薪资兜底: {n} 个新帖在 04d 之后落盘,09 现算现补(否则页面薪资列为空)"
"""薪资兜底留痕:这个数 = 本轮抢在 04d 之后落盘的新帖。恒为 0 说明窗口已关;持续偏大 =
抓取与建表撞得厉害,该去看编排顺序而不是加大兜底。"""

MART_SEEN_TPL = ("  seen_ids(本轮见过): {seen} · mart.jobs(展示去重后): {jobs} · "
                 "见过但不进 mart(展示去重/同 ext 重复): {gap}")
"""见过集与展示集的差额留痕。"""

MART_DONE_TPL = "MART built → {dir}"
"""汇装步收尾。"""

K_SEEN_IDS = "seen_ids"
"""见过集在产出 dict 里的表名。"""

OUT_PENDING_JOBS = paths.PROCESSED_REPAIR / "pending_jobs.json"
"""待修清单(2026-09-28 Frank「jobs 信息齐全的一个 json 不全的另一个 json」「先做拆分」):六格不全的在招岗,每条带缺哪几格、
算数的已有格与原帖正文,Opus 读它修(设计稿 docs/design/缺数据不上线与Opus修复-20260928.md)。写 processed/ 不写 mart/ ——
mart 目录整个会被 upload 传去 cms,这份纯属 ETL 内部协作(同 OUT_MART_OPEN_IDS 的判法);每条带正文,大,不进 git。
本批闸不接:jobs.json 照旧装全部岗,线上不变;接闸(不全的不进 jobs.json)是后面一批。
同日晚接闸(Frank「确认,下线吧」):清单里的岗不进 jobs.json,另出扣下名单 held_jobs 交 seed 关掉在架的(见 held_split_of)。"""

K_PENDING_JOBS = "pending_jobs"
"""待修清单在 to_mart_tables 产出 dict 里的键 —— 唯一不是表的一项:build_mart 落盘前摘走写 OUT_PENDING_JOBS,不进 data/mart/。"""

FIELD_NOC = "noc"
"""「全」的六格之一:职业分类(待修清单 missing / have 里的格名,与修复库同一套)。"""

FIELD_HOURS = "hours"
"""六格之一:工时。"""

FIELD_TERM = "term"
"""六格之一:雇佣期。"""

FIELD_SALARY = "salary"
"""六格之一:薪资(板仓行 stated_none 里的格名也是它)。"""

FIELD_PROVINCE = "province"
"""六格之一:省。"""

FIELD_CITY = "city"
"""六格之一:城市。"""

K_STATED_NONE = "stated_none"
"""板仓行:原帖明写不公布的格 → 原文(Jobillico 薪资栏「À discuter / To be discussed」;2026-09-28)。这一格算「原帖没写」,
判「全」时不算缺。"""

K_P_EXT = "ext"
"""待修行:externalId。"""

K_P_ORIGIN = "origin"
"""待修行:渠道(jobbank / jobillico / careerbeacon …)。"""

K_P_URL = "url"
"""待修行:投递 / 原帖链接。"""

K_P_TITLE = "title"
"""待修行:标题。"""

K_P_EMPLOYER = "employer"
"""待修行:雇主名(公司行的 name)。"""

K_P_DATE = "date_posted"
"""待修行:发布日(排序键:新 → 旧)。"""

K_P_MISSING = "missing"
"""待修行:缺的格(六格名的子集,按六格顺序)。"""

K_P_HAVE = "have"
"""待修行:算数的已有格 → 值(qwen 填的不在里面)。"""

K_P_STATED = "stated_none"
"""待修行:原帖明写不公布的格 → 原文(给修的人看,这些格不算缺)。"""

K_P_TEXT = "text"
"""待修行:原帖正文(Opus 从这里摘原句)。"""

PENDING_DONE_TPL = "  待修清单:不全 {n} 条(按来源 {by_origin};按格 {by_field})→ {out}"
"""待修清单落盘留痕。"""

HELD_MAX_RATIO = 0.45
"""扣下比例的保险丝(2026-09-28 Frank 确认下线时说好的):一轮算出要扣下的岗超过在招的这个比例,当判「全」的程序出了错,
整轮停下不落盘(不上传、不灌库),防止一次清空职位板。接闸当天实测 35%(23,861 / 67,796)。"""

HELD_GUARD_TPL = "扣下 {held} / {total} 条(占 {pct:.1%}),超过保险丝 {cap:.0%},当判「全」出错,整轮停下不落盘"
"""保险丝熔断时抛出的话。"""

HELD_DONE_TPL = "  扣下不全岗 {held} 条(占 {pct:.1%}),jobs.json 只装齐全的 {kept} 条;已在架的由 seed 照 held_jobs 关掉"
"""扣下留痕。"""


# =========================================================================
# 15. 榜单(E5-02,PRD F8:计算全部下沉数据层,前端只 SELECT rankings 渲染)
# =========================================================================

IN_MART_JOBS = paths.MART / "jobs.json"
"""榜单与统计的输入:汇装产出的岗位表(两步都跑在汇装之后)。"""

IN_MART_COMPANIES = paths.MART / "companies.json"
"""榜单的输入:汇装产出的公司表。"""

OUT_RANKINGS = paths.MART / "rankings.json"
"""榜单产物(seed 灌 rankings 表)。"""

STATUS_CLOSED = "closed"
"""岗位状态:已下架(榜单与统计一律先滤掉)。"""

K_COMPANY_NAME = "companyName"
"""公司名冗余进 job 行的列(展示用;E4-03:页面零 join 零计算)。"""

WEEKLY_N = 50
"""本周新增榜的名额。"""

WEEKLY_DAYS = 7
"""本周新增的窗口。"""

SLUG_WEEKLY_TOP = "weekly-top"
"""榜 1 的 slug(即 URL 段)。口径注:mart 无 firstSeen(它是 DB 侧种入时间戳),
用 datePosted 表达「本周新增」,偏离文档已记档。"""

WEEKLY_DONE_TPL = "weekly-top: 池 {pool} → TOP {n}"
"""榜 1 报数。"""

DAILY_N = 20
"""每日精选 TOP N(全国与各大类同)。"""

DAILY_MIN = 5
"""大类榜起榜门槛(岗不够当天不出榜 —— 宁缺,不凑数)。"""

DAILY_SCORE_GATE = 60
"""每日精选的质量门槛(与 match「高」档同线)。"""

DAILY_DAYS = 2
"""每日精选的窗口:近 48h 新发布(帖面日期,给东部时区/晚发帖留余量)。"""

SLUG_DAILY_TOP = "daily-top"
"""榜 3 全国榜的 slug。"""

DAILY_SLUG_TPL = "daily-top-{key}"
"""榜 3 大类榜的 slug 形(2026-07-16 用户拍板「榜单可以有不同类别」;key 走 noc 域的大类
slug 表,ascii 化进 URL)。"""

DAILY_DONE_TPL = "daily-top: 池 {pool}(近48h·评分≥{gate})→ 出榜 {made} 个(全国+大类)"
"""榜 3 报数。"""

SPONSOR_N = 30
"""最可能担保雇主榜的名额。"""

SLUG_SPONSOR_LIKELY = "sponsor-likely"
"""榜 2 的 slug。入榜门槛(E6-02 升级):LMIA 雇佣史(实证)或 具名通道命中(省点名),
二者其一。排序 (LMIA 获批职位数, 具名通道岗数, 在招岗数, 平均分) 降序 —— LMIA 雇佣史是
最硬证据,第一排序键。"""

SPONSOR_DONE_TPL = "sponsor-likely: 公司 {total} → 具名命中 {n} 家进榜"
"""榜 2 报数。"""

RANK_KIND_JOB = "job"
"""榜行类型:岗位。"""

RANK_KIND_COMPANY = "company"
"""榜行类型:公司。"""

RANK_IN_TPL = "IN : {jobs}\nIN : {companies}\nOUT: {out}"
"""榜单步的 IN/OUT 声明(宪法既有:运行时打印)。"""

RANK_DONE_TPL = "rankings: {n} 行 → {out}"
"""榜单步收尾。"""


# =========================================================================
# 16. 地区统计(E5-04 省×大类×中类 + E8-14 日/职业/城市 + E13 派生 + E14 担保率)
# =========================================================================

IN_DIFFICULTY = paths.PROCESSED / "difficulty.json"
"""E12-07:省难度指数(04e 产出;缺文件=不挂,列留空)。"""

IN_MART_CLOSED = paths.MART / "closed_jobs.json"
"""汇装写的实测判死名单(externalId+closedAt)—— avg_days_open 只认它。"""

IN_MART_NOC_DESC = paths.MART / "noc_descriptions.json"
"""职业名(官方名,已随汇装产出)。⚠ 与 IN_NOC_DESC 不是一份:那份是 raw 侧的官方全量名录。"""

IN_LMIA_XLSX_DIR = paths.LMIA
"""E14-02 担保率分子:tfwp_YYYYqN_pos_en.xlsx 季度源(lmia 域已缓存,原地复用不重下)。"""

IN_JVWS_RAW = paths.JVWS / "jvws-vacancies.json"
"""E14-02 担保率分母:JVWS 空缺(wages 域 build_statcan_jvws 产,已按 StatCan 抑制规则把
不可发布值设 None)。"""

OUT_STATS = paths.MART / "stats.json"
"""省 × 大类 × 中类 预聚合(seed 灌 stats 表;页面零计算只渲染)。

行 = 省 × 大类 × 中类(mid='all'=大类汇总;broad='all'=省级汇总;2026-07-19 Frank 拍板加中类层:
「有了统计信息才会给人提供选哪个行业哪个地区的概率指导」——图表下钻 省→大类→中类→职位板):
  openJobs           在招岗数(本站抓取口径)
  new7d              7 天新增(datePosted 近 7 天)
  medianWageAnnual   中位年薪 —— 口径=ESDC:取该桶内各岗「所在 NOC×省 的 ESDC 中位年薪」的中位数(不是帖面薪资)
  medianSalaryAnnual 帖面中位年薪 —— 口径=本站折算:该桶内岗位帖面年薪的中位数(对照用)
  namedJobs / streamLabels  省具名通道命中岗数 + 通道名列表(来自省官网清单)
  aipJobs            AIP 指定雇主岗数(大西洋四省)
  topCities          桶内在招量前 5 的城市(json:[{city,n}])
"""

OUT_DAILY = paths.MART / "stats_daily.json"
"""E8-14 每日快照:只产出**今天这一天**的行,seed 按 (date,province,broad) UPSERT 追加,
永不 DELETE。趋势图的唯一数据来源;历史补不回来 —— 落地那天才是第一个点,所以先于主图建起来。"""

OUT_OCC = paths.MART / "stats_occupation.json"
"""职业 × 省(province='all' 为全国行)。"""

OUT_CITY = paths.MART / "stats_city.json"
"""城市粒度。E8-14 主图的两个新粒度(现有 stats 是 省×大类×中类,出不了「具体职业」与
「城市」两条横轴);都是「当下状态」的维度表(走 dims 的清空+重灌),与 stats_daily 的
追加语义不同。"""

PROVS = ["ON", "BC", "AB", "SK", "MB", "QC", "NS", "NB", "NL", "PE"]
"""统计口径里的十省(v1 只做省级,市级后置;RNIP 待 E6 有数据再并入)。"""

PNP_PROV_ORDER = ["BC", "AB", "SK", "MB", "ON", "NB", "NS", "PE", "NL"]
"""E13-05 榜A「可提名省份」列的省序(工作项文档 §3.1 写死);
QC 由 pnp_eligible 内部按 NON_PNP_PROV 自然排除,不入序。"""

STATS_NEW_DAYS = 7
"""stats 的 new7d 窗口。"""

TOP_CITIES_N = 5
"""topCities 只带前 5。"""

PULSE_W_MOM = 0.5
"""pulse_score 复合脉象分:动量分量权重(设计文档 §3 写死,前端/后续改动不许绕过 ETL 改权重)。
v2:动量分量从 net30d/openJobs 换成 mom30d(环比涨跌);v3:再换成 mom14d,权重不变。"""

PULSE_W_NAMED = 0.3
"""具名通道占比分量权重。"""

PULSE_W_WAGE = 0.2
"""薪资偏离分量权重。"""

PULSE_ROUND = 4
"""pulse_score 的小数位。"""

COVERAGE_COMPLETE = date(2026, 7, 2)
"""稳定覆盖起点。E13-02 v3(2026-08-06 晚,再修订):mom30d 的分母窗口 (T−60d,T−30d] 撞上
本站抓取从局部覆盖扩到全 10 省全职业的爬坡期(实测:2026-06-18~06-25 那周从 94 条跳到
3608 条,此后才稳定在 1.1~1.3 万/周)—— 60 天窗口只要还咬到爬坡期,mom30d 就是「跟当年数据
本来就少的自己比」,不是真实环比(v2 实测中位数 +169%)。分母窗起点 T−60d 早于它,整列
mom30d 写 null(8-31 起 T−60d 滑过 07-02,自然解禁,不用改代码)。mom14d 的四个窗口边界
(T、T-14d、T-28d)全晚于它,眼下唯一干净的环比。"""

FLOW_14D = 14
"""两周窗(new7d 同源手法,窗口换成 14 天)。"""

FLOW_28D = 28
"""上两周窗的起点。"""

FLOW_30D = 30
"""30 天窗。"""

FLOW_60D = 60
"""上一个 30 天窗的起点。"""

MOM_MIN_PREV = 5
"""环比的分母样本下限(不够就写 null,不硬算)。"""

AVG_DAYS_MIN_N = 5
"""平均在招天数的样本下限。"""

K_NEW30D = "new30d"
"""流量桶:近 30 天新发。"""

K_NEW30D_PREV = "new30d_prev"
"""流量桶:上一个 30 天窗新发。"""

K_NEW14D = "new14d"
"""流量桶:近 14 天新发。"""

K_NEW14D_PREV = "new14d_prev"
"""流量桶:上一个 14 天窗新发。"""

K_CLOSED30D = "closed30d"
"""流量桶:近 30 天下架(判死台账口径)。"""

K_NET30D = "net30d"
"""流量桶:净增。"""

K_MOM30D = "mom30d"
"""流量桶:30 天环比(撞爬坡期整列 null)。"""

K_MOM14D = "mom14d"
"""流量桶:14 天环比(pulse_score 的动量分量)。"""

FLOW_BLANK = {"new30d": 0, "new30d_prev": 0, "new14d": 0, "new14d_prev": 0, "closed30d": 0,
              "net30d": 0, "mom30d": None, "mom14d": None}
"""查不到流量桶时的空档 —— 该 noc×province 在本轮 postings.json 里没有可归属的样本,
真实 0(不是没算)。"""

QUARTER_FILE_RE = re.compile(r"tfwp_(\d{4}q\d)_pos_en\.xlsx$", re.I)
"""LMIA 季度源的文件名形(取季度码)。"""

LMIA_XLSX_GLOB = "tfwp_*_pos_en.xlsx"
"""同上的扫描样式。"""

LMIA_XLSX_TPL = "tfwp_{quarter}_pos_en.xlsx"
"""按季度码拼文件名。"""

K_QUARTERS_LIST = "quarters"
"""JVWS raw 表里的季度清单键(与 K_QUARTERS 同串,两处语义不同故各留一名)。"""

NOC_RE = re.compile(r"^(\d{4,5})")
"""ESDC 季度 xlsx 的 Occupation 列形如 "63200-Cooks",取前缀数字当 NOC。
沿革:原是「复用 lmia 域的 NOC_RE(单一来源,不复制口径;2026-08-30 lmia 全溶后改指
lmia/constants.py)」。
🔴 2026-08-31 批H:本件迁进 mart 域后,`from lmia.constants import ...` 撞形制闸①「域间禁
import」(在根上时不被扫,搬家把这条既有跨域边照出来了)。移动批不许改行为、也不许动 lmia,
故就地按同一形声明本域副本(值逐字同 lmia/constants.py 的 NOC_RE)。
2026-08-31 lead 判:**合规,不是口径分叉** —— 宪法「形状(type/词汇)重复先忍着,各域自己
声明;行为(函数)重复才不许」(Lang 三字面量各域自抄同例);一条四字符正则是词汇不是判定
逻辑。若哪天两边真漂移,形制闸的下一道「同名常量值对账」再收拢,现在不抽公共。"""

LMIA_HEADER_WORD = "Province"
"""季度 xlsx 的表头首格判据。"""

LMIA_MIN_COLS = 8
"""有效数据行的最少列数(不足,或 Employer 那格为空 = 尾部注释/空行,跳过)。"""

JVWS_NATIONAL = "NAT"
"""JVWS 的全国行(省级担保率需要省级 LMIA×NOC 拆分,本轮不做,YAGNI)。"""

SPONSOR_RATE_ROUND = 4
"""担保率的小数位。"""

LMIA_SOURCE_NOTE = "ESDC TFWP positive LMIA positions (open.canada.ca 90fed587)"
"""担保率分子的出处(证据串里逐字落盘)。"""

JVWS_SOURCE_NOTE = "StatCan 14-10-0444-01"
"""担保率分母的出处。"""

TIER_BOTH = "both"
"""E13-07 通道档:省具名 ∪ 联邦 EE 都点名(双头)。"""

TIER_PROV = "prov"
"""通道档:只有省点名。"""

TIER_FED = "fed"
"""通道档:只有联邦点名。"""

TIER_EE = "ee"
"""通道档:都没点名但 TEER 0-3 还有 EE 泛池。"""

TIER_EMPLOYER = "employer"
"""通道档:TEER 4-5 只剩雇主担保(最难);TEER 未分类不硬塞档(返 None)。"""

PROV_MODE_DIRECT = "direct"
"""省份清单模式:拿 offer 即可(pnpProvs)。"""

PROV_MODE_COND = "cond"
"""省份清单模式:先省内同雇主 6 个月(pnpProvsCond = eligible−direct)。"""

PROV_MODE_DEAD = "dead"
"""省份清单模式:完全无路可走(deadProvs = 9 省内 any_pr_path=False 的补集;空串=处处有路)。"""

K_GENERATED = "generated"
"""难度指数的生成时刻(挂进 jsonb)。"""

K_OPEN_JOBS = "openJobs"
"""统计行:在招岗数。"""

K_NAMED_JOBS = "namedJobs"
"""统计行:省具名通道命中岗数。"""

K_MEDIAN_SALARY_ANNUAL = "medianSalaryAnnual"
"""统计行:帖面中位年薪(本站折算,当下行情,样本薄时会失真)。"""

K_MEDIAN_WAGE_ANNUAL = "medianWageAnnual"
"""统计行:ESDC 官方中位年薪(权威基线,不随我们抓到多少帖子而漂)。"""

K_PULSE_SCORE = "pulseScore"
"""统计行:复合脉象分。"""

STATS_IN_TPL = "IN : {jobs}\nOUT: {out}"
"""统计步的 IN/OUT 声明。"""

FLOW_IN_TPL = "IN : {postings}\nIN : {expired}\nIN : {closed}  (E13-02 v3 派生指标)"
"""流量派生的三个输入。"""

FLOW_COUNT_TPL = ("  flow keys(noc×province,含 all): {flow} · avg_days_open 有效样本(≥5): "
                  "{avg} · daily_closed 桶(province×broad): {daily}")
"""流量派生的报数。"""

FLOW_NO_POSTINGS_TPL = ("  ⚠ {path} 不存在,new30d/new30d_prev/mom30d/new14d_prev/mom14d/"
                        "closed30d/avg_days_open/stats_daily.closed 留空(0/null)")
"""没有 postings 时的留痕。"""

SPONSOR_NO_QUARTER = "  ⚠ E14-02: LMIA 与 JVWS 无共同季度,stats_occupation.sponsor_* 四列整列写 None"
"""担保率无共同季度时的留痕。"""

SPONSOR_IN_TPL = "IN : {xlsx}\nIN : {jvws}  (E14-02 担保率同季 {quarter})"
"""担保率的两个输入。"""

SPONSOR_COUNT_TPL = ("  sponsor_quarter={quarter}: LMIA {lmia} 个 NOC 有获批记录 · "
                     "JVWS NAT {jvws} 个 NOC 有分母行")
"""担保率的报数。"""

DAILY_ROWS_TPL = "stats_daily: {n} 行(日期 {today})→ {out}"
"""每日快照报数。"""

OCC_ROWS_TPL = "stats_occupation: {n} 行({nocs} 个职业)→ {out}"
"""职业表报数。"""

CITY_ROWS_TPL = "stats_city: {n} 行 → {out}"
"""城市表报数。"""

STATS_ROWS_TPL = "stats: {n} 行({provs} 省;大类层 {base} 行 + 中类层 {mid} 行)→ {out}"
"""省级表报数。"""


# =========================================================================
# 17. 跨源清洗:地点(ATS + JB 同一套 country/province/city/district/address)
# =========================================================================

OUT_JOBBANK = IN_JOBBANK
"""Job Bank 累积 store 的**原地写回**别名 —— 本域三个跨源清洗段(地点/薪资/试点)读它写它。
2026-08-31 批J:clean/ 目录退役,三件按「谁的数据谁清洗」归户 mart(判据:它们跨源
——ATS 与 JB 过同一套尺子——不归任何单源域)。"""

IN_FSA_TABLE = paths.FSA / "fsa-districts.json"
"""全国 FSA→区 维度表(GeoNames 衍生,我们自己维护,无外部 API)。FSA → {main, hood, prov}。
⚠ 溶解前是模块顶的 import 期加载(`json.loads(...) if exists else {}`),现在改在段入口读一次
经入参下传:constants 叶子只许 import re/date/paths,装不下读盘结果 —— 读的还是同一份、
同样「文件缺就空表」,判定一格未改。"""

OTTAWA_DISTRICTS = {
    "kanata": "Kanata", "kanata north": "Kanata", "nepean": "Nepean", "gloucester": "Gloucester",
    "orleans south": "Orléans", "orléans": "Orléans", "orleans": "Orléans",
    "stittsville": "Stittsville", "manotick": "Manotick", "barrhaven": "Barrhaven",
    "vanier": "Vanier", "cumberland": "Cumberland", "greely": "Greely", "carp": "Carp",
    "dunrobin": "Dunrobin", "metcalfe": "Metcalfe", "osgoode": "Osgoode",
    "richmond": "Richmond", "rockcliffe": "Rockcliffe",
}
"""大渥太华市社区:各种写法 → 规范名(Orléans 合并、Kanata North→Kanata)。"""

OTTAWA_DISTRICT_KEYS = sorted(OTTAWA_DISTRICTS, key=len, reverse=True)
"""社区名按长度降序(长的先试:「kanata north」要压过「kanata」)。
原件每判一个岗都现排一次 `sorted(..., key=lambda kv: -len(kv[0]))`;lambda 是显式循环令
禁的,且那是循环不变量 —— 提到常量层排一次,顺序逐字相同(Python 排序稳定,
`key=len, reverse=True` 与 `key=-len` 升序对等长键给出同一相对序)。"""

FSA_DISTRICT = {
    "K2K": "Kanata", "K2L": "Kanata", "K2M": "Kanata", "K2T": "Kanata", "K2V": "Kanata",
    "K2W": "Kanata",
    "K2S": "Stittsville",
    "K2J": "Barrhaven",
    "K2H": "Nepean", "K2E": "Nepean", "K2G": "Nepean", "K2C": "Nepean",
    "K1C": "Orléans", "K1E": "Orléans", "K4A": "Orléans",
    "K1B": "Gloucester", "K1J": "Gloucester", "K1T": "Gloucester",
    "K1K": "Vanier", "K1L": "Vanier",
    "K4M": "Manotick", "K4P": "Greely",
}
"""邮编兜底:渥太华郊区 FSA(前3位)→ 社区。只收高置信度单一社区的 FSA;
central Ottawa(K1A/K1N/K1P/K1R/K1S/K1Y/K2P…)跨多社区,不映射 → 留空(不瞎猜)。"""

POSTAL_FSA_RE = re.compile(r"\b([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d\b")
"""加拿大邮编 A1A 1A1 → 取 FSA(前三位)。"""

OTTAWA_FSA_PREFIX = ("K1", "K2")
"""邮编 K1*/K2* 几乎全是渥太华市(用邮编判定,避免 "Richmond Hill" 撞 Ottawa 社区名)。
⚠ 原 clean/04c 里就是**声明了没人用**的一条(JB 那支写的是硬编码 K1/K2/K4 三元组,
见 OTTAWA_JB_FSA);批J 溶解只搬不裁 —— 留着这条决策记录,裁不裁是另一批的事。"""

OTTAWA_CITY = "Ottawa"
"""大渥太华的规范市名(社区一律折叠回它)。"""

OTTAWA_CITY_LOWER = "ottawa"
"""判「文本里提到渥太华没有」用的小写词。"""

OTTAWA_CITY_NAMES = set(OTTAWA_DISTRICTS) | {OTTAWA_CITY_LOWER}
"""无邮编时:按 city 精确名判定(不子串匹配地址)。"""

OTTAWA_COMMUNITIES = set(OTTAWA_DISTRICTS.values())
"""大渥太华社区规范名集合(用于把 Kanata/Gloucester… 折叠回 city=Ottawa)。"""

OTTAWA_JB_FSA = ("K1", "K2", "K4")
"""Job Bank 那支判「大渥太华」的邮编前两位(比 ATS 那支多一个 K4:Orléans/Manotick/Greely)。"""

FSA_PREFIX_LEN = 2
"""上一条比的是 FSA 的前几位。"""

NON_CITY_PREFIXES = ("various location", "undetermined location", "various", "multiple location")
"""Job Bank 上「多地点/待定」占位词:不是真城市,city 留空(宁可留空也不瞎猜)。"""

COUNTRY_CANADA = "Canada"
"""清洗后 country 恒为它(全站只收加拿大岗)。"""

WORD_BOUND_TPL = r"\b{key}\b"
"""社区名整词匹配的正则模板(key 已 re.escape)。"""

COMMA_SPACE_RE = re.compile(r"\s+,")
"""地址里逗号前的空白(归一成纯逗号)。"""

DIGIT_RE = re.compile(r"\d")
"""地址里有没有数字 —— 没有街号/邮编的「City, ON」不算精确地址。"""

TRIM_SPACE_COMMA = " ,"
"""地址首尾要剥掉的空格与逗号。"""

ATS_REMOTE_RE = re.compile(
    r"\W*(?:(?:remote|hybrid|anywhere|work from home|wfh|canada|ontario|on|ca|in|within|across|based)\W*)+", re.I)
"""ATS 岗的「远程 / 全国 / 全省」地点写法(整格只由这些词组成才算:Canada、Ontario、Remote - Canada、Remote in Ontario …)。
2026-09-19 Frank「远程岗按总部算渥太华」:公司本部在渥太华的,这类岗算渥太华(区留空)。起因:Solink 19 岗里 14 个、
Rewind 3 个全是这种写法,原规则按「判不出是渥太华」整批丢。带别的地名的(Montreal, QC / Italy / United States)不在此列,照旧丢。"""

OTTAWA_LOOKALIKE_RE = re.compile(r"new orleans|nouvelle[- ]orl[eé]ans", re.I)
"""长得像渥太华社区名的外地地名:判社区前先从文本里拿掉(2026-09-19 实撞:Check Point 的「Legal Counsel — New Orleans, LA」
整词命中 orleans → 判成渥太华 Orléans 区进了板)。发现新的撞名往这里加。"""

ENTITY_RE = re.compile(r"&(?:[a-z]{2,8}|#\d{1,6}|#x[0-9a-f]{1,5});", re.I)
"""HTML 实体转义符(`&amp;` `&#39;` `&#8211;` `&#xa;` …)。2026-09-19 数据体检:1,128 条在招岗正文、41 个标题、28 个公司名里
残留着它(来源平台把转义过的文本原样给出,CareerBeacon / Jobboom / CivicJobs / Workday 最多),页面上直接露出 `&amp;`。
汇装这头统一还原 —— 跨源清洗归 mart,不逐个来源去补。"""

ENTITY_BREAK_TAG_RE = re.compile(r"<(?:br\s*/?|/p|/li|/div|/h[1-6])>", re.I)
"""还原出来的换行类标签(`&lt;br&gt;` 还原后就是 `<br>`):换成换行。"""

ENTITY_TAG_RE = re.compile(r"</?[a-z][a-z0-9]*(?:\s[^<>]*)?>", re.I)
"""还原出来的其余标签:拿掉。"""

K_COMPANIES = "companies"
"""to_mart_tables 字典里公司表的键(落盘前还原公司名转义符时取表用)。"""

K_HQ = "hq"
"""公司档(profile.json)的键:本部所在市(人工核定;空串 = 没核过)。"""

ATS_LOC_TPL = "{city} {addr}"
"""ATS 岗判地点时把「地点字段 + 地址字段」拼一处再查社区/邮编。"""

JB_LOC_TPL = "{city} {addr}"
"""Job Bank 岗取邮编时同款拼法(两支各自成文,拼的字段不同源)。"""

K_COUNTRY = "country"
"""岗位行键:国家。"""

K_ADDRESS = "address"
"""岗位行键:精确地址(无街号则空)。"""

K_CITY_RAW = "city_raw"
"""岗位行键:原始市名。幂等靠它 —— 清洗读写同一个 city 字段会自污染(第二轮拿上一轮
折叠过的 Ottawa 再折一次),故把原始值隔离存一格,永远从它清洗。"""

K_MAIN = "main"
"""FSA 维度表里的主地名格。"""

K_HOOD = "hood"
"""FSA 维度表里更细的社区格(main = 城市本身时用它)。"""

PROV_MISSING_MARK = "?"
"""收尾省份分布里缺省码的占位。"""

PRINT_LOC_ATS_TPL = "ATS: kept {kept} Ottawa jobs, dropped {dropped} non-Ottawa."
"""ATS 那一轮的报数(焦点区外的岗直接丢)。"""

PRINT_LOC_BACKFILL_TPL = "Job Bank: 省份兜底补全 {n} 帖(同名城市唯一省)。"
"""省份兜底命中时才打的一行。"""

PRINT_LOC_DONE_TPL = "Job Bank: structured {n} postings across {provs} provinces {dist}."
"""地点清洗收尾一行。"""


# =========================================================================
# 18. 跨源清洗:薪资(raw salary 串 → salaryAnnual / salaryText)
# =========================================================================

SAL_NUM_RE = re.compile(r"\d[\d,]*(?:\.\d+)?")
"""无 $ 回退时认的裸数字。"""

SAL_MONEY_RE = re.compile(r"\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*\$?\s?(\d[\d,]*(?:\.\d+)?))?")
"""只取「$ 锚定」的金额(含范围):$24.74-31.37 / $700,000 to $775,000。
避开杂数:工会号(CUPE 1975)、Phase 4、邮编等没有 $ 前缀的数字。"""

SAL_EXTRA_RE = re.compile(r"\+|\bplus\b|\bcommission\b|\bbonus(?:es)?\b|\btips?\b|\bgratuit", re.I)
"""佣金/奖金/补贴子句:该词及之后不算底薪("$25 hourly + $400 commission per sale" 只取 $25)。"""

SAL_PAREN_MONEY_RE = re.compile(r"\([^)]*\$[^)]*\)")
"""含 $ 的括号=换算注释("$40.39 ($6,552.07/mo)"),剥掉再解析;
纯文字括号(to be negotiated)无害不动。"""

SAL_PLAIN_OK = {"per", "hour", "hourly", "hr", "hrs", "h", "year", "yr", "yearly", "annually",
                "annual", "annum", "month", "monthly", "mo", "week", "weekly", "wk", "weeks",
                "biweekly", "bi", "day", "daily", "cad", "to", "a", "an", "and", "from",
                "based", "on", "as", "with", "depending", "depends", "experience", "negotiable",
                "commensurate", "starting", "wage", "rate", "salary", "pay"}
"""无 $ 回退的白名单:纯数字+单位/连接/议薪词才可信("48.85 - 61.21"、
"20-35/hr depending on experience"),其余("35% commission"、"CUPE 777"、
"after 90 Days")一律不猜。"""

SAL_WORD_RE = re.compile(r"[a-z]+")
"""回退白名单比对时切出来的英文词。"""

PERCENT_SIGN = "%"
"""文本里带百分号 = 提成口径,一律不猜。"""

SAL_UNIT_HR = "hr"
"""薪资单位:时薪。"""

SAL_UNIT_DAY = "day"
"""薪资单位:日薪。"""

SAL_UNIT_WK = "wk"
"""薪资单位:周薪。"""

SAL_UNIT_BIWK = "biwk"
"""薪资单位:双周薪。"""

SAL_UNIT_MO = "mo"
"""薪资单位:月薪。"""

SAL_UNIT_YR = "yr"
"""薪资单位:年薪。"""

SAL_MULT = {"hr": 2080, "day": 260, "wk": 52, "biwk": 26, "mo": 12, "yr": 1}
"""年化倍数:时薪×2080、日薪×260(工作日)、周×52、双周×26、月×12。"""

SAL_SUB = {"hr": "/hr", "day": "/day", "wk": "/wk", "biwk": "/2wk", "mo": "/mo", "yr": "/yr"}
"""规范文本的单位后缀。"""

SAL_BIWEEK_RE = re.compile(r"bi[-\s]?week|every\s+two\s+weeks|fortnight")
"""双周口径(必须在 week 之前判)。"""

SAL_DAILY_RE = re.compile(r"\bdaily\b|per\s+day|/\s?day")
"""日薪口径(daily 单列,防 "per day" 落进兜底)。"""

SAL_HOUR_RE = re.compile(r"hour|/\s?hr|hourly")
"""时薪口径。"""

SAL_MONTH_WORD = "month"
"""月薪判词(子串)。"""

SAL_WEEK_WORD = "week"
"""周薪判词(子串;双周已在它之前判掉)。"""

SAL_PER_UNIT_RE = re.compile(
    r"\bper\s+(?:night|km|kilometre|kilometer|mile|sale|piece|load|trip|visit|session)\b", re.I)
"""计次/计程价(per night/km/mile…):基数不是时间,无法年化;漏检会走 hi<2000→hr 兜底
(DJ "$400-$500 per night" 折出 $93.6 万实撞)。搜 raw:计价词可能落在佣金剪切段里
("$.30 commission per kilometre" 剪剩 "$.30")。只在单位兜底分支触发,不影响
"$67,500 annually + commission per sale" 这类带明确时间单位的帖。"""

SAL_ANNUAL_MAX = 1_000_000
"""护栏(E7-04 回归:榜首出现 49.7 亿年薪 —— 源 typo 漏过旧过滤):
全库合法最高年薪 ~$810K(医生岗),超限=源 typo,置 NULL 不猜。"""

SAL_RATIO_MAX = 10
"""合法区间高/低比 ≤~9;超限=源 typo(「$20.00 to $999.00 hourly」)→ 整条不可信。"""

SAL_HOURLY_FOLD_MAX = 150
"""E6-12 诚实年化:时薪中点>150 的全是出诊/计费价(医生 $200-400、验光师 $300-400)或
可疑帖($200-300/hr 的 "software developer"),×2080 折出 $52-94 万冒充年薪霸占 salaryYr
榜首;真高薪岗直接标 annually(皮肤科 $550K-850K)不受影响。超阈值=保留时薪文本,
年薪置空不折算(ESDC 对医生类 NOC 的中位时薪本身就 $200+/hr 计费价口径 —— 高时薪
不是异常值,×2080 才是)。"""

SAL_UNIT_MIN = {"hr": 11, "day": 104, "wk": 104, "biwk": 104, "mo": 104, "yr": 5000}
"""各单位的下限(2026-09-19 数据体检:日薪那一档的护栏扩到全部单位):高值低于它 = 这个数不可能是这个单位的薪资,整条置空。
时薪 < $11 比全国任何一档最低工资都低(「$10.00 hourly」「$5.00 hourly + 20% commission」实撞;不取 $13 ——
魁省小费岗最低时薪就在 $12 多,全库实测「$12.60 / $12.90 hourly」的酒保与服务员是真薪资,不能拦);周 / 双周 / 月薪 < $104 连一周干一天都不够 ——
实撞「$14.00 to $15.75 biweekly」(时薪填进了双周格)、「$35.00 weekly + 10% commission」、
「$35/hr, increases at 6 months」(被「6 months」带成月薪,年化 $420);年薪 < $5,000 同理(「$2,702.00 hourly」被折成年薪 $2,702)。
下限故意放得很低:周 / 月 / 年薪偏低的可能是兼职(原判「分不出,不动」照旧),这里只拦**不可能**的,不拦偏低的。
日薪档的值与来历见 SAL_DAY_MIN。"""

SAL_DAY_MIN = 104
"""日薪下限:一天 8 小时 × $13(比全国任何一档最低工资都低,含魁省小费岗)。低于它的「日薪」不可能是真日薪 ——
2026-09-19 Frank 实拍 Maarut 六个岗(software developer / solution architect / data scientist)全标「$101.00 daily」,
年化 $26,260、「vs 中位 −74%」:那是外包公司经 Talent.com 推给 Job Bank 的占位数(多半是时薪填进了日薪格)。
同 08-05 拍板「判不了就不说」:年薪与薪资文本都置空,不替源头的错背书。只拦 daily 一档 —— 周 / 月 / 年薪偏低的
可能是兼职,分不出,不动。"""

SAL_GIG_HI_MAX = 2000
"""计次价那条只在「将被兜底猜成时薪」的路径上拦(上限 <2000);也是「时薪还是年薪」
兜底判定的分界。"""

SAL_HOURLY_YR_MIN = 1000
"""时薪值 ≥$1000 → 实为年薪(源误标)。"""

SAL_MONTHLY_YR_MIN = 20_000
"""月薪 ≥$2万 → 实为年薪(源误标,同上)。"""

SAL_K_DIV = 1000
"""年薪显示按千元折(「$96K」)。"""

SAL_K_TPL = "${n}K"
"""年薪档的一个金额说法。"""

SAL_DOLLAR_TPL = "${n}"
"""非年薪档的一个金额说法。"""

SAL_ONE_TPL = "{money}{sub}"
"""单值薪资的规范文本(如 "$35/hr")。"""

SAL_RANGE_TPL = "{lo}–{hi}{sub}"
"""区间薪资的规范文本(如 "$96K–$135K/yr";连接号是 EN dash,逐字沿用)。"""

SAL_TXT_DOLLAR = "$"
"""正文里连一个 $ 都没有就不挖(两档的每种金额写法都带 $;2026-09-27 加这道前置:新写法的正则比原来重一倍,
本地 29,219 条板帖正文里只有 11,690 条带 $,先筛掉其余,整轮反比原来快)。"""

SAL_TXT_SP = r"[ \u00a0\u202f]"
"""金额里当千分位用的空格:普通空格 / 不换行空格 / 窄不换行空格三种(2026-09-27 Frank 勾「薪资抽取补三种写法」:
Nunavik 那批帖写「Min. $98 420 yearly」、魁省法文帖写「47 000 $」)。只作拼装用,不单独 compile。"""

SAL_TXT_AMT_PRE = (r"\$\s?(?:\d{1,3}(?:" + SAL_TXT_SP + r"\d{3}(?!\d))+(?:\.\d+)?(?!\.?\d)"
                   r"|\d[\d,]*(?:\.\d+)?(?!\.?\d)(?!,\d)[Kk]?(?!" + SAL_TXT_SP + r"\d{3}(?!\d)))")
"""$ 在数前的一个金额:原写法(千分位逗号 / 任意小数位 / K 后缀)+ 空格千分位(「$98 420」)。只作拼装用。
几道后看守 2026-09-27 立:数后面不许还跟着数 —— 不拦的话回溯会把「$98 420」切成「$98」、把「$74.984.00」切成「$74.98」,
原写法下 Nunavik 帖「Min. $43 348 yearly」被读成 $43 时薪、「starting annual salary of $74.984.00」被读成 $74.98 时薪(本地对拍实撞)。"""

SAL_TXT_BARE = (r"(?<![\d.,$])(?:\d{1,3}(?:(?:" + SAL_TXT_SP + r"|,)\d{3}(?!\d))+|\d+)"
                r"(?:[.,]\s?\d{1,2}(?!\d))?")
"""不带 $ 的一个数(法文写法:空格或逗号千分位、逗号或点小数 ——「47 000」「18,50」「17, 00」;2026-09-27)。
前看守:不许从别的数中间起头。只作拼装用:后面跟 $ 就是 SAL_TXT_AMT_POST;法文区间的下限可以不带 $(见 SAL_TXT_MONEY)。"""

SAL_TXT_AMT_POST = SAL_TXT_BARE + r"\s?\$(?!\s?\d)"
"""$ 在数后的一个金额(魁省法文帖「25$」「47 000 $」「18,50 $」;2026-09-27)。只作拼装用。
后看守:$ 后面紧跟数字说明它是下一个金额的前缀 ——「Pay Band 17 $40.610 to $43.510」里的 17 是工资级别号,
不拦就读成 $17 时薪(本地对拍实撞)。"""

SAL_TXT_AMT = "(?:" + SAL_TXT_AMT_PRE + "|" + SAL_TXT_AMT_POST + ")"
"""正文里一个金额的写法($ 锚定,允许千分位 / 任意小数位 / K 后缀)。只作拼装用,不单独 compile。
2026-09-27 起是两种写法的并:SAL_TXT_AMT_PRE(上一句说的原写法 + 空格千分位)与 SAL_TXT_AMT_POST($ 在数后的法文写法)。"""

SAL_TXT_PER_HR = (r"per\s+hour|an\s+hour|/\s?hour|/\s?hr\b|hourly|par\s+heure|/\s?heure"
                  r"|(?:de\s+|à\s+)?l['’]\s?heure|/\s?h\b")
"""按小时的周期词(英法;2026-09-27 补法文「de l'heure」「l’heure」「/h」)。只作拼装用。"""

SAL_TXT_PER_YR = (r"per\s+year|/\s?year|annually|per\s+annum|yearly|a\s+year|par\s+ann[ée]e|par\s+an\b"
                  r"|/\s?ann[ée]e|/\s?an\b|l['’]an\b|annuellement")
"""按年的周期词(英法;2026-09-27 补「a year」与法文「par année」「par an」「/an」「annuellement」)。只作拼装用。"""

SAL_TXT_PER_BIWK = r"bi[-\s]?weekly|every\s+two\s+weeks|aux\s+deux\s+semaines|toutes\s+les\s+deux\s+semaines"
"""按两周的周期词(2026-09-27 立:CareerBeacon 大西洋省公职帖「Salary Range: $2,013.12 - $2,244.03 Bi-Weekly」)。
换年薪走 SAL_MULT 的 biwk 26 期 —— 与 Job Bank 仓按周 / 按月那套同一张倍数表,不另立常量。只作拼装用。"""

SAL_TXT_PER = "(?:" + SAL_TXT_PER_BIWK + "|" + SAL_TXT_PER_HR + "|" + SAL_TXT_PER_YR + ")"
"""三种周期词的并(2026-09-27)。只作拼装用。"""

SAL_TXT_MAX_WORD = r"(?:max(?:imum)?\.?\s*(?:of\s+|de\s+)?:?\s*)"
"""区间上限前的「Max. / maximum of / maximum de」(Nunavik 帖「Min. $98 420 yearly, max. $135 335 yearly」
「Minimum of $63,716 and maximum of $109,329 per year」;2026-09-27)。只作拼装用。"""

SAL_TXT_RANGE = (r"(?:(?:\s*" + SAL_TXT_PER + r")?\s*(?:(?:-|–|—|to|and|à|et)\s*|,\s*(?=max)|(?=max))"
                 + SAL_TXT_MAX_WORD + "?" + SAL_TXT_AMT + ")?")
"""紧跟着的区间上限(可无)。中英文连接词都认:2026-09-15 实测 jobboom 法文帖用「à/et」。
2026-09-27 放宽三处:上限前可有「max. / maximum of」;下限后可先跟一个周期词(「26$/h et 33$/h」「$45 942 yearly,
Max. $77 377 yearly」);逗号或不写连接词,只在后面紧跟 max 时才算连成区间(防「$50,000, $5,000 bonus」被连成一段)。"""

SAL_TXT_MONEY = ("(?:" + SAL_TXT_BARE + r"\s*(?:-|–|—|à|et|to)\s*" + SAL_TXT_AMT_POST
                 + "|" + SAL_TXT_AMT + SAL_TXT_RANGE + ")")
"""一处薪资金额(单值或区间),两种形:① 下限是裸数、上限 $ 在数后的法文区间「22 à 25 $」—— 不认它就只剩上限 25 被当成单值,
把区间说成了上限;② 金额 + 可选的区间上限。只作拼装用(2026-09-27)。"""

SAL_TXT_PERIOD = r"(?:\s*" + SAL_TXT_PER + ")"
"""金额后面紧跟的周期词。有它 = 单位是雇主自己写的,不用猜。
⚠ 2026-09-15 实撞:docstring 写在小括号**里面**会被 Python 当成隐式字符串拼接接进正则,第一档整档失效
(单元校验里「$22.40 - $25.40 per hour」挖不出来才发现)—— 括号先收口,docstring 另起一行。
2026-09-27 起由 SAL_TXT_PER 拼成:原来的十二个词一个不少,另补法文、「a year」与两周。"""

SAL_TXT_UNIT_RE = re.compile("(" + SAL_TXT_MONEY + ")(" + SAL_TXT_PERIOD + ")", re.I)
"""正文挖薪资第一档(强):金额 + 紧跟的周期词。捕获组 1 = 金额(串),捕获组 2 = 周期词。
(2026-09-27 起金额段是 SAL_TXT_MONEY:含 $ 在数后的写法与裸数下限的法文区间。)"""

SAL_TXT_PERIOD_AHEAD_RE = re.compile(SAL_TXT_PERIOD, re.I)
"""第二档挖到的金额后面紧跟周期词吗(match 用;2026-09-27 立)。跟着 = 雇主自己写了单位、第一档已按它判过不可信,
第二档不许再拿量级改口 ——「Wage: $25 - $30 bi-weekly」这种把时薪填进两周格的,原本会被第二档猜成 $25–$30 时薪;
口径同 SAL_UNIT_MIN 对「$14.00 to $15.75 biweekly」整条置空。"""

SAL_TXT_CUE = (r"(?:salary|salaries|compensation|wage|wages|pay range|pay rate|pay grade|rate of pay"
               r"|hourly rate|remuneration|rémunération|salaire|taux horaire|\bearnings?\b|salarial)")
"""薪资线索词:金额前 SAL_TXT_NEAR_MAX 字内出现它,这个金额才算在说薪资。
没有线索词的裸金额一律不认 —— 正文里的 $ 多半是奖金 / 营业额 / 折扣。
2026-09-27 补两个:「earning」(「Total earning range: $18.00 - $27.00」;带词边界,不带会吃进 learning)、
法文「salarial(e)」(「échelle salariale」「fourchette salariale」)。"""

SAL_TXT_NEAR_RE = re.compile(SAL_TXT_CUE + r"(?:[^.\n]{0,100}?|[^.\n]{0,30}?\n\s*)(" + SAL_TXT_MONEY + ")", re.I)
"""正文挖薪资第二档(弱):线索词 + 100 字内的金额,没有周期词 —— 单位靠 SAL_TXT_* 量级闸判。
2026-09-27 补标签与金额分两行的形(「Salary:」下一行「$42,000.00 - $92,000.00」):线索词后 30 字内换行、
下一个非空行开头就是金额,也算。"""

SAL_TXT_UPTO_RE = re.compile(r"(?:up\s+to|as\s+much\s+as|jusqu.{0,2}à|maximum\s+of|atteindre)\s*$", re.I)
"""金额前面是「最多」这类封顶话术就整条不认(2026-09-15 实撞「Up to $140,000」):
那是上限不是这个岗给的钱,当薪资显示等于替雇主把天花板说成底薪。
2026-09-27 补法文「(pouvant) atteindre」:「Salaire concurrentiel pouvant atteindre 60 000 $ par année」—— 法文金额写法认出来之后,
它就是一条封顶话术。"""

SAL_TXT_BACK = 16
"""往金额前面回看多少字找封顶话术。"""

SAL_TXT_NOT_PAY_RE = re.compile(
    r"bonus|signing|sign-on|\bprimes?\b|allowance|allocation|reimburs|rembours|cr[ée]dit"
    r"|(?:spending|wellness|health)\s+account|(?:annual|in)\s+revenue|revenues?\s+of|chiffre\s+d['’]affaires"
    r"|\bfines?\b|amende|penalt|pénalit|\bfees?\b|frais|cost[-\s]of[-\s]living|coût\s+de\s+la\s+vie|differential"
    r"|tuition|scolarit|relocation|déménagement|referral|parrainage|potenti|premium|discount|rabais|remise|gift"
    r"|cadeau|insurance|pension|retraite|rrsp|\breer\b|cotisation|contribution|incentive|incitati|retention"
    r"|rétention|overtime|heures\s+supplémentaires|temps\s+supplémentaire|indemnit|forfait|valued\s+at|value\s+of"
    r"|d['’]une\s+valeur|valeur\s+de|worth", re.I)
"""非工资金额的挂名词(2026-09-27 Frank 勾「薪资抽取补三种写法」同批的红线:不许误吃非薪资金额):奖金 / 签约奖 / 补贴 / 报销 /
营收 / 罚款 / 规费 / 生活费差额 / 学费 / 搬家 / 推荐奖 / 收入潜力 / 保险养老 / 加班 / 优惠礼品。金额所在分句里、最后一个线索词之后
出现它,这个金额就不是这个岗的工资(截分句见 SAL_TXT_CUT_RE)。故意不收 sales / budget / account / commission 这类也常出现在
职位名与机构名里的词(「Sales Representative $50,000 per year」「Public Service Commission」不能拦)。
本地对拍拦下的真例:GC Jobs 驻外津贴「total amount of these allowances will normally fall between $24,595 to $49,517 per year」、
医生招聘奖「Physician Recruitment Incentive Pilot — $300,000 ($150,000 per year)」、「Earning potential of over $35/hr」;
代价是「compensation … includes salary and sales incentives and is expected to be between $X」这种含提成的总包区间也不认。"""

SAL_TXT_CUT_RE = re.compile(r"[;•\n!?|]|\.(?=\s|[A-ZÀ-Ý])|\bpay\s*:|" + SAL_TXT_CUE, re.I)
"""找「金额所在分句」的切点:分号 / 项目符 / 换行 / 竖线 / 句末点(点后是空白或大写 —— 小数点不算),以及线索词与
「Pay:」标签(2026-09-27)。挂名词只看最后一个切点之后那一截:「Shift Premium: 2nd Shift ($3) … Pay: $25.52/hr」
切在 Pay 之后,Premium 不算。"""

SAL_TXT_NOT_PAY_BACK = 60
"""往金额前面回看多少字找挂名词(再按 SAL_TXT_CUT_RE 截到分句)。"""

SAL_TXT_NOT_PAY_AFTER_RE = re.compile(
    r"\s*(?:de\s+|in\s+|en\s+|d['’]\s?)?(?:signing|sign-on|bonus|primes?\b|allowance|allocation|cr[ée]dits?"
    r"|rembours|reimburs|incentive|incitati|gift|cadeau)", re.I)
"""金额后面紧挨着就是挂名词(「$25,000 signing bonus」「5 000 $ de prime」;match 用,2026-09-27)。只收紧挨的 ——
「$25/h + bonus」「$25/h plus bonuses」中间隔着加号,那是工资另加奖金,不拦。"""

SAL_TXT_NOT_PAY_AHEAD = 30
"""往金额后面看多少字找紧挨的挂名词。"""

SAL_TXT_NUM_RE = re.compile(r"\d[\d,]*(?:\.\d+)?[Kk]?")
"""从挖出的串里取数(带 K 后缀一起取,由 salary_text_vals 还原)。"""

SAL_TXT_TOKEN_RE = re.compile(r"\d{1,3}(?:[ ,]\d{3}(?!\d))+(?:\.\d+|,\s?\d{1,2}(?!\d))?|\d+(?:\.\d+|,\s?\d{1,2}(?!\d))?")
"""从 tidy 过的金额串里切出一个个数(空白已压成单个空格、K 已还原成千):空格或逗号千分位 + 点或逗号小数(2026-09-27)。"""

SAL_TXT_FRAC_RE = re.compile(r"(?:,\s?(\d{1,2})|\.(\d+))$")
"""一个数的小数部分:逗号后一两位 = 法文小数逗号(「18,50」「17, 00」),点后任意位(「40.610」原样保留)。"""

SAL_TXT_THOUSANDS_RE = re.compile(r"[ ,]")
"""整数部分里的千分位(空格 / 逗号),去掉再转数。"""

SAL_TXT_INT_TPL = "${n:,}"
"""挖出的金额的规范写法:整数(「$47,000」;下游 SAL_MONEY_RE 只认 $ 在前、逗号千分位、点小数)。"""

SAL_TXT_FRAC_TPL = "${n:,}.{frac}"
"""规范写法:带小数的金额,小数位照原文(「$18.50」「$40.610」)。"""

SAL_TXT_CANON_RANGE_TPL = "{lo} - {hi}"
"""规范写法:区间。"""

SAL_TXT_K_SUFFIX = "Kk"
"""千位后缀:「$55K」= 55,000(2026-09-15 实撞:不认它会把 $55K 年薪读成 $55 时薪)。"""

SAL_TXT_K_MULT = 1000
"""K 的倍数。"""

SAL_TXT_K_TPL = "{n:,}"
"""K 还原后写回串里的写法(带千分位,跟正文里其它金额同形)。"""

SAL_TXT_YR_MIN = 20_000
"""可信年薪下限:低于它的「年薪」不是这个岗的工资(2026-09-15 实撞 365 条:「$4,000 per year」
是津贴、「$5.95/hour」是夜班补贴)。**判不了就不说** —— 宁可这一格留空,不替雇主编数。"""

SAL_TXT_HR_MIN = 14
"""可信时薪下限(全国最低工资之下的数不是工资)。"""

SAL_TXT_HR_MAX = 150
"""可信时薪上限(与 SAL_HOURLY_FOLD_MAX 同值:高于它多半是把年薪填进了时薪格)。"""

SAL_TXT_HR_RE = re.compile(r"hour|/\s?hr\b|hourly|heure|/\s?h\b", re.I)
"""周期词是不是「小时」(英法两种写法)。2026-09-27 补「/h」(「20,94 $/h」)。"""

SAL_TXT_BIWK_RE = re.compile(r"bi[-\s]?week|two\s+weeks|deux\s+semaines", re.I)
"""周期词是不是「两周」(先于小时判;2026-09-27)。"""

SAL_TXT_YR_TAIL = " per year"
"""第二档判成年薪时补给下游尺子的周期词(parse_salary 按它定单位)。"""

SAL_TXT_HR_TAIL = " per hour"
"""第二档判成时薪时补的周期词。"""

SAL_TXT_BIWK_TAIL = " bi-weekly"
"""判成两周薪时补的周期词(parse_salary 的 SAL_BIWEEK_RE 认它,按 SAL_MULT 的 26 期年化;2026-09-27)。"""

SAL_TXT_TAILS = {SAL_UNIT_HR: SAL_TXT_HR_TAIL, SAL_UNIT_YR: SAL_TXT_YR_TAIL, SAL_UNIT_BIWK: SAL_TXT_BIWK_TAIL}
"""单位 → 补给下游尺子的周期词。2026-09-27 起第一档也补规范周期词,不再原样带正文里的周期词 ——
法文与两周写法下游 salary_unit_of 认不全(「aux deux semaines」会被量级兜底判成年薪),挖出的串一律写成下游认得的形。"""

SAL_TXT_TRIM = " ,;."
"""挖出的串两头要削掉的标点(实撞「$43,000, per year」)。"""

PRINT_SAL_DONE_TPL = "Salary cleaned: {updated} jobs updated · {priced}/{total} have a salary"
"""薪资清洗收尾第一行。"""

PRINT_SAL_MINED_TPL = "  正文挖出薪资 {mined} 条(板自己的薪资格是空的;时薪 {hr_min}-{hr_max} / 年薪 ≥ {yr_min:,} 才认)"
"""薪资清洗收尾第三行:从正文挖出来的条数。"""

PRINT_SAL_GUARD_TPL = ("  护栏拦截 {guarded} 条置 NULL:离谱金额 {absurd} · 区间比>{ratio_max} "
                       "{ratio} · 年化>{cap_max:,} {cap} · 计次价 {gig} · 时薪>{fold_max} {hifold} · 日薪<{day_min} {lowday}")
"""薪资清洗收尾第二行(六道护栏各自的拦截数;第六道「日薪低得不可能」2026-09-19 加)。"""


# =========================================================================
# 19. 跨源清洗:试点打标(城市×省 → pilot / pilotCommunity / pilotEmployer)
# =========================================================================

PILOT_OA_TAIL_RE = re.compile(r"\bo/a\b(.+)", re.I)
"""建雇主索引时反过来取 o/a 后面那截 —— legal 名与别名都要能匹配上。
(归一三刀 PILOT_SUFFIX_RE / PILOT_OA_SPLIT_RE / PILOT_KEEP_RE 2026-08-31 收拢批退役:
56,909 名探针证得 norm_pilot_name ≡ aip norm_name 零差异 —— 批J 那句「词表不同」是搬运期
陈旧断言 —— 打标改用 names 基建叶的 norm_name,复制品删除。)"""

K_CITIES = "cities"
"""社区名单行里的城市清单键(区域型社区 cities=[] 不参与打标,宁漏勿错)。"""

K_PILOT = "pilot"
"""岗位行键:命中的试点类型('RCIP' / 'FCIP' / 'RCIP+FCIP';空 = 非试点社区)。"""

K_PILOT_EMPLOYER = "pilotEmployer"
"""岗位行键:雇主是否在**本社区**的官方指定名单上(强一级信号)。
False ≠ 未指定 —— 名单未公布的社区一律 False,前端只做正向展示,禁反向解读。"""

PRINT_PILOT_IN_TPL = "IN pilot list    : {srcs}"
"""试点打标起手的社区名单路径行(两份文件的清单,逐字沿用原 05f 的 repr 打印)。"""

PRINT_PILOT_MAP_TPL = ("  mapped (province, city) keys: {keys} · communities with "
                       "employer list: {emps}")
"""两张索引建好后的报数。"""

PRINT_PILOT_DONE_TPL = ("pilot flagged {flagged}/{total} jobs (city inside an RCIP/FCIP "
                        "community); designated-employer hits {emp_hits}.")
"""试点打标收尾一行。"""

# =========================================================================
# 20. cities 步(城市名的中/韩通行译名;#151,人工核定表不用模型)
# =========================================================================

OUT_CITY_I18N = paths.PROCESSED / "city_names_i18n.json"
"""段20 输出:name|prov → {zh, ko} —— 即本域段 9 的 I18N_CITY_FILE 那份缓存,产销同域。

**为什么不用模型**:首版让本地模型判断「有无通行译名」,实测 94 个城市里 93 个都给了中文名 ——
小镇根本没有通行译名,模型在硬音译(Rivière-du-Loup→「洛普河」错成河名;Port Coquitlam→
「波特科奎特兰」,而华人社区通行叫「高贵林」)。这类「看着像那么回事其实是编的」正是本项目
红线(宁可留空也不瞎猜),且用户搜不到、用不上 = 纯噪音。
于是改成**有限的人工核定表**:只收华人/韩人社区确实通行的城市名(大多是移民实际聚居地),
表外一律留空 → 前端只显英文。加新城市=直接往 CITIES 里加一行,不需要跑模型。
本件零调度零 import(不在任何定时链/建表链上),是手动件 —— 只进 mart/main.py 的 TOOLS。
归属沿革:clean/04g_city_names.py →(2026-08-31 批H2)noc 域(「三张 i18n 表同批同形」的
顺手归置,批I3 溶段时挂牌「归属存疑」)→ 2026-08-31 Frank 拍板迁本域:城市是 DB 维度,
译名是维度装配的料;迁移逻辑一字未动,产物 byte-identical 金标复验。"""

CITIES = {
    "Toronto|ON": ("多伦多", "토론토"),
    "Mississauga|ON": ("密西沙加", "미시소가"),
    "Brampton|ON": ("布兰普顿", "브램턴"),
    "Markham|ON": ("万锦", "마컴"),
    "Richmond Hill|ON": ("列治文山", "리치먼드힐"),
    "Vaughan|ON": ("旺市", "본"),
    "Scarborough|ON": ("士嘉堡", "스카버러"),
    "North York|ON": ("北约克", "노스요크"),
    "Etobicoke|ON": ("怡陶碧谷", "이토비코"),
    "Ottawa|ON": ("渥太华", "오타와"),
    "Hamilton|ON": ("汉密尔顿", "해밀턴"),
    "London|ON": ("伦敦", "런던"),
    "Windsor|ON": ("温莎", "윈저"),
    "Waterloo|ON": ("滑铁卢", "워털루"),
    "Kitchener|ON": ("基奇纳", "키치너"),
    "Oakville|ON": ("奥克维尔", "오크빌"),
    "Burlington|ON": ("伯灵顿", "벌링턴"),
    "Kingston|ON": ("金斯顿", "킹스턴"),
    "Guelph|ON": ("圭尔夫", "겔프"),
    "Oshawa|ON": ("奥沙瓦", "오샤와"),
    "Niagara Falls|ON": ("尼亚加拉瀑布城", "나이아가라폴스"),
    "Vancouver|BC": ("温哥华", "밴쿠버"),
    "Surrey|BC": ("素里", "서리"),
    "Burnaby|BC": ("本拿比", "버나비"),
    "Richmond|BC": ("列治文", "리치먼드"),
    "Coquitlam|BC": ("高贵林", "코퀴틀람"),
    "Port Coquitlam|BC": ("高贵林港", "포트코퀴틀람"),
    "Victoria|BC": ("维多利亚", "빅토리아"),
    "Abbotsford|BC": ("阿伯茨福德", "애보츠퍼드"),
    "Kelowna|BC": ("基洛纳", "켈로나"),
    "Nanaimo|BC": ("纳奈莫", "나나이모"),
    "Calgary|AB": ("卡尔加里", "캘거리"),
    "Edmonton|AB": ("埃德蒙顿", "에드먼턴"),
    "Red Deer|AB": ("红鹿市", "레드디어"),
    "Lethbridge|AB": ("莱斯布里奇", "레스브리지"),
    "Montréal|QC": ("蒙特利尔", "몬트리올"),
    "Montreal|QC": ("蒙特利尔", "몬트리올"),
    "Québec|QC": ("魁北克市", "퀘벡시티"),
    "Laval|QC": ("拉瓦尔", "라발"),
    "Gatineau|QC": ("加蒂诺", "가티노"),
    "Sherbrooke|QC": ("舍布鲁克", "셔브룩"),
    "Winnipeg|MB": ("温尼伯", "위니펙"),
    "Saskatoon|SK": ("萨斯卡通", "사스카툰"),
    "Regina|SK": ("里贾纳", "리자이나"),
    "Halifax|NS": ("哈利法克斯", "핼리팩스"),
    "Moncton|NB": ("蒙克顿", "몽턴"),
    "Fredericton|NB": ("弗雷德里克顿", "프레더릭턴"),
    "Charlottetown|PE": ("夏洛特敦", "샬럿타운"),
    "St. John's|NL": ("圣约翰斯", "세인트존스"),
    # ── 2026-09-11 城市段重设计批扩表(lead 逐城核定;机制照 #151:只收确有通行译名的,
    # 拿不准一律不收显英文,不跑模型。韩文仅韩人社区通行档(BC/GTA)填,其余留空。──
    "Thunder Bay|ON": ("桑德贝", "선더베이"),
    "Sudbury|ON": ("萨德伯里", "서드베리"),
    "Greater Sudbury|ON": ("大萨德伯里", ""),
    "Timmins|ON": ("蒂明斯", ""),
    "Sault Ste. Marie|ON": ("苏圣玛丽", ""),
    "North Bay|ON": ("北湾", ""),
    "Barrie|ON": ("巴里", "배리"),
    "Milton|ON": ("米尔顿", "밀턴"),
    "Whitby|ON": ("惠特比", "휘트비"),
    "Ajax|ON": ("阿贾克斯", "에이잭스"),
    "Pickering|ON": ("皮克林", "피커링"),
    "Newmarket|ON": ("纽马克特", "뉴마켓"),
    "Aurora|ON": ("奥罗拉", "오로라"),
    "Thornhill|ON": ("桑希尔", "손힐"),
    "Concord|ON": ("康山", ""),
    "Stouffville|ON": ("斯托夫维尔", ""),
    "Cambridge|ON": ("剑桥", "케임브리지"),
    "St. Catharines|ON": ("圣凯瑟琳斯", ""),
    "Brantford|ON": ("布兰特福德", ""),
    "Belleville|ON": ("贝尔维尔", ""),
    "Peterborough|ON": ("彼得伯勒", ""),
    "Sarnia|ON": ("萨尼亚", ""),
    "Cornwall|ON": ("康沃尔", ""),
    "Woodstock|ON": ("伍德斯托克", ""),
    "Leamington|ON": ("利明顿", ""),
    "Welland|ON": ("韦兰", ""),
    "Georgetown|ON": ("乔治敦", ""),
    "Collingwood|ON": ("科林伍德", ""),
    "Stratford|ON": ("斯特拉特福", ""),
    "Orillia|ON": ("奥里利亚", ""),
    "Niagara-on-the-Lake|ON": ("滨湖尼亚加拉", ""),
    "York|ON": ("约克", ""),
    "East York|ON": ("东约克", ""),
    "Nepean|ON": ("尼皮恩", ""),
    "North Vancouver|BC": ("北温哥华", "노스밴쿠버"),
    "West Vancouver|BC": ("西温哥华", "웨스트밴쿠버"),
    "New Westminster|BC": ("新西敏", "뉴웨스트민스터"),
    "Langley|BC": ("兰里", "랭리"),
    "Delta|BC": ("三角洲", "델타"),
    "Maple Ridge|BC": ("枫树岭", "메이플리지"),
    "Port Moody|BC": ("满地宝", "포트무디"),
    "Mission|BC": ("米逊", ""),
    "Chilliwack|BC": ("奇利瓦克", "칠리왁"),
    "Kamloops|BC": ("坎卢普斯", "캠룹스"),
    "Prince George|BC": ("乔治王子城", ""),
    "Vernon|BC": ("弗农", ""),
    "Penticton|BC": ("彭蒂克顿", ""),
    "Whistler|BC": ("惠斯勒", "휘슬러"),
    "Squamish|BC": ("斯阔米什", ""),
    "Campbell River|BC": ("坎贝尔里弗", ""),
    "Courtenay|BC": ("考特尼", ""),
    "Duncan|BC": ("邓肯", ""),
    "Langford|BC": ("兰福德", ""),
    "Sidney|BC": ("西德尼", ""),
    "Fernie|BC": ("弗尼", ""),
    "Cranbrook|BC": ("克兰布鲁克", ""),
    "Revelstoke|BC": ("雷夫尔斯托克", ""),
    "Prince Rupert|BC": ("鲁珀特王子港", ""),
    "Fort St. John|BC": ("圣约翰堡", ""),
    "Dawson Creek|BC": ("道森克里克", ""),
    "Fort McMurray|AB": ("麦克默里堡", ""),
    "Grande Prairie|AB": ("大草原城", ""),
    "Medicine Hat|AB": ("梅迪辛哈特", ""),
    "St. Albert|AB": ("圣艾伯特", ""),
    "Sherwood Park|AB": ("舍伍德公园", ""),
    "Banff|AB": ("班夫", "밴프"),
    "Canmore|AB": ("坎莫尔", ""),
    "Cold Lake|AB": ("冷湖", ""),
    "Moose Jaw|SK": ("穆斯乔", ""),
    "Prince Albert|SK": ("阿尔伯特王子城", ""),
    "Brandon|MB": ("布兰登", ""),
    "Steinbach|MB": ("斯坦巴克", ""),
    "Altona|MB": ("阿尔托纳", ""),
    "Lévis|QC": ("莱维斯", ""),
    "Trois-Rivières|QC": ("三河市", ""),
    "Saguenay|QC": ("萨格奈", ""),
    "Chicoutimi|QC": ("希库蒂米", ""),
    "Longueuil|QC": ("隆格伊", ""),
    "Brossard|QC": ("布罗萨尔", ""),
    "Saint-Laurent|QC": ("圣洛朗", ""),
    "Westmount|QC": ("西山", ""),
    "Mont-Royal|QC": ("皇家山", ""),
    "Dorval|QC": ("多瓦尔", ""),
    "LaSalle|QC": ("拉萨尔", ""),
    "Granby|QC": ("格兰比", ""),
    "Rimouski|QC": ("里穆斯基", ""),
    "Sept-Îles|QC": ("七岛市", ""),
    "Mirabel|QC": ("米拉贝尔", ""),
    "Quebec City|QC": ("魁北克市", "퀘벡시티"),
    "Dartmouth|NS": ("达特茅斯", ""),
    "Sydney|NS": ("悉尼", ""),
    "Bedford|NS": ("贝德福德", ""),
    "Truro|NS": ("特鲁罗", ""),
    "Saint John|NB": ("圣约翰", ""),
    "Bathurst|NB": ("巴瑟斯特", ""),
    "Corner Brook|NL": ("科纳布鲁克", ""),
    "Gander|NL": ("甘德", ""),
    "Summerside|PE": ("萨默塞德", ""),
}
"""城市 → (中文, 韩文)。收录门槛=该译名在中文/韩文媒体或移民社区确实通行,不是音译练习。
落盘顺序即本表顺序,不排序(产物 diff 稳定)。
原表按 安大略(21)/ 卑诗(10)/ 阿尔伯塔(4)/ 魁北克(6)/ 草原三省与大西洋(8)五组排列,
分组的行内注释随方言律(注释只许 docstring)退役,组界即上面五段的断点。"""

CITIES_OUT_TPL = "OUT: {path}"
"""段20 开工报输出。"""

CITIES_DONE_TPL = "✓ {n} 个城市(人工核定;表外城市留空,前端只显英文)"
"""段20 收尾报数。"""


# =========================================================================
# 21. mart:宏观时间序列(macro_series 长表,把脉页省份段 2026-09-06)
# =========================================================================

IN_STATCAN_DIR = paths.STATCAN
"""StatCan 四张表的落地目录(statcan 域产,一表一文件 raw/statcan/<pid>.json)。
目录驱动扫表:加一张表 = 丢一个 json,本段不改代码(同 raw/pnp/*.json 的惯例)。"""

IN_MINWAGE = paths.MINWAGE / "minimum_wage.json"
"""minwage 域产物:一般成人档逐次调整(province / effectiveDate / expiryDate / rate,1965 起;
2026-09-13 Frank「省的话 这个省的法律要求 最低工资 是有用的」(minwage 域立域批))。缺席 → provinces.info 不挂现行档、macro_series 不出 minWage 行(宁缺毋假)。"""

MINWAGE_LANDING = "https://minwage-salairemin.service.canada.ca/en/general.html"
"""最低工资行的出处(官方「现行与即将生效」页;minwage 域 LANDING 本域自抄)。"""

K_MW_ROWS = "rows"
"""minwage 文件:行清单。"""

K_MW_FETCHED = "fetched"
"""minwage 文件:抓取日。"""

K_MW_PROVINCE = "province"
"""minwage 行:地区码。"""

K_MW_EFFECTIVE = "effectiveDate"
"""minwage 行:生效日(YYYY-MM-DD)。"""

K_MW_RATE = "rate"
"""minwage 行:时薪。"""

K_MIN_WAGE = "minWage"
"""provinces.info 的挂点:现行一般档 {rate, since, next};macro_series 的键同名。"""

K_MW_SINCE = "since"
"""现行档:生效日。"""

K_MW_NEXT = "next"
"""现行档:即将生效的下一档 {rate, from};没有是 None。"""

K_MW_FROM = "from"
"""下一档:生效日。"""

MACRO_KEY_MIN_WAGE = "minWage"
"""macro_series 键:省 × 年法定最低工资(年末在效档;一年内多次调整取年末那次)。"""

MINWAGE_YEAR_END_TPL = "{year}-12-31"
"""年末日期串(判「该年年末在效」用,ISO 串按字典序比)。"""

UNIT_DOLLARS_HOURLY = "dollars_hourly"
"""单位:加元 / 小时(法定最低工资)。"""

IN_IRCC_PR_YEARS = paths.IRCC / "pnp_admissions_years.json"
"""PR 登陆数按年(ircc 域段2 产,2026-09-06 加):prAll = 省 Total 行(全部类别),
prPnp = Provincial Nominee 组行;ytdYear 那年是年内累计。
2026-09-10 再加四个类别组键:prEcon / prFamily / prRefugee / prOtherCat(同一张官方表的组行)。
2026-09-10 再往下两级:中类五键 + 细类十九键(同一张表的第 3、第 4 级行,全键见 MACRO_KEYS_PR)。"""

MACRO_GEO_CA = "CA"
"""全国的 geo 码(省用两位省码;领地不收)。"""

MACRO_FREQ_ANNUAL = "A"
"""年度频率(statcan 之外的四个键全是年度;季/月度频率由各 statcan 文件自报)。"""

MACRO_UNIT_DOLLARS_MILLIONS = "dollars_millions"
"""GDP 的单位(官方发什么记什么,不换算成绝对元)。"""

MACRO_UNIT = {
    "pop": UNIT_PEOPLE, "npr": UNIT_PEOPLE, "asylum": UNIT_PEOPLE, "workOnly": UNIT_PEOPLE,
    "studyOnly": UNIT_PEOPLE, "workStudy": UNIT_PEOPLE, "other": UNIT_PEOPLE,
    "gdp": MACRO_UNIT_DOLLARS_MILLIONS, "unemp": UNIT_PERCENT,
    "minWage": UNIT_DOLLARS_HOURLY,
}
"""statcan 各键 → 单位(契约 §3 键表)。表外的新键 → 单位空 → check_macro_series 当场炸:
单位靠猜 = 前端把百万元当人数画进同一张图。"""

MACRO_KEY_STUDY_NEW = "studyNew"
"""键:新发学签(ircc study_flow,按许可生效月份的流量,不是年末存量)。"""

MACRO_KEY_PR_ALL = "prAll"
"""键:PR 获批(省 Total 行,全部移民类别)。"""

MACRO_KEY_PR_PNP = "prPnp"
"""键:其中省提名(Provincial Nominee 组行)。"""

MACRO_KEY_PR_ECON = "prEcon"
"""键:其中经济类(Economic 组行)。省提名是它的子项 —— prPnp 已含在内,两者相加会重复计人。"""

MACRO_KEY_PR_FAMILY = "prFamily"
"""键:其中家庭团聚(Sponsored Family 组行)。"""

MACRO_KEY_PR_REFUGEE = "prRefugee"
"""键:其中难民与受保护人(Resettled Refugee & Protected Person in Canada 组行)。"""

MACRO_KEY_PR_OTHER_CAT = "prOtherCat"
"""键:其他类(All Other Immigration 组行)。"""

MACRO_KEY_PR_WORKER = "prWorker"
"""键:经济类里的打工线(Worker Program 中类行)。prEcon 的子项。"""

MACRO_KEY_PR_BUSINESS = "prBusiness"
"""键:经济类里的商业线(Business 中类行)。prEcon 的子项。"""

MACRO_KEY_PR_TR2PR = "prTr2pr"
"""键:临转永通道(Temporary Resident to Permanent Resident Pathway 中类行,2021 年一次性)。"""

MACRO_KEY_PR_RESETTLED = "prResettled"
"""键:境外安置难民(Resettled Refugee 中类行)。prRefugee 的子项。"""

MACRO_KEY_PR_PROTECTED = "prProtected"
"""键:境内受保护人(Protected Person in Canada 中类行)。prRefugee 的子项,官方不再往下拆。"""

MACRO_KEY_PR_CEC = "prCec"
"""键:加拿大经验类 CEC(Canadian Experience 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_FSW = "prFsw"
"""键:技术移民 FSW(Skilled Worker 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_FST = "prFst"
"""键:联邦技工 FST(Skilled Trade 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_CAREGIVER = "prCaregiver"
"""键:护理类(Caregiver 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_AGRI_FOOD = "prAgriFood"
"""键:农业食品试点(Agri-Food Pilot 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_ATLANTIC = "prAtlantic"
"""键:大西洋四省雇主担保线(官方两行之和:试点期 Atlantic Immigration Pilot Programs +
转常设后 Atlantic Immigration Programs)。prWorker 的子项;合并依据在 ircc 域 PR_SUB_KEY。"""

MACRO_KEY_PR_RNIP = "prRnip"
"""键:乡村北部试点 RNIP(Rural and Northern Immigration 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_EMPP = "prEmpp"
"""键:难民技术通道 EMPP(Federal Economic Mobility Pathways Pilot 细类行)。prWorker 的子项。"""

MACRO_KEY_PR_STARTUP = "prStartup"
"""键:创业签证 SUV(Start-up Business 细类行)。prBusiness 的子项。"""

MACRO_KEY_PR_SELF_EMP = "prSelfEmp"
"""键:自雇类(Self-Employed 细类行)。prBusiness 的子项。"""

MACRO_KEY_PR_ENTREPRENEUR = "prEntrepreneur"
"""键:企业家类旧线(Entrepreneur 细类行)。prBusiness 的子项。"""

MACRO_KEY_PR_INVESTOR = "prInvestor"
"""键:投资移民旧线(Investor 细类行)。prBusiness 的子项。"""

MACRO_KEY_PR_SPOUSE = "prSpouse"
"""键:配偶团聚(Sponsored Spouse or Partner 细类行)。prFamily 的子项。"""

MACRO_KEY_PR_CHILDREN = "prChildren"
"""键:子女团聚(Sponsored Children 细类行)。prFamily 的子项。"""

MACRO_KEY_PR_PGP = "prPgp"
"""键:父母祖父母团聚 PGP(Sponsored Parent or Grandparent 细类行)。prFamily 的子项。"""

MACRO_KEY_PR_EXT_FAMILY = "prExtFamily"
"""键:其他亲属团聚(Sponsored Extended Family Member 细类行)。prFamily 的子项。"""

MACRO_KEY_PR_GAR = "prGar"
"""键:政府担保难民 GAR(Government-Assisted Refugee 细类行)。prResettled 的子项。"""

MACRO_KEY_PR_PSR = "prPsr"
"""键:私人担保难民 PSR(Privately Sponsored Refugee 细类行)。prResettled 的子项。"""

MACRO_KEY_PR_BSR = "prBsr"
"""键:混合担保难民 BVOR(Blended Sponsorship Refugee 细类行)。prResettled 的子项。"""

MACRO_KEYS_PR = (MACRO_KEY_PR_ALL, MACRO_KEY_PR_PNP, MACRO_KEY_PR_ECON, MACRO_KEY_PR_FAMILY,
                 MACRO_KEY_PR_REFUGEE, MACRO_KEY_PR_OTHER_CAT,
                 MACRO_KEY_PR_WORKER, MACRO_KEY_PR_BUSINESS, MACRO_KEY_PR_TR2PR,
                 MACRO_KEY_PR_RESETTLED, MACRO_KEY_PR_PROTECTED,
                 MACRO_KEY_PR_CEC, MACRO_KEY_PR_FSW, MACRO_KEY_PR_FST, MACRO_KEY_PR_CAREGIVER,
                 MACRO_KEY_PR_AGRI_FOOD, MACRO_KEY_PR_ATLANTIC, MACRO_KEY_PR_RNIP,
                 MACRO_KEY_PR_EMPP, MACRO_KEY_PR_STARTUP, MACRO_KEY_PR_SELF_EMP,
                 MACRO_KEY_PR_ENTREPRENEUR, MACRO_KEY_PR_INVESTOR,
                 MACRO_KEY_PR_SPOUSE, MACRO_KEY_PR_CHILDREN, MACRO_KEY_PR_PGP,
                 MACRO_KEY_PR_EXT_FAMILY,
                 MACRO_KEY_PR_GAR, MACRO_KEY_PR_PSR, MACRO_KEY_PR_BSR)
"""PR 按年表要发的全部键(同一份 raw、同一套解法);raw 里没有的键自然 0 行。
四级:省 Total(prAll)→ 大组四键 → 中类五键 → 细类十九键;**父键永不由子键求和**,
每一键都是官方原行(prAtlantic 除外,见 MACRO_KEY_PR_ATLANTIC)。
前端拿它们求和前先看层级:同级才可加,跨级相加会重复计人。"""

MACRO_KEY_ALLOC = "alloc"
"""键:省提名年度配额(人工核对维护表,每年自带出处页)。"""

MACRO_KEY_EE_INVITES = "eeInvites"
"""键:EE 邀请数(仅 CA;联邦历次抽选按年求和)。"""

MACRO_KEY_EE_POOL = "eePool"
"""键:EE 池子在库人数(仅 CA;**存量**,一年一格取该年最后一轮发的池快照总数 —— 与 npr/pop
同判据,年末那一刻有多少人在排队)。与 eeInvites(该年流量)并排看才是「池子涨了还是发多了」。
官方只从 2022-01-19 那轮起发 CRS 分布,更早的轮次 dd 全是占位 0,所以这一键**没有 2022 之前的年**
(不折 0 —— 折了就是替官方编「2015 年池子里没人」)。"""

MACRO_KEY_PNP_TARGET = "pnpTarget"
"""键:全国省提名接纳目标(IRCC 移民水平计划里 PNP 行的目标值,**人头**含随行家属;仅 CA。
与省的 alloc(提名证书个数)不是一个单位,所以另立一键不并进 alloc —— 2026-09-08 把脉页全国块补齐。"""

IN_IRCC_LEVELS = paths.IRCC / "levels_plan.json"
"""移民水平计划 PNP 目标的人工核对表(一年一行:year / target / low / high / plan / url / quote;
2026-09-08 立,出处逐行挂 canada.ca supplementary information 页;同一年被后一版计划下修时只记最新版,
被覆盖的旧值写 note)。"""

K_TARGET = "target"
"""levels_plan 行:目标值。"""

MACRO_KEY_EE_TARGET = "eeTarget"
"""键:全国 EE(联邦高技术线)接纳目标(levels_plan 的 eeRows;人头含随行家属,仅 CA。
2026-09-10 补 —— 把脉页 EE 表的「预算」行,与 eeInvites(实际发出的邀请)对照)。"""

K_EE_ROWS = "eeRows"
"""levels_plan 顶层:EE 接纳目标数组(行形同 rows,另带官方行名 label —— 各版计划里这一行叫法不同)。"""

MACRO_KEY_COMP = "comp"
"""键:名额竞争比(省级,一年一格;2026-09-08 Frank「每年的竞争是不是不一样,每一年都得算吧」)
= 该年年末在库人头(仅工签 + 仅学签 + 双持)÷ 该年省提名配额;与 ircc 域 difficulty 的竞争比同一公式,
最新一年这格就是竞争度胶囊的依据。"""

UNIT_RATIO = "ratio"
"""comp 的单位:比值(x : 1),不是人数也不是百分数 —— 趋势图按指数化画,表里带「: 1」显。"""

MACRO_COMP_POOL_KEYS = ("workOnly", "studyOnly", "workStudy")
"""竞争比分子的三键(StatCan 17-10-0121 互斥拆分,三格之和 = 学签 / 工签持有者人头,不重复计双持)。"""

MACRO_YEAR_END_TPL = "{year}-01-01"
"""一年的「年末」期 = 次年 1 月 1 日那期(StatCan 季度估计的期键;与前端 yearOfPoint 同判据)。"""

MACRO_COMP_DIGITS = 1
"""竞争比保留一位小数(与 ircc 域 COMP_ROUND 同值本域自抄)。"""

MACRO_KEY_NPR = "npr"
"""键:临时居民(statcan 17-10-0121 季度存量;占比行的分子)。"""

MACRO_KEY_POP = "pop"
"""键:总人口(statcan 季度估计;占比行的分母)。"""

MACRO_KEY_PNP_SHARE = "pnpShare"
"""键:省提名依赖度(%)= 其中省提名 ÷ PR 获批 × 100,一年一格(2026-09-09 Frank 九张表拍板:
「该走 PNP 还是 EE」看这个);同地区同年两行都在才出。"""

MACRO_KEY_NPR_SHARE = "nprShare"
"""键:临时居民占人口比(%)= 临时居民 ÷ 总人口 × 100,按季(同期两行都在才出;「下一刀砍谁」看这个)。"""

MACRO_SHARE_DIGITS = 1
"""两个占比键保留一位小数。"""

MACRO_MONTH_NUM = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
    "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
}
"""study_flow 的 throughMonth(英文月名)→ 两位月号(进行年 as_of = `YYYY-MM`)。"""

MACRO_ASOF_TPL = "{year}-{month}"
"""进行年的 as_of 形(年 + 两位月号)。"""

MACRO_MONTH_LEN = 7
"""fetched(`YYYY-MM-DD`)取到月的长度 —— PR/EE 进行年的 as_of 口径。"""

MACRO_YEAR_LEN = 4
"""期串取年的长度。"""

ALLOC_YEAR_PREFIX = "y"
"""配额维护表的年列前缀(y2024 / y2025 / y2026;加一年 = 多一格,本段不改代码)。"""

ALLOC_INCL_PREFIX = "c"
"""配额维护表的**合并数**列前缀(c2023 = 该年 PNP+AIP 合并配额;NB / NL / PE 官方只发合并数的年份填这里,
2026-09-09 Frank「有数总比没数强」)。出成独立键 allocIncl,页面在单列缺格时顶上并标「含 AIP」;竞争比只用单列。"""

MACRO_KEY_ALLOC_INCL = "allocIncl"
"""键:省提名 + AIP 合并配额(只有官方不拆的年份有)。"""

K_CHECKED_AT = "checkedAt"
"""配额维护表的人工核对日(表级 fetched 的来源)。"""

K_BY_GEO = "byGeo"
"""statcan 文件的主体:geo → 期 → {键: 值}。"""

K_FREQ = "freq"
"""statcan 文件自报的频率(Q/M/A)。"""

K_GEO = "geo"
"""落盘列:CA 或两位省码。"""

K_PERIOD = "period"
"""落盘列:季/月度 = `YYYY-MM-DD`(refPer),年度 = `YYYY`。"""

K_N = "n"
"""study_flow 年块的人数(整年=官方年总计,进行年=已公布月份求和)。"""

K_COMPLETE = "complete"
"""study_flow 年块:这一年 12 个月齐不齐。"""

K_YTD_YEAR = "ytdYear"
"""PR 按年表:哪一年是进行年(年内累计)。"""

MACRO_EMPTY_MSG = ("macro_series: 源文件在但 0 行 —— 抽取器契约破了,不许空灌"
                   "(同 pilot_quota 的 22c8d6a 空灌防线)")
"""空灌防线:输入全缺 → [](seed 侧 -1 跳过保留旧行);输入在而 0 行 → 抛错断整个 mart。"""

MACRO_ANCHOR_MSG = ("macro_series: CA/ON 的 pop 与 npr 四格缺任一 —— statcan 两张季度表没进来,"
                    "省份段的分母就没了")
"""地基断言:全国与安省的人口/临时居民是省份段每一行的分母,缺了整张表没有意义。"""

MACRO_DUP_SHOW = 5
"""报错里最多列几个重复键(够定位是哪一路在抢格,不刷屏)。"""

MACRO_DUP_TPL = "macro_series (geo, key, period) 重复: {dup}"
"""唯一键断言(DB 侧同名唯一索引;重复 = 两个源在抢同一格)。"""

MACRO_UNIT_TPL = "macro_series 缺单位: {row}"
"""单位断言(MACRO_UNIT 表外的新键 → 当场炸,不许无单位入库)。"""

MACRO_MONTH_TPL = "macro_series studyNew {year} 的 throughMonth 认不得: {month}"
"""进行年的截至月认不得就抛:悄悄按完整年落 as_of = 把 YTD 说成全年。"""

MACRO_ANCHOR_KEYS = ("pop", "npr")
"""地基断言查的两个键。"""

MACRO_ANCHOR_GEOS = (MACRO_GEO_CA, "ON")
"""地基断言查的两个 geo。"""


# =========================================================================
# 22. 跨源清洗:投递邮箱(applyEmail;Job Bank 直发读 howto 役的投递区,其他来源从正文抽)
# =========================================================================

IN_HOWTO = paths.PROCESSED_JOBBANK / "howto.json"
"""jobbank 域 howto 役的每帖投递方式(帖号 → 检查时刻 / 状态 / 邮箱 / 投递渠道 / 截止日)。
2026-09-23 站内投递批 1,设计稿 docs/design/站内投递批1-投递邮箱入库-20260923.md。"""

K_APPLY_EMAIL = "applyEmail"
"""jobs 行键:雇主投递邮箱(没有就不落这一格;库里只给管理员读,公开接口不带)。"""

K_HOWTO_STATUS = "status"
"""howto 记录键:状态。"""

K_HOWTO_EMAILS = "emails"
"""howto 记录键:投递区里的雇主邮箱(去重保序,首个即投递邮箱)。"""

K_HOWTO_UNTIL = "advertisedUntil"
"""howto 记录键:截止日(YYYY-MM-DD)。"""

K_HOWTO_AT = "checkedAt"
"""howto 记录键:检查时刻(判下架帖的判死时刻用它)。"""

K_VERIFY_UNTIL = "until"
"""验尸台账(IN_EXPIRED,jobbank 域验尸产)的帖页截止日格:帖号 → YYYY-MM-DD(空串 = 帖页没写,Indeed 转帖那样)。
2026-09-26 /fe Frank「到期即验 + 刷新截止日」:验尸每次验活都重读帖页,比 howto 只抓一次的截止日新,validThrough 优先用它。"""

HOWTO_OK = "ok"
"""howto 状态:有投递区。"""

HOWTO_GONE = "gone"
"""howto 状态:已下架(没有投递区、截止日已过)—— 并进判死台账,与验尸判死同样下发 closed。"""

APPLY_MAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+")
"""正文里的邮箱(正文是洗过的纯文本,没有长串 base64,不必按 @ 开窗)。"""

APPLY_MAIL_TRIM = ".,;:"
"""邮箱两头要剥的标点(句末句号常被带进来)。"""

APPLY_MAIL_AT = "@"
"""邮箱里本地部分与域名的分隔。"""

APPLY_CTX_BEFORE = 160
"""判语境时往前看多少字。"""

APPLY_CTX_AFTER = 60
"""判语境时往后看多少字。"""

APPLY_CTX_RE = re.compile(r"appl|resume|résumé|\bcv\b|curriculum|send|submit|postul|courriel|candidat|"
                          r"faire parvenir|soumett|envoy|contact", re.I)
"""投递语境词:邮箱前后出现这些才算收简历的邮箱(中英法)。"""

APPLY_SKIP_CTX_RE = re.compile(r"accommodat|accessib|privacy|adaptation|handicap|disabilit|"
                               r"unsubscribe|désabonn|equity", re.I)
"""排除语境:无障碍 / 隐私 / 退订 / 平等就业这类邮箱不收简历(ATS 帖里的邮箱多是这种,09-23 实测)。
2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」(其中「邮箱 confidentialité 误删」):confidential 挪出本表,改由 APPLY_CONFIDENTIAL_RE 判(投递动作紧挨在邮箱前就不因它排除);
本表剩下的词照旧见一个排一个。"""

APPLY_CONFIDENTIAL_RE = re.compile(r"confidential", re.I)
"""「保密」语境(confidential / confidentiality / confidentialité;2026-09-27 自 APPLY_SKIP_CTX_RE 拆出)。窗口里有它,
只有邮箱紧前面是投递动作(APPLY_VERB_NEAR_RE)才收:「Faites-nous parvenir votre curriculum vitae en toute confidentialité
à l'adresse jfg@…」「send us your application in complete confidentiality at: rh@…」是投递邮箱,原判把它们当保密邮箱丢了。"""

APPLY_VERB_BEFORE = 120
"""判「投递动作紧挨在邮箱前」时往前看多少字(2026-09-27)。"""

APPLY_VERB_NEAR_RE = re.compile(
    r"(?:\bapply\b|\bapplying\b|\bpostul\w*)[^!?;\n]{0,60}$"
    r"|(?:\b(?:send|submit|forward)\b|parvenir|\benvoy\w*|\bsoumett\w*|\btransmett\w*)[^!?;\n]{0,60}?"
    r"(?:\bc\.?v\b\.?|curriculum|r[ée]sum[ée]|candidature|applications?\b)[^!?;\n]{0,60}$", re.I)
"""邮箱紧前面(同一分句、60 字内)是投递动作(2026-09-27;search 用于邮箱前 APPLY_VERB_BEFORE 字):「投递」本身
(apply / postulez)直接算;「寄送」类动词(send / submit / forward / faites parvenir / envoyez / soumettez / transmettez)
要带上投递物(CV / résumé / curriculum / candidature / application)才算 —— Bell 帖法文版「Pour faire une demande en toute
confidentialité, envoyez un courriel directement à votre responsable du recrutement ou à retail.recruitment@bell.ca」是便利安排
(accommodements)的联系邮箱,「envoyez un courriel」不带投递物,照旧排除。"""

APPLY_NOREPLY_RE = re.compile(r"no-?reply|donotreply|do-not-reply|ne-?pas-?repondre", re.I)
"""noreply 类发件箱(GC Jobs 帖里常见)。"""

APPLY_SKIP_HOSTS = ("jobbank", "gc.ca", "canada.ca", "jobillico.", "jobboom.", "careerbeacon.", "example.")
"""不算雇主邮箱的域(Job Bank / 政府域 / 招聘板自己 / 示例地址)。"""

PRINT_APPLY_TPL = ("投递邮箱:Job Bank 投递区 {jb} 条 · 正文抽取 {text} 条 · 截止日补 {until} 条(取自验尸帖页 {page})· "
                   "有邮箱合计 {total} / {jobs}")
"""投递邮箱段收尾一行(2026-09-26 加「取自验尸帖页」数:截止日用了验尸刷新的帖页那份、没用 howto 那份的岗数)。"""


# =========================================================================
# 23. 自测(用例住 scheme)
# =========================================================================

TEST_VERBOSITY = 2
"""unittest 运行档:逐条打用例名与结果(同 indexing / ats / gate 自查;2026-09-26 /fe Frank 勾「省提名标签吃工时与雇佣期」批立)。"""


# =========================================================================
# 24. 跨源清洗:来源定位(出处页挂文字片段;2026-09-30)
# =========================================================================

K_DRAW_DATE = "drawDate"
"""pnp_draws 行的日期格(ISO 到日;按月出人数的省到月)。"""

MONTH_NAMES = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
               "November", "December")
"""英文月份全名(抽选页的日期写法;2026-09-30 逐页核过 crawl 缓存:九省抽选页都写「September 23, 2026」,按月的 NS 写
「July 2026」)。"""

DAY_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
"""到日的 ISO 日期。"""

MONTH_DATE_RE = re.compile(r"^(\d{4})-(\d{2})$")
"""到月的 ISO 日期(NS 按月出选取人数)。"""

DAY_TEXT_TPL = "{month} {day}, {year}"
"""到日的页面写法(日不补零)。"""

MONTH_TEXT_TPL = "{month} {year}"
"""到月的页面写法。"""

FRAG_HASH = "#"
"""网址片段起始符。"""

FRAG_TEXT = ":~:text="
"""文字片段指令头(URL Fragment Text Directives:Chrome / Edge / Safari 与新版 Firefox 认,点过去滚到那句并高亮;
不认的浏览器照常打开页面顶部,不报错)。"""

FRAG_SUFFIX_SEP = ",-"
"""文字片段的后缀记号(`text=起始,-后缀`):后缀须紧跟起始原句,只拿来挑中同页的第几处。"""

FRAG_DASH = "-"
"""连字符:在片段里是前后缀记号,原句里的连字符必须转义。"""

FRAG_DASH_ENC = "%2D"
"""连字符的百分号编码。"""

FRAG_SAFE = ""
"""百分号编码时一个字符都不留(逗号、& 在片段里是语法)。"""

HTML_PARSER = "lxml"
"""缓存页的解析器。"""

DROP_TAGS = ("script", "style", "noscript")
"""取可见正文前剥掉的标签(浏览器匹配文字片段只认渲染出来的字)。"""

BLOCK_TAGS = ("address", "article", "aside", "blockquote", "br", "caption", "dd", "details", "div", "dl", "dt",
              "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
              "li", "main", "nav", "ol", "p", "pre", "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead",
              "tr", "ul")
"""块级标签:取正文时前后各断一行(2026-09-30 抽样实测:浏览器的单句匹配跨不了块级元素 —— 表格里「3」「$16,080」两格
拼成「3 $16,080」,逐字比对算找到、浏览器却匹配不上;区间与后缀写法可以跨块,见 text_fragment_of)。"""

ANCHOR_LINE_SEP = "\n"
"""块与块之间的分隔(正文按块分行)。"""

FRAG_RANGE_SEP = ","
"""区间写法的分隔(`text=开头几个词,结尾几个词`)。"""

FRAG_RANGE_MIN_LEN = 80
"""原句超过这个长度改用区间写法(2026-09-30 ③-3:门槛原句常跨列表项,浏览器的单句匹配跨不了块级元素,区间可以)。"""

FRAG_RANGE_WORDS = 5
"""区间两头各取几个词起步(开头不唯一就往后加词,直到页上只出现一次;结尾固定取这么多)。"""

ANCHOR_LABEL_MIN_LEN = 12
"""label 拿来当锚点的最短长度(短标签在页上容易撞到别处;label 多是我们自己的英文转述,逐字对不上本来就不挂)。"""

ANCHOR_NUM_MIN = 100
"""数值拿来当锚点的下限(三位数起;个位数、两位数在页上到处都是)。"""

NUM_GROUP_TPL = "{:,}"
"""带千分位的数值写法(官方页「6,603」)。"""

K_VALUE_TEXT = "valueText"
"""原句格(pnp_ops_stats / pnp_requirements)。"""

