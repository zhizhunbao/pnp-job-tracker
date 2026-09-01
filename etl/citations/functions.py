"""
citations 域函数 —— 全部行为住这(五件全溶,照样张 etl/dli/functions.py;2026-08-31 批D 立域)。

原 ops/verify_field_source_pages.py 溶入本文件,入口函数与原脚本同名(零参)。
方言律:零字符串(文案走 constants 的 *_TPL,注册表键走 K_ 词族)、显式循环
(推导/genexp/lambda 出局)、一参令(多入参收 scheme 的 XxxIn)、日志只走
log.functions.say(裸 print 退役)。依赖单边:本文件 → constants/scheme + 基础设施叶(paths/log)。

口径不动:来源解释 = 着陆页 <title>/meta description **原文**,不经 LLM 不翻译;
抓不到 → unverified 只留链接(宁可留空不瞎猜);派生字段不抓网,写本站口径一句。
"""
from dataclasses import asdict
from datetime import date
from typing import cast

import httpx

import paths
from fetch.constants import HDR_UA, POLITE_UA
from citations.constants import (
    DATASETS, DERIVED, DESC_ALT_RE, DESC_MAX, DESC_RE, DONE_TPL, FETCH_FAIL_TPL, FETCH_TIMEOUT_S,
    HTTP_OK, IN_TPL, K_FIELDS, K_URL, KIND_DATASET, KIND_DERIVED,
    OUT_FILE, OUT_INDENT, OUT_TPL, PUBLISHER_DERIVED, SPACE, SPACE_RE, STATUS_DERIVED,
    STATUS_UNVERIFIED, STATUS_VERIFIED, TITLE_MAX, TITLE_RE,
)
from citations.scheme import (
    DatasetRowIn, DerivedRowIn, FetchIn, HttpGetLike, PageMeta, SourceFile, SourceRow, StatusCount,
)
from log.functions import say


# =========================================================================
# 1. 字段级来源注册表(E4-04:逐 URL 验证着陆页 + 抽 title/meta;本域唯一步)
# =========================================================================


def verify_field_source_pages() -> None:
    """注册表 → data/raw/sources/field-sources.json(数据集级行逐字段展开 + 派生行)。

    数据集级 citation 是前端字段的**兜底**出处:记录级 citation(pnp 通道 url /
    applyUrl / AIP 名单)已在各维度,前端优先显示那些。
    """
    say(IN_TPL.format(n=len(DATASETS), m=len(DERIVED)))
    say(OUT_TPL.format(path=OUT_FILE))
    today = date.today().isoformat()
    meta_by_url = fetch_all_meta()
    rows: list[SourceRow] = []
    for dataset in DATASETS:
        meta = meta_by_url[dataset[K_URL]]
        for field in dataset[K_FIELDS]:
            rows.append(to_dataset_row(DatasetRowIn(field=field, dataset=dataset, meta=meta,
                                                    fetched=today)))
    for entry in DERIVED:
        rows.append(to_derived_row(DerivedRowIn(entry=entry, fetched=today)))
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    doc = SourceFile(fetched=today, rows=rows)
    paths.write_json(paths.WriteJsonIn(path=OUT_FILE, payload=asdict(doc), indent=OUT_INDENT))
    counted = count_status(rows)
    say(DONE_TPL.format(n=len(rows), ok=counted.verified, un=counted.unverified,
                        derived=len(DERIVED)))


def fetch_all_meta() -> dict:
    """逐个数据集抓一次着陆页,按 URL 归档(一个客户端跑完全程)。"""
    meta_by_url: dict = {}
    with httpx.Client() as raw_client:
        client = cast(HttpGetLike, raw_client)
        for dataset in DATASETS:
            meta_by_url[dataset[K_URL]] = fetch_meta(FetchIn(client=client,
                                                             url=cast(str, dataset[K_URL])))
    return meta_by_url


def fetch_meta(x: FetchIn) -> PageMeta:
    """抓着陆页,抽 <title> + meta description 原文;失败/非 200 → unverified(宁可留空)。

    2026-08-31 批M:原 UA(本域自留的 source-verifier 自报家门 dict)并进
    fetch.constants.POLITE_UA,头 dict 就地拼。
    """
    try:
        r = x.client.get(x.url, headers={HDR_UA: POLITE_UA}, timeout=FETCH_TIMEOUT_S,
                         follow_redirects=True)
        if r.status_code != HTTP_OK:
            return PageMeta(status=STATUS_UNVERIFIED, title="", description="")
        meta = to_page_meta(r.text)
    except Exception as e:  # noqa: BLE001 — 单页抓不到不拖垮整轮,留痕后记 unverified
        say(FETCH_FAIL_TPL.format(url=x.url, name=e.__class__.__name__))
        return PageMeta(status=STATUS_UNVERIFIED, title="", description="")
    return meta


def to_page_meta(html: str) -> PageMeta:
    """页面 HTML → title/description 原文(连续空白折一个空格;抽不到留空)。"""
    title = ""
    m = TITLE_RE.search(html)
    if m is not None:
        title = SPACE_RE.sub(SPACE, m.group(1)).strip()
    desc = ""
    m = DESC_RE.search(html)
    if m is None:
        m = DESC_ALT_RE.search(html)
    if m is not None:
        desc = SPACE_RE.sub(SPACE, m.group(1)).strip()
    return PageMeta(status=STATUS_VERIFIED, title=title[:TITLE_MAX], description=desc[:DESC_MAX])


def to_dataset_row(x: DatasetRowIn) -> SourceRow:
    """一个字段 + 它所属数据集的验证结果 → 注册表行(键词汇只住本构造器)。"""
    return SourceRow(
        field=x.field, kind=KIND_DATASET, publisher=x.dataset["publisher"],
        url=x.dataset["url"], title=x.meta.title, description=x.meta.description,
        status=x.meta.status, fetched=x.fetched, note="",
    )


def to_derived_row(x: DerivedRowIn) -> SourceRow:
    """一个派生字段 → 注册表行(不抓网:出处留空,口径一句进 note)。"""
    return SourceRow(
        field=x.entry["field"], kind=KIND_DERIVED, publisher=PUBLISHER_DERIVED, url="",
        title="", description="", status=STATUS_DERIVED, fetched=x.fetched,
        note=x.entry["note"],
    )


def count_status(rows: list[SourceRow]) -> StatusCount:
    """收口计数:验过的与没验上的行数(派生行两边都不计)。"""
    verified = 0
    unverified = 0
    for row in rows:
        if row.status == STATUS_VERIFIED:
            verified += 1
        if row.status == STATUS_UNVERIFIED:
            unverified += 1
    return StatusCount(verified=verified, unverified=unverified)
