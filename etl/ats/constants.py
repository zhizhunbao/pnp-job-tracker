"""
ats 域常量 —— 域词汇表(第一方 ATS 公开 JSON 抓岗 + ATS 专属薪资抽取;照 company 三件套
样张,段横幅三行框 + N. 编号,与 functions.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除空串与语法位外,一切字面量住这;各家 ATS 载荷的键一律
K_ 词族、文案模板一律 *_TPL、URL 模板一律 *_URL_TPL。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(两段共用:一司一档的读写根、编码、jobs.json 的键)
# =========================================================================

IN_COMPANIES = paths.COMPANIES
"""一司一档根目录(processed/<region>/companies/<slug>/):抓岗读 careers.json、
抽薪资读 jobs/*.md,两段的输入都从这里进。"""

OUT_COMPANIES = IN_COMPANIES
"""同一目录进同一目录出 —— 两段都是就地富化(写回 jobs.json / jobs/<职位>.md),
沿用两个步骤文件各自的 IN/OUT 同址声明。"""

ENC_UTF8 = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 2
"""jobs.json 落盘缩进(两段一致,保持 diff 可读)。"""

FILE_JOBS_JSON = "jobs.json"
"""一司一档里的职位清单文件名(抓岗写、抽薪资改)。"""

K_JOBS = "jobs"
"""jobs.json 顶层键:职位清单。"""

K_TITLE = "title"
"""职位行键:标题(各家 ATS 载荷里也多用这个名)。"""

K_URL = "url"
"""职位行键:帖子链接(抽薪资按它与 .md 对表)。"""

K_SALARY = "salary"
"""职位行键:薪资文本(抓岗能给就给,给不出由抽薪资段补)。"""

K_DESCRIPTION = "description"
"""职位行键:完整描述 —— 只进 .md,不进 jobs.json(保持清单精简)。"""

K_POSTED = "posted"
"""职位行键:发布日。"""

K_TECH = "tech"
"""职位行键:是不是科技岗(标题判据打标)。"""


# =========================================================================
# 2. ATS 抓岗(第一方公开 JSON:greenhouse/lever/bamboohr/recruitee/
#    smartrecruiters/workable + workday 的 cxs 端点)
# =========================================================================

FILE_CAREERS_JSON = "careers.json"
"""一司一档里的 careers 定位结果(company 域产出):有它才有 ATS 可抓。"""

DIR_JOBS = "jobs"
"""一司一档里的职位详情子目录(每岗一份 .md)。"""

SUFFIX_MD = ".md"
"""职位详情文件后缀。"""

CLIENT_TIMEOUT_S = 20.0
"""ATS API 客户端超时(各家公开 JSON 都是秒级响应)。"""

K_ATS = "ats"
"""careers.json / jobs.json 的键:ATS 名。"""

K_TOKEN = "token"
"""jobs.json 的键:该公司在 ATS 上的 board token。"""

K_COUNT = "count"
"""jobs.json 的键:职位数。"""

K_CAREERS_URL = "careers_url"
"""careers.json 的键:招聘页地址(token 与 Workday 站点都从这页发现);
Recruitee 的职位行也用同一个键名给公开页地址(缺则退回 url)。"""

ATS_GREENHOUSE = "greenhouse"
"""ATS 名:Greenhouse。"""

ATS_LEVER = "lever"
"""ATS 名:Lever。"""

ATS_BAMBOOHR = "bamboohr"
"""ATS 名:BambooHR。"""

ATS_RECRUITEE = "recruitee"
"""ATS 名:Recruitee。"""

ATS_SMARTRECRUITERS = "smartrecruiters"
"""ATS 名:SmartRecruiters。"""

ATS_WORKABLE = "workable"
"""ATS 名:Workable。"""

SUPPORTED = {ATS_GREENHOUSE, ATS_LEVER, ATS_BAMBOOHR, ATS_RECRUITEE,
             ATS_SMARTRECRUITERS, ATS_WORKABLE}
"""有干净公开 JSON 的六家 —— 只抓这些;其余(icims/teamtailor/dayforce/bullhorn/
applytojob)记进跳过计数,留人工跟进。"""

WORKDAY = {"workday", "myworkdayjobs"}
"""企业级 ATS:cxs JSON 端点,需单独发现 host/site(与上面六家不同路)。"""

TOKEN_RE = {
    ATS_GREENHOUSE: re.compile(
        r"for=([a-z0-9]+)|boards\.greenhouse\.io/(?:embed/job_board\?for=)?([a-z0-9]+)", re.I),
    ATS_LEVER: re.compile(r"(?:jobs|api)\.lever\.co/(?:v0/postings/)?([a-z0-9\-]+)", re.I),
    ATS_BAMBOOHR: re.compile(r"([a-z0-9\-]+)\.bamboohr\.com", re.I),
    ATS_RECRUITEE: re.compile(r"([a-z0-9\-]+)\.recruitee\.com", re.I),
    ATS_SMARTRECRUITERS: re.compile(r"smartrecruiters\.com/(?:companies/)?([A-Za-z0-9]+)", re.I),
    ATS_WORKABLE: re.compile(r"apply\.workable\.com/([a-z0-9\-]+)|([a-z0-9\-]+)\.workable\.com", re.I),
}
"""从 careers 页 HTML 里认 board token 的六条正则(原 _token() 体内的 pats 表,
re.I 由原 re.search 的旗子转成编译期旗子,行为同)。"""

GREENHOUSE_JOBS_URL_TPL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
"""Greenhouse 职位清单(content=true 连描述一起给)。"""

LEVER_JOBS_URL_TPL = "https://api.lever.co/v0/postings/{token}?mode=json"
"""Lever 职位清单(公开 postings API)。"""

BAMBOO_LIST_URL_TPL = "https://{token}.bamboohr.com/careers/list"
"""BambooHR 职位清单(只有标题/地点,描述要逐岗取详情)。"""

BAMBOO_DETAIL_URL_TPL = "https://{token}.bamboohr.com/careers/{jid}/detail"
"""BambooHR 单岗详情(含描述与结构化 compensation)。"""

BAMBOO_JOB_URL_TPL = "https://{token}.bamboohr.com/careers/{jid}"
"""BambooHR 单岗公开页(写进 jobs.json 的 url)。"""

RECRUITEE_OFFERS_URL_TPL = "https://{token}.recruitee.com/api/offers/"
"""Recruitee 职位清单。"""

SMART_LIST_URL_TPL = "https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100"
"""SmartRecruiters 职位清单(单页 100 条)。"""

SMART_DETAIL_URL_TPL = "https://api.smartrecruiters.com/v1/companies/{token}/postings/{pid}"
"""SmartRecruiters 单岗详情(jobAd 分段)。"""

SMART_JOB_URL_TPL = "https://jobs.smartrecruiters.com/{token}/{pid}"
"""SmartRecruiters 单岗公开页。"""

WORKABLE_ACCOUNT_URL_TPL = "https://www.workable.com/api/accounts/{token}?details=true"
"""Workable 账号职位清单(details=true 带描述)。"""

WD_BASE_URL_TPL = "https://{host}/wday/cxs/{tenant}/{site}"
"""Workday cxs 端点前缀(host/tenant/site 从 careers 页发现)。"""

WD_JOBS_URL_TPL = "{base}/jobs"
"""Workday 职位翻页端点(POST)。"""

WD_DETAIL_URL_TPL = "{base}{path}"
"""Workday 单岗详情端点(externalPath 直接接在 base 后)。"""

WD_HOST_RE = re.compile(
    r"([a-z0-9-]+\.wd\d+\.myworkdayjobs\.com)/(?:[a-z]{2}-[A-Z]{2}/)?([A-Za-z0-9_-]+)")
"""careers 页里发现 Workday 站点:<tenant>.wdN.myworkdayjobs.com/<lang?>/<site>。"""

WD_SKIP_SITES = {"jobs", ""}
"""Workday 站点名里不算站点的两个(通用路径,不是真站点)。"""

WD_MAX_SITES = 4
"""同公司最多取 4 个 Workday 站点(主站 + 学生站等)。"""

WD_PAGE_SIZE = 20
"""Workday cxs 翻页步长(官方端点的一页大小)。"""

WD_OFFSET_START = 0
"""Workday 翻页起点。"""

HDR_ACCEPT = "Accept"
"""请求头名:期望的响应类型(Workday cxs 端点必须显式要 JSON)。"""

ACCEPT_JSON = "application/json"
"""请求头值:JSON。"""

K_APPLIED_FACETS = "appliedFacets"
"""Workday 翻页请求体键:筛选面(空 = 不筛)。"""

K_LIMIT = "limit"
"""Workday 翻页请求体键:每页条数。"""

K_OFFSET = "offset"
"""Workday 翻页请求体键:偏移。"""

K_SEARCH_TEXT = "searchText"
"""Workday 翻页请求体键:搜索词(空 = 全量)。"""

K_JOB_POSTINGS = "jobPostings"
"""Workday 翻页响应键:本页职位。"""

K_TOTAL = "total"
"""Workday 翻页响应键:总数(翻到它为止)。"""

K_EXTERNAL_PATH = "externalPath"
"""Workday 职位键:详情相对路径(也是本轮去重键)。"""

K_LOCATIONS_TEXT = "locationsText"
"""Workday 职位键:地点文本(Ottawa 过滤看它)。"""

K_JOB_POSTING_INFO = "jobPostingInfo"
"""Workday 详情响应键:详情体。"""

K_JOB_DESCRIPTION = "jobDescription"
"""Workday 详情键:描述 HTML。"""

K_LOCATION = "location"
"""职位键:地点(greenhouse/lever/recruitee/smartrecruiters/workable/workday 共用名)。"""

K_EXTERNAL_URL = "externalUrl"
"""Workday 详情键:公开页地址。"""

K_START_DATE = "startDate"
"""Workday 详情键:开始日期(当发布日用)。"""

OTTAWA_LOC_RE = re.compile(
    r"ottawa|kanata|nepean|gloucester|orl[eé]ans|stittsville|manotick|barrhaven", re.I)
"""Workday 公司多为全球招聘,客户端按地点过滤到 Ottawa 都会区。"""

K_ABSOLUTE_URL = "absolute_url"
"""Greenhouse 职位键:公开页地址。"""

K_CONTENT = "content"
"""Greenhouse 职位键:描述 HTML(也是 SmartRecruiters 清单响应的容器键)。"""

K_UPDATED_AT = "updated_at"
"""Greenhouse 职位键:更新时刻。"""

K_NAME = "name"
"""通用子键:名字(greenhouse 的 location.name / smartrecruiters 的岗位名)。"""

K_TEXT = "text"
"""Lever 职位键:标题(它不叫 title);也是 SmartRecruiters jobAd 分段的正文键。"""

K_DESCRIPTION_PLAIN = "descriptionPlain"
"""Lever 职位键:正文纯文本。"""

K_ADDITIONAL_PLAIN = "additionalPlain"
"""Lever 职位键:结尾段纯文本(含 Compensation & Benefits,之前漏抓)。"""

K_CATEGORIES = "categories"
"""Lever 职位键:分类容器(地点/团队在里面)。"""

K_TEAM = "team"
"""Lever 分类子键:团队(当部门用)。"""

K_HOSTED_URL = "hostedUrl"
"""Lever 职位键:公开页地址。"""

K_CREATED_AT = "createdAt"
"""Lever 职位键:创建时刻(毫秒 epoch)。"""

K_SALARY_RANGE = "salaryRange"
"""Lever 职位键:结构化薪资区间。"""

K_MIN = "min"
"""Lever 薪资区间子键:下限。"""

K_MAX = "max"
"""Lever 薪资区间子键:上限。"""

K_CURRENCY = "currency"
"""Lever 薪资区间子键:币种。"""

K_INTERVAL = "interval"
"""Lever 薪资区间子键:计薪周期。"""

LEVER_INTERVAL_UNIT = {
    "per-hour-wage": "per hour", "per-day-wage": "per day", "per-week-salary": "per week",
    "per-month-salary": "per month", "per-year-salary": "annually",
}
"""Lever 计薪周期 → 人话单位(拼进薪资文本)。"""

MONEY_INT_TPL = "${n:,.0f}"
"""金额格式:整数(千分位)。"""

MONEY_DEC_TPL = "${n:,.2f}"
"""金额格式:带两位小数(非整数金额)。"""

MONEY_RANGE_TPL = "{lo} - {hi}"
"""薪资区间的两端拼接。"""

K_RESULT = "result"
"""BambooHR 响应键:结果容器。"""

K_ID = "id"
"""BambooHR 职位键:岗位号。"""

K_JOB_OPENING = "jobOpening"
"""BambooHR 详情键:岗位体。"""

K_JOB_OPENING_NAME = "jobOpeningName"
"""BambooHR 职位键:岗位名。"""

K_DEPARTMENT_LABEL = "departmentLabel"
"""BambooHR 职位键:部门名。"""

K_DATE_POSTED = "datePosted"
"""BambooHR 职位键:发布日。"""

K_CITY = "city"
"""地点子键:城市(bamboohr / recruitee / smartrecruiters 共用名)。"""

K_STATE = "state"
"""BambooHR 地点子键:省/州。"""

K_COMPENSATION = "compensation"
"""BambooHR 详情键:结构化薪资文本。"""

K_OFFERS = "offers"
"""Recruitee 响应键:职位容器。"""

K_DEPARTMENT = "department"
"""职位键:部门(recruitee/workable 共用名)。"""

K_PUBLISHED_AT = "published_at"
"""Recruitee 职位键:发布时刻。"""

K_CREATED_AT_SNAKE = "created_at"
"""Recruitee 职位键:创建时刻(发布时刻缺时兜底)。"""

K_REGION = "region"
"""SmartRecruiters 地点子键:省/州。"""

K_ADDRESS = "address"
"""SmartRecruiters 地点子键:街道地址(描述里抽不到时兜底)。"""

K_JOB_AD = "jobAd"
"""SmartRecruiters 详情键:招聘广告。"""

K_DEFAULT_JOB_AD = "defaultJobAd"
"""SmartRecruiters 详情键:默认招聘广告(jobAd 缺时用)。"""

K_SECTIONS = "sections"
"""SmartRecruiters 广告键:分段容器。"""

SMART_SECTIONS = ("companyDescription", "jobDescription", "qualifications", "additionalInformation")
"""SmartRecruiters 要拼进描述的四段(顺序即拼接顺序)。"""

K_LABEL = "label"
"""SmartRecruiters 部门子键:显示名。"""

K_RELEASED_DATE = "releasedDate"
"""SmartRecruiters 职位键:发布日。"""

K_PUBLISHED_ON = "published_on"
"""Workable 职位键:发布日。"""

K_LOCATION_STR = "location_str"
"""Workable 地点子键:地点文本。"""

K_APPLICATION_URL = "application_url"
"""Workable 职位键:投递地址(url 缺时兜底)。"""

TECH_JOB_RE = re.compile(
    r"software|developer|engineer|programm|\bdata\b|scientist|cloud|devops|\bqa\b|"
    r"architect|machine learning|\bai\b|full[-\s]?stack|back[-\s]?end|front[-\s]?end|"
    r"\bweb\b|security|cyber|\bsystems?\b|\bit\b|network|database|analyst|firmware|embedded", re.I)
"""「算不算科技岗」的标题判据(只打标,不筛掉别的岗)。"""

ADDR_RE = re.compile(
    r"\d{1,5}\s+[A-Za-z0-9.\-' ]{2,40}?\b(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Way|"
    r"Crescent|Cres|Court|Ct|Lane|Place|Pl|Parkway|Pkwy|Terrace|Trail)\b[^.\n;]{0,50}", re.I)
"""从描述里抽街道地址(门牌号 + 街名 + 常见街道后缀)。"""

TAG_RE = re.compile(r"<[^>]+>")
"""HTML 标签(抽地址与转纯文本前先剥)。"""

BLANK_LINES_RE = re.compile(r"\n{3,}")
"""三个以上换行折成两个(描述转纯文本时保段落感)。"""

JOB_ID_RE = re.compile(r"/([A-Za-z0-9_\-]{4,})/?(?:[?#]|$)")
"""从帖子 URL 末段取稳定 id(.md 文件名用)。"""

NONALNUM_RE = re.compile(r"[^a-z0-9]+")
"""URL 取不到 id 时,标题折连字符当文件名。"""

JOB_ID_FALLBACK = "job"
"""id 与标题都空时的兜底文件名。"""

JOB_ID_MAX_LEN = 60
"""文件名长度上限。"""

DASH = "-"
"""折连字符 / 去首尾连字符的那个符号。"""

ADDR_STRIP_CHARS = " ,;"
"""抽出的地址去掉首尾的这些符号。"""

PARA_SEP = "\n\n"
"""Lever 正文与结尾段之间的空行。"""

LIST_JOIN_SEP = ", "
"""城市/省拼接符。"""

SPACE_SEP = " "
"""SmartRecruiters 四段描述的拼接符,也是压空白后的单空格。"""

ISO_DATE_LEN = 10
"""字符串日期只取前 10 位(YYYY-MM-DD)。"""

MS_PER_S = 1000
"""Lever 的毫秒 epoch 转秒。"""

MD_TPL = ("---\ntitle: {title}\ncompany: {company}\n"
          "location: {location}\nposted: {posted}\n"
          "ats: {ats}\nurl: {url}\n---\n\n{desc}\n")
"""每岗一份详情 .md:frontmatter + 完整描述(逐字沿用原 body 拼装)。"""

DOT_SEP = "."
"""Workday 域名分段符(tenant = 子域第一段)。"""

PRINT_SCRAPE_INOUT_TPL = "IN/OUT companies : {path}"
"""抓岗起手打印的输入输出路径(宪法:IN/OUT 路径常量运行时打印;
原脚本没这行,2026-08-31 批I 溶解时补齐,与薪资抽取段同形)。"""

PRINT_SCRAPE_DONE_TPL = "Stage 3: {companies} companies, {tech} tech jobs. Skipped {skipped}."
"""抓岗收尾一行(公司数 / 科技岗数 / 跳过数;逐字沿用原文案)。"""

ERR_ATS_TPL = "{ats}:{token}"
"""抓某家 ATS 出错时的留痕抬头(原静默 pass,2026-08-31 批I 补 err() —— 永不吞异常令)。"""

ERR_WORKDAY_TPL = "workday:{host}"
"""Workday 站点抓取出错的留痕抬头。"""


# =========================================================================
# 3. ATS 薪资抽取(从上一段落好的 jobs/*.md 描述里抽结构化薪资,补回 jobs.json)
# =========================================================================

MD_GLOB = "jobs/*.md"
"""一司一档里的职位详情 .md(逐个建 url → 路径索引)。"""

MD_HEAD_LEN = 600
"""只读 .md 前 600 字符找 frontmatter 的 url:(全文没必要)。"""

URL_LINE_RE = re.compile(r"^url:\s*(.+)$", re.M)
"""frontmatter 里的 url 行。"""

AMOUNT_RE_SRC = r"\$\s?\d[\d,]*(?:\.\d+)?"
"""金额片段(原 AMOUNT):$ + 数字(可带千分位与小数)。"""

RANGE_RE_SRC = AMOUNT_RE_SRC + r"(?:\s*(?:-|–|—|to)\s*\$?\s?\d[\d,]*(?:\.\d+)?)?"
"""金额或金额区间(原 RANGE)。"""

UNIT_RE_SRC = (r"(?:\s*(?:CAD|USD))?(?:\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|"
               r"/\s?year|per\s+annum|annually|a\s+year))?")
"""币种与计薪周期后缀(原 UNIT)。"""

ANCHORED_RE = re.compile(
    r"(?:salary range|pay range|hiring salary range|base salary range|salary|compensation)"
    r"[^$]{0,80}(" + RANGE_RE_SRC + UNIT_RE_SRC + ")", re.I)
"""关键词锚定(更准):salary/pay/compensation … 后面 80 字符内出现金额。
80 而非 40:覆盖 "compensation (based on 2,080 hours per year) ranges from $X" 这种长前缀。"""

WITH_UNIT_RE = re.compile(
    r"(" + RANGE_RE_SRC + r"\s*(?:CAD|USD)?\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|"
    r"/\s?year|per\s+annum|annually|a\s+year))", re.I)
"""兜底:带「per hour/year」单位的金额(避免误抓商品价格)。"""

NBSP_ENTITY = "&nbsp;"
"""HTML 空格实体(抽薪资前先还原成空格)。
⚠ 原脚本这行后面还跟了一次 `.replace(" ", " ")` —— 两边都是**普通空格**(2026-08-31 批I
用 ascii() 逐字节验过,不是 \\xa0),是个恒等替换的死操作,溶解时随手退役,行为零变化。"""

SALARY_STRIP_CHARS = " .:-–—"
"""抽出的薪资串去掉首尾的这些符号。"""

BAD_AMOUNTS = ("$", "")
"""锚定命中但只捞到光杆美元号/空 —— 当没抽到,退兜底正则。"""

PRINT_SALARY_DONE_TPL = "Extracted salary for {updated}/{total} ATS jobs (from .md descriptions)"
"""抽薪资收尾一行(逐字沿用原文案)。"""

PRINT_SALARY_INOUT_TPL = "IN/OUT companies : {path}"
"""抽薪资起手打印的输入输出路径(宪法:运行时打印全路径)。"""
