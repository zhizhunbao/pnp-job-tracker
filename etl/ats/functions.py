"""
ats 域函数 —— 全部行为住这(照 company/ircc 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

两个步骤文件 2026-08-31 批I 溶入本文件,一步一段(段横幅三行框 + N. 编号,与
constants.py / scheme.py 同名同序镜像),各段入口函数与原脚本同名、一律零参,门直调。
**零字符串令**:字面量全住 constants(各家 ATS 载荷的键 K_ 词族、URL 模板 *_URL_TPL、
文案 *_TPL);**显式循环令**:禁推导/genexp/lambda;**一参令**:函数至多一参,
多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut;**内嵌禁令**:无内部函数。
形状:六家 ATS 的载荷经 to_* 行构造器归一成 AtsJob,字段键只活在 to_* 与 to_job_row 里
(方言律⑩);httpx 客户端经 scheme 的 Protocol,cast 只住装配点。
日志口径:域内不裸 print,报数走 log.functions.say;原来静默 `pass` 的三处 catch
(token 页取不到 / bamboo 详情 / smart 详情)一律补 err() 留痕(永不吞异常令)——
抓不到照旧不中断,只是不再无声无息。
⚠ 2026-08-31 批I 随溶解退役两件(简化优先于收编,方言律⑨):
① 原 `--region` argparse —— 它 parse 完就扔,地域早已由 paths.COMPANIES 决定,零行为;
② 原 summary/skipped 两个明细清单 —— 只被 len()/sum() 消费(排序结果都没人看),
   收成 ScrapeTally 三个计数,收尾那行输出逐字不变。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch)。
"""
import json
from datetime import datetime, timezone
from typing import cast

from fetch.constants import WS_RE
from fetch.functions import make_client
from log.functions import err, say
from ats.constants import (
    ACCEPT_JSON, ADDR_RE, ADDR_STRIP_CHARS, ANCHORED_RE, ATS_BAMBOOHR, ATS_GREENHOUSE, ATS_LEVER,
    ATS_RECRUITEE, ATS_SMARTRECRUITERS, ATS_WORKABLE, BAD_AMOUNTS, BAMBOO_DETAIL_URL_TPL,
    BAMBOO_JOB_URL_TPL, BAMBOO_LIST_URL_TPL, BLANK_LINES_RE, CLIENT_TIMEOUT_S, DASH, DIR_JOBS,
    DOT_SEP, ENC_UTF8, ERR_ATS_TPL, ERR_WORKDAY_TPL, FILE_CAREERS_JSON, FILE_JOBS_JSON,
    GREENHOUSE_JOBS_URL_TPL, HDR_ACCEPT, IN_COMPANIES, JOB_ID_FALLBACK, JOB_ID_MAX_LEN, JOB_ID_RE,
    JSON_INDENT, K_ABSOLUTE_URL, K_ADDITIONAL_PLAIN, K_ADDRESS, K_APPLICATION_URL,
    K_APPLIED_FACETS, K_ATS, K_CAREERS_URL, K_CATEGORIES, K_CITY, K_COMPENSATION, K_CONTENT,
    K_COUNT, K_CREATED_AT, K_CREATED_AT_SNAKE, K_CURRENCY, K_DATE_POSTED, K_DEFAULT_JOB_AD,
    K_DEPARTMENT, K_DEPARTMENT_LABEL, K_DESCRIPTION, K_DESCRIPTION_PLAIN, K_EXTERNAL_PATH,
    K_EXTERNAL_URL, K_HOSTED_URL, K_ID, K_INTERVAL, K_JOB_AD, K_JOB_DESCRIPTION, K_JOB_OPENING,
    K_JOB_OPENING_NAME, K_JOB_POSTING_INFO, K_JOB_POSTINGS, K_JOBS, K_LABEL, K_LIMIT, K_LOCATION,
    K_LOCATION_STR, K_LOCATIONS_TEXT, K_MAX, K_MIN, K_NAME, K_OFFERS, K_OFFSET, K_POSTED,
    K_PUBLISHED_AT,
    K_PUBLISHED_ON, K_REGION, K_RELEASED_DATE, K_RESULT, K_SALARY, K_SALARY_RANGE, K_SEARCH_TEXT,
    K_SECTIONS, K_START_DATE, K_STATE, K_TEAM, K_TECH, K_TEXT, K_TITLE, K_TOKEN, K_TOTAL,
    K_UPDATED_AT, K_URL, LEVER_INTERVAL_UNIT, LEVER_JOBS_URL_TPL, LIST_JOIN_SEP, MD_GLOB,
    MD_HEAD_LEN, MD_TPL, MONEY_DEC_TPL,
    MONEY_INT_TPL, MONEY_RANGE_TPL, MS_PER_S, NBSP_ENTITY, NONALNUM_RE, OTTAWA_LOC_RE,
    OUT_COMPANIES, PARA_SEP, PRINT_SALARY_DONE_TPL, PRINT_SALARY_INOUT_TPL, PRINT_SCRAPE_DONE_TPL,
    PRINT_SCRAPE_INOUT_TPL, RECRUITEE_OFFERS_URL_TPL, SALARY_STRIP_CHARS, SMART_DETAIL_URL_TPL,
    SMART_JOB_URL_TPL, SMART_LIST_URL_TPL, SMART_SECTIONS, SPACE_SEP, SUFFIX_MD, SUPPORTED,
    TAG_RE, TECH_JOB_RE, TOKEN_RE, URL_LINE_RE, WD_BASE_URL_TPL, WD_DETAIL_URL_TPL, WD_HOST_RE,
    WD_JOBS_URL_TPL, WD_MAX_SITES, WD_OFFSET_START, WD_PAGE_SIZE, WD_SKIP_SITES, WITH_UNIT_RE,
    WORKABLE_ACCOUNT_URL_TPL, WORKDAY, ISO_DATE_LEN,
)
from ats.scheme import (
    AtsFetchIn, AtsFetchOut, AtsJob, BambooDetail, BambooJobIn, CompanyIn, CompanyOut, DetailIn,
    FillIn, HttpClientLike, HttpResponseLike, SalaryTally, ScrapeTally, SmartJobIn, TokenIn,
    WorkdayDetailIn, WorkdayFetchIn, WorkdayFindIn, WorkdayJobIn, WorkdayPageIn, WorkdaySiteIn,
    WorkdayTarget, WriteJobsIn,
)


# =========================================================================
# 1. 共享词汇(两段共用的载荷解包与文本清洗)
# =========================================================================


def json_obj(r: HttpResponseLike) -> dict:
    """响应载荷当对象读(cast 装配点:各家 ATS 的 JSON 真身检查器判不动)。"""
    return cast(dict, r.json())


def json_rows(r: HttpResponseLike) -> list:
    """响应载荷当清单读(Lever 的 postings 直接就是数组;cast 装配点同上)。"""
    return cast(list, r.json())


def address_of(text: str) -> str:
    """从描述里抽街道地址(先剥标签压空白,再按门牌号+街名后缀找);抽不到给空串。"""
    if text == "":
        return ""
    flat = WS_RE.sub(SPACE_SEP, TAG_RE.sub(SPACE_SEP, text))
    m = ADDR_RE.search(flat)
    if m is None:
        return ""
    return m.group(0).strip(ADDR_STRIP_CHARS)


def plain_text_of(html: str) -> str:
    """描述 HTML → 纯文本(剥标签、三连换行折两个);.md 正文用。"""
    return BLANK_LINES_RE.sub(PARA_SEP, TAG_RE.sub(SPACE_SEP, html)).strip()


def join_parts(parts: list) -> str:
    """城市/省这类并列格拼一行,空格子跳过(原三处 `", ".join(v for v in [...] if v)`)。"""
    kept = []
    for part in parts:
        if part:
            kept.append(part)
    return LIST_JOIN_SEP.join(kept)


def iso_of(value: object) -> str:
    """各家给的时间 → YYYY-MM-DD:毫秒 epoch(lever)转 UTC 日期,其余截前 10 位;空给空串。"""
    if not value:
        return ""
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / MS_PER_S, tz=timezone.utc).date().isoformat()
        except Exception as e:  # noqa: BLE001 — 毫秒数越界/类型怪 = 这格不要了,不该断整轮
            err(value, e)
            return ""
    return str(value)[:ISO_DATE_LEN]


# =========================================================================
# 2. ATS 抓岗(逐司读 careers.json → 各家公开 JSON → 写回 jobs.json + jobs/*.md)
# =========================================================================


def scrape_ats_jobs() -> None:
    """本域步骤入口:逐司抓第一方 ATS 挂岗,就地写回一司一档。"""
    say(PRINT_SCRAPE_INOUT_TPL.format(path=OUT_COMPANIES))
    companies = 0
    tech = 0
    skipped = 0
    with make_client(CLIENT_TIMEOUT_S) as raw_client:
        client = cast(HttpClientLike, raw_client)
        for folder in company_folders():
            out = scrape_company(CompanyIn(client=client, folder=folder))
            if out.scraped:
                companies += 1
                tech += out.tech
            if out.skipped:
                skipped += 1
    tally = ScrapeTally(companies=companies, tech=tech, skipped=skipped)
    say(PRINT_SCRAPE_DONE_TPL.format(companies=tally.companies, tech=tally.tech,
                                     skipped=tally.skipped))


def company_folders() -> list:
    """一司一档根下的公司目录(字典序,与原 sorted(...) 逐字同)。"""
    out = []
    for entry in IN_COMPANIES.iterdir():
        if entry.is_dir():
            out.append(entry)
    return sorted(out)


def scrape_company(x: CompanyIn) -> CompanyOut:
    """一家公司一轮:认 ATS → 取岗 → 打科技标 → 落盘;三种下场见 CompanyOut。"""
    careers_file = x.folder / FILE_CAREERS_JSON
    if not careers_file.exists():
        return CompanyOut(scraped=False, skipped=False, tech=0)
    careers = json.loads(careers_file.read_text(encoding=ENC_UTF8))
    ats = careers.get(K_ATS, "")
    careers_url = careers.get(K_CAREERS_URL, "")
    token = ""
    if ats in WORKDAY:
        targets = workday_targets(WorkdayFindIn(client=x.client, careers_url=careers_url))
        jobs = fetch_workday(WorkdayFetchIn(client=x.client, targets=targets))
        if len(jobs) == 0:
            return CompanyOut(scraped=False, skipped=True, tech=0)
    elif ats not in SUPPORTED:
        return CompanyOut(scraped=False, skipped=ats != "", tech=0)
    else:
        token = ats_token(TokenIn(client=x.client, careers_url=careers_url, ats=ats))
        if token == "":
            return CompanyOut(scraped=False, skipped=True, tech=0)
        fetched = fetch_ats_jobs(AtsFetchIn(client=x.client, ats=ats, token=token))
        if fetched.failed:
            return CompanyOut(scraped=False, skipped=True, tech=0)
        jobs = fetched.jobs
    tech = 0
    for job in jobs:
        job.tech = TECH_JOB_RE.search(job.title) is not None
        if job.tech:
            tech += 1
    write_company_jobs(WriteJobsIn(folder=x.folder, ats=ats, token=token, jobs=jobs))
    return CompanyOut(scraped=True, skipped=False, tech=tech)


def ats_token(x: TokenIn) -> str:
    """从 careers 页 HTML 里认这家的 board token;页取不到或认不出给空串。"""
    html = ""
    try:
        html = x.client.get(x.careers_url).text
    except Exception as e:  # noqa: BLE001 — careers 页取不到=这家没 token,原脚本静默 pass,批I 补留痕
        err(x.careers_url, e)
    m = TOKEN_RE[x.ats].search(html)
    if m is None:
        return ""
    for group in m.groups():
        if group:
            return group
    return ""


def fetch_ats_jobs(x: AtsFetchIn) -> AtsFetchOut:
    """按 ATS 名分派到六家取岗器;整段抓炸 = failed(这家跳过,不落盘)。"""
    try:
        if x.ats == ATS_GREENHOUSE:
            return AtsFetchOut(jobs=greenhouse_jobs(x), failed=False)
        if x.ats == ATS_LEVER:
            return AtsFetchOut(jobs=lever_jobs(x), failed=False)
        if x.ats == ATS_BAMBOOHR:
            return AtsFetchOut(jobs=bamboohr_jobs(x), failed=False)
        if x.ats == ATS_RECRUITEE:
            return AtsFetchOut(jobs=recruitee_jobs(x), failed=False)
        if x.ats == ATS_SMARTRECRUITERS:
            return AtsFetchOut(jobs=smartrecruiters_jobs(x), failed=False)
        if x.ats == ATS_WORKABLE:
            return AtsFetchOut(jobs=workable_jobs(x), failed=False)
    except Exception as e:  # noqa: BLE001 — 一家 ATS 抓炸不该断整轮(原脚本同款,改成留痕)
        err(ERR_ATS_TPL.format(ats=x.ats, token=x.token), e)
        return AtsFetchOut(jobs=[], failed=True)
    return AtsFetchOut(jobs=[], failed=False)


def greenhouse_jobs(x: AtsFetchIn) -> list:
    """Greenhouse 公开清单(content=true 连描述一起给,不用二次请求)。"""
    payload = json_obj(x.client.get(GREENHOUSE_JOBS_URL_TPL.format(token=x.token)))
    out = []
    for row in payload.get(K_JOBS, []):
        out.append(to_greenhouse_job(row))
    return out


def to_greenhouse_job(row: dict) -> AtsJob:
    """Greenhouse 载荷 → AtsJob。"""
    location = row.get(K_LOCATION) or {}
    content = row.get(K_CONTENT, "") or ""
    return AtsJob(title=row[K_TITLE], location=location.get(K_NAME, ""),
                  url=row.get(K_ABSOLUTE_URL, ""), department="",
                  posted=iso_of(row.get(K_UPDATED_AT, "")), address=address_of(content),
                  description=content)


def lever_jobs(x: AtsFetchIn) -> list:
    """Lever 公开清单(载荷直接是数组)。"""
    rows = json_rows(x.client.get(LEVER_JOBS_URL_TPL.format(token=x.token)))
    out = []
    for row in rows:
        out.append(to_lever_job(row))
    return out


def to_lever_job(row: dict) -> AtsJob:
    """Lever 载荷 → AtsJob(结尾段 additionalPlain 含 Compensation & Benefits,拼进描述)。"""
    body = row.get(K_DESCRIPTION_PLAIN, "") or ""
    tail = row.get(K_ADDITIONAL_PLAIN, "") or ""
    full = body
    if tail != "":
        full = body + PARA_SEP + tail
    categories = row.get(K_CATEGORIES) or {}
    return AtsJob(title=row.get(K_TEXT, ""), location=categories.get(K_LOCATION, ""),
                  url=row.get(K_HOSTED_URL, ""), department=categories.get(K_TEAM, ""),
                  posted=iso_of(row.get(K_CREATED_AT)), address=address_of(body),
                  salary=lever_salary_of(row.get(K_SALARY_RANGE)), description=full)


def lever_salary_of(salary_range: object) -> str:
    """Lever salaryRange {min,max,currency,interval} → 「$125,000 - $175,000 USD annually」。"""
    if not isinstance(salary_range, dict):
        return ""
    low = salary_range.get(K_MIN)
    high = salary_range.get(K_MAX)
    currency = (salary_range.get(K_CURRENCY) or "").strip()
    unit = LEVER_INTERVAL_UNIT.get(salary_range.get(K_INTERVAL, ""), "")
    if low and high and low != high:
        amount = MONEY_RANGE_TPL.format(lo=money_of(low), hi=money_of(high))
    elif low or high:
        amount = money_of(low or high)
    else:
        return ""
    return join_words([amount, currency, unit])


def money_of(value: object) -> str:
    """数字 → 「$125,000」(整数)或「$1,234.50」(带小数);空给空串。"""
    if not isinstance(value, (int, float)):
        return ""
    if float(value) == int(value):
        return MONEY_INT_TPL.format(n=value)
    return MONEY_DEC_TPL.format(n=value)


def join_words(parts: list) -> str:
    """金额/币种/单位用单空格拼,空格子跳过(原 `" ".join(p for p in [...] if p)`)。"""
    kept = []
    for part in parts:
        if part:
            kept.append(part)
    return SPACE_SEP.join(kept)


def bamboohr_jobs(x: AtsFetchIn) -> list:
    """BambooHR 公开清单 + 逐岗详情(清单只有标题/地点,描述与薪资在详情页)。"""
    payload = json_obj(x.client.get(BAMBOO_LIST_URL_TPL.format(token=x.token)))
    out = []
    for row in payload.get(K_RESULT, []):
        job_id = row.get(K_ID, "")
        detail = bamboo_detail(DetailIn(client=x.client, token=x.token, job_id=job_id))
        out.append(to_bamboo_job(BambooJobIn(row=row, detail=detail, token=x.token, job_id=job_id)))
    return out


def bamboo_detail(x: DetailIn) -> BambooDetail:
    """BambooHR 单岗详情:完整描述 + 结构化 compensation;取不到给两格空串。"""
    try:
        payload = json_obj(x.client.get(BAMBOO_DETAIL_URL_TPL.format(token=x.token, jid=x.job_id)))
    except Exception as e:  # noqa: BLE001 — 单岗详情取不到照旧收这一岗(原脚本静默 pass,批I 补留痕)
        err(ERR_ATS_TPL.format(ats=ATS_BAMBOOHR, token=x.token), e)
        return BambooDetail(description="", compensation="")
    opening = (payload.get(K_RESULT) or {}).get(K_JOB_OPENING) or {}
    return BambooDetail(description=opening.get(K_DESCRIPTION, ""),
                        compensation=(opening.get(K_COMPENSATION) or "").strip())


def to_bamboo_job(x: BambooJobIn) -> AtsJob:
    """BambooHR 载荷 → AtsJob(地点可能是 {city,state} 也可能是裸串)。"""
    raw_location = x.row.get(K_LOCATION) or {}
    location = str(raw_location)
    if isinstance(raw_location, dict):
        location = join_parts([raw_location.get(K_CITY), raw_location.get(K_STATE)])
    return AtsJob(title=x.row.get(K_JOB_OPENING_NAME, ""), location=location,
                  url=BAMBOO_JOB_URL_TPL.format(token=x.token, jid=x.job_id),
                  department=x.row.get(K_DEPARTMENT_LABEL, ""),
                  posted=iso_of(x.row.get(K_DATE_POSTED, "")),
                  address=address_of(x.detail.description), salary=x.detail.compensation,
                  description=x.detail.description)


def recruitee_jobs(x: AtsFetchIn) -> list:
    """Recruitee 公开清单。"""
    payload = json_obj(x.client.get(RECRUITEE_OFFERS_URL_TPL.format(token=x.token)))
    out = []
    for row in payload.get(K_OFFERS, []):
        out.append(to_recruitee_job(row))
    return out


def to_recruitee_job(row: dict) -> AtsJob:
    """Recruitee 载荷 → AtsJob。"""
    description = row.get(K_DESCRIPTION, "") or ""
    return AtsJob(title=row.get(K_TITLE, ""),
                  location=row.get(K_LOCATION, "") or row.get(K_CITY, ""),
                  url=row.get(K_CAREERS_URL) or row.get(K_URL, ""),
                  department=row.get(K_DEPARTMENT, ""),
                  posted=iso_of(row.get(K_PUBLISHED_AT) or row.get(K_CREATED_AT_SNAKE)),
                  address=address_of(description), description=description)


def smartrecruiters_jobs(x: AtsFetchIn) -> list:
    """SmartRecruiters 公开清单 + 逐岗 jobAd 分段描述。"""
    payload = json_obj(x.client.get(SMART_LIST_URL_TPL.format(token=x.token)))
    out = []
    for row in payload.get(K_CONTENT, []):
        job_id = row.get(K_ID, "")
        description = smart_detail(DetailIn(client=x.client, token=x.token, job_id=job_id))
        out.append(to_smart_job(SmartJobIn(row=row, description=description, token=x.token,
                                           job_id=job_id)))
    return out


def smart_detail(x: DetailIn) -> str:
    """SmartRecruiters 单岗详情的四段拼成描述;取不到给空串。"""
    try:
        payload = json_obj(x.client.get(SMART_DETAIL_URL_TPL.format(token=x.token, pid=x.job_id)))
    except Exception as e:  # noqa: BLE001 — 单岗详情取不到照旧收这一岗(原脚本静默 pass,批I 补留痕)
        err(ERR_ATS_TPL.format(ats=ATS_SMARTRECRUITERS, token=x.token), e)
        return ""
    ad = payload.get(K_JOB_AD) or payload.get(K_DEFAULT_JOB_AD) or {}
    sections = ad.get(K_SECTIONS) or {}
    parts = []
    for name in SMART_SECTIONS:
        parts.append((sections.get(name) or {}).get(K_TEXT, ""))
    return SPACE_SEP.join(parts)


def to_smart_job(x: SmartJobIn) -> AtsJob:
    """SmartRecruiters 载荷 → AtsJob(描述里抽不到地址就退回地点里的街道格)。"""
    location = x.row.get(K_LOCATION) or {}
    address = address_of(x.description)
    if address == "":
        address = join_parts([location.get(K_ADDRESS), location.get(K_CITY)])
    return AtsJob(title=x.row.get(K_NAME, ""),
                  location=join_parts([location.get(K_CITY), location.get(K_REGION)]),
                  url=SMART_JOB_URL_TPL.format(token=x.token, pid=x.job_id),
                  department=(x.row.get(K_DEPARTMENT) or {}).get(K_LABEL, ""),
                  posted=iso_of(x.row.get(K_RELEASED_DATE, "")), address=address,
                  description=x.description)


def workable_jobs(x: AtsFetchIn) -> list:
    """Workable 账号清单(details=true 带描述)。"""
    payload = json_obj(x.client.get(WORKABLE_ACCOUNT_URL_TPL.format(token=x.token)))
    out = []
    for row in payload.get(K_JOBS, []):
        out.append(to_workable_job(row))
    return out


def to_workable_job(row: dict) -> AtsJob:
    """Workable 载荷 → AtsJob(地点可能是 {location_str} 也可能是裸串)。"""
    raw_location = row.get(K_LOCATION)
    location = row.get(K_LOCATION, "")
    if isinstance(raw_location, dict):
        location = raw_location.get(K_LOCATION_STR, "")
    description = row.get(K_DESCRIPTION, "") or ""
    return AtsJob(title=row.get(K_TITLE, ""), location=location,
                  url=row.get(K_URL) or row.get(K_APPLICATION_URL, ""),
                  department=row.get(K_DEPARTMENT, ""),
                  posted=iso_of(row.get(K_PUBLISHED_ON, "")), address=address_of(description),
                  description=description)


def workday_targets(x: WorkdayFindIn) -> list:
    """从 careers 页 HTML 发现 Workday 站点 → WorkdayTarget 清单(同公司最多 4 个)。"""
    try:
        html = x.client.get(x.careers_url).text
    except Exception as e:  # noqa: BLE001 — careers 页取不到=这家没 Workday 站点可抓
        err(x.careers_url, e)
        return []
    seen = set()
    out = []
    for host, site in WD_HOST_RE.findall(html):
        if site.lower() in WD_SKIP_SITES:
            continue
        if (host, site) in seen:
            continue
        seen.add((host, site))
        out.append(WorkdayTarget(host=host, tenant=host.split(DOT_SEP)[0], site=site))
    return out[:WD_MAX_SITES]


def fetch_workday(x: WorkdayFetchIn) -> list:
    """逐站点翻 cxs/jobs,过滤 Ottawa 都会区,逐岗取详情;跨站点同岗只收一次。"""
    seen = set()
    out = []
    for target in x.targets:
        out += workday_site_jobs(WorkdaySiteIn(client=x.client, target=target, seen=seen))
    return out


def workday_site_jobs(x: WorkdaySiteIn) -> list:
    """单个 Workday 站点翻页到底;翻页中途炸掉就收这站已拿到的(原脚本 continue 同义)。"""
    base = WD_BASE_URL_TPL.format(host=x.target.host, tenant=x.target.tenant, site=x.target.site)
    headers = {HDR_ACCEPT: ACCEPT_JSON}
    offset = WD_OFFSET_START
    out = []
    try:
        while True:
            body = {K_APPLIED_FACETS: {}, K_LIMIT: WD_PAGE_SIZE, K_OFFSET: offset,
                    K_SEARCH_TEXT: ""}
            page = json_obj(x.client.post(WD_JOBS_URL_TPL.format(base=base), headers=headers,
                                          json=body))
            postings = page.get(K_JOB_POSTINGS, [])
            if len(postings) == 0:
                break
            out += workday_page_jobs(WorkdayPageIn(client=x.client, base=base, postings=postings,
                                                   seen=x.seen))
            offset += WD_PAGE_SIZE
            if offset >= page.get(K_TOTAL, 0):
                break
    except Exception as e:  # noqa: BLE001 — 一个站点翻炸不该拖累别的站点/别的公司
        err(ERR_WORKDAY_TPL.format(host=x.target.host), e)
    return out


def workday_page_jobs(x: WorkdayPageIn) -> list:
    """一页 cxs 结果 → AtsJob 清单(只留 Ottawa 都会区,逐岗取详情)。"""
    out = []
    for posting in x.postings:
        path = posting.get(K_EXTERNAL_PATH, "")
        if path in x.seen:
            continue
        if OTTAWA_LOC_RE.search(posting.get(K_LOCATIONS_TEXT, "")) is None:
            continue
        x.seen.add(path)
        info = workday_detail(WorkdayDetailIn(client=x.client, base=x.base, path=path))
        out.append(to_workday_job(WorkdayJobIn(posting=posting, info=info)))
    return out


def workday_detail(x: WorkdayDetailIn) -> dict:
    """Workday 单岗详情体;取不到给空 dict(原脚本同款,补留痕)。"""
    headers = {HDR_ACCEPT: ACCEPT_JSON}
    try:
        payload = json_obj(x.client.get(WD_DETAIL_URL_TPL.format(base=x.base, path=x.path),
                                        headers=headers))
    except Exception as e:  # noqa: BLE001 — 详情取不到照旧收这一岗(标题/地点翻页里有)
        err(x.path, e)
        return {}
    return payload.get(K_JOB_POSTING_INFO, {})


def to_workday_job(x: WorkdayJobIn) -> AtsJob:
    """Workday 载荷 → AtsJob(详情缺格时退回翻页行给的标题/地点)。"""
    description = x.info.get(K_JOB_DESCRIPTION, "") or ""
    return AtsJob(title=x.info.get(K_TITLE) or x.posting.get(K_TITLE, ""),
                  location=x.info.get(K_LOCATION) or x.posting.get(K_LOCATIONS_TEXT, ""),
                  url=x.info.get(K_EXTERNAL_URL, ""), department="",
                  posted=iso_of(x.info.get(K_START_DATE, "")), address=address_of(description),
                  salary="", description=description)


def write_company_jobs(x: WriteJobsIn) -> None:
    """一家公司落盘:每岗一份 jobs/<id>.md(frontmatter + 完整描述)+ 一份精简 jobs.json。"""
    md_dir = x.folder / DIR_JOBS
    md_dir.mkdir(exist_ok=True)
    rows = []
    for job in x.jobs:
        body = MD_TPL.format(title=job.title, company=x.folder.name, location=job.location,
                             posted=job.posted, ats=x.ats, url=job.url,
                             desc=plain_text_of(job.description))
        (md_dir / (job_id_of(job) + SUFFIX_MD)).write_text(body, encoding=ENC_UTF8)
        rows.append(to_job_row(job))
    payload = {K_ATS: x.ats, K_TOKEN: x.token, K_COUNT: len(x.jobs), K_JOBS: rows}
    (x.folder / FILE_JOBS_JSON).write_text(
        json.dumps(payload, ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)


def job_id_of(job: AtsJob) -> str:
    """.md 文件名:优先取 URL 末段的稳定 id,取不到用标题折连字符,都空兜 job。"""
    m = JOB_ID_RE.search(job.url)
    base = NONALNUM_RE.sub(DASH, job.title.lower())
    if m is not None:
        base = m.group(1)
    if base == "":
        base = JOB_ID_FALLBACK
    return base[:JOB_ID_MAX_LEN].strip(DASH)


def to_job_row(job: AtsJob) -> dict:
    """AtsJob → jobs.json 的一行(wire 字典):逐格写全,只有 description 不进
    (它只进 .md,保持清单精简 —— 原脚本的 `jb.pop("description")` 同义)。

    键序即原脚本各家行构造的插入序(tech 殿后,与 `jb["tech"] = …` 后补同位);
    唯一差别:原来只有 lever/bamboohr 两家带 salary 键,现在归一形状人人都有
    (给不出的是空串,下游一律 `.get("salary")` 取值,空串与缺键同义)。
    """
    return {K_TITLE: job.title, K_LOCATION: job.location, K_URL: job.url,
            K_DEPARTMENT: job.department, K_POSTED: job.posted, K_ADDRESS: job.address,
            K_SALARY: job.salary, K_TECH: job.tech}


# =========================================================================
# 3. ATS 薪资抽取(从上一段落好的 jobs/*.md 描述里抽薪资,补回 jobs.json)
# =========================================================================


def extract_ats_salary() -> None:
    """本域步骤入口:逐司把描述里的结构化薪资补进 jobs.json 的 salary 格。"""
    say(PRINT_SALARY_INOUT_TPL.format(path=OUT_COMPANIES))
    index = md_url_index()
    total = 0
    updated = 0
    for jobs_json in IN_COMPANIES.rglob(FILE_JOBS_JSON):
        tally = fill_company_salaries(FillIn(jobs_json=jobs_json, index=index))
        total += tally.total
        updated += tally.updated
    say(PRINT_SALARY_DONE_TPL.format(updated=updated, total=total))


def md_url_index() -> dict:
    """全域 url → 职位详情 .md 路径(.md frontmatter 带 url:)。"""
    index: dict = {}
    for md in IN_COMPANIES.rglob(MD_GLOB):
        head = md.read_text(encoding=ENC_UTF8)[:MD_HEAD_LEN]
        m = URL_LINE_RE.search(head)
        if m is not None:
            index[m.group(1).strip()] = md
    return index


def fill_company_salaries(x: FillIn) -> SalaryTally:
    """一家公司的 jobs.json:给没薪资的岗补上;有变更才写回。"""
    data = json.loads(x.jobs_json.read_text(encoding=ENC_UTF8))
    total = 0
    updated = 0
    for job in data.get(K_JOBS, []):
        total += 1
        if job.get(K_SALARY):
            continue
        md = x.index.get((job.get(K_URL) or "").strip())
        if md is None:
            continue
        salary = salary_of(md.read_text(encoding=ENC_UTF8))
        if salary == "":
            continue
        job[K_SALARY] = salary
        updated += 1
    if updated > 0:
        x.jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=JSON_INDENT),
                               encoding=ENC_UTF8)
    return SalaryTally(total=total, updated=updated)


def salary_of(text: str) -> str:
    """描述里抽薪资:先按关键词锚定,再退带单位的金额;都不中给空串。"""
    body = text.replace(NBSP_ENTITY, SPACE_SEP)
    m = ANCHORED_RE.search(body)
    if m is not None and m.group(1).strip() not in BAD_AMOUNTS:
        return clean_salary(m.group(1))
    m = WITH_UNIT_RE.search(body)
    if m is not None:
        return clean_salary(m.group(1))
    return ""


def clean_salary(text: str) -> str:
    """抽出的薪资串归一:实体还原、压空白、去首尾标点。"""
    return WS_RE.sub(SPACE_SEP, text.replace(NBSP_ENTITY, SPACE_SEP)).strip(SALARY_STRIP_CHARS)
