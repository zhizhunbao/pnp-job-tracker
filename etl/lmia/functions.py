"""
lmia 域函数 —— 全部行为住这(五件全溶,照样张 etl/company/functions.py;2026-08-30 批D)。

原 build_esdc_lmia_employers.py 溶入本文件,入口函数与原脚本同名(零参)。
方言律:零字符串(文案走 constants 的 *_TPL,落盘键住 to_* 行构造器)、显式循环、
一参令(多入参收 scheme 的 XxxIn)、日志只走 log.functions.say。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths 经 constants / log)。

产出的是「雇主雇过外国人的历史事实」,不是「能担保」判定(实现文档 §0 语义红线);
聚合键 = clean/05c 的 norm_name(与 AIP 匹配同一把尺子),那份实现不复制、importlib 拉。
"""
import importlib.util
import os
from pathlib import Path

import httpx

import paths
from log.functions import say
from lmia.constants import (
    CKAN_PKG, CKAN_TIMEOUT_S, DONE_TPL, DOWNLOAD_TIMEOUT_S, DOWNLOAD_TPL, ENV_KEEP_QUARTERS,
    HEADER_FIRST_COL, IN_TPL, IN_XLSX_DIR, KEEP_QUARTERS_DEFAULT, MIN_CELLS,
    NOC_RE, NORM_MODULE_NAME, NORM_MODULE_PATH, OUT_TABLE, OUT_TPL, PROBE_HIT_TPL,
    PROBE_MISS_TPL, PROBE_NAMES, QUARTER_RE, QUARTER_TPL, SKILLED_STREAM_RE, SOURCE_LABEL,
    XLSX_NAME_TPL,
)
from lmia.scheme import (
    AccumIn, CkanPackage, CountsIn, LmiaCells, LmiaCounts, LmiaEmployer, LmiaFileIn,
    NormNameFn, ParseQuarterIn, ProbeIn, QuarterSource,
)


# =========================================================================
# 1. 季度源清单与缓存(CKAN → 近 N 季 xlsx;已缓存季度不重下)
# =========================================================================


def load_norm_name() -> NormNameFn:
    """拉 clean/05c 的 norm_name(数字开头模块名常规 import 拉不动,走 importlib)。

    单一来源不复制:雇主聚合键与 AIP 匹配必须是同一把尺子,复制一份=给口径开岔。
    """
    spec = importlib.util.spec_from_file_location(NORM_MODULE_NAME, NORM_MODULE_PATH)
    # pyrefly: ignore[bad-argument-type] — spec_from_file_location 只在路径不存在时给 None;此处是仓内固定文件,拿不到就该当场炸
    mod = importlib.util.module_from_spec(spec)
    # pyrefly: ignore[missing-attribute] — 同上,spec 非 None 时 loader 恒在
    spec.loader.exec_module(mod)
    return mod.norm_name


def quarter_sort_key(src: QuarterSource) -> tuple:
    """季度源排序键:季度码 + URL(原元组 sort 的形状化)。"""
    return (src.quarter, src.url)


def list_quarter_urls() -> list[QuarterSource]:
    """CKAN → 季度源清单,只要 *_pos_en.xlsx,按季度升序,截近 KEEP_QUARTERS 个。"""
    keep = int(os.environ.get(ENV_KEEP_QUARTERS, KEEP_QUARTERS_DEFAULT))
    with httpx.Client(timeout=CKAN_TIMEOUT_S, follow_redirects=True) as c:
        r = c.get(CKAN_PKG)
        r.raise_for_status()
    out = []
    for res in CkanPackage.model_validate_json(r.text).result.resources:
        m = QUARTER_RE.search(res.url)
        if m is not None:
            out.append(QuarterSource(quarter=m.group(1).upper(), url=res.url))
    out.sort(key=quarter_sort_key)
    return out[-keep:]


def download(src: QuarterSource) -> Path:
    """季度 xlsx 落缓存目录并返回路径;已存在直接复用(增量:已缓存季度不重下)。"""
    IN_XLSX_DIR.mkdir(parents=True, exist_ok=True)
    dest = IN_XLSX_DIR / XLSX_NAME_TPL.format(quarter=src.quarter.lower())
    if dest.exists():
        return dest
    say(DOWNLOAD_TPL.format(quarter=src.quarter, url=src.url))
    with httpx.Client(timeout=DOWNLOAD_TIMEOUT_S, follow_redirects=True) as c:
        r = c.get(src.url)
        r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


# =========================================================================
# 2. 单季解析与雇主累加(表头在第 2 行;尾部注释行 Employer 空)
# =========================================================================


def cells_of(row: tuple) -> list:
    """一行单元格 → 去空白的文本列表(None 折空串)。"""
    out = []
    for c in row:
        if c is None:
            out.append("")
        else:
            out.append(str(c).strip())
    return out


def is_header(cells: list) -> bool:
    """是不是表头行(首列以 Province 开头)。"""
    return len(cells) > 0 and cells[0].startswith(HEADER_FIRST_COL)


def to_lmia_cells(cells: list) -> LmiaCells:
    """数据行 → 真用到的六格(列序=源表列序:省/股别/雇主/地址/职业/法人身份/LMIA/职位)。"""
    return LmiaCells(prov=cells[0], stream=cells[1], employer=cells[2], occ=cells[4],
                     lmias=cells[6], positions=cells[7])


def to_counts(x: CountsIn) -> LmiaCounts | None:
    """两格计数文本 → LmiaCounts;非数字(注释残留)返回 None 交调用方跳过。"""
    try:
        return LmiaCounts(lmias=int(float(x.lmias or 0)), positions=int(float(x.positions or 0)))
    except ValueError:
        return None


def accumulate_row(x: AccumIn) -> None:
    """一行落进累加体:省集合、股别/季度/NOC 分桶、总计与技能类小计。"""
    e = x.table.get(x.key)
    if e is None:
        e = LmiaEmployer(name=x.cells.employer)
        x.table[x.key] = e
    e.provinces.add(x.cells.prov)
    e.streams[x.cells.stream] = e.streams.get(x.cells.stream, 0) + x.counts.positions
    if SKILLED_STREAM_RE.search(x.cells.stream):
        e.positions_skilled += x.counts.positions
    q = e.quarters.get(x.quarter)
    if q is None:
        q = [0, 0]
        e.quarters[x.quarter] = q
    q[0] += x.counts.lmias
    q[1] += x.counts.positions
    e.lmias += x.counts.lmias
    e.positions += x.counts.positions
    m = NOC_RE.match(x.cells.occ)
    if m is not None:
        noc = m.group(1).zfill(5)
        e.nocs[noc] = e.nocs.get(noc, 0) + x.counts.positions


def parse_quarter(x: ParseQuarterIn) -> int:
    """单季 XLSX → 累加进 table[聚合键],返回本季吃进的行数。

    openpyxl 延迟 import:本域外不需要它(镜像 Dockerfile 需装 openpyxl)。
    """
    import openpyxl

    wb = openpyxl.load_workbook(x.path, read_only=True)
    ws = wb.active
    header_seen = False
    kept = 0
    # pyrefly: ignore[missing-attribute] — openpyxl 存根把 wb.active 标成可空(空工作簿档);这里是官方 xlsx,拿不到就该炸
    for row in ws.iter_rows(values_only=True):
        cells = cells_of(row)
        if not header_seen:
            if is_header(cells):
                header_seen = True
            continue
        if len(cells) < MIN_CELLS or cells[2] == "":
            continue
        parsed = to_lmia_cells(cells)
        key = x.norm_name(parsed.employer)
        if key == "":
            continue
        counts = to_counts(CountsIn(lmias=parsed.lmias, positions=parsed.positions))
        if counts is None:
            continue
        accumulate_row(AccumIn(table=x.table, key=key, cells=parsed, counts=counts,
                               quarter=x.quarter))
        kept += 1
    wb.close()
    return kept


# =========================================================================
# 3. 落盘与收口探针(维护表 = 雇主 → 聚合事实;09 消费)
# =========================================================================


def to_employer_row(e: LmiaEmployer) -> dict:
    """累加体 → 落盘行(省集合排序成列表,末尾派生 lastQuarter)。"""
    return {
        "name": e.name,
        "provinces": sorted(e.provinces),
        "streams": e.streams,
        "quarters": e.quarters,
        "lmias": e.lmias,
        "positions": e.positions,
        "positionsSkilled": e.positions_skilled,
        "nocs": e.nocs,
        "lastQuarter": max(e.quarters),
    }


def to_lmia_file(x: LmiaFileIn) -> dict:
    """落盘文件形状(出处 + 覆盖季度 + 雇主表)。"""
    return {"source": SOURCE_LABEL, "quarters": x.quarters, "employers": x.employers}


def say_probe(x: ProbeIn) -> None:
    """收口探针一行:命中打职位数与最新季度,没中打破折号。"""
    e = x.table.get(x.key)
    if e is None:
        say(PROBE_MISS_TPL.format(probe=x.probe))
        return
    say(PROBE_HIT_TPL.format(probe=x.probe, positions=e.positions, quarter=max(e.quarters)))


def build_esdc_lmia_employers() -> None:
    """近 N 季 ESDC 获批正面 LMIA 雇主清单 → 按雇主聚合的维护表(只刷 raw 不灌库)。"""
    quarters = list_quarter_urls()
    say(IN_TPL.format(dir=IN_XLSX_DIR, n=len(quarters), first=quarters[0].quarter,
                      last=quarters[-1].quarter))
    say(OUT_TPL.format(path=OUT_TABLE))
    norm_name = load_norm_name()
    table: dict = {}
    quarter_names = []
    for src in quarters:
        path = download(src)
        kept = parse_quarter(ParseQuarterIn(path=path, quarter=src.quarter, table=table,
                                            norm_name=norm_name))
        say(QUARTER_TPL.format(quarter=src.quarter, n=kept))
        quarter_names.append(src.quarter)
    employers = {}
    for key, e in table.items():
        employers[key] = to_employer_row(e)
    payload = to_lmia_file(LmiaFileIn(quarters=quarter_names, employers=employers))
    paths.write_json(paths.WriteJsonIn(path=OUT_TABLE, payload=payload, indent=0, compact=True))
    say(DONE_TPL.format(n=len(table), name=OUT_TABLE.name,
                        mb=OUT_TABLE.stat().st_size / 1e6))
    for probe in PROBE_NAMES:
        say_probe(ProbeIn(table=table, key=norm_name(probe), probe=probe))
