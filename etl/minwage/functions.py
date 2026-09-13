"""
minwage 域函数 —— ESDC 最低工资数据库 → raw/minwage/minimum_wage.json(2026-09-13 立域,
Frank「省的话 这个省的法律要求 最低工资 是有用的」)。

一步:抓官方 JSON(原文先进 crawl 层)→ 挑一般成人档 → 辖区码归本站码 → 按地区、生效日升序落盘。
只抽不算:现行档 / 省 × 年序列在 mart 段派生(谁的数据谁清洗,跨源汇装住 mart)。
"""
from datetime import date

import httpx

import paths
from log.functions import say
from fetch.constants import HDR_UA, POLITE_UA
from crawl.functions import put_cached_page
from crawl.scheme import CachePutIn
from minwage.constants import (
    CACHE_TITLE, CRAWL_SLUG, FETCH_TIMEOUT_S, GENERAL_IND, IN_TPL, IN_URL, ISO_DATE_SEP, LANDING, MIN_ROWS,
    OUT_FILE, OUT_INDENT, OUT_TPL, PROV_CODE_MAP, RATE_TYPE_GENERAL, SOURCE_ROWS_TPL, SRC_DATE_LEN, SRC_DATE_SEP,
    TOO_FEW_TPL, WROTE_TPL,
)
from minwage.scheme import MinWageFile, MinWageRow, MinWageSource, RowIn, WageSourceRow


def scrape_minwage_rates() -> None:
    """本域唯一步:官方 JSON → 一般成人档逐次调整表。

    原文先进 crawl 层(put_cached_page)再抽;一般档 = `minimum_wage_ind == 1 且 rt_rate_type_id == 1`
    (2026-09-13 与官方 general.html 的 19 行逐行核过零差);行数低于防线整轮失败(宁可不更新,别灌半截)。
    """
    say(IN_TPL.format(url=IN_URL))
    say(OUT_TPL.format(path=OUT_FILE))
    r = httpx.get(IN_URL, headers={HDR_UA: POLITE_UA}, timeout=FETCH_TIMEOUT_S, follow_redirects=True)
    r.raise_for_status()
    put_cached_page(CachePutIn(slug=CRAWL_SLUG, url=IN_URL, html=r.text, title=CACHE_TITLE))
    source = MinWageSource.model_validate_json(r.text)
    codes: dict = {}
    for p in source.data.provinces:
        codes[p.prov_id] = PROV_CODE_MAP.get(p.province_code, p.province_code)
    rows: list = []
    for w in source.data.wages:
        if is_general(w):
            rows.append(to_row(RowIn(w=w, codes=codes)))
    say(SOURCE_ROWS_TPL.format(n=len(source.data.wages), general=len(rows)))
    if len(rows) < MIN_ROWS:
        raise RuntimeError(TOO_FEW_TPL.format(n=len(rows)))
    rows.sort(key=row_key)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out = MinWageFile(url=LANDING, fetched=date.today().isoformat(), rows=rows)
    paths.write_json(paths.WriteJsonIn(path=OUT_FILE, payload=out.model_dump(by_alias=True),
                                       indent=OUT_INDENT))
    provs: set = set()
    for row in rows:
        provs.add(row.province)
    say(WROTE_TPL.format(n=len(rows), provs=len(provs), latest=rows[-1].effective_date, fetched=out.fetched))


def is_general(w: WageSourceRow) -> bool:
    """这一行是不是一般成人档(两个标志格同时命中;学生/特定职业/注释行都不是)。"""
    return w.minimum_wage_ind == GENERAL_IND and w.rt_rate_type_id == RATE_TYPE_GENERAL


def to_row(x: RowIn) -> MinWageRow:
    """源调整行 + 辖区码表 → 产出行(日期取前十位并换成 ISO 分隔)。"""
    return MinWageRow(province=x.codes[x.w.prov_prov_id], effective_date=iso_date_of(x.w.effective_date),
                      expiry_date=iso_date_of(x.w.expiry_date), rate=x.w.minimum_wage_amount)


def iso_date_of(s: str) -> str:
    """源日期串(YYYY/MM/DD HH:MM:SS)→ YYYY-MM-DD;空串照空。"""
    if s == "":
        return s
    return s[:SRC_DATE_LEN].replace(SRC_DATE_SEP, ISO_DATE_SEP)


def row_key(r: MinWageRow) -> tuple:
    """落盘序:地区、生效日、时薪(同日两档时高档在后 —— 1965 年 NL 男女两档同日,读侧「取该日最后一行」得高档)。"""
    return (r.province, r.effective_date, r.rate)
