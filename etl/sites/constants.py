"""
sites 域常量 —— 全部字面量住这(零字符串令:functions 体内不写字面量)。
分段镜像 functions:1 入口与接线 → 2 挑队列 → 3 抓页(进 crawl 层)→ 4 整理(提示词 / 解析 / 原句核对)→ 5 打印模板。
"""
import re

import paths

# =========================================================================
# 1. 入口与接线(路径 / 盒子)
# =========================================================================

IN_MART_COMPANIES = paths.MART / "companies.json"
"""汇装好的公司表(load 域 build 链每小时产):本域只读它的 slug / name / website 三格。缺文件 = 本轮直接退。"""

IN_MART_JOBS = paths.MART / "jobs.json"
"""汇装好的岗位表:数每家公司当前在招几个岗(范围只收有在招岗的公司;在招岗多的排在前)。"""

OUT_PAGES = paths.PROCESSED_SITES / "pages.json"
"""fetch 步产物:slug → PagesRecord(抓到哪几页、什么时候抓的;原文在 crawl 层 site-<slug>/html_cache/)。"""

OUT_FACTS = paths.PROCESSED_SITES / "facts.json"
"""facts 步产物:slug → FactsRecord(官网七节 + 每节的页面原句 + 出处网址);mart 汇装读它。"""

TEXT_ENCODING = "utf-8"
"""全部读写的统一编码。"""

JSON_INDENT = 1
"""JSON 落盘缩进(保持 diff 可读又不太占盘)。"""

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 基址的环境变量(不另立名字:一台盒子一个变量)。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""局域网模型名的环境变量(缺省 LLM_MODEL_DEFAULT)。"""

LLM_MODEL_DEFAULT = "qwen3.6:latest"
"""盒子上的默认模型。"""

URL_TAIL_SLASH = "/"
"""基址末尾要削掉的斜杠;也是拼 robots.txt 地址时的根路径。"""

URL_SCHEME_SEP = "://"
"""协议与主机之间的分隔(拼 robots.txt 地址用)。"""

ERRORS_REPLACE = "replace"
"""读缓存原文的解码错误策略(单页坏字节替换不中止)。"""

FIELD_NONE = ""
"""「没有」的占位:空串。"""

ST_OK = "ok"
"""记录状态:成了。"""

ST_FAIL = "fail"
"""记录状态:没成(带由头与时刻,冷却期后重试)。"""

ST_DEAD = "dead"
"""死站:官网域名连续 DEAD_FAILS 轮不解析;不再重试这个地址(2026-09-20 自动纠错)。"""

SECONDS_PER_DAY = 86400
"""一天的秒数(算「距上次过了几天」)。"""

FLUSH_N = 20
"""每做多少家落一次盘(中途被杀不丢已做的)。"""

# =========================================================================
# 2. 挑队列(范围:有官网 且 有在招岗;刷新期与失败冷却)
# =========================================================================

K_SLUG = "slug"
"""公司行键:slug(本域两份产物的主键)。"""

K_NAME = "name"
"""公司行键:公司名。"""

K_WEBSITE = "website"
"""公司行键:官网(mart 已过官网闸;Job Bank / 板帖来的只留站点根)。"""

K_COMPANY_SLUG = "companySlug"
"""岗位行键:所属公司 slug。"""

K_STATUS = "status"
"""岗位行键:状态。"""

OPEN_STATUSES = (None, "open", "campus")
"""算在招的状态(与 jdformat 同口径:缺键 / open / campus)。"""

REFRESH_DAYS = 30
"""官网多少天重抓一轮(Frank 09-19 批:每月一轮)。"""

RETRY_FAILED_DAYS = 14
"""抓失败 / 整理失败的冷却天数(站挂了、被拦了,别每轮都去敲)。"""

RETRY_TRANSIENT_DAYS = 1
"""瞬时失败的冷却天数(2026-09-20 Frank 批的分档:浏览器没取回页面 —— 连不上 / 超时 / 掐断 —— 多半明天就好,
原先一律 14 天,Sienna 那种瞬时连不上的要等两周;真被拦的(拦截页 / robots / 没正文)仍 RETRY_FAILED_DAYS)。"""

HOT_HOST_HOURS = 24
"""点开触发的抓取,同一个官网主机名多少小时内最多一次(成败都算;A&W / IGA 加盟店共用 aw.ca / iga.net,
第一家抓、其余复用 crawl 层缓存原文只各自整理)。"""

SECONDS_PER_HOUR = 3600
"""一小时的秒数(主机名 24 小时尺子换算用)。"""

DEAD_FAILS = 2
"""官网连续几轮「域名不解析」就记死站(ST_DEAD;mart 见了清官网格,company 域找官网阶梯重找)。"""

# =========================================================================
# 3. 抓页(原文进 crawl 层)
# =========================================================================

CRAWL_SLUG_TPL = "site-{slug}"
"""crawl 层的站点目录名(data/crawl/site-<slug>/;与 careers-<slug> 的招聘站缓存分开)。"""

POLITE_S = 1.0
"""同一家官网两次请求之间的间隔秒(礼貌)。"""

EXTRA_PAGES_MAX = 2
"""首页之外最多再抓几页(Contact / About 各一)。"""

HTML_MIN_LEN = 500
"""页面原文短于这么多字当没抓到(空壳 / 拦截页)。"""

PARSER_HTML = "html.parser"
"""bs4 解析器:标准库自带(容器镜像瘦)。"""

TAG_A = "a"
"""链接标签名。"""

TAG_TITLE = "title"
"""页标题标签名。"""

HREF_ATTR = "href"
"""链接节点的属性名。"""

URL_FRAGMENT_SEP = "#"
"""URL 片段分隔(去掉锚点再比)。"""

HOST_WWW_PREFIX = "www."
"""比主机名时去掉的前缀(同站判据不分 www)。"""

CONTACT_LINK_RE = re.compile(r"contact|nous-joindre|contactez|coordonn", re.I)
"""Contact 页链接的认法(链接文字 + href 一起看;含法文站常见写法)。总部地址多半在这一页或首页页脚。"""

ABOUT_LINK_RE = re.compile(r"about|a-propos|qui-sommes|our-story|company|locations|offices", re.I)
"""About / Locations 页链接的认法(业务、规模、成立年份、办公地点多半在这一页)。"""

SKIP_LINK_RE = re.compile(r"^(mailto:|tel:|javascript:)|\.(pdf|jpg|jpeg|png|zip|docx?)($|\?)", re.I)
"""不算页面的链接(邮箱 / 电话 / 脚本 / 文件)。"""

ROBOTS_PATH = "/robots.txt"
"""robots 文件的路径(每家抓之前先读一次,不许抓的页不抓)。"""

ROBOTS_UA = "*"
"""按通配 UA 判 robots(本域不自称某个爬虫名)。"""

LINE_BREAK = "\n"
"""换行(robots 正文按行喂给解析器;页面文字拼块也用)。"""

NOTE_NO_TEXT = "no text"
"""抓失败由头:首页抓回来是空壳。"""

NOTE_ROBOTS = "robots"
"""抓失败由头:robots 不许抓首页。"""

NOTE_HTTP_TPL = "http {status}"
"""失败由头:盒子那一发非 2xx(2026-09-20 起抓页走有头浏览器,没有状态码;本模板只剩 facts 步在用)。"""

NOTE_BROWSER = "browser"
"""抓失败由头:有头浏览器没拿回这一页(导航超时 / 验证框没人点)。"""

NOTE_BLOCKED = "blocked page"
"""抓失败由头:拿回来的是拦截页 / 报错页(按页标题判,见 BLOCK_TITLE_RE)。"""

NOTE_DNS = "dns"
"""失败由头:官网域名不解析(浏览器没取回页面后用标准库 getaddrinfo 复核出来的;连续 DEAD_FAILS 轮 = 死站)。"""

TRANSIENT_NOTES = ("browser",)
"""算瞬时失败的由头(冷却 RETRY_TRANSIENT_DAYS):浏览器没取回页面且域名解析得了。"""

BLOCK_TITLE_RE = re.compile(r"^\s*(?:40[34]\b|access denied|forbidden|page not found|not found|error\b|just a moment)", re.I)
"""拦截页 / 报错页的页标题(浏览器里拿不到状态码,只能认标题:「403 - Forbidden」「Access Denied」「Page not found」「Just a moment...」);
这种页不进 crawl 层 —— 进了就会被当成官网原文喂给模型。"""

NOTE_NO_BROWSER = "本镜像没装 playwright,sites 的 fetch 步跳过(抓页一律走 crawl 域有头浏览器,容器要用 etl/crawl/Dockerfile 重镜像)"
"""缺浏览器的留痕。"""

PRINT_BROWSER_ABORT = "  ✗ 有头浏览器没起来(见上一条报错),本轮抓取中止,不记这家失败"
"""浏览器起不来(profile 被占 / 没显示)不是这家公司的错:不记失败、整轮中止(与 facts 步盒子掉线同一条教训)。"""

JS_LOCATION = "[location.href]"
"""取当前标签最终地址的页内表达式(crawl 的 PageLike.evaluate 定死回列表,所以包一层数组)。"""

NET_ERRORS = ("ConnectError", "ConnectTimeout", "ReadTimeout", "RemoteProtocolError", "PoolTimeout")
"""盒子连不上 / 超时的异常类名(facts 步遇到 = 不是这家公司的错:不记失败、整轮中止,下轮再来)。"""

# =========================================================================
# 4. 整理(提示词 / 解析 / 原句核对)
# =========================================================================

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
"""剥 think 块(think 关了仍双保险)。"""

STRIP_REPL = ""
"""正则剥除的替身。"""

LLM_TIMEOUT_S = 240
"""单次生成的 HTTP 超时(盒子同时给 jdformat / explore / classify / company 用,排队时会慢)。"""

LLM_TEMPERATURE = 0.1
"""温度:整理是搬运不是创作。"""

GEN_TOKENS = 900
"""生成上限 token:七节 + 七句原句,实测 300~600 token,给足余量。⚠ 不带 num_ctx(jdformat 实撞:换窗口会让 Ollama 重载模型)。"""

SKIP_TAGS = ("script", "style", "noscript", "svg", "template")
"""取页面文字前先摘掉的标签。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个。"""

SPACE_SEP = " "
"""压空白后的单空格,也是 get_text 的分隔符。"""

HOME_TAIL_LEN = 2500
"""首页只取**末尾**这么多字(页脚:总部地址、联系方式多半在这;Kognitive 的总部就在页脚)。"""

HOME_HEAD_LEN = 1500
"""首页开头再取这么多字(主营业务多半在首屏)。"""

PAGE_HEAD_LEN = 4000
"""Contact / About 页取开头这么多字。"""

PAGE_BLOCK_TPL = "### {url}\n{text}"
"""喂给模型的一页文字块(带网址,模型与核对都按页说话)。"""

BLOCK_SEP = "\n\n"
"""页与页之间的分隔。"""

BLOB_MIN_LEN = 200
"""几页文字加起来短于这么多字当没东西可整理(JS 渲染的空壳站)。"""

SECTIONS = ("WHAT", "HQ", "SIZE", "FOUNDED", "OFFICES", "NEWCOMERS", "BENEFITS")
"""官网七节的标记,顺序即展示顺序(Frank 09-19「可以,七节就这样」):主营业务 / 总部 / 规模 / 成立年份与母公司 /
其他办公地点 / 对新移民与外籍员工的态度 / 福利与招聘流程。"""

SECTION_HQ = "HQ"
"""总部那一节的标记(它的值是街址 / 市 / 省三格,共用一句原句,keep_section 单独处理)。"""

NONE_MARK = "NONE"
"""模型答「页面上没有」的记号(整节留空,不编)。"""

PROMPT_TPL = """You organise what a company's OWN website says, for a Canadian job board. You are a copier, not a researcher.
STRICT RULES:
- Use ONLY the page text below. NEVER use outside knowledge. If the pages do not state something, answer NONE.
- Every answer needs a QUOTE line: one exact sentence or line copied character for character from the page text that supports it.
  If you cannot quote it, the answer is NONE.
- HQ: the head office / headquarters / corporate office. If several offices are listed and none is marked as head office,
  headquarters or corporate office, answer NONE. A single address in the page footer of a company site counts as the head office.
  If the page gives both a Canadian head office and a head office outside Canada, answer the Canadian one; give the one
  outside Canada only when no Canadian head office is shown.
- Output exactly these lines and nothing else:
WHAT=<1-2 sentences: what the company sells or does, and for whom>
WHAT_QUOTE=<exact page sentence>
HQ_ADDRESS=<street address as written, or NONE>
HQ_CITY=<city, or NONE>
HQ_PROVINCE=<two-letter Canadian province code, or the country name if outside Canada, or NONE>
HQ_QUOTE=<exact page line showing the address>
SIZE=<employee count or number of locations, only if stated, or NONE>
SIZE_QUOTE=<exact page sentence>
FOUNDED=<founding year and/or parent company, only if stated, or NONE>
FOUNDED_QUOTE=<exact page sentence>
OFFICES=<other office / branch locations besides the head office, comma separated, or NONE>
OFFICES_QUOTE=<exact page line>
NEWCOMERS=<what the site says about hiring newcomers, immigrants, foreign workers, work permits, visa or LMIA support, or NONE>
NEWCOMERS_QUOTE=<exact page sentence>
BENEFITS=<employee benefits and how to apply, only if stated, or NONE>
BENEFITS_QUOTE=<exact page sentence>
Company: {name}
Pages:
{blob}"""
"""整理提示词(给模型看的,英文;name / blob 两槽)。要点:只许用页面文字、每节必须附页面原句、多个办公点没标总部就答 NONE。
2026-09-20 Frank「外国总部可以,如果找不到本地总部」:页面同时给了加拿大总部与外国总部的答加拿大那个,没有加拿大总部才给外国的。
NEWCOMERS 一节是本站用户最想知道的,只认官网原句,没提就空着 —— 不许从别的话里推断。"""

LINE_RE_TPL = r"^\s*{key}\s*=(.*)$"
"""回答里一行「KEY=值」的正则模板(逐键现拼,多行模式)。"""

LINE_RE_FLAGS = re.I | re.M
"""上面那条正则的标志。"""

K_HQ_ADDRESS = "HQ_ADDRESS"
"""回答键:总部街址。"""

K_HQ_CITY = "HQ_CITY"
"""回答键:总部所在市。"""

K_HQ_PROVINCE = "HQ_PROVINCE"
"""回答键:总部所在省(两位码;加拿大以外给国名)。"""

QUOTE_SUFFIX = "_QUOTE"
"""原句键 = 节标记 + 这个尾巴。"""

QUOTE_MIN_LEN = 12
"""原句短于这么多字不算数(「Contact us」这种哪都对得上)。"""

QUOTE_CHECK_LEN = 40
"""核对时只比原句开头这么多字(模型抄到后半句常会走样;开头对得上就是真从页面抄的)。"""

VALUE_MAX_LEN = 600
"""一节的值最长这么多字(再长是模型在抄整页)。"""

NOTE_BLOB = "no page text"
"""整理失败由头:几页加起来没文字(JS 渲染空壳)。"""

NOTE_EMPTY = "empty"
"""整理失败由头:模型回了空。"""

NOTE_NOTHING = "nothing verified"
"""整理失败由头:七节没有一节过了原句核对。"""

NAME_STOP = frozenset({
    "the", "and", "of", "inc", "incorporated", "ltd", "ltee", "limited", "llp", "llc", "corp", "corporation", "company",
    "co", "du", "de", "des", "la", "le", "les", "et", "l", "d", "group", "groupe", "services", "service", "enterprises",
    "holdings", "international", "solutions",
})
"""官网归属闸:公司名里不算数的词(法律后缀 + 虚词 + 泛词),比对前剔掉;剔光了就用原词。"""

NAME_WORD_RE = re.compile(r"[^a-z0-9]+")
"""官网归属闸:压成小写 ASCII 以后按非字母数字切词 / 压平主机名用。"""

ASCII_CODEC = "ascii"
"""去重音用的编码名(NFKD 拆开后丢掉非 ASCII 的音标)。"""

ASCII_ERRORS = "ignore"
"""去重音时丢掉编不进 ASCII 的字符。"""

NFKD_FORM = "NFKD"
"""去重音用的 Unicode 规范化形式。"""

NAME_TOKEN_MIN_LEN = 4
"""公司名里的词至少这么长,才拿它的开头去主机名里找(Trimax → trimaxsteel.com、Russel → russelmetals.com)。"""

NAME_TOKEN_HEAD_LEN = 5
"""拿词的前几个字母去找(Trusses → a-1truss.ca、Nordiques → groupenordique.com:单复数 / 词尾不一致也认)。"""

NAME_SHORT_LEN = 3
"""三个字母的品牌词(XYZ / FLB / KFC / BMW)只认「主机名以它开头」;缩写域名也至少这么长才比。"""

NAME_PHRASE_WORDS = 2
"""页面文字里找公司名时,用名字里前几个算数的词连着找(Fraser Health Authority → fraser health)。"""

HOST_LABEL_SEP = "."
"""主机名的段分隔。"""

# =========================================================================
# 5. 打印模板
# =========================================================================

NOTE_NO_MART = "mart/companies.json 或 jobs.json 还没产出,sites 本轮跳过"
"""缺 mart 的留痕。"""

NOTE_NO_LLM = "NEWS_LLM_BASE 未设,facts 步跳过"
"""没配盒子的留痕。"""

PRINT_FETCH_TARGETS_TPL = "有官网且在招 {total} 家 · 已抓 {done} · 本轮待抓 {todo}(上限 {limit})"
"""fetch 步起手一行。"""

PRINT_FETCH_ROW_TPL = "  {status} {name} → {pages} 页 {note}"
"""fetch 步每家一行。"""

PRINT_FETCH_DONE_TPL = "✓ 本轮抓页:成 {ok} · 失败 {fail} · 累计已抓 {total} 家 → {out}"
"""fetch 步收尾一行。"""

PRINT_FACTS_TARGETS_TPL = "已抓 {pages} 家 · 已整理 {done} · 本轮待整理 {todo}(上限 {limit};模型 {model})"
"""facts 步起手一行。"""

PRINT_FACTS_ROW_TPL = "  {status} {name} → 过核对 {kept} 节 · 总部「{hq}」 {note}"
"""facts 步每家一行。"""

PRINT_ABORT_TPL = "✗ 盒子连不上({note}),本轮中止,没做的下轮再来"
"""盒子掉线的留痕(✗ 行首 = 调度层升级信号)。"""

PRINT_FACTS_DONE_TPL = "✓ 本轮整理:成 {ok} · 失败 {fail} · 累计 {total} 家 → {out}"
"""facts 步收尾一行。"""

HQ_SHOW_TPL = "{address} {city} {province}"
"""打印用的总部一行(三格拼起来;空格由调用方压)。"""

# =========================================================================
# 9. 点开优先(visit 步:被用户点开过的公司插队,2026-09-20;设计稿 docs/design/点开优先抓取与纠错-20260920.md)
# =========================================================================

IN_SEEN = paths.PROCESSED_EXPLORE / "seen.json"
"""[in] 被用户看过的公司清单(explore 域每轮落盘:slug → 最近列出 / 最近点开时刻);例行轮拿它排队,缺文件 = 没人看过。"""

K_SEEN_OPENED = "opened_at"
"""seen.json 记录键:最近一次真人点开(ISO;没点开过 = 空串)。"""

K_SEEN_LAST = "last_seen"
"""seen.json 记录键:最近一次被雇主板列出(ISO)。"""

PATH_SITE_TODO = "/api/employers/explore/site-todo"
"""cms 取活接口(带钥匙;不带 kind=find = 取抓官网的活)。"""

PATH_SITE_DONE = "/api/employers/explore/site-done"
"""cms 交活接口(带钥匙;每走一步写回进度,办完带总部 / 简介)。"""

P_LIMIT = "limit"
"""取活接口的条数参数名。"""

VISIT_TAKE = 5
"""visit 步每轮最多取几家(一家约一两分钟,一轮一分钟,取多了用户也等不到)。"""

K_TODOS = "todos"
"""取活响应里的清单键。"""

K_KEY = "key"
"""线格式键:池主键。"""

K_STAGE = "stage"
"""线格式键:走到哪一步。"""

K_NOTE = "note"
"""线格式键:由头。"""

K_HOST = "host"
"""线格式键:这一轮抓的官网主机名。"""

K_DONE_HQ_ADDRESS = "hqAddress"
"""线格式键:总部街址。"""

K_DONE_HQ_CITY = "hqCity"
"""线格式键:总部所在市。"""

K_DONE_HQ_PROVINCE = "hqProvince"
"""线格式键:总部所在省 / 州。"""

K_DONE_HQ_QUOTE = "hqQuote"
"""线格式键:总部那句页面原句。"""

K_DONE_HQ_SOURCE = "hqSource"
"""线格式键:总部出处页。"""

K_DONE_BRIEF = "brief"
"""线格式键:简介(节标记行)。"""

K_DONE_SOURCES = "sources"
"""线格式键:简介出处页。"""

STAGE_FIND = "find"
"""进度:转去查找官网(这边判了域名不解析,company 域的 findsite 步接手)。"""

STAGE_FETCH = "fetch"
"""进度:抓取官网。"""

STAGE_FACTS = "facts"
"""进度:整理内容。"""

STAGE_DONE = "done"
"""进度:办完(成败都算;没带内容的由页面走现查兜底)。"""

NOTE_DEAD_SITE = "dead site"
"""转去查找官网的由头:官网域名不解析。"""

NOTE_NAME_MISMATCH = "name mismatch"
"""转去查找官网的由头:官网归属闸没过(官网和公司名对不上,多半是母公司 / 别家的站)—— 找得到名字对得上的新站才换,找不到原官网不动。"""

BRIEF_SECS = (("WHAT", "what"), ("SIZE", "size"), ("FOUNDED", "founded"), ("OFFICES", "offices"),
              ("NEWCOMERS", "newcomers"), ("BENEFITS", "benefits"))
"""官网整理记录 → 简介文本的节(标记, 记录格):与 company 域五节简介、mart 的 SITE_BRIEF_SECS 同一套方括号标记;
总部一节不走这张表(要拼街址 / 市 / 省,标记 BASE)。只收过了原句核对的节。"""

BRIEF_CORE_MARKS = ("WHAT", "SIZE", "FOUNDED")
"""简介里一律出行的节(加上「所在地」共四节):页面与 cms 靠这几个标记齐全认五节简介,没内容也出行、写 BRIEF_NOT_STATED。"""

BRIEF_NOT_STATED = "(not stated)"
"""简介里「官网没写」的写法(与 company 域五节简介同字,页面见了这一节不出)。"""

BRIEF_BASE_MARK = "BASE"
"""简介里「所在地」一节的标记(值 = 总部街址、市、省拼一行)。"""

BRIEF_LINE_TPL = "[{mark}] {text}"
"""简介文本里一节的行形(方括号标记 + 空格 + 正文,一节一行;与 mart 的 SITE_SEC_LINE_TPL 同形)。"""

BRIEF_LINE_SEP = "\n"
"""简介文本的节间分隔。"""

HQ_JOIN = ", "
"""总部一行字的拼接分隔。"""

HQ_TRIM_CHARS = " ,"
"""街址截掉市名以后,尾巴上要抹掉的空格与逗号。"""

HQ_SEG_SEP = ","
"""街址里另起一段的逗号:街址末尾的市名前面有它 = 另起的一段市名(「100 Toronto St, Toronto」),该截;
没有 = 街名本身(「53 chemin Lavaltrie」),不截(2026-09-21)。"""

PROV_CODE_LEN = 2
"""两位省码的长度(两位的一律大写)。"""

NOTE_NO_CMS = "SEED_URL / SEED_TOKEN 未设,visit 步跳过"
"""缺 cms 接线的提示。"""

PRINT_VISIT_TAKE_TPL = "  取活 {n} 家(点开过、有官网的;上限 {limit})"
"""visit 步取活报数。"""

PRINT_VISIT_ROW_TPL = "  {stage:<5} {name}  {note}"
"""visit 步单家一步的日志行。"""
