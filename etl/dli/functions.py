"""
dli 域函数 —— 全部行为住这(五件全溶,照样张 etl/company/functions.py;2026-08-30 批D)。

原 build_ircc_dli_pgwp.py 溶入本文件,入口函数与原脚本同名(零参)。
方言律:零字符串(文案走 constants 的 *_TPL,源列名/驼峰键住 scheme 的别名)、
显式循环(推导/genexp/lambda 出局)、一参令(多入参收 scheme 的 XxxIn)、
日志只走 log.functions.say(裸 print 退役)。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths/log)。

金源 = IRCC「Designated learning institutions list」页 DataTables 的 ajaxSource
(官方机器可读 JSON,httpx 直取);范围化(规划 §6,不建全 DLI 目录):只取
**PGWP=Yes** 行(约 495 行)→ 按 DLI# 去重成院校级(约 295 所,记 campuses 数)。
省名→省码映射;未知省**跳过**(宁可留空不瞎猜)。
"""
from datetime import date

import httpx

import paths
from log.functions import say
from fetch.constants import HDR_UA, POLITE_UA
from dli.constants import (
    COLLEGE_RE, KIND_COLLEGE, KIND_OTHER, KIND_UNIVERSITY, UNIVERSITY_RE,
    ATLANTIC, CITY_SEP, FETCH_TIMEOUT_S, IN_TPL, IN_URL, LANDING, MIN_ROWS, NAME_ZH, OUT_FILE, OUT_INDENT, OUT_TPL,
    PROV_CODE, PUBLIC_TOKEN, SKIPPED_TPL, SOURCE_ROWS_TPL, TEXT_ENCODING, TOO_FEW_TPL,
    WROTE_TPL, YES,
)
from dli.scheme import (
    DliFile, DliFold, DliRow, DliRowIn, DliSource, DliSourceRow, PublicCount,
)


# =========================================================================
# 1. PGWP 可申 DLI 子集(E12-03,旗舰②学校数据·范围化;本域唯一步)
# =========================================================================


def dli_sort_key(row: DliRow) -> tuple:
    """落盘排序键:省码 + 校名 + 校区城(2026-09-12 粒度改校 × 城,城殿后稳序)。"""
    return (row.province, row.name, row.city)


def split_cities(raw: str) -> list[str]:
    """源 City 格 → 单城清单:按逗号拆、去首尾空白、丢空段(一行可带多城逗号串)。"""
    out: list[str] = []
    for piece in raw.split(CITY_SEP):
        city = piece.strip()
        if city != "":
            out.append(city)
    return out


def kind_of(name: str) -> str:
    """校名 → 院校种类(2026-09-12 Frank「这个应该加一个 大学 和 学院的 筛选吧」):官方名单没有种类格,
    按校名判词派生 —— 大学判词优先("University College" 算大学),再学院,其余 other。"""
    if UNIVERSITY_RE.search(name) is not None:
        return KIND_UNIVERSITY
    if COLLEGE_RE.search(name) is not None:
        return KIND_COLLEGE
    return KIND_OTHER


def to_dli_row(x: DliRowIn) -> DliRow:
    """源行 + 已查得的省码与单城 → 校 × 城行(campuses 由调用方统好后回填)。"""
    name = x.source.institution.strip()
    return DliRow(
        province=x.province,
        name=name,
        name_zh=NAME_ZH.get(name, ""),
        dli_number=x.source.dli_number.strip(),
        city=x.city,
        campuses=1,
        is_public=PUBLIC_TOKEN in x.source.sector,
        grad_program=x.source.grad_program == YES,
        kind=kind_of(name),
    )


def fold_pgwp_rows(rows: list[DliSourceRow]) -> DliFold:
    """全量源行 → 校 × 城行:只留 PGWP=Yes,按 (DLI#, 城) 去重。

    2026-09-12 重写(Frank「dli 院校没有大学吗」实撞):原「同号取首行主城」把
    U of T 记在 Mississauga、McGill 记在 Macdonald 校区城、UBC 的 "Kelowna, Vancouver"
    整串对不上任何城 —— 改为源 City 逗号串拆开,一校区城一行;campuses 仍记该校
    源行总数(全校同值,先数后回填)。
    未知省名不猜,记进 skipped 交调用方留痕;DLI# 为空的行丢弃(去重键缺了没法建档)。
    """
    campus_n: dict[str, int] = {}
    by_key: dict[tuple[str, str], DliRow] = {}
    skipped: list[str] = []
    for row in rows:
        if row.pgwp != YES:
            continue
        prov = PROV_CODE.get(row.province.strip())
        if prov is None:
            if row.province not in skipped:
                skipped.append(row.province)
            continue
        num = row.dli_number.strip()
        if num == "":
            continue
        campus_n[num] = campus_n.get(num, 0) + 1
        for city in split_cities(row.city):
            key = (num, city)
            if key not in by_key:
                by_key[key] = to_dli_row(DliRowIn(source=row, province=prov, city=city))
    out: list[DliRow] = []
    for (num, _), built in by_key.items():
        built.campuses = campus_n[num]
        out.append(built)
    return DliFold(rows=out, skipped=skipped)


def count_public(rows: list[DliRow]) -> PublicCount:
    """收口探针:公立院校数 + 大西洋四省公立院校数(按 DLI# 去重 ——
    2026-09-12 粒度改校 × 城后,一校多城多行,直接数行会虚高)。"""
    public: set[str] = set()
    atlantic: set[str] = set()
    for row in rows:
        if row.is_public:
            public.add(row.dli_number)
            if row.province in ATLANTIC:
                atlantic.add(row.dli_number)
    return PublicCount(public=len(public), atlantic=len(atlantic))


def build_ircc_dli_pgwp() -> None:
    """IRCC 全量 DLI JSON → data/raw/dli/dli.json(PGWP 子集,院校级)。

    源默认 charset 声明不可靠 → 强制 utf-8 解码(法语校名 Collège 防 mojibake);
    行数低于防线整轮失败(宁可不更新,别灌半截)。
    2026-08-31 批M:原 UA(本域自留的 dli-builder 自报家门 dict)并进
    fetch.constants.POLITE_UA,头 dict 就地拼。
    """
    say(IN_TPL.format(url=IN_URL))
    say(OUT_TPL.format(path=OUT_FILE))
    r = httpx.get(IN_URL, headers={HDR_UA: POLITE_UA}, timeout=FETCH_TIMEOUT_S,
                  follow_redirects=True)
    r.raise_for_status()
    r.encoding = TEXT_ENCODING
    source = DliSource.model_validate_json(r.text)
    say(SOURCE_ROWS_TPL.format(n=len(source.data)))
    fold = fold_pgwp_rows(source.data)
    rows = sorted(fold.rows, key=dli_sort_key)
    if len(fold.skipped) > 0:
        say(SKIPPED_TPL.format(provs=sorted(fold.skipped)))
    if len(rows) < MIN_ROWS:
        raise RuntimeError(TOO_FEW_TPL.format(n=len(rows)))
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out = DliFile(url=LANDING, fetched=date.today().isoformat(), rows=rows)
    paths.write_json(paths.WriteJsonIn(path=OUT_FILE, payload=out.model_dump(by_alias=True),
                                       indent=OUT_INDENT))
    counted = count_public(rows)
    say(WROTE_TPL.format(n=len(rows), pub=counted.public, atl=counted.atlantic,
                         fetched=out.fetched))
