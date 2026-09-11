"""
statcan 域函数 —— 全部行为住这(照 ircc/company/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

2026-09-06 立域:段3「NPR 占总人口比」与段4「StatCan 分省临时居民存量」**整段自
etl/ircc/functions.py 纯搬**(函数体、docstring、行内注释一字未改;改的只有 import 路径),
**产物路径不动** —— 段3 仍写 raw/ircc/npr_share.json,段4 仍写 raw/ircc/statcan_tr_prov.json。
段2「WDS 通用取数」与段5「表清单取数」是新写(把脉页省份段契约
docs/design/把脉页省份段-契约-20260906.md §1:四张宏观表 → raw/statcan/<pid>.json)。
搬来的两段各自留着自己的 httpx 调用(纯搬不改一字);新写的两段共用段2 的通用门。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;「✗ …(保留旧表)」「⚠ …」行
是本域的错误通道(auto_update 按行首升级)。
硬闸口径:段5 任一张表失败 → 打 ⚠ 保留那张旧表、其余表照跑,收尾 sys.exit(1) 让本轮红;
段3/段4 沿用搬来前的口径(抓取失败即 return,保留旧表)。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch / crawl)。
"""
import re
import sys
from datetime import date, datetime, timezone

import httpx

import paths
from log.functions import say
from fetch.constants import HDR_UA
from crawl.functions import put_cached_page
from crawl.scheme import CachePutIn
from statcan.constants import (
    CACHE_URL_TPL, COORD_DIMS, COORD_SEP, COORD_TPL, COORD_UNKNOWN_TPL, COORD_ZERO, CRAWL_SLUG,
    CUBE_DONE_TPL, CUBE_FAIL_TPL, CUBE_ROW_TPL, CUBE_SRC_TPL, CUBES, CUBES_DONE_TPL,
    CUBES_FAIL_TPL, CUBES_PRINT_OUT_TPL, DIM_MISS_TPL, GEO_CA_CODE, GEO_CA_NAME, GEO_DIM,
    GEO_MISS_TPL, GEO_MUST, INDENT_1, K_BY_GEO, K_BY_PROV, K_COORDINATE, K_CUBE_TITLE_EN,
    K_DIMENSION, K_DIMENSION_NAME_EN, K_DIMENSION_POSITION_ID, K_FETCHED, K_FETCHED_AT, K_FREQ,
    K_GAP_TO_TARGET, K_LATEST, K_LATEST_N, K_LATEST_REF_PER, K_MEMBER, K_MEMBER_ID,
    K_MEMBER_NAME_EN, K_NOTE, K_NPR, K_OBJECT, K_PEAK, K_PER_QUARTER_CHANGE, K_PID, K_POPULATION,
    K_PROBE, K_PROBE_KEY, K_PROBE_MIN, K_PRODUCT_ID, K_QUARTERS, K_QUARTERS_TO_TARGET, K_REF_PER,
    K_SERIES, K_SHARE, K_SOURCE, K_STATUS, K_STUDY_ONLY, K_TARGET, K_TITLE, K_TYPES, K_VALUE,
    K_VECTOR_DATA_POINT, K_VECTOR_ID, K_WORK_ONLY, K_WORK_STUDY, MEMBER_MISS_TPL, NPR_DONE_TPL,
    NPR_FAIL_TPL, NPR_LATEST_TPL, NPR_MIN_QUARTERS, NPR_NOTE, NPR_PEAK_TPL, NPR_PRINT_OUT_TPL,
    NPR_QUARTERS, NPR_SPAN, NPR_SPEED_TPL, NPR_SRC_URLS, NPR_TARGET, NPR_TIMEOUT_S,
    NPR_TOO_FEW_TPL, NPR_UA, NPR_WDS, OUT_NAME_TPL, OUT_NPR, OUT_TR_PROV, PCT_SCALE,
    PROBE_GEO_FAIL_TPL, PROBE_MIN_FAIL_TPL, PROV_CODE, PROV_ON, QUARTERS_ROUND, SERIES_SEP,
    SHARE_ROUND, STATUS_SUCCESS, TIMESPEC_SECONDS, TRP_COORD_FAIL_TPL, TRP_DATA_TIMEOUT_S,
    TRP_DATA_URL, TRP_DIM_FAIL_TPL, TRP_DONE_TPL, TRP_FAIL_TPL, TRP_META_TIMEOUT_S, TRP_META_URL,
    TRP_MIN_PROV, TRP_MIN_TYPES, TRP_NOTE, TRP_ON_MIN, TRP_PID, TRP_PRINT_OUT_TPL, TRP_QUARTERS,
    TRP_ROW_TPL, TRP_SANITY_FAIL, TRP_SRC_URL, TRP_TYPES, TRP_UA, TYPE_DIM_WORD, V_NPR, V_POP,
    WDS_DATA_TIMEOUT_S, WDS_DATA_URL, WDS_META_TIMEOUT_S, WDS_META_URL, WDS_STATUS_FAIL_TPL,
    WDS_UA, WDS_VECTOR_FAIL_TPL,
    CITY_AMBIG_TPL, CITY_CMA, CITY_DONE_TPL, CITY_DT_DIM, CITY_DT_MEMBER, CITY_KEY_SEP,
    CITY_LF_DIM, CITY_LF_MEMBER, CITY_MACRO_SRC, CITY_POP_EXTRA, CITY_POP_LATEST_N,
    CITY_POP_PID, CITY_POP_PROBE_CITY, CITY_POP_PROBE_MIN, CITY_PRINT_OUT_TPL,
    CITY_PROBE_FAIL_TPL, CITY_STAT_DIM, CITY_STAT_MEMBER, CITY_UNEMP_LATEST_N,
    CITY_UNEMP_PID, CITY_UNEMP_PROBE_CMA, CITY_UNEMP_PROBE_MAX, CITY_UNEMP_PROBE_MIN,
    CSD_BILINGUAL_SEP, CSD_NAME_RE, CSD_TYPE_PREF, K_CITY, K_CITY_ROWS, K_CMA, K_PIDS,
    K_POP_PERIOD, K_POP_VAL, K_PROVINCE, K_UNEMP_PERIOD, K_UNEMP_RATE, OUT_CITY_MACRO,
)
from statcan.scheme import (
    ByProvIn, CoordIn, CubeCheckIn, CubeDocIn, CubeMeta, CubePlanIn, CubePlanOut, CubePointsIn,
    DimMembers, DimOfIn, GeoIdsIn, LabelsIn, MemberIdIn, MemberIds, NprRowsIn, QuartersIn, SigIn,
    WdsDataIn, WdsDataOut,
    CityPointsIn, CityProbeIn, CityRowIn, CsdPickIn,
)

# =========================================================================
# 1. 共享词汇(≥2 段消费:落盘日戳)
# =========================================================================


def today_iso() -> str:
    """今天(本地日期,ISO)—— 本域三段 fetched 的口径。"""
    return date.today().isoformat()


# =========================================================================
# 2. WDS 通用取数(元数据解成员 id → 坐标一发全取;段5 的两道门)
# =========================================================================


def dim_pos_of(dim: dict) -> int:
    """排序键:一维在坐标里的段位(响应数组序不保证,按 dimensionPositionId 排)。"""
    return int(dim[K_DIMENSION_POSITION_ID])


def wds_meta(pid: int) -> CubeMeta:
    """一张表的元数据 → 标题 + 按段位排好的维度成员表(非 SUCCESS 即抛,交调用方保留旧表)。"""
    r = httpx.post(WDS_META_URL, json=[{K_PRODUCT_ID: pid}], headers={HDR_UA: WDS_UA},
                   timeout=WDS_META_TIMEOUT_S)
    r.raise_for_status()
    blk = r.json()[0]
    if blk.get(K_STATUS) != STATUS_SUCCESS:
        raise RuntimeError(WDS_STATUS_FAIL_TPL.format(status=blk.get(K_STATUS)))
    o = blk[K_OBJECT]
    dims = []
    for d in sorted(o[K_DIMENSION], key=dim_pos_of):
        ids: dict = {}
        for m in d[K_MEMBER]:
            ids[m[K_MEMBER_NAME_EN]] = int(m[K_MEMBER_ID])
        dims.append(DimMembers(name=d[K_DIMENSION_NAME_EN], ids=ids))
    return CubeMeta(title=o[K_CUBE_TITLE_EN], dims=dims)


def wds_data(x: WdsDataIn) -> WdsDataOut:
    """按坐标一发全取 → 响应块 + 响应原文(原文由调用方进 crawl 层)。"""
    r = httpx.post(WDS_DATA_URL, json=x.requests, headers={HDR_UA: WDS_UA},
                   timeout=WDS_DATA_TIMEOUT_S)
    r.raise_for_status()
    return WdsDataOut(blocks=r.json(), text=r.text)


def coord_str(ids: list) -> str:
    """成员 id 清单 → WDS 坐标串(恒十段,表没用到的维补零)。"""
    parts = []
    for i in ids:
        parts.append(str(i))
    while len(parts) < COORD_DIMS:
        parts.append(COORD_ZERO)
    return COORD_SEP.join(parts)


def sig_of(x: SigIn) -> str:
    """坐标 → 「除地理外」的成员 id 签名(请求侧与响应侧同一把钥匙,两侧都归一成整数)。"""
    parts = []
    i = 0
    for p in x.parts[:x.dims]:
        if i != x.skip:
            parts.append(str(int(p)))
        i += 1
    return COORD_SEP.join(parts)


def to_number(v: object) -> float | int:
    """WDS 的值 → 数(整数点落整数,免得人口写成 15996989.0;缺位的点调用方压根不落键)。"""
    n = float(str(v))
    if n == int(n):
        return int(n)
    return n


# =========================================================================
# 3. NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
# =========================================================================


def series(vector: int) -> dict:
    """一条 WDS 向量 → {季度参考日: 值}(非 SUCCESS 即抛,交调用方保留旧表)。"""
    r = httpx.post(NPR_WDS, json=[{K_VECTOR_ID: vector, K_LATEST_N: NPR_QUARTERS}],
                   headers={HDR_UA: NPR_UA}, timeout=NPR_TIMEOUT_S)
    r.raise_for_status()
    blk = r.json()[0]
    if blk.get(K_STATUS) != STATUS_SUCCESS:
        raise RuntimeError(WDS_VECTOR_FAIL_TPL.format(status=blk.get(K_STATUS), vector=vector))
    out: dict = {}
    for p in blk[K_OBJECT][K_VECTOR_DATA_POINT]:
        if p.get(K_VALUE) is not None:
            out[p[K_REF_PER]] = float(p[K_VALUE])
    return out


def npr_rows_of(x: NprRowsIn) -> list:
    """两条序列 → 季度行(只留两边都有的季度)。"""
    rows = []
    for q in sorted(x.npr):
        if q not in x.pop:
            continue
        rows.append({K_REF_PER: q, K_POPULATION: int(x.pop[q]), K_NPR: int(x.npr[q]),
                     K_SHARE: round(x.npr[q] / x.pop[q], SHARE_ROUND)})
    return rows


def share_of(row: dict) -> float:
    """峰值排序键(原 lambda 出户成具名)。"""
    return row[K_SHARE]


def quarters_to_target_of(x: QuartersIn) -> float | None:
    """按最近四季降速线性外推到 5% 还要几个季度;没在降 → None(不外推)。"""
    if x.per_q < 0:
        return round((NPR_TARGET - x.share) / x.per_q, QUARTERS_ROUND)
    return None


def scrape_statcan_npr() -> None:
    """StatCan 非永久居民(NPR)占总人口比 → raw/ircc/npr_share.json。

    IN : StatCan WDS(免密钥 REST):v1=加拿大季度总人口 / v1566927590=非永久居民(NPR)总数
    OUT: raw/ircc/npr_share.json(季度序列 + 最新占比 + 距 5% 目标的人数缺口)
    """
    say(NPR_PRINT_OUT_TPL.format(path=OUT_NPR))
    paths.IRCC.mkdir(parents=True, exist_ok=True)
    try:
        pop = series(V_POP)
        npr = series(V_NPR)
    except Exception as e:  # noqa: BLE001
        say(NPR_FAIL_TPL.format(name=type(e).__name__, detail=e))
        return
    rows = npr_rows_of(NprRowsIn(pop=pop, npr=npr))
    if len(rows) < NPR_MIN_QUARTERS:
        say(NPR_TOO_FEW_TPL.format(n=len(rows)))
        return
    latest = rows[-1]
    peak = max(rows, key=share_of)
    span = rows
    if len(rows) >= NPR_SPAN:
        span = rows[-NPR_SPAN:]
    per_q = (span[-1][K_SHARE] - span[0][K_SHARE]) / max(len(span) - 1, 1)
    gap_people = int(latest[K_NPR] - latest[K_POPULATION] * NPR_TARGET)
    quarters = quarters_to_target_of(QuartersIn(share=latest[K_SHARE], per_q=per_q))
    paths.write_json(paths.WriteJsonIn(path=OUT_NPR, payload={
        K_SOURCE: NPR_SRC_URLS, K_FETCHED: today_iso(),
        K_FETCHED_AT: datetime.now(timezone.utc).isoformat(timespec=TIMESPEC_SECONDS),
        K_TARGET: NPR_TARGET, K_QUARTERS: rows,
        K_LATEST: latest, K_PEAK: peak,
        K_PER_QUARTER_CHANGE: round(per_q, SHARE_ROUND),
        K_GAP_TO_TARGET: gap_people,
        K_QUARTERS_TO_TARGET: quarters,
        K_NOTE: NPR_NOTE,
    }, indent=INDENT_1))
    say(NPR_DONE_TPL.format(n=len(rows), out=OUT_NPR.name))
    say(NPR_LATEST_TPL.format(ref=latest[K_REF_PER], pct=latest[K_SHARE] * PCT_SCALE,
                              npr=latest[K_NPR], pop=latest[K_POPULATION]))
    say(NPR_PEAK_TPL.format(ref=peak[K_REF_PER], pct=peak[K_SHARE] * PCT_SCALE, gap=gap_people))
    say(NPR_SPEED_TPL.format(per=per_q * PCT_SCALE, quarters=quarters))


# =========================================================================
# 4. StatCan 分省临时居民存量(IRCC 年末存量停在 2024 后唯一的官方分省刻度)
# =========================================================================


def member_ids() -> MemberIds:
    """metadata 解析省/证型的 memberId(不写死:StatCan 重排成员时坐标会静默错位)。"""
    r = httpx.post(TRP_META_URL, json=[{K_PRODUCT_ID: TRP_PID}], headers={HDR_UA: TRP_UA},
                   timeout=TRP_META_TIMEOUT_S)
    r.raise_for_status()
    geo: dict = {}
    typ: dict = {}
    for d in r.json()[0][K_OBJECT][K_DIMENSION]:
        name = d[K_DIMENSION_NAME_EN]
        if name == GEO_DIM:
            for m in d[K_MEMBER]:
                geo[m[K_MEMBER_NAME_EN]] = int(m[K_MEMBER_ID])
        if TYPE_DIM_WORD in name.lower():
            for m in d[K_MEMBER]:
                typ[m[K_MEMBER_NAME_EN]] = int(m[K_MEMBER_ID])
    geo_ids: dict = {}
    for name, code in PROV_CODE.items():
        if name in geo:
            geo_ids[code] = geo[name]
    typ_ids: dict = {}
    for key, name in TRP_TYPES.items():
        if name in typ:
            typ_ids[key] = typ[name]
    return MemberIds(geo=geo_ids, types=typ_ids)


def coord_of(x: CoordIn) -> str:
    """(省 memberId, 证型 memberId) → WDS 十维坐标串。"""
    return COORD_TPL.format(geo=x.geo, typ=x.typ)


def tr_prov_requests(ids: MemberIds) -> list:
    """省 × 证型 的取数请求(一发全取)。"""
    reqs = []
    for g in ids.geo.values():
        for t in ids.types.values():
            reqs.append({K_PRODUCT_ID: TRP_PID, K_COORDINATE: coord_of(CoordIn(geo=g, typ=t)),
                         K_LATEST_N: TRP_QUARTERS})
    return reqs


def tr_prov_by_prov(x: ByProvIn) -> dict:
    """响应块 → {省码: {季度: {证型: 值}}}。

    响应块**不按请求顺序**回来(实测乱序)—— 只能从块自带 coordinate 反解 (省, 证型)。
    """
    prov_of: dict = {}
    for p, g in x.ids.geo.items():
        prov_of[g] = p
    key_of: dict = {}
    for k, t in x.ids.types.items():
        key_of[t] = k
    by_prov: dict = {}
    for blk in x.blocks:
        if blk.get(K_STATUS) != STATUS_SUCCESS:
            raise RuntimeError(WDS_STATUS_FAIL_TPL.format(status=blk.get(K_STATUS)))
        o = blk[K_OBJECT]
        parts = o[K_COORDINATE].split(COORD_SEP)
        prov = prov_of.get(int(parts[0]))
        key = key_of.get(int(parts[1]))
        if prov is None or key is None:
            raise RuntimeError(TRP_COORD_FAIL_TPL.format(coord=o[K_COORDINATE]))
        for p in o[K_VECTOR_DATA_POINT]:
            if p.get(K_VALUE) is not None:
                by_prov.setdefault(prov, {}).setdefault(p[K_REF_PER], {})[key] = int(p[K_VALUE])
    return by_prov


def latest_ref_of(by_prov: dict) -> str:
    """全部省里最新的那个季度参考日。"""
    quarters = []
    for p in by_prov.values():
        for q in p:
            quarters.append(q)
    return max(quarters)


def scrape_statcan_tr_prov() -> None:
    """StatCan 分省临时居民存量(季度)→ raw/ircc/statcan_tr_prov.json。

    IN : StatCan WDS getCubeMetadata + getDataFromCubePidCoordAndLatestNPeriods (pid 17100121)
    OUT: raw/ircc/statcan_tr_prov.json
    抓取失败 / 维度缺位 / 量级失真 → 保留旧表(宁可留旧也不留空)。
    """
    say(TRP_PRINT_OUT_TPL.format(path=OUT_TR_PROV))
    paths.IRCC.mkdir(parents=True, exist_ok=True)
    try:
        ids = member_ids()
        if len(ids.geo) < TRP_MIN_PROV or len(ids.types) < TRP_MIN_TYPES:
            raise RuntimeError(TRP_DIM_FAIL_TPL.format(geo=len(ids.geo), typ=len(ids.types)))
        r = httpx.post(TRP_DATA_URL, json=tr_prov_requests(ids), headers={HDR_UA: TRP_UA},
                       timeout=TRP_DATA_TIMEOUT_S)
        r.raise_for_status()
        by_prov = tr_prov_by_prov(ByProvIn(blocks=r.json(), ids=ids))
        latest = latest_ref_of(by_prov)
        checked = by_prov.get(PROV_ON, {}).get(latest, {})
        if (checked.get(K_STUDY_ONLY) or 0) < TRP_ON_MIN:
            raise RuntimeError(TRP_SANITY_FAIL)
    except Exception as e:  # noqa: BLE001
        say(TRP_FAIL_TPL.format(name=type(e).__name__, detail=e))
        return
    types: dict = {}
    for k in ids.types:
        types[k] = TRP_TYPES[k]
    paths.write_json(paths.WriteJsonIn(path=OUT_TR_PROV, payload={
        K_SOURCE: TRP_SRC_URL, K_FETCHED: today_iso(),
        K_TYPES: types,
        K_BY_PROV: by_prov, K_LATEST_REF_PER: latest,
        K_NOTE: TRP_NOTE,
    }, indent=INDENT_1))
    on = by_prov.get(PROV_ON, {}).get(latest, {})
    say(TRP_DONE_TPL.format(n=len(by_prov), q=TRP_QUARTERS, out=OUT_TR_PROV.name))
    say(TRP_ROW_TPL.format(ref=latest, study=on.get(K_STUDY_ONLY, 0),
                           work=on.get(K_WORK_ONLY, 0), both=on.get(K_WORK_STUDY, 0)))


# =========================================================================
# 5. 表清单取数(把脉页省份段四张宏观表:人口 / 临时居民 / GDP / 失业率)
# =========================================================================


def dim_of(x: DimOfIn) -> DimMembers:
    """按名字取一维(取不到 = 表改版,当场报错保留旧表)。"""
    for d in x.meta.dims:
        if d.name == x.name:
            return d
    raise RuntimeError(DIM_MISS_TPL.format(pid=x.pid, dim=x.name))


def member_id_of(x: MemberIdIn) -> int:
    """按名字取成员 id(逐字匹配,不猜近似名;取不到 = 成员改名即表改版)。"""
    got = x.dim.ids.get(x.member)
    if got is None:
        raise RuntimeError(MEMBER_MISS_TPL.format(pid=x.pid, dim=x.dim.name, member=x.member))
    return int(got)


def cube_geo_ids(x: GeoIdsIn) -> dict:
    """Geography 维 → {geo 码: memberId}(CA + 十省;领地与 Outside Canada 不收)。"""
    out: dict = {}
    if GEO_CA_NAME in x.dim.ids:
        out[GEO_CA_CODE] = x.dim.ids[GEO_CA_NAME]
    for name, code in PROV_CODE.items():
        if name in x.dim.ids:
            out[code] = x.dim.ids[name]
    if len(out) < len(PROV_CODE) + 1:
        raise RuntimeError(GEO_MISS_TPL.format(pid=x.pid, n=len(out)))
    return out


def cube_plan(x: CubePlanIn) -> CubePlanOut:
    """一张表的取数计划:geo × 输出键 的坐标请求 + 反解响应要的三张表。"""
    pid = x.cube[K_PID]
    geo_pos = -1
    pos = 0
    for d in x.meta.dims:
        if d.name == GEO_DIM:
            geo_pos = pos
        pos += 1
    if geo_pos < 0:
        raise RuntimeError(DIM_MISS_TPL.format(pid=pid, dim=GEO_DIM))
    geo_ids = cube_geo_ids(GeoIdsIn(dim=x.meta.dims[geo_pos], pid=pid))
    geo_of: dict = {}
    for code, gid in geo_ids.items():
        geo_of[gid] = code
    requests = []
    key_of: dict = {}
    dims = len(x.meta.dims)
    for key, sel in x.cube[K_SERIES].items():
        ids: list = []
        for d in x.meta.dims:
            if d.name == GEO_DIM:
                ids.append(COORD_ZERO)
                continue
            if d.name not in sel:
                raise RuntimeError(DIM_MISS_TPL.format(pid=pid, dim=d.name))
            ids.append(member_id_of(MemberIdIn(dim=d, member=sel[d.name], pid=pid)))
        key_of[sig_of(SigIn(parts=ids, skip=geo_pos, dims=dims))] = key
        for gid in geo_ids.values():
            ids[geo_pos] = gid
            requests.append({K_PRODUCT_ID: pid, K_COORDINATE: coord_str(ids),
                             K_LATEST_N: x.cube[K_LATEST_N]})
    return CubePlanOut(requests=requests, geo_of=geo_of, key_of=key_of, geo_pos=geo_pos,
                       dims=dims)


def cube_by_geo(x: CubePointsIn) -> dict:
    """响应块 → {geo: {期: {输出键: 值}}}(块乱序,从块自带 coordinate 反解;缺位的点不落键)。"""
    out: dict = {}
    for blk in x.blocks:
        if blk.get(K_STATUS) != STATUS_SUCCESS:
            raise RuntimeError(WDS_STATUS_FAIL_TPL.format(status=blk.get(K_STATUS)))
        o = blk[K_OBJECT]
        parts = o[K_COORDINATE].split(COORD_SEP)
        geo = x.plan.geo_of.get(int(parts[x.plan.geo_pos]))
        key = x.plan.key_of.get(sig_of(SigIn(parts=parts, skip=x.plan.geo_pos, dims=x.plan.dims)))
        if geo is None or key is None:
            raise RuntimeError(COORD_UNKNOWN_TPL.format(pid=x.pid, coord=o[K_COORDINATE]))
        for p in o[K_VECTOR_DATA_POINT]:
            if p.get(K_VALUE) is not None:
                out.setdefault(geo, {}).setdefault(p[K_REF_PER], {})[key] = to_number(p[K_VALUE])
    return out


def series_labels_of(x: LabelsIn) -> dict:
    """输出键 → 成员名标签(按维度段位拼;单维表没有成员名,退回官方表名)。"""
    out: dict = {}
    for key, sel in x.cube[K_SERIES].items():
        names = []
        for d in x.meta.dims:
            if d.name in sel:
                names.append(sel[d.name])
        if len(names) == 0:
            out[key] = x.meta.title
            continue
        out[key] = SERIES_SEP.join(names)
    return out


def check_cube(x: CubeCheckIn) -> None:
    """自校:CA 与 ON 都得有数据点,且 ON 最新期的探针键过量级线(未过即抛,保留旧表)。"""
    for geo in GEO_MUST:
        block = x.by_geo.get(geo)
        if block is None or len(block) == 0:
            raise RuntimeError(PROBE_GEO_FAIL_TPL.format(geo=geo))
    probe = x.cube[K_PROBE]
    on = x.by_geo[PROV_ON]
    ref = max(on)
    value = on[ref].get(probe[K_PROBE_KEY])
    if value is None or value <= probe[K_PROBE_MIN]:
        raise RuntimeError(PROBE_MIN_FAIL_TPL.format(ref=ref, key=probe[K_PROBE_KEY], value=value,
                                                     min=probe[K_PROBE_MIN]))


def to_cube_doc(x: CubeDocIn) -> dict:
    """一张表 → 落盘表(键序即文件契约,见契约 §1)。"""
    return {
        K_SOURCE: CUBE_SRC_TPL.format(pid=x.cube[K_PID]),
        K_PID: x.cube[K_PID],
        K_TITLE: x.meta.title,
        K_FREQ: x.cube[K_FREQ],
        K_FETCHED: x.fetched,
        K_SERIES: series_labels_of(LabelsIn(cube=x.cube, meta=x.meta)),
        K_BY_GEO: x.by_geo,
    }


def scrape_statcan_cube(cube: dict) -> None:
    """一张 WDS 表 → raw/statcan/<pid>.json(响应原文先进 crawl 层;任一步抛错即整表不更新)。"""
    pid = cube[K_PID]
    meta = wds_meta(pid)
    plan = cube_plan(CubePlanIn(cube=cube, meta=meta))
    got = wds_data(WdsDataIn(requests=plan.requests))
    put_cached_page(CachePutIn(slug=CRAWL_SLUG, url=CACHE_URL_TPL.format(url=WDS_DATA_URL, pid=pid),
                               html=got.text, title=meta.title))
    by_geo = cube_by_geo(CubePointsIn(blocks=got.blocks, plan=plan, pid=pid))
    check_cube(CubeCheckIn(cube=cube, by_geo=by_geo))
    out = paths.STATCAN / OUT_NAME_TPL.format(pid=pid)
    paths.write_json(paths.WriteJsonIn(
        path=out, payload=to_cube_doc(CubeDocIn(cube=cube, meta=meta, by_geo=by_geo,
                                                fetched=today_iso())), indent=INDENT_1))
    on = by_geo[PROV_ON]
    ref = max(on)
    say(CUBE_DONE_TPL.format(pid=pid, title=meta.title, geos=len(by_geo), periods=len(on),
                             out=out.name))
    say(CUBE_ROW_TPL.format(ref=ref, key=cube[K_PROBE][K_PROBE_KEY],
                            value=on[ref][cube[K_PROBE][K_PROBE_KEY]]))


def scrape_statcan_cubes() -> None:
    """四张宏观表(人口 / 临时居民 / GDP / 失业率)→ raw/statcan/。

    IN : StatCan WDS getCubeMetadata + getDataFromCubePidCoordAndLatestNPeriods(CUBES 清单)
    OUT: raw/statcan/<pid>.json 一表一文件(形见 docs/design/把脉页省份段-契约-20260906.md §1)
    一表一 try:某表失败打 ⚠ 保留它的旧文件,其余表照跑;收尾有失败就 exit 1 让本轮红。
    """
    say(CUBES_PRINT_OUT_TPL.format(path=paths.STATCAN, n=len(CUBES)))
    paths.STATCAN.mkdir(parents=True, exist_ok=True)
    failed = 0
    for cube in CUBES:
        try:
            scrape_statcan_cube(cube)
        except Exception as e:  # noqa: BLE001
            say(CUBE_FAIL_TPL.format(pid=cube[K_PID], name=type(e).__name__, detail=e))
            failed += 1
    if failed > 0:
        say(CUBES_FAIL_TPL.format(n=failed, total=len(CUBES)))
        sys.exit(1)
    say(CUBES_DONE_TPL.format(n=len(CUBES), path=paths.STATCAN))

# =========================================================================
# 6. 城市刻度(把脉页城市段批二:CSD 人口 + CMA 失业率 → raw/statcan/city_macro.json)
# =========================================================================


def city_keys() -> list:
    """要出行的城市键全集(CITY_CMA 键 ∪ CITY_POP_EXTRA,排序去重)。"""
    seen: set = set()
    out: list = []
    for key in list(CITY_CMA.keys()) + list(CITY_POP_EXTRA):
        if key not in seen:
            seen.add(key)
            out.append(key)
    out.sort()
    return out


def csd_key_of(member_name: str) -> str | None:
    """一个 CSD 成员名 → 城市键(City|PP);拆不出/省不在十省表 = None。"""
    m = re.match(CSD_NAME_RE, member_name)
    if m is None:
        return None
    prov = PROV_CODE.get(m.group("prov"))
    if prov is None:
        return None
    base = m.group("base")
    if CSD_BILINGUAL_SEP in base:
        base = base.split(CSD_BILINGUAL_SEP)[0]
    return base + CITY_KEY_SEP + prov


def csd_type_rank(typ: str) -> int:
    """市制类型 → 优先序位(不在优先表 = 排最后)。"""
    i = 0
    for t in CSD_TYPE_PREF:
        if t == typ:
            return i
        i += 1
    return len(CSD_TYPE_PREF)


def csd_pick(x: CsdPickIn) -> dict:
    """Geography 维 → {城市键: memberId},只收 wanted 里的键。
    同键多条按 CSD_TYPE_PREF 取排前的(Langley 城/乡、North Vancouver 城/区);
    同级撞名 = 歧义整城丢弃(打 ⚠ 不猜)。"""
    best: dict = {}
    ambig: set = set()
    for name, mid in x.dim.ids.items():
        m = re.match(CSD_NAME_RE, name)
        key = csd_key_of(name)
        if key is None or key not in x.wanted or m is None:
            continue
        rank = csd_type_rank(m.group("typ"))
        got = best.get(key)
        if got is None or rank < got[0]:
            best[key] = (rank, int(mid))
            ambig.discard(key)
            continue
        if rank == got[0]:
            ambig.add(key)
    out: dict = {}
    for key, pair in best.items():
        if key in ambig:
            say(CITY_AMBIG_TPL.format(key=key))
            continue
        out[key] = pair[1]
    return out


def latest_point_of(points: list) -> tuple | None:
    """一串 vectorDataPoint → (值, refPer);全空 = None(不折 0)。"""
    best: tuple | None = None
    for p in points:
        if p.get(K_VALUE) is None:
            continue
        ref = p.get(K_REF_PER)
        if best is None or str(ref) > str(best[1]):
            best = (to_number(p[K_VALUE]), str(ref))
    return best


def city_points_of(x: CityPointsIn) -> dict:
    """响应块 → {geo memberId: (值, refPer)}(从块自带 coordinate 首段反解;空块不落键)。"""
    out: dict = {}
    for blk in x.blocks:
        if blk.get(K_STATUS) != STATUS_SUCCESS:
            raise RuntimeError(WDS_STATUS_FAIL_TPL.format(status=blk.get(K_STATUS)))
        o = blk[K_OBJECT]
        gid = int(o[K_COORDINATE].split(COORD_SEP)[0])
        got = latest_point_of(o[K_VECTOR_DATA_POINT])
        if got is not None:
            out[gid] = got
    return out


def to_city_row(x: CityRowIn) -> dict:
    """一城一行(键序即文件契约;官方没有 = null 不折 0)。"""
    city, prov = x.key.split(CITY_KEY_SEP)
    pop = None
    pop_period = None
    if x.pop is not None:
        pop = x.pop[0]
        pop_period = x.pop[1]
    rate = None
    rate_period = None
    if x.unemp is not None:
        rate = x.unemp[0]
        rate_period = x.unemp[1]
    return {
        K_CITY: city, K_PROVINCE: prov,
        K_POP_VAL: pop, K_POP_PERIOD: pop_period,
        K_UNEMP_RATE: rate, K_UNEMP_PERIOD: rate_period,
        K_CMA: x.cma,
    }


def scrape_statcan_city() -> None:
    """城市刻度两张表 → raw/statcan/city_macro.json。

    IN : WDS 17100155(CSD 人口,年度)+ 14100459(CMA 失业率,月度三月均季调)
    OUT: raw/statcan/city_macro.json(一城一行;人工核定城市清单 CITY_CMA ∪ CITY_POP_EXTRA)
    🔴 失业率是 CMA 口径(素里=温哥华都会区值),行里带 cma 名,展示层列名写「都会区失业率」;
    不在 CMA 的城市该格 null。任一步抛错即整表不更新(保留旧文件)。
    """
    say(CITY_PRINT_OUT_TPL.format(path=OUT_CITY_MACRO))
    wanted_list = city_keys()
    wanted: set = set(wanted_list)

    pop_meta = wds_meta(CITY_POP_PID)
    pop_dim = dim_of(DimOfIn(meta=pop_meta, name=GEO_DIM, pid=CITY_POP_PID))
    pop_ids = csd_pick(CsdPickIn(dim=pop_dim, wanted=wanted))
    pop_requests: list = []
    for mid in pop_ids.values():
        pop_requests.append({K_PRODUCT_ID: CITY_POP_PID, K_COORDINATE: coord_str([mid]),
                             K_LATEST_N: CITY_POP_LATEST_N})
    pop_got = wds_data(WdsDataIn(requests=pop_requests))
    put_cached_page(CachePutIn(slug=CRAWL_SLUG,
                               url=CACHE_URL_TPL.format(url=WDS_DATA_URL, pid=CITY_POP_PID),
                               html=pop_got.text, title=pop_meta.title))
    pop_points = city_points_of(CityPointsIn(blocks=pop_got.blocks, pid=CITY_POP_PID))

    un_meta = wds_meta(CITY_UNEMP_PID)
    un_geo = dim_of(DimOfIn(meta=un_meta, name=GEO_DIM, pid=CITY_UNEMP_PID))
    lf = member_id_of(MemberIdIn(dim=dim_of(DimOfIn(meta=un_meta, name=CITY_LF_DIM,
                                                    pid=CITY_UNEMP_PID)),
                                 member=CITY_LF_MEMBER, pid=CITY_UNEMP_PID))
    stat = member_id_of(MemberIdIn(dim=dim_of(DimOfIn(meta=un_meta, name=CITY_STAT_DIM,
                                                      pid=CITY_UNEMP_PID)),
                                   member=CITY_STAT_MEMBER, pid=CITY_UNEMP_PID))
    dt = member_id_of(MemberIdIn(dim=dim_of(DimOfIn(meta=un_meta, name=CITY_DT_DIM,
                                                    pid=CITY_UNEMP_PID)),
                                 member=CITY_DT_MEMBER, pid=CITY_UNEMP_PID))
    cma_ids: dict = {}
    for cma_name in CITY_CMA.values():
        if cma_name in cma_ids:
            continue
        cma_ids[cma_name] = member_id_of(MemberIdIn(dim=un_geo, member=cma_name,
                                                    pid=CITY_UNEMP_PID))
    un_requests: list = []
    for gid in cma_ids.values():
        un_requests.append({K_PRODUCT_ID: CITY_UNEMP_PID,
                            K_COORDINATE: coord_str([gid, lf, stat, dt]),
                            K_LATEST_N: CITY_UNEMP_LATEST_N})
    un_got = wds_data(WdsDataIn(requests=un_requests))
    put_cached_page(CachePutIn(slug=CRAWL_SLUG,
                               url=CACHE_URL_TPL.format(url=WDS_DATA_URL, pid=CITY_UNEMP_PID),
                               html=un_got.text, title=un_meta.title))
    un_points = city_points_of(CityPointsIn(blocks=un_got.blocks, pid=CITY_UNEMP_PID))

    check_city_probe(CityProbeIn(pop_ids=pop_ids, pop_points=pop_points, cma_ids=cma_ids,
                                 un_points=un_points))

    rows: list = []
    pops = 0
    unemps = 0
    for key in wanted_list:
        pop = None
        mid = pop_ids.get(key)
        if mid is not None:
            pop = pop_points.get(mid)
        cma = CITY_CMA.get(key)
        unemp = None
        if cma is not None:
            gid = cma_ids.get(cma)
            if gid is not None:
                unemp = un_points.get(gid)
        if unemp is None:
            cma = None
        if pop is not None:
            pops += 1
        if unemp is not None:
            unemps += 1
        rows.append(to_city_row(CityRowIn(key=key, pop=pop, unemp=unemp, cma=cma)))
    payload = {
        K_SOURCE: list(CITY_MACRO_SRC),
        K_PIDS: [CITY_POP_PID, CITY_UNEMP_PID],
        K_FETCHED: today_iso(),
        K_CITY_ROWS: rows,
    }
    paths.write_json(paths.WriteJsonIn(path=OUT_CITY_MACRO, payload=payload, indent=INDENT_1))
    say(CITY_DONE_TPL.format(rows=len(rows), pops=pops, unemps=unemps, cmas=len(cma_ids),
                             out=OUT_CITY_MACRO.name))


def check_city_probe(x: CityProbeIn) -> None:
    """自校:多伦多市人口过量级线 + 多伦多 CMA 失业率在合理带(未过即抛保留旧表)。"""
    mid = x.pop_ids.get(CITY_POP_PROBE_CITY)
    pop = None
    if mid is not None:
        got = x.pop_points.get(mid)
        if got is not None:
            pop = got[0]
    if pop is None or pop <= CITY_POP_PROBE_MIN:
        raise RuntimeError(CITY_PROBE_FAIL_TPL.format(what=CITY_POP_PROBE_CITY, value=pop))
    gid = x.cma_ids.get(CITY_UNEMP_PROBE_CMA)
    rate = None
    if gid is not None:
        got = x.un_points.get(gid)
        if got is not None:
            rate = got[0]
    if rate is None or rate < CITY_UNEMP_PROBE_MIN or rate > CITY_UNEMP_PROBE_MAX:
        raise RuntimeError(CITY_PROBE_FAIL_TPL.format(what=CITY_UNEMP_PROBE_CMA, value=rate))
