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
"""着陆页 HTML 里当年榜单节点号的形(DataLayer 内首个 nid 即当前版榜单;实测 2026 版)。"""

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
              "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
"""topuniversities 前置 Cloudflare 掐非浏览器指纹(2026-09-12 实撞:POLITE_UA 与浏览器 UA
经 httpx 一律 403,curl + 本串放行 —— 指纹在 TLS 层不在 UA 层,但 UA 也得像);
本域特批自备 UA,不动全站礼貌 UA。"""

CURL_CMD = ("curl", "-sL")
"""topuniversities 用 httpx 直连实测 403(Cloudflare TLS 指纹;同机 curl 放行)——
本域对该域名统一走 curl 子进程,照 etl/wages statcan 同款先例;其余抓取仍 httpx 优先。"""

CURL_FLAG_MAX_TIME = "--max-time"
"""curl 超时旗标。"""

CURL_FLAG_UA = "-A"
"""curl 自报家门旗标。"""

CURL_FAIL_TPL = "curl exited {code} for {url}"
"""curl 非零退出的失败行(整轮失败,不静默)。"""

MIN_ROWS = 20
"""防线:加拿大上榜实测 30 所,低于 20 视为源结构变了,宁可整轮失败不写半截表。"""

IN_TPL = "IN : {url}"
"""输入路径报行(运行时打印,宪法既有)。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

NID_TPL = "nid: {nid}"
"""当年榜单节点号报行(年更换版时好对账)。"""

NO_NID_TPL = "landing page has no nid — source markup changed?"
"""nid 探不到的失败行(整轮失败,别拿旧端点瞎猜)。"""

TOO_FEW_TPL = "suspiciously few ranked universities ({n}) — source schema changed?"
"""行数防线失败行。"""

BAD_RANK_TPL = "skipped unparsable rank for: {names}"
"""rank 不是整数的行(跳过留痕,宁可缺行不编数)。"""

WROTE_TPL = "wrote {n} ranked universities fetched={fetched}"
"""收口报行。"""

OUT_INDENT = 1
"""落盘缩进(~30 行小表)。"""
