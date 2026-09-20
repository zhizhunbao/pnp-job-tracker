"""
sites 域函数 —— 全部行为住这(照 jdformat 样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

一步一入口(零参):fetch_site_pages / build_site_facts。**零字符串令**(字面量全住 constants)/ **显式循环令**
(禁推导 / genexp / lambda)/ **内嵌禁令** / **一参令**(多入参收 scheme 的 XxxIn dataclass)。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch / crawl)。
抓页一律走 crawl 叶的有头浏览器(2026-09-20);fetch 叶的 httpx 客户端只剩 facts 步打局域网盒子那一发在用。
"""
import asyncio
import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import cast
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

import paths
from crawl.functions import (
    browser_live, browser_ok, close_browser, ensure_cookie_jar, fetch_browser_html, get_browser_page, load_cache_index, put_cached_page,
)
from crawl.scheme import CachePutIn
from fetch.functions import cms_config, host_resolves, make_client
from log.functions import say
from sites import FACTS_LIMIT, FETCH_LIMIT
from sites.constants import (
    ASCII_CODEC, ASCII_ERRORS, HOST_LABEL_SEP, NAME_PHRASE_WORDS, NAME_SHORT_LEN, NAME_STOP, NAME_TOKEN_HEAD_LEN,
    NAME_TOKEN_MIN_LEN, NAME_WORD_RE, NFKD_FORM,
    BRIEF_BASE_MARK, BRIEF_CORE_MARKS, BRIEF_LINE_SEP, BRIEF_NOT_STATED, BRIEF_LINE_TPL, BRIEF_SECS, DEAD_FAILS, HOT_HOST_HOURS, HQ_JOIN, HQ_TRIM_CHARS, IN_SEEN,
    K_DONE_BRIEF, K_DONE_HQ_ADDRESS, K_DONE_HQ_CITY, K_DONE_HQ_PROVINCE, K_DONE_HQ_QUOTE, K_DONE_HQ_SOURCE, K_DONE_SOURCES,
    K_HOST, K_KEY, K_NOTE, K_SEEN_LAST, K_SEEN_OPENED, K_STAGE, K_TODOS, NOTE_DEAD_SITE, NOTE_DNS, NOTE_NAME_MISMATCH, NOTE_NO_CMS,
    P_LIMIT, PATH_SITE_DONE, PATH_SITE_TODO, PRINT_VISIT_ROW_TPL, PRINT_VISIT_TAKE_TPL, PROV_CODE_LEN,
    RETRY_TRANSIENT_DAYS, SECONDS_PER_HOUR, ST_DEAD, STAGE_DONE, STAGE_FACTS, STAGE_FETCH, STAGE_FIND, TRANSIENT_NOTES,
    VISIT_TAKE,
    ABOUT_LINK_RE, BLOB_MIN_LEN, BLOCK_SEP, BLOCK_TITLE_RE, JS_LOCATION, NOTE_BLOCKED, NOTE_BROWSER,
    NOTE_NO_BROWSER, PRINT_BROWSER_ABORT, CONTACT_LINK_RE, CRAWL_SLUG_TPL, ENV_LLM_BASE, ENV_LLM_MODEL, ERRORS_REPLACE,
    EXTRA_PAGES_MAX, FIELD_NONE, FLUSH_N, GEN_TOKENS, HOME_HEAD_LEN, HOME_TAIL_LEN, HOST_WWW_PREFIX,
    HQ_SHOW_TPL, HREF_ATTR, HTML_MIN_LEN, IN_MART_COMPANIES, IN_MART_JOBS, JSON_INDENT, K_COMPANY_SLUG, K_HQ_ADDRESS,
    K_HQ_CITY, K_HQ_PROVINCE, K_NAME, K_SLUG, K_STATUS, K_WEBSITE, LINE_BREAK, LINE_RE_FLAGS, LINE_RE_TPL,
    LLM_MODEL_DEFAULT, LLM_TEMPERATURE, LLM_TIMEOUT_S, NET_ERRORS, NONE_MARK, NOTE_BLOB, NOTE_EMPTY, NOTE_HTTP_TPL,
    NOTE_NO_LLM, NOTE_NO_MART, NOTE_NO_TEXT, NOTE_NOTHING, NOTE_ROBOTS, OPEN_STATUSES, OUT_FACTS, OUT_PAGES, P_MODEL,
    P_NUM_PREDICT, P_OPTIONS, P_PROMPT, P_RESPONSE, P_STREAM, P_TEMPERATURE, P_THINK, PAGE_BLOCK_TPL, PAGE_HEAD_LEN,
    PARSER_HTML, PATH_OLLAMA_GENERATE, POLITE_S, PRINT_ABORT_TPL, PRINT_FACTS_DONE_TPL, PRINT_FACTS_ROW_TPL,
    PRINT_FACTS_TARGETS_TPL, PRINT_FETCH_DONE_TPL, PRINT_FETCH_ROW_TPL, PRINT_FETCH_TARGETS_TPL, PROMPT_TPL,
    QUOTE_CHECK_LEN, QUOTE_MIN_LEN, QUOTE_SUFFIX, REFRESH_DAYS, RETRY_FAILED_DAYS, ROBOTS_PATH, ROBOTS_UA, SECONDS_PER_DAY,
    SECTION_HQ, SECTIONS, SKIP_LINK_RE, SKIP_TAGS, SPACE_SEP, ST_FAIL, ST_OK, STRIP_REPL, TAG_A, TAG_TITLE,
    TEXT_ENCODING, THINK_RE, URL_FRAGMENT_SEP, URL_SCHEME_SEP, URL_TAIL_SLASH, VALUE_MAX_LEN, WS_RE,
)
from sites.scheme import (
    CarryIn, CmsIn, HostPickIn, HqStreetIn, SeenIn, VisitDoneIn, VisitOneIn, VisitTodo,
    AbbrevIn, AnswerIn, BackfillNameIn, FactsOneIn, FactsRecord, FetchedPage, FetchPageIn, HqSourceIn, HttpClientLike, LinksIn, LlmCallIn, NameOkIn,
    LlmCfg, PagesRecord, PickFactsIn, PickFetchIn, SectionIn, Target, VerifyIn,
)

# =========================================================================
# 1. 入口:fetch(官网原文进 crawl 层)· facts(读缓存原文 → 盒子整理七节)
# =========================================================================


def fetch_site_pages() -> None:
    """fetch 步入口:asyncio 壳(抓页 2026-09-20 起一律走 crawl 域有头浏览器 —— Frank「crawl 不是用有头的吗」「httpx curl 都删了」;
    浏览器门是 async 单例,company 域 about 步同形)。"""
    asyncio.run(fetch_round())


async def fetch_round() -> None:
    """fetch 步主体:范围内还没抓 / 到刷新期的公司,每家抓首页 + Contact + About,原文进 crawl 层,记录落 OUT_PAGES。

    mart 还没产出 / 镜像没装浏览器直接退;单家失败只记 status 不炸整轮;浏览器没起来整轮中止不记失败;
    每 FLUSH_N 家落一次盘(中途被杀不丢);浏览器收摊在 finally。
    """
    targets = site_targets()
    if len(targets) == 0:
        say(NOTE_NO_MART)
        return
    if not browser_ok():
        say(NOTE_NO_BROWSER)
        return
    ensure_cookie_jar()
    cache = read_pages()
    todo = pick_fetch_todo(PickFetchIn(targets=targets, cache=cache, limit=int(FETCH_LIMIT)))
    say(PRINT_FETCH_TARGETS_TPL.format(total=len(targets), done=count_pages_ok(cache), todo=len(todo),
                                       limit=FETCH_LIMIT))
    ok = 0
    fail = 0
    try:
        for t in todo:
            rec = await fetch_site(t)
            if not browser_live():
                say(PRINT_BROWSER_ABORT)
                break
            carry_fails(CarryIn(rec=rec, prev=cache.get(t.slug)))
            cache[t.slug] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_FETCH_ROW_TPL.format(status=rec.status, name=t.name, pages=len(rec.urls), note=rec.note))
            if (ok + fail) % FLUSH_N == 0:
                write_pages(cache)
    finally:
        await close_browser()
    total = write_pages(cache)
    say(PRINT_FETCH_DONE_TPL.format(ok=ok, fail=fail, total=total, out=OUT_PAGES.name))


def build_site_facts() -> None:
    """facts 步入口:抓到了页面、还没整理(或官网重抓过)的公司逐家过局域网 qwen,七节 + 原句落 OUT_FACTS。

    没盒子地址直接退;单家失败只记 status 不炸整轮;盒子连不上 / 超时(NET_ERRORS)不是这家公司的错:
    不记失败、整轮中止(jdformat 2026-09-15 盒子掉线实撞的同一条教训)。
    """
    cfg = llm_config()
    if cfg.base == FIELD_NONE:
        say(NOTE_NO_LLM)
        return
    targets = site_targets()
    if len(targets) == 0:
        say(NOTE_NO_MART)
        return
    pages = read_pages()
    cache = read_facts()
    backfill_hq_sources(cache)
    backfill_name_ok(BackfillNameIn(cache=cache, targets=targets))
    todo = pick_facts_todo(PickFactsIn(targets=targets, pages=pages, cache=cache, limit=int(FACTS_LIMIT)))
    say(PRINT_FACTS_TARGETS_TPL.format(pages=count_pages_ok(pages), done=count_facts_ok(cache), todo=len(todo),
                                       limit=FACTS_LIMIT, model=cfg.model))
    ok = 0
    fail = 0
    with make_client(timeout=LLM_TIMEOUT_S) as client:
        for t in todo:
            rec = facts_one(FactsOneIn(client=cast(HttpClientLike, client), cfg=cfg, target=t, pages=pages[t.slug]))
            if rec.note in NET_ERRORS:
                say(PRINT_ABORT_TPL.format(note=rec.note))
                break
            cache[t.slug] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_FACTS_ROW_TPL.format(status=rec.status, name=t.name, kept=len(rec.quotes), hq=hq_show_of(rec),
                                           note=rec.note))
            if (ok + fail) % FLUSH_N == 0:
                write_facts(cache)
    total = write_facts(cache)
    say(PRINT_FACTS_DONE_TPL.format(ok=ok, fail=fail, total=total, out=OUT_FACTS.name))


def llm_config() -> LlmCfg:
    """读环境定盒子地址与模型名。"""
    return LlmCfg(base=os.environ.get(ENV_LLM_BASE, FIELD_NONE).strip().rstrip(URL_TAIL_SLASH),
                  model=os.environ.get(ENV_LLM_MODEL, LLM_MODEL_DEFAULT))


def read_pages() -> dict[str, PagesRecord]:
    """读上轮抓取记录(缺文件 = 空表)。"""
    cache: dict[str, PagesRecord] = {}
    if OUT_PAGES.exists():
        for slug, d in json.loads(OUT_PAGES.read_text(encoding=TEXT_ENCODING)).items():
            cache[slug] = PagesRecord.model_validate(d)
    return cache


def write_pages(cache: dict[str, PagesRecord]) -> int:
    """抓取记录落盘 OUT_PAGES(原子写;首轮先建目录),返回累计 ok 家数。

    2026-09-20 落盘前重读并入:例行轮一跑两小时、整本记录拿在手里,同时 visit 步(另一个容器)也在写这份文件 ——
    逐家取抓取时刻更新的那一条(盘上的更新就收进手里的这本),谁也不盖谁。"""
    OUT_PAGES.parent.mkdir(parents=True, exist_ok=True)
    for slug, disk in read_pages().items():
        mine = cache.get(slug)
        if mine is None or disk.at > mine.at:
            cache[slug] = disk
    out: dict[str, dict] = {}
    for slug, rec in cache.items():
        out[slug] = rec.model_dump()
    paths.write_json(paths.WriteJsonIn(path=OUT_PAGES, payload=out, indent=JSON_INDENT))
    return count_pages_ok(cache)


def count_pages_ok(cache: dict[str, PagesRecord]) -> int:
    """抓成的家数(报数用)。"""
    n = 0
    for rec in cache.values():
        if rec.status == ST_OK:
            n += 1
    return n


def read_facts() -> dict[str, FactsRecord]:
    """读上轮整理记录(缺文件 = 空表)。"""
    cache: dict[str, FactsRecord] = {}
    if OUT_FACTS.exists():
        for slug, d in json.loads(OUT_FACTS.read_text(encoding=TEXT_ENCODING)).items():
            cache[slug] = FactsRecord.model_validate(d)
    return cache


def write_facts(cache: dict[str, FactsRecord]) -> int:
    """整理记录落盘 OUT_FACTS(原子写;首轮先建目录),返回累计 ok 家数。落盘前重读并入(同 write_pages:逐家取整理时刻更新的那一条)。"""
    OUT_FACTS.parent.mkdir(parents=True, exist_ok=True)
    for slug, disk in read_facts().items():
        mine = cache.get(slug)
        if mine is None or disk.at > mine.at:
            cache[slug] = disk
    out: dict[str, dict] = {}
    for slug, rec in cache.items():
        out[slug] = rec.model_dump()
    paths.write_json(paths.WriteJsonIn(path=OUT_FACTS, payload=out, indent=JSON_INDENT))
    return count_facts_ok(cache)


def count_facts_ok(cache: dict[str, FactsRecord]) -> int:
    """整理成的家数(报数用)。"""
    n = 0
    for rec in cache.values():
        if rec.status == ST_OK:
            n += 1
    return n


# 1b. 入口:visit(点开优先 —— 被用户点开过的公司插队:抓 → 整理 → 交活,每步写回进度;2026-09-20)
# =========================================================================


def visit_queue() -> None:
    """visit 步入口:asyncio 壳(抓页走 crawl 域有头浏览器,同 fetch 步)。"""
    asyncio.run(visit_round())


async def visit_round() -> None:
    """visit 步主体(2026-09-20 Frank「按用户点开过的公司优先抓取和纠错」;设计稿 docs/design/点开优先抓取与纠错-20260920.md):
    向 cms 取「被真人点开过、有官网」的活(最近点开的在前),逐家抓官网 → 整理 → 交活,每走一步把进度写回队列表(公司卡 15 秒来问一次)。

    没配 cms 接线 / 镜像没装浏览器直接退;没活不起浏览器;浏览器中途没了整轮中止;收摊在 finally。
    """
    cms = cms_config()
    if cms.base == FIELD_NONE:
        say(NOTE_NO_CMS)
        return
    if not browser_ok():
        say(NOTE_NO_BROWSER)
        return
    cfg = llm_config()
    with make_client(timeout=LLM_TIMEOUT_S) as raw:
        client = cast(HttpClientLike, raw)
        todos = take_visit_todos(CmsIn(client=client, cms=cms, payload={P_LIMIT: VISIT_TAKE}))
        say(PRINT_VISIT_TAKE_TPL.format(n=len(todos), limit=VISIT_TAKE))
        if len(todos) == 0:
            return
        ensure_cookie_jar()
        try:
            for todo in todos:
                await visit_one(VisitOneIn(client=client, cms=cms, cfg=cfg, todo=todo))
                if not browser_live():
                    say(PRINT_BROWSER_ABORT)
                    break
        finally:
            await close_browser()


def take_visit_todos(x: CmsIn) -> list:
    """取活:GET 待办清单;非 2xx 抛(整轮中止并留痕,由门的 err 接)。键 / slug / 官网缺的行丢掉。"""
    r = x.client.get(x.cms.base + PATH_SITE_TODO, params=x.payload, headers=x.cms.headers)
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    out: list = []
    if not isinstance(body, dict):
        return out
    rows = body.get(K_TODOS)
    if not isinstance(rows, list):
        return out
    for row in rows:
        if not isinstance(row, dict):
            continue
        todo = VisitTodo(key=str(row.get(K_KEY) or FIELD_NONE), slug=str(row.get(K_SLUG) or FIELD_NONE),
                         name=str(row.get(K_NAME) or FIELD_NONE), website=str(row.get(K_WEBSITE) or FIELD_NONE))
        if todo.key != FIELD_NONE and todo.slug != FIELD_NONE and todo.website != FIELD_NONE:
            out.append(todo)
    return out


def hand_stage(x: CmsIn) -> None:
    """交活 / 写回进度:POST 一步;非 2xx 抛。"""
    r = x.client.post(x.cms.base + PATH_SITE_DONE, json=x.payload, headers=x.cms.headers)
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))


async def visit_one(x: VisitOneIn) -> None:
    """一家:报「抓取官网」→ 抓(同主机名 24 小时内抓过的复用缓存)→ 域名不解析的转给 company 域重新找官网,别的失败照实办完
    → 报「整理内容」→ 整理(这批页面整理过的不重做)→ 官网归属闸没过的转给 company 域找名字对得上的站(找不到原官网不动),过了的带总部 / 简介交活。盒子掉线不交活,进度停在「整理内容」,下一轮接着办。"""
    host = host_of(x.todo.website)
    target = Target(slug=x.todo.slug, name=x.todo.name or x.todo.slug, website=x.todo.website, open_jobs=0)
    hand_stage(CmsIn(client=x.client, cms=x.cms, payload={K_KEY: x.todo.key, K_STAGE: STAGE_FETCH, K_HOST: host}))
    pages = read_pages()
    rec = host_cached_of(HostPickIn(pages=pages, host=host, slug=x.todo.slug))
    if rec is None:
        rec = await fetch_site(target)
        if not browser_live():
            return
        carry_fails(CarryIn(rec=rec, prev=pages.get(x.todo.slug)))
    pages[x.todo.slug] = rec
    write_pages(pages)
    say(PRINT_VISIT_ROW_TPL.format(stage=STAGE_FETCH, name=x.todo.name, note=rec.note or rec.status))
    if rec.status != ST_OK:
        done = {K_KEY: x.todo.key, K_STAGE: STAGE_DONE, K_NOTE: rec.note}
        if rec.note == NOTE_DNS:
            done = {K_KEY: x.todo.key, K_STAGE: STAGE_FIND, K_NOTE: NOTE_DEAD_SITE}
        hand_stage(CmsIn(client=x.client, cms=x.cms, payload=done))
        return
    hand_stage(CmsIn(client=x.client, cms=x.cms, payload={K_KEY: x.todo.key, K_STAGE: STAGE_FACTS}))
    facts = read_facts()
    frec = facts.get(x.todo.slug)
    if frec is None or frec.status != ST_OK or frec.pages_at != rec.at:
        if x.cfg.base == FIELD_NONE:
            say(NOTE_NO_LLM)
            return
        frec = facts_one(FactsOneIn(client=x.client, cfg=x.cfg, target=target, pages=rec))
        if frec.note in NET_ERRORS:
            say(PRINT_ABORT_TPL.format(note=frec.note))
            return
        facts[x.todo.slug] = frec
        write_facts(facts)
    say(PRINT_VISIT_ROW_TPL.format(stage=STAGE_FACTS, name=x.todo.name, note=frec.note or hq_show_of(frec)))
    if frec.status == ST_OK and not frec.name_ok:
        hand_stage(CmsIn(client=x.client, cms=x.cms, payload={K_KEY: x.todo.key, K_STAGE: STAGE_FIND, K_NOTE: NOTE_NAME_MISMATCH}))
        return
    hand_stage(CmsIn(client=x.client, cms=x.cms, payload=done_payload_of(VisitDoneIn(key=x.todo.key, facts=frec, host=host))))


def host_cached_of(x: HostPickIn) -> PagesRecord | None:
    """同主机名 HOT_HOST_HOURS 小时内抓过的记录(成败都算):自己的原样用;别家的(加盟店共用总站)抄一条、原文指到那家的 crawl 目录。
    没有 = None(真去抓)。"""
    mine = x.pages.get(x.slug)
    if mine is not None and mine.host == x.host and hours_since(mine.at) <= HOT_HOST_HOURS:
        return mine
    for slug, rec in x.pages.items():
        if slug == x.slug or rec.host != x.host or rec.host == FIELD_NONE or hours_since(rec.at) > HOT_HOST_HOURS:
            continue
        owner = rec.cache_slug
        if owner == FIELD_NONE:
            owner = slug
        note = rec.note
        if rec.status == ST_OK:
            note = FIELD_NONE
        return PagesRecord(status=rec.status, urls=list(rec.urls), at=now_iso(), note=note, host=rec.host,
                           fails=rec.fails, cache_slug=owner)
    return None


def hours_since(iso: str) -> float:
    """距某 ISO 时刻过了几小时(时刻不成形按很久以前算,同 days_since)。"""
    return days_since(iso) * SECONDS_PER_DAY / SECONDS_PER_HOUR


def done_payload_of(x: VisitDoneIn) -> dict:
    """办完的交活体:整理没成的只报办完 + 由头;官网归属闸没过的(name_ok=False:官网多半是母公司 / 别家的站)不带总部也不带简介;
    过了的带总部五格(总部一节过了原句核对才有)与由核对过的节拼成的简介 + 出处页。"""
    out: dict = {K_KEY: x.key, K_STAGE: STAGE_DONE, K_NOTE: x.facts.note, K_HOST: x.host}
    if x.facts.status != ST_OK or not x.facts.name_ok:
        return out
    if SECTION_HQ in x.facts.quotes:
        out[K_DONE_HQ_ADDRESS] = x.facts.hq_address
        out[K_DONE_HQ_CITY] = x.facts.hq_city
        out[K_DONE_HQ_PROVINCE] = x.facts.hq_province
        out[K_DONE_HQ_QUOTE] = x.facts.quotes[SECTION_HQ]
        out[K_DONE_HQ_SOURCE] = x.facts.hq_source
    out[K_DONE_BRIEF] = brief_of(x.facts)
    out[K_DONE_SOURCES] = list(x.facts.sources)
    return out


def brief_of(rec: FactsRecord) -> str:
    """官网整理记录 → 简介文本(一节一行,方括号标记):前四节(主营 / 所在地 / 规模 / 成立)一律出行 —— 没过原句核对的写 BRIEF_NOT_STATED
    (页面与 cms 认五节简介靠这几个标记齐全,缺了会被当成过期缓存重查;company 域五节简介同一写法);后三节过了核对才出。
    「所在地」= 总部街址、市、省拼一行。"""
    lines: list = []
    for mark, key in BRIEF_SECS:
        text = BRIEF_NOT_STATED
        if mark in rec.quotes and getattr(rec, key) != FIELD_NONE:
            text = getattr(rec, key)
        if text != BRIEF_NOT_STATED or mark in BRIEF_CORE_MARKS:
            lines.append(BRIEF_LINE_TPL.format(mark=mark, text=text))
        if mark == SECTIONS[0]:
            lines.append(BRIEF_LINE_TPL.format(mark=BRIEF_BASE_MARK, text=base_text_of(rec)))
    return BRIEF_LINE_SEP.join(lines)


def base_text_of(rec: FactsRecord) -> str:
    """「所在地」一节的字:总部一节过了原句核对 = 街址、市、省拼一行;没过 = BRIEF_NOT_STATED。"""
    if SECTION_HQ not in rec.quotes:
        return BRIEF_NOT_STATED
    parts: list = []
    for part in (rec.hq_address, rec.hq_city, rec.hq_province):
        if part != FIELD_NONE:
            parts.append(part)
    return HQ_JOIN.join(parts)


# =========================================================================
# =========================================================================
# 2. 挑队列(范围:有官网 且 有在招岗;在招岗多的在前)
# =========================================================================


def site_targets() -> list:
    """mart 的公司表 + 岗位表 → 范围内的公司,被用户看过的在前、其后按在招岗数多→少排(同数按 slug,顺序稳定);缺文件 = 空表。"""
    out: list = []
    if not IN_MART_COMPANIES.exists() or not IN_MART_JOBS.exists():
        return out
    seen = read_seen()
    open_jobs: dict[str, int] = {}
    for j in json.loads(IN_MART_JOBS.read_text(encoding=TEXT_ENCODING)):
        if j.get(K_STATUS) not in OPEN_STATUSES:
            continue
        slug = str(j.get(K_COMPANY_SLUG) or FIELD_NONE)
        open_jobs[slug] = open_jobs.get(slug, 0) + 1
    for c in json.loads(IN_MART_COMPANIES.read_text(encoding=TEXT_ENCODING)):
        slug = str(c.get(K_SLUG) or FIELD_NONE)
        site = str(c.get(K_WEBSITE) or FIELD_NONE)
        if slug == FIELD_NONE or site == FIELD_NONE or open_jobs.get(slug, 0) == 0:
            continue
        out.append(Target(slug=slug, name=str(c.get(K_NAME) or slug), website=site, open_jobs=open_jobs[slug],
                          seen=seen_of(SeenIn(seen=seen, slug=slug))))
    out.sort(key=target_order_of)
    return out


def target_order_of(t: Target) -> tuple:
    """排队键:被用户看过的在前(最近看过的更前;2026-09-20 Frank「按用户点开过的公司优先抓取和纠错」),其后在招岗多的在前,同数按 slug。"""
    return (-t.seen, -t.open_jobs, t.slug)


def read_seen() -> dict:
    """读 explore 域落的「被用户看过的公司」清单(slug → 记录);缺文件 / 不成形 = 空表(没人看过,照旧按在招岗数排)。"""
    if not IN_SEEN.exists():
        return {}
    data = json.loads(IN_SEEN.read_text(encoding=TEXT_ENCODING))
    if not isinstance(data, dict):
        return {}
    return data


def seen_of(x: SeenIn) -> float:
    """一家公司最近被看过的时刻(epoch 秒):点开过的取点开时刻,只被列出过的取列出时刻;没被看过 / 时刻不成形 = 0。"""
    rec = x.seen.get(x.slug)
    if not isinstance(rec, dict):
        return 0.0
    iso = str(rec.get(K_SEEN_OPENED) or rec.get(K_SEEN_LAST) or FIELD_NONE)
    if iso == FIELD_NONE:
        return 0.0
    try:
        return datetime.fromisoformat(iso).timestamp()
    except ValueError:
        return 0.0


def pick_fetch_todo(x: PickFetchIn) -> list:
    """还没抓过的、抓成但过了刷新期的、抓失败且过了冷却期的,按范围序凑够 limit 即止。"""
    todo: list = []
    for t in x.targets:
        if len(todo) >= x.limit:
            break
        rec = x.cache.get(t.slug)
        if rec is not None and (rec.host == FIELD_NONE or rec.host == host_of(t.website)) and not fetch_due(rec):
            continue
        todo.append(t)
    return todo


def fetch_due(rec: PagesRecord) -> bool:
    """这条抓取记录到没到再抓的时候:抓成的看刷新期;死站不再抓这个地址(等 company 域重新找官网 —— 官网换了,
    主机名对不上这条记录,pick_fetch_todo 自然重抓);瞬时失败(浏览器没取回页面 / 头一回域名不解析)冷却 RETRY_TRANSIENT_DAYS;
    真被拦的(拦截页 / robots / 没正文)冷却 RETRY_FAILED_DAYS。"""
    if rec.status == ST_OK:
        return days_since(rec.at) > REFRESH_DAYS
    if rec.status == ST_DEAD:
        return False
    if rec.note in TRANSIENT_NOTES or rec.note == NOTE_DNS:
        return days_since(rec.at) > RETRY_TRANSIENT_DAYS
    return days_since(rec.at) > RETRY_FAILED_DAYS


def carry_fails(x: CarryIn) -> None:
    """连续「域名不解析」的轮数接着上一轮往上记,到 DEAD_FAILS 记死站;这一轮不是域名不解析的不记(fetch_site 给的就是 0)。"""
    if x.rec.note != NOTE_DNS:
        return
    x.rec.fails = 1
    if x.prev is not None and x.prev.host == x.rec.host:
        x.rec.fails = x.prev.fails + 1
    if x.rec.fails >= DEAD_FAILS:
        x.rec.status = ST_DEAD


def pick_facts_todo(x: PickFactsIn) -> list:
    """抓成了页面的公司里:还没整理的、官网重抓过(pages_at 对不上)的、整理失败且过了冷却期的,凑够 limit 即止。"""
    todo: list = []
    for t in x.targets:
        if len(todo) >= x.limit:
            break
        pages = x.pages.get(t.slug)
        if pages is None or pages.status != ST_OK:
            continue
        rec = x.cache.get(t.slug)
        if rec is not None and rec.pages_at == pages.at:
            if rec.status == ST_OK or days_since(rec.at) <= RETRY_FAILED_DAYS:
                continue
        todo.append(t)
    return todo


def days_since(iso: str) -> float:
    """距某 ISO 时刻过了几天(空串或解析失败当很久以前:该做了)。"""
    if iso == FIELD_NONE:
        return float(REFRESH_DAYS + 1)
    try:
        then = datetime.fromisoformat(iso)
    except ValueError:
        return float(REFRESH_DAYS + 1)
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - then).total_seconds() / SECONDS_PER_DAY


def now_iso() -> str:
    """此刻(ISO,UTC)。"""
    return datetime.now(timezone.utc).isoformat()


# =========================================================================
# 3. 抓页(原文进 crawl 层)
# =========================================================================


async def fetch_site(target: Target) -> PagesRecord:
    """一家官网:先读 robots,再抓首页,从首页链接里认 Contact / About 各一页;抓到的原文逐页进 crawl 层。

    首页抓不到 = 这家记 fail(由头进 note);附加页抓不到不算失败。异常转数据记异常类名。
    """
    rec = PagesRecord(status=ST_FAIL, at=now_iso(), host=host_of(target.website))
    slug = CRAWL_SLUG_TPL.format(slug=target.slug)
    try:
        robots = await robots_of(target.website)
        if not robots.can_fetch(ROBOTS_UA, target.website):
            rec.note = NOTE_ROBOTS
            return rec
        home = await fetch_page(FetchPageIn(slug=slug, url=target.website))
        if home.html == FIELD_NONE and home.note == NOTE_BROWSER and www_url_of(target.website) != FIELD_NONE:
            home = await fetch_page(FetchPageIn(slug=slug, url=www_url_of(target.website)))
        if home.html == FIELD_NONE:
            rec.note = home.note
            if home.note == NOTE_BROWSER and not host_resolves(urlparse(target.website).netloc):
                rec.note = NOTE_DNS
            return rec
        rec.urls.append(home.url)
        for link in extra_links_of(LinksIn(html=home.html, base=home.url)):
            if not robots.can_fetch(ROBOTS_UA, link):
                continue
            await asyncio.sleep(POLITE_S)
            page = await fetch_page(FetchPageIn(slug=slug, url=link))
            if page.html != FIELD_NONE and page.url not in rec.urls:
                rec.urls.append(page.url)
    except Exception as e:  # noqa: BLE001 — 一家站的浏览器 / 解析异常转数据,不炸整轮
        rec.note = type(e).__name__
        if len(rec.urls) == 0:
            return rec
    rec.status = ST_OK
    return rec


def www_url_of(url: str) -> str:
    """裸域名的官网补上 www. 的那个地址;本来就带 www. 的给空串(不用再试)。
    2026-09-20 有头浏览器首轮实撞:公司表里记的是裸域名,证书 / 服务只挂在 www 上 ——
    johnsoncontrols.ca 报证书名不符、petsmart.com 直接拒连,带 www. 都能开。"""
    parsed = urlparse(url)
    if parsed.netloc == FIELD_NONE or parsed.netloc.lower().startswith(HOST_WWW_PREFIX):
        return FIELD_NONE
    return parsed.scheme + URL_SCHEME_SEP + HOST_WWW_PREFIX + parsed.netloc + parsed.path


async def robots_of(base: str) -> RobotFileParser:
    """读这家官网的 robots.txt → 解析器;读不到 = 空规则(全放行)。浏览器把纯文本包成一页,取它的文字按行喂。"""
    parser = RobotFileParser()
    parsed = urlparse(base)
    lines: list = []
    html = await fetch_browser_html(parsed.scheme + URL_SCHEME_SEP + parsed.netloc + ROBOTS_PATH)
    if html is not None:
        lines = BeautifulSoup(html, PARSER_HTML).get_text().split(LINE_BREAK)
    parser.parse(lines)
    return parser


async def fetch_page(x: FetchPageIn) -> FetchedPage:
    """有头浏览器抓一页(渲染态 HTML);够长、不是拦截页就进 crawl 层(键 = 跟完跳转后的最终地址),返回最终地址与原文;否则带由头回空。"""
    html = await fetch_browser_html(x.url)
    if html is None:
        return FetchedPage(url=FIELD_NONE, html=FIELD_NONE, note=NOTE_BROWSER)
    if len(html) < HTML_MIN_LEN:
        return FetchedPage(url=FIELD_NONE, html=FIELD_NONE, note=NOTE_NO_TEXT)
    title = title_of(html)
    if BLOCK_TITLE_RE.search(title) is not None:
        return FetchedPage(url=FIELD_NONE, html=FIELD_NONE, note=NOTE_BLOCKED)
    final = await final_url_of(x.url)
    put_cached_page(CachePutIn(slug=x.slug, url=final, html=html, title=title))
    return FetchedPage(url=final, html=html, note=FIELD_NONE)


async def final_url_of(url: str) -> str:
    """当前标签跟完跳转后的最终地址(页内取 location.href);取不到照请求地址。"""
    page = await get_browser_page()
    if page is None:
        return url
    got = await page.evaluate(JS_LOCATION)
    if len(got) == 0 or str(got[0]) == FIELD_NONE:
        return url
    return str(got[0])


def title_of(html: str) -> str:
    """页标题(crawl manifest 的页行要;没有给空串)。"""
    node = BeautifulSoup(html, PARSER_HTML).find(TAG_TITLE)
    if node is None:
        return FIELD_NONE
    return WS_RE.sub(SPACE_SEP, node.get_text()).strip()


def extra_links_of(x: LinksIn) -> list:
    """首页里的 Contact 页与 About 页各认一条(同站、去锚点、不算文件 / 邮箱);Contact 在前,最多 EXTRA_PAGES_MAX 条。"""
    contact = FIELD_NONE
    about = FIELD_NONE
    host = host_of(x.base)
    for a in BeautifulSoup(x.html, PARSER_HTML).find_all(TAG_A, href=True):
        href = str(a.get(HREF_ATTR) or FIELD_NONE).strip()
        if href == FIELD_NONE or SKIP_LINK_RE.search(href) is not None:
            continue
        url = urljoin(x.base, href).split(URL_FRAGMENT_SEP)[0]
        if host_of(url) != host or url.rstrip(URL_TAIL_SLASH) == x.base.rstrip(URL_TAIL_SLASH):
            continue
        label = a.get_text(SPACE_SEP) + SPACE_SEP + href
        if contact == FIELD_NONE and CONTACT_LINK_RE.search(label) is not None:
            contact = url
        elif about == FIELD_NONE and ABOUT_LINK_RE.search(label) is not None:
            about = url
    out: list = []
    for url in (contact, about):
        if url != FIELD_NONE and url not in out and len(out) < EXTRA_PAGES_MAX:
            out.append(url)
    return out


def host_of(url: str) -> str:
    """URL 的主机名(小写、去 www.;同站判据)。"""
    host = urlparse(url).netloc.lower()
    if host.startswith(HOST_WWW_PREFIX):
        host = host[len(HOST_WWW_PREFIX):]
    return host


# =========================================================================
# 4. 整理(读缓存原文 → 提示词 → 解析 → 原句核对)
# =========================================================================


def facts_one(x: FactsOneIn) -> FactsRecord:
    """一家公司:从 crawl 层读回它的几页原文 → 拼页面文字 → 问盒子 → 逐节核对原句,过了核对的才留。

    七节一节都没过核对 = fail(nothing verified);盒子掉线 / 超时转数据记异常类名,由入口判整轮中止。
    """
    rec = FactsRecord(status=ST_FAIL, pages_at=x.pages.at, model=x.cfg.model, at=now_iso(), sources=list(x.pages.urls))
    blob = blob_of(x)
    if len(blob) < BLOB_MIN_LEN:
        rec.note = NOTE_BLOB
        return rec
    try:
        answer = call_llm(LlmCallIn(client=x.client, cfg=x.cfg, prompt=PROMPT_TPL.format(name=x.target.name, blob=blob)))
    except Exception as e:  # noqa: BLE001 — 盒子掉线 / 超时转数据,由头进 note
        rec.note = type(e).__name__
        return rec
    if answer == FIELD_NONE:
        rec.note = NOTE_EMPTY
        return rec
    flat = WS_RE.sub(SPACE_SEP, blob).lower()
    for mark in SECTIONS:
        keep_section(SectionIn(rec=rec, answer=answer, blob=flat, mark=mark))
    if len(rec.quotes) == 0:
        rec.note = NOTE_NOTHING
        return rec
    rec.hq_source = hq_source_of(HqSourceIn(slug=crawl_slug_of(x), quote=rec.quotes.get(SECTION_HQ, FIELD_NONE), urls=rec.sources))
    rec.name_ok = name_ok_of(NameOkIn(name=x.target.name, host=host_of(first_url_of(rec.sources)), blob=blob))
    rec.status = ST_OK
    return rec


def crawl_slug_of(x: FactsOneIn) -> str:
    """这家的原文住在哪家的 crawl 目录:同主机名复用别家刚抓的缓存时是那一家的 slug,否则自己的。"""
    if x.pages.cache_slug != FIELD_NONE:
        return x.pages.cache_slug
    return x.target.slug


def backfill_hq_sources(cache: dict[str, FactsRecord]) -> None:
    """存量回填:有总部原句、还没记出处页的记录,读缓存原文补上 hq_source(不过模型;2026-09-20 加这一格之前整理的那批)。"""
    for slug, rec in cache.items():
        quote = rec.quotes.get(SECTION_HQ, FIELD_NONE)
        if quote != FIELD_NONE and rec.hq_source == FIELD_NONE:
            rec.hq_source = hq_source_of(HqSourceIn(slug=slug, quote=quote, urls=rec.sources))


def backfill_name_ok(x: BackfillNameIn) -> None:
    """存量回填官网归属闸:整理成了、还没判过(name_ok 为 False)的记录,读缓存原文重判一遍(不过模型)。
    两段式:先只拿主机名判(不读盘,九成在这一步过),判不过的才读页面文字再判。
    判过确实对不上的每轮会重判一次 —— 只有几十家、纯本地读盘,不值得为它多记一格「判过没」。"""
    names: dict = {}
    for t in x.targets:
        names[t.slug] = t.name
    for slug, rec in x.cache.items():
        if rec.status != ST_OK or rec.name_ok or slug not in names:
            continue
        host = host_of(first_url_of(rec.sources))
        rec.name_ok = name_ok_of(NameOkIn(name=names[slug], host=host, blob=FIELD_NONE))
        if not rec.name_ok:
            rec.name_ok = name_ok_of(NameOkIn(name=names[slug], host=host, blob=pages_text_of(
                HqSourceIn(slug=slug, quote=FIELD_NONE, urls=rec.sources))))


def first_url_of(urls: list) -> str:
    """出处网址的第一条(首页);空表给空串。"""
    if len(urls) == 0:
        return FIELD_NONE
    return urls[0]


def pages_text_of(x: HqSourceIn) -> str:
    """几页缓存原文的整页文字接在一起(回填用;quote 一格不读)。"""
    index = load_cache_index(CRAWL_SLUG_TPL.format(slug=x.slug))
    parts: list = []
    for url in x.urls:
        path = index.get(url)
        if path is not None:
            parts.append(page_text_of(path.read_text(encoding=TEXT_ENCODING, errors=ERRORS_REPLACE)))
    return SPACE_SEP.join(parts)


def name_ok_of(x: NameOkIn) -> bool:
    """官网归属闸:这个官网是不是这家公司的。三样占一样就算:
    ① 名字里的词在主机名里(够长的词取开头几个字母找;三个字母的品牌词只认主机名以它开头);
    ② 主机名的某一段是名字各词首字母的缩写(按顺序挑得出来、首字母相同:cssdgs ← Centre de services scolaire des Grandes-Seigneuries);
    ③ 页面文字里连着出现名字里前两个算数的词。
    都不占 = 对不上(Best Buy Express ↔ bell.ca、Prevost ↔ volvo.com、Maxi ↔ loblaw.ca、加盟店 ↔ 总站):宁可空着,不拿别家的事实顶上。"""
    words = name_words_of(x.name)
    tokens: list = []
    for w in words:
        if w not in NAME_STOP and len(w) > 1:
            tokens.append(w)
    if len(tokens) == 0:
        tokens = words
    if len(tokens) == 0 or x.host == FIELD_NONE:
        return False
    flat = NAME_WORD_RE.sub(FIELD_NONE, x.host)
    for t in tokens:
        if len(t) >= NAME_TOKEN_MIN_LEN and t[:NAME_TOKEN_HEAD_LEN] in flat:
            return True
        if len(t) == NAME_SHORT_LEN and flat.startswith(t):
            return True
    initials = FIELD_NONE
    for w in words:
        initials += w[0]
    for label in x.host.split(HOST_LABEL_SEP)[:-1]:
        if is_abbrev_of(AbbrevIn(label=NAME_WORD_RE.sub(FIELD_NONE, label), initials=initials)):
            return True
    phrase = SPACE_SEP.join(tokens[:NAME_PHRASE_WORDS])
    text = SPACE_SEP + SPACE_SEP.join(name_words_of(x.blob)) + SPACE_SEP
    return SPACE_SEP + phrase + SPACE_SEP in text


def name_words_of(text: str) -> list:
    """一段文字 → 小写、去重音、按非字母数字切出来的词。"""
    plain = unicodedata.normalize(NFKD_FORM, text).encode(ASCII_CODEC, ASCII_ERRORS).decode(ASCII_CODEC).lower()
    out: list = []
    for w in NAME_WORD_RE.split(plain):
        if w != FIELD_NONE:
            out.append(w)
    return out


def is_abbrev_of(x: AbbrevIn) -> bool:
    """主机名的一段是不是名字首字母串的缩写:至少 NAME_SHORT_LEN 个字母、首字母相同、它的字母能按顺序从首字母串里挑出来。"""
    if len(x.label) < NAME_SHORT_LEN or len(x.initials) < NAME_SHORT_LEN or x.label[0] != x.initials[0]:
        return False
    at = 0
    for ch in x.label:
        at = x.initials.find(ch, at)
        if at < 0:
            return False
        at += 1
    return True


def hq_source_of(x: HqSourceIn) -> str:
    """总部原句出自哪一页:逐页读缓存原文的整页文字,原句开头在哪一页就是哪一页;都找不到记首页;没有总部原句给空串。"""
    if x.quote == FIELD_NONE or len(x.urls) == 0:
        return FIELD_NONE
    head = WS_RE.sub(SPACE_SEP, x.quote).strip().lower()[:QUOTE_CHECK_LEN]
    index = load_cache_index(CRAWL_SLUG_TPL.format(slug=x.slug))
    for url in x.urls:
        path = index.get(url)
        if path is None:
            continue
        text = page_text_of(path.read_text(encoding=TEXT_ENCODING, errors=ERRORS_REPLACE))
        if head in WS_RE.sub(SPACE_SEP, text).lower():
            return url
    return x.urls[0]


def blob_of(x: FactsOneIn) -> str:
    """几页原文 → 喂给模型的页面文字:首页取开头(主营业务)+ 末尾(页脚里的总部地址),其余页取开头;每页带网址。"""
    index = load_cache_index(CRAWL_SLUG_TPL.format(slug=crawl_slug_of(x)))
    blocks: list = []
    for url in x.pages.urls:
        path = index.get(url)
        if path is None:
            continue
        text = page_text_of(path.read_text(encoding=TEXT_ENCODING, errors=ERRORS_REPLACE))
        if len(blocks) == 0:
            if len(text) > HOME_HEAD_LEN + HOME_TAIL_LEN:
                text = text[:HOME_HEAD_LEN] + SPACE_SEP + text[-HOME_TAIL_LEN:]
        else:
            text = text[:PAGE_HEAD_LEN]
        if text != FIELD_NONE:
            blocks.append(PAGE_BLOCK_TPL.format(url=url, text=text))
    return BLOCK_SEP.join(blocks)


def page_text_of(html: str) -> str:
    """页面原文 → 纯文字(摘掉脚本 / 样式等标签,压空白)。"""
    soup = BeautifulSoup(html, PARSER_HTML)
    for node in soup(list(SKIP_TAGS)):
        node.decompose()
    return WS_RE.sub(SPACE_SEP, soup.get_text(SPACE_SEP)).strip()


def call_llm(x: LlmCallIn) -> str:
    """单轮生成:Ollama /api/generate,think 关,剥 think 块双保险;非 2xx 抛。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_GENERATE, json={
        P_MODEL: x.cfg.model, P_PROMPT: x.prompt, P_STREAM: False, P_THINK: False,
        P_OPTIONS: {P_TEMPERATURE: LLM_TEMPERATURE, P_NUM_PREDICT: GEN_TOKENS},
    })
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return FIELD_NONE
    return THINK_RE.sub(STRIP_REPL, str(body.get(P_RESPONSE) or FIELD_NONE)).strip()


def keep_section(x: SectionIn) -> None:
    """一节:取值与原句 → 原句过了核对才把值写进记录、把原句记进 quotes;没过就当官网没写。

    HQ 一节的值是三格(街址 / 市 / 省),共用一句原句;三格都空 = 这一节没有。
    """
    quote = value_of(AnswerIn(answer=x.answer, key=x.mark + QUOTE_SUFFIX))
    if not quote_ok(VerifyIn(quote=quote, blob=x.blob)):
        return
    if x.mark == SECTION_HQ:
        x.rec.hq_city = value_of(AnswerIn(answer=x.answer, key=K_HQ_CITY))
        x.rec.hq_address = hq_street_of(HqStreetIn(address=value_of(AnswerIn(answer=x.answer, key=K_HQ_ADDRESS)),
                                                   city=x.rec.hq_city))
        x.rec.hq_province = hq_province_of(value_of(AnswerIn(answer=x.answer, key=K_HQ_PROVINCE)))
        if x.rec.hq_address == FIELD_NONE and x.rec.hq_city == FIELD_NONE and x.rec.hq_province == FIELD_NONE:
            return
        x.rec.quotes[x.mark] = quote
        return
    value = value_of(AnswerIn(answer=x.answer, key=x.mark))
    if value == FIELD_NONE:
        return
    setattr(x.rec, x.mark.lower(), value)
    x.rec.quotes[x.mark] = quote


def hq_street_of(x: HqStreetIn) -> str:
    """总部街址只留到街(2026-09-20 清洗下沉到源头:visit 步交活直接上页面,等不到 mart 那一道;mart 的同名函数留着管存量记录,
    对洗过的值是空转):模型常把整行地址连市 / 省 / 邮编抄进街址格,从街址里最后一次出现市名的地方截断;找不到市名 / 没有市名原样留。"""
    address = x.address.strip()
    if x.city == FIELD_NONE:
        return address
    at = address.lower().rfind(x.city.lower())
    if at < 0:
        return address
    return address[:at].rstrip(HQ_TRIM_CHARS)


def hq_province_of(raw: str) -> str:
    """总部省:两位的一律大写当省码(模型偶尔抄成 bc);其余(Ontario / England / USA)原样留。"""
    value = raw.strip()
    if len(value) == PROV_CODE_LEN:
        return value.upper()
    return value


def value_of(x: AnswerIn) -> str:
    """回答里「KEY=值」那一行的值;没这一行、答 NONE、超长(在抄整页)都给空串。"""
    m = re.search(LINE_RE_TPL.format(key=re.escape(x.key)), x.answer, LINE_RE_FLAGS)
    if m is None:
        return FIELD_NONE
    value = WS_RE.sub(SPACE_SEP, m.group(1)).strip()
    if value.upper() == NONE_MARK or len(value) > VALUE_MAX_LEN:
        return FIELD_NONE
    return value


def quote_ok(x: VerifyIn) -> bool:
    """原句核对:够长,且它的开头一段(压空白、小写)真的在页面文字里 —— 模型凭记忆写的句子在页面里找不到,当场作废。"""
    quote = WS_RE.sub(SPACE_SEP, x.quote).strip().lower()
    if len(quote) < QUOTE_MIN_LEN:
        return False
    return quote[:QUOTE_CHECK_LEN] in x.blob


def hq_show_of(rec: FactsRecord) -> str:
    """打印用的总部一行(三格拼起来压空白;都空给空串)。"""
    return WS_RE.sub(SPACE_SEP, HQ_SHOW_TPL.format(address=rec.hq_address, city=rec.hq_city,
                                                   province=rec.hq_province)).strip()
