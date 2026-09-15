"""
gcjobs 域函数 —— 五段与 constants.py / scheme.py 同名同序镜像:搜索分页枚举 → 岗位页抓取 → 岗位页解析
→ postings 仓。顶层只有 function;常量归 constants,形状归 scheme。

数据链(2026-09-02 铁律):列表页与岗位页正文经 crawl 批量写门进 data/crawl/board-gcjobs/,
抽出的事实进 data/raw/gcjobs/jobs.json,归一后的行进 data/processed/gcjobs/postings.json;
跨源清洗(地点归一 / 薪资归一 / 试点打标)仍归 mart 域,本域只做「值级」清洗(to_* 行构造器)。
站的取法(2026-09-13 实测):壳页拿会话 → 同 URL 再带 isSecondPartOfPage=1 拿正文;翻页参数与正文标一次发。

@author Frank
@time 2026-09-13
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict
from datetime import date, datetime, timezone
from html import unescape
from pathlib import Path
from typing import cast

import paths
from paths import JOBBANK_STORE_LOCK, jobbank_store_lock
from bs4 import BeautifulSoup, Tag

from fetch.constants import PARSER_HTML
from fetch.functions import make_client, make_polite_client
from log.functions import err, say
from crawl.functions import get_cached_page, load_cache_index, put_cached_page, put_cached_pages
from crawl.scheme import CachePage, CachePutIn, CachePutManyIn
from gcjobs import DETAILS_PER_RUN
from gcjobs.constants import (
    ACCEPT_LANGUAGE, ATTR_TYPE, BLOCK_END_RE, BR_RE, CLIENT_TIMEOUT_S, CLOSING_CUT, CLOSING_FMTS, CLOSING_PREFIX,
    CLOSING_RE, DESC_LANG_TPL, DESC_LEVEL_TPL, DESC_WHO_TPL, DETAIL_MARK_EXTERNAL, DETAIL_MARK_INTERNAL,
    DETAIL_SLEEP_S, DETAIL_TICK, ENC_UTF8, ERRORS_REPLACE, ERR_NO_SESSION, EXTERNAL_BAD_PREFIX, EXTERNAL_HTTPS,
    EXTERNAL_LINK_RE, EXTERNAL_MIN_LEN, EXTERNAL_PER_RUN, EXTERNAL_SHARE, EXTERNAL_SLEEP_S, EXTERNAL_TIMEOUT_S,
    EXT_BLOCK_TAGS, EXT_BULLET, EXT_CHALLENGE_MARKS, EXT_CONTAINER_TAGS, EXT_JUNK_TAGS, EXT_LINE_SEP, EXT_WS_RE, FIELD_RE, FIRST_PAGE_QS,
    FLUSH_EVERY, F_LEVEL, F_LOCATION, F_SALARY, F_TENURE, F_WHO, HDR_ACCEPT_LANGUAGE, HDR_REQUESTED_WITH,
    HOURLY_MARK, IN_EXTERNAL, IN_JOBS, IN_ROWS, JSON_INDENT, K_ADDRESS, K_CITY, K_DATE, K_DESCRIPTION, K_DIRECT,
    K_EMPLOYER, K_EMPLOYER_URL, K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM, K_EXTERNAL_URL, K_EXT_FETCHED, K_EXT_TEXT,
    K_EXT_URL, K_INDUSTRY, K_LANG, K_LAST_SEEN, K_NOC, K_POSTING_ID, K_PROVINCE, K_SALARY, K_SOURCE, K_TITLE,
    K_TITLE_ORIG, K_URL, K_VALID_THROUGH, K_WHO_CAN_APPLY, LANG_EN, LD_JOB_POSTING, LD_JSON_TYPE, LD_KEY_DESCRIPTION,
    LD_KEY_GRAPH, LD_KEY_TYPE, LINES_PER_CELL, LIST_SLEEP_S, LOC_NOTE_MARK, LOC_RE, LOC_SEP, NEWLINE, NL_RE, ORG_RE,
    ORG_SEP, OTHER_LOC_MARK, OUT_EXTERNAL, OUT_JOBS, OUT_POSTINGS, OUT_ROWS, PAGES_RE, PAGE_ONE, PAGE_QS_TPL,
    PERCENT, POSTER_PART_QS_TPL, POSTER_PATH, POSTER_SHELL_QS_TPL, POSTER_URL_TPL, PRINT_DETAIL_BAD_TPL,
    PRINT_DETAIL_DONE_TPL, PRINT_DETAIL_HEAD_TPL, PRINT_DETAIL_TICK_TPL, PRINT_EXT_DONE_TPL, PRINT_EXT_HEAD_TPL,
    PRINT_EXT_TICK_TPL, PRINT_PAGE_TPL, PRINT_PARSE_DONE_TPL, PRINT_ROWS_DONE_TPL, PRINT_STORE_DONE_TPL,
    PROV_CODE_OF_NAME, RATE_FLOOR_S, ROW_CELL_RE, ROW_LINK_RE, ROW_RE, SALARY_RANGE_TPL, SALARY_RE, SALARY_TPL,
    SCRIPT_RE, SEARCH_PATH, SECONDS_FMT, SECTION_ENDS, SECTION_START, SESSION_PATH_TPL, SHELL_QS, SID_RE, SITE_BASE,
    SLUG_CRAWL, SLUG_CRAWL_EXTERNAL, SOURCE_LABEL, SPACE, STUDENT_MARK, TAG_CLOSE, TAG_LI_EXT, TAG_RE, TAG_SCRIPT,
    TERM_WORD, TITLE_RE, UNIT_ANNUAL, UNIT_HOURLY, UTC_Z, VARIOUS_MARK, WS_RE, XHR,
)
from gcjobs.scheme import (
    DetailBatchIn, DetailBatchOut, DetailIn, ExternalFetchIn, ExternalTally, HttpClientLike, JobFact, ListRow,
    Location, MatchIn, PageIn, PagesOut, ParseTally, PostingRowIn, Session, StoreTally,
)


# =========================================================================
# 1. 共享词汇(JSON 读取 + 会话)
# =========================================================================


def load_json_dict(path: Path) -> dict:
    """读一份 JSON 对象;文件不在或不是对象给空 dict(首轮无表是常态)。"""
    if not path.exists():
        return {}
    loaded = json.loads(path.read_text(encoding=ENC_UTF8))
    if isinstance(loaded, dict):
        return loaded
    return {}


def headers_of() -> dict:
    """每次 GET 带的两个头(英文版 + XHR 标;UA 由 fetch 门的客户端带)。"""
    return {HDR_ACCEPT_LANGUAGE: ACCEPT_LANGUAGE, HDR_REQUESTED_WITH: XHR}


def open_session(client: HttpClientLike) -> Session:
    """GET 搜索壳页拿会话(cookie 进客户端,会话 id 从壳页 HTML 里取,路径要嵌它);拿不到抛错停轮。"""
    resp = client.get(SITE_BASE + SEARCH_PATH + SHELL_QS, headers=headers_of())
    resp.raise_for_status()
    m = SID_RE.search(resp.text)
    if m is None:
        raise RuntimeError(ERR_NO_SESSION)
    return Session(client=client, sid=m.group(1))


def search_session_url_of(x: Session) -> str:
    """搜索页的会话绑定地址(路径里嵌 jsessionid,照站内脚本 getUrlWithSession 的形)。"""
    return SESSION_PATH_TPL.format(base=SITE_BASE, path=SEARCH_PATH, sid=x.sid)


def poster_session_url_of(x: Session) -> str:
    """岗位页的会话绑定地址(同上,路径换岗位页)。"""
    return SESSION_PATH_TPL.format(base=SITE_BASE, path=POSTER_PATH, sid=x.sid)


# =========================================================================
# 2. 搜索分页枚举(壳 → 会话 → 首页正文 → 逐页翻 → 列表行)
# =========================================================================


def scrape_gcjobs_pages() -> None:
    """本域步骤入口:公开搜索逐页翻(页数从首页正文现取)→ 帖号 → 列表行表(当前态)。"""
    with make_client(CLIENT_TIMEOUT_S) as raw_client:
        session = open_session(cast(HttpClientLike, raw_client))
        got = collect_rows(session)
    OUT_ROWS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_ROWS, payload=got.rows, indent=JSON_INDENT))
    say(PRINT_ROWS_DONE_TPL.format(ids=len(got.rows), pages=got.pages, out=OUT_ROWS))


def collect_rows(session: Session) -> PagesOut:
    """首页正文取总页数,逐页翻(原文攒批进 crawl 层)→ 帖号 → 列表行;中途异常也把攒下的先落盘。"""
    pages: list = []
    rows: dict = {}
    done = 0
    last = PAGE_ONE
    n = PAGE_ONE
    try:
        while n <= last:
            html = fetch_page(PageIn(session=session, n=n))
            pages.append(CachePage(url=page_key_of(n), html=html, title=""))
            done += 1
            for pid, row in rows_of_page(html).items():
                rows[pid] = asdict(row)
            if n == PAGE_ONE:
                last = last_page_of(html)
            say(PRINT_PAGE_TPL.format(n=n, last=last, rows=len(rows)))
            n += 1
            time.sleep(LIST_SLEEP_S)
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return PagesOut(rows=rows, pages=done)


def fetch_page(x: PageIn) -> str:
    """一页正文:首页走首拉查询串,其余页翻页参数与正文标一次发(分两次发拿到的是上一页,2026-09-13 实撞)。"""
    base = search_session_url_of(x.session)
    if x.n == PAGE_ONE:
        resp = x.session.client.get(base + FIRST_PAGE_QS, headers=headers_of())
    else:
        resp = x.session.client.get(base + PAGE_QS_TPL.format(n=x.n, prev=x.n - 1), headers=headers_of())
    resp.raise_for_status()
    return resp.text


def page_key_of(n: int) -> str:
    """列表页在 crawl 层的键(正文是 ajax 片段无独立地址,拿公开搜索页地址 + 页号自拟)。"""
    return SITE_BASE + SEARCH_PATH + PAGE_QS_TPL.format(n=n, prev=n - 1)


def last_page_of(html: str) -> int:
    """首页正文分页器里的总页数;找不到就只有这一页。"""
    m = PAGES_RE.search(html)
    if m is None:
        return PAGE_ONE
    return int(m.group(1))


def rows_of_page(html: str) -> dict:
    """一页正文的帖 → 帖号 → ListRow(标题链 + 两格:截止 / 机构 / 地点,语言 / 薪资)。"""
    out: dict = {}
    for m in ROW_RE.finditer(html):
        link = ROW_LINK_RE.search(m.group(1))
        if link is None:
            continue
        cells = ROW_CELL_RE.findall(m.group(1)) + [SPACE, SPACE]
        left = lines_of(cells[0])
        right = lines_of(cells[1])
        out[link.group(1)] = ListRow(
            title=plain_of(link.group(2)),
            closing=closing_of_row(left[0]),
            org=left[1],
            location=left[2],
            language=right[0],
            salary=right[1],
        )
    return out


def lines_of(cell: str) -> list:
    """一格 HTML 按 <br> 切行,每行剥标签折空白,空行剔;尾补空串到 LINES_PER_CELL 行,调用方按位取不判长。"""
    out: list = []
    for part in BR_RE.split(cell):
        t = plain_of(part)
        if t != "":
            out.append(t)
    while len(out) < LINES_PER_CELL:
        out.append("")
    return out


def closing_of_row(first: str) -> str:
    """格 1 首行「Closing date: 2026-09-13」→ 日期串(前缀剥掉)。"""
    if first.startswith(CLOSING_PREFIX):
        return first[len(CLOSING_PREFIX):].strip()
    return first


def plain_of(html: str) -> str:
    """HTML 片段 → 单行纯文本(剥标签、解实体、折空白)。"""
    return WS_RE.sub(SPACE, unescape(TAG_RE.sub(SPACE, html))).replace(NEWLINE, SPACE).strip()


# =========================================================================
# 3. 岗位页抓取(未缓存的帖号 → 壳 + 正文 → crawl 层,每轮封顶)
# =========================================================================


def scrape_gcjobs_details() -> None:
    """本域步骤入口:列表里还没缓存的帖 → 岗位页正文进 crawl 层(每轮封顶 DETAILS_PER_RUN)。"""
    rows = load_json_dict(IN_ROWS)
    have = load_cache_index(SLUG_CRAWL)
    cap = int(DETAILS_PER_RUN)
    todo: list = []
    for pid in rows:
        if poster_url_of(pid) not in have and len(todo) < cap:
            todo.append(pid)
    say(PRINT_DETAIL_HEAD_TPL.format(todo=len(todo), total=len(rows), cap=cap, have=len(have)))
    if len(todo) == 0:
        return
    with make_client(CLIENT_TIMEOUT_S) as raw_client:
        session = open_session(cast(HttpClientLike, raw_client))
        out = fetch_details(DetailBatchIn(session=session, pids=todo))
    say(PRINT_DETAIL_DONE_TPL.format(done=out.done, slug=SLUG_CRAWL, failed=out.failed,
                                     skipped=len(rows) - len(todo)))


def fetch_details(x: DetailBatchIn) -> DetailBatchOut:
    """逐帖两拉(壳让会话记住当前帖,再拉正文),攒够 FLUSH_EVERY 帖批量落 crawl 层;
    正文两种判词都没有的留痕跳过;中途异常也把攒下的先落盘。"""
    pages: list = []
    done = 0
    failed = 0
    started = time.monotonic()
    try:
        for pid in x.pids:
            body = fetch_poster(PageIn(session=x.session, n=int(pid)))
            if DETAIL_MARK_INTERNAL not in body and DETAIL_MARK_EXTERNAL not in body:
                failed += 1
                say(PRINT_DETAIL_BAD_TPL.format(pid=pid))
                time.sleep(DETAIL_SLEEP_S)
                continue
            pages.append(CachePage(url=poster_url_of(pid), html=body, title=""))
            done += 1
            if done % DETAIL_TICK == 0:
                rate = done / max(time.monotonic() - started, RATE_FLOOR_S)
                say(PRINT_DETAIL_TICK_TPL.format(done=done, todo=len(x.pids), pct=done * PERCENT // len(x.pids),
                                                 rate=rate, pid=pid))
            if len(pages) >= FLUSH_EVERY:
                put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
                pages = []
            time.sleep(DETAIL_SLEEP_S)
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return DetailBatchOut(done=done, failed=failed)


def fetch_poster(x: PageIn) -> str:
    """一帖正文:先 GET 公开壳(会话记住帖号),再 GET 会话路径 + 正文标;单帖网络错留痕给空串。"""
    pid = str(x.n)
    try:
        x.session.client.get(SITE_BASE + POSTER_PATH + POSTER_SHELL_QS_TPL.format(pid=pid), headers=headers_of())
        resp = x.session.client.get(poster_session_url_of(x.session) + POSTER_PART_QS_TPL.format(pid=pid),
                                    headers=headers_of())
        resp.raise_for_status()
    except Exception as e:  # noqa: BLE001 — 单帖取不到就留痕跳过,下轮再抓
        err(pid, e)
        return ""
    return resp.text


def poster_url_of(pid: str) -> str:
    """岗位页的公开地址(crawl 层键;仓里站内帖的 url)。"""
    return POSTER_URL_TPL.format(base=SITE_BASE, path=POSTER_PATH, pid=pid)


# =========================================================================
# 4. 岗位页解析(缓存原文 → 标题 / 机构 / 字段格 / 各节 → raw jobs.json)
# =========================================================================


def parse_gcjobs_details() -> None:
    """本域步骤入口:在列、缓存里有原文、事实表里还没有的帖 → 抽字段 → 增量写 raw jobs.json。"""
    rows = load_json_dict(IN_ROWS)
    have = load_cache_index(SLUG_CRAWL)
    facts = load_json_dict(IN_JOBS)
    today = date.today().isoformat()
    tally = ParseTally(parsed=0, skipped=0, missing=0)
    for pid, raw in rows.items():
        if pid in facts:
            tally.skipped += 1
            continue
        path = have.get(poster_url_of(pid))
        if path is None:
            tally.missing += 1
            continue
        html = path.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE)
        fact = to_job_fact(DetailIn(posting_id=pid, html=html, row=to_list_row(raw), seen=today))
        facts[pid] = asdict(fact)
        tally.parsed += 1
    OUT_JOBS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_JOBS, payload=facts, indent=JSON_INDENT))
    say(PRINT_PARSE_DONE_TPL.format(parsed=tally.parsed, skipped=tally.skipped, missing=tally.missing,
                                    out=OUT_JOBS))


def to_list_row(raw: dict) -> ListRow:
    """rows.json 的一行 → ListRow(asdict 的逆;键即字段名,dataclass 自校缺格)。"""
    return ListRow(**raw)


def to_job_fact(x: DetailIn) -> JobFact:
    """岗位页正文 + 列表行 → JobFact(值级清洗全在这:站内 / 站外两形、机构拆部门、地点归一、截止转 ISO)。"""
    fields = fields_of(x.html)
    org_line = match_text_of(MatchIn(rx=ORG_RE, html=x.html))
    org = org_line
    division = ""
    if ORG_SEP in org_line:
        org, division = org_line.split(ORG_SEP, 1)
    title = match_text_of(MatchIn(rx=TITLE_RE, html=x.html))
    if title == "":
        title = x.row.title
    if org == "":
        org = x.row.org
    location = fields.get(F_LOCATION, "")
    if location == "":
        location = x.row.location
    salary = fields.get(F_SALARY, "")
    if salary == "":
        salary = x.row.salary
    closing = closing_iso_of(match_text_of(MatchIn(rx=CLOSING_RE, html=x.html)))
    if closing == "":
        closing = closing_iso_of(x.row.closing)
    loc = location_of(location)
    external = ""
    if DETAIL_MARK_EXTERNAL in x.html:
        m = EXTERNAL_LINK_RE.search(x.html)
        if m is not None:
            external = m.group(1)
    return JobFact(
        posting_id=x.posting_id, url=poster_url_of(x.posting_id), external_url=external,
        title=title.strip(), employer=org.strip(), division=division.strip(),
        location=location, city=loc.city, province=loc.province,
        salary=salary, level=fields.get(F_LEVEL, ""), who=fields.get(F_WHO, ""), tenure=fields.get(F_TENURE, ""),
        language=x.row.language, closing=closing,
        description=description_of(x.html), first_seen=x.seen,
    )


def match_text_of(x: MatchIn) -> str:
    """正则首个命中的组 1 → 单行纯文本;没命中给空串。"""
    got = x.rx.search(x.html)
    if got is None:
        return ""
    return plain_of(got.group(1))


def fields_of(html: str) -> dict:
    """左栏字段格「<b>标签</b><br> 值」→ 标签 → 单行纯文本(同名只认第一次)。"""
    out: dict = {}
    for k, v in FIELD_RE.findall(html):
        key = plain_of(k)
        if key != "" and key not in out:
            out[key] = plain_of(v)
    return out


def location_of(text: str) -> Location:
    """地点原文 → (城, 省):截掉尾随提醒后取第一个括号内是认得的省名的「City (Province)」,城 = 其前文
    的最后一段(多地点逗号隔);「Various …」、「… Other locations」或没有认得的省名 → 城省都留空
    (原文仍在 address 格;宁可留空不瞎猜 —— 2026-09-14 前认不出时整句当城市,脏了城市下拉)。"""
    head = text.split(LOC_NOTE_MARK, 1)[0]
    if VARIOUS_MARK in head.lower():
        return Location(city="", province="")
    for m in LOC_RE.finditer(head):
        province = PROV_CODE_OF_NAME.get(m.group(1).strip(), "")
        if province == "":
            continue
        city = head[:m.start()].split(LOC_SEP)[-1].strip()
        if OTHER_LOC_MARK in city:
            city = ""
        return Location(city=city, province=province)
    return Location(city="", province="")


def closing_iso_of(text: str) -> str:
    """截止文本 → ISO 日期:「September 14, 2026 - 23:59, Pacific Time」切掉时刻段,按 CLOSING_FMTS 试;认不出给空串。"""
    head = text.split(CLOSING_CUT, 1)[0].strip()
    for fmt in CLOSING_FMTS:
        try:
            return datetime.strptime(head, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def description_of(html: str) -> str:
    """正文各节(About the position 起,承诺 / 投递方式 / 联系人前止)→ 带段落的纯文本;站外帖给空串。
    起点从 id 属性所在标签的 `>` 之后算(2026-09-14 Frank 实拍正文首行渲成「id="aboutPosition">」:
    原来从属性名处切,半截标签剥不掉当正文;201 / 403 帖中招)。"""
    start = html.find(SECTION_START)
    if start < 0:
        return ""
    start = html.find(TAG_CLOSE, start) + 1
    end = len(html)
    for mark in SECTION_ENDS:
        i = html.find(mark, start)
        if 0 <= i < end:
            end = i
    body = SCRIPT_RE.sub(SPACE, html[start:end])
    body = BLOCK_END_RE.sub(NEWLINE, body)
    text = unescape(TAG_RE.sub(SPACE, body))
    lines: list = []
    for line in text.split(NEWLINE):
        t = WS_RE.sub(SPACE, line).strip()
        if t != "":
            lines.append(t)
    return NL_RE.sub(NEWLINE, NEWLINE.join(lines)).strip()


# =========================================================================
# 5. 站外正文(external_url 的帖 → 外站页面进 crawl 层 → 抽正文 → raw external.json)
# =========================================================================


def scrape_gcjobs_external() -> None:
    """本域步骤入口(2026-09-14 Frank「gc jobs 抓的这个数据没有 job 描述是么」→「开吧」):带外链的帖,GC Jobs 页上只有
    一句「You will leave」壳文,正文在外站;这里逐帖把外站页面落 crawl 层再抽正文,写 raw external.json(增量,
    已抽过的帖不重拉;网络失败的不记账,下轮再来)。"""
    facts = load_json_dict(IN_JOBS)
    done = load_json_dict(IN_EXTERNAL)
    have = load_cache_index(SLUG_CRAWL_EXTERNAL)
    ext_total = 0
    today = date.today().isoformat()
    todo: list = []
    for pid, raw in facts.items():
        url = external_url_of(raw)
        if url == "":
            continue
        ext_total += 1
        if wants_external(done.get(pid), today) and len(todo) < EXTERNAL_PER_RUN:
            todo.append((pid, url))
    say(PRINT_EXT_HEAD_TPL.format(todo=len(todo), ext=ext_total, have=len(done), cap=EXTERNAL_PER_RUN))
    if len(todo) == 0:
        return
    tally = ExternalTally(fetched=0, extracted=0, thin=0, failed=0)
    with make_polite_client(EXTERNAL_TIMEOUT_S) as raw_client:
        client = cast(HttpClientLike, raw_client)
        for i, (pid, url) in enumerate(todo):
            html = ""
            if url in have and wants_refetch(done.get(pid)) is False:
                html = cached_html_of(url)
            if html == "":
                html = fetch_external(ExternalFetchIn(client=client, url=url))
                time.sleep(EXTERNAL_SLEEP_S)
            if html == "":
                tally.failed += 1
                continue
            tally.fetched += 1
            text = external_text_of(html)
            if text == "":
                tally.thin += 1
            else:
                tally.extracted += 1
            done[pid] = {K_EXT_URL: url, K_EXT_TEXT: text, K_EXT_FETCHED: today}
            say(PRINT_EXT_TICK_TPL.format(done=i + 1, todo=len(todo), url=url))
    OUT_EXTERNAL.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_EXTERNAL, payload=done, indent=JSON_INDENT))
    say(PRINT_EXT_DONE_TPL.format(fetched=tally.fetched, extracted=tally.extracted, thin=tally.thin,
                                  failed=tally.failed, out=OUT_EXTERNAL))


def wants_external(row: object, today: str) -> bool:  # noqa: PLR0913 — 行与今天两格同型同命,包成 In 反而易传反
    """这一帖要不要拉:没拉过要;拉过但抽不出且不是今天拉的,再试一次(壳页偶发)。"""
    if not isinstance(row, dict):
        return True
    return str(row.get(K_EXT_TEXT) or "") == "" and str(row.get(K_EXT_FETCHED) or "") != today


def wants_refetch(row: object) -> bool:
    """重试的帖(拉过但抽不出)不读缓存里那张壳页,真去外站再拉一次。"""
    return isinstance(row, dict)


def external_url_of(raw: dict) -> str:
    """事实行里的外链 → 能直接请求的地址:解 HTML 实体(href 里的 &#38;)、剥写坏的「http://https://」前缀;没有外链给空串。"""
    url = unescape(str(raw.get(K_EXTERNAL_URL) or "")).strip()
    if url.startswith(EXTERNAL_BAD_PREFIX):
        url = EXTERNAL_HTTPS + url[len(EXTERNAL_BAD_PREFIX):]
    return url


def cached_html_of(url: str) -> str:
    """crawl 层里这张外站页的原文(调用方已按索引确认抓过);读不到给空串。"""
    hit = get_cached_page(url)
    if hit.html is None:
        return ""
    return hit.html


def fetch_external(x: ExternalFetchIn) -> str:
    """拉一张外站页并落 crawl 层;网络错留痕给空串(不记账,下轮再拉)。"""
    try:
        resp = x.client.get(x.url, headers=headers_of())
        resp.raise_for_status()
    except Exception as e:  # noqa: BLE001 — 单帖取不到就留痕跳过
        err(x.url, e)
        return ""
    put_cached_page(CachePutIn(slug=SLUG_CRAWL_EXTERNAL, url=x.url, html=resp.text, title=""))
    return resp.text


def external_text_of(html: str) -> str:
    """外站页原文 → 正文纯文本(一段一行,列表项带「- 」):先找 schema.org JobPosting 的 description(Workday 等给整篇),
    没有就圈全页文本占半壁的最小容器逐段收;不足 EXTERNAL_MIN_LEN 视作抽不出(JS 壳),机器人验证页按判词直接判抽不出,给空串。"""
    for mark in EXT_CHALLENGE_MARKS:
        if mark in html:
            return ""
    soup = BeautifulSoup(html, PARSER_HTML)
    ld = ld_description_of(soup)
    if len(ld) >= EXTERNAL_MIN_LEN:
        return ld
    for junk in soup.find_all(EXT_JUNK_TAGS):
        junk.decompose()
    scope = main_container_of(soup)
    if scope is None:
        return ""
    text = paragraphs_of(scope)
    if len(text) < EXTERNAL_MIN_LEN:
        return ""
    return text


def ld_description_of(soup: BeautifulSoup) -> str:
    """页里 ld+json 脚本中第一条 JobPosting 的 description(HTML 片段)→ 段落文本;没有给空串。"""
    for tag in soup.find_all(TAG_SCRIPT, attrs={ATTR_TYPE: LD_JSON_TYPE}):
        try:
            data = json.loads(tag.get_text())
        except ValueError:
            continue
        for node in ld_nodes_of(data):
            if node.get(LD_KEY_TYPE) == LD_JOB_POSTING:
                frag = BeautifulSoup(str(node.get(LD_KEY_DESCRIPTION) or ""), PARSER_HTML)
                return paragraphs_of(frag)
    return ""


def ld_nodes_of(data: object) -> list:
    """ld+json 的顶层可能是单条、数组或 @graph 打包;摊成字典清单。"""
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict)]
    if isinstance(data, dict):
        graph = data.get(LD_KEY_GRAPH)
        if isinstance(graph, list):
            return [d for d in graph if isinstance(d, dict)]
        return [data]
    return []


def main_container_of(soup: BeautifulSoup) -> Tag | None:
    """正文容器:全页文本里占比 ≥ EXTERNAL_SHARE 的最小元素(导航 / 页脚已剪);连 body 都没有给 None。"""
    body = soup.body
    if not isinstance(body, Tag):
        return None
    total = len(EXT_WS_RE.sub(SPACE, body.get_text()))
    if total == 0:
        return None
    best: Tag | None = body
    best_len = total
    for el in body.find_all(EXT_CONTAINER_TAGS):
        if not isinstance(el, Tag):
            continue
        n = len(EXT_WS_RE.sub(SPACE, el.get_text()))
        if n >= total * EXTERNAL_SHARE and n < best_len:
            best = el
            best_len = n
    return best


def paragraphs_of(scope: Tag | BeautifulSoup) -> str:
    """容器 → 一段一行的纯文本:块级标签逐个收,嵌套列表只在最外层收一次,连续重复行只留一条;一个块级标签都没有的按换行切。"""
    lines: list = []
    for el in scope.find_all(EXT_BLOCK_TAGS):
        if not isinstance(el, Tag):
            continue
        li = el.find_parent(TAG_LI_EXT)
        if li is not None and li is not el:
            continue
        txt = EXT_WS_RE.sub(SPACE, el.get_text(SPACE)).strip()
        if txt == "":
            continue
        if el.name == TAG_LI_EXT:
            txt = EXT_BULLET + txt
        if len(lines) > 0 and lines[-1] == txt:
            continue
        lines.append(txt)
    if len(lines) == 0:
        return plain_lines_of(scope)
    return EXT_LINE_SEP.join(lines)


def plain_lines_of(scope: Tag | BeautifulSoup) -> str:
    """没有块级标签的容器(Workday 的 JobPosting.description 是 br 与 span 堆的)→ 按换行切、去空行。"""
    lines: list = []
    for raw in scope.get_text(EXT_LINE_SEP).split(EXT_LINE_SEP):
        txt = EXT_WS_RE.sub(SPACE, raw).strip()
        if txt != "":
            lines.append(txt)
    return EXT_LINE_SEP.join(lines)


# =========================================================================
# 6. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================


def build_gcjobs_postings() -> None:
    """本域步骤入口:事实表 × 列表行表 → 当前态 postings 仓(不在本轮列表 / 过截止日 / 无标题的剔)。

    落盘持 Job Bank 仓锁(与 jobbank 域解析段同一把):mart 的三段跨源清洗原地写回这份仓,
    load 域 build 链整链持锁 —— 不持锁的整文件重写会落在「清洗完 → 汇装」之间(2026-08-05 薪资实撞同款病)。"""
    rows = load_json_dict(IN_ROWS)
    facts = load_json_dict(IN_JOBS)
    external = load_json_dict(IN_EXTERNAL)
    seen_at = datetime.now(timezone.utc).strftime(SECONDS_FMT) + UTC_Z
    today = date.today().isoformat()
    tally = StoreTally(rows=0, gone=0, expired=0, blank=0)
    out: list = []
    for pid, raw in facts.items():
        if pid not in rows:
            tally.gone += 1
            continue
        fact = to_fact_of_row(raw)
        if fact.title == "":
            tally.blank += 1
            continue
        if fact.closing != "" and fact.closing < today:
            tally.expired += 1
            continue
        out.append(to_posting_row(PostingRowIn(fact=fact, seen_at=seen_at,
                                               external_text=external_text_of_row(external.get(pid)))))
    out.sort(key=date_key_of, reverse=True)
    tally.rows = len(out)
    OUT_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        paths.write_json(paths.WriteJsonIn(path=OUT_POSTINGS, payload=out, indent=JSON_INDENT))
    say(PRINT_STORE_DONE_TPL.format(rows=tally.rows, gone=tally.gone, expired=tally.expired,
                                    blank=tally.blank, out=OUT_POSTINGS))


def to_fact_of_row(row: dict) -> JobFact:
    """raw jobs.json 的一行 → JobFact(asdict 的逆;键即字段名,dataclass 自校缺格)。"""
    return JobFact(**row)


def external_text_of_row(row: object) -> str:
    """external.json 里这一帖的行 → 抽到的站外正文;没有这一帖 / 抽不出给空串。"""
    if not isinstance(row, dict):
        return ""
    return str(row.get(K_EXT_TEXT) or "")


def date_key_of(row: dict) -> str:
    """排序键:发布日 ISO 串(缺的排最后)。"""
    return row.get(K_DATE) or ""


def to_posting_row(x: PostingRowIn) -> dict:
    """事实 → Job Bank 仓同形的行(键序即落盘列序,与其余板仓逐键同形;mart 的 to_jb_job_fields 按这些键取)。
    站外帖 url 给雇主外链;发布日 = 首见日(站上不给);工时不分栏恒空。"""
    f = x.fact
    url = f.url
    if f.external_url != "":
        url = f.external_url
    return {
        K_POSTING_ID: f.posting_id, K_TITLE: f.title, K_TITLE_ORIG: "", K_EMPLOYER: f.employer,
        K_CITY: f.city, K_PROVINCE: f.province, K_SALARY: salary_text_of(f.salary),
        K_DATE: f.first_seen, K_SOURCE: SOURCE_LABEL, K_DIRECT: True, K_URL: url,
        K_ADDRESS: f.location, K_NOC: "", K_LAST_SEEN: x.seen_at,
        K_EMPLOYMENT_TERM: term_of(f.tenure), K_EMPLOYMENT_HOURS: "",
        K_DESCRIPTION: full_description_of(x), K_VALID_THROUGH: f.closing, K_LANG: LANG_EN,
        K_INDUSTRY: "", K_EMPLOYER_URL: "", K_WHO_CAN_APPLY: f.who,
    }


def salary_text_of(text: str) -> str:
    """薪资格原文 → Job Bank 写法:「$96,235 to $104,044」年薪(公务员薪资表按年)、带 per hour 的时薪;抽不出给空串。"""
    m = SALARY_RE.search(text)
    if m is None:
        return ""
    unit = UNIT_ANNUAL
    if HOURLY_MARK in text.lower():
        unit = UNIT_HOURLY
    if m.group(2) is None:
        return SALARY_TPL.format(lo=m.group(1), unit=unit)
    return SALARY_RANGE_TPL.format(lo=m.group(1), hi=m.group(2), unit=unit)


def term_of(tenure: str) -> str:
    """雇佣期文本里说是学生岗 → 定期(term);其余不猜给空串。"""
    if STUDENT_MARK in tenure.lower():
        return TERM_WORD
    return ""


def full_description_of(x: PostingRowIn) -> str:
    """描述 = 语言要求 / 职级 / 谁能投三行(有则出)+ 正文各节;外链帖有站外正文就用它替 GC Jobs 页那句壳文
    (2026-09-14)。"""
    f = x.fact
    head: list = []
    if f.language != "":
        head.append(DESC_LANG_TPL.format(lang=f.language))
    if f.level != "":
        head.append(DESC_LEVEL_TPL.format(level=f.level))
    if f.who != "":
        head.append(DESC_WHO_TPL.format(who=f.who))
    body = f.description
    if x.external_text != "":
        body = x.external_text
    if body != "":
        head.append(body)
    return NEWLINE.join(head)
