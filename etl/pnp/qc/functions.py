"""
pnp/qc 子域函数 —— 魁省行为全住这(方言同 pnp/functions.py:零字符串令、显式循环令、一参令、永不吞异常令)。

依赖单向:本文件 → 本子域 constants / scheme + pnp 共用段(pnp.constants / pnp.functions / pnp.scheme)+ 基础设施叶;
pnp 共用段不 import 本文件。入口函数由 pnp/main.py 登记进调度单元。

@author Frank
@time 2026-09-29 20:01:04
"""
from datetime import date
from typing import cast

from bs4 import BeautifulSoup

from crawl.functions import get_cached_page
from fetch.constants import PARSER_HTML
from pnp.constants import (
    DRAWS_NOTE_CLIP, EMPTY_JOIN, K_DATE, K_INVITATIONS, K_NOTE, K_SCORE, K_STREAM, LIST_JOIN_SEP, PROV_QC,
    TEXT_JOIN_SEP,
)
from pnp.functions import cached_draws_of, draw_date_of, fold_ws, int_of, iso_nb_of, put_prov_draws
from pnp.qc.constants import (
    DRAWS_QC_LABEL, DRAWS_QC_SCALE, DRAWS_QC_URL_TPL, DRAWS_QC_YEARS_BACK, QC_BODY_CLASS, QC_BODY_TAG,
    QC_DRAW_HEAD_RE, QC_DRAW_INV_RE, QC_DRAW_NOTE_TPL, QC_DRAW_SCORE_RE, QC_HEAD_TAG, QC_STREAM_PREFIX,
)
from pnp.qc.scheme import QcDrawIn
from pnp.scheme import CachedDrawsIn, PutDrawsIn, SoupNodeLike

# =========================================================================
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/functions.py 段10 原样搬来,一字未改)
# =========================================================================


def build_qc_draws() -> None:
    """QC(2026-09-26):**只读 crawl 缓存**里今年与去年的 PSTQ 逐年邀请页(crawl 域 qc-pstq 窄种子每小时在刷),
    两年的轮并成一份(同日抽选补全:原先只读最新一年)。QC 不属 PNP —— 只收邀请事实,label / scale 写 PSTQ。"""
    this_year = date.today().year
    url = DRAWS_QC_URL_TPL.format(year=this_year)
    pages: list = []
    for year in range(this_year, this_year - DRAWS_QC_YEARS_BACK, -1):
        html = get_cached_page(DRAWS_QC_URL_TPL.format(year=year)).html
        if html is not None:
            pages.append(html)
    joined = None
    if len(pages) > 0:
        joined = EMPTY_JOIN.join(pages)
    put_prov_draws(PutDrawsIn(prov=PROV_QC, block=cached_draws_of(CachedDrawsIn(
        prov=PROV_QC, url=url, html=joined, parse=parse_qc_draws, scale=DRAWS_QC_SCALE, label=DRAWS_QC_LABEL))))


def parse_qc_draws(html: str) -> list:
    """QC PSTQ 逐年邀请页:h2「Stream N: …」分段,每轮一个折叠块(h2「Invitations for <日期>」+ 其后第一个
    panel-body)→ 一轮一个 stream 一行。stream 段以外的 h2(汇总表、Other invitations …)清空当前段,其下不收。"""
    soup = cast(SoupNodeLike, BeautifulSoup(html, PARSER_HTML))
    stream = EMPTY_JOIN
    draws: list = []
    for head in soup.find_all(QC_HEAD_TAG):
        text = fold_ws(head.get_text(TEXT_JOIN_SEP, strip=True))
        m = QC_DRAW_HEAD_RE.match(text)
        if m is None:
            stream = qc_stream_of(text)
            continue
        day = iso_nb_of(m.group(1))
        if stream == EMPTY_JOIN or day is None:
            continue
        body = fold_ws(head.find_next(QC_BODY_TAG, class_=QC_BODY_CLASS).get_text(TEXT_JOIN_SEP, strip=True))
        draws.append(qc_draw_of(QcDrawIn(date=day, stream=stream, body=body)))
    draws.sort(key=draw_date_of, reverse=True)
    return draws


def qc_stream_of(head: str) -> str:
    """一个 h2 标题 → 当前 stream 段名(「Stream N: …」原文);别的标题 → 空串(出了 stream 段)。"""
    if head.startswith(QC_STREAM_PREFIX):
        return head
    return EMPTY_JOIN


def qc_draw_of(x: QcDrawIn) -> dict:
    """QC 一轮一个 stream → 一行:invitations = 本轮该 stream 的邀请总数(官方占位 XXX → None,不拿各档人数去凑);
    score = 各邀请档最低分里最小的那个(= 本轮被邀请者的最低分;Stream 4 不计分 → None);两档以上时各档分数进 note。"""
    inv = None
    m = QC_DRAW_INV_RE.search(x.body)
    if m is not None:
        inv = int_of(m.group(1))
    scores: list = []
    for sm in QC_DRAW_SCORE_RE.finditer(x.body):
        n = int_of(sm.group(1))
        if n is not None:
            scores.append(n)
    score = None
    if len(scores) > 0:
        score = min(scores)
    note = EMPTY_JOIN
    if len(scores) > 1:
        parts: list = []
        for n in scores:
            parts.append(str(n))
        note = QC_DRAW_NOTE_TPL.format(scores=LIST_JOIN_SEP.join(parts))[:DRAWS_NOTE_CLIP]
    return {K_DATE: x.date, K_STREAM: x.stream, K_NOTE: note, K_SCORE: score, K_INVITATIONS: inv}
