"""
company 域函数 —— 全部行为住这(三件套形制**全站样张**,2026-08-30 Frank 连环拍:
「先拿一个做样章」「enrich/scrape 都溶进三件」「顶层只许函数」「不允许有字符串」)。

四个步骤文件 2026-08-30 溶入本文件成四段,各段入口函数与原脚本同名。
**零字符串令**:体内不留任何字面量 —— 文案全部 *_TPL 模板住 constants,分隔符/后缀/
协议词全部具名;唯三豁免(纯语法位):字典键(访问/构造/get 默认)、空串、数值。
**显式循环令 + 一参令**(2026-08-30 Frank):推导式/genexp/lambda 全禁改显式 for;
一函数至多一参,多入参收 scheme 的 XxxIn 形状 —— 全部由形制闸 AST 硬规则兜底。
IN/OUT 路径与全部常量住 constants(_paths 唯一特批洞);形制闸有 AST 硬规则兜底。
收拢判据照 cms 同律:重复才收(段1);单消费者函数留在自己的段里。
写盘一律 _paths.write_json(原子+重试);依赖单边:本文件 → constants/scheme + _paths。
"""
import html as html_lib
import json
import time
from typing import cast
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

import _paths
from company.constants import (
    ALIAS_SPLIT_RE, ATS_HOSTS, BROWSER_UA, CAREERS_FILE, CAREERS_PATH_RE, CAREERS_RE,
    CAREERS_STEM_SUFFIX, CAREERS_TIMEOUT_S, COL_TRIM_CHARS, COMMON_CAREER_PATHS,
    DDG_GUARD_N, DDG_HTML_URL, DDG_QUERY_TPL, DDG_REDIRECT_PARAM, DDG_RESULT_RE, DDG_SCAN_N,
    DDG_TIMEOUT_S, DESC_LEN_MAX, DESC_P_MIN_LEN, DOT_SEP, EMAIL_DOMAIN_RE, ENRICH_LIMIT,
    ENRICH_MIN_INTERVAL_S, ENRICH_REFRESH_DAYS, FETCH_SLEEP_S, FETCH_TIMEOUT_S,
    FIND_CLIENT_TIMEOUT_S, FIND_LIMIT, FIND_SLEEP_S, FOUND_JD, FOUND_SEARCHED, GENERIC_MAIL,
    GOV_DOMAIN_SUFFIX, GUARD_TIMEOUT_S, HTML_PARSER, HTTPS_PREFIX, IN_CAREERS_DIRECTORY,
    IN_ENRICH_ATS, IN_ENRICH_JD_DETAILS, IN_ENRICH_POSTINGS, IN_FOLDERS_CAREERS,
    IN_FOLDERS_DIRECTORY, INDEX_FILE, ISO_UTC_OFFSET, ISO_Z, JD_HEAD_LEN, JD_URL_LINE_RE,
    KANATA_ADDR_SEL, KANATA_AJAX_ACTION, KANATA_AJAX_URL, KANATA_CARD_SEL, KANATA_COL_SEL,
    KANATA_DESC_SEL, KANATA_LBL_EMAIL, KANATA_LBL_LOCATION, KANATA_LBL_PHONE,
    KANATA_LBL_WEBSITE, KANATA_NAME_SEL, KANATA_PAGE_FIRST, KANATA_PAGE_SIZE, KANATA_REFERER,
    KANATA_REGION_LABEL, KANATA_STEM, KANATA_TERMS_SEL, KANATA_TIMEOUT_S, KEYWORDS_SPLIT_SEP,
    CAREERS_WORKERS,
    KEYWORDS_TOP_N, LINK_TAG, LIST_JOIN_SEP, MD_GLOB, META_DESC_PATTERNS,
    META_KEYWORDS_PATTERNS, NAME_STOP, NAME_TOKEN_RE, NONALNUM_RE, NOT_OFFICIAL,
    NOTE_HTTP_TPL, NOTE_NO_CAREERS, NOTE_NO_META, OUT_ENRICH_CACHE, OUT_FOLDERS_ROOT,
    OUT_KANATA_DIR, P_TAG_RE, POLITE_UA, PORT_SEP, PRINT_ATS_DIST_LABEL,
    PRINT_CAREERS_DONE_TPL, PRINT_CAREERS_RESOLVING_TPL, PRINT_ENRICH_DONE_TPL,
    PRINT_ENRICH_IN_TPL, PRINT_ENRICH_SKIP_TPL, PRINT_FIND_TPL, PRINT_FOLDERS_TPL,
    PRINT_KANATA_TPL, PRINT_TARGETS_TPL, PROFILE_FILE, READ_ERRORS, RETRY_FAILED_DAYS,
    RETRY_NOSITE_DAYS, SCHEME_PREFIX, SITE_NAME_RE, SLUG_DASH, SLUG_DUP_TPL, SLUG_FALLBACK,
    SLUG_LEN_MAX, SLUG_RE, ST_FAIL, ST_FOUND, ST_NOSITE, ST_OK, STATUS_ERR_TPL, SUFFIX_JSON,
    TAG_STRIP_RE, TECH_TERMS, TEXT_ENCODING, TEXT_JOIN_SEP, TITLE_RE, TITLE_SNIFF_LEN,
    URL_DEFAULT_SCHEME, URL_ROOT_TPL, URL_SCHEMES, URL_DOMAIN_RE, WS_FOLD_RE, WWW_PREFIX,
)
from company.scheme import (
    CareersProbe, CompanyRow, DdgFindIn, EnrichRecord, FetchProfileIn, FetchTextIn,
    FindWebsitesIn, GuardMatchIn, HttpClientLike, PickTodoIn,
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
    """按行业标签+简介判「算不算科技公司」(粗筛,判据表=constants.TECH_TERMS 唯一来源)。

    2026-08-30 收拢:取 careers 版的 .get 防御形(目录行经手工编辑过可能缺格),
    判据表取超集(漂移经过见 constants.TECH_TERMS 注释)。
    """
    blob = (c.get("sectors", "") + TEXT_JOIN_SEP + c.get("description", "")).lower()
    for t in TECH_TERMS:
        if t in blob:
            return True
    return False


# =========================================================================
# 2. Kanata 目录抓取(Stage 1:雇主全集种子;休眠引导工具,手动 main --only kanata)
# =========================================================================


def fetch_kanata_companies() -> list[CompanyRow]:
    """逆向直取 Kanata North BA 会员目录(免浏览器)。

    页面前端渲染,但数据从主题的 WordPress AJAX(KANATA_AJAX_ACTION,一页要足量)
    一次可全量取回,每家公司一张卡片(KANATA_CARD_SEL),解析九格。

    @returns 目录行清单(有名字的才收)。
    """
    with httpx.Client(headers={"User-Agent": BROWSER_UA, "Referer": KANATA_REFERER},
                      follow_redirects=True, timeout=KANATA_TIMEOUT_S) as c:
        r = c.get(KANATA_AJAX_URL, params={"action": KANATA_AJAX_ACTION,
                                           "paged": KANATA_PAGE_FIRST,
                                           "posts_per_page": KANATA_PAGE_SIZE})
        r.raise_for_status()
        payload = r.json()
    posts = payload["data"]["posts"]
    doc = "".join(posts) if isinstance(posts, list) else posts
    soup = BeautifulSoup(doc, HTML_PARSER)
    rows: list[CompanyRow] = []
    for art in soup.select(KANATA_CARD_SEL):
        def col(label: str) -> str:
            """卡片里明细列的「Label: value」取值。"""
            for d in art.select(KANATA_COL_SEL):
                txt = WS_FOLD_RE.sub(TEXT_JOIN_SEP, d.get_text(TEXT_JOIN_SEP, strip=True))
                if txt.lower().startswith(label.lower()):
                    return txt[len(label):].strip(COL_TRIM_CHARS)
            return ""
        name = art.select_one(KANATA_NAME_SEL)
        desc = art.select_one(KANATA_DESC_SEL)
        terms = art.select_one(KANATA_TERMS_SEL)
        addr = art.select_one(KANATA_ADDR_SEL)
        rows.append({
            "name": name.get_text(strip=True) if name else "",
            "website": col(KANATA_LBL_WEBSITE),
            "email": col(KANATA_LBL_EMAIL),
            "phone": col(KANATA_LBL_PHONE),
            "address": col(KANATA_LBL_LOCATION) or (addr.get_text(strip=True) if addr else ""),
            "sectors": WS_FOLD_RE.sub(TEXT_JOIN_SEP, terms.get_text(LIST_JOIN_SEP, strip=True)) if terms else "",
            "description": WS_FOLD_RE.sub(TEXT_JOIN_SEP, desc.get_text(TEXT_JOIN_SEP, strip=True)) if desc else "",
            "careers_page": "",
            "region": KANATA_REGION_LABEL,
        })
    named: list[CompanyRow] = []
    for r in rows:
        if r["name"]:
            named.append(r)
    return named


def scrape_kanata_directory() -> None:
    """Kanata 目录抓取入口:抓全量会员 → 落 kanata-north.json。

    2026-08-30 简化(Frank「代码逻辑能不能简化」):csv+md 榜单副产物零消费者
    (六月引导期给人翻的),连逻辑带 27 枚常量整体退役 —— json 是唯一产出。
    """
    rows = fetch_kanata_companies()
    OUT_KANATA_DIR.mkdir(parents=True, exist_ok=True)
    _paths.write_json((OUT_KANATA_DIR / KANATA_STEM).with_suffix(SUFFIX_JSON), rows)
    tech_n = 0
    for r in rows:
        if is_tech(r):
            tech_n += 1
    print(PRINT_KANATA_TPL.format(n=len(rows), tech=tech_n, out=OUT_KANATA_DIR / KANATA_STEM))


# =========================================================================
# 3. 一司一档(Stage 1.5:扁平目录 → processed/ats/<slug>/;休眠引导工具)
# =========================================================================


def build_company_folders() -> None:
    """一司一档入口:profile.json(+careers.json)+ _index.json。

    每家公司一个文件夹,后续阶段(jobs/linkedin/…)往同一夹里累积;slug 撞名挂序号消歧;
    目录行缺 region 格时兜 KANATA_REGION_LABEL(原 CLI 参数随一参令退役)。
    """
    fallback_region = KANATA_REGION_LABEL
    companies = json.loads(IN_FOLDERS_DIRECTORY.read_text(encoding=TEXT_ENCODING))
    careers_by_name: dict[str, dict] = {}
    if IN_FOLDERS_CAREERS.exists():
        for c in json.loads(IN_FOLDERS_CAREERS.read_text(encoding=TEXT_ENCODING)):
            careers_by_name[c["name"].lower()] = c
    OUT_FOLDERS_ROOT.mkdir(parents=True, exist_ok=True)
    seen: dict[str, int] = {}
    made = careers_written = 0
    index = []
    for co in companies:
        name = co.get("name") or co.get("employer") or ""
        if not name:
            continue
        slug = slugify(name)
        if slug in seen:
            seen[slug] += 1
            slug = SLUG_DUP_TPL.format(slug=slug, n=seen[slug])
        else:
            seen[slug] = 0
        folder = OUT_FOLDERS_ROOT / slug
        folder.mkdir(parents=True, exist_ok=True)
        profile = {
            "name": name,
            "slug": slug,
            "region": co.get("region", fallback_region),
            "website": co.get("website", ""),
            "email": co.get("email", ""),
            "phone": co.get("phone", ""),
            "sectors": co.get("sectors", ""),
            "address": co.get("address", ""),
            "description": co.get("description", ""),
        }
        _paths.write_json(folder / PROFILE_FILE, profile)
        made += 1
        car = careers_by_name.get(name.lower())
        if car and (car.get("careers_url") or car.get("ats")):
            _paths.write_json(folder / CAREERS_FILE, {
                "careers_url": car.get("careers_url", ""),
                "ats": car.get("ats", ""),
                "status": car.get("status", ""),
            })
            careers_written += 1
        index.append({"slug": slug, "name": name, "website": profile["website"],
                      "has_careers": bool(car and car.get("careers_url"))})
    _paths.write_json(OUT_FOLDERS_ROOT / INDEX_FILE, index)
    print(PRINT_FOLDERS_TPL.format(region=fallback_region, made=made,
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
    """静默取页面文本(探路用:任何失败都返回空串不抛 —— 探路失败是常态不是异常)。

    @param x 入参形状(client/url/want_status)。
    @returns 页面文本;失败为空串。
    """
    try:
        r = x["client"].get(x["url"])
        if x.get("want_status", False) and r.status_code >= 400:
            return ""
        return r.text
    except Exception:  # noqa: BLE001
        return ""


def find_careers(website: str) -> CareersProbe:
    """单个公司官网 → 招聘页 URL + ATS 识别。

    先扫首页链接(直指 ATS 的最优,career/jobs 路径次之),没有再逐个探常见路径;
    全程第一方官网,不碰聚合站。

    @param website 公司官网 URL。
    @returns 探测结果(全空格 = 没找到)。
    """
    out: CareersProbe = {"careers_url": "", "ats": "", "status": "", "note": ""}
    try:
        with httpx.Client(headers={"User-Agent": BROWSER_UA}, follow_redirects=True,
                          timeout=CAREERS_TIMEOUT_S) as c:
            r = c.get(website)
            out["status"] = str(r.status_code)
            page = r.text
            out["ats"] = detect_ats(page)
            soup = BeautifulSoup(page, HTML_PARSER)
            best = ""
            for a in soup.find_all(LINK_TAG, href=True):
                href, text = str(a["href"]), a.get_text(TEXT_JOIN_SEP, strip=True)
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
                out["careers_url"] = best
                if not out["ats"]:
                    out["ats"] = detect_ats(fetch_text({"client": cast(HttpClientLike, c), "url": best}))
                return out
            root = URL_ROOT_TPL.format(scheme=urlparse(str(r.url)).scheme,
                                       netloc=urlparse(str(r.url)).netloc)
            for p in COMMON_CAREER_PATHS:
                u = root + p
                hh = fetch_text({"client": cast(HttpClientLike, c), "url": u, "want_status": True})
                if hh:
                    out["careers_url"] = u
                    out["ats"] = detect_ats(hh) or out["ats"]
                    return out
            out["note"] = NOTE_NO_CAREERS
    except Exception as e:  # noqa: BLE001
        out["status"] = STATUS_ERR_TPL.format(name=type(e).__name__)
    return out


def careers_order_of(r: dict) -> tuple:
    """careers 结果排序键:有 ATS 的在前 → 有 careers 页的在前 → 名字典序(lambda 退役,2026-08-30)。"""
    return (r["ats"] == "", not r["careers_url"], r["name"].lower())


def scrape_company_careers() -> None:
    """careers 定位入口:目录内 tech 公司并发探官网 → 落 -careers.json。

    2026-08-30 简化:csv+md 副产物零消费者退役;process_all/workers 两个 CLI 参数
    随一参令收编(并发数=constants.CAREERS_WORKERS,要全量改常量另跑)。
    """
    companies = json.loads(IN_CAREERS_DIRECTORY.read_text(encoding=TEXT_ENCODING))
    targets = []
    for c in companies:
        if c.get("website") and is_tech(c):
            targets.append(c)
    print(PRINT_CAREERS_RESOLVING_TPL.format(n=len(targets), workers=CAREERS_WORKERS))
    results = []
    with ThreadPoolExecutor(max_workers=CAREERS_WORKERS) as ex:
        futs = {}
        for c in targets:
            futs[ex.submit(find_careers, c["website"])] = c
        for fut in as_completed(futs):
            c = futs[fut]
            r = fut.result()
            row = {"name": c["name"], "website": c["website"],
                   "sectors": c.get("sectors", ""), "email": c.get("email", "")}
            row.update(r)
            results.append(row)
    results.sort(key=careers_order_of)
    stem = IN_CAREERS_DIRECTORY.with_name(IN_CAREERS_DIRECTORY.stem + CAREERS_STEM_SUFFIX)
    _paths.write_json(stem.with_suffix(SUFFIX_JSON), results)
    ats_dist: dict = {}
    found_n = 0
    ats_n = 0
    for r in results:
        if r["careers_url"]:
            found_n += 1
        if r["ats"]:
            ats_n += 1
            ats_dist[r["ats"]] = ats_dist.get(r["ats"], 0) + 1
    print(PRINT_CAREERS_DONE_TPL.format(found=found_n, n=len(results),
                                        ats=ats_n, out=stem.with_suffix(SUFFIX_JSON)))
    print(PRINT_ATS_DIST_LABEL, ats_dist)


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
    (client=None 死分支 2026-08-30 随一参令砍:全部调用方都带 client。)

    @param x 入参形状(client/name/dom)。
    @returns True = 达阈值,认。
    """
    toks = name_tokens(x["name"])
    dom = x["dom"]
    if not toks or is_blocked_domain(dom):
        return False
    core = NONALNUM_RE.sub("", DOT_SEP.join(dom.split(DOT_SEP)[:-1]))
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
        r = x["client"].get(HTTPS_PREFIX + dom, timeout=GUARD_TIMEOUT_S)
        head = r.text[:TITLE_SNIFF_LEN].lower()
        m = TITLE_RE.search(head)
        site = SITE_NAME_RE.search(head)
        text = (m.group(1) if m else "") + TEXT_JOIN_SEP + (site.group(1) if site else "")
        text_hits = 0
        for t in toks:
            if t in text:
                text_hits += 1
        return text_hits >= max(1, (len(toks) + 1) // 2)
    except Exception:  # noqa: BLE001
        return False


def jd_domain_hints() -> dict[str, set[str]]:
    """找官网①:posting url → 已抓 JD .md → 正文里的邮箱/链接域名。

    @returns slug → 候选域名集(已滤聚合/通用邮箱域)。
    """
    if not IN_ENRICH_JD_DETAILS.exists() or not IN_ENRICH_POSTINGS.exists():
        return {}
    url2md: dict[str, Path] = {}
    for p in IN_ENRICH_JD_DETAILS.rglob(MD_GLOB):
        try:
            m = JD_URL_LINE_RE.search(p.read_text(encoding=TEXT_ENCODING, errors=READ_ERRORS)[:JD_HEAD_LEN])
        except Exception:  # noqa: BLE001, S112  # 探 4 万个 JD 文件,单个读不动是常态;行数在汇总层报
            continue
        if m:
            url2md.setdefault(m.group(1).strip(), p)
    hints: dict[str, set[str]] = {}
    for j in json.loads(IN_ENRICH_POSTINGS.read_text(encoding=TEXT_ENCODING)):
        if j.get("website") or not j.get("employer"):
            continue
        p = url2md.get(j.get("url") or "")
        if not p:
            continue
        try:
            body = p.read_text(encoding=TEXT_ENCODING, errors=READ_ERRORS)
        except Exception:  # noqa: BLE001, S112  # 同上:海量文件探读,单个失败不值一条日志
            continue
        doms: set[str] = set()
        for d in EMAIL_DOMAIN_RE.findall(body) + URL_DOMAIN_RE.findall(body):
            dom = domain_of(d)
            if dom and not is_blocked_domain(dom):
                doms.add(dom)
        if doms:
            hints.setdefault(slugify(j["employer"]), set()).update(doms)
    return hints


def ddg_find(x: DdgFindIn) -> str:
    """找官网②:DuckDuckGo HTML 搜索兜底,前三个非聚合域逐个过护栏(含首页标题复核)。

    @param x 入参形状(client/name/province)。
    @returns 命中的官网 URL;找不到/对不上为空串。
    """
    try:
        query = DDG_QUERY_TPL.format(name=x["name"], province=x["province"])
        r = x["client"].get(DDG_HTML_URL, params={"q": query}, timeout=DDG_TIMEOUT_S)
        if not r.is_success:
            return ""
    except Exception:  # noqa: BLE001
        return ""
    seen: list[str] = []
    for href in DDG_RESULT_RE.findall(r.text)[:DDG_SCAN_N]:
        target = href
        if DDG_REDIRECT_PARAM in href:
            target = unquote(parse_qs(urlparse(href).query).get(DDG_REDIRECT_PARAM, [""])[0])
        dom = domain_of(target)
        if dom and dom not in seen and not is_blocked_domain(dom):
            seen.append(dom)
    for dom in seen[:DDG_GUARD_N]:
        if guard_match({"client": x["client"], "name": x["name"], "dom": dom}):
            return HTTPS_PREFIX + dom
    return ""


def now_iso() -> str:
    """UTC 当下时刻(ISO,Z 结尾)—— EnrichRecord.fetched 的口径。"""
    return datetime.now(timezone.utc).isoformat().replace(ISO_UTC_OFFSET, ISO_Z)


def days_since(iso: str) -> float:
    """ISO 时刻距今的天数(解析不了按无穷大 —— 视同「早该刷新」)。"""
    try:
        dt = datetime.fromisoformat(iso.replace(ISO_Z, ISO_UTC_OFFSET))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except Exception:  # noqa: BLE001
        return 1e9


def clean_text(s: str) -> str:
    """HTML 实体解码 + 折空白 + 截 DESC_LEN_MAX。"""
    t = html_lib.unescape(s or "")
    t = WS_FOLD_RE.sub(TEXT_JOIN_SEP, t).strip()
    return t[:DESC_LEN_MAX].strip()


def extract_meta(page: str) -> dict:
    """首页 HTML → 简介/行业(纯正则,不依赖 bs4;拿不到就空,不猜)。

    简介取 og:description / meta description,都没有兜首个 ≥DESC_P_MIN_LEN 字的 <p>;
    行业取 meta keywords 前 KEYWORDS_TOP_N 个。
    """
    def meta(patterns: tuple) -> str:
        """按模式序取第一个非空 content(模式已在 constants 预编译)。"""
        for pat in patterns:
            m = pat.search(page)
            if m and m.group(1).strip():
                return m.group(1).strip()
        return ""
    desc = meta(META_DESC_PATTERNS)
    if not desc:
        for m in P_TAG_RE.finditer(page):
            txt = TAG_STRIP_RE.sub("", m.group(1)).strip()
            if len(txt) >= DESC_P_MIN_LEN:
                desc = txt
                break
    kw = meta(META_KEYWORDS_PATTERNS)
    parts = []
    for k in kw.split(KEYWORDS_SPLIT_SEP)[:KEYWORDS_TOP_N]:
        if k.strip():
            parts.append(k.strip())
    sectors = LIST_JOIN_SEP.join(parts) if kw else ""
    return {"description": clean_text(desc), "sectors": clean_text(sectors)}


def company_targets() -> tuple[dict[str, dict], dict[str, dict]]:
    """postings → (有官网 targets, 无官网 nosite),均排除 ATS(自带 profile)。

    @returns targets: slug → name/website;nosite: slug → name/province/jobs
             (jobs=岗数,找官网时按价值密度排序;部分帖带官网=有官网,从 nosite 剔除)。
    """
    targets: dict[str, dict] = {}
    nosite: dict[str, dict] = {}
    if not IN_ENRICH_POSTINGS.exists():
        return targets, nosite
    ats_slugs: set[str] = set()
    if IN_ENRICH_ATS.exists():
        for entry in IN_ENRICH_ATS.iterdir():
            ats_slugs.add(entry.name)
    for j in json.loads(IN_ENRICH_POSTINGS.read_text(encoding=TEXT_ENCODING)):
        emp = j.get("employer") or ""
        if not emp:
            continue
        sl = slugify(emp)
        if sl in ats_slugs:
            continue
        site = (j.get("website") or "").strip()
        if site:
            if not site.startswith(URL_SCHEMES):
                site = HTTPS_PREFIX + site
            targets.setdefault(sl, {"name": emp, "website": site})
        else:
            rec = nosite.setdefault(sl, {"name": emp, "province": j.get("province") or "", "jobs": 0})
            rec["jobs"] += 1
    only_nosite: dict[str, dict] = {}
    for sl, v in nosite.items():
        if sl not in targets:
            only_nosite[sl] = v
    return targets, only_nosite


def nosite_priority_of(kv: tuple) -> int:
    """无官网公司的搜索优先级键:岗多的先搜=价值密度高(lambda 退役,2026-08-30)。"""
    return -kv[1]["jobs"]


def find_websites(x: FindWebsitesIn) -> tuple[int, int]:
    """D2 找官网阶梯:① JD 线索(全量,便宜)→ ② DDG 搜索(限量,礼貌限速)。

    命中 → 进 targets(带 found 标记)并立即记缓存(status=found,防本轮 limit
    截断丢结果);搜不到 → 记 nosite 冷却 RETRY_NOSITE_DAYS。

    @param x 入参形状(cache/targets/nosite/find_limit;cache 与 targets 原地更新)。
    @returns (JD 命中数, 搜索命中数)。
    """
    cache, targets, nosite = x["cache"], x["targets"], x["nosite"]
    found_jd = found_search = 0

    def cache_skip(sl: str) -> bool:
        """已有官网或还在冷却期的公司,本轮不再找。"""
        c = cache.get(sl)
        return c is not None and bool(c.get("website") or days_since(c.get("fetched", "")) <= RETRY_NOSITE_DAYS)

    hints = jd_domain_hints()
    with httpx.Client(follow_redirects=True, timeout=FIND_CLIENT_TIMEOUT_S,
                      headers={"User-Agent": POLITE_UA}, verify=False) as client:
        for sl, v in nosite.items():
            if sl in targets or cache_skip(sl) or sl not in hints:
                continue
            for dom in sorted(hints[sl]):
                if guard_match({"client": cast(HttpClientLike, client), "name": v["name"], "dom": dom}):
                    site = HTTPS_PREFIX + dom
                    targets[sl] = {"name": v["name"], "website": site, "found": FOUND_JD}
                    cache[sl] = {"name": v["name"], "website": site, "found": FOUND_JD,
                                 "status": ST_FOUND, "fetched": now_iso()}
                    found_jd += 1
                    break
        budget = x["find_limit"]
        for sl, v in sorted(nosite.items(), key=nosite_priority_of):
            if budget <= 0:
                break
            if sl in targets or cache_skip(sl):
                continue
            budget -= 1
            site = ddg_find({"client": cast(HttpClientLike, client), "name": v["name"], "province": v["province"]})
            if site:
                targets[sl] = {"name": v["name"], "website": site, "found": FOUND_SEARCHED}
                cache[sl] = {"name": v["name"], "website": site, "found": FOUND_SEARCHED,
                             "status": ST_FOUND, "fetched": now_iso()}
                found_search += 1
            else:
                cache[sl] = {"name": v["name"], "status": ST_NOSITE, "fetched": now_iso()}
            time.sleep(FIND_SLEEP_S)
    return found_jd, found_search


def pick_todo(x: PickTodoIn) -> list[tuple[str, dict]]:
    """挑本轮要抓的公司:缓存缺失 / 刚找到官网(found)/ 成功过期 / 失败超冷却。

    @param x 入参形状(cache/targets/refresh_days)。
    """
    cache = x["cache"]
    todo = []
    for sl, info in x["targets"].items():
        c = cache.get(sl)
        if c is None or c.get("status") == ST_FOUND:
            todo.append((sl, info))
        elif c.get("status") == ST_OK and days_since(c.get("fetched", "")) > x["refresh_days"]:
            todo.append((sl, info))
        elif c.get("status") == ST_FAIL and days_since(c.get("fetched", "")) > RETRY_FAILED_DAYS:
            todo.append((sl, info))
    return todo


def fetch_profile(x: FetchProfileIn) -> EnrichRecord:
    """抓一家公司首页 → EnrichRecord(ok 带简介/行业;抓不到记 fail 原因,不抛)。

    @param x 入参形状(client/info)。
    """
    info = x["info"]
    rec: EnrichRecord = {"name": info["name"], "website": info["website"], "fetched": now_iso()}
    if info.get("found"):
        rec["found"] = info["found"]
    try:
        r = x["client"].get(info["website"])
        if r.is_success and r.text:
            data = extract_meta(r.text)
            if data["description"] or data["sectors"]:
                rec.update(data)
                rec["status"] = ST_OK
            else:
                rec["status"] = ST_FAIL
                rec["note"] = NOTE_NO_META
        else:
            rec["status"] = ST_FAIL
            rec["note"] = NOTE_HTTP_TPL.format(status=r.status_code)
    except Exception as e:  # noqa: BLE001
        rec["status"] = ST_FAIL
        rec["note"] = type(e).__name__
    return rec


def enrich_company_websites() -> None:
    """官网富化入口:找官网(D2 阶梯)+ 抓首页提简介/行业,增量落 OUT_ENRICH_CACHE。

    自限流用缓存文件 mtime 当戳 —— 曾把 build 轮拖成 17 分钟大头(2026-07-16 报告),
    拆独立角色后此闸只防容器重启抖动。失败容错:抓不到只记 status 不炸整轮。
    节奏四参(limit/refresh/find-limit/min-interval)原是 CLI 选项,2026-08-30 一参令
    随入口零参化收编 —— 全在 constants,改节奏改常量。
    """
    if ENRICH_MIN_INTERVAL_S and OUT_ENRICH_CACHE.exists():
        age = time.time() - OUT_ENRICH_CACHE.stat().st_mtime
        if age < ENRICH_MIN_INTERVAL_S:
            print(PRINT_ENRICH_SKIP_TPL.format(mins=age / 60, limit=ENRICH_MIN_INTERVAL_S // 60), flush=True)
            return
    cache: dict[str, EnrichRecord] = {}
    if OUT_ENRICH_CACHE.exists():
        cache = json.loads(OUT_ENRICH_CACHE.read_text(encoding=TEXT_ENCODING))
    targets, nosite = company_targets()
    print(PRINT_ENRICH_IN_TPL.format(path=IN_ENRICH_POSTINGS))
    found_jd, found_search = find_websites({"cache": cache, "targets": targets,
                                            "nosite": nosite, "find_limit": FIND_LIMIT})
    for sl, c in cache.items():
        if sl not in targets and c.get("website") and c.get("found"):
            targets[sl] = {"name": c.get("name") or sl, "website": c["website"], "found": c["found"]}
    print(PRINT_FIND_TPL.format(n=len(nosite), jd=found_jd, search=found_search, limit=FIND_LIMIT))
    todo = pick_todo({"cache": cache, "targets": targets,
                      "refresh_days": ENRICH_REFRESH_DAYS})[:ENRICH_LIMIT]
    print(PRINT_TARGETS_TPL.format(targets=len(targets), cache=len(cache), todo=len(todo), limit=ENRICH_LIMIT))
    ok = fail = 0
    with httpx.Client(follow_redirects=True, timeout=FETCH_TIMEOUT_S,
                      headers={"User-Agent": POLITE_UA}, verify=False) as client:
        for sl, info in todo:
            rec = fetch_profile({"client": cast(HttpClientLike, client), "info": info})
            if rec.get("status") == ST_OK:
                ok += 1
            else:
                fail += 1
            cache[sl] = rec
            time.sleep(FETCH_SLEEP_S)
    OUT_ENRICH_CACHE.parent.mkdir(parents=True, exist_ok=True)
    _paths.write_json(OUT_ENRICH_CACHE, cache)
    total_ok = 0
    for c in cache.values():
        if c.get("status") == ST_OK:
            total_ok += 1
    print(PRINT_ENRICH_DONE_TPL.format(ok=ok, fail=fail, total=total_ok, n=len(cache),
                                       out=OUT_ENRICH_CACHE.name))
