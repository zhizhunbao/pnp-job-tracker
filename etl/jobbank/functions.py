"""
jobbank 域函数 —— 全部行为住这(照 company/ircc 全溶样张,方言律全集见
docs/design/etl分域-20260829.md §4)。

七个步骤文件 2026-08-31 批I 溶入本文件,一步一段(段横幅三行框 + N. 编号,与
constants.py / scheme.py 同名同序镜像),各段入口函数与原脚本同名、一律零参,门直调。
**零字符串令**:字面量全住 constants(帖子行与 manifest 的键 K_ 词族、CSS 选择器 SEL_*、
文案 *_TPL);**显式循环令**:禁推导/genexp/lambda(排序键提成具名函数);
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass,多返回值收 XxxOut;
**内嵌禁令**:原详情抓取的 need()、质检的 flag() 两个内嵌函数出户成顶层具名函数。
帖子行保持 dict(理由见 scheme.py 头注:postings.json 是开放累积 store,下游几个域还要
往同一行上挂字段),键一律 K_ 词族;bs4/httpx 经 scheme 的 Protocol,cast 只住装配点。
日志口径:域内不裸 print,报数走 log.functions.say;⚠/✗ 行首的告警逐字保留
(auto_update 按行首升级);原来静默 pass/吞掉的 catch 一律补 err() 留痕(永不吞异常令)。
⚠ 2026-08-31 批I 随溶解退役一件(简化优先于收编,方言律⑨):**旧关键词检索 CLI 整支** ——
`--prov/--ottawa/--all-cities/--direct-only/--occupations` 那套按 26 个科技关键词逐省搜的
老模式,连同 DEFAULT_OCCUPATIONS / OTTAWA_CITIES / PROV_NAME 三张表与 scrape / fetch_page /
write_outputs / build_comparison 四只函数一起退役。判据:① 全仓零调度消费者(役册链上
只有 `--all-occupations --prov ALL` 那一支);② 它的产出(raw/jobbank/postings.{json,csv,md}
与 jobbank-comparison.{json,md})在盘上**一个都不存在**,消费端也零引用 —— 与 csv/md 榜单
先例同款「零消费者的产出连逻辑带常量整体退役」。要考古走 git 历史。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch)+ 本域 __init__ 的
SINCE_DAYS(抓取与解析两步共用同一个窗口值,cutoff 才对得上)。
"""
import json
import os
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import cast

import httpx
from bs4 import BeautifulSoup, NavigableString, Tag

from paths import JOBBANK_STORE_LOCK, jobbank_store_lock
from log.functions import err, say
from fetch.functions import make_client
from jobbank import SINCE_DAYS
from jobbank.constants import (
    ADDRESS_CLIP, ALL_PROVINCES, ATLANTIC, BLANK_LINES_RE, BLOCK_TAGS, BULLET_PREFIX,
    CAT_AIP_OUT, CAT_CITY_IS_PROV, CAT_DISTRICT_OUT, CAT_OTTAWA_FALSE, CAT_POSTAL_MISMATCH,
    CAT_PROV_MISSING, CAT_SALARY_HIGH, CAT_SALARY_LOW, CAT_URL_DUP, CHAIN_DELAY_S,
    CHAIN_MAX_PAGES, CITY_PROV_RE, CLASS_ATTRIBUTE_VALUE, COMPANY_SLUG_MAX, DATE_DIR_RE,
    DATE_FMTS, DATE_POSTED_PREFIX, DETAIL_HTML_TPL, DETAIL_MD_TPL, DETAIL_SLEEP_S,
    DETAIL_SLUG_MAX, DETAIL_TICK, DETAIL_TIMEOUT_S, DETAIL_TMP_TPL, DIR_COMPANIES, DIR_DETAILS,
    DIR_JOBS, DIRECT_MARK, EDUCATION_JOIN_SEP, EMAIL_DOMAIN_RE, EMAIL_SKIP_DOMAINS,
    EMPLOYER_CLIP, EMPLOYER_FALLBACK, ENC_UTF8, ENV_ON, ENV_REPARSE, ENV_VERIFY_MAX,
    ENV_VERIFY_SLEEP, ERR_PAGE_TPL, ESCAPED_HTML_RE, FILE_JOBS, FILE_PROFILE, FRONTMATTER_SEP,
    GENERIC_EMAIL, GLOB_HTML, GLOB_MD, HEAD_TAGS, HEADING_CERTIFICATES, HEADING_EDUCATION,
    HDR_UA, HOURS_FULL, HOURS_FULL_MARK, HOURS_PART, HOURS_PART_MARK, HREF_ATTR, HTTP_PREFIX,
    HTTP_SCHEME, IN_DETAILS, IN_MART_OPEN_IDS, IN_POSTINGS, IN_SCORED, IN_SNAP_ROOT,
    ISO_DATE_FMT, JOB_MD_TPL, JOB_STEM_FALLBACK, JOBBANK_ORIGIN, JSON_INDENT, K_ADDRESS, K_AIP,
    K_CATEGORY, K_CERTIFICATES, K_CHECKED, K_CITY, K_COMPANY, K_COUNT, K_CUTOFF, K_DATE,
    K_DATE_DETAIL, K_DEAD, K_DESCRIPTION, K_DETAIL_FETCHED, K_DIRECT, K_DISTRICT, K_EDUCATION,
    K_EMAIL, K_EMPLOYER, K_EMPLOYMENT_HOURS, K_EMPLOYMENT_TERM, K_EXTERNAL_ID, K_FETCHED_AT,
    K_FILE, K_JOB_COUNT, K_JOBS, K_LAST_SEEN, K_NAME, K_NOC, K_PAGE, K_PAGES, K_PHONE,
    K_POSTING_ID, K_PROV, K_PROVINCE, K_ROWS, K_SALARY, K_SALARY_ANNUAL, K_SINCE_DAYS, K_SLUG,
    K_SOURCE, K_TITLE, K_URL, K_WEBSITE, K_WHY, KV_SEP, LABEL_LOCATION, LABEL_SALARY,
    LINE_BREAK, LISTING_POSTING_RE, LISTING_RETRY_BACKOFF_S, LISTING_RETRY_N, LISTING_TIMEOUT_S,
    LISTING_URL_TPL, MANIFEST_FILE, MD_DUP_TPL, MD_HEAD_LEN, MD_NAME_TPL, MISSING_MARK,
    NOC_CODE_RE, OFFICIAL_DOMAINS, OTTAWA_FSA_PREFIX, OUT_DETAILS, OUT_FLAGS, OUT_POSTINGS,
    OTTAWA_CITY, OUT_ROOT, OUT_SNAP_ROOT, OUT_STATE, PARA_BREAK, PARSER_HTML, PERCENT, PID_TAIL_LEN,
    PID_URL_RE, POSTAL_PROV, POSTAL_RE, PRINT_AUDIT_CAT_TPL, PRINT_AUDIT_DIST,
    PRINT_AUDIT_FLAGS_HEAD, PRINT_AUDIT_HEAD_TPL, PRINT_AUDIT_OUT_TPL, PRINT_AUDIT_PROV_TPL,
    PRINT_AUDIT_TEER_TPL, PRINT_AUDIT_TOTAL_TPL, PRINT_AUDIT_UNCLASSIFIED_TPL,
    PRINT_COMPANIES_DONE_TPL, PRINT_COMPANIES_IN_TPL, PRINT_COMPANIES_OUT_TPL,
    PRINT_DETAIL_DONE_TPL, PRINT_DETAIL_HEAD_TPL, PRINT_DETAIL_TICK_TPL, PRINT_DETAILS_DONE_TPL,
    PRINT_DETAILS_IN_TPL, PRINT_DETAILS_LOCK_TPL, PRINT_DETAILS_OUT_TPL, PRINT_LISTING_HEAD_TPL,
    PRINT_MAX_PAGES_TPL, PRINT_NO_POSTINGS, PRINT_NO_SNAPSHOT, PRINT_PARSE_DONE_TPL,
    PRINT_PARSE_IN_TPL, PRINT_PARSE_LOCK_TPL, PRINT_PARSE_OUT_TPL, PRINT_PROV_SAVED_TPL,
    PRINT_RETRY_FAIL_TPL, PRINT_SNAPSHOT_TPL, PRINT_VERIFY_DONE_TPL, PRINT_VERIFY_HEAD_TPL,
    PRINT_WROTE_TPL, PROFILE_KEYS, PROV_FULL, PROV_NAMES, PROV_ON, RATE_FLOOR_S, RECHECK_DAYS,
    RICH_MIN_LEN, SALARY_MAX, SALARY_MIN, SCRAPED_KEYS, SEL_ADDRESS, SEL_ARTICLE, SEL_BUSINESS,
    SEL_DATE, SEL_DATE_POSTED, SEL_DESCRIPTION, SEL_EMPLOYMENT_TYPE, SEL_H3_TITLE,
    SEL_HIRING_ORG, SEL_JOB_SOURCE, SEL_LOCATION, SEL_NOC_NO, SEL_NOC_NO_CLASS, SEL_NOC_TITLE,
    SEL_ORG_LINK, SEL_REQUIREMENTS, SEL_SALARY, SINCE_DAYS_FLAG, SKIP_TAGS, SLUG_DASH,
    SLUG_FALLBACK, SLUG_RE, SNAP_PAGE_TPL, SOURCE_JOBBANK, SPACE_SEP, STEM_DUP_TPL,
    STEM_FALLBACK, STEM_FILE_TPL, STEM_JOIN, SUFFIX_JSON_TMP, SUFFIX_TMP, TAG_A, TAG_BR, TAG_H4,
    TAG_LI, TAG_SPAN, TAG_UL, TERM_MAP, TIMESPEC_SECONDS, UNCLASSIFIED, UNKNOWN_PROV,
    URL_LINE_RE, URL_PARAM_SEP, UTC_OFFSET, UTC_Z, VERIFY_DATE_FMTS, VERIFY_DEAD_CODES,
    VERIFY_FRESH_DAYS, VERIFY_HEAD_BYTES, VERIFY_HOST, VERIFY_MARKER, VERIFY_MAX_DEFAULT,
    VERIFY_SLEEP_DEFAULT, VERIFY_TIMEOUT_S, VERIFY_UA, WHY_AIP_TPL, WHY_CITY_IS_PROV_TPL,
    WHY_DISTRICT_TPL, WHY_OTTAWA_TPL, WHY_POSTAL_TPL, WHY_PROV_MISSING_TPL,
    WHY_SALARY_HIGH_TPL, WHY_SALARY_LOW_TPL, WHY_URL_DUP, WS_RE,
)
from jobbank.scheme import (
    AllOldIn, CandidateIn, CandidateOut, CategoryIn, CheckIn, CompanyIn, CutoffIn, DetailMdIn,
    DetailTally, DupIn, EmploymentOut, FieldIn, EnrichIn, FlagIn, FlagRowIn, HttpClientLike, JobMdIn,
    LabelIn, ListingIn, MergeIn, MergeOut, NeedIn, PageIn, PageOut, ProvinceIn, ReqIn, SaveIn,
    ShouldParseIn, SoupNodeLike, StemIn, TickIn, VerifyIn, VerifyOut,
)


# =========================================================================
# 1. 共享词汇(≥2 段消费:帖号、文本清洗、列表行解析、详情快照索引)
# =========================================================================


def pid_of(row: dict) -> str:
    """稳定去重键 = posting_id 字段,缺则从 url 的 /jobposting/<id> 取。

    2026-08-31 批I 收拢:原详情抓取、列表解析、详情解析各有一份逐字相同的 pid_of。
    历史记录(旧 all-occupations 写入)无 posting_id 字段,只有 url —— 必须从 url 兜底,
    否则会漏认/丢数据;这个键与 08/09 的 jb:<id> join 键一致。
    """
    if row.get(K_POSTING_ID):
        return str(row[K_POSTING_ID])
    m = PID_URL_RE.search(row.get(K_URL, ""))
    if m is None:
        return ""
    return m.group(1)


def norm(text: str) -> str:
    """压空白 + 去首尾(列表行取值的统一归一)。"""
    return WS_RE.sub(SPACE_SEP, text or "").strip()


def clean_labeled(x: LabelIn) -> str:
    """归一后剥掉前缀标签(「Location: Ottawa (ON)」→「Ottawa (ON)」)。"""
    text = norm(x.text)
    if x.label != "" and text.lower().startswith(x.label.lower()):
        return text[len(x.label):].strip()
    return text


def plain_text(node: object) -> str:
    """节点的裸 get_text()(不给分隔符 —— 列表行的取法,与详情页的 spaced_text 不同,
    两处历史取法不一样,不强行拉平);节点为空给空串。"""
    if node is None:
        return ""
    return cast(SoupNodeLike, node).get_text()


def listing_date_of(text: str) -> date | None:
    """「June 22, 2026」→ date;解析不了返回 None(当作新帖,保留)。"""
    value = (text or "").strip()
    for fmt in DATE_FMTS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def to_listing_row(art: SoupNodeLike) -> dict:
    """列表页一个 <article> → 帖子行(原 parse_article;认不出帖子链接给空 dict)。"""
    link = art.find(TAG_A, href=LISTING_POSTING_RE)
    if link is None:
        return {}
    pid_m = LISTING_POSTING_RE.search(link[HREF_ATTR])
    title_el = art.select_one(SEL_NOC_TITLE)
    if title_el is None:
        title_el = art.select_one(SEL_H3_TITLE)
    loc = clean_labeled(LabelIn(text=plain_text(art.select_one(SEL_LOCATION)),
                                label=LABEL_LOCATION))
    city_m = CITY_PROV_RE.match(loc)
    source = norm(plain_text(art.select_one(SEL_JOB_SOURCE)))
    city = loc
    province = ""
    if city_m is not None:
        city = city_m.group(1).strip()
        province = city_m.group(2)
    pid = ""
    if pid_m is not None:
        pid = pid_m.group(1)
    return {
        K_POSTING_ID: pid,
        K_TITLE: norm(plain_text(title_el)),
        K_EMPLOYER: norm(plain_text(art.select_one(SEL_BUSINESS))),
        K_CITY: city,
        K_PROVINCE: province,
        K_SALARY: clean_labeled(LabelIn(text=plain_text(art.select_one(SEL_SALARY)),
                                        label=LABEL_SALARY)),
        K_DATE: norm(plain_text(art.select_one(SEL_DATE))),
        K_SOURCE: source,
        K_DIRECT: DIRECT_MARK in source.lower(),
        K_URL: JOBBANK_ORIGIN + link[HREF_ATTR].split(URL_PARAM_SEP)[0],
    }


def page_rows(html: str) -> list:
    """一页列表 HTML → 帖子行清单(只留认出了帖号的)。"""
    soup = cast(SoupNodeLike, BeautifulSoup(html, PARSER_HTML))
    rows = []
    for art in soup.select(SEL_ARTICLE):
        row = to_listing_row(art)
        if len(row) > 0 and row[K_POSTING_ID] != "":
            rows.append(row)
    return rows


def detail_html_index() -> dict:
    """跨所有日期目录:posting_id → 详情 HTML 路径(日期升序,最新覆盖)。

    详情每帖抓一次,但落在「抓取那天」的 raw/jobbank/<日期>/details/ 下,
    故要跨日期目录查「是否已抓过」。2026-08-31 批I 收拢:抓取与解析两件各有一份。
    """
    index: dict = {}
    if not IN_SNAP_ROOT.exists():
        return index
    dirs = []
    for entry in IN_SNAP_ROOT.iterdir():
        if entry.is_dir():
            dirs.append(entry)
    for date_dir in sorted(dirs):
        for f in (date_dir / DIR_DETAILS).glob(GLOB_HTML):
            index[f.stem] = f
    return index


# =========================================================================
# 2. 列表快照抓取(全职业 · 按省 · sort=D · 增量:只存原始 HTML,不解析不合并)
# =========================================================================


def scrape_jobbank_postings() -> None:
    """本域步骤入口:各省全职业按日期降序翻页,每页原始 HTML 整存进当天快照目录。"""
    fetch_listing_snapshots(ListingIn(provinces=ALL_PROVINCES, since_days=int(SINCE_DAYS),
                                      max_pages=CHAIN_MAX_PAGES, delay=CHAIN_DELAY_S))


def fetch_listing_snapshots(x: ListingIn) -> dict:
    """逐省翻页存快照 + 写 manifest;返回 manifest(页内日期只用来决定翻几页)。"""
    say(PRINT_LISTING_HEAD_TPL.format(provinces=x.provinces, since_days=x.since_days))
    today = datetime.now().date()
    cutoff = today - timedelta(days=x.since_days)
    snap_dir = OUT_SNAP_ROOT / today.isoformat()
    snap_dir.mkdir(parents=True, exist_ok=True)
    pages: list = []
    manifest = {K_FETCHED_AT: datetime.now().isoformat(timespec=TIMESPEC_SECONDS),
                K_SINCE_DAYS: x.since_days, K_CUTOFF: cutoff.isoformat(), K_PAGES: pages}
    with make_client(LISTING_TIMEOUT_S) as raw_client:
        client = cast(HttpClientLike, raw_client)
        for prov in x.provinces:
            saved = snapshot_province(ProvinceIn(client=client, prov=prov, cutoff=cutoff,
                                                 snap_dir=snap_dir, pages=pages,
                                                 max_pages=x.max_pages, delay=x.delay))
            say(PRINT_PROV_SAVED_TPL.format(prov=prov, saved=saved, cutoff=cutoff))
    (snap_dir / MANIFEST_FILE).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)
    say(PRINT_SNAPSHOT_TPL.format(snap_dir=snap_dir, pages=len(pages)))
    return manifest


def snapshot_province(x: ProvinceIn) -> int:
    """一个省翻到头:空页/整页早于截止日/重试耗尽都停;翻满上限仍没跨天 = 大声告警。"""
    saved = 0
    exhausted = True
    for page in range(1, x.max_pages + 1):
        out = fetch_listing_page(PageIn(client=x.client, prov=x.prov, page=page))
        if out.html == "":
            say(PRINT_RETRY_FAIL_TPL.format(prov=x.prov, page=page, error=out.error))
            exhausted = False
            break
        rows = page_rows(out.html)
        if len(rows) == 0:
            exhausted = False
            break
        name = SNAP_PAGE_TPL.format(prov=PROV_FULL.get(x.prov, x.prov.lower()), page=page)
        (x.snap_dir / name).write_text(out.html, encoding=ENC_UTF8)
        x.pages.append({K_PROV: x.prov, K_PAGE: page, K_FILE: name, K_ROWS: len(rows)})
        saved += 1
        if all_rows_old(AllOldIn(rows=rows, cutoff=x.cutoff)):
            exhausted = False
            break
        time.sleep(x.delay)
    if exhausted:
        say(PRINT_MAX_PAGES_TPL.format(prov=x.prov, max_pages=x.max_pages, cutoff=x.cutoff))
    return saved


def fetch_listing_page(x: PageIn) -> PageOut:
    """某省某页,失败重试 3 次再放弃(#118b:静默断页=另一种漏帖)。"""
    url = LISTING_URL_TPL.format(prov=x.prov, page=x.page)
    error = ""
    for attempt in range(LISTING_RETRY_N):
        try:
            r = x.client.get(url)
            r.raise_for_status()
            return PageOut(html=r.text, error="")
        except Exception as e:  # noqa: BLE001 — 三次都炸才放弃,错话带进告警行
            error = ERR_PAGE_TPL.format(name=type(e).__name__, detail=e)
            time.sleep(LISTING_RETRY_BACKOFF_S * (attempt + 1))
    return PageOut(html="", error=error)


def all_rows_old(x: AllOldIn) -> bool:
    """整页都早于截止日 = 该省到头(降序);date 解析不了当作新,保留继续翻。"""
    for row in x.rows:
        posted = listing_date_of(row[K_DATE])
        if posted is None:
            return False
        if posted >= x.cutoff:
            return False
    return True


# =========================================================================
# 3. 列表快照解析(HTML 快照 → 增量合并去重进 postings.json,持仓锁)
# =========================================================================


def parse_jobbank_postings() -> None:
    """本域步骤入口:解析最新一份列表快照,增量合并进累积 store。"""
    say(PRINT_PARSE_IN_TPL.format(root=IN_SNAP_ROOT))
    say(PRINT_PARSE_OUT_TPL.format(out=OUT_POSTINGS))
    say(PRINT_PARSE_LOCK_TPL.format(lock=JOBBANK_STORE_LOCK))
    snap = latest_snapshot_dir()
    if snap is None:
        say(PRINT_NO_SNAPSHOT)
        return
    cutoff = cutoff_of(CutoffIn(snap=snap, since_days=since_days_of()))
    fetched = fetched_at_of(snap)
    rows = parse_snapshot(snap)
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        by_id = load_postings()
        base = len(by_id)
        merged = merge_rows(MergeIn(rows=rows, by_id=by_id, cutoff=cutoff, fetched=fetched))
        write_postings(by_id)
    say(PRINT_PARSE_DONE_TPL.format(snap=snap.name, rows=len(rows), added=merged.added,
                                    updated=merged.updated, skipped=merged.skipped_old,
                                    cutoff=cutoff, base=base, total=len(by_id)))


def since_days_of() -> int:
    """本步该吃的窗口天数:进程 argv 上给了 `--since-days N` 就用它,没给退回本域
    SINCE_DAYS 环境值 —— 与旧链子进程实参 `--since-days <SINCE_DAYS>` 逐字同义。"""
    argv = sys.argv[1:]
    for i, arg in enumerate(argv):
        if arg == SINCE_DAYS_FLAG and i + 1 < len(argv):
            return int(argv[i + 1])
    return int(SINCE_DAYS)


def latest_snapshot_dir() -> Path | None:
    """快照根下最新的日期目录(按目录名取 max;只认日期目录,排除 details/ 等)。"""
    if not IN_SNAP_ROOT.exists():
        return None
    days = []
    for entry in IN_SNAP_ROOT.iterdir():
        if entry.is_dir() and DATE_DIR_RE.match(entry.name) is not None:
            days.append(entry)
    if len(days) == 0:
        return None
    days.sort(key=dir_name_of)
    return days[-1]


def dir_name_of(entry: Path) -> str:
    """目录排序键 = 目录名(日期目录名字典序即时间序)。"""
    return entry.name


def cutoff_of(x: CutoffIn) -> date:
    """优先用 manifest 里抓取时算好的 cutoff(与抓取一致);缺则按今天-since_days。"""
    manifest_f = x.snap / MANIFEST_FILE
    if manifest_f.exists():
        raw = json.loads(manifest_f.read_text(encoding=ENC_UTF8)).get(K_CUTOFF)
        if raw:
            try:
                return datetime.strptime(raw, ISO_DATE_FMT).date()
            except ValueError as e:
                err(manifest_f, e)
    return datetime.now().date() - timedelta(days=x.since_days)


def fetched_at_of(snap: Path) -> str:
    """快照的抓取时刻(manifest.fetched_at,抓取机本地裸时间)→ UTC ISO(Z)。

    这是帖子 last_seen 的唯一来源:同一快照重复解析得到同一时刻(幂等),
    数据重新入库不会推动「抓取时间」。缺 manifest 时退化用目录日期。
    """
    raw = ""
    manifest_f = snap / MANIFEST_FILE
    if manifest_f.exists():
        raw = json.loads(manifest_f.read_text(encoding=ENC_UTF8)).get(K_FETCHED_AT, "")
    try:
        if raw == "":
            moment = datetime.strptime(snap.name, ISO_DATE_FMT)
        else:
            moment = datetime.fromisoformat(raw)
    except ValueError:
        moment = datetime.strptime(snap.name, ISO_DATE_FMT)
    return moment.astimezone(timezone.utc).isoformat().replace(UTC_OFFSET, UTC_Z)


def parse_snapshot(snap: Path) -> list:
    """按 manifest(缺则 glob)读该快照目录的页 HTML → 解析出所有行。"""
    manifest_f = snap / MANIFEST_FILE
    files = []
    if manifest_f.exists():
        for item in json.loads(manifest_f.read_text(encoding=ENC_UTF8)).get(K_PAGES, []):
            files.append(snap / item[K_FILE])
    else:
        files = sorted(snap.glob(GLOB_HTML))
    rows: list = []
    for f in files:
        if not f.exists():
            continue
        rows += page_rows(f.read_text(encoding=ENC_UTF8))
    return rows


def load_postings() -> dict:
    """累积 store → posting_id → 行(按 url 派生键,认全历史记录)。"""
    if not OUT_POSTINGS.exists():
        return {}
    by_id: dict = {}
    for row in json.loads(OUT_POSTINGS.read_text(encoding=ENC_UTF8)):
        pid = pid_of(row)
        if pid != "":
            by_id[pid] = row
    return by_id


def merge_rows(x: MergeIn) -> MergeOut:
    """本轮行并进累积 store:只覆盖原始抓取字段,保留衍生字段;早于截止日的跳过。"""
    added = 0
    updated = 0
    skipped_old = 0
    for row in x.rows:
        posted = listing_date_of(row[K_DATE])
        if posted is not None and posted < x.cutoff:
            skipped_old += 1
            continue
        pid = pid_of(row)
        if pid == "":
            continue
        scraped = to_scraped_row(row)
        if pid in x.by_id:
            x.by_id[pid].update(scraped)
            updated += 1
        else:
            x.by_id[pid] = scraped
            added += 1
        x.by_id[pid][K_LAST_SEEN] = x.fetched
    return MergeOut(added=added, updated=updated, skipped_old=skipped_old)


def to_scraped_row(row: dict) -> dict:
    """一行里只留原始抓取字段(下游 04c/04d/详情解析算出的衍生字段不许被覆盖)。"""
    out = {}
    for key in SCRAPED_KEYS:
        out[key] = row.get(key, "")
    return out


def write_postings(by_id: dict) -> None:
    """按日期降序写回(新帖在前);temp + os.replace 同目录原子 rename。"""
    OUT_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    rows = list(by_id.values())
    rows.sort(key=row_date_key, reverse=True)
    tmp = OUT_POSTINGS.with_suffix(SUFFIX_JSON_TMP)
    tmp.write_text(json.dumps(rows, ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)
    os.replace(tmp, OUT_POSTINGS)
    say(PRINT_WROTE_TPL.format(n=len(rows), out=OUT_POSTINGS))


def row_date_key(row: dict) -> date:
    """写回排序键 = 发布日;解析不出的排最后(date.min)。"""
    posted = listing_date_of(row.get(K_DATE, ""))
    if posted is None:
        return date.min
    return posted


# =========================================================================
# 4. 详情快照抓取(逐帖抓详情页原始 HTML;增量:已抓过/已富集的跳过)
# =========================================================================


def scrape_jobbank_details() -> None:
    """本域步骤入口:逐帖抓详情页原始 HTML,落当天日期目录(temp+rename)。"""
    jobs = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
    raw_dir = OUT_SNAP_ROOT / datetime.now().date().isoformat() / DIR_DETAILS
    raw_dir.mkdir(parents=True, exist_ok=True)
    have = detail_html_index()
    todo = 0
    for job in jobs:
        if needs_detail(NeedIn(job=job, have=have)):
            todo += 1
    done = 0
    skipped = 0
    prov_done: Counter = Counter()
    started = time.monotonic()
    say(PRINT_DETAIL_HEAD_TPL.format(todo=todo, total=len(jobs)))
    with make_client(DETAIL_TIMEOUT_S) as raw_client:
        client = cast(HttpClientLike, raw_client)
        for job in jobs:
            if not needs_detail(NeedIn(job=job, have=have)):
                skipped += 1
                continue
            try:
                html = client.get(job[K_URL]).text
            except Exception as e:  # noqa: BLE001 — 单帖取不到就跳过,下轮再抓
                err(job.get(K_URL, ""), e)
                continue
            save_detail_html(SaveIn(raw_dir=raw_dir, pid=pid_of(job), html=html))
            done += 1
            prov_done[job.get(K_PROVINCE) or UNKNOWN_PROV] += 1
            if done % DETAIL_TICK == 0 or done == todo:
                rate = done / max(time.monotonic() - started, RATE_FLOOR_S)
                say(detail_tick(TickIn(done=done, todo=todo,
                                       prov=job.get(K_PROVINCE) or UNKNOWN_PROV,
                                       employer=(job.get(K_EMPLOYER) or "")[:EMPLOYER_CLIP],
                                       rate=rate)))
            time.sleep(DETAIL_SLEEP_S)
    say(PRINT_DETAIL_DONE_TPL.format(done=done, skipped=skipped, dist=dict(prov_done),
                                     dir=raw_dir))


def needs_detail(x: NeedIn) -> bool:
    """要抓 = 有 url/帖号、HTML 没抓过、且(未富集 或 还缺官方 noc)。

    后者让存量帖一次性重抓拿 NOC(覆盖历史)。
    """
    pid = pid_of(x.job)
    if pid == "":
        return False
    if not x.job.get(K_URL):
        return False
    if pid in x.have:
        return False
    if x.job.get(K_DETAIL_FETCHED) and x.job.get(K_NOC):
        return False
    return True


def save_detail_html(x: SaveIn) -> None:
    """temp+rename 落盘,避免半截文件占位致永不重抓。"""
    tmp = x.raw_dir / DETAIL_TMP_TPL.format(pid=x.pid)
    tmp.write_text(x.html, encoding=ENC_UTF8)
    os.replace(tmp, x.raw_dir / DETAIL_HTML_TPL.format(pid=x.pid))


def detail_tick(x: TickIn) -> str:
    """心跳一行(省份累计只在收尾打一次,这里一行清爽、对齐)。"""
    return PRINT_DETAIL_TICK_TPL.format(done=x.done, todo=x.todo,
                                        pct=x.done * PERCENT // max(x.todo, 1),
                                        prov=x.prov, employer=x.employer, rate=x.rate)


# =========================================================================
# 5. 详情快照解析(详情 HTML → 富集 postings + 写 details/*.md,同一事务持仓锁)
# =========================================================================


def parse_jobbank_details() -> None:
    """本域步骤入口:解析详情快照,原地富集帖子行并写详情 .md。

    两者作为一个发布事务持锁,防止 build 读到新 md、却仍读到旧 postings(或反过来)。
    """
    say(PRINT_DETAILS_IN_TPL.format(root=IN_SNAP_ROOT))
    say(PRINT_DETAILS_OUT_TPL.format(postings=IN_POSTINGS, details=OUT_DETAILS))
    say(PRINT_DETAILS_LOCK_TPL.format(lock=JOBBANK_STORE_LOCK))
    with jobbank_store_lock(JOBBANK_STORE_LOCK):
        if not IN_POSTINGS.exists():
            say(PRINT_NO_POSTINGS)
            return
        jobs = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
        OUT_DETAILS.mkdir(parents=True, exist_ok=True)
        have = detail_html_index()
        seen: set = set()
        reparse = os.environ.get(ENV_REPARSE) == ENV_ON
        parsed = 0
        for job in jobs:
            raw_file = have.get(pid_of(job))
            if not should_parse(ShouldParseIn(job=job, raw_file=raw_file, reparse=reparse)):
                continue
            enrich_job(EnrichIn(job=job, raw_file=cast(Path, raw_file), seen=seen))
            parsed += 1
        if parsed > 0:
            write_enriched(jobs)
        tally = store_tally(jobs)
    say(PRINT_DETAILS_DONE_TPL.format(parsed=parsed, addrs=tally.addrs, webs=tally.webs,
                                      emp=tally.emp, certs=tally.certs, out=OUT_DETAILS))


def should_parse(x: ShouldParseIn) -> bool:
    """有原始 HTML、且(没解析过 或 还缺官方 noc 或 还缺雇佣形态键)→ 解析。

    缺键条件让存量帖自动回填新字段(noc 回填同款先例,无需重抓);REPARSE=1 全部重解析。
    """
    if pid_of(x.job) == "" or x.raw_file is None:
        return False
    if x.reparse:
        return True
    if x.job.get(K_DETAIL_FETCHED) and x.job.get(K_NOC) and K_EMPLOYMENT_HOURS in x.job:
        return False
    return True


def enrich_job(x: EnrichIn) -> None:
    """一帖:解析详情 HTML → 原地写地址/发布日/官网/NOC/雇佣形态/入职要求 + 落 .md。"""
    raw_html = x.raw_file.read_text(encoding=ENC_UTF8)
    soup = cast(SoupNodeLike, BeautifulSoup(raw_html, PARSER_HTML))
    addr = spaced_text(soup.select_one(SEL_ADDRESS))
    desc = description_of(soup)
    posted = spaced_text(soup.select_one(SEL_DATE_POSTED)).replace(DATE_POSTED_PREFIX, "").strip()
    web = employer_website(soup)
    if web == "":
        web = email_website(raw_html)
    noc = noc_of(soup)
    if addr != "":
        x.job[K_ADDRESS] = addr
    if posted != "":
        x.job[K_DATE_DETAIL] = posted
    if web != "":
        x.job[K_WEBSITE] = web
    if noc != "":
        x.job[K_NOC] = noc
    employment = employment_of(soup)
    x.job[K_EMPLOYMENT_TERM] = employment.term
    x.job[K_EMPLOYMENT_HOURS] = employment.hours
    x.job[K_CERTIFICATES] = req_section(ReqIn(soup=soup, heading=HEADING_CERTIFICATES))
    x.job[K_EDUCATION] = EDUCATION_JOIN_SEP.join(
        req_section(ReqIn(soup=soup, heading=HEADING_EDUCATION)))
    x.job[K_DETAIL_FETCHED] = True
    write_detail_md(DetailMdIn(job=x.job, address=addr, website=web, posted=posted, desc=desc,
                               seen=x.seen))


def spaced_text(node: object) -> str:
    """节点文本(空格分隔 + strip + 压空白)—— 详情页的取法;节点为空给空串。"""
    if node is None:
        return ""
    return WS_RE.sub(SPACE_SEP, cast(SoupNodeLike, node).get_text(SPACE_SEP, strip=True))


def description_of(soup: SoupNodeLike) -> str:
    """职位描述:优先抓**可见结构区**(带 h4/列表)做块感知提取;缺失或过短时退回
    [property=description]。后者在聚合帖里常是**被转义的 HTML**(自带 p/ul/li 格式)
    → 再解析一次恢复分段/列表;否则是压平纯文本,原样返回。"""
    rich = rich_text(soup.select_one(SEL_REQUIREMENTS))
    if len(rich) >= RICH_MIN_LEN:
        return rich
    raw = spaced_text(soup.select_one(SEL_DESCRIPTION))
    if ESCAPED_HTML_RE.search(raw) is not None:
        return rich_text(BeautifulSoup(raw, PARSER_HTML))
    return raw


def rich_text(node: object) -> str:
    """块感知提取:HTML 结构(p/div/br/h*/li…)→ 带换行的纯文本,段落间空行、li 加「• 」。"""
    if node is None:
        return ""
    lines = []
    for line in serialize_node(node).split(LINE_BREAK):
        lines.append(WS_RE.sub(SPACE_SEP, line).strip())
    return BLANK_LINES_RE.sub(PARA_BREAK, LINE_BREAK.join(lines)).strip()


def serialize_node(node: object) -> str:
    """递归块级序列化:块边界落换行、<br> 即换行、标题前后空行、li 加「• 」。

    2026-07-16 用户报告:原帖有格式,老提取只认 h2-h5/p/li,Indeed 转义帖的 <br> 换行与
    <b>标题行</b> 全被压平成一坨 —— 这只函数就是为把原帖的分段/列表/标题结构原样落进
    纯文本而写的。
    """
    if isinstance(node, NavigableString):
        return WS_RE.sub(SPACE_SEP, str(node))
    if not isinstance(node, Tag) or node.name in SKIP_TAGS:
        return ""
    if node.name == TAG_BR:
        return LINE_BREAK
    parts = []
    for child in node.children:
        parts.append(serialize_node(child))
    inner = "".join(parts)
    if node.name == TAG_LI:
        return BULLET_PREFIX + inner.strip() + LINE_BREAK
    if node.name in HEAD_TAGS:
        return PARA_BREAK + inner.strip() + LINE_BREAK
    if node.name in BLOCK_TAGS:
        body = inner.strip()
        if body == "":
            return ""
        return LINE_BREAK + body + PARA_BREAK
    return inner


def employment_of(soup: SoupNodeLike) -> EmploymentOut:
    """雇佣形态:hours 来自 <span property="employmentType">(Full/Part time);
    雇佣期在同一 attribute-value 外层(如「Permanent employmentFull time」)按关键词归一。
    没有标注 = 双空(宁缺不猜;ATS 帖天然走这条)。"""
    node = soup.select_one(SEL_EMPLOYMENT_TYPE)
    if node is None:
        return EmploymentOut(term="", hours="")
    hours_txt = node.get_text(SPACE_SEP, strip=True)
    hours = ""
    if HOURS_FULL_MARK in hours_txt:
        hours = HOURS_FULL
    elif HOURS_PART_MARK in hours_txt:
        hours = HOURS_PART
    outer = node.find_parent(TAG_SPAN, class_=CLASS_ATTRIBUTE_VALUE)
    if outer is None:
        outer = node.parent
    combo = hours_txt
    if outer is not None:
        combo = outer.get_text(SPACE_SEP, strip=True)
    term = ""
    for mark, value in TERM_MAP:
        if mark in combo:
            term = value
            break
    return EmploymentOut(term=term, hours=hours)


def req_section(x: ReqIn) -> list:
    """requirements 区按 h4 标题取归属它的 ul(标准化词表,如「Manicurist's provincial licence」)。
    ul 须紧跟在该 h4 之后(find_previous 校验),防串到下一节。"""
    root = x.soup.select_one(SEL_REQUIREMENTS)
    if root is None:
        return []
    for heading in root.find_all(TAG_H4):
        if not heading.get_text(strip=True).startswith(x.heading):
            continue
        items = heading.find_next(TAG_UL)
        if items is None or items.find_previous(TAG_H4) is not heading:
            return []
        out = []
        for item in items.find_all(TAG_LI):
            out.append(WS_RE.sub(SPACE_SEP, item.get_text(SPACE_SEP, strip=True)))
        return out
    return []


def employer_website(soup: SoupNodeLike) -> str:
    """帖子把雇主名链到其官网:<span property="hiringOrganization">…<a class="external" href>。"""
    org = soup.select_one(SEL_HIRING_ORG)
    if org is None:
        return ""
    link = org.select_one(SEL_ORG_LINK)
    if link is None:
        return ""
    href = link.get(HREF_ATTR, "").strip()
    if not href.startswith(HTTP_PREFIX):
        return ""
    for official in OFFICIAL_DOMAINS:
        if official in href:
            return ""
    return href


def email_website(html: str) -> str:
    """没有官网链接时,从申请邮箱域名推官网(hr@apollophysio.ca → http://apollophysio.ca)。"""
    for domain in EMAIL_DOMAIN_RE.findall(html):
        low = domain.lower()
        if low in GENERIC_EMAIL:
            continue
        if has_skip_domain(low):
            continue
        return HTTP_SCHEME + low
    return ""


def has_skip_domain(domain: str) -> bool:
    """官方/自家域名不算雇主官网。"""
    for skip in EMAIL_SKIP_DOMAINS:
        if skip in domain:
            return True
    return False


def noc_of(soup: SoupNodeLike) -> str:
    """Job Bank 详情页每帖都标了官方 NOC(<span class="noc-no">NOC 72310</span>)→ 取 5 位码。"""
    node = soup.select_one(SEL_NOC_NO)
    if node is None:
        node = soup.select_one(SEL_NOC_NO_CLASS)
    if node is None:
        return ""
    m = NOC_CODE_RE.search(node.get_text())
    if m is None:
        return ""
    return m.group(1)


def write_detail_md(x: DetailMdIn) -> None:
    """写 processed/jobbank/details/<雇主_职位>.md(命名沿用旧 05b,advisor 与公司档按 url 匹配)。"""
    md = DETAIL_MD_TPL.format(title=x.job.get(K_TITLE, ""), employer=x.job.get(K_EMPLOYER, ""),
                              address=x.address, website=x.website, posted=x.posted,
                              salary=x.job.get(K_SALARY, ""), source=x.job.get(K_SOURCE, ""),
                              url=x.job.get(K_URL, ""), desc=x.desc)
    stem = stem_of(StemIn(employer=x.job.get(K_EMPLOYER, ""), title=x.job.get(K_TITLE, "")))
    name = STEM_FILE_TPL.format(stem=stem)
    if stem in x.seen:
        name = STEM_DUP_TPL.format(stem=stem, pid=pid_of(x.job))
    x.seen.add(stem)
    (OUT_DETAILS / name).write_text(md, encoding=ENC_UTF8)


def stem_of(x: StemIn) -> str:
    """可读文件名:<雇主>_<职位>(各自连字符,中间下划线分隔)。"""
    stem = (detail_slug(x.employer) + STEM_JOIN + detail_slug(x.title)).strip(STEM_JOIN)
    if stem == "":
        return STEM_FALLBACK
    return stem


def detail_slug(text: str) -> str:
    """单段 → 小写连字符,截断 50 字符(公司档那边用 60,两处历史取值不同,不强行拉平)。"""
    return SLUG_RE.sub(SLUG_DASH, (text or "").lower()).strip(SLUG_DASH)[:DETAIL_SLUG_MAX].strip(SLUG_DASH)


def write_enriched(jobs: list) -> None:
    """仅有变更才原子写回(temp + os.replace 同目录)。

    防御:长回填期间目录偶发不可用(bind-mount/并发抖动)→ 写回 FileNotFoundError
    崩整轮(2026-07-17 实测),故先 mkdir。
    """
    IN_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    tmp = IN_POSTINGS.with_suffix(SUFFIX_JSON_TMP)
    tmp.write_text(json.dumps(jobs, ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)
    os.replace(tmp, IN_POSTINGS)


def store_tally(jobs: list) -> DetailTally:
    """全库四个覆盖率计数(收尾那行用)。"""
    addrs = 0
    webs = 0
    emp = 0
    certs = 0
    for job in jobs:
        if job.get(K_ADDRESS):
            addrs += 1
        if job.get(K_WEBSITE):
            webs += 1
        if job.get(K_EMPLOYMENT_HOURS):
            emp += 1
        if job.get(K_CERTIFICATES):
            certs += 1
    return DetailTally(addrs=addrs, webs=webs, emp=emp, certs=certs)


# =========================================================================
# 6. 公司档构建(扁平 postings.json → 分省/市/雇主的公司目录;确定性、不联网)
# =========================================================================


def build_jobbank_companies() -> None:
    """本域步骤入口:把扁平 store 物化成 raw/jobbank/<省>/<市>/companies/<雇主>/。"""
    say(PRINT_COMPANIES_IN_TPL.format(postings=IN_POSTINGS))
    say(PRINT_COMPANIES_OUT_TPL.format(root=OUT_ROOT))
    posts = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
    index = detail_index()
    companies = 0
    jobs_written = 0
    for key, jobs in group_postings(posts).items():
        jobs_written += write_company(CompanyIn(prov=key[0], city=key[1], employer=key[2],
                                                jobs=jobs, index=index))
        companies += 1
    say(PRINT_COMPANIES_DONE_TPL.format(companies=companies, jobs=jobs_written, root=OUT_ROOT))


def group_postings(posts: list) -> dict:
    """按 (省, 市, 雇主) 分组(插入序即产出序)。"""
    groups: dict = {}
    for job in posts:
        key = (job.get(K_PROVINCE) or "", job.get(K_CITY) or "",
               job.get(K_EMPLOYER) or EMPLOYER_FALLBACK)
        if key not in groups:
            groups[key] = []
        groups[key].append(job)
    return groups


def detail_index() -> dict:
    """url → details/*.md 路径(.md frontmatter 带 url:),用于取职位描述。"""
    index: dict = {}
    if not IN_DETAILS.exists():
        return index
    for md in IN_DETAILS.glob(GLOB_MD):
        head = md.read_text(encoding=ENC_UTF8)[:MD_HEAD_LEN]
        m = URL_LINE_RE.search(head)
        if m is not None:
            index[m.group(1).strip()] = md
    return index


def write_company(x: CompanyIn) -> int:
    """一家公司一份档案:profile.json + jobs.json + jobs/<职位>.md;返回写了几份 .md。"""
    prov_dir = SLUG_FALLBACK
    if x.prov != "":
        prov_dir = slug_of(x.prov)
    prov_dir = PROV_FULL.get(x.prov.upper(), prov_dir)
    cdir = OUT_ROOT / prov_dir / slug_of(x.city) / DIR_COMPANIES / slug_of(x.employer)
    (cdir / DIR_JOBS).mkdir(parents=True, exist_ok=True)
    first = x.jobs[0]
    profile = {
        K_NAME: x.employer, K_SLUG: slug_of(x.employer), K_SOURCE: SOURCE_JOBBANK,
        K_PROVINCE: x.prov, K_CITY: x.city,
        K_WEBSITE: first_value(FieldIn(jobs=x.jobs, key=K_WEBSITE)),
        K_ADDRESS: first_value(FieldIn(jobs=x.jobs, key=K_ADDRESS)),
        K_EMAIL: first.get(K_EMAIL, ""), K_PHONE: first.get(K_PHONE, ""),
        K_DESCRIPTION: "",
        K_AIP: any_value(FieldIn(jobs=x.jobs, key=K_AIP)),
        K_JOB_COUNT: len(x.jobs),
    }
    (cdir / FILE_PROFILE).write_text(
        json.dumps(profile, ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)
    (cdir / FILE_JOBS).write_text(
        json.dumps({K_COMPANY: x.employer, K_COUNT: len(x.jobs), K_JOBS: x.jobs},
                   ensure_ascii=False, indent=JSON_INDENT), encoding=ENC_UTF8)
    seen: set = set()
    written = 0
    for job in x.jobs:
        desc = md_description(x.index.get((job.get(K_URL) or "").strip()))
        stem = slug_of(job.get(K_TITLE, JOB_STEM_FALLBACK))
        name = stem
        if stem in seen:
            name = MD_DUP_TPL.format(stem=stem, tail=dup_tail(DupIn(job=job, seen=seen)))
        seen.add(stem)
        (cdir / DIR_JOBS / MD_NAME_TPL.format(stem=name)).write_text(
            to_job_md(JobMdIn(job=job, desc=desc)), encoding=ENC_UTF8)
        written += 1
    return written


def slug_of(text: str) -> str:
    """公司/城市/职位 → 目录名 slug(小写、非字母数字折 -、截 60,空得兜 unknown)。"""
    slug = SLUG_RE.sub(SLUG_DASH, (text or "").lower()).strip(SLUG_DASH)[:COMPANY_SLUG_MAX]
    slug = slug.strip(SLUG_DASH)
    if slug == "":
        return SLUG_FALLBACK
    return slug


def first_value(x: FieldIn) -> str:
    """一组帖子里第一个非空的某格(官网/地址取最先给出的那份)。"""
    for job in x.jobs:
        value = job.get(x.key)
        if value:
            return value
    return ""


def any_value(x: FieldIn) -> bool:
    """一组帖子里有没有任何一帖的某格为真(aip 标记)。"""
    for job in x.jobs:
        if job.get(x.key):
            return True
    return False


def dup_tail(x: DupIn) -> str:
    """同名职位文件撞车时的后缀:帖号末 6 位,没帖号就用本轮序号。"""
    tail = (x.job.get(K_POSTING_ID) or "")[-PID_TAIL_LEN:]
    if tail == "":
        return str(len(x.seen))
    return tail


def md_description(md_path: object) -> str:
    """详情 .md 的正文(frontmatter 之后那段);没有就空串。"""
    if md_path is None:
        return ""
    path = cast(Path, md_path)
    if not path.exists():
        return ""
    body = path.read_text(encoding=ENC_UTF8)
    if FRONTMATTER_SEP not in body:
        return ""
    return body.split(FRONTMATTER_SEP, 1)[1].strip()


def to_job_md(x: JobMdIn) -> str:
    """公司档里的一份职位 .md(frontmatter 只写非空格 + 描述)。"""
    lines = []
    for key in PROFILE_KEYS:
        value = x.job.get(key, "")
        if value != "":
            lines.append(key + KV_SEP + str(value))
    return JOB_MD_TPL.format(fm=LINE_BREAK.join(lines), desc=x.desc)


# =========================================================================
# 7. 岗位质检(只读:把可疑的少数行挑出来,产 audit-flags.json)
# =========================================================================


def audit_jobbank_data() -> None:
    """本域步骤入口:一套校验规则覆盖全量,把可疑的少数行挑出来供人工复查。"""
    posts = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
    scored = load_scored()
    total = len(posts)
    flags: dict = {}
    seen_url: set = set()
    for job in posts:
        check_job(CheckIn(flags=flags, job=job, seen_url=seen_url))
    say(PRINT_AUDIT_HEAD_TPL.format(n=total))
    say(PRINT_AUDIT_DIST)
    say(PRINT_AUDIT_PROV_TPL.format(dist=dict(province_counter(posts).most_common())))
    cats = category_counter(CategoryIn(posts=posts, scored=scored))
    say(PRINT_AUDIT_TEER_TPL.format(dist=dict(sorted(cats.items()))))
    say(PRINT_AUDIT_UNCLASSIFIED_TPL.format(pct=cats.get(UNCLASSIFIED, 0) * PERCENT // total))
    say(PRINT_AUDIT_FLAGS_HEAD)
    flagged = 0
    for cat, rows in sorted(flags.items(), key=neg_len_of):
        flagged += len(rows)
        say(PRINT_AUDIT_CAT_TPL.format(cat=cat, n=len(rows), why=rows[0][K_WHY],
                                       employer=rows[0][K_EMPLOYER]))
    say(PRINT_AUDIT_TOTAL_TPL.format(total=flagged, n=total, pct=flagged * PERCENT // total))
    OUT_FLAGS.parent.mkdir(parents=True, exist_ok=True)
    OUT_FLAGS.write_text(json.dumps(flags, ensure_ascii=False, indent=JSON_INDENT),
                         encoding=ENC_UTF8)
    say(PRINT_AUDIT_OUT_TPL.format(out=OUT_FLAGS))


def load_scored() -> dict:
    """评分产物 → externalId → 行;文件缺了给空表(只影响 TEER 分布那一行)。"""
    if not IN_SCORED.exists():
        return {}
    scored = {}
    for row in json.loads(IN_SCORED.read_text(encoding=ENC_UTF8)):
        scored[row[K_EXTERNAL_ID]] = row
    return scored


def check_job(x: CheckIn) -> None:
    """一帖过全部质检规则(先几何一致性与 AIP,再薪资离群与完整性;顺序即报表分类的插入序)。"""
    check_geometry(x)
    check_quality(x)


def check_geometry(x: CheckIn) -> None:
    """几何一致性 + AIP:邮编 vs 省份、Ottawa 误判、区越界、AIP 越界。"""
    prov = (x.job.get(K_PROVINCE) or "").upper()
    fsa = fsa_of(x.job.get(K_CITY, "") + SPACE_SEP + (x.job.get(K_ADDRESS) or ""))
    if fsa != "":
        expected = POSTAL_PROV.get(fsa[0])
        if expected is not None and prov != "" and expected != prov:
            add_flag(FlagIn(flags=x.flags, category=CAT_POSTAL_MISMATCH, job=x.job,
                            why=WHY_POSTAL_TPL.format(fsa=fsa, expected=expected, prov=prov)))
    if x.job.get(K_CITY) == OTTAWA_CITY and fsa != "" and fsa[:2] not in OTTAWA_FSA_PREFIX:
        add_flag(FlagIn(flags=x.flags, category=CAT_OTTAWA_FALSE, job=x.job,
                        why=WHY_OTTAWA_TPL.format(fsa=fsa)))
    if x.job.get(K_DISTRICT) and prov != PROV_ON:
        add_flag(FlagIn(flags=x.flags, category=CAT_DISTRICT_OUT, job=x.job,
                        why=WHY_DISTRICT_TPL.format(district=x.job.get(K_DISTRICT), prov=prov)))
    if x.job.get(K_AIP) and prov not in ATLANTIC:
        add_flag(FlagIn(flags=x.flags, category=CAT_AIP_OUT, job=x.job,
                        why=WHY_AIP_TPL.format(prov=prov)))


def check_quality(x: CheckIn) -> None:
    """薪资离群 + 完整性 + 重复:年薪折算越界、省份缺失、市=省名、url 重复。"""
    prov = (x.job.get(K_PROVINCE) or "").upper()
    annual = x.job.get(K_SALARY_ANNUAL)
    if isinstance(annual, (int, float)):
        if annual < SALARY_MIN:
            add_flag(FlagIn(flags=x.flags, category=CAT_SALARY_LOW, job=x.job,
                            why=WHY_SALARY_LOW_TPL.format(amount=annual)))
        elif annual > SALARY_MAX:
            add_flag(FlagIn(flags=x.flags, category=CAT_SALARY_HIGH, job=x.job,
                            why=WHY_SALARY_HIGH_TPL.format(amount=annual)))
    if prov == "":
        add_flag(FlagIn(flags=x.flags, category=CAT_PROV_MISSING, job=x.job,
                        why=WHY_PROV_MISSING_TPL.format(city=x.job.get(K_CITY))))
    if (x.job.get(K_CITY) or "").strip().lower() in PROV_NAMES:
        add_flag(FlagIn(flags=x.flags, category=CAT_CITY_IS_PROV, job=x.job,
                        why=WHY_CITY_IS_PROV_TPL.format(city=x.job.get(K_CITY))))
    url = x.job.get(K_URL) or ""
    if url != "" and url in x.seen_url:
        add_flag(FlagIn(flags=x.flags, category=CAT_URL_DUP, job=x.job, why=WHY_URL_DUP))
    x.seen_url.add(url)


def fsa_of(text: str) -> str:
    """从「城市 地址」里认邮编前三位(FSA);认不出给空串。"""
    m = POSTAL_RE.search(text or "")
    if m is None:
        return ""
    return m.group(1).upper()


def add_flag(x: FlagIn) -> None:
    """记一行可疑(分类 → 行清单;行里带足复查要看的格)。"""
    if x.category not in x.flags:
        x.flags[x.category] = []
    x.flags[x.category].append(to_flag_row(FlagRowIn(job=x.job, why=x.why)))


def to_flag_row(x: FlagRowIn) -> dict:
    """帖子行 → 可疑行(只留复查要看的格,地址截断)。"""
    return {
        K_WHY: x.why, K_EMPLOYER: x.job.get(K_EMPLOYER), K_TITLE: x.job.get(K_TITLE),
        K_PROVINCE: x.job.get(K_PROVINCE), K_CITY: x.job.get(K_CITY),
        K_ADDRESS: (x.job.get(K_ADDRESS) or "")[:ADDRESS_CLIP],
        K_SALARY: x.job.get(K_SALARY), K_SALARY_ANNUAL: x.job.get(K_SALARY_ANNUAL),
        K_URL: x.job.get(K_URL),
    }


def province_counter(posts: list) -> Counter:
    """省份分布(缺省码的记 ?)。"""
    counter: Counter = Counter()
    for job in posts:
        counter[job.get(K_PROVINCE, MISSING_MARK)] += 1
    return counter


def category_counter(x: CategoryIn) -> Counter:
    """TEER 档位分布(按 url 对评分产物;对不上的记 ?)。"""
    counter: Counter = Counter()
    for job in x.posts:
        row = x.scored.get(job.get(K_URL) or "", {})
        counter[row.get(K_CATEGORY, MISSING_MARK)] += 1
    return counter


def neg_len_of(item: tuple) -> int:
    """可疑分类的排序键:行数多的在前。"""
    return -len(item[1])


# =========================================================================
# 8. 死岗验尸(逐帖验尸判死,累积 expired_ids.json;判死名单 mart 一手剔表一手下发)
# =========================================================================


def verify_jobbank_expired() -> None:
    """本域步骤入口:按死亡风险排序,每轮小批验尸,判死结果累积落盘。"""
    now = datetime.now(timezone.utc)
    state = load_state()
    postings = json.loads(IN_POSTINGS.read_text(encoding=ENC_UTF8))
    on_board = load_on_board()
    picked = candidates_of(CandidateIn(postings=postings, state=state, on_board=on_board,
                                       now=now))
    budget = int(os.environ.get(ENV_VERIFY_MAX, VERIFY_MAX_DEFAULT))
    say(PRINT_VERIFY_HEAD_TPL.format(cands=len(picked.cands), off_board=picked.off_board,
                                     fresh=picked.fresh,
                                     budget=min(len(picked.cands), budget)))
    if len(picked.cands) == 0:
        return
    out = verify_batch(VerifyIn(cands=picked.cands[:budget], state=state, now=now))
    tmp = OUT_STATE.with_suffix(SUFFIX_TMP)
    tmp.write_text(json.dumps(state, ensure_ascii=False), encoding=ENC_UTF8)
    tmp.replace(OUT_STATE)
    say(PRINT_VERIFY_DONE_TPL.format(dead=out.dead, alive=out.alive, errs=out.errs,
                                     total=len(state[K_DEAD])))


def load_state() -> dict:
    """判死/验活名单(首跑给空壳)。"""
    if not OUT_STATE.exists():
        return {K_DEAD: {}, K_CHECKED: {}}
    return json.loads(OUT_STATE.read_text(encoding=ENC_UTF8))


def load_on_board() -> set | None:
    """09 上一轮落的「还在板上」帖号;文件缺 = 首跑,退回全验(None)。"""
    if not IN_MART_OPEN_IDS.exists():
        return None
    return set(json.loads(IN_MART_OPEN_IDS.read_text(encoding=ENC_UTF8)))


def candidates_of(x: CandidateIn) -> CandidateOut:
    """挑本轮该验的帖并按死亡风险排序。

    候选:全部 jobbank 帖(不再限发布龄),未判死过,距上次检查>RECHECK_DAYS,且还在板上
    (不在板上的两种帖 —— 库里早已 closed、或被 09 的同名去重丢掉 —— 用户根本点不到,
    验它们等于把预算和 Job Bank 的带宽一起烧掉;实测不筛的话候选里 26% 是这种,
    队头 900 个中 216 个白验。名单晚一轮无妨:新帖最不可能是死的)。
    风险键:last_seen 越旧越先验(实测:陈旧>14天 52% 死 / ≤3天 9% 死;缺 last_seen 的是
    早期帖,一并排最前);同龄按发布日老的先。
    """
    recheck_before = (x.now - timedelta(days=RECHECK_DAYS)).isoformat()
    fresh_after = (x.now - timedelta(days=VERIFY_FRESH_DAYS)).isoformat()
    off_board = 0
    fresh = 0
    cands = []
    for job in x.postings:
        pid = job.get(K_POSTING_ID, "")
        url = job.get(K_URL, "")
        if pid == "" or VERIFY_HOST not in url or pid in x.state[K_DEAD]:
            continue
        if x.state[K_CHECKED].get(pid, "") > recheck_before:
            continue
        if x.on_board is not None and pid not in x.on_board:
            off_board += 1
            continue
        last_seen = job.get(K_LAST_SEEN) or ""
        posted = expired_date_of(job.get(K_DATE, ""))
        posted_key = ""
        if posted is not None:
            posted_key = posted.isoformat()
        if last_seen > fresh_after:
            fresh += 1
        cands.append(((last_seen, posted_key), pid, url))
    cands.sort()
    return CandidateOut(cands=cands, off_board=off_board, fresh=fresh)


def expired_date_of(text: str) -> datetime | None:
    """发布日两种写法(列表页原文 / ISO)→ UTC datetime;解析不了给 None。"""
    value = (text or "").strip()
    for fmt in VERIFY_DATE_FMTS:
        head = value
        if fmt == ISO_DATE_FMT:
            head = value[:10]
        try:
            return datetime.strptime(head, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def verify_batch(x: VerifyIn) -> VerifyOut:
    """逐帖验尸:410/404 或 <title> 含过期标记 = 判死;网络错误保留活口,下轮再验。"""
    dead = 0
    alive = 0
    errs = 0
    sleep_s = float(os.environ.get(ENV_VERIFY_SLEEP, VERIFY_SLEEP_DEFAULT))
    with httpx.Client(headers={HDR_UA: VERIFY_UA}, timeout=VERIFY_TIMEOUT_S,
                      follow_redirects=True) as client:
        for _key, pid, url in x.cands:
            try:
                r = client.get(url)
            except Exception as e:  # noqa: BLE001 — 网络抖动=保留活口,下轮再验
                err(url, e)
                errs += 1
                time.sleep(sleep_s)
                continue
            if r.status_code in VERIFY_DEAD_CODES or VERIFY_MARKER in r.text[:VERIFY_HEAD_BYTES]:
                x.state[K_DEAD][pid] = x.now.isoformat()
                dead += 1
            else:
                x.state[K_CHECKED][pid] = x.now.isoformat()
                alive += 1
            time.sleep(sleep_s)
    return VerifyOut(dead=dead, alive=alive, errs=errs)
