"""
wages 域函数 —— 全部行为住这(五件全溶,照样张 etl/company/functions.py;2026-08-30 批D)。

三个步骤文件溶入本文件成三段,各段入口函数与原脚本同名(入口一律零参):
build_esdc_wage_medians / build_statcan_jvws / build_statcan_jvws_mart。
方言律:零字符串(文案走 constants 的 *_TPL,列名与落盘键住 to_* 行构造器)、显式循环、
一参令(多入参收 scheme 的 XxxIn)、日志只走 log.functions.say。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths 经 constants / log)。
"""
import csv
import io
import json
import os
import subprocess
import zipfile
from datetime import date

import httpx

import paths
from log.functions import say
from wages.constants import (
    COL_COORDINATE, COL_REF_DATE, COL_STATUS, COL_VALUE, COORD_SEP, CSV_BOM_ENCODING, CURL_CMD,
    CURL_FAIL_TPL, CURL_FLAG_DATA, CURL_FLAG_HEADER, CURL_FLAG_MAX_TIME, CURL_FLAG_METHOD,
    CURL_FLAG_OUT, CURL_FLAG_UA, CURL_HDR_JSON, CURL_METHOD_POST, DATE_SEP, ENV_JVWS_QUARTERS,
    IN_JVWS_ZIP, IN_MART_TABLE, IN_WAGE_CSV, JVWS_ARCHIVE_CURRENT, JVWS_CACHED_TPL,
    JVWS_CSV_NAME_TPL, JVWS_CUBE_URL, JVWS_DEFINITION_QUOTE, JVWS_DIM_GEO, JVWS_DIM_MISSING_TPL,
    JVWS_DIM_NOC, JVWS_DIM_STAT, JVWS_DONE_TPL, JVWS_DOWNLOAD_TPL, JVWS_FILTER_TPL, JVWS_GEO_LEVELS,
    JVWS_IN_TPL, JVWS_META_FAIL_TPL, JVWS_META_TIMEOUT_S, JVWS_META_TPL, JVWS_NOC_CODE_LEN,
    JVWS_NOC_VERSION_QUOTE, JVWS_NOT_CURRENT_TPL, JVWS_OUT_TPL, JVWS_PROBE_DASH,
    JVWS_PROBE_HEAD_TPL, JVWS_PROBE_LABELS, JVWS_PROBE_TPL, JVWS_PRODUCT_ID, JVWS_PROV_CODE,
    JVWS_QUARTERS_DEFAULT, JVWS_QUARTER_TPL, JVWS_SAVED_TPL, JVWS_STAT_MISSING_TPL,
    JVWS_STAT_VACANCIES, JVWS_STATUS_HEAD_LEN, JVWS_TABLE_NO, JVWS_TITLE_TPL, JVWS_UA,
    JVWS_WDS_CSV_LINK, JVWS_WDS_META, JVWS_ZIP_TIMEOUT_S, MART_DONE_TPL, MART_IN_TPL, MART_OUT_TPL,
    MART_UNAVAILABLE_QUALITY, MONTH_LEN, MONTH_QUARTER, OUT_JVWS_TABLE, OUT_MART, OUT_WAGE_TABLE,
    PROV_NAT, READ_ERRORS, TEXT_ENCODING, WAGE_ANNUAL_FLAG_TRUE, WAGE_CACHED_TPL, WAGE_DONE_TPL,
    WAGE_DOWNLOAD_TPL, WAGE_ER_PROVINCE_LEN, WAGE_HOURS_PER_YEAR, WAGE_NOC_PREFIX, WAGE_OUT_INDENT,
    WAGE_PROBE_NOCS, WAGE_PROBE_PROV, WAGE_PROBE_TPL, WAGE_ROUND_DIGITS, WAGE_TIMEOUT_S, WAGE_URL,
)
from wages.scheme import (
    CurlGetIn, DimensionAtIn, HourlyIn, JvwsBufRow, JvwsDimension, JvwsExtractOut, JvwsFact,
    JvwsFactIn, JvwsFileIn, JvwsMeta, JvwsMetaEnvelope, JvwsProbeIn, JvwsRawFile, JvwsRawRow,
    JvwsSayProbeIn, JvwsScanIn, JvwsScanOut, MartRowIn, WageCsvRow, WageEntryIn, WagePair,
    WageProbeIn,
)


# =========================================================================
# 1. ESDC/Job Bank 中位工资(NOC 2021 五位码 × 经济区的 low/median/high)
# =========================================================================


def download_wage_csv() -> str:
    """源 CSV 落缓存并返回文本;已缓存直接读(可重下,删缓存即刷新)。"""
    IN_WAGE_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_WAGE_CSV.exists():
        say(WAGE_CACHED_TPL.format(path=IN_WAGE_CSV))
        return IN_WAGE_CSV.read_text(encoding=CSV_BOM_ENCODING, errors=READ_ERRORS)
    say(WAGE_DOWNLOAD_TPL.format(url=WAGE_URL))
    with httpx.Client(timeout=WAGE_TIMEOUT_S, follow_redirects=True) as c:
        r = c.get(WAGE_URL)
        r.raise_for_status()
    IN_WAGE_CSV.write_bytes(r.content)
    return r.content.decode(CSV_BOM_ENCODING, errors=READ_ERRORS)


def to_wage_csv_row(r: dict) -> WageCsvRow:
    """源 CSV 一行 → 洗净事实(列名只住本函数体内,⑩ 号方言律)。"""
    return WageCsvRow(
        noc=(r.get("NOC_CNP") or "").replace(WAGE_NOC_PREFIX, "").strip(),
        prov=(r.get("prov") or "").strip().upper(),
        er=(r.get("ER_Code_Code_RE") or "").strip(),
        annual_flag=(r.get("Annual_Wage_Flag_Salaire_annuel") or "").strip() == WAGE_ANNUAL_FLAG_TRUE,
        median=r.get("Median_Wage_Salaire_Median") or "",
        low=r.get("Low_Wage_Salaire_Minium") or "",
        high=r.get("High_Wage_Salaire_Maximal") or "",
        year=(r.get("Reference_Period") or "").strip(),
    )


def to_hr_yr(x: HourlyIn) -> WagePair | None:
    """工资文本 → 时薪+年薪两口径;空或非数字返回 None(缺则不写键)。"""
    raw = x.raw.strip()
    if raw == "":
        return None
    try:
        v = float(raw)
    except ValueError:
        return None
    if x.annual_flag:
        return WagePair(hourly=round(v / WAGE_HOURS_PER_YEAR, WAGE_ROUND_DIGITS), annual=round(v))
    return WagePair(hourly=v, annual=round(v * WAGE_HOURS_PER_YEAR))


def to_wage_entry(x: WageEntryIn) -> dict:
    """一个 NOC×地区 的落盘 entry(low/high/year 缺则不写键,同源数据一并抽出)。"""
    entry: dict = {"hourly": x.median.hourly, "annual": x.median.annual}
    if x.low is not None:
        entry["lowHourly"] = x.low.hourly
        entry["lowAnnual"] = x.low.annual
    if x.high is not None:
        entry["highHourly"] = x.high.hourly
        entry["highAnnual"] = x.high.annual
    if x.year != "":
        entry["year"] = x.year
    return entry


def is_kept_geography(row: WageCsvRow) -> bool:
    """只取「省级」(prov 是省码 + ER_Code 为 4 位 = 整省)与「国家级」(prov=NAT)兜底;
    经济区(6 位)粒度先不要。"""
    is_province = row.prov != PROV_NAT and len(row.er) == WAGE_ER_PROVINCE_LEN
    return row.noc != "" and (is_province or row.prov == PROV_NAT)


def say_wage_probe(x: WageProbeIn) -> None:
    """收口探针一行:某 NOC 的全国与安省 entry 原样打。"""
    by_prov = x.table.get(x.noc)
    if by_prov is None:
        by_prov = {}
    say(WAGE_PROBE_TPL.format(noc=x.noc, nat=by_prov.get(PROV_NAT),
                              on=by_prov.get(WAGE_PROBE_PROV)))


def build_esdc_wage_medians() -> None:
    """ESDC 工资开放数据 → 我们维护的「NOC×地区 中位工资」维度表。

    Annual_Wage_Flag=1 → 数值是年薪率,否则是时薪;统一存 hourly + annual 便于对比/显示。
    中位是必备(无中位整条跳过),low/high 可能为空,缺则不写。
    """
    text = download_wage_csv()
    reader = csv.DictReader(io.StringIO(text))
    table: dict = {}
    kept = 0
    for r in reader:
        row = to_wage_csv_row(r)
        if not is_kept_geography(row):
            continue
        median = to_hr_yr(HourlyIn(raw=row.median, annual_flag=row.annual_flag))
        if median is None:
            continue
        entry = to_wage_entry(WageEntryIn(
            median=median,
            low=to_hr_yr(HourlyIn(raw=row.low, annual_flag=row.annual_flag)),
            high=to_hr_yr(HourlyIn(raw=row.high, annual_flag=row.annual_flag)),
            year=row.year))
        by_prov = table.get(row.noc)
        if by_prov is None:
            by_prov = {}
            table[row.noc] = by_prov
        by_prov[row.prov] = entry
        kept += 1
    paths.write_json(paths.WriteJsonIn(path=OUT_WAGE_TABLE, payload=table,
                                       indent=WAGE_OUT_INDENT, sort_keys=True))
    say(WAGE_DONE_TPL.format(n=len(table), kept=kept))
    for noc in WAGE_PROBE_NOCS:
        say_wage_probe(WageProbeIn(table=table, noc=noc))


# =========================================================================
# 2. StatCan JVWS 空缺岗位(E14-01:担保率的分母;全表流式过滤到省级)
# =========================================================================


def curl_get(x: CurlGetIn) -> str | None:
    """走 curl 子进程取一个 URL(落盘则返回 None,否则返回响应体文本)。

    statcan.gc.ca 用 httpx 直连**实测 100% ConnectError/握手超时**(WinError 10054,
    重试 5 次仍失败;curl 走 schannel + 强制 http/1.1 能稳定连上,同一台机同一网络)。
    """
    args = list(CURL_CMD) + [CURL_FLAG_MAX_TIME, str(x.timeout), CURL_FLAG_UA, JVWS_UA]
    if x.out_path is not None:
        args += [CURL_FLAG_OUT, str(x.out_path)]
    args.append(x.url)
    result = subprocess.run(args, capture_output=(x.out_path is None), text=(x.out_path is None))
    if result.returncode != 0:
        raise RuntimeError(CURL_FAIL_TPL.format(code=result.returncode, url=x.url))
    if x.out_path is None:
        return result.stdout
    return None


def to_cube_query(product_id: int) -> str:
    """WDS getCubeMetadata 的请求体(单表查询)。"""
    return json.dumps([{"productId": product_id}])


def to_csv_url(text: str) -> str:
    """getFullTableDownloadCSV 的响应 → 真实 zip 直链。"""
    return json.loads(text)["object"]


def fetch_metadata() -> JvwsMeta:
    """WDS getCubeMetadata 实查 —— 每次跑都验一遍表还在(CURRENT)、拿最新 releaseTime,
    不缓存(便宜);不是 CURRENT 就整轮失败,禁止凭旧表号继续跑。"""
    args = list(CURL_CMD) + [
        CURL_FLAG_MAX_TIME, str(JVWS_META_TIMEOUT_S), CURL_FLAG_UA, JVWS_UA,
        CURL_FLAG_METHOD, CURL_METHOD_POST, JVWS_WDS_META,
        CURL_FLAG_HEADER, CURL_HDR_JSON,
        CURL_FLAG_DATA, to_cube_query(JVWS_PRODUCT_ID),
    ]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(JVWS_META_FAIL_TPL.format(code=result.returncode, detail=result.stderr))
    meta = JvwsMetaEnvelope.model_validate(json.loads(result.stdout)[0]).object
    if not meta.archive_status_en.startswith(JVWS_ARCHIVE_CURRENT):
        raise RuntimeError(JVWS_NOT_CURRENT_TPL.format(table=JVWS_TABLE_NO,
                                                       status=meta.archive_status_en))
    return meta


def download_zip() -> None:
    """全表 CSV 的 zip 落缓存(~97MB);已缓存直接用,删除后重跑可强制刷新。"""
    if IN_JVWS_ZIP.exists():
        say(JVWS_CACHED_TPL.format(path=IN_JVWS_ZIP))
        return
    IN_JVWS_ZIP.parent.mkdir(parents=True, exist_ok=True)
    # pyrefly: ignore[bad-argument-type] — out_path=None 那一档 curl_get 必回响应体文本(落盘档才回 None)
    csv_url = to_csv_url(curl_get(CurlGetIn(url=JVWS_WDS_CSV_LINK, out_path=None,
                                            timeout=JVWS_ZIP_TIMEOUT_S)))
    say(JVWS_DOWNLOAD_TPL.format(url=csv_url))
    curl_get(CurlGetIn(url=csv_url, out_path=IN_JVWS_ZIP, timeout=JVWS_ZIP_TIMEOUT_S))
    say(JVWS_SAVED_TPL.format(path=IN_JVWS_ZIP, mb=IN_JVWS_ZIP.stat().st_size / 1e6))


def dimension_at(x: DimensionAtIn) -> JvwsDimension:
    """按维度位取维度(缺了整轮失败 —— 源改版必须当场红)。"""
    for d in x.meta.dimension:
        if d.dimension_position_id == x.position:
            return d
    raise RuntimeError(JVWS_DIM_MISSING_TPL.format(position=x.position))


def vacancies_stat_id(stat: JvwsDimension) -> str:
    """统计量维度里 Job vacancies 的成员 ID(坐标第三段按它过滤)。"""
    for m in stat.member:
        if m.member_name_en == JVWS_STAT_VACANCIES:
            return str(m.member_id)
    raise RuntimeError(JVWS_STAT_MISSING_TPL.format(name=JVWS_STAT_VACANCIES))


def geo_prov_map(geo: JvwsDimension) -> dict:
    """地理成员 ID → 省码(只留 Canada+10 省+3 准州,经济区不取)。"""
    out = {}
    for m in geo.member:
        if m.geo_level in JVWS_GEO_LEVELS:
            out[str(m.member_id)] = JVWS_PROV_CODE[m.member_name_en]
    return out


def noc_code_map(noc: JvwsDimension) -> dict:
    """NOC 成员 ID → 五位码(只留叶节点;与本站 NOC 2021 v1.0 同版本,无需映射)。"""
    out = {}
    for m in noc.member:
        if m.classification_code is not None and len(m.classification_code) == JVWS_NOC_CODE_LEN:
            out[str(m.member_id)] = m.classification_code
    return out


def scan_zip(x: JvwsScanIn) -> JvwsScanOut:
    """流式扫全表 CSV(解压后 1.18GB,**不整表落库**),留省级 × 五位 NOC × 空缺岗位的行。"""
    z = zipfile.ZipFile(IN_JVWS_ZIP)
    dates_order: list = []
    buf: list = []
    with z.open(JVWS_CSV_NAME_TPL.format(product_id=JVWS_PRODUCT_ID)) as f:
        tf = io.TextIOWrapper(f, encoding=CSV_BOM_ENCODING, newline="")
        reader = csv.reader(tf)
        header = next(reader)
        idx = {}
        for i, name in enumerate(header):
            idx[name] = i
        for row in reader:
            ref_date = row[idx[COL_REF_DATE]]
            if len(dates_order) == 0 or dates_order[-1] != ref_date:
                dates_order.append(ref_date)
            geo_id, noc_id, stat_id = row[idx[COL_COORDINATE]].split(COORD_SEP)
            if stat_id != x.stat_id:
                continue
            prov = x.geo_map.get(geo_id)
            noc = x.noc_map.get(noc_id)
            if prov is None or noc is None:
                continue
            buf.append(JvwsBufRow(ref_date=ref_date, province=prov, noc=noc,
                                  value=row[idx[COL_VALUE]], status=row[idx[COL_STATUS]]))
    z.close()
    return JvwsScanOut(buf=buf, dates=dates_order)


def quarter_of(ref_date: str) -> str:
    """参考期(YYYY-MM)→ 季度码(YYYYQn)。"""
    y, m = ref_date.split(DATE_SEP)
    return JVWS_QUARTER_TPL.format(year=y, q=MONTH_QUARTER[m])


def to_jvws_fact(x: JvwsFactIn) -> JvwsFact:
    """候选行 → 空缺事实:VALUE 空写 None **不折 0**(官方抑制值不能替官方编数字);
    STATUS 空串折 None(A-F 质量等级 / '..' 未采集 / 'x' 保密抑制原样保留)。"""
    if x.row.value.strip() == "":
        vacancies = None
    else:
        vacancies = int(x.row.value)
    if x.row.status == "":
        quality = None
    else:
        quality = x.row.status
    return JvwsFact(quarter=x.quarter, ref_date=x.row.ref_date, province=x.row.province,
                    noc=x.row.noc, vacancies=vacancies, quality=quality)


def extract_rows(meta: JvwsMeta) -> JvwsExtractOut:
    """全表 → 省级 × 五位 NOC × Job vacancies,截取最近 KEEP_QUARTERS 季度。"""
    geo_map = geo_prov_map(dimension_at(DimensionAtIn(meta=meta, position=JVWS_DIM_GEO)))
    noc_map = noc_code_map(dimension_at(DimensionAtIn(meta=meta, position=JVWS_DIM_NOC)))
    stat_id = vacancies_stat_id(dimension_at(DimensionAtIn(meta=meta, position=JVWS_DIM_STAT)))
    say(JVWS_FILTER_TPL.format(geo=len(geo_map), noc=len(noc_map)))
    scanned = scan_zip(JvwsScanIn(geo_map=geo_map, noc_map=noc_map, stat_id=stat_id))
    keep = int(os.environ.get(ENV_JVWS_QUARTERS, JVWS_QUARTERS_DEFAULT))
    keep_dates = set(scanned.dates[-keep:])
    quarters_map = {}
    for d in keep_dates:
        quarters_map[d] = quarter_of(d)
    facts = []
    for row in scanned.buf:
        if row.ref_date not in keep_dates:
            continue
        facts.append(to_jvws_fact(JvwsFactIn(row=row, quarter=quarters_map[row.ref_date])))
    return JvwsExtractOut(facts=facts, quarters=sorted(quarters_map.values()))


def to_jvws_row(f: JvwsFact) -> dict:
    """空缺事实 → 落盘行(键序 = 原维护表键序)。"""
    return {
        "quarter": f.quarter,
        "refDate": f.ref_date,
        "province": f.province,
        "noc": f.noc,
        "vacancies": f.vacancies,
        "quality": f.quality,
    }


def to_jvws_file(x: JvwsFileIn) -> dict:
    """维护表整体形状(出处段带 quote-anchored 证据 + 覆盖季度 + 行)。"""
    return {
        "source": {
            "table": JVWS_TABLE_NO,
            "productId": JVWS_PRODUCT_ID,
            "cubeTitleEn": x.meta.cube_title_en,
            "url": JVWS_CUBE_URL,
            "releaseTime": x.meta.release_time,
            "definitionQuote": JVWS_DEFINITION_QUOTE,
            "nocVersionQuote": JVWS_NOC_VERSION_QUOTE,
            "fetched": x.fetched,
        },
        "quarters": x.quarters,
        "rows": x.rows,
    }


def jvws_probe(x: JvwsProbeIn) -> JvwsFact | None:
    """全国口径某季某 NOC 的事实(探针用,没有就 None)。"""
    for f in x.facts:
        if f.quarter == x.quarter and f.province == PROV_NAT and f.noc == x.noc:
            return f
    return None


def say_jvws_probe(x: JvwsSayProbeIn) -> None:
    """收口探针一行(没命中打破折号,质量码打 None)。"""
    hit = jvws_probe(JvwsProbeIn(facts=x.facts, quarter=x.quarter, noc=x.noc))
    if hit is None:
        vacancies = JVWS_PROBE_DASH
        quality = None
    else:
        vacancies = hit.vacancies
        quality = hit.quality
    say(JVWS_PROBE_TPL.format(noc=x.noc, label=x.label, vacancies=vacancies, quality=quality))


def build_statcan_jvws() -> None:
    """StatCan 表 14-10-0444-01 → 近 N 季度的 NOC×省 空缺岗位维护表。"""
    say(JVWS_IN_TPL.format(path=IN_JVWS_ZIP))
    say(JVWS_OUT_TPL.format(path=OUT_JVWS_TABLE))
    meta = fetch_metadata()
    say(JVWS_TITLE_TPL.format(table=JVWS_TABLE_NO, title=meta.cube_title_en))
    say(JVWS_META_TPL.format(status=meta.archive_status_en[:JVWS_STATUS_HEAD_LEN],
                             release=meta.release_time,
                             start=meta.cube_start_date[:MONTH_LEN],
                             end=meta.cube_end_date[:MONTH_LEN]))
    download_zip()
    extracted = extract_rows(meta)
    rows = []
    published = 0
    for f in extracted.facts:
        rows.append(to_jvws_row(f))
        if f.vacancies is not None:
            published += 1
    OUT_JVWS_TABLE.parent.mkdir(parents=True, exist_ok=True)
    payload = to_jvws_file(JvwsFileIn(meta=meta, fetched=date.today().isoformat(),
                                      quarters=extracted.quarters, rows=rows))
    paths.write_json(paths.WriteJsonIn(path=OUT_JVWS_TABLE, payload=payload,
                                       indent=0, compact=True))
    say(JVWS_DONE_TPL.format(n=len(rows), first=extracted.quarters[0],
                             last=extracted.quarters[-1], published=published,
                             suppressed=len(rows) - published, name=OUT_JVWS_TABLE.name,
                             mb=OUT_JVWS_TABLE.stat().st_size / 1e6))
    latest = extracted.quarters[-1]
    say(JVWS_PROBE_HEAD_TPL.format(quarter=latest))
    for noc, label in JVWS_PROBE_LABELS.items():
        say_jvws_probe(JvwsSayProbeIn(facts=extracted.facts, quarter=latest, noc=noc, label=label))


# =========================================================================
# 3. JVWS 列对齐表(E14-01;不进 09 主链 —— join key = noc,无先后耦合)
# =========================================================================


def is_available(r: JvwsRawRow) -> bool:
    """消费端一眼判断可不可信:有值且质量码不在「不发布/未采集/抑制」里。"""
    return r.vacancies is not None and r.quality not in MART_UNAVAILABLE_QUALITY


def to_mart_row(x: MartRowIn) -> dict:
    """原始行 → mart 行(列对齐 docs/sql/e14-01-jvws-vacancies.sql 的 jvws_vacancies)。"""
    return {
        "noc": x.row.noc,
        "province": x.row.province,
        "quarter": x.row.quarter,
        "refDate": x.row.ref_date,
        "vacancies": x.row.vacancies,
        "quality": x.row.quality,
        "available": is_available(x.row),
        "sourceUrl": x.source_url,
        "fetched": x.fetched,
    }


def build_statcan_jvws_mart() -> None:
    """data/raw/jvws/jvws-vacancies.json → data/mart/jvws_vacancies.json(seed 灌库前最后一步)。"""
    say(MART_IN_TPL.format(path=IN_MART_TABLE))
    say(MART_OUT_TPL.format(path=OUT_MART))
    data = JvwsRawFile.model_validate_json(IN_MART_TABLE.read_text(encoding=TEXT_ENCODING))
    rows = []
    avail = 0
    for r in data.rows:
        rows.append(to_mart_row(MartRowIn(row=r, source_url=data.source.url,
                                          fetched=data.source.fetched)))
        if is_available(r):
            avail += 1
    OUT_MART.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_MART, payload=rows, indent=0, compact=True))
    say(MART_DONE_TPL.format(n=len(rows), first=data.quarters[0], last=data.quarters[-1],
                             avail=avail, suppressed=len(rows) - avail, name=OUT_MART.name,
                             mb=OUT_MART.stat().st_size / 1e6))
