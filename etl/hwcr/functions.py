"""
hwcr 域函数 —— 全部行为住这(五件全溶,照样张 etl/dli/functions.py;2026-09-04 立域)。

方言律:零字符串(文案走 constants 的 *_TPL,接口键住 scheme 的别名)、显式循环(推导/genexp/lambda
出局)、一参令(多入参收 scheme 的 XxxIn)、日志只走 log.functions.say/err。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths/log/fetch/crawl)。

两步:① scrape —— 列表接口翻页到 RECENT_DAYS 窗口为止,响应原文落 crawl 层,帖行按 id 增量
并进 raw;② build —— raw 里出租 + 单间判词的帖,地点三级梯(门牌 → 邮编 → 地标)送 Nominatim
(响应原文同样先落 crawl 层,查过的不再打),haversine 算到 Lisgar,落 json + md 清单。
"""
import math
import re
import time
from datetime import date, datetime, timedelta
from urllib.parse import urlencode

from pydantic import TypeAdapter

import paths
from crawl.functions import get_cached_page, put_cached_page
from crawl.scheme import CachePutIn
from fetch.functions import make_polite_client
from log.functions import say
from hwcr.constants import (
    ANCHOR_MISS_TPL, APP_ID, CATEGORY, CITY, CITY_SUFFIX, CRAWL_SLUG, DATE_LEN, DIST_TPL, ENC_UTF8,
    DIST_UNKNOWN, EARTH_RADIUS_KM, EMPTY_FIELD, F_ADDRESS, F_CONTACT, F_DESC, F_LAYOUT, F_RENT,
    FETCH_TIMEOUT_S, GEO_CACHED_TPL, GEO_COUNTRY, GEO_FORMAT, GEO_LIMIT, GEO_MISS, GEO_SLEEP_S,
    GEO_SLUG, GEO_TIMEOUT_S, GEO_TPL, GEO_URL, IDENTITY, IN_TPL, IN_URL, LANDING, LANDMARKS,
    FSA_COL_CODE, FSA_COL_LAT, FSA_COL_LON, FSA_COL_NAME, FSA_MIN_COLS, FSA_SEP, IN_FSA, LINK_TPL, LISGAR_QUERY, MAX_PAGES, NEAR_KM, NEWLINE, NO_RAW_TPL, NUM_GLUE_RE, NUM_GLUE_SUB,
    STREET_WORD_MIN_LEN, OUT_RAW, OUT_REPORT, OUT_ROOMS,
    OUT_TPL, P_APP_ID, P_CATEGORY, P_CITY, P_GEO_COUNTRY, P_GEO_FORMAT, P_GEO_LIMIT, P_GEO_Q,
    P_IDENTITY, P_LIMIT, P_PAGE, PAGE_LIMIT, PAGE_TPL, POSTAL_RE, PREC_ADDRESS, QUERY_SEP,
    PREC_LABEL, PREC_LANDMARK, PREC_POSTAL, PREC_UNKNOWN, RAW_INDENT, RAW_WROTE_TPL, RECENT_DAYS,
    RENT_MAX, RENT_MIN, RENT_STRONG_RE, RENT_WEAK_RE, REPORT_FAR_TPL, YEAR_MAX, YEAR_MIN, FAR_CITIES, REPORT_META_TPL, REPORT_NEAR_TPL, REPORT_TITLE_TPL,
    REPORT_UNKNOWN_TPL, ROOM_RE, ROOMS_INDENT, ROOMS_WROTE_TPL, ROW_ADDRESS_TPL, ROW_DESC_TPL,
    ROW_HEAD_TPL, ROW_LAYOUT_TPL, ROW_LINK_TPL, ROW_PLACE_TPL, ROW_RENT_TPL, SPACE, STREET_RE,
    TIME_FMT, TPL_NAME, TPL_RENT_ID, WALK_MIN_PER_KM, WS_RE,
)
from hwcr.scheme import (
    DistanceIn, GeoHit, GeoIn, GeoPoint, GeoStat, HwcrApiPost, HwcrApiResp, HwcrPostRow, HwcrRawFile,
    HitCheckIn, Located, LocateIn, MergeIn, MergeOut, PageIn, ReportIn, RoomRow, RoomRowIn, RoomsFile,
    RowBlockIn,
)


# =========================================================================
# 1. 抓取(列表接口翻页 → crawl 层 → raw 累积表)
# =========================================================================


def list_url_of(page: int) -> str:
    """一页列表接口的完整 URL(参数拼进 URL:crawl 层按 URL 建缓存键,同页同串)。"""
    params = {P_APP_ID: APP_ID, P_IDENTITY: IDENTITY, P_CITY: CITY, P_CATEGORY: CATEGORY,
              P_PAGE: page, P_LIMIT: PAGE_LIMIT}
    return IN_URL + QUERY_SEP + urlencode(params)


def fields_of(post: HwcrApiPost) -> dict[str, str]:
    """结构化五格 → 格名→格值(同名格后者赢;值去首尾空白)。"""
    out: dict[str, str] = {}
    for f in post.fields:
        if f.name != "":
            out[f.name] = f.value.strip()
    return out


def picture_urls_of(post: HwcrApiPost) -> list[str]:
    """图片行 → 原图 url 清单(空 url 丢弃)。"""
    out: list[str] = []
    for p in post.pictures:
        if p.url != "":
            out.append(p.url)
    return out


def to_post_row(post: HwcrApiPost) -> HwcrPostRow:
    """接口帖 → raw 行(模板名查表,查不到留空串;is_end 折布尔)。"""
    return HwcrPostRow(
        id=post.id,
        template_id=post.template_id,
        kind=TPL_NAME.get(post.template_id, ""),
        created_at=post.created_at,
        updated_at=post.updated_at,
        is_end=post.is_end != 0,
        source=post.source,
        content=post.content,
        fields=fields_of(post),
        pictures=picture_urls_of(post),
    )


def fetch_housing_page(x: PageIn) -> list[HwcrPostRow]:
    """拉一页列表:响应原文先落 crawl 层(crawl/hwcr/),再解析成 raw 行。"""
    url = list_url_of(x.page)
    r = x.client.get(url)
    r.raise_for_status()
    put_cached_page(CachePutIn(slug=CRAWL_SLUG, url=url, html=r.text, title=CATEGORY))
    resp = HwcrApiResp.model_validate_json(r.text)
    rows: list[HwcrPostRow] = []
    for post in resp.data:
        rows.append(to_post_row(post))
    return rows


def created_key(row: HwcrPostRow) -> str:
    """排序键:发布时间串(格式固定,字典序即时间序)。"""
    return row.created_at


def is_older_than_window(row: HwcrPostRow) -> bool:
    """帖的发布时间早于 RECENT_DAYS 窗口(翻页停止判据;解析不出时间的当作不老,别误停)。"""
    if row.created_at == "":
        return False
    cutoff = datetime.now() - timedelta(days=RECENT_DAYS)
    return datetime.strptime(row.created_at, TIME_FMT) < cutoff


def fetch_recent_posts() -> list[HwcrPostRow]:
    """翻页拉到窗口边界:整页最老一条已出窗口、或页不满、或到硬上限即停。"""
    out: list[HwcrPostRow] = []
    with make_polite_client(FETCH_TIMEOUT_S) as client:
        for page in range(1, MAX_PAGES + 1):
            rows = fetch_housing_page(PageIn(client=client, page=page))
            oldest = ""
            if len(rows) > 0:
                oldest = min(rows, key=created_key).created_at
            say(PAGE_TPL.format(page=page, n=len(rows), oldest=oldest))
            out.extend(rows)
            if len(rows) < PAGE_LIMIT:
                break
            if is_older_than_window(rows[-1]):
                break
    return out


def merge_posts(x: MergeIn) -> MergeOut:
    """按 id 并入累积表:窗口外的帖不计不并,新 id 加入,同 id 以 updated_at 新者为准;已有行出窗即剔。"""
    by_id: dict[int, HwcrPostRow] = {}
    for row in x.old:
        by_id[row.id] = row
    added = 0
    updated = 0
    for row in x.new:
        if is_older_than_window(row):
            continue
        cur = by_id.get(row.id)
        if cur is None:
            added += 1
        elif row.updated_at > cur.updated_at:
            updated += 1
        else:
            continue
        by_id[row.id] = row
    kept: list[HwcrPostRow] = []
    for row in by_id.values():
        if is_older_than_window(row) is False:
            kept.append(row)
    kept.sort(key=created_key, reverse=True)
    return MergeOut(posts=kept, added=added, updated=updated)


def load_raw() -> list[HwcrPostRow]:
    """读已有累积表;没有 = 空表(首轮)。"""
    if OUT_RAW.exists() is False:
        return []
    return HwcrRawFile.model_validate_json(OUT_RAW.read_text(encoding=ENC_UTF8)).posts


def scrape_hwcr_ottawa_housing() -> None:
    """列表接口 → crawl/hwcr/ 原文 → data/raw/hwcr/ottawa-housing.json(窗口内帖,按 id 增量)。"""
    say(IN_TPL.format(url=IN_URL))
    say(OUT_TPL.format(path=OUT_RAW))
    fresh = fetch_recent_posts()
    merged = merge_posts(MergeIn(old=load_raw(), new=fresh))
    out = HwcrRawFile(url=LANDING, fetched=date.today().isoformat(), posts=merged.posts)
    OUT_RAW.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_RAW, payload=out.model_dump(by_alias=True),
                                       indent=RAW_INDENT))
    say(RAW_WROTE_TPL.format(n=len(merged.posts), new=merged.added, upd=merged.updated, fetched=out.fetched))


# =========================================================================
# 2. 地点解析与地理编码(门牌 → 邮编 → 地标;Nominatim 响应先落 crawl 层)
# =========================================================================


def geo_url_of(query: str) -> str:
    """一次 Nominatim 查询的完整 URL(同串同 URL = crawl 层缓存键)。"""
    params = {P_GEO_Q: query, P_GEO_FORMAT: GEO_FORMAT, P_GEO_LIMIT: GEO_LIMIT, P_GEO_COUNTRY: GEO_COUNTRY}
    return GEO_URL + QUERY_SEP + urlencode(params)


def geo_point_of(body: str) -> GeoPoint | None:
    """Nominatim 响应正文 → 首条命中的坐标;空数组 = None。"""
    hits = TypeAdapter(list[GeoHit]).validate_json(body)
    if len(hits) == 0:
        return None
    return GeoPoint(lat=float(hits[0].lat), lon=float(hits[0].lon), name=hits[0].display_name)


def geocode(x: GeoIn) -> GeoPoint | None:
    """查询串 → 坐标:crawl 层有原文直接解析;没有才打 Nominatim(礼貌档 UA + 1 req/s)并落原文。"""
    url = geo_url_of(x.query)
    body = get_cached_page(url).html
    if body is None:
        r = x.client.get(url)
        r.raise_for_status()
        body = r.text
        put_cached_page(CachePutIn(slug=GEO_SLUG, url=url, html=body, title=x.query))
        x.stat.fetched += 1
        time.sleep(GEO_SLEEP_S)
    else:
        x.stat.cached += 1
    point = geo_point_of(body)
    if point is None:
        x.stat.miss += 1
        say(GEO_TPL.format(q=x.query, hit=GEO_MISS))
    return point


def street_query_of(text: str) -> str:
    """文本里的门牌地址 → 查询串(数字与街名黏连的补空格;没有 = 空串)。"""
    m = STREET_RE.search(text)
    if m is None:
        return ""
    street = WS_RE.sub(SPACE, m.group(1)).strip()
    return NUM_GLUE_RE.sub(NUM_GLUE_SUB, street) + CITY_SUFFIX


def load_fsa_points() -> dict[str, GeoPoint]:
    """GeoNames FSA 表 → FSA 码 → 质心(全国 1600 余行,一次读完)。"""
    out: dict[str, GeoPoint] = {}
    for line in IN_FSA.read_text(encoding=ENC_UTF8).splitlines():
        cols = line.split(FSA_SEP)
        if len(cols) < FSA_MIN_COLS:
            continue
        out[cols[FSA_COL_CODE]] = GeoPoint(lat=float(cols[FSA_COL_LAT]), lon=float(cols[FSA_COL_LON]),
                                          name=cols[FSA_COL_NAME])
    return out


def fsa_of(text: str) -> str:
    """文本里的六位邮编 → 前三位 FSA(大写;没有 = 空串)。"""
    m = POSTAL_RE.search(text)
    if m is None:
        return ""
    return m.group(1).upper()


def far_city_query_of(text: str) -> str:
    """文本里命中的外城词 → 查询串(表序;没有 = 空串)。"""
    for pattern, query in FAR_CITIES:
        if re.search(pattern, text, re.IGNORECASE) is not None:
            return query
    return ""


def landmark_query_of(text: str) -> str:
    """文本里出现位置最靠前的地标词 → 查询串(外城词优先;没有 = 空串)。"""
    far = far_city_query_of(text)
    if far != "":
        return far
    best_pos = len(text) + 1
    best = ""
    for pattern, query in LANDMARKS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m is not None and m.start() < best_pos:
            best_pos = m.start()
            best = query
    return best


def is_hit_plausible(x: HitCheckIn) -> bool:
    """Nominatim 命中是不是查的那个地方:门牌级要街名词出现在命中地名里;地标级照收。
    (模糊匹配会把查不到的串给到别的机构或城市质心,不校验 = 假距离。)"""
    name = x.point.name.lower()
    if x.precision == PREC_ADDRESS:
        head = x.query.split(CITY_SUFFIX)[0]
        for word in head.split(SPACE):
            if len(word) >= STREET_WORD_MIN_LEN and word.isalpha() and word.lower() in name:
                return True
        return False
    return True


def locate_post(x: LocateIn) -> Located:
    """一帖的地点梯:外城词(混发的多伦多帖先按外城定位,免得「955 Bay st」落到渥太华 Bay Street)
    → 地址格门牌(Nominatim + 合理性校验)→ 全文邮编 FSA(本地 GeoNames 质心)→ 地址格地标 → 全文地标
    (Nominatim);每级命中即返回,否则降级。"""
    address = x.post.fields.get(F_ADDRESS, "")
    far = far_city_query_of(x.post.content)
    if far != "":
        point = geocode(GeoIn(client=x.client, query=far, stat=x.stat))
        if point is not None:
            return Located(precision=PREC_LANDMARK, query=far, point=point)
    street = street_query_of(address)
    if street != "":
        point = geocode(GeoIn(client=x.client, query=street, stat=x.stat))
        if point is not None and is_hit_plausible(HitCheckIn(precision=PREC_ADDRESS, query=street, point=point)):
            return Located(precision=PREC_ADDRESS, query=street, point=point)
    fsa = fsa_of(x.post.content)
    fsa_point = x.fsa.get(fsa)
    if fsa_point is not None:
        return Located(precision=PREC_POSTAL, query=fsa, point=fsa_point)
    ladder = [
        (PREC_LANDMARK, landmark_query_of(address)),
        (PREC_LANDMARK, landmark_query_of(x.post.content)),
    ]
    for precision, query in ladder:
        if query == "":
            continue
        point = geocode(GeoIn(client=x.client, query=query, stat=x.stat))
        if point is None:
            continue
        if is_hit_plausible(HitCheckIn(precision=precision, query=query, point=point)):
            return Located(precision=precision, query=query, point=point)
    return Located(precision=PREC_UNKNOWN, query="", point=None)


def distance_km_of(x: DistanceIn) -> float:
    """两点大圆距离(haversine)。"""
    lat1 = math.radians(x.a.lat)
    lat2 = math.radians(x.b.lat)
    dlat = lat2 - lat1
    dlon = math.radians(x.b.lon - x.a.lon)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


# =========================================================================
# 3. 筛选与产出(出租单间 → 按距离排 → json + md)
# =========================================================================


def is_room_rental(post: HwcrPostRow) -> bool:
    """出租模板 + 未结束 + 单间判词命中。"""
    if post.template_id != TPL_RENT_ID:
        return False
    if post.is_end:
        return False
    return ROOM_RE.search(post.content) is not None


def is_rent_like(n: int) -> bool:
    """落在合理月租区间且不像年份。"""
    if n < RENT_MIN or n > RENT_MAX:
        return False
    return n < YEAR_MIN or n > YEAR_MAX


def rent_of(text: str) -> int | None:
    """租金原文 → 月租整数:先找带钱号/月单位的数,再退到裸数;没有 = None(「面议」是事实,不编)。"""
    for m in RENT_STRONG_RE.finditer(text):
        raw = m.group(1)
        if raw is None:
            raw = m.group(2)
        n = int(raw)
        if is_rent_like(n):
            return n
    for m in RENT_WEAK_RE.finditer(text):
        n = int(m.group(1))
        if is_rent_like(n):
            return n
    return None


def to_room_row(x: RoomRowIn) -> RoomRow:
    """帖 + 地点解析 + 锚点 → 清单行(距离/步行分钟在这算;位置不明两格 null)。"""
    distance: float | None = None
    walk: int | None = None
    place = ""
    if x.located.point is not None:
        distance = round(distance_km_of(DistanceIn(a=x.located.point, b=x.anchor)), 2)
        walk = round(distance * WALK_MIN_PER_KM)
        place = x.located.point.name
    rent_text = x.post.fields.get(F_RENT, "")
    return RoomRow(
        id=x.post.id,
        posted_at=x.post.created_at[:DATE_LEN],
        distance_km=distance,
        walk_min=walk,
        precision=x.located.precision,
        query=x.located.query,
        place=place,
        address=x.post.fields.get(F_ADDRESS, ""),
        layout=x.post.fields.get(F_LAYOUT, ""),
        rent_text=rent_text,
        rent_monthly=rent_of(rent_text),
        description=x.post.fields.get(F_DESC, ""),
        contact=x.post.fields.get(F_CONTACT, ""),
        link=LINK_TPL.format(id=x.post.id),
        pictures=x.post.pictures,
    )


def room_sort_key(row: RoomRow) -> tuple:
    """排序键:有距离的按距离升序,位置不明排尾(同距靠先按发布日降序的稳定排保持新帖在前)。"""
    if row.distance_km is None:
        return (1, 0.0)
    return (0, row.distance_km)


def posted_key(row: RoomRow) -> str:
    """排序键:发布日(先按它降序,再按距离稳定排 → 同距新帖在前)。"""
    return row.posted_at


def dedupe_key(row: RoomRow) -> str:
    """同一房源反复重发的识别键:户型 + 地址 + 租金原文三格拼接(实撞:同帖隔两天原样再发)。"""
    return row.layout + row.address + row.rent_text


def dedupe_rows(rows: list[RoomRow]) -> list[RoomRow]:
    """同键只留发布最新的一条(入参已按发布日降序,首见即最新)。"""
    seen: set[str] = set()
    out: list[RoomRow] = []
    for row in rows:
        key = dedupe_key(row)
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def text_or_empty(text: str) -> str:
    """报告里空格子的占位。"""
    if text == "":
        return EMPTY_FIELD
    return WS_RE.sub(SPACE, text).strip()


def dist_text_of(row: RoomRow) -> str:
    """一行的距离串(有坐标带步行分钟与精度;没有写不明)。"""
    if row.distance_km is None or row.walk_min is None:
        return DIST_UNKNOWN
    return DIST_TPL.format(km=row.distance_km, walk=row.walk_min, prec=PREC_LABEL[row.precision])


def row_lines_of(x: RowBlockIn) -> list[str]:
    """一行 → 报告里的一块(序号 + 六行)。"""
    n = x.n
    row = x.row
    lines = [
        ROW_HEAD_TPL.format(n=n, dist=dist_text_of(row), date=row.posted_at),
        ROW_RENT_TPL.format(rent=text_or_empty(row.rent_text)),
        ROW_LAYOUT_TPL.format(layout=text_or_empty(row.layout)),
        ROW_ADDRESS_TPL.format(address=text_or_empty(row.address)),
    ]
    if row.place != "":
        lines.append(ROW_PLACE_TPL.format(place=row.place))
    lines.append(ROW_DESC_TPL.format(desc=text_or_empty(row.description)))
    lines.append(ROW_LINK_TPL.format(link=row.link))
    lines.append("")
    return lines


def report_of(x: ReportIn) -> str:
    """清单 → md 报告(NEAR_KM 内 / 外 / 位置不明三节)。"""
    near: list[RoomRow] = []
    far: list[RoomRow] = []
    unknown: list[RoomRow] = []
    for row in x.rows:
        if row.distance_km is None:
            unknown.append(row)
        elif row.distance_km <= NEAR_KM:
            near.append(row)
        else:
            far.append(row)
    lines = [
        REPORT_TITLE_TPL,
        "",
        REPORT_META_TPL.format(today=date.today().isoformat(), anchor=LISGAR_QUERY, days=RECENT_DAYS,
                               total=x.total, rooms=len(x.rows)),
        "",
    ]
    sections = [
        (REPORT_NEAR_TPL.format(km=NEAR_KM, n=len(near)), near),
        (REPORT_FAR_TPL.format(km=NEAR_KM, n=len(far)), far),
        (REPORT_UNKNOWN_TPL.format(n=len(unknown)), unknown),
    ]
    for title, rows in sections:
        lines.append(title)
        lines.append("")
        for i, row in enumerate(rows, start=1):
            lines.extend(row_lines_of(RowBlockIn(n=i, row=row)))
    return NEWLINE.join(lines)


def count_rentals(posts: list[HwcrPostRow]) -> int:
    """窗口内未结束的出租帖总数(报告头的分母)。"""
    n = 0
    for post in posts:
        if post.template_id == TPL_RENT_ID and post.is_end is False:
            n += 1
    return n


def build_hwcr_lisgar_rooms() -> None:
    """raw 累积表 → 出租单间 + 到 Lisgar 距离 → data/processed/hwcr/lisgar-rooms.{json,md}。"""
    say(IN_TPL.format(url=str(OUT_RAW)))
    say(OUT_TPL.format(path=OUT_ROOMS))
    if OUT_RAW.exists() is False:
        raise RuntimeError(NO_RAW_TPL.format(path=OUT_RAW))
    posts = load_raw()
    fsa = load_fsa_points()
    stat = GeoStat()
    rows: list[RoomRow] = []
    with make_polite_client(GEO_TIMEOUT_S) as client:
        anchor = geocode(GeoIn(client=client, query=LISGAR_QUERY, stat=stat))
        if anchor is None:
            raise RuntimeError(ANCHOR_MISS_TPL.format(q=LISGAR_QUERY))
        for post in posts:
            if is_room_rental(post) is False:
                continue
            located = locate_post(LocateIn(client=client, post=post, fsa=fsa, stat=stat))
            rows.append(to_room_row(RoomRowIn(post=post, located=located, anchor=anchor)))
    rows.sort(key=posted_key, reverse=True)
    rows = dedupe_rows(rows)
    rows.sort(key=room_sort_key)
    say(GEO_CACHED_TPL.format(hit=stat.cached, fetched=stat.fetched, miss=stat.miss))
    out = RoomsFile(anchor=LISGAR_QUERY, anchor_point=anchor, generated=date.today().isoformat(), rows=rows)
    OUT_ROOMS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_ROOMS, payload=out.model_dump(by_alias=True),
                                       indent=ROOMS_INDENT))
    paths.write_text(paths.WriteTextIn(path=OUT_REPORT, text=report_of(ReportIn(rows=rows,
                                                                               total=count_rentals(posts)))))
    near = 0
    unknown = 0
    for row in rows:
        if row.distance_km is None:
            unknown += 1
        elif row.distance_km <= NEAR_KM:
            near += 1
    say(ROOMS_WROTE_TPL.format(n=len(rows), near=near, unknown=unknown))
