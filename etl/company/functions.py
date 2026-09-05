"""
company 域函数 —— 全部行为住这(三件套形制**全站样张**,2026-08-30 Frank 连环拍板,
方言律全集见 docs/design/etl分域-20260829.md §4)。

四个步骤文件溶入本文件成四段,各段入口函数与原脚本同名(入口一律零参)。
2026-08-31 **批J**(clean/ 目录退役,「谁的数据谁清洗」归户)再溶一件成第 6 段:
clean/_enrich_company_facts.py → 雇主 D 富化(enrich_company_facts)。判据 = 逐公司抓数据
是公司域的活;下划线私件名随溶解消失,只进 TOOLS 不进默认链(手动件)。
**零字符串令(终形)**:边界行形状全 pydantic(Frank「有这个优势可以用」:校验/默认/
别名兜底进 scheme,五只手写 to_* 退役,进域 model_validate、出域 model_dump);
wire 词(头名/查询参数/属性名)用 constants 的 HDR_/P_ 词族;文案全 *_TPL 模板。
**显式循环令**:禁推导/genexp/lambda;**内嵌禁令**:内部函数出户成顶层具名函数;
**一参令**:函数至多一参,多入参收 scheme 的 XxxIn dataclass。
库类型经 scheme 的 Protocol(HttpClientLike/TagLike),cast 只住装配点。
依赖单边:本文件 → constants/scheme + 基础设施叶子(paths)。
"""
import html as html_lib
import json
import os
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import cast
from urllib.parse import parse_qs, unquote, urljoin, urlparse

from bs4 import BeautifulSoup

import paths
from log.functions import err, say
from crawl.functions import get_cached_page, is_challenge_html, put_cached_page
from crawl.scheme import CachePutIn
from fetch.functions import make_client, make_polite_client
from company.constants import (
    ACT_GET_ENTITIES, ACT_SEARCH, ALIAS_SPLIT_RE, ATS_HOSTS, CAND_MIN_JOBS, CAND_MIN_LMIA_SKILLED,
    CAREERS_FILE, CAREERS_PATH_RE, CAREERS_RE, CAREERS_STEM_SUFFIX, CAREERS_TIMEOUT_S,
    CAREERS_WORKERS, COL_TRIM_CHARS, COMMON_CAREER_PATHS, DDG_GUARD_N, DDG_HTML_URL, DDG_QUERY_TPL,
    DDG_REDIRECT_PARAM, DDG_RESULT_RE, DDG_SCAN_N, DDG_TIMEOUT_S, DESC_LEN_MAX, DESC_P_MIN_LEN,
    DOT_SEP, EMAIL_DOMAIN_RE, ENRICH_LIMIT, ENRICH_MIN_INTERVAL_S, ENRICH_REFRESH_DAYS,
    FACTS_COMMA, FACTS_INDENT, FACTS_SUFFIX_RE, FACTS_TICK, FETCH_SLEEP_S, FETCH_TIMEOUT_S,
    FIND_CLIENT_TIMEOUT_S, FIND_LIMIT, FIND_SLEEP_S, FORMAT_JSON, FOUND_JD, FOUND_SEARCHED,
    GENERIC_MAIL, GOV_DOMAIN_SUFFIX, GUARD_TIMEOUT_S, HDR_REFERER, HDR_USER_AGENT, HREF_ATTR,
    HTML_PARSER, HTTPS_PREFIX, ID_SEP, IN_CAREERS_DIRECTORY, IN_ENRICH_ATS, IN_ENRICH_JD_DETAILS,
    IN_ENRICH_POSTINGS, IN_FACTS_COMPANIES, IN_FACTS_JOBS, IN_FOLDERS_CAREERS,
    IN_FOLDERS_DIRECTORY, INDEX_FILE, ISO_UTC_OFFSET, ISO_Z, JD_HEAD_LEN, JD_URL_LINE_RE,
    KANATA_ADDR_SEL, KANATA_AJAX_ACTION, KANATA_AJAX_URL, KANATA_CARD_SEL, KANATA_COL_SEL,
    KANATA_DESC_SEL, KANATA_LBL_EMAIL, KANATA_LBL_LOCATION, KANATA_LBL_PHONE, KANATA_LBL_WEBSITE,
    KANATA_NAME_SEL, KANATA_PAGE_FIRST, KANATA_PAGE_SIZE, KANATA_REFERER, KANATA_REGION_LABEL,
    KANATA_STEM, KANATA_TERMS_SEL, KANATA_TIMEOUT_S, KEYWORDS_SPLIT_SEP, KEYWORDS_TOP_N, K_ALIASES,
    K_BROAD, K_BY_NAME, K_BY_SLUG, K_COMPANY_SLUG, K_ENTITIES, K_ENWIKI, K_ID, K_KO, K_LABELS,
    K_LMIA_POSITIONS_SKILLED, K_NAME, K_SEARCH, K_SITELINKS, K_SLUG, K_STATUS, K_TITLE, K_VALUE,
    K_WIKI, K_WIKI_CHECKED, K_ZH, LANG_EN, LANG_KO, LANG_ZH, LINK_TAG, LIST_JOIN_SEP, MD_GLOB,
    META_DESC_PATTERNS, META_KEYWORDS_PATTERNS, NAME_STOP, NAME_TOKEN_RE, NONALNUM_RE,
    NOT_OFFICIAL, NOTE_HTTP_TPL, NOTE_NO_CAREERS, NOTE_NO_META, OUT_ENRICH_CACHE, OUT_FACTS,
    OUT_FOLDERS_ROOT, OUT_KANATA_DIR, PRINT_FACTS_CANDS_TPL, PRINT_FACTS_DONE_TPL,
    PRINT_FACTS_INDUSTRY_TPL, PRINT_FACTS_IN_TPL, PRINT_FACTS_TICK_TPL, P_ACTION, P_FORMAT, P_IDS,
    P_LANGUAGE, P_LANGUAGES, P_LIMIT, P_PAGED, P_PAGE_SIZE, P_PROPS, P_QUERY, P_SEARCH, P_TAG_RE,
    PORT_SEP, PRINT_ATS_DIST_LABEL, PRINT_CAREERS_DONE_TPL, PRINT_CAREERS_RESOLVING_TPL,
    PRINT_ENRICH_DONE_TPL, PRINT_ENRICH_IN_TPL, PRINT_ENRICH_SKIP_TPL, PRINT_FIND_TPL,
    PRINT_FOLDERS_TPL, PRINT_KANATA_TPL, PRINT_TARGETS_TPL, PROFILE_FILE, P_TYPE, QUERY_MARK,
    READ_ERRORS, RETRY_FAILED_DAYS, RETRY_NOSITE_DAYS, SCHEME_PREFIX, SITE_NAME_RE, SLUG_DASH,
    SLUG_DUP_TPL, SLUG_FALLBACK, SLUG_LEN_MAX, SLUG_RE, STATUS_CLOSED, STATUS_OPEN, ST_FAIL,
    ST_FOUND, ST_NOSITE, ST_OK, STATUS_ERR_TPL, SUFFIX_JSON, TAG_STRIP_RE, TECH_TERMS,
    TEXT_ENCODING, TEXT_JOIN_SEP, TITLE_RE, TITLE_SNIFF_LEN, TYPE_ITEM, UNCLASSIFIED,
    URL_DEFAULT_SCHEME, URL_DOMAIN_RE, URL_ROOT_TPL, WD_API_URL, WD_LANGUAGES, WD_PROPS,
    WD_SEARCH_LIMIT, WD_SLEEP_S, WD_TIMEOUT_S, WD_UA, WIKI_CHECKED_MARK, WIKI_SPACE,
    WIKI_UNDERSCORE, WIKI_URL_PREFIX, WS_FOLD_RE, WWW_PREFIX,
    ENV_PLACES_KEY, HDR_API_KEY, HDR_FIELD_MASK, IN_PLACES_COMPANIES, IN_PLACES_JOBS, NOTE_NO_KEY,
    OUT_PLACES, PLACES_LANG, PLACES_LIMIT, PLACES_PAGE_SIZE,
    PLACES_QUERY_TPL, PLACES_REFRESH_DAYS, PLACES_REGION, PLACES_SLEEP_S, PLACES_TIMEOUT_S,
    PLACES_URL, PRINT_PLACES_DONE_TPL, PRINT_PLACES_IN_TPL, PRINT_PLACES_ROW_TPL,
    PRINT_PLACES_TARGETS_TPL, P_LANGUAGE_CODE, P_PAGE_SIZE_PLACES, P_REGION_CODE, P_TEXT_QUERY,
    PRINT_SITES_DONE_TPL, PRINT_SITES_TARGETS_TPL, SITES_LIMIT, ST_HIT, ST_MISS,
    ABOUT_LIMIT, ABOUT_RE, ABOUT_REFRESH_DAYS, ABOUT_SLEEP_S, ABOUT_TEXT_MAX, ABOUT_TEXT_MIN,
    ABOUT_TIMEOUT_S, BRIEF_LIMIT, BRIEF_MARKS, BRIEF_PROMPT_TPL, BRIEF_TOKENS, BRIEF_ZH_PROMPT_TPL,
    BRIEF_ZH_TOKENS, CRAWL_SLUG_COMPANIES, ENV_LLM_BASE, ENV_LLM_MODEL, HOME_TEXT_MAX, IN_ABOUT_ENRICH,
    LLM_MODEL_DEFAULT, LLM_TEMPERATURE, LLM_TIMEOUT_S, NOTE_CHALLENGE, NOTE_MARKERS,
    NOTE_NO_LLM, NOTE_NO_TEXT, NOTE_ZH_MARKERS, NOT_FOUND, OUT_ABOUT, OUT_BRIEF, PAGE_SEP,
    PATH_OLLAMA_GENERATE, PRINT_ABOUT_DONE_TPL, PRINT_ABOUT_ROW_TPL, PRINT_ABOUT_TARGETS_TPL,
    PRINT_BRIEF_DONE_TPL, PRINT_BRIEF_ROW_TPL, PRINT_BRIEF_TARGETS_TPL, P_MODEL, P_NUM_PREDICT, P_OPTIONS,
    NEWLINE, P_PROMPT, P_RESPONSE, P_STREAM, P_TEMPERATURE, P_THINK, STRIP_TAGS, THINK_RE, URL_TAIL_SLASH,
    DDG_BACKOFF_S, DDG_FAIL_STOP, DDG_NO_RESULTS_MARK, FIND_FLUSH_N, MARK_COLON_RE, MARK_SPACE, PATH_SEP, PRINT_DDG_STOP_TPL,
    PRINT_FIND_ROW_TPL, K_LOCALITY, K_PROVINCE, MONTH_LEN, PLACES_MASK_ENT, PLACES_MASK_PRO,
    PLACES_MONTH_FREE_ENT, PLACES_MONTH_FREE_PRO, PLACES_MONTH_RESERVE, PRINT_PLACES_BUDGET_TPL, TIER_ENT, TIER_PRO,
    JSON_INDENT, PLACES_CACHE_URL_TPL, COUNTRY_CA, K_COUNTRY, NOTE_OUTSIDE_CA, TEER_SKILLED,
)
from company.scheme import (
    CandsIn, CardColIn, CareerScanRow, CareersFileRow, CareersProbe, CompanyRow, DdgFindIn,
    EnrichRecord, EntityIn, FactsIndustryOut, FetchProfileIn, FetchTextIn, FindWebsitesIn,
    GuardMatchIn, HttpClientLike, IndexRow, MetaOut, MetaScanIn, NositeLead, PickTodoIn,
    MartJob, PickPlacesIn, PlaceCompany, PlaceRecord, PlacesCandsIn, PlacesEnvelope, PlacesSearchIn,
    PlaceTarget, PostingLead, ProbeIn, ProfileRow, SaveFactsIn, SiteLead, SkipFindIn, SkipPlacesIn,
    TagLike, ToPlaceIn, WikiProbe, WpEnvelope,
    AboutFetchIn, AboutLinkIn, AboutRecord, AboutTarget, BriefOneIn, BriefRecord, DdgLoopIn, DdgOut,
    JobCounts, LlmCallIn, LlmCfg, MonthUsage, PageIn, PageOut, PageTextIn, PickAboutIn, PickBriefIn,
)

# =========================================================================
# 1. 共享词汇(≥2 段消费才住这段;2026-08-30 收拢现场:slugify 两份、is_tech 两份
#    连判据表都各抄一份且已漂移 —— 行为复制=口径开岔的活证据)
# =========================================================================


def slugify(s: str) -> str:
    """公司名 → 文件夹/键用 slug(小写、非字母数字折 -、截 60,空得兜 company)。

    2026-08-30 收拢:取 enrich 版(防 None 更稳);folders 版先截后 strip 的细节差
    在真实公司名上无行为差(两版对全部 520 个现存公司名重算比对同值)。
    """
    return SLUG_RE.sub(SLUG_DASH, (s or "").lower()).strip(SLUG_DASH)[:SLUG_LEN_MAX] or SLUG_FALLBACK


def is_tech(c: CompanyRow) -> bool:
    """按行业标签+简介判「算不算科技公司」(粗筛,判据表=constants.TECH_TERMS 唯一来源)。"""
    blob = (c.sectors + TEXT_JOIN_SEP + c.description).lower()
    for t in TECH_TERMS:
        if t in blob:
            return True
    return False


# =========================================================================
# 2. Kanata 目录抓取(Stage 1:雇主全集种子;休眠引导工具,手动 main --only kanata)
# =========================================================================


def card_col(x: CardColIn) -> str:
    """卡片明细列的「Label: value」取值(原内嵌函数 col,2026-08-30 内嵌禁令出户)。"""
    for d in x.card.select(KANATA_COL_SEL):
        txt = WS_FOLD_RE.sub(TEXT_JOIN_SEP, d.get_text(TEXT_JOIN_SEP, strip=True))
        if txt.lower().startswith(x.label.lower()):
            return txt[len(x.label):].strip(COL_TRIM_CHARS)
    return ""


def card_company_row(card: TagLike) -> CompanyRow:
    """一张会员卡片 → CompanyRow(HTML 解析版行构造器;json 版见 to_company_row)。"""
    name = card.select_one(KANATA_NAME_SEL)
    desc = card.select_one(KANATA_DESC_SEL)
    terms = card.select_one(KANATA_TERMS_SEL)
    addr = card.select_one(KANATA_ADDR_SEL)
    return CompanyRow(
        name=name.get_text(strip=True) if name else "",
        website=card_col(CardColIn(card=card, label=KANATA_LBL_WEBSITE)),
        email=card_col(CardColIn(card=card, label=KANATA_LBL_EMAIL)),
        phone=card_col(CardColIn(card=card, label=KANATA_LBL_PHONE)),
        address=card_col(CardColIn(card=card, label=KANATA_LBL_LOCATION))
        or (addr.get_text(strip=True) if addr else ""),
        sectors=WS_FOLD_RE.sub(TEXT_JOIN_SEP, terms.get_text(LIST_JOIN_SEP, strip=True)) if terms else "",
        description=WS_FOLD_RE.sub(TEXT_JOIN_SEP, desc.get_text(TEXT_JOIN_SEP, strip=True)) if desc else "",
        careers_page="",
        region=KANATA_REGION_LABEL,
    )


def fetch_kanata_companies() -> list[CompanyRow]:
    """逆向直取 Kanata North BA 会员目录(免浏览器)。

    页面前端渲染,但数据从主题的 WordPress AJAX 一次可全量取回,
    每家公司一张卡片,解析九格;有名字的才收。
    """
    with make_client(timeout=KANATA_TIMEOUT_S) as c:
        r = c.get(KANATA_AJAX_URL, params={P_ACTION: KANATA_AJAX_ACTION,
                                           P_PAGED: KANATA_PAGE_FIRST,
                                           P_PAGE_SIZE: KANATA_PAGE_SIZE},
                  headers={HDR_REFERER: KANATA_REFERER})
        r.raise_for_status()
        payload = r.json()
    posts = WpEnvelope.model_validate(payload).data.posts
    if isinstance(posts, list):
        doc = ""
        for piece in posts:
            doc += piece
    else:
        doc = posts
    soup = cast(TagLike, BeautifulSoup(doc, HTML_PARSER))
    rows: list[CompanyRow] = []
    for card in soup.select(KANATA_CARD_SEL):
        row = card_company_row(card)
        if row.name:
            rows.append(row)
    return rows


def scrape_kanata_directory() -> None:
    """Kanata 目录抓取入口:抓全量会员 → 落 kanata-north.json(唯一产出,csv/md 已退役)。"""
    rows = fetch_kanata_companies()
    OUT_KANATA_DIR.mkdir(parents=True, exist_ok=True)
    out = []
    tech_n = 0
    for r in rows:
        out.append(r.model_dump())
        if is_tech(r):
            tech_n += 1
    paths.write_json(paths.WriteJsonIn(path=(OUT_KANATA_DIR / KANATA_STEM).with_suffix(SUFFIX_JSON), payload=out, indent=2))
    say(PRINT_KANATA_TPL.format(n=len(rows), tech=tech_n, out=OUT_KANATA_DIR / KANATA_STEM))


# =========================================================================
# 3. 一司一档(Stage 1.5:扁平目录 → processed/ats/<slug>/;休眠引导工具)
# =========================================================================


def build_company_folders() -> None:
    """一司一档入口:profile.json(+careers.json)+ _index.json。

    每家公司一个文件夹,后续阶段往同一夹里累积;slug 撞名挂序号消歧。
    """
    companies = json.loads(IN_FOLDERS_DIRECTORY.read_text(encoding=TEXT_ENCODING))
    careers_by_name: dict[str, CareerScanRow] = {}
    if IN_FOLDERS_CAREERS.exists():
        for d in json.loads(IN_FOLDERS_CAREERS.read_text(encoding=TEXT_ENCODING)):
            scan = CareerScanRow.model_validate(d)
            careers_by_name[scan.name.lower()] = scan
    OUT_FOLDERS_ROOT.mkdir(parents=True, exist_ok=True)
    seen: dict[str, int] = {}
    made = careers_written = 0
    index = []
    for d in companies:
        row = CompanyRow.model_validate(d)
        if not row.name:
            continue
        slug = slugify(row.name)
        if slug in seen:
            seen[slug] += 1
            slug = SLUG_DUP_TPL.format(slug=slug, n=seen[slug])
        else:
            seen[slug] = 0
        folder = OUT_FOLDERS_ROOT / slug
        folder.mkdir(parents=True, exist_ok=True)
        profile = ProfileRow(name=row.name, slug=slug, region=row.region,
                             website=row.website, email=row.email, phone=row.phone,
                             sectors=row.sectors, address=row.address,
                             description=row.description)
        paths.write_json(paths.WriteJsonIn(path=folder / PROFILE_FILE, payload=profile.model_dump(), indent=2))
        made += 1
        scan = careers_by_name.get(row.name.lower())
        if scan and (scan.careers_url or scan.ats):
            paths.write_json(paths.WriteJsonIn(path=folder / CAREERS_FILE, payload=CareersFileRow(careers_url=scan.careers_url,
                                             ats=scan.ats, status=scan.status).model_dump(), indent=2))
            careers_written += 1
        index.append(IndexRow(slug=slug, name=row.name, website=row.website,
                             has_careers=bool(scan and scan.careers_url)).model_dump())
    paths.write_json(paths.WriteJsonIn(path=OUT_FOLDERS_ROOT / INDEX_FILE, payload=index, indent=2))
    say(PRINT_FOLDERS_TPL.format(region=KANATA_REGION_LABEL, made=made,
                                 careers=careers_written, root=OUT_FOLDERS_ROOT))


# =========================================================================
# 4. careers 页定位(Stage 2:进官网找招聘页+识别 ATS;休眠引导工具)
# =========================================================================


def detect_ats(page: str) -> str:
    """页面 HTML 里认 ATS 平台(命中返回平台短名,没有为空串)。"""
    low = page.lower()
    for a in ATS_HOSTS:
        if a in low:
            return a.split(DOT_SEP)[0]
    return ""


def fetch_text(x: FetchTextIn) -> str:
    """静默取页面文本(探路用:任何失败都返回空串不抛 —— 探路失败是常态不是异常)。"""
    try:
        r = x.client.get(x.url)
        if x.want_status and r.status_code >= 400:
            return ""
        return r.text
    except Exception as e:  # noqa: BLE001
        err(x.url, e)
        return ""


def find_careers(website: str) -> CareersProbe:
    """单个公司官网 → 招聘页 URL + ATS 识别。

    先扫首页链接(直指 ATS 的最优,career/jobs 路径次之),没有再逐个探常见路径;
    全程第一方官网,不碰聚合站。
    """
    out = CareersProbe()
    try:
        with make_client(timeout=CAREERS_TIMEOUT_S) as c:
            r = c.get(website)
            out.status = str(r.status_code)
            page = r.text
            out.ats = detect_ats(page)
            soup = cast(TagLike, BeautifulSoup(page, HTML_PARSER))
            best = ""
            for a in soup.find_all(LINK_TAG, href=True):
                href, text = str(a[HREF_ATTR]), a.get_text(TEXT_JOIN_SEP, strip=True)
                if detect_ats(href):
                    best = href
                    break
                if CAREERS_RE.search(href) or CAREERS_RE.search(text or ""):
                    cand = urljoin(website, href)
                    if CAREERS_PATH_RE.search(href):
                        best = cand
                        break
                    best = best or cand
            if best:
                out.careers_url = best
                if not out.ats:
                    out.ats = detect_ats(fetch_text(FetchTextIn(client=cast(HttpClientLike, c), url=best)))
                return out
            root = URL_ROOT_TPL.format(scheme=urlparse(str(r.url)).scheme,
                                       netloc=urlparse(str(r.url)).netloc)
            for p in COMMON_CAREER_PATHS:
                u = root + p
                hh = fetch_text(FetchTextIn(client=cast(HttpClientLike, c), url=u, want_status=True))
                if hh:
                    out.careers_url = u
                    out.ats = detect_ats(hh) or out.ats
                    return out
            out.note = NOTE_NO_CAREERS
    except Exception as e:  # noqa: BLE001
        out.status = STATUS_ERR_TPL.format(name=type(e).__name__)
        err(website, e)
    return out


def careers_order_of(r: CareerScanRow) -> tuple:
    """careers 结果排序键:有 ATS 的在前 → 有 careers 页的在前 → 名字典序(lambda 退役)。"""
    return (r.ats == "", not r.careers_url, r.name.lower())


def scrape_company_careers() -> None:
    """careers 定位入口:目录内 tech 公司并发探官网 → 落 -careers.json。"""
    targets: list[CompanyRow] = []
    for d in json.loads(IN_CAREERS_DIRECTORY.read_text(encoding=TEXT_ENCODING)):
        row = CompanyRow.model_validate(d)
        if row.website and is_tech(row):
            targets.append(row)
    say(PRINT_CAREERS_RESOLVING_TPL.format(n=len(targets), workers=CAREERS_WORKERS))
    results: list[CareerScanRow] = []
    with ThreadPoolExecutor(max_workers=CAREERS_WORKERS) as ex:
        futs = {}
        for row in targets:
            futs[ex.submit(find_careers, row.website)] = row
        for fut in as_completed(futs):
            row = futs[fut]
            probe = fut.result()
            results.append(CareerScanRow(name=row.name, website=row.website,
                                         sectors=row.sectors, email=row.email,
                                         careers_url=probe.careers_url, ats=probe.ats,
                                         status=probe.status, note=probe.note))
    results.sort(key=careers_order_of)
    stem = IN_CAREERS_DIRECTORY.with_name(IN_CAREERS_DIRECTORY.stem + CAREERS_STEM_SUFFIX)
    out = []
    ats_dist: dict = {}
    found_n = 0
    ats_n = 0
    for r in results:
        out.append(r.model_dump())
        if r.careers_url:
            found_n += 1
        if r.ats:
            ats_n += 1
            ats_dist[r.ats] = ats_dist.get(r.ats, 0) + 1
    paths.write_json(paths.WriteJsonIn(path=stem.with_suffix(SUFFIX_JSON), payload=out, indent=2))
    say(PRINT_CAREERS_DONE_TPL.format(found=found_n, n=len(results),
                                        ats=ats_n, out=stem.with_suffix(SUFFIX_JSON)))
    say(PRINT_ATS_DIST_LABEL + str(ats_dist))


# =========================================================================
# 5. 官网富化(E8-04 / D1=B + D2 找官网阶梯;唯一定时段 —— main 默认链只有它)
# =========================================================================


def name_tokens(name: str) -> list[str]:
    """公司名 → 显著 token(去 o/a、dba 别名段与后缀/泛词/短词),供域名/标题匹配。"""
    s = ALIAS_SPLIT_RE.split((name or "").lower())[0]
    toks = []
    for t in NAME_TOKEN_RE.findall(s):
        if t not in NAME_STOP:
            toks.append(t)
    return toks


def domain_of(url_or_domain: str) -> str:
    """URL 或裸域 → 归一化裸域(去 www.、去端口)。"""
    s = (url_or_domain or "").strip().lower()
    netloc = urlparse(s if s.startswith(SCHEME_PREFIX) else URL_DEFAULT_SCHEME + s).netloc or s
    return netloc.split(PORT_SEP)[0].removeprefix(WWW_PREFIX)


def is_blocked_domain(dom: str) -> bool:
    """聚合站/社交/黄页/通用邮箱域/gc.ca —— 绝不是「官网」。"""
    for b in NOT_OFFICIAL | GENERIC_MAIL:
        if dom == b or dom.endswith(DOT_SEP + b):
            return True
    return dom.endswith(GOV_DOMAIN_SUFFIX)


def guard_match(x: GuardMatchIn) -> bool:
    """护栏:域名(或首页 title/og:site_name)与公司名对得上才算官网。

    宁缺勿错 —— 错认官网 → 写错简介,比没有简介伤害大。
    """
    toks = name_tokens(x.name)
    if not toks or is_blocked_domain(x.dom):
        return False
    core = NONALNUM_RE.sub("", DOT_SEP.join(x.dom.split(DOT_SEP)[:-1]))
    hits = 0
    for t in toks:
        if t in core:
            hits += 1
    need = 1 if len(toks) == 1 else 2
    initials = ""
    for t in toks:
        initials += t[0]
    if hits >= need or (len(toks) >= 2 and initials == core):
        return True
    try:
        r = x.client.get(HTTPS_PREFIX + x.dom, timeout=GUARD_TIMEOUT_S)
        head = r.text[:TITLE_SNIFF_LEN].lower()
        m = TITLE_RE.search(head)
        site = SITE_NAME_RE.search(head)
        text = (m.group(1) if m else "") + TEXT_JOIN_SEP + (site.group(1) if site else "")
        text_hits = 0
        for t in toks:
            if t in text:
                text_hits += 1
        return text_hits >= max(1, (len(toks) + 1) // 2)
    except Exception as e:  # noqa: BLE001
        err(x.dom, e)
        return False


def jd_domain_hints() -> dict[str, set[str]]:
    """找官网①:posting url → 已抓 JD .md → 正文里的邮箱/链接域名。"""
    if not IN_ENRICH_JD_DETAILS.exists() or not IN_ENRICH_POSTINGS.exists():
        return {}
    url2md: dict[str, Path] = {}
    for p in IN_ENRICH_JD_DETAILS.rglob(MD_GLOB):
        try:
            m = JD_URL_LINE_RE.search(p.read_text(encoding=TEXT_ENCODING, errors=READ_ERRORS)[:JD_HEAD_LEN])
        except Exception as e:  # noqa: BLE001, S112
            err(p, e)
            continue
        if m:
            url2md.setdefault(m.group(1).strip(), p)
    hints: dict[str, set[str]] = {}
    for j in json.loads(IN_ENRICH_POSTINGS.read_text(encoding=TEXT_ENCODING)):
        lead = PostingLead.model_validate(j)
        if lead.website or not lead.employer:
            continue
        p = url2md.get(lead.url)
        if not p:
            continue
        try:
            body = p.read_text(encoding=TEXT_ENCODING, errors=READ_ERRORS)
        except Exception as e:  # noqa: BLE001, S112
            err(p, e)
            continue
        doms: set[str] = set()
        for d in EMAIL_DOMAIN_RE.findall(body) + URL_DOMAIN_RE.findall(body):
            dom = domain_of(d)
            if dom and not is_blocked_domain(dom):
                doms.add(dom)
        if doms:
            hints.setdefault(slugify(lead.employer), set()).update(doms)
    return hints


def ddg_find(x: DdgFindIn) -> DdgOut:
    """找官网②:DDG HTML 搜索兜底,前几个非聚合域逐个过护栏(含首页标题复核)。

    传输失败(异常/非 2xx)回 failed=True —— 调用方不得记 nosite(2026-09-05 限流实撞)。
    """
    try:
        query = DDG_QUERY_TPL.format(name=x.name, province=x.province)
        r = x.client.get(DDG_HTML_URL, params={P_QUERY: query}, timeout=DDG_TIMEOUT_S)
        if not r.is_success:
            return DdgOut(site="", failed=True)
    except Exception as e:  # noqa: BLE001
        err(x.name, e)
        return DdgOut(site="", failed=True)
    hrefs = DDG_RESULT_RE.findall(r.text)
    if len(hrefs) == 0 and DDG_NO_RESULTS_MARK not in r.text:
        return DdgOut(site="", failed=True)
    seen: list[str] = []
    for href in hrefs[:DDG_SCAN_N]:
        target = href
        if DDG_REDIRECT_PARAM in href:
            target = unquote(parse_qs(urlparse(href).query).get(DDG_REDIRECT_PARAM, [""])[0])
        dom = domain_of(target)
        if dom and dom not in seen and not is_blocked_domain(dom):
            seen.append(dom)
    for dom in seen[:DDG_GUARD_N]:
        if guard_match(GuardMatchIn(client=x.client, name=x.name, dom=dom)):
            return DdgOut(site=HTTPS_PREFIX + dom, failed=False)
    return DdgOut(site="", failed=False)


def now_iso() -> str:
    """UTC 当下时刻(ISO,Z 结尾)—— EnrichRecord.fetched 的口径。"""
    return datetime.now(timezone.utc).isoformat().replace(ISO_UTC_OFFSET, ISO_Z)


def days_since(iso: str) -> float:
    """ISO 时刻距今的天数;空串=没记录过,按无穷大(业务判空,不进 catch 免刷日志);
    非空但坏的才留痕(永不吞异常令)。"""
    if iso == "":
        return 1e9
    try:
        dt = datetime.fromisoformat(iso.replace(ISO_Z, ISO_UTC_OFFSET))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except Exception as e:  # noqa: BLE001
        err(iso, e)
        return 1e9


def clean_text(s: str) -> str:
    """HTML 实体解码 + 折空白 + 截 DESC_LEN_MAX。"""
    t = html_lib.unescape(s or "")
    t = WS_FOLD_RE.sub(TEXT_JOIN_SEP, t).strip()
    return t[:DESC_LEN_MAX].strip()


def first_meta_match(x: MetaScanIn) -> str:
    """按模式序取第一个非空 content(原 extract_meta 内嵌函数出户;模式已预编译)。"""
    for pat in x.patterns:
        m = pat.search(x.page)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return ""


def extract_meta(page: str) -> MetaOut:
    """首页 HTML → 简介/行业(纯正则,不依赖 bs4;拿不到就空,不猜)。

    简介取 og:description / meta description,都没有兜首个 ≥DESC_P_MIN_LEN 字的 <p>;
    行业取 meta keywords 前 KEYWORDS_TOP_N 个。
    """
    desc = first_meta_match(MetaScanIn(page=page, patterns=META_DESC_PATTERNS))
    if not desc:
        for m in P_TAG_RE.finditer(page):
            txt = TAG_STRIP_RE.sub("", m.group(1)).strip()
            if len(txt) >= DESC_P_MIN_LEN:
                desc = txt
                break
    kw = first_meta_match(MetaScanIn(page=page, patterns=META_KEYWORDS_PATTERNS))
    parts = []
    for k in kw.split(KEYWORDS_SPLIT_SEP)[:KEYWORDS_TOP_N]:
        if k.strip():
            parts.append(k.strip())
    sectors = LIST_JOIN_SEP.join(parts) if kw else ""
    return MetaOut(description=clean_text(desc), sectors=clean_text(sectors))


def company_targets() -> tuple[dict[str, SiteLead], dict[str, NositeLead]]:
    """postings → (有官网 targets, 无官网 nosite),均排除 ATS(自带 profile)。"""
    targets: dict[str, SiteLead] = {}
    nosite: dict[str, NositeLead] = {}
    if not IN_ENRICH_POSTINGS.exists():
        return targets, nosite
    ats_slugs: set[str] = set()
    if IN_ENRICH_ATS.exists():
        for entry in IN_ENRICH_ATS.iterdir():
            ats_slugs.add(entry.name)
    for j in json.loads(IN_ENRICH_POSTINGS.read_text(encoding=TEXT_ENCODING)):
        lead = PostingLead.model_validate(j)
        if not lead.employer:
            continue
        sl = slugify(lead.employer)
        if sl in ats_slugs:
            continue
        if lead.website:
            targets.setdefault(sl, SiteLead(name=lead.employer, website=lead.website))
        else:
            rec = nosite.setdefault(sl, NositeLead(name=lead.employer, province=lead.province))
            rec.jobs += 1
    only_nosite: dict[str, NositeLead] = {}
    for sl, v in nosite.items():
        if sl not in targets:
            only_nosite[sl] = v
    return targets, only_nosite


def should_skip_find(x: SkipFindIn) -> bool:
    """已有官网或还在冷却期的公司,本轮不再找(原内嵌函数 cache_skip 出户)。"""
    c = x.cache.get(x.slug)
    if c is None:
        return False
    return bool(c.website or days_since(c.fetched) <= RETRY_NOSITE_DAYS)


def nosite_priority_of(kv: tuple) -> int:
    """无官网公司的搜索优先级键:岗多的先搜=价值密度高(lambda 退役)。"""
    return -kv[1].jobs


def find_websites(x: FindWebsitesIn) -> tuple[int, int]:
    """D2 找官网阶梯:① JD 线索(全量,便宜)→ ② DDG 搜索(限量,礼貌限速)。

    命中 → 进 targets(带 found 标记)并立即记缓存(status=found,防本轮 limit
    截断丢结果);搜不到 → 记 nosite 冷却 RETRY_NOSITE_DAYS。
    """
    found_jd = found_search = 0
    hints = jd_domain_hints()
    with make_polite_client(timeout=FIND_CLIENT_TIMEOUT_S) as client:
        for sl, v in x.nosite.items():
            if sl in x.targets or should_skip_find(SkipFindIn(cache=x.cache, slug=sl)) or sl not in hints:
                continue
            for dom in sorted(hints[sl]):
                if guard_match(GuardMatchIn(client=cast(HttpClientLike, client), name=v.name, dom=dom)):
                    site = HTTPS_PREFIX + dom
                    x.targets[sl] = SiteLead(name=v.name, website=site, found=FOUND_JD)
                    x.cache[sl] = EnrichRecord(name=v.name, website=site, found=FOUND_JD,
                                               status=ST_FOUND, fetched=now_iso())
                    found_jd += 1
                    break
        found_search = ddg_search_loop(DdgLoopIn(client=cast(HttpClientLike, client), cache=x.cache,
                                                 targets=x.targets, nosite=x.nosite, find_limit=x.find_limit))
    return found_jd, found_search


def ddg_search_loop(x: DdgLoopIn) -> int:
    """阶梯②的循环:按岗数排队逐家 DDG;命中记 found、查无记 nosite、传输失败不记并歇 DDG_BACKOFF_S,
    连续 DDG_FAIL_STOP 次失败熔断;每 FIND_FLUSH_N 家落一次盘。返回本轮命中数。"""
    found = done = fails = 0
    budget = x.find_limit
    for sl, v in sorted(x.nosite.items(), key=nosite_priority_of):
        if budget <= 0:
            break
        if sl in x.targets or should_skip_find(SkipFindIn(cache=x.cache, slug=sl)):
            continue
        budget -= 1
        got = ddg_find(DdgFindIn(client=x.client, name=v.name, province=v.province))
        if got.failed:
            fails += 1
            say(PRINT_FIND_ROW_TPL.format(status=ST_FAIL, name=v.name, site=""))
            if fails >= DDG_FAIL_STOP:
                say(PRINT_DDG_STOP_TPL.format(n=fails, done=done))
                break
            time.sleep(DDG_BACKOFF_S)
            continue
        fails = 0
        done += 1
        if got.site != "":
            x.targets[sl] = SiteLead(name=v.name, website=got.site, found=FOUND_SEARCHED)
            x.cache[sl] = EnrichRecord(name=v.name, website=got.site, found=FOUND_SEARCHED,
                                       status=ST_FOUND, fetched=now_iso())
            found += 1
            say(PRINT_FIND_ROW_TPL.format(status=ST_FOUND, name=v.name, site=got.site))
        else:
            x.cache[sl] = EnrichRecord(name=v.name, status=ST_NOSITE, fetched=now_iso())
            say(PRINT_FIND_ROW_TPL.format(status=ST_NOSITE, name=v.name, site=""))
        if done % FIND_FLUSH_N == 0:
            write_enrich_cache(x.cache)
        time.sleep(FIND_SLEEP_S)
    return found


def pick_todo(x: PickTodoIn) -> list[tuple[str, SiteLead]]:
    """挑本轮要抓的公司:缓存缺失 / 刚找到官网(found)/ 成功过期 / 失败超冷却。"""
    todo = []
    for sl, lead in x.targets.items():
        c = x.cache.get(sl)
        if c is None or c.status == ST_FOUND:
            todo.append((sl, lead))
        elif c.status == ST_OK and days_since(c.fetched) > x.refresh_days:
            todo.append((sl, lead))
        elif c.status == ST_FAIL and days_since(c.fetched) > RETRY_FAILED_DAYS:
            todo.append((sl, lead))
    return todo


def fetch_profile(x: FetchProfileIn) -> EnrichRecord:
    """抓一家公司首页 → EnrichRecord(ok 带简介/行业;抓不到记 fail 原因,不抛)。"""
    rec = EnrichRecord(name=x.lead.name, website=x.lead.website,
                       found=x.lead.found, fetched=now_iso())
    try:
        r = x.client.get(x.lead.website)
        if r.is_success and r.text:
            got = extract_meta(r.text)
            if got.description or got.sectors:
                rec.description = got.description
                rec.sectors = got.sectors
                rec.status = ST_OK
            else:
                rec.status = ST_FAIL
                rec.note = NOTE_NO_META
        else:
            rec.status = ST_FAIL
            rec.note = NOTE_HTTP_TPL.format(status=r.status_code)
    except Exception as e:  # noqa: BLE001
        rec.status = ST_FAIL
        rec.note = type(e).__name__
    return rec


def enrich_company_websites() -> None:
    """官网富化入口:找官网(D2 阶梯)+ 抓首页提简介/行业,增量落 OUT_ENRICH_CACHE。

    自限流用缓存文件 mtime 当戳 —— 曾把 build 轮拖成 17 分钟大头(2026-07-16 报告),
    拆独立角色后此闸只防容器重启抖动。失败容错:抓不到只记 status 不炸整轮。
    节奏四参全在 constants,改节奏改常量(CLI 选项随一参令退役)。
    """
    if ENRICH_MIN_INTERVAL_S and OUT_ENRICH_CACHE.exists():
        age = time.time() - OUT_ENRICH_CACHE.stat().st_mtime
        if age < ENRICH_MIN_INTERVAL_S:
            say(PRINT_ENRICH_SKIP_TPL.format(mins=age / 60, limit=ENRICH_MIN_INTERVAL_S // 60))
            return
    cache: dict[str, EnrichRecord] = {}
    if OUT_ENRICH_CACHE.exists():
        for sl, d in json.loads(OUT_ENRICH_CACHE.read_text(encoding=TEXT_ENCODING)).items():
            cache[sl] = EnrichRecord.model_validate(d)
    targets, nosite = company_targets()
    say(PRINT_ENRICH_IN_TPL.format(path=IN_ENRICH_POSTINGS))
    found_jd, found_search = find_websites(FindWebsitesIn(cache=cache, targets=targets,
                                                          nosite=nosite, find_limit=FIND_LIMIT))
    for sl, c in cache.items():
        if sl not in targets and c.website and c.found:
            targets[sl] = SiteLead(name=c.name or sl, website=c.website, found=c.found)
    say(PRINT_FIND_TPL.format(n=len(nosite), jd=found_jd, search=found_search, limit=FIND_LIMIT))
    todo = pick_todo(PickTodoIn(cache=cache, targets=targets,
                                refresh_days=ENRICH_REFRESH_DAYS))[:ENRICH_LIMIT]
    say(PRINT_TARGETS_TPL.format(targets=len(targets), cache=len(cache), todo=len(todo), limit=ENRICH_LIMIT))
    ok = fail = 0
    with make_polite_client(timeout=FETCH_TIMEOUT_S) as client:
        for sl, lead in todo:
            rec = fetch_profile(FetchProfileIn(client=cast(HttpClientLike, client), lead=lead))
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            cache[sl] = rec
            time.sleep(FETCH_SLEEP_S)
    total_ok = write_enrich_cache(cache)
    say(PRINT_ENRICH_DONE_TPL.format(ok=ok, fail=fail, total=total_ok, n=len(cache),
                                     out=OUT_ENRICH_CACHE.name))


def write_enrich_cache(cache: dict[str, EnrichRecord]) -> int:
    """缓存落盘 OUT_ENRICH_CACHE,返回累计 ok 家数(enrich 与 sites 两步共用的尾巴,
    2026-09-04 随 sites 步抽出 —— 行为复制不许)。"""
    OUT_ENRICH_CACHE.parent.mkdir(parents=True, exist_ok=True)
    out: dict[str, dict] = {}
    total_ok = 0
    for sl, rec in cache.items():
        out[sl] = rec.model_dump()
        if rec.status == ST_OK:
            total_ok += 1
    paths.write_json(paths.WriteJsonIn(path=OUT_ENRICH_CACHE, payload=out, indent=2))
    return total_ok


# =========================================================================
# 6. 雇主 D 富化(行业 + 中韩别名 + 知名;休眠工具,手动 main --only facts)
# =========================================================================


def enrich_company_facts() -> None:
    """本域步骤入口:雇主 D 富化(2026-07-19 Frank 批「开工做雇主 D」)。

    ① 行业 = 该雇主在库开放岗的 NOC 大类多数派(mart/jobs.json,零新抓取);
    ② 别名 = Wikidata 跨语言标签(zh/ko 官方条目名,不机翻;严格名称匹配,宁缺勿滥);
    ③ 知名 = 有英文 Wikipedia 条目(sitelink)。
    ⛔ ②③ 已退役(#109/#111,2026-07-20 Frank「不要提前跑」)——**别再批量跑 Wikidata**;
    ①(本地 mart 零网络)保留可手动重跑,apply 手法 = scratchpad apply_company_facts.mjs
    (STATUS 有记)。2026-08-31 批J 自 clean/_enrich_company_facts.py 归户全溶
    (判据:逐公司抓数据 = 公司域的活;下划线私件名随溶解消失),故只进 TOOLS 不进默认链。
    """
    say(PRINT_FACTS_IN_TPL.format(jobs=IN_FACTS_JOBS, companies=IN_FACTS_COMPANIES, out=OUT_FACTS))
    jobs = json.loads(IN_FACTS_JOBS.read_text(encoding=TEXT_ENCODING))
    companies = json.loads(IN_FACTS_COMPANIES.read_text(encoding=TEXT_ENCODING))
    name_of: dict = {}
    for c in companies:
        if c.get(K_SLUG):
            name_of[c[K_SLUG]] = c.get(K_NAME, "")
    got = industry_by_slug(jobs)
    say(PRINT_FACTS_INDUSTRY_TPL.format(n=len(got.industry), open_jobs=got.n_open))
    cands = facts_candidates(CandsIn(by_slug=got.by_slug, name_of=name_of, companies=companies))
    say(PRINT_FACTS_CANDS_TPL.format(n=len(cands)))
    prev: dict = {}
    if OUT_FACTS.exists():
        prev = json.loads(OUT_FACTS.read_text(encoding=TEXT_ENCODING))
    prev_names = prev.get(K_BY_NAME, prev)
    by_name: dict = {}
    hit = 0
    n_err = 0
    for i, co in enumerate(cands):
        probe = facts_probe(ProbeIn(name=co, cached=prev_names.get(co, {})))
        if probe.failed:
            n_err += 1
            continue
        by_name[co] = to_facts_record(probe)
        if probe.found:
            hit += 1
        if (i + 1) % FACTS_TICK == 0:
            say(PRINT_FACTS_TICK_TPL.format(i=i + 1, n=len(cands), hit=hit, errs=n_err))
            save_company_facts(SaveFactsIn(industry=got.industry, by_name=by_name,
                                           prev_names=prev_names))
    save_company_facts(SaveFactsIn(industry=got.industry, by_name=by_name,
                                   prev_names=prev_names))
    with_alias = 0
    for rec in by_name.values():
        if rec.get(K_ZH) or rec.get(K_KO):
            with_alias += 1
    say(PRINT_FACTS_DONE_TPL.format(out=OUT_FACTS, n=len(got.industry), hit=hit, alias=with_alias))


def industry_by_slug(jobs: list) -> FactsIndustryOut:
    """开放岗按 companySlug 归组 → 大类多数派(大类值=数据层中文值,前端三语显示)。"""
    by_slug: dict = defaultdict(Counter)
    n_open = 0
    for job in jobs:
        if (job.get(K_STATUS) or STATUS_OPEN) == STATUS_CLOSED:
            continue
        slug = job.get(K_COMPANY_SLUG)
        broad = job.get(K_BROAD)
        if slug and broad and broad != UNCLASSIFIED:
            by_slug[slug][broad] += 1
            n_open += 1
    industry: dict = {}
    for slug, votes in by_slug.items():
        industry[slug] = votes.most_common(1)[0][0]
    return FactsIndustryOut(industry=industry, by_slug=by_slug, n_open=n_open)


def facts_candidates(x: CandsIn) -> list:
    """候选 = 技能股大户 或 在库岗 ≥3 —— 控制 Wikidata 查询量;按公司名查。"""
    picked: set = set()
    for slug, votes in x.by_slug.items():
        if sum(votes.values()) >= CAND_MIN_JOBS:
            picked.add(x.name_of.get(slug, ""))
    for c in x.companies:
        if (c.get(K_LMIA_POSITIONS_SKILLED) or 0) >= CAND_MIN_LMIA_SKILLED:
            picked.add(c.get(K_NAME))
    picked.discard(None)
    picked.discard("")
    return sorted(picked)


def facts_probe(x: ProbeIn) -> WikiProbe:
    """幂等:确实查过的不重查(命中与确认未命中都算查过);失败的没进缓存,自然重试。"""
    if K_WIKI_CHECKED in x.cached:
        if not x.cached.get(K_WIKI):
            return WikiProbe(failed=False, found=False, zh="", ko="", wiki="")
        return WikiProbe(failed=False, found=True, zh=x.cached[K_ZH], ko=x.cached[K_KO],
                         wiki=x.cached[K_WIKI])
    probe = wikidata_lookup(x.name)
    time.sleep(WD_SLEEP_S)
    return probe


def wikidata_lookup(name: str) -> WikiProbe:
    """严格匹配:搜索前 3 个条目,en 标签/别名归一后等于公司名才收。

    2026-08-31 批J:原件的 `except Exception: return ERR` 是静默吞 —— 按永不吞异常令补
    err() 留痕(返回值语义一字不改:failed=True 仍是不缓存、下轮重试)。
    """
    try:
        hits = wd_get(search_params(name)).get(K_SEARCH, [])
        ids: list = []
        for h in hits:
            ids.append(h[K_ID])
        if len(ids) == 0:
            return WikiProbe(failed=False, found=False, zh="", ko="", wiki="")
        ents = wd_get(entity_params(ids)).get(K_ENTITIES, {})
        target = norm_company_name(name)
        for eid in ids:
            probe = entity_probe(EntityIn(entity=ents.get(eid) or {}, target=target))
            if probe.found:
                return probe
        return WikiProbe(failed=False, found=False, zh="", ko="", wiki="")
    except Exception as e:  # noqa: BLE001 — 网络/限速什么错都可能,一律当失败保留活口
        err(name, e)
        return WikiProbe(failed=True, found=False, zh="", ko="", wiki="")


def search_params(name: str) -> dict:
    """wbsearchentities 的查询参数(按名搜条目,只看前 3 个)。"""
    return {P_ACTION: ACT_SEARCH, P_SEARCH: name, P_LANGUAGE: LANG_EN, P_TYPE: TYPE_ITEM,
            P_LIMIT: WD_SEARCH_LIMIT}


def entity_params(ids: list) -> dict:
    """wbgetentities 的查询参数(一发取回三样属性 × 三种语言)。"""
    return {P_ACTION: ACT_GET_ENTITIES, P_IDS: ID_SEP.join(ids), P_PROPS: WD_PROPS,
            P_LANGUAGES: WD_LANGUAGES}


def wd_get(params: dict) -> dict:
    """打一发 Wikidata action API,响应体按 JSON 读回。"""
    full = dict(params)
    full[P_FORMAT] = FORMAT_JSON
    url = WD_API_URL + QUERY_MARK + urllib.parse.urlencode(full)
    req = urllib.request.Request(url, headers={HDR_USER_AGENT: WD_UA})
    with urllib.request.urlopen(req, timeout=WD_TIMEOUT_S) as r:
        return json.load(r)


def entity_probe(x: EntityIn) -> WikiProbe:
    """一个实体:en 标签/别名严格等于目标名、且有英文维基条目 → 收(否则 found=False)。

    无英文维基条目 = 不算知名,别名也不收(知名徽标与别名同一门槛)。
    """
    labels = x.entity.get(K_LABELS, {})
    names: list = [labels.get(LANG_EN, {}).get(K_VALUE, "")]
    for alias in x.entity.get(K_ALIASES, {}).get(LANG_EN, []):
        names.append(alias.get(K_VALUE, ""))
    matched = False
    for one in names:
        if one and norm_company_name(one) == x.target:
            matched = True
            break
    if not matched:
        return WikiProbe(failed=False, found=False, zh="", ko="", wiki="")
    title = x.entity.get(K_SITELINKS, {}).get(K_ENWIKI, {}).get(K_TITLE)
    if not title:
        return WikiProbe(failed=False, found=False, zh="", ko="", wiki="")
    return WikiProbe(failed=False, found=True,
                     zh=labels.get(LANG_ZH, {}).get(K_VALUE, ""),
                     ko=labels.get(LANG_KO, {}).get(K_VALUE, ""),
                     wiki=WIKI_URL_PREFIX + urllib.parse.quote(
                         title.replace(WIKI_SPACE, WIKI_UNDERSCORE)))


def norm_company_name(s: str) -> str:
    """公司名归一键:小写、去法人后缀、点与逗号折空格、缩空白。"""
    one = FACTS_SUFFIX_RE.sub(TEXT_JOIN_SEP, (s or "").lower())
    one = one.replace(DOT_SEP, TEXT_JOIN_SEP).replace(FACTS_COMMA, TEXT_JOIN_SEP)
    return WS_FOLD_RE.sub(TEXT_JOIN_SEP, one).strip()


def to_facts_record(probe: WikiProbe) -> dict:
    """WikiProbe → by_name 的一行(键序即产出契约:wiki_checked 在前,命中才带三格)。"""
    rec: dict = {"wiki_checked": WIKI_CHECKED_MARK}
    if probe.found:
        rec["zh"] = probe.zh
        rec["ko"] = probe.ko
        rec["wiki"] = probe.wiki
    return rec


def save_company_facts(x: SaveFactsIn) -> None:
    """产出落盘(旧缓存合并写:中途落盘不冲掉本轮还没遍历到的已查条目)。"""
    merged = dict(x.prev_names)
    merged.update(x.by_name)
    by_slug: dict = {}
    for slug, value in x.industry.items():
        by_slug[slug] = to_industry_cell(value)
    paths.write_json(paths.WriteJsonIn(path=OUT_FACTS,
                                       payload={K_BY_SLUG: by_slug, K_BY_NAME: merged},
                                       indent=FACTS_INDENT))


def to_industry_cell(value: str) -> dict:
    """by_slug 的一格。"""
    return {"industry": value}


# =========================================================================
# 7. Places 查询(2026-09-04:Google Places API (New) 文本搜索补官网/地址/业务类型;
#    手动件 main --only places,限量;raw 原响应一司一份,processed 一表)
# =========================================================================


def lookup_company_places() -> None:
    """Places 步入口:在招担保雇主按在招数排队,限量查 Google Places,增量落 OUT_PLACES。

    没密钥直接退(手动件缺配置不是代码病);单家失败只记 status 不炸整轮。
    """
    key = os.environ.get(ENV_PLACES_KEY, "")
    if key == "":
        say(NOTE_NO_KEY)
        return
    say(PRINT_PLACES_IN_TPL.format(companies=IN_PLACES_COMPANIES, jobs=IN_PLACES_JOBS))
    cache = read_places_cache()
    companies: list[PlaceCompany] = []
    for d in json.loads(IN_PLACES_COMPANIES.read_text(encoding=TEXT_ENCODING)):
        companies.append(PlaceCompany.model_validate(d))
    cands = places_candidates(PlacesCandsIn(companies=companies, counts=job_counts_by_slug()))
    used = month_usage_of(cache)
    pro_budget = max(0, PLACES_MONTH_FREE_PRO - PLACES_MONTH_RESERVE - used.pro)
    ent_budget = max(0, PLACES_MONTH_FREE_ENT - PLACES_MONTH_RESERVE - used.ent)
    say(PRINT_PLACES_BUDGET_TPL.format(pro_used=used.pro, pro_free=PLACES_MONTH_FREE_PRO, ent_used=used.ent,
                                       ent_free=PLACES_MONTH_FREE_ENT, pro=pro_budget, ent=ent_budget))
    todo = pick_places_todo(PickPlacesIn(cache=cache, cands=cands, limit=PLACES_LIMIT,
                                         pro_budget=pro_budget, ent_budget=ent_budget))
    say(PRINT_PLACES_TARGETS_TPL.format(cands=len(cands), cached=len(cache), todo=len(todo), limit=PLACES_LIMIT))
    hit = miss = fail = 0
    with make_client(timeout=PLACES_TIMEOUT_S) as client:
        for t in todo:
            rec = places_search(PlacesSearchIn(client=cast(HttpClientLike, client), key=key, target=t,
                                               tier=tier_of(t)))
            cache[t.slug] = rec
            if rec.status == ST_HIT:
                hit += 1
            elif rec.status == ST_MISS:
                miss += 1
            else:
                fail += 1
            say(PRINT_PLACES_ROW_TPL.format(status=rec.status, tier=rec.tier, name=t.name, site=rec.website,
                                            address=rec.address, ptype=rec.primary_type))
            if (hit + miss + fail) % FIND_FLUSH_N == 0:
                write_places_cache(cache)
            time.sleep(PLACES_SLEEP_S)
    write_places_cache(cache)
    say(PRINT_PLACES_DONE_TPL.format(hit=hit, miss=miss, fail=fail, out=OUT_PLACES.name))


def write_places_cache(cache: dict[str, PlaceRecord]) -> None:
    """缓存落盘 OUT_PLACES(整轮几千家,每 FIND_FLUSH_N 家落一次,中途被杀不丢)。"""
    OUT_PLACES.parent.mkdir(parents=True, exist_ok=True)
    out: dict[str, dict] = {}
    for sl, rec in cache.items():
        out[sl] = rec.model_dump()
    paths.write_json(paths.WriteJsonIn(path=OUT_PLACES, payload=out, indent=2))


def month_usage_of(cache: dict[str, PlaceRecord]) -> MonthUsage:
    """当月两档已发出的请求数(按记录 fetched 的年-月计;fail 也计 —— Google 照样收费)。"""
    month = now_iso()[:MONTH_LEN]
    used = MonthUsage(pro=0, ent=0)
    for rec in cache.values():
        if rec.fetched[:MONTH_LEN] != month:
            continue
        if rec.tier == TIER_ENT:
            used.ent += 1
        elif rec.tier == TIER_PRO:
            used.pro += 1
    return used


def tier_of(t: PlaceTarget) -> str:
    """有官网的走 Pro(补地址/类型),缺官网的走 Enterprise(要 websiteUri)。"""
    if t.website == "":
        return TIER_ENT
    return TIER_PRO


def lookup_sponsor_websites() -> None:
    """sites 步入口:在招担保雇主里缺官网的,走第 5 段 D2 阶梯(JD 线索 → DDG)找官网,
    命中记 found 进 OUT_ENRICH_CACHE,下一轮 build 合并进 companies.website。

    2026-09-04 Frank「走 DuckDuckGo 跑起来」:免费替代 Places Enterprise 档;母集限把脉页
    雇主表那批,不是全量预抓。
    """
    cache: dict[str, EnrichRecord] = {}
    if OUT_ENRICH_CACHE.exists():
        for sl, d in json.loads(OUT_ENRICH_CACHE.read_text(encoding=TEXT_ENCODING)).items():
            cache[sl] = EnrichRecord.model_validate(d)
    companies: list[PlaceCompany] = []
    for d in json.loads(IN_PLACES_COMPANIES.read_text(encoding=TEXT_ENCODING)):
        companies.append(PlaceCompany.model_validate(d))
    cands = places_candidates(PlacesCandsIn(companies=companies, counts=job_counts_by_slug()))
    nosite = sponsor_nosite_of(cands)
    say(PRINT_SITES_TARGETS_TPL.format(cands=len(cands), nosite=len(nosite), cache=len(cache), limit=SITES_LIMIT))
    targets: dict[str, SiteLead] = {}
    found_jd, found_search = find_websites(FindWebsitesIn(cache=cache, targets=targets,
                                                          nosite=nosite, find_limit=SITES_LIMIT))
    total_ok = write_enrich_cache(cache)
    say(PRINT_SITES_DONE_TPL.format(jd=found_jd, search=found_search, total=total_ok, n=len(cache),
                                    out=OUT_ENRICH_CACHE.name))


def sponsor_nosite_of(cands: list[PlaceTarget]) -> dict[str, NositeLead]:
    """候选里缺官网的 → find_websites 要的 nosite 表(在招数当岗数 = 搜索优先级)。"""
    nosite: dict[str, NositeLead] = {}
    for t in cands:
        if t.website == "":
            nosite[t.slug] = NositeLead(name=t.name, province=t.region, jobs=t.open_jobs)
    return nosite


def read_places_cache() -> dict[str, PlaceRecord]:
    """读上轮产出(缺文件 = 空表)。"""
    cache: dict[str, PlaceRecord] = {}
    if OUT_PLACES.exists():
        for sl, d in json.loads(OUT_PLACES.read_text(encoding=TEXT_ENCODING)).items():
            cache[sl] = PlaceRecord.model_validate(d)
    return cache


def job_counts_by_slug() -> JobCounts:
    """jobs.json 一遍扫出 slug → 在招岗数 与 slug → 在招 TEER 0-3 岗数(只数 status=open)。"""
    counts = JobCounts(open=Counter(), skilled=Counter())
    for j in json.loads(IN_PLACES_JOBS.read_text(encoding=TEXT_ENCODING)):
        job = MartJob.model_validate(j)
        if job.status != STATUS_OPEN or job.company_slug == "":
            continue
        counts.open[job.company_slug] += 1
        if job.teer in TEER_SKILLED:
            counts.skilled[job.company_slug] += 1
    return counts


def places_candidates(x: PlacesCandsIn) -> list[PlaceTarget]:
    """把脉页雇主段两栏的母集:在招且(近四季有 LMIA 或 在招 TEER 0-3 岗);按在招数、LMIA 数降序。"""
    out: list[PlaceTarget] = []
    for c in x.companies:
        open_n = x.counts.open.get(c.slug, 0)
        if open_n <= 0:
            continue
        if c.lmia_4q <= 0 and x.counts.skilled.get(c.slug, 0) <= 0:
            continue
        out.append(PlaceTarget(slug=c.slug, name=c.name, region=c.region, website=c.website,
                               open_jobs=open_n, lmia_4q=c.lmia_4q))
    out.sort(key=places_priority_of)
    return out


def places_priority_of(t: PlaceTarget) -> tuple:
    """候选排序键:在招多的先查,再看 LMIA 量,最后 slug 稳序。"""
    return (-t.open_jobs, -t.lmia_4q, t.slug)


def pick_places_todo(x: PickPlacesIn) -> list[PlaceTarget]:
    """按序挑本轮要查的公司:跳过命中未过期与冷却中的;两档各自吃到当月免费额即止,总闸 limit。"""
    todo: list[PlaceTarget] = []
    pro = x.pro_budget
    ent = x.ent_budget
    for t in x.cands:
        if len(todo) >= x.limit:
            break
        if should_skip_places(SkipPlacesIn(cache=x.cache, slug=t.slug)):
            continue
        if tier_of(t) == TIER_ENT:
            if ent <= 0:
                continue
            ent -= 1
        else:
            if pro <= 0:
                continue
            pro -= 1
        todo.append(t)
    return todo


def should_skip_places(x: SkipPlacesIn) -> bool:
    """命中记录在 PLACES_REFRESH_DAYS 内不重查;查无/失败冷却 RETRY_FAILED_DAYS。"""
    c = x.cache.get(x.slug)
    if c is None:
        return False
    if c.status == ST_HIT:
        return days_since(c.fetched) <= PLACES_REFRESH_DAYS
    return days_since(c.fetched) <= RETRY_FAILED_DAYS


def places_query_of(t: PlaceTarget) -> str:
    """搜索词 = 公司名 + 地域 + Canada(地域缺格时折掉多余空格)。"""
    return WS_FOLD_RE.sub(TEXT_JOIN_SEP, PLACES_QUERY_TPL.format(name=t.name, region=t.region)).strip()


def places_search(x: PlacesSearchIn) -> PlaceRecord:
    """查一家:crawl 层有这条查询的原响应就直接用(不打 API 不计费);没有才 POST,
    原响应经 put_cached_page 进 crawl/companies/,再由第一条候选成记录。

    网络/解析异常记 fail 不抛;非 2xx 不落缓存(错误体不是原文)只记 fail。
    """
    query = places_query_of(x.target)
    cache_url = PLACES_CACHE_URL_TPL.format(url=PLACES_URL, query=query)
    cached = get_cached_page(cache_url).html
    if cached is not None:
        env = PlacesEnvelope.model_validate(json.loads(cached))
        return to_place_record(ToPlaceIn(target=x.target, query=query, hits=env.places, tier=x.tier))
    body = {P_TEXT_QUERY: query, P_REGION_CODE: PLACES_REGION,
            P_LANGUAGE_CODE: PLACES_LANG, P_PAGE_SIZE_PLACES: PLACES_PAGE_SIZE}
    headers = {HDR_API_KEY: x.key, HDR_FIELD_MASK: mask_of(x.tier)}
    try:
        r = x.client.post(PLACES_URL, json=body, headers=headers)
        raw = r.json()
    except Exception as e:  # noqa: BLE001
        return PlaceRecord(name=x.target.name, query=query, status=ST_FAIL, tier=x.tier,
                           note=type(e).__name__, fetched=now_iso())
    if not r.is_success:
        return PlaceRecord(name=x.target.name, query=query, status=ST_FAIL, tier=x.tier,
                           note=NOTE_HTTP_TPL.format(status=r.status_code), fetched=now_iso())
    put_cached_page(CachePutIn(slug=CRAWL_SLUG_COMPANIES, url=cache_url, title=x.target.name,
                               html=json.dumps(raw, ensure_ascii=False, indent=JSON_INDENT)))
    env = PlacesEnvelope.model_validate(raw)
    return to_place_record(ToPlaceIn(target=x.target, query=query, hits=env.places, tier=x.tier))


def mask_of(tier: str) -> str:
    """档位 → 字段掩码。"""
    if tier == TIER_ENT:
        return PLACES_MASK_ENT
    return PLACES_MASK_PRO


def to_place_record(x: ToPlaceIn) -> PlaceRecord:
    """候选表 → 记录:零候选或第一条不在加拿大记 miss;否则采信第一条,格照抄,市/省从地址分量认。"""
    rec = PlaceRecord(name=x.target.name, query=x.query, fetched=now_iso(), tier=x.tier)
    if len(x.hits) == 0:
        rec.status = ST_MISS
        return rec
    h = x.hits[0]
    for comp in h.address_components:
        if K_COUNTRY in comp.types and comp.short_text != COUNTRY_CA:
            rec.status = ST_MISS
            rec.note = NOTE_OUTSIDE_CA
            rec.place_name = h.display_name.text
            rec.address = h.formatted_address
            return rec
    rec.status = ST_HIT
    rec.place_id = h.id
    rec.place_name = h.display_name.text
    rec.address = h.formatted_address
    rec.short_address = h.short_formatted_address
    rec.website = h.website_uri
    rec.primary_type = h.primary_type
    rec.primary_type_label = h.primary_type_display_name.text
    rec.types = h.types
    rec.business_status = h.business_status
    rec.lat = h.location.latitude
    rec.lng = h.location.longitude
    rec.maps_url = h.google_maps_uri
    rec.phone = h.national_phone_number
    rec.phone_intl = h.international_phone_number
    rec.rating = h.rating
    rec.rating_count = h.user_rating_count
    for comp in h.address_components:
        if K_LOCALITY in comp.types:
            rec.city = comp.long_text
        if K_PROVINCE in comp.types:
            rec.province = comp.short_text
    return rec


# =========================================================================
# 8. 官网正文(2026-09-05:首页 + About 页 → crawl 层原文 → 剥标签裁长;手动件 main --only about)
# =========================================================================


def crawl_company_about() -> None:
    """about 步入口:有官网的在招担保雇主,抓首页找 About 页,两页正文合成一份落 OUT_ABOUT。

    原文一律经 crawl 层读写门(有缓存不重抓);单家失败只记 status 不炸整轮。
    """
    cache = read_about_cache()
    targets = about_targets()
    todo = pick_about_todo(PickAboutIn(cache=cache, targets=targets, limit=ABOUT_LIMIT))
    say(PRINT_ABOUT_TARGETS_TPL.format(targets=len(targets), cache=len(cache), todo=len(todo), limit=ABOUT_LIMIT))
    ok = fail = 0
    with make_polite_client(timeout=ABOUT_TIMEOUT_S) as client:
        for t in todo:
            rec = fetch_about(AboutFetchIn(client=cast(HttpClientLike, client), target=t))
            cache[t.slug] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_ABOUT_ROW_TPL.format(status=rec.status, name=t.name, about=rec.about_url or rec.note,
                                           chars=len(rec.text)))
            if (ok + fail) % FIND_FLUSH_N == 0:
                write_about_cache(cache)
            time.sleep(ABOUT_SLEEP_S)
    total = write_about_cache(cache)
    say(PRINT_ABOUT_DONE_TPL.format(ok=ok, fail=fail, total=total, n=len(cache), out=OUT_ABOUT.name))


def write_about_cache(cache: dict[str, AboutRecord]) -> int:
    """缓存落盘 OUT_ABOUT,返回累计 ok 家数(每 FIND_FLUSH_N 家落一次,中途被杀不丢)。"""
    out: dict[str, dict] = {}
    total = 0
    for sl, rec in cache.items():
        out[sl] = rec.model_dump()
        if rec.status == ST_OK:
            total += 1
    OUT_ABOUT.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_ABOUT, payload=out, indent=1))
    return total


def read_about_cache() -> dict[str, AboutRecord]:
    """读上轮产出(缺文件 = 空表)。"""
    cache: dict[str, AboutRecord] = {}
    if OUT_ABOUT.exists():
        for sl, d in json.loads(OUT_ABOUT.read_text(encoding=TEXT_ENCODING)).items():
            cache[sl] = AboutRecord.model_validate(d)
    return cache


def about_targets() -> list[AboutTarget]:
    """在招担保雇主里有官网的(库里的,或 sites 步刚找到还没合并的),保持候选序。"""
    enrich: dict[str, EnrichRecord] = {}
    if IN_ABOUT_ENRICH.exists():
        for sl, d in json.loads(IN_ABOUT_ENRICH.read_text(encoding=TEXT_ENCODING)).items():
            enrich[sl] = EnrichRecord.model_validate(d)
    companies: list[PlaceCompany] = []
    for d in json.loads(IN_PLACES_COMPANIES.read_text(encoding=TEXT_ENCODING)):
        companies.append(PlaceCompany.model_validate(d))
    cands = places_candidates(PlacesCandsIn(companies=companies, counts=job_counts_by_slug()))
    out: list[AboutTarget] = []
    for t in cands:
        site = t.website
        if site == "" and t.slug in enrich:
            site = enrich[t.slug].website
        if site != "":
            out.append(AboutTarget(slug=t.slug, name=t.name, website=site))
    return out


def pick_about_todo(x: PickAboutIn) -> list[AboutTarget]:
    """按序挑本轮要抓的:ok 未过期与失败冷却中的跳过,凑够 limit 即止。"""
    todo: list[AboutTarget] = []
    for t in x.targets:
        if len(todo) >= x.limit:
            break
        c = x.cache.get(t.slug)
        if c is not None:
            if c.status == ST_OK and days_since(c.fetched) <= ABOUT_REFRESH_DAYS:
                continue
            if c.status == ST_FAIL and days_since(c.fetched) <= RETRY_FAILED_DAYS:
                continue
        todo.append(t)
    return todo


def fetch_about(x: AboutFetchIn) -> AboutRecord:
    """抓一家:首页 → 找 About 链接 → About 页;两页正文合一(短于 ABOUT_TEXT_MIN 记 fail)。"""
    rec = AboutRecord(name=x.target.name, website=x.target.website, fetched=now_iso())
    home = fetch_site_page(PageIn(client=x.client, url=x.target.website, title=x.target.name))
    if home.html == "":
        rec.status = ST_FAIL
        rec.note = home.note
        return rec
    text = page_text_of(PageTextIn(html=home.html, limit=HOME_TEXT_MAX))
    about_url = about_link_of(AboutLinkIn(html=home.html, base=x.target.website))
    if about_url != "" and about_url != x.target.website:
        about = fetch_site_page(PageIn(client=x.client, url=about_url, title=x.target.name))
        if about.html != "":
            rec.about_url = about_url
            text = text + PAGE_SEP + page_text_of(PageTextIn(html=about.html, limit=ABOUT_TEXT_MAX))
    if len(text.strip()) < ABOUT_TEXT_MIN:
        rec.status = ST_FAIL
        rec.note = NOTE_NO_TEXT
        return rec
    rec.text = text.strip()
    rec.status = ST_OK
    return rec


def fetch_site_page(x: PageIn) -> PageOut:
    """一页官网:crawl 层有原文直接用;没有才 GET,过人机验证判词后落 crawl 层。"""
    hit = get_cached_page(x.url)
    if hit.html is not None:
        return PageOut(html=hit.html, note="")
    try:
        r = x.client.get(x.url)
    except Exception as e:  # noqa: BLE001
        return PageOut(html="", note=type(e).__name__)
    if not r.is_success or r.text == "":
        return PageOut(html="", note=NOTE_HTTP_TPL.format(status=r.status_code))
    if is_challenge_html(r.text):
        return PageOut(html="", note=NOTE_CHALLENGE)
    put_cached_page(CachePutIn(slug=CRAWL_SLUG_COMPANIES, url=x.url, html=r.text, title=x.title))
    return PageOut(html=r.text, note="")


def about_link_of(x: AboutLinkIn) -> str:
    """首页里同站、路径末段整段命中 ABOUT_RE 的链接(剥 query/hash),多条取最短;没有回空串。"""
    soup = cast(TagLike, BeautifulSoup(x.html, HTML_PARSER))
    host = urlparse(x.base).netloc
    best = ""
    for a in soup.find_all(LINK_TAG, href=True):
        full = urljoin(x.base, str(a[HREF_ATTR]))
        parsed = urlparse(full)
        if parsed.netloc != host or not ABOUT_RE.search(last_segment_of(parsed.path)):
            continue
        clean = parsed.scheme + PORT_SEP + PATH_SEP + PATH_SEP + parsed.netloc + parsed.path
        if best == "" or len(clean) < len(best):
            best = clean
    return best


def last_segment_of(path: str) -> str:
    """URL 路径的末段(剥尾斜杠;根路径回空串)。"""
    return path.rstrip(PATH_SEP).split(PATH_SEP)[-1]


def page_text_of(x: PageTextIn) -> str:
    """页面原文 → 正文:摘掉导航/脚本/页脚,取文本折空白,裁到 limit。"""
    soup = cast(TagLike, BeautifulSoup(x.html, HTML_PARSER))
    for name in STRIP_TAGS:
        for node in soup.find_all(name):
            node.decompose()
    text = WS_FOLD_RE.sub(TEXT_JOIN_SEP, soup.get_text(TEXT_JOIN_SEP)).strip()
    return text[:x.limit]


# =========================================================================
# 9. 五节简介(2026-09-05:官网正文 → 本地 qwen 五节英文 + 中文;手动件 main --only brief)
# =========================================================================


def build_company_briefs() -> None:
    """brief 步入口:有正文的公司逐家过 qwen,五节英文 + 中文落 OUT_BRIEF。

    没盒子地址直接退;单家失败只记 status 不炸整轮。
    """
    cfg = company_llm_config()
    if cfg.base == "":
        say(NOTE_NO_LLM)
        return
    cache = read_brief_cache()
    about = read_about_cache()
    todo = pick_brief_todo(PickBriefIn(cache=cache, about=about, limit=BRIEF_LIMIT))
    say(PRINT_BRIEF_TARGETS_TPL.format(about=len(about), cache=len(cache), todo=len(todo),
                                       limit=BRIEF_LIMIT, model=cfg.model))
    ok = fail = 0
    with make_client(timeout=LLM_TIMEOUT_S) as client:
        for sl, a in todo:
            rec = brief_one(BriefOneIn(client=cast(HttpClientLike, client), cfg=cfg, about=a))
            cache[sl] = rec
            if rec.status == ST_OK:
                ok += 1
            else:
                fail += 1
            say(PRINT_BRIEF_ROW_TPL.format(status=rec.status, name=a.name, what=what_line_of(rec)))
            if (ok + fail) % FIND_FLUSH_N == 0:
                write_brief_cache(cache)
    total = write_brief_cache(cache)
    say(PRINT_BRIEF_DONE_TPL.format(ok=ok, fail=fail, total=total, n=len(cache), out=OUT_BRIEF.name))


def write_brief_cache(cache: dict[str, BriefRecord]) -> int:
    """缓存落盘 OUT_BRIEF,返回累计 ok 家数(整轮十几小时,每 FIND_FLUSH_N 家落一次,中途被杀不丢)。"""
    out: dict[str, dict] = {}
    total = 0
    for sl, rec in cache.items():
        out[sl] = rec.model_dump()
        if rec.status == ST_OK:
            total += 1
    paths.write_json(paths.WriteJsonIn(path=OUT_BRIEF, payload=out, indent=1))
    return total


def company_llm_config() -> LlmCfg:
    """读环境定盒子地址与模型名。"""
    return LlmCfg(base=os.environ.get(ENV_LLM_BASE, "").strip().rstrip(URL_TAIL_SLASH),
                  model=os.environ.get(ENV_LLM_MODEL, LLM_MODEL_DEFAULT))


def read_brief_cache() -> dict[str, BriefRecord]:
    """读上轮产出(缺文件 = 空表)。"""
    cache: dict[str, BriefRecord] = {}
    if OUT_BRIEF.exists():
        for sl, d in json.loads(OUT_BRIEF.read_text(encoding=TEXT_ENCODING)).items():
            cache[sl] = BriefRecord.model_validate(d)
    return cache


def pick_brief_todo(x: PickBriefIn) -> list[tuple[str, AboutRecord]]:
    """有正文且还没做成 ok 的(失败冷却 RETRY_FAILED_DAYS),按 about 表序,凑够 limit 即止。"""
    todo: list[tuple[str, AboutRecord]] = []
    for sl, a in x.about.items():
        if len(todo) >= x.limit:
            break
        if a.status != ST_OK:
            continue
        c = x.cache.get(sl)
        if c is not None:
            if c.status == ST_OK:
                continue
            if days_since(c.fetched) <= RETRY_FAILED_DAYS:
                continue
        todo.append((sl, a))
    return todo


def brief_one(x: BriefOneIn) -> BriefRecord:
    """一家:英文五节(缺标记/NOT_FOUND 记 fail)→ 中文五节(缺标记只空中文,英文照收)。"""
    rec = BriefRecord(name=x.about.name, model=x.cfg.model, fetched=now_iso(), sources=[x.about.website])
    if x.about.about_url != "":
        rec.sources.append(x.about.about_url)
    try:
        en = call_company_llm(LlmCallIn(client=x.client, cfg=x.cfg, tokens=BRIEF_TOKENS,
                                        prompt=BRIEF_PROMPT_TPL.format(name=x.about.name, text=x.about.text)))
        en = MARK_COLON_RE.sub(MARK_SPACE, en)
        if en.startswith(NOT_FOUND) or not has_brief_marks(en):
            rec.status = ST_FAIL
            rec.note = NOTE_MARKERS
            return rec
        rec.brief = en
        zh = call_company_llm(LlmCallIn(client=x.client, cfg=x.cfg, tokens=BRIEF_ZH_TOKENS,
                                        prompt=BRIEF_ZH_PROMPT_TPL.format(text=en)))
    except Exception as e:  # noqa: BLE001
        rec.status = ST_FAIL
        rec.note = type(e).__name__
        return rec
    zh = MARK_COLON_RE.sub(MARK_SPACE, zh)
    if has_brief_marks(zh):
        rec.brief_zh = zh
    else:
        rec.note = NOTE_ZH_MARKERS
    rec.status = ST_OK
    return rec


def call_company_llm(x: LlmCallIn) -> str:
    """单轮生成:Ollama /api/generate,think 关,剥 think 块双保险。"""
    r = x.client.post(x.cfg.base + PATH_OLLAMA_GENERATE,
                      json={P_MODEL: x.cfg.model, P_PROMPT: x.prompt, P_STREAM: False, P_THINK: False,
                            P_OPTIONS: {P_NUM_PREDICT: x.tokens, P_TEMPERATURE: LLM_TEMPERATURE}})
    if not r.is_success:
        raise RuntimeError(NOTE_HTTP_TPL.format(status=r.status_code))
    body = r.json()
    if not isinstance(body, dict):
        return ""
    return THINK_RE.sub("", str(body.get(P_RESPONSE, ""))).strip()


def has_brief_marks(text: str) -> bool:
    """五个节标记是否都在行首出现。"""
    for m in BRIEF_MARKS:
        if not text.startswith(m) and (NEWLINE + m) not in text:
            return False
    return True


def what_line_of(rec: BriefRecord) -> str:
    """[WHAT] 那一行(报数用;fail 时回 note)。"""
    if rec.status != ST_OK:
        return rec.note
    for line in rec.brief.splitlines():
        if line.startswith(BRIEF_MARKS[0]):
            return line
    return ""
