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
from fetch.functions import make_client
from log.functions import err, say
from crawl.functions import load_cache_index, put_cached_pages
from crawl.scheme import CachePage, CachePutManyIn
from gcjobs import DETAILS_PER_RUN
from gcjobs.constants import (
    ACCEPT_LANGUAGE, BLOCK_END_RE, BR_RE, CLIENT_TIMEOUT_S, CLOSING_CUT, CLOSING_FMTS, CLOSING_PREFIX, CLOSING_RE,
    DESC_LANG_TPL, DESC_LEVEL_TPL, DESC_WHO_TPL, DETAIL_MARK_EXTERNAL, DETAIL_MARK_INTERNAL, DETAIL_SLEEP_S,
    DETAIL_TICK, ENC_UTF8, ERR_NO_SESSION, ERRORS_REPLACE, EXTERNAL_LINK_RE, F_LEVEL, F_LOCATION, F_SALARY,
    F_TENURE, F_WHO, FIELD_RE, FIRST_PAGE_QS, FLUSH_EVERY, HDR_ACCEPT_LANGUAGE, HDR_REQUESTED_WITH, HOURLY_MARK,
    IN_JOBS, IN_ROWS, JSON_INDENT, K_ADDRESS, K_CITY, K_DATE, K_DESCRIPTION, K_DIRECT, K_EMPLOYER, K_EMPLOYER_URL,
    K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM, K_INDUSTRY, K_LANG, K_LAST_SEEN, K_NOC, K_POSTING_ID, K_PROVINCE,
    K_SALARY, K_SOURCE, K_TITLE, K_TITLE_ORIG, K_URL, K_VALID_THROUGH, K_WHO_CAN_APPLY, LANG_EN, LINES_PER_CELL,
    LIST_SLEEP_S,
    LOC_NOTE_MARK, LOC_RE, LOC_SEP, NEWLINE, NL_RE, ORG_RE, ORG_SEP, OTHER_LOC_MARK, OUT_JOBS, OUT_POSTINGS,
    OUT_ROWS, PAGE_ONE, PAGE_QS_TPL,
    PAGES_RE, PERCENT, POSTER_PART_QS_TPL, POSTER_PATH, POSTER_SHELL_QS_TPL, POSTER_URL_TPL, PRINT_DETAIL_BAD_TPL,
    PRINT_DETAIL_DONE_TPL, PRINT_DETAIL_HEAD_TPL, PRINT_DETAIL_TICK_TPL, PRINT_PAGE_TPL, PRINT_PARSE_DONE_TPL,
    PRINT_ROWS_DONE_TPL, PRINT_STORE_DONE_TPL, PROV_CODE_OF_NAME, RATE_FLOOR_S, ROW_CELL_RE, ROW_LINK_RE, ROW_RE,
    SALARY_RANGE_TPL, SALARY_RE, SALARY_TPL, SCRIPT_RE, SEARCH_PATH, SECONDS_FMT, SECTION_ENDS, SECTION_START,
    SESSION_PATH_TPL, SHELL_QS, SID_RE, SITE_BASE, SLUG_CRAWL, SOURCE_LABEL, SPACE, STUDENT_MARK, TAG_RE, TERM_WORD,
    TITLE_RE, UNIT_ANNUAL, UNIT_HOURLY, UTC_Z, VARIOUS_MARK, WS_RE, XHR,
)
from gcjobs.scheme import (
    DetailBatchIn, DetailBatchOut, DetailIn, HttpClientLike, JobFact, ListRow, Location, MatchIn, PageIn, PagesOut,
    ParseTally, PostingRowIn, Session, StoreTally,
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
    """正文各节(About the position 起,承诺 / 投递方式 / 联系人前止)→ 带段落的纯文本;站外帖给空串。"""
    start = html.find(SECTION_START)
    if start < 0:
        return ""
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
# 5. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================


def build_gcjobs_postings() -> None:
    """本域步骤入口:事实表 × 列表行表 → 当前态 postings 仓(不在本轮列表 / 过截止日 / 无标题的剔)。

    落盘持 Job Bank 仓锁(与 jobbank 域解析段同一把):mart 的三段跨源清洗原地写回这份仓,
    load 域 build 链整链持锁 —— 不持锁的整文件重写会落在「清洗完 → 汇装」之间(2026-08-05 薪资实撞同款病)。"""
    rows = load_json_dict(IN_ROWS)
    facts = load_json_dict(IN_JOBS)
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
        out.append(to_posting_row(PostingRowIn(fact=fact, seen_at=seen_at)))
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
        K_DESCRIPTION: full_description_of(f), K_VALID_THROUGH: f.closing, K_LANG: LANG_EN,
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


def full_description_of(f: JobFact) -> str:
    """描述 = 语言要求 / 职级 / 谁能投三行(有则出)+ 正文各节。"""
    head: list = []
    if f.language != "":
        head.append(DESC_LANG_TPL.format(lang=f.language))
    if f.level != "":
        head.append(DESC_LEVEL_TPL.format(level=f.level))
    if f.who != "":
        head.append(DESC_WHO_TPL.format(who=f.who))
    if f.description != "":
        head.append(f.description)
    return NEWLINE.join(head)
