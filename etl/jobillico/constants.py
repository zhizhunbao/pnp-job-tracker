"""
jobillico 域常量 —— 域词汇表(站点地图枚举 → 详情原文抓取 → ld+json 解析 → postings 仓;
照 ats 三件套样张,段横幅三行框 + N. 编号,与 functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役。
零字符串令:functions 里除空串与语法位外,一切字面量住这;JSON/行键一律 K_ 词族、
ld+json 的键一律 LD_ 词族、文案模板一律 *_TPL。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(四段共用:crawl slug、raw/processed 路径、编码、帖号 → URL 表的键)
# =========================================================================

SLUG_CRAWL = "board-jobillico"
"""crawl 层目录名(data/crawl/board-jobillico/):调研期(2026-09-06)就用这个 slug 落的原文,立域沿用。"""

OUT_URLS = paths.RAW_JOBILLICO / "urls.json"
"""站点地图枚举产物:帖号 → 详情 URL(同帖号英法两版取英文版,标题给 NOC 分类器用)。"""

IN_URLS = OUT_URLS
"""详情抓取 / 解析 / 建仓三段都读这份枚举表(当前态:只有站点地图这轮仍在列的帖)。"""

OUT_JOBS = paths.RAW_JOBILLICO / "jobs.json"
"""详情解析产物:帖号 → JobFact 字典(ld+json JobPosting 抽出的原始事实,增量累积)。"""

IN_JOBS = OUT_JOBS
"""建仓段读它;解析段读它做增量(已解析的帖号不重解)。"""

OUT_POSTINGS = paths.PROCESSED_JOBILLICO / "postings.json"
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
# 2. 站点地图枚举(index → sitemap_job_postings_N.xml → 帖号 → URL)
# =========================================================================

SITEMAP_INDEX_URL = "https://www.jobillico.com/sitemap.xml"
"""站点地图索引(2026-09-06 自 robots.txt 的 Sitemap 行取得;子图 sitemap_job_postings_1..4.xml
各约 9.9k 行,英法两版同帖号各一行)。"""

SITEMAP_JOBS_RE = re.compile(r"/sitemap_job_postings_\d+\.xml$")
"""索引里只认职位帖子图;companies / opportunities / static 三类不进。"""

LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")
"""sitemap XML 的 <loc> 取值(正则足够,不上 XML 解析器)。"""

JOB_URL_RE = re.compile(r"^https://www\.jobillico\.com/(en|fr)/(?:job-offer|offre-d-emploi)/[^/]+/[^/]+/(\d+)$")
"""详情 URL 形:/en/job-offer/<雇主>/<职位>/<帖号> 或 /fr/offre-d-emploi/…;组 1 = 语言,组 2 = 帖号。"""

LANG_EN = "en"
"""英文版标记(两版都在时优先:标题英文,NOC 分类器命中率高;法文版留作兜底)。"""

PRINT_SITEMAP_TPL = "  站点地图 {url}:{n} 条"
"""每张子图的行数。"""

PRINT_URLS_DONE_TPL = "[OK] 枚举 {ids} 个帖号({en} 英文版 / {fr} 仅法文)→ {out}"
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
"""ld+json 脚本块(不整页建 DOM:单页 360KB × 数万张,bs4 一小时跑不完)。"""

LD_TYPE = "@type"
"""schema.org 类型键。"""

LD_JOB_POSTING = "JobPosting"
"""要的那块的类型值。"""

LD_TITLE = "title"
"""职位标题。"""

LD_DATE_POSTED = "datePosted"
"""发布日(ISO)。"""

LD_VALID_THROUGH = "validThrough"
"""截止日(ISO)。"""

LD_HIRING_ORG = "hiringOrganization"
"""雇主块。"""

LD_NAME = "name"
"""雇主块 / 通用名字键。"""

LD_URL = "url"
"""雇主块里的公司页地址。"""

LD_JOB_LOCATION = "jobLocation"
"""地点块。"""

LD_ADDRESS = "address"
"""地点块里的地址块。"""

LD_LOCALITY = "addressLocality"
"""城市。"""

LD_REGION = "addressRegion"
"""省码。"""

LD_POSTAL = "postalCode"
"""邮编。"""

LD_STREET = "streetAddress"
"""街道地址。"""

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
"""行业文本。"""

LD_DESCRIPTION = "description"
"""职位描述(HTML 串)。"""

TAG_RE = re.compile(r"<[^>]+>")
"""描述 HTML → 纯文本:剥标签。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个。"""

PRINT_PARSE_DONE_TPL = "[OK] 解析 {parsed} 张(跳过已解析 {skipped},无 JobPosting {missing})→ {out}"
"""解析收尾。"""

# =========================================================================
# 5. 标题英译(仅法文帖的标题 → 英文职位名;批译本身住 noc 域段 9,本段只管挑帖与缓存;2026-09-10 搬)
# =========================================================================

OUT_TITLES = paths.RAW_JOBILLICO / "titles_en.json"
"""标题英译缓存:帖号 → 英文职位名。为什么有这一步(2026-09-06 Frank「能修复吗」):站点地图 13,265 条
仅法文帖,NOC 分类器对法文标题只中 9%(140 条 13 中;英文 54~59%),不译就大面积「未分类」——
无 TEER、无评分、pnpEligible 恒假。译文只给分类与展示用,原标题留 title_orig。"""

IN_TITLES = OUT_TITLES
"""建仓段读它(有译文的帖 title 换英文);英译段读它做增量。"""

LANG_FR = "fr"
"""要译的语言(只译法文版页的标题;英文版页由雇主自填英文)。"""

TITLES_PER_RUN = 4000
"""每轮最多译多少条(约 200 批;首轮 1.3 万条分四轮,之后只译新帖)。"""

PRINT_TITLES_HEAD_TPL = "[titles] 待译 {todo}(法文帖 {fr},已译 {have},本轮上限 {cap})"
"""英译起手。"""

PRINT_TITLES_DONE_TPL = "[OK] 英译 {made} 条(没译成 {fail})→ {out}"
"""英译收尾。"""

# =========================================================================
# 6. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================

K_POSTING_ID = "posting_id"
"""帖号(mart externalId 的料)。"""

K_TITLE = "title"
"""标题。"""

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
"""是否雇主直招帖(Job Bank 语义;本板申请经 Jobillico 转,恒 False)。"""

K_URL = "url"
"""详情 URL(applyUrl 的料)。"""

K_ADDRESS = "address"
"""地址文本(街道 + 城市 + 省 + 邮编;mart 地点段靠它取邮编补区)。"""

K_NOC = "noc"
"""官方 NOC(本板不给,恒空串 → mart 按标题分类)。"""

K_LAST_SEEN = "last_seen"
"""本轮建仓时刻(ISO Z)。"""

K_EMPLOYMENT_TERM = "employment_term"
"""雇佣期限(permanent / term / …,Job Bank 词汇)。"""

K_EMPLOYMENT_HOURS = "employment_hours"
"""工时(full / part,Job Bank 词汇)。"""

K_DESCRIPTION = "description"
"""描述纯文本。"""

K_VALID_THROUGH = "valid_through"
"""截止日(ISO;过期即出仓)。"""

K_LANG = "lang"
"""详情页语言(en / fr)。"""

K_INDUSTRY = "industry"
"""行业文本(原样)。"""

K_EMPLOYER_URL = "employer_url"
"""Jobillico 公司页地址。"""

K_TITLE_ORIG = "title_orig"
"""原标题(title 换成英译时留原文;没译的帖此格空串)。"""

SOURCE_LABEL = "Jobillico"
"""来源板名(jobs.source;显示标签由 mart 的 source_label 决定)。"""

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

PRINT_STORE_DONE_TPL = "[OK] postings 仓 {rows} 行(剔:不在站点地图 {gone} / 已过截止日 {expired} / 无标题 {blank})→ {out}"
"""建仓收尾。"""
