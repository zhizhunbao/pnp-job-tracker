"""
sites 域函数 —— 全部行为住这(照 jdformat 样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

一步一入口(零参):fetch_site_pages / build_site_facts。**零字符串令**(字面量全住 constants)/ **显式循环令**
(禁推导 / genexp / lambda)/ **内嵌禁令** / **一参令**(多入参收 scheme 的 XxxIn dataclass)。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch / crawl)。
"""
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import cast
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

import paths
from crawl.functions import load_cache_index, put_cached_page
from crawl.scheme import CachePutIn
from fetch.functions import make_client
from log.functions import say
from sites import FACTS_LIMIT, FETCH_LIMIT
from sites.constants import (
    ABOUT_LINK_RE, BLOB_MIN_LEN, BLOCK_SEP, CONTACT_LINK_RE, CRAWL_SLUG_TPL, ENV_LLM_BASE, ENV_LLM_MODEL, ERRORS_REPLACE,
    EXTRA_PAGES_MAX, FETCH_TIMEOUT_S, FIELD_NONE, FLUSH_N, GEN_TOKENS, HOME_HEAD_LEN, HOME_TAIL_LEN, HOST_WWW_PREFIX,
    HQ_SHOW_TPL, HREF_ATTR, HTML_MIN_LEN, IN_MART_COMPANIES, IN_MART_JOBS, JSON_INDENT, K_COMPANY_SLUG, K_HQ_ADDRESS,
    K_HQ_CITY, K_HQ_PROVINCE, K_NAME, K_SLUG, K_STATUS, K_WEBSITE, LINE_BREAK, LINE_RE_FLAGS, LINE_RE_TPL,
    LLM_MODEL_DEFAULT, LLM_TEMPERATURE, LLM_TIMEOUT_S, NET_ERRORS, NONE_MARK, NOTE_BLOB, NOTE_EMPTY, NOTE_HTTP_TPL,
    NOTE_NO_LLM, NOTE_NO_MART, NOTE_NO_TEXT, NOTE_NOTHING, NOTE_ROBOTS, OPEN_STATUSES, OUT_FACTS, OUT_PAGES, P_MODEL,
    P_NUM_PREDICT, P_OPTIONS, P_PROMPT, P_RESPONSE, P_STREAM, P_TEMPERATURE, P_THINK, PAGE_BLOCK_TPL, PAGE_HEAD_LEN,
    PARSER_HTML, PATH_OLLAMA_GENERATE, POLITE_S, PRINT_ABORT_TPL, PRINT_FACTS_DONE_TPL, PRINT_FACTS_ROW_TPL,
    PRINT_FACTS_TARGETS_TPL, PRINT_FETCH_DONE_TPL, PRINT_FETCH_ROW_TPL, PRINT_FETCH_TARGETS_TPL, PROMPT_TPL,
    QUOTE_CHECK_LEN, QUOTE_MIN_LEN, QUOTE_SUFFIX, REFRESH_DAYS, RETRY_FAILED_DAYS, ROBOTS_PATH, ROBOTS_UA, SECONDS_PER_DAY,
    SECTION_HQ, SECTIONS, SKIP_LINK_RE, SKIP_TAGS, SPACE_SEP, ST_FAIL, ST_OK, STRIP_REPL, TAG_A, TAG_TITLE, TEXT_ENCODING, THINK_RE,
    URL_FRAGMENT_SEP, URL_SCHEME_SEP, URL_TAIL_SLASH, VALUE_MAX_LEN, WS_RE,
)
from sites.scheme import (
    AnswerIn, FactsOneIn, FactsRecord, FetchedPage, FetchPageIn, FetchSiteIn, HttpClientLike, LinksIn, LlmCallIn,
    LlmCfg, PagesRecord, PickFactsIn, PickFetchIn, RobotsIn, SectionIn, Target, VerifyIn,
)

# =========================================================================
# 1. 入口:fetch(官网原文进 crawl 层)· facts(读缓存原文 → 盒子整理七节)
# =========================================================================


def fetch_site_pages() -> None:
    """fetch 步入口:范围内还没抓 / 到刷新期的公司,每家抓首页 + Contact + About,原文进 crawl 层,记录落 OUT_PAGES。

    mart 还没产出直接退;单家失败只记 status 不炸整轮;每 FLUSH_N 家落一次盘(中途被杀不丢)。
    """
    targets = site_targets()
    if len(targets) == 0:
        say(NOTE_NO_MART)
        return
    cache = read_pages()
    todo = pick_fetch_todo(PickFetchIn(targets=targets, cache=cache, limit=int(FETCH_LIMIT)))
    say(PRINT_FETCH_TARGETS_TPL.format(total=len(targets), done=count_pages_ok(cache), todo=len(todo),
                                       limit=FETCH_LIMIT))
    ok = 0
    fail = 0
    with make_client(timeout=FETCH_TIMEOUT_S) as client:
        for t in todo:
            rec = fetch_site(FetchSiteIn(client=cast(HttpClientLike, client), target=t))
            cache[t.slug] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_FETCH_ROW_TPL.format(status=rec.status, name=t.name, pages=len(rec.urls), note=rec.note))
            if (ok + fail) % FLUSH_N == 0:
                write_pages(cache)
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
    """抓取记录落盘 OUT_PAGES(原子写;首轮先建目录),返回累计 ok 家数。"""
    OUT_PAGES.parent.mkdir(parents=True, exist_ok=True)
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
    """整理记录落盘 OUT_FACTS(原子写;首轮先建目录),返回累计 ok 家数。"""
    OUT_FACTS.parent.mkdir(parents=True, exist_ok=True)
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


# =========================================================================
# 2. 挑队列(范围:有官网 且 有在招岗;在招岗多的在前)
# =========================================================================


def site_targets() -> list:
    """mart 的公司表 + 岗位表 → 范围内的公司,按在招岗数多→少排(同数按 slug,顺序稳定);缺文件 = 空表。"""
    out: list = []
    if not IN_MART_COMPANIES.exists() or not IN_MART_JOBS.exists():
        return out
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
        out.append(Target(slug=slug, name=str(c.get(K_NAME) or slug), website=site, open_jobs=open_jobs[slug]))
    out.sort(key=target_order_of)
    return out


def target_order_of(t: Target) -> tuple:
    """排队键:在招岗多的在前,同数按 slug。"""
    return (-t.open_jobs, t.slug)


def pick_fetch_todo(x: PickFetchIn) -> list:
    """还没抓过的、抓成但过了刷新期的、抓失败且过了冷却期的,按范围序凑够 limit 即止。"""
    todo: list = []
    for t in x.targets:
        if len(todo) >= x.limit:
            break
        rec = x.cache.get(t.slug)
        if rec is not None:
            if rec.status == ST_OK and days_since(rec.at) <= REFRESH_DAYS:
                continue
            if rec.status != ST_OK and days_since(rec.at) <= RETRY_FAILED_DAYS:
                continue
        todo.append(t)
    return todo


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


def fetch_site(x: FetchSiteIn) -> PagesRecord:
    """一家官网:先读 robots,再抓首页,从首页链接里认 Contact / About 各一页;抓到的原文逐页进 crawl 层。

    首页抓不到 = 这家记 fail(由头进 note);附加页抓不到不算失败。网络异常转数据记异常类名。
    """
    rec = PagesRecord(status=ST_FAIL, at=now_iso())
    slug = CRAWL_SLUG_TPL.format(slug=x.target.slug)
    try:
        robots = robots_of(RobotsIn(client=x.client, base=x.target.website))
        if not robots.can_fetch(ROBOTS_UA, x.target.website):
            rec.note = NOTE_ROBOTS
            return rec
        home = fetch_page(FetchPageIn(client=x.client, slug=slug, url=x.target.website))
        if home.html == FIELD_NONE:
            rec.note = home.note
            return rec
        rec.urls.append(home.url)
        for link in extra_links_of(LinksIn(html=home.html, base=home.url)):
            if not robots.can_fetch(ROBOTS_UA, link):
                continue
            time.sleep(POLITE_S)
            page = fetch_page(FetchPageIn(client=x.client, slug=slug, url=link))
            if page.html != FIELD_NONE and page.url not in rec.urls:
                rec.urls.append(page.url)
    except Exception as e:  # noqa: BLE001 — 一家站的网络 / 解析异常转数据,不炸整轮
        rec.note = type(e).__name__
        if len(rec.urls) == 0:
            return rec
    rec.status = ST_OK
    return rec


def robots_of(x: RobotsIn) -> RobotFileParser:
    """读这家官网的 robots.txt → 解析器;读不到 / 非 2xx = 空规则(全放行)。"""
    parser = RobotFileParser()
    parsed = urlparse(x.base)
    lines: list = []
    try:
        r = x.client.get(parsed.scheme + URL_SCHEME_SEP + parsed.netloc + ROBOTS_PATH)
        if r.is_success:
            lines = r.text.split(LINE_BREAK)
    except Exception:  # noqa: BLE001, S110 — robots 读不到按全放行,不拖垮这家
        lines = []
    parser.parse(lines)
    return parser


def fetch_page(x: FetchPageIn) -> FetchedPage:
    """抓一页;2xx 且够长就进 crawl 层(键 = 跟完跳转后的最终地址),返回最终地址与原文;否则带由头回空。"""
    r = x.client.get(x.url)
    if not r.is_success:
        return FetchedPage(url=FIELD_NONE, html=FIELD_NONE, note=NOTE_HTTP_TPL.format(status=r.status_code))
    html = r.text
    if len(html) < HTML_MIN_LEN:
        return FetchedPage(url=FIELD_NONE, html=FIELD_NONE, note=NOTE_NO_TEXT)
    final = str(r.url)
    put_cached_page(CachePutIn(slug=x.slug, url=final, html=html, title=title_of(html)))
    return FetchedPage(url=final, html=html, note=FIELD_NONE)


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
    rec.status = ST_OK
    return rec


def blob_of(x: FactsOneIn) -> str:
    """几页原文 → 喂给模型的页面文字:首页取开头(主营业务)+ 末尾(页脚里的总部地址),其余页取开头;每页带网址。"""
    index = load_cache_index(CRAWL_SLUG_TPL.format(slug=x.target.slug))
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
        x.rec.hq_address = value_of(AnswerIn(answer=x.answer, key=K_HQ_ADDRESS))
        x.rec.hq_city = value_of(AnswerIn(answer=x.answer, key=K_HQ_CITY))
        x.rec.hq_province = value_of(AnswerIn(answer=x.answer, key=K_HQ_PROVINCE))
        if x.rec.hq_address == FIELD_NONE and x.rec.hq_city == FIELD_NONE and x.rec.hq_province == FIELD_NONE:
            return
        x.rec.quotes[x.mark] = quote
        return
    value = value_of(AnswerIn(answer=x.answer, key=x.mark))
    if value == FIELD_NONE:
        return
    setattr(x.rec, x.mark.lower(), value)
    x.rec.quotes[x.mark] = quote


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
