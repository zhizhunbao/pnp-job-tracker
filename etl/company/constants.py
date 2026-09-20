"""
company 域常量 —— 域词汇表(三件套形制**全站样张**,2026-08-30 Frank「先拿一个做样章」
+「enrich/scrape 这些都要重构到其他三个文件里」:步骤文件全溶,域=五件)。

判据(照 cms 宪法同款):常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径。
唯一特批 import = `paths`(2026-08-30 Frank 否决「functions 段首常量」提议:functions
顶层只许函数)。本文件不做 sys.path bootstrap —— **只有门(main.py)插路径**(2026-08-30
Frank「每个文件都得导入一下吗」拍的形):件套以 company.constants 包名被引,门先把 etl/
摆上路径,paths 自然可解。
函数体字面量同日收编(Frank「函数内部也一堆常量啊」):正则/选择器/阈值/超时全部提名,
对标 cms 魔数收编批;只有零语义的琐碎字面量(空串、±1)留在体内。
注释方言(2026-08-30 Frank「只允许 jsDoc 注释,不允许行内注释」):每个常量用
**赋值后的裸字符串 docstring**,不用行内 #;段横幅三行框保留。
零字符串令(2026-08-30 Frank「functions 不允许有字符串」):functions 里除字典键/空串/
open 模式字符三类语法位外,一切字面量(含文案 f-string,改成本文件的 *_TPL 模板)住这;
形制闸有 AST 硬规则兜底。
"""
import re

import paths

# =========================================================================
# 1. 共享词汇(≥2 段消费)
# =========================================================================

HDR_REFERER = "Referer"
"""请求头名:来源页。"""

P_ACTION = "action"
"""WordPress AJAX 查询参数名(P_ 词族=查询参数,宪法命名词族)。"""

P_PAGED = "paged"
"""WP 翻页参数名。"""

P_PAGE_SIZE = "posts_per_page"
"""WP 每页条数参数名。"""

P_QUERY = "q"
"""搜索词参数名(DDG HTML 版与 Google Programmable Search 同名同用)。"""

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

PULSE_RANK_MAX = 100
"""把脉页雇主链只补各大类前多少名(sites 步搜官网、about 步浏览器兜底两段同用)。
2026-09-08 Frank /fe 拍板「各表前 100 名」:页面 Top 100 档能看到的全部;母集 24,587 家里
前 100 名 2,616 家(有官网 40%、简介成 30%),再往下是没人翻到的行,不烧配额。"""


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

IN_ENTRIES_CAREERS = paths.RAW_KANATA / "kanata-north-careers.json"
"""入口定位步输入:careers 步的产物(有招聘页却没认出 ATS 的行才是本步的活)。"""

OUT_ENTRIES = paths.RAW_KANATA / "career-entries.json"
"""入口定位步输出:一行 = 公司名 + 招聘页 + 真正的职位列表入口 + ATS 名 + 看过几页。folders 步并进一司一档,
优先级:人工核定表 > 本表 > careers 步的自动探测。"""

ENTRY_SLUG_TPL = "careers-{slug}"
"""crawl 层的站点 slug(一家公司的招聘站一份 manifest + html_cache;与 ats 域职位页的 `ats-<公司>` 分开放)。"""

ENTRY_DEPTH = 2
"""从招聘落地页往里爬的层数(2026-09-19 Frank「我不是有 crawl 吗」:大公司的职位列表入口藏在落地页往里第二、三层,
careers 步只看落地页源码所以认不出;探未知 URL 本来就是 crawl 域的活,本步只管喂种子、读缓存)。"""

ENTRY_MAX_PAGES = 12
"""一家公司招聘站最多收的页数(找入口用不着全站)。"""

ENTRY_KEYWORDS = "career,job,join,opening,position,opportunit,emploi,carri"
"""限域关键词:同站里路径带这些词的页也收(招聘落地页常在 /company/careers,职位列表却在 /jobs)。"""

ENTRY_TIMEOUT_S = 150
"""一家公司招聘站探索的总时限秒(超时 = 这家本轮跳过,留痕)。"""

ENTRY_MERGE_ATS = {"myworkdayjobs", "greenhouse", "lever", "bamboohr", "ashbyhq", "workable", "smartrecruiters",
                   "recruitee", "successfactors", "oraclecloud"}
"""入口定位步认出的行里,哪些 ATS 的才并进一司一档:ats 域会抓、且抓的时候带地点口径的这几家。
Phenom 不在内 —— 它只能把全站职位页抓回来再筛(Honeywell / Cisco 这种全球站一轮上千页),等有带地点的取法再放开;
其余(adp / ultipro / icims / jobvite …)ats 域还不会抓,只记不并。"""

ENTRY_HOP_SLUG_TPL = "careers-{slug}-hop"
"""第二跳的 crawl 站点 slug。2026-09-19 首轮实测:89 家只认出 7 家,没认出的 82 家里 50 家只爬到 1 页 ——
职位列表挂在**另一个子域**(jobs.nokia.com / careers.synopsys.com / careerhub.qlik.com …),crawl 的限域是同主机,跨不过去。
所以没认出的再跳一次:从已缓存的页里挑一条指向「招聘味子域」的外链当新种子,浅爬一层再认。"""

ENTRY_HOP_LINK_RE = re.compile(
    r"https?://(?:[a-z0-9-]+\.)*(?:jobs?|careers?|careerhub|recruiting|talent|emplois?)\.[a-z0-9.-]+[^\s\"'<>\\]*", re.I)
"""指向「招聘味子域」的链接(主机名里有一节就是 jobs / careers / careerhub / recruiting / talent / emplois)。"""

ENTRY_HOP_DEPTH = 1
"""第二跳往里爬的层数。"""

ENTRY_HOP_MAX_PAGES = 6
"""第二跳最多收的页数。"""

ENTRY_LINK_RES = {
    "myworkdayjobs": re.compile(r"https?://[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com/[^\s\"'<>\\]+", re.I),
    "greenhouse": re.compile(r"https?://(?:job-)?boards\.greenhouse\.io/[^\s\"'<>\\]+", re.I),
    "lever": re.compile(r"https?://jobs\.lever\.co/[^\s\"'<>\\]+", re.I),
    "bamboohr": re.compile(r"https?://[a-z0-9-]+\.bamboohr\.com[^\s\"'<>\\]*", re.I),
    "ashbyhq": re.compile(r"https?://jobs\.ashbyhq\.com/[^\s\"'<>\\]+", re.I),
    "workable": re.compile(r"https?://apply\.workable\.com/[^\s\"'<>\\]+", re.I),
    "smartrecruiters": re.compile(r"https?://(?:jobs|careers)\.smartrecruiters\.com/[^\s\"'<>\\]+", re.I),
    "recruitee": re.compile(r"https?://[a-z0-9-]+\.recruitee\.com[^\s\"'<>\\]*", re.I),
    "icims": re.compile(r"https?://[a-z0-9-]+\.icims\.com[^\s\"'<>\\]*", re.I),
    "jobvite": re.compile(r"https?://jobs\.jobvite\.com/[^\s\"'<>\\]+", re.I),
    "dayforcehcm": re.compile(r"https?://[a-z0-9-]+\.dayforcehcm\.com/[^\s\"'<>\\]+", re.I),
    "ultipro": re.compile(r"https?://recruiting\d*\.ultipro\.c(?:a|om)/[^\s\"'<>\\]+", re.I),
    "njoyn": re.compile(r"https?://[a-z0-9-]+\.njoyn\.com/[^\s\"'<>\\]+", re.I),
    "taleo": re.compile(r"https?://[a-z0-9-]+\.taleo\.net/[^\s\"'<>\\]+", re.I),
    "adp": re.compile(r"https?://(?:workforcenow|recruiting)\.adp\.com/[^\s\"'<>\\]+", re.I),
    "teamtailor": re.compile(r"https?://[a-z0-9-]+\.teamtailor\.com[^\s\"'<>\\]*", re.I),
    "applytojob": re.compile(r"https?://[a-z0-9-]+\.applytojob\.com[^\s\"'<>\\]*", re.I),
    "rippling": re.compile(r"https?://ats\.rippling\.com/[^\s\"'<>\\]+", re.I),
}
"""页面里直接露出职位列表地址的招聘系统:命中的那条地址就是入口(ats 域从地址里认 token / 站点)。
键 = ATS 名,与 ats 域的名字一致;ats 域还不会抓的(icims / jobvite / dayforcehcm / ultipro / njoyn …)也照认照记 ——
哪家招聘系统用的公司多,就是下一个该写的取岗器。表序即优先级(一页里露出几家时取先命中的)。"""

ENTRY_SITE_RES = {
    "successfactors": re.compile(r"successfactors\.(?:com|eu)|rmkcdn\.", re.I),
    "phenom": re.compile(r"phenompeople\.com", re.I),
    "radancy": re.compile(r"talentbrew\.com|radancy\.net", re.I),
    "eightfold": re.compile(r"eightfold\.ai", re.I),
    "avature": re.compile(r"avature\.net", re.I),
    "paylocity": re.compile(r"recruiting\.paylocity\.com", re.I),
}
"""招聘站本身就架在招聘系统上、页面里只露资源指纹的两家:入口 = 命中那一页所在站的根(jobs.rogers.com 这种自有域名)。"""
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

PRINT_ENTRY_ROW_TPL = "  {name}: {ats} ({pages} pages) {url}"
"""入口定位步逐家一行:公司名、认出的 ATS(没认出是横杠)、看过几页、入口地址。"""

PRINT_ENTRY_DONE_TPL = "Entries: {n} companies crawled, {found} entries found.\n  {path}"
"""入口定位步收尾行。"""

DASH_NONE = "-"
"""没认出时打印用的横杠。"""

STATUS_OK = "200"
"""入口定位步并进一司一档时写的状态(入口是从 200 的缓存页里认出来的)。"""

PRINT_CAREERS_RESOLVING_TPL = "Resolving careers pages for {n} companies ({workers} workers)..."
"""careers 步开工报数。"""

PRINT_CAREERS_DONE_TPL = "Done — {found}/{n} careers pages, {ats} via ATS.\n  {out}"
"""careers 步收尾报数。"""

PRINT_ATS_DIST_LABEL = "ATS 分布:"
"""收尾附打 ATS 平台分布的前缀。"""




# =========================================================================
# 4. 官网富化(E8-04 / D1=B;D2 找官网阶梯)
# =========================================================================

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

TITLE_SNIFF_LEN = 20000
"""护栏复核只嗅首页前这么多字符(title/og:site_name 都在 head 里)。
2026-09-20 由 4000 放到 20000:coquitlam.ca 的 <title> 在第 6172 个字符(前面是一串统计脚本),嗅不到标题,
排第一的真官网过不了护栏,排第三的 visitcoquitlam.ca 反而中了(点开优先生产验收实撞)。"""

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

DDG_NO_RESULTS_MARK = "no-results"
"""DDG HTML 版「真的没结果」页的标记(class="no-results")。零结果链接又没这个标记 = 挡壳页
(2026-09-05 实撞:容器里 DDG 回 200 空壳,原逻辑当查无记了 47 家 nosite 冷却 90 天)—— 记传输失败。"""

DDG_FAIL_STOP = 3
"""DDG 连续几次传输失败(断连/超时/非 2xx)就停本轮 —— 2026-09-05 实撞:sites 首跑中途被 DDG
限流,后面每家 ConnectTimeout,原逻辑把它们全记成 nosite 冷却 90 天(传输失败 ≠ 查无)。"""

DDG_BACKOFF_S = 60
"""DDG 一次传输失败后歇多久再试(限流多半几分钟内解)。"""

FIND_FLUSH_N = 50
"""DDG 每查这么多家就把缓存落一次盘(整轮几千家,中途被杀不丢已得结果)。"""

PRINT_FIND_ROW_TPL = "  {status:6} {name} → {site}"
"""DDG 每查一家报一行(status = found / nosite / fail)。"""

PRINT_SEARCH_STOP_TPL = "搜索连续 {n} 次传输失败,本轮停止(已查 {done} 家;剩余不记 nosite,下轮续)"
"""搜索熔断出口一句(DDG 与 Google 同用;2026-09-08 自 PRINT_DDG_STOP_TPL 改名)。"""

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

SEARCH_QUERY_TPL = '"{name}" {province} Canada'
"""搜索词:公司名精确短语 + 省 + 国名(DDG 与 Google Programmable Search 同一句;
2026-09-08 自 DDG_QUERY_TPL 改名,两个后端共用)。"""

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
"""EnrichRecord.found:官网来路 = 搜索出来的(DDG 或 Google Programmable Search;前端加小字标注)。"""

FOUND_WIKI = "wikidata"
"""EnrichRecord.found:官网来路 = Wikidata 官网属性(P856)。2026-09-09 Frank「能用 wiki 尽量用 wiki」:
Google Custom Search JSON API 已对新项目关闭(2027-01-01 停服,新引擎「搜索整个网络」开关禁用)、DDG 封 IP;
Wikidata 免费稳定,公共机构(市政府 / 卫生局 / 学区 / 省政府)条目齐全 —— 进阶梯②,搜索退到③兜底。"""

WIKI_LIMIT = 300
"""sites 步一轮最多查多少家 Wikidata(每家 2 发 API + 护栏抓一次首页 ≈ 2s,300 家 ≈ 10 分钟)。"""

WIKI_FAIL_STOP = 3
"""Wikidata 连续几次请求失败就跳过本轮阶梯②(网络/限速;不记任何缓存,下轮续)。"""

WIKI_BACKOFF_S = 60
"""Wikidata 一次请求失败后歇多久再试(2026-09-09 冒烟两次实撞 429:10 发/4s、12 发/10s 都撞)。"""

WIKI_SLEEP_S = 3.0
"""阶梯②两家之间的间隔(每家 2 发 API ≈ 0.6 发/s;WD_SLEEP_S 0.6 是别名步的节奏,1.5s 仍撞 429,再放慢一倍)。"""

WD_SITE_PROPS = "labels|aliases|claims"
"""找官网那一发 wbgetentities 要的属性(claims 里取 P856;不要 sitelinks —— 官网与「知名」不是一个门槛)。"""

PROP_WEBSITE = "P856"
"""Wikidata 属性:官方网站。"""

K_CLAIMS = "claims"
"""实体里的声明表键。"""

K_MAINSNAK = "mainsnak"
"""一条声明的主值键。"""

K_DATAVALUE = "datavalue"
"""主值里的数据值键(字符串属性的 value 直接是 URL)。"""

PRINT_WIKI_STOP_TPL = "Wikidata 连续 {n} 次请求失败,本轮阶梯②跳过(已查 {done} 家)"
"""Wikidata 熔断出口一句。"""

NOTE_NO_META = "no meta"
"""富化失败原因:首页没有可提取的 meta。"""

NOTE_HTTP_TPL = "http {status}"
"""富化失败原因:HTTP 非 2xx。"""

PRINT_ENRICH_SKIP_TPL = "距上次官网富化 {mins:.0f} 分钟(< {limit} 分钟),本轮跳过"
"""自限流跳过的报数。"""

PRINT_ENRICH_IN_TPL = "IN postings : {path}"
"""富化步开工报输入。"""

PRINT_FIND_TPL = "找官网: 无官网公司 {n} · 本轮 JD 线索 +{jd} · Wikidata +{wiki} · 搜索 +{search}(find-limit {limit})"
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
# 5. IN/OUT 路径(经 paths 解析;「这步读什么写哪」全域一处可 grep)
# =========================================================================

OUT_KANATA_DIR = paths.RAW_KANATA
"""段2 目录三件(kanata-north.json/.csv/.md)的落盘目录。"""

IN_FOLDERS_DIRECTORY = paths.RAW_KANATA / "kanata-north.json"
"""段3 输入:扁平公司目录(段2 的产物)。"""

IN_FOLDERS_CAREERS = paths.RAW_KANATA / "kanata-north-careers.json"
"""段3 输入:careers 定位结果(段4 的产物;可缺,缺则只写 profile)。"""

IN_FOLDERS_CURATED = paths.RAW_KANATA / "curated-careers.json"
"""段3 输入:人工核定的招聘入口表(2026-09-19 Frank「可以,做第 1 批」;可缺)。一行 = 目录行身份格 + careers_url + ats。
起因:自动探测只认招聘落地页上的 ATS 指纹,大公司的职位列表藏在第二、三层(Ciena / Mitel 的 Workday 站点落地页上没有),
渥太华 137 家里真抓到岗的只有 19 家。表里还可带一格 hq(公司本部所在市,人工核定;只填 hq 不填入口的行 = 只核本部、入口照用自动探测的)。这张表里的行**盖过**自动探测结果(同名以这里为准),目录里没有的公司直接补进目录
(Lumentum / Giatec 不在 Kanata North 名录里)。地址是用浏览器逐家点到职位列表页记下来的,不是猜的。"""

OUT_FOLDERS_ROOT = paths.COMPANIES
"""段3 输出:一司一档的根(processed/ats;paths.COMPANIES 已含地域语义)。"""
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



IN_CAREERS_DIRECTORY = paths.RAW_KANATA / "kanata-north.json"
"""段4 输入:扁平公司目录(段2 的产物)。"""

IN_ENRICH_POSTINGS = paths.PROCESSED_JOBBANK / "postings.json"
"""段5 输入:公司官网来源(employer + website)。"""

IN_ENRICH_JD_DETAILS = paths.PROCESSED / "jobbank" / "details"
"""段5 输入:已抓 JD .md(找官网①:JD 正文域名线索 —— 雇主自己写的,置信最高)。"""

IN_ENRICH_ATS = paths.PROCESSED_ATS
"""段5 输入:ATS 公司已自带 profile,跳过不富化。"""

OUT_ENRICH_CACHE = paths.PROCESSED / "company_enrich.json"
"""段5 输出:增量缓存(slug → EnrichRecord);09 汇装直读合并进 companies 行。"""

IN_FACTS_JOBS = paths.MART / "jobs.json"
"""段6 输入:mart 岗位表(算行业多数派用,零新抓取)。"""

IN_FACTS_COMPANIES = paths.MART / "companies.json"
"""段6 输入:mart 公司表(取公司名 + LMIA 技能岗数,定 Wikidata 候选)。"""

OUT_FACTS = paths.PROCESSED / "company_facts.json"
"""段6 输出:雇主 D 富化产物(by_slug 行业 + by_name 别名/知名)。入库由
scratchpad 的 apply_company_facts.mjs 直写 companies(industry/alias_zh/alias_ko/wiki_url
在 seed 白名单外,增量对账不动它们);重跑幂等,可周期性刷新。"""

IN_PLACES_COMPANIES = paths.MART / "companies.json"
"""places 步读:公司表(担保信号 lmiaPositions4q 与省码 region)。"""

IN_PLACES_JOBS = paths.MART / "jobs.json"
"""places 步读:岗位表(在招数 = 查询优先级;查全部在招雇主,担保的排在前)。
2026-09-15 扩母集前原句:只查在招的担保雇主。"""

OUT_PLACES = paths.RAW_COMPANIES / "company_places.json"
"""places 步写:slug → PlaceRecord(官网/地址/业务类型;09 汇装的候选输入)。原响应不在这:
一次查询一份经 put_cached_page 进 crawl/companies/(2026-09-05 Frank「改」+「都放到 companies 目录」:
原先落 raw/places/<slug>.json 绕过了 crawl 的门,manifest 没登记 —— 四层铁律 crawl → raw → processed → mart)。"""

IN_ABOUT_ENRICH = paths.PROCESSED / "company_enrich.json"
"""about 步读:sites 步刚找到、build 还没合并进 companies 的官网(found 记录)。"""

OUT_ABOUT = paths.RAW_COMPANIES / "company_about.json"
"""about 步写、brief 步读:slug → AboutRecord(官网首页 + About 页正文,已剥标签裁长)。
原文在 crawl/companies/,这是从原文抽出的表 → raw(2026-09-05 归位);brief 是模型派生 → processed。"""

OUT_BRIEF = paths.PROCESSED / "company_brief.json"
"""brief 步写:slug → BriefRecord(五节英文简介 + 中文;09 汇装进 companies.ai_brief/ai_brief_zh)。"""


# =========================================================================
# 6. 雇主 D 富化(行业 + 中韩别名 + 知名;2026-07-19 Frank 批「开工做雇主 D」)
# =========================================================================

WD_API_URL = "https://www.wikidata.org/w/api.php"
"""Wikidata 的 action API 根。
⛔ 本段的 Wikidata 那半边已退役(#109/#111,2026-07-20 Frank「不要提前跑」):别名/知名
改 K 懒探索时并行查(cms/src/lib/companyResearch.ts,一家一生一次);**本段别再批量跑
Wikidata**(1668 家网络失败近千,跑不完)。行业那半边(本地 mart 零网络)保留可手动重跑。"""

WD_UA = "offer2pr-company-facts/1.0 (https://offer2pr.com; data enrichment)"
"""自报家门(本役身份)。"""

HDR_USER_AGENT = "User-Agent"
"""请求头名。"""

QUERY_MARK = "?"
"""URL 的查询串起始。"""

P_SEARCH = "search"
"""wbsearchentities 的查询词参数名。"""

P_LANGUAGE = "language"
"""搜索语言参数名。"""

P_TYPE = "type"
"""搜索实体类型参数名。"""

P_LIMIT = "limit"
"""搜索条数上限参数名。"""

P_IDS = "ids"
"""wbgetentities 的实体 id 清单参数名。"""

P_PROPS = "props"
"""wbgetentities 要取哪些属性的参数名。"""

P_LANGUAGES = "languages"
"""wbgetentities 要哪几种语言的参数名。"""

P_FORMAT = "format"
"""响应格式参数名。"""

ACT_SEARCH = "wbsearchentities"
"""按名搜实体。"""

ACT_GET_ENTITIES = "wbgetentities"
"""按 id 批量取实体。"""

TYPE_ITEM = "item"
"""只搜条目(不搜属性)。"""

FORMAT_JSON = "json"
"""响应格式。"""

WD_PROPS = "labels|aliases|sitelinks"
"""要的三样:标签、别名、跨站链接。"""

WD_LANGUAGES = "en|zh|ko"
"""要的三种语言。"""

ID_SEP = "|"
"""批量取实体时 id 的分隔符。"""

WD_SEARCH_LIMIT = 3
"""严格匹配:只看搜索前 3 个条目。"""

WD_TIMEOUT_S = 20
"""单次请求超时。"""

WD_SLEEP_S = 0.6
"""温和限速。"""

LANG_EN = "en"
"""英文标签/别名的语言键(严格名称匹配只认它)。"""

LANG_ZH = "zh"
"""中文标签键(官方条目名,不机翻)。"""

LANG_KO = "ko"
"""韩文标签键。"""

K_SEARCH = "search"
"""搜索响应体里的命中清单键。"""

K_ID = "id"
"""搜索命中行里的实体 id 键。"""

K_ENTITIES = "entities"
"""批量取实体的响应体键。"""

K_LABELS = "labels"
"""实体里的标签表键。"""

K_ALIASES = "aliases"
"""实体里的别名表键。"""

K_VALUE = "value"
"""标签/别名行里的文本键。"""

K_SITELINKS = "sitelinks"
"""实体里的跨站链接表键。"""

K_ENWIKI = "enwiki"
"""英文维基那条跨站链接的键。"""

K_TITLE = "title"
"""跨站链接里的条目标题键。"""

WIKI_URL_PREFIX = "https://en.wikipedia.org/wiki/"
"""英文维基条目 URL 前缀。"""

WIKI_SPACE = " "
"""条目标题里的空格(转下划线前的原样)。"""

WIKI_UNDERSCORE = "_"
"""维基 URL 里替空格的下划线。"""

K_STATUS = "status"
"""mart 岗位行键:开放/关闭。"""

STATUS_OPEN = "open"
"""岗位状态缺格时的默认值(与 mart 同口径)。"""

STATUS_CLOSED = "closed"
"""已关闭的岗不算行业票。"""

K_COMPANY_SLUG = "companySlug"
"""mart 岗位行键:所属公司 slug。"""

K_BROAD = "broad"
"""mart 岗位行键:NOC 大类中文值(前端 t('broad.*') 三语显示)。"""

UNCLASSIFIED = "未分类"
"""大类未分类 —— 不投行业票。"""

K_SLUG = "slug"
"""mart 公司行键:slug。"""

K_NAME = "name"
"""mart 公司行键:公司名。"""

K_LMIA_POSITIONS_SKILLED = "lmiaPositionsSkilled"
"""mart 公司行键:LMIA 技能岗获批数(定候选用)。"""

K_BY_SLUG = "by_slug"
"""产出体键:按 slug 索引的行业。"""

K_BY_NAME = "by_name"
"""产出体键:按公司名索引的 Wikidata 结果缓存。"""

K_INDUSTRY = "industry"
"""by_slug 行里的行业格。"""

K_WIKI_CHECKED = "wiki_checked"
"""by_name 行里的「查过了」标记 —— 幂等靠它(命中与确认未命中都记;失败的不写,自然重试)。"""

K_ZH = "zh"
"""by_name 行里的中文别名格。"""

K_KO = "ko"
"""by_name 行里的韩文别名格。"""

K_WIKI = "wiki"
"""by_name 行里的英文维基 URL 格(有它才算知名)。"""

WIKI_CHECKED_MARK = 1
"""「查过了」标记的值(逐字沿用原件的 1,不改成 True —— 落盘 JSON 会变形)。"""

FACTS_SUFFIX_RE = re.compile(
    r"\b(incorporated|inc|ltd|limited|llp|llc|corp|corporation|co|company|ltee|ltée|group|"
    r"holdings?)\b\.?", re.I)
"""公司名归一:法人后缀。⚠ 故意不收进 names 基建叶(2026-08-31 收拢批 Frank 拍板
「合两把留两把」):本件产出的归一名已作为键落盘在 Wikidata facts 缓存里,换尺子 = 现有
缓存键全部失配,而 Wikidata 半边已退役(#109/#111)禁重跑 —— 改不起也没必要改。
56,909 名探针:与 names.norm_name 差 23%(本件保留标点、词表更短)。
(cms/src/lib/employers 那侧的注释也点名本件为同门槛来源。)"""

FACTS_COMMA = ","
"""归一时折成空格的逗号。"""

CAND_MIN_JOBS = 3
"""候选门槛①:在库开放岗 ≥3 家。"""

CAND_MIN_LMIA_SKILLED = 10
"""候选门槛②:LMIA 技能岗获批 ≥10(技能股大户)。"""

FACTS_TICK = 50
"""每查这么多家报一次进度并增量落盘(长跑中断不丢已查结果 —— 网络抖动是常态,
一次全跑完是奢望)。"""

FACTS_INDENT = 1
"""产出落盘缩进(逐字沿用原件的 1)。"""

PRINT_FACTS_IN_TPL = "IN_JOBS={jobs}\nIN_COMPANIES={companies}\nOUT={out}"
"""起手三行输入输出(原件在模块顶 import 期打,溶解后归段入口第一句;内容逐字不变)。"""

PRINT_FACTS_INDUSTRY_TPL = "industry: {n} 家(来自 {open_jobs} 开放岗)"
"""行业多数派报数。"""

PRINT_FACTS_CANDS_TPL = "wikidata 候选: {n} 家"
"""候选数报数。"""

PRINT_FACTS_TICK_TPL = "  {i}/{n} · wiki 命中 {hit} · 失败 {errs}"
"""长跑心跳。"""

PRINT_FACTS_DONE_TPL = "done → {out} · industry {n} · wiki {hit} · 有中/韩别名 {alias}"
"""收尾一行。"""


# =========================================================================
# 7. 把脉页雇主补官网/地址(2026-09-04 Frank「帮我开」Google Places → 试跑 10 家后改口
#    「走 DuckDuckGo 跑起来」→ DDG 限流实撞 → Places 两档只吃免费额)。母集 = 把脉页雇主段
#    两栏都在的雇主:在招且(近四季有 LMIA 或 在招 TEER 0-3 岗)—— 2026-09-05 Frank「不花钱就跑呗」
#    从 3,995 家扩到两栏口径;不是全量 —— 与「公司详情全懒」(2026-07-20)不冲突)
# =========================================================================

PLACES_CACHE_URL_TPL = "{url}?q={query}"
"""原响应在 crawl 层的键(POST 没有自然 URL,拼「端点?q=搜索词」当页地址;重跑先查缓存不打 API)。
站点 slug 与官网页同用 CRAWL_SLUG_COMPANIES,一份 manifest 按 url 分得清。"""

JSON_INDENT = 2
"""原响应落 crawl 层时的缩进(人眼可读)。"""

TEER_SKILLED = ["0", "1", "2", "3"]
"""「有工签」栏的雇主判据:在招岗里有 TEER 0-3 的(与 cms start 域 isValuableEmp 的 pgwp 档同口径)。"""

ENV_PLACES_KEY = "GOOGLE_PLACES_KEY"
"""密钥环境变量名(仓库根 .env;Frank 亲手抄,代码与日志不落值)。"""

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
"""Places API (New) 文本搜索端点(POST JSON)。"""

HDR_API_KEY = "X-Goog-Api-Key"
"""密钥请求头名。"""

HDR_FIELD_MASK = "X-Goog-FieldMask"
"""字段掩码请求头名(计费按掩码档:websiteUri 属 Enterprise 档,约 3.5 美分/次)。"""

PLACES_MASK_PRO = ("places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,"
                   "places.addressComponents,places.location,places.googleMapsUri,"
                   "places.primaryType,places.primaryTypeDisplayName,places.types,places.businessStatus")
"""Pro 档掩码(每月 5,000 次免费):名字/地址/坐标/类型/营业状态 —— 库里已有官网的公司用这档,
把地址与业务类型补齐不花钱(2026-09-05 Frank「尽可能把需要的信息都拿到」)。"""

PLACES_MASK_ENT = (PLACES_MASK_PRO + ",places.websiteUri,places.nationalPhoneNumber,"
                   "places.internationalPhoneNumber,places.rating,places.userRatingCount")
"""Enterprise 档掩码(每月 1,000 次免费,超出约 3.5 美分/次):Pro 全部 + 官网/电话/评分 ——
缺官网的公司用这档。⚠ reviews/editorialSummary 属 Enterprise+Atmosphere 更贵一档,不要。
2026-09-05 准确率测试:30 家有官网金标,29 家官网对(5 家域名不同但同一公司),1 家 Google 没官网。"""

TIER_PRO = "pro"
"""记录里的档位标记:Pro。"""

TIER_ENT = "enterprise"
"""记录里的档位标记:Enterprise。"""

PLACES_MONTH_FREE_PRO = 5000
"""Pro 档每月免费次数(Google 2025-03 起按 SKU 分档免费额)。"""

PLACES_MONTH_FREE_ENT = 1000
"""Enterprise 档每月免费次数。本步**只吃免费额**:当月记录数到顶即停,超出要付钱得 Frank 亲手改。"""

PLACES_MONTH_RESERVE = 60
"""两档各留的余量:账外调用(2026-09-05 准确率测试打了 30 次 Enterprise 不进缓存)+ 防月界时差。"""

MONTH_LEN = 7
"""ISO 时刻取前 7 位 = 年-月(当月用量按此计)。"""

K_LOCALITY = "locality"
"""addressComponents 里市的类型码。"""

K_PROVINCE = "administrative_area_level_1"
"""addressComponents 里省的类型码。"""

K_COUNTRY = "country"
"""addressComponents 里国家的类型码。"""

COUNTRY_CA = "CA"
"""加拿大的国家短码。"""

NOTE_OUTSIDE_CA = "outside CA"
"""第一条候选不在加拿大(regionCode 只是偏置不是过滤;2026-09-05 实撞 BLACK BULL BUILDERS 命中纽约)—— 记 miss。"""

PRINT_PLACES_BUDGET_TPL = "本月已用 Pro {pro_used}/{pro_free} · Enterprise {ent_used}/{ent_free} → 本轮预算 Pro {pro} · Enterprise {ent}"
"""places 步报当月免费额用量与本轮预算。"""

P_TEXT_QUERY = "textQuery"
"""请求体键:搜索词。"""

P_REGION_CODE = "regionCode"
"""请求体键:地区偏置。"""

P_LANGUAGE_CODE = "languageCode"
"""请求体键:返回语言。"""

P_PAGE_SIZE_PLACES = "pageSize"
"""请求体键:候选条数(WP 的 P_PAGE_SIZE 是另一根线,名字分开)。"""

PLACES_REGION = "CA"
"""只在加拿大找。"""

PLACES_LANG = "en"
"""英文返回(中文另走翻译链)。"""

PLACES_PAGE_SIZE = 3
"""一次要三条候选:第一条采信,另两条留在 raw 供人工复核同名店(计费按请求不按条)。"""

PLACES_QUERY_TPL = "{name} {region} Canada"
"""搜索词:公司名 + 省码/区标签 + Canada(区标签形如「Ottawa · Kanata North (ON)」也能命中)。"""

PLACES_TIMEOUT_S = 20
"""单次查询超时。"""

PLACES_SLEEP_S = 0.2
"""两次查询之间的礼貌间隔。"""

PLACES_LIMIT = 3000
"""本轮最多查几家(总闸;真正的闸是两档当月免费额 PLACES_MONTH_FREE_*,2026-09-05 试跑 10 家验过后放量)。"""

PLACES_REFRESH_DAYS = 365
"""命中记录多久后才重查(官网/地址年级稳定);查无与失败走 RETRY_FAILED_DAYS 冷却。"""

ST_HIT = "hit"
"""查到候选并采信第一条。"""

ST_MISS = "miss"
"""API 正常返回但零候选。"""

NOTE_NO_KEY = "GOOGLE_PLACES_KEY 未设,places 步跳过"
"""没密钥时的出口一句(不炸:手动件缺配置不是代码病)。"""

PRINT_PLACES_IN_TPL = "IN companies : {companies}\nIN jobs      : {jobs}"
"""places 步开工报路径。"""

PRINT_PLACES_TARGETS_TPL = "在招雇主 {cands} 家 · 已查 {cached} · 本轮查 {todo}(limit {limit})"
"""places 步报候选与本轮量。
2026-09-15 母集扩到全部在招雇主(Frank「1 推荐」),原句「在招担保雇主 {cands} 家 · 已查 …」。"""

PRINT_PLACES_ROW_TPL = "  {status:4} {tier:10} {name} → {site} | {address} | {ptype}"
"""每查一家报一行(试跑期人眼复核用)。"""

PRINT_PLACES_DONE_TPL = "本轮 ✓ {hit} 命中 · ○ {miss} 查无 · ✗ {fail} 失败 → {out}"
"""places 步收尾报数。"""

SITES_LIMIT = 60
"""sites 步一轮的 DDG 预算。2026-09-04 首跑排 2,600 家一口气清 → 中途被 DDG 按 IP 封;
09-05 进定时链后改成细水长流:每轮 60 家(与老 enrich 步的 FIND_LIMIT 同量,从没触发过封禁)。"""

JD_LIMIT = 300
"""sites 步阶梯①(JD 线索验域名)一轮的预算。2026-09-15 母集扩到全部在招雇主后补:
这一档原来没闸 —— 队伍只有各大类前 100 名(2,638 家)时无所谓,扩母集后缺官网的有 25,107 家,
一轮可能对外发几千个验证请求。按名次先头部后尾段,每轮 300 家(比搜索档宽:验域名是直接打
目标站、不打搜索引擎,封禁风险低,但也不该无限)。"""

PRINT_SITES_TARGETS_TPL = "在招雇主 {cands} 家 · 缺官网 {nosite} · 缓存 {cache} · 搜索走 {backend}(limit {limit})"
"""sites 步报候选、缺官网数与本轮搜索后端。
2026-09-15 母集扩到全部在招雇主(Frank「1 推荐」),原句「在招担保雇主 {cands} 家 · 前 {rank} 名缺官网
{nosite}」里的名次格随之退役 —— 缺官网的全进 nosite,名次只决定搜索先后。"""

PRINT_SITES_DONE_TPL = "本轮 JD 线索 +{jd} · Wikidata +{wiki} · 搜索 +{search} · 累计成功 {total}/{n} 家 → {out}"
"""sites 步收尾报数(found 记录由下一轮 build 合并官网进 companies)。"""

ENV_CSE_KEY = "GOOGLE_CSE_KEY"
"""Google Programmable Search JSON API 密钥的环境变量名(仓库根 .env;Frank 亲手开,代码与日志不落值)。
留空就复用 ENV_PLACES_KEY 那把(2026-09-09 Frank「可以用一个 key 吗」:同一 Cloud 项目启用 Custom Search API
即可共用,只有引擎 ID 是新的)。
2026-09-08 Frank /fe 拍板「换官网源」:DDG 自 09-05 起每轮「连续 3 次传输失败」、Places 免费额月中用尽且
Pro 档不回官网 —— 官方接口免费档每天 100 次、不按 IP 封。"""

ENV_CSE_CX = "GOOGLE_CSE_CX"
"""Programmable Search 引擎 ID(cx)的环境变量名;缺它(或两把 key 都空)整段走 DDG。"""

CSE_URL = "https://www.googleapis.com/customsearch/v1"
"""Programmable Search JSON API 端点。"""

P_CSE_KEY = "key"
"""CSE 查询参数:密钥。"""

P_CSE_CX = "cx"
"""CSE 查询参数:引擎 ID。"""

P_CSE_NUM = "num"
"""CSE 查询参数:返回条数。"""

CSE_NUM = 5
"""每次搜索要几条结果(护栏只看前 DDG_GUARD_N 个非聚合域,5 条够挑)。"""

CSE_TIMEOUT_S = 12
"""CSE 一次搜索的超时。"""

CSE_LIMIT = 25
"""sites 步走 CSE 时一轮的搜索预算:免费档每天 100 次 ÷ 6h 一轮 4 轮 = 25,永不撞配额
(撞了是 429 → 记传输失败 → 熔断,浪费三次退避)。"""

BACKEND_CSE = "Google Programmable Search"
"""sites 步报数用的后端名。"""

BACKEND_DDG = "DuckDuckGo"
"""sites 步报数用的后端名(密钥未设时的退路)。"""

NOTE_NO_CSE = "GOOGLE_CSE_CX 未设(或 GOOGLE_CSE_KEY / GOOGLE_PLACES_KEY 都空),sites 步搜索走 DDG"
"""密钥缺席的出口一句(不炸:退回 DDG,只是那条路当前基本封死)。"""


# =========================================================================
# 8. 官网正文(2026-09-05 Frank「可以」:主营业务两步之一 —— 首页 + About 页原文进 crawl 层
#    (put/get_cached_page,四层铁律),剥标签裁长成 brief 步的料;手动件 main --only about)
# =========================================================================

CRAWL_SLUG_COMPANIES = "companies"
"""公司官网页在 crawl 层的站点 slug(data/crawl/companies/,几千家共用一份 manifest)。"""

ABOUT_RE = re.compile(r"^(?:about(?:-?us)?|who-we-are|who_we_are|our-story|our-company|company|"
                      r"company-overview|our-mission|mission|a-propos|apropos|propos|qui-sommes-nous|"
                      r"notre-entreprise|notre-histoire|our-team|history|overview)$", re.I)
"""URL 路径**末段**整段命中才算介绍页(英法两套)。2026-09-05 两轮试跑:按 href 子串 + 链接文案匹配
太松(/trc、/emploi#mm-3、/apropos/emplois 都混进来),改成只看 href 路径末段整段相等;
多条命中取 URL 最短的 —— /about 比 /about-us/navy 更像总介绍页。"""

PATH_SEP = "/"
"""URL 路径分段符(取末段用)。"""

STRIP_TAGS = ["script", "style", "nav", "header", "footer", "noscript", "svg", "form", "iframe"]
"""取正文前整块摘掉的标签(导航/脚本/页脚是噪音)。"""

HOME_TEXT_MAX = 3000
"""首页正文裁到几字(About 页才是主料,首页只留开头)。"""

ABOUT_TEXT_MAX = 5000
"""About 页正文裁到几字(qwen 上下文够用又不拖慢)。"""

ABOUT_TEXT_MIN = 400
"""两页正文合起来短于此 = 没拿到内容(JS 渲染壳 / 空站),记 fail(2026-09-05 首跑 Ville de Québec
81 字混过去,qwen 五节全 (not stated),80 → 400)。"""

ABOUT_TIMEOUT_S = 12
"""抓一页官网的超时。"""

ABOUT_SLEEP_S = 0.3
"""两家之间的礼貌间隔(不同站点,轻)。"""

ABOUT_LIMIT = 1500
"""一轮最多抓几家(2026-09-05 进定时链;首轮实测 400 家 28 分钟 → 放到 1500 约 1.7h,积压 8,336 家几轮清完)。"""

ABOUT_REFRESH_DAYS = 180
"""正文多久后重抓(公司介绍半年级稳定);失败走 RETRY_FAILED_DAYS。"""

PAGE_SEP = "\n\n"
"""首页正文与 About 正文之间的分隔。"""

NOTE_CHALLENGE = "challenge page"
"""抓到的是人机验证壳(crawl 域判词)。"""

NOTE_NO_TEXT = "no text"
"""两页都没有可用正文。"""

PRINT_ABOUT_TARGETS_TPL = "有官网的在招雇主 {targets} 家 · 缓存 {cache} · 本轮抓 {todo}(limit {limit})"
"""about 步报候选与本轮量。
2026-09-15 母集扩到全部在招雇主,原句「有官网的在招担保雇主 {targets} 家 · 缓存 …」。"""

HTTP_FORBIDDEN = 403
"""WAF 拒 httpx 的状态码:前 PULSE_RANK_MAX 名转浏览器兜底(2026-09-08 Frank /fe 拍板;母集里 403 704 家、
JS 渲染壳「no text」733 家,前 100 名合计 165 家 —— crawl 域有头浏览器件同款,同一份 profile)。"""

BROWSER_SKIP_NOTES = ["ConnectError", "ConnectTimeout"]
"""httpx 这两类失败不转浏览器:域名死了 / 连不上,浏览器一样连不上,只白等 45s 导航超时
(2026-09-08 重镜像首跑实录:ConnectError 三家全是死站或脏网址,零回收;ReadTimeout 反而救回 Home Depot、
McDonald's 两家 —— 所以只排这两类,超时照转)。"""

PRINT_ABOUT_BROWSER_TPL = "  浏览器兜底 {name} → {url}({why})"
"""about 步每次转浏览器报一行(why = 403 / 验证壳 / 无正文,试跑期人眼复核)。"""

PRINT_ABOUT_ROW_TPL = "  {status:4} {name} → {about} ({chars} 字)"
"""每抓一家报一行(试跑期人眼复核)。"""

PRINT_ABOUT_DONE_TPL = "本轮 ✓ {ok} 有正文 · ✗ {fail} 失败 · 累计 {total}/{n} 家 → {out}"
"""about 步收尾报数。"""


# =========================================================================
# 9. 五节简介(2026-09-05:官网正文 → 本地 qwen 抽 [WHAT][BASE][SIZE][FOUNDED][NOTE] 五节
#    英文 + 翻中文;口径照 cms lib/employers/prompts.ts 的 RESEARCH_SYSTEM,只把「搜索结果」
#    换成「官网原文」;手动件 main --only brief)
# =========================================================================

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 基址的环境变量(与 news 域同一台盒子同一个变量,不另立名字)。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""局域网模型名的环境变量(缺省 LLM_MODEL_DEFAULT)。"""

LLM_MODEL_DEFAULT = "qwen3.6:latest"
"""盒子上的默认模型。"""

URL_TAIL_SLASH = "/"
"""基址末尾要削掉的斜杠(拼端点路径时避免双斜杠)。"""

NEWLINE = "\n"
"""换行(节标记必须在行首:startswith 或 换行+标记)。"""

PATH_OLLAMA_GENERATE = "/api/generate"
"""Ollama 单轮生成端点。"""

P_MODEL = "model"
"""请求体:模型名。"""

P_PROMPT = "prompt"
"""请求体:提示词。"""

P_STREAM = "stream"
"""请求体:流式开关(一律 False)。"""

P_THINK = "think"
"""请求体:思维链开关(qwen3 系一律关)。"""

P_OPTIONS = "options"
"""请求体:采样参数容器。"""

P_NUM_PREDICT = "num_predict"
"""请求体:生成上限。"""

P_TEMPERATURE = "temperature"
"""请求体:温度。"""

P_RESPONSE = "response"
"""响应体:正文键。"""

THINK_RE = re.compile(r"<think>.*?</think>", re.S)
"""剥模型溜出来的思维链块(think:false 的双保险)。"""

LLM_TIMEOUT_S = 240
"""一次生成的超时(5k 字上下文在盒子上约 15-40s)。"""

LLM_TEMPERATURE = 0.1
"""抽取与翻译都要稳,低温。"""

BRIEF_TOKENS = 500
"""五节英文的生成上限。"""

BRIEF_ZH_TOKENS = 800
"""中文译文的生成上限(中文 token 更密)。"""

BRIEF_LIMIT = 1500
"""一轮最多做几家(2026-09-05 进定时链;首轮实测盒子 5.5s/家(400 家 36 分钟),1500 家 ≈ 2.3h,
与正文步合计压在 6h 一轮之内)。"""

BRIEF_MARKS = ["[WHAT]", "[BASE]", "[SIZE]", "[FOUNDED]", "[NOTE]"]
"""五节标记:输出必须五个都在(缺一记 fail,不收半份)。"""

NOT_FOUND = "NOT_FOUND"
"""模型判「正文不是这家公司」的整条回复。"""

MARK_COLON_RE = re.compile(r"^(\[(?:WHAT|BASE|SIZE|FOUNDED|NOTE)\])\s*[::]\s*", re.M)
"""节标记后模型时而带冒号「[WHAT]: …」时而不带 —— 统一成「[WHAT] …」(cms CO_MARKS_RE 按此配对)。"""

MARK_SPACE = r"\1 "
"""MARK_COLON_RE 的替换体:标记 + 一个空格。"""

BRIEF_PROMPT_TPL = """You are a factual company researcher. Use ONLY the official website text below.
Company: {name}
Output plain text with EXACTLY these section markers, each on its own line: [WHAT] [BASE] [SIZE] [FOUNDED] [NOTE]
- [WHAT]: 1-2 sentences on what the company does / what it sells (main products or services).
- [BASE]: where it is based (city, province) - one short line.
- [SIZE]: employee count or scale ONLY if the text states it.
- [FOUNDED]: founding year ONLY if the text states it - one short line.
- [NOTE]: ONE fact a job seeker would care about that the text states (parent company, major brands/products, main clients) - one short line.
If a section is not supported by the text, write exactly: (not stated)
If the text is not about this company, reply exactly: NOT_FOUND
No other commentary. /no_think

WEBSITE TEXT:
{text}"""
"""五节抽取提示词(name/text 两槽)。"""

BRIEF_ZH_PROMPT_TPL = """Translate the following company profile from English to Simplified Chinese.
Keep the section markers [WHAT] [BASE] [SIZE] [FOUNDED] [NOTE] exactly as they are at the start of each line.
Keep "(not stated)" untranslated. Keep company, brand and product names in English.
One line per section, same order, no commentary. /no_think

{text}"""
"""中文翻译提示词(text 一槽)。"""

NOTE_NO_LLM = "NEWS_LLM_BASE 未设,brief 步跳过"
"""没盒子地址时的出口一句。"""

NOTE_MARKERS = "markers missing"
"""英文输出缺节标记或整条 NOT_FOUND。"""

NOTE_ZH_MARKERS = "zh markers missing"
"""中文译文缺节标记(英文照收,中文留空等重跑)。"""

BRIEF_KO_PROMPT_TPL = """Translate the following company profile from English to Korean.
Keep the section markers [WHAT] [BASE] [SIZE] [FOUNDED] [NOTE] exactly as they are at the start of each line.
Keep "(not stated)" untranslated. Keep company, brand and product names in English.
One line per section, same order, no commentary. /no_think

{text}"""
"""韩文翻译提示词(text 一槽;2026-09-05 Frank 韩语界面「没有翻译」)。"""

BRIEF_KO_TOKENS = 800
"""韩文译文的生成上限。"""

NOTE_KO_MARKERS = "ko markers missing"
"""韩文译文缺节标记(英文照收,韩文留空等补翻)。"""

PRINT_BRIEF_KO_TPL = "补韩文 {n} 家(已有英文、缺韩文)"
"""brief 步韩文补翻报数。"""

PRINT_BRIEF_ZH_TPL = "补中文 {n} 家(已有英文、缺中文或中文里没有汉字)"
"""brief 步中文补翻报数(2026-09-17 加)。"""

ZH_SCRIPT_RE = re.compile(r"[\u4e00-\u9fff]")
"""译文里真有汉字(2026-09-17 Frank「清库 + 加检查」:模型时而把英文 / 法文原文原样交回,节标记齐全就被当成中文译文收了 ——
生产库 55 家 ai_brief_zh 一个汉字都没有,Cargill 实撞)。"""

KO_SCRIPT_RE = re.compile(r"[\uac00-\ud7a3]")
"""译文里真有韩文字(同上,生产库 80 家 ai_brief_ko 没有韩文字)。"""

NOTE_ZH_SCRIPT = "zh has no cjk"
"""中文译文没有汉字(模型原样交回原文):中文留空等补翻。"""

NOTE_KO_SCRIPT = "ko has no hangul"
"""韩文译文没有韩文字:韩文留空等补翻。"""

PRINT_BRIEF_TARGETS_TPL = "有正文 {about} 家 · 已做 {cache} · 本轮做 {todo}(limit {limit},model {model})"
"""brief 步报候选与本轮量。"""

PRINT_BRIEF_ROW_TPL = "  {status:4} {name} | {what}"
"""每做一家报一行([WHAT] 首行,人眼复核)。"""

PRINT_BRIEF_DONE_TPL = "本轮 ✓ {ok} · ✗ {fail} · 累计 {total}/{n} 家 → {out}"
"""brief 步收尾报数。"""


# =========================================================================
# 10. 维基总部兜底(2026-09-20:官网没标总部的公司查 Wikidata「总部所在地」属性;手动件 main --only wikihq,也进默认链)
# =========================================================================

IN_WIKIHQ_FACTS = paths.PROCESSED_SITES / "facts.json"
"""公司官网整理记录(sites 域产):本步只读它来圈候选 —— 整理成了(ok)、总部一节却没过原句核对的公司
(官网没标总部:Robert Half / Deloitte / Rona 这类全球站,或 Magna 这类首页是 JS 壳的)。缺文件 = 本轮直接退。"""

IN_WIKIHQ_PAGES = paths.PROCESSED_SITES / "pages.json"
"""公司官网抓取记录(sites 域产):抓取失败的公司(官网死了 / 拦了 / 连不上)也进本步候选 —— 官网这条路走不通,只剩维基可问。"""

K_CO_WEBSITE = "website"
"""mart 公司行键:官网(空 = 公司表里没官网)。"""

WIKIHQ_MIN_OPEN = 10
"""没官网的公司,在招岗不少于这么多才进候选(2026-09-20:BMO Financial Group 457 个在招岗、公司表里没官网,
雇主板最前面几行总部一格空着最扎眼;长尾小雇主 Wikidata 基本没有条目,不去白查)。"""

OUT_WIKI_HQ = paths.PROCESSED / "company_wiki_hq.json"
"""维基总部兜底记录(slug → WikiHqRecord;mart 汇装在官网没给总部时读它)。来路排序 Frank 2026-09-19 定:官网 → 维基 → 联网搜索。"""

K_FACTS_QUOTES = "quotes"
"""官网整理记录:节标记 → 过了核对的页面原句。"""

K_FACTS_NAME_OK = "name_ok"
"""官网整理记录:官网归属闸(不是 True = 这个官网不是这家公司的,它整理出来的总部不算数,改问维基)。"""

FACTS_SEC_HQ = "HQ"
"""官网整理记录里总部那一节的标记(quotes 里没有它 = 官网没标总部 = 本步的候选)。"""

PROP_HQ = "P159"
"""Wikidata 属性:总部所在地(值是一个地点条目的编号)。"""

PROP_LOCATED_IN = "P131"
"""Wikidata 属性:所在行政区(从总部那个地点一级级往上爬,爬到加拿大的省 / 地区为止)。"""

K_RANK = "rank"
"""一条声明的等级键(preferred / normal / deprecated)。"""

RANK_PREFERRED = "preferred"
"""声明等级:首选(同一属性挂多条时 Wikidata 编辑标出来的现行值)。"""

RANK_DEPRECATED = "deprecated"
"""声明等级:已废弃(不取)。"""

PROP_COUNTRY = "P17"
"""Wikidata 属性:所属国家(外国总部用:沿所在行政区往上爬,爬到「上一级就是国家」的那一级 = 州 / 省)。"""

WD_PROV_NAMES = {
    "Ontario": "ON", "Quebec": "QC", "British Columbia": "BC", "Alberta": "AB", "Saskatchewan": "SK", "Manitoba": "MB",
    "New Brunswick": "NB", "Nova Scotia": "NS", "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE",
    "Yukon": "YT", "Northwest Territories": "NT", "Nunavut": "NU",
}
"""加拿大省 / 地区的英文标签 → 两位省码(编号表的兜底:Boston Pizza / Money Mart 的总部所在地爬上去,标签是 British Columbia、
上一级是 Canada,编号却没对上 WD_PROV_CODES —— 2026-09-20 重查实撞,出成了「British Columbia, Canada」)。"""

HQ_FOREIGN_TPL = "{region}, {country}"
"""外国总部的省格:「州, 国」(2026-09-20 Frank「这个地址也不对啊」:Robert Half 只出了一个 Menlo Park,没带州和国家,
放在加拿大职位板上像是错的 → Menlo Park, California, United States)。"""

WD_HQ_PLACE_PROPS = "labels|claims"
"""查地点条目那一发 wbgetentities 要的属性(标签给市名,声明里取所在行政区)。"""

WD_PROV_CODES = {
    "Q1904": "ON", "Q176": "QC", "Q1974": "BC", "Q1951": "AB", "Q1989": "SK", "Q1948": "MB", "Q1965": "NB",
    "Q1952": "NS", "Q2003": "NL", "Q1978": "PE", "Q2009": "YT", "Q2007": "NT", "Q2023": "NU",
}
"""加拿大十省三地区的 Wikidata 条目编号 → 两位省码(2026-09-20 对 Wikidata 实查过十三条的英文标签)。"""

HQ_CLIMB_MAX = 4
"""从总部地点往上爬行政区最多几级(市 → 区域市 → 省 通常两三级;加拿大的爬到省码为止,外国的爬到「上一级就是国家」的州为止;
爬满还没到的,外国总部只给国名)。"""

WIKIHQ_LIMIT = 200
"""一轮最多查多少家(每家 2 发 + 爬行政区 1~4 发,家间歇 WIKI_SLEEP_S:200 家 ≈ 半小时)。"""

WIKIHQ_REFRESH_DAYS = 90
"""查过的(命中与确认没有都算)多少天内不再查(总部搬家是年级别的事)。"""

NAME_COUNTRY_RE = re.compile(r"\b(?:of canada|du canada|canada|canadian|canadien(?:ne)?)\b", re.I)
"""公司名里的国名字样(KPMG Canada / The Home Depot Canada / BDO Canada / Compagnie WestRock du Canada):
Wikidata 的条目是母公司本名,带着国名按严格名字闸永远对不上 —— wikihq 第二次尝试时去掉它再比(2026-09-20 首轮放宽后命中 47 / 342 实撞)。"""

NAME_LEAD_THE_RE = re.compile(r"^the\s+", re.I)
"""公司名打头的 The(第三次尝试时去掉:条目名有的带 The 有的不带)。"""

PROP_INSTANCE_OF = "P31"
"""Wikidata 属性:是什么(词条的类型)。"""

WD_ORG_TYPES = frozenset({"Q4830453", "Q783794", "Q891723", "Q22687", "Q6881511", "Q43229"})
"""公司类的词条类型:business / company / public company / bank / enterprise / organization。
wikihq 靠别名对上的词条必须是这几类之一(2026-09-20:BMO Financial Group 的词条名是 Bank of Montreal,只有别名对得上;
同一个别名还挂在「BMO Financial Group Canadian Women's Open」这种赛事词条上,不卡类型会对到球赛上去)。"""

WD_BUILDING_TYPES = frozenset({"Q11303", "Q41176", "Q1021645", "Q18761864", "Q12518"})
"""建筑物类的词条类型:skyscraper / building / office building / bank building / tower。
总部所在地填的是一栋楼时(BMO → First Canadian Place),楼名进街址、它所在的那一级进市,不拿楼名当市名。"""

WD_ENTITY_URL_TPL = "https://www.wikidata.org/wiki/{qid}"
"""Wikidata 条目链接(总部的出处:「总部所在地」这条声明就挂在公司条目页上,点开能核对)。"""

NOTE_NO_SITE_FACTS = "mart 的 companies.json / jobs.json 还没产出,或没有候选,wikihq 本轮跳过"
"""缺输入的留痕。"""

PRINT_WIKIHQ_TARGETS_TPL = "候选(官网没标总部 / 官网抓不到 / 没官网的大户){cands} 家 · 已查 {cache} · 本轮查 {todo}(limit {limit})"
"""wikihq 步报候选与本轮量。"""

PRINT_WIKIHQ_ROW_TPL = "  {status:4} {name} | {city} {province} {source}"
"""每查一家报一行(人眼复核)。"""

PRINT_WIKIHQ_DONE_TPL = "本轮 ✓ {ok} · 查无 {miss} · 累计命中 {total}/{n} 家 → {out}"
"""wikihq 步收尾报数。"""

# =========================================================================
# 11. 点开优先的查找官网(findsite 步,2026-09-20;设计稿 docs/design/点开优先抓取与纠错-20260920.md)
# =========================================================================

IN_SITE_PAGES = paths.PROCESSED_SITES / "pages.json"
"""[in] sites 域的官网抓取记录:status = dead 的是死站(域名连续不解析)—— 缓存里的官网等于它的,找官网阶梯当成没官网重找。"""

OUT_FINDSITE_BEAT = paths.PROCESSED / "company_findsite_host.json"
"""[out] 本机那一步的心跳(FINDSITE_GOOGLE=1 时每轮写):容器里的同一步见心跳还新就让出找官网的活 ——
Google 那一档只能在本机跑(统一 profile + 有人点验证),Frank 在电脑前开着本机那步时活归它。"""

ENV_FINDSITE_GOOGLE = "FINDSITE_GOOGLE"
"""本机开关:= 1 才走 Google 那一档(容器里没人点验证、也存不住放行,一律不走)。"""

FINDSITE_GOOGLE_ON = "1"
"""开关的开值。"""

BEAT_FRESH_S = 120
"""本机心跳多少秒内算还在(本机一分钟一轮)。"""

K_BEAT_AT = "at"
"""心跳文件键:时刻(epoch 秒)。"""

PATH_SITE_TODO = "/api/employers/explore/site-todo"
"""cms 取活接口(带钥匙)。"""

PATH_SITE_DONE = "/api/employers/explore/site-done"
"""cms 交活接口(带钥匙)。"""

P_KIND = "kind"
"""取活接口的工种参数名。"""

KIND_FIND = "find"
"""工种:找官网。"""

P_TAKE_LIMIT = "limit"
"""取活接口的条数参数名。"""

FINDSITE_TAKE = 5
"""findsite 步每轮最多取几家。"""

FINDSITE_HTTP_TIMEOUT_S = 30
"""打 cms 接口 / 护栏取首页的超时秒数。"""

HOT_RETRY_DAYS = 1
"""点开触发的查找官网,一家几天内最多一次(Frank 2026-09-20:查找官网与 Wikidata 一家一天一次)。"""

K_TODOS = "todos"
"""取活响应里的清单键。"""

K_TODO_KEY = "key"
"""线格式键:池主键。"""

K_TODO_SLUG = "slug"
"""线格式键:公司 slug。"""

K_TODO_NAME = "name"
"""线格式键:公司名。"""

K_TODO_WEBSITE = "website"
"""线格式键:现在的官网(死站 / 名字对不上的那个;没官网 = 空)。"""

K_TODO_PROVINCE = "province"
"""线格式键:主省。"""

K_DONE_STAGE = "stage"
"""线格式键:走到哪一步。"""

K_DONE_NOTE = "note"
"""线格式键:由头。"""

K_DONE_REPLACED = "replaced"
"""线格式键:官网是不是这回被换过。"""

K_DONE_HQ_CITY = "hqCity"
"""线格式键:总部所在市。"""

K_DONE_HQ_ADDRESS = "hqAddress"
"""线格式键:总部街址。"""

K_DONE_HQ_PROVINCE = "hqProvince"
"""线格式键:总部所在省 / 州。"""

K_DONE_HQ_SOURCE = "hqSource"
"""线格式键:总部出处(Wikidata 条目)。"""

STAGE_FIND = "find"
"""进度:查找官网。"""

STAGE_FETCH = "fetch"
"""进度:找到了,交给 sites 域的 visit 步抓。"""

STAGE_NONE = "none"
"""进度:找不到官网(页面简介走现查兜底)。"""

FOUND_GOOGLE = "google"
"""官网来路:Google(本机有头浏览器)。"""

FOUND_BING = "bing"
"""官网来路:Bing(有头浏览器)。"""

FOUND_DDG = "ddg"
"""官网来路:DuckDuckGo(有头浏览器)。"""

GOOGLE_SEARCH_URL = "https://www.google.com/search?hl=en&gl=ca&q="
"""Google 搜索地址(本机、统一 profile;弹「异常流量」验证等 Frank 亲手点,助手不替过)。"""

BING_SEARCH_URL = "https://www.bing.com/search?setmkt=en-CA&q="
"""Bing 搜索地址(2026-09-20 六家实测:有头浏览器不弹验证,结果与 DDG 几乎一样且更干净)。"""

DDG_BROWSER_URL = "https://duckduckgo.com/html/?q="
"""DuckDuckGo 搜索地址(有头浏览器;Bing 出问题时的替补。原先被封的是 httpx 直打接口那条路)。"""

JS_GOOGLE_LINKS = "() => [...document.querySelectorAll('a:has(h3)')].map(a => a.href)"
"""页内取 Google 结果链接。"""

JS_BING_LINKS = "() => [...document.querySelectorAll('li.b_algo h2 a')].map(a => a.href)"
"""页内取 Bing 结果链接(href 是 bing.com/ck/a 跳转,真地址要解)。"""

JS_DDG_LINKS = "() => [...document.querySelectorAll('a.result__a')].map(a => a.href)"
"""页内取 DDG 结果链接(真地址在 uddg 参数里)。"""

JS_PAGE_URL = "() => [location.href]"
"""页内取当前地址(判 Google 是不是停在验证页)。"""

GOOGLE_SORRY_MARK = "/sorry/"
"""Google「异常流量」验证页的地址特征。"""

GOOGLE_WAIT_S = 120
"""Google 验证页最多等 Frank 点多少秒;到点没人点 = 这一档放弃,退 Bing。"""

GOOGLE_POLL_MS = 2000
"""等验证时多久看一次地址。"""

BING_REDIRECT_PARAM = "u"
"""Bing 跳转链接里装真地址的参数名。"""

BING_REDIRECT_PREFIX = "a1"
"""Bing 跳转参数值的前缀(后面是 base64url 的真地址)。"""

BING_REDIRECT_PATH = "/ck/a"
"""Bing 跳转链接的路径特征。"""

B64_PAD = "="
"""base64 补位字符。"""

B64_BLOCK = 4
"""base64 一组的长度(补位到它的整数倍)。"""

SEARCH_CRAWL_SLUG_TPL = "search-{engine}"
"""搜索结果页原文进 crawl 层的 slug(抓取先落原文,解析离线可重算)。"""

NOTE_NO_CMS = "SEED_URL / SEED_TOKEN 未设,findsite 步跳过"
"""缺 cms 接线的提示。"""

NOTE_HOST_BEATING = "本机那一步开着(心跳还新),找官网的活让给它"
"""容器让活的提示。"""

NOTE_CHECKED_TODAY = "checked today"
"""由头:今天找过了。"""

NOTE_CMS_HTTP_TPL = "cms http {status}"
"""打 cms 接口非 2xx 的错文。"""

PRINT_FINDSITE_TAKE_TPL = "  取活 {n} 家(点开过、没官网 / 官网已死 / 官网名字对不上的;上限 {limit};Google 档 {google})"
"""findsite 步取活报数。"""

PRINT_FINDSITE_ROW_TPL = "  {stage:<5} {name}  {site}  {note}"
"""findsite 步单家日志行。"""

K_HOST = "host"
"""sites 域抓取记录键:官网主机名。"""

ST_DEAD = "dead"
"""sites 域抓取记录的死站状态(域名连续不解析)。"""

MS_PER_S = 1000
"""一秒的毫秒数。"""

IN_SEEN = paths.PROCESSED_EXPLORE / "seen.json"
"""[in] 被用户看过的公司清单(explore 域每轮落盘);找官网 / 维基总部的例行轮拿它排队,缺文件 = 没人看过。"""

K_SEEN_OPENED = "opened_at"
"""seen.json 记录键:最近一次真人点开(ISO;没点开过 = 空串)。"""

K_SEEN_LAST = "last_seen"
"""seen.json 记录键:最近一次被雇主板列出(ISO)。"""

HOT_JD_GLOB_TPL = "{slug}_*.md"
"""一家公司的 JD 文件名样式(「雇主 slug_岗位 slug.md」;hot_jd_hints 按名直取)。"""
