"""news.constants — news 母框架的词表(行键 K_ 族 / SOURCE 契约键 / 节奏参数 / 文案模板)。

2026-08-30 立(Frank 定界:fetch 只做通用抓取,news 的行词汇与节奏归 news 域);
K_TITLE/K_DATE/K_URL 与 fetch 的 feed 三键同名同值 = 各域自抄的 wire 词
(constants 叶不许 import,cms「Lang 三字面量各域自抄」同例)。
"""

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

K_CITATION = "citation"
"""行键:出处着陆页(E4-04 惯例:人能读的页;缺省 = list_url)。"""

K_FETCHED_AT = "fetchedAt"
"""行键:本条抓取时刻(UTC)。"""

K_FETCHED = "fetched"
"""落盘信封键:本轮抓取时刻。"""

K_ITEMS = "items"
"""落盘信封键:条目清单。"""

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

FEED_KINDS = ("atom", "rss")
"""feed 类子源的 kind 值(连 parse 都不用写,母直接 parse_feed)。"""

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
