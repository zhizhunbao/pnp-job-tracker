"""news.constants — news 域词表(行键 K_ 族 / SOURCE 契约键 / 九个子源词表 / 节奏参数 / 文案模板 / LLM 层)。

2026-08-30 立(Frank 定界:fetch 只做通用抓取,news 的行词汇与节奏归 news 域);
K_TITLE/K_DATE/K_URL 与 fetch 的 feed 三键同名同值 = 各域自抄的 wire 词
(constants 叶不许 import,cms「Lang 三字面量各域自抄」同例)。
2026-08-30 批C 子源溶解:七个 scrape_* 子源的字面量(list_url/citation/选择器/正则/阈值)
与入口脚本的 LLM 层字面量全部收编到此(零字符串令,functions 体内不留字面量);
唯一特批 import = `paths`(OUT_ 路径常量要经 paths 解析),方言律见
docs/design/etl分域-20260829.md §4。
"""
import re

import paths

# =========================================================================
# 1. 行键与落盘信封(K_ 族)
# =========================================================================

K_REGION = "region"
"""行键:federal / 两字母省码(前端省筛选 chips 直接用)。"""

K_TITLE = "title"
"""行键:标题(与 fetch feed 三键同 wire)。"""

K_DATE = "date"
"""行键:ISO 日期。"""

K_URL = "url"
"""行键:条目链接(累积去重的主键)。"""

K_OG_IMAGE = "ogImage"
"""行键:封面图(og:image;可为 None)。"""

K_BODY_EN = "bodyEn"
"""行键:英文正文(单页式源随列表带出,列表式源抓详情页补)。"""

K_BODY_ZH = "bodyZh"
"""行键:中文翻译正文(母框架只留空位,翻译由 news 入口脚本按预算补)。"""

K_SUMMARY_ZH = "summaryZh"
"""行键:中文速读(同上,母框架留空位)。"""

K_BODY_KO = "bodyKo"
"""行键:韩文翻译正文(Frank 2026-07-18「点了韩语就是翻译成韩语」;同编号协议独立调用)。"""

K_SUMMARY_KO = "summaryKo"
"""行键:韩文速读(与 summaryZh 各自独立补,预算按调用数计)。"""

K_TITLE_ZH = "titleZh"
"""行键:标题中文灰注(E13-06;与正文 bodyZh 独立,本地 Ollama-only)。"""

K_IMPORTANCE = "importance"
"""行键:重要度 1-5(P1d;展示=列表「重要」徽标,非资格判定)。"""

K_IMPORTANCE_NOTE = "importanceNote"
"""行键:重要度的一句中文理由(与 importance 同一次调用产出)。"""

K_CITATION = "citation"
"""行键:出处着陆页(E4-04 惯例:人能读的页;缺省 = list_url)。"""

K_FETCHED_AT = "fetchedAt"
"""行键:本条抓取时刻(UTC)。"""

K_FETCHED = "fetched"
"""落盘信封键:本轮抓取时刻。"""

K_ITEMS = "items"
"""落盘信封键:条目清单。"""

OUT_NEWS_FILE = paths.NEWS / "news.json"
"""本域唯一产出:raw/news/news.json(按 URL 累积去重;一子源挂只丢该子源;只增不缩防线)。

IN 是网络:IRCC Atom + MB RSS + NS/BC/AB/ON/QC/SK 官方页(P0 2026-07-18 逐源实测清单见
docs/implementation/E12-移民路径引擎/06 §4;PE Radware 挡 / NL 无新闻页,不硬上)。"""

# =========================================================================
# 2. SOURCE 契约键与子源种类
# =========================================================================

K_LIST_URL = "list_url"
"""SOURCE 契约键:列表页或 feed URL。"""

K_KIND = "kind"
"""SOURCE 契约键:atom | rss | html。"""

K_PARSE = "parse"
"""SOURCE 契约键:仅 html —— 列表页 HTML → 条目行的解析函数。"""

K_POST_DATA = "post_data"
"""SOURCE 契约键(可选):列表页要 POST 表单才出结果时填(SK Sitecore 筛选)。"""

K_BODY_SELECTOR = "body_selector"
"""SOURCE 契约键(可选):详情页正文容器选择器(缺省 main/article 通用抽取)。"""

KIND_ATOM = "atom"
"""子源种类:Atom feed(母脚本 parse_feed 直接消化,零 parse)。"""

KIND_RSS = "rss"
"""子源种类:RSS feed(同上)。"""

KIND_HTML = "html"
"""子源种类:HTML 列表页(必须带 parse 函数)。"""

FEED_KINDS = (KIND_ATOM, KIND_RSS)
"""feed 类子源的 kind 值(连 parse 都不用写,母直接 parse_feed)。"""

REGION_FEDERAL = "federal"
"""IRCC 联邦源的 region 值(省筛选 chips 的联邦档)。"""

REGION_AB = "AB"
"""阿尔伯塔子源的 region 值。"""

REGION_BC = "BC"
"""不列颠哥伦比亚子源的 region 值。"""

REGION_MB = "MB"
"""曼尼托巴子源的 region 值。"""

REGION_NB = "NB"
"""新不伦瑞克子源的 region 值。"""

REGION_NS = "NS"
"""新斯科舍子源的 region 值。"""

REGION_ON = "ON"
"""安大略子源的 region 值。"""

REGION_QC = "QC"
"""魁北克子源的 region 值。"""

REGION_SK = "SK"
"""萨斯喀彻温子源的 region 值。"""

# =========================================================================
# 3. 母框架节奏与格式
# =========================================================================

ANCHOR_SEP = "#"
"""锚点合成 url 的记号(含 # = 单页式源,正文来自列表页解析,rebody 跳过)。"""

ENV_REBODY = "NEWS_REBODY"
"""环境开关:=1 对存量条目重抓详情正文(一次性回填,抽取器修复后用)。"""

ENV_ON = "1"
"""环境开关的开启值。"""

TIMEOUT_S = 30
"""列表/详情请求超时秒数。"""

DETAIL_SLEEP_S = 1.0
"""详情页抓取间隔秒数(礼貌频控)。"""

MAX_DETAIL_PER_RUN = 15
"""每轮每子源最多抓 N 个详情页(12h 一轮,追平只是时间问题)。"""

MAX_AGE_DAYS = 400
"""只收这个窗口内的条目(AB 页带 2020 年陈年更新,旧闻不进站)。"""

MIN_TOTAL = 10
"""全轮防线:合并后至少 N 条(首轮 ~几十条,低于此 = 结构性故障)。"""

DATE_ISO_FMT = "%Y-%m-%d"
"""条目日期的 strptime 格式(时窗防线用)。"""

TS_UTC_FMT = "%Y-%m-%dT%H:%M:%SZ"
"""抓取时刻戳格式(UTC)。"""

ENC_UTF8 = "utf-8"
"""落盘/读盘编码。"""

PAIR_SEP = " "
"""汇总行里 region=N 对之间的分隔。"""

# =========================================================================
# 4. 母框架文案与防线模板
# =========================================================================

PRINT_OUT_TPL = "OUT: {out}"
"""开轮打印:落盘目标。"""

PRINT_REGION_TPL = "✓ {region}: list {listed} · new {added}"
"""子源收轮打印:列表条数与新增数。"""

PRINT_DEFERRED_TPL = " (deferred {n})"
"""子源收轮打印尾缀:超详情预算延后的条数。"""

PRINT_REBODY_TPL = "  ↻ {region}: rebody {n}"
"""rebody 回填打印。"""

PRINT_WROTE_TPL = "wrote {n} items {parts}"
"""全轮收口打印:总条数 + 各 region 分布。"""

COUNT_PAIR_TPL = "{key}={n}"
"""region=N 对的格式。"""

WHERE_DETAIL_TPL = "{region} detail {url}"
"""错误留痕定位:详情页抓取失败。"""

WHERE_REBODY_TPL = "rebody {url}"
"""错误留痕定位:rebody 失败(保留旧正文)。"""

WHERE_KEEP_TPL = "{region}(保留旧数据,下轮重试)"
"""错误留痕定位:子源整体失败(逐子源隔离,不断全轮)。"""

GUARD_SHRINK_TPL = "merged {n} < existing {prev} —— 累积表只增不缩,拒绝写盘"
"""防线文案:合并后条数缩水。"""

GUARD_FEW_TPL = "suspiciously few items ({n} < {floor}) —— 不写盘"
"""防线文案:总量可疑地少(结构性故障)。"""

# =========================================================================
# 5. 子源解析的共用词(标签名 / 属性名 / 分隔 / 锚点模板)
# =========================================================================

HTML_PARSER = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml(容器镜像瘦)。"""

TAG_MAIN = "main"
"""正文容器标签名(找不到就退 body)。"""

TAG_P = "p"
"""段落标签名。"""

TAG_H2 = "h2"
"""二级标题标签名。"""

TAG_H3 = "h3"
"""三级标题标签名。"""

TAG_H4 = "h4"
"""四级标题标签名。"""

HREF_ATTR = "href"
"""链接节点的属性名(a[HREF_ATTR])。"""

ATTR_ID = "id"
"""标题节点自带的锚点 id 属性名(ON/NB 优先用它,缺才合成)。"""

WS_FOLD_RE = re.compile(r"\s+")
"""连续空白折一个(清抓来的文本)。"""

TEXT_JOIN_SEP = " "
"""折空白 / get_text 拼接的单空格。"""

PARA_SEP = "\n\n"
"""段间分隔(bodyEn 的段落切分与译文回拼同一个口径)。"""

LINE_SEP = "\n"
"""行分隔(速读首行切重要度用)。"""

ANCHOR_SLUG_TPL = "{date}-{slug}"
"""合成锚点:日期-标题 slug(单页日期段落式源无逐条 URL)。"""

ANCHOR_URL_TPL = "{base}#{anchor}"
"""条目 URL = 列表页 + 锚点。"""

DATE_ISO_TPL = "{year}-{month:02d}-{day:02d}"
"""ISO 日期拼装(SK 从 URL 路径段取年/月/日)。"""

ELLIPSIS = "…"
"""标题截断的省略号。"""

# =========================================================================
# 6. 子源 IRCC(联邦 Atom;零 parse)
# =========================================================================

IRCC_LIST_URL = ("https://api.io.canada.ca/io-server/gc/news/en/v2"
                 "?dept=departmentofcitizenshipandimmigration"
                 "&sort=publishedDate&orderBy=desc&pick=30&format=atom&atomtitle=IRCC")
"""IRCC 联邦移民新闻(E12-06 P1 锚点)。

金源 = 加拿大政府新闻 API 的 Atom feed(api.io.canada.ca io-server news v2,机器可读,
P0 2026-07-18 实测 200/50 entries)。feed 类子源零 parse:母脚本 parse_feed 直接消化,
条目 URL 指向 canada.ca 新闻稿页(httpx 可直取,母抓详情补 og:image+正文)。"""

IRCC_CITATION = "https://www.canada.ca/en/immigration-refugees-citizenship/news.html"
"""IRCC 出处着陆页(人能读的新闻室页,不是 API 端点)。"""

# =========================================================================
# 7. 子源 MB(WordPress RSS;零 parse)
# =========================================================================

MB_LIST_URL = "https://immigratemanitoba.com/feed/"
"""曼尼托巴 MPNP 官方新闻(immigratemanitoba.com)。

站点是 WordPress,自带 RSS(P0 2026-07-18 实测 200/10 items)——feed 类子源零 parse。
RSS description 是截断摘要,母脚本抓条目详情页补全文(entry-content)+ og:image。"""

MB_CITATION = "https://immigratemanitoba.com/news/"
"""MB 出处着陆页。"""

MB_BODY_SELECTOR = "div.entry-content"
"""WordPress 正文容器(默认 main 会混入侧栏)。"""

# =========================================================================
# 8. 子源 AB(单页日期段落式)
# =========================================================================

AB_LIST_URL = "https://www.alberta.ca/aaip-updates"
"""阿尔伯塔 AAIP「Updates」页(alberta.ca/aaip-updates)。

P0 2026-07-18 实测 200。单页日期段落式,条目自述性最好:h3.goa-title = 「日期: 标题」
(class 选择器天然避开页面里混着的全政府新闻挂件 goa-news listings);正文=后续兄弟
节点(goa-text 容器)直到下一 h3/h2。无逐条 URL → 锚点合成;bodyEn 就地取自本页。
页面带 2020-2025 陈年更新,母脚本 MAX_AGE_DAYS 窗口自动滤掉。"""

AB_HEAD_SEL = "h3.goa-title"
"""条目头:「日期: 标题」(class 选择器避开全政府新闻挂件)。"""

AB_HEAD_SEP = ":"
"""条目头里日期与标题的分隔(无冒号 = 整串当标题)。"""

AB_STOP_TAGS = ("h3", "h2")
"""正文收集的停止标签(遇下一条目头或下一大节即止)。"""

# =========================================================================
# 9. 子源 BC(单页日期段落式)
# =========================================================================

BC_LIST_URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news"
"""BC PNP 官方 News 页(welcomebc.ca)。

P0 2026-07-18 从 PNP hub 页发现真实路径 /about-the-bc-provincial-nominee-program/news
(此前猜测路径全 404)。单页日期段落式:main 下 h2=裸日期,段落跟在后面直到下一 h2;
无逐条 URL → 锚点合成(#日期-标题slug),bodyEn 就地取自本页(母不再抓详情)。
标题:首段内嵌粗体(strong)优先,否则取首句。"""

BC_DATE_ONLY_RE = re.compile(r"(January|February|March|April|May|June|July|August|September|October|"
                             r"November|December)\s+\d{1,2},?\s+20\d\d", re.I)
"""只认「整个 h2 就是日期」的条目头(页面里别的 h2 是章节标题,不是条目)。"""

BC_STOP_TAGS = ("h2",)
"""正文收集的停止标签(遇下一日期头即止)。"""

BC_STRONG_TAGS = ["strong", "b"]
"""首段里的粗体标题标签(优先取它当条目标题)。"""

BC_TITLE_LEN_MAX = 120
"""无粗体时退而取正文首段的截断长度。"""

# =========================================================================
# 10. 子源 NB(通告页,日期藏正文)
# =========================================================================

NB_LIST_URL = "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/notice.html"
"""新不伦瑞克 NBPNP 官方「Important notices」页(gnb.ca)。

E6-09:项目此前无 NB 新闻源(独缺),导致 NB 岗弹框「本省最新公告」空。
结构(与 ontario.ca 不同):H2「Current notices」→ 多个 H3「Notice/Important」(标题是通用词),
**日期在正文里**(如「Effective May 4, 2026」),故标题从正文首句取、日期正文正则提;
无可提取日期的通告跳过(news 需 date)。bodyEn 就地取本页;bodyZh 由母脚本 AI 翻译。"""

NB_MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
"""月份 alternation(日期提取与标题前缀剥离共用一份)。"""

NB_DATE_RE = re.compile(rf"\b({NB_MONTHS})\s+\d{{1,2}},\s+\d{{4}}\b")
"""正文里的发布/生效日(通告标题是通用词,日期只在正文)。"""

NB_EFFECTIVE_RE = re.compile(
    rf"^Effective\s+(?:{NB_MONTHS})\s+\d{{1,2}},\s+\d{{4}}\b[,\s]*(?:and until further notice,?\s*)?",
    re.I)
"""标题前缀噪声:开头的「Effective <Month> <day>, <year>」(及可选的
"and until further notice," 从句)。月份 alternation 必须分组 (?:...) 否则破坏锚定。"""

NB_SENT_SPLIT_RE = re.compile(r"(?<=[.。])\s")
"""首句切分(标题取首句)。"""

NB_CURRENT_HEAD = "current notices"
"""起点 H2 的小写文本(往后收到下一个 H2「Past notices/Get in touch」即止)。"""

NB_HEAD_RE = re.compile(r"^h[23]$")
"""往后遍历时认的标题标签(H3=条目,H2=终止)。"""

NB_STOP_TAGS = ("h3", "h2")
"""正文收集的停止标签。"""

NB_TITLE_LEN_MAX = 72
"""标题截断长度(超了挂 ELLIPSIS)。"""

# =========================================================================
# 11. 子源 NS(Drupal 分类列表)
# =========================================================================

NS_LIST_URL = "https://liveinnovascotia.com/taxonomy/term/3"
"""新斯科舍 NSNP/AIP「Program Updates」(liveinnovascotia.com)。

旧域 novascotiaimmigration.com 已 301 到新站(P0 2026-07-18 发现);新站 Drupal,
Program Updates 分类页 = /taxonomy/term/3。列表结构:div.views-row > h2>a(标题+链接)
+ body 字段开头「July 14, 2026 |」带日期。详情页由母脚本抓(og:image+正文)。"""

NS_CITATION = "https://liveinnovascotia.com/resources"
"""NS 出处着陆页(人能读的资源页)。"""

NS_ROW_SEL = "div.views-row"
"""列表里的一条。"""

NS_LINK_SEL = "h2 a[href]"
"""条目标题+链接。"""

# =========================================================================
# 12. 子源 ON(年度更新页)
# =========================================================================

ON_LIST_URL = "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates"
"""安大略 OINP「Updates」页(ontario.ca,年度页)。

E6-04 抽选抓取已用同页;结构:h2=月 → h3=日期 → h4=条目标题(多数带锚点 id)→ 段落
(内含 h5/h6 小节)。以 h4 为条目粒度(同一天可有多条),日期取前置最近的 h3;
锚点用 h4 自带 id(#april30-0),缺 id 才合成。bodyEn 就地取自本页。
⚠️ 年度页:2027 年 URL 会换(…/2027-ontario-…),届时只改本常量一行。"""

ON_STOP_TAGS = ("h4", "h3", "h2")
"""正文收集的停止标签(遇下一条目 / 下一天 / 下一月即止)。"""

# =========================================================================
# 13. 子源 QC(TYPO3 Solr 按部委筛选)
# =========================================================================

QC_LIST_URL = ("https://www.quebec.ca/en/news/search"
               "?tx_solr%5Bfilter%5D%5B%5D=mo_cabinets%3A28")
"""魁省移民部(MIFI)官方新闻(quebec.ca 政府新闻 hub 按部委筛选)。

2026-07-18 复核(Frank 点名核实 QC):quebec.ca 新闻搜索是 TYPO3 Solr,**GET facet 参数
httpx 直接可用**(`tx_solr[filter][]=mo_cabinets:28` = Immigration, Francisation et
Intégration 部委)。旧站 immigration-quebec/mifi.gouv.qc.ca 新闻页均 404 已弃。
内容高度对口:PSTQ 邀请/国际学生项目/家庭团聚配额/年度移民计划。
条目=li.article(首个 <p> 是日期「June 23, 2026 …」,h3>a 是标题+链接);详情页走母脚本通用抽取。
⚠️ 展示口径:QC 走自己的移民体系(非 PNP)——前端 P1b 的 QC 卡片带该声明(同 match 口径)。"""

QC_ROW_SEL = "li.article"
"""列表里的一条。"""

QC_LINK_SEL = "h3 a[href]"
"""条目标题+链接。"""

QC_BODY_SELECTOR = "[itemprop=articleBody]"
"""详情页正文容器:默认 main 抽取会混入面包屑导航(实测)。"""

# =========================================================================
# 14. 子源 SK(Sitecore POST-only 筛选)
# =========================================================================

SK_LIST_URL = "https://www.saskatchewan.ca/government/news-and-media"
"""萨省移民部委新闻(saskatchewan.ca 全政府新闻 hub 按部委筛选)。

SK 无 SINP 专属新闻页(P0 结论);2026-07-18 浏览器复测破局:新闻 hub 的「Filter news
releases」是 Sitecore **POST-only** 筛选(GET 参数被忽略,RSS 也不认参数)——带上
scController/scAction token 后 httpx 直接可用,按部委「Immigration and Career Training」
筛出移民类官方新闻(移民欺诈保护/Immigration Services Act 赔付等)。
结果区容器 = section.search-results ul.results(页顶轮播是全政府新闻,天然排除);
日期从条目 URL 路径取(/2026/july/16/…)。"""

SK_ROW_SEL = "section.search-results ul.results li a[href]"
"""结果区里的条目链接(页顶轮播是全政府新闻,天然排除)。"""

SK_URL_DATE_RE = re.compile(r"/news-and-media/(20\d\d)/([a-z]+)/(\d{1,2})/", re.I)
"""条目 URL 路径里的年/月名/日。"""

MONTH_NUM = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
             "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
             "december": 12}
"""英文月名 → 月序号(SK 的 URL 路径用月名)。"""

P_SC_CONTROLLER = "scController"
"""Sitecore 控制器参数名(POST 表单 wire 词)。"""

P_SC_ACTION = "scAction"
"""Sitecore 动作参数名。"""

P_TEXT = "Text"
"""筛选表单:关键词(空 = 不限)。"""

P_YEAR = "Year"
"""筛选表单:年(空 = 不限)。"""

P_MONTH = "Month"
"""筛选表单:月(空 = 不限)。"""

P_MINISTRY_ID = "MinistryId"
"""筛选表单:部委 id。"""

SK_SC_CONTROLLER = "GoS.Website.Controllers.GoS.NewsSearchController, GoS.Website"
"""Sitecore 控制器全名(逆向所得的 token)。"""

SK_SC_ACTION = "Search"
"""Sitecore 动作名。"""

SK_MINISTRY_ID = "9F26CB0C18864C70B873E0E8D77FF3B7"
"""Immigration and Career Training 部委。⚠️ Sitecore item GUID,站点重构才会变。"""

# =========================================================================
# 15. LLM 后端与共用词(双后端:局域网 Ollama / Anthropic 兜底)
# =========================================================================

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""环境开关:局域网 Ollama 基址(如 http://192.168.1.150:11434)。

双后端(Frank 2026-07-18:「翻译用本地大模型」,API 账单 $3 阈值触发):设了走局域网
Ollama(实测 qwen3.6 中/韩 16s/9s 每条,编号全守,零 API 费);未设 → Anthropic haiku
(与顾问同模型)。局域网盒不在=该轮翻译跳过,下轮重试。"""

ENV_LLM_MODEL = "NEWS_LLM_MODEL"
"""环境开关:局域网模型名(缺省 LLM_LOCAL_MODEL_DEFAULT)。"""

ENV_API_KEY = "ANTHROPIC_API_KEY"
"""环境开关:Anthropic key。未设 = 跳过翻译只抓原文(运维项:key 进根 .env(批N 起 compose 住仓库根),
Frank 拍板 2026-07-18)。"""

LLM_LOCAL_MODEL_DEFAULT = "qwen3.6:latest"
"""局域网盒的默认模型。"""

LLM_MODEL = "claude-haiku-4-5"
"""Anthropic 兜底模型(cms/src/lib/llm.ts 口径)。"""

ANTHROPIC_BASE = "https://api.anthropic.com"
"""Anthropic API 基址(LLM_BASE 未设时用)。"""

URL_TAIL_SLASH = "/"
"""局域网基址末尾要削掉的斜杠(拼端点路径时避免双斜杠)。"""

HDR_API_KEY = "x-api-key"
"""Anthropic 认证头名。"""

HDR_ANTHROPIC_VERSION = "anthropic-version"
"""Anthropic 版本头名。"""

ANTHROPIC_VERSION = "2023-06-01"
"""Anthropic API 版本。"""

PATH_OLLAMA_GENERATE = "/api/generate"
"""Ollama 单轮生成端点(逐段翻译/打分走它)。"""

PATH_OLLAMA_CHAT = "/api/chat"
"""Ollama 对话端点(标题灰注走它)。"""

PATH_ANTHROPIC_MESSAGES = "/v1/messages"
"""Anthropic Messages 端点。"""

P_MODEL = "model"
"""请求体:模型名。"""

P_PROMPT = "prompt"
"""请求体:Ollama 提示词。"""

P_STREAM = "stream"
"""请求体:是否流式(一律 False,整段取回)。"""

P_THINK = "think"
"""请求体:Ollama 思维链开关(qwen3 系默认开,一律关)。"""

P_OPTIONS = "options"
"""请求体:Ollama 采样参数容器。"""

P_NUM_PREDICT = "num_predict"
"""请求体:Ollama 生成上限。"""

P_TEMPERATURE = "temperature"
"""请求体:Ollama 温度。"""

P_MAX_TOKENS = "max_tokens"
"""请求体:Anthropic 生成上限。"""

P_MESSAGES = "messages"
"""请求体:Anthropic/Ollama 对话消息表。"""

P_ROLE = "role"
"""消息体:角色键。"""

P_CONTENT = "content"
"""消息体:内容键(Anthropic 响应里也是这个键装分块)。"""

P_MESSAGE = "message"
"""Ollama /api/chat 响应:消息容器键。"""

P_RESPONSE = "response"
"""Ollama /api/generate 响应:正文键。"""

P_TEXT_BLOCK = "text"
"""Anthropic 响应分块的文本键。"""

ROLE_USER = "user"
"""消息角色:用户。"""

THINK_RE = re.compile(r"<think>.*?</think>", re.S)
"""剥 qwen3 系溜出来的思维链(think 关了仍偶发,双保险)。"""

MD_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
"""剥 LLM 溜出来的 **粗体** 记号(正文是纯文本渲染,记号=噪音)。"""

MD_BOLD_KEEP = r"\1"
"""粗体剥壳后保留的内容分组。"""

MD_BOLD_MARK = "**"
"""落单的星号对(正则吃不掉的残留,直接删)。"""

MD_HEAD_RE = re.compile(r"^#+\s*", re.M)
"""剥行首 # 标题记号。"""

IMP_RE = re.compile(r"^重要度[::]\s*([1-5])\s*[|丨]\s*(.+)$")
"""首行「重要度: N | 一句中文理由」的解析(解析不出不硬猜,留空只少个徽标)。"""

CJK_RE = re.compile(r"[一-鿿]")
"""中文字符探针(标题灰注的过关校验之一)。"""

# =========================================================================
# 16. 全文翻译与速读(zh/ko 同编号协议)
# =========================================================================

ENV_TRANSLATE_BUDGET = "NEWS_TRANSLATE_BUDGET"
"""环境开关:每轮翻译调用上限(首轮回填分几轮摊平;一次性回填时临时放大)。"""

TRANSLATE_BUDGET_DEFAULT = "12"
"""翻译预算缺省值。"""

TRANSLATE_TIMEOUT_S = 300
"""翻译调用超时秒数(长稿逐段翻,给足)。"""

TRANSLATE_TOKENS = 8000
"""翻译调用的生成上限(num_predict / max_tokens 同值)。"""

BODY_CAP = 10000
"""喂给 LLM 的原文上限(新闻稿一般 <8k 字符)。"""

LANG_ZH = "zh"
"""目标语:中文(重要度只在这一支产出,单一来源)。"""

LANG_KO = "ko"
"""目标语:韩文(Frank 2026-07-18「点了韩语就是翻译成韩语」)。"""

LANGS = (LANG_ZH, LANG_KO)
"""待翻队列的目标语顺序(各自独立补,预算按调用数计)。"""

SENTINEL = "<<<BODY>>>"
"""速读与逐段译文的哨兵分隔行。

输出用哨兵行分隔的纯文本(不用 JSON:长译文里的引号/换行会破坏 JSON 转义,实测 4/12 解析失败)。"""

SEG_RE = re.compile(r"\n?\[(\d+)\]\s*")
"""译文里的段号标记。"""

SEG_TPL = "[{n}] {text}"
"""喂入时给原文逐段编号。

对齐协议 v2(Frank 实测抓到 MB 长稿全线错位):原文逐段编号 [1..N] 喂入,译文逐段带 [k] 回来,
**按编号对位**;缺号/空段=整条判失败留空重试——bodyZh 存在即必与原文段对段对齐
(前端按序配对的前提)。"""

PROMPT = """你是移民政策新闻的专业中译者兼编辑。下面是一篇加拿大官方移民新闻(标题+逐段编号的正文,共 {n} 段)。
只依据原文内容,禁止外推、补充背景或编造;专有名词(项目名/流名/NOC 等)首次出现时保留英文原文并附中文说明;
纯文本输出,禁用 Markdown 记号(不要 **、# 等)。

输出三部分,除此之外不要任何多余说明:
1. 第一行,固定格式「重要度: N | 一句中文理由」。N 为 1-5 整数,衡量对正在找工作/办移民的读者的实际影响:
   5=直接影响资格或分数的政策变化/抽选结果(改制、新清单、抽选分数线);4=项目动态与重要数据;
   3=一般性项目新闻;2=人事/活动/拨款类;1=礼节性声明(节日致辞等)。
2. 之后是 2-3 句中文速读,说人话,讲清「发生了什么、对谁有影响」。
3. 单独一行「<<<BODY>>>」之后:逐段翻译。每段以「[段号] 」开头,段间空行;
   必须从 [1] 到 [{n}] 每段都有,不合并、不遗漏、不新增段号。

标题:{title}

正文:
{body}"""
"""中文翻译+速读+重要度的提示词(P1d Frank 2026-07-18:同一调用顺带产「重要度 1-5」——
对找工/移民读者的实际影响打分,展示=列表「重要」徽标,非资格判定;只依据原文,禁编)。
grounding 红线:只喂抓到的官方正文,禁外推,展示层标「AI 翻译·以原文为准」。"""

PROMPT_KO = """당신은 이민 정책 뉴스 전문 번역가입니다. 아래는 캐나다 공식 이민 뉴스입니다(제목 + 문단 번호가 붙은 본문, 총 {n}개 문단).
원문 내용에만 근거하고 외삽·배경 보충·창작을 금지합니다; 고유명사(프로그램명/스트림명/NOC 등)는 처음 나올 때 영어 원문을 유지하고 한국어 설명을 덧붙입니다;
순수 텍스트로 출력하고 Markdown 기호(**, # 등)를 쓰지 마십시오.

두 부분을 출력하고 그 외 어떤 설명도 붙이지 마십시오:
1. 먼저 2-3문장의 한국어 요약: 무엇이 일어났고 누구에게 영향이 있는지 쉽게 설명.
2. 단독 한 줄 「<<<BODY>>>」 뒤: 문단별 번역. 각 문단은 「[번호] 」로 시작, 문단 사이 빈 줄;
   [1]부터 [{n}]까지 모든 문단 필수, 병합·누락·추가 금지.

제목:{title}

본문:
{body}"""
"""韩语翻译层(Frank 2026-07-18:「点了韩语就是翻译成韩语」):同编号协议,独立调用;
重要度只在中文调用里产(单一来源),韩语调用只出 요약+번역。"""

ERR_SENTINEL = "missing <<<BODY>>> sentinel in LLM output"
"""失败理由:哨兵行缺失(整条判失败,留空下轮重试)。"""

ERR_ALIGN_TPL = "paragraph alignment: missing {missing}{more} of {n}"
"""失败理由:段号缺失(整条重试,不出错位页面)。"""

ALIGN_SHOW_MAX = 5
"""缺号清单最多展示几个(多了挂 ELLIPSIS)。"""

PRINT_TRANSLATE_SKIP = "translate: NEWS_LLM_BASE/ANTHROPIC_API_KEY 均未设,跳过(只抓原文)"
"""两个后端都没配时的跳过行。"""

PRINT_TRANSLATE_NONE = "translate: 无待翻条目"
"""队列空时的收轮行。"""

PRINT_TRANSLATE_DONE_TPL = "translate: {done}/{total} 调用完成"
"""翻译收轮行。"""

PRINT_LEFT_TPL = "(剩 {n} 下轮续)"
"""收轮行尾缀:超预算延后的条数。"""

PRINT_TRANSLATE_OFF_TPL = "translate: 预翻停用(budget=0),{n} 条走线上懒翻"
"""第25轮 #119:budget=0 是拍板过的停摆,原「剩 N 下轮续」逐轮刷屏像有活没干完 —— 如实说停用。"""

WHERE_TRANSLATE_TPL = "translate[{lang}] {url}"
"""错误留痕定位:单条翻译失败(不断轮,留空下轮重试)。"""

# =========================================================================
# 17. 重要度打分(P1e 稳态:翻译走线上实时,重要度必须提前)
# =========================================================================

ENV_SCORE_BUDGET = "NEWS_SCORE_BUDGET"
"""环境开关:每轮打分调用上限。"""

SCORE_BUDGET_DEFAULT = "15"
"""打分预算缺省值。"""

SCORE_TIMEOUT_S = 120
"""打分调用超时秒数。"""

SCORE_TOKENS = 200
"""打分调用的生成上限(一行输出,给一点余量)。"""

SCORE_BODY_LEN = 1500
"""喂给打分的正文开头长度(判重要度不需要全文)。"""

PROMPT_SCORE = """下面是一篇加拿大官方移民新闻(标题+正文开头)。只依据内容输出一行,固定格式「重要度: N | 一句中文理由」,
除此之外不要任何文字。N 为 1-5 整数,衡量对正在找工作/办移民的读者的实际影响:
5=直接影响资格或分数的政策变化/抽选结果(改制、新清单、抽选分数线);4=项目动态与重要数据;
3=一般性项目新闻;2=人事/活动/拨款类;1=礼节性声明(节日致辞等)。

标题:{title}

正文:
{body}"""
"""只打分不翻译的提示词(banner TOP5/徽标/只看重要全靠它)。"""

PRINT_SCORE_TPL = "score: {done}/{total} 条打分"
"""打分收轮行。"""

WHERE_SCORE_TPL = "score {url}"
"""错误留痕定位:单条打分失败。"""

# =========================================================================
# 18. 标题中文灰注(E13-06,与正文 bodyZh 独立)
# =========================================================================

ENV_TITLE_BUDGET = "NEWS_TITLE_TRANSLATE_BUDGET"
"""环境开关:每轮标题翻译上限(独立预算,默认开)。"""

TITLE_BUDGET_DEFAULT = "60"
"""标题翻译预算缺省值。"""

TITLE_TIMEOUT_S = 30.0
"""单条超时(秒);连不上/超时=留空,下轮重试,绝不拿英文顶包。"""

TITLE_TOKENS = 120
"""标题翻译的生成上限(单行译文)。"""

TITLE_TEMPERATURE = 0.1
"""标题翻译的温度(直译,不要发挥)。"""

TITLE_LEN_SLACK = 40
"""译文比原标题最多长多少字符(拦掉「展开成大段解读」的失败样)。"""

TITLE_STRIP_CHARS = " 　\"'“”‘’"
"""译文首尾要剥的引号与全半角空白。"""

PROMPT_TITLE = ("/no_think\n把下面这条加拿大官方移民新闻标题直译为简体中文,只输出译文本身一行,"
                "不加解释、不加引号、不加星号:\n专有名词(项目名如 OINP/AAIP、部门名如 IRCC/IRPA)"
                "保留英文缩写,不展开不音译。\n\n标题:{title}")
"""标题灰注提示词。

只用本地 Ollama(NEWS_LLM_BASE 未设=跳过,不落 Anthropic 兜底——标题量大单价低,不值得烧 API 预算)。
单条一行译文,不走 bodyZh 那套逐段编号协议(标题没有段落)。
实测踩坑:qwen3.6 直接问会展开成大段「解读/纠错」正文而不吐译文(疑似 think:false 在 /api/chat
对这模型不生效);Qwen3 系支持提示词内 /no_think 指令强制关闭——加上后才稳定吐单行,照此写死。"""

PRINT_TITLE_SKIP = "translate_titles: NEWS_LLM_BASE 未设,跳过(标题翻译本地 Ollama-only,不落 Anthropic 兜底)"
"""未配局域网盒时的跳过行。"""

PRINT_TITLE_NONE = "translate_titles: 无待翻标题"
"""队列空时的收轮行。"""

PRINT_TITLE_BAD_TPL = "  ✗ translate_titles {url}: 不过校验 {out!r}"
"""不过校验的单条留痕(宁可留空也不瞎猜,下轮再翻)。"""

PRINT_TITLE_DONE_TPL = "translate_titles: {done}/{total} 条"
"""标题翻译收轮行。"""

PRINT_TITLE_BAD_LEN = 60
"""不过校验时回显译文的截断长度。"""

WHERE_TITLE_TPL = "translate_titles {url}"
"""错误留痕定位:单条标题翻译失败。"""
