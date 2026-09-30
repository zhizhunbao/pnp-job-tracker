"""
pnp/qc 子域函数 —— 魁省行为全住这(方言同 pnp/functions.py:零字符串令、显式循环令、一参令、永不吞异常令)。

依赖单向:本文件 → 本子域 constants / scheme + pnp 共用段(pnp.constants / pnp.functions / pnp.scheme)+ 基础设施叶;
pnp 共用段不 import 本文件。入口函数由 pnp/main.py 登记进调度单元。

@author Frank
@time 2026-09-29 20:01:04
"""
import sys
import unittest
from datetime import date
from typing import cast

from bs4 import BeautifulSoup

from crawl.functions import get_cached_page
from fetch.constants import PARSER_HTML
from pnp.constants import (
    DRAWS_NOTE_CLIP, EMPTY_JOIN, K_DATE, K_INVITATIONS, K_NOCS, K_NOTE, K_SCORE, K_STREAM, LIST_JOIN_SEP, PROV_QC,
    TEST_VERBOSITY, TEXT_JOIN_SEP,
)
from pnp.functions import cached_draws_of, draw_date_of, fold_ws, int_of, iso_nb_of, put_prov_draws
from pnp.qc.constants import (
    DRAWS_QC_LABEL, DRAWS_QC_SCALE, DRAWS_QC_URL_TPL, DRAWS_QC_YEARS_BACK, K_EXERCISES, K_IN_QUEBEC,
    K_INVITATIONS_TEXT, K_OUTSIDE_MONTREAL, K_QUEBEC_DIPLOMA, QC_BODY_CLASS, QC_BODY_TAG, QC_CRITERIA_RE,
    QC_DRAW_HEAD_RE, QC_DRAW_INV_RE, QC_DRAW_NOTE_TPL, QC_DRAW_SCORE_RE, QC_EXERCISE_COUNT_RE, QC_EXERCISE_SPLIT_RE,
    QC_EXERCISE_SUM_TPL, QC_HEAD_TAG, QC_IN_QC_RE, QC_NOC_RE, QC_OUTSIDE_CMM_RE, QC_QC_DIPLOMA_RE, QC_STREAM_PREFIX,
)
from pnp.qc.scheme import QcDrawIn, QcExerciseTest, QcSumIn
from pnp.scheme import CachedDrawsIn, PutDrawsIn, SoupNodeLike

# =========================================================================
# 1. PSTQ 邀请轮次(2026-09-29 自 pnp/functions.py 段10 原样搬来;同日加逐档解析)
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
    score = 各邀请档最低分里最小的那个(= 本轮被邀请者的最低分;Stream 4 不计分 → None);两档以上时各档分数进 note。
    2026-09-29 加 exercises(逐档:人数、分数线、点名职业、在魁 / 魁省学历 / 大蒙以外三条件),键殿后;mart 按显式字段
    构造 pnp_draws 行,这一格暂不进库,等魁省展示与岗位判定拍板再接。各档人数对不上总数 → 抛错,整份保留旧数据。"""
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
    exercises = qc_exercises_of(x.body)
    check_qc_exercise_sum(QcSumIn(date=x.date, stream=x.stream, inv=inv, exercises=exercises))
    return {K_DATE: x.date, K_STREAM: x.stream, K_NOTE: note, K_SCORE: score, K_INVITATIONS: inv,
            K_EXERCISES: exercises}


def qc_exercises_of(body: str) -> list:
    """一轮正文 → 各邀请档(页面顺序);段首的总数 / 提取时刻那段不是档,跳过。"""
    out: list = []
    for seg in QC_EXERCISE_SPLIT_RE.split(body):
        if QC_CRITERIA_RE.search(seg) is None:
            continue
        out.append(qc_exercise_of(seg))
    return out


def qc_exercise_of(seg: str) -> dict:
    """一个邀请档 → 一行:人数(确数才进 invitations,范围写法只进原文格)、分数线(杰出人才档不计分 → None;
    官方个别档不写分数线 → None,不猜)、点名职业(五位码去重保序,没点名 → 空表)、三个条件标记。"""
    text = EMPTY_JOIN
    m = QC_EXERCISE_COUNT_RE.match(seg)
    if m is not None:
        text = m.group(1)
    score = None
    sm = QC_DRAW_SCORE_RE.search(seg)
    if sm is not None:
        score = int_of(sm.group(1))
    return {K_INVITATIONS: int_of(text), K_INVITATIONS_TEXT: text, K_SCORE: score, K_NOCS: qc_nocs_of(seg),
            K_IN_QUEBEC: QC_IN_QC_RE.search(seg) is not None,
            K_OUTSIDE_MONTREAL: QC_OUTSIDE_CMM_RE.search(seg) is not None,
            K_QUEBEC_DIPLOMA: QC_QC_DIPLOMA_RE.search(seg) is not None}


def qc_nocs_of(seg: str) -> list:
    """邀请档点名的 NOC 五位码(页面顺序,去重)。"""
    nocs: list = []
    for m in QC_NOC_RE.finditer(seg):
        if m.group(1) not in nocs:
            nocs.append(m.group(1))
    return nocs


def check_qc_exercise_sum(x: QcSumIn) -> None:
    """自校:总数是确数、且各档人数全是确数时,加总必须等于总数;对不上抛错(cached_draws_of 接住后整份保留旧数据)。"""
    if x.inv is None or len(x.exercises) == 0:
        return
    total = 0
    for e in x.exercises:
        if e[K_INVITATIONS] is None:
            return
        total += e[K_INVITATIONS]
    if total != x.inv:
        raise RuntimeError(QC_EXERCISE_SUM_TPL.format(date=x.date, stream=x.stream, total=total, inv=x.inv))


# =========================================================================
# 9. 自测入口
# =========================================================================


def run_qc_tests() -> None:
    """test_qc 步入口:跑本子域自测(用例集住 pnp/qc/scheme.py);有失败 sys.exit(1),门接住后记本步失败。
    pnp 共用段的 run_tests 不认识子域(共用段不 import 子域),所以子域自带入口,由 pnp/main 登记成 test_qc 步。"""
    suite = unittest.TestSuite()
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcExerciseTest))
    if unittest.TextTestRunner(verbosity=TEST_VERBOSITY).run(suite).wasSuccessful() is False:
        sys.exit(1)
