"""
qs 域常量 —— 域词汇表(五件套,照样张 etl/dli/constants.py;2026-09-12 开域)。

判据照 dli 样张:常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径;
唯一特批 import = `paths`。注释方言:每个常量用赋值后的裸字符串 docstring。
"""
import paths

LANDING = "https://www.topuniversities.com/world-university-rankings"
"""QS 世界大学排名着陆页:出处用「人能读的页」(E4-04 惯例),同时是 nid 探测源 ——
排名数据端点的 nid(榜单节点号)每年换,每轮从这页 HTML 现探,不写死。"""

NID_RE = r'"nid":"(\d+)"'
"""着陆页 HTML 里当年榜单节点号的形(DataLayer 内首个 nid 即当前版榜单;实测 2026 版)。
2026-09-26 晚复核:形没变 —— 首个命中住 drupalSettings 的 qs_rankings_rest_api 键(页面已是 2027 版,
nid=4153156);当天「探不到 nid」是把 Cloudflare 质询页当正文解析了(见 CURL_CMD),不是改版。"""

ENDPOINT_TPL = ("https://www.topuniversities.com/rankings/endpoint"
                "?nid={nid}&page=0&items_per_page={n}&countries=ca")
"""排名数据端点(官方 DataTables 同源 JSON;countries=ca 只取加拿大,一页收完)。"""

ITEMS_PER_PAGE = 100
"""单页条数(加拿大上榜 ~30 所,100 一页兜住;total_record 超页数防线另兜)。"""

OUT_FILE = paths.QS / "qs.json"
"""输出:加拿大上榜行(rank + 已映射 DLI 校名,mart build_dli 按名 join)。"""

DLI_NAME = {
    "University of British Columbia": "University of British Columbia (UBC)",
    "Queen's University at Kingston": "Queen’s University",
    "University of Ottawa": "Université d’Ottawa/University of Ottawa",
    "Simon Fraser University": "Simon Fraser University (SFU)",
    "University of Victoria (UVic)": "University of Victoria",
    "University of Saskatchewan": "University of Saskatchewan, including St. Thomas More College",
    "Toronto Metropolitan University (formerly Ryerson University)": "Toronto Metropolitan University (TMU)",
    "University of Regina": "University of Regina, including Campion College, First Nations University of Canada and Luther College",
}
"""QS 校名 → IRCC DLI 名单校名(人工核定,2026-09-12 逐校比对:30 所里 22 所两边逐字相同
不进表,8 所写法有别的在此;表外默认原名直传 —— 两边同改名才会失配,失配 = qs_rank
空着不瞎猜,前端显杠)。"""

FETCH_TIMEOUT_S = 60
"""两次抓取(着陆页 ~280KB / 端点 ~20KB)各自的超时。"""

BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
"""topuniversities 前置 Cloudflare 掐非浏览器指纹(2026-09-12 实撞:POLITE_UA 与浏览器 UA
经 httpx 一律 403,curl + 本串放行 —— 指纹在 TLS 层不在 UA 层,但 UA 也得像);
本域特批自备 UA,不动全站礼貌 UA。
2026-09-26 晚 QS 抓取连败(Cloudflare 升档,不是着陆页改版):原来 curl 只带本串(Chrome/128.0)就放行,
现在只带 UA 的请求着陆页与端点一律 403「Just a moment...」托管质询(cf-mitigated: challenge);
版本号改 140 与 CURL_HDRS_BROWSER 的 sec-ch-ua 同号,配下面三组浏览器头实测两跳 200。"""

CURL_CMD = ("curl", "-sL", "--fail", "--compressed")
"""topuniversities 用 httpx 直连实测 403(Cloudflare TLS 指纹;同机 curl 放行)——
本域对该域名统一走 curl 子进程,照 etl/wages statcan 同款先例;其余抓取仍 httpx 优先。
2026-09-26 晚补两旗:原来是 ("curl", "-sL"),现在加 --fail 与 --compressed。--fail:原先 403 质询页照样当正文
交给下游,着陆页那跳误报「no nid — source markup changed?」、端点那跳误报 QsSource ValidationError;
现在 HTTP ≥ 400 由 curl 退 22 当场失败(CURL_FAIL_TPL)。--compressed:浏览器必带 Accept-Encoding,实测放行的那组请求带着它。
同晚实测:同三组浏览器头换 httpx 两跳也 200(两种 TLS 栈都放行,当下起作用的是头);传输仍留 curl 不换(最小改动)。
哪一个头是决定性的没逐个拆(请求量克制),整组照浏览器抄,别删单个头试运气。"""

CURL_FLAG_MAX_TIME = "--max-time"
"""curl 超时旗标。"""

CURL_FLAG_UA = "-A"
"""curl 自报家门旗标。"""

CURL_FLAG_HEADER = "-H"
"""curl 头旗标(2026-09-26 晚补:浏览器头逐行一个 -H)。"""

CURL_HDRS_BROWSER = (
    "Accept-Language: en-US,en;q=0.9",
    'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    "sec-ch-ua-mobile: ?0",
    'sec-ch-ua-platform: "Windows"',
)
"""两跳共用的浏览器头:语言 + UA 客户端提示(sec-ch-ua 版本号须与 BROWSER_UA 同号)。
2026-09-26 晚补:质询页回 Critical-CH 点名要 Sec-CH-UA 族(自称 Chrome 的真浏览器都会带)。"""

CURL_HDRS_LANDING = (
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Sec-Fetch-Dest: document",
    "Sec-Fetch-Mode: navigate",
    "Sec-Fetch-Site: none",
    "Sec-Fetch-User: ?1",
    "Upgrade-Insecure-Requests: 1",
)
"""着陆页那一跳的导航头(照浏览器地址栏直开一页;2026-09-26 晚补,配 CURL_HDRS_BROWSER 实测 200)。"""

CURL_HDRS_ENDPOINT = (
    "Accept: application/json, text/javascript, */*; q=0.01",
    "Sec-Fetch-Dest: empty",
    "Sec-Fetch-Mode: cors",
    "Sec-Fetch-Site: same-origin",
    "X-Requested-With: XMLHttpRequest",
    f"Referer: {LANDING}",
)
"""端点那一跳的 XHR 头(照着陆页榜单脚本同源取数;2026-09-26 晚补:端点比着陆页严 ——
带导航头照样 403 质询,换成本组 XHR 头 + Referer 着陆页才 200)。"""

CURL_ENCODING = "utf-8"
"""curl 输出的解码(2026-09-26 晚自 curl_get 体内字面量收进来,零字符串令)。"""

CURL_FAIL_TPL = "curl exited {code} for {url}"
"""curl 非零退出的失败行(整轮失败,不静默)。
2026-09-26 晚补:退出码 22 = HTTP ≥ 400(--fail 所致;Cloudflare 质询就是 403 → 22)。"""

MIN_ROWS = 20
"""防线:加拿大上榜实测 30 所,低于 20 视为源结构变了,宁可整轮失败不写半截表。"""

IN_TPL = "IN : {url}"
"""输入路径报行(运行时打印,宪法既有)。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

NID_TPL = "nid: {nid}"
"""当年榜单节点号报行(年更换版时好对账)。"""

NO_NID_TPL = "landing page has no nid — source markup changed?"
"""nid 探不到的失败行(整轮失败,别拿旧端点瞎猜)。
2026-09-26 晚:这句曾误报一回(其实是 403 质询页被当正文);CURL_CMD 加 --fail 后质询走 CURL_FAIL_TPL,这句只剩真改版会报。"""

TOO_FEW_TPL = "suspiciously few ranked universities ({n}) — source schema changed?"
"""行数防线失败行。"""

BAD_RANK_TPL = "skipped unparsable rank for: {names}"
"""rank 不是整数的行(跳过留痕,宁可缺行不编数)。"""

WROTE_TPL = "wrote {n} ranked universities fetched={fetched}"
"""收口报行。"""

OUT_INDENT = 1
"""落盘缩进(~30 行小表)。"""
