"""
pnp 域常量 —— 域词汇表(十省具名清单 / 门槛 / 分值 / 运营统计;照 company 三件套样张,
段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则/配置 dict)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除字典键(K_ 词族)、空串、语法位外,一切字面量住这;
文案模板一律 *_TPL,官方原句/note 一律 *_NOTE/*_QUOTE(quote-anchored,禁转述)。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:抓取/解析/落盘的公共件 + JSON 键词表 K_*)
# =========================================================================

ENC_UTF8 = "utf-8"
"""文本读写的统一编码。"""

ERRORS_REPLACE = "replace"
"""读外来文本的容错模式:坏字节替换不炸。"""

PARSER_LXML = "lxml"
"""bs4 的 lxml 解析器 —— **只有 NL 抽选表用**(2026-08-03 接入时那张表没有 <th>,
html.parser 拆出来的行矩阵对不上;其余各处一律 fetch.constants.PARSER_HTML)。"""

DROP_TAGS = ["script", "style", "nav", "header", "footer"]
"""取正文前先拆掉的噪音标签(nl_req/mb_req/on_stats/mb_stats 四处原有的同一份清单;
⚠ 与 fetch.constants.JUNK_TAGS 不是一份 —— 那份多 form/aside,本域三处从来只拆这五种,
收拢时不并入,免得悄悄改了正文范围)。"""

CELL_TAGS = ["td", "th"]
"""表格单元格标签(find_all 按文档序返回,`["th","td"]` 写法与本序等价 —— 2026-08-30
批B 收拢四份抄本时核过:build_ab 的表头行用的是反序写法,结果同值)。"""

TAG_TABLE = "table"
"""表格标签名。"""

TAG_TR = "tr"
"""表行标签名。"""

TAG_TD = "td"
"""数据格标签名(NB 抽选表只认 td,不认 th)。"""

TAG_A = "a"
"""链接标签名。"""

TAG_P = "p"
"""段落标签名。"""

TAG_B = "b"
"""粗体标签名(NB 抽选的通道名挂在 <p><b> 里)。"""

TAG_STRONG = "strong"
"""强调标签名(MB 抽选的子标题判据)。"""

TAG_BR = "br"
"""换行标签名(NB 表格用 <br> 分隔多行)。"""

TAG_UL = "ul"
"""无序列表标签名。"""

TAG_LI = "li"
"""列表项标签名。"""

TAG_DL = "dl"
"""定义列表标签名(NL 雇主页的字段表)。"""

TAG_DT = "dt"
"""定义项标签名。"""

TAG_DD = "dd"
"""定义值标签名。"""

TAG_ARTICLE = "article"
"""文章标签名(MB 每期公告一个 <article class=post>)。"""

TAG_MAIN = "main"
"""正文容器标签名。"""

TAG_H1 = "h1"
"""一级标题标签名。"""

ATTR_HREF = "href"
"""链接地址属性名。"""

ATTR_CLASS = "class"
"""类名属性(NL 雇主页 h1.entry-title)。"""

ATTR_ROWSPAN = "rowspan"
"""跨行属性名(BC 抽选表大量 rowspan)。"""

ATTR_COLSPAN = "colspan"
"""跨列属性名。"""

HDR_ACCEPT_JSON = "User-Agent"
"""Socrata API 的自报家门头名(与伪装档分开:开放数据平台不需要伪装)。"""

DIGIT_RE = re.compile(r"\d")
"""单个数字 —— teers() 用它把「2, 3, 4 or 5」拆成 [2,3,4,5](官方就是这么写的,别自己推区间)。"""

NUM_ONLY_RE = re.compile(r"\d+")
"""纯数字串(num_or_none 的判据)。"""

COMMA = ","
"""千分位逗号(去掉再转数字)。"""

EMPTY_JOIN = ""
"""替换成空的目标串(去符号用)。"""

STRIP_DOT_SPACE = " ."
"""职业名尾部要剥的空格与句号。"""

STRIP_DOT_COMMA = " .,"
"""职业名尾部要剥的空格、句号与逗号。"""

STRIP_STAR_DOT = " .*"
"""职业名尾部要剥的空格、句号与脚注星号。"""

HEADER_WORDS = ("NOC", "OCCUPATION", "OCCUPATION TITLE")
"""表头行的判词(大写比对,命中即跳过 —— 三份清单解析器共用)。"""

LIST_JOIN_SEP = ", "
"""并列项拼接符。"""

SEMI_JOIN_SEP = "; "
"""多条错误信息的拼接符。"""

PLUS_JOIN_SEP = " + "
"""NB 抽选多通道并列的拼接符。"""

TEXT_JOIN_SEP = " "
"""get_text 的单空格分隔(压平文本的统一口径)。"""

LINE_JOIN_SEP = "\n"
"""按行拼接(PDF 逐页文本、DOM 逐行文本)。"""

WS_FOLD = " "
"""连续空白折成的那一个空格。"""

DATE_FMT_LONG = "%B %d, %Y"
"""官方英文长日期(「June 24, 2026」)的 strptime 格式。"""

SUFFIX_JSON = ".json"
"""产出文件后缀。"""

INDENT_2 = 2
"""raw/pnp 各表的 JSON 缩进(全域惯例 2)。"""

INDENT_1 = 1
"""大表省体积的缩进(NS 配额 / 哨兵 state / 中文灰注缓存三处原值)。"""

OUT_PNP_DIR = paths.PNP
"""raw/pnp/ 落盘目录(各清单/门槛/分值/统计表的家)。"""

OUT_IRCC_DIR = paths.IRCC
"""raw/ircc/ 落盘目录(NS 官方配额与哨兵 state 的家 —— 配额是联邦口径的对照物,归 ircc)。"""

IN_CRAWL_DIR = paths.CRAWL
"""crawl 役产出根(哨兵按 slug 扫 html_cache;NL 雇主名录读 nl-imm manifest)。"""

IN_NEWS_FILE = paths.NEWS / "news.json"
"""news 役产出(哨兵的第二个扫描源)。"""

K_NOC = "noc"
"""行键:五位 NOC 码。"""

K_NAME = "name"
"""行键:名称(职业名 / 雇主名)。"""

K_TEER = "teer"
"""行键:TEER 档。"""

K_STREAM = "stream"
"""表/行键:官方通道英文全名。"""

K_LABEL = "label"
"""表/行键:前端短标签或官方原句。"""

K_PROVINCE = "province"
"""表键:省码。"""

K_PROGRAM = "program"
"""表键:项目(PNP / AIP / PNP+AIP)。"""

K_TYPE = "type"
"""表键:清单口径(indemand / ineligible / policy / priority)。"""

K_URL = "url"
"""表/行键:出处地址。"""

K_PAGE_URL = "pageUrl"
"""表键:人可读的官方页(与 url 是 PDF 时配对)。"""

K_SOURCE = "source"
"""表键:来源名。"""

K_SOURCE_FILE = "sourceFile"
"""表键:来源文件(PE 走指南 PDF 时的原件地址)。"""

K_FETCHED = "fetched"
"""表键:本轮取回日期。"""

K_EFFECTIVE = "effective"
"""表键:官方自报的生效/更新日期。"""

K_GUIDE_EFFECTIVE = "guideEffective"
"""表键:指南版本/生效日(过期检测的锚)。"""

K_NOTE = "note"
"""表/行键:口径说明(quote-anchored,禁转述)。"""

K_OCCUPATIONS = "occupations"
"""表键:职业清单 —— **有这个键 08_score 才当具名清单消费**(没有的表天然跳过)。"""

K_POSITIONS = "positions"
"""表键:职位名清单(NL:官方给的是职位名文本不是 NOC,故不叫 occupations)。"""

K_FACTS = "facts"
"""表键:政策事实清单(NS 主线口径,同样不叫 occupations)。"""

K_CODELESS = "codeless"
"""表键:官方给的不是 NOC 码,前端不得当清单命中用。"""

K_OVERLAY = "overlay"
"""表键:叠加式排除(命中即不可,但不把该省 TEER4-5 默认放开)。"""

K_APPLIES_TO = "appliesTo"
"""表/行键:适用范围(SK 两张排除表分管的子类别 / BC SIRS 那行加分的适用职业)。"""

K_APPLIES_TO_QUOTE = "appliesToQuote"
"""表键:适用范围的官方原句(quote-anchored,禁转述)。"""

K_KEY = "key"
"""行键:政策事实的键名。"""

K_STATEMENT = "statement"
"""行键:政策事实的陈述。"""

K_AS_OF_LOWER = "asOf"
"""表键:官方口径日(与 fetched 不是一回事)。"""

K_QUARTER = "quarter"
"""表键:季度口径(SK 处理时长)。"""

K_SECTOR = "sector"
"""行键:行业。"""

K_GROUP = "group"
"""行键:分组。"""

K_TITLE = "title"
"""行键:职位名。"""

K_DETAIL = "detail"
"""行键:职位明细(分号分隔的专科等)。"""

K_DATE = "date"
"""行键:抽选日。"""

K_SCORE = "score"
"""行键:最低分(None = 官方不发分数线,不是抓漏了)。"""

K_INVITATIONS = "invitations"
"""行键:邀请数。"""

K_SCALE = "scale"
"""表键:省自评分制名(前端展示必须声明「省自评分制,非 CRS」)。"""

K_DRAWS = "draws"
"""表键:抽选行清单。"""

K_NOTICE = "notice"
"""表键:最新一条官方通告。"""

K_PROVINCES = "provinces"
"""表键:逐省块。"""

K_REQUIREMENTS = "requirements"
"""表键:门槛行清单。"""

K_FACTOR = "factor"
"""行键:门槛因素 / 分值因素。"""

K_SUBJECT = "subject"
"""行键:判定对象(applicant / employer)。"""

K_OP = "op"
"""行键:比较符(>= / none)。"""

K_VALUE = "value"
"""行键:阈值。"""

K_VALUE_TEXT = "valueText"
"""行键:阈值的文字形(数值表达不了时用)。"""

K_UNIT = "unit"
"""行键:单位。"""

K_APPLIES_TEER = "appliesTeer"
"""行键:适用 TEER。"""

K_APPLIES_NOC = "appliesNoc"
"""行键:适用 NOC(最具体的那行胜出)。"""

K_EXCLUDES_NOC = "excludesNoc"
"""行键:排除的 NOC 大组。"""

K_APPLIES_AREA = "appliesArea"
"""行键:适用区域。"""

K_APPLIES_CONDITION = "appliesCondition"
"""行键:条件行标记。"""

K_FAMILY_SIZE = "familySize"
"""行键:家庭人数(只有 BC 的最低收入表分档)。"""

K_BASIS = "basis"
"""行键:口径隔离标记(employerTenure / occMedian / windowMonths=N)。"""

K_SECTION = "section"
"""行键:出处节名/节号。"""

K_SYSTEM = "system"
"""表键:分制名。"""

K_MAX_TOTAL = "maxTotal"
"""表键:总分上限(官方没印就留空,不拿各项相加冒充官方总分)。"""

K_PASS_MARK = "passMark"
"""表键:申请门槛分(官方没有就留空,对照锚点用真实抽选线)。"""

K_GROUP_MAX = "groupMax"
"""表键:分组上限。"""

K_FACTORS = "factors"
"""表键:逐因素分值块。"""

K_ROWS = "rows"
"""因素键:档位(前端单选)。"""

K_BONUS = "bonus"
"""因素键:加分项(前端多选,可加总)。"""

K_MAX = "max"
"""因素键:本因素最高可得。"""

K_POINTS = "points"
"""档位键:分值。"""

K_RULE = "rule"
"""因素键:算法说明(存规则不存穷举)。"""

K_XOR_WITH_PREV = "xorWithPrev"
"""档位键:与上一条二选一(官方「…, or」的落法)。"""

K_NOCS = "nocs"
"""键:NOC 表 / NOC 清单。"""

K_ANY_TRADE = "anyTrade"
"""键:任何技工工种(BC 执业资格对照表里没有 NOC 码的那类)。"""

K_OCCUPATION = "occupation"
"""行键:职业名(BC 执业资格对照表)。"""

K_DESIGNATION = "designation"
"""行键:认证机构文字。"""

K_FLOOR_AT = "floorAt"
"""wage 规则键:起算时薪。"""

K_CAP_AT = "capAt"
"""wage 规则键:封顶时薪。"""

K_BAND_COUNT = "bandCount"
"""language 规则键:按 band 相加的项数(MB 首考语言四项)。"""

K_PROCESSING = "processing"
"""表键:处理时长块。"""

K_ALLOCATION = "allocation"
"""表/行键:配额。"""

K_NOMINATIONS_YTD = "nominationsYtd"
"""行键:年初至今提名数。"""

K_PRIORITY_SECTORS = "prioritySectors"
"""表键:优先行业(不设上限)。"""

K_CAPPED_SECTORS = "cappedSectors"
"""表键:受限行业(带百分比与绝对名额)。"""

K_PCT = "pct"
"""行键:百分比。"""

K_SPOTS = "spots"
"""行键:绝对名额。"""

K_CATEGORY = "category"
"""行键:类别名。"""

K_WEEKS = "weeks"
"""行键:周数(SK 官方就发 weeks,不换算)。"""

K_RAW = "raw"
"""行键:官方原文(数值解析失败时保原样,不硬转)。"""

K_SUMMARY = "summary"
"""表键:总表。"""

K_STREAMS = "streams"
"""表键:逐 stream 行。"""

K_EOI_POOL = "eoiPool"
"""表键:EOI 池(被抽中概率的分母)。"""

K_MIN_SCORE = "minScore"
"""行键:该轮最低分。"""

K_ISSUED = "issued"
"""行键:已发。"""

K_REMAINING = "remaining"
"""行键:剩余。"""

K_TO_PROCESS = "toProcess"
"""行键:待处理。"""

K_ASSESSING_UP_TO = "assessingUpTo"
"""行键:积压游标(正在审哪一天收到的申请)。"""

K_COUNT = "count"
"""行键:人数。"""

K_POOL = "pool"
"""表键:注册池分数分布。"""

K_SCORE_RANGE = "scoreRange"
"""行键:分数段。"""

K_REGISTRATIONS = "registrations"
"""行键:该段注册人数(「<5」是官方隐私抑制值,原样保留)。"""

K_PERCENTILE_LABEL = "percentileLabel"
"""处理时长键:口径句(「80% 的案子」不能被说成「所有案子」)。"""

K_STAGE = "stage"
"""行键:阶段名。"""

K_MONTHLY = "monthly"
"""表键:月度数据块。"""

K_ANNUAL = "annual"
"""表键:年报块。"""

K_YEAR = "year"
"""行键:年份。"""

K_MONTH = "month"
"""行键:月份(YYYY-MM)。"""

K_IN_ASSESSMENT = "inAssessment"
"""行键:在审。"""

K_PENDING = "pending"
"""行键:待审。"""

K_TOTAL = "total"
"""行键:合计。"""

K_THROUGH = "through"
"""月度块键:统计到哪个月(YYYY-MM)。"""

K_THROUGH_MONTH = "throughMonth"
"""月度块键:统计到哪个月(月名)。"""

K_COMMITMENT_MONTHS = "commitmentMonths"
"""年报块键:服务承诺月数。"""

K_COMMITMENT_LABEL = "commitmentLabel"
"""年报块键:服务承诺官方原句(只说 6 个月不说免责句 = 把承诺说成保证)。"""

K_APPROVED_DAYS = "approvedDays"
"""行键:批准件平均天数。"""

K_REFUSED_DAYS = "refusedDays"
"""行键:拒件平均天数。"""

K_OVERALL_DAYS = "overallDays"
"""行键:总体平均天数。"""

K_LABEL_YEAR = "labelYear"
"""行键:官方标签里自己写的年份(⚠ 官方文档自相矛盾时按标签存,不按报告年推)。"""

K_SCOPE = "scope"
"""行键:统计口径的通道范围(空串 = 省级汇总)。"""

K_ENHANCED_YTD = "enhancedYtd"
"""月度块键:增强提名(Express Entry 口径)。"""

K_REFUSALS_YTD = "refusalsYtd"
"""月度块键:年初至今拒件。"""

K_LAA_YTD = "laaYtd"
"""月度块键:年初至今 LAA。"""

K_RECEIVED_YTD = "receivedYtd"
"""月度块键:年初至今收件。"""

K_INVENTORY = "inventory"
"""月度块键:库存(在审/待审;只有最新月有意义)。"""

K_NOMINATIONS_ISSUED = "nominationsIssued"
"""表键:已发提名数(逐年)。"""

K_PAGE_REDIRECT = "pageRedirect"
"""表键:官方重定向复核结果(眼见为实,不是抓取偶发失败)。"""

K_REQUESTED_URL = "requestedUrl"
"""复核键:请求的地址。"""

K_STATUS = "status"
"""复核键 / manifest 页键:HTTP 状态码。"""

K_RESOLVED_URL = "resolvedUrl"
"""复核键:最终落到的地址。"""

K_IS_REDIRECTED = "isRedirected"
"""复核键:是不是被重定向了。"""

K_CHECKED = "checked"
"""复核键:复核日期。"""

K_ERROR = "error"
"""复核键:实抓失败时的异常描述。"""

K_EMPLOYERS = "employers"
"""表键:雇主行清单。"""

K_LOCATION = "location"
"""行键:雇主所在地。"""

K_BY_PROGRAM = "byProgram"
"""表键:逐项目年序(NSNP 与 AIP 分列)。"""

K_API = "api"
"""表键:开放数据 API 地址。"""

K_PROV = "prov"
"""行键:省码(配额表与哨兵命中共用)。"""

K_N = "n"
"""哨兵命中键:命中的数字。"""

K_QUOTE = "quote"
"""哨兵命中键:命中的上下文原文(命中≠核实,进表前必须人工回官方页核对原句)。"""

K_SRC = "src"
"""哨兵命中键:来源文件/地址。"""

K_SEEN = "seen"
"""哨兵 state 键:已见命中(去重用)。"""

K_WATCH = "watch"
"""哨兵 state 键:本轮监视目标。"""

K_FIRST = "first"
"""哨兵 state 键:首次命中日期。"""

K_ZH = "zh"
"""灰注缓存键:中文短注。"""

K_TRANSLATED_AT = "translatedAt"
"""灰注缓存键:翻译时刻。"""

K_RESPONSE = "response"
"""Ollama 响应键:模型输出。"""

K_MODEL = "model"
"""Ollama 请求键:模型名。"""

K_PROMPT = "prompt"
"""Ollama 请求键:提示词。"""

K_STREAM_FLAG = "stream"
"""Ollama 请求键:是否流式(与行键 K_STREAM 同字面、语义无关,分开命名免误读)。"""

K_OPTIONS = "options"
"""Ollama 请求键:采样参数。"""

K_TEMPERATURE = "temperature"
"""Ollama 采样键:温度(零温 = 可复现)。"""

K_HTML = "html"
"""manifest 页键:html_cache 文件名。"""

K_PAGES = "pages"
"""manifest 键:页清单。"""

K_CRAWLED_AT = "crawled_at"
"""manifest 键:该轮爬取时刻。"""

K_ROWS_LOWER = "rows"
"""人工配额表键:逐省行(与因素键 K_ROWS 同字面,此处是另一张表的键)。"""

K_OUT = "out"
"""配置 dict 键:产出文件名。"""

K_MUST = "must"
"""配置 dict 键:通告的必含关键词。"""

K_ANY = "any"
"""配置 dict 键:不论行业那份清单。"""

K_FOOD = "food"
"""配置 dict 键:住宿餐饮业(NAICS 72)那份清单。"""

K_DESC = "desc"
"""配置 dict 键:人读描述。"""

K_PRODUCT = "product"
"""配置 dict 键:SK 出版物产品号。"""

K_FMT = "fmt"
"""配置 dict 键:SK 出版物格式号。"""

K_ITEMS = "items"
"""news.json 键:条目清单。"""

K_BODY_EN = "bodyEn"
"""news.json 条目键:英文正文。"""

K_REGION = "region"
"""news.json 条目键:地域(即省码)。"""

OP_GE = ">="
"""比较符:不低于。"""

OP_NONE = "none"
"""比较符:本档不设成绩门槛 —— **是断言不是缺失**(官方明说不要求)。"""

REQ_SUBJECT_APPLICANT = "applicant"
"""判定对象:申请人。"""

REQ_SUBJECT_EMPLOYER = "employer"
"""判定对象:雇主(本站没有雇主事实,报告里一律 unknown 说「要雇主出材料」,不猜不编)。"""

FACTOR_LANGUAGE = "language"
"""门槛因素:语言。"""

FACTOR_LANGUAGE_EXEMPT = "languageExempt"
"""门槛因素:语言免考条款(单独一个 factor,不会被误当成「没有语言要求」)。"""

FACTOR_EXPERIENCE = "experience"
"""门槛因素:工作经验。"""

FACTOR_EXPERIENCE_EXCLUDED = "experienceExcluded"
"""门槛因素:不计入的时段(算法说明,不是阈值)。"""

FACTOR_RESIDENCE = "residence"
"""门槛因素:居住时长。"""

FACTOR_INCOME = "income"
"""门槛因素:最低家庭收入(全国只有 BC 发布了收入表)。"""

FACTOR_WAGE = "wage"
"""门槛因素:工资档。"""

FACTOR_EMP_YEARS = "empYears"
"""门槛因素:雇主经营年限。"""

FACTOR_EMP_STAFF = "empStaff"
"""门槛因素:雇主全职雇员数。"""

FACTOR_EMP_REVENUE = "empRevenue"
"""门槛因素:雇主营业额。"""

UNIT_CLB = "CLB"
"""单位:加拿大语言基准。"""

UNIT_MONTHS = "months"
"""单位:月。"""

UNIT_YEARS = "years"
"""单位:年。"""

UNIT_EMPLOYEES = "employees"
"""单位:人。"""

UNIT_CAD_YR = "CAD/yr"
"""单位:加元每年。"""

TYPE_INDEMAND = "indemand"
"""清单口径:在需/具名(inclusion)。"""

TYPE_INELIGIBLE = "ineligible"
"""清单口径:不合格(命中=不可)。"""

TYPE_POLICY = "policy"
"""清单口径:政策事实(不参与具名打分)。"""

TYPE_PRIORITY = "priority"
"""清单口径:优先处理(既非 indemand 也非 ineligible)。"""

PROGRAM_PNP = "PNP"
"""项目:省提名。"""

PROGRAM_AIP = "AIP"
"""项目:大西洋移民计划(与省提名是两条路)。"""

PROV_AB = "AB"
"""省码:阿尔伯塔。"""

PROV_BC = "BC"
"""省码:不列颠哥伦比亚。"""

PROV_SK = "SK"
"""省码:萨斯喀彻温。"""

PROV_NS = "NS"
"""省码:新斯科舍。"""

PROV_MB = "MB"
"""省码:曼尼托巴。"""

PROV_NB = "NB"
"""省码:新不伦瑞克。"""

PROV_NL = "NL"
"""省码:纽芬兰与拉布拉多。"""

PROV_PE = "PE"
"""省码:爱德华王子岛。"""

PROV_ON = "ON"
"""省码:安大略。"""

WORD_N = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
          "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}
"""官方英文数词 → 数字。
⚠ 2026-08-30 批B 收拢现场:五份抄本已漂移(bc_req/on_req 是 one–ten、sk_req 只有 one–five、
pe_req 缺 seven/eight/nine、mb_req 是 one–twelve)。取**超集 one–twelve**(= mb_req 那份):
差异只影响「官方哪天把数字改成表外的词」时是判解析失败还是照读,取超集 = 少一次假的自校红,
现存各表逐字重算比对零差异。"""

MONTH_NAMES = ("january", "february", "march", "april", "may", "june",
               "july", "august", "september", "october", "november", "december")
"""英文月名小写序(SK 排除清单的「Updated: Month D, YYYY」转 ISO 用;1 月 = 下标 0)。"""

MONTHS_TITLE = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"]
"""英文月名首字母大写序(MB 月度表的月份行判据;下标 + 1 = 月号)。"""

MD_TIMEOUT_S = 40
"""HTML→md 现转的抓取超时(六份 fetch_md 抄本原值一致,收拢后单一来源)。"""

PRINT_SELFCHECK_FAIL = "✗ 自校未过,保留旧表不覆盖:"
"""自校硬闸的抬头句(门槛/分值/统计各步共用)。"""

PRINT_BULLET = "   -"
"""自校问题的行前缀。"""

PRINT_OUT_TPL = "OUT: {path}"
"""开工报输出路径。"""

PRINT_DONE_PATH_TPL = "✓ {path}"
"""只报产出路径的收尾行(ON/MB 运营统计共用)。"""

PRINT_KEEP_OLD_TPL = "  ✗ 抓取失败 {what}: {name} {detail}(保留旧表)"
"""抓取失败的通用报数(宁可留旧也不留空)。"""

PRINT_NO_NOC_TPL = "  ✗ 没解析到 NOC: {out}(保留旧表)"
"""清单解析空的通用报数。"""

PRINT_TABLE_TPL = "  ✓ {label:<8} {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""清单步收尾报数(8 字标签档:BC/MB)。"""

PRINT_TABLE10_TPL = "  ✓ {label:<10} {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""清单步收尾报数(10 字标签档:SK/NS)。"""

PRINT_FACTOR_TPL = "  {factor:12} {n} 条"
"""门槛步按因素报条数(12 字档)。"""

PRINT_FACTOR15_TPL = "  {factor:15} {n} 条"
"""门槛步按因素报条数(15 字档:ON 的因素名更长)。"""

# =========================================================================
# 2. AB 具名清单(AOS 不符合资格表 + 加速科技通道 PDF)
# =========================================================================

AB_AOS_URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility"
"""Alberta Opportunity Stream「不符合资格职业」页(exclusion:除本表外 TEER0-5 都符合,
与 OINP inclusion 相反)。alberta.ca 直连 200,httpx 即可。"""

AB_TECH_PDF_URL = "https://www.alberta.ca/system/files/custom_downloaded_images/lbr-aaip-tech-pathway-nocs-codes-list.pdf"
"""Accelerated Tech Pathway 职业清单 PDF(inclusion 具名通道,TEER0-3 高技能科技/管理岗)。
命中 → 具名通道标签;**资格仍由上面的排除表定,二者解耦**(08_score 把 stream 与 type 分开)。"""

AB_AOS_TIMEOUT_S = 30
"""AOS 页抓取超时。"""

AB_TECH_TIMEOUT_S = 40
"""Tech PDF 抓取超时。"""

AB_NOC5_RE = re.compile(r"^\d{5}\*?$")
""""00010" / "60040*"(星号 = 条件性不符合)。"""

AB_PDF_NOC_RE = re.compile(r"^(\d{5})\s+(.+)$")
"""PDF 行:"00012 Senior managers - …"。"""

AB_TABLE_HEAD_KW = "noc code"
"""找列头含「NOC code」的那张表。"""

AB_NOC_STAR = "*"
"""NOC 尾部的星号(去掉 —— 保守按不符合处理)。"""

FILETYPE_PDF = "pdf"
"""pymupdf 的 filetype 参数(内存流开 PDF)。"""

OUT_AAIP_INELIGIBLE_FILE = "aaip-ineligible.json"
"""AB AOS 不符合清单的产出文件名。"""

OUT_AB_TECH_FILE = "ab-tech.json"
"""AB 加速科技通道清单的产出文件名。"""

AB_AOS_STREAM = "AAIP Alberta Opportunity Stream"
"""AOS 表的官方通道名。"""

AB_AOS_LABEL = "AAIP 不符合清单"
"""AOS 表的前端短标签。"""

AB_AOS_NOTE = "除本表外 TEER0-5 都符合;原带 * 为条件性不符合,粗筛下按不符合处理。"
"""AOS 表的口径说明。"""

AB_TECH_STREAM = "AAIP Accelerated Tech Pathway"
"""科技通道的官方名。"""

AB_TECH_LABEL = "AB 科技"
"""科技通道的前端短标签。"""

AB_PRINT_AOS_TPL = "  ✓ AAIP 不符合清单  {n} 个职业 → pnp/aaip-ineligible.json"
"""AOS 表收尾报数。"""

AB_PRINT_NO_AOS = "  ✗ 没解析到不符合资格表(保留旧表)"
"""AOS 表解析空的报数。"""

AB_PRINT_TECH_TPL = "  ✓ AB 科技         {n} 个职业 → pnp/ab-tech.json"
"""科技通道收尾报数。"""

AB_PRINT_NO_TECH = "  ✗ Tech PDF 没解析到 NOC(保留旧表)"
"""科技通道解析空的报数。"""


# =========================================================================
# 3. BC 具名清单(2026 新政 Care/Build 五桶 + 主线排除清单 §3.11)
# =========================================================================

BC_URL = ("https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/"
          "about-the-bc-provincial-nominee-program")
"""WelcomeBC「About the BC PNP」单页(浏览器 UA 直连 200)→ 复用 crawl 的 HTML→md 转换器
→ 按节标题分桶。2026 新政(Care/Build/Innovate)恢复了职业清单(旧 tech 定向 2024-12 关停后
曾无清单可抓,故 build_bc 一度下架;本段按新页面重写)。Innovate 无清单(High Economic
Impact 全行业)→ 不产出。"""

BC_SECTION_BUCKET = {
    "health care": "health",
    "health authority-eligible occupations": "health",
    "childcare": "childcare",
    "education": "education",
    "veterinary care": "vet",
    "construction trades": "construction",
}
"""md 节标题(#### 小节 / ### Health Authority 大节)→ 桶;**同桶多节取并集**
(Care/Health care 定向邀请 ∪ Health Authority 通道职业 —— 同为医疗信号,粗筛不分雇主)。"""

BC_BUCKETS = {
    "health": {"out": "bc-health.json", "label": "BC 医疗",
               "stream": "BC PNP Care: health targeted ITA / Health Authority stream"},
    "childcare": {"out": "bc-childcare.json", "label": "BC 幼教",
                  "stream": "BC PNP Care: childcare targeted ITA"},
    "education": {"out": "bc-education.json", "label": "BC 法语教师",
                  "stream": "BC PNP Care: education targeted ITA (French-speaking)"},
    "vet": {"out": "bc-vet.json", "label": "BC 兽医",
            "stream": "BC PNP Care: veterinary targeted ITA"},
    "construction": {"out": "bc-construction.json", "label": "BC 建筑技工",
                     "stream": "BC PNP Build: construction trades targeted ITA"},
}
"""五个专项桶的产出文件 / 前端短标签 / 官方通道名。"""

BC_NOC_LINE_RE = re.compile(r"^(\d{5})\s+(.+?)\s*$")
"""页面职业行:"31301 Registered nurses …"(无列表符号)。"""

BC_HEADING_RE = re.compile(r"^#{2,4}\s+(.+?)\s*:?\s*$")
"""md 节标题行。"""

BC_NAME_TAIL_RE = re.compile(r"[\s*\d]+$")
"""职业名尾部的脚注记号(*/¹²³ 由转换器落成裸 * 或数字)。"""

BC_GUIDE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"
"""BC PNP Skills Immigration Program Guide(PDF)。**主线排除清单只在这份 PDF 里** ——
网页版是 JS 渲染,httpx 拿到空壳,所以走 build_bc_req 同一份 PDF。"""

BC_GUIDE_TIMEOUT_S = 60
"""指南 PDF 抓取超时。"""

BC_INELIG_SECTION_RE = re.compile(r"3\.11\s+Ineligible Occupations", re.I)
"""§3.11 起锚(目录页也有一处 → 取最后一处正文)。"""

BC_INELIG_END_RE = re.compile(r"3\.12\s+Eligible Employment", re.I)
"""§3.12 止锚。"""

BC_INELIG_ROW_RE = re.compile(r"(\d{5})\s+([A-Za-z][^\n•]*)")
"""排除清单一行。"""

BC_INELIG_EFFECTIVE_RE = re.compile(r"in effect for applications submitted after\s+([A-Z][a-z]+ \d{1,2}, \d{4})")
"""官方自报的生效日。"""

BC_INELIG_MIN = 5
"""2026-08-03 实见 12 个;低于此数视为解析异常。"""

BC_INELIG_NOTE = ("BC 主线排除清单:该 NOC 下**全部**职业对任何 Skills Immigration 通道都不合格,"
                  "job offer 落在这些 NOC 上会被拒。出自 BC PNP Skills Immigration Program Guide §3.11。")
"""排除清单的口径说明。
沿革(2026-08-03 接入):上面那些是**专项**定向邀请清单;BC 的**主线** Skills Immigration
从 2026-06-13 起新增了一张「对**任何** Skills Immigration 通道都不合格」的职业表
(官方指南 §3.11,2026-06-10 版新引入)—— 官方原话:Some NOCs are not eligible for
nomination under any Skills Immigration stream. 有了它,BC 才从「只有专项清单、主线未知」
变成排除式 —— 报告能对未命中的职业给粗筛结论,而不是含糊地说「本站只覆盖了 N 条专项」。"""

OUT_BC_INELIGIBLE_FILE = "bc-ineligible.json"
"""BC 主线排除清单的产出文件名。"""

BC_INELIG_STREAM = "BC PNP Skills Immigration — ineligible occupations (all streams)"
"""排除清单的官方通道名。"""

BC_INELIG_LABEL = "BC 不合格职业"
"""排除清单的前端短标签。"""

NOT_MARKED = "未标"
"""官方没标日期时的占位词(BC/SK 收尾报数共用)。"""

BC_PRINT_PDF_FAIL_TPL = "  ✗ BC 指南 PDF 抓取失败: {name} {detail}(保留旧表)"
"""指南 PDF 抓取失败的报数。"""

BC_PRINT_NO_SECTION = "  ✗ BC 指南里没找到 §3.11(改版?保留旧表,请人工复核)"
"""§3.11 找不到的报数。"""

BC_PRINT_TOO_FEW_TPL = "  ✗ BC §3.11 只解析到 {n} 个 NOC(<{min_n},疑似改版)—— 保留旧表,请人工复核"
"""排除清单条数异常的报数。"""

BC_PRINT_INELIG_TPL = ("  ✓ {label:<8} {n:>3} 个职业 → pnp/bc-ineligible.json  "
                       "(实时 {fetched};生效 {effective})")
"""排除清单收尾报数。"""


# =========================================================================
# 4. SK 具名清单(三条 Talent Pathway + 主线排除清单 PDF)
# =========================================================================

SK_BASE_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
               "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/")
"""SINP 申请人侧路径前缀(三条 Talent Pathway 与主线排除页都挂在这下面)。
saskatchewan.ca 用浏览器 UA 直连 200(无真挑战,那个 cloudflare email-decode 脚本是误报)。"""

SK_NOTE = ("SINP Talent Pathway:除职业在清单内,还需萨省雇主长期全职 offer 且雇主已获 EPA;"
           "2026 起住宿餐饮/零售/卡车运输三行业另有配额封顶(15%/5%/5%)。")
"""三条 Talent Pathway 的共同口径。
E6-09 全省核查(2026-07-25):三张清单与官方逐条吻合,但语义比「in-demand」窄 —— 这三条都是
Talent Pathway,除了 NOC 在清单内,还要**萨省雇主的长期全职 offer + 雇主先拿 EPA**;
2026 起另有行业配额封顶(住宿餐饮 15%、零售 5%、卡车运输 5%)未建模。清单本身仍是 inclusion
(type 不改,08_score 语义就是 inclusion/exclusion 二选一),条件写在这里作数据层事实。"""

SK_STREAMS = [
    {"url": SK_BASE_URL + "health-talent-pathway", "out": "sk-health.json",
     "stream": "SINP Health Talent Pathway", "label": "SK 医疗"},
    {"url": SK_BASE_URL + "sinp-innovation-tech-talent-pathway", "out": "sk-tech.json",
     "stream": "SINP Innovation & Tech Talent Pathway", "label": "SK 科技"},
    {"url": SK_BASE_URL + "agriculture-talent-pathway", "out": "sk-agri.json",
     "stream": "SINP Agriculture Talent Pathway", "label": "SK 农业"},
]
"""每条 = 一个 inclusion 具名通道(实时 URL / 输出文件 / 通道英文名 / 前端短标签)。"""

SK_NOC_PATTERNS = [
    re.compile(r"^[-*]\s*(\d{5})\s*[—–-]\s*(.+?)\s*$"),
    re.compile(r"^\|\s*(\d{5})\s*\|\s*([^|]+?)\s*\|"),
]
"""两种职业行写法:`- 21211 — Data scientists` 与 `| 21211 | Data scientists |`。"""

SK_EXCL_PRODUCT = 102709
"""SINP 主线排除清单的出版物产品号(清单是 PDF,格式 id 从产品 API 现取,不写死)。
2026-08-03 补:此前本站只抓了三条 Talent Pathway(行业专项),于是「SK 主线」在库里是空的,
而 provListCoverage 见到有行就判 listed → 报告对用户说「查过萨省清单,你不在上面」。
我们从没查过那张表 —— 主线在这里,而且是排除式:不在清单上 = 可以申请(还要 TEER 0-3)。"""

SK_EXCL_API = f"https://publications.saskatchewan.ca/api/v1/products/{SK_EXCL_PRODUCT}"
"""产品 API(现取格式 id)。"""

SK_EXCL_DL_TPL = "https://publications.saskatchewan.ca/api/v1/products/{p}/formats/{f}/download"
"""PDF 下载地址模板。"""

SK_EXCL_PAGE = SK_BASE_URL + "occupation-restrictions-and-requirements"
"""排除清单的人可读官方页(表级 url 用它,不用 PDF 直链)。"""

SK_EXCL_NOTE = ("SINP 主线(Occupations In-Demand / Express Entry)是**排除式**:不在本清单上即可申请;"
                "官方同页明示 NOC TEER 4/5 不合格(即需 TEER 0-3)。"
                "在清单上的职业仍可能走 Employment Offer 或萨省经验类——但需萨省雇主注册并获 EPA 批准。")
"""主线排除清单的口径说明。"""

SK_EXCL_APPLIES_TO = "OID/EE"
"""本表只管 OID/EE 两个子类别。
2026-08-05 补:不管 Employment Offer(雇主 offer 制,走另一张 Job Offer Exclusion List,
见本文件 §32 SK Job Offer 段)。原句抄自 occupation-restrictions-and-requirements 页
(data/crawl/sk-sinp/ 缓存),quote-anchored,禁转述。"""

SK_EXCL_APPLIES_TO_QUOTE = (
    "People with the following occupations are excluded from applying to the Occupations "
    "In-Demand (OID) and Express Entry (EE) program sub-categories. This is a list of "
    "occupations that are not eligible for these program sub-categories. Note that these "
    "occupations may be eligible through the International Skilled Worker Employment Offer "
    "subcategory and the Saskatchewan Work Experience category if your employer has "
    "registered with the Government of Saskatchewan and received approval for the job offer."
)
"""适用范围的官方原句(quote-anchored,禁转述)。"""

SK_EXCL_ROW_RE = re.compile(r"^\s*(\d{5})\s+([A-Za-z].*?)\s*$")
"""PDF 两列表格并成一行的写法。"""

SK_EXCL_CODE_RE = re.compile(r"^\s*(\d{5})\s*$")
"""PDF 两列表格拆成相邻两行时的 NOC 行(pymupdf 常这么拆:「11100」\\n「Financial auditors…」)。"""

SK_EXCL_UPDATED_RE = re.compile(r"Updated:\s*([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})")
"""官方在 PDF 首页自己标的更新日期 —— 比我们的 fetched 更该给用户看(这份表可能几年不动)。"""

SK_EXCL_LOOKAHEAD = 3
"""NOC 行之后往下看几行找职业名(取紧邻的下一行非空)。"""

SK_API_TIMEOUT_S = 40
"""产品 API 超时。"""

SK_PDF_TIMEOUT_S = 60
"""排除清单 PDF 下载超时。"""

SK_EFFECTIVE_TPL = "{y}-{m:02d}-{d:02d}"
"""官方标注更新日转 ISO 的模板。"""

K_PRODUCT_FORMATS = "productFormats"
"""SK 产品 API 键:格式清单。"""

K_PRODUCT_FORMAT_ID = "productFormatId"
"""SK 产品 API 键:格式 id。"""

OUT_SK_EXCLUDED_FILE = "sk-excluded.json"
"""SK 主线排除清单的产出文件名。"""

SK_EXCL_STREAM = "SINP Occupations In-Demand / Express Entry"
"""主线排除清单的官方通道名。"""

SK_EXCL_LABEL = "SK 主线不合格清单"
"""主线排除清单的前端短标签。"""

SK_PRINT_NO_FORMAT = "  ✗ SK 排除清单:产品 API 没给格式 id(保留旧表)"
"""产品 API 没给格式 id 的报数。"""

SK_PRINT_EXCL_FAIL_TPL = "  ✗ SK 排除清单抓取失败: {name} {detail}(保留旧表)"
"""排除清单抓取失败的报数。"""

SK_PRINT_NO_EXCL = "  ✗ SK 排除清单没解析到 NOC(保留旧表)"
"""排除清单解析空的报数。"""

SK_PRINT_EXCL_TPL = ("  ✓ {label:<10} {n:>3} 个职业 → pnp/sk-excluded.json  "
                     "(实时 {fetched};官方标注更新 {effective})")
"""排除清单收尾报数。"""

SK_EXCL_SHORT_LABEL = "SK 主线排除"
"""排除清单收尾报数里的短标签(与表内 label 不同,原样保留)。"""


# =========================================================================
# 5. NS 具名清单(紧缺空缺 / 毕业生两通道 + 主线政策事实)
# =========================================================================

NS_STREAMS = [
    {"url": "https://liveinnovascotia.com/critical-vacancies", "out": "ns-critical.json",
     "stream": "Nova Scotia Critical Vacancies", "label": "NS 紧缺空缺"},
    {"url": "https://liveinnovascotia.com/nova-scotia-graduate", "out": "ns-grad.json",
     "stream": "Nova Scotia Graduate stream", "label": "NS 毕业生"},
]
"""每条 = 一个 inclusion 具名通道(实时 URL / 输出文件 / 通道英文名 / 前端短标签);
liveinnovascotia.com 浏览器 UA 直连 200。"""

NS_NOC_PATTERNS = [
    re.compile(r"^[-*]?\s*\[\s*(\d{5})\s*[—–-]\s*([^\]]+?)\s*\]"),
    re.compile(r"^[-*]\s*NOC\s*(\d{5})\s*[:：]\s*(.+?)\s*$", re.I),
]
"""NS md 写法与 BC/SK 不同(故本段带专属正则):
  · 紧缺空缺  `[33102 – Nurse aides …](https://…)`
  · 毕业生    `- NOC 32102: Paramedical occupations`"""

NS_MAIN_URL = "https://liveinnovascotia.com/skilled-worker"
"""NS 主线 Skilled Worker 页(四个 tab 逐字读过,见 NS_POLICY_NOTE)。"""

NS_PRIORITY_URL = "https://liveinnovascotia.com/resources/nominee-program-priorities-nova-scotia"
"""NS 提名优先级页(2026-04-27 那版:医疗与技术工种 TEER 0-4 首选、TEER 5 不优先)。"""

NS_OID_EMPTY_QUOTE = "there are no occupations listed in this category at this time"
"""Occupations in Demand 通道为空的官方原句(小写比对)。"""

NS_OID_KW = "occupations in demand"
"""主线页里 Occupations in Demand 段的判词(连原句都没命中时用它区分「改版」与「已非空」)。"""

NS_TEER_04_RE = re.compile(r"TEER\s*(?:levels?\s*)?0\s*[–—-]\s*4", re.I)
"""优先级页的 TEER 0-4 表述(实抓留证,变了就看得出来)。"""

NS_ASOF_RE = re.compile(r"\*(\w+ \d{1,2}, \d{4})\*")
"""优先级页自带的发布日期。"""

OUT_NS_POLICY_FILE = "ns-policy.json"
"""NS 主线口径的产出文件名。"""

NS_FACT_NO_MAIN_LIST_KEY = "noMainList"
"""政策事实键:主线不发清单。"""

NS_FACT_NO_MAIN_LIST = ("Skilled Worker 主线不公布职业清单:按雇主 offer + TEER 判定;"
                        "Construction 子条件按行业(NAICS 23 建筑业)判,不是 NOC 清单。")
"""政策事实:NS 主线不发清单。
沿革(2026-08-03 接入):上面两条是**专项**通道;NS 的**主线** Skilled Worker 官方就不发
职业清单,四个 tab 逐字读过:
  · Skilled Worker  按 offer + TEER 判,不列职业
  · Construction    按**行业**(NAICS 23 建筑业)判,不是 NOC 清单
  · Occupations in Demand  官方原话「There are no occupations listed in this category at this time.」
  · Physicians      只开给 NOC 31100/31101/31102
所以「NS 没有主线清单」是**政策事实**,不是我们没抓到 —— 必须实抓校验并留证,
否则哪天官方真发了清单,站上还在按「无清单」口径说话(ON 2026-06 改制那次就是这么烂掉的)。
本表**不带 occupations 键** → 08_score 目录驱动扫描天然跳过,不参与具名打分。"""

NS_FACT_OID_KEY = "oidList"
"""政策事实键:OID 通道当前状态。"""

NS_FACT_OID_EMPTY = ("Occupations in Demand 通道当前**没有任何职业在列**(官方原话:There are no "
                     "occupations listed in this category at this time)。")
"""政策事实:OID 通道为空(官方原话 quote-anchored)。"""

NS_FACT_OID_NOT_EMPTY = "⚠️ Occupations in Demand 通道已不再是空表 —— 官方可能重新公布了职业清单,需人工复核并接入。"
"""政策事实:OID 通道已非空(该去人工复核了)。"""

NS_FACT_PRIORITY_KEY = "priority"
"""政策事实键:提名优先级。"""

NS_FACT_PRIORITY_TPL = ("提名优先级:医疗与技术工种(skilled trades)在 TEER 0-4 为首选;TEER 5 不在优先之列。"
                        "页面原文命中「{hit}」。")
"""政策事实:提名优先级(带命中的官方原文)。"""

NS_POLICY_STREAM = "Nova Scotia Nominee Program — Skilled Worker (main)"
"""主线口径表的官方通道名。"""

NS_POLICY_LABEL = "NS 主线口径"
"""主线口径表的前端短标签。"""

NS_PRINT_POLICY_FAIL_TPL = "  ✗ NS 政策页抓取失败: {name} {detail}(保留旧表)"
"""政策页抓取失败的报数。"""

NS_PRINT_NO_OID = "  ✗ NS 主线页没找到 Occupations in Demand 段(改版?保留旧表,请人工复核)"
"""主线页改版的报数。"""

NS_PRINT_NO_PRIORITY = "  ! NS 优先级页没命中 TEER 0-4 表述(政策可能已变,本轮不写该条)"
"""优先级没命中的报数。"""

NS_PRINT_POLICY_TPL = ("  ✓ {label:<10} {n:>3} 条政策事实 → pnp/ns-policy.json  "
                       "(实时 {fetched};OID 清单{oid})")
"""主线口径收尾报数。"""

NS_OID_EMPTY_WORD = "为空"
"""收尾报数里 OID 为空的措辞。"""

NS_OID_NOT_EMPTY_WORD = "已非空⚠️"
"""收尾报数里 OID 已非空的措辞。"""


# =========================================================================
# 6. MB 具名清单(在需职业总表 + 乡镇在需)
# =========================================================================

MB_IDOL_URL = "https://immigratemanitoba.com/mpnp/idol/"
"""MPNP「Manitoba In-Demand Occupations List」页(浏览器 UA 直连 200)。
**注意 URL**:`/work/in-demand-occupations/` 已被站方重定向到 2023 年的一篇更新通告
(只有增补几条),真正的现行总表在 `/mpnp/idol/`。旧记忆「MB 无职业清单」是错的
(E6-09 全省核查纠正)。"""

MB_BUCKETS = {
    "main": {"out": "mb-indemand.json", "label": "MB 在需职业",
             "stream": "MPNP In-Demand Occupations List",
             "note": "MPNP 在需职业:EOI 抽选中获优先,非硬性资格门槛;各 stream 另有自己的条件与语言要求。"},
    "rural": {"out": "mb-indemand-rural.json", "label": "MB 乡镇在需",
              "stream": "MPNP In-Demand Occupations List – rural (outside the Manitoba Capital Region)",
              "note": "仅当就业地在曼省首都区(温尼伯及周边)**以外**时才算在需;温尼伯岗不适用。"},
}
"""两个桶。页面结构(2026-07-25 核实):按 NOC 大类分 9 节(1 商务/2 科技…9 制造)= **在需职业
总表**,另有一节 **Rural in-demand occupations** = 仅当就业地在**首都区(温尼伯)以外**才算在需
→ 分两桶,不合并(合并会让温尼伯岗误显在需)。
页面**不含**每职业的 stream 限定列(正文那句「limited to specific skilled streams」是概述,
表里没有该列)→ **不猜 stream 维度**,只落 NOC+名称(宁可留空也不瞎猜)。
在需 = EOI 抽选优先信号,非硬性资格门槛;08_score 按 inclusion 消费(TEER4-5 凭清单可走)。"""

MB_ROW_RE = re.compile(r"^\|\s*(\d{5})\s*\|\s*\d\s*\|\s*([^|]+?)\s*\|")
"""表行:| NOC | TEER | 职业名 | 最低 CLB | 2016 对应 | 2016 技能等级 |。"""

MB_HEADING_RE = re.compile(r"^#{2,4}\s+(.+?)\s*$")
"""md 节标题行。"""

MB_BUCKET_MAIN = "main"
"""桶键:在需职业总表。"""

MB_BUCKET_RURAL = "rural"
"""桶键:乡镇在需。"""

MB_RURAL_KW = "rural"
"""节标题里的乡镇判词。"""

MB_MAIN_HEAD_RE = re.compile(r"^\d\s*[‐-―-]")
"""「N – 大类」九节的判据(其余节 —— 说明/注 —— 不收)。"""

MB_PRINT_TABLE_TPL = "  ✓ {label:<8} {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""MB 清单收尾报数(与通用 8 字档同形,单列一份免得改一处动两省)。"""


# =========================================================================
# 7. NB 不受理职业清单(PNP 两表 + AIP 两表,叠加式排除)
# =========================================================================

NB_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/notice.html"
"""gnb.ca「Important notices」页(httpx 直连 200)。
E6-09 全省核查纠正了两条旧假设:
① 旧记忆「NB 2026-02 暂停省提名」错误 —— NB 在办,只是层层收窄;
② 首版曾想把 2026-05-04「NB Experience pathway 限 Healthcare/Education/Construction Trades」
   做成「行业→本站 broad 大类」判定 —— **已放弃**:官方只给行业名不给 NOC,broad 映射会硬猜
  (NOC 大类 4 含教师也含警察律师社工、护理员 44101 落在「教育」大类而非「医疗」),
   踩「宁可留空也不瞎猜」。该行业限制**只对 NB Experience 一条 pathway**,通过 NB 新闻
  (scrape_nb_nbpnp_news)在弹框「本省最新公告」如实呈现,不做逐岗判定。"""

NB_SPLIT_QUOTE = "regardless of sectors"
"""官方原文的分界句:此句之前 = NAICS 72 条件性,之后 = 无条件。"""

NB_FOOD_NOTE = ("官方留了口子:雇主本身不属住宿餐饮业的同款岗仍可提交——本站无雇主行业字段,"
                "按多数情形判不符合,请按自己雇主的实际行业核对。")
"""住宿餐饮两表的共同尾注(**条件性**:官方原文「雇主本身不属住宿餐饮业(NAICS 72)的同款岗
仍可提交 EOI」。本站没有雇主 NAICS 行业字段(不猜),按多数情形判不符合,条件写进 label 与
note,由用户对自己雇主行业做最后判断 —— 粗筛信号,非资格认定)。"""

NB_NOTICES = [
    {"key": "pnp", "program": "PNP", "must": ("expressions of interest", "NAICS 72"),
     "stream": "NB Skilled Worker stream / NB Express Entry stream — occupations not being considered (EOI/ITA)",
     "any": {"out": "nb-ineligible.json", "label": "NB 不符合清单",
             "note": "自 2026-02-03 起,NB 不受理这些职业的省提名 EOI/ITA(不论雇主属什么行业)。"},
     "food": {"out": "nb-ineligible-food.json", "label": "NB 餐饮住宿不符合",
              "note": "自 2026-02-03 起,NB 不受理住宿餐饮业(NAICS 72)这些职业的省提名 EOI/ITA。" + NB_FOOD_NOTE}},
    {"key": "aip", "program": "AIP", "must": ("endorsement applications", "NAICS 72"),
     "stream": "Atlantic Immigration Program (NB) — occupations not being considered for endorsement",
     "any": {"out": "nb-aip-ineligible.json", "label": "NB AIP 不受理",
             "note": "自 2026-02-03 起,NB 不受理这些职业的 AIP 背书申请(不论雇主属什么行业),雇主是否指定雇主都一样。"},
     "food": {"out": "nb-aip-ineligible-food.json", "label": "NB AIP 餐饮住宿不受理",
              "note": "自 2026-02-03 起,NB 不受理住宿餐饮业(NAICS 72)这些职业的 AIP 背书申请。" + NB_FOOD_NOTE}},
]
"""同一页两条通告,列表不同、管的项目也不同 —— 一条管省提名(EOI/ITA),一条管 AIP 背书。
program 决定下游怎么用:PNP 表进 08_score 资格判定;AIP 表只作展示维度(08 跳过,前端判 AIP 那一行)。
**A. program=PNP**(NB Skilled Worker + NB Express Entry 两个流的 EOI/ITA):
  · nb-ineligible.json       「NB 不符合清单」   —— regardless of sectors,14 个 NOC,无条件
  · nb-ineligible-food.json  「NB 餐饮住宿不符合」—— 住宿餐饮业(NAICS 72),13 个 NOC
**B. program=AIP**(Atlantic Immigration Program 的**背书申请**,与省提名是两条路):
  · nb-aip-ineligible.json      「NB AIP 不受理」        —— 6 个 NOC,不论行业
  · nb-aip-ineligible-food.json 「NB AIP 餐饮住宿不受理」—— 10 个 NOC,住宿餐饮业(同款条件性)
  雇主是不是 AIP 指定雇主**不影响**这条:官方明说这些岗的背书申请一律不受理 —— 故「指定雇主」
  与「本岗职业不受理」要同时说清,不能只显前者(2026-07-26 Frank 拍板补此表)。
四表都是 `type=ineligible`(命中=不符合)+ **`overlay=true`**:与 AAIP 那种「本省无 TEER 门槛、
除清单外全可」不同,NB 的排除是**叠加**在默认 TEER 规则上的(NB Skilled Worker 仍要技能岗 offer)
—— 08_score 见 overlay 只做「命中即不可」,不把该省 TEER4-5 默认放开。"""

NB_NOTICE_SPLIT = "### Notice"
"""整页按通告切段的分隔标题。"""

NB_NOC_LINE_RE = re.compile(r"NOC\s*(\d{5})\s*\*{0,2}\s*[–—-]\s*\*{0,2}\s*(.+?)\s*"
                            r"(?=\*{0,2}\s*NOC\s*\d{5}|$)", re.S)
"""官方写法:**NOC 63200** – Cooks(粗体记号与破折号形式不稳定,宽松匹配)。"""

NB_TAIL_RE = re.compile(r"\s+(?:However\b|Additionally\b|In addition\b|This restriction\b|>).*$", re.S)
"""清单末条会粘上后文正文(官方一段到底,无列表标签)→ 名字在这些词处截断。"""

NB_NAME_STRIP = " *–—-.,"
"""职业名两端要剥的字符。"""

NB_NAME_MAX = 80
"""职业名截断长度。"""

NB_SECTOR_NOTICE = "2026-05-04 起 NB Experience pathway 新 ITA 只限 Healthcare/Education/Construction Trades"
"""行业限制的政策校验句(不做逐岗判定,但政策还在不在得盯着 —— 变了要人工复核新闻文案)。"""

NB_SECTOR_KWS = ("healthcare", "construction trades")
"""行业限制原文的必含关键词。"""

NB_SECTOR_DATE_KW = "may 4, 2026"
"""行业限制原文的日期判词。"""

NB_PRINT_NO_NOTICE_TPL = "  ✗ 没找到 {key} 通告 → NB 可能已改政策,请人工复核(保留旧表)"
"""通告找不到的报数。"""

NB_PRINT_TABLE_TPL = "  ✓ {label:<14} {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""NB 清单收尾报数(14 字标签档 —— NB 的标签更长)。"""

NB_PRINT_SECTOR_OK_TPL = "  · 政策校验:{notice}(仍在;逐岗判定不做,由 NB 新闻呈现)"
"""行业限制仍在的报数。"""

NB_PRINT_SECTOR_GONE_TPL = "  ⚠ 政策校验:未命中「限三行业」原文 → NB 行业限制可能已变,请人工复核 {url}"
"""行业限制已变的报数。"""


# =========================================================================
# 8. NL 优先处理职位(职位名文本非 NOC,不参与打分)
# =========================================================================

NL_PRIORITY_URL = "https://www.gov.nl.ca/immigration/excluded-positions/"
"""NL 优先处理职位页。
⚠️ **口径(2026-08-03 接入时逐字核对,别按名字想当然)**:
  · 页面 URL 叫 `excluded-positions`,内容却**不是排除清单** —— 正文原话是这些
    in-demand 职位「exempt from provincial labour market testing」(免 Job Vacancy Assessment /
    AIP 招工测试)并「receive priority processing」。**不在表上 ≠ 不能申请**,只是没有这份加速。
  · 表里是**职位名称文本**(Software Developer / Cage Site Technician…),**不是 NOC 码**,
    官方没给映射。按项目铁律「宁可留空不瞎猜」:原样存 `positions`,**不硬映射 NOC**。
  · 因此本表**不带 `occupations` 键** —— 08_score 目录驱动扫 raw/pnp/*.json 时天然跳过,
    不会被误当成具名通道清单参与打分(与 draws.json 同一手法)。"""

OUT_NL_PRIORITY = paths.PNP / "nl-priority.json"
"""NL 优先处理职位落盘处(开工报路径用)。"""

OUT_NL_PRIORITY_FILE = "nl-priority.json"
"""NL 优先处理职位的产出文件名。"""

NL_PRIORITY_NOTE = ("NL 优先处理职位:免省级劳动力市场测试(Job Vacancy Assessment / AIP 招工测试)并优先处理。"
                    "**不在表上不等于不能申请**,只是没有这份加速。官方给的是职位名称文本、不是 NOC 码,故本站不做 NOC 映射。")
"""NL 优先处理职位的口径说明。"""

NL_SECTOR_RE = re.compile(r"^In-demand\s+(.+?)\s+(?:sector\s+)?occupations?\b.*:\s*$", re.I)
"""行业小标题(开一段)。"""

NL_GROUP_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")
"""段内分组:**Engineers and Developers**。"""

NL_ITEM_RE = re.compile(r"^\s*(?:\d+\.|[-*])\s+(.+?)\s*$")
"""职位行:1. Software Developer。"""

NL_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
"""md 链接(只留显示文本)。"""

NL_MD_LINK_SUB = r"\1"
"""md 链接的替换目标(第一个捕获组)。"""

NL_DETAIL_SPLIT_RE = re.compile(r"\s{2,}")
"""「Physician<两个空格>Family Medicine; Psychiatry; …」= 职位 + 分号分隔的专科明细。
明细留在 detail,不塞进 title(否则一条 200 字的「职位名」既没法展示也没法比对)。"""

NL_TITLE_STRIP_STAR = "*"
"""职位名两端要剥的星号。"""

NL_TITLE_RSTRIP_DOT = "."
"""职位名**只削尾**的句号 —— .NET Developer 的首字符点是名字的一部分
(2026-08-03 实撞,曾被削成 NET)。"""

NL_HEADING_PREFIX = "#"
"""走出正文区的判据(下一个大标题)。"""

NL_PRIORITY_STREAM = "NL priority processing / labour market testing exemption"
"""优先处理表的官方通道名。"""

NL_PRIORITY_LABEL = "NL 优先处理职位"
"""优先处理表的前端短标签。"""

NL_PROGRAM_PNP_AIP = "PNP+AIP"
"""本表同时覆盖省提名与大西洋项目。"""

NL_PRINT_FAIL_TPL = "  ✗ NL 优先职位抓取失败: {name} {detail}(保留旧表)"
"""抓取失败的报数。"""

NL_PRINT_NO_POSITION = "  ✗ NL 没解析到职位(页面改版?保留旧表)"
"""解析空的报数。"""

NL_PRINT_DONE_TPL = "  ✓ {label:<10} {n:>3} 个职位 / {sectors} 个行业 → pnp/{out}  (实时 {fetched})"
"""优先处理表收尾报数。"""

NL_PRINT_SECTOR_TPL = "      · {sector}: {n} 个"
"""逐行业报数。"""


# =========================================================================
# 9. PE 在需职业(走官方指南 PDF —— 网页在 Radware 后面)
# =========================================================================

PE_GUIDE_URL = "https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf"
"""PEI Workforce 官方申请指南 PDF。
**实时抓,但走 PDF**:`princeedwardisland.ca` 的 **HTML 页在 Radware 后面**(httpx 拿到的是
「Verifying your browser before proceeding...」壳,2026-08-03 用全套浏览器头 + http1.1 复验仍被挡),
而**文件服务器 `/sites/default/files/` 不挡** —— 官方申请指南 PDF 直接 200。
于是本站的 PE 口径取自官方申请指南原文,而不是网页。"""

PE_PAGE_URL = "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-pnp-workforce-streams"
"""PEI Workforce 通道的人可读官方页(表级 url 用它)。"""

OUT_PE_OID = paths.PNP / "pe-oid.json"
"""PE 在需职业落盘处(开工报路径用)。"""

OUT_PE_OID_FILE = "pe-oid.json"
"""PE 在需职业的产出文件名。"""

PE_OID_NOTE = ("PEI Occupations in Demand:须是清单内 NOC + PEI 雇主全职非季节性长期 offer,另有 1 年相关经验、"
               "18-59 岁、高中以上、CLB/NCLC 4 等条件。PEI 另有 Skilled Worker / Critical Worker / "
               "Intermediate Experience 等通道**不列职业**(按 offer + TEER 判)——不在本清单不等于 PE 走不通。"
               "口径取自官方申请指南 PDF(PEI 网页在 Radware 反爬后面,无法自动抓)。")
"""PE 在需职业的口径说明。
⚠️ PEI Occupations in Demand 是**具名清单**(必须是这 8 个 NOC 之一 + PEI 雇主全职长期 offer)。
PEI 另有 Skilled Worker / Critical Worker / Intermediate Experience 等通道**不列职业**
(按 offer + TEER 判),所以「不在这 8 个里」**不等于** PE 走不通 —— 前端/报告不得据此下
「PE 不收」的结论。"""

PE_SECTION_RE = re.compile(r"Occupations\s+in\s+Demand", re.I)
"""清单段起锚(目录页也会出现一次 —— 逐个候选段往后扫一屏,取第一个真带 NOC 的)。"""

PE_NOC_LINE_RE = re.compile(r"NOC\s+(\d{5})\s*\(([^)]+)\)")
"""清单行:NOC 62200 (Chefs)。"""

PE_MIN_EXPECTED = 5
"""低于此数视为解析异常(2026-08-03 实见 8 个)。"""

PE_SCAN_LEN = 2500
"""每个候选段往后只扫这么多字符(免得把别的通道的零星 NOC 混进这张清单)。"""

PE_GUIDE_TIMEOUT_S = 60
"""指南 PDF 抓取超时。"""

PE_OID_STREAM = "PEI PNP — Occupations in Demand"
"""在需职业表的官方通道名。"""

PE_OID_LABEL = "PE 在需职业"
"""在需职业表的前端短标签。"""

PE_NAME_CLIP = 60
"""逐条报数时职业名的截断长度。"""

PE_PRINT_FAIL_TPL = "  ✗ PE 申请指南抓取失败: {name} {detail}(保留旧表)"
"""指南抓取失败的报数。"""

PE_PRINT_NO_SECTION = "  ✗ PE 指南里没找到 Occupations in Demand 段(改版?保留旧表,请人工复核)"
"""清单段找不到的报数。"""

PE_PRINT_TOO_FEW_TPL = "  ✗ PE 只解析到 {n} 个 NOC(<{min_n},疑似改版)—— 保留旧表,请人工复核"
"""条数异常的报数。"""

PE_PRINT_DONE_TPL = "  ✓ {label:<10} {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""在需职业表收尾报数。"""

PE_PRINT_OCC_TPL = "      · {noc} {name}"
"""逐条报数。"""

# =========================================================================
# 10. 省抽选事实(E6-04:BC / AB / MB / NB / NL 最近抽选 + ON 改制通告)
# =========================================================================

OUT_DRAWS = paths.PNP / "draws.json"
"""抽选事实表(⚠️ **无 occupations 键** —— 08_score 目录驱动扫 raw/pnp/*.json 时天然跳过)。
**事实展示层,非资格判定**:各省分制互不相通(BC=SIRS / AB=WEOI / MB=MPNP EOI),都不是 CRS ——
score 一律带 scale 标注,前端展示必须声明「省自评分制,非 CRS」。
SK 2025 改制后无抽选、QC 不属 PNP,不产出。抓取失败/解析空 → 该省保留旧数据。"""

DRAWS_TIMEOUT_S = 30
"""各省抽选页抓取超时。"""

DRAWS_MAX_PER_PROV = 12
"""raw 留最近 N 条;mart 再截。"""

DRAWS_NB_MAX = 48
"""NB 例外(C4):按职业类别定向邀请,一轮拆 4-5 行(一通道一行),12 条只装得下两轮半 ——
三月那轮建筑类 279 邀请就被挤掉了。判定层要数「某类别一年被选中几轮」,给 NB 留一年的量。"""

DRAWS_BC_URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply"
"""BC Skills Immigration ITA 表。"""

DRAWS_AB_URL = "https://www.alberta.ca/aaip-processing-information"
"""AB「Draw information」表。"""

DRAWS_MB_URL = "https://immigratemanitoba.com/draws/"
"""MB /draws/ 索引页(每期一个 <article class=post>)。"""

DRAWS_ON_URL = "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates"
"""ON 更新页(只当通告用)。
沿革(#153,Frank 报障「OINP 新通道出来了但站上没更新」):原先 ON 整块是**写死**的 ——
2026-06-26 手写「新通道细则待公布」,再不会自己更新;7-20 官方已公布新 Ontario Workforce
Priority Stream 的资格标准,站上还在说「待公布」= 过期误导。改为实抓该页:
①最新一条更新 → notice(有新动静一小时内自动跟上)②带「issued N invitations」的条目 → draws
(官方按轮次公布邀请数,无分数线 → score=None,scale=None 不假装有分制)。"""

DRAWS_ON_INV_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp-invitations-apply"
"""ON 的**抽选记录**页(逐轮公布日期/邀请数/分数区间/说明)。
2026-07-31 复核推翻旧结论「OINP 不公布分数线」—— invitations 页有 Score range 一列
(如「57 and above」)。"""

DRAWS_NL_URL = "https://www.gov.nl.ca/immigration/invitations-to-apply-updates/"
"""NL ITA 批次表(2026-08-03 接入,海洋四省的第一份抽选):OIM 自 2025-02 起走 EOI 模型,
按批次发 ITA。**只公布日期与邀请数,不公布分数线** —— score 一律 None、scale 一律 None
(不是抓漏了,是官方不发)。Notes 列写 NLPNP / AIP 各多少,原样留在 note 里
(AIP 是联邦大西洋项目,与省提名同批发)。"""

DRAWS_NB_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/invitations-to-apply.html"
"""NB 当期页(2026-08-05 接入,海洋四省第二份):ImmigrationNB 也是 EOI 模型,**按职业类别
定向发邀请,不发分数线** —— score/scale 一律 None,不假装有分制。当期页只挂最新一轮(~5 条)。
URL 经 data/crawl/nb-imm/manifest.json 核对,禁凭印象猜。"""

DRAWS_NB_PREV_URL = ("https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/"
                     "immigrating-to-nb/invitations-to-apply/previous-invitations-2026.html")
"""NB 本年历史页(~20+ 条)—— 更早的轮次要来这里才有;两页合并去重后再按日期倒排、截 NB_MAX。"""

DRAWS_NUM_STRIP_RE = re.compile(r"[,\s]")
"""数字里的千分位逗号与空白(int_of 先剥再转)。"""

DRAWS_BC_HEAD_KW = "ita type"
"""BC 表头判词(Entrepreneur/池分布表不取)。"""

DRAWS_AB_HEAD_KW = "draw date"
"""AB 表头判词(线性,无 rowspan)。"""

DRAWS_BC_MIN_COLS = 5
"""BC 一行至少几格才当数据行。"""

DRAWS_AB_MIN_COLS = 4
"""AB 一行至少几格才当数据行。"""

DRAWS_NOTE_CLIP = 160
"""note 截断长度。"""

DRAWS_STREAM_CLIP = 40
"""收尾报数里通道名的截断长度。"""

DRAWS_NOTICE_CLIP = 50
"""收尾报数里通告的截断长度。"""

DRAWS_BC_LABEL = "BC PNP Skills Immigration"
"""BC 抽选块的前端族名。"""

DRAWS_BC_SCALE = "SIRS"
"""BC 的省自评分制名。"""

DRAWS_AB_LABEL = "AAIP"
"""AB 抽选块的前端族名。"""

DRAWS_AB_SCALE = "WEOI"
"""AB 的省自评分制名。"""

DRAWS_MB_LABEL = "MPNP Expression of Interest"
"""MB 抽选块的前端族名。"""

DRAWS_MB_SCALE = "MPNP EOI"
"""MB 的省自评分制名。"""

DRAWS_NL_LABEL = "NLPNP + AIP(ITA 批次)"
"""NL 抽选块的前端族名(scale=None —— 官方只发邀请数不发分数线,前端不得凭空造一条「分数线」列)。"""

DRAWS_NB_LABEL = "NBPNP + AIP"
"""NB 抽选块的前端族名(scale=None —— 按职业类别定向发邀请,官方同样不发分数线)。"""

DRAWS_ON_LABEL = "OINP"
"""ON 抽选块的前端族名。"""

DRAWS_ON_SCALE = "OINP EOI"
"""ON 的省自评分制名(与 BC SIRS / AB WEOI 互不可比,前端必须带标注)。"""

DRAWS_SOURCE = "Provincial nominee program draw results (BC/AB/MB official pages)"
"""表级来源名。"""

MB_SCORE_RE = re.compile(r"score of (?:the )?lowest[\s-]*ranked candidate[^:]*:?\s*(\d{2,4})", re.I)
"""MB 一段里的最低分。"""

MB_LAA_RE = re.compile(r"Letters? of Advice to Apply issued\s*:?\s*([\d,]+)", re.I)
"""MB 一段里发出的 LAA 数。"""

MB_DRAW_DATE_RE = re.compile(r"[A-Z][a-z]+ \d{1,2}, \d{4}")
"""MB 公告正文里的抽选日。"""

MB_DRAW_NO_RE = re.compile(r"Draw\s*#(\d+)", re.I)
"""MB 公告标题里的期号。"""

MB_HEAD_TAGS = ["p", "h2", "h3", "h4"]
"""MB 子标题的候选标签(整段加粗的才算)。"""

MB_BLOCK_TAGS = ["p", "h2", "h3", "h4", "ul"]
"""MB 一期公告里要走一遍的标签(ul 是数据块)。"""

MB_HEAD_MAX_LEN = 100
"""子标题的长度上限(超了就不是标题)。"""

MB_BLOCK_NAME_CLIP = 140
"""数据块名的截断长度。"""

MB_BLOCK_NAME_STRIP = " –"
"""数据块名两端要剥的空格与短横。"""

MB_BLOCK_NAME_TPL = "{heading} – {desc}"
"""同一子标题下第 2 个数据块的命名(用其前面最近的普通段落原句区分,不瞎归并)。"""

MB_DEFAULT_STREAM = "Expression of Interest"
"""MB 没解析到通道名时的兜底。"""

MB_STREAM_TAIL_RE = re.compile(r"(Stream|Pathway)$")
"""老格式回退时的通道名判据。"""

MB_STREAM_MAX_LEN = 60
"""老格式回退时通道名的长度上限。"""

MB_DRAW_NOTE_TPL = "Draw #{num}"
"""MB 抽选行的 note。"""

MB_HEAD_SNIFF_LEN = 300
"""MB 公告开头嗅期号的窗口。"""

ON_ENTRY_RE = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d\d$")
"""ON 老格式:整行日期,标题在下一行。"""

ON_ENTRY_NOYEAR_RE = re.compile(
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+(\d{1,2}):\s*(\S.*)$")
"""ON 新格式:2026-08 起更新页新条目改成「August 4: <标题>」——无年份、日期后直接冒号接标题
(旧条目仍是「June 26, 2026」整行日期 + 下一行标题,两种格式同页混排)。"""

ON_PAGE_YEAR_RE = re.compile(r"\b(20\d\d)\s+Ontario Immigrant Nominee Program Updates", re.I)
"""年份不猜:从页面自报的「2026 Ontario Immigrant Nominee Program Updates」标题锚定,
锚不到就只吃老格式(宁缺勿猜)。"""

ON_INV_RE = re.compile(r"issued\s+([\d,]+)\s+invitations?", re.I)
"""更新条目里的邀请数。"""

ON_SCORE_RE = re.compile(r"(\d{2,3})\s*(?:and above|\+|or higher)", re.I)
"""invitations 页的分数区间下界:分数写成「57 and above」——取那个数当分数线,取不到就留空不猜。"""

ON_TAG_STRIP_RE = re.compile(r"(?:<(script|style|nav|header|footer)[^>]*>[\s\S]*?</\1>)")
"""ON 更新页先剥掉的整块噪音标签。"""

ON_TAG_RE = re.compile(r"<[^>]+>")
"""剩余标签换行分割。"""

ON_LINE_MIN_LEN = 2
"""压平后一行至少多长才算内容行。"""

ON_TITLE_CLIP = 160
"""更新条目标题的截断长度。"""

ON_BLOB_AHEAD_OLD = 4
"""老格式取正文片段的行数(标题行起往后)。"""

ON_BLOB_AHEAD_NEW = 3
"""新格式取正文片段的行数(日期行起往后)。"""

ON_ENTRY_DATE_TPL = "{month} {day}, {year}"
"""新格式拼回完整日期的模板。"""

ON_INV_HEAD_KW = "score range"
"""invitations 页的表头判词(一张表一条通道)。"""

ON_INV_DATE_KW = "date issued"
"""invitations 表的日期列判词。"""

ON_INV_NUM_KW = "number of invitations"
"""invitations 表的邀请数列判词。"""

ON_INV_NOTES_KW = "notes"
"""invitations 表的备注列判词(startswith 比对)。"""

ON_INV_DATE_COL = 0
"""日期列的兜底列号。"""

ON_INV_NUM_COL = 1
"""邀请数列的兜底列号。"""

ON_INV_SCORE_COL = 3
"""分数区间列的兜底列号。"""

ON_INV_HEAD_TAGS = ["h2", "h3", "h4"]
"""通道名 = 表格前面最近的一个标题(官方一张表一条通道)。"""

ON_INV_STREAM_CLIP = 120
"""通道名的截断长度。"""

NL_DRAW_DATE_KW = "date issued"
"""NL 表头判词之一(这张表没有 <th>,表头是首行 <td>)。"""

NL_DRAW_ITA_KW = "ita"
"""NL 表头判词之二。"""

NL_DRAW_STREAM = "NLPNP + AIP (ITA batch)"
"""NL 抽选行的通道名(官方按批次发,不分通道)。"""

NB_ORDINAL_RE = re.compile(r"(\d)(st|nd|rd|th)\b", re.I)
"""NB 日期里的序数词(「May 1st, 2026」)。"""

NB_ORDINAL_SUB = r"\1"
"""序数词去掉后只留数字。"""

NB_RANGE_RE = re.compile(r"^([A-Za-z]+)\s+\d{1,2}\s*(?:to|[–-])\s*(\d{1,2}),\s*(\d{4})$")
"""NB 官方日期常写成区间(「July 16 to 18, 2026」「October 6-7, 2025」)——
**取最后一天**当抽选日(那天邀请才算发出)。"""

NB_RANGE_TPL = "{mon} {day2}, {yr}"
"""区间日期折成单日的模板。"""

NB_DRAW_DATE_KW = "date of draw"
"""NB 表格块的必含行标签。"""

NB_PATHWAYS_KW = "pathways"
"""NB 表格块的通道行标签(可多条,用 <br> 分隔)。"""

NB_OCC_KW = "occupational"
"""NB 职业类别行标签的判词之一。"""

NB_CATEGORIES_KW = "categories"
"""NB 职业类别行标签的判词之二。"""

NB_OCC_ROW_KEY = "occupational categories selected"
"""NB 职业类别行的完整标签。"""

NB_INV_ISSUED_KEY = "invitations issued"
"""NB 邀请数行标签。"""

NB_APP_SELECTED_KEY = "applications selected"
"""NB 邀请数行的另一种标签。"""

NB_LABEL_STRIP = ":"
"""NB 标签行尾要剥的冒号。"""

NB_STREAM_TAIL_RE = re.compile(r"\s+stream$", re.I)
"""通道名尾部的 stream 字样。"""

NB_PROV_PREFIX_RE = re.compile(r"^New Brunswick\s+", re.I)
"""通道名前缀 New Brunswick(整条去掉)。"""

NB_PROV_SHORT_SUB = "NB "
"""pathway 名里的 New Brunswick 缩成 NB。"""

NB_AIP_FULL = "atlantic immigration program"
"""AIP 的官方全名(小写比对)。"""

NB_AIP_SHORT = "AIP"
"""AIP 的短名。"""

NB_DEFAULT_STREAM = "NBPNP"
"""NB 没解析到通道名时的兜底。"""

NB_STREAM_TPL = "{base} ({paths})"
"""NB 通道名 + pathway 清单的拼法。"""

NB_CATEGORIES_TPL = "Categories: {names}"
"""NB 职业类别的 note 拼法。"""

NB_PAGE_CURRENT_LABEL = "当期"
"""NB 两页合并时当期页的报错标签。"""

NB_PAGE_HISTORY_LABEL = "history"
"""NB 两页合并时历史页的报错标签。"""

NB_PAGE_ERR_TPL = "{label} {name} {detail}"
"""NB 单页失败的错误串。"""

NB_NO_DATA = "无数据"
"""NB 两页都失败且没有错误串时的占位。"""

DRAWS_PRINT_FAIL_TPL = "  ✗ {prov} 抓取失败: {name} {detail}(保留旧数据)"
"""单省抓取失败的报数。"""

DRAWS_PRINT_EMPTY_TPL = "  ✗ {prov} 没解析到抽选(保留旧数据)"
"""单省解析空的报数。"""

DRAWS_PRINT_OK_TPL = ("  ✓ {prov:<3} {n:>2} 条  最近 {date} {stream}"
                      "  score={score} inv={inv}")
"""单省收尾报数。"""

DRAWS_PRINT_NB_FAIL_TPL = "  ✗ NB 两页都抓取/解析失败: {errors}(保留旧数据)"
"""NB 两页都失败的报数。"""

DRAWS_PRINT_NB_PARTIAL_TPL = "  ⚠ NB 有一页失败(用另一页结果续跑): {errors}"
"""NB 一页失败的报数。"""

DRAWS_PRINT_NB_OK_TPL = "  ✓ NB  {n:>2} 条  最近 {date} {stream}  score={score} inv={inv}"
"""NB 收尾报数。"""

DRAWS_PRINT_ON_FAIL_TPL = "  ✗ ON 更新页抓取失败: {name} {detail}(保留旧数据)"
"""ON 更新页抓取失败的报数。"""

DRAWS_PRINT_ON_NO_ENTRY = "  ✗ ON 没解析到更新条目(保留旧数据)"
"""ON 更新页解析空的报数。"""

DRAWS_PRINT_ON_INV_FAIL_TPL = "  ✗ ON invitations 页抓取失败: {name} {detail}(保留旧抽选)"
"""ON invitations 页抓取失败的报数(退回旧数据里的 draws,不清空)。"""

DRAWS_PRINT_ON_OK_TPL = "  ✓ ON  {n:>2} 条抽选(其中 {scored} 条带分数线)  最新通告 {date} {note}"
"""ON 收尾报数。"""

DRAWS_PRINT_MERGE_TPL = "  [merge] {prov} 本轮解析 {new} 条,并回历史后 {out} 条"
"""并回历史的报数。
沿革(2026-08-12 实撞):NB 官方页改版,解析从 28 条掉到 23 条,直接覆盖 → mart pnp_draws
146→141,判定层的对照线跟着少。原来只在「抓失败/解析为空」时保旧,解析出更少也照收 ——
而一轮已经发生过的抽选不会消失,少了只能是我们没解析到。官方页通常只挂最近几轮,
所以正确做法是**并回历史**而不是替换。"""

DRAWS_PRINT_DONE_TPL = "✓ {path}  ({n} 条抽选 / {provs} 省)"
"""抽选表收尾报数。"""


# =========================================================================
# 11. NS 官方年度配额(唯一上开放平台的省;Socrata API 免密钥)
# =========================================================================

NS_ALLOC_API = "https://data.novascotia.ca/resource/8rf7-hw2p.json"
"""NS 省开放数据 Socrata API(免密钥,NSNP/AIP 分列,2015 起整条年序列)。"""

NS_ALLOC_PAGE = "https://data.novascotia.ca/Immigration-and-Migration/Annual-Allocations-for-Immigration-Programs/8rf7-hw2p"
"""该数据集的人可读页(表级 source 用它)。"""

OUT_NS_ALLOCATIONS = paths.IRCC / "ns_allocations.json"
"""NS 官方年度配额落盘处。
人工核对表(pnp_allocations.json)的 NS 行以此为源;watch_allocations 哨兵逐轮对账,
对不上就「!」喊人 —— 自动抓的**不直接写**人工表(Frank 抽查制不破)。"""

NS_ALLOC_UA = "offer2pr-ns-alloc/1.0"
"""开放数据平台不需要伪装 —— 自报家门。"""

NS_ALLOC_TIMEOUT_S = 60
"""API 超时。"""

NS_ALLOC_MIN_YEARS = 5
"""NSNP 序列至少几年才算正常。"""

NS_ALLOC_MIN_LATEST_YEAR = 2024
"""NSNP 序列最新年份的下限(低于它视为数据集改版)。"""

NS_ALLOC_PROG_NSNP = "nsnp"
"""项目键:省提名名额。"""

NS_ALLOC_PROG_AIP = "aip"
"""项目键:大西洋移民计划(不并入人工表 NS 行)。"""

K_ALLOC_PROGRAM = "program"
"""Socrata 行键:项目名。"""

K_ALLOC_YEAR = "year"
"""Socrata 行键:年份。"""

K_ALLOC_VALUE = "allocation"
"""Socrata 行键:配额数。"""

NS_ALLOC_NOTE = "NS 省官方开放数据:年度配额,NSNP(=PNP 提名名额)与 AIP 分列。人工表 NS 行以 NSNP 为准,AIP 不并入;哨兵逐轮对账。"
"""配额表的口径说明。"""

NS_ALLOC_BAD_TPL = "NSNP 序列异常(仅 {n} 年,最新 {latest})—— 疑似数据集改版"
"""序列异常的自校错误文案。"""

NS_ALLOC_NO_YEAR = "-"
"""序列为空时 max(default=) 的占位。"""

NS_ALLOC_PRINT_OUT_TPL = "OUT={path}"
"""开工报输出路径(等号形,原样保留)。"""

NS_ALLOC_PRINT_FAIL_TPL = "  ✗ NS 配额抓取失败: {name} {detail}(保留旧表)"
"""抓取失败的报数。"""

NS_ALLOC_PRINT_OK_TPL = "  ✓ NS 配额 {n} 年({first}–{last}) · NSNP {last}={nsnp:,} · AIP {last}={aip:,}"
"""收尾报数。"""

# =========================================================================
# 12. BC 门槛(E13-01:语言 / 最低家庭收入 / 经验 / 雇主侧;指南 PDF)
# =========================================================================

BC_WORKERS_PAGE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/for-workers"
"""BC 打工人侧的人可读官方页(bc-req / bc-sirs 两张表的 pageUrl,原为两份抄本)。"""

BC_GUIDE_SOURCE = "BC PNP Skills Immigration Program Guide"
"""指南名(bc-req / bc-sirs 两张表的 source,原为两份抄本)。"""

OUT_BC_REQ = paths.PNP / "bc-req.json"
"""BC 门槛表落盘处。
三张表各管一件事,别混:
  · pnp_occupations   这个职业**在不在**公开清单(本文件 §3 等)
  · pnp_score_factors 在了之后**能打几分**(§15 BC SIRS / §16 SK 分值)
  · pnp_requirements   打分之前**先要满足什么**(本段)—— 语言、最低家庭收入、经验、雇主侧
来源与 BC SIRS 同一份官方 PDF(网页正文只写「详见指南」)。抓这几条(每条都带官方原文与节号,
报告里每句话都能点回去核对):
  3.4  语言:TEER 2/3/4/5 → 四项均 CLB 4;TEER 0/1 → 注册时不强制交成绩(op='none',不是「没要求」)
  3.10 最低家庭收入:家庭人数 × 居住区域(大温 / BC 其余)二维表,7×2 = 14 行
  4.1(c) 技术工人通道:近十年内 ≥2 年 TEER 0-3 工作经验(24 个月)
  6.7/6.8 **雇主侧**门槛(subject='employer'):在 BC 经营满 1 年;大温 ≥5 名全职雇员、大温外 ≥3 名
         —— 这几项本站没有雇主事实,报告里一律 unknown 说「要雇主出材料」,不猜不编
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。门槛错一位比没有更危险 ——
用户会照着它决定考不考雅思、跳不跳槽。"""

BCR_TIMEOUT_S = 60
"""指南 PDF 抓取超时。"""

BCR_ALL_STREAMS = "BC PNP Skills Immigration (all streams)"
"""Part 3/6 是通用要求,逐条落到每个通道。"""

BCR_SKILLED_WORKER = "BC PNP Skilled Worker stream"
"""4.1 专属通道名。"""

AREA_METRO = "metro-vancouver"
"""区域键:大温哥华地区。"""

AREA_REST_BC = "rest-of-bc"
"""区域键:BC 其余地区。"""

BCR_FURNITURE = [
    re.compile(r"BC PNP Skills Immigration Program Guide"),
    re.compile(r"\d+ \| ?P a g e"),
    re.compile(r"===PAGE \d+==="),
    re.compile(r"The information in the guide is effective [A-Z][a-z]+ \d{1,2}, \d{4}\."
               r" ?Please check our website to ensure you are using the correct version\."),
]
"""页眉页脚(每页重复)先剥掉再把全文压成一行 —— 否则每个句子都被分页切成两半,正则得写成天书。"""

BCR_FOOTER_DATE_RE = re.compile(r"information in the guide is effective ([A-Z][a-z]+ \d{1,2}, \d{4})")
"""生效日期:页脚每页都印,改版时可能只更新了改动页 → 取最新的那个(= 本版生效日)。"""

BCR_LANG_CLB_RE = re.compile(
    r"classified under NOC TEER ([\d, ]*?or \d)[,.]? you must demonstrate English or French language "
    r"proficiency at Canadian Language Benchmark \(CLB\) level (\d)", re.I)
"""3.4 语言:按 TEER 的 CLB 档。"""

BCR_LANG_NONE_RE = re.compile(
    r"Language requirements for occupations classified under NOC TEER ([\d ]*or \d)\b.{0,120}?"
    r"you are not required to submit valid language test results at the time of registration", re.I)
"""3.4 TEER 0/1 的免交条款(「注册时不强制交成绩」≠「没有语言要求」:BC 保留在审批阶段
要成绩的权力,措辞照官方)。"""

BCR_INCOME_RE = re.compile(r"(\d|7 or more) \$([\d,]+) CAD \$([\d,]+) CAD")
"""3.10 最低家庭收入表一行(家庭人数 / 大温 / BC 其余)。"""

BCR_EXP_RE = re.compile(
    r"minimum of (\w+) years of full-time \(or full-time equivalent\) work experience "
    r"in any skilled occupation \(NOC TEER ([\d, ]*or \d)\)", re.I)
"""4.1(c) 技术工人通道的工作经验。"""

BCR_EMP_YEARS_RE = re.compile(r"Your employer must have operated in B\.C\. for at least (\w+) year", re.I)
"""6.7 雇主经营年限。"""

BCR_EMP_STAFF_RE = re.compile(
    r"If your employer is located (within|outside of) the Metro Vancouver Regional District, "
    r"your employer must have at least (\w+) indeterminate, full-time employees", re.I)
"""6.8 雇主雇员数(大温内外各一条)。"""

BCR_INCOME_ROWS = 7
"""官方最低家庭收入表的档数。"""

BCR_EMP_STAFF_ROWS = 2
"""官方雇员数门槛的条数(大温内外各一条)。"""

BCR_INCOME_7PLUS_PREFIX = "7"
"""「7 or more」档的判据前缀。"""

BCR_SECTION_LANG = "3.4"
"""语言门槛的节号。"""

BCR_SECTION_INCOME = "3.10"
"""最低家庭收入的节号。"""

BCR_SECTION_EXP = "4.1(c)"
"""工作经验的节号。"""

BCR_SECTION_EMP_YEARS = "6.7"
"""雇主经营年限的节号。"""

BCR_SECTION_EMP_STAFF = "6.8"
"""雇主雇员数的节号。"""

BCR_METRO_WORDS = "Metro Vancouver Regional District"
"""收入表 label 里的大温措辞。"""

BCR_REST_WORDS = "rest of B.C."
"""收入表 label 里的 BC 其余措辞。"""

BCR_INSIDE_WORD = "inside"
"""雇员数 label 里的大温内措辞。"""

BCR_OUTSIDE_WORD = "outside"
"""雇员数 label 里的大温外措辞。"""

BCR_WITHIN_WORD = "within"
"""官方原文里「大温内」的词(区域归属判据)。"""

PLURAL_S = "s"
"""英文复数尾巴(BC 雇主经营年限 label 用)。"""

BCR_LANG_LABEL_TPL = "CLB {clb} in each of the four competencies (NOC TEER {band})"
"""3.4 语言档的 label。"""

BCR_LANG_NONE_LABEL_TPL = ("No language test required at registration (NOC TEER {band}); "
                           "the BC PNP may still request results during assessment")
"""3.4 免交条款的 label。"""

BCR_INCOME_LABEL_TPL = "Minimum family income {size} person(s), {where}: ${val} CAD"
"""3.10 最低家庭收入的 label。"""

BCR_EXP_LABEL_TPL = ("{word} years of full-time skilled work experience "
                     "(NOC TEER {band}) within the last ten years")
"""4.1(c) 工作经验的 label。"""

BCR_EMP_YEARS_LABEL_TPL = "Employer must have operated in B.C. for at least {word} year{plural}"
"""6.7 雇主经营年限的 label。"""

BCR_EMP_STAFF_LABEL_TPL = ("Employer must have at least {word} indeterminate, full-time employees in B.C. "
                           "({where} Metro Vancouver)")
"""6.8 雇主雇员数的 label。"""

BCR_UNIT_CAD_YR = "CAD/yr"
"""收入门槛的单位。"""

BCR_PROBLEM_LANG = "3.4 语言门槛没解析到"
"""自校问题:语言档。"""

BCR_PROBLEM_LANG_NONE = "3.4 TEER 0/1 的免交条款没解析到"
"""自校问题:免交条款。"""

BCR_PROBLEM_INCOME_TPL = "3.10 最低家庭收入表解析到 {n} 档(官方 7 档)"
"""自校问题:收入表档数。"""

BCR_PROBLEM_INCOME_ORDER = "3.10 收入表不是随家庭人数递增(列错位)"
"""自校问题:收入表不递增。"""

BCR_PROBLEM_INCOME_SWAP = "3.10 大温某档不高于 BC 其余(两列读反了)"
"""自校问题:两列读反。"""

BCR_PROBLEM_EXP = "4.1(c) 工作经验门槛没解析到"
"""自校问题:工作经验。"""

BCR_PROBLEM_EMP_YEARS = "6.7 雇主经营年限没解析到"
"""自校问题:雇主经营年限。"""

BCR_PROBLEM_EMP_STAFF_TPL = "6.8 雇员数门槛解析到 {n} 条(官方大温内外各一条)"
"""自校问题:雇员数条数。"""

PROBLEM_NO_EFFECTIVE = "没解析到指南生效日期"
"""自校问题:生效日期(BC 门槛与 BC SIRS 共用同一句)。"""

BCR_PRINT_DONE_TPL = "✓ {path}  指南生效 {eff},共 {n} 条门槛"
"""BC 门槛收尾报数。"""

BCR_FACTOR_ORDER = ("language", "income", "experience", "empYears", "empStaff")
"""收尾按因素报条数的顺序。"""


# =========================================================================
# 13. ON 门槛(E13-02:申请人语言/工资/经验 + 雇主侧年限/营业额/雇员数)
# =========================================================================

ON_WORKFORCE_URL = "https://www.ontario.ca/page/ontario-workforce-priority-stream"
"""Ontario Workforce Priority 通道页(on-req 与 on-points 两段共用,原为两份抄本)。
ontario.ca 直连 200,不需要浏览器。"""

ONR_EMPLOYER_URL = "https://www.ontario.ca/page/oinp-employer-job-offer-streams-employer-guide"
"""OINP 雇主指南页(雇主侧:经营年限 / 营业额 / 全职雇员数 + 工资档)。"""

OUT_ON_REQ = paths.PNP / "on-req.json"
"""ON 门槛表落盘处。规则引擎第二刀,**雇主侧是重点**(Frank 2026-07-31:「现在 OINP 对雇主
也有要求了」)。抓这几条(每条带官方原文与出处页):
  申请人  language      TEER 0-3 非技工 CLB 6;TEER 0-3 技工 CLB 5(NOC 大组白名单);TEER 4/5 CLB 4
          languageExempt 近 3 年安省院校指定学历可免考(本站没问学历 → 报告里只陈述,不判定)
          wage          basis=occMedian:不低于该职业该地区的**中位工资档**(官方按 Job Bank 工资报告)
          experience    TEER 0-3 两档并行(官方 bullet 用「or」并列,任一满足即可,不是叠加):
                        一般 6 个月 / 安省应届毕业生(近 3 年、2 年制以上文凭)3 个月 —— 都是**同雇主
                        同岗位**在职时长,不是本站问的「同职业总经验」,故 basis='employerTenure'
                        (照 MB SWM 的先例)。官方还有第三档「近 5 年内同 NOC 累计 2 年」
                        (不绑同雇主同岗位,C5b-0 范围外未抓,不收录 = 不假装它不存在)。
  雇主    empYears      在营 ≥3 年
          empRevenue    GTA $1,000,000 / 指定普查区 $500,000 / 其余 $250,000(后者按近两个财年)
          empStaff      GTA ≥5 名、GTA 外 ≥3 名(须为公民/PR,周 30 小时以上)
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。"""

ONR_TIMEOUT_S = 40
"""ON 两页抓取超时。"""

ONR_STREAM = "Ontario Workforce Priority stream"
"""通道名。"""

AREA_GTA = "gta"
"""区域键:多伦多市 + Durham/Halton/Peel/York。"""

AREA_ON_LISTED = "on-listed-cd"
"""区域键:官方点名的普查区(Ottawa/Waterloo/Hamilton…)。"""

AREA_ON_OTHER = "on-other"
"""区域键:其余任何地点。"""

AREA_OUTSIDE_GTA = "outside-gta"
"""区域键:雇员数那条只分 GTA 内外两档。"""

ONR_TEER_03 = "0,1,2,3"
"""ON 的 appliesTeer 写法(**字符串**,不是列表 —— 本省 base 的空档是空串)。"""

ONR_TEER_45 = "4,5"
"""TEER 4/5 档。"""

ONR_EMP_YEARS_RE = re.compile(r"in active business for at least (\w+) years", re.I)
"""雇主经营年限。"""

ONR_REV_GTA_RE = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue if the employee will work or "
                            r"report to work at a location in the Greater Toronto Area", re.I)
"""雇主营业额:GTA 档。"""

ONR_REV_LISTED_RE = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue if the employee will work or "
                               r"report to work at a location in the following census divisions", re.I)
"""雇主营业额:指定普查区档。"""

ONR_REV_OTHER_RE = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue in the last two most recently "
                              r"completed fiscal years", re.I)
"""雇主营业额:其余地点档(按近两个财年)。"""

ONR_STAFF_RE = re.compile(r"report to work at a location (in|outside) the GTA ?, your business must have at least "
                          r"(\d+) full-time employees who are Canadian citizens or permanent residents", re.I)
"""雇主雇员数(GTA 内外各一档)。"""

ONR_LANG_GENERAL_RE = re.compile(r"CLB level (\d) or higher in all four proficiencies, if your job offer employment "
                                 r"position is not a NOC occupation listed as a skilled trade", re.I)
"""语言:TEER 0-3 非技工。"""

ONR_LANG_TRADES_RE = re.compile(r"CLB level (\d) or higher in all four proficiencies, if your job offer employment "
                                r"position is a NOC occupation listed as a skilled trade", re.I)
"""语言:TEER 0-3 技工(低一档)。"""

ONR_LANG_45_RE = re.compile(r"TEER category 4 or 5 employment position, you must have a CLB level (\d) or higher", re.I)
"""语言:TEER 4/5。"""

ONR_LANG_EXEMPT_RE = re.compile(r"proof that you graduated from an eligible Ontario institution within the last "
                                r"(\d) years", re.I)
"""语言免考条款(本站没问学历 → 只陈述不判定)。"""

ONR_WAGE_RE = re.compile(r"must meet or exceed the wage level assigned to the specific region of Ontario where the "
                         r"employee will be working and be at or above either: the median wage level", re.I)
"""工资档(设计 §2 的 basis=occMedian —— 阈值不是绝对数,而是该职业该地区的中位)。"""

ONR_EXP_BASE_RE = re.compile(r"At least (\w+) months? of consecutive, paid full-time work experience in the job "
                             r"offer employment position, within the (\w+) months? before the date you made your "
                             r"application", re.I)
"""工作经验:一般 6 个月。"""

ONR_EXP_GRAD_RE = re.compile(r"If you are a recent Ontario graduate, at least (\w+) months? of consecutive, paid "
                             r"full-time work experience in the job offer employment position within the (\w+) "
                             r"months? before the date you made your application", re.I)
"""工作经验:安省应届毕业生 3 个月。"""

ONR_TRADE_LINE_RE = re.compile(r"(?:Major|Minor|Unit) Group (\d{2,5})\s*[-–—]\s*(.*?)(?=(?:Major|Minor|Unit) Group |$)", re.I)
"""技工白名单:官方逐条列「Major/Minor/Unit Group NN」。"""

ONR_TRADE_EXCL_RE = re.compile(r"excluding[^)]*?Group (\d{3,5})", re.I)
"""个别条目自带「excluding … Sub-Major Group NNN」。"""

ONR_TRADES_BLOCK_RE = re.compile(
    r"Skilled Trades occupations The following NOCs qualify as a listed skilled trades occupation:"
    r"(.*?)Job offer for a TEER category 4 or 5", re.I)
"""技工白名单所在段(官方列的是 NOC 大组前缀 72/73/82/83/93/6320/62200,含两处「excluding …」)。"""

ONR_SECTION_LANG = "Applicant requirements — Language"
"""语言的出处节名。"""

ONR_SECTION_LANG_TRADES = "Applicant requirements — Language (skilled trades)"
"""技工语言的出处节名。"""

ONR_SECTION_WAGE = "Employer guide — Position is at the required wage level"
"""工资档的出处节名。"""

ONR_SECTION_EXP = "Applicant requirements — Work experience"
"""工作经验的出处节名。"""

ONR_SECTION_EMP_GENERAL = "Employer guide — General requirements"
"""雇主经营年限的出处节名。"""

ONR_SECTION_EMP_REVENUE = "Employer guide — Revenue requirement"
"""雇主营业额的出处节名。"""

ONR_SECTION_EMP_STAFF = "Employer guide — Full-time employee requirements"
"""雇主雇员数的出处节名。"""

ONR_LANG_GENERAL_LABEL_TPL = "CLB {clb} in all four proficiencies (TEER 0-3, non-trades occupations)"
"""语言(非技工)的 label。"""

ONR_LANG_45_LABEL_TPL = "CLB {clb} in all four proficiencies (TEER 4 or 5)"
"""语言(TEER 4/5)的 label。"""

ONR_LANG_TRADES_LABEL_TPL = ("CLB {clb} in all four proficiencies (TEER 0-3, listed skilled trades: "
                             "NOC groups {groups}{excl})")
"""语言(技工低档)的 label。"""

ONR_LANG_TRADES_EXCL_TPL = "; excluding {excl}"
"""技工白名单里的 excluding 片段(没有就空)。"""

ONR_LANG_EXEMPT_LABEL_TPL = ("No language test required if you graduated from an eligible Ontario institution "
                             "within the last {years} years (2-year+ postsecondary credential, Ontario "
                             "College Graduate Certificate, Master's or PhD)")
"""语言免考条款的 label。"""

ONR_WAGE_LABEL = ("The offered wage must meet or exceed the median wage level for the occupation in "
                  "the Ontario employment region (low wage level allowed for recent Ontario graduates "
                  "in TEER 0-3)")
"""工资档的 label。"""

ONR_EMP_YEARS_LABEL_TPL = "Business must have been in active business for at least {word} years"
"""雇主经营年限的 label。"""

ONR_EMP_REVENUE_LABEL_TPL = "Gross annual revenue of at least ${val} where the employee works: {where}"
"""雇主营业额的 label。"""

ONR_EMP_STAFF_LABEL_TPL = ("At least {n} full-time employees who are Canadian citizens or permanent residents "
                           "at the work location ({where} the GTA)")
"""雇主雇员数的 label。"""

ONR_REV_GTA_WHERE = "Greater Toronto Area (Toronto, Durham, Halton, Peel, York)"
"""营业额 label 里的 GTA 措辞。"""

ONR_REV_LISTED_WHERE = ("listed census divisions (Ottawa, Waterloo, Hamilton, Simcoe, Middlesex, "
                        "Niagara, Peterborough, Hastings, Thunder Bay and others named in the guide)")
"""营业额 label 里的指定普查区措辞。"""

ONR_REV_OTHER_WHERE = "any other location in Ontario (last two completed fiscal years)"
"""营业额 label 里的其余地点措辞。"""

ONR_STAFF_IN_WORD = "in"
"""官方原文里「GTA 内」的词。"""

ONR_BASIS_OCC_MEDIAN = "occMedian"
"""工资档的口径隔离标记。"""

ONR_BASIS_EMPLOYER_TENURE = "employerTenure"
"""在职时长的口径隔离标记(rules.ts 认它,只摆门槛不判定)。"""

ONR_COND_RECENT_GRAD = "recent-on-graduate"
"""安省应届毕业生的条件行标记。"""

ONR_PROBLEM_LANG_GENERAL = "语言(TEER 0-3 非技工)没解析到"
"""自校问题:语言(非技工)。"""

ONR_PROBLEM_LANG_45 = "语言(TEER 4/5)没解析到"
"""自校问题:语言(TEER 4/5)。"""

ONR_PROBLEM_LANG_TRADES = "语言(技工低档 / NOC 大组白名单)没解析到"
"""自校问题:技工语言。"""

ONR_PROBLEM_LANG_EXEMPT = "语言免考条款没解析到"
"""自校问题:免考条款。"""

ONR_PROBLEM_WAGE = "工资档(median wage level)没解析到"
"""自校问题:工资档。"""

ONR_PROBLEM_EXP_BASE = "工作经验(一般 6 个月)没解析到"
"""自校问题:一般经验。"""

ONR_PROBLEM_EXP_GRAD = "工作经验(安省应届毕业生 3 个月)没解析到"
"""自校问题:应届毕业生经验。"""

ONR_PROBLEM_EMP_YEARS = "雇主经营年限没解析到"
"""自校问题:雇主经营年限(ON 档措辞)。"""

ONR_PROBLEM_REV_TPL = "雇主营业额档没解析到:{area}"
"""自校问题:某个营业额档。"""

ONR_PROBLEM_STAFF_TPL = "雇主雇员数解析到 {n} 档(官方 GTA 内外各一档)"
"""自校问题:雇员数档数。"""

ONR_PROBLEM_REV_ORDER_TPL = "雇主营业额三档不是递减:{rv}"
"""自校问题:营业额三档必须 GTA > 指定普查区 > 其余。"""

ONR_PROBLEM_STAFF_ORDER_TPL = "雇主雇员数两档读反了:{sv}"
"""自校问题:雇员数 GTA > 外(读反了会把门槛说低)。"""

ONR_SOURCE = "OINP — Ontario Workforce Priority stream & employer guide"
"""表级来源名。"""

ONR_PRINT_DONE_TPL = "✓ {path}  共 {n} 条门槛"
"""ON 门槛收尾报数(其余六省门槛表同形,单一来源)。"""

ONR_FACTOR_ORDER = ("language", "languageExempt", "wage", "experience", "empYears", "empRevenue", "empStaff")
"""收尾按因素报条数的顺序。"""

ONR_REV_ROWS = 3
"""营业额档数(用于递减自校)。"""

ONR_STAFF_ROWS = 2
"""雇员数档数(用于读反自校)。"""

# =========================================================================
# 14. ON EOI 分值表(E12-09 第三个省;官方页印全了 scoring factors)
# =========================================================================

ONP_OINP_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp"
"""OINP 总览页(表级 pageUrl)。"""

OUT_ON_POINTS = paths.PNP / "on-points.json"
"""ON EOI 分值表落盘处。
**为什么现在能做了**(E12-09 当初的结论已过期,记档免得下次又照旧说法办事):
2026-07-27 逐省实核时 ON 是「改制后 EOI 未开、官方不公布分值表」→ 当时只能选 SK。
2026-07-31 复核:新 Workforce Priority 通道页已经把**全套 scoring factors 印在页面上**
(TEER 档 / 职业大类 / 时薪 / 安省经验 / 报税收入 / 在加身份 / 学历 / 加拿大学历数 /
语言 / 二语 / 地区),而且 invitations 页逐轮公布 **Score range**(如「57 and above」)——
自算分能对上一条真实的官方线,这正是 E12-09 选省的唯一标准。
**官方没有印的两样,一样都不许编**:
  · 总分上限:页面不写 → maxTotal 留空(前端就不显示「/xxx」,不拿各项相加冒充官方总分);
  · 申请门槛:ON 没有 SK 那种「至少 60 分才能申请」→ passMark 留空,对照锚点用真实抽选线。
安省经验那节官方有**两套阶梯**(在 job offer 岗位上的月数;不足 6 个月时改看在安省的总月数)——
本段只收第一套(在岗月数),第二套是替代口径,两套相加会凭空多算 12 分。
自校是硬闸:11 个因素少一个、或某个因素的档位分数不是递减 → 保留旧表 exit 1。"""

ONP_SECTIONS = [
    ("teerCat", re.compile(r"NOC TEER category\b", re.I), "employment"),
    ("occCat", re.compile(r"NOC broad occupational category\b", re.I), "employment"),
    ("wage", re.compile(r"\bHourly wage\b", re.I), "employment"),
    ("onExp", re.compile(r"Ontario work experience Job offer applicants", re.I), "employment"),
    ("earnings", re.compile(r"Canadian work experience: earnings history", re.I), "employment"),
    ("status", re.compile(r"Legal status in Canada", re.I), "employment"),
    ("education", re.compile(r"Highest level of education", re.I), "education"),
    ("canEdu", re.compile(r"Number of Canadian education credentials", re.I), "education"),
    ("language", re.compile(r"Official language ability", re.I), "language"),
    ("language2", re.compile(r"Knowledge of official languages", re.I), "language"),
    ("area", re.compile(r"Regional immigration: location of work location", re.I), "region"),
]
"""官方小节标题 → 本站因素键 + 分组。
键名尽量复用站内已有的(education / language / language2 / wage / area),显示层的 ps.f.* 文案
直接沿用;ON 独有的四个(teerCat/occCat/onExp/earnings/status/canEdu)另加文案键。
分组照官方页的四个大标题:Employment / Education / Language / Regionalization。"""

ONP_POINTS_RE = re.compile(r"—\s+(\d{1,2}) points?\b")
"""档位行 = 「标签 — N points」。"""

ONP_SENTENCE_RE = re.compile(r"(?<=[.:])\s+")
"""句子边界 = 句号/冒号后面跟空格。
标签**不能**用「除句号外的任意字符」去截:官方的时薪档写着「$35 to $39.99 per hour」,
句号在数字里;而档位之间又夹着整段解释文字。所以改成:先定位每个「— N points」,
标签取它前面那段文字里**最后一个句子**($39.99 里的句号后面没有空格,不会被切开)。"""

ONP_EXP_ALT_RE = re.compile(r"If the applicant has less than 6 months work experience", re.I)
"""安省经验第二套阶梯的引子(「不足 6 个月时改看在安省的总月数」)——从这里开始的行不收。"""

ONP_CLEAN_STRIP = " .,–—"
"""档位标签两端要剥的空白与标点(官方把 NOC、TEER、EOI 做成了链接,拍平后会粘在标签前后)。"""

ONP_CLEAN_HEAD_RE = re.compile(r"^(?:and|or|the|a)\s+", re.I)
"""行首残留的连接词。"""

ONP_SCORING_ANCHOR = "Scoring factors"
"""分值段的起锚。"""

ONP_EXP_KEY = "onExp"
"""要截掉第二套阶梯的那个因素键。"""

ONP_POINTS_SANE_MAX = 20
"""单档分值的合理上限(超了说明节的边界串了)。"""

ONP_SYSTEM = "OINP EOI points (Ontario Workforce Priority stream)"
"""分制名带上通道名:ON 已公布的抽选线全是**改制前那几条已关停通道**的 EOI 分,与本表
(新 Workforce Priority 通道)不是同一套分制 —— 显示层按括号里的通道名过滤,对不上就不给线
(与「线按通道设」红线同族)。"""

ONP_SOURCE = "OINP — Ontario Workforce Priority stream, scoring factors"
"""表级来源名。"""

ONP_PRINT_NO_SECTION = "✗ 没找到 Scoring factors 段(保留旧表不覆盖)"
"""分值段找不到的报数。"""

ONP_PROBLEM_EMPTY_TPL = "{key}: 一档都没解析到"
"""自校问题:某因素一档都没有。"""

ONP_PROBLEM_MISSING_PREFIX = "缺因素:"
"""自校问题:缺因素的抬头。"""

ONP_PROBLEM_ORDER_TPL = "{key}: 档位分数不是递减 {pts}(节的边界串了)"
"""自校问题:档位不递减。"""

ONP_PROBLEM_BIG_TPL = "{key}: 出现异常大的分值 {pts}"
"""自校问题:分值异常大。"""

ONP_PRINT_DONE_TPL = "✓ {path}  {n} 个因素,各项上限合计 {total} 分(官方不公布总分)"
"""ON 分值表收尾报数。"""

ONP_PRINT_FACTOR_TPL = "  {key:12} 组{group:11} {rows} 档  最高 {max_n}"
"""逐因素报数。"""


# =========================================================================
# 15. BC SIRS 分值表(200 分制;指南 PDF 逐表取 + 逐节自校)
# =========================================================================

OUT_BC_SIRS = paths.PNP / "bc-sirs.json"
"""BC SIRS 分值表落盘处。
**为什么读 PDF**:官网正文只写「how points are awarded 请见 Skills Immigration Program Guide」,
分数细则全在那份 PDF 里(实核 2026-07-27:welcomebc 旧的 SIRS 网页已 404,细则改挂 PDF)。
用 pymupdf 的 find_tables 逐表取(已是本仓依赖,不新增);解析后**逐节自校**——
每节「最高可得」必须等于官方写的 Max,不过就**保留旧表不覆盖**:分数表错一位比没有更危险。
产出:
  guideEffective  指南页脚的生效日期(官方改版就会变,是过期检测的锚)
  factors         work / education / language / wage / area 五节,各含 rows + bonus + max
  wage 存规则不存穷举:官方是 $16 起每整元 1 分($20.00-20.99 = 5),即 floor(时薪) − 15,≥$70 封顶 55"""

SIRS_WORK_ROW_RE = re.compile(r"^(5 or more years|At least \d but less than \d years|Less than 1 year|No experience)$", re.I)
"""work 节的档位行判据。"""

SIRS_EDU_ROW_RE = re.compile(r"^(Doctoral|Master|Post-Graduate|Bachelor|Associate|Post-secondary Diploma|Secondary School)", re.I)
"""education 节的档位行判据。"""

SIRS_LANG_ROW_RE = re.compile(r"^(9\+|[4-8]|Below 4.*)$", re.I)
"""language 节的档位行判据。"""

SIRS_AREA_ROW_RE = re.compile(r"^Area [123]:", re.I)
"""area 节的档位行判据。"""

SIRS_SKIP_ROW_RE = re.compile(r"^(Maximum Score Available|Additional points|Education|Points|Canadian Language Benchmark|Area of employment)", re.I)
"""表头/汇总行(不进数据)。"""

SIRS_INT_CELL_RE = re.compile(r"\d{1,3}")
"""一格里的纯数字(fullmatch 比对)。"""

SIRS_ADDITIONAL_RE = re.compile(r"^Additional points", re.I)
"""加分区的起点。"""

SIRS_XOR_TAIL_RE = re.compile(r",\s*or$")
"""官方用「…, or」表示**二选一**(如「在 BC 读完 8 分, or 在加拿大其它省 6 分」)——
标成 xor,自校与前端算分都按「取其一」处理,否则会把 46 分当成 40 分的上限。"""

SIRS_DESIGNATION_RE = re.compile(r"professional designation", re.I)
"""挂适用范围的那一行加分(不另起一张表:它是**这一行的适用范围**,不是一张独立的职业清单)。"""

SIRS_EFFECTIVE_RE = re.compile(r"information in the guide is effective ([A-Z][a-z]+ \d{1,2}, \d{4})")
"""前言页的生效日。"""

SIRS_PREFACE_PAGE = 3
"""生效日期取**前言页**(doc[3]),不取表格页的页脚:这份 PDF 内部就不一致 ——
2026-08-11 实核全文,前面 24 处写 June 10 2026、后面 38 处还留着 May 28 2026(改版没重排的旧页)。
前言那句是文档自己声明的版本号,后面的旧页脚是残留。别再为这个日期重查一遍。"""

SIRS_DESIG_ANCHOR = "Eligible Professional Designations"
"""执业资格对照表所在页的判词(第 55 页)。
为什么要它:SIRS 学历那 5 分的原文是 "Eligible professional designation in B.C.",
单看这一行像是泛指任何专业资格,**实则只对表内这 11 类职业成立** —— 原文写明
"you have been offered a job in an occupation listed on the table below"。
不落库的话,前端只能把这一条摆给所有人看(干软件的也被问),既多一次点击又误导。"""

SIRS_DESIG_MIN = 10
"""执业资格对照表的最少条数(官方 11 条)。"""

SIRS_ANY_TRADE_RE = re.compile(r"^any trade", re.I)
"""对照表里没有 NOC 码的那类(任何技工工种)。"""

SIRS_HEAD_NOC_RE = re.compile(r":\s*NOC\s*\d{5}")
"""第一格里带 NOC 码 = 新起一条。"""

SIRS_HEAD_TRIM_RE = re.compile(r":?\s*NOC\s*\d{5}\s*$")
"""职业名尾部的 NOC 码。"""

SIRS_NOC_RE = re.compile(r"NOC\s*(\d{5})")
"""行内的 NOC 码。"""

SIRS_NOC_CELL_RE = re.compile(r"(NOC\s*)?\d{5}")
"""只有 NOC 码的那一格(fullmatch 比对,不当机构文字)。"""

SIRS_HEAD_STRIP_COLON = ": "
"""职业名两端要剥的冒号与空格。"""

SIRS_COLON = ":"
"""第一格以冒号结尾 = 新起一条。"""

SIRS_OCC_HEAD_WORD = "occupation"
"""对照表表头行的判词(startswith 比对)。"""

SIRS_SECTION_WORK = "work"
"""分节键:工作经验。"""

SIRS_SECTION_EDUCATION = "education"
"""分节键:学历。"""

SIRS_SECTION_LANGUAGE = "language"
"""分节键:语言。"""

SIRS_SECTION_AREA = "area"
"""分节键:就业地区。"""

SIRS_SECTION_WAGE = "wage"
"""分节键:时薪(存规则不存穷举)。"""

SIRS_SECTION_ORDER = ("work", "education", "language", "area")
"""四个从 PDF 表格里解析的分节(wage 是规则,不在其中)。"""

SIRS_LANG_HEAD_KW = "canadian language benchmark"
"""language 节的表头判词。"""

SIRS_EDU_HEAD_KW = "education"
"""education 节的表头判词(startswith)。"""

SIRS_EDU_HEAD_KW2 = "education points"
"""education 节的表头判词(包含)。"""

SIRS_AREA_HEAD_KW = "area of employment"
"""area 节的表头判词。"""

SIRS_WORK_MAX = 40
"""work 节官方 Max。"""

SIRS_EDU_MAX = 40
"""education 节官方 Max。"""

SIRS_LANG_MAX = 40
"""language 节官方 Max。"""

SIRS_AREA_MAX = 25
"""area 节官方 Max。"""

SIRS_WAGE_MAX = 55
"""wage 节官方 Max。"""

SIRS_WAGE_RULE = "floor(hourlyCAD) - 15"
"""wage 的算法(官方是 $16 起每整元 1 分)。"""

SIRS_WAGE_FLOOR = 16
"""wage 起算时薪。"""

SIRS_WAGE_CAP = 70
"""wage 封顶时薪。"""

SIRS_SYSTEM = "SIRS"
"""分制名。"""

SIRS_MAX_TOTAL = 200
"""官方总分制。"""

SIRS_PROBLEM_DESIG_TPL = "执业资格对照表只解析到 {n} 条(官方 11 条)"
"""自校问题:对照表条数。"""

SIRS_PROBLEM_EMPTY_TPL = "{key}: 一行都没解析到"
"""自校问题:某节一行都没有。"""

SIRS_PROBLEM_MAX_TPL = "{key}: 最高 {best} ≠ 官方 Max {official}(rows={rows} bonus={bonus})"
"""自校问题:某节最高可得对不上官方 Max。"""

SIRS_PRINT_DONE_TPL = "✓ {path}  指南生效 {eff}"
"""BC SIRS 收尾报数。"""

SIRS_PRINT_SECTION_TPL = "  {key:10} {rows} 档 + {bonus} 项加分"
"""逐节报数。"""

SIRS_PRINT_DESIG_TPL = "  执业资格对照表 {n} 条(NOC {with_noc} + 任何技工工种)"
"""对照表报数。"""


# =========================================================================
# 16. SK 分值表(SINP Points Grid,110 分制,60 分申请门槛)
# =========================================================================

SKP_PAGE_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                "saskatchewan-immigrant-nominee-program/assess-your-eligibility")
"""SINP 打分表页(官方 Points Grid 全表在 HTML 里)。"""

SKP_SINP_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
                "saskatchewan-immigrant-nominee-program")
"""SINP 总览页(表级 pageUrl)。"""

OUT_SK_POINTS = paths.PNP / "sk-points.json"
"""SK 分值表落盘处。
**为什么选 SK 作第二个省**(2026-07-27 逐个实核,记档免得下次重走):
  · ON:改制后 EOI 系统官方称今夏开放、**尚未开**,没有分值表也没有分数线(立项文档已写死
    不许拿旧通道分数线充数);
  · AB:alberta.ca 全站 AAIP 页面**不公布 EOI 分值表**(只公布每次抽选的分数),自算无从算起;
  · MB:官网有 100 分制**申请评估表**,但抽选公布的是 1000 分制的 EOI「Ranking score」,
    两套分制不是一回事,官网也没公布 1000 分制的构成 —— 拿 100 分去对 825 的线是错的对照,弃;
  · SK:官方 Points Grid 全表在 HTML 里(110 分),而且**EOI 排名用的就是这张表**(官方原话:
    「the criteria for the EOI point score in the SINP point assessment grid」),另有官方硬门槛
    **≥60 分才能申请** —— 自算分能对上一条真实的官方线,选它。
  · SK 官方目前**不公布逐次抽选分数线**(站内 pnp_draws 里 SK 本来就是空)→ 对照锚点用 60 分门槛,
    不编分数线。
自校是硬闸:分节最高可得必须等于官方自己印在表里的「MAXIMUM POINTS FOR FACTOR I/II」与
「MAXIMUM POINTS TOTAL」,不过就**保留旧表不覆盖** —— 分数表错一位比没有更危险。
产出:
  passMark   官方申请门槛(60)——SK 没有抽选线,这是唯一的官方对照锚
  groupMax   {"I": 80, "II": 30} 官方分组上限;组内各因素相加封顶到这个数
  factors    education/work5/work610/language1/language2/age(组 I)+ offer/connection(组 II)
             组 II 两块按官方是**按子类二选一**(Employment Offer 一块、In-Demand/Express Entry 一块),
             靠 groupMax=30 封顶,任何组合都不会超过官方上限"""

SKP_TIMEOUT_S = 40
"""分值表页抓取超时。"""

SKP_SECTIONS = [
    (re.compile(r"^FACTOR I\b", re.I), ("group", "I")),
    (re.compile(r"^FACTOR II\b", re.I), ("group", "II")),
    (re.compile(r"^EDUCATION AND TRAINING", re.I), ("factor", "education")),
    (re.compile(r"^a\)\s*Work experience", re.I), ("factor", "work5")),
    (re.compile(r"^b\)\s*In the 6-10 years", re.I), ("factor", "work610")),
    (re.compile(r"^a\)\s*First Language", re.I), ("factor", "language1")),
    (re.compile(r"^b\)\s*Second Language", re.I), ("factor", "language2")),
    (re.compile(r"^AGE\b", re.I), ("factor", "age")),
    (re.compile(r"^The following points are for the Employment Offer", re.I), ("factor", "offer")),
    (re.compile(r"^The following points are for the Occupation In-Demand", re.I), ("factor", "connection")),
    (re.compile(r"^(SKILLED WORK EXPERIENCE|LANGUAGE ABILITY)", re.I), ("factor", "")),
]
"""官方小节标题 → 本站因素键。顺序即匹配顺序,一行命中就切换当前因素。
「a)」「b)」两个子块在官方是**相加**的(工作经验近 5 年 + 6-10 年;首考语言 + 二语),
所以各自成一个因素。最后一条只作分节切换、本身不带档位
(SKILLED WORK EXPERIENCE / LANGUAGE ABILITY 下面还有 a)b))。"""

SKP_KIND_GROUP = "group"
"""SECTIONS 命中类型:切换分组。"""

SKP_MAX_ROW_RE = re.compile(r"^MAXIMUM POINTS (?:FOR )?(?:FACTOR )?(I{1,2}|TOTAL)", re.I)
"""官方自己印的 MAXIMUM 行:I / II / TOTAL。"""

SKP_INT_CELL_RE = re.compile(r"\d{1,3}")
"""分值格(fullmatch 比对)。"""

SKP_PASS_RE = re.compile(r"at least (\d{2}) points to apply", re.I)
"""官方申请门槛句。"""

SKP_TABLE_ANCHOR = "FACTOR I"
"""认表:含这句的那张表就是 Points Grid。"""

SKP_ADDITIVE = {"connection"}
"""connection 三条按官方可同时主张(20+5+5=30,正好等于组上限)→ 存成 bonus(前端多选);
其余因素都是「档位里挑一条」→ 存成 row(前端单选)。"""

SKP_GROUP_I = "I"
"""分组键:FACTOR I。"""

SKP_GROUP_II = "II"
"""分组键:FACTOR II。"""

SKP_TOTAL_KEY = "TOTAL"
"""官方 MAXIMUM 行的总分键。"""

SKP_SYSTEM = "SINP Points Grid"
"""分制名。"""

SKP_SOURCE = "SINP International Skilled Worker Points Grid"
"""表级来源名。"""

SKP_PROBLEM_NO_PASS = "没解析到官方申请门槛(「at least NN points to apply」)"
"""自校问题:申请门槛。"""

SKP_PROBLEM_NO_GROUP_TPL = "没解析到官方 MAXIMUM POINTS FOR FACTOR {g}"
"""自校问题:分组上限。"""

SKP_PROBLEM_NO_TOTAL = "没解析到官方 MAXIMUM POINTS TOTAL"
"""自校问题:总分上限。"""

SKP_PROBLEM_GROUP_I_TPL = "FACTOR I 最高 {best} ≠ 官方 {official}({detail})"
"""自校问题:组 I 相加对不上。"""

SKP_PROBLEM_GROUP_II_TPL = "FACTOR II 最高 {best} ≠ 官方 {official}({detail})"
"""自校问题:组 II 取最大对不上。"""

SKP_PROBLEM_SUM_TPL = "官方 I({i}) + II({ii}) ≠ 官方 TOTAL {total}"
"""自校问题:官方自己的三个数对不上。"""

SKP_PROBLEM_EMPTY_TPL = "{key}: 一行都没解析到"
"""自校问题:某因素一行都没有。"""

SKP_DETAIL_TPL = "{key}={max_n}"
"""组内逐因素的明细片段。"""

SKP_PRINT_DONE_TPL = "✓ {path}  {total} 分制,申请门槛 {pass_mark}"
"""SK 分值表收尾报数。"""

SKP_PRINT_FACTOR_TPL = "  {key:12} 组{group:2} {rows} 档 + {bonus} 项加分  最高 {max_n}"
"""逐因素报数。"""

# =========================================================================
# 17. AB 门槛(AAIP AOS:语言按 TEER + 33102 单档、经验两「或」款、雇主侧三条)
# =========================================================================

ABR_EMPLOYER_URL = "https://www.alberta.ca/job-offer-and-employer-requirements"
"""B2(2026-08-08):雇主侧门槛的官方页 —— AOS eligibility 页正文里点名「must meet all Alberta
job offer and employer requirements」链到的页,alberta.ca 直连 200,不在 data/crawl/ab-aaip 缓存里
(种子只爬了 AAIP 命名空间下的页,这条不在种子深度内),按铁律③(缓存没有→可 httpx 直取省官网)现抓。"""

OUT_AB_REQ = paths.PNP / "ab-req.json"
"""AB 门槛表落盘处。来源与 §2 AB 清单同一个官方页。抓这几条:
  语言  TEER 0-3 → CLB 5;TEER 4/5 → CLB 4;**NOC 33102(护理助理)单独 CLB 7**
        —— 33102 那条走 appliesNoc,引擎按「最具体的那行胜出」自动盖过通用档(同 ON 技工低档的机制)
  经验  24 个月(近 30 个月内,加拿大境内外都算)
**经验两条「或」款各落一行(#320,2026-08-15)**:通用行 24 个月(近 30 个月,境内外都算);
替代行 12 个月(近 18 个月,**只算阿省境内**)挂 `appliesCondition='ab-local-experience'` ——
引擎侧条件成立(阿省经验 ≥12 个月)才拿 12 行判,判不了条件就回落 24 行,不会把门槛说低
(照 MB SWM `grad-other-province` 的既有条件行机制)。两行同一句官方原文、同一出处。
**没抓的**:学历(高中及以上,与本站题库口径对不上)、最低收入(AOS 官方**不设**家庭收入门槛 ——
全国只有 BC 发布了收入表,别省一律没有,这本身是结论,不是缺口)。
**雇主侧(B2 补,2026-08-08)**:上面那句「AOS 不设经营年限/营业额/雇员数」是错的 —— 之前只读了
Eligibility 页(申请人侧),没读它链接指向的 `Job offer and employer requirements` 页:
官方原句「have been in continuous and active operation in Alberta for a minimum of 2 complete
fiscal years」「have a minimum total gross annual revenue of $400,000 for the most recent fiscal
year」「employment of a minimum of 3 full-time (or full-time equivalent) employees in Alberta」——
三个数全 province-wide、不分区(不同于 BC/ON 按大温/GTA 内外分档)。
官方还给了「够不上 400k/3 人时按经营年限算配额上限(2 年→1 个提名、3 年→2 个……)」和「公共部门
雇主免营业额/雇员数要求」两条豁免/换算规则,**不落成阈值行**:前者是名额换算不是资格线,后者是
公共部门整体不进这套判定(设计 §1 已单独处理),硬塞成 empRevenue/empStaff 的一行会被规则引擎当
成「这也是道数值门槛」误读。
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。门槛错一位比没有更危险。"""

ABR_TIMEOUT_S = 45
"""AB 两页抓取超时。"""

ABR_LANG_TIER_RE = re.compile(
    r"If you are working in a NOC ([\d, ]*or \d) occupation Minimum of (\d) for each English language skill", re.I)
"""官方原句(压成一行之后):「If you are working in a NOC 0, 1, 2 or 3 occupation Minimum of 5
for each English language skill」。"""

ABR_LANG_NOC_RE = re.compile(
    r"under NOC code (\d{5}) \(([^)]+)\), the AAIP requires a minimum language test score of CLB of (\d)", re.I)
"""「under NOC code 33102 (nurse aides…), the AAIP requires a minimum language test score of CLB of 7」。"""

ABR_EXP_ANY_RE = re.compile(
    r"a minimum of (\d+) months of full-time work experience in your current occupation in Canada or abroad "
    r"within the last (\d+) months", re.I)
"""「a minimum of 24 months of full-time work experience in your current occupation in Canada or abroad
within the last 30 months」。"""

ABR_EXP_AB_RE = re.compile(
    r"a minimum of (\d+) months full-time work experience in your current occupation in Alberta "
    r"within the last (\d+) months", re.I)
"""境内那条只用来写进 label(不作阈值),但解析不到说明页面改版了 → 同样进自校。"""

ABR_EMP_YEARS_RE = re.compile(
    r"have been in continuous and active operation in Alberta for a minimum of (\d+) complete fiscal years", re.I)
"""雇主经营年限。"""

ABR_EMP_REVENUE_RE = re.compile(
    r"have a minimum total gross annual revenue of \$([\d,]+) for the most recent fiscal year", re.I)
"""雇主营业额。"""

ABR_EMP_STAFF_RE = re.compile(
    r"employment of a minimum of (\d+) full-time \(or full-time equivalent\) employees in Alberta", re.I)
"""雇主全职雇员数。"""

ABR_LANG_TIERS = 2
"""官方语言档数(TEER 0-3 / TEER 4-5 各一条)。"""

ABR_EMP_STREAM = "AAIP (job offer & employer requirements, all streams)"
"""雇主侧三条的通道名。"""

ABR_COND_LOCAL = "ab-local-experience"
"""阿省境内经验替代行的条件标记。"""

ABR_BASIS_WINDOW_TPL = "windowMonths={n}"
"""替代行把窗口期写进 basis。"""

ABR_SECTION_LANG_TABLE = "Language requirements — Table 2"
"""语言两档的出处节名。"""

ABR_SECTION_LANG = "Language requirements"
"""33102 单档的出处节名。"""

ABR_SECTION_EXP = "Work experience requirements"
"""经验两行的出处节名。"""

ABR_SECTION_EMPLOYER = "Job offer and employer requirements — Employer requirements"
"""雇主侧三条的出处节名。"""

ABR_LANG_TIER_LABEL_TPL = ("CLB {clb} in each English (or NCLC {clb} in each French) language skill "
                           "for occupations in NOC TEER {band}")
"""语言两档的 label。"""

ABR_LANG_NOC_LABEL_TPL = ("CLB {clb} in each English (or NCLC {clb} in each French) language "
                          "skill for NOC {noc} ({name})")
"""33102 单档的 label。"""

ABR_EXP_LABEL_TPL = ("{months} months of full-time work experience in your current occupation "
                     "in Canada or abroad within the last {window} months "
                     "(alternatively {ab_months} months in Alberta within the last {ab_window} months)")
"""经验两行共用的 label(官方是同一句里的两个「或」款 → label 同句)。"""

ABR_EMP_YEARS_LABEL_TPL = ("The Alberta employer must have been in continuous and active operation in Alberta "
                           "for a minimum of {years} complete fiscal years (the year used for tax or "
                           "accounting purposes) prior to application submission")
"""雇主经营年限的 label。"""

ABR_EMP_REVENUE_LABEL_TPL = ("The Alberta employer must have a minimum total gross annual revenue of "
                             "${val} for the most recent fiscal year (the year used for tax or "
                             "accounting purposes)")
"""雇主营业额的 label。"""

ABR_EMP_STAFF_LABEL_TPL = ("Employment of a minimum of {n} full-time (or full-time equivalent) "
                           "employees in Alberta (independent contractors do not count; two part-time employees "
                           "may count as one full-time equivalent at an average of 30+ hours/week combined). "
                           "If an employer cannot meet the revenue and staff minimums, it may still qualify but "
                           "is capped on the number of nominees it can support based on years of operation "
                           "(2 years → 1 nominee, 3 years → 2 nominees, +1 per additional year); Indigenous, "
                           "municipal, provincial, Government of Canada and Government of Alberta employers are "
                           "exempt from the revenue and staff minimums")
"""雇主雇员数的 label(把两条豁免/换算规则写进措辞,但**不落成阈值行**)。"""

ABR_PROBLEM_LANG_TIERS_TPL = "语言两档解析到 {n} 条(官方 TEER 0-3 / TEER 4-5 各一条)"
"""自校问题:语言档数。"""

ABR_PROBLEM_LANG_ORDER_TPL = "语言两档读反了(TEER 0-3 {hi} 应高于 TEER 4/5 {lo})"
"""自校问题:语言两档读反。"""

ABR_PROBLEM_LANG_NOC = "33102 的单独语言档没解析到"
"""自校问题:33102 单档。"""

ABR_PROBLEM_EXP = "工作经验门槛没解析到(境内外 24 个月 / 阿省 12 个月两条须同时在)"
"""自校问题:经验两行。"""

ABR_PROBLEM_EMPLOYER_TPL = "雇主侧「{what}」没解析到(job-offer-and-employer-requirements 页可能改版)"
"""自校问题:雇主侧某一条。"""

ABR_WHAT_EMP_YEARS = "经营年限"
"""雇主侧自校的中文项名:经营年限。"""

ABR_WHAT_EMP_REVENUE = "营业额"
"""雇主侧自校的中文项名:营业额。"""

ABR_WHAT_EMP_STAFF = "全职雇员数"
"""雇主侧自校的中文项名:全职雇员数。"""

ABR_SOURCE = "AAIP — Alberta Opportunity Stream eligibility"
"""表级来源名。"""

ABR_FACTOR_ORDER = ("language", "experience", "empYears", "empRevenue", "empStaff")
"""收尾按因素报条数的顺序。"""


# =========================================================================
# 18. SK 门槛(SINP 主线两页交叉核对 + 雇主注册闸门)
# =========================================================================

SKR_EO_URL = SK_BASE_URL + "international-skilled-worker-with-employment-offer"
"""有 offer 的那条主线。"""

SKR_OID_URL = SK_BASE_URL + "international-skilled-worker-occupations-in-demand"
"""无 offer 的那条主线(EE 子类条件同 OID)。"""

SKR_EMPLOYER_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/hire-a-foreign-worker/"
                    "recruit-and-hire-workers-with-sinp/apply-for-a-certificate-of-registration")
"""B2:雇主侧 —— 全体 SINP 雇主注册闸门。不在 data/crawl/sk-sinp 缓存里(种子只爬了
`live-in-saskatchewan/…/saskatchewan-immigrant-nominee-program` 这条居民侧路径,雇主侧在
`hire-a-foreign-worker` 命名空间下,种子没覆盖,按铁律③ httpx 现抓)。"""

OUT_SK_REQ = paths.PNP / "sk-req.json"
"""SK 门槛表落盘处。
**两个官方页各抓一遍再交叉核对**:两页都写「CLB 4」「近 10 年内至少 1 年本职业工作经验」——
**两页对不上就判解析出错**,不取其中一页了事:同一制度两处口径不一致,只可能是我们读错了
或官方在改版。抓这几条:
  语言  CLB 4(不分 TEER —— SK 主线本身只收 TEER 0-3,TEER 门槛由排除清单那侧承担)
  经验  12 个月(近 10 年内、本职业、全职)——口径正是本站问的「同职业总经验(境内外)」
**没抓的**:
  · 60/110 入池分(那是分值表的事,已在 §16;门槛表里再放一条没人消费)
  · 结算资金(SK 官方不发自己的表,直接指向 IRCC 的 proof-of-funds 联邦表 → 不是省门槛)
  · 最低家庭收入(SK **不设** —— 全国只有 BC 发布了收入表;这是结论不是缺口)
  · 学历/ECA(题库口径对不上,同 ON 门槛的处理)
**雇主侧只收经营年限一条**:「actively operate the business as the employer for no less than 24
consecutive months in Saskatchewan」。**不收雇员数/营业额** —— 官方对这两项**没有通用数值门槛**,
只写了定性的「financial capacity to hire and support the international worker's full-time employment」;
真正带数字的只有两条**条件性**分支:① 经营不满 24 个月申请豁免,门槛是「≥5 名全职雇员 + 年营收
≥$500,000」;② 住宿业(NAICS 72)/货运业(NAICS 484)续证时按雇员规模分五档营收下限(如住宿业
0-5 人档 $250,000、101+ 人档 $7,500,000+)。这两条只对**特定情形/特定行业**成立,不是「SK 雇主
通用门槛」—— 硬塞成 empStaff/empRevenue 通用行,会被规则引擎当成全体 SK 雇主都要达标的数,比不说
更危险(同「门槛错一位比没有更危险」的红线)。
自校是硬闸:任何一组没解析到、或两页对不上就**保留旧表不覆盖**并 exit 1。"""

SKR_TIMEOUT_S = 45
"""SK 三页抓取超时。"""

SKR_STREAM = "SINP International Skilled Worker (Employment Offer / Occupations In-Demand / Express Entry)"
"""申请人侧的通道名。"""

SKR_EMP_STREAM = "SINP — Employer Certificate of Registration (all streams)"
"""雇主侧的通道名。"""

SKR_LANG_RE = re.compile(r"language score of at least (?:\d+ ?[–—-] ?)?Canadian Language Benchmark \(CLB\) (\d)", re.I)
"""「Have a language score of at least Canadian Language Benchmark (CLB) 4」(EO 页)
「Have a language score of at least 4 – Canadian Language Benchmark (CLB) 4」(OID 页,多一个数字)。"""

SKR_EXP_EO_RE = re.compile(r"at least (\w+)[- ]year work experience in the past (\d+) years", re.I)
"""「Have at least one-year work experience in the past 10 years」(EO 页)。"""

SKR_EXP_OID_RE = re.compile(r"minimum of (\w+) year of full-time \(minimum (\d+) hours per week\) paid work experience "
                            r"in a skilled occupation over the past (\d+) years", re.I)
"""「a minimum of one year of full-time (minimum 30 hours per week) paid work experience … over the past 10 years」(OID 页)。"""

SKR_EMP_YEARS_RE = re.compile(
    r"actively operate the business as the employer for no less than (\d+) consecutive months in Saskatchewan", re.I)
"""雇主侧:Apply for a Certificate of Registration 页,Qualification and Application Requirements 段。"""

SKR_SECTION_LANG = "Eligibility — Language"
"""语言的出处节名。"""

SKR_SECTION_EXP = "Eligibility — Work experience"
"""经验的出处节名。"""

SKR_SECTION_EMPLOYER = "Apply for a Certificate of Registration — Qualification and Application Requirements"
"""雇主侧的出处节名。"""

SKR_LANG_LABEL_TPL = ("Canadian Language Benchmark (CLB) {clb} or higher; employers and "
                      "regulatory bodies may require higher scores")
"""语言的 label。"""

SKR_EXP_LABEL_TPL = ("{word} year of full-time (at least {hours} hours per week) paid "
                     "work experience in your intended occupation within the past {window} years")
"""经验的 label。"""

SKR_EMP_LABEL_TPL = ("[Employer] actively operate the business as the employer for no less than "
                     "{months} consecutive months in Saskatchewan; must also provide evidence of "
                     "financial capacity to hire and support the international worker's full-time "
                     "employment for the duration of the employment contract (no published numeric "
                     "staff/revenue bar for this general requirement — see script docstring for the two "
                     "conditional, non-general numeric paths: the <24-month exemption and the hospitality/"
                     "truck-transport renewal revenue tiers)")
"""雇主侧的 label。"""

MARK_OK = "✓"
"""两页交叉核对里「这页有」的记号。"""

MARK_BAD = "✗"
"""两页交叉核对里「这页没有」的记号。"""

SKR_PROBLEM_LANG_TPL = "语言门槛没解析到(EO {eo} / OID {oid})"
"""自校问题:语言没解析到(标出是哪页缺)。"""

SKR_PROBLEM_LANG_DIFF_TPL = "两页语言门槛对不上:EO CLB {eo} vs OID CLB {oid}"
"""自校问题:两页语言对不上。"""

SKR_PROBLEM_EXP_TPL = "工作经验门槛没解析到(EO {eo} / OID {oid})"
"""自校问题:经验没解析到。"""

SKR_PROBLEM_EXP_WORD_TPL = "经验年数不是已知词:EO '{eo}' / OID '{oid}'"
"""自校问题:经验数词认不出。"""

SKR_PROBLEM_EXP_DIFF_TPL = ("两页经验门槛对不上:EO {eo_years} 年/近 {eo_window} 年 "
                            "vs OID {oid_years} 年/近 {oid_window} 年")
"""自校问题:两页经验对不上。"""

SKR_PROBLEM_EMPLOYER = "雇主侧经营年限没解析到(apply-for-a-certificate-of-registration 页可能改版)"
"""自校问题:雇主侧经营年限。"""

SKR_SOURCE = "SINP — International Skilled Worker (Employment Offer & Occupations In-Demand)"
"""表级来源名。"""

SKR_FACTOR_ORDER = ("language", "experience", "empYears")
"""收尾按因素报条数的顺序(NS/PE 门槛同序,各自单列免得改一处动三省)。"""


# =========================================================================
# 19. MB 门槛(逐职业 Minimum CLB + SWO 下限 + SWM 在职时长 + EDI 雇主年限)
# =========================================================================

MBR_SWO_URL = "https://immigratemanitoba.com/mpnp/skilled-worker/swo/eligibility/"
"""Skilled Worker Overseas 资格页(TEER 4/5 的**硬性**语言下限 CLB 4,不分职业)。"""

MBR_SWM_URL = "https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility"
"""Skilled Worker in Manitoba 资格页(SWM 在职时长两档 + 不计入时段)。"""

MBR_EDI_URL = "https://immigratemanitoba.com/employer-services/edi/"
"""B2-4(2026-08-03):雇主侧 —— MB 雇主招外籍走 Employer Direct Initiative(EDI;TRRP 同文):
「owned and actively operated the business for at least three consecutive years」。
MPNP SWM 主线本身不设雇主年限数字(SWM 的 6 个月是申请人在职时长),EDI 是雇主端的申请通道。"""

OUT_MB_REQ = paths.PNP / "mb-req.json"
"""MB 门槛表落盘处。曼省这份最值钱的地方:**语言门槛是逐职业发布的**。
两个官方源:
  · In-Demand Occupations List  每个在需职业一行,**自带 Minimum CLB 一列** —— 这一列
    §6 的清单步只取了 NOC 与职业名,把它丢了。它正是「这个职业在曼省要几分语言」的官方答案,
    对「中介推我去曼省」这类问题是直接可用的一句话,所以在这里逐职业收进门槛表。
  · Skilled Worker Overseas 资格页  TEER 4/5 的**硬性**语言下限 CLB 4(不分职业)
引擎按「appliesNoc 最具体的那行胜出」挑行(同 ON 技工低档的机制):
命中在需清单 → 用该职业那一档;没命中 → 落到 TEER 4/5 的 CLB 4(TEER 0-3 则一行都不出)。
**SWM 在职时长**(2026-08-04 补,推翻本段原来那句「不抓」):
  MPNP 确实没有「通用 N 年同职业经验」这道门槛,但 SWM 的**在职时长**是一道硬资格线,
  而且是「外省毕业生怎么走曼省」这个真问题的临门一脚 —— 原来只写在注释里,
  等于库里查不到、报告说不出、用户以为没有。现在按官方原句逐条收进 pnp_requirements:
    · 一般情形:与该雇主连续全职 **6 个月**;
    · **在加拿大其他省/地区读的书**:与该雇主连续全职 **1 年**(appliesCondition='grad-other-province');
    · 不计入的时段(自雇 / 无授权工作 / 全日制在读期间的 co-op 工作)另存一行。
  🔴 口径隔离靠 `basis='employerTenure'`:量的是「在**这家**雇主干了多久」,不是本站问的
  同职业总经验。规则引擎认这个 basis,**只摆门槛不判定**(拿海外 5 年去判「6 个月达标」
  是假话,判 fail 也是假话 —— 本站根本没问过在职时长)。
**仍没抓的**:
  · SWO 的经验只进分值表(不满 1 年 = 0 分),不是资格线
  · 60/100 入池分(分值表的事,B4-4)
  · 结算资金 / 最低家庭收入(MB **不设**收入表 —— 全国只有 BC 发布了;这是结论不是缺口)
自校是硬闸:两个源任一没解析到、或逐职业条数异常就**保留旧表不覆盖**并 exit 1。"""

MBR_TIMEOUT_S = 45
"""MB 各页抓取超时。"""

MBR_IDOL_STREAM = "MPNP In-Demand Occupations List"
"""逐职业 CLB 行的通道名(与 §6 MB_BUCKETS["main"]["stream"] 同字面,分属两张表故各写一份)。"""

MBR_SWO_STREAM = "MPNP Skilled Worker Overseas"
"""SWO 语言下限那行的通道名。"""

MBR_SWM_STREAM = "MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM) Pathway"
"""SWM 在职时长那几行的通道名。"""

MBR_SWM_GRAD_STREAM_TPL = "{stream} (graduated in another Canadian province/territory)"
"""外省毕业生条件行的通道名。"""

MBR_SWM_SECTION = "Eligibility — Skilled Worker in Manitoba: ongoing Manitoba employment"
"""SWM 那几行的出处节名。"""

MBR_EDI_STREAM = "MPNP Employer Direct Initiative (EDI)"
"""EDI 雇主年限那行的通道名。"""

MBR_EDI_SECTION = "EDI — employer eligibility"
"""EDI 的出处节名。"""

MBR_IDOL_SECTION = "In-Demand Occupations List — Minimum CLB"
"""逐职业 CLB 行的出处节名。"""

MBR_SWO_SECTION = "Skilled Worker Overseas — Factor 1: Language Proficiency"
"""SWO 的出处节名。"""

MBR_MIN_OCC = 100
"""在需清单实见 150+ 行;低于此数视为改版/解析异常。"""

MBR_IDOL_ROW_RE = re.compile(r"^\|\s*(\d{5})\s*\|\s*(\d)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|")
"""IDOL 表行:| NOC | TEER | 职业名 | 最低 CLB | 2016 对应 | 2016 技能等级 |。"""

MBR_SWO_FLOOR_RE = re.compile(r"occupation is classified at TEER ([\d ]*or \d).{0,140}?"
                              r"have at least CLB/NCLC (\d)", re.I)
"""「Applicants whose occupation is classified at TEER 4 or 5 … must … have at least CLB/NCLC 4」。"""

MBR_EDI_YEARS_RE = re.compile(r"owned and actively operated the business for at least (\w+) consecutive years", re.I)
"""EDI:「owned and actively operated the business for at least three consecutive years」(B2-4)。"""

MBR_SWM_BASE_RE = re.compile(
    r"(Ongoing Manitoba employment means that you possess a valid work permit and\s*"
    r"a Manitoba company has offered you a full-time, long-term job after you have completed "
    r"(\w+) months? or more of continuous full-time employment with that company)", re.I)
"""SWM 一般情形(整句捕获 = label 就是官方原文)。"""

MBR_SWM_GRAD_RE = re.compile(
    r"(if you graduated from a post-secondary program in another Canadian province/territory, "
    r"a Manitoba company has offered you a full-time, long-term job after you have completed "
    r"at least (\w+) years? or more of continuous full-time employment with that company)", re.I)
"""SWM 外省毕业生(官方用「年」→ 统一折成月,单位口径一张表只留一种)。"""

MBR_SWM_EXCL_RE = re.compile(
    r"(Any periods of self-employment, unauthorized work, or periods of employment during which "
    r"you were engaged in full-time study.{0,80}?will not be included when calculating the period "
    r"of qualifying work experience in Manitoba\.)", re.I)
"""不计入的时段(自雇 / 无授权工作 / 全日制在读期间的 co-op)——「1 年」怎么算全看这一句。"""

MBR_MONTHS_PER_MONTH = 1
"""官方写「月」时的折算倍数。"""

MBR_MONTHS_PER_YEAR = 12
"""官方写「年」时的折算倍数。"""

MBR_COND_GRAD = "grad-other-province"
"""外省毕业生的条件行标记。"""

MBR_BASIS_TENURE = "employerTenure"
"""在职时长的口径隔离标记。"""

MBR_IDOL_LABEL_TPL = ("The MPNP In-Demand Occupations List sets a minimum CLB {clb} for NOC {noc} "
                      "({title}, TEER {teer})")
"""逐职业 CLB 行的 label。"""

MBR_SWO_LABEL_TPL = ("Applicants whose occupation is classified at NOC TEER {band} must have at "
                     "least CLB/NCLC {clb} to be eligible to apply")
"""SWO 语言下限的 label。"""

MBR_EDI_LABEL_TPL = ("Employer must have owned and actively operated the business for at least "
                     "{word} consecutive years immediately prior to applying (TRRP: same bar)")
"""EDI 雇主年限的 label。"""

MBR_PROBLEM_TENURE_WORD_TPL = "SWM 在职时长的数词认不出:{word!r}"
"""自校问题:SWM 数词。"""

MBR_PROBLEM_SWM_BASE = "SWM 一般情形的在职时长(六个月)没解析到"
"""自校问题:SWM 一般情形。"""

MBR_PROBLEM_SWM_GRAD = "SWM 外省毕业生的在职时长(一年)没解析到"
"""自校问题:SWM 外省毕业生。"""

MBR_PROBLEM_SWM_EXCL = "SWM 不计入时段那一句(self-employment / co-op)没解析到"
"""自校问题:SWM 不计入时段。"""

MBR_PROBLEM_SWO = "SWO 的 TEER 4/5 语言下限没解析到"
"""自校问题:SWO 下限。"""

MBR_PROBLEM_IDOL_TPL = "在需清单只解析到 {n} 个职业(<{min_n},疑似改版)"
"""自校问题:在需清单条数。"""

MBR_PROBLEM_EDI = "EDI 雇主经营年限没解析到(employer-services/edi 页可能改版)"
"""自校问题:EDI 年限。"""

MBR_PROBLEM_EDI_WORD_TPL = "EDI 年限词认不出:{word!r}"
"""自校问题:EDI 数词。"""

MBR_SOURCE = "MPNP — Skilled Worker in Manitoba eligibility & In-Demand Occupations List & Skilled Worker Overseas eligibility"
"""表级来源名。"""

MBR_PRINT_DONE_TPL = "✓ {path}  共 {n} 条门槛(逐职业 {occ} 个 + TEER 4/5 下限 1 条 + SWM {swm} 条 + EDI)"
"""MB 门槛收尾报数。"""

MBR_PRINT_CONFLICT_TPL = "  ⚠ {n} 个职业在两张清单里的 Minimum CLB 不一致,已取高档(请人工抽查)"
"""同一职业在主清单/乡镇清单给了不同档 → 取高的(说高了只会让人多考一次,说低了会让他以为
够了),并计数上报,便于人工复核。"""

MBR_PRINT_SWM_ONLY_TPL = "✓ {path}(只更新 SWM {swm} 条;其余 {kept} 条原样保留)"
"""只重算 SWM 时的收尾报数。"""

MBR_PRINT_SWM_ROW_TPL = "    {factor:<20} {op} {value} {unit}  cond={cond}"
"""只重算 SWM 时的逐行报数。"""

MBR_DASH = "-"
"""逐行报数里 cond 为空时的占位。"""

# =========================================================================
# 20. NS 门槛(NSNP Skilled Worker;指南 PDF 链接从通道页现取)
# =========================================================================

OUT_NS_REQ = paths.PNP / "ns-req.json"
"""NS 门槛表落盘处。
**PDF 链接不写死**:官方把指南放在带月份的目录下(…/2026-02/Guide-NSNP-Skilled-Worker-English.pdf),
写死等于下次改版就抓到旧版。改从通道页现取「Application Guide」那个链接,再下 PDF ——
同 §4 SK 从产品 API 现取 format id 的手法。
抓这几条(每条带官方原文与节名):
  语言    TEER 0-3 → CLB 5;TEER 4/5 → CLB 4(官方明示适用于 Skilled Worker / Critical Construction
          Worker / Occupations in Demand 三个 category)
  经验    近 5 年内 12 个整月且 ≥1,560 小时,须与所获 offer 相关的**带薪**工作
  雇主侧  在新斯科舍经营满 2 年(subject='employer';本站没有雇主事实,报告里只作雇主线索用)
**没抓的**:
  · 年龄 21-55(题库没问年龄区间口径,且引擎没有 age 因素 —— 收了没人消费,见 §E「算好了没人用」)
  · 结算资金 / LICO:NS 官方**不发自己的表**,直接指向 IRCC 的 settlement funds 与联邦 LICO Table 1。
    那是联邦口径不是省门槛,且报告的 income 判定要和「该职业该省中位年薪」比 —— 拿家庭 LICO 去比
    个人职业中位是两个不可比的数(08-02 已因此撤过一次并排展示)。留白比硬凑强。
  · TEER 4/5 的「与 NS 雇主 6 个月带薪经验」:口径是**在职时长**,与本站问的同职业总经验对不上。
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。"""

NSR_TIMEOUT_S = 45
"""通道页抓取超时。"""

NSR_PDF_TIMEOUT_S = 60
"""指南 PDF 抓取超时。"""

NSR_STREAM = "Nova Scotia Nominee Program — Skilled Worker stream"
"""通道名。"""

NSR_HOST = "https://liveinnovascotia.com"
"""相对链接的主机名前缀。"""

NSR_PDF_SUFFIX = ".pdf"
"""指南链接的后缀判据。"""

NSR_PDF_KW_STREAM = "skilled-worker"
"""指南链接的判词之一。"""

NSR_PDF_KW_LANG = "english"
"""指南链接的判词之二。"""

NSR_PDF_KW_SKIP = "change"
"""指南链接的排除词(变更说明不是指南本体)。"""

NSR_HTTP_PREFIX = "http"
"""绝对链接判据。"""

NSR_FURNITURE_RE = re.compile(r"\d+ Skilled Worker Nova Scotia Nominee Program \([A-Z][a-z]+ \d{4}\)")
"""页眉页脚(每页重复,会把句子切两半)先剥掉,再让正则跑在压成一行的全文上。"""

NSR_EFFECTIVE_RE = re.compile(r"Nova Scotia Nominee Program \(([A-Z][a-z]+ \d{4})\)")
"""指南版本(页脚)。"""

NSR_LANG_HI_RE = re.compile(
    r"For Skilled Worker \(A\), Critical Construction Worker \(B\), and Occupations in Demand \(D\) Categories "
    r"NOC TEER ([\d, ]*and \d) If your first language is NOT English or French.{0,260}?"
    r"Canadian Language Benchmarks \(CLB\) Level (\d) or higher", re.I)
"""语言:TEER 0-3。"""

NSR_LANG_LO_RE = re.compile(
    r"NOC TEER (\d and \d) You must submit the results of one of these language tests.{0,600}?"
    r"at least the CLB level (\d) criteria", re.I)
"""语言:TEER 4/5。"""

NSR_EXP_RE = re.compile(
    r"You have worked (\d+) complete calendar months within the last (\d+) years "
    r"and a minimum of ([\d,]+) hours", re.I)
"""工作经验。"""

NSR_EMP_YEARS_RE = re.compile(r"The employer must have operated in Nova Scotia for at least (\d+) years", re.I)
"""雇主经营年限。"""

NSR_SECTION_LANG_HI = "Language — NOC TEER 0, 1, 2 and 3"
"""语言(TEER 0-3)的出处节名。"""

NSR_SECTION_LANG_LO = "Language — NOC TEER 4 and 5"
"""语言(TEER 4/5)的出处节名。"""

NSR_SECTION_EXP = "Skilled Workers — work experience"
"""经验的出处节名。"""

NSR_SECTION_EMPLOYER = "Core Requirements — employer"
"""雇主侧的出处节名。"""

NSR_LANG_HI_LABEL_TPL = ("Canadian Language Benchmarks (CLB) or NCLC Level {clb} or higher for jobs "
                         "in NOC TEER {band} (Skilled Worker, Critical Construction Worker and "
                         "Occupations in Demand categories)")
"""语言(TEER 0-3)的 label。"""

NSR_LANG_LO_LABEL_TPL = ("An approved language test showing at least CLB/NCLC {clb} is mandatory for "
                         "jobs in NOC TEER {band}, issued within two years of the NSNP submission")
"""语言(TEER 4/5)的 label。"""

NSR_EXP_LABEL_TPL = ("{months} complete calendar months of paid work within the last {years} years "
                     "and a minimum of {hours} hours, related to the job being offered "
                     "(volunteer work and unpaid internships do not count)")
"""经验的 label。"""

NSR_EMP_LABEL_TPL = "The employer must have operated in Nova Scotia for at least {years} years"
"""雇主经营年限的 label。"""

NSR_PRINT_NO_GUIDE = "  ✗ 通道页上没找到 Skilled Worker 申请指南 PDF(改版?保留旧表,请人工复核)"
"""指南链接找不到的报数。"""

NSR_PRINT_GUIDE_TPL = "  指南: {url}"
"""现取到的指南地址。"""

NSR_PROBLEM_LANG_HI = "语言(TEER 0-3)没解析到"
"""自校问题:语言(TEER 0-3)。"""

NSR_PROBLEM_LANG_LO = "语言(TEER 4/5)没解析到"
"""自校问题:语言(TEER 4/5)。"""

NSR_PROBLEM_LANG_ORDER_TPL = "语言两档读反了(TEER 0-3 {hi} 应高于 TEER 4/5 {lo})"
"""自校问题:语言两档读反。"""

PROBLEM_EXP_MISSING = "工作经验门槛没解析到"
"""自校问题:经验(NS 与 BC 同句,单一来源)。"""

PROBLEM_EMP_YEARS_MISSING = "雇主经营年限没解析到"
"""自校问题:雇主经营年限(NS 与 BC 同句,单一来源)。"""

NSR_PROBLEM_NO_VERSION = "没解析到指南版本(页脚 Nova Scotia Nominee Program (月份 年份))"
"""自校问题:指南版本。"""

NSR_SOURCE = "Nova Scotia Nominee Program — Skilled Worker Application Guide"
"""表级来源名。"""

NSR_PRINT_DONE_TPL = "✓ {path}  指南版本 {version},共 {n} 条门槛"
"""NS/PE 门槛收尾报数(两处同形)。"""

NSR_FACTOR_ORDER = ("language", "experience", "empYears")
"""收尾按因素报条数的顺序。"""


# =========================================================================
# 21. NB 门槛(三份 pathway 指南 PDF 互校)
# =========================================================================

NBR_PAGE_URL = ("https://www.gnb.ca/en/topic/family-home-community/immigration/"
                "provincial-nominee-program/skilled-worker-stream.html")
"""NB 技术工人通道页(三份指南 PDF 挂在这里)。
2026-08-12 换址:老地址 www2.gnb.ca/.../nb-skilled-worker-stream.html 现在 302 到新站的
**PNP 总览页**,而三份指南 PDF 挂在总览页下面的技术工人通道页上 —— 于是 guide_urls() 一份都找不到,
自校 exit 1、NB 门槛表就此冻结(同 AIP 名录换版那次的静默失败,只是这次它是「保留旧表」而不是覆盖)。"""

OUT_NB_REQ = paths.PNP / "nb-req.json"
"""NB 门槛表落盘处。
**PDF 链接从通道页现取**(同 §20 的理由:官方随时换文件名)。NB Skilled Worker 下有三条
并列 pathway,各一份指南:New Brunswick Experience / Graduates / Priority Occupations。
抓这几条:
  语言  CLB/NCLC 4(听说读写四项)—— **三份指南必须都写这个数**,对不上就判解析出错。
        三条 pathway 语言口径一致,所以可以作为「NB 的语言门槛」不分 TEER 地陈述。
  经验(C5b-0,2026-08-05 补;只补 Experience 一条 pathway,理由见下)
        与**该支持雇主**连续全职 6 个月(basis='employerTenure',照 MB SWM 先例 ——
        rules.ts 已有专门的口径隔离分支:这类行**只摆门槛不判定**,不会被拿去跟「同职业总经验」
        比大小,2026-08-04 那次「口径隔离」修的正是这个坑,现在补 NB 这一条是安全的)。
        residence(NB 居住满 6 个月)形状上一起补 —— 引擎目前没有 residence 分支消费它,
        但 pnp_requirements 是通用行形状,数据层先落上不等未来的引擎功能;不算「硬塞」。
**仍然没抓 —— 经验的另外两条 pathway**:
  · Graduates:不设经验门槛(尚未确认官方是否有 op='none' 式明文条款,留后续核实)
  · Priority Occupations:1 年带薪相关经验,但只对**省政府境外招聘团**发出的 offer 生效 ——
    这条的适用范围本站题库判不出(不是「你干了几年」能问出来的),继续不收录。
  三条 pathway 分属不同 stream 字符串,Experience 这条门槛只挂在它自己的 stream 上,
  不会被挑到走 Graduates/Priority Occupations 的人身上(stream 字段虽然引擎当前不按它筛选,
  但 basis='employerTenure' 的行本身就只摆门槛不判定,不存在「误判某条路的人」的风险)。
同理没抓:年龄 ≥19、高中学历 + ECA(引擎无对应因素);最低收入(NB **不设**收入表)。
自校是硬闸:三份指南任一没解析到、或 CLB 数对不上就**保留旧表不覆盖**并 exit 1。"""

NBR_TIMEOUT_S = 45
"""通道页抓取超时。"""

NBR_PDF_TIMEOUT_S = 60
"""指南 PDF 抓取超时。"""

NBR_STREAM = "New Brunswick Skilled Worker stream (Experience / Graduates / Priority Occupations)"
"""三条 pathway 的合称通道名。"""

NBR_PATHWAYS = {
    "guide-new-brunswick-experience": "New Brunswick Experience",
    "guide-new-brunswick-graduates": "New Brunswick Graduates",
    "guide-new-brunswick-priority-occupations": "New Brunswick Priority Occupations",
}
"""三条 pathway 的指南文件名关键字 → 官方 pathway 名(用来认链接,也用来在自校里报是哪份缺了)。"""

NBR_EXPERIENCE_NAME = "New Brunswick Experience"
"""Experience 那条 pathway 的官方名(取它那份指南的正文)。"""

NBR_EXPERIENCE_STREAM = "New Brunswick Skilled Worker stream — New Brunswick Experience pathway"
"""Experience pathway 专属的通道名。"""

NBR_LANG_RE = re.compile(r"have (?:at least|a minimum of) Canadian Language Benchmarks \(CLB\) (\d) in listening", re.I)
"""「have at least Canadian Language Benchmarks (CLB) 4 in listening, reading, writing, and speaking」
(Graduates 那份写的是「have a minimum of …」)。"""

NBR_VERSION_RE = re.compile(r"New Brunswick (?:Experience|Graduates|Priority Occupations) \((\d{4}-\d{2})\)")
"""指南封面/页眉的版本:「New Brunswick Experience (2026-06)」。"""

NBR_EXP_TENURE_RE = re.compile(
    r"you must already have at least (\d+) months? of full-time work experience with the supporting employer", re.I)
"""只在 New Brunswick Experience 指南「YOUR ELIGIBILITY」段落里找,不套另外两份指南。"""

NBR_RESIDENCE_RE = re.compile(
    r"You must have been living in New Brunswick with valid temporary resident status for the past (\d+) months?", re.I)
"""NB 居住时长。"""

NBR_SECTION_LANG = "Overview — eligibility"
"""语言的出处节名。"""

NBR_SECTION_EXP = "Your eligibility — 1. NB employment"
"""在职时长的出处节名。"""

NBR_SECTION_RESIDENCE = "Your eligibility — 4. NB residency"
"""居住时长的出处节名。"""

NBR_LANG_LABEL_TPL = ("Canadian Language Benchmarks (CLB) or NCLC {clb} in listening, reading, writing and "
                      "speaking; required by all three Skilled Worker pathways ({pathways})")
"""语言的 label。"""

NBR_PRINT_NO_GUIDE_TPL = "  ✗ 通道页上没找到指南 PDF:{missing}(改版?保留旧表,请人工复核)"
"""指南链接找不到的报数。"""

NBR_PRINT_PATHWAY_TPL = "  {name:32} CLB {clb}  版本 {version}"
"""逐份指南的报数。"""

NBR_UNKNOWN = "?"
"""逐份指南报数里没解析到时的占位。"""

NBR_PROBLEM_LANG_TPL = "{name} 指南里没解析到语言门槛"
"""自校问题:某份指南的语言。"""

NBR_PROBLEM_LANG_DIFF_TPL = "三份指南语言门槛对不上:{clbs}"
"""自校问题:三份对不上。"""

NBR_PROBLEM_NO_VERSION = "没解析到指南版本(封面 pathway 名后的 YYYY-MM)"
"""自校问题:指南版本。"""

NBR_PROBLEM_TENURE = "New Brunswick Experience 指南里的雇主在职时长(6 个月)没解析到"
"""自校问题:在职时长。"""

NBR_PROBLEM_RESIDENCE = "New Brunswick Experience 指南里的 NB 居住时长(6 个月)没解析到"
"""自校问题:居住时长。"""

NBR_SOURCE = "New Brunswick Skilled Worker stream — pathway application guides"
"""表级来源名。
表级 url 指通道页(三份指南是并列的三份,拿其中一份当整份出处会对不上另外两条 pathway)。"""

NBR_PRINT_DONE_TPL = "✓ {path}  指南版本 {version},共 {n} 条门槛"
"""NB 门槛收尾报数。"""


# =========================================================================
# 22. PE 门槛(与 §9 同一份官方申请指南 PDF)
# =========================================================================

OUT_PE_REQ = paths.PNP / "pe-req.json"
"""PE 门槛表落盘处。
**走 PDF 是被迫也是更好**:princeedwardisland.ca 的 HTML 页在 Radware 反爬后面(httpx 拿到验证壳),
而文件服务器 `/sites/default/files/` 不挡 —— 同 §9 的结论,两段读同一份指南。
抓这几条:
  语言  CLB/NCLC 4(四条 Workforce 通道口径一致 → 不分 TEER 陈述)
  经验  24 个月(Skilled Worker 通道:近 5 年内 2 年全职)——**只挂 TEER 0-3**:
        · Critical Worker(TEER 4/5)官方写的是「2 年全职经验**或**相关学历」,有替代路径,
          当成硬门槛会把「有学历没经验」的人误判成不合格 → 不挂 TEER 4/5;
        · Occupations in Demand 只要 1 年,但那是 8 个具名 NOC 的专项(§9 那张表),
          写进 label 陈述,不另开一行(引擎的 experience 不按 NOC 挑行)。
**没抓的**:年龄 18-59、高中/大专学历(引擎无对应因素);最低收入(PE 只写「有足够财力支付移民费用」,
**不发数额表** —— 全国只有 BC 发布了收入表,这是结论不是缺口)。
**雇主侧(B2 补,2026-08-08)**:同一份指南 PDF 里有独立的「Employer Requirements - All Streams」段
(第 5 页),原句「The company has been in active and continuous operation under current ownership/
management in Prince Edward Island for a minimum of two years」→ 只收经营年限一条。**该段是穷举式
清单**("confirming the following criteria" 后面十几条 bullet,逐条读完没有雇员数/营业额字样)——
PE PNP **没有**发布雇主侧的最低雇员数或最低营业额门槛,这是举证过的结论,不是漏抓
(同 §17 头注的判例:先把段落读完,能确认「没有」才敢不发那一行)。
不走 HTML 的原因同上:princeedwardisland.ca 的雇主专页(如有)大概率也在 Radware 后面
(data/crawl/pe-imm 缓存里种子页之外的每一页都是验证壳),但这份指南 PDF 本身不挡,而且已经把
Employer Requirements 整段收进来了,不需要另外碰 WAF。
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。"""

PER_STREAM = "PEI PNP Workforce streams (Skilled Worker / Critical Worker / International Graduate / Occupations in Demand)"
"""四条 Workforce 通道的合称。"""

PER_SKILLED_STREAM = "PEI PNP Workforce — Skilled Worker stream"
"""Skilled Worker 通道名(经验那行只挂它)。"""

PER_EMP_STREAM = "PEI PNP Workforce — Employer Requirements (all streams)"
"""雇主侧的通道名。"""

PER_LANG_RE = re.compile(r"minimum score of CLB ?/ ?NCLC (\d)", re.I)
"""语言:官方指南里 PDF 用的是 U+2010 连字符(full‐time),别写死普通 '-' —— 用 . 兜一位。"""

PER_EXP_RE = re.compile(r"have at least (\w+) years of full.time work experience in the past (\w+) years", re.I)
"""Skilled Worker 通道的经验。"""

PER_EXP_OID_RE = re.compile(r"have at least (\w+) year of work experience directly related to the job", re.I)
"""Occupations in Demand 的 1 年经验(只进 label 陈述)。"""

PER_EFFECTIVE_RE = re.compile(r"([A-Z][a-z]+ \d{4}) ?[–—-] ?page \d+")
"""页脚:「PEI Workforce Application Guide • • • January 2026 – page 2」。"""

PER_EMP_YEARS_RE = re.compile(
    r"The company has been in active and continuous operation under current ownership.{0,5}management "
    r"in Prince Edward Island for a minimum of (\w+) years", re.I)
"""雇主侧:「Employer Requirements - All Streams」段。"""

PER_SECTION_LANG = "Step 1: Assess Your Eligibility"
"""语言的出处节名。"""

PER_SECTION_EXP = "Skilled Worker Stream"
"""经验的出处节名。"""

PER_SECTION_EMPLOYER = "Employer Requirements - All Streams"
"""雇主侧的出处节名。"""

PER_TEER_03 = [0, 1, 2, 3]
"""经验那行只挂 TEER 0-3(理由见段首)。"""

PER_LANG_LABEL_TPL = ("A valid language test from an IRCC-approved institution with a minimum score of "
                      "CLB/NCLC {clb} (test valid for 2 years); required by all PEI Workforce streams")
"""语言的 label。"""

PER_EXP_LABEL_TPL = ("At least {years_word} years ({months} months) of full-time work experience in the "
                     "past {window_word} ({window}) years, with a full-time non-seasonal job offer in NOC "
                     "TEER 0-3 (the Occupations in Demand stream requires only "
                     "{oid_months} months, but is limited to its named NOC list)")
"""经验的 label。"""

PER_EMP_LABEL_TPL = ("[Employer] The company has been in active and continuous operation under current "
                     "ownership/management in Prince Edward Island for a minimum of {word} "
                     "years with identified labour gaps (no published minimum staff count or minimum "
                     "annual revenue in this section)")
"""雇主侧的 label。"""

PER_PROBLEM_LANG = "语言门槛没解析到"
"""自校问题:语言。"""

PER_PROBLEM_LANG_MULTI_TPL = "指南里出现多个语言门槛 {langs} —— 官方可能已分档,需人工核对"
"""自校问题:多个语言档。"""

PER_PROBLEM_EXP = "Skilled Worker 经验门槛没解析到"
"""自校问题:经验。"""

PER_PROBLEM_EXP_OID = "Occupations in Demand 的 1 年经验没解析到(label 要引用它)"
"""自校问题:OID 经验。"""

PER_PROBLEM_EMPLOYER = "雇主侧经营年限没解析到(Employer Requirements - All Streams 段可能改版)"
"""自校问题:雇主经营年限。"""

PER_PROBLEM_NO_VERSION = "没解析到指南版本(页脚「月份 年份 – page N」)"
"""自校问题:指南版本。"""

PER_SOURCE = "PEI Workforce Application Guide"
"""表级来源名。"""


# =========================================================================
# 23. NL 门槛(Skilled Worker 语言两档 + 雇主侧三条 + International Graduate 通道)
# =========================================================================

NLR_POLICY_URL = "https://www.gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria/"
"""NLPNP Skilled Worker 资格政策页(gov.nl.ca 直连 200)。"""

NLR_PAGE_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                "provincial-nominee-program/applicants/skilled-worker-category/")
"""Skilled Worker 通道的人可读页(表级 pageUrl)。"""

NLR_EMPLOYER_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                    "provincial-nominee-program/employers/employer-criteria")
"""B2-4(2026-08-03):雇主侧门槛 —— NLPNP 官方雇主资格页发的正是引擎那套形状:
现管经营 ≥2 年(特殊情形 1 年)+ 本地全职雇员(圣约翰斯区 ≥2 / 区外 ≥1)。"""

NLR_IG_URL = "https://www.gov.nl.ca/immigration/4-international-graduate-category-eligibility-criteria"
"""International Graduate 通道资格页(2026-08-05 补)。
为什么补:人工复盘 C01 把这条排为「Day 0 唯一可递交」的第一路径,而引擎一个字说不出来 ——
库里 NL 只有 Skilled Worker 那 5 行。**它是本站唯一一条不设工作经验门槛的省提名通道**,
对「刚毕业 0 经验」这一整类用户,少了它整份回答就少了最优解。
URL 不是猜的(CLAUDE.md 铁律):#4 那页当时不在 crawl 里,href 是从已抓的
`international-graduate-category` 分类页正文里抠出来的。"""

NLR_IG_LANG_URL = "https://www.gov.nl.ca/immigration/11-language-testing-international-graduate"
"""IG 通道的语言测试页。"""

OUT_NL_REQ = paths.PNP / "nl-req.json"
"""NL 门槛表落盘处。
NL 这份的看点是**分档方式跟别省相反**:官方明说 Skilled Worker 收 TEER 0-5 全档,
但**只有 TEER 4/5 要交语言成绩**,TEER 0-3 不要求 —— 对高技能岗来说这是全国最松的一条。
所以本段产出两行:
  · TEER 4/5   language CLB 4(官方逐项列了 IELTS/CELPIP/PTE/TEF/TCF 的 CLB 4 等值分)
  · TEER 0-3   language op='none'(官方不要求交成绩;引擎见 op='none' 出「这档不设成绩门槛」)
**TEER 0-3 那一档是算出来的,不是写死的**:从官方「In a TEER 0, 1, 2, 3, 4 or 5 occupation」
减去「Applicants with TEER 4 or 5 job offers must submit …」的那一档 —— 官方哪天收窄了档位,
这里跟着变,不用改代码。
**没抓的**:
  · 经验:NL 不设通用年限门槛,只要求「具备该 NOC 的 employment requirements」(职业本身的要求,
    每个 NOC 不同,不是省门槛)。硬塞一个数是编的。
  · 年龄 21-59、结算资金(官方只写「足够」不发数额)、雇主 JVA(引擎无对应因素)。
  · 最低收入:NL **不设**收入表(全国只有 BC 发布;这是结论不是缺口)。
自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。"""

NLR_TIMEOUT_S = 45
"""NL 各页抓取超时。"""

NLR_STREAM = "NLPNP Skilled Worker Category"
"""Skilled Worker 通道名。"""

NLR_IG_STREAM = "NLPNP International Graduate Category"
"""International Graduate 通道名。"""

NLR_EMP_STREAM = "NLPNP (employer criteria, all streams)"
"""雇主侧的通道名。"""

AREA_ST_JOHNS = "st-johns"
"""区域键:圣约翰斯区。"""

AREA_REST_NL = "rest-of-nl"
"""区域键:NL 其余地区。"""

NLR_ALL_TEERS_RE = re.compile(r"In a TEER ([\d, ]*or \d) occupation", re.I)
"""「In a TEER 0, 1, 2, 3, 4 or 5 occupation」—— 本通道收的全部档位。"""

NLR_TEST_TEERS_RE = re.compile(r"Applicants with TEER ([\d ]*or \d) job offers must submit a valid language "
                               r"proficiency test", re.I)
"""「Applicants with TEER 4 or 5 job offers must submit a valid language proficiency test」。"""

NLR_CLB_RE = re.compile(r"Minimum scores \(CLB (\d) equivalent\)", re.I)
"""「Minimum scores (CLB 4 equivalent)」—— 逐个考试重复,取唯一值。"""

NLR_EMP_YEARS_RE = re.compile(r"Operated under current management for at least (\d+) years?", re.I)
"""「Operated under current management for at least 2 years (or 1 year in special cases)」。"""

NLR_STAFF_SJ_RE = re.compile(r"In St\.?\s*John.{0,3}s area:? at least (\d+) full-?time local employees?", re.I)
"""「In St. John's area: at least 2 full-time local employees」(弯引号在 page_text 已压成空白无碍)。"""

NLR_STAFF_OUT_RE = re.compile(r"Outside St\.?\s*John.{0,3}s:? at least (\d+) full-?time local employees?", re.I)
"""「Outside St. John's: at least 1 full-time local employee」。"""

NLR_IG_PGWP_RE = re.compile(r"Post-Graduation work permit \(PGWP\) that has at least (\w+) \((\d+)\) months? validity", re.I)
"""IG:PGWP 剩余有效期。"""

NLR_IG_TEER_RE = re.compile(r"In a NOC TEER level ([\d, ]*or \d) occupation", re.I)
"""IG:收的 TEER 档位。"""

NLR_IG_HOURS_RE = re.compile(r"minimum of \w+ \((\d+)\) hours per week", re.I)
"""IG:每周最低小时数。"""

NLR_IG_MONTHS_RE = re.compile(r"at least one \(1\) year \(twelve \((\d+)\) months\) in duration", re.I)
"""IG:offer 最短时长。"""

NLR_IG_AGE_RE = re.compile(r"Be (\d+) to (\d+) years old", re.I)
"""IG:年龄区间。"""

NLR_IG_EXPERIENCE_RE = re.compile(r"(?:work|employment) experience|(?:months|years) of experience", re.I)
"""🔴 op='none' 是**断言没有这条门槛**,不是「我们没查到」。所以拿这个反向正则自证:
官方清单里但凡出现「工作经验」字样,就说明它其实有要求 → 不发这一行,并报问题。"""

NLR_IG_LANG_CLB_RE = re.compile(r"Canadian Language Benchmark \(CLB\) (\d) in each", re.I)
"""IG:语言等值档。"""

NLR_IG_LANG_TEER4_RE = re.compile(r"TEER Category 4 \(in-demand\) occupation must submit proof of language", re.I)
"""IG:TEER 4(in-demand)必考语言那句。"""

NLR_IG_LANG_DISCRETION_RE = re.compile(r"discretion to request language testing.{0,120}TEER Level 0, 1, 2 or 3", re.I | re.S)
"""IG:官方对 TEER 0-3 保留的语言酌情权那句(不带上它就是替官方打包票)。"""

NLR_IG_TEER4 = [4]
"""IG 语言必考档。"""

NLR_SECTION_LANG = "Skilled Worker Category Eligibility Criteria — language"
"""Skilled Worker 语言的出处节名。"""

NLR_SECTION_EMP_YEARS = "Employer Criteria — established in NL"
"""雇主经营年限的出处节名。"""

NLR_SECTION_EMP_STAFF = "Employer Criteria — local staff"
"""雇主雇员数的出处节名。"""

NLR_SECTION_IG_LANG = "International Graduate — Language Testing"
"""IG 语言的出处节名。"""

NLR_SECTION_IG = "International Graduate Category Eligibility Criteria"
"""IG 经验那行的出处节名。"""

NLR_LANG_LABEL_TPL = ("Applicants with NOC TEER {band} job offers must submit a valid "
                      "language test at CLB/NCLC {clb} equivalent, valid throughout processing")
"""Skilled Worker 语言(要考)的 label。"""

NLR_LANG_NONE_LABEL_TPL = ("No language test is required for NOC TEER "
                           "{exempt} job offers; the category accepts job offers "
                           "in TEER {band} occupations")
"""Skilled Worker 语言(免考)的 label。"""

NLR_EMP_YEARS_LABEL_TPL = ("Employer must be permanently based in NL, registered with Service NL, and operated "
                           "under current management for at least {years} years (1 year in special cases)")
"""雇主经营年限的 label。"""

NLR_STAFF_SJ_LABEL_TPL = "In the St. John's area: at least {n} full-time local employees"
"""圣约翰斯区雇员数的 label。"""

NLR_STAFF_OUT_LABEL_TPL = "Outside St. John's: at least {n} full-time local employee(s)"
"""区外雇员数的 label。"""

NLR_IG_LANG_LABEL_TPL = ("An offer in a TEER 4 (in-demand) occupation must come with a language test at "
                         "CLB/NCLC {clb} in each of the four abilities")
"""IG 语言(必考)的 label。"""

NLR_IG_LANG_NONE_LABEL_TPL = ("No language test is required up front for an offer in TEER "
                              "{teers}; the officer may still request one at their "
                              "discretion regardless of the TEER level")
"""IG 语言(不强制)的 label —— **必须带上官方那句酌情权**,不然就是替官方打包票。"""

NLR_IG_EXP_LABEL_TPL = ("This category sets no minimum work-experience requirement: the published "
                        "criteria are a PGWP with at least {pgwp} months validity left plus a "
                        "job offer of at least {months} months at "
                        "{hours}+ hours a week, applicant aged {age_from}-{age_to}")
"""IG 经验(op='none')的 label —— 🔴 **本站唯一一条「不设工作经验门槛」的省提名通道**,
这是它的全部价值所在。官方那份「Applicants must:」是穷举清单,通篇没有经验这一项;
上面的反向正则替这句话作证。"""

NLR_PROBLEM_NO_ALL_TEERS = "通道收的 TEER 档位没解析到"
"""自校问题:全档。"""

NLR_PROBLEM_NO_TEST_TEERS = "「哪些 TEER 要交语言成绩」没解析到"
"""自校问题:要考的档。"""

NLR_PROBLEM_NO_CLB = "语言等值档(CLB N equivalent)没解析到"
"""自校问题:语言等值档。"""

NLR_PROBLEM_MULTI_CLB_TPL = "页面里出现多个语言档 {clbs} —— 官方可能已分档,需人工核对"
"""自校问题:多个语言档。"""

NLR_PROBLEM_TEER_MATH_TPL = "档位算不出来:全档 {whole},要考的 {need}"
"""自校问题:免考档算不出来。"""

NLR_PROBLEM_EMPLOYER_TPL = "雇主侧「{what}」没解析到(雇主资格页可能改版)"
"""自校问题:雇主侧某一条。"""

NLR_WHAT_EMP_YEARS = "经营年限"
"""雇主侧自校的中文项名:经营年限。"""

NLR_WHAT_STAFF_SJ = "圣约翰斯区雇员数"
"""雇主侧自校的中文项名:圣约翰斯区雇员数。"""

NLR_WHAT_STAFF_OUT = "区外雇员数"
"""雇主侧自校的中文项名:区外雇员数。"""

NLR_PROBLEM_IG_TPL = "IG 通道「{what}」没解析到(资格页可能改版)"
"""自校问题:IG 某一条。"""

NLR_WHAT_IG_PGWP = "PGWP 剩余有效期"
"""IG 自校的中文项名:PGWP 剩余有效期。"""

NLR_WHAT_IG_TEER = "收的 TEER 档位"
"""IG 自校的中文项名:TEER 档位。"""

NLR_WHAT_IG_HOURS = "每周最低小时数"
"""IG 自校的中文项名:每周小时数。"""

NLR_WHAT_IG_MONTHS = "offer 最短时长"
"""IG 自校的中文项名:offer 时长。"""

NLR_WHAT_IG_AGE = "年龄区间"
"""IG 自校的中文项名:年龄区间。"""

NLR_WHAT_IG_TEER4 = "TEER 4 必考语言那句"
"""IG 自校的中文项名:TEER 4 必考。"""

NLR_WHAT_IG_DISCRETION = "官方对 TEER 0-3 保留的语言酌情权那句"
"""IG 自校的中文项名:酌情权。"""

NLR_PROBLEM_IG_CLB_TPL = "IG 语言档解析到 {clbs} 个 —— 需人工核对"
"""自校问题:IG 语言档数。"""

NLR_PROBLEM_IG_EXPERIENCE = "IG 资格页出现了「工作经验」字样 —— 「不设经验门槛」这条断言不再成立,须人工重读"
"""自校问题:IG 出现经验字样(断言不成立)。"""

NLR_SOURCE = "NLPNP — Skilled Worker Category Eligibility Criteria Policy"
"""表级来源名。"""

NLR_PRINT_ROW_TPL = "  TEER {teers}  op={op}  CLB={value}"
"""NL 门槛逐行报数。"""

# =========================================================================
# 24. SK 运营统计(处理时长 + 配额用量 —— 全国唯一「配额 vs 已用」官方表)
# =========================================================================

SKS_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
           "saskatchewan-immigrant-nominee-program/sinp-processing-statistics")
"""SINP Processing Statistics 页。
这页是 2026-08-03 Frank 一句「官方没有数据么」问出来的:此前我们断言「分母没有省公布」,
错了 —— 萨省每季度发处理时长(80% 分位、掐头去尾),且**配额按行业切分并逐日更新已用数**。
这是全国目前发现的唯一一份「配额 vs 已用」官方表,直接回答「今年还剩多少名额」。"""

SKS_EOI_URL = SK_BASE_URL + "international-skilled-worker-eoi-system"
"""SINP EOI 系统页(政策事实的出处)。"""

OUT_SK_STATS = paths.PNP / "sk-stats.json"
"""SK 运营统计落盘处,三块:
  processing   各类别处理周数(ISW / SK Experience / 二次复核 / 雇主 EPA),含季度口径
  allocation   2026 提名配额按行业三档(优先 / 受限 / 其他)+ Nominations YTD + 总数
               页面明示 YTD 数字「周一至周五每日更新」→ as-of 就是 fetched 当天
  sectors      优先行业(不设上限)与受限行业(带百分比与绝对名额)名单
**不抓的**:intake window 逐窗口表(rowspan 嵌套、且只关受限三行业 —— 木匠/技工在优先行业
不受窗口限制;「我这行还有没有名额」由 allocation 表回答)。清单若要做受限行业提醒再回来。
自校是硬闸:任何一块没解析到 / 数字对不上就**保留旧表不覆盖**并 exit 1。"""

SKS_TIMEOUT_S = 45
"""统计页抓取超时。"""

SKS_NOTE = ("SINP 处理时长为官方季度实测(80% 分位,掐掉最快最慢各 10%),官方注明不可用于预测未来申请;"
            "Nominations YTD 周一至周五每日更新,as-of 即 fetched 当天。"
            "政策事实:International Skilled Worker 的 Employment Offer 子类**不走 EOI 池**"
            "(官方 EOI 页明示只有 Occupations In-Demand 与 Express Entry 递 EOI)——"
            f"有雇主 offer 即直接递申请,无抽选等待步骤。出处:{SKS_EOI_URL}")
"""表级口径说明。随手钉进来的**政策事实**(带出处):Employment Offer 子类**不走 EOI 池** ——
官方 EOI 系统页明写「能递 EOI 的是 Occupations In-Demand 与 Express Entry」,EO 不在其中。
即:有雇主 offer 就直接递,没有「等抽选」这一步。这一条是木匠案例里「等着被捞」焦虑的官方否定。"""

SKS_QUARTER_RE = re.compile(r"Quarter (\d), (\d{4})")
"""季度口径。"""

SKS_WEEKS_RE = re.compile(r"(\d+)\s*weeks?", re.I)
"""处理周数。"""

SKS_CAPPED_RE = re.compile(r"([A-Za-z ,]+?) receives? (\d+) per cent \((\d+) spots\)")
"""「Trucking receives 5 per cent (238 spots)」/「… receive 15 per cent (714 spots)」。"""

SKS_PRIORITY_RE = re.compile(r"Priority Sectors for (\d{4}) include:(.*?)These sectors", re.S)
"""优先行业名单段。"""

SKS_QUARTER_TPL = "{year}Q{q}"
"""季度口径的存法。"""

SKS_GROUP_EPA = "EPA"
"""处理时长分组:雇主 EPA。"""

SKS_GROUP_SECOND_REVIEW = "Second Review"
"""处理时长分组:二次复核。"""

SKS_GROUP_SK_EXPERIENCE = "Saskatchewan Experience"
"""处理时长分组:萨省经验类。"""

SKS_GROUP_ISW = "International Skilled Worker"
"""处理时长分组:国际技术工人(默认档)。"""

SKS_EPA_KW = "Position Assessment"
"""EPA 分组的判词。"""

SKS_APPLICANT_KW = "Applicant"
"""二次复核分组的判词之一(行名)。"""

SKS_REVIEW_KW = "Review"
"""二次复核分组的判词之二(表头)。"""

SKS_EXPERIENCE_ROWS = ("Existing Work Permit", "International Students")
"""萨省经验类的行名。"""

SKS_ALLOC_HEAD_KW = "Nominee Sector"
"""配额表的表头判词。"""

SKS_TOTAL_ROW = "total"
"""配额表的合计行名(小写比对)。"""

SKS_APOSTROPHE_CURLY = "’"
"""优先行业段里的弯引号。"""

SKS_APOSTROPHE_STRAIGHT = "'"
"""替换成的直引号。"""

SKS_MIN_PROCESSING = 5
"""处理时长至少几条有效。"""

SKS_MIN_PRIORITY = 4
"""优先行业至少几个。"""

SKS_CAPPED_ROWS = 3
"""受限行业官方 3 个:卡车/零售/餐饮住宿。"""

SKS_ALLOC_MIN_PARTS = 3
"""配额表除 Total 外至少几档。"""

SKS_ALLOC_MIN_COLS = 3
"""配额表一行至少几格。"""

SKS_PROBLEM_PROCESSING_TPL = "处理时长只解析到 {n} 条有效(期望 ≥5)"
"""自校问题:处理时长条数。"""

SKS_PROBLEM_NO_EPA = "雇主 EPA 处理时长没解析到"
"""自校问题:EPA。"""

SKS_PROBLEM_NO_QUARTER = "季度口径(Quarter N, YYYY)没解析到"
"""自校问题:季度口径。"""

SKS_PROBLEM_BAD_ROW_TPL = "配额行读不成数字:{row}"
"""自校问题:配额行读不成数字。"""

SKS_PROBLEM_ALLOC_TPL = "配额表不完整(解析到 {n} 行,需 3 档 + Total)"
"""自校问题:配额表不完整。"""

SKS_PROBLEM_ALLOC_SUM = "配额分档之和 ≠ Total(列错位)"
"""自校问题:分档之和对不上。"""

SKS_PROBLEM_ALLOC_SWAP = "某档 YTD 超过配额(两列读反了)"
"""自校问题:两列读反。"""

SKS_PROBLEM_PRIORITY_TPL = "优先行业只解析到 {n} 个(期望 ≥4)"
"""自校问题:优先行业个数。"""

SKS_PROBLEM_CAPPED_TPL = "受限行业解析到 {n} 个(官方 3 个:卡车/零售/餐饮住宿)"
"""自校问题:受限行业个数。"""

SKS_SOURCE = "SINP Processing Statistics"
"""表级来源名。"""

SKS_PRINT_DONE_TPL = ("✓ {path}  {quarter} 处理时长 {n} 条;配额 Total "
                      "{alloc:,} 已用 {used:,}({pct:.0%});优先行业 {priority}、受限 {capped}")
"""SK 运营统计收尾报数。"""


# =========================================================================
# 25. AB 运营统计(配额用量 + EOI 池内人数 + 抽选史 + 积压游标)
# =========================================================================

OUT_AB_STATS = paths.PNP / "ab-stats.json"
"""AB 运营统计落盘处(页面与 §10 的 AB 抽选源是同一页)。
与 §24 同一族(「我要等多久 / 还有没有名额」),但 AB 发得更全 —— 全国唯一
把**EOI 池内人数**(被抽中概率的分母)直接发出来的省:
  · 2026 总配额 / 已发 / 剩余 / 待处理(全程序 + 逐 stream)
  · 「正在审哪一天收到的申请」= 积压游标(比「预计 N 周」诚实得多)
  · Expression of Interest 池内人数逐 stream(AOS 2026-07-30 实见 23,056 人)——
    配合同页抽选史(单轮邀请数),「被捞概率」第一次可算:单轮 ≈ 邀请数 ÷ 池内人数
  · 65 轮抽选史(日期 / 通道 / 最低分 / 邀请数)
抽选史原样存在这里(同页一并到手);**pnp_draws 维度表的 canonical 源仍是 §10**,
不在这里重复灌 —— 两处写同一张维度表迟早打架。
页面结构:每个 stream 一节(h2/h3)+ 一张表,表头统一「allocation / issued / remaining /
to be processed / assessing … on or before」。个别格是文字(「Less than 10」「Not applicable」)
→ 数值列解析失败时保留原文(raw),不硬转数字。
自校是硬闸:总表对不上账 / EOI 池缺 / 抽选史过短就**保留旧表不覆盖**并 exit 1。"""

ABS_TIMEOUT_S = 45
"""统计页抓取超时。"""

ABS_NOTE = ("AAIP 官方处理信息页:配额/已发/剩余、积压游标(正在审哪天收到的申请)、"
            "**EOI 池内人数**(被抽中概率的分母 —— 单轮概率 ≈ 当轮邀请数 ÷ 池内人数)与抽选史。"
            "官方注明所有数字随时可变、配额可在 stream 间腾挪;医生与法语者走联邦附加名额,不占本省配额。"
            "抽选史的 canonical 维度表仍由 build_draws.py 维护,本表原样留档。")
"""表级口径说明。"""

ABS_UPDATED_RE = re.compile(r"([A-Z][a-z]+ \d{1,2}, \d{4})")
"""页面自带的更新日(h2「2026 summary」上方独立一行日期)。"""

ABS_INT_RE = re.compile(r"^[\d,]+$")
"""纯数字格判据(文字格原样返回,不硬转)。"""

ABS_FALLBACK_X = "x"
"""空格转数字前的占位(空串 or "x" → 正则不匹配 → 原样返回,原写法照搬)。"""

ABS_SECTION_TAGS = ["h2", "h3"]
"""该表属于哪个 stream:取前面最近的这类标题(官方每节一表)。"""

ABS_SNIFF_LEN = 3000
"""正文里嗅更新日的窗口。"""

ABS_HEAD_DRAW = "draw date"
"""抽选史表的表头前缀。"""

ABS_HEAD_STREAM = "stream or pathway"
"""EOI 池表的表头前缀。"""

ABS_HEAD_ALLOCATION = "nomination allocation"
"""配额表的表头判词。"""

ABS_SUMMARY_KW = "summary"
"""总表所在节的判词。"""

ABS_SUMMARY_KEYS = ["allocation", "issued", "remaining", "toProcess"]
"""总表四格的键序。"""

ABS_STREAM_KEYS = ["allocation", "issued", "remaining", "toProcess", "assessingUpTo"]
"""逐 stream 表五格的键序(assessingUpTo 是文字格,不转数字)。"""

ABS_ASSESSING_KEY = "assessingUpTo"
"""积压游标的键名(唯一不转数字的一格)。"""

ABS_ALLOC_KEY = "allocation"
"""配额键(判断首列是不是名字列时用)。"""

ABS_AOS_KW = "Opportunity"
"""收尾报数里取 AOS 那一行的判词。"""

ABS_DRAW_MIN_COLS = 4
"""抽选史一行至少几格。"""

ABS_POOL_MIN_COLS = 2
"""EOI 池一行至少几格。"""

ABS_MIN_STREAMS = 5
"""逐 stream 表至少几行。"""

ABS_MIN_POOL = 4
"""EOI 池至少几行。"""

ABS_MIN_DRAWS = 20
"""抽选史至少几轮。"""

ABS_POOL_SANE = 1000
"""EOI 池里至少要有一个 stream 超过这么多人(否则疑似列错位)。"""

ABS_PROBLEM_NO_ASOF = "页面更新日没解析到"
"""自校问题:更新日。"""

ABS_PROBLEM_NO_SUMMARY = "总表(2026 summary)没解析到"
"""自校问题:总表。"""

ABS_PROBLEM_SUMMARY_TPL = "总表对不上账:{summary}"
"""自校问题:总表加不平。"""

ABS_PROBLEM_STREAMS_TPL = "逐 stream 表只解析到 {n} 行(期望 ≥5)"
"""自校问题:逐 stream 行数。"""

ABS_PROBLEM_POOL_TPL = "EOI 池只解析到 {n} 行(期望 ≥4)"
"""自校问题:EOI 池行数。"""

ABS_PROBLEM_POOL_SANE = "EOI 池数字异常(没有任何 stream 超过 1000 人,疑似列错位)"
"""自校问题:EOI 池数字异常。"""

ABS_PROBLEM_DRAWS_TPL = "抽选史只解析到 {n} 轮(期望 ≥20)"
"""自校问题:抽选史轮数。"""

ABS_SOURCE = "AAIP processing information"
"""表级来源名。"""

ABS_PRINT_DONE_TPL = ("✓ {path}  asOf {as_of}:配额 {alloc:,} 已发 {issued:,} "
                      "剩 {remaining:,};stream {streams} 行;EOI 池 {pool} 档"
                      "(AOS {aos:,} 人);抽选史 {draws} 轮")
"""AB 运营统计收尾报数。"""


# =========================================================================
# 26. BC 运营统计(注册池 SIRS 分数分布 + 官方处理时长)
# =========================================================================

BCS_PROC_URL = "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration"
"""处理时长页(同文另见 /immigrate-to-b-c/for-workers;取通道主页这一份)。"""

OUT_BC_STATS = paths.PNP / "bc-stats.json"
"""BC 运营统计落盘处(池分布那半与 §10 的 BC 抽选源是同一页)。
BC 的发法又不一样:不发池子总人数,发**Skills Immigration 注册池按 SIRS 分数段的人数分布**
(约 13 档)—— 配合同页抽选史的「最低邀请分」,能直接读出「我这个分数上面压着多少人」:
比分数线高 → 下一轮大概率被捞;比分数线低 → 能看到差的那几档里各有多少人。
这比单个总数更有用,是三省(SK 配额账本 / AB 池子总数 / BC 分数分布)里颗粒度最细的分母。
抽选史表归 §10(canonical),本段只取 §10 注释里写明「不取」的那张池分布表。
「<5」这类隐私抑制值原样保留(raw),不硬转数字 —— 编个 4 出来就是撒谎。
**处理时长**(2026-08-04 补):官方在 Skills Immigration 通道页(同文见 /for-workers)印着
「Generally, around 80% of cases will be processed within the following timelines」+ 三档阶段时长。
站内此前写着「BC 没有处理时长」是**错的**,这一段就是来推翻它的。两点口径:
  · 官方给的单位是 **months**,原样存 months(metric=processing_months),**不折成 weeks** ——
    3 个月折成 13 周是替官方编了个它没给的精度;SK 那边官方本来就发 weeks,各存各的原单位。
  · 「80% 分位」是这三个数的全部意义,所以它进每一行的 label(官方原句),
    让任何引用都不可能把「80% 的案子」说成「所有案子」。
  · 这一页从 crawl 缓存读,不再自己发请求;池分布那半仍是实时抓(crawl 每小时一轮,池子官方
    更新更勤,实时更准)。
  · 企业家通道页(entrepreneur-immigration)另有一张自己的时长表(6 weeks / 4 months ×2 / 6 months),
    **故意不收**:本站服务的是拿雇主 offer 的打工人,EI 是另一条产品线,阶段名也不可比。
    这是决定不是缺口 —— 要收的话在这里加一页即可。
自校是硬闸:分布表没找到 / 档数异常 / as-of 没解析到就**保留旧表不覆盖**并 exit 1。"""

BCS_TIMEOUT_S = 45
"""池分布页抓取超时。"""

BCS_NOTE = ("BC PNP Skills Immigration 注册池按 SIRS 分数段的人数分布(官方定期更新)。"
            "配合 pnp_draws 里 BC 的「最低邀请分」使用:高于最近分数线 → 池中排位靠前;"
            "低于 → 分布表能读出差的每一档压着多少人。「<5」为官方隐私抑制值,原样保留。"
            "抽选史的 canonical 维度表归 build_draws.py,本表不重复。")
"""表级口径说明。"""

BCS_ASOF_RE = re.compile(r"Skills Immigration registration pool as of ([A-Z][a-z]+ \d{1,2}, \d{4})")
"""「… in the Skills Immigration registration pool as of July 7, 2026:」。"""

BCS_RANGE_RE = re.compile(r"^\d+\s*(\+|[-–—]\s*\d+)$")
"""「150+」/「140 - 149」(容忍长短横与空格)。"""

BCS_PCTL_RE = re.compile(r"(Generally,[^.:]*?(\d+)% of cases will be processed within the following timelines)", re.I)
"""「Generally, around 80% of cases will be processed within the following timelines:」——
这三个数的口径句,必须跟着每一行走。"""

BCS_DUR_RE = re.compile(r"^(\d+)\s+(week|month)s?$", re.I)
"""「3 months」/「6 weeks」(认不出的时长写法一律不猜)。"""

BCS_POOL_HEAD_KW = "score range"
"""池分布表的表头判词。"""

BCS_STAGE_HEAD_KW = "stage"
"""处理时长表的表头判词。"""

BCS_MIN_POOL = 8
"""池分布至少几档。"""

BCS_MIN_STAGES = 3
"""处理时长至少几个阶段。"""

BCS_POOL_SANE = 100
"""池分布里至少要有一档超过这么多人(否则疑似列错位)。"""

BCS_UNIT_SUFFIX = "s"
"""单位复数尾巴(week → weeks)。"""

BCS_PROBLEM_NO_CACHE_TPL = "crawl 缓存里没有 {url}(先跑 etl/crawl/discover_sources.py)"
"""自校问题:处理时长页不在缓存里。"""

BCS_PROBLEM_NO_PCTL = "处理时长的「80% of cases」口径句没解析到(官方句式改了?)"
"""自校问题:口径句。"""

BCS_PROBLEM_STAGES_TPL = "处理时长表只解析到 {n} 个阶段(期望 ≥3)"
"""自校问题:阶段数。"""

BCS_PROBLEM_NO_ASOF = "池分布的 as-of 日期没解析到(官方句式改了?)"
"""自校问题:池分布口径日。"""

BCS_PROBLEM_POOL_TPL = "池分布只解析到 {n} 档(期望 ≥8)"
"""自校问题:池分布档数。"""

BCS_PROBLEM_POOL_SANE = "池分布数字异常(没有任何档超过 100 人,疑似列错位)"
"""自校问题:池分布数字异常。"""

BCS_SOURCE = "BC PNP — Invitations to apply (Skills Immigration registration pool)"
"""表级来源名。"""

BCS_PRINT_PROC_ONLY_TPL = "✓ {path}(只更新 processing;pool {n} 档原样保留)"
"""只重算处理时长时的收尾报数。"""

BCS_PRINT_PROC_ROW_TPL = "    {stage:<26} {raw}"
"""只重算处理时长时的逐行报数。"""

BCS_PRINT_DONE_TPL = "✓ {path}  asOf {as_of}:{n} 档,可计数注册 {total:,} 人"
"""BC 运营统计收尾报数。"""

BCS_PRINT_POOL_TPL = "    {rng:>10}  {n}"
"""逐档报数。"""

BCS_PRINT_STAGE_TPL = "    处理时长 {stage:<26} {raw}"
"""逐阶段报数。"""


# =========================================================================
# 27. ON 运营统计(逐年更新页摘已发提名数 + 年度配额 + 官方重定向复核)
# =========================================================================

ONS_SEED_URL = "https://www.ontario.ca/page/oinp-application-processing-times-and-nominations-issued"
"""官方原本发布处理时长+提名数的页(现 302 重定向),仍记录原样 URL 供溯源。"""

ONS_UPDATES_URL_TPL = "https://www.ontario.ca/page/{year}-ontario-immigrant-nominee-program-updates"
"""逐年更新页(官方每年新开一页)。"""

OUT_ON_STATS = paths.PNP / "on-stats.json"
"""ON 运营统计落盘处。
⚠️ 这一段一上来就撞见一个「页面没了」:官方原本有一页专门叫「OINP Application
processing times and nominations issued」(data/crawl/oinp-times/manifest.json 那颗种子的
seed_url),但站内到处链它的旧页(如 expression-interest-system-streams、register-expression-
interest…)现在点进去会 302 到泛用总览页 ontario-immigrant-nominee-program-oinp,带
`?redirect_id=page%2Foinp-application-processing-times-and-nominations-issued&redirect_year=2025`
——**官方自己登记的重定向**,不是抓取偶发失败(运行时用 httpx 实测同一 URL 复核,见
check_on_redirect())。总览页正文只剩一句「OINP is changing... all other streams are now
closed」(2026 年改制成单一的 Ontario Workforce Priority stream),没有任何处理时长/提名数表格。
全站翻遍 on-oinp 种子(见 data/crawl/on-oinp/manifest.json)也找不到第二处发布**逐 stream 审理
时长**的页面 —— `processing` 数组按硬规矩留空,不拿「非官方博客写的 60-120 天」充数。
**已发提名数**没有消失,只是搬了家:官方每年一页「<年> Ontario Immigrant Nominee Program
Updates」年底会发一句「issued a total of N nominations to successful applicants across all
streams in <年>」(或早期措辞「reached its <年> nomination allocation, a total of N
nominations」)——逐年扫这批页面(同一 on-oinp 种子已缓存,部分年份如 2020/2022-2024
被 Radware 反爬挡住,缓存与实抓都拿不到,原样跳过不硬凑)。取每页**文档序最靠前**的一条
(页面新→旧排列,最靠前=年末最终数,例如 2018 年 11 月 9 日先报 6,600、12 月 20 日追加到
6,850 的最终版——只取后者)。
**2026 年度配额**:同一批年度页里,2026 那页 2026-02-06 更新写着官方原句「The province's 2026
allocation is 14,119 nominations.」——quote-anchored,照抄不改写。
年份不写死:从今年往前探(见 ONS_YEARS_BACK),缓存优先,缓存没有再 httpx 实抓兜底;
两边都拿不到(Radware 拦截/网络失败)就跳过该年,不拖垮整体。
自校是硬闸:allocation 与 nominationsIssued 两块**都**空 —— 才判定这轮抓取本身出了问题,
保留旧表不覆盖并 exit 1(两块有一块有数据就算抓取本身是好的,`processing` 天生允许空,
不计入这道闸)。"""

ONS_TIMEOUT_S = 45
"""逐年页与重定向复核的抓取超时。"""

ONS_NOTE = ("OINP 官方专页「Application processing times and nominations issued」已 302 重定向到"
            "总览页(官方自己登记的 redirect_id,非抓取失败),全站翻遍也找不到第二处仍在发布**逐"
            "stream 审理时长**的页面 —— processing 留空是举证过的「本站未收录」,不是「官方不公布」"
            "的猜测(2026 年 OINP 改制为单一 Ontario Workforce Priority stream 后,旧的多 stream 时长"
            "表随旧页一起下线)。已发提名数改从每年一页的「OINP Program Updates」年末公告句摘取"
            "(部分年份被 Radware 反爬拦截,拿不到就跳过,不补数)。2026 配额 14,119 出自"
            "2026-02-06 那条更新,官方原句 quote-anchored。")
"""表级口径说明。"""

ONS_ISSUED_RE = re.compile(
    r"issued a total of ([\d,]+) nominations to successful applicants "
    r"across all streams in (\d{4})", re.I)
"""「issued a total of N nominations to successful applicants across all streams in <年>」
——2018/2019/2025 三年样本共用同一措辞,新旧年份都能命中。"""

ONS_REACHED_RE = re.compile(
    r"reached its (?:increased )?(\d{4}) nomination allocation,? a total of ([\d,]+) nominations", re.I)
"""早期措辞退而求其次:「reached its <年> nomination allocation, a total of N nominations」。"""

ONS_ALLOC_RE = re.compile(r"The province.s (\d{4}) allocation is ([\d,]+) nominations\.", re.I)
"""「The province's <年> allocation is N nominations.」——目前只见 2026 那页,但不写死年份。"""

ONS_YEARS_BACK = 12
"""官方逐年更新页约从 2015 起开始独立成页,从今年往前探到底,不写死。"""

ONS_BLOCK_KW_RADWARE = "radware"
"""反爬拦截页的判词之一。"""

ONS_BLOCK_KW_CAPTCHA = "captcha"
"""反爬拦截页的判词之二。"""

ONS_SECTION_TPL = "{year} Ontario Immigrant Nominee Program Updates"
"""逐年页的出处节名。"""

ONS_UNIT_NOMINATIONS = "nominations"
"""配额/提名数的单位。"""

ONS_HTTP_OK = 200
"""实抓兜底只认 200。"""

ONS_PROBLEM_EMPTY = "配额与已发提名数两块都没抓到任何一条(抓取本身可能出了问题)"
"""自校问题:两块都空。"""

ONS_SOURCE = "OINP Program Updates(逐年页)+ 官方重定向复核"
"""表级来源名。"""

ONS_PRINT_REDIRECT_TPL = "  SEED_URL 现状:{status} → {resolved}"
"""重定向复核的报数。"""

ONS_REDIRECT_FAILED = "(实抓失败)"
"""重定向复核实抓失败时的占位。"""

ONS_PRINT_SKIPPED_TPL = "  跳过(缓存与实抓都拿不到,含 Radware 拦截):{years}"
"""跳过年份的报数。"""

ONS_PRINT_ALLOC_TPL = "  配额 {n} 条:"
"""配额报数的抬头。"""

ONS_PRINT_ISSUED_TPL = "  已发提名数 {n} 条:"
"""已发提名数报数的抬头。"""

ONS_PRINT_YEAR_VALUE_TPL = "{year}={value:,}"
"""逐年数字的片段。"""

ONS_PRINT_NO_PROCESSING = "  审理时长 0 条(官方已下线该页,全站没有替代来源 —— 见 note)"
"""审理时长留空的报数(举证过的空)。"""

# =========================================================================
# 28. MB 运营统计(月度数据页 + 年报 §9/§10;纯读 crawl 缓存,不发请求)
# =========================================================================

MBS_MONTHLY_URL_TPL = "https://immigratemanitoba.com/resources/data/monthly-data-{year}"
"""MPNP Monthly Data <年>:年度配额、逐月提名/增强提名/拒/LAA/收件、在审与待审库存。"""

MBS_ANNUAL_URL_TPL = "https://immigratemanitoba.com/resources/data/annual-report-{year}"
"""MPNP Annual Report <年>:§9 Processing Times(逐通道 批准/拒/总体 平均**天数** + 服务承诺句)、
§10 Expression of Interest Pool。"""

OUT_MB_STATS = paths.PNP / "mb-stats.json"
"""MB 运营统计落盘处。
⚠️ 这一段是在**推翻一条我们自己写下的假结论**:chatTools 的 OPS_POLICY.MB 曾写着
`published: false`「MB 官方不发处理时长/池子统计(2026-08-03 全站 324 页爬完确认)」——
**是错的**。病根:那轮 mb-mpnp 的爬取种子只圈了 `/mpnp/`,`/resources/data/` 整个目录没进去,
于是「这一轮没爬到」被写成了「官方不公布」。对用户说「官方不公布」而官方其实公布了,
比说「我不知道」坏得多(中介正好钻这个空子)。MB 其实是全国**披露最厚**的省之一:
2018–2026 每年一页月度运营数据,2017–2024 每年一份年报(含逐通道平均处理天数)。
两个官方源都从 crawl 缓存读,不再自己发请求(crawl 役每小时全站爬)。
年份不写死:从今年往前探,crawl 缓存里有哪年就取哪年(官方每年新开一页,写死等于明年静默过期)。
口径与红线:
  · 单位照官方发布的原单位存,**不换算**(MB 发 days 就存 days;BC 发 months 就存 months)——
    折算成「周」等于替官方编了个精度。metric 名自带单位后缀,一眼看出官方给的是什么。
  · 月度表是**年初至今累计**(Total 行)+ 逐月;库存(在审/待审)只有最新月有意义,
    只取最后一个有数据的月份,period 写明是哪个月 —— 别把 6 月的库存说成「当前」。
  · 抑制值/不适用一律 value=None + 原文进 valueText,绝不折成 0(本表的立身之本)。
自校是硬闸:配额没解析到 / 关键表缺失 / 处理时长表行数异常就**保留旧表不覆盖**并 exit 1 ——
半份数据盖掉好数据比没有更糟。"""

MBS_NOTE = ("MPNP 官方运营统计:年度配额与年初至今提名/拒/LAA/收件(月度数据页)、"
            "在审与待审库存(逐月,取最新月)、逐通道平均处理天数与「6 个月」服务承诺(年报 §9)、"
            "EOI 池在册人数(年报 §10,**全省唯一的池子人数**,年度快照口径,与 AB 的实时池不可混用)。"
            "单位照官方原单位(天/月),不换算。"
            "⚠️ 2026-08-04 更正:此前站内写着「MB 官方不发运营统计」是错的 —— "
            "那是爬取种子只圈了 /mpnp/、漏了 /resources/data/ 造成的误判。")
"""表级口径说明。"""

MBS_ALLOC_RE = re.compile(r"(For \d{4}, Manitoba was allocated ([\d,]+) nominations in total\.)", re.I)
"""「For 2026, Manitoba was allocated 6,239 nominations in total.」(整句捕获 → label 就是官方原文)。"""

MBS_COMMIT_RE = re.compile(r"(The MPNP[^.]{0,40}commitment to assess\w* complete applications "
                           r"is within (\d+) months?\.(?:\s*Incomplete applications[^.]*standard\.)?)", re.I)
"""「The MPNP's commitment to assesses complete applications is within 6 months.」
(assesses 是官方原文的语法错,照录不改 —— label 一律官方原句)。
紧跟的那句免责同样值钱(「不完整/与 EOI 对不上的申请可能超出这个标准」)—— 只说 6 个月
不说这句,等于把服务承诺说成了保证。有就一起收,没有也不拦。"""

MBS_DAYS_RE = re.compile(r"^([\d,]+)\s*days?$", re.I)
"""年报处理时长的天数格。"""

MBS_ACTIVE_RE = re.compile(r"([\d,]+)\s+[Aa]ctive EOI profiles at the end of (\d{4})")
"""年报「10. Expression of Interest Pool」那节是个 <ul>,三条各一个数(2026-08-11 查证接入):
  N Skilled Worker Expression of Interest (EOI) profiles submitted in YYYY   ← 流量
  N Letters of Advice to Apply (LAAs) issued in YYYY                          ← 流量
  N Active EOI profiles at the end of YYYY                                    ← **存量,就是「池子里有多少人」**
这是**全省唯一的池子人数**:MPNP 站的通道页、月度数据页统统没有(月度页那节同名,给的是当月抽走的 LAA)。
只看站内页会得出「MB 不公布池子」的错结论 —— 和当年处理时长踩的是同一个坑。"""

MBS_MONTHLY_YEARS_BACK = 3
"""月度数据页往前探几年。"""

MBS_ANNUAL_YEARS_BACK = 4
"""年报往前探几年。"""

MBS_SECTION_TAGS = ["h1", "h2", "h3", "h4", "table"]
"""按官方小标题定位表格时要走一遍的标签(表头本身认不出表 ——「Month|SW|BIS|Total」refusals 与
applications received 一模一样,只有**上方的官方小标题**能唯一定位)。"""

MBS_PLAN = [
    ("nominationsYtd", "Nominations and approvals",
     [("total nominations", ""), ("sw nominations", "Skilled Worker"), ("bis nominations", "Business Investor Stream")]),
    ("refusalsYtd", "Refusals",
     [("total", ""), ("sw", "Skilled Worker"), ("bis", "Business Investor Stream")]),
    ("laaYtd", "Expressions of Interest",
     [("sw laas", "Skilled Worker"), ("bis laas", "Business Investor Stream"), ("bis bcs", "Business Investor Stream — Business Concepts")]),
    ("receivedYtd", "Applications received",
     [("total", ""), ("sw", "Skilled Worker"), ("bis", "Business Investor Stream")]),
]
"""每张表:(输出键, 官方小标题, 该表里要取的列 → scope 名)。
scope 用官方通道全名(Skilled Worker / Business Investor Stream),省级汇总 scope=''。
label 存**官方表头原文**(「Total Nominations」/「BIS BCs」),不自己改写 —— 报告要引用。"""

MBS_INVENTORY_HEAD = "Applications in assessment"
"""库存表的官方小标题。"""

MBS_ENHANCED_HEAD = "Enhanced nominations"
"""增强提名表的官方小标题(Express Entry 口径,「Month | Total」两列表,只有 Total 行有意义)。"""

MBS_ENHANCED_LABEL = "Enhanced nominations (made through Express Entry) — Total"
"""增强提名的 label。"""

MBS_INVENTORY_SECTION = "Applications in assessment and pending assessment"
"""库存块的出处节名。"""

MBS_COL_IN_ASSESSMENT = "in assessment"
"""库存表的在审列判词。"""

MBS_COL_PENDING = "pending"
"""库存表的待审列判词。"""

MBS_COL_TOTAL = "total"
"""库存表的合计列判词。"""

MBS_TOTAL_ROW_PREFIX = "total"
"""Total 行的判据(小写 startswith)。"""

MBS_MONTH_STRIP_STAR = "*"
"""月份行名尾部的脚注星号。"""

MBS_PROC_HEAD_KW = "approved applications"
"""年报处理时长表的表头判词。"""

MBS_COL_APPROVED = "approved"
"""处理时长表的批准列判词。"""

MBS_COL_REFUSED = "refused"
"""处理时长表的拒件列判词。"""

MBS_COL_OVERALL = "overall"
"""处理时长表的总体列判词。"""

MBS_MIN_PROCESSING = 3
"""年报处理时长至少几条通道。"""

MBS_MONTH_TPL = "{year}-{month:02d}"
"""统计期的存法(YYYY-MM)。"""

MBS_MONTHLY_SECTION_TPL = "MPNP Monthly Data {year}"
"""月度块的出处节名。"""

MBS_ANNUAL_SECTION_TPL = "MPNP Annual Report {year} — 9. Processing Times"
"""年报块的出处节名。"""

MBS_SOURCE_TPL = "MPNP Monthly Data {m_year} & MPNP Annual Report {a_year}"
"""表级来源名。"""

MBS_PROBLEM_NO_MONTHLY = "crawl 缓存里没有 MPNP Monthly Data 任何一年(先跑 etl/crawl/discover_sources.py)"
"""自校问题:月度页不在缓存里。"""

MBS_PROBLEM_NO_ANNUAL = "crawl 缓存里没有 MPNP Annual Report 任何一年"
"""自校问题:年报不在缓存里。"""

MBS_PROBLEM_NO_ALLOC = "年度配额那句(Manitoba was allocated N nominations)没解析到"
"""自校问题:年度配额。"""

MBS_PROBLEM_NO_TOTAL_TPL = "月度页「{head}」表没找到 Total 行"
"""自校问题:某张月度表缺 Total 行。"""

MBS_PROBLEM_NO_COL_TPL = "月度页「{head}」表缺列「{kw}」"
"""自校问题:某张月度表缺列。"""

MBS_PROBLEM_NO_ENHANCED = "增强提名(Enhanced nominations)Total 没解析到"
"""自校问题:增强提名。"""

MBS_PROBLEM_NO_INVENTORY = "库存表(in assessment / pending)一行月份都没解析到"
"""自校问题:库存表。"""

MBS_PROBLEM_PROCESSING_TPL = "年报处理时长表只解析到 {n} 条通道(期望 ≥3)"
"""自校问题:处理时长条数。"""

MBS_PROBLEM_NO_POOL = "年报 §10 的「N Active EOI profiles at the end of YYYY」没解析到"
"""自校问题:EOI 池。
⚠️ **官方文档自相矛盾,不许静默替他改**:2024 年报把这个数标成「at the end of 2023」,
而 2023 年报对同一年份给的是 20,392。几乎肯定是 2024 年报的标签笔误,但我们只做两件事 ——
取**最新一份年报**、把官方那句话原样存进 label。年份取**官方标签里写的那个**,不按报告年推。"""

MBS_PROBLEM_NO_COMMIT = "年报的服务承诺句(commitment … within N months)没解析到"
"""自校问题:服务承诺句。"""

MBS_PRINT_MONTHLY_TPL = ("    月度 {year}(至 {month}):配额 {alloc:,} · "
                         "提名 {nominations:,} · 增强 {enhanced:,} · "
                         "库存 {total}(在审 {in_assessment} / 待审 {pending})")
"""月度块报数。"""

MBS_PRINT_ANNUAL_TPL = "    年报 {year}:承诺 {commit} 个月;逐通道平均处理天数 {n} 条"
"""年报块报数。"""

MBS_PRINT_POOL_TPL = "    年报 {year} §10 池子:{value:,} 人 —— 官方原句「{label}」"
"""EOI 池报数。"""

MBS_PRINT_PROC_TPL = "      {stream:<32} 批准 {approved} / 拒 {refused} / 总体 {overall} 天"
"""逐通道处理时长报数。"""

MBS_UNKNOWN_MONTH = "?"
"""月度块报数里没解析到月份时的占位。"""


# =========================================================================
# 29. MB EOI 分值表(六因子 1000 分制;实抓优先、缓存兜底)
# =========================================================================

MBP_PAGE_URL = "https://immigratemanitoba.com/mpnp/apply/eoi"
"""MPNP EOI 排名系统页(六因子官方积分表全印成 HTML <table>)。
URL 来源:data/crawl/mb-mpnp/manifest.json(2026-08-03 那轮 crawl 已收,
html_cache/d776bf6cf2ccd1239f6b0518e4c56611.html)。
运行时先 httpx 实抓同一 URL,抓不到(网络/改版)才回退读 crawl 缓存,
fetched 如实标成缓存那轮的抓取日,不能假装是今天抓的。"""

MBP_MPNP_URL = "https://immigratemanitoba.com/mpnp"
"""MPNP 总览页(表级 pageUrl)。"""

OUT_MB_POINTS = paths.PNP / "mb-points.json"
"""MB EOI 分值表落盘处(1000 分制,无硬性 passMark)。
**为什么现在能做了**(§16 当初写死「MB 官网没公布 1000 分制的构成」,那条已过期):
2026-07-27 逐省实核时只查了 apply 主页,没点进 `/mpnp/apply/eoi` —— 那页其实把六因子的官方
积分表**全部印成了 HTML `<table>`**(Language proficiency / Age / Work experience / Education /
Adaptability / Risk),每个因子表尾还印着官方自己的「Maximum points」/「Maximum subtotal」行,
可以像 §16 一样拿这些数字做自校硬闸。
六因子里三个需要特殊处理,照官方原样存、不替官方编造:
  · **Language proficiency**:First Official Language 是「per band」——阅读/写作/听力/口语
    四项各自按同一张 CLB 表打分后相加,不是查一次乘四(四项 CLB 不同时,应分别取对应档相加)。
    表内 max 用「四项都在最高档」算 = 25×4 + 25(第二官语言,一次性、不分项) = 125,与官方页尾
    Maximum points 125 对上才算自校过 —— 附 rule 字段写清楚这条乘法,前端/后续消费者别再猜。
  · **Adaptability**:官方把它拆成三个子块(Connection to Manitoba 200 / Manitoba Demand 500 /
    Regional development 50),且官方原话「Regional development 可以和其他 Manitoba connection
    组合,但不能和 Manitoba Demand 组合」——三块封顶各自的 Maximum subtotal,整个 Adaptability
    因子封顶 500(= Manitoba Demand 单项就封顶,不是三块相加)。本表把三块拆成三个因子
    (adaptConnection/adaptDemand/adaptRegional),用 group="adaptability" + groupMax 复用
    §16 那套「组内封顶」的既有消费形状,不新造字段。
  · **Risk assessment**:官方唯一一个可以为负的因子,「外省工作经历」「外省学业经历」两项
    互不排斥、可以同时成立,存进 bonus(可加总)而不是 rows(单选);两项都触发时 -100-100=-200,
    与官方页尾 Maximum points -200 对上。
maxTotal(1000)官方页面没有印成一个单独的数字,是五个正向因子的 Maximum points/Adaptability
groupMax 相加算出来的(125+75+175+125+500=1000,Risk 是纯扣分项、不计入分制上限)——
这条推导也进自校,算不出 1000 就报错,不写死。
自校是硬闸:任何一个因子的自算 max 对不上官方自己印在表里的 Maximum points/Maximum subtotal,
或 1000 对不上,就**保留旧表不覆盖**,exit 1。"""

MBP_TIMEOUT_S = 40
"""EOI 页实抓超时。"""

MBP_FACTOR_TABLES = {
    "Language proficiency": "language",
    "Age": "age",
    "Years of work experience": "work",
    "Highest level of completed education": "education",
    "Adaptability factor": "adaptability",
    "Risk factor": "risk",
}
"""官方六张表的表头第一格文字 → 本站因素键(Adaptability 后面再拆成三个子因素)。"""

MBP_POINTS_RE = re.compile(r"^(-?\d+)(?:\s*per band)?$", re.I)
"""分值格(可为负;per band 后缀是语言表的写法)。"""

MBP_MAX_ROW_RE = re.compile(r"^Maximum (points|subtotal)$", re.I)
"""官方自己印的上限行。"""

MBP_MAX_ALL_LABEL = "__MAXALL__"
"""记号:Maximum points(整个因子的官方上限)。"""

MBP_MAX_SUB_LABEL = "__MAXSUB__"
"""记号:Maximum subtotal(当前子标题那一块的官方上限)。"""

MBP_MAX_POINTS_WORD = "points"
"""区分两种上限行的词。"""

MBP_CURLY_RIGHT = "’"
"""官方页用的右弯引号(&#8217;)。"""

MBP_CURLY_LEFT = "‘"
"""官方页用的左弯引号。"""

MBP_STRAIGHT_QUOTE = "'"
"""替换成的直引号。"""

MBP_FOOTNOTE_STAR_RE = re.compile(r"\*\s*$")
"""档位标签尾部的脚注星号(Risk 那行「…province*」)。"""

MBP_FIRST_SUB_PREFIX = "first"
"""语言表里 First Official Language 子块的判词。"""

MBP_LANG_FIRST_LABEL_TPL = "First Official Language — {label}"
"""首考语言档位的 label 前缀。"""

MBP_LANG_SECOND_LABEL_TPL = "Second Official Language — {label}"
"""二语档位的 label 前缀。"""

MBP_LANG_BANDS = 4
"""首考语言按 band 相加的项数(阅读/写作/听力/口语)。"""

MBP_LANG_RULE = ("First Official Language 每档是「per band」:阅读/写作/听力/口语四项各自按本表同一档"
                 "打分后相加(四项 CLB 不同档时应分别取值相加,不是查一次乘四);此处 max 按四项都在"
                 "最高档估算 = 25×4 + Second Official Language 25 = 125。"
                 " Second Official Language 按总体 CLB≥5 一次性加 25,不分项、不按 band 乘。")
"""语言因素的算法说明。"""

MBP_SIMPLE_FACTORS = (("age", ""), ("work", "fully recognized"), ("education", ""))
"""单表单选的三个因素(第二格 = bonus 判词,空串 = 没有 bonus)。"""

MBP_ADAPT = [("Connection to Manitoba", "adaptConnection"),
             ("Manitoba Demand", "adaptDemand"),
             ("Regional development", "adaptRegional")]
"""Adaptability 三个子块 → 三个因素键。"""

MBP_GROUP_ADAPTABILITY = "adaptability"
"""三个子因素的分组名。"""

MBP_ADAPT_CONNECTION = "adaptConnection"
"""子因素键:Connection to Manitoba。"""

MBP_ADAPT_DEMAND = "adaptDemand"
"""子因素键:Manitoba Demand。"""

MBP_ADAPT_REGIONAL = "adaptRegional"
"""子因素键:Regional development。"""

MBP_ADAPT_REGIONAL_RULE = (
    "Regional development 可与 Connection to Manitoba 组合相加(最高 200+50=250),"
    "但不能与 Manitoba Demand 叠加;Adaptability 因子总上限由 Manitoba Demand 单项封顶(见 groupMax.adaptability)。")
"""Regional development 的算法说明。"""

MBP_RISK_KEY = "risk"
"""因素键:Risk assessment。"""

MBP_RISK_RULE = "外省工作经历、外省学业经历互不排斥,可同时成立、按加总计(两项都触发 = -100-100 = -200)。"
"""Risk 因素的算法说明。"""

MBP_LANGUAGE_KEY = "language"
"""因素键:Language proficiency。"""

MBP_AGE_KEY = "age"
"""因素键:Age。"""

MBP_WORK_KEY = "work"
"""因素键:Years of work experience。"""

MBP_EDUCATION_KEY = "education"
"""因素键:Highest level of completed education。"""

MBP_ADAPTABILITY_KEY = "adaptability"
"""因素键:Adaptability(拆子块前的表键)。"""

MBP_MAX_TOTAL = 1000
"""官方 EOI 总分制(由五个正向因子推导出来,自校对不上就报错,不写死进产出)。"""

MBP_SYSTEM = "MPNP EOI"
"""分制名。"""

MBP_SOURCE = "MPNP Expression of Interest (EOI) — EOI ranking system, six factors"
"""表级来源名。"""

MBP_NOTE_LIVE = "live"
"""来路记号:实抓。"""

MBP_NOTE_CACHE = "cache"
"""来路记号:缓存回退。"""

MBP_PRINT_CACHE_TPL = "! httpx 实抓失败({detail}),回退读取 crawl 缓存(抓取日 {fetched})"
"""回退缓存的报数。"""

MBP_PRINT_NO_PAGE_TPL = "✗ httpx 实抓失败({detail}),crawl 缓存里也没有这页,无法产出"
"""实抓与缓存都拿不到的报数。"""

MBP_PROBLEM_MISSING_PREFIX = "页面上没找到这些因子表(改版了?):"
"""自校问题:缺因子表的抬头。"""

MBP_PROBLEM_LANG_HALF = "language: First/Second Official Language 有一块没解析到"
"""自校问题:语言两块。"""

MBP_PROBLEM_LANG_MAX_TPL = "language: 自算 {first}×4+{second}={total} ≠ 官方 Maximum points {official}"
"""自校问题:语言 max 对不上。"""

MBP_PROBLEM_EMPTY_TPL = "{key}: 一档都没解析到"
"""自校问题:某因素一档都没有。"""

MBP_PROBLEM_MAX_TPL = "{key}: 自算 max {computed} ≠ 官方 Maximum points {official}"
"""自校问题:某因素 max 对不上。"""

MBP_PROBLEM_ADAPT_EMPTY_TPL = "adaptability/{sub}: 一档都没解析到"
"""自校问题:某个 Adaptability 子块空。"""

MBP_PROBLEM_ADAPT_SUB_TPL = "adaptability/{sub}: 自算 max {computed} ≠ 官方 Maximum subtotal {official}"
"""自校问题:某个 Adaptability 子块 max 对不上。"""

MBP_PROBLEM_ADAPT_NO_MAX = "adaptability: 没解析到官方 Maximum points(整个因子的上限)"
"""自校问题:Adaptability 总上限缺失。"""

MBP_PROBLEM_ADAPT_TOTAL_TPL = ("adaptability: 自算组合上限 {computed} ≠ 官方 Maximum points {official}"
                               "(connection={connection} + regional={regional}"
                               " vs demand={demand})")
"""自校问题:Adaptability 组合上限对不上。"""

MBP_PROBLEM_RISK_EMPTY = "risk: 一档都没解析到"
"""自校问题:Risk 空。"""

MBP_PROBLEM_RISK_MAX_TPL = "risk: 自算 {computed} ≠ 官方 Maximum points {official}"
"""自校问题:Risk max 对不上。"""

MBP_PROBLEM_TOTAL_TPL = "五因子(不含 Risk)相加 = {total} ≠ 1000(官方 EOI 总分制)"
"""自校问题:总分推导对不上。"""

MBP_PRINT_DONE_TPL = "✓ {path}  {total} 分制({note} 抓取,fetched={fetched}),passMark=null(无固定门槛,靠 LAA 抽选线)"
"""MB 分值表收尾报数。"""

MBP_PRINT_FACTOR_TPL = "  {key:16} 组{group:12} {rows} 档 + {bonus} 项加分  最高 {max_n}"
"""逐因素报数。"""


# =========================================================================
# 30. NL EE 分值表(Annex A,100 分制,67 分线;英文档报数原样保留)
# =========================================================================

NLP_PDF_URL = "https://www.gov.nl.ca/immigration/files/AnnexA_PNP.pdf"
"""NLPNP Express Entry Skilled Worker Point Assessment Grid(Annex A)。
The province-wide EOI introduced in 2025 is not a numeric points contest: OIM publishes
non-exhaustive prioritization criteria and may change their weight. This builder therefore
extracts only the separate Express Entry Skilled Worker Point Assessment Grid that the
current category page explicitly links and requires at 67/100."""

NLP_PAGE_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                "provincial-nominee-program/applicants/express-entry-skilled-worker/")
"""Express Entry Skilled Worker 通道页(pass mark 现取)。"""

OUT_NL_POINTS = paths.PNP / "nl-points.json"
"""NL 分值表落盘处 → 09_build_mart.py → pnp_score_factors。
The output is replaced only after the PDF rows, section maxima, total and current category
page pass mark all validate. A maintenance page or changed document leaves the old table
untouched."""

NLP_PDF_TIMEOUT_S = 60
"""Annex A PDF 抓取超时。"""

NLP_PAGE_TIMEOUT_S = 40
"""通道页抓取超时。"""

NLP_PDF_MAGIC = b"%PDF"
"""PDF 魔数(官方 URL 维护期会返回 HTML,先认字节)。"""

NLP_TEXT_MODE = "text"
"""pymupdf 取文的模式参数。"""

NLP_QUOTE_RIGHT = "’"
"""右弯引号。"""

NLP_QUOTE_LEFT = "‘"
"""左弯引号。"""

NLP_QUOTE_PLAIN = "'"
"""替换成的直引号。"""

NLP_DASH_EN = "–"
"""短破折号。"""

NLP_DASH_EM = "—"
"""长破折号。"""

NLP_DASH_PLAIN = "-"
"""替换成的普通连字符。"""

NLP_SOFT_HYPHEN = "­"
"""软连字符(直接删)。"""

NLP_TAG_RE = re.compile(r"<[^>]+>")
"""通道页剥标签。"""

NLP_MARK_RE = re.compile(r"Minimum\s+(\d{2})\s+points on the NLPNP Point Assessment Grid", re.I)
"""通道页现取的 pass mark。"""

NLP_NUM_RE = re.compile(r"(?<![A-Za-z])(-?\d{1,3})(?![A-Za-z])")
"""段内取数(前后不许粘字母)。"""

NLP_OR_TAIL_RE = re.compile(r";?\s+OR$", re.I)
"""标签尾部的「; OR」。"""

NLP_YEAR_ROW_RE = re.compile(r"\b([1-5]) years?\s+(\d{1,2})\b", re.I)
"""工作经验档:「3 years 9」。"""

NLP_YEAR_LABEL_TPL = "{years} year{plural}"
"""工作经验档的 label。"""

NLP_YEAR_ONE = "1"
"""单数年判据。"""

NLP_CLB_ROW_RE = re.compile(r"CLB\s+([5-8])(?:\s+and higher)?\s+(\d{1,2})\b", re.I)
"""语言档:「CLB 8 and higher 27」。"""

NLP_CLB_LABEL_TPL = "CLB {clb}{tail}"
"""语言档的 label。"""

NLP_CLB_TOP = "8"
"""带「and higher」尾巴的那一档。"""

NLP_CLB_TAIL = " and higher"
"""语言档的尾巴。"""

NLP_EDU_START = "FACTOR I (A): EDUCATION & TRAINING"
"""学历节的起锚。"""

NLP_EDU_END = "FACTOR I (B): SKILLED WORK EXPERIENCE"
"""学历节的止锚。"""

NLP_WORK5_START = "(A) WORK EXPERIENCE DURING THE MOST RECENT FIVE YEARS"
"""近五年经验节的起锚。"""

NLP_WORK610_START = "(B) WORK EXPERIENCE DURING THE SIX TO 10-YEAR"
"""6-10 年经验节的起锚(也是近五年节的止锚)。"""

NLP_LANG_START = "FACTOR I (C): LANGUAGE ABILITY"
"""语言节的起锚(也是 6-10 年经验节的止锚)。"""

NLP_AGE_START = "FACTOR I (D): AGE"
"""年龄节的起锚(也是语言节的止锚)。"""

NLP_CONN_START = "FACTOR II: CONNECTION TO LABOUR MARKET"
"""劳动力市场关联节的起锚(也是年龄节的止锚)。"""

NLP_EDU_LABELS = [
    "Master's or Doctorate degree; OR",
    "University Degree that required at least three years of full-time study; OR",
    "Trade certification equivalent to journeyperson status in Newfoundland and Labrador",
    "Degree, diploma or certificate that required at least two years of full-time post-secondary study",
    "Degree, diploma or certificate that required at least one year of full-time post-secondary study",
]
"""学历节的官方档位序。"""

NLP_AGE_LABELS = ["<18 years", "18-21 years", "22-33 years", "34-45 years", "46-50 years", ">50 years"]
"""年龄节的官方档位序。"""

NLP_CONN_LABELS = [
    "Close relative in Newfoundland and Labrador",
    "Previous work experience in Newfoundland and Labrador",
    "Previous student experience in Newfoundland and Labrador",
    "MAXIMUM POINTS TOTAL",
]
"""劳动力市场关联节的官方档位序(末条是总分行,取完切掉)。"""

NLP_EDU_MAX = 28
"""学历节上限。"""

NLP_WORK5_MAX = 15
"""近五年经验节上限。"""

NLP_WORK610_MAX = 7
"""6-10 年经验节上限。"""

NLP_LANG_MAX = 27
"""语言节上限。"""

NLP_AGE_MAX = 12
"""年龄节上限。"""

NLP_CONN_MAX = 13
"""劳动力市场关联节上限。"""

NLP_WORK_GROUP = "WORK"
"""两块工作经验的分组名。"""

NLP_WORK_GROUP_MAX = 20
"""工作经验组的组上限。"""

NLP_EXPECTED = {
    "education": [28, 23, 23, 18, 15],
    "work5": [15, 12, 9, 6, 3],
    "work610": [7, 6, 5, 4, 2],
    "language1": [27, 23, 21, 19],
    "age": [0, 8, 12, 10, 8, 0],
    "connection": [7, 3, 3],
}
"""逐因素的官方分值序(金标;对不上就是解析串了)。"""

NLP_CONNECTION_KEY = "connection"
"""存进 bonus 的那个因素键。"""

NLP_EDUCATION_KEY = "education"
"""因素键:学历。"""

NLP_WORK5_KEY = "work5"
"""因素键:近五年经验。"""

NLP_WORK610_KEY = "work610"
"""因素键:6-10 年经验。"""

NLP_LANGUAGE_KEY = "language1"
"""因素键:语言。"""

NLP_AGE_KEY = "age"
"""因素键:年龄。"""

NLP_PASS_MARK = 67
"""官方 pass mark(通道页现取,对不上就报错)。"""

NLP_MAX_TOTAL = 100
"""官方总分制。"""

NLP_WORK_TOTAL_IN_SUM = 20
"""总分核算时工作经验组按组上限计入。"""

NLP_SYSTEM = "NLPNP Point Assessment Grid (Express Entry Skilled Worker)"
"""分制名。"""

NLP_SOURCE = "NLPNP Express Entry Skilled Worker Category Application Guide - Annex A"
"""表级来源名。"""

NLP_FAIL_HEADER = "NL points grid validation failed; existing output was not replaced:"
"""自校未过的抬头(本段英文档,原样保留)。"""

NLP_FAIL_BULLET = " -"
"""自校问题的行前缀(本段英文档)。"""

NLP_PROBLEM_NOT_PDF = "official Annex A URL did not return a PDF (maintenance or changed URL)"
"""自校问题:拿回来的不是 PDF。"""

NLP_PROBLEM_PASS_TPL = "current category page pass mark is {mark!r}, expected 67"
"""自校问题:pass mark 对不上。"""

NLP_PROBLEM_ROWS_TPL = "{key}: parsed {got}, expected {expected}"
"""自校问题:某因素分值序对不上。"""

NLP_PROBLEM_TOTAL = "factor maxima do not add to the official 100-point total"
"""自校问题:各因素上限加不出 100。"""

NLP_PRINT_DONE_TPL = "OK {path} - 100 points, pass mark {mark}"
"""NL 分值表收尾报数(本段英文档)。"""

# =========================================================================
# 31. NL 指定雇主名录(纯本地缓存读取,不发一个 HTTP 请求)
# =========================================================================

NLE_ENTRY_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                 "atlantic-immigration-program/designated-employers")
"""名录入口页(Atlantic Immigration Program Designated Employers)——639 个
/immigration/employer/<slug> 子页都是从这张表点进去的(crawl 役按 depth 抓到,页面本身另有一份
同源的 <table> 汇总,未采用:铁律要求逐雇主页原文核对,汇总表只用来交叉验证条数)。"""

NLE_EMPLOYER_PREFIX = "https://www.gov.nl.ca/immigration/employer/"
"""雇主子页的地址前缀(manifest 里按它筛页)。"""

IN_NL_MANIFEST = paths.CRAWL / "nl-imm" / "manifest.json"
"""crawl 役 nl-imm 种子的页清单(**纯本地读取,W4 拍板不联网**)。"""

IN_NL_HTML_CACHE = paths.CRAWL / "nl-imm" / "html_cache"
"""crawl 役 nl-imm 种子的页面原文目录。"""

OUT_NL_EMPLOYERS = paths.PNP / "nl-employers.json"
"""NL 指定雇主名录落盘处 —— 雇主名 + 所在地 + 申报的 NOC 职位。
页面结构(2026-08-05 抽 8 页人肉核对,639 页全一致):
    <h1 class="entry-title">雇主名</h1>
    <dl>
      <dt>Location</dt><dd>...</dd>
      <dt>Date Designated</dt><dd>...</dd>
      <dt>NAICS Code</dt><dd>...</dd>
      <dt>NOC's Requested</dt><dd>72310, 94219</dd>
    </dl>
一家(1342205 Ontario Ltd.)连 <dl> 都是空的——照收,location/nocs 留空,
「639 家里这家什么都没申报」本身就是分母的一部分,不能因为字段空就整条丢弃。
⚠️ **NOC 口径**:`NOC's Requested` 这一格官方只给**裸码**(4 位 NOC 2016 或 5 位 NOC 2021,
两种版本混着来,同一年份内都有),从没写过职位名文本。所以本站不替它拼职位名——
`title` 一律 `null`,禁止拿 etl/noc.py 的官方名表去反查再塞回来:那是「查表填空」不是
「照抄页面」,一旦裸码是旧版 NOC 2016(结构表只收 2021 五位),查出来的名字就会张冠李戴。
真出现「有职位名没码」的情况(本次抽查 639 页一次没见过)才会落 {"noc": null, "title": ...}。"""

NLE_LABEL = "NL 官网指定雇主名录"
"""表级前端标签。"""

NLE_SOURCE = "NLPNP designated employers"
"""表级来源名。"""

NLE_ENTRY_TITLE_CLASS = "entry-title"
"""雇主名所在 h1 的类名。"""

NLE_FIELD_LOCATION = "Location"
"""定义列表里的所在地字段名。"""

NLE_FIELD_NOCS = "NOC's Requested"
"""定义列表里的 NOC 字段名。"""

NLE_NOC_CODE_RE = re.compile(r"\d{3,5}")
"""裸码 3-5 位数字(4 位=NOC2016,5 位=NOC2021;3 位偶见,原样收)。"""

NLE_STATUS_OK = 200
"""manifest 里只认 200 的页。"""

NLE_SKIP_SHOW = 10
"""跳过清单最多打印几条。"""

NLE_SKIP_MORE = " ..."
"""跳过清单还有更多时的尾巴。"""

NLE_NOC_PROBE = "72310"
"""收尾报数里探一个具体 NOC 的命中(木匠,判定层的老熟人)。"""

NLE_PRINT_IN_MANIFEST_TPL = "IN_MANIFEST: {path}"
"""开工报输入(manifest)。"""

NLE_PRINT_IN_CACHE_TPL = "IN_HTML_CACHE: {path}"
"""开工报输入(html_cache)。"""

NLE_PRINT_NO_MANIFEST_TPL = "  ✗ 找不到 {path}(crawl 役没跑过这个种子?)"
"""manifest 缺失的报数。"""

NLE_PRINT_DONE_TPL = "✓ 雇主 {n} 家(缓存子页 {pages} 个,跳过 {skipped} 个)→ {path}"
"""名录收尾报数。"""

NLE_PRINT_FETCHED_TPL = "  fetched={fetched}"
"""取回日期报数。"""

NLE_PRINT_NOC_STATS_TPL = ("  申报 ≥1 个 NOC 码的雇主: {with_noc} 家 / 完全没申报(nocs=[]): {no_noc} 家 / "
                           "只有职位名无码(title-only): {codeless} 家")
"""NOC 申报口径报数。"""

NLE_PRINT_TOTAL_CODES_TPL = "  NOC 码总数(含重复): {n}"
"""NOC 码总数报数。"""

NLE_PRINT_PROBE_TPL = "  NOC 72310 命中: {n} 家 → {names}"
"""探针 NOC 报数。"""

NLE_PRINT_SKIPPED_TPL = "  跳过(缓存文件缺失或解不出雇主名): {shown}{more}"
"""跳过清单报数。"""


# =========================================================================
# 32. SK Job Offer 排除清单(Employment Offer 子类别专属的另一张表)
# =========================================================================

SKJ_PDFS = [
    {"product": 102709, "fmt": 113851, "out": "sinp-102709-excluded-occupations.pdf",
     "desc": "Excluded Occupation List (OID/EE)"},
    {"product": 123540, "fmt": 149130, "out": "sinp-123540-joboffer-excluded.pdf",
     "desc": "Excluded Business Types and Occupations for SINP Job Offer Categories"},
]
"""两个 PDF,URL 从已抓页面(data/crawl/sk-sinp/)原文提取,不是猜的:
  a) 102709/113851 — Excluded Occupation List(OID/EE 那张,§4 已经在抓这份)
  b) 123540/149130 — Excluded Business Types and Occupations for SINP Job Offer Categories(本段要的)
两份都下载留痕(同目录 data/crawl/sk-sinp/),但只解析 (b)。
背景(2026-08-05 核实,原句见 data/crawl/sk-sinp/ 缓存的 occupation-restrictions-and-requirements 页):
sk-excluded.json 那张 152 条清单只管 Occupations In-Demand(OID)和 Express Entry(EE)两个子类别;
Employment Offer 是雇主 offer 制,不受它约束,管它的是另一张表。"""

SKJ_CRAWL_DIR = paths.CRAWL / "sk-sinp"
"""两份 PDF 的留痕目录。"""

SKJ_DL_TPL = "https://publications.saskatchewan.ca/api/v1/products/{p}/formats/{f}/download"
"""PDF 下载地址模板(与 §4 同一个端点,两段各写一份免得一处改动牵两处)。"""

SKJ_TIMEOUT_S = 60
"""PDF 下载超时。"""

SKJ_JOBOFFER_PDF = "sinp-123540-joboffer-excluded.pdf"
"""要解析的那份 PDF 的文件名。"""

OUT_SK_JOBOFFER_FILE = "sk-joboffer-excluded.json"
"""Job Offer 排除清单的产出文件名。"""

SKJ_APPLIES_TO = "Employment Offer"
"""本表管的子类别。"""

SKJ_ROW_RE = re.compile(r"^\s*(\d{5})\s+(\*?[A-Za-z].*?)\s*$")
"""两列表格并成一行的写法;本表个别行带脚注星号前缀(如「*Massage therapist…」),
名称起始允许 * 或字母。"""

SKJ_CODE_RE = re.compile(r"^\s*(\d{5})\s*$")
"""拆成相邻两行时的 NOC 行(同 §4 的口径)。"""

SKJ_STAR_PREFIX_RE = re.compile(r"^\*+\s*")
"""脚注星号前缀非职业名一部分,去掉。"""

SKJ_STAR = "*"
"""下一行以星号开头也算职业名。"""

SKJ_PDF_MAGIC = b"%PDF-"
"""PDF 魔数(下载后确认)。"""

SKJ_HEAD_BYTES = 8
"""打印确认时看前几个字节。"""

SKJ_STREAM = "SINP Employment Offer"
"""本表的官方通道名。"""

SKJ_LABEL = "SK Job Offer 不合格清单"
"""本表的前端短标签。"""

SKJ_NOTE = ("SINP International Skilled Worker: With an Employment Offer 子类别的排除清单——"
            "与 sk-excluded.json(OID/EE 排除清单)是两张不同的表,互不通用。"
            "官方原句(PDF):「The following occupations are not eligible for the SINP "
            "sub-categories requiring a job offer and JAL from a Saskatchewan employer "
            "unless certain requirements, listed below, are met.」即多数行是**条件性排除**"
            "(如持有效 LMIA/CUAET 工签在萨省该职业已在职则不受限);"
            "本表 name 字段为 PDF 逐行解析,长条件文本可能截到第一行,完整条件请查 PDF 原文。")
"""本表的口径说明(官方原句 quote-anchored)。"""

SKJ_PROBE_NOC = "72310"
"""收尾报数里探的那个 NOC(木匠)。"""

SKJ_PRINT_DL_FAIL_TPL = "  ✗ 下载失败 {out}: {name} {detail}"
"""PDF 下载失败的报数。"""

SKJ_PRINT_DL_TPL = "  {mark} {desc}: {size:,} bytes, 头字节 {head!r} → {path}"
"""PDF 下载确认的报数。"""

SKJ_PRINT_NO_PDF = "  ✗ Job Offer 排除清单 PDF 没下到,跳过解析"
"""PDF 没下到的报数。"""

SKJ_PRINT_NO_NOC = "  ✗ Job Offer 排除清单没解析到 NOC(not-collected,保留旧表/不产出)"
"""解析空的报数。"""

SKJ_PRINT_DONE_TPL = "  ✓ SK Job Offer 排除 {n:>3} 个职业 → pnp/{out}  (实时 {fetched})"
"""收尾报数。"""

SKJ_PRINT_PROBE_HIT_TPL = "  → 72310 carpenter 在 Job Offer 排除清单内: {name}"
"""探针命中的报数。"""

SKJ_PRINT_PROBE_MISS = "  → 72310 carpenter 不在 Job Offer 排除清单内"
"""探针未命中的报数。"""


# =========================================================================
# 33. 抽选流名中文灰注(本地 Ollama 意译;非默认链,手动跑)
# =========================================================================

IN_DRAWS_FOR_ZH = paths.PNP / "draws.json"
"""灰注的取词来源(全部省块的 distinct stream 名)。
范围(#280,Frank 走查:zh 态弹框「最近抽选」卡与 /start 抽选表满屏英文流名)= draws.json 全部
省块(实测有抽选记录的是 AB/BC/MB/NB/NL/ON,其余省走门槛/分制表没有逐期抽选流)的 distinct
stream 名(2026-08-08 实测 41 个,远低于「预计 <200」的口径线,一遍能跑完不用分批预算)。
联邦(FED)轮次不在范围 —— 那边的 label 是数据层已有的封闭枚举(cat_key),
i18n.ts 的 EE_KEY_L10N 已经全量三语映射(eeKeyDisplay),不重复造轮子。"""

OUT_DRAW_STREAM_ZH = paths.PROCESSED / "draw_stream_zh.json"
"""灰注缓存:{ stream(原文): { zh, translatedAt } },增量落盘可断点续跑 —— 已翻译过的 stream
直接跳过,只翻新出现的。09_build_mart.py 读这份缓存给 pnp_draws.streamZh 列;缓存里没有的
stream(还没跑到 / 翻译失败)该列留空,前端优雅回退纯英文(不是「缺失时报错」,是「缺失时不出注」,
与站规「宁可留空也不瞎猜」一致)。"""

ZH_OLLAMA_URL = "http://192.168.1.150:11434/api/generate"
"""本地 Ollama 端点(不烧付费 API)。"""

ZH_MODEL = "qwen3.6:latest"
"""本地模型(/no_think,零温)。"""

ZH_TEMPERATURE = 0
"""零温 = 可复现。"""

ZH_TIMEOUT_S = 60
"""单条翻译超时。"""

ZH_CJK_RE = re.compile(r"[一-鿿]")
"""校验:结果里必须有汉字。"""

ZH_PROMPT_TPL = (
    "/no_think 把这个加拿大省提名(PNP)抽选通道名意译成简体中文短注,给不懂英文的申请人看的人话短语,"
    "不是逐字直译。只输出短注本身,一行,不要拼音、不要解释、不要引号、不超过 12 个汉字。"
    "通道名:{name}"
)
"""意译提示词。手法同 etl/clean/_enrich_shelf_aliases.py 的 qwen_translate:官方专有名保留在
主文案(前端仍显示 stream 原文英文),这里只产**中文灰注短语** —— 要那种一看就懂的人话短注
(「Skilled Worker Stream」→「技术工人通道」),不是逐字直译。"""

ZH_STRIP_CHARS = '"「」『』\''
"""模型输出两端要剥的引号。"""

ZH_MAX_LEN = 20
"""校验:短注不超过多少字(非空、含中文、单行、≤20 字、zhconv 转简体 —— qwen3 偶发吐繁体;
校验不过 = 该条不写入缓存,下轮重试,绝不把英文原文或半吊子译文当中文注塞进去)。"""

ZH_LOCALE_CN = "zh-cn"
"""zhconv 的目标区域(转简体)。"""

ZH_SAVE_EVERY = 10
"""每翻多少条落一次盘(断点续跑)。"""

ZH_PRINT_IN_OUT_TPL = "IN_DRAWS={in_path}\nOUT={out_path}"
"""开工报输入输出。"""

ZH_PRINT_TODO_TPL = "库内 distinct 流名 {total} 个,待翻 {todo}(已缓存 {cached})"
"""开工报数。"""

ZH_PRINT_BAD_TPL = "  ✗ 校验未过,下轮重试: {name!r}"
"""单条校验未过的报数。"""

ZH_PRINT_PROGRESS_TPL = "  {done}/{total} · 命中 {hit}"
"""进度报数。"""

ZH_PRINT_DONE_TPL = "done → {path} · 本轮翻译 {done}/{todo}(累计缓存 {cached})"
"""收尾报数。"""


# =========================================================================
# 34. 名额公告哨兵(只提醒不写表;失败不拦役)
# =========================================================================

IN_ALLOC_TABLE = paths.IRCC / "pnp_allocations.json"
"""人工核对维护表(哪些 (省,年) 还空着 → 监视目标)。"""

OUT_ALLOC_WATCH = paths.IRCC / "allocation_watch.json"
"""哨兵 state(已见命中,去重用)。
盯的问题:pnp_allocations.json 里还空着的 (省, 年) 名额,官方页什么时候公布。
crawl 役每小时抓九省官网原文进 data/crawl/<slug>/html_cache,news 役 12h 聚合官方公告 ——
但雷达只报「URL 变了」,没人盯「名额数字出现了」。本哨兵每轮把两处原文 grep 一遍:
「allocat*」±窗口内同时出现目标年份 + 合理量级数字 → 疑似公告,打「!」日志行
(auto_update 把 !/✗ 开头行记 ERROR 级,容器日志里一眼可见)。
**只提醒不写表**:配额表是人工核对制(Frank 抽查),自动写入违背其设计;state 文件只做去重,
同一条命中不月月重复喊。哨兵自身任何失败都不拦役,命中与否不算失败。"""

WATCH_SLUG_PROV = {
    "ns-root": "NS", "nb-imm": "NB", "nl-imm": "NL", "pe-imm": "PE",
    "mb-mpnp": "MB", "mb-root": "MB", "sk-sinp": "SK", "ab-aaip": "AB",
    "bc-immigrate": "BC", "on-oinp": "ON", "oinp-times": "ON",
}
"""crawl slug → 省码(只扫有监视目标的省;联邦种子不扫 —— 名额公告发在省官网/省新闻)。"""

WATCH_PROV_NAMES = {
    "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE", "Nova Scotia": "NS",
    "New Brunswick": "NB", "Ontario": "ON", "Manitoba": "MB",
    "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
}
"""省名 → 省码(窗口里点名的省名优先,同页可能列多省)。"""

WATCH_WINDOW = 220
"""「allocat」两侧各取多少字符作上下文。"""

WATCH_N_MIN = 200
"""名额量级下界(历年区间 1,025–21,500;出界=年份/电话号等噪声)。"""

WATCH_N_MAX = 30000
"""名额量级上界。"""

WATCH_YEAR_MIN = 2000
"""2000–2100 一律当年份剔掉:「2,025」这种带逗号的年份是首轮实测的头号假命中。"""

WATCH_YEAR_MAX = 2100
"""年份剔除区间上界。"""

WATCH_MAX_ALERTS = 20
"""单轮最多喊多少条新命中(首轮防刷屏;state 照记全量)。"""

WATCH_ALLOC_RE = re.compile(r"allocat", re.I)
"""名额句的起点判词。"""

WATCH_NOM_RE = re.compile(r"nominat|spaces|spots", re.I)
"""光有 allocat 不够:窗口里得真在说提名名额。"""

WATCH_NUM_RE = re.compile(r"\b(\d{1,2},\d{3}|[1-9]\d{2,4})\b")
"""窗口里的数字。"""

WATCH_TAG_RE = re.compile(r"<(?:script|style)\b.*?</(?:script|style)>|<[^>]+>", re.S | re.I)
"""html_cache 剥标签。"""

WATCH_YEAR_FIELD_RE = re.compile(r"y20\d\d")
"""人工配额表的年份字段名(y2026)。"""

WATCH_YEAR_FIELD_TPL = "y{year}"
"""按年份拼字段名。"""

WATCH_QUOTE_CLIP = 180
"""命中上下文的截断长度。"""

WATCH_HTML_GLOB = "*.html"
"""html_cache 的文件模式。"""

WATCH_CACHE_DIR = "html_cache"
"""crawl 每个 slug 下的原文目录名。"""

WATCH_SRC_TPL = "{slug}/{name}"
"""命中来源(crawl 档)。"""

WATCH_SRC_NEWS = "news"
"""命中来源(news 档没有 url 时的占位)。"""

WATCH_NEWS_TEXT_TPL = "{title}\n{body}"
"""news 条目拼成待扫文本。"""

WATCH_KEY_TPL = "{prov}:{year}:{n}"
"""命中去重键。"""

WATCH_NOTE = "名额公告哨兵 state(去重用)。命中≠核实:数字进 pnp_allocations.json 前必须人工回官方页核对原句。"
"""state 的口径说明。"""

WATCH_PRINT_IN_OUT_TPL = "IN_ALLOC={alloc}\nIN_CRAWL={crawl}\nIN_NEWS={news}\nOUT_STATE={state}"
"""开工报输入输出。"""

WATCH_PRINT_NO_TABLE = "✗ 配额表不存在,哨兵空转"
"""配额表缺失的报数。"""

WATCH_PRINT_NS_MISSING_TPL = "! NS {year} 名额官方有数({official:,})而人工表空着 —— 去补 pnp_allocations.json"
"""NS 对账:官方有数我们空着。
每轮都喊(不进 state 去重)—— 对不上就该一直响,修对了自然静音。"""

WATCH_PRINT_NS_DIFF_TPL = "! NS {year} 名额对账不一致:人工表 {ours:,} vs 官方 {official:,}({file})"
"""NS 对账:两边数字不一致。"""

WATCH_PRINT_NS_FAIL_TPL = "✗ NS 对账失败({name}),跳过"
"""NS 对账本身失败的报数。"""

WATCH_PRINT_NEWS_FAIL_TPL = "✗ news.json 读取失败({name}),跳过该源"
"""news 源读取失败的报数。"""

WATCH_PRINT_HIT_TPL = "! {prov} {year} 名额疑似公告:{n:,} —— “{quote}” ({src})"
"""单条新命中的报数。"""

WATCH_PRINT_MORE_TPL = "! …另有 {n} 条新命中,详见 {file}"
"""超出单轮上限的报数。"""

WATCH_PRINT_DONE_TPL = "✓ 哨兵扫 {scanned} 份文本 · 监视 {provs} 省 · 新命中 {fresh} · 累计 {seen}"
"""哨兵收尾报数。"""

WATCH_PRINT_CRASH_TPL = "✗ 哨兵异常退出({name}: {detail})—— 不拦役,下轮重试"
"""哨兵自身异常的报数(报错但不拦役)。"""


# =========================================================================
# 35. 金标体检(C01 马龙/木匠/72310;2026-08-31 批D 自 ops/audit_c01_gold.py 收编)
# =========================================================================

C01_T_SCORE = "pnp_score_factors"
"""体检表:EOI 分值因子。"""

C01_T_DRAWS = "pnp_draws"
"""体检表:省抽选轮次。"""

C01_T_OCC = "pnp_occupations"
"""体检表:省职业清单(含排除)。"""

C01_T_EMP = "designated_employers"
"""体检表:指定雇主。"""

C01_T_OPS = "pnp_ops_stats"
"""体检表:省运营统计。"""

C01_MART_FILE_TPL = "{name}.json"
"""mart 一表一文件的文件名形。"""

K_KIND = "kind"
"""mart 行键:pnp_draws 的行类别(draw/notice)。"""

K_DRAW_DATE = "drawDate"
"""mart 行键:抽选日期。"""

K_FACTOR_MAX = "factorMax"
"""mart 行键:因子上限(MB 风险因子 −200)。"""

K_METRIC = "metric"
"""mart 行键:运营统计指标名。"""

K_PERIOD = "period"
"""mart 行键:运营统计期间。"""

C01_PROV_MB = "MB"
"""案例主省(曼省 EOI 打分)。"""

C01_PROV_NB = "NB"
"""对照省:NB 定向邀请轮次。"""

C01_PROV_SK = "SK"
"""对照省:SINP 排除清单适用范围。"""

C01_PROV_NL = "NL"
"""对照省:指定雇主计数。"""

C01_PROV_ON = "ON"
"""对照省:OINP 运营统计。"""

C01_KIND_DRAW = "draw"
"""pnp_draws 里「真实抽选」的行类别值。"""

C01_F_AGE = "age"
"""因子名:年龄。"""

C01_F_WORK = "work"
"""因子名:工作。"""

C01_F_EDU = "education"
"""因子名:学历。"""

C01_F_LANG = "language"
"""因子名:语言。"""

C01_F_RISK = "risk"
"""因子名:风险。"""

C01_HAS_ONE_YEAR = "one year"
"""label 命中词:工作 1 年档。"""

C01_HAS_TWO_YEARS = "program of two years"
"""label 命中词:两年制学历档。"""

C01_HAS_STUDIES = "studies"
"""label 命中词:外省学习风险档。"""

C01_MB276_DATE = "2026-07-30"
"""MB #276 抽选日(score 632)。"""

C01_MB275_DATE = "2026-07-16"
"""MB #275 抽选日(score 825;与 #276 的 193 分差从此可定量)。"""

C01_NOTE_CONS = "construction trades"
"""NB 定向轮次 note 命中词(建筑类)。"""

C01_YEAR_2026 = "2026"
"""NB 轮次年份前缀 / OINP 配额期间。"""

C01_PERIOD_2025 = "2025"
"""OINP 提名数期间。"""

C01_TYPE_INELIGIBLE = "ineligible"
"""pnp_occupations 排除行的 type 值。"""

C01_APPLIES_OIDEE = "OID/EE"
"""SK 排除清单适用范围:OID/EE 子类别。"""

C01_APPLIES_JO = "Employment Offer"
"""SK 排除清单适用范围:Job Offer 子类别。"""

C01_NOC_CARPENTER = "72310"
"""案例职业:木匠。"""

C01_METRIC_ALLOC = "allocation"
"""运营统计指标:年度配额。"""

C01_METRIC_NOMS = "nominations_issued"
"""运营统计指标:已发提名。"""

C01_L_ROWS_TPL = "pnp_score_factors MB:{n} 行"
"""开场报数行。"""

C01_OK_TPL = "  ✓ {name}"
"""单条体检过。"""

C01_BAD_TPL = "  ✗ {name}"
"""单条体检不过。"""

C01_DETAIL_TPL = "  ({detail})"
"""体检行的补充说明尾巴(有 detail 才拼)。"""

C01_L_AGE = "MB 年龄 40 岁档 = 75"
"""体检:年龄分档。"""

C01_L_WORK = "MB 工作 1 年档 = 40"
"""体检:工作分档。"""

C01_L_EDU = "MB 两年制学历档 = 100"
"""体检:学历分档。"""

C01_L_CLB6 = "MB 语言 CLB6 单项 = 20(×4=80)"
"""体检:语言 CLB6(语言按单项 CLB 打分:CLB6 每项 20 → 四项 80)。"""

C01_L_CLB8 = "MB 语言 CLB8 单项 = 25(拉满多 20)"
"""体检:语言 CLB8(每项 25 → 100,与 CLB6 差 20)。"""

C01_L_ADAPT = "MB 适应性 500 满档存在"
"""体检:适应性满档。"""

C01_L_RISK_STUDY = "MB 风险:外省学习 −100"
"""体检:外省学习风险扣分。"""

C01_L_RISK_MAX = "MB 风险因子上限 −200"
"""体检:风险因子上限。"""

C01_L_TOTAL = "案例合计 695 可复现"
"""体检:马龙估分 695 = 80+75+40+100+500−100。"""

C01_L_MB276 = "MB #276(2026-07-30)score 632 成行"
"""体检:MB 抽选 #276。"""

C01_L_MB275 = "MB #275(2026-07-16)score 825 成行"
"""体检:MB 抽选 #275。"""

C01_L_NB_ROUNDS = "NB 2026 建筑类轮次 ≥5"
"""体检:NB 定向轮次活跃度。"""

C01_L_NB_JULY = "NB 7 月三轮(58/209/114)在列"
"""体检:NB 七月三轮邀请数。"""

C01_L_SK_OIDEE = "SK 排除清单 152 条全带 appliesTo=OID/EE"
"""体检:SK 排除清单只管 OID/EE。"""

C01_L_SK_JO = "SK Job Offer 排除清单已入(14 条)"
"""体检:SK Job Offer 子清单。"""

C01_L_SK_72310 = "72310 不在 Job Offer 排除清单"
"""体检:木匠不被 Employment Offer 排除(C01 案例的关键前提)。"""

C01_L_NL_COUNT = "NL 雇主 645 家"
"""体检:NL 指定雇主总数。修正注记(金标被数据推翻的沿革,案例文档已随 docs 清仓沉 git,
本 docstring 即活记录):C01 原文 645/1 → 08-05 逐页核实改 639/3 → 2026-08-31 批D 金标红,
考古=官方名录 08-30 抓取真长到 645(gov.nl.ca 逐司页 URL 在 raw/pnp/nl-employers.json
每行可点验),按官方新数改回 645。"""

C01_L_NL_CARP = "NL 申报 72310 的 = 4 家"
"""体检:NL 申报过木匠的雇主数。修正注记(2026-08-31):3 → 4 —— 官方名录新增
Green Bay Fibre Products 与 Hyde Park Homes 两家申报 72310(Baie Verte 仍在,
逐司页 URL 可点验);对马龙案例是利好(担保池变宽)。"""

C01_L_ON_ALLOC = "OINP 2026 配额 14,119"
"""体检:OINP 年度配额入库。"""

C01_L_ON_NOMS = "OINP 2025 提名数 10,750"
"""体检:OINP 提名数入库(审理时长=举证过的 not-collected,不设断言)。"""

C01_D_ROUNDS_TPL = "实际 {n} 轮"
"""detail:轮次计数。"""

C01_D_COUNT_TPL = "实际 {n}"
"""detail:行计数。"""

C01_D_JULY_TPL = "命中 {hit}"
"""detail:七月三轮命中集合。"""

C01_HIT_SEP = "; "
"""detail:雇主名清单分隔。"""

C01_HIT_MAX_LEN = 90
"""detail:雇主名清单截断长度。"""

C01_PASS_TPL = "✓ 金标全绿"
"""收口:全绿。"""

C01_FAIL_TPL = "✗ {n} 条不过:{names}"
"""收口:有红(逐条名单;任何一条不过 = 数据层 bug,不许改金标凑数;金标本身被数据
推翻时先逐页核实、改案例文档、再改这里,带修正注记)。"""

C01_FAIL_SEP = ", "
"""收口:不过名单分隔。"""

# =========================================================================
# 36. 门槛取证器(gate manifest;2026-08-31 批D 自 ops/scan_gate_quotes.py 收编)
# =========================================================================

GQ_PATHWAYS: dict[str, tuple[str, str]] = {
    "FED-EE":         ("fed-ee",       r"express-entry"),
    "AIP":            ("fed-aip",      r"atlantic-immigration"),
    "RCIP":           ("fed-rcip",     r"rural-community|rural-franco"),
    "ON-workforce":   ("on-oinp",      r"ontario-workforce-priority-stream$"),
    "NB-sw":          ("nb-imm",       r"."),
    "NS-sw":          ("ns-root",      r"skilled-worker"),
    "SK-offer":       ("sk-sinp",      r"employment-offer|international-skilled-worker"),
    "MB-swm":         ("mb-mpnp",      r"skilled-worker/swm"),
    "AB-opportunity": ("ab-aaip",      r"alberta-opportunity-stream(-eligibility)?$"),
    "BC-sw":          ("bc-immigrate", r"skills-immigration|skilled-worker|eligibility"),
    "BC-build":       ("bc-immigrate", r"skills-immigration|skilled-worker|eligibility"),
    "NL-intl-grad":   ("nl-imm",       r"international-graduate"),
    "PE-sw":          ("pe-imm",       r"."),
}
"""13 条通道 → (crawl slug, 页面 URL 必须命中的正则)。URL 形态取自各 manifest 实际抓到的页。
设计见 docs/design/通道判定口径根治-20260812.md §3.1;只读缓存、只打印,不写任何东西;
**不猜 URL**(页面来源全部来自 crawl manifest,铁律 URL→数据→SQL)。"""

GQ_PDF_SOURCES: dict[str, list[str]] = {
    "PE-sw": ["https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf"],
    "BC-sw": ["https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"],
    "BC-build": ["https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"],
}
"""有些省的资格条文**根本不在 crawl 里**:官方 HTML 页挡在 WAF 后(PE 的 Radware)、或页面只写
「完整条件见指南 PDF」(BC)。这类通道的原句要去官方 PDF 里捞 —— 否则取证器扫完 crawl 一无所获,
就把「我们没抓」记成了「官方没写」(2026-08-12 实撞:PE-sw 三类闸全标 unknown,而门槛行本来就
出自这份 PDF)。🔴 URL **不是猜的**:逐条抄自已在跑的 ETL 脚本里的常量,注明出处,改了那边这里
也要跟 —— PE 抄自 build_pe_req 的 GUIDE_URL(HTML 页在 Radware 后面,文件服务器不挡);
BC 两条抄自 build_bc_req 的 PDF_URL(welcomebc 那页原句把完整条件推给这份指南:
「For complete information about eligibility and requirements, please see the Skills
Immigration Program Guide.」)。"""

GQ_GATES: dict[str, str] = {
    "offer":            r"\bjob offer\b|\boffer of employment\b|\bemployment offer\b|\bfull-?time.{0,20}offer\b",
    "statusInCanada":   r"\bwork permit\b|\bcurrently (?:working|living|residing)\b|\bvalid (?:status|temporary resident)\b|\bresiding in\b|\blegally (?:authorized|entitled) to work\b",
    "credentialCanada": r"\bgraduat(?:e|ed|ion)\b.{0,60}\b(?:Canad|institution|university|college)|\bpost-?graduation work permit\b|\bPGWP\b|\bcredential from a\b",
}
"""三类闸的判据词。宁可多捞几句让人筛,也不要漏 —— 漏了就等于又一次「没有行=没有闸」。"""

GQ_SKIP_TAGS = ("script", "style", "nav", "footer")
"""取正文时跳过的标签(导航/脚注不算条文)。"""

GQ_SENT_SPLIT_RE = re.compile(r"(?<=[.;:])\s+(?=[A-Z(])")
"""候选句切分(句读后接大写或括号)。"""

GQ_SENT_MIN = 25
"""候选句最短长度(短于它的多半是导航碎片)。"""

GQ_SENT_MAX = 320
"""候选句最长长度(长于它的多半是整段粘连)。"""

GQ_UA = {"User-Agent": "Mozilla/5.0 (compatible; offer2pr/1.0; +https://offer2pr.com)"}
"""PDF 直取的自报家门头。"""

GQ_PDF_TIMEOUT_S = 60
"""PDF 下载超时。"""

GQ_MANIFEST_NAME = "manifest.json"
"""crawl 一 slug 一清单的文件名。"""

GQ_CACHE_DIR = "html_cache"
"""crawl 页面缓存子目录名。"""

GQ_ERRORS_IGNORE = "ignore"
"""读缓存页的容错模式(原脚本原值;坏字节直接丢,取证句子够用)。"""

GQ_URL_SEP = "/"
"""PDF 文件名从 URL 尾段截取的分隔符。"""

GQ_P_PARSE_FAIL_TPL = "   ! HTML 解析器中途炸了({err})—— 用已收的半截正文继续"
"""报行:解析器异常留痕(原脚本 except: pass 静默;2026-08-31 收编按「出错不静默」补报,
产出行为不变 —— buf 里已收的文本照用)。"""

GQ_K_PAGES = "pages"
"""crawl manifest 键:页清单。"""

GQ_K_STATUS = "status"
"""manifest 页键:HTTP 状态。"""

GQ_K_URL = "url"
"""manifest 页键:页 URL。"""

GQ_K_HTML = "html"
"""manifest 页键:html_cache 文件名。"""

GQ_K_CRAWLED_AT = "crawled_at"
"""manifest 键:该轮抓取时刻。"""

GQ_STATUS_OK = 200
"""只扫抓成功的页。"""

GQ_PAGES_MAX = 6
"""每通道最多扫的页数(取证给人筛,不求穷尽)。"""

GQ_HITS_SHOW = 3
"""每闸最多展开的候选句数(crawl 侧)。"""

GQ_PDF_HITS_SHOW = 6
"""每闸最多展开的候选句数(PDF 侧)。"""

GQ_SENT_SHOW_LEN = 230
"""候选句打印截断(crawl 侧)。"""

GQ_PDF_SENT_SHOW_LEN = 260
"""候选句打印截断(PDF 侧)。"""

GQ_P_NO_CRAWL_TPL = "\n### {key}  ❌ 无 crawl(slug={slug}) —— 按铁律落 not-collected,不猜"
"""报行:该通道没有 crawl。"""

GQ_P_HEAD_TPL = "\n### {key}  slug={slug}  抓于 {at}  命中页 {n}"
"""报行:通道抬头。"""

GQ_P_NO_PAGES = "   ❌ 该 slug 下没有匹配的页 —— 落 not-collected"
"""报行:slug 有但页不匹配。"""

GQ_P_GATE_TPL = "  ── {gate}: {n} 句"
"""报行:单闸候选句计数。"""

GQ_P_SENT_TPL = "     · {sent}"
"""报行:候选句。"""

GQ_P_URL_TPL = "       {url}"
"""报行:候选句出处 URL。"""

GQ_P_PDF_HEAD_TPL = "\n### {key}  官方 PDF 源 {n} 份"
"""报行:PDF 源抬头。"""

GQ_P_PDF_FILE_TPL = "  ── PDF {name}  {n} 字"
"""报行:单份 PDF 抬头。"""

GQ_P_PDF_FAIL_TPL = "   ❌ PDF 取不到({err})—— 落 not-collected,不猜"
"""报行:PDF 取档失败。"""

GQ_P_UNKNOWN_TPL = "未知通道 {key}"
"""报行:点名了不存在的通道。"""

# =========================================================================
# 37. 新鲜度哨兵(B3-1;2026-08-31 批D 自 ops/check_freshness.py 收编,钉本域链尾)
# =========================================================================

FRESH_MANIFEST = paths.ROOT / "etl" / "sched" / "source_manifest.json"
"""源契约清单(glob 默认让新抓取产物自动进哨兵 —— 铁律 2「抓完必须入役」的机器面)。
2026-08-31 批K 随 sched 立域搬进 etl/sched/(调度契约归调度器管),本行只跟路径不动语义。"""

FRESH_K_DEFAULTS = "defaults"
"""契约键:glob 默认档。"""

FRESH_K_OVERRIDES = "overrides"
"""契约键:逐文件覆盖档。"""

FRESH_K_FILE = "file"
"""覆盖档键:相对 data/ 的文件路径。"""

FRESH_K_GLOB = "glob"
"""默认档键:glob 模式。"""

FRESH_K_CADENCE = "cadence_days"
"""契约键:保鲜期天数。"""

FRESH_K_KEY = "key"
"""契约键:取「数据是哪天的」用哪个顶层键。"""

FRESH_K_NOTE = "note"
"""契约键:超期时的补充说明。"""

FRESH_KEY_DEFAULT = "fetched"
"""默认取戳键。"""

FRESH_KEY_MTIME = "mtime"
"""特殊取戳键:文件修改时刻兜底。"""

FRESH_DATE_FMT = "%Y-%m-%d"
"""戳的日期格式。"""

FRESH_STAMP_LEN = 10
"""戳截断长度(ISO 日期前 10 位)。"""

FRESH_P_IN_TPL = "IN manifest : {path}"
"""输入报行。"""

FRESH_P_MISSING_TPL = "✗ {rel}: 文件不存在(契约里在,盘上没有)"
"""超期行:文件缺席。"""

FRESH_P_NOSTAMP_TPL = "✗ {rel}: 取不到 {key}(无戳的数据不能拿来下结论,见 B3-3)"
"""超期行:无戳。"""

FRESH_P_BADDATE_TPL = "✗ {rel}: {key}={stamp} 不是日期"
"""超期行:戳不是日期(stamp 已 repr 后传入)。"""

FRESH_P_OK_TPL = "· {rel}: {stamp}({age} 天前,限 {cad} 天)"
"""在期行。"""

FRESH_P_STALE_TPL = "✗ {rel}: {stamp}({age} 天前,限 {cad} 天)"
"""超期行。"""

FRESH_P_STALE_NOTE_TPL = "✗ {rel}: {stamp}({age} 天前,限 {cad} 天) —— {note}"
"""超期行(带契约备注)。"""

FRESH_P_SUMMARY_TPL = "✗ {n}/{total} 个源超期或无戳:"
"""收口:有超期(随后逐行打印;exit 1 → 本轮记失败 → 不 ping → 报警;
钉本域链尾:红了不挡前面的真实步骤,但让 ping 第一次证明「数据是新的」)。"""

FRESH_P_ALL_OK_TPL = "✓ {n} 个源全部在保鲜期内"
"""收口:全部在期。"""
