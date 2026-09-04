"""
hwcr 域常量 —— 域词汇表(五件全溶,照样张 etl/dli/;2026-09-04 立域)。

常量只装 JSON 装得下的(标量/字符串表/正则)+ IN/OUT 路径;唯一特批 import = `paths`。
注释方言:每个常量用赋值后的裸字符串 docstring。
接口串(APP_ID/IDENTITY)取自 m.hwcr.vip 前端 bundle `assets/index-DHn8Rp_R.js`(2026-09-04 读到:
`Object.assign({app_id:"44baf2b3d6",identity:"b4e4…",page:1,limit:15},e)`),是站方给所有访客的
客户端串,不是任何用户的凭证。
"""
import re

import paths
from paths.constants import PROCESSED_HWCR, RAW_HWCR


# =========================================================================
# 1. 抓取(海外超人渥太华站房屋帖 → crawl → raw)
# =========================================================================


IN_URL = "http://yk.hwcr.vip/api/v1/convenience.getConvenienceList"
"""输入:便民信息列表接口(GET,零鉴权;前端 bundle 里的 baseURL rr=http://yk.hwcr.vip)。"""

LANDING = "http://m.hwcr.vip/?city=ottawa"
"""出处用「人能读的着陆页」(E4-04 惯例),Frank 2026-09-04 给的就是这一页。"""

OUT_RAW = RAW_HWCR / "ottawa-housing.json"
"""输出:渥太华站房屋帖累积表(按帖 id 增量去重;同 id 以 update_time 新者为准)。"""

CRAWL_SLUG = "hwcr"
"""列表接口响应原文在 crawl 层的站点 slug(data/crawl/hwcr/)。"""

APP_ID = "44baf2b3d6"
"""接口固定参数 app_id(站方客户端串,bundle 里写死)。"""

IDENTITY = "b4e474f4ae104bf44aad2831c71d35e2"
"""接口固定参数 identity(同上,所有访客同一串)。"""

CITY = "渥太华"
"""接口 city 参数(站方用中文城市名做键;URL 上的 ottawa 只是前端 slug)。"""

CATEGORY = "房屋"
"""接口 category 参数(三个大类之一:工作/房屋/闲置;模板细分见 TPL_*)。"""

PAGE_LIMIT = 200
"""每页条数(实测 limit=200 照给 200 条,不封顶;少翻页少打扰)。"""

MAX_PAGES = 6
"""翻页硬上限(实测全站渥太华房屋 1128 条 ≈ 6 页;正常一轮到 RECENT_DAYS 窗口就停,到不了这)。"""

RECENT_DAYS = 45
"""只保留这么多天内的帖(租房帖过六周基本已租出;翻页翻到整页都更老即停)。"""

P_APP_ID = "app_id"
"""查询参数名:客户端串。"""

P_IDENTITY = "identity"
"""查询参数名:客户端串二。"""

P_CITY = "city"
"""查询参数名:城市。"""

P_CATEGORY = "category"
"""查询参数名:大类。"""

P_PAGE = "page"
"""查询参数名:页码(1 起)。"""

P_LIMIT = "limit"
"""查询参数名:每页条数。"""

FETCH_TIMEOUT_S = 30
"""列表接口超时(一页 200 条约 450KB)。"""

QUERY_SEP = "?"
"""URL 与查询串的分隔(参数拼进 URL 做 crawl 层缓存键)。"""

ENC_UTF8 = "utf-8"
"""读 raw 累积表的编码(与 paths.constants.ENC_UTF8 同值;常量件不互引,字面量自抄)。"""

TPL_RENT_ID = 17
"""模板 id:出租(convenience.getCategoryTemplates 实测:16 求租 / 17 出租 / 20 买房 / 21 卖房 /
22 买店铺 / 23 卖店铺 / 26 车位出租 / 27 求租车位 / 29 求租店铺 / 30 店铺转租)。"""

TPL_NAME = {
    16: "求租", 17: "出租", 20: "买房", 21: "卖房", 22: "买店铺", 23: "卖店铺",
    26: "车位出租", 27: "求租车位", 29: "求租店铺", 30: "店铺转租",
}
"""模板 id → 站方模板名(raw 行落 kind 时查;查不到留空串,不猜)。"""

F_LAYOUT = "房屋户型"
"""帖子结构化格名:户型(出租模板五格之一)。"""

F_ADDRESS = "坐标地址"
"""帖子结构化格名:地址(地点解析的第一输入)。"""

F_DESC = "房屋描述"
"""帖子结构化格名:描述。"""

F_RENT = "出租租金"
"""帖子结构化格名:租金(自由文本,「$910/月 + utilities」「面议」「750」都有)。"""

F_CONTACT = "联系方式"
"""帖子结构化格名:联系方式(实测一律「联系超人」)。"""

TIME_FMT = "%Y-%m-%d %H:%M:%S"
"""接口 create_time/update_time 的格式(站方本地时间,无时区)。"""

RAW_INDENT = 1
"""raw 累积表落盘缩进。"""


# =========================================================================
# 2. 地点解析与地理编码(Nominatim;响应原文先落 crawl 层)
# =========================================================================


GEO_URL = "https://nominatim.openstreetmap.org/search"
"""Nominatim 搜索接口(OSM 免费地理编码;用法政策:自报家门 UA + 最多 1 req/s + 结果可缓存)。"""

GEO_SLUG = "nominatim"
"""Nominatim 响应原文在 crawl 层的 slug(data/crawl/nominatim/;查过的地址不再打第二次)。"""

GEO_SLEEP_S = 1.1
"""两次 Nominatim 请求的最小间隔(政策上限 1 req/s,留 0.1s 余量)。"""

GEO_TIMEOUT_S = 30
"""Nominatim 超时。"""

P_GEO_Q = "q"
"""Nominatim 参数名:自由文本查询。"""

P_GEO_FORMAT = "format"
"""Nominatim 参数名:输出格式。"""

P_GEO_LIMIT = "limit"
"""Nominatim 参数名:结果条数。"""

P_GEO_COUNTRY = "countrycodes"
"""Nominatim 参数名:国家过滤。"""

GEO_FORMAT = "json"
"""Nominatim 输出格式值。"""

GEO_LIMIT = 1
"""Nominatim 只取最匹配的一条。"""

GEO_COUNTRY = "ca"
"""Nominatim 国家过滤值(渥太华帖里的地址不会在别国)。"""

LISGAR_QUERY = "29 Lisgar Street, Ottawa, Ontario, K2P 0B9"
"""锚点:Lisgar Collegiate Institute 的地址(Frank 2026-09-04 给);坐标运行时经 Nominatim 查
(实测命中「Lisgar Collegiate Institute, 29, Lisgar Street, Golden Triangle, Centretown」),
不把经纬度写死进代码 —— 数字从源来,不从印象来。"""

CITY_SUFFIX = ", Ottawa, Ontario"
"""地址查询后缀(帖里只写街道,Nominatim 要城市才不漂到别省)。"""

STREET_STOP = (r"(?!(?:unit|apt|suite|floor|room|rooms|bed|beds|bedroom|bedrooms|bath|baths|min|mins|minutes"
               r"|km|hr|hrs|hour|hours|month|months|year|years|people|ppl|person|persons)\b)")
"""街名词的排除前瞻:计量与户型词不算街名(实撞「1.4km」→「4 km」当门牌地址;「2 bedrooms」同理)。"""

STREET_RE = re.compile(
    r"(\d{1,5}(?:[A-Za-z](?=\s))?\s*" + STREET_STOP + r"[A-Za-z][A-Za-z.'-]+"
    r"(?:\s+" + STREET_STOP + r"[A-Za-z][A-Za-z.'-]+){0,3})",
    re.IGNORECASE)
"""精确地址:门牌号(可带单字母单元号)+ 1~4 个英文街名词(每词 ≥2 字母:挡「376 serenade cres K」
的邮编首字母);数字与街名之间空格可省(「195besserer st」「190lees」实撞,补空格见 NUM_GLUE_*)。"""

NUM_GLUE_RE = re.compile(r"^(\d+)(?=[A-Za-z])")
"""门牌号与街名黏连(「195besserer」「400Albert」)时在数字后补空格用。"""

NUM_GLUE_SUB = r"\g<1> "
"""NUM_GLUE_RE 的替换串(数字 + 空格;写 \g<1> 不写 \1 —— 后者经一次非 raw 串就变成控制字符,实撞)。"""

POSTAL_RE = re.compile(r"\b([Kk]\d[A-Za-z])\s?(\d[A-Za-z]\d)\b")
"""邮编:渥太华 K 开头的六位邮编(「K2C 2M2」「k2c 1g7」「K1X0B9」)。"""

IN_FSA = paths.FSA / "CA.txt"
"""输入:GeoNames 加拿大 FSA 表(fsa 域的源文件;第 2 列 FSA、第 10/11 列质心经纬度)。
邮编级定位走这张本地表:Nominatim 没有加拿大邮编 —— 自由文本「K2P 2J3, Ottawa」九次全落 CHEO 医院、
结构化 postalcode= 全空(2026-09-04 实测),问它等于问一个不知道的人。"""

FSA_SEP = "\t"
"""GeoNames 表的列分隔。"""

FSA_COL_CODE = 1
"""GeoNames 表:FSA 码列。"""

FSA_COL_NAME = 2
"""GeoNames 表:地名列(报告里当命中地名)。"""

FSA_COL_LAT = 9
"""GeoNames 表:纬度列。"""

FSA_COL_LON = 10
"""GeoNames 表:经度列。"""

FSA_MIN_COLS = 11
"""GeoNames 表一行至少的列数(短行跳过)。"""

LANDMARKS = [
    (r"uottawa|u of o|渥大|渥太华大学|(?<![a-z])OU(?![a-z])|ottawa u", "University of Ottawa, Ottawa, Ontario"),
    (r"rideau centre|rideau center|丽都", "Rideau Centre, Ottawa, Ontario"),
    (r"sandy ?hill|桑迪希尔", "Sandy Hill, Ottawa, Ontario"),
    (r"byward|拜沃德", "ByWard Market, Ottawa, Ontario"),
    (r"golden triangle|金三角", "Golden Triangle, Ottawa, Ontario"),
    (r"centretown|downtown|市中心|中心区", "Centretown, Ottawa, Ontario"),
    (r"\bglebe\b", "The Glebe, Ottawa, Ontario"),
    (r"\blees\b", "Lees Station, Ottawa, Ontario"),
    (r"hurdman", "Hurdman Station, Ottawa, Ontario"),
    (r"chinatown|唐人街|little italy|somerset", "Chinatown, Ottawa, Ontario"),
    (r"old ottawa (east|south)", "Old Ottawa East, Ottawa, Ontario"),
    (r"carleton|卡尔顿|卡尔登|(?<![a-z])CU(?![a-z])", "Carleton University, Ottawa, Ontario"),
    (r"algonquin|亚岗昆|阿冈昆|阿岗昆|亚冈昆|(?<![a-z])AC(?![a-z])", "Algonquin College, Ottawa, Ontario"),
    (r"westboro", "Westboro, Ottawa, Ontario"),
    (r"bayshore", "Bayshore Shopping Centre, Ottawa, Ontario"),
    (r"centrepointe", "Centrepointe, Ottawa, Ontario"),
    (r"baseline", "Baseline Road, Nepean, Ottawa, Ontario"),
    (r"merivale", "Merivale Road, Ottawa, Ontario"),
    (r"hunt ?club|大统华", "Hunt Club, Ottawa, Ontario"),
    (r"south ?keys?|greenboro", "South Keys, Ottawa, Ontario"),
    (r"haig|russell rd|russel rd|general hospital|elmvale", "Elmvale Acres, Ottawa, Ontario"),
    (r"pimisi|lebreton", "Pimisi Station, Ottawa, Ontario"),
    (r"carlingwood", "Carlingwood Shopping Centre, Ottawa, Ontario"),
    (r"walkl?ey", "Walkley Road, Ottawa, Ontario"),
    (r"bridlewood|emerald meadows", "Bridlewood, Kanata, Ottawa, Ontario"),
    (r"manotick", "Manotick, Ottawa, Ontario"),
    (r"奥莱|tanger|outlet", "Tanger Outlets Ottawa, Kanata, Ontario"),
    (r"barrhaven|巴屯|巴囤|巴尔黑文", "Barrhaven, Ottawa, Ontario"),
    (r"kanata|卡纳塔", "Kanata, Ottawa, Ontario"),
    (r"orl[eé]ans|奥尔良", "Orleans, Ottawa, Ontario"),
    (r"nepean|尼皮恩", "Nepean, Ottawa, Ontario"),
    (r"gloucester|格洛斯特", "Gloucester, Ottawa, Ontario"),
    (r"aylmer", "Aylmer, Gatineau, Quebec"),
    (r"gatineau|加蒂诺|hull", "Gatineau, Quebec"),
]
"""地标词表:(帖文正则,忽略大小写)→ Nominatim 查询串;**取在文本里出现位置最靠前的那个**
(实撞:「AC旁的house…20分钟到渥太华大学」按表序会命中渥大,按位置命中 AC 才对);
同位置并列时表序靠前者赢。帖里没门牌号也没邮编时才走这一级,精度标 landmark。
OU/CU/AC 三个缩写用 (?<![a-z]) 而非 :中文字在 re 里算 \w,「近AC旁」用  判不出边界(实撞)。"""

FAR_CITIES = [
    (r"toronto|多伦多", "Toronto, Ontario"),
    (r"montreal|蒙特利尔|蒙城", "Montreal, Quebec"),
    (r"kingston|金斯顿", "Kingston, Ontario"),
    (r"vancouver|温哥华", "Vancouver, British Columbia"),
]
"""外城词表:渥太华站里混发的外城帖(实撞「Downtown University of Toronto, 955 Bay st」按 downtown
命中 Centretown 排进 3 km);命中外城词一律先按外城定位,距离自然落到几百公里外的第二节。"""

STREET_WORD_MIN_LEN = 3
"""门牌命中校验:查询串里 ≥3 字母的街名词至少一个要出现在 Nominatim 命中地名里
(实撞:模糊匹配把查不到的串给到别的机构或城市质心,距离全是假的)。"""

PREC_ADDRESS = "address"
"""位置精度:精确门牌地址。"""

PREC_POSTAL = "postal"
"""位置精度:邮编前三位 FSA 的质心(GeoNames;约一个社区,与地标级同量级)。"""

PREC_LANDMARK = "landmark"
"""位置精度:地标词(约一个社区,误差可达 1-2 km)。"""

PREC_UNKNOWN = "unknown"
"""位置精度:解析不出(报告单列,让朋友自己问)。"""

EARTH_RADIUS_KM = 6371.0
"""haversine 用的地球半径。"""

WALK_MIN_PER_KM = 12
"""步行分钟/公里(5 km/h;报告里的「步行约 N 分」)。"""


# =========================================================================
# 3. 筛选与产出(出租单间 → 按距离排 → json + md)
# =========================================================================


OUT_ROOMS = PROCESSED_HWCR / "lisgar-rooms.json"
"""输出:出租单间清单(含距离与精度,按距离升序,位置不明的排尾)。"""

OUT_REPORT = PROCESSED_HWCR / "lisgar-rooms.md"
"""输出:给人读的清单(NEAR_KM 内一节 + 位置不明一节)。"""

ROOM_RE = re.compile(r"单间|独立卧室|独立房间|一间|1间|主卧|次卧|卧室|房间|合租|一室|1b\b|\broom\b|bedroom|studio",
                     re.IGNORECASE)
"""「单间类」出租帖判词(整租 house 也常写「卧室」,宁可多收让人翻,不漏)。"""

RENT_STRONG_RE = re.compile(r"\$\s?(\d{3,4})|(\d{3,4})\s*(?:/\s*月|/\s*mo|刀|每月|一个月|加币|加元|cad|per month|月)",
                            re.IGNORECASE)
"""租金抽数第一档:带钱号或带月/刀单位的 3-4 位数(「$910/月」「870/月」「815刀」)。"""

RENT_WEAK_RE = re.compile(r"(\d{3,4})(?!\s*年)")
"""租金抽数第二档:裸 3-4 位数,后面不跟「年」(实撞「2026年8月底起租」被当成月租 2026)。"""

YEAR_MIN = 2020
"""像年份的数下界(2020-2030 之间的裸数不当租金)。"""

YEAR_MAX = 2030
"""像年份的数上界。"""

RENT_MIN = 300
"""租金合理下限(小于它的数字多半是面积/楼层,不当租金)。"""

RENT_MAX = 5000
"""租金合理上限(大于它的多半是押金/年租,不当租金)。"""

NEAR_KM = 3.0
"""报告第一节的半径(Lisgar 在 Centretown,3 km 盖住 Sandy Hill / Glebe / ByWard / uOttawa)。"""

LINK_TPL = "http://m.hwcr.vip/?city=ottawa&cat=房屋&id={id}"
"""帖子分享链接(前端 xl() 拼法:city slug + cat + id;点开直接弹该帖)。"""

ROOMS_INDENT = 1
"""清单落盘缩进。"""

NEWLINE = "\n"
"""报告行分隔。"""

SPACE = " "
"""地址串多空白折一格。"""

WS_RE = re.compile(r"\s+")
"""多空白折一格用。"""

DATE_LEN = 10
"""create_time 取前 10 位 = YYYY-MM-DD。"""

REPORT_TITLE_TPL = "# Lisgar 附近出租单间(海外超人渥太华站)"
"""报告标题。"""

REPORT_META_TPL = "生成 {today};锚点 {anchor};近 {days} 天出租帖 {total} 条,其中单间类 {rooms} 条。"
"""报告头一行。"""

REPORT_NEAR_TPL = "## {km:.0f} km 内({n} 条,按距离升序)"
"""第一节标题。"""

REPORT_FAR_TPL = "## {km:.0f} km 外({n} 条)"
"""第二节标题。"""

REPORT_UNKNOWN_TPL = "## 位置不明({n} 条,帖里没写可解析的地址,得问)"
"""第三节标题。"""

ROW_HEAD_TPL = "### {n}. {dist} 发布 {date}"
"""行标题:序号 + 距离串 + 发布日。"""

DIST_TPL = "{km:.1f} km(步行约 {walk} 分,{prec})"
"""距离串(有坐标时)。"""

DIST_UNKNOWN = "距离不明"
"""距离串(没坐标时)。"""

PREC_LABEL = {
    "address": "精确地址",
    "postal": "按邮编前三位估",
    "landmark": "按地标估",
    "unknown": "不明",
}
"""精度 → 报告用词。"""

ROW_RENT_TPL = "- 租金:{rent}"
"""行:租金原文。"""

ROW_LAYOUT_TPL = "- 户型:{layout}"
"""行:户型。"""

ROW_ADDRESS_TPL = "- 地址:{address}"
"""行:地址原文。"""

ROW_PLACE_TPL = "- 解析为:{place}"
"""行:Nominatim 命中的地名(让人核对解析对不对)。"""

ROW_DESC_TPL = "- 说明:{desc}"
"""行:描述。"""

ROW_LINK_TPL = "- 链接:{link}"
"""行:帖子链接(联系方式在站内「联系超人」)。"""

EMPTY_FIELD = "(未填)"
"""帖里该格空着时的占位。"""

IN_TPL = "IN : {url}"
"""输入路径报行(运行时打印,宪法既有)。"""

OUT_TPL = "OUT: {path}"
"""输出路径报行。"""

PAGE_TPL = "page {page}: {n} rows (oldest {oldest})"
"""翻页报行。"""

RAW_WROTE_TPL = "wrote {n} posts (new {new}, updated {upd}) fetched={fetched}"
"""抓取收口报行。"""

GEO_TPL = "geocode {q!r} -> {hit}"
"""地理编码报行(命中地名或 miss)。"""

GEO_MISS = "miss"
"""地理编码没命中的报词。"""

GEO_CACHED_TPL = "geocode: {hit} cached, {fetched} fetched, {miss} miss"
"""地理编码收口报行。"""

ROOMS_WROTE_TPL = "wrote {n} rooms (near {near}, unknown {unknown})"
"""清单收口报行。"""

NO_RAW_TPL = "raw missing: {path} (run scrape first)"
"""build 前没 raw 的失败行。"""

ANCHOR_MISS_TPL = "anchor not geocoded: {q}"
"""锚点查不到坐标的失败行(整轮失败,别拿没锚的距离骗人)。"""
