"""
hireac 域函数 —— 四段与 constants.py / scheme.py 同名同序镜像:抓取(登录态浏览器一次会话:列表翻页 +
详情页内回放)→ 详情解析 → postings 仓。顶层只有 function;常量归 constants,形状归 scheme。

数据链(2026-09-02 铁律):列表页与详情页原文经 crawl 批量写门进 data/crawl/board-hireac/,
抽出的事实进 data/raw/hireac/jobs.json,归一后的行进 data/processed/hireac/postings.json;
跨源清洗(地点归一 / 薪资归一 / 试点打标)仍归 mart 域,本域只做「值级」清洗(to_* 行构造器)。
浏览器走 crawl 域 get_browser_page(async 单例,共享 profile 带登录态),所以抓取步是 asyncio 壳。

@author Frank
@time 2026-09-13
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict
from datetime import date, datetime, timezone
from html import unescape
from pathlib import Path
from typing import cast

import paths
from paths import JOBBANK_STORE_LOCK, jobbank_store_lock
from log.functions import say
from richtext.functions import rich_text_of
from crawl import BROWSER_COOKIES
from crawl.constants import PROFILE_DIR
from crawl.functions import close_browser, get_browser_page, load_cache_index, put_cached_pages, save_browser_cookies
from crawl.scheme import CachePage, CachePutManyIn, SaveCookiesIn
from hireac import DETAILS_PER_RUN
from hireac.constants import (
    ADDRESS_SEP, ANNUAL_MIN, CLICK_VIEW_ALL_JS, COLON, COMMA, COMMA_SP, COOKIE_DOMAINS, COOKIES_FILE, CURRENT_PAGE_JS, DEADLINE_FMTS, DESC_SEP, DETAIL_KEY_TPL,
    DETAIL_MARK, DETAIL_SLEEP_MS, DETAIL_TICK, ENC_UTF8, ERR_BROWSER_DOWN, ERR_COOKIES_MISSING_TPL, ERR_LOGIN_TPL, ERR_NO_PAGER_SORT_TPL, ERR_NO_VIEW_ALL,
    ERR_PAGE_STALE_TPL, ERR_PAGE_WAIT_TPL, ERR_TOO_MANY_FAILS_TPL, ERRORS_REPLACE, COUNTRY_CA, F_ADDRESS, F_APPLY_CC, F_APPLY_EMAIL,
    F_APPLY_WEB, F_CATEGORY, F_CITY, F_COUNTRY, F_DEADLINE, F_DESCRIPTION, F_DESCRIPTION_CC, F_DIVISION, F_HOURS,
    F_JOB_TYPE, F_LANGUAGE, F_LOCATION, F_LOCATION_CC, F_ORG, F_POSITION_TYPE, F_POSTAL, F_PREFERRED,
    F_PROCEDURE, F_PROVINCE, F_QUALIFICATIONS, F_REQUIREMENTS, RICH_FIELDS, F_SALARY, F_TERM, F_TITLE, F_WEBSITE,
    FAIL_MAX, FETCH_JS, FIELD_RE, FLUSH_EVERY, FORM_RE, GROUP_DIR, GROUP_KEY, GROUP_ORDER, GROUP_VALUE, HOURS_OF_KIND, HTTP_OK,
    HOURLY_MAX, HOURLY_MIN, HTTP_PREFIX, IN_JOBS, IN_ROWS, JSON_INDENT, K_ADDRESS, K_CITY, K_DATE, K_DESCRIPTION, K_DIRECT,
    K_EMPLOYER, K_EMPLOYER_URL, K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM, K_INDUSTRY, K_LANG, K_LAST_SEEN,
    K_NOC, K_POSTING_ID, K_POSTING_ID_FORM, K_PROVINCE, K_SALARY, K_SOURCE, K_TITLE, K_TITLE_ORIG, K_URL,
    K_VALID_THROUGH, KIND_HOURLY_KEY, KIND_SALARY_KEY, KIND_UNIT_WORD, LANG_EN, LIST_KEY_TPL, LIST_SETTLE_MS, LOAD_PAGE_JS_TPL, LOGIN_HOST, NAV_TIMEOUT_MS,
    NOT_LOGGED_PATH, OUT_JOBS, OUT_POSTINGS, OUT_ROWS, PAGE_NUM_RE, PAGE_ONE, PAGE_SORT_RE, PAGE_WAIT_STEP_MS,
    PAGE_WAIT_TRIES, PERCENT, POSTINGS_URL, PRINT_COOKIES_TPL, PRINT_DETAIL_BAD_TPL, PRINT_DETAIL_DONE_TPL,
    PRINT_DETAIL_HEAD_TPL, PRINT_DETAIL_TICK_TPL, PRINT_PAGE_TPL, PRINT_PARSE_DONE_TPL, PRINT_ROWS_DONE_TPL,
    PRINT_STORE_DONE_TPL, PROV_CODE_OF_NAME, PROV_CODES, PROV_OF_CITY, QUOTE_DOUBLE, QUOTE_SINGLE,
    RATE_FLOOR_S, ROW_RE, SALARY_RANGE_TPL, SALARY_SNIPPET_RE, SALARY_TPL, SALARY_UNIT_WORD, SCRIPT_RE, SECONDS_FMT,
    SETTLE_MS, SLUG_CRAWL, SOURCE_LABEL, SPACE, TAG_RE,
    TERM_OF_KIND, UTC_Z, VIEW_ALL_SETTLE_MS, WAIT_DOM, WS_RE,
)
from hireac.scheme import (
    BrowserPageLike, DetailBatchIn, DetailBatchOut, DetailFieldsIn, DetailKeyIn, FreshHtmlIn, JobFact, Location,
    PageJsIn, ParseTally, PickIn, PostingRowIn, StoreTally, UnitByKindIn, WaitPageIn,
)


# =========================================================================
# 1. 共享词汇(JSON 读取)
# =========================================================================


def load_json_dict(path: Path) -> dict:
    """读一份 JSON 对象;文件不在或不是对象给空 dict(首轮无表是常态)。"""
    if not path.exists():
        return {}
    loaded = json.loads(path.read_text(encoding=ENC_UTF8))
    if isinstance(loaded, dict):
        return loaded
    return {}


# =========================================================================
# 2. 抓取(登录态浏览器一次会话:列表翻页 → 行表;未缓存详情页内回放 → crawl 层)
# =========================================================================


def scrape_hireac() -> None:
    """本域步骤入口:一次浏览器会话做完列表翻页与详情回放(表单 action 是会话级,拆步就失效)。"""
    asyncio.run(scrape_in_browser())


async def scrape_in_browser() -> None:
    """进板 → 翻页收行表 → 回放未缓存详情;会话结束关浏览器(Frank 2026-09-13「别老重复打开关闭浏览器」)。"""
    require_cookie_file()
    raw_page = await get_browser_page()
    if raw_page is None:
        raise RuntimeError(ERR_BROWSER_DOWN)
    page = cast(BrowserPageLike, raw_page)
    try:
        await open_board(page)
        kept = await save_browser_cookies(SaveCookiesIn(file=PROFILE_DIR / COOKIES_FILE, domains=COOKIE_DOMAINS))
        say(PRINT_COOKIES_TPL.format(n=kept, path=PROFILE_DIR / COOKIES_FILE))
        rows = await collect_rows(page)
        OUT_ROWS.parent.mkdir(parents=True, exist_ok=True)
        paths.write_json(paths.WriteJsonIn(path=OUT_ROWS, payload=rows, indent=JSON_INDENT))
        say(PRINT_ROWS_DONE_TPL.format(ids=len(rows), out=OUT_ROWS))
        out = await fetch_details(DetailBatchIn(page=page, rows=rows))
        say(PRINT_DETAIL_DONE_TPL.format(done=out.done, slug=SLUG_CRAWL, failed=out.failed, skipped=out.skipped))
    finally:
        await close_browser()


def export_hireac_cookies() -> None:
    """--only export 入口(Frank 本机手动;2026-09-15 进容器):本机 Chrome 共享 profile 里登录好 HireAC 后,把学院与微软登录的
    cookie 导成 PROFILE_DIR/COOKIES_FILE 给容器 hireac 役加载。登录过期时先在本机 Chrome 重登,再跑这一步。
    2026-09-25 容器里也跑它当保活(--only keepalive 同一个函数,Frank 勾「试保活续命」):cookie 模式下读文件进板、
    确认还登着、写回同一个文件 —— 会话闲置约一个多小时就过期,日更一轮必撞,每 30 分钟进一次板让它别闲着。
    同日撤回:30 分钟保活第 2 轮已落未登录页,保活无效,保活役与 keepalive 键已删(见 hireac/__init__)。"""
    asyncio.run(export_in_browser())


async def export_in_browser() -> None:
    """进板确认已登录(open_board 落到登录页即抛,不导坏 cookie)→ cookie 按域名筛后落盘;会话结束关浏览器。"""
    require_cookie_file()
    raw_page = await get_browser_page()
    if raw_page is None:
        raise RuntimeError(ERR_BROWSER_DOWN)
    page = cast(BrowserPageLike, raw_page)
    try:
        await open_board(page)
        kept = await save_browser_cookies(SaveCookiesIn(file=PROFILE_DIR / COOKIES_FILE, domains=COOKIE_DOMAINS))
        say(PRINT_COOKIES_TPL.format(n=kept, path=PROFILE_DIR / COOKIES_FILE))
    finally:
        await close_browser()


def require_cookie_file() -> None:
    """cookie 模式(容器,BROWSER_COOKIES 非空)下登录文件必须在,不在就直说缺登录;本机持久 profile 模式不查。
    不查的话 crawl 起浏览器读文件失败会吞成「浏览器兜底不可用」,本域再报「浏览器起不来」(2026-09-19 起实撞 10 天)。"""
    if BROWSER_COOKIES == "":
        return
    path = PROFILE_DIR / BROWSER_COOKIES
    if not path.exists():
        raise RuntimeError(ERR_COOKIES_MISSING_TPL.format(path=path))


async def open_board(page: BrowserPageLike) -> None:
    """进岗位板并点开「全部在招」;停在登录页 / 未登录页 = 登录态过期,抛错停轮(不静默)。"""
    await page.goto(POSTINGS_URL, wait_until=WAIT_DOM, timeout=NAV_TIMEOUT_MS)
    await page.wait_for_timeout(SETTLE_MS)
    if LOGIN_HOST in page.url or NOT_LOGGED_PATH in page.url:
        raise RuntimeError(ERR_LOGIN_TPL.format(url=page.url))
    clicked = await page.evaluate(CLICK_VIEW_ALL_JS)
    if clicked is not True:
        raise RuntimeError(ERR_NO_VIEW_ALL)
    await page.wait_for_timeout(VIEW_ALL_SETTLE_MS)


async def collect_rows(page: BrowserPageLike) -> dict:
    """列表页逐页翻(页内 JS 翻页,轮询当前页号到位)→ 原文进 crawl 层 → 行号 → 详情表单参数;
    中途异常也把攒下的列表页先落盘。
    起点必须是第 1 页:板在会话里记着上次看到哪页,点开「全部在招」直接停在那页(2026-09-15 实撞:上一轮停在第 7 页,
    下一轮首读只有 8 行、真正的第 1 页 100 行一行没收)。分页器页号不是 1 就先翻回第 1 页,等表格换成新行再读。"""
    html = await page.content()
    current = await page.evaluate(CURRENT_PAGE_JS)
    if str(current) != str(PAGE_ONE):
        stale = set(rows_of_page(html))
        await page.evaluate(page_js_of(PageJsIn(html=html, n=PAGE_ONE)))
        arrived = await wait_page(WaitPageIn(page=page, n=PAGE_ONE))
        if not arrived:
            raise RuntimeError(ERR_PAGE_WAIT_TPL.format(n=PAGE_ONE))
        html = await fresh_html(FreshHtmlIn(page=page, n=PAGE_ONE, prev=stale))
    last = last_page_of(html)
    rows: dict = {}
    pages: list = []
    n = PAGE_ONE
    try:
        while True:
            page_rows = rows_of_page(html)
            rows.update(page_rows)
            pages.append(CachePage(url=LIST_KEY_TPL.format(base=POSTINGS_URL, n=n), html=html, title=""))
            say(PRINT_PAGE_TPL.format(n=n, last=last, rows=len(rows)))
            if n >= last:
                break
            n += 1
            await page.evaluate(page_js_of(PageJsIn(html=html, n=n)))
            arrived = await wait_page(WaitPageIn(page=page, n=n))
            if not arrived:
                raise RuntimeError(ERR_PAGE_WAIT_TPL.format(n=n))
            html = await fresh_html(FreshHtmlIn(page=page, n=n, prev=set(page_rows)))
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return rows


def page_js_of(x: PageJsIn) -> str:
    """翻到第 n 页的页内调用:排序列与方向照抄当前页分页器 —— 会话记着排序,新登录默认 ID 倒序,
    写死正序会和第 1 页重叠(2026-09-25 实撞)。抄不到就抛错停轮,不退回写死的排序。"""
    m = PAGE_SORT_RE.search(x.html)
    if m is None:
        raise RuntimeError(ERR_NO_PAGER_SORT_TPL.format(n=x.n))
    return LOAD_PAGE_JS_TPL.format(order=m.group(GROUP_ORDER), direction=m.group(GROUP_DIR), n=x.n)


async def wait_page(x: WaitPageIn) -> bool:
    """轮询分页器的当前页号直到等于目标页(到位后再等表格重绘);超过轮询上限给 False。"""
    tick = 0
    while tick < PAGE_WAIT_TRIES:
        await x.page.wait_for_timeout(PAGE_WAIT_STEP_MS)
        cur = await x.page.evaluate(CURRENT_PAGE_JS)
        if str(cur) == str(x.n):
            await x.page.wait_for_timeout(LIST_SETTLE_MS)
            return True
        tick += 1
    return False


async def fresh_html(x: FreshHtmlIn) -> str:
    """翻页后等表格真的换成新一页再读:页号先到、表格后重绘,只看页号会读进上一页的旧行
    (2026-09-15 实撞:第 2、3 页各读进约 50 行旧页,列表 608 只收 508)。新页行号与上一页零交集才算到位;
    超过轮询上限抛错停轮 —— 宁可这轮不跑,也不带着漏读的列表去剔在招岗。"""
    tick = 0
    while tick < PAGE_WAIT_TRIES:
        html = await x.page.content()
        ids = rows_of_page(html)
        if len(ids) > 0 and x.prev.isdisjoint(ids):
            return html
        await x.page.wait_for_timeout(PAGE_WAIT_STEP_MS)
        tick += 1
    raise RuntimeError(ERR_PAGE_STALE_TPL.format(n=x.n))


def last_page_of(html: str) -> int:
    """分页器里的最大页号 = 总页数;页上没有分页链接就只有这一页。"""
    last = PAGE_ONE
    for n in PAGE_NUM_RE.findall(html):
        if int(n) > last:
            last = int(n)
    return last


def rows_of_page(html: str) -> dict:
    """一张列表页的行 → 行号 → 详情表单参数(行内 onclick 的 JS 对象,单引号换双引号即 JSON)。"""
    out: dict = {}
    for m in ROW_RE.finditer(html):
        f = FORM_RE.search(m.group(0))
        if f is None:
            continue
        out[m.group(GROUP_KEY)] = json.loads(f.group(1).replace(QUOTE_SINGLE, QUOTE_DOUBLE))
    return out


async def fetch_details(x: DetailBatchIn) -> DetailBatchOut:
    """在列且未缓存的行 → 页内回放表单取详情原文,攒够 FLUSH_EVERY 张批量落 crawl 层;
    单张失败留痕跳过,连续失败超限判会话失效抛错;中途异常也把攒下的先落盘。"""
    have = load_cache_index(SLUG_CRAWL)
    cap = int(DETAILS_PER_RUN)
    todo: list = []
    for row_id, form in x.rows.items():
        key = detail_key_of(DetailKeyIn(row_id=row_id, posting_id=text_of(dict_of(form).get(K_POSTING_ID_FORM))))
        if key not in have and len(todo) < cap:
            todo.append((row_id, key, form))
    say(PRINT_DETAIL_HEAD_TPL.format(todo=len(todo), total=len(x.rows), cap=cap, have=len(have)))
    pages: list = []
    done = 0
    failed = 0
    streak = 0
    started = time.monotonic()
    try:
        for row_id, key, form in todo:
            res = await x.page.evaluate(FETCH_JS, [POSTINGS_URL, form])
            status, body = status_body_of(res)
            if status != HTTP_OK or DETAIL_MARK not in body:
                failed += 1
                streak += 1
                say(PRINT_DETAIL_BAD_TPL.format(row=row_id, status=status))
                if streak > FAIL_MAX:
                    raise RuntimeError(ERR_TOO_MANY_FAILS_TPL.format(n=streak))
                continue
            streak = 0
            pages.append(CachePage(url=key, html=body, title=""))
            done += 1
            if done % DETAIL_TICK == 0:
                rate = done / max(time.monotonic() - started, RATE_FLOOR_S)
                say(PRINT_DETAIL_TICK_TPL.format(done=done, todo=len(todo), pct=done * PERCENT // len(todo),
                                                 rate=rate, row=row_id))
            if len(pages) >= FLUSH_EVERY:
                put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
                pages = []
            await x.page.wait_for_timeout(DETAIL_SLEEP_MS)
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return DetailBatchOut(done=done, failed=failed, skipped=len(x.rows) - len(todo))


def status_body_of(res: object) -> tuple:
    """页内 fetch 回来的 [status, text] → (int, str);形不对给 (0, "")(按失败处理)。"""
    if isinstance(res, list) and len(res) == 2:
        return int(res[0]), str(res[1])
    return 0, ""


def detail_key_of(x: DetailKeyIn) -> str:
    """详情页在 crawl 层的键(自拟查询串,与探路期落的 604 张同键)。"""
    return DETAIL_KEY_TPL.format(base=POSTINGS_URL, pid=x.posting_id, row=x.row_id)


# =========================================================================
# 3. 详情解析(缓存原文 → 「标签: 值」表格 → raw jobs.json)
# =========================================================================


def parse_hireac_details() -> None:
    """本域步骤入口:在列、缓存里有原文、事实表里还没有的帖 → 抽表格 → 增量写 raw jobs.json。"""
    rows = load_json_dict(IN_ROWS)
    have = load_cache_index(SLUG_CRAWL)
    facts = load_json_dict(IN_JOBS)
    today = date.today().isoformat()
    tally = ParseTally(parsed=0, skipped=0, missing=0)
    for row_id, form in rows.items():
        if row_id in facts:
            tally.skipped += 1
            continue
        key = detail_key_of(DetailKeyIn(row_id=row_id, posting_id=text_of(dict_of(form).get(K_POSTING_ID_FORM))))
        path = have.get(key)
        if path is None:
            tally.missing += 1
            continue
        fields = fields_of(path.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE))
        fact = to_job_fact(DetailFieldsIn(posting_id=row_id, fields=fields, seen=today))
        facts[row_id] = asdict(fact)
        tally.parsed += 1
    OUT_JOBS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_JOBS, payload=facts, indent=JSON_INDENT))
    say(PRINT_PARSE_DONE_TPL.format(parsed=tally.parsed, skipped=tally.skipped, missing=tally.missing,
                                    out=OUT_JOBS))


def fields_of(html: str) -> dict:
    """详情页三块表格的「标签: 值」→ 标签 → 值(同名标签只认第一次;标签尾的冒号剥掉)。

    正文四格(RICH_FIELDS)走块级序列化保住段落/列表/节头,其余格压成单行纯文本
    (2026-09-20:本域 plain_text_of 原先两种用途共用,正文那一半迁去 richtext 叶)。
    """
    out: dict = {}
    for m in FIELD_RE.finditer(html):
        k = plain_text_of(m.group(GROUP_KEY)).rstrip(COLON)
        if k == "" or k in out:
            continue
        if k in RICH_FIELDS:
            out[k] = rich_text_of(m.group(GROUP_VALUE))
        else:
            out[k] = plain_text_of(m.group(GROUP_VALUE))
    return out


def to_job_fact(x: DetailFieldsIn) -> JobFact:
    """「标签 → 值」→ JobFact(值级清洗全在这:两类帖的标签取舍、地点归一、截止日转 ISO、缺格给空串)。"""
    f = x.fields
    loc = location_of(f)
    return JobFact(
        posting_id=x.posting_id,
        title=text_of(f.get(F_TITLE)), employer=text_of(f.get(F_ORG)), division=text_of(f.get(F_DIVISION)),
        kind=pick(PickIn(fields=f, keys=[F_POSITION_TYPE, F_JOB_TYPE])),
        city=loc.city, province=loc.province,
        postal=text_of(f.get(F_POSTAL)), street=text_of(f.get(F_ADDRESS)),
        salary_kind=text_of(f.get(F_SALARY)), hours=text_of(f.get(F_HOURS)), term=text_of(f.get(F_TERM)),
        category=text_of(f.get(F_CATEGORY)),
        description=pick(PickIn(fields=f, keys=[F_DESCRIPTION, F_DESCRIPTION_CC])),
        requirements=pick(PickIn(fields=f, keys=[F_REQUIREMENTS, F_QUALIFICATIONS])),
        deadline=deadline_of(text_of(f.get(F_DEADLINE))),
        apply_url=pick(PickIn(fields=f, keys=[F_APPLY_WEB, F_APPLY_CC])),
        apply_email=text_of(f.get(F_APPLY_EMAIL)),
        procedure=pick(PickIn(fields=f, keys=[F_PROCEDURE, F_PREFERRED])),
        website=text_of(f.get(F_WEBSITE)), language=text_of(f.get(F_LANGUAGE)),
        country=text_of(f.get(F_COUNTRY)),
        first_seen=x.seen,
    )


def pick(x: PickIn) -> str:
    """几个候选标签里第一个有值的(本地帖与联播帖同义不同名的格);全没有给空串。"""
    for k in x.keys:
        v = text_of(x.fields.get(k))
        if v != "":
            return v
    return ""


def location_of(fields: dict) -> Location:
    """地点归一:联播帖优先拆格 City / Province(省全名→码,缺省按城补);本地帖解 Job Location 文本。"""
    city = text_of(fields.get(F_CITY))
    prov_name = text_of(fields.get(F_PROVINCE))
    if city != "" or prov_name != "":
        prov = PROV_CODE_OF_NAME.get(prov_name, "")
        if prov == "":
            prov = PROV_OF_CITY.get(city, "")
        return Location(city=city, province=prov)
    return place_of(pick(PickIn(fields=fields, keys=[F_LOCATION, F_LOCATION_CC])))


def place_of(text: str) -> Location:
    """一段地点文本 → (城, 省):「Barrie, ON」拆尾码;省名 / 区域名只给省;裸城名按表补省;认不出留空。"""
    t = text.strip()
    if COMMA_SP in t:
        city, tail = t.split(COMMA_SP, 1)
        tail = tail.strip()
        if tail in PROV_CODES:
            return Location(city=city.strip(), province=tail)
        prov = PROV_CODE_OF_NAME.get(tail, "")
        if prov == "":
            prov = PROV_OF_CITY.get(city.strip(), "")
        return Location(city=city.strip(), province=prov)
    code = PROV_CODE_OF_NAME.get(t, "")
    if code != "":
        return Location(city="", province=code)
    return Location(city=t, province=PROV_OF_CITY.get(t, ""))


def deadline_of(text: str) -> str:
    """截止文本 → ISO 日期(按 DEADLINE_FMTS 依次试);认不出给空串(宁空不猜)。"""
    for fmt in DEADLINE_FMTS:
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def dict_of(value: object) -> dict:
    """一格取字典:本来就是字典照给;其余给空字典。"""
    if isinstance(value, dict):
        return value
    return {}


def text_of(value: object) -> str:
    """一格取文本:None 给空串,其余转字符串后折空白。"""
    if value is None:
        return ""
    return WS_RE.sub(SPACE, str(value)).strip()


def plain_text_of(html: str) -> str:
    """HTML 片段 → 纯文本(剥脚本样式块、剥标签、解实体、折空白)。"""
    return WS_RE.sub(SPACE, unescape(TAG_RE.sub(SPACE, SCRIPT_RE.sub(SPACE, html)))).strip()


# =========================================================================
# 4. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================


def build_hireac_postings() -> None:
    """本域步骤入口:事实表 × 行表 → 当前态 postings 仓(不在本轮列表 / 过截止日 / 无标题 / 海外的剔)。

    落盘持 Job Bank 仓锁(与 jobbank 域解析段同一把):mart 的三段跨源清洗原地写回这份仓,
    load 域 build 链整链持锁 —— 不持锁的整文件重写会落在「清洗完 → 汇装」之间(2026-08-05 薪资实撞同款病)。"""
    rows = load_json_dict(IN_ROWS)
    facts = load_json_dict(IN_JOBS)
    seen_at = datetime.now(timezone.utc).strftime(SECONDS_FMT) + UTC_Z
    today = date.today().isoformat()
    tally = StoreTally(rows=0, gone=0, expired=0, blank=0, foreign=0)
    out: list = []
    for row_id, raw in facts.items():
        if row_id not in rows:
            tally.gone += 1
            continue
        fact = to_fact_of_row(raw)
        if fact.title == "":
            tally.blank += 1
            continue
        if fact.deadline != "" and fact.deadline < today:
            tally.expired += 1
            continue
        if fact.country != "" and fact.country != COUNTRY_CA:
            tally.foreign += 1
            continue
        out.append(to_posting_row(PostingRowIn(fact=fact, seen_at=seen_at)))
    out.sort(key=date_key_of, reverse=True)
    tally.rows = len(out)
    OUT_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        paths.write_json(paths.WriteJsonIn(path=OUT_POSTINGS, payload=out, indent=JSON_INDENT))
    say(PRINT_STORE_DONE_TPL.format(rows=tally.rows, gone=tally.gone, expired=tally.expired,
                                    blank=tally.blank, foreign=tally.foreign, out=OUT_POSTINGS))


def to_fact_of_row(row: dict) -> JobFact:
    """raw jobs.json 的一行 → JobFact(asdict 的逆;键即字段名,dataclass 自校缺格)。"""
    return JobFact(**row)


def date_key_of(row: dict) -> str:
    """排序键:发布日 ISO 串(缺的排最后)。"""
    return row.get(K_DATE) or ""


def to_posting_row(x: PostingRowIn) -> dict:
    """事实 → Job Bank 仓同形的行(键序即落盘列序,与其余板仓逐键同形;mart 的 to_jb_job_fields 按这些键取)。
    本板无薪资金额(salary 恒空)、无发布日(date = 首见日)。"""
    f = x.fact
    return {
        K_POSTING_ID: f.posting_id, K_TITLE: f.title, K_TITLE_ORIG: "", K_EMPLOYER: f.employer,
        K_CITY: f.city, K_PROVINCE: f.province, K_SALARY: salary_text_of(f),
        K_DATE: f.first_seen, K_SOURCE: SOURCE_LABEL, K_DIRECT: False, K_URL: url_of(f),
        K_ADDRESS: address_of(f), K_NOC: "", K_LAST_SEEN: x.seen_at,
        K_EMPLOYMENT_TERM: TERM_OF_KIND.get(f.kind, ""), K_EMPLOYMENT_HOURS: HOURS_OF_KIND.get(f.kind, ""),
        K_DESCRIPTION: description_of(f), K_VALID_THROUGH: f.deadline, K_LANG: LANG_EN,
        K_INDUSTRY: f.category, K_EMPLOYER_URL: employer_url_of(f),
    }


def salary_text_of(f: JobFact) -> str:
    """正文里第一处薪资片段 → Job Bank 写法:带单位词照译;不带单位按板上类型格补,且金额要在该类型的
    合理量级里(时薪 15–150、年薪 ≥ 2 万),否则当不是薪资(签约奖金、补贴)留空串。"""
    m = SALARY_SNIPPET_RE.search(f.description + DESC_SEP + f.requirements)
    if m is None:
        return ""
    lo = m.group(1)
    hi = m.group(2)
    unit = ""
    if m.group(3) is not None:
        unit = SALARY_UNIT_WORD.get(m.group(3).lower(), "")
    if unit == "":
        unit = unit_by_kind_of(UnitByKindIn(kind=f.salary_kind, amount=float(lo.replace(COMMA, ""))))
    if unit == "":
        return ""
    if hi is None:
        return SALARY_TPL.format(lo=lo, unit=unit)
    return SALARY_RANGE_TPL.format(lo=lo, hi=hi, unit=unit)


def unit_by_kind_of(x: UnitByKindIn) -> str:
    """正文金额没带单位时,按板上 Salary 类型格补单位,金额量级不合该类型给空串(宁空不猜)。"""
    unit = KIND_UNIT_WORD.get(x.kind, "")
    if unit == KIND_UNIT_WORD[KIND_HOURLY_KEY] and HOURLY_MIN <= x.amount <= HOURLY_MAX:
        return unit
    if unit == KIND_UNIT_WORD[KIND_SALARY_KEY] and x.amount >= ANNUAL_MIN:
        return unit
    return ""


def url_of(f: JobFact) -> str:
    """申请落点:雇主投递网址 > 雇主官网 > 板正门(登录后可查该帖)。"""
    if f.apply_url.startswith(HTTP_PREFIX):
        return f.apply_url
    if f.website.startswith(HTTP_PREFIX):
        return f.website
    return POSTINGS_URL


def address_of(f: JobFact) -> str:
    """街道、城市、省、邮编的非空段用「, 」连成地址文本。"""
    parts: list = []
    for part in (f.street, f.city, f.province, f.postal):
        if part != "":
            parts.append(part)
    return ADDRESS_SEP.join(parts)


def description_of(f: JobFact) -> str:
    """描述与要求并成一段纯文本(要求为空就只有描述)。"""
    if f.requirements == "":
        return f.description
    return f.description + DESC_SEP + f.requirements


def employer_url_of(f: JobFact) -> str:
    """雇主官网:联播帖 Website 是网址才给,否则空串。"""
    if f.website.startswith(HTTP_PREFIX):
        return f.website
    return ""
