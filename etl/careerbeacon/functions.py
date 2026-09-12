"""
careerbeacon 域函数 —— 五段与 constants.py / scheme.py 同名同序镜像:省列表页枚举 → 详情原文抓取
→ 详情解析 → postings 仓。顶层只有 function;常量归 constants,形状归 scheme。

数据链(2026-09-02 铁律):列表页与详情页原文经 crawl 批量写门进 data/crawl/board-careerbeacon/,
抽出的事实进 data/raw/careerbeacon/jobs.json,归一后的行进 data/processed/careerbeacon/postings.json;
跨源清洗(地点归一 / 薪资归一 / 试点打标)仍归 mart 域,本域只做「值级」清洗(to_* 行构造器)。

@author Frank
@time 2026-09-11
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict
from datetime import date, datetime, timezone
from pathlib import Path
from html import unescape
from typing import cast

import paths
from paths import JOBBANK_STORE_LOCK, jobbank_store_lock
from fetch.functions import make_client
from log.functions import err, say
from crawl.functions import load_cache_index, put_cached_pages
from crawl.scheme import CachePage, CachePutManyIn
from careerbeacon import DETAILS_PER_RUN
from careerbeacon.constants import (
    ADDRESS_SEP, CLIENT_TIMEOUT_S, COMMA, DETAIL_SLEEP_S, DETAIL_TICK, ENC_UTF8, ERRORS_REPLACE,
    FLUSH_EVERY, HOURS_OF_TYPE, IN_JOBS, IN_URLS, JOB_LINK_RE, JSON_INDENT, K_ADDRESS, K_CITY, K_DATE,
    K_DESCRIPTION, K_DIRECT, K_EMPLOYER, K_EMPLOYER_URL, K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM,
    K_INDUSTRY, K_LANG, K_LAST_SEEN, K_NOC, K_POSTING_ID, K_PROVINCE, K_SALARY, K_SOURCE, K_TITLE,
    K_TITLE_ORIG, K_URL, K_VALID_THROUGH, LANG_EN, LD_ADDRESS, LD_BASE_SALARY, LD_COUNTRY,
    LD_DATE_POSTED, LD_DESCRIPTION, LD_EMPLOYMENT_TYPE, LD_HIRING_ORG, LD_INDUSTRY, LD_JOB_LOCATION,
    LD_JOB_POSTING, LD_LOCALITY, LD_MAX, LD_MIN, LD_NAME, LD_POSTAL, LD_REGION, LD_SCRIPT_RE,
    LD_STREET, LD_TITLE, LD_TYPE, LD_UNIT, LD_URL, LD_VALID_THROUGH, LD_VALUE, LIST_SLEEP_S,
    LIST_URL_TPL, MONEY_FMT, OUT_JOBS, OUT_POSTINGS, OUT_URLS, PAGE_NUM_RE, PAGE_ONE, PERCENT,
    PRINT_DETAIL_DONE_TPL, PRINT_DETAIL_HEAD_TPL, PRINT_DETAIL_TICK_TPL, PRINT_PARSE_DONE_TPL,
    PRINT_PROV_TPL, PRINT_STORE_DONE_TPL, PRINT_URLS_DONE_TPL, PROV_OF_SLUG, RATE_FLOOR_S,
    SALARY_RANGE_TPL, SALARY_TPL, SALARY_UNIT_WORD, SECONDS_FMT, SITE_BASE, SLUG_CRAWL, SOURCE_LABEL,
    SPACE, TAG_RE, TERM_OF_TYPE, UTC_Z, WS_RE,
)
from careerbeacon.scheme import (
    DetailBatchIn, DetailBatchOut, HttpClientLike, JobFact, LdPostingIn, ParseTally, PostingRowIn,
    ProvinceIn, ProvinceOut, SalaryTextIn, StoreTally,
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
# 2. 省列表页枚举(四省 jobs-in-<slug> 分页 → 帖号 → URL)
# =========================================================================


def scrape_careerbeacon_pages() -> None:
    """本域步骤入口:四省列表页逐页翻(页数从页内现取)→ 帖号 → URL 表。"""
    urls: dict = {}
    with make_client(CLIENT_TIMEOUT_S) as raw_client:
        client = cast(HttpClientLike, raw_client)
        for slug in PROV_OF_SLUG:
            got = collect_province_urls(ProvinceIn(client=client, slug=slug))
            say(PRINT_PROV_TPL.format(slug=slug, pages=got.pages, n=len(got.urls)))
            urls.update(got.urls)
    OUT_URLS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_URLS, payload=urls, indent=JSON_INDENT))
    say(PRINT_URLS_DONE_TPL.format(ids=len(urls), out=OUT_URLS))


def collect_province_urls(x: ProvinceIn) -> ProvinceOut:
    """一个省的列表页逐页取回(原文攒批进 crawl 层,首页取到总页数)→ 帖号 → URL;
    单页失败留痕跳过;中途异常也把攒下的先落盘。"""
    pages: list = []
    urls: dict = {}
    done = 0
    last = PAGE_ONE
    page = PAGE_ONE
    try:
        while page <= last:
            url = LIST_URL_TPL.format(slug=x.slug, n=page)
            try:
                resp = x.client.get(url)
                resp.raise_for_status()
            except Exception as e:  # noqa: BLE001 — 单页取不到就留痕跳过,下轮再来
                err(url, e)
                page += 1
                time.sleep(LIST_SLEEP_S)
                continue
            pages.append(CachePage(url=url, html=resp.text, title=""))
            done += 1
            urls.update(urls_of_page(resp.text))
            if page == PAGE_ONE:
                last = last_page_of(resp.text)
            page += 1
            time.sleep(LIST_SLEEP_S)
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return ProvinceOut(urls=urls, pages=done)


def urls_of_page(html: str) -> dict:
    """一张列表页里的岗链 → 帖号 → 绝对详情 URL(utm 查询串在正则里就切掉;同帖多链自然去重)。"""
    out: dict = {}
    for path, pid in JOB_LINK_RE.findall(html):
        out[pid] = SITE_BASE + path
    return out


def last_page_of(html: str) -> int:
    """首页分页链接里的最大页号 = 该省总页数;页上没有分页链接就只有这一页。"""
    last = PAGE_ONE
    for n in PAGE_NUM_RE.findall(html):
        if int(n) > last:
            last = int(n)
    return last


# =========================================================================
# 3. 详情原文抓取(未缓存的帖号 → crawl 层,每轮封顶)
# =========================================================================


def scrape_careerbeacon_details() -> None:
    """本域步骤入口:枚举表里还没缓存的帖 → 详情原文进 crawl 层(每轮封顶 DETAILS_PER_RUN)。"""
    urls = load_json_dict(IN_URLS)
    have = load_cache_index(SLUG_CRAWL)
    cap = int(DETAILS_PER_RUN)
    todo: list = []
    for url in urls.values():
        if url not in have and len(todo) < cap:
            todo.append(url)
    say(PRINT_DETAIL_HEAD_TPL.format(todo=len(todo), total=len(urls), cap=cap, have=len(have)))
    if len(todo) == 0:
        return
    with make_client(CLIENT_TIMEOUT_S) as raw_client:
        out = fetch_details(DetailBatchIn(client=cast(HttpClientLike, raw_client), urls=todo))
    say(PRINT_DETAIL_DONE_TPL.format(done=out.done, slug=SLUG_CRAWL, failed=out.failed))


def fetch_details(x: DetailBatchIn) -> DetailBatchOut:
    """逐页取详情,攒够 FLUSH_EVERY 页批量落 crawl 层;单页失败留痕跳过;中途异常也把攒下的先落盘。"""
    pages: list = []
    done = 0
    failed = 0
    started = time.monotonic()
    try:
        for url in x.urls:
            try:
                resp = x.client.get(url)
                resp.raise_for_status()
            except Exception as e:  # noqa: BLE001 — 单页取不到就跳过,下轮再抓
                err(url, e)
                failed += 1
                time.sleep(DETAIL_SLEEP_S)
                continue
            pages.append(CachePage(url=url, html=resp.text, title=""))
            done += 1
            if done % DETAIL_TICK == 0:
                rate = done / max(time.monotonic() - started, RATE_FLOOR_S)
                say(PRINT_DETAIL_TICK_TPL.format(done=done, todo=len(x.urls),
                                                 pct=done * PERCENT // len(x.urls), rate=rate, url=url))
            if len(pages) >= FLUSH_EVERY:
                put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
                pages = []
            time.sleep(DETAIL_SLEEP_S)
    finally:
        put_cached_pages(CachePutManyIn(slug=SLUG_CRAWL, pages=pages))
    return DetailBatchOut(done=done, failed=failed)


# =========================================================================
# 4. 详情解析(缓存原文 → ld+json JobPosting → raw jobs.json)
# =========================================================================


def parse_careerbeacon_details() -> None:
    """本域步骤入口:缓存里有原文、事实表里还没有的帖 → 抽 JobPosting → 增量写 raw jobs.json。"""
    urls = load_json_dict(IN_URLS)
    have = load_cache_index(SLUG_CRAWL)
    facts = load_json_dict(IN_JOBS)
    tally = ParseTally(parsed=0, skipped=0, missing=0)
    for pid, url in urls.items():
        if pid in facts:
            tally.skipped += 1
            continue
        path = have.get(url)
        if path is None:
            continue
        data = job_posting_of(path.read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE))
        if data is None:
            tally.missing += 1
            continue
        fact = to_job_fact(LdPostingIn(posting_id=pid, url=url, data=data))
        facts[pid] = asdict(fact)
        tally.parsed += 1
    OUT_JOBS.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_JOBS, payload=facts, indent=JSON_INDENT))
    say(PRINT_PARSE_DONE_TPL.format(parsed=tally.parsed, skipped=tally.skipped, missing=tally.missing,
                                    out=OUT_JOBS))


def job_posting_of(html: str) -> dict | None:
    """页里的 ld+json 块中取 JobPosting 那块(实测同页另有 ItemList/WebPage/BreadcrumbList);没有给 None。"""
    for block in LD_SCRIPT_RE.findall(html):
        try:
            data = json.loads(block.strip())
        except ValueError:
            continue
        if isinstance(data, dict) and data.get(LD_TYPE) == LD_JOB_POSTING:
            return data
    return None


def to_job_fact(x: LdPostingIn) -> JobFact:
    """JobPosting 字典 → JobFact(值级清洗全在这:嵌套块判形、缺格给空串、描述剥标签)。"""
    org = dict_of(x.data.get(LD_HIRING_ORG))
    addr = dict_of(dict_of(x.data.get(LD_JOB_LOCATION)).get(LD_ADDRESS))
    val = dict_of(dict_of(x.data.get(LD_BASE_SALARY)).get(LD_VALUE))
    return JobFact(
        posting_id=x.posting_id, url=x.url,
        title=text_of(x.data.get(LD_TITLE)),
        employer=text_of(org.get(LD_NAME)), employer_url=text_of(org.get(LD_URL)),
        city=text_of(addr.get(LD_LOCALITY)), province=text_of(addr.get(LD_REGION)),
        postal=text_of(addr.get(LD_POSTAL)), street=text_of(addr.get(LD_STREET)),
        country=text_of(addr.get(LD_COUNTRY)),
        date_posted=text_of(x.data.get(LD_DATE_POSTED)),
        valid_through=text_of(x.data.get(LD_VALID_THROUGH)),
        salary_lo=salary_lo_of(val), salary_hi=text_of(val.get(LD_MAX)),
        salary_unit=text_of(val.get(LD_UNIT)),
        employment_types=types_of(x.data.get(LD_EMPLOYMENT_TYPE)),
        industry=text_of(x.data.get(LD_INDUSTRY)),
        description=plain_text_of(text_of(x.data.get(LD_DESCRIPTION))),
    )


def dict_of(value: object) -> dict:
    """嵌套块取字典:本来就是字典照给;清单取第一个字典(schema.org 允许多地点);其余给空字典。"""
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                return item
    return {}


def text_of(value: object) -> str:
    """一格取文本:None 给空串,其余转字符串后折空白。"""
    if value is None:
        return ""
    return WS_RE.sub(SPACE, str(value)).strip()


def salary_lo_of(val: dict) -> str:
    """薪资低值:区间 minValue 优先,退回单值 value。"""
    lo = text_of(val.get(LD_MIN))
    if lo != "":
        return lo
    return text_of(val.get(LD_VALUE))


def types_of(value: object) -> list:
    """employmentType 字符串或清单 → 字符串清单(原样大写词)。"""
    if isinstance(value, str):
        return [value]
    out: list = []
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                out.append(item)
    return out


def plain_text_of(html: str) -> str:
    """描述 HTML 串 → 纯文本(剥标签、解实体、折空白)。"""
    return WS_RE.sub(SPACE, unescape(TAG_RE.sub(SPACE, html))).strip()


# =========================================================================
# 5. postings 仓(raw 事实 → Job Bank 仓同形的行;当前态)
# =========================================================================


def build_careerbeacon_postings() -> None:
    """本域步骤入口:事实表 × 枚举表 → 当前态 postings 仓(不在本轮枚举 / 过截止日 / 无标题的剔)。

    落盘持 Job Bank 仓锁(与 jobbank 域解析段同一把):mart 的三段跨源清洗原地写回这份仓,
    load 域 build 链整链持锁 —— 不持锁的整文件重写会落在「清洗完 → 汇装」之间,让 mart 看到
    未清洗的行(2026-08-05 薪资实撞同款病)。"""
    urls = load_json_dict(IN_URLS)
    facts = load_json_dict(IN_JOBS)
    seen_at = datetime.now(timezone.utc).strftime(SECONDS_FMT) + UTC_Z
    today = date.today().isoformat()
    tally = StoreTally(rows=0, gone=0, expired=0, blank=0)
    rows: list = []
    for pid, raw in facts.items():
        if pid not in urls:
            tally.gone += 1
            continue
        fact = to_fact_of_row(raw)
        if fact.title == "":
            tally.blank += 1
            continue
        if fact.valid_through != "" and fact.valid_through < today:
            tally.expired += 1
            continue
        rows.append(to_posting_row(PostingRowIn(fact=fact, seen_at=seen_at)))
    rows.sort(key=date_key_of, reverse=True)
    tally.rows = len(rows)
    OUT_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        paths.write_json(paths.WriteJsonIn(path=OUT_POSTINGS, payload=rows, indent=JSON_INDENT))
    say(PRINT_STORE_DONE_TPL.format(rows=tally.rows, gone=tally.gone, expired=tally.expired,
                                    blank=tally.blank, out=OUT_POSTINGS))


def to_fact_of_row(row: dict) -> JobFact:
    """raw jobs.json 的一行 → JobFact(asdict 的逆;键即字段名,dataclass 自校缺格)。"""
    return JobFact(**row)


def date_key_of(row: dict) -> str:
    """排序键:发布日 ISO 串(缺的排最后)。"""
    return row.get(K_DATE) or ""


def to_posting_row(x: PostingRowIn) -> dict:
    """事实 → Job Bank 仓同形的行(键序即落盘列序,与 jobillico 仓逐键同形;mart 的
    to_jb_job_fields 按这些键取)。本板全英文:lang 恒 en,title_orig 恒空串。"""
    f = x.fact
    return {
        K_POSTING_ID: f.posting_id, K_TITLE: f.title, K_TITLE_ORIG: "", K_EMPLOYER: f.employer,
        K_CITY: f.city, K_PROVINCE: f.province,
        K_SALARY: salary_text_of(SalaryTextIn(lo=f.salary_lo, hi=f.salary_hi, unit=f.salary_unit)),
        K_DATE: f.date_posted, K_SOURCE: SOURCE_LABEL, K_DIRECT: False, K_URL: f.url,
        K_ADDRESS: address_of(f), K_NOC: "", K_LAST_SEEN: x.seen_at,
        K_EMPLOYMENT_TERM: term_of(f.employment_types), K_EMPLOYMENT_HOURS: hours_of(f.employment_types),
        K_DESCRIPTION: f.description, K_VALID_THROUGH: f.valid_through, K_LANG: LANG_EN,
        K_INDUSTRY: f.industry, K_EMPLOYER_URL: f.employer_url,
    }


def salary_text_of(x: SalaryTextIn) -> str:
    """薪资三格 → Job Bank 写法;缺低值、零值或单位认不出给空串(宁空不猜)。"""
    unit = SALARY_UNIT_WORD.get(x.unit.upper())
    lo = money_of(x.lo)
    if lo == "" or unit is None:
        return ""
    hi = money_of(x.hi)
    if hi == "" or hi == lo:
        return SALARY_TPL.format(lo=lo, unit=unit)
    return SALARY_RANGE_TPL.format(lo=lo, hi=hi, unit=unit)


def money_of(text: str) -> str:
    """数值串 → 两位小数串;非数字或非正数给空串。"""
    try:
        amount = float(text.replace(COMMA, ""))
    except ValueError:
        return ""
    if amount <= 0:
        return ""
    return MONEY_FMT.format(amount)


def address_of(f: JobFact) -> str:
    """街道、城市、省、邮编的非空段用「, 」连成地址文本。"""
    parts: list = []
    for part in (f.street, f.city, f.province, f.postal):
        if part != "":
            parts.append(part)
    return ADDRESS_SEP.join(parts)


def term_of(types: list) -> str:
    """雇佣形态清单里第一个能译成 Job Bank 期限词的;没有给空串。"""
    for t in types:
        word = TERM_OF_TYPE.get(t)
        if word is not None:
            return word
    return ""


def hours_of(types: list) -> str:
    """雇佣形态清单里第一个能译成 Job Bank 工时词的;没有给空串。"""
    for t in types:
        word = HOURS_OF_TYPE.get(t)
        if word is not None:
            return word
    return ""
