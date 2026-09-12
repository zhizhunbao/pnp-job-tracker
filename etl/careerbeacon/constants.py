"""
careerbeacon 域常量 —— 域词汇表(省列表页枚举 → 详情原文抓取 → ld+json 解析 → postings 仓;
照 jobillico 三件套样张,段横幅三行框 + N. 编号,与 functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串与语法位外,一切字面量住这;JSON/行键一律 K_ 词族、
ld+json 的键一律 LD_ 词族、文案模板一律 *_TPL。

@author Frank
@time 2026-09-11
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(四段共用:crawl slug、raw/processed 路径、编码)
# =========================================================================

SLUG_CRAWL = "board-careerbeacon"
"""crawl 层目录名(data/crawl/board-careerbeacon/):调研期(2026-09-06)就用这个 slug 落的原文,立域沿用。"""

OUT_URLS = paths.RAW_CAREERBEACON / "urls.json"
"""省列表页枚举产物:帖号 → 详情 URL(只收 NS/NB/NL/PE 四省列表页里在列的帖)。"""

IN_URLS = OUT_URLS
"""详情抓取 / 解析 / 建仓三段都读这份枚举表(当前态:只有四省列表页这轮仍在列的帖)。"""

OUT_JOBS = paths.RAW_CAREERBEACON / "jobs.json"
"""详情解析产物:帖号 → JobFact 字典(ld+json JobPosting 抽出的原始事实,增量累积)。"""

IN_JOBS = OUT_JOBS
"""建仓段读它;解析段读它做增量(已解析的帖号不重解)。"""

OUT_POSTINGS = paths.PROCESSED_CAREERBEACON / "postings.json"
"""归一后的 postings 仓(与 Job Bank 仓同键;mart 用 to_jb_job_fields 同一把尺子汇装)。"""

ENC_UTF8 = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 1
"""落盘缩进(帖多体积大,照 paths 说明的大表惯例用 1)。"""

CLIENT_TIMEOUT_S = 30.0
"""httpx 单请求超时。"""

SPACE = " "
"""单空格(剥标签后的替身与折空白的目标)。"""

ERRORS_REPLACE = "replace"
"""读缓存原文的解码策略(坏字节不炸整页)。"""

# =========================================================================
# 2. 省列表页枚举(四省 jobs-in-<slug> 分页 → 帖号 → URL)
# =========================================================================

LIST_URL_TPL = "https://www.careerbeacon.com/en/search/jobs-in-{slug}?page={n}"
"""省列表页(2026-09-11 实测:每页约 25 岗;本站不开职位站点地图,分页是枚举正门)。"""

PROV_OF_SLUG = {
    "nova-scotia": "NS",
    "new-brunswick": "NB",
    "newfoundland-and-labrador": "NL",
    "prince-edward-island": "PE",
}
"""列表页 slug → 省码(2026-09-11 实测页数:NS ~197 / NB ~160 / NL ~111 / PE ~26,页数每轮
从页内现取不写死)。只收这四省 —— 站上其余约 8 万全国岗是聚合喂料,不接(2026-09-11 拍板);
省码真相仍是详情页 ld+json 的 addressRegion,这张表只定枚举范围。"""

SITE_BASE = "https://www.careerbeacon.com"
"""站根(列表页里岗链取到路径后拼绝对 URL)。"""

JOB_LINK_RE = re.compile(r"careerbeacon\.com(/en/job/(\d+)/[^\"?]+)")
"""列表页里的岗链:组 1 = 详情路径(/en/job/<帖号>/<雇主>/<职位>/<市-省>),组 2 = 帖号。
2026-09-11 实测:页内岗链带 ?utm_source=… 查询串,排除类加 ? 在这就切掉 —— 不切则同帖
不同 utm 记成不同 URL,crawl 层「抓过没」判定失灵。"""

PAGE_NUM_RE = re.compile(r"[?&]page=(\d+)")
"""页内分页链接的页号(取最大值 = 该省总页数;2026-09-11 实测 PE 首页可见 1..5 与末页 26)。"""

PAGE_ONE = 1
"""首页页号(枚举起点,也是总页数的下限)。"""

LIST_SLEEP_S = 0.5
"""列表页逐页间隔(每秒两页;与详情同一自律档)。"""

PRINT_PROV_TPL = "  {slug}:{pages} 页 {n} 帖"
"""每个省列表页的枚举结果。"""

PRINT_URLS_DONE_TPL = "[OK] 枚举 {ids} 个帖号(四省列表页)→ {out}"
"""枚举收尾。"""

# =========================================================================
# 3. 详情原文抓取(未缓存的帖号 → crawl 层,每轮封顶)
# =========================================================================

DETAIL_SLEEP_S = 0.5
"""逐页间隔(每秒两页;robots 无 crawl-delay,自律档)。"""

DETAIL_TICK = 200
"""心跳间隔(每 N 页报一行)。"""

FLUSH_EVERY = 500
"""每 N 页把攒下的原文批量落 crawl 层一次(中途挂掉最多丢 N 页,manifest 只写这几次)。"""

RATE_FLOOR_S = 0.001
"""速率分母下限(防首页除零)。"""

PERCENT = 100
"""百分比换算。"""

PRINT_DETAIL_HEAD_TPL = "[details] 待抓 {todo} / 枚举 {total}(本轮上限 {cap},已缓存 {have})"
"""抓取起手。"""

PRINT_DETAIL_TICK_TPL = "  [{done}/{todo}] {pct}%  {rate:.1f} 页/秒  {url}"
"""抓取心跳。"""

PRINT_DETAIL_DONE_TPL = "[OK] 详情 {done} 页入 crawl/{slug}(失败 {failed})"
"""抓取收尾。"""

# =========================================================================
# 4. 详情解析(缓存原文 → ld+json JobPosting → raw jobs.json)
# =========================================================================

LD_SCRIPT_RE = re.compile(r"<script[^>]*type=\"application/ld\+json\"[^>]*>(.*?)</script>", re.S)
"""ld+json 脚本块(不整页建 DOM,照 jobillico;2026-09-11 实测详情页四块:ItemList /
WebPage / JobPosting / BreadcrumbList,按 @type 挑)。"""

LD_TYPE = "@type"
"""schema.org 类型键。"""

LD_JOB_POSTING = "JobPosting"
"""要的那块的类型值。"""

LD_TITLE = "title"
"""职位标题。"""

LD_DATE_POSTED = "datePosted"
"""发布日(ISO,带时区)。"""

LD_VALID_THROUGH = "validThrough"
"""截止日(ISO,带时区)。"""

LD_HIRING_ORG = "hiringOrganization"
"""雇主块。"""

LD_NAME = "name"
"""雇主块 / 通用名字键。"""

LD_URL = "url"
"""雇主块里的公司页地址(2026-09-11 实测本站雇主块多数不给,缺就空串)。"""

LD_JOB_LOCATION = "jobLocation"
"""地点块(实测是清单,取第一个)。"""

LD_ADDRESS = "address"
"""地点块里的地址块。"""

LD_LOCALITY = "addressLocality"
"""城市。"""

LD_REGION = "addressRegion"
"""省码。"""

LD_POSTAL = "postalCode"
"""邮编。"""

LD_STREET = "streetAddress"
"""街道地址(2026-09-11 实测本站多数不给,缺就空串)。"""

LD_COUNTRY = "addressCountry"
"""国家码。"""

LD_BASE_SALARY = "baseSalary"
"""薪资块。"""

LD_VALUE = "value"
"""薪资块的数值块(QuantitativeValue)。"""

LD_MIN = "minValue"
"""薪资区间低值。"""

LD_MAX = "maxValue"
"""薪资区间高值。"""

LD_UNIT = "unitText"
"""薪资单位(HOUR/YEAR/…)。"""

LD_EMPLOYMENT_TYPE = "employmentType"
"""雇佣形态(FULL_TIME/PART_TIME/… 或其清单)。"""

LD_INDUSTRY = "industry"
"""行业文本(本站多数不给,缺就空串)。"""

LD_DESCRIPTION = "description"
"""职位描述(HTML 串)。"""

TAG_RE = re.compile(r"<[^>]+>")
"""描述 HTML → 纯文本:剥标签。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个。"""

PRINT_PARSE_DONE_TPL = "[OK] 解析 {parsed} 张(跳过已解析 {skipped},无 JobPosting {missing})→ {out}"
"""解析收尾。"""

# =========================================================================
# 5. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================

K_POSTING_ID = "posting_id"
"""帖号(mart externalId 的料)。"""

K_TITLE = "title"
"""标题。"""

K_TITLE_ORIG = "title_orig"
"""原标题(与 jobillico 同键保持三板同形;本板全英文没有英译步,恒空串)。"""

K_EMPLOYER = "employer"
"""雇主名。"""

K_CITY = "city"
"""城市。"""

K_PROVINCE = "province"
"""省码。"""

K_SALARY = "salary"
"""薪资原文(拼成 Job Bank 写法「$25.00 hourly」,mart 薪资段同一把尺子)。"""

K_DATE = "date"
"""发布日(ISO;mart add_job 归一时照收)。"""

K_SOURCE = "source"
"""来源板名。"""

K_DIRECT = "direct"
"""是否雇主直招帖(Job Bank 语义;本板申请经 CareerBeacon 转,恒 False)。"""

K_URL = "url"
"""详情 URL(applyUrl 的料)。"""

K_ADDRESS = "address"
"""地址文本(街道 + 城市 + 省 + 邮编;mart 地点段靠它取邮编补区)。"""

K_NOC = "noc"
"""官方 NOC(本板 occupationalCategory 是自由文本职业名不是 NOC 码,恒空串 → mart 按标题分类)。"""

K_LAST_SEEN = "last_seen"
"""本轮建仓时刻(ISO Z)。"""

K_EMPLOYMENT_TERM = "employment_term"
"""雇佣期限(permanent / term / …,Job Bank 词汇)。"""

K_EMPLOYMENT_HOURS = "employment_hours"
"""工时(full / part,Job Bank 词汇)。"""

K_DESCRIPTION = "description"
"""描述纯文本。"""

K_VALID_THROUGH = "valid_through"
"""截止日(ISO;过截止即出仓)。"""

K_LANG = "lang"
"""详情页语言(本板恒 en)。"""

K_INDUSTRY = "industry"
"""行业文本(原样)。"""

K_EMPLOYER_URL = "employer_url"
"""雇主块给的公司页地址(本站多数不给,空串)。"""

SOURCE_LABEL = "CareerBeacon"
"""来源板名(jobs.source;显示标签由 mart 的 source_label 决定)。"""

LANG_EN = "en"
"""行的语言值(本板详情页全是英文版 /en/ 路径)。"""

COMMA = ","
"""薪资数值串里的千分位(去掉再转数)。"""

MONEY_FMT = "{:.2f}"
"""薪资数值两位小数(照 Job Bank「$21.00」)。"""

SALARY_TPL = "${lo} {unit}"
"""单值薪资写法(照 Job Bank「$21.00 hourly」)。"""

SALARY_RANGE_TPL = "${lo} to ${hi} {unit}"
"""区间薪资写法(照 Job Bank「$18.00 to $24.00 hourly」)。"""

SALARY_UNIT_WORD = {
    "HOUR": "hourly",
    "DAY": "daily",
    "WEEK": "weekly",
    "MONTH": "monthly",
    "YEAR": "annually",
}
"""schema.org unitText → Job Bank 单位词(mart 薪资段认这些词;认不出的单位整条留空,宁空不猜)。"""

TERM_OF_TYPE = {
    "PERMANENT": "permanent",
    "TEMPORARY": "term",
    "CONTRACTOR": "term",
    "INTERN": "term",
    "SEASONAL": "seasonal",
}
"""employmentType → Job Bank 雇佣期限词;FULL_TIME/PART_TIME 不表期限,不在表里。"""

HOURS_OF_TYPE = {
    "FULL_TIME": "full",
    "PART_TIME": "part",
}
"""employmentType → Job Bank 工时词。"""

UTC_Z = "Z"
"""ISO 串的 UTC 标记(Job Bank 仓 last_seen 同款「2026-09-06T21:24:06Z」)。"""

SECONDS_FMT = "%Y-%m-%dT%H:%M:%S"
"""last_seen 的时刻格式(秒级,尾接 UTC_Z)。"""

ADDRESS_SEP = ", "
"""地址各段的连接符。"""

PRINT_STORE_DONE_TPL = "[OK] postings 仓 {rows} 行(剔:不在本轮枚举 {gone} / 已过截止日 {expired} / 无标题 {blank})→ {out}"
"""建仓收尾。"""
