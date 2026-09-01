"""crawl.constants — 探索域词表(种子册 / BFS 限域 / 浏览器兜底 / HTML→md 记号)。

2026-08-30 全溶(Frank:「crawl 也照 fetch 这样溶了」);通用抓取词(UA/解析器/空白正则)
不在这 —— 住 fetch.constants,由 functions 统一引(三份 Chrome/131 抄本就此收拢)。
种子册 = 一省一常量,决策记录挂各自 docstring(原 discover_sources.SEEDS 行内注释搬家)。
"""
import re
from pathlib import Path

SEED_MB_ROOT = {"slug": "mb-root", "seed": "https://immigratemanitoba.com/", "depth": 2, "max_pages": 500}
"""MB 全站(层级站路径天然限域;2026-08-03 实测 324 页)。"""

SEED_NS_ROOT = {"slug": "ns-root", "seed": "https://liveinnovascotia.com/", "depth": 2, "max_pages": 400}
"""NS 全站。"""

SEED_NB_IMM = {"slug": "nb-imm", "seed": "https://www.gnb.ca/en/topic/family-home-community/immigration.html",
               "depth": 3, "max_pages": 400, "keywords": "/immigration"}
"""NB gnb 移民区:种子带 .html → 子页不共享路径前缀,必须走 keyword 限域(首轮只爬到 1 页的教训)。
2026-08-31 换址:NB 官网整体迁版 www2.gnb.ca → www.gnb.ca(旧种子 301 跳外域,BFS 不出站
→ 08-30 那轮只抓到 1 页);新站移民区路径 /en/topic/family-home-community/immigration/,
keyword 相应放宽到 /immigration。"""

SEED_NL_IMM = {"slug": "nl-imm", "seed": "https://www.gov.nl.ca/immigration/", "depth": 3, "max_pages": 800}
"""NL immigration 区:含新闻存档,首轮顶到 500 上限(地图可能不全)→ 抬到 800。"""

SEED_SK_SINP = {"slug": "sk-sinp",
                "seed": "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/"
                        "live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program",
                "depth": 3, "max_pages": 400}
"""SK SINP 区:层级深所以 depth 3。"""

SEED_BC_IMMIGRATE = {"slug": "bc-immigrate", "seed": "https://www.welcomebc.ca/immigrate-to-b-c",
                     "depth": 3, "max_pages": 400}
"""BC immigrate 区(2026-08-03 实测 33 页)。"""

SEED_AB_AAIP = {"slug": "ab-aaip", "seed": "https://www.alberta.ca/alberta-advantage-immigration-program",
                "depth": 2, "max_pages": 400, "keywords": "aaip,expression-of-interest,weoi"}
"""AB 扁平站 keyword 限域。2026-08-14 keywords 放宽:AAIP 的 Worker EOI 打分材料 URL 不带 aaip
(实撞:/system/files/im-worker-stream-expression-of-interest-points-grid.pdf 被限域滤掉,
差点把「AB 有没有打分制」答成没有)。PDF 本体 crawler 不收(SKIP_EXTENSIONS 设计如此),
这里放的是让 EOI 相关 HTML 页此后能进地图/政策雷达;分值表 PDF 走 raw 落盘。"""

SEED_ON_OINP = {"slug": "on-oinp", "seed": "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp",
                "depth": 2, "max_pages": 400, "keywords": "oinp,ontario-immigrant,workforce-priority"}
"""ON 扁平站 keyword 限域。"""

SEED_PE_IMM = {"slug": "pe-imm", "seed": "https://www.princeedwardisland.ca/en/information/office-of-immigration",
               "depth": 3, "max_pages": 300, "keywords": "office-of-immigration,immigration", "concurrency": 1}
"""PE:Radware 后面(TLS 指纹墙,改 header 无用)→ 靠浏览器兜底(验证壳→chromium)。
⚠️ 已知盲区(2026-08-03 实测):Radware EUDA 连有头自动化浏览器都识别(CDP 探测),
壳指纹(eudaenableagent)已能认出并转浏览器,但浏览器拿回的仍是壳 → 地图停在 1 页。
口径数据不受影响:PE 的门槛/清单一直走官方指南 PDF(文件服务器不设防)。
有墙一律并发 1(Frank 2026-08-03:「有墙的不要并发」)。"""

SEED_QC_IMM = {"slug": "qc-imm", "seed": "https://www.quebec.ca/en/immigration", "depth": 3, "max_pages": 600}
"""QC 2026-08-03 Frank 改拍 —— 爬(此前因「自有体系不属 PNP」不爬)。quebec.ca 无墙,
先建地图与政策雷达,PNP 决策引擎仍不给 QC 下结论(那是消费层的事)。"""

SEED_NT_IMM = {"slug": "nt-imm", "seed": "https://www.immigratenwt.ca/", "depth": 2, "max_pages": 300}
"""NT(偏远地区,2026-08-03 Frank:「偏远地区也加上」)。"""

SEED_YT_IMM = {"slug": "yt-imm", "seed": "https://yukon.ca/en/immigrate-yukon",
               "depth": 2, "max_pages": 300, "keywords": "immigrat,nominee", "concurrency": 1}
"""YT:Cloudflare 后面(403)→ 浏览器兜底;无头过不了交互式验证框时单省失败不拖全轮
(真要解锁得在有头环境点一次验证框,profile 落盘后续免检)。"""

SEED_NU_IMM = {"slug": "nu-imm", "seed": "https://www.gov.nu.ca/edt/programs-services/nunavut-nominee-program",
               "depth": 2, "max_pages": 200, "keywords": "nominee,immigrat", "concurrency": 1}
"""⚠️ NU 已知盲区(2026-08-03 实测):gov.nu.ca 的 Cloudflare 质询连有头浏览器都不自动清,
fetch 返回质询页(且等待逻辑没拦住,疑似标题闪变竞态 —— 待查)。先留种子每轮试
(失败不拖全轮);NU 提名计划内容少,真要抓口径走官方 PDF 路线。"""

SEED_FED_RCIP = {"slug": "fed-rcip",
                 "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                         "immigrate-canada/rural-franco-pilots.html",
                 "depth": 3, "max_pages": 300, "keywords": "rural-franco,rural-community,francophone-community"}
"""联邦 RCIP/FCIP(偏远/法语社区试点):canada.ca 扁平路径 → keyword 限域;httpx 直通。"""

SEED_FED_PGWP = {"slug": "fed-pgwp",
                 "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                         "study-canada/work/after-graduation.html",
                 "depth": 3, "max_pages": 200, "keywords": "after-graduation,post-graduation,study-canada/work"}
"""B1-4 PGWP 规则库(2026-08-03,铁律 4「没有数据先补 URL」):时长叠加 / field-of-study 官方页,
全挂在 study-canada/work 区(after-graduation 一族)。"""

SEED_FED_AIP = {"slug": "fed-aip",
                "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                        "immigrate-canada/atlantic-immigration.html",
                "depth": 3, "max_pages": 80, "keywords": "atlantic-immigration"}
"""E13-08(2026-08-07)雷区判定通道锚页,进周更当政策雷达(diff 报了才知道口径常量过期):
AIP job offer TEER 0-4 原句在 how-to-immigrate/job-offer.html。深度 2→3(G-AIP 抓取批,
2026-08-09):申请人门槛细节页(work-experience/proof-funds/settlement-service-provider-
organizations)全挂在 how-to-immigrate/eligibility.html 之下一跳,depth=2 探不到
(17 页里三个申请人门槛细节页缺失,build_aip_rules.py 核对 manifest 时实测发现)。"""

SEED_FED_CAREGIVER = {"slug": "fed-caregiver",
                      "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                              "immigrate-canada/caregivers.html",
                      "depth": 2, "max_pages": 60, "keywords": "caregivers,home-care-worker"}
"""保育专项四 NOC 在 child-care-home-support/eligibility.html(E13-08 同批)。"""

SEED_FED_EE = {"slug": "fed-ee",
               "seed": "https://www.canada.ca/en/immigration-refugees-citizenship/services/"
                       "immigrate-canada/express-entry/rounds-invitations/category-based-selection.html",
               "depth": 4, "max_pages": 300, "keywords": "express-entry"}
"""联邦 Express Entry(2026-08-05,铁律「URL → 数据 → SQL」):CRS 计分表 + CEC/FSW/FST 资格页。
种子不是猜的 —— 用 raw/ee/federal-categories.json 里已举证的官方 URL 起爬,keyword 限域
展开整个 express-entry 区(who-can-apply 一族 = 资格;check-score/criteria = CRS 计分)。"""

SEEDS = [SEED_MB_ROOT, SEED_NS_ROOT, SEED_NB_IMM, SEED_NL_IMM, SEED_SK_SINP, SEED_BC_IMMIGRATE,
         SEED_AB_AAIP, SEED_ON_OINP, SEED_PE_IMM, SEED_QC_IMM, SEED_NT_IMM, SEED_YT_IMM, SEED_NU_IMM,
         SEED_FED_RCIP, SEED_FED_PGWP, SEED_FED_AIP, SEED_FED_CAREGIVER, SEED_FED_EE]
"""种子册全序(九省 + QC + 三地区 + 联邦五案;PE/NU 已知盲区留种子每轮试)。"""

K_SLUG = "slug"
"""种子/manifest 键:slug。"""

K_SEED = "seed"
"""种子键:起爬 URL。"""

K_DEPTH = "depth"
"""种子/页行键:BFS 深度。"""

K_MAX_PAGES = "max_pages"
"""种子键:页数上限。"""

K_KEYWORDS = "keywords"
"""种子键(可选):扁平站 keyword 限域(逗号分隔)。"""

K_CONCURRENCY = "concurrency"
"""种子键(可选):并发(有墙 = 1)。"""

K_SEED_URL = "seed_url"
"""manifest 键:起爬 URL。"""

K_TOTAL_URLS = "total_urls"
"""manifest 键:页数。"""

K_MAX_DEPTH = "max_depth"
"""manifest 键:探索深度。"""

K_CRAWLED_AT = "crawled_at"
"""manifest 键:本轮时刻(cache 取最新份的比较键)。"""

K_PAGES = "pages"
"""manifest 键:页清单。"""

K_URL = "url"
"""页行键:页地址。"""

K_TITLE = "title"
"""页行键:页标题。"""

K_STATUS = "status"
"""页行键:HTTP 状态(cache 只认 200)。"""

K_HTML = "html"
"""页行键:html_cache 文件名(md5(url).html)。"""

K_DATE = "date"
"""changes 键:本轮日期。"""

K_TOTAL = "total"
"""changes 键:本轮总页数。"""

K_ADDED = "added"
"""changes 键:新增 URL 清单(政策雷达信号)。"""

K_GONE = "gone"
"""changes 键:消失 URL 清单。"""

MANIFEST_FILE = "manifest.json"
"""每 slug 的站点地图文件名。"""

MANIFEST_PREV_FILE = "manifest-prev.json"
"""上一轮地图(diff 基准)。"""

CHANGES_FILE = "changes.json"
"""本轮 diff 落盘(政策雷达)。"""

HTML_CACHE_DIR = "html_cache"
"""探索时顺手缓存的页面原文目录(cache 正门 + 定向抽取的语料)。"""

HTML_SUFFIX = ".html"
"""缓存文件后缀(文件名 = md5(url) + 此后缀)。"""

STATUS_OK = 200
"""cache 只认的 HTTP 状态。"""

SKIP_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
                   ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz",
                   ".mp4", ".mp3", ".avi", ".mov", ".wmv",
                   ".woff", ".woff2", ".ttf", ".eot",
                   ".css", ".js", ".map", ".json",
                   ".xml", ".rss", ".atom")
"""BFS 不收的文件后缀(资产/文档/流媒体;PDF 走 raw 落盘不进地图)。"""

SKIP_PATH_PATTERNS = (re.compile(r"/_sources/"), re.compile(r"/_static/"), re.compile(r"/_images/"),
                      re.compile(r"/genindex"), re.compile(r"/search\.html"), re.compile(r"/py-modindex"))
"""BFS 不收的路径样式(Sphinx 遗产,保留无害)。"""

DISCOVER_CONCURRENCY = 20
"""BFS 默认并发(种子可用 concurrency 收窄;有墙 = 1)。"""

HTTP_TIMEOUT_S = 30.0
"""单页请求超时秒数。"""

SEED_TIMEOUT_S = 1800
"""单省一轮探索的墙钟上限秒数(原 subprocess timeout 同值;超时单省作废不拖全轮)。"""

HTTP_FORBIDDEN = 403
"""被反爬挡的状态码(→ 浏览器兜底)。"""

HDR_ACCEPT = "Accept"
"""Accept 头名。"""

ACCEPT_HTML = "text/html,application/xhtml+xml"
"""只要 HTML 的 Accept 值。"""

HDR_CONTENT_TYPE = "content-type"
"""响应内容类型头名。"""

CT_HTML = "text/html"
"""HTML 内容类型判词。"""

DIFF_SHOW_MAX = 20
"""政策雷达日志每侧最多点名多少条 URL。"""

PROFILE_DIR = Path(__file__).resolve().parent / ".browser-profile"
"""持久浏览器 profile(cf_clearance 落盘,验证过一次后续免检)。"""

NAV_TIMEOUT_MS = 45000
"""浏览器导航超时。"""

NETWORK_IDLE_MS = 8000
"""network-idle 等待上限。"""

CHALLENGE_TIMEOUT_MS = 120000
"""人机验证框等待上限(有头环境手点)。"""

SCROLL_PASSES = 5
"""懒加载列表页的滚动次数。"""

SCROLL_PAUSE_MS = 900
"""每次滚动后的等待。"""

VIEWPORT_W = 1440
"""浏览器视口宽。"""

VIEWPORT_H = 900
"""浏览器视口高。"""

LOCALE = "en-CA"
"""浏览器语言环境。"""

HDR_ACCEPT_LANGUAGE = "Accept-Language"
"""Accept-Language 头名。"""

ACCEPT_LANGUAGE = "en-CA,en;q=0.9"
"""浏览器 Accept-Language 值。"""

ENV_HEADLESS = "BROWSER_HEADLESS"
"""=1 → 无头(docker 无人值守;实测 canada.ca/Akamai 无头+stealth 直通)。默认有头(host 解验证框)。"""

ENV_ON = "1"
"""环境开关开启值。"""

BROWSER_ARGS = ("--disable-blink-features=AutomationControlled", "--no-sandbox")
"""chromium 启动参数(--no-sandbox:容器内以 root 跑必需,host 上无害)。"""

STEALTH_JS = "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
"""隐掉 navigator.webdriver 自动化旗(Cloudflare/Akamai 查它)。"""

TITLE_CHALLENGE_MARKERS = ("just a moment", "请稍候", "checking your browser", "attention required",
                           "安全验证", "请验证")
"""页标题里的人机验证判词(浏览器侧等待放行的条件)。"""

HTML_CHALLENGE_MARKERS = ("just a moment", "请稍候", "正在进行安全验证", "请验证您是真人",
                          "checking your browser", "attention required",
                          "cf-browser-verification", "/cdn-cgi/challenge-platform",
                          "verifying your browser", "eudaenableagent")
"""HTTP 200 里的验证壳判词(challenge 页当正文存档 = 脏语料)。最后一枚 = Radware EUDA 的
JS 加载器壳(princeedwardisland.ca 实见,2026-08-03:200 + 125KB webpack JS,「Verifying
your browser」文字在 12 万字开外,前 4000 字检测窗口里只有 EUDA 的常量名可认)。"""

CHALLENGE_SNIFF_LEN = 4000
"""验证壳判词的检测窗口(只看前 N 字)。"""

TITLE_COND_TPL = "!document.title.toLowerCase().includes('{marker}')"
"""等待验证放行的 JS 条件片段(按判词拼 &&)。"""

COND_AND = " && "
"""JS 条件连接词。"""

WAIT_FN_TPL = "() => {cond}"
"""wait_for_function 的函数体模板。"""

DOMCONTENTLOADED = "domcontentloaded"
"""page.goto 等待档。"""

NETWORKIDLE = "networkidle"
"""load_state 等待档。"""

SCROLL_STEP_PX = 5000
"""每次滚轮的像素量。"""

DEFAULT_CONTENT_SELECTORS = ("article", "main", "[role='main']", ".bd-article",
                             ".document", ".content", "#content", "body")
"""正文容器兜底顺序(无显式 selector 时逐个试)。"""

DEFAULT_REMOVE_SELECTORS = ("script", "style", "nav", "footer", "header",
                            ".headerlink", ".viewcode-link", ".highlight-link",
                            "a.reference.external.image-reference")
"""转 md 前先拆掉的噪音选择器(Sphinx 遗产项保留无害)。"""

HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")
"""标题标签(级别 = 名字第二个字符)。"""

TAG_PRE = "pre"
"""代码块容器。"""

TAG_CODE = "code"
"""代码标签。"""

TAG_TABLE = "table"
"""表格标签。"""

TAG_TR = "tr"
"""表行。"""

CELL_TAGS = ("td", "th")
"""表格单元格标签。"""

LIST_TAGS = ("ul", "ol")
"""列表标签。"""

TAG_OL = "ol"
"""有序列表。"""

TAG_DL = "dl"
"""定义列表(Sphinx 常见)。"""

TAG_DT = "dt"
"""定义术语。"""

TAG_DD = "dd"
"""定义释文。"""

TAG_P = "p"
"""段落。"""

BLOCK_TAGS = ("p", "div")
"""块级判词(admonition 检测范围)。"""

TAG_A = "a"
"""链接。"""

TAG_IMG = "img"
"""图片。"""

TAG_VIDEO = "video"
"""视频。"""

TAG_SOURCE = "source"
"""视频源。"""

TAG_IFRAME = "iframe"
"""内嵌框(YouTube 等)。"""

BOLD_TAGS = ("strong", "b")
"""加粗标签。"""

EM_TAGS = ("em", "i")
"""斜体标签。"""

TAG_HR = "hr"
"""水平线。"""

TAG_BLOCKQUOTE = "blockquote"
"""引用块。"""

ATTR_CLASS = "class"
"""class 属性名。"""

ATTR_SRC = "src"
"""src 属性名。"""

ATTR_ALT = "alt"
"""alt 属性名。"""

ATTR_TITLE = "title"
"""title 属性名(iframe 的说明文字)。"""

ADMONITION_WORDS = ("admonition", "note", "warning")
"""提示框 class 判词(Sphinx note/warning)。"""

ADMONITION_TITLE_CLASS = "admonition-title"
"""提示框标题 class。"""

SKIP_HREF_PREFIXES = ("#", "mailto:", "javascript:")
"""不做绝对化的链接前缀。"""

LANG_STOPWORDS = ("highlight", "code", "pre", "block")
"""代码块语言识别的排除词。"""

LANG_CLASS_RE = re.compile(r"(?:language-|highlight-)?(\w+)")
"""代码块语言 class 样式。"""

MD_H = "#"
"""标题记号(重复 N 次 = 级别)。"""

MD_FENCE = "```"
"""代码围栏。"""

MD_TICK = "`"
"""行内代码记号。"""

MD_TICK2_TPL = "`` {text} ``"
"""含反引号文本的行内代码包法。"""

MD_TICK_TPL = "`{text}`"
"""行内代码包法。"""

MD_BOLD_TPL = "**{text}**"
"""加粗包法。"""

MD_EM_TPL = "*{text}*"
"""斜体包法。"""

MD_UL_PREFIX = "- "
"""无序列表前缀。"""

MD_OL_TPL = "{i}. "
"""有序列表前缀。"""

MD_QUOTE_PREFIX = "> "
"""引用前缀。"""

MD_QUOTE_TITLE_TPL = "> **{title}**"
"""提示框标题行。"""

MD_HR = "---"
"""水平线。"""

MD_LINK_TPL = "[{text}]({href})"
"""链接写法。"""

MD_IMG_TPL = "![{alt}]({src})"
"""图片写法。"""

MD_VIDEO_TPL = "[Video: {src}]({src})"
"""视频占位写法。"""

MD_DD_INDENT = "  "
"""定义释文缩进。"""

MD_CELL_SEP = " | "
"""表格列分隔。"""

MD_ROW_EDGE = "| "
"""表行左缘。"""

MD_ROW_END = " |"
"""表行右缘。"""

MD_HEADER_DASH = "---"
"""表头分隔格。"""

H_LEVEL_TPL = "{hashes} {text}"
"""标题行拼法。"""

BLANKS_RE = re.compile(r"\n{3,}")
"""三连以上空行(压成两连)。"""

FM_TPL = "---\nsource: {url}\ntitle: \"{title}\"\nfetched: {fetched}\n---\n\n"
"""md 头部 frontmatter(fetched = 取回时刻,出处日期真相)。"""

EE_URL = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/"
          "express-entry/rounds-invitations/category-based-selection.html")
"""EE 类别抽选页(ee_categories 回退工具的目标;canada.ca 走 Akamai,httpx 403 → 浏览器)。"""

EE_OUT_FILE = "federal-categories.json"
"""回退工具产出文件名(落 paths.EE)。"""

EE_CAT_MAP = (("healthcare", "healthcare", "医疗社服"), ("Science", "stem", "STEM"),
              ("trade", "trade", "技工"), ("education", "education", "教育"),
              ("transport", "transport", "运输"), ("physicians", "physicians", "医生"),
              ("senior managers", "senior-managers", "高管"), ("researchers", "researchers", "研究"),
              ("military", "military", "军职"))
"""类别英文标题关键词 → (短 key, 中文标签)。"""

EE_EXPAND_JS = """() => {
  document.querySelectorAll('select[name$="_length"]').forEach(s => {
    const all = [...s.options].find(o => o.value === '-1') || s.options[s.options.length - 1];
    s.value = all.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  });
}"""
"""把 WET/DataTables 每表设「显示全部」(默认分页只给首页 10 行)。"""

EE_EXTRACT_JS = """() => {
  const nodes = document.querySelectorAll('h2, h3, table');
  let cat = '', out = [];
  nodes.forEach(n => {
    if (n.tagName === 'TABLE') {
      const rows = [...n.querySelectorAll('tr')]
        .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
        .filter(r => r.length >= 3);
      if (rows.length) out.push({ cat, rows });
    } else { cat = n.innerText.trim(); }
  });
  return out;
}"""
"""按 h2/h3 分节抽全部表行。"""

EE_NOC_RE = re.compile(r"\d{5}")
"""五位 NOC 码。"""

EE_NUM_RE = re.compile(r"\d{1,5}")
"""纯数字格(选职业名时排除)。"""

EE_TEER_RE = re.compile(r"[0-5]")
"""TEER 单位数。"""

URL_SLASH = "/"
"""URL 尾斜杠(变体归一)。"""

SCHEME_SEP = "://"
"""URL 协议分隔。"""

MANIFEST_GLOB = "*/manifest.json"
"""cache 正门扫描的地图路径样式(相对 data/crawl/)。"""

ENC_UTF8 = "utf-8"
"""读写编码。"""

K_WIDTH = "width"
"""浏览器视口键:宽。"""

K_HEIGHT = "height"
"""浏览器视口键:高。"""

IFRAME_TITLE_FALLBACK = "Embedded video"
"""iframe 无 title 属性时的链接文字。"""

K_SOURCE = "source"
"""EE 产出键:出处标签。"""

K_FETCHED = "fetched"
"""EE 产出键:取回日期。"""

K_CATEGORIES = "categories"
"""EE 产出键:类别清单。"""

K_KEY = "key"
"""EE 类别键:短 key。"""

K_LABEL = "label"
"""EE 类别键:中文标签。"""

K_OCCUPATIONS = "occupations"
"""EE 类别键:职业清单。"""

K_NOC = "noc"
"""EE 职业行键:五位 NOC。"""

K_TEER = "teer"
"""EE 职业行键:TEER。"""

K_CAT = "cat"
"""EE 抽取块键:小节标题。"""

K_ROWS = "rows"
"""EE 抽取块键:表行。"""

K_SEEN = "_seen"
"""EE 桶内去重集(落盘前不导出 —— 只在内存桶里)。"""

EE_SOURCE_LABEL = "Express Entry category-based selection"
"""EE 产出的出处标签。"""

EE_EXPAND_WAIT_MS = 2000
"""DataTables 展开后的等待。"""

NOTE_FIRST_ROUND = "(首轮建档)"
"""diff 无基准时的注记。"""

NOTE_NO_CHANGE = ",无变化"
"""地图无变化时的注记。"""

GUARD_ALL_FAILED = "没有任何一省探索成功 —— 网络或封锁问题,本轮作废"
"""全轮防线文案。"""

PRINT_SEED_TPL = "→ {slug}  {seed}"
"""开一颗种子。"""

PRINT_BFS_START_TPL = "BFS Discovery: {seed}"
"""BFS 起点。"""

PRINT_BFS_CFG_TPL = "  depth={depth} max={max} concurrency={c}"
"""BFS 参数一行。"""

PRINT_LEVEL_TPL = "  [LEVEL] {n} URLs at depth {depth}"
"""层进播报。"""

PRINT_PAGE_TPL = "  [{idx:>4}] depth={depth} {url}"
"""收录一页。"""

PRINT_SKIP_HTTP_TPL = "  [SKIP] HTTP {code}: {url}"
"""HTTP 错误跳过(设计内损耗,不升级)。"""

PRINT_SKIP_ERR_TPL = "  [SKIP] {name}: {detail}: {url}"
"""网络/解析错误跳过(设计内损耗,不升级)。"""

PRINT_BROWSER_403_TPL = "  [browser] 403→browser: {url}"
"""httpx 被挡转浏览器成功。"""

PRINT_BROWSER_200_TPL = "  [browser] 200-challenge→browser: {url}"
"""200 验证壳转浏览器成功。"""

PRINT_BROWSER_DOWN = ("浏览器兜底不可用;403 页将跳过。装法:uv sync --extra browser && "
                      "uv run playwright install chromium")
"""playwright 缺席/启动失败(警告一次)。"""

PRINT_BROWSER_NONE = "浏览器不可用(playwright 未装?)"
"""EE 回退工具无浏览器可用。"""

PRINT_CHALLENGE_WAIT_TPL = ("  [browser] ⏳ 人机验证:请在浏览器窗口点一下验证框"
                            "(最多等 {s}s,解过一次后续免验证) {url}")
"""交互式验证等待提示(有头环境手点)。"""

PRINT_CHALLENGE_OK = "  [browser] ✅ 验证通过,继续"
"""验证放行。"""

PRINT_CHALLENGE_TIMEOUT = "  [browser] ⚠️ 验证未在超时内完成,跳过该页"
"""验证超时。"""

PRINT_MANIFEST_TPL = "[OK] {n} pages → {path}"
"""一颗种子收轮。"""

PRINT_RADAR_TPL = "  ⚠ {slug} 站点地图变了:+{added} / -{gone}"
"""政策雷达:diff 命中(新页面出现 = 政策可能变了;BC 2026-06-13 新排除清单事故的解药)。"""

PRINT_RADAR_ADD_TPL = "    + {url}"
"""雷达新增行。"""

PRINT_RADAR_GONE_TPL = "    - {url}"
"""雷达消失行。"""

PRINT_SEED_OK_TPL = "  ✓ {slug} {n} 页{note}"
"""种子无变化收轮。"""

PRINT_DISCOVER_DONE_TPL = "===== 探索完成:{ok}/{total} 省 ====="
"""全轮收口。"""

PRINT_EE_DONE_TPL = "✓ {path}({cats} 类 · {total} 职业)"
"""EE 回退工具收口。"""

PRINT_EE_CAT_TPL = "  {n:>3}  {label}"
"""EE 每类报数。"""

KEYWORDS_SEP = ","
"""种子 keywords 的分隔符。"""

TIMESPEC_SECONDS = "seconds"
"""frontmatter fetched 时刻的精度档(isoformat timespec)。"""

ERRORS_REPLACE = "replace"
"""读缓存的解码容错档(历史缓存偶有混编码字节,宁可替换不炸读)。"""


# =========================================================================
# 7. urls 哨兵(各域 constants 里的官方 URL 还活着吗;「禁猜 URL」铁律的机器面)
# =========================================================================

URLS_DOC = """2026-08-31 Frank「那个 gate 校验 URL 的小批也做了吧」,边界两刀:
① 住 crawl 不住 gate —— gate 是 dev 时的代码形制闸(快、零网络),本步要网络实测,
  是数据哨兵,与 pnp watch / sched 保鲜同族;crawl 本就回答「官方 URL 在哪/还活着吗」。
② 只从各域 constants.py 的**赋值**里抽 URL(ast 解析,不碰 docstring)—— 沿革注释里
  故意留档的旧址(NB www2 考据)不误扫;functions 零字符串令本就不许藏 URL,两闸互补。
判红判据(NB 迁版实撞定型):404/410 或**跨站重定向** = 官方真挪窝 → 硬红,本轮记失败
扣 ping 转红;403/5xx/超时/连接失败 = WAF/抖动档,只留痕不拦轮(archive.org 503 阵发、
PE 200 挑战壳都不误伤 —— PE 同站 200 直接过)。"""
"""urls 哨兵的设计判据(决策记录)。"""

ETL_DIR_NAME = "etl"
"""数据层目录名(相对仓库根)。"""

CONSTANTS_GLOB = "*/constants.py"
"""被扫文件样式(etl/ 下逐域)。"""

URL_HTTP_PREFIXES = ("http://", "https://")
"""赋值字符串算 URL 的前缀。"""

URL_SKIP_MARKS = ("{", "web.archive.org", "host.docker.internal", "localhost", "127.0.0.1",
                  "192.168.", "api.anthropic.com", "/wds/rest/", "publications.saskatchewan.ca/api/")
"""不进哨兵的 URL 特征:模板占位、存档站(自带逐份重试路,503 阵发不当官方死讯)、本机/内网、
API 基址(2026-08-31 首扫误报三条定型:裸基址不带参数 GET 天然 404/405,健康与否由消费它们
的步每轮实证,哨兵只管「人能读的页」)。"""

URL_TIMEOUT_S = 30
"""单条 URL 实测超时秒数。"""

URL_DEAD_CODES = (404, 410)
"""硬红状态码:官方页真删。"""

WWW_PREFIX = "www."
"""比对跳转是否跨站前,两端主机名先剥的裸前缀(www 有无不算迁站;www2→www 算)。"""

URL_CDN_SUFFIXES = ("googleusercontent.com", "blob.core.windows.net")
"""下载门户的正常出口 CDN(2026-08-31 首扫误报两条定型:docs.google 表格发布件跳
googleusercontent、open.canada.ca 数据集跳 Azure blob —— 服务形态不是迁站,跳到这些
后缀不算硬红)。"""

URLS_P_DEAD_TPL = "✗ urls {dom}: {url} → HTTP {status}(官方页已删/失联)"
"""硬红行:死码。"""

URLS_P_MOVED_TPL = "✗ urls {dom}: {url} → 跨站跳 {final}(官方站迁版,NB 08-31 同款;去新站找对应页改常量)"
"""硬红行:跨站重定向。"""

URLS_P_SOFT_TPL = "! urls {dom}: {url} → {what}(WAF/抖动档,留痕不拦轮)"
"""软留痕行。"""

URLS_P_HTTP_TPL = "HTTP {status}"
"""软留痕的状态码措辞。"""

URLS_P_SUMMARY_TPL = "✗ urls 哨兵:{n}/{total} 条官方 URL 硬红(见上;本轮记失败)"
"""收口行:有硬红。"""

URLS_P_OK_TPL = "✓ urls 哨兵:{total} 条官方 URL 无硬红(软留痕 {soft} 条)"
"""收口行:全过。"""

