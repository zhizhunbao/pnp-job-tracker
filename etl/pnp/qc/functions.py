"""
pnp/qc 子域函数 —— 魁省行为全住这(方言同 pnp/functions.py:零字符串令、显式循环令、一参令、永不吞异常令)。

依赖单向:本文件 → 本子域 constants / scheme + pnp 共用段(pnp.constants / pnp.functions / pnp.scheme)+ 基础设施叶;
pnp 共用段不 import 本文件。入口函数由 pnp/main.py 登记进调度单元。

@author Frank
@time 2026-09-29 20:01:04
"""
import re
import sys
import unittest
from datetime import date
from io import BytesIO
from typing import cast

import openpyxl
from bs4 import BeautifulSoup

import paths
from crawl.functions import get_cached_page
from fetch.constants import PARSER_HTML
from log.functions import say
from pnp.constants import (
    DRAWS_NOTE_CLIP, EMPTY_JOIN, FACTOR_AGE, FACTOR_EDUCATION, FACTOR_EXPERIENCE, FACTOR_FUNDS, FACTOR_LANGUAGE,
    FACTOR_LICENSING, FACTOR_OCC_PATHWAY, INDENT_2, K_AS_OF_LOWER, K_DATE, K_FETCHED, K_GUIDE_EFFECTIVE, K_INVITATIONS,
    K_LABEL, K_NAME, K_NOC, K_NOCS, K_NOTE, K_PAGE_URL, K_PARTIAL, K_PROGRAM, K_PROVINCE, K_REQUIREMENTS, K_SCORE,
    K_SECTION, K_SOURCE, K_STREAM, K_STREAMS, K_TOTAL, K_UNIT, K_URL, K_VALUE, K_YEAR, LIST_JOIN_SEP, OP_RULE,
    PRINT_FACTOR_TPL, PRINT_OUT_TPL, PROV_QC, TEST_VERBOSITY, TEXT_JOIN_SEP, UNIT_MONTHS, UNIT_YEARS, WORD_N,
)
from pnp.functions import (
    cached_draws_of, draw_date_of, fail_zh, fetch_bytes, fold_ws, int_of, iso_nb_of, iso_of, pdf_text, put_prov_draws,
    say_factor_counts, today_iso, to_std_req,
)
from pnp.qc.constants import (
    DRAWS_QC_LABEL, DRAWS_QC_SCALE, DRAWS_QC_URL_TPL, DRAWS_QC_YEARS_BACK, FR_MONTHS, FR_WORD_N, ISO_DATE_TPL,
    K_ADMISSIONS, K_BANDS, K_CEFR, K_CODE, K_ELIGIBLE_AS_OF, K_EXERCISES, K_FULL, K_INTAKE, K_INTAKE_CLOSES,
    K_INTAKE_OPENS, K_INVITATIONS_TEXT, K_IN_QUEBEC, K_KIND, K_LEVEL_MAX, K_LEVEL_MIN, K_OUTSIDE_MONTREAL, K_PLAN_YEAR,
    K_PROGRAM_CLOSES, K_PROGRAM_OPENS, K_QUEBEC_DIPLOMA, K_QUOTE, K_REGULATED_LIST, K_SCORE_MAX, K_SCORE_MIN,
    K_SELECTIONS, K_SKILL, K_TEST, K_TESTS, K_VALUE_MAX, K_VERSION, OUT_QC_FRENCH_LEVELS, OUT_QC_NOC_STREAMS,
    OUT_QC_PEQ_REQ, OUT_QC_REQ, OUT_QC_STATS, QCF_BANDS, QCF_BODY_HEAD, QCF_CEFR_HEAD, QCF_DECIMAL_COMMA,
    QCF_DECIMAL_POINT, QCF_LEVELS_HEAD, QCF_LEVEL_RE, QCF_MIN_TESTS, QCF_PDF_URL, QCF_PRINT_DONE_TPL,
    QCF_PROBLEM_FETCH_TPL, QCF_PROBLEM_TPL, QCF_SCORE_RE, QCF_SKILL_RE, QCF_VERSION_RE, QCF_WHAT_BODY, QCF_WHAT_CEFR,
    QCF_WHAT_LEVELS, QCF_WHAT_ORPHAN_TPL, QCF_WHAT_RISING_TPL, QCF_WHAT_SKILL_TPL, QCF_WHAT_TESTS_TPL, QCF_WHAT_VERSION,
    QCN_CODES_SKIP, QCN_CODE_SEP, QCN_FULL_KINDS, QCN_FULL_RE, QCN_KINDS, QCN_KIND_BASE, QCN_NOC_COUNT, QCN_NOC_RE,
    QCN_PARTIAL_KINDS, QCN_PARTIAL_RE, QCN_PNER_KEY, QCN_PNER_RE, QCN_PRINT_DONE_TPL, QCN_PROBLEM_CROSS_TPL,
    QCN_PROBLEM_FETCH_TPL, QCN_PROBLEM_TPL, QCN_REGULATED_PDF_URL, QCN_ROWS_SKIP, QCN_SHEET_CODES, QCN_SHEET_ROWS,
    QCN_STREAM_SEP, QCN_TIMEOUT_S, QCN_TOTALS_RE, QCN_VERSION_RE, QCN_WHAT_CODE_TPL, QCN_WHAT_FULL, QCN_WHAT_KIND_TPL,
    QCN_WHAT_PARTIAL, QCN_WHAT_ROWS, QCN_WHAT_TOTAL, QCN_WHAT_TOTALS, QCN_XLSX_URL, QCP_AGE_RE, QCP_BASIS_CUTOFF_TPL,
    QCP_BASIS_EXP_TPL, QCP_BASIS_WINDOW_TPL, QCP_CUTOFF_RE, QCP_DEP_HOURS_RE, QCP_EXP_RE, QCP_FULLTIME_RE, QCP_GRAD_URL,
    QCP_GRAD_WINDOW_RE, QCP_INTAKE_RE, QCP_ORAL_RE, QCP_PAGE_GRAD, QCP_PAGE_TFW, QCP_PRINT_DONE_TPL,
    QCP_PROBLEM_NO_PAGE_TPL, QCP_PROBLEM_TPL, QCP_PROGRAM, QCP_RECEPT_GRAD_RE, QCP_RECEPT_TFW_RE, QCP_SPOUSE_RE,
    QCP_STREAM_GRAD, QCP_STREAM_TFW, QCP_TEER_RE, QCP_TFW_URL, QCP_UNIT_HOURS, QCP_UPDATED_RE, QCP_URL, QCP_WHAT_CUTOFF,
    QCP_WHAT_DATE, QCP_WHAT_DEP, QCP_WHAT_FULLTIME, QCP_WHAT_INTAKE, QCP_WHAT_RECEPT, QCP_WHAT_WINDOW, QCP_WINDOW_RE,
    QCP_WRITTEN_RE, QCR_AGE_RE, QCR_ALL_STREAMS, QCR_BASIS_IN_QC_TPL, QCR_BASIS_ORAL, QCR_BASIS_WINDOW_TPL,
    QCR_BASIS_WRITTEN, QCR_DIGIT_RE, QCR_EDU_S1_RE, QCR_EDU_S2_RE, QCR_EXCEPTIONAL_RE, QCR_EXP_S1_RE, QCR_EXP_S2_RE,
    QCR_EXP_S4_RE, QCR_FACTOR_EXCEPTIONAL, QCR_FACTOR_ORDER, QCR_FUNDS_RE, QCR_H2_MARK, QCR_H2_OPEN_RE, QCR_H2_SUB,
    QCR_LANG_HIGH_RE, QCR_LANG_S2_RE, QCR_LANG_S3_LOW_RE, QCR_LICENSING_RE, QCR_MONTHS_PER_YEAR, QCR_PRINT_DONE_TPL,
    QCR_PROBLEM_NO_PAGE, QCR_PROBLEM_NO_SECTION_TPL, QCR_PROBLEM_TPL, QCR_PROGRAM, QCR_SECTION_GENERAL,
    QCR_SECTION_NAMES, QCR_SOURCE, QCR_SPOUSE_RE, QCR_STREAM_1, QCR_STREAM_2, QCR_STREAM_3, QCR_STREAM_4,
    QCR_SUBJECT_SPOUSE, QCR_TAIL_KEY, QCR_TEER_HIGH, QCR_TEER_LOW, QCR_TEER_RE, QCR_UNIT_FR, QCR_UPDATED_RE, QCR_URL,
    QCR_WHAT_AGE, QCR_WHAT_EDU, QCR_WHAT_EXCEPTIONAL, QCR_WHAT_EXP, QCR_WHAT_FUNDS, QCR_WHAT_LANG, QCR_WHAT_LICENSING,
    QCR_WHAT_SPOUSE, QCR_WHAT_TEER, QCR_WHAT_UPDATED, QCS_ADM_RE, QCS_CATEGORY, QCS_KIND_ACTUAL, QCS_KIND_FORECAST,
    QCS_KIND_PLAN, QCS_LABEL_TPL, QCS_LETTER_RE, QCS_NOTE, QCS_NUM_RE, QCS_PLAN_URL, QCS_PRINT_DONE_TPL,
    QCS_PROBLEM_CROSS_TPL, QCS_PROBLEM_FETCH_TPL, QCS_PROBLEM_TPL, QCS_ROW_RE, QCS_SECTION_T3, QCS_SECTION_T4,
    QCS_SEL_RE, QCS_SOURCE, QCS_T3_HEAD_RE, QCS_T3_NUMS, QCS_T3_YEARS_RE, QCS_T4_HEAD_RE, QCS_T4_NUMS, QCS_T4_YEARS_RE,
    QCS_TIMEOUT_S, QCS_TITLE_RE, QCS_UNIT_PEOPLE, QCS_WHAT_ADM, QCS_WHAT_SEL, QCS_WHAT_T3, QCS_WHAT_T4, QCS_WHAT_TITLE,
    QC_BODY_CLASS, QC_BODY_TAG, QC_CRITERIA_RE, QC_DRAW_HEAD_RE, QC_DRAW_INV_RE, QC_DRAW_NOTE_TPL, QC_DRAW_SCORE_RE,
    QC_EXERCISE_COUNT_RE, QC_EXERCISE_SPLIT_RE, QC_EXERCISE_SUM_TPL, QC_HEAD_TAG, QC_IN_QC_RE, QC_NOC_RE,
    QC_OUTSIDE_CMM_RE, QC_QC_DIPLOMA_RE, QC_STREAM_PREFIX,
)
from pnp.qc.scheme import (
    QcBookLike, QcDrawIn, QcExerciseTest, QcfBandsIn, QcfBodyIn, QcfHeadIn, QcFindIn, QcfOut, QcFrDateIn, QcFrenchTest,
    QcFrPartsIn, QcnKindIn, QcnMapIn, QcnMapOut, QcNocTest, QcnRegIn, QcnRowIn, QcpIntakeIn, QcPlanTest, QcpPageIn,
    QcpPageOut, QcpReqsIn, QcpRowsIn, QcReqTest, QcrLangIn, QcrSectionIn, QcrTeerIn, QcrTextIn, QcrUpdatedIn,
    QcsCrossIn, QcSheetLike, QcsPlanOut, QcsRowIn, QcsTableIn, QcsTableOut, QcSumIn,
)
from pnp.scheme import CachedDrawsIn, FactorCountsIn, FetchHtmlIn, PutDrawsIn, ReqIn, ReqsOut, SoupNodeLike, StdReqIn

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
# 2. PSTQ 门槛(2026-09-29 立,Frank「魁省数据也要抓一下吧」「不属于省提名 也算是省的吧」)
# =========================================================================


def build_qc_req() -> None:
    """PSTQ 门槛入口:只读 crawl 缓存里的门槛页 → 一般条件 + 四个通道 → raw/pnp/qc-req.json(形同九省门槛表)。
    每一条都锚在官方原句上(label 即原句);任一条认不出 → 自校未过,整份保留旧表。暂不进 mart(见 OUT_QC_REQ)。"""
    say(PRINT_OUT_TPL.format(path=OUT_QC_REQ))
    html = get_cached_page(QCR_URL).html
    if html is None:
        fail_zh([QCR_PROBLEM_NO_PAGE])
        return
    secs = qc_sections_of(html)
    reqs: list = []
    problems: list = []
    for part in (qcr_general_reqs(qcr_section_of(QcrSectionIn(secs=secs, name=QCR_SECTION_GENERAL,
                                                                problems=problems))),
                 qcr_s1_reqs(qcr_section_of(QcrSectionIn(secs=secs, name=QCR_STREAM_1, problems=problems))),
                 qcr_s2_reqs(qcr_section_of(QcrSectionIn(secs=secs, name=QCR_STREAM_2, problems=problems))),
                 qcr_s3_reqs(qcr_section_of(QcrSectionIn(secs=secs, name=QCR_STREAM_3, problems=problems))),
                 qcr_s4_reqs(qcr_section_of(QcrSectionIn(secs=secs, name=QCR_STREAM_4, problems=problems)))):
        reqs += part.rows
        problems += part.problems
    version = qcr_updated_of(QcrUpdatedIn(tail=secs[QCR_TAIL_KEY], problems=problems))
    if len(problems) > 0:
        fail_zh(problems)
        return
    paths.write_json(paths.WriteJsonIn(path=OUT_QC_REQ, payload={
        K_PROVINCE: PROV_QC, K_PROGRAM: QCR_PROGRAM, K_SOURCE: QCR_SOURCE, K_URL: QCR_URL, K_PAGE_URL: QCR_URL,
        K_GUIDE_EFFECTIVE: version, K_FETCHED: today_iso(), K_REQUIREMENTS: reqs,
    }, indent=INDENT_2))
    say(QCR_PRINT_DONE_TPL.format(path=OUT_QC_REQ, version=version, n=len(reqs)))
    say_factor_counts(FactorCountsIn(reqs=reqs, order=QCR_FACTOR_ORDER, tpl=PRINT_FACTOR_TPL))


def qc_sections_of(html: str) -> dict:
    """整页按 h2 切段 → {段标题: 段文(已折空白)};只收认得的段(一般条件、四个通道),另把最后一段(页尾,
    含「Last update」)记在 QCR_TAIL_KEY 下。做法:原文每个 <h2 前插切段标记,取全文后按标记切。"""
    marked = QCR_H2_OPEN_RE.sub(QCR_H2_SUB, html)
    text = fold_ws(BeautifulSoup(marked, PARSER_HTML).get_text(TEXT_JOIN_SEP, strip=True))
    secs: dict = {QCR_TAIL_KEY: EMPTY_JOIN}
    for part in text.split(QCR_H2_MARK):
        body = part.strip()
        for name in QCR_SECTION_NAMES:
            if body.startswith(name):
                secs[name] = body
        if QCR_UPDATED_RE.search(body) is not None:
            secs[QCR_TAIL_KEY] = body
    return secs


def qcr_section_of(x: QcrSectionIn) -> QcrTextIn:
    """取一段;页上没有这一段 → 记一条问题、交回空段(后面每条认不出还会各记一条,自校照样拦住)。
    段名就是 h2 原文;四个通道段的 h2 原文即通道名(与邀请页 stream 段标题逐字相同),门槛行的 stream 直接写它。"""
    if x.name not in x.secs:
        x.problems.append(QCR_PROBLEM_NO_SECTION_TPL.format(section=x.name))
        return QcrTextIn(section=x.name, text=EMPTY_JOIN)
    return QcrTextIn(section=x.name, text=x.secs[x.name])


def qcr_updated_of(x: QcrUpdatedIn) -> str:
    """页尾「Last update: June 25, 2026」→ ISO;认不出记一条问题、交回空串。"""
    m = QCR_UPDATED_RE.search(x.tail)
    if m is not None:
        iso = iso_of(m.group(1))
        if iso is not None:
            return iso
    x.problems.append(QCR_PROBLEM_TPL.format(section=QCR_TAIL_KEY, what=QCR_WHAT_UPDATED))
    return EMPTY_JOIN


def qc_find(x: QcFindIn) -> re.Match | None:
    """在一段里找一句官方原句;找不到 → 记一条问题,交回 None。"""
    m = x.rx.search(x.text)
    if m is None:
        x.problems.append(x.problem)
    return m


def qc_n_of(word: str) -> int | None:
    """官方数字:阿拉伯数字(去千分位空格)/ 英文数词 / 法文数词 → 整数;认不出 → None(不猜)。"""
    n = int_of(word)
    if n is not None:
        return n
    low = word.lower()
    if low in WORD_N:
        return WORD_N[low]
    if low in FR_WORD_N:
        return FR_WORD_N[low]
    return None


def qc_teer_of(listing: str) -> list:
    """TEER 列举原文(「0,1 or 2」「0, 1, 2 ou 3」)→ [0, 1, 2]。"""
    out: list = []
    for m in QCR_DIGIT_RE.finditer(listing):
        out.append(int(m.group(0)))
    return out


def to_qc_req(x: ReqIn) -> dict:
    """PSTQ 门槛一行(标准形,走共用 to_std_req;缺省通道 = 四个通道都适用、缺省出处 = 门槛页)。"""
    return to_std_req(StdReqIn(req=x, stream=QCR_ALL_STREAMS, url=QCR_URL))


def qcr_general_reqs(x: QcrTextIn) -> ReqsOut:
    """一般条件:年龄、自给合同(入籍后头几个月自己养活自己与随行家属)。"""
    rows: list = []
    problems: list = []
    age = qc_find(QcFindIn(text=x.text, rx=QCR_AGE_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_AGE)))
    funds = qc_find(QcFindIn(text=x.text, rx=QCR_FUNDS_RE, problems=problems,
                             problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_FUNDS)))
    if age is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_AGE, value=int(age.group(1)), unit=UNIT_YEARS,
                                    section=x.section, label=age.group(0))))
    if funds is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_FUNDS, op=OP_RULE, value=qc_n_of(funds.group(1)),
                                    unit=UNIT_MONTHS, section=x.section, label=funds.group(0))))
    return ReqsOut(rows=rows, problems=problems)


def qcr_s1_reqs(x: QcrTextIn) -> ReqsOut:
    """通道 1(高技能专才):TEER 0-2、近 N 年至少 M 年经验、口语 / 书面法语、配偶口语、一年以上全日制文凭。"""
    rows: list = []
    problems: list = []
    teer = qcr_teer_rows(QcrTeerIn(sec=x, rows=rows, problems=problems))
    exp = qc_find(QcFindIn(text=x.text, rx=QCR_EXP_S1_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXP)))
    if exp is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=x.section,
                                    value=int(exp.group(1)) * QCR_MONTHS_PER_YEAR, unit=UNIT_MONTHS,
                                    applies_teer=teer, basis=QCR_BASIS_WINDOW_TPL.format(n=exp.group(2)),
                                    section=x.section, label=exp.group(0))))
    qcr_lang_high_rows(QcrLangIn(sec=x, teer=teer, rows=rows, problems=problems))
    qcr_spouse_rows(QcrTeerIn(sec=x, rows=rows, problems=problems))
    edu = qc_find(QcFindIn(text=x.text, rx=QCR_EDU_S1_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EDU)))
    if edu is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_EDUCATION, stream=x.section, op=OP_RULE,
                                    value=qc_n_of(edu.group(1)), unit=UNIT_YEARS, applies_teer=teer,
                                    section=x.section, label=edu.group(0))))
    return ReqsOut(rows=rows, problems=problems)


def qcr_s2_reqs(x: QcrTextIn) -> ReqsOut:
    """通道 2(中低技能):TEER 3-5、近 N 年至少 M 年经验且其中 K 年在魁省、口语法语、配偶口语、高中及以上。"""
    rows: list = []
    problems: list = []
    teer = qcr_teer_rows(QcrTeerIn(sec=x, rows=rows, problems=problems))
    exp = qc_find(QcFindIn(text=x.text, rx=QCR_EXP_S2_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXP)))
    if exp is not None:
        total = qc_n_of(exp.group(1))
        in_qc = qc_n_of(exp.group(2))
        window = qc_n_of(exp.group(3))
        if total is None or in_qc is None or window is None:
            problems.append(QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXP))
        else:
            rows.append(to_qc_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=x.section,
                                        value=total * QCR_MONTHS_PER_YEAR, unit=UNIT_MONTHS, applies_teer=teer,
                                        basis=QCR_BASIS_WINDOW_TPL.format(n=window), section=x.section,
                                        label=exp.group(0))))
            rows.append(to_qc_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=x.section,
                                        value=in_qc * QCR_MONTHS_PER_YEAR, unit=UNIT_MONTHS, applies_teer=teer,
                                        basis=QCR_BASIS_IN_QC_TPL.format(n=window), section=x.section,
                                        label=exp.group(0))))
    lang = qc_find(QcFindIn(text=x.text, rx=QCR_LANG_S2_RE, problems=problems,
                            problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_LANG)))
    if lang is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.section, value=int(lang.group(1)),
                                    unit=QCR_UNIT_FR, applies_teer=teer, basis=QCR_BASIS_ORAL,
                                    section=x.section, label=lang.group(0))))
    qcr_spouse_rows(QcrTeerIn(sec=x, rows=rows, problems=problems))
    edu = qc_find(QcFindIn(text=x.text, rx=QCR_EDU_S2_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EDU)))
    if edu is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_EDUCATION, stream=x.section, op=OP_RULE, applies_teer=teer,
                                    section=x.section, label=edu.group(0))))
    return ReqsOut(rows=rows, problems=problems)


def qcr_s3_reqs(x: QcrTextIn) -> ReqsOut:
    """通道 3(受监管职业):职业在受监管清单上、法语按 TEER 分两档、配偶口语。"""
    rows: list = []
    problems: list = []
    lic = qc_find(QcFindIn(text=x.text, rx=QCR_LICENSING_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_LICENSING)))
    if lic is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_LICENSING, stream=x.section, op=OP_RULE, section=x.section,
                                    label=lic.group(0))))
    qcr_lang_high_rows(QcrLangIn(sec=x, teer=QCR_TEER_HIGH, rows=rows, problems=problems))
    low = qc_find(QcFindIn(text=x.text, rx=QCR_LANG_S3_LOW_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_LANG)))
    if low is not None:
        rows.append(to_qc_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.section, value=int(low.group(1)),
                                    unit=QCR_UNIT_FR, applies_teer=QCR_TEER_LOW, basis=QCR_BASIS_ORAL,
                                    section=x.section, label=low.group(0))))
    qcr_spouse_rows(QcrTeerIn(sec=x, rows=rows, problems=problems))
    return ReqsOut(rows=rows, problems=problems)


def qcr_s4_reqs(x: QcrTextIn) -> ReqsOut:
    """通道 4(杰出人才):近 N 年主职业至少 M 年、杰出专长(部定成就清单或合作机构意见)。不看 TEER、不看法语。"""
    rows: list = []
    problems: list = []
    exp = qc_find(QcFindIn(text=x.text, rx=QCR_EXP_S4_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXP)))
    if exp is not None:
        years = qc_n_of(exp.group(1))
        window = qc_n_of(exp.group(2))
        if years is None or window is None:
            problems.append(QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXP))
        else:
            rows.append(to_qc_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=x.section,
                                        value=years * QCR_MONTHS_PER_YEAR, unit=UNIT_MONTHS,
                                        basis=QCR_BASIS_WINDOW_TPL.format(n=window), section=x.section,
                                        label=exp.group(0))))
    exc = qc_find(QcFindIn(text=x.text, rx=QCR_EXCEPTIONAL_RE, problems=problems,
                           problem=QCR_PROBLEM_TPL.format(section=x.section, what=QCR_WHAT_EXCEPTIONAL)))
    if exc is not None:
        rows.append(to_qc_req(ReqIn(factor=QCR_FACTOR_EXCEPTIONAL, stream=x.section, op=OP_RULE,
                                    section=x.section, label=exc.group(0))))
    return ReqsOut(rows=rows, problems=problems)


def qcr_teer_rows(x: QcrTeerIn) -> list:
    """通道 1 / 2 的职业档一行(occupationPathway,rule);交回 TEER 列表供本段其余行挂 appliesTeer(认不出 → 空表)。"""
    m = qc_find(QcFindIn(text=x.sec.text, rx=QCR_TEER_RE, problems=x.problems,
                         problem=QCR_PROBLEM_TPL.format(section=x.sec.section, what=QCR_WHAT_TEER)))
    if m is None:
        return []
    teer = qc_teer_of(m.group(1))
    x.rows.append(to_qc_req(ReqIn(factor=FACTOR_OCC_PATHWAY, stream=x.sec.section, op=OP_RULE, applies_teer=teer,
                                  section=x.sec.section, label=m.group(0))))
    return teer


def qcr_lang_high_rows(x: QcrLangIn) -> None:
    """TEER 0-2 那档的法语两行:口语 ≥ M、书面 ≥ K(通道 1、通道 3 高档同句)。"""
    m = qc_find(QcFindIn(text=x.sec.text, rx=QCR_LANG_HIGH_RE, problems=x.problems,
                         problem=QCR_PROBLEM_TPL.format(section=x.sec.section, what=QCR_WHAT_LANG)))
    if m is None:
        return
    x.rows.append(to_qc_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.sec.section, value=int(m.group(1)),
                                  unit=QCR_UNIT_FR, applies_teer=x.teer, basis=QCR_BASIS_ORAL,
                                  section=x.sec.section, label=m.group(0))))
    x.rows.append(to_qc_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.sec.section, value=int(m.group(2)),
                                  unit=QCR_UNIT_FR, applies_teer=x.teer, basis=QCR_BASIS_WRITTEN,
                                  section=x.sec.section, label=m.group(0))))


def qcr_spouse_rows(x: QcrTeerIn) -> None:
    """随行配偶的口语一行(subject = spouse;通道 1-3 各写一遍)。"""
    m = qc_find(QcFindIn(text=x.sec.text, rx=QCR_SPOUSE_RE, problems=x.problems,
                         problem=QCR_PROBLEM_TPL.format(section=x.sec.section, what=QCR_WHAT_SPOUSE)))
    if m is None:
        return
    x.rows.append(to_qc_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.sec.section, subject=QCR_SUBJECT_SPOUSE,
                                  value=int(m.group(1)), unit=QCR_UNIT_FR, basis=QCR_BASIS_ORAL,
                                  section=x.sec.section, label=m.group(0))))


# =========================================================================
# 3. PEQ 门槛(2026-09-29 立;PEQ 2026-07-02 起临时重开两年,只有法文页)
# =========================================================================


def build_qc_peq_req() -> None:
    """PEQ 门槛入口:只读 crawl 缓存(qc-peq 种子)的两个分支甄选条件页 → raw/pnp/qc-peq-req.json。
    除门槛行外另带 intake 块:重开期、本轮收件窗口、收件资格截点日(官方原句照录)。任一条认不出 → 整份保留旧表。"""
    say(PRINT_OUT_TPL.format(path=OUT_QC_PEQ_REQ))
    problems: list = []
    tfw = qcp_page_of(QcpPageIn(url=QCP_TFW_URL, page=QCP_PAGE_TFW, problems=problems))
    grad = qcp_page_of(QcpPageIn(url=QCP_GRAD_URL, page=QCP_PAGE_GRAD, problems=problems))
    intake = qcp_intake_of(QcpIntakeIn(page=tfw, problems=problems))
    reqs: list = []
    for part in (qcp_tfw_reqs(QcpReqsIn(page=tfw, as_of=intake[K_ELIGIBLE_AS_OF])),
                 qcp_grad_reqs(QcpReqsIn(page=grad, as_of=intake[K_ELIGIBLE_AS_OF]))):
        reqs += part.rows
        problems += part.problems
    version = qc_fr_date_of(QcFrDateIn(m=QCP_UPDATED_RE.search(tfw.text), what=QCP_WHAT_DATE,
                                       page=tfw.page, problems=problems))
    if len(problems) > 0:
        fail_zh(problems)
        return
    paths.write_json(paths.WriteJsonIn(path=OUT_QC_PEQ_REQ, payload={
        K_PROVINCE: PROV_QC, K_PROGRAM: QCP_PROGRAM, K_SOURCE: QCR_SOURCE, K_URL: QCP_URL, K_PAGE_URL: QCP_URL,
        K_GUIDE_EFFECTIVE: version, K_FETCHED: today_iso(), K_INTAKE: intake, K_REQUIREMENTS: reqs,
    }, indent=INDENT_2))
    say(QCP_PRINT_DONE_TPL.format(path=OUT_QC_PEQ_REQ, version=version, n=len(reqs),
                                  opens=intake[K_INTAKE_OPENS], closes=intake[K_INTAKE_CLOSES],
                                  asof=intake[K_ELIGIBLE_AS_OF]))
    say_factor_counts(FactorCountsIn(reqs=reqs, order=QCR_FACTOR_ORDER, tpl=PRINT_FACTOR_TPL))


def qcp_page_of(x: QcpPageIn) -> QcpPageOut:
    """取一个 PEQ 分支页的全文(折空白);缓存没有 → 记一条问题、交回空文。"""
    html = get_cached_page(x.url).html
    if html is None:
        x.problems.append(QCP_PROBLEM_NO_PAGE_TPL.format(url=x.url))
        return QcpPageOut(page=x.page, url=x.url, text=EMPTY_JOIN)
    text = fold_ws(BeautifulSoup(html, PARSER_HTML).get_text(TEXT_JOIN_SEP, strip=True))
    return QcpPageOut(page=x.page, url=x.url, text=text)


def qc_fr_date_of(x: QcFrDateIn) -> str:
    """法文日期三格(日 / 月名 / 年)→ ISO;原句没找到或月名认不出 → 记一条问题、交回空串。"""
    if x.m is not None:
        month = FR_MONTHS.get(x.m.group(2).lower())
        if month is not None:
            return ISO_DATE_TPL.format(y=int(x.m.group(3)), m=month, d=int(x.m.group(1)))
    x.problems.append(QCP_PROBLEM_TPL.format(page=x.page, what=x.what))
    return EMPTY_JOIN


def qcp_intake_of(x: QcpIntakeIn) -> dict:
    """收件窗口块(取自临时工分支页的重开公告;两个分支页同一段公告):重开期起止、本轮收件起止、资格截点日 + 原句。"""
    win = qc_find(QcFindIn(text=x.page.text, rx=QCP_WINDOW_RE, problems=x.problems,
                           problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_WINDOW)))
    intake = qc_find(QcFindIn(text=x.page.text, rx=QCP_INTAKE_RE, problems=x.problems,
                              problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_INTAKE)))
    cutoff = qc_fr_date_of(QcFrDateIn(m=QCP_CUTOFF_RE.search(x.page.text), what=QCP_WHAT_CUTOFF, page=x.page.page,
                                      problems=x.problems))
    out = {K_PROGRAM_OPENS: EMPTY_JOIN, K_PROGRAM_CLOSES: EMPTY_JOIN, K_INTAKE_OPENS: EMPTY_JOIN,
           K_INTAKE_CLOSES: EMPTY_JOIN, K_ELIGIBLE_AS_OF: cutoff, K_QUOTE: EMPTY_JOIN}
    if win is not None:
        out[K_PROGRAM_OPENS] = qc_fr_iso_of(QcFrPartsIn(day=win.group(2), month=win.group(3), year=win.group(4),
                                                        page=x.page.page, problems=x.problems))
        out[K_PROGRAM_CLOSES] = qc_fr_iso_of(QcFrPartsIn(day=win.group(5), month=win.group(6), year=win.group(7),
                                                         page=x.page.page, problems=x.problems))
    if intake is not None:
        out[K_INTAKE_OPENS] = qc_fr_iso_of(QcFrPartsIn(day=intake.group(1), month=intake.group(2),
                                                       year=intake.group(5), page=x.page.page, problems=x.problems))
        out[K_INTAKE_CLOSES] = qc_fr_iso_of(QcFrPartsIn(day=intake.group(3), month=intake.group(4),
                                                        year=intake.group(5), page=x.page.page, problems=x.problems))
        out[K_QUOTE] = intake.group(0)
    return out


def qc_fr_iso_of(x: QcFrPartsIn) -> str:
    """法文日期拆好的三格 → ISO;月名认不出 → 记一条问题、交回空串。"""
    month = FR_MONTHS.get(x.month.lower())
    if month is None:
        x.problems.append(QCP_PROBLEM_TPL.format(page=x.page, what=QCP_WHAT_DATE))
        return EMPTY_JOIN
    return ISO_DATE_TPL.format(y=int(x.year), m=month, d=int(x.day))


def to_qc_peq_req(x: ReqIn) -> dict:
    """PEQ 门槛一行(标准形,走共用 to_std_req;缺省通道 = 临时工分支、缺省出处 = 临时工分支页)。"""
    return to_std_req(StdReqIn(req=x, stream=QCP_STREAM_TFW, url=QCP_TFW_URL))


def qcp_common_rows(x: QcpRowsIn) -> None:
    """两个分支共有的三行:年龄、申请人口语、配偶口语(各分支页各写一遍,逐页取)。"""
    age = qc_find(QcFindIn(text=x.page.text, rx=QCP_AGE_RE, problems=x.problems,
                           problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_AGE)))
    oral = qc_find(QcFindIn(text=x.page.text, rx=QCP_ORAL_RE, problems=x.problems,
                            problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_LANG)))
    spouse = qc_find(QcFindIn(text=x.page.text, rx=QCP_SPOUSE_RE, problems=x.problems,
                              problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_SPOUSE)))
    if age is not None:
        x.rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_AGE, stream=x.stream, value=int(age.group(1)),
                                          unit=UNIT_YEARS, url=x.page.url, label=age.group(0))))
    if oral is not None:
        x.rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.stream, value=int(oral.group(1)),
                                          unit=QCR_UNIT_FR, basis=QCR_BASIS_ORAL, url=x.page.url,
                                          label=oral.group(0))))
    if spouse is not None:
        x.rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_LANGUAGE, stream=x.stream, subject=QCR_SUBJECT_SPOUSE,
                                          value=int(spouse.group(1)), unit=QCR_UNIT_FR, basis=QCR_BASIS_ORAL,
                                          url=x.page.url, label=spouse.group(0))))


def qcp_tfw_reqs(x: QcpReqsIn) -> ReqsOut:
    """临时工分支:共有三行 + TEER 0-3 + 近 36 个月至少 24 个月全职(魁省)+ 本轮收件条件(截点日前满 N 年)。"""
    rows: list = []
    problems: list = []
    qcp_common_rows(QcpRowsIn(page=x.page, stream=QCP_STREAM_TFW, rows=rows, problems=problems))
    teer = qc_find(QcFindIn(text=x.page.text, rx=QCP_TEER_RE, problems=problems,
                            problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_TEER)))
    exp = qc_find(QcFindIn(text=x.page.text, rx=QCP_EXP_RE, problems=problems,
                           problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_EXP)))
    full = qc_find(QcFindIn(text=x.page.text, rx=QCP_FULLTIME_RE, problems=problems,
                            problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_FULLTIME)))
    recept = qc_find(QcFindIn(text=x.page.text, rx=QCP_RECEPT_TFW_RE, problems=problems,
                              problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_RECEPT)))
    if teer is None or exp is None or full is None or recept is None:
        return ReqsOut(rows=rows, problems=problems)
    levels = qc_teer_of(teer.group(1))
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_OCC_PATHWAY, stream=QCP_STREAM_TFW, op=OP_RULE,
                                    applies_teer=levels, url=x.page.url, label=teer.group(0))))
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=QCP_STREAM_TFW, value=int(exp.group(1)),
                                    unit=UNIT_MONTHS, applies_teer=levels,
                                    basis=QCP_BASIS_EXP_TPL.format(n=exp.group(2), h=full.group(1)),
                                    url=x.page.url, label=exp.group(0))))
    years = qc_n_of(recept.group(2))
    if years is None:
        problems.append(QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_RECEPT))
        return ReqsOut(rows=rows, problems=problems)
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_EXPERIENCE, stream=QCP_STREAM_TFW,
                                    value=years * QCR_MONTHS_PER_YEAR, unit=UNIT_MONTHS,
                                    applies_teer=qc_teer_of(recept.group(1)),
                                    basis=QCP_BASIS_CUTOFF_TPL.format(date=x.as_of), url=x.page.url,
                                    label=recept.group(0))))
    return ReqsOut(rows=rows, problems=problems)


def qcp_grad_reqs(x: QcpReqsIn) -> ReqsOut:
    """毕业生分支:共有三行 + 书面法语 + 申请前 N 个月内毕业 + DEP 最低学时 + 本轮收件条件(截点日前已拿到合格学历)。"""
    rows: list = []
    problems: list = []
    qcp_common_rows(QcpRowsIn(page=x.page, stream=QCP_STREAM_GRAD, rows=rows, problems=problems))
    written = qc_find(QcFindIn(text=x.page.text, rx=QCP_WRITTEN_RE, problems=problems,
                               problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_LANG)))
    window = qc_find(QcFindIn(text=x.page.text, rx=QCP_GRAD_WINDOW_RE, problems=problems,
                              problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCR_WHAT_EDU)))
    dep = qc_find(QcFindIn(text=x.page.text, rx=QCP_DEP_HOURS_RE, problems=problems,
                           problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_DEP)))
    recept = qc_find(QcFindIn(text=x.page.text, rx=QCP_RECEPT_GRAD_RE, problems=problems,
                              problem=QCP_PROBLEM_TPL.format(page=x.page.page, what=QCP_WHAT_RECEPT)))
    if written is None or window is None or dep is None or recept is None:
        return ReqsOut(rows=rows, problems=problems)
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_LANGUAGE, stream=QCP_STREAM_GRAD, value=int(written.group(1)),
                                    unit=QCR_UNIT_FR, basis=QCR_BASIS_WRITTEN, url=x.page.url,
                                    label=written.group(0))))
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_EDUCATION, stream=QCP_STREAM_GRAD, op=OP_RULE,
                                    basis=QCP_BASIS_WINDOW_TPL.format(n=window.group(1)), url=x.page.url,
                                    label=window.group(0))))
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_EDUCATION, stream=QCP_STREAM_GRAD, value=int_of(dep.group(1)),
                                    unit=QCP_UNIT_HOURS, url=x.page.url, label=dep.group(0))))
    rows.append(to_qc_peq_req(ReqIn(factor=FACTOR_EDUCATION, stream=QCP_STREAM_GRAD, op=OP_RULE,
                                    value=int_of(recept.group(1)), unit=QCP_UNIT_HOURS,
                                    basis=QCP_BASIS_CUTOFF_TPL.format(date=x.as_of), url=x.page.url,
                                    label=recept.group(0))))
    return ReqsOut(rows=rows, problems=problems)


# =========================================================================
# 4. 年度移民计划(2026-09-29 立:技术工人的甄选数与入境数,实际 / 预测 / 计划)
# =========================================================================


def build_qc_stats() -> None:
    """魁省年度统计入口:年度移民计划 PDF(原件先落 crawl 层)→ 表 3 甄选数 + 表 4 入境数的「技术工人」行 →
    raw/pnp/qc-stats.json。本年计划区间与正文要点句交叉核对;任一条认不出或对不上 → 整份保留旧表。"""
    say(PRINT_OUT_TPL.format(path=OUT_QC_STATS))
    try:
        text = pdf_text(fetch_bytes(FetchHtmlIn(url=QCS_PLAN_URL, timeout_s=QCS_TIMEOUT_S)))
    except Exception as e:  # noqa: BLE001 — 下载 / 解 PDF 失败:留痕后按自校失败收口(文件不动)
        fail_zh([QCS_PROBLEM_FETCH_TPL.format(name=type(e).__name__, detail=e)])
        return
    plan = qcs_plan_of(text)
    if len(plan.problems) > 0:
        fail_zh(plan.problems)
        return
    paths.write_json(paths.WriteJsonIn(path=OUT_QC_STATS, payload={
        K_PROVINCE: PROV_QC, K_PROGRAM: QCS_CATEGORY, K_SOURCE: QCS_SOURCE, K_URL: QCS_PLAN_URL, K_NOTE: QCS_NOTE,
        K_AS_OF_LOWER: EMPTY_JOIN, K_FETCHED: today_iso(), K_PLAN_YEAR: plan.year,
        K_SELECTIONS: plan.selections, K_ADMISSIONS: plan.admissions,
    }, indent=INDENT_2))
    sel = plan.selections[-1]
    adm = plan.admissions[-1]
    say(QCS_PRINT_DONE_TPL.format(path=OUT_QC_STATS, year=plan.year, sel=len(plan.selections),
                                  adm=len(plan.admissions), smin=sel[K_VALUE], smax=sel[K_VALUE_MAX],
                                  amin=adm[K_VALUE], amax=adm[K_VALUE_MAX]))


def qcs_plan_of(text: str) -> QcsPlanOut:
    """计划 PDF 全文 → 计划年 + 甄选数行 + 入境数行 + 问题(纯函数,自测直接喂文本)。
    表 3 列序:实际 × 2、预测、本年计划 min / max;表 4 列序:实际 × 2、上年计划 min / max、上年预测 min / max、
    本年计划 min / max。本年计划两列必须与正文 5.2.1 / 5.2.2 要点句逐数相同,表 4 的本年计划年必须等于封面计划年。"""
    problems: list = []
    title = qc_find(QcFindIn(text=text, rx=QCS_TITLE_RE, problems=problems,
                             problem=QCS_PROBLEM_TPL.format(what=QCS_WHAT_TITLE)))
    t3 = qcs_table_of(QcsTableIn(text=text, head=QCS_T3_HEAD_RE, years=QCS_T3_YEARS_RE, n=QCS_T3_NUMS,
                                 what=QCS_WHAT_T3, problems=problems))
    t4 = qcs_table_of(QcsTableIn(text=text, head=QCS_T4_HEAD_RE, years=QCS_T4_YEARS_RE, n=QCS_T4_NUMS,
                                 what=QCS_WHAT_T4, problems=problems))
    sel = qc_find(QcFindIn(text=text, rx=QCS_SEL_RE, problems=problems,
                           problem=QCS_PROBLEM_TPL.format(what=QCS_WHAT_SEL)))
    adm = qc_find(QcFindIn(text=text, rx=QCS_ADM_RE, problems=problems,
                           problem=QCS_PROBLEM_TPL.format(what=QCS_WHAT_ADM)))
    if title is None or sel is None or adm is None or len(problems) > 0:
        return QcsPlanOut(year=0, selections=[], admissions=[], problems=problems)
    year = int(title.group(1))
    qcs_cross_check(QcsCrossIn(what=QCS_WHAT_SEL, table=t3.nums[3:], text=[int_of(sel.group(1)), int_of(sel.group(2))],
                               problems=problems))
    qcs_cross_check(QcsCrossIn(what=QCS_WHAT_ADM, table=t4.nums[6:], text=[int_of(adm.group(1)), int_of(adm.group(2))],
                               problems=problems))
    qcs_cross_check(QcsCrossIn(what=QCS_WHAT_TITLE, table=[t4.years[2]], text=[year], problems=problems))
    if len(problems) > 0:
        return QcsPlanOut(year=0, selections=[], admissions=[], problems=problems)
    y3 = t3.years
    n3 = t3.nums
    selections = [
        qcs_row_of(QcsRowIn(year=y3[0], kind=QCS_KIND_ACTUAL, value=n3[0], value_max=None, section=QCS_SECTION_T3)),
        qcs_row_of(QcsRowIn(year=y3[1], kind=QCS_KIND_ACTUAL, value=n3[1], value_max=None, section=QCS_SECTION_T3)),
        qcs_row_of(QcsRowIn(year=y3[2], kind=QCS_KIND_FORECAST, value=n3[2], value_max=None, section=QCS_SECTION_T3)),
        qcs_row_of(QcsRowIn(year=year, kind=QCS_KIND_PLAN, value=n3[3], value_max=n3[4], section=QCS_SECTION_T3)),
    ]
    y4 = t4.years
    n4 = t4.nums
    admissions = [
        qcs_row_of(QcsRowIn(year=y4[3], kind=QCS_KIND_ACTUAL, value=n4[0], value_max=None, section=QCS_SECTION_T4)),
        qcs_row_of(QcsRowIn(year=y4[4], kind=QCS_KIND_ACTUAL, value=n4[1], value_max=None, section=QCS_SECTION_T4)),
        qcs_row_of(QcsRowIn(year=y4[0], kind=QCS_KIND_PLAN, value=n4[2], value_max=n4[3], section=QCS_SECTION_T4)),
        qcs_row_of(QcsRowIn(year=y4[1], kind=QCS_KIND_FORECAST, value=n4[4], value_max=n4[5], section=QCS_SECTION_T4)),
        qcs_row_of(QcsRowIn(year=y4[2], kind=QCS_KIND_PLAN, value=n4[6], value_max=n4[7], section=QCS_SECTION_T4)),
    ]
    return QcsPlanOut(year=year, selections=selections, admissions=admissions, problems=problems)


def qcs_table_of(x: QcsTableIn) -> QcsTableOut:
    """一张表的表头年份 + 「技术工人」行的数(只在表标题之后找);标题 / 表头 / 行名认不出或数的个数不对 → 记一条问题,
    交回占位(年份与数都补零到应有个数,调用方见问题即不用)。"""
    empty = QcsTableOut(years=[0, 0, 0, 0, 0], nums=[0] * x.n)
    h = x.head.search(x.text)
    if h is None:
        x.problems.append(QCS_PROBLEM_TPL.format(what=x.what))
        return empty
    part = x.text[h.end():]
    y = x.years.search(part)
    row = QCS_ROW_RE.search(part)
    if y is None or row is None:
        x.problems.append(QCS_PROBLEM_TPL.format(what=x.what))
        return empty
    nums = qcs_row_nums_of(part[row.end():])
    if len(nums) != x.n:
        x.problems.append(QCS_PROBLEM_TPL.format(what=x.what))
        return empty
    years: list = []
    for g in y.groups():
        years.append(int(g))
    return QcsTableOut(years=years, nums=nums)


def qcs_row_nums_of(rest: str) -> list:
    """行名之后逐行取数,碰到带字母的行(下一行名)为止;一行两个数(区间)各取。"""
    nums: list = []
    for line in rest.splitlines():
        if QCS_LETTER_RE.search(line) is not None:
            break
        for m in QCS_NUM_RE.finditer(line):
            nums.append(int_of(m.group(0)))
    return nums


def qcs_cross_check(x: QcsCrossIn) -> None:
    """交叉核对:表里的数与正文要点句逐数相同,不同 → 记一条问题。"""
    if x.table != x.text:
        x.problems.append(QCS_PROBLEM_CROSS_TPL.format(what=x.what, table=x.table, text=x.text))


def qcs_row_of(x: QcsRowIn) -> dict:
    """一行统计(形同九省 *-stats.json 的逐年行,多 kind / valueMax 两格)。"""
    return {K_YEAR: x.year, K_KIND: x.kind, K_VALUE: x.value, K_VALUE_MAX: x.value_max, K_UNIT: QCS_UNIT_PEOPLE,
            K_LABEL: QCS_LABEL_TPL.format(table=x.section, row=QCS_CATEGORY, year=x.year, kind=x.kind),
            K_SECTION: x.section, K_URL: QCS_PLAN_URL, K_FETCHED: today_iso()}


# =========================================================================
# 5. PSTQ 职业 → 通道对照(2026-09-29 立,Frank「开工」:焊工能走几个通道要按官方对照,不按 TEER 推)
# =========================================================================


def build_qc_noc_streams() -> None:
    """职业 → 通道对照入口:官方查询工具的数据表(xlsx)+《受监管职业清单》PDF(原件都先落 crawl 层)→
    raw/pnp/qc-noc-streams.json。516 个 NOC 逐个写明可进的通道与细分码;通道 3 的码数与清单开头的三个总数交叉核对。
    任一条认不出或对不上 → 整份保留旧表。"""
    say(PRINT_OUT_TPL.format(path=OUT_QC_NOC_STREAMS))
    try:
        book = cast(QcBookLike, openpyxl.load_workbook(
            BytesIO(fetch_bytes(FetchHtmlIn(url=QCN_XLSX_URL, timeout_s=QCN_TIMEOUT_S))), read_only=True))
        rows = qc_sheet_rows(book[QCN_SHEET_ROWS])
        codes = qc_sheet_rows(book[QCN_SHEET_CODES])
        pdf = pdf_text(fetch_bytes(FetchHtmlIn(url=QCN_REGULATED_PDF_URL, timeout_s=QCN_TIMEOUT_S)))
    except Exception as e:  # noqa: BLE001 — 下载 / 解析 / 缺页:留痕后按自校失败收口(文件不动)
        fail_zh([QCN_PROBLEM_FETCH_TPL.format(name=type(e).__name__, detail=e)])
        return
    out = qcn_map_of(QcnMapIn(rows=rows, codes=codes, pdf=pdf))
    if len(out.problems) > 0:
        fail_zh(out.problems)
        return
    paths.write_json(paths.WriteJsonIn(path=OUT_QC_NOC_STREAMS, payload={
        K_PROVINCE: PROV_QC, K_PROGRAM: QCR_PROGRAM, K_SOURCE: QCR_SOURCE, K_URL: QCN_XLSX_URL,
        K_FETCHED: today_iso(), K_REGULATED_LIST: out.reg, K_NOCS: out.nocs,
    }, indent=INDENT_2))
    counts = qcn_stream_counts(out.nocs)
    say(QCN_PRINT_DONE_TPL.format(path=OUT_QC_NOC_STREAMS, n=len(out.nocs), s1=counts[1], s2=counts[2], s3=counts[3],
                                  ver=out.reg[K_VERSION], total=out.reg[K_TOTAL], full=out.reg[K_FULL],
                                  partial=out.reg[K_PARTIAL]))


def qc_sheet_rows(ws: QcSheetLike) -> list:
    """工作表 → 行清单(值元组)。"""
    rows: list = []
    for r in ws.iter_rows(values_only=True):
        rows.append(r)
    return rows


def qcn_map_of(x: QcnMapIn) -> QcnMapOut:
    """对照表两页 + 清单全文 → 逐 NOC 行 + 清单总数 + 问题(纯函数,自测直接喂行)。"""
    problems: list = []
    labels = qcn_labels_of(x.codes)
    nocs: list = []
    for r in x.rows[QCN_ROWS_SKIP:]:
        if len(r) < 3 or QCN_NOC_RE.match(str(r[0]).strip()) is None:
            continue
        nocs.append(qcn_row_of(QcnRowIn(row=r, labels=labels, problems=problems)))
    if len(nocs) != QCN_NOC_COUNT:
        problems.append(QCN_PROBLEM_TPL.format(what=QCN_WHAT_ROWS))
    reg = qcn_reg_of(QcnRegIn(pdf=x.pdf, problems=problems))
    if len(problems) == 0:
        full = qcn_count_kind(QcnKindIn(nocs=nocs, kinds=QCN_FULL_KINDS))
        partial = qcn_count_kind(QcnKindIn(nocs=nocs, kinds=QCN_PARTIAL_KINDS))
        qcn_cross_check(QcsCrossIn(what=QCN_WHAT_TOTAL, table=[full + partial], text=[reg[K_TOTAL]], problems=problems))
        qcn_cross_check(QcsCrossIn(what=QCN_WHAT_FULL, table=[full], text=[reg[K_FULL]], problems=problems))
        qcn_cross_check(QcsCrossIn(what=QCN_WHAT_PARTIAL, table=[partial], text=[reg[K_PARTIAL]], problems=problems))
    return QcnMapOut(nocs=nocs, reg=reg, problems=problems)


def qcn_labels_of(codes: list) -> dict:
    """细分码说明页 → {码: 官方说明}(码格有空的行跳过;数字码 1 / 2 也转成字符串键)。"""
    labels: dict = {}
    for r in codes[QCN_CODES_SKIP:]:
        if len(r) < 2 or r[0] is None:
            continue
        labels[str(r[0]).strip()] = fold_ws(str(r[1] or EMPTY_JOIN))
    return labels


def qcn_row_of(x: QcnRowIn) -> dict:
    """一个 NOC → {noc, name, streams};细分码查不到说明或认不出类 → 记一条问题、这个码不落。"""
    noc = str(x.row[0]).strip()
    streams: list = []
    for part in str(x.row[2]).split(QCN_CODE_SEP):
        code = part.strip()
        if code not in x.labels:
            x.problems.append(QCN_PROBLEM_TPL.format(what=QCN_WHAT_CODE_TPL.format(code=code, noc=noc)))
            continue
        kind = qcn_kind_of(code)
        stream = int_of(code.split(QCN_STREAM_SEP, 1)[0])
        if kind is None or stream is None:
            x.problems.append(QCN_PROBLEM_TPL.format(what=QCN_WHAT_KIND_TPL.format(code=code, noc=noc)))
            continue
        streams.append({K_STREAM: stream, K_CODE: code, K_KIND: kind, K_LABEL: x.labels[code]})
    return {K_NOC: noc, K_NAME: fold_ws(str(x.row[1] or EMPTY_JOIN)), K_STREAMS: streams}


def qcn_kind_of(code: str) -> str | None:
    """细分码 → 类:只有通道号 → all;后缀在 QCN_KINDS 里照表;PNER + 编号 → 部分受监管;其余认不出 → None。"""
    if QCN_STREAM_SEP not in code:
        return QCN_KIND_BASE
    suffix = code.split(QCN_STREAM_SEP, 1)[1]
    if suffix in QCN_KINDS:
        return QCN_KINDS[suffix]
    if QCN_PNER_RE.match(suffix) is not None:
        return QCN_KINDS[QCN_PNER_KEY]
    return None


def qcn_reg_of(x: QcnRegIn) -> dict:
    """《受监管职业清单》开头的三个总数 + 版本日;认不出 → 记一条问题,数记 0。"""
    total = QCN_TOTALS_RE.search(x.pdf)
    full = QCN_FULL_RE.search(x.pdf)
    partial = QCN_PARTIAL_RE.search(x.pdf)
    version = QCN_VERSION_RE.search(x.pdf)
    if total is None or full is None or partial is None or version is None:
        x.problems.append(QCN_PROBLEM_TPL.format(what=QCN_WHAT_TOTALS))
        return {K_TOTAL: 0, K_FULL: 0, K_PARTIAL: 0, K_VERSION: EMPTY_JOIN}
    iso = qc_fr_iso_of(QcFrPartsIn(day=version.group(1), month=version.group(2), year=version.group(3),
                                   page=QCN_WHAT_TOTALS, problems=x.problems))
    return {K_TOTAL: int(total.group(1)), K_FULL: int(full.group(1)), K_PARTIAL: int(partial.group(1)), K_VERSION: iso}


def qcn_count_kind(x: QcnKindIn) -> int:
    """数有几个 NOC 带某几类细分码(通道 3 的交叉核对:整类受监管 / 部分受监管)。"""
    n = 0
    for row in x.nocs:
        for s in row[K_STREAMS]:
            if s[K_KIND] in x.kinds:
                n += 1
                break
    return n


def qcn_cross_check(x: QcsCrossIn) -> None:
    """交叉核对:对照表里数出来的数与清单开头写的数逐数相同,不同 → 记一条问题。"""
    if x.table != x.text:
        x.problems.append(QCN_PROBLEM_CROSS_TPL.format(what=x.what, table=x.table, pdf=x.text))


def qcn_stream_counts(nocs: list) -> dict:
    """落盘报数用:每个通道有几个 NOC。"""
    counts: dict = {1: 0, 2: 0, 3: 0}
    for row in nocs:
        seen: list = []
        for s in row[K_STREAMS]:
            if s[K_STREAM] in counts and s[K_STREAM] not in seen:
                counts[s[K_STREAM]] += 1
                seen.append(s[K_STREAM])
    return counts


# =========================================================================
# 6. 魁省法语等级对照(2026-09-29 立,Frank「语言等级是不是统一用 CLB」:核下来统一不了,照录魁省官方对照表)
# =========================================================================


def build_qc_french_levels() -> None:
    """法语等级对照入口:《考试分数 ↔ 魁省法语等级对照表》PDF(原件先落 crawl 层)→ raw/pnp/qc-french-levels.json。
    逐「考试 × 技能」七档照录(魁省等级档、欧框级、分数上下限);任一条认不出 → 整份保留旧表。"""
    say(PRINT_OUT_TPL.format(path=OUT_QC_FRENCH_LEVELS))
    try:
        text = pdf_text(fetch_bytes(FetchHtmlIn(url=QCF_PDF_URL, timeout_s=QCN_TIMEOUT_S)))
    except Exception as e:  # noqa: BLE001 — 下载 / 解 PDF 失败:留痕后按自校失败收口(文件不动)
        fail_zh([QCF_PROBLEM_FETCH_TPL.format(name=type(e).__name__, detail=e)])
        return
    out = qcf_levels_of(text)
    if len(out.problems) > 0:
        fail_zh(out.problems)
        return
    paths.write_json(paths.WriteJsonIn(path=OUT_QC_FRENCH_LEVELS, payload={
        K_PROVINCE: PROV_QC, K_SOURCE: QCR_SOURCE, K_URL: QCF_PDF_URL, K_VERSION: out.version,
        K_FETCHED: today_iso(), K_TESTS: out.tests,
    }, indent=INDENT_2))
    say(QCF_PRINT_DONE_TPL.format(path=OUT_QC_FRENCH_LEVELS, ver=out.version, tests=len(qcf_test_names(out.tests)),
                                  rows=len(out.tests)))


def qcf_levels_of(text: str) -> QcfOut:
    """对照表全文 → 版本日 + 逐「考试 × 技能」七档 + 问题(纯函数,自测直接喂文本)。"""
    problems: list = []
    lines: list = []
    for raw in text.splitlines():
        if raw.strip() != EMPTY_JOIN:
            lines.append(raw.strip())
    version = qc_fr_date_of(QcFrDateIn(m=QCF_VERSION_RE.search(text), what=QCF_WHAT_VERSION, page=QCF_WHAT_BODY,
                                       problems=problems))
    levels = qcf_head_of(QcfHeadIn(lines=lines, head=QCF_LEVELS_HEAD, what=QCF_WHAT_LEVELS, problems=problems))
    cefr = qcf_head_of(QcfHeadIn(lines=lines, head=QCF_CEFR_HEAD, what=QCF_WHAT_CEFR, problems=problems))
    if QCF_BODY_HEAD not in lines or len(problems) > 0:
        problems.append(QCF_PROBLEM_TPL.format(what=QCF_WHAT_BODY))
        return QcfOut(version=version, tests=[], problems=problems)
    body = lines[lines.index(QCF_BODY_HEAD) + 1:]
    tests = qcf_rows_of(QcfBodyIn(lines=body, levels=levels, cefr=cefr, problems=problems))
    n = len(qcf_test_names(tests))
    if n < QCF_MIN_TESTS:
        problems.append(QCF_PROBLEM_TPL.format(what=QCF_WHAT_TESTS_TPL.format(n=n)))
    return QcfOut(version=version, tests=tests, problems=problems)


def qcf_head_of(x: QcfHeadIn) -> list:
    """找以行名开头的那一行,取其后七格;找不到或不足七格 → 记一条问题、交回空表。"""
    for i, line in enumerate(x.lines):
        if line.startswith(x.head):
            cells = x.lines[i + 1:i + 1 + QCF_BANDS]
            if len(cells) == QCF_BANDS:
                return cells
            break
    x.problems.append(QCF_PROBLEM_TPL.format(what=x.what))
    return []


def qcf_rows_of(x: QcfBodyIn) -> list:
    """正文逐行:非技能非分数的行拼成考试名(紧跟在分数格后面的第一行起一个新考试),技能行起一组,其后七格分数 →
    一行。某项技能不足七格就遇到下一行文字 → 记一条问题。第 2 页顶上重印的表头到「Pointages obtenus aux tests」为止,
    遇到这一行就把攒着的考试名清空(否则表头会拼进 DELF A1 的名字,首跑实撞)。"""
    rows: list = []
    name: list = []
    after_scores = True
    skill = EMPTY_JOIN
    scores: list = []
    for line in x.lines:
        if line == QCF_BODY_HEAD:
            name = []
            after_scores = True
            continue
        if QCF_SKILL_RE.match(line) is not None:
            skill = line
            scores = []
            continue
        if skill != EMPTY_JOIN and QCF_SCORE_RE.match(line) is not None:
            scores.append(line)
            if len(scores) == QCF_BANDS:
                bands = qcf_bands_of(QcfBandsIn(scores=scores, levels=x.levels, cefr=x.cefr))
                if qcf_rising(bands) is False:
                    x.problems.append(QCF_PROBLEM_TPL.format(what=QCF_WHAT_RISING_TPL.format(
                        test=TEXT_JOIN_SEP.join(name), skill=skill)))
                rows.append({K_TEST: TEXT_JOIN_SEP.join(name), K_SKILL: skill, K_BANDS: bands})
                skill = EMPTY_JOIN
                after_scores = True
            continue
        if skill != EMPTY_JOIN:
            x.problems.append(QCF_PROBLEM_TPL.format(what=QCF_WHAT_SKILL_TPL.format(test=TEXT_JOIN_SEP.join(name),
                                                                                    skill=skill)))
            skill = EMPTY_JOIN
        if after_scores:
            name = []
            after_scores = False
        name.append(line)
    if after_scores is False and len(name) > 0:
        x.problems.append(QCF_PROBLEM_TPL.format(what=QCF_WHAT_ORPHAN_TPL.format(test=TEXT_JOIN_SEP.join(name))))
    return rows


def qcf_bands_of(x: QcfBandsIn) -> list:
    """一项技能的七格 → 七档 {levelMin, levelMax, cefr, scoreMin, scoreMax}(只写一个数的格上下限相同)。"""
    bands: list = []
    for i in range(QCF_BANDS):
        lv = QCF_LEVEL_RE.match(x.levels[i])
        sc = QCF_SCORE_RE.match(x.scores[i])
        bands.append({K_LEVEL_MIN: qcf_num_of(qcf_low_of(lv)), K_LEVEL_MAX: qcf_num_of(qcf_high_of(lv)),
                      K_CEFR: x.cefr[i], K_SCORE_MIN: qcf_num_of(qcf_low_of(sc)),
                      K_SCORE_MAX: qcf_num_of(qcf_high_of(sc))})
    return bands


def qcf_rising(bands: list) -> bool:
    """七档里有数的格必须逐档递增(下一档下限 > 上一档上限);不递增 = 少了一格、把别处的数(如下一页页码「2」)吞成了
    分数格 —— 变异探针实撞:TEF 一组少一格时页码被当第七格,格数自校拦不住。"""
    prev = None
    for b in bands:
        if b[K_SCORE_MIN] is None:
            continue
        if prev is not None and b[K_SCORE_MIN] <= prev:
            return False
        prev = b[K_SCORE_MAX]
    return True


def qcf_low_of(m: re.Match | None) -> str | None:
    """「7-8」「400-499」「1」「12,5-25」的下限原文;认不出或「-」(不适用)→ None。"""
    if m is None:
        return None
    return m.group(1)


def qcf_high_of(m: re.Match | None) -> str | None:
    """上限原文(只写一个数时同下限);认不出或「-」→ None。"""
    if m is None or m.group(1) is None:
        return None
    if m.group(2) is None:
        return m.group(1)
    return m.group(2)


def qcf_num_of(s: str | None) -> int | float | None:
    """格子原文 → 数:整数给 int,「12,5」给 12.5;None 照给 None。"""
    if s is None:
        return None
    n = float(s.replace(QCF_DECIMAL_COMMA, QCF_DECIMAL_POINT))
    if n.is_integer():
        return int(n)
    return n


def qcf_test_names(tests: list) -> list:
    """考试名去重(报数与自校用)。"""
    names: list = []
    for t in tests:
        if t[K_TEST] not in names:
            names.append(t[K_TEST])
    return names


# =========================================================================
# 7. 自测入口
# =========================================================================


def run_qc_tests() -> None:
    """test_qc 步入口:跑本子域自测(用例集住 pnp/qc/scheme.py);有失败 sys.exit(1),门接住后记本步失败。
    pnp 共用段的 run_tests 不认识子域(共用段不 import 子域),所以子域自带入口,由 pnp/main 登记成 test_qc 步。"""
    suite = unittest.TestSuite()
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcExerciseTest))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcPlanTest))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcReqTest))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcNocTest))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(QcFrenchTest))
    if unittest.TextTestRunner(verbosity=TEST_VERBOSITY).run(suite).wasSuccessful() is False:
        sys.exit(1)
