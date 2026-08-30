"""fetch.constants — 通用抓取域的词表(UA 双档 / wire 词 / 解析标签词表 / 正则预编译)。

2026-08-30 目录化拆出;同日 Frank 定界:fetch = 通用抓取/API 直取域,news 母框架
及其节奏参数(TIMEOUT/DETAIL_SLEEP/MAX_*/MIN_TOTAL)迁回 news 域,这里只剩
任何域抓任何站都用得上的通用词汇。
"""
import re

BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
"""伪装 UA 全站单一来源(2026-08-30 批A 收拢:本件 Chrome/120 与 company 的 131 已漂移,取新)。"""

POLITE_UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
"""自报家门的礼貌 UA(抓第三方官网/搜索用;与伪装档用途相反,两档并存是设计)。"""

UA = BROWSER_UA
"""旧名别名(news 子源体系沿用;新代码一律用 BROWSER_UA/POLITE_UA 两个明确档名)。"""

HDR_UA = "User-Agent"
"""UA 请求头名(HDR_ 头名词族)。"""

RETRIES = 2
"""fetch() 每 URL 重试次数(最多 1+2 次,间隔线性退避)。"""

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
"""英文月份全称词表(只为拼 DATE_RE 存在)。"""

DATE_RE = re.compile(rf"({MONTHS})\s+(\d{{1,2}}),?\s+(20\d\d)", re.I)
"""「June 24, 2026」式日期(月 日, 年;逗号可省,大小写不限)。"""

ISO_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
"""ISO 日期头(iso_date 的短路匹配:已是 YYYY-MM-DD 就不再解析)。"""

DATE_LONG_TPL = "{month} {day} {year}"
"""长日期重组模板(DATE_RE 三捕获组 → strptime 入参)。"""

DATE_LONG_FMT = "%B %d %Y"
"""长日期 strptime 格式(与 DATE_LONG_TPL 配对)。"""

SLUG_RE = re.compile(r"[^a-z0-9]+")
"""slug 化:非小写字母数字一律折叠。"""

SLUG_DASH = "-"
"""slug 连接符(折叠目标 + 首尾剥除)。"""

SLUG_MAXLEN = 60
"""slug 截断长度(2026-08-30 就范批:原是 slugify 的默认参数,全站零人调过这个旋钮 —— 简化律收成常量)。"""

PARSER_XML = "xml"
"""BeautifulSoup 解析器名:feed(atom/rss)。"""

PARSER_HTML = "html.parser"
"""BeautifulSoup 解析器名:详情页(标准库,免 lxml 依赖)。"""

FEED_ENTRY_TAGS = ["entry", "item"]
"""feed 条目标签(atom=entry,rss=item)。"""

TAG_TITLE = "title"
"""feed 条目标题标签。"""

TAG_LINK = "link"
"""feed 条目链接标签。"""

ATTR_HREF = "href"
"""atom link 的地址属性(rss 的地址在标签文本里)。"""

FEED_DATE_TAGS = ["published", "updated", "pubDate", "dc:date"]
"""feed 条目日期标签(atom/rss/dc 三家方言按序取先见者)。"""

K_TITLE = "title"
"""feed 条目键:标题(parse_feed 产出三键 wire 格式)。"""

K_DATE = "date"
"""feed 条目键:ISO 日期。"""

K_URL = "url"
"""feed 条目键:链接。"""

TAG_META = "meta"
"""og:image 所在的 meta 标签。"""

OG_PROP = "og:image"
"""og 封面图的 property 值。"""

ATTR_CONTENT = "content"
"""meta 标签的内容属性。"""

OG_META_PATTERNS = (
    re.compile(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"'),
    re.compile(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"'),
)
"""页级 og:image 正则(属性两种顺序各一只;正则直取不建树)。"""

TAG_MAIN = "main"
"""正文容器兜底一号(缺 body_selector 时)。"""

TAG_ARTICLE = "article"
"""正文容器兜底二号。"""

JUNK_TAGS = ["nav", "script", "style", "form", "aside", "footer", "header"]
"""正文抽取前先拆掉的噪音容器。"""

BODY_TAGS = ["p", "li", "h2", "h3", "h4"]
"""正文收集的元素标签(段落/列表/小标题)。"""

SECTION_TAKE_TAGS = ("p", "li", "h4", "h5", "h6")
"""日期标题式页面的正文候选标签(section_body 会剔掉与 stop_names 撞车的)。"""

TAG_LI = "li"
"""列表项标签(嵌套列表只收最外层的判定 + 加圆点前缀)。"""

TAG_BR = "br"
"""块内换行标签(替换成 \\n 保真)。"""

BULLET = "• "
"""列表项的圆点前缀。"""

LINE_SEP = "\n"
"""行分隔符(段内 <br> 的落地形态)。"""

PARA_SEP = "\n\n"
"""段落分隔符。"""

SPACE_SEP = " "
"""空格(连续空白折叠目标 / get_text 连接符)。"""

WS_RE = re.compile(r"\s+")
"""连续空白(折叠成单空格)。"""

TRAIL_COLON = ":"
"""页尾样板标题的尾冒号(比对 TAIL_NOISE 前剥掉)。"""

TAIL_NOISE = {"page details", "report a problem on this page", "share this page",
              "date modified", "about this site"}
"""页尾样板段标题(canada.ca 等):详情页正文遇到这些标题就截断,不进正文。"""
