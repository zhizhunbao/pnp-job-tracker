"""
company 域常量 —— 域词汇表(三件套形制**全站样张**,2026-08-30 Frank「先拿一个做样章」
+「enrich/scrape 这些都要重构到其他三个文件里」:步骤文件全溶,域=五件)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `_paths`(2026-08-30 Frank 否决「functions 段首常量」提议:functions
顶层只许函数)。本文件不做 sys.path bootstrap —— **只有门(main.py)插路径**(2026-08-30
Frank「每个文件都得导入一下吗」拍的形):件套以 company.constants 包名被引,门先把 etl/
摆上路径,_paths 自然可解。
函数体字面量同日收编(Frank「函数内部也一堆常量啊」):正则/选择器/阈值/超时全部提名,
对标 cms 魔数收编批;只有零语义的琐碎字面量(空串、±1)留在体内。
注释方言(2026-08-30 Frank「只允许 jsDoc 注释,不允许行内注释」):每个常量用
**赋值后的裸字符串 docstring**,不用行内 #;段横幅三行框保留。
零字符串令(2026-08-30 Frank「functions 不允许有字符串」):functions 里除字典键/空串/
open 模式字符三类语法位外,一切字面量(含文案 f-string,改成本文件的 *_TPL 模板)住这;
形制闸有 AST 硬规则兜底。
"""
import re

import _paths

# =========================================================================
# 1. 共享词汇(≥2 段消费)
# =========================================================================

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
"""浏览器伪装 UA(2026-08-30 收拢:kanata 与 careers 两份逐字相同 —— 目录站/官网对
无头 UA 挑剔;enrich 自报家门的礼貌 UA 是另一件事,见 POLITE_UA)。"""

HDR_UA = "User-Agent"
"""请求头名(HDR_ 词族=头名,宪法命名词族)。"""

HDR_REFERER = "Referer"
"""请求头名:来源页。"""

P_ACTION = "action"
"""WordPress AJAX 查询参数名(P_ 词族=查询参数,宪法命名词族)。"""

P_PAGED = "paged"
"""WP 翻页参数名。"""

P_PAGE_SIZE = "posts_per_page"
"""WP 每页条数参数名。"""

P_QUERY = "q"
"""DDG 搜索词参数名。"""

HREF_ATTR = "href"
"""链接节点的属性名(a[HREF_ATTR])。"""

TECH_TERMS = ("software", "technolog", "information technology", " it ", "telecom", "saas",
              "cyber", "data", "artificial intelligence", " ai", "cloud", "semiconductor",
              "electronics", "engineering", "computer", "digital", "developer", "wireless",
              "fintech", "network")
"""「算不算科技公司」的行业关键词(is_tech 的唯一判据来源)。
⚠ 2026-08-30 收拢时发现两份已漂移:kanata 版 20 词,careers 版少 " it "/"telecom"/" ai"
三个(后写的抄漏)—— 行为复制=口径开岔的现行犯。取超集;careers 阶段因此会多认
少量公司为 tech,方向=查漏不是误杀。"""
TEXT_ENCODING = "utf-8"
"""文本读写的统一编码(CSV 的 BOM 特例见 CSV_BOM_ENCODING)。"""

READ_ERRORS = "replace"
"""读外来文本的容错模式:坏字节替换不炸(JD .md 里什么编码都可能有)。"""

HTML_PARSER = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml(容器镜像瘦)。"""

WS_FOLD_RE = re.compile(r"\s+")
"""连续空白折一个(清抓来的文本)。"""

TEXT_JOIN_SEP = " "
"""折空白/拼 get_text 的单空格。"""

LIST_JOIN_SEP = ", "
"""行业标签等并列项的拼接符。"""

DOT_SEP = "."
"""域名/ATS 名的点分隔。"""

SLUG_DASH = "-"
"""slug 的连字符(折非字母数字 + 去首尾)。"""

SUFFIX_JSON = ".json"
"""三件产出的 json 后缀。"""


SLUG_RE = re.compile(r"[^a-z0-9]+")
"""slug 归一:连续非字母数字折一个 -。"""

SLUG_LEN_MAX = 60
"""slug 截断长度(文件夹名/键,够辨识不炸路径)。"""

SLUG_FALLBACK = "company"
"""名字洗空后的兜底 slug。"""


# =========================================================================
# 2. Kanata 目录抓取
# =========================================================================

KANATA_AJAX_URL = "https://www.kanatanorthba.com/wp-admin/admin-ajax.php"
"""目录数据的真实出口:页面前端渲染,但主题的 WordPress AJAX action
`elevatex_load_more_companies` 一次可吐全部会员卡片(逆向所得,免浏览器)。"""

KANATA_REFERER = "https://www.kanatanorthba.com/member-directory/"
"""AJAX 请求要带的来源页(不带会被 WordPress 挡)。"""

KANATA_REGION_LABEL = "Ottawa · Kanata North (ON)"
"""目录行的 region 格固定值(加拿大最大科技园,~520 家)。"""
KANATA_AJAX_ACTION = "elevatex_load_more_companies"
"""目录主题的 WordPress AJAX action 名(逆向所得)。"""

KANATA_PAGE_SIZE = "1000"
"""一次请求要的条数 —— 大于全园量(~520)即一发全取。"""

KANATA_TIMEOUT_S = 60
"""目录 AJAX 超时(一发全量,给足)。"""

KANATA_CARD_SEL = "article.company"
"""每家公司一张卡片的选择器。"""

KANATA_NAME_SEL = "h2.company__heading"
"""卡片里的公司名。"""

KANATA_DESC_SEL = "p.company__description"
"""卡片里的简介。"""

KANATA_TERMS_SEL = "div.company__terms"
"""卡片里的行业标签组。"""

KANATA_ADDR_SEL = "p.company__address"
"""卡片里的地址(Location 列缺失时的兜底)。"""

KANATA_COL_SEL = "div.col"
"""卡片里「Label: value」明细列。"""

KANATA_PAGE_FIRST = "1"
"""AJAX 翻页参数:第一页(配 KANATA_PAGE_SIZE 一发全取)。"""
KANATA_STEM = "kanata-north"
"""目录产出的文件名主干(2026-08-30 简化后只剩 .json)。"""

KANATA_LBL_WEBSITE = "Website"
"""卡片明细列的官网标签(目录站原文)。"""

KANATA_LBL_EMAIL = "Email"
"""卡片明细列的邮箱标签。"""

KANATA_LBL_PHONE = "Phone"
"""卡片明细列的电话标签。"""

KANATA_LBL_LOCATION = "Location"
"""卡片明细列的地址标签(缺了才兜 company__address)。"""

COL_TRIM_CHARS = " :"
"""「Label: value」取值后要剥的冒号与空格。"""

PRINT_KANATA_TPL = "Wrote {n} companies ({tech} tech) → {out}.json"
"""kanata 步收尾报数。"""




# =========================================================================
# 3. careers 页定位
# =========================================================================

ATS_HOSTS = ("greenhouse.io", "lever.co", "bamboohr", "myworkdayjobs", "workday", "ashbyhq",
             "jobvite", "icims", "smartrecruiters", "recruitee", "workable", "breezy.hr",
             "teamtailor", "applytojob", "bullhorn", "rippling", "dayforcehcm")
"""标准 ATS 平台域名 —— 命中即可在 Stage 3 直取干净的职位 JSON。"""

CAREERS_RE = re.compile(r"career|jobs?|join[-\s]?us|we[-'\s]*re[-\s]?hiring|work[-\s]?with[-\s]?us|"
                        r"opportunit|life[-\s]?at|positions", re.I)
"""首页链接里「这是招聘页」的文本特征。"""

COMMON_CAREER_PATHS = ("/careers", "/careers/", "/career", "/jobs", "/jobs/", "/join-us",
                       "/join", "/company/careers", "/about/careers", "/we-are-hiring")
"""首页没露招聘链接时逐个探的常见路径。"""
CAREERS_PATH_RE = re.compile(r"career|jobs?", re.I)
"""href 里的强信号(比链接文案匹配优先:career/jobs 路径直接定)。"""

CAREERS_TIMEOUT_S = 12
"""探单个官网的超时。"""

CAREERS_WORKERS = 10
"""careers 定位的并发线程数(原 CLI 参数,2026-08-30 一参令随入口零参化收编)。"""

LINK_TAG = "a"
"""首页扫链接的标签名。"""
CAREERS_STEM_SUFFIX = "-careers"
"""careers 三件的文件名后缀(接在目录 stem 后)。"""

NOTE_NO_CAREERS = "no careers page found"
"""探测结果备注:首页与常见路径都没招聘页。"""

STATUS_ERR_TPL = "ERR {name}"
"""探测异常时 status 格的形(异常类名)。"""

URL_ROOT_TPL = "{scheme}://{netloc}"
"""从最终响应 URL 还原站根(跟随重定向后再探常见路径)。"""

PRINT_CAREERS_RESOLVING_TPL = "Resolving careers pages for {n} companies ({workers} workers)..."
"""careers 步开工报数。"""

PRINT_CAREERS_DONE_TPL = "Done — {found}/{n} careers pages, {ats} via ATS.\n  {out}"
"""careers 步收尾报数。"""

PRINT_ATS_DIST_LABEL = "ATS 分布:"
"""收尾附打 ATS 平台分布的前缀。"""




# =========================================================================
# 4. 官网富化(E8-04 / D1=B;D2 找官网阶梯)
# =========================================================================

POLITE_UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
"""富化抓首页用的自报家门 UA(非 gov 站,礼貌先行;与伪装 UA 用途相反,不并)。"""

RETRY_FAILED_DAYS = 30
"""失败的公司多久后才重试(避免每轮死磕抓不动的站)。"""

RETRY_NOSITE_DAYS = 90
"""找不到官网的公司多久后才再找(找官网比抓首页贵)。"""

DESC_LEN_MAX = 600
"""简介截断(事实段展示够用,过长是整页倒灌;原名 MAX_DESC,2026-08-30 命名就范)。"""

ENRICH_LIMIT = 300
"""每轮最多抓多少家官网(逐轮累积清覆盖缺口)。"""

ENRICH_REFRESH_DAYS = 180
"""成功记录多久后刷新(官网快照不需要高新鲜度)。"""

FIND_LIMIT = 60
"""每轮 DDG 找官网最多搜多少家(0=关)。"""

ENRICH_MIN_INTERVAL_S = 3600
"""距上次产出不足 N 秒整轮跳过 —— 只防容器重启抖动(重启即重跑),正常节奏由域
META.interval(6h)管;2026-07-16 拍板拆出 enrich 角色的沿革见 __init__ 头注。"""

DDG_HTML_URL = "https://html.duckduckgo.com/html/"
"""DuckDuckGo HTML 版搜索端点(找官网②的兜底)。"""
ALIAS_SPLIT_RE = re.compile(r"o/a|dba|d/b/a")
"""公司名的别名分隔(o/a、dba 后面是商用名,匹配只用主名段)。"""

NAME_TOKEN_RE = re.compile(r"[a-z0-9]{3,}")
"""公司名取显著 token(≥3 字符,短词噪音大)。"""

EMAIL_DOMAIN_RE = re.compile(r"[\w.+-]+@([\w-]+\.[\w.-]+)")
"""JD 正文里挖邮箱域(找官网①的线索)。"""

URL_DOMAIN_RE = re.compile(r"https?://([\w-]+\.[\w.-]+)")
"""JD 正文里挖链接域(找官网①的线索)。"""

JD_HEAD_LEN = 600
"""JD .md 只读头部这么多字符找 url: 行(frontmatter 在头部,省 IO)。"""

TITLE_SNIFF_LEN = 4000
"""护栏复核只嗅首页前这么多字符(title/og:site_name 都在 head 里)。"""

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.S)
"""首页 <title>(护栏第二关的比对文本之一)。"""

SITE_NAME_RE = re.compile("og:site_name[\"'][^>]+content=[\"']([^\"']+)")
"""首页 og:site_name(护栏第二关的比对文本之二)。"""

GUARD_TIMEOUT_S = 8
"""护栏复核抓首页的超时(第二关,失败=不认)。"""

DDG_RESULT_RE = re.compile(r'class="result__a"[^>]+href="([^"]+)"')
"""DDG HTML 版结果链接。"""

DDG_SCAN_N = 6
"""搜索结果最多看前几条(再往后噪音)。"""

DDG_GUARD_N = 3
"""只认前几个非聚合域、逐个过护栏(宁缺勿错的预算)。"""

DDG_TIMEOUT_S = 12
"""DDG 搜索超时。"""

FIND_SLEEP_S = 1.5
"""搜索限速(礼貌:比抓首页更保守)。"""

FETCH_SLEEP_S = 0.2
"""抓首页限速(礼貌:轻微)。"""

FIND_CLIENT_TIMEOUT_S = 10
"""找官网阶段 httpx 客户端超时。"""

FETCH_TIMEOUT_S = 8
"""富化抓首页超时。"""

META_DESC_PATTERNS = (
    re.compile("<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']+)[\"']", re.I | re.S),
    re.compile("<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:description[\"']", re.I | re.S),
    re.compile("<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']", re.I | re.S),
    re.compile("<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+name=[\"']description[\"']", re.I | re.S),
)
"""简介的四个来源模式,按置信序(og:description 两向 → meta description 两向)。"""

META_KEYWORDS_PATTERNS = (re.compile("<meta[^>]+name=[\"']keywords[\"'][^>]+content=[\"']([^\"']+)[\"']", re.I | re.S),)
"""行业词来源(meta keywords)。"""

DESC_P_MIN_LEN = 80
"""meta 全空时兜底 <p> 的最短长度(短于这个多是导航碎句)。"""

KEYWORDS_TOP_N = 4
"""keywords 只取前几个当行业词(后面的多是 SEO 灌水)。"""
ST_FOUND = "found"
"""EnrichRecord.status:刚找到官网,待抓简介。"""

ST_OK = "ok"
"""EnrichRecord.status:抓到简介/行业。"""

ST_FAIL = "fail"
"""EnrichRecord.status:抓不到(原因在 note),冷却 RETRY_FAILED_DAYS。"""

ST_NOSITE = "nosite"
"""EnrichRecord.status:找不到官网,冷却 RETRY_NOSITE_DAYS。"""
HTTPS_PREFIX = "https://"
"""补协议头/拼官网 URL 用。"""

URL_SCHEMES = ("http://", "https://")
"""「已带协议」判定表。"""

SCHEME_PREFIX = "http"
"""domain_of 的宽判:http/https 都算带协议。"""

URL_DEFAULT_SCHEME = "http://"
"""裸域补个协议好让 urlparse 出 netloc。"""

PORT_SEP = ":"
"""netloc 里剥端口。"""

WWW_PREFIX = "www."
"""归一化裸域时剥掉。"""

GOV_DOMAIN_SUFFIX = ".gc.ca"
"""联邦域一律不算公司官网。"""

NONALNUM_RE = re.compile(r"[^a-z0-9]")
"""域名核心串归一:剥掉一切非字母数字再与公司名 token 比对。"""

MD_GLOB = "*.md"
"""JD 详情缓存的文件模式。"""

JD_URL_LINE_RE = re.compile(r"^url:\s*(.+)$", re.M)
"""JD .md 头部的 url: 行(反查 posting ↔ 文件)。"""

DDG_QUERY_TPL = '"{name}" {province} Canada'
"""DDG 搜索词:公司名精确短语 + 省 + 国名。"""

DDG_REDIRECT_PARAM = "uddg"
"""DDG 跳转链里的真实目标参数名(/l/?uddg=<encoded>)。"""

ISO_UTC_OFFSET = "+00:00"
"""isoformat 的 UTC 尾巴(存储统一换 Z)。"""

ISO_Z = "Z"
"""fetched 时刻的 UTC 记号。"""

P_TAG_RE = re.compile(r"<p[^>]*>(.*?)</p>", re.I | re.S)
"""meta 全空时兜底扫 <p> 段落。"""

TAG_STRIP_RE = re.compile(r"<[^>]+>")
"""段落文本里剥标签。"""

KEYWORDS_SPLIT_SEP = ","
"""meta keywords 的分隔。"""

FOUND_JD = "jd"
"""EnrichRecord.found:官网来路 = JD 正文线索。"""

FOUND_SEARCHED = "searched"
"""EnrichRecord.found:官网来路 = DDG 搜索(前端加小字标注)。"""

NOTE_NO_META = "no meta"
"""富化失败原因:首页没有可提取的 meta。"""

NOTE_HTTP_TPL = "http {status}"
"""富化失败原因:HTTP 非 2xx。"""

PRINT_ENRICH_SKIP_TPL = "距上次官网富化 {mins:.0f} 分钟(< {limit} 分钟),本轮跳过"
"""自限流跳过的报数。"""

PRINT_ENRICH_IN_TPL = "IN postings : {path}"
"""富化步开工报输入。"""

PRINT_FIND_TPL = "找官网: 无官网公司 {n} · 本轮 JD 线索 +{jd} · DDG +{search}(find-limit {limit})"
"""找官网阶梯报数。"""

PRINT_TARGETS_TPL = "目标公司(有官网,非 ATS): {targets} · 缓存: {cache} · 本轮抓: {todo}(limit {limit})"
"""待抓池报数。"""

PRINT_ENRICH_DONE_TPL = "本轮 ✓ {ok} 抓到 · ✗ {fail} 无内容/失败 · 累计成功 {total}/{n} 家 → {out}"
"""富化步收尾报数。"""




NAME_STOP = {"the", "and", "inc", "incorporated", "ltd", "ltee", "limited", "llp", "llc", "corp",
             "corporation", "company", "co", "of", "du", "de", "la", "le", "les", "et", "group",
             "groupe", "services", "service", "enterprises", "enterprise", "canada", "canadian",
             "holdings", "holding", "international", "solutions", "consulting", "management"}
"""名称归一停用词(公司后缀+泛词)—— 不参与「域名↔公司名」匹配。"""

NOT_OFFICIAL = {"indeed.com", "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
                "tiktok.com", "youtube.com", "yelp.ca", "yelp.com", "yellowpages.ca", "yellowpages.com",
                "jobbank.gc.ca", "guichetemplois.gc.ca", "glassdoor.ca", "glassdoor.com", "zoominfo.com",
                "opencorporates.com", "canada411.ca", "bloomberg.com", "dnb.com", "ziprecruiter.com",
                "kijiji.ca", "careerbeacon.com", "workopolis.com", "monster.ca", "jooble.org",
                "talent.com", "simplyhired.ca", "wikipedia.org", "betterteam.com", "jobillico.com",
                "trustpilot.com", "google.com", "duckduckgo.com", "cylex.ca", "forms.gle", "bit.ly",
                "wa.me", "mapquest.ca", "grabjobs.co", "postjobfree.com", "workingincanada.gc.ca"}
"""聚合站/社交/黄页域名 —— 搜索结果里绝不是「官网」。"""

GENERIC_MAIL = {"gmail.com", "gmail.ca", "hotmail.com", "hotmail.ca", "yahoo.com", "yahoo.ca",
                "outlook.com", "outlook.ca", "icloud.com", "live.com", "live.ca", "aol.com", "me.com",
                "msn.com", "telus.net", "shaw.ca", "bell.net", "sympatico.ca", "rogers.com",
                "protonmail.com", "mail.com", "videotron.ca", "eastlink.ca", "cogeco.ca", "sasktel.net"}
"""JD 里的通用邮箱域 —— 不是官网线索。"""

# =========================================================================
# 5. IN/OUT 路径(经 _paths 解析;「这步读什么写哪」全域一处可 grep)
# =========================================================================

OUT_KANATA_DIR = _paths.RAW_COMPANIES
"""段2 目录三件(kanata-north.json/.csv/.md)的落盘目录。"""

IN_FOLDERS_DIRECTORY = _paths.RAW_COMPANIES / "kanata-north.json"
"""段3 输入:扁平公司目录(段2 的产物)。"""

IN_FOLDERS_CAREERS = _paths.RAW_COMPANIES / "kanata-north-careers.json"
"""段3 输入:careers 定位结果(段4 的产物;可缺,缺则只写 profile)。"""

OUT_FOLDERS_ROOT = _paths.COMPANIES
"""段3 输出:一司一档的根(processed/ats;_paths.COMPANIES 已含地域语义)。"""
PROFILE_FILE = "profile.json"
"""一司一档里的身份档文件名。"""

CAREERS_FILE = "careers.json"
"""一司一档里的招聘页档文件名。"""

INDEX_FILE = "_index.json"
"""一司一档根上的总索引文件名(下划线开头,排目录顶且不与 slug 撞)。"""
SLUG_DUP_TPL = "{slug}-{n}"
"""slug 撞名消歧:挂序号。"""

PRINT_FOLDERS_TPL = "Region '{region}': {made} company folders created, {careers} with careers.json.\n  {root}"
"""一司一档步收尾报数。"""



IN_CAREERS_DIRECTORY = _paths.RAW_COMPANIES / "kanata-north.json"
"""段4 输入:扁平公司目录(段2 的产物)。"""

IN_ENRICH_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"
"""段5 输入:公司官网来源(employer + website)。"""

IN_ENRICH_JD_DETAILS = _paths.PROCESSED / "jobbank" / "details"
"""段5 输入:已抓 JD .md(找官网①:JD 正文域名线索 —— 雇主自己写的,置信最高)。"""

IN_ENRICH_ATS = _paths.PROCESSED_ATS
"""段5 输入:ATS 公司已自带 profile,跳过不富化。"""

OUT_ENRICH_CACHE = _paths.PROCESSED / "company_enrich.json"
"""段5 输出:增量缓存(slug → EnrichRecord);09 汇装直读合并进 companies 行。"""

