"""
jobbank 域常量 —— 域词汇表(Job Bank 全加拿大全职业抓岗:列表快照 → 解析合并 →
详情快照 → 详情解析,外加公司档构建、岗位质检、死岗验尸;照 company 三件套样张,
段横幅三行框 + N. 编号,与 functions.py / scheme.py 同名同序镜像)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `re` 与 `paths`(functions 顶层只许函数,IN/OUT 路径归这)。
注释方言(2026-08-30):每个常量用**赋值后的裸字符串 docstring**,行内 # 退役,
决策记录连人带日期原样折进所属常量的 docstring —— 一条不删。
零字符串令:functions 里除空串与语法位外,一切字面量住这;JSON/行键一律 K_ 词族、
文案模板一律 *_TPL、CSS 选择器一律 SEL_*。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费:累积 store 与快照根、帖子行的键、列表行解析)
# =========================================================================

IN_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"
"""全国单文件累积 store(province 作字段,posting_id 增量去重)——
列表解析写它、详情抓取读它、详情解析原地富集它、公司档/质检/验尸都读它。"""

OUT_POSTINGS = IN_POSTINGS
"""同一份 store 进同一份 store 出(列表解析合并写回 / 详情解析原地富集),
沿用原两个解析件各自的 IN/OUT 同址声明。"""

IN_SNAP_ROOT = paths.RAW_JOBBANK
"""原始 HTML 快照根:<日期>/ 直接挂源下(列表页),<日期>/details/(详情页)。"""

OUT_SNAP_ROOT = IN_SNAP_ROOT
"""同一个快照根写入(列表抓取写 <今天>/,详情抓取写 <今天>/details/)。"""

ENC_UTF8 = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 2
"""JSON 落盘缩进(全域一致,保持 diff 可读)。"""

SUFFIX_JSON_TMP = ".json.tmp"
"""原子写的临时后缀(temp + os.replace 同目录 rename,消除「读到半写」竞态)。"""

PARSER_HTML = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml(容器镜像瘦)。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个(清抓来的文本)。"""

SPACE_SEP = " "
"""压空白后的单空格,也是 get_text 的分隔符。"""

PERCENT = 100
"""百分比换算(详情抓取心跳与质检报表共用)。"""

KV_SEP = ": "
"""frontmatter 的「键: 值」分隔。"""

PID_URL_RE = re.compile(r"/jobposting/(\d+)")
"""从帖子 URL 取 posting_id 的兜底(历史记录只有 url 没有 posting_id 字段 ——
必须从 url 兜底,否则会漏认/丢数据)。2026-08-31 批I 收拢:原来详情抓取、列表解析、
详情解析各抄了一份 `_POSTING_RE`(逐字相同),行为复制=口径开岔,合成本域唯一来源。"""

DATE_FMTS = ("%B %d, %Y", "%b %d, %Y")
"""列表页日期的两种写法(「June 22, 2026」/「Jun 22, 2026」);都解析不了当新帖保留。"""

K_POSTING_ID = "posting_id"
"""帖子行键:Job Bank 帖号(与 08/09 的 jb:<id> join 键一致)。"""

K_TITLE = "title"
"""帖子行键:职位名。"""

K_EMPLOYER = "employer"
"""帖子行键:雇主名。"""

K_CITY = "city"
"""帖子行键:城市。"""

K_PROVINCE = "province"
"""帖子行键:省码。"""

K_SALARY = "salary"
"""帖子行键:薪资原文。"""

K_DATE = "date"
"""帖子行键:列表页给的发布日期原文。"""

K_SOURCE = "source"
"""帖子行键:原始发布板(Job Bank 聚合 indeed/Talent 等,这里留原始板)。"""

K_DIRECT = "direct"
"""帖子行键:是不是雇主直接在 Job Bank 挂的(最值得直接联系)。"""

K_URL = "url"
"""帖子行键:帖子地址。"""

K_SEARCH_OCCUPATION = "search_occupation"
"""帖子行键:抓它时用的关键词 + NOC(全职业增量模式下不写,历史记录里有)。"""

K_ADDRESS = "address"
"""帖子行键:详情页给的地址(详情解析写,公司档/质检读)。"""

K_WEBSITE = "website"
"""帖子行键:雇主官网(详情解析写,公司档读)。"""

K_NOC = "noc"
"""帖子行键:Job Bank 官方 NOC 五位码(权威,胜过标题猜)。"""

K_DETAIL_FETCHED = "detail_fetched"
"""帖子行键:详情解析过没有(增量判据)。"""

K_LAST_SEEN = "last_seen"
"""帖子行键:本帖最近一次在增量抓取里露面的时刻(mart 透传 lastSeen,验尸排序看它)。"""

SEL_ARTICLE = "article"
"""列表页里一帖一个 <article>。"""

SEL_NOC_TITLE = "span.noctitle"
"""列表行的职位名(首选)。"""

SEL_H3_TITLE = "h3.title"
"""列表行的职位名(退而求其次)。"""

SEL_JOB_SOURCE = "span.job-source"
"""列表行的来源板。"""

SEL_LOCATION = "li.location"
"""列表行的地点。"""

SEL_BUSINESS = "li.business"
"""列表行的雇主。"""

SEL_SALARY = "li.salary"
"""列表行的薪资。"""

SEL_DATE = "li.date"
"""列表行的日期。"""

LABEL_LOCATION = "Location"
"""地点格的前缀标签(取值时剥掉)。"""

LABEL_SALARY = "Salary"
"""薪资格的前缀标签(同上)。"""

DIRECT_MARK = "job bank"
"""来源里含这个词 = 雇主直接在 Job Bank 发布(小写比对)。"""

CITY_PROV_RE = re.compile(r"(.*?)\s*\(([A-Z]{2})\)")
"""地点文本「Ottawa (ON)」拆成城市与省码。"""

HREF_ATTR = "href"
"""链接节点的属性名。"""

TAG_A = "a"
"""链接标签名(列表行按 href 正则找的就是它)。"""

URL_PARAM_SEP = ";"
"""帖子链接里的 jsessionid 等尾巴(按它截断)。"""

JOBBANK_ORIGIN = "https://www.jobbank.gc.ca"
"""站点根(列表行给的是相对路径,拼成绝对地址)。"""

LISTING_POSTING_RE = re.compile(r"/jobsearch/jobposting/(\d+)")
"""列表行里认帖子链接用的正则(比 PID_URL_RE 多要求 /jobsearch/ 前缀 ——
它同时当 find(href=…) 的判据,不能放宽)。"""

PROV_FULL = {
    "ON": "ontario", "QC": "quebec", "BC": "british-columbia", "AB": "alberta",
    "SK": "saskatchewan", "MB": "manitoba", "NB": "new-brunswick", "NS": "nova-scotia",
    "NL": "newfoundland-and-labrador", "PE": "prince-edward-island",
}
"""省码 → 目录/文件名用的全称(对齐 ATS 的 ontario/ottawa 风格)。
2026-08-31 批I 收拢:列表抓取与公司档构建各抄了一份**逐字相同**的十省表,
行为复制=口径开岔的现行犯,合成本域唯一来源。"""


# =========================================================================
# 2. 列表快照抓取(全职业 · 全省 · sort=D · 增量:只抓最近 N 天的新帖)
# =========================================================================

LISTING_URL_TPL = ("https://www.jobbank.gc.ca/jobsearch/jobsearch"
                   "?fprov={prov}&sort=D&page={page}")
"""全职业按省翻页的列表地址(fprov 是官方校验过的省筛选参数,sort=D 按日期降序)。"""

ALL_PROVINCES = ["ON", "QC", "SK", "AB", "BC", "MB", "NB", "NS", "NL", "PE"]
"""全加拿大省份(领地暂跳过)。QC 也抓 —— 站点是全职业职位板,PNP 只是其中一种状态标记。"""

CHAIN_MAX_PAGES = 400
"""每省翻页上限(失控保险)。#118:max-pages 默认 15 在周末积压+周一补抓时截断 ON/QC
(3 天量>15 页)→ 显式放大;翻页由 cutoff 日期自然停,上限只当保险,
触发即 ⚠ 告警(#118b:截止纯靠日期,固定页数会漏)。
2026-08-31 批I:原来是役册链上的 `--max-pages 400` 实参串,CLI 退役后成域常量,值不变。"""

CHAIN_DELAY_S = 0.4
"""翻页之间的礼貌间隔(原 argparse --delay 默认值,链上从没覆盖过)。"""

LISTING_TIMEOUT_S = 30.0
"""列表页请求超时。"""

LISTING_RETRY_N = 3
"""#118b:抓取失败重试 3 次再放弃(静默断页=另一种漏帖);彻底失败大声告警。"""

LISTING_RETRY_BACKOFF_S = 2
"""重试退避的基数(第 n 次等 2×n 秒)。"""

SNAP_PAGE_TPL = "{prov}-p{page:02d}.html"
"""列表快照的页文件名(省全称 + 两位页号)。"""

MANIFEST_FILE = "manifest.json"
"""快照目录的清单文件(列了本轮存了哪些页 + cutoff + 抓取时刻)。"""

K_FETCHED_AT = "fetched_at"
"""manifest 键:抓取时刻(抓取机本地裸时间;帖子 last_seen 的唯一来源)。"""

K_SINCE_DAYS = "since_days"
"""manifest 键:本轮的增量窗口天数。"""

K_CUTOFF = "cutoff"
"""manifest 键:本轮算好的截止日(解析端复用它,保证与抓取一致)。"""

K_PAGES = "pages"
"""manifest 键:本轮存下的页清单。"""

K_PROV = "prov"
"""manifest 页项键:省码。"""

K_PAGE = "page"
"""manifest 页项键:页号。"""

K_FILE = "file"
"""manifest 页项键:文件名。"""

K_ROWS = "rows"
"""manifest 页项键:该页解析出的行数(纯记录,解析端不依赖)。"""

TIMESPEC_SECONDS = "seconds"
"""抓取时刻的精度(秒)。"""

PRINT_LISTING_HEAD_TPL = "All-occupations listing snapshot: provinces={provinces}, since_days={since_days}"
"""列表抓取起手一行(逐字沿用原文案)。"""

PRINT_RETRY_FAIL_TPL = "  ⚠ {prov} p{page}: 连续 3 次失败({error})——本省本轮提前止,可能缺帖!"
"""重试耗尽的告警(✗/⚠ 行首=调度层升级信号)。"""

PRINT_MAX_PAGES_TPL = "  ⚠ {prov}: 翻满 {max_pages} 页仍未跨过截止日 {cutoff}——可能截断!上调 --max-pages"
"""翻满上限仍没跨过截止日的告警(#118b Frank「固定页数不行,万一比这个多还是漏」)。"""

PRINT_PROV_SAVED_TPL = "  · {prov}: 存 {saved} 页快照 (since {cutoff})"
"""每省收尾一行。"""

PRINT_SNAPSHOT_TPL = "\nListing 快照 → {snap_dir} ({pages} 页)"
"""整轮收尾一行(前导空行沿用原 print)。"""

ERR_PAGE_TPL = "{name} {detail}"
"""重试期间记下的最后一次错误(拼进告警行)。"""


# =========================================================================
# 3. 列表快照解析(HTML 快照 → 增量合并去重进 postings.json)
# =========================================================================

SCRAPED_KEYS = (K_POSTING_ID, K_TITLE, K_EMPLOYER, K_CITY, K_PROVINCE, K_SALARY, K_DATE,
                K_SOURCE, K_DIRECT, K_URL, K_SEARCH_OCCUPATION)
"""合并时只覆盖这些**原始抓取字段**,保留下游(04c/04d/详情解析)算出的
country/district/salaryAnnual/address… 衍生字段。"""

DATE_DIR_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
"""只认日期目录(排除 details/ 等同级目录)。"""

GLOB_HTML = "*.html"
"""快照目录里的页文件(manifest 缺失时的兜底列法)。"""

ISO_DATE_FMT = "%Y-%m-%d"
"""manifest cutoff / 目录名的日期格式。"""

UTC_OFFSET = "+00:00"
"""ISO 串里的 UTC 偏移(换成 Z 用)。"""

UTC_Z = "Z"
"""last_seen 的 UTC 记号。"""

SINCE_DAYS_FLAG = "--since-days"
"""窗口旗子名(与旧 CLI 逐字同名;门直调后仍从进程 argv 上捡它)。"""

PRINT_PARSE_IN_TPL = "IN  listing : {root}/<latest date>/"
"""列表解析起手打印的输入路径。"""

PRINT_PARSE_OUT_TPL = "OUT postings: {out}"
"""列表解析起手打印的输出路径。"""

PRINT_PARSE_LOCK_TPL = "LOCK store   : {lock}"
"""列表解析起手打印的锁路径(空格对齐沿用原 print)。"""

PRINT_NO_SNAPSHOT = "没有 listing 快照可解析(raw/jobbank/ 为空)——跳过"
"""没快照可解析时的一行(不是错,照旧正常退出)。"""

PRINT_WROTE_TPL = "Wrote {n} postings → {out}"
"""写回 store 的一行。"""

PRINT_PARSE_DONE_TPL = ("解析 {snap}: {rows} 行 → +{added} new · {updated} updated · "
                        "{skipped} 跳过(早于 {cutoff}) · base {base} → {total}")
"""列表解析收尾一行(逐字沿用原文案)。"""


# =========================================================================
# 4. 详情快照抓取(逐帖抓详情页原始 HTML;增量:已抓过/已富集的跳过)
# =========================================================================

DIR_DETAILS = "details"
"""快照日期目录下的详情子目录。"""

DETAIL_HTML_TPL = "{pid}.html"
"""详情快照文件名。"""

DETAIL_TMP_TPL = ".{pid}.html.tmp"
"""详情快照的临时名(temp+rename,避免半截 HTML 占位致永不重抓)。"""

DETAIL_TIMEOUT_S = 20.0
"""详情页请求超时。"""

DETAIL_SLEEP_S = 0.25
"""逐帖之间的礼貌间隔。"""

DETAIL_TICK = 50
"""心跳频率(否则几十分钟零输出像死机)。"""

RATE_FLOOR_S = 1e-6
"""算速率时的除零下限。"""

UNKNOWN_PROV = "?"
"""省份缺失时的心跳占位。"""

EMPLOYER_CLIP = 30
"""心跳行里雇主名的截断长度。"""

PRINT_DETAIL_HEAD_TPL = "05b 抓详情 HTML:本轮待抓 {todo} 个(共 {total} 帖,其余已抓/已富集跳过)"
"""详情抓取起手一行(逐字沿用原文案,含旧编号 05b)。"""

PRINT_DETAIL_TICK_TPL = "  {done:>5}/{todo} {pct:>3}% · {prov:<3} · {employer:<30} · {rate:>4.1f}/s"
"""心跳一行:一行清爽,对齐(省份累计只在收尾打一次)。"""

PRINT_DETAIL_DONE_TPL = "Fetched {done} detail HTML (skipped {skipped}) · 省分布 {dist} -> {dir}"
"""详情抓取收尾一行。"""


# =========================================================================
# 5. 详情快照解析(详情 HTML → 富集 postings + 写 details/*.md)
# =========================================================================

OUT_DETAILS = paths.PROCESSED_JOBBANK / "details"
"""解析后的帖子详情 .md(命名沿用旧 05b,advisor 与公司档按 url 匹配)。"""

GENERIC_EMAIL = {"gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
                 "icloud.com", "hotmail.ca", "yahoo.ca", "gmail.ca", "aol.com"}
"""公共邮箱域名 —— 从申请邮箱推官网时必须排除。"""

BLOCK_TAGS = {"p", "div", "section", "article", "ul", "ol", "dl", "dt", "dd", "table", "thead",
              "tbody", "tr", "blockquote", "figure", "figcaption", "header", "footer", "main",
              "aside"}
"""块级标签:序列化时边界落换行 + 段后空行。"""

HEAD_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
"""标题标签:序列化时前后留空行。"""

SKIP_TAGS = {"script", "style", "noscript", "template"}
"""序列化时整段跳过的标签。"""

TAG_BR = "br"
"""<br> 即换行。"""

TAG_LI = "li"
"""列表项:前缀「• 」。"""

TAG_UL = "ul"
"""requirements 区里归属某个 h4 的清单。"""

TAG_H4 = "h4"
"""requirements 区的小标题。"""

BULLET_PREFIX = "\n• "
"""列表项前缀(原帖的列表结构原样落进纯文本)。"""

LINE_BREAK = "\n"
"""单换行。"""

PARA_BREAK = "\n\n"
"""段落空行(段后空行=保留段落感)。"""

BLANK_LINES_RE = re.compile(r"\n{3,}")
"""三个以上换行折成两个。"""

SEL_REQUIREMENTS = ".job-posting-detail-requirements"
"""详情页里的可见结构区(带 h4/列表),描述首选它。"""

SEL_DESCRIPTION = '[property="description"]'
"""描述的退路(聚合帖里常是被转义的 HTML)。"""

SEL_ADDRESS = '[property="address"]'
"""详情页的地址。"""

SEL_DATE_POSTED = '[property="datePosted"]'
"""详情页的发布日。"""

SEL_EMPLOYMENT_TYPE = '[property="employmentType"]'
"""详情页的雇佣形态(Full/Part time)。"""

SEL_HIRING_ORG = '[property="hiringOrganization"]'
"""详情页的雇主块(雇主名链到其官网)。"""

SEL_ORG_LINK = "a.external[href], a[href]"
"""雇主块里的外链。"""

SEL_NOC_NO = "span.noc-no"
"""官方 NOC 标记(首选)。"""

SEL_NOC_NO_CLASS = ".noc-no"
"""官方 NOC 标记(退路)。"""

RICH_MIN_LEN = 40
"""结构区提取到的正文短于这个数 = 视为没拿到,退回 [property=description]。"""

ESCAPED_HTML_RE = re.compile(r"</?(p|ul|ol|li|br|div|strong|h[1-5])\b", re.I)
"""转义 HTML 的判据(命中就再解析一次恢复分段/列表)。"""

NOC_CODE_RE = re.compile(r"(\d{5})")
"""NOC 五位码。"""

DATE_POSTED_PREFIX = "Posted on"
"""详情页发布日的前缀(剥掉)。"""

TERM_MAP = (("Permanent", "permanent"), ("Term or contract", "term"),
            ("Casual", "casual"), ("Seasonal", "seasonal"))
"""雇佣期原文 → 归一值(E6-06/E6-07A,2026-07-17:详情页结构化区规则解析,零 LLM)。"""

HOURS_FULL_MARK = "Full time"
"""全职的判词。"""

HOURS_PART_MARK = "Part time"
"""兼职的判词。"""

HOURS_FULL = "full"
"""全职的归一值。"""

HOURS_PART = "part"
"""兼职的归一值。"""

TAG_SPAN = "span"
"""雇佣形态外层容器的标签名。"""

CLASS_ATTRIBUTE_VALUE = "attribute-value"
"""雇佣形态外层容器的类名(如「Permanent employmentFull time」在这一层)。"""

HEADING_CERTIFICATES = "Certificates, licences"
"""入职要求区:证书/执照那一节的标题前缀。"""

HEADING_EDUCATION = "Education"
"""入职要求区:学历那一节的标题前缀。"""

EDUCATION_JOIN_SEP = "; "
"""学历多条时的拼接符。"""

K_EMPLOYMENT_TERM = "employment_term"
"""帖子行键:雇佣期(permanent/term/casual/seasonal;没标注=空)。"""

K_EMPLOYMENT_HOURS = "employment_hours"
"""帖子行键:全职/兼职(没标注=空)。"""

K_CERTIFICATES = "certificates"
"""帖子行键:证书/执照清单。"""

K_EDUCATION = "education"
"""帖子行键:学历要求(分号拼一行)。"""

K_DATE_DETAIL = "date_detail"
"""帖子行键:详情页给的发布日(比列表页准)。"""

ENV_REPARSE = "REPARSE"
"""环境变量名:REPARSE=1 强制重解析全部(改了描述提取逻辑后回填用)。"""

ENV_ON = "1"
"""环境变量的开值。"""

SLUG_RE = re.compile(r"[^a-z0-9]+")
"""非字母数字折连字符(文件名 slug)。"""

SLUG_DASH = "-"
"""slug 的连字符。"""

DETAIL_SLUG_MAX = 50
"""详情 .md 文件名里单段的截断长度。"""

STEM_JOIN = "_"
"""可读文件名:<雇主>_<职位>(各自连字符,中间下划线分隔)。"""

STEM_FALLBACK = "job"
"""雇主与职位都空时的兜底文件名。"""

STEM_DUP_TPL = "{stem}-{pid}.md"
"""同名文件名撞车时加帖子号。"""

STEM_FILE_TPL = "{stem}.md"
"""详情 .md 的文件名。"""

DETAIL_MD_TPL = ("---\ntitle: {title}\nemployer: {employer}\n"
                 "address: {address}\nwebsite: {website}\nposted: {posted}\nsalary: {salary}\n"
                 "source: {source}\nurl: {url}\n---\n\n{desc}\n")
"""详情 .md 的正文(frontmatter + 描述;逐字沿用原拼装)。"""

HTTP_PREFIX = "http"
"""外链必须是 http(s) 开头才当官网。"""

HTTP_SCHEME = "http://"
"""从邮箱域名推官网时补的协议头。"""

EMAIL_DOMAIN_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
"""申请邮箱的域名(hr@apollophysio.ca → apollophysio.ca)。"""

OFFICIAL_DOMAINS = ("jobbank.gc.ca", "canada.ca")
"""官网判定要排除的官方域名(帖子自己的链接不算雇主官网)。"""

EMAIL_SKIP_DOMAINS = ("jobbank", "canada.ca", "gc.ca")
"""从邮箱推官网时要排除的域名片段。"""

PRINT_DETAILS_IN_TPL = "IN  raw details : {root}/<日期>/details/"
"""详情解析起手打印的输入路径。"""

PRINT_DETAILS_OUT_TPL = "OUT postings/md : {postings} · {details}"
"""详情解析起手打印的输出路径。"""

PRINT_DETAILS_LOCK_TPL = "LOCK store       : {lock}"
"""详情解析起手打印的锁路径(空格对齐沿用原 print)。"""

PRINT_NO_POSTINGS = "没有 postings.json,跳过"
"""store 还不存在时的一行。"""

PRINT_DETAILS_DONE_TPL = ("Parsed {parsed} new details · {addrs} with address · {webs} with website "
                          "· {emp} with employment · {certs} with certificates → postings 富集 + {out}")
"""详情解析收尾一行(逐字沿用原文案)。"""


# =========================================================================
# 6. 公司档构建(扁平 postings.json → 分省/市/雇主的公司目录)
# =========================================================================

IN_DETAILS = OUT_DETAILS
"""公司档的职位描述来源 = 详情解析落的 .md。"""

OUT_ROOT = paths.RAW_JOBBANK
"""公司档落点:raw/jobbank/<province>/<city>/companies/<slug>/
(镜像 ATS 的 companies/<slug>/ 结构,两源共用一套形状)。"""

DIR_COMPANIES = "companies"
"""公司目录层的名字。"""

DIR_JOBS = "jobs"
"""公司目录下的职位详情子目录。"""

FILE_PROFILE = "profile.json"
"""公司信息文件名。"""

FILE_JOBS = "jobs.json"
"""公司职位清单文件名。"""

GLOB_MD = "*.md"
"""详情 .md 的匹配式。"""

MD_HEAD_LEN = 800
"""只读 .md 前 800 字符找 frontmatter 的 url:。"""

URL_LINE_RE = re.compile(r"^url:\s*(.+)$", re.M)
"""frontmatter 里的 url 行。"""

FRONTMATTER_SEP = "\n---\n"
"""frontmatter 与正文的分界(按它切出描述)。"""

COMPANY_SLUG_MAX = 60
"""公司/职位 slug 的截断长度(比详情 .md 的 50 长 —— 两处历史取值不同,不强行拉平)。"""

SLUG_FALLBACK = "unknown"
"""slug 全空时的兜底(省目录/公司目录都用它)。"""

EMPLOYER_FALLBACK = "—"
"""雇主名缺失时的分组键(原样保留破折号)。"""

PID_TAIL_LEN = 6
"""同名职位文件撞车时,取帖号末 6 位加后缀。"""

MD_NAME_TPL = "{stem}.md"
"""公司档里职位 .md 的文件名。"""

JOB_MD_TPL = "---\n{fm}\n---\n\n{desc}\n"
"""公司档里职位 .md 的正文(frontmatter 只写非空格 + 描述)。"""

MD_DUP_TPL = "{stem}-{tail}"
"""同名撞车后的文件名主干。"""

JOB_STEM_FALLBACK = "job"
"""职位名为空时的 slug 兜底。"""

PROFILE_KEYS = ("title", "employer", "city", "province", "district",
                "address", "salary", "salaryText", "date", "source", "url")
"""职位 .md 的 frontmatter 逐格(空格子不写;键序即写入序)。"""

K_NAME = "name"
"""profile 键:公司名。"""

K_SLUG = "slug"
"""profile 键:公司 slug。"""

K_EMAIL = "email"
"""profile 键:邮箱(帖子行里带就带上)。"""

K_PHONE = "phone"
"""profile 键:电话(同上)。"""

K_DESCRIPTION = "description"
"""profile 键:公司简介(留空,由官网抓取步补)。"""

K_AIP = "aip"
"""profile 键:该雇主有没有大西洋试点岗。"""

K_JOB_COUNT = "job_count"
"""profile 键:在招职位数。"""

K_COMPANY = "company"
"""jobs.json 键:公司名。"""

K_COUNT = "count"
"""jobs.json 键:职位数。"""

K_JOBS = "jobs"
"""jobs.json 键:职位清单。"""

SOURCE_JOBBANK = "jobbank"
"""profile 键 source 的固定值。"""

PRINT_COMPANIES_IN_TPL = "IN postings : {postings}"
"""公司档构建起手打印的输入路径。"""

PRINT_COMPANIES_OUT_TPL = "OUT root    : {root}/<province>/<city>/companies/<slug>/"
"""公司档构建起手打印的输出路径。"""

PRINT_COMPANIES_DONE_TPL = "Built {companies} company folders ({jobs} job .md) under {root}"
"""公司档构建收尾一行。"""


# =========================================================================
# 7. 岗位质检(只读:把可疑的少数行挑出来,产 audit-flags.json)
# =========================================================================

IN_SCORED = paths.PROCESSED / "all-scored.json"
"""评分产物(按 externalId 索引,给 TEER 分布用;缺了就只报省份分布)。"""

OUT_FLAGS = paths.PROCESSED / "audit-flags.json"
"""分类的可疑行(只读质检的唯一产出)。"""

POSTAL_PROV = {
    "A": "NL", "B": "NS", "C": "PE", "E": "NB", "G": "QC", "H": "QC", "J": "QC",
    "K": "ON", "L": "ON", "M": "ON", "N": "ON", "P": "ON",
    "R": "MB", "S": "SK", "T": "AB", "V": "BC", "Y": "YT",
}
"""加拿大邮编首字母 → 省(粗校验地理一致性)。"""

ATLANTIC = {"NL", "NB", "NS", "PE"}
"""大西洋四省(AIP 只在这四省成立)。"""

OTTAWA_CITY = "Ottawa"
"""Ottawa 误判那条规则的城市判词。"""

PROV_ON = "ON"
"""区(district)只该出现在安省(大渥太华社区级)。"""

OTTAWA_FSA_PREFIX = ("K1", "K2")
"""Ottawa 市区的邮编前两位(city=Ottawa 却不在这个前缀 = 疑似误判)。"""

PROV_NAMES = {
    "newfoundland and labrador", "nova scotia", "new brunswick", "prince edward island",
    "ontario", "quebec", "manitoba", "saskatchewan", "alberta", "british columbia",
}
"""市字段若等于这些(省名)→ 错(全省岗只给了省名,没具体城市)。"""

POSTAL_RE = re.compile(r"\b([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d\b")
"""从文本里认完整邮编,取前三位(FSA)。"""

K_DISTRICT = "district"
"""帖子行键:区(大渥太华社区级;仅 ON/Ottawa 该有)。"""

K_SALARY_ANNUAL = "salaryAnnual"
"""帖子行键:年薪折算(04d 清洗产出;质检查离群)。"""

K_EXTERNAL_ID = "externalId"
"""评分行键:外部 id(join 用)。"""

K_CATEGORY = "category"
"""评分行键:TEER 档位。"""

K_WHY = "why"
"""可疑行键:为什么可疑。"""

SALARY_MIN = 15000
"""年薪折算低于这个数 = 疑似解析错(时薪当年薪)。"""

SALARY_MAX = 600000
"""年薪折算高于这个数 = 疑似数字抓串。"""

ADDRESS_CLIP = 50
"""可疑行里地址的截断长度。"""

UNCLASSIFIED = "未分类"
"""评分里的未分类档位名(算未分类率用)。"""

MISSING_MARK = "?"
"""分布统计里的缺值占位。"""

PERCENT = 100
"""百分比换算。"""

CAT_POSTAL_MISMATCH = "邮编/省份错配"
"""可疑分类:邮编首字母指向的省 ≠ province。"""

CAT_OTTAWA_FALSE = "Ottawa 误判"
"""可疑分类:city=Ottawa 但邮编不在 K1*/K2*。"""

CAT_DISTRICT_OUT = "区越界"
"""可疑分类:district 有值但省≠ON。"""

CAT_AIP_OUT = "AIP 越界"
"""可疑分类:aip=True 但不在大西洋四省。"""

CAT_SALARY_LOW = "薪资过低"
"""可疑分类:年薪折算过低。"""

CAT_SALARY_HIGH = "薪资过高"
"""可疑分类:年薪折算过高。"""

CAT_PROV_MISSING = "省份缺失"
"""可疑分类:没有省码。"""

CAT_CITY_IS_PROV = "市=省名"
"""可疑分类:市字段填的是省名。"""

CAT_URL_DUP = "url 重复"
"""可疑分类:同一个帖子地址出现多次。"""

WHY_POSTAL_TPL = "邮编 {fsa} 属 {expected},但 province={prov}"
"""可疑说明:邮编/省份错配。"""

WHY_OTTAWA_TPL = "city=Ottawa 但邮编 {fsa} 非 K1*/K2*"
"""可疑说明:Ottawa 误判。"""

WHY_DISTRICT_TPL = "district={district} 但 province={prov}(区应仅 ON/Ottawa)"
"""可疑说明:区越界。"""

WHY_AIP_TPL = "aip=True 但 province={prov} 非大西洋四省"
"""可疑说明:AIP 越界。"""

WHY_SALARY_LOW_TPL = "年薪折算 ${amount}(疑似解析错)"
"""可疑说明:薪资过低。"""

WHY_SALARY_HIGH_TPL = "年薪折算 ${amount}(疑似数字抓串)"
"""可疑说明:薪资过高。"""

WHY_PROV_MISSING_TPL = "city={city} 无省份"
"""可疑说明:省份缺失。"""

WHY_CITY_IS_PROV_TPL = "city={city} 是省名,非具体城市"
"""可疑说明:市=省名。"""

WHY_URL_DUP = "posting url 出现多次"
"""可疑说明:url 重复。"""

PRINT_AUDIT_HEAD_TPL = "=== 数据质检:{n} 帖 ===\n"
"""质检抬头(尾部空行沿用原 print)。"""

PRINT_AUDIT_DIST = "[分布]"
"""分布小节抬头。"""

PRINT_AUDIT_PROV_TPL = "  省份 : {dist}"
"""省份分布一行。"""

PRINT_AUDIT_TEER_TPL = "  TEER : {dist}"
"""TEER 分布一行。"""

PRINT_AUDIT_UNCLASSIFIED_TPL = "  未分类率: {pct}%\n"
"""未分类率一行(尾部空行沿用原 print)。"""

PRINT_AUDIT_FLAGS_HEAD = "[可疑行]  (写入 audit-flags.json 供复查)"
"""可疑行小节抬头。"""

PRINT_AUDIT_CAT_TPL = "  {cat:14} {n:4} 行   e.g. {why} — {employer}"
"""每类可疑行一行。"""

PRINT_AUDIT_TOTAL_TPL = "\n  合计可疑 {total} 行 / {n}({pct}%) → 只需复查这些"
"""可疑合计一行(前导空行沿用原 print)。"""

PRINT_AUDIT_OUT_TPL = "  详情: {out}"
"""产出路径一行。"""


# =========================================================================
# 8. 死岗验尸(逐帖验尸判死,累积 expired_ids.json)
# =========================================================================

IN_MART_OPEN_IDS = paths.PROCESSED_JOBBANK / "mart_open_ids.json"
"""09 上一轮落的「还在板上」帖号 —— 只验这些(不在板上的用户根本点不到,
实测不筛的话候选里 26% 是这种,队头 900 个中 216 个白验)。"""

OUT_STATE = paths.PROCESSED_JOBBANK / "expired_ids.json"
"""判死累积名单(mart 一手剔表,一手写 closed_jobs.json 显式下发)。"""

SUFFIX_TMP = ".tmp"
"""判死名单的原子写临时后缀。"""

RECHECK_DAYS = 7
"""活帖复检间隔(上次活着,7 天后可再验)。"""

VERIFY_MAX_DEFAULT = "900"
"""单轮请求上限的默认值:候选 ≈5.5 万,7 天复检周期要求 ≈8k/天;
900/轮 × 每轮约 2h ≈ 1万/天,刚够且不拖垮 seed。"""

VERIFY_SLEEP_DEFAULT = "0.25"
"""节流默认值:官方站,温柔点。"""

ENV_VERIFY_MAX = "VERIFY_MAX"
"""环境变量名:单轮验多少个(一次性排水补历史欠账时调大)。"""

ENV_VERIFY_SLEEP = "VERIFY_SLEEP"
"""环境变量名:每次请求之间等多久。"""

VERIFY_TIMEOUT_S = 15.0
"""验尸请求超时。"""

VERIFY_HEAD_BYTES = 6000
"""<title> 在页头,读这么多足够。"""

VERIFY_MARKER = "Job posting expired"
"""判死标记:帖页 <title> 含这句(服务端渲染裸抓可判;过期横幅是 JS 注入判不了,
第25轮判死正则误报的教训:判据必须过对照组)。"""

VERIFY_DEAD_CODES = (404, 410)
"""判死状态码 —— 实测死帖全部返 **410** 不是 404(2026-08-03 抽样 28/28 全是 410),
老判据靠 marker 兜住了,410 这半条一直是摆设。"""

VERIFY_UA = "offer2pr-expiry-check/1.0"
"""验尸的自报家门 UA —— 本役身份,不是 fetch 的伪装/礼貌两档中的任何一个,
故这一段自建客户端(换成两档任何一档 = 改我们对官方站的自报身份)。"""

HDR_UA = "User-Agent"
"""请求头名。"""

VERIFY_FRESH_DAYS = 3
"""「近几天见过」的门槛(报行里单独数一下,这些排在队尾)。"""

VERIFY_HOST = "jobbank.gc.ca"
"""只验 Job Bank 自家的帖(ATS 帖不归这条链管)。"""

K_DEAD = "dead"
"""判死名单键:帖号 → 判死时刻。"""

K_CHECKED = "checked"
"""判死名单键:帖号 → 上次验活时刻。"""

VERIFY_DATE_FMTS = ("%B %d, %Y", ISO_DATE_FMT)
"""发布日的两种写法(列表页原文 / ISO);ISO 那种只取前 10 位。"""

PRINT_VERIFY_HEAD_TPL = ("verify_expired: 候选 {cands} 帖(已跳过不在板上的 {off_board} 个;"
                         "last_seen 近 3 天内的 {fresh} 个排在队尾),本轮验 {budget}")
"""验尸起手一行(逐字沿用原文案)。"""

PRINT_VERIFY_DONE_TPL = ("verify_expired: 新判死 {dead} · 仍在招 {alive} · "
                         "网络错误跳过 {errs} · 累计死帖 {total}")
"""验尸收尾一行。"""
