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

SLUG_RE = re.compile(r"[^a-z0-9]+")
"""slug 化:非字母数字压成连字符。"""

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
"""日期(postings 的发布日 / 新闻发布日)。"""

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

PROGRAM_PNP = "PNP"
"""项目码:省提名(表级默认)。"""

K_PROGRAM = "program"
"""项目码键。program=AIP 的表(如 NB 的 AIP 背书不受理清单)只作展示维度:AIP 与省提名是
两条路,混进来会让 pnpEligible 被 AIP 的规则误伤 → 装载时跳过,前端在 AIP 那一行单独判。"""

PNP_TYPE_INDEMAND = "indemand"
"""表语义一:inclusion(如 OINP)—— TEER4-5 默认不符合,只有清单内 NOC 才符合。"""

PNP_TYPE_INELIGIBLE = "ineligible"
"""表语义二:exclusion/permissive(如 AAIP)—— TEER0-5 默认都符合,清单内 NOC 不符合。"""

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
    (r"food service supervisor|retail (supervisor|team lead)|shift supervisor|\bsupervisor\b", "62020"),
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
"""

NON_PNP_PROV = {"QC"}
"""不属 PNP 体系的省:魁省走自己的甄选(CSQ/Arrima),不发省提名 → 一律不标 pnpEligible。"""

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
(liveinnovascotia.com/skilled-worker)、NB Experience(gnb.ca …/nb-skilled-worker-stream.html)、
PE Critical Worker TEER4-5(pei_workforce_application_guide.pdf)。"""

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

ENRICH_KEYS = ("description", "sectors", "website")
"""富化只填这三格,且**只填空**:ATS 已自带 profile 的 description/sectors 优先,
Job Bank 公司无 profile 全靠它。"""

IN_PLACES = paths.RAW_COMPANIES / "company_places.json"
"""Google Places 查得的官网/地址(company 域 places 步产,2026-09-05):只填空,来源侧已有的不覆盖;
官网由此来的 websiteSource 记 places。"""

PLACES_HIT = "hit"
"""Places 记录状态:命中(只取命中行)。"""

FOUND_PLACES = "places"
"""官网发现路径:Google Places(与 jd/searched 并列,前端小字标注)。"""

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

K_AI_BRIEF_KO = "aiBriefKo"
"""companies 列:简介韩文。"""

SECTOR_GOVERNMENT = "government"
"""雇主类别(companies.sector 列,键名 K_SECTOR 在第 14 段):政府机关(联邦/省/市镇政府、部委、军队警察税务、
原住民政府)。2026-09-05 Frank「公共部门 政府部门 私营企业这些应该是雇主类别吧」—— 与雇主门槛判定拆成两个字段,
按名字规则在这算,库里原 123 行手工值一并覆盖(那批一半是动物医院与民间社团,规则本身错)。空 = 私营企业。"""

SECTOR_PUBLIC = "public"
"""雇主类别:公立机构(卫生局/医院、学区/学校委员会、大学/学院、公营公司/交通)。省提名的雇主门槛不适用。"""

SECTOR_GOV_RE = re.compile(
    r"^(the )?government of\b"
    r"|^(city|town|village|district|township|municipality|county|regional municipality|regional district"
    r"|municipalit[eé]|ville|corporation of the (city|town|township|county|district)) (of|de|du|d')\b"
    r"|^(ministry|minist[eè]re|department|d[eé]partement) (of|de|du|des)\b"
    r"|\b(canada revenue agency|canada border services|royal canadian mounted police|canadian armed forces"
    r"|forces arm[eé]es|correctional service|service canada|statistics canada|legislative assembly"
    r"|public service commission|water security agency)\b"
    r"|\b(first nation|tribal council|m[eé]tis nation|band council)\b",
    re.I,
)
"""政府机关的名字特征(英法两套;2026-09-05 原型跑 mart 52k 家命中 421 家,人眼抽查无误伤)。"""

SECTOR_PUBLIC_RE = re.compile(
    r"\b(health authority|health network|health region|health services authority|r[eé]gie r[eé]gionale"
    r"|regional health|public health|cancer agency|children'?s aid|school district|school division|school board"
    r"|centre de services scolaire|commission scolaire|regional centre for education|conseil scolaire"
    r"|public library|community college|c[eé]gep|university|universit[eé]|polytechnic|national research council"
    r"|bank of canada|canada post|via rail|bc hydro|hydro-qu[eé]bec|hydro qu[eé]bec|saskpower|sasktel"
    r"|manitoba hydro|bc transit|translink|toronto transit|soci[eé]t[eé] de transport|radio-canada"
    r"|crown corporation|ciusss|cisss|hospital)\b",
    re.I,
)
"""公立机构的名字特征(2026-09-05 原型命中 260 家)。"""

SECTOR_VET_RE = re.compile(r"\b(animal|veterinary|pet|vet)\b", re.I)
"""「hospital」的反例:动物医院是私企(库里旧手工值把它们标成公共部门,正是这一撞)。"""

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


# =========================================================================
# 8. mart:岗位装配(ATS/JB 两源 → jobs 行;JD 正文下沉 + 身份预筛)
# =========================================================================

JOBBANK_HOST = "jobbank.gc.ca"
"""Job Bank 域名(来源标签归一 + 第一方直发判定共用)。"""

SOURCE_JOB_BANK = "Job Bank"
"""来源真相:Job Bank 聚合 indeed/Talent 等 → 统一显示「Job Bank」,`source` 保留原始板。"""

SOURCE_PRETTY = {"lever": "Lever", "bamboohr": "BambooHR", "greenhouse": "Greenhouse",
                 "smartrecruiters": "SmartRecruiters", "workable": "Workable",
                 "recruitee": "Recruitee", "myworkdayjobs": "Workday", "workday": "Workday"}
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

UTC_OFFSET = "+00:00"
"""isoformat 的 UTC 偏移写法。"""

UTC_Z = "Z"
"""归一成 Z 结尾(与 JB 的 last_seen 同形)。"""

DEDUP_KEY_TPL = "{slug}|{title}"
"""展示去重键(**只服务展示**:前端不该出现一堆同公司同岗名)。
⚠ 与「本轮见过」是两件事:见过集不受这把尺子影响(2026-08-04 数据销毁修)。"""

IN_JD_ROOTS = (paths.PROCESSED / "jobbank" / "details", paths.PROCESSED_ATS)
"""已抓的 JD .md 两个根(按 frontmatter `url` 建 url→路径 索引)。"""

JD_HEAD_LEN = 600
"""只读文件头这么多字找 frontmatter 的 url。"""

FRONT_URL_RE = re.compile(r"^url:\s*(.+)$", re.M)
"""frontmatter 里的 url 行。"""

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
② 通用解释(非本岗内容);③ 同上;④ 免责腿。"""

JD_DEDUP_MIN = 40
"""只对长行去重(短行如 Yes/标签合法重复)。"""

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

PROV_MB = "MB"
"""曼尼托巴(同上)。"""

PROV_FED = "FED"
"""联邦(pnp_draws 里 EE 历次抽选的 province 值;省块按 province 过滤天然不串味)。"""

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

IN_PNP_DRAWS = paths.PNP / "draws.json"
"""省抽选事实(BC/AB/MB+ON 通告,pnp 域 build_draws 产,E6-04)。"""

K_PROVINCES = "provinces"
"""抽选表按省索引的键。"""

K_DRAWS = "draws"
"""某省的历次抽选。"""

K_NOTICE = "notice"
"""某省的改制通告。"""

DRAW_MAX = 12
"""普通省的抽选截断(C4 放宽:8→12)。"""

DRAW_MAX_WIDE = 48
"""NB/MB 的抽选截断 = 一年的量(与 pnp 域 build_draws 的 NB 上限一致)。
NB 按类别定向邀请、一轮拆多行,判定层要数「某职业类别 2026 年被选中几轮」。
MB 2026-08-31 并入同档:同为一轮拆 4-5 行(总行+分流细分行),12 行只装两三轮,
08-27 新轮落地把 #275 的 825 细分行挤出窗口 —— c01 金标当场红,判据与 NB 全同。"""

DRAW_WIDE_PROVS = ("NB", "MB")
"""吃 DRAW_MAX_WIDE 的两个省。"""

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
"""本站分类树的技工大类(anyTrade 展开成它)。"""

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
                 paths.EE / "fed-eligibility.json", paths.IRCC / "aip_rules.json"]
"""省提名官方**门槛**(规则引擎第一刀)—— 打分表管「能打几分」,这张管「打分之前先要满足什么」。
一省一个文件,加省=往这个 list 里加一个(pnp 域 build_<省>_req 产,列同一套)。后四份是联邦段:
  B1-4 PGWP 规则库(province='FED' program='PGWP',ircc 域产,quote-anchored)——
       走同一张表=引擎 facts.requirements 免费拿到;FED 行不会漏进省级门槛节(那边按省名挑行);
  G8  联邦段官方规费(program='PR-fees',ircc 域产)—— 第三次复用,同上安全;
  G9  联邦 Express Entry 三个项目的资格门槛(province='FED',ee 域产,quote-anchored)。
      **一个文件三个项目** → program 逐行写在 requirements[].program('CEC'/'FSW'/'FST'),
      表级只有 province —— 按行覆盖 program,零新表;
  G-AIP 联邦大西洋移民计划(AIP)申请人门槛(province='FED' program='AIP',aip 域产,
      quote-anchored)—— #287 一键三合一判定的硬前置(设计
      docs/design/一键三合一判定-20260809.md §4:此前 AIP 申请人侧生产 0 行)。"""

K_REQUIREMENTS = "requirements"
"""门槛表的行清单键。"""

REQ_NO_PROVINCE_TPL = "  ⚠ {name} 缺表级 province → {n} 条门槛会落成 province='',引擎挑不到"
"""源表没写 province = 引擎按省挑行永远挑不到这几条,而且一声不吭(G9 实撞:
fed-eligibility.json 起初没有表级 province)。宁可吵一句,别静默丢门槛。"""

REQ_ROW_OVERRIDES = ("url", "program", "fetched")
"""一条门槛可以自带的三格出处/项目(没写才回退表级)。
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
                paths.PNP / "on-stats.json"]
"""G5 省级官方运营统计(配额/已发/剩余、积压游标、EOI 池、处理时长、SIRS 池分布)——
一省一个文件,加省=往这个 list 里加一个;各省字段形状不同,按 province 分派。"""

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

K_POOL = "pool"
"""BC 的 SIRS 池分布块。"""

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
与 AB 的实时池不可混用(显示层分别标注,见 caseFacts 的注释)。"""

MB_EOI_SECTION_TPL = "MPNP Annual Report {year} — 10. Expression of Interest Pool"
"""MB 年报 EOI 池的节名形。"""

MB_ANNUAL_PROC_METRICS = (("processing_days", "overallDays", "Overall Average"),
                          ("processing_days_approved", "approvedDays", "Approved Applications"),
                          ("processing_days_refused", "refusedDays", "Refused Applications"))
"""MB 年报逐通道处理天数的三个(指标名, 源键, 官方标签)。"""

MB_PROC_LABEL_TPL = "{stream} — {kind}: {days} days"
"""MB 年报处理天数的 label 形。"""

ON_YEAR_METRICS = (("allocation", "allocation"), ("nominations_issued", "nominationsIssued"))
"""ON 逐年 Program Updates 页的两个(指标名, 源键)。"""

ON_PROCESSING_NOTE = (
    "ON(C4-W5):官方「审理时长与提名数」专页 2026 改制后已 302 下线(raw 的 pageRedirect 存了"
    "官方注册的 redirect 证据)→ 审理时长无行可出,这是举证过的「本站未收录」。"
    "配额/历年提名数出自逐年 Program Updates 页 —— 每条自带出处页,用自己的 url/fetched,"
    "别拿顶层(已下线那页)给数字背书。label = 官方原句(quote-anchored)。"
)
"""ON 为什么没有处理时长行。"""


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

NEWS_EXCERPT_MAX = 240
"""excerpt 截断。"""

NEWS_SLUG_TPL = "{date}-{title}"
"""新闻 slug 形(稳定、可读、进 URL)。"""

NEWS_SLUG_N_TPL = "{date}-{title}-{n}"
"""同 slug 撞车时加序号。"""

IN_DLI = paths.DLI / "dli.json"
"""PGWP 可申 DLI 子集(dli 域 build_ircc_dli_pgwp 产,E12-03;已过滤去重,汇装层直通)。"""

IN_FIELD_SOURCES = paths.RAW / "sources" / "field-sources.json"
"""字段级来源注册表(citations 域 verify_field_source_pages 产,E4-04;汇装层直通)。"""

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
# 14. mart:装配与落盘(27 张表一次算齐;跨源汇装的收口点)
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

PRINT_SAL_DONE_TPL = "Salary cleaned: {updated} jobs updated · {priced}/{total} have a salary"
"""薪资清洗收尾第一行。"""

PRINT_SAL_GUARD_TPL = ("  护栏拦截 {guarded} 条置 NULL:离谱金额 {absurd} · 区间比>{ratio_max} "
                       "{ratio} · 年化>{cap_max:,} {cap} · 计次价 {gig} · 时薪>{fold_max} {hifold}")
"""薪资清洗收尾第二行(五道护栏各自的拦截数)。"""


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
}
"""城市 → (中文, 韩文)。收录门槛=该译名在中文/韩文媒体或移民社区确实通行,不是音译练习。
落盘顺序即本表顺序,不排序(产物 diff 稳定)。
原表按 安大略(21)/ 卑诗(10)/ 阿尔伯塔(4)/ 魁北克(6)/ 草原三省与大西洋(8)五组排列,
分组的行内注释随方言律(注释只许 docstring)退役,组界即上面五段的断点。"""

CITIES_OUT_TPL = "OUT: {path}"
"""段20 开工报输出。"""

CITIES_DONE_TPL = "✓ {n} 个城市(人工核定;表外城市留空,前端只显英文)"
"""段20 收尾报数。"""
