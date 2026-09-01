"""
ee 域函数 —— 全部行为住这(照 company/pnp 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

原 3 个步骤文件 2026-08-30 批C 溶入本文件,一步一段(段横幅三行框 + N. 编号,
与 constants.py 同名同序镜像),各段入口函数与原脚本同名、一律零参,门(main.py)直调。
**零字符串令**:字面量全住 constants(文案 *_TPL 模板、JSON 键 K_ 词族、官方原句在 RULES);
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut。
日志口径:域内不裸 print,报数走 log.functions.say;各步原有的「✗ …(保留旧表)」行原样保留
(auto_update 按 ✗/! 行首升 ERROR 级,这就是本域的错误通道)。
硬闸口径不变:自校未过 → 保留旧表 + sys.exit(1) / SystemExit(原句),门见 SystemExit 直接中止
本轮(与旧 _steps 跑子进程「一步失败即中止」同语义)。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch / crawl)。
"""
import sys
from datetime import date, timedelta

from typing import cast

import httpx
from bs4 import BeautifulSoup

import paths
from log.functions import say
from fetch.constants import BROWSER_UA, HDR_UA, PARSER_HTML, WS_RE
from crawl.functions import get_cached_page
from ee.constants import (
    BENCHMARK_CLB, BENCHMARK_CLB_PREFIX, BENCHMARK_HEADERS, BENCHMARK_NCLC, BREAKDOWN_WORD,
    CACHE_MISS_TPL, CAT_HEAD_TAGS, CAT_MAP, CAT_MIN_CELLS, CAT_PRINT_DONE_TPL, CAT_PRINT_EMPTY_TPL,
    CAT_PRINT_ROW_TPL, CAT_SOURCE, CAT_TIMEOUT_S, CAT_URL, CELL_TAGS, COMMA, CRS_LETTERS,
    CRS_MIN_ROWS, CRS_NOTE, CRS_PRINT_DONE_TPL, CRS_PROBLEM_TPL, CRS_SOURCE, DRAWS_CAT_MAP,
    DRAWS_PRINT_DONE_TPL, DRAWS_PRINT_ROW_TPL, DRAWS_SOURCE, DRAWS_TIMEOUT_S, DRAWS_URL,
    ECA_EXPECTED, ECA_FACTOR, ECA_MIN_ROWS, ECA_PROBLEM_NO_TABLE, ECA_PROBLEM_ROWS_TPL,
    ELIG_NOTE, ELIG_PRINT_DONE_TPL, ELIG_PROGRAMS, ELIG_SOURCE, FRANCO_MISSING_HEADER,
    FSW_SECTION_LABEL, FSW_SECTION_LETTER, FSW_SEL_MIN_ROWS, FSW_SEL_PROBLEM_TPL, GCDS_DATE_TAG,
    HEAD_TAGS_23, HEAD_TAGS_234, HIST_DAYS_PER_MONTH, HIST_MONTHS, HIST_PER_CAT, IN_CRAWL_EE,
    IN_URL_CRS, IN_URL_ECA, IN_URL_LANG, IN_URL_PRINTED, INDENT_1, INDENT_2, K_BASIS,
    K_BENCHMARK, K_BY_CATEGORY, K_CATEGORIES, K_CELLS, K_CODE, K_COLUMN, K_CRITERION, K_CRS,
    K_DATE, K_DRAW_CRS, K_DRAW_DATE, K_DRAW_NAME, K_DRAW_NUMBER, K_DRAW_SIZE, K_FACTOR, K_FETCHED,
    K_HEADERS, K_HEADING, K_HISTORY, K_KEY, K_KIND, K_LABEL, K_LETTER, K_LEVEL_TEXT, K_MAX_QUOTES,
    K_NAME, K_NOC, K_NOC_TEER, K_NOTE, K_NUMBER, K_OCCUPATIONS, K_OP, K_PAGE, K_PAGE_UPDATED,
    K_POINTS, K_POINTS_TEXT, K_PROGRAM, K_PROGRAMS, K_PROVINCE, K_QUOTE, K_RECENT, K_REQUIREMENTS,
    K_ROUNDS, K_ROW_NO, K_ROWS, K_SECTION, K_SECTION_LABEL, K_SECTIONS, K_SELECTION_FACTORS,
    K_SIZE, K_SOURCE, K_STREAM, K_SUBJECT, K_TABLE, K_TABLE_NO, K_TABLES, K_TEER, K_TEST, K_TITLE,
    K_UNIT, K_URL, K_VALUE, K_VALUE_TEXT, KIND_DETAIL, KIND_SUMMARY, LANG_NOTE,
    LANG_PRINT_DONE_TPL, LANG_PROBLEM_COLS_TPL, LANG_PROBLEM_COUNT_TPL, LANG_PROBLEM_CTX_TPL,
    LANG_SOURCE, LANG_TABLE_N, LANG_TABLE_START, MAX_QUOTE_RE, NOC5_RE, NOC_TEER_HEADER,
    NUM_1_5_RE, OUT_CATEGORIES, OUT_CRS, OUT_DRAWS, OUT_ELIG, OUT_LANG, PAGE_FSW, PAGE_LANG,
    PAGE_RCIP_FRANCO, PAGE_RCIP_RURAL, POINTS_RE, PRINT_IN_TPL, PRINT_IN_URL_TPL, PRINT_OUT_TPL,
    PROGRAM_HEADINGS, PROGRAM_RCIP, PROVINCE_FED, QUOTE_CLIP, QUOTE_CURLY_LEFT, QUOTE_CURLY_RIGHT,
    QUOTE_MISSING_ROW_TPL, QUOTE_MISSING_TPL, QUOTE_STRAIGHT, DQUOTE_CURLY_LEFT,
    DQUOTE_CURLY_RIGHT, DQUOTE_STRAIGHT, RECENT_N, RULE_PAGES, RULES, SECTION_RE,
    SUBJECT_APPLICANT, TAG_H3, TAG_H4, TAG_MAIN, TAG_TABLE, TAG_TD, TAG_TR, TEER_RE, TEST_NAMES,
    TEXT_JOIN_SEP,
)
from ee.scheme import (
    SoupNodeLike,
    BucketFillIn, CatBucket, CatMatch, DrawsOut, EcaMatch, EligFetchedIn, GridRowsIn, HeadingOut,
    LangBodyIn, LangCtx, LangCtxIn, LangRowIn, LangTableIn, LoadOut, MissingSayIn, PageCtx, PageIn,
    PreviousHeadingIn, ReqRowIn, SectionOfIn, TableOut, ValueColsIn,
)

# =========================================================================
# 1. 共享词汇(≥2 段消费:落盘日戳)
# =========================================================================


def today_iso() -> str:
    """今天(本地日期,ISO)—— 类别清单与抽选轮次两表 fetched 的口径。

    ⚠ 与段4 不同:段4 的 fetched 是**该页真正被取回那天**(crawl 轮次日期),不是今天。
    """
    return date.today().isoformat()


# =========================================================================
# 2. 类别抽选职业清单(httpx 直取,替代 crawl 浏览器版)
# =========================================================================


def classify_category(heading: str) -> CatMatch:
    """标题文本 → 类别 (key, 中文标签);非类别表(抽选历史/汇总)返回两格空串。"""
    h = (heading or "").lower()
    for kw, key, lab in CAT_MAP:
        if kw in h:
            return CatMatch(key=key, label=lab)
    return CatMatch(key="", label="")


def cell_texts(tr: SoupNodeLike) -> list:
    """一行 → 各 td 的压平文本。"""
    cells = []
    for td in tr.find_all(TAG_TD):
        cells.append(td.get_text(TEXT_JOIN_SEP, strip=True))
    return cells


def noc_of(cells: list) -> str:
    """行里第一个整格五位 NOC 码;没有 = 空串(该行不是职业行)。"""
    for c in cells:
        if NOC5_RE.fullmatch(c):
            return c
    return ""


def title_of(cells: list) -> str:
    """行里最长的**非**纯数字格 = 职业名(等长取先见者,与原 max(key=len) 同值)。"""
    best = ""
    for c in cells:
        if NUM_1_5_RE.fullmatch(c):
            continue
        if len(c) > len(best):
            best = c
    return best


def teer_of(cells: list) -> int | None:
    """行里第一个 0–5 单数字格 = TEER;没有 = None(不猜)。"""
    for c in cells:
        if TEER_RE.fullmatch(c):
            return int(c)
    return None


def fill_cat_bucket(x: BucketFillIn) -> None:
    """一张类别表的数据行 → 桶里的职业行(同类别内按 NOC 去重)。"""
    for tr in x.table.find_all(TAG_TR):
        cells = cell_texts(tr)
        if len(cells) < CAT_MIN_CELLS:
            continue
        noc = noc_of(cells)
        if noc == "" or noc in x.bucket.seen:
            continue
        x.bucket.seen.add(noc)
        x.bucket.occupations.append({K_NOC: noc, K_TEER: teer_of(cells), K_TITLE: title_of(cells)})


def cat_buckets_of(soup: SoupNodeLike) -> dict:
    """整页 → 类别 key → 收集桶(表格上方最近的标题决定它属于哪一类)。"""
    cats: dict = {}
    for table in soup.find_all(TAG_TABLE):
        prev = table.find_previous(CAT_HEAD_TAGS)
        heading = ""
        if prev:
            heading = prev.get_text(TEXT_JOIN_SEP, strip=True)
        matched = classify_category(heading)
        if matched.key == "":
            continue
        bucket = cats.get(matched.key)
        if bucket is None:
            bucket = CatBucket(key=matched.key, label=matched.label, occupations=[], seen=set())
            cats[matched.key] = bucket
        fill_cat_bucket(BucketFillIn(bucket=bucket, table=table))
    return cats


def occupation_noc_of(occ: dict) -> str:
    """职业行的落盘排序键:NOC 码(原 lambda 出户成具名)。"""
    return occ[K_NOC]


def out_categories_of(cats: dict) -> list:
    """收集桶 → 落盘用的类别行(空类别丢弃;职业按 NOC 排序)。"""
    out = []
    for c in cats.values():
        if len(c.occupations) == 0:
            continue
        out.append({K_KEY: c.key, K_LABEL: c.label,
                    K_OCCUPATIONS: sorted(c.occupations, key=occupation_noc_of)})
    return out


def build_ircc_ee_categories() -> None:
    """联邦 Express Entry「类别抽选」职业清单 → raw/ee/federal-categories.json。

    canada.ca 该页 2026-07 实测 httpx 200 无 Akamai;DataTables 只是前端分页,原始 HTML
    表格行全量 → bs4 直接解析,无需浏览器。
    失败安全:抓不到 / 解析出的类别为空 → 跳过写盘、保留旧表(源站改版时不丢数据)。
    2026-08-31 批M:原 CAT_UA(Chrome/120,批C 溶解批留给收口判的那份)并进 BROWSER_UA。
    """
    r = httpx.get(CAT_URL, headers={HDR_UA: BROWSER_UA}, follow_redirects=True, timeout=CAT_TIMEOUT_S)
    r.raise_for_status()
    soup = cast(SoupNodeLike, BeautifulSoup(r.text, PARSER_HTML))
    out_cats = out_categories_of(cat_buckets_of(soup))
    total = 0
    for c in out_cats:
        total += len(c[K_OCCUPATIONS])
    if len(out_cats) == 0:
        say(CAT_PRINT_EMPTY_TPL.format(out=OUT_CATEGORIES))
        return
    OUT_CATEGORIES.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_CATEGORIES, payload={
        K_SOURCE: CAT_SOURCE, K_URL: CAT_URL,
        K_FETCHED: today_iso(), K_CATEGORIES: out_cats,
    }, indent=INDENT_2))
    say(CAT_PRINT_DONE_TPL.format(out=OUT_CATEGORIES, n=len(out_cats), total=total))
    for c in out_cats:
        say(CAT_PRINT_ROW_TPL.format(n=len(c[K_OCCUPATIONS]), label=c[K_LABEL]))


# =========================================================================
# 3. 抽选轮次(IRCC 开放 JSON,httpx 直取,无 Akamai/无需抓页)
# =========================================================================


def int_or_none(s: str | None) -> int | None:
    """'1,234' → 1234;缺格/空/非数字 → None(不猜)。

    ⚠ 原 _int 的 `(s or "")` 口径**原样保留**(2026-08-30 批C 是行为逐字不变的溶解批):
    非字符串入参走 AttributeError 分支同样得 None;不补 err() 留痕 —— 缺格是常态,
    留痕只会把日志刷满(同 company.days_since 的取舍),真要改口径另开批。
    """
    try:
        return int((s or "").replace(COMMA, "").strip())
    except (ValueError, AttributeError):
        return None


def draw_cat_key(name: str | None) -> str:
    """drawName → 类别 key;不在词表里 = 空串(不 join,只留作 recent 参考)。"""
    n = (name or "").lower()
    for kw, key in DRAWS_CAT_MAP:
        if kw in n:
            return key
    return ""


def to_draw_row(rd: dict) -> dict:
    """源轮次 → byCategory / history 行(键序即文件契约)。"""
    return {
        K_DATE: rd.get(K_DRAW_DATE), K_CRS: int_or_none(rd.get(K_DRAW_CRS)),
        K_SIZE: int_or_none(rd.get(K_DRAW_SIZE)), K_DRAW_NAME: rd.get(K_DRAW_NAME),
        K_DRAW_NUMBER: int_or_none(rd.get(K_DRAW_NUMBER)),
    }


def to_recent_row(rd: dict) -> dict:
    """源轮次 → recent 行(键名与 byCategory 不同是既有契约,别顺手统一)。"""
    return {
        K_DATE: rd.get(K_DRAW_DATE), K_CRS: int_or_none(rd.get(K_DRAW_CRS)),
        K_SIZE: int_or_none(rd.get(K_DRAW_SIZE)), K_NAME: rd.get(K_DRAW_NAME),
        K_NUMBER: int_or_none(rd.get(K_DRAW_NUMBER)),
    }


def collect_draws(rounds: list) -> DrawsOut:
    """全部轮次 → 每类别最近一次 + 每类别历次(源已按 drawNumber 降序,最新在前)。"""
    cutoff = (date.today() - timedelta(days=HIST_MONTHS * HIST_DAYS_PER_MONTH)).isoformat()
    by_cat: dict = {}
    history: dict = {}
    for rd in rounds:
        key = draw_cat_key(rd.get(K_DRAW_NAME))
        if key == "":
            continue
        row = to_draw_row(rd)
        if key not in by_cat:
            by_cat[key] = row
        h = history.setdefault(key, [])
        if len(h) < HIST_PER_CAT and (row[K_DATE] or "") >= cutoff:
            h.append(row)
    return DrawsOut(by_cat=by_cat, history=history)


def build_ircc_ee_draws() -> None:
    """联邦 Express Entry「抽选轮次」→ raw/ee/draws.json(byCategory / history / recent 三块)。

    2026-08-31 批M:原 DRAWS_UA 是裸 "Mozilla/5.0"(开放 JSON 端点不挑 UA),
    并进 BROWSER_UA 完整串。
    """
    r = httpx.get(DRAWS_URL, timeout=DRAWS_TIMEOUT_S, follow_redirects=True,
                  headers={HDR_UA: BROWSER_UA})
    r.raise_for_status()
    rounds = r.json().get(K_ROUNDS, [])
    got = collect_draws(rounds)
    recent = []
    for rd in rounds[:RECENT_N]:
        recent.append(to_recent_row(rd))
    OUT_DRAWS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_DRAWS, payload={
        K_SOURCE: DRAWS_SOURCE, K_URL: DRAWS_URL,
        K_FETCHED: today_iso(),
        K_BY_CATEGORY: got.by_cat, K_HISTORY: got.history, K_RECENT: recent,
    }, indent=INDENT_2))
    hist_n = 0
    for rows in got.history.values():
        hist_n += len(rows)
    say(DRAWS_PRINT_DONE_TPL.format(out=OUT_DRAWS, cats=len(got.by_cat), hist=hist_n,
                                    rounds=len(rounds)))
    for k, v in got.by_cat.items():
        say(DRAWS_PRINT_ROW_TPL.format(key=k, crs=v[K_CRS], date=v[K_DATE], size=v[K_SIZE],
                                       n=len(got.history.get(k, []))))


# =========================================================================
# 4. 官方口径:CRS/FSW 计分 + 语言换算 + 资格规则(只读 crawl 缓存,不重复发请求)
# =========================================================================


def norm(t: str) -> str:
    """归一化后再比对:弯引号→直引号、压空白 —— 引用核对不被排版噪音干扰(同 build_pgwp)。"""
    t = t.replace(QUOTE_CURLY_RIGHT, QUOTE_STRAIGHT).replace(QUOTE_CURLY_LEFT, QUOTE_STRAIGHT)
    t = t.replace(DQUOTE_CURLY_LEFT, DQUOTE_STRAIGHT).replace(DQUOTE_CURLY_RIGHT, DQUOTE_STRAIGHT)
    return WS_RE.sub(TEXT_JOIN_SEP, t).strip()


def load_page(url: str) -> LoadOut:
    """只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。"""
    hit = get_cached_page(url)
    if hit.html is None or hit.html == "":
        raise SystemExit(CACHE_MISS_TPL.format(url=url))
    main = cast(SoupNodeLike, BeautifulSoup(hit.html, PARSER_HTML).find(TAG_MAIN))
    return LoadOut(main=main, fetched=hit.fetched)


def page_updated(main: SoupNodeLike) -> str:
    """canada.ca「Page details」的官方改版日期(GCDS web component,不是 <time>)。找不到→空串。"""
    t = main.find(GCDS_DATE_TAG)
    if t:
        return t.get_text(strip=True)
    return ""


def parse_table(tbl: SoupNodeLike) -> TableOut:
    """一张 HTML 表 → (第一列表头, 其余列表头, 数据行)。表头 = 第一个 tr。"""
    rows = []
    for tr in tbl.find_all(TAG_TR):
        cells = []
        for c in tr.find_all(CELL_TAGS):
            cells.append(norm(c.get_text(TEXT_JOIN_SEP, strip=True)))
        if len(cells) > 0:
            rows.append(cells)
    if len(rows) == 0:
        return TableOut(factor="", columns=[], body=[])
    head = rows[0]
    return TableOut(factor=head[0], columns=head[1:], body=rows[1:])


def table_headers_of(parsed: TableOut) -> list:
    """拆开的表头还原成一整行(第一列表头 + 其余列表头)。"""
    headers = list(parsed.columns)
    headers.insert(0, parsed.factor)
    return headers


def as_points(text: str) -> int | None:
    """'90' → 90;'n/a' / 'Not eligible to apply' → None(原文留在 pointsText,不瞎猜)。"""
    m = POINTS_RE.fullmatch(text)
    if m is None:
        return None
    return int(m.group(1).replace(COMMA, ""))


def nearest_heading(tbl: SoupNodeLike) -> HeadingOut:
    """回溯最近的标题链 → (section 字母, section 名, 本表小标题, 是否 breakdown 明细表)。"""
    heading = ""
    letter = ""
    label = ""
    is_detail = False
    for h in tbl.find_all_previous(HEAD_TAGS_234):
        txt = norm(h.get_text(TEXT_JOIN_SEP, strip=True))
        if heading == "":
            heading = txt
        if BREAKDOWN_WORD in txt.lower():
            is_detail = True
        m = SECTION_RE.match(txt)
        if m:
            letter = m.group(1)
            label = m.group(2)
            break
    return HeadingOut(letter=letter, label=label, heading=heading, is_detail=is_detail)


def fsw_heading_of(tbl: SoupNodeLike) -> HeadingOut:
    """FSW 67 分表的段固定成 FSW/Selection factors、恒明细(原 grid_rows 的 lambda 覆盖)。"""
    return HeadingOut(letter=FSW_SECTION_LETTER, label=FSW_SECTION_LABEL,
                      heading=nearest_heading(tbl).heading, is_detail=True)


def section_of(x: SectionOfIn) -> HeadingOut:
    """按开关选段判据:FSW 表用固定段,其余回溯标题链。"""
    if x.fsw_section:
        return fsw_heading_of(x.table)
    return nearest_heading(x.table)


def kind_of(is_detail: bool) -> str:
    """窄表行的 kind:明细表 detail,速览表 summary。"""
    if is_detail:
        return KIND_DETAIL
    return KIND_SUMMARY


def grid_rows(x: GridRowsIn) -> list:
    """所有表 → 窄表行:一行 = 一个 criterion × 一个列表头。列数各表不同,窄表天然容纳。"""
    out: list = []
    idx = 0
    for tbl in x.page.main.find_all(TAG_TABLE):
        head = section_of(SectionOfIn(table=tbl, fsw_section=x.fsw_section))
        parsed = parse_table(tbl)
        for row in parsed.body:
            criterion = row[0]
            j = 0
            for cell in row[1:]:
                column = ""
                if j < len(parsed.columns):
                    column = parsed.columns[j]
                out.append({
                    K_SECTION: head.letter, K_SECTION_LABEL: head.label,
                    K_KIND: kind_of(head.is_detail),
                    K_TABLE: idx, K_HEADING: head.heading,
                    K_FACTOR: parsed.factor, K_CRITERION: criterion,
                    K_COLUMN: column,
                    K_POINTS: as_points(cell), K_POINTS_TEXT: cell,
                    K_URL: x.page.url, K_FETCHED: x.page.fetched,
                })
                j += 1
        idx += 1
    return out


def crs_sections(main: SoupNodeLike) -> list:
    """四段的官方 Maximum 原句原样收下(页面上没写的总分不替官方求和)。"""
    text = norm(main.get_text(TEXT_JOIN_SEP, strip=True))
    marks = []
    for h in main.find_all(HEAD_TAGS_23):
        htxt = norm(h.get_text(TEXT_JOIN_SEP, strip=True))
        m = SECTION_RE.match(htxt)
        if m is None:
            continue
        pos = text.find(htxt)
        if pos < 0:
            continue
        marks.append((m.group(1), m.group(2), pos))
    out = []
    i = 0
    for letter, lab, pos in marks:
        end = len(text)
        if i + 1 < len(marks):
            end = marks[i + 1][2]
        quotes = MAX_QUOTE_RE.findall(text[pos:end])
        out.append({K_LETTER: letter, K_LABEL: lab, K_MAX_QUOTES: sorted(set(quotes))})
        i += 1
    return out


def previous_heading(x: PreviousHeadingIn) -> str:
    """取本表之前最近一个命中白名单的标题;页面里的说明性 h3 不会误当 program。"""
    for h in x.table.find_all_previous(x.tag):
        text = norm(h.get_text(TEXT_JOIN_SEP, strip=True))
        if text in x.accepted:
            return x.accepted[text]
    return ""


def test_code_of(heading: str) -> str:
    """考试标题 → 官方考试全名(前缀匹配);认不出 = 空串。"""
    for prefix, code in TEST_NAMES.items():
        if heading.startswith(prefix):
            return code
    return ""


def benchmark_header_of(headers: list) -> str:
    """表头里的档位列(CLB Level / NCLC Level);没有 = 空串。"""
    for h in headers:
        if h in BENCHMARK_HEADERS:
            return h
    return ""


def benchmark_of(header: str) -> str:
    """档位列表头 → 尺子名(CLB / NCLC)。"""
    if header.startswith(BENCHMARK_CLB_PREFIX):
        return BENCHMARK_CLB
    return BENCHMARK_NCLC


def lang_body_of(x: LangBodyIn) -> list:
    """语言表数据行:空表或列数不齐 → 保留旧表。"""
    if len(x.body) == 0:
        raise SystemExit(LANG_PROBLEM_COLS_TPL.format(no=x.table_no))
    for r in x.body:
        if len(r) != x.width:
            raise SystemExit(LANG_PROBLEM_COLS_TPL.format(no=x.table_no))
    return x.body


def lang_ctx_of(x: LangCtxIn) -> LangCtx:
    """一张语言表的上下文:项目 / 考试 / 档位列;缺一 → 保留旧表。"""
    program = previous_heading(PreviousHeadingIn(table=x.table, tag=TAG_H3,
                                                 accepted=PROGRAM_HEADINGS))
    test_heading = norm(x.table.find_previous(TAG_H4).get_text(TEXT_JOIN_SEP, strip=True))
    test = test_code_of(test_heading)
    benchmark_header = benchmark_header_of(x.headers)
    if program == "" or test == "" or benchmark_header == "":
        raise SystemExit(LANG_PROBLEM_CTX_TPL.format(no=x.table_no, program=program, test=test,
                                                     benchmark=benchmark_header))
    return LangCtx(program=program, test=test, benchmark_header=benchmark_header)


def lang_value_cols(x: ValueColsIn) -> list:
    """成绩列下标 = 除档位列与 TEER 列以外的全部列。"""
    out = []
    for i in range(x.total):
        if i == x.level_idx:
            continue
        if i == x.teer_idx:
            continue
        out.append(i)
    return out


def teer_index_of(headers: list) -> int:
    """TEER 列下标;本表没这列 = -1(原 None 哨兵的显式化)。"""
    if NOC_TEER_HEADER in headers:
        return headers.index(NOC_TEER_HEADER)
    return -1


def to_lang_row(x: LangRowIn) -> dict:
    """语言表一行 → 落盘行(原始分数区间只存 valueText,不在 raw 层补边界)。"""
    noc_teer = ""
    if x.teer_idx >= 0:
        noc_teer = x.row[x.teer_idx]
    cells = []
    for i in x.value_cols:
        cells.append({K_COLUMN: x.headers[i], K_VALUE_TEXT: x.row[i]})
    return {
        K_ROW_NO: x.row_no,
        K_LEVEL_TEXT: x.row[x.level_idx],
        K_NOC_TEER: noc_teer,
        K_CELLS: cells,
    }


def to_lang_table(x: LangTableIn) -> dict:
    """一张语言表 → 落盘结构(表号、项目、考试、尺子、原表头、逐行档位全部保留)。"""
    parsed = parse_table(x.table)
    headers = table_headers_of(parsed)
    body = lang_body_of(LangBodyIn(body=parsed.body, width=len(headers), table_no=x.table_no))
    ctx = lang_ctx_of(LangCtxIn(table=x.table, table_no=x.table_no, headers=headers))
    level_idx = headers.index(ctx.benchmark_header)
    teer_idx = teer_index_of(headers)
    value_cols = lang_value_cols(ValueColsIn(total=len(headers), level_idx=level_idx,
                                             teer_idx=teer_idx))
    rows = []
    row_no = 0
    for row in body:
        rows.append(to_lang_row(LangRowIn(row=row, row_no=row_no, headers=headers,
                                          level_idx=level_idx, teer_idx=teer_idx,
                                          value_cols=value_cols)))
        row_no += 1
    return {
        K_TABLE_NO: x.table_no, K_PROGRAM: ctx.program, K_TEST: ctx.test,
        K_BENCHMARK: benchmark_of(ctx.benchmark_header),
        K_HEADERS: headers,
        K_ROWS: rows,
        K_URL: x.page.url, K_FETCHED: x.page.fetched,
    }


def language_tables(x: PageIn) -> list:
    """language-test.html 的 T4–T26 → 23 张原表的稳定结构;数字不在这里换算或推导。"""
    selected = x.main.find_all(TAG_TABLE)[LANG_TABLE_START:]
    if len(selected) != LANG_TABLE_N:
        raise SystemExit(LANG_PROBLEM_COUNT_TPL.format(n=len(selected)))
    out = []
    table_no = LANG_TABLE_START
    for tbl in selected:
        out.append(to_lang_table(LangTableIn(table_no=table_no, table=tbl, page=x)))
        table_no += 1
    return out


def eca_table_of(main: SoupNodeLike) -> EcaMatch:
    """ECA 页里表头逐字等于 ECA_EXPECTED 的那张表(靠表头定位,不靠表序号)。"""
    table_no = 0
    for tbl in main.find_all(TAG_TABLE):
        parsed = parse_table(tbl)
        if table_headers_of(parsed) == ECA_EXPECTED:
            return EcaMatch(table_no=table_no, body=parsed.body, found=True)
        table_no += 1
    return EcaMatch(table_no=0, body=[], found=False)


def fsw_education_rows(x: PageIn) -> list:
    """ECA 报告解读页的 FSW 教育表;一行保留一个官方 assessment result 别名。"""
    match = eca_table_of(x.main)
    if not match.found:
        raise SystemExit(ECA_PROBLEM_NO_TABLE)
    rows = []
    for result, profile_level, points_text in match.body:
        rows.append({
            K_SECTION: FSW_SECTION_LETTER, K_SECTION_LABEL: FSW_SECTION_LABEL,
            K_KIND: KIND_DETAIL, K_TABLE: match.table_no,
            K_HEADING: profile_level,
            K_FACTOR: ECA_FACTOR, K_CRITERION: result,
            K_COLUMN: ECA_EXPECTED[2],
            K_POINTS: as_points(points_text), K_POINTS_TEXT: points_text,
            K_URL: x.url, K_FETCHED: x.fetched,
        })
    if len(rows) < ECA_MIN_ROWS:
        raise SystemExit(ECA_PROBLEM_ROWS_TPL.format(n=len(rows)))
    return rows


def load_rule_pages() -> dict:
    """规则核验要用的九页:页键 → PageCtx(URL / 取回日 / <main> / 归一化全文)。"""
    pages: dict = {}
    for key, url in RULE_PAGES:
        loaded = load_page(url)
        pages[key] = PageCtx(url=url, fetched=loaded.fetched, main=loaded.main,
                             text=norm(loaded.main.get_text(TEXT_JOIN_SEP, strip=True)))
    return pages


def missing_quotes(pages: dict) -> list:
    """引用逐字核验:归一化后仍在各自页面上的才算数,不在的整表不更新。"""
    out = []
    for r in RULES:
        if norm(str(r[K_QUOTE])) not in pages[r[K_PAGE]].text:
            out.append(r)
    return out


def franco_missing_quotes(pages: dict) -> list:
    """RCIP 经验行的交叉核验:Rural 页的原句在 Franco 页上也必须逐字命中。"""
    franco = pages[PAGE_RCIP_FRANCO].text
    out = []
    for r in RULES:
        if r[K_PROGRAM] != PROGRAM_RCIP:
            continue
        if r[K_PAGE] != PAGE_RCIP_RURAL:
            continue
        if norm(str(r[K_QUOTE])) not in franco:
            out.append(r)
    return out


def say_missing(x: MissingSayIn) -> None:
    """核验未过:抬头 + 逐条明细 → 退出码 1(**保留旧表不覆盖**)。

    门直调本域函数,SystemExit 不被 `except Exception` 接住 —— 与旧 _steps 跑子进程时
    「某步 exit 1 即中止本轮」逐字同语义。
    """
    say(x.header)
    for r in x.rules:
        say(QUOTE_MISSING_ROW_TPL.format(program=r[K_PROGRAM], factor=r[K_FACTOR],
                                         quote=r[K_QUOTE][:QUOTE_CLIP]))
    sys.exit(1)


def to_req_row(x: ReqRowIn) -> dict:
    """一条人抄的规则 → 落盘门槛行(形状对齐 raw/ircc/pgwp_rules.json)。"""
    return {
        K_PROGRAM: x.rule[K_PROGRAM], K_STREAM: x.rule.get(K_STREAM, ""),
        K_SUBJECT: SUBJECT_APPLICANT,
        K_FACTOR: x.rule[K_FACTOR], K_OP: x.rule[K_OP], K_VALUE: x.rule[K_VALUE],
        K_VALUE_TEXT: x.rule[K_QUOTE],
        K_UNIT: x.rule[K_UNIT], K_BASIS: x.rule.get(K_BASIS, ""), K_LABEL: x.rule[K_LABEL],
        K_URL: x.page.url, K_FETCHED: x.page.fetched,
    }


def elig_fetched_of(x: EligFetchedIn) -> str:
    """表级 fetched = ECA 页与九页里最新的那个取回日。"""
    stamps = [x.eca_fetched]
    for p in x.pages.values():
        stamps.append(p.fetched)
    return max(stamps)


def elig_programs_of(pages: dict) -> list:
    """programs 块:项目码 / 全名 / 出处页 / 取回日 / 官方改版日。"""
    out = []
    for code, name, key in ELIG_PROGRAMS:
        p = pages[key]
        out.append({K_CODE: code, K_NAME: name, K_URL: p.url,
                    K_FETCHED: p.fetched, K_PAGE_UPDATED: page_updated(p.main)})
    return out


def build_ee_crs_grid() -> None:
    """第 1 小步:CRS 计分表 → OUT_CRS(段字母不齐或行数不足 = 保留旧表 exit 1)。"""
    loaded = load_page(IN_URL_CRS)
    rows = grid_rows(GridRowsIn(page=PageIn(main=loaded.main, url=IN_URL_CRS,
                                            fetched=loaded.fetched), fsw_section=False))
    sections = crs_sections(loaded.main)
    letters = set()
    for s in sections:
        letters.add(s[K_LETTER])
    if letters != CRS_LETTERS or len(rows) < CRS_MIN_ROWS:
        raise SystemExit(CRS_PROBLEM_TPL.format(letters=sorted(letters), n=len(rows)))
    OUT_CRS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_CRS, payload={
        K_SOURCE: CRS_SOURCE,
        K_URL: IN_URL_CRS, K_FETCHED: loaded.fetched, K_PAGE_UPDATED: page_updated(loaded.main),
        K_NOTE: CRS_NOTE,
        K_SECTIONS: sections,
        K_ROWS: rows,
    }, indent=INDENT_1))
    say(CRS_PRINT_DONE_TPL.format(n=len(rows), sections=len(sections), out=OUT_CRS.name))


def build_ee_eligibility(pages: dict) -> None:
    """第 2 小步:资格规则(quote-anchored)+ FSW 67 分 selection factors → OUT_ELIG。"""
    missing = missing_quotes(pages)
    if len(missing) > 0:
        say_missing(MissingSayIn(header=QUOTE_MISSING_TPL.format(n=len(missing), total=len(RULES)),
                                 rules=missing))
    franco = franco_missing_quotes(pages)
    if len(franco) > 0:
        say_missing(MissingSayIn(header=FRANCO_MISSING_HEADER, rules=franco))
    reqs = []
    for r in RULES:
        reqs.append(to_req_row(ReqRowIn(rule=r, page=pages[r[K_PAGE]])))
    fsw = pages[PAGE_FSW]
    sel = grid_rows(GridRowsIn(page=PageIn(main=fsw.main, url=fsw.url, fetched=fsw.fetched),
                               fsw_section=True))
    if len(sel) < FSW_SEL_MIN_ROWS:
        raise SystemExit(FSW_SEL_PROBLEM_TPL.format(n=len(sel)))
    eca = load_page(IN_URL_ECA)
    education = fsw_education_rows(PageIn(main=eca.main, url=IN_URL_ECA, fetched=eca.fetched))
    for row in education:
        sel.append(row)
    paths.write_json(paths.WriteJsonIn(path=OUT_ELIG, payload={
        K_SOURCE: ELIG_SOURCE,
        K_PROVINCE: PROVINCE_FED,
        K_FETCHED: elig_fetched_of(EligFetchedIn(eca_fetched=eca.fetched, pages=pages)),
        K_NOTE: ELIG_NOTE,
        K_PROGRAMS: elig_programs_of(pages),
        K_REQUIREMENTS: reqs,
        K_SELECTION_FACTORS: sel,
    }, indent=INDENT_1))
    say(ELIG_PRINT_DONE_TPL.format(reqs=len(reqs), sel=len(sel), eca=len(education),
                                   out=OUT_ELIG.name))


def build_ee_language_grid(pages: dict) -> None:
    """第 3 小步:语言成绩 ↔ CLB/NCLC 换算(T4–T26,独立于计分表)→ OUT_LANG。"""
    lang = pages[PAGE_LANG]
    tables = language_tables(PageIn(main=lang.main, url=IN_URL_LANG, fetched=lang.fetched))
    paths.write_json(paths.WriteJsonIn(path=OUT_LANG, payload={
        K_SOURCE: LANG_SOURCE,
        K_URL: IN_URL_LANG, K_FETCHED: lang.fetched,
        K_PAGE_UPDATED: page_updated(lang.main),
        K_NOTE: LANG_NOTE,
        K_TABLES: tables,
    }, indent=INDENT_1))
    levels = 0
    for t in tables:
        levels += len(t[K_ROWS])
    say(LANG_PRINT_DONE_TPL.format(tables=len(tables), levels=levels, out=OUT_LANG.name))


def build_ircc_ee_rules() -> None:
    """联邦 EE 官方口径入口:CRS/FSW 计分 + 语言换算 + 资格规则(三张表)。

    一个关注点一个脚本(宪法 §清洗-3):CRS 计分与 CEC/FSW/FST 资格同源于同一次 fed-ee 爬取、
    共用同一套「HTML 表 → 窄表行」解析器,故一段集中产出。
    两种数据两种做法:
      · **CRS 计分表** = 官方 HTML 表格,机器逐格解析成**窄表**(一行 = 一个 criterion × 一列表头),
        列数各表不同(2~5 列)→ 窄表天然容纳,不必为每张表定宽列。数字原样搬,不折算、不推导。
      · **资格规则** = 散在正文里的句子,照 build_pgwp 的 **quote-anchored** 惯例:规则由人从
        原文抄成结构化行,每轮跑再逐条验证 `valueText` 仍逐字在页面上;引用消失(改版)→
        **保留旧表 + exit 1**,绝不拿半份数据盖好数据。
    举证纪律:每行带 {url, fetched},fetched = 该页**真正被取回**那天(crawl 轮次日期),不是今天。
    页面没写的东西一律不写(如 CRS 总分 1200 分:官方页面上并无「1,200」字样 → 本表只落各段
    官方原文写明的 Maximum 句子,不替官方求和)。抓不到 → not-collected,绝不写「官方不公布」。
    """
    say(PRINT_IN_TPL.format(path=IN_CRAWL_EE))
    for u in IN_URL_PRINTED:
        say(PRINT_IN_URL_TPL.format(url=u))
    say(PRINT_OUT_TPL.format(path=OUT_CRS))
    say(PRINT_OUT_TPL.format(path=OUT_ELIG))
    say(PRINT_OUT_TPL.format(path=OUT_LANG))
    build_ee_crs_grid()
    pages = load_rule_pages()
    build_ee_eligibility(pages)
    build_ee_language_grid(pages)
