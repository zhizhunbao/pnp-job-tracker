"""crawl.functions — 探索域全部行为(2026-08-30 全溶:cache/browser_fetch/bfs_crawler/
converters/discover_sources 五件收拢;crawl_all/download_md/check_crawl/子类转换器
零消费者退役,md 语料链已死 —— html_cache 才是语料,定向抽取现转)。

与 fetch 的分工:fetch 拿已知 URL,crawl 探未知 URL(BFS → manifest → 缓存);
正门 = from crawl.functions import get_cached_page / convert_md(件套以包名被引)。
通用抓取词(UA/解析器/空白正则)引 fetch.constants,三份 Chrome/131 抄本就此收拢。

日志口径:逐页跳过(404/非 HTML/浏览器拿不回)是探索的设计内损耗,say 留痕不升级;
单省整轮失败、缓存写盘失败、浏览器启动失败走 err(✗ 升 ERROR)。
"""
from __future__ import annotations

import ast
import asyncio
import hashlib
import json
import shutil
import sys
from datetime import date, datetime
from pathlib import Path
from typing import cast
from urllib.parse import urldefrag, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Comment, NavigableString, Tag

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import paths
from log.functions import err, say
from fetch.constants import BROWSER_UA, HDR_UA, LINE_SEP, PARA_SEP, PARSER_HTML, SPACE_SEP, WS_RE
from crawl.constants import (ACCEPT_HTML, ACCEPT_LANGUAGE, ADMONITION_TITLE_CLASS, ADMONITION_WORDS, ATTR_ALT,
                             ATTR_CLASS, ATTR_SRC, ATTR_TITLE, BLANKS_RE, BLOCK_TAGS, BOLD_TAGS,
                             BROWSER_ARGS, CELL_TAGS, CHALLENGE_SNIFF_LEN, CHALLENGE_TIMEOUT_MS,
                             CHANGES_FILE, COND_AND, CONSTANTS_GLOB, CT_HTML, DEFAULT_CONTENT_SELECTORS,
                             DEFAULT_REMOVE_SELECTORS, DIFF_SHOW_MAX, DISCOVER_CONCURRENCY,
                             DOMCONTENTLOADED, EE_CAT_MAP, EE_EXPAND_JS, EE_EXPAND_WAIT_MS, ERRORS_REPLACE,
                             EE_EXTRACT_JS, EE_NOC_RE, EE_NUM_RE, EE_OUT_FILE, EE_SOURCE_LABEL,
                             EE_TEER_RE, EE_URL, EM_TAGS, ENC_UTF8, FM_TPL,
                             ETL_DIR_NAME,
                             GUARD_ALL_FAILED, H_LEVEL_TPL, HDR_ACCEPT, HDR_ACCEPT_LANGUAGE,
                             HDR_CONTENT_TYPE, HEADING_TAGS, HTML_CACHE_DIR, HTML_CHALLENGE_MARKERS,
                             HTML_SUFFIX, HTTP_FORBIDDEN, HTTP_TIMEOUT_S, IFRAME_TITLE_FALLBACK,
                             K_ADDED, K_CAT, K_CATEGORIES, K_CRAWLED_AT, K_DATE,
                             K_FETCHED, K_GONE, K_HEIGHT, K_HTML, K_KEY, K_LABEL, K_MAX_DEPTH,
                             K_NOC, K_OCCUPATIONS, K_PAGES, K_ROWS, K_SEED_URL, K_SEEN, K_SLUG, K_SOURCE,
                             K_STATUS, K_TEER, K_TITLE, K_TOTAL, K_TOTAL_URLS, K_URL, K_WIDTH,
                             KEYWORDS_SEP, LANG_CLASS_RE, LANG_STOPWORDS, LIST_TAGS, LOCALE, MANIFEST_FILE,
                             MANIFEST_GLOB, MANIFEST_PREV_FILE, MD_BOLD_TPL, MD_CELL_SEP,
                             MD_DD_INDENT, MD_EM_TPL, MD_FENCE, MD_H, MD_HEADER_DASH, MD_HR,
                             MD_IMG_TPL, MD_LINK_TPL, MD_OL_TPL, MD_QUOTE_PREFIX,
                             MD_QUOTE_TITLE_TPL, MD_ROW_EDGE, MD_ROW_END, MD_TICK, MD_TICK2_TPL,
                             MD_TICK_TPL, MD_UL_PREFIX, MD_VIDEO_TPL, NAV_TIMEOUT_MS, NETWORKIDLE,
                             NETWORK_IDLE_MS, NOTE_FIRST_ROUND, NOTE_NO_CHANGE, PRINT_BFS_CFG_TPL,
                             PRINT_BFS_START_TPL, PRINT_BROWSER_200_TPL, PRINT_BROWSER_403_TPL,
                             PRINT_BROWSER_DOWN, PRINT_BROWSER_NONE, PRINT_CHALLENGE_OK,
                             PRINT_CHALLENGE_TIMEOUT, PRINT_CHALLENGE_WAIT_TPL,
                             PRINT_DISCOVER_DONE_TPL, PRINT_EE_CAT_TPL, PRINT_EE_DONE_TPL,
                             PRINT_LEVEL_TPL, PRINT_MANIFEST_TPL, PRINT_PAGE_TPL, PRINT_RADAR_ADD_TPL,
                             PRINT_RADAR_GONE_TPL, PRINT_RADAR_TPL, PRINT_SEED_OK_TPL, PRINT_SEED_TPL,
                             PRINT_SKIP_ERR_TPL, PRINT_SKIP_HTTP_TPL, PROFILE_DIR, SCROLL_PASSES,
                             SCROLL_PAUSE_MS, SCROLL_STEP_PX, SEEDS, SEED_TIMEOUT_S,
                             SKIP_EXTENSIONS, SKIP_HREF_PREFIXES, SKIP_PATH_PATTERNS, STATUS_OK,
                             URL_DEAD_CODES, URL_HTTP_PREFIXES, URL_SKIP_MARKS, URL_TIMEOUT_S,
                             URLS_P_DEAD_TPL, URLS_P_HTTP_TPL, URLS_P_MOVED_TPL, URLS_P_OK_TPL,
                             URLS_P_SOFT_TPL, URLS_P_SUMMARY_TPL, URL_CDN_SUFFIXES, WWW_PREFIX,
                             STEALTH_JS, TAG_A, TAG_BLOCKQUOTE, TAG_CODE, TAG_DD, TAG_DL, TAG_DT,
                             TAG_HR, TAG_IFRAME, TAG_IMG, TAG_OL, TAG_P, TAG_PRE, TAG_SOURCE,
                             TAG_TABLE, TAG_TR, TAG_VIDEO, TIMESPEC_SECONDS, TITLE_CHALLENGE_MARKERS, TITLE_COND_TPL,
                             URL_SLASH, SCHEME_SEP, VIEWPORT_H, VIEWPORT_W, WAIT_FN_TPL)
from crawl.scheme import (HttpAsyncClientLike, PageLike,
                          CacheHit, ConvertIn, CrawlCtx, DiscoverIn, EeCat, FetchPageIn, InlineIn,
                          PageRow, ScopeIn, SeedSpec, UrlRow, UrlVerdict, WalkIn)
from crawl.variables import CACHE
from fetch.constants import ATTR_HREF, TAG_BR, TAG_LI, TAG_TITLE


# =========================================================================
# 1. 缓存正门(定向抽取从这拿官方页原文,不必自己发请求)
# =========================================================================


def url_variants_of(url: str) -> set:
    """同一页的三种写法(原样 / 去尾斜杠 / 补尾斜杠)—— manifest 里两种都可能出现。"""
    u = (url or "").strip()
    return {u, u.rstrip(URL_SLASH), u.rstrip(URL_SLASH) + URL_SLASH}


def get_cached_page(url: str) -> CacheHit:
    """crawl 缓存里这一页 → CacheHit;没爬到 → CacheHit(None, "")。

    为什么有这个门(2026-08-03 Frank 拍板的延伸):crawl 役每小时把九省官网爬一遍,
    页面原文已躺在 data/crawl/<slug>/html_cache/。定向脚本再 httpx 一次 = 同一页抓两遍,
    且各脚本自己猜 URL(那正是 MB「官方不发运营统计」假结论的病根:2026-08-03 那轮
    mb-mpnp 种子只圈了 /mpnp/,没盖住 /resources/data/,就把「这轮没爬到」写成了
    「官方不公布」)。先查 manifest,再谈抓不到。
    约定:同 URL 多种子命中取 crawled_at 最新;只认 status 200;调用方自决报错还是回退
    (本项目惯例:自校未过保留旧表,别拿半份数据盖好数据)。
    """
    want = url_variants_of(url)
    best = None
    for man in sorted(paths.CRAWL.glob(MANIFEST_GLOB)):
        try:
            d = json.loads(man.read_text(encoding=ENC_UTF8))
        except Exception:  # noqa: BLE001, S112 — 单个 manifest 坏了不拖垮其余种子
            continue
        at = str(d.get(K_CRAWLED_AT) or "")
        for p in d.get(K_PAGES, []):
            if p.get(K_STATUS) != STATUS_OK or not p.get(K_HTML) or p.get(K_URL) not in want:
                continue
            f = man.parent / HTML_CACHE_DIR / p[K_HTML]
            if f.exists() and (best is None or at > best[0]):
                best = (at, f)
    if best is None:
        return CacheHit(html=None, fetched="")
    return CacheHit(html=best[1].read_text(encoding=ENC_UTF8, errors=ERRORS_REPLACE), fetched=best[0][:10])


# =========================================================================
# 2. 浏览器兜底(Cloudflare/Akamai/Radware 挡 httpx 时的有头持久档)
# =========================================================================


def is_challenge_html(html: str) -> bool:
    """HTTP 200 但正文是人机验证壳(挡存脏语料;判词窗口只看前 N 字)。"""
    head = html[:CHALLENGE_SNIFF_LEN].lower()
    for m in HTML_CHALLENGE_MARKERS:
        if m in head:
            return True
    return False


async def get_browser_page() -> PageLike | None:
    """浏览器单例标签(带单件缓存;launch 一次,cf_clearance 随 profile 落盘复用);
    playwright 缺席/启动失败 → None(警告一次,后续 403 页跳过)。"""
    if CACHE.unavailable:
        return None
    if CACHE.page is not None:
        return CACHE.page
    async with CACHE.lock:
        if CACHE.page is not None:
            return CACHE.page
        try:
            from playwright.async_api import async_playwright
            CACHE.pw = await async_playwright().start()
            CACHE.context = await CACHE.pw.chromium.launch_persistent_context(
                str(PROFILE_DIR),
                headless=False,  # 2026-09-01 Frank:全有头(无头基本被封),BROWSER_HEADLESS 开关废除;docker 靠 Xvfb 起显示
                args=list(BROWSER_ARGS),
                user_agent=BROWSER_UA,
                viewport={K_WIDTH: VIEWPORT_W, K_HEIGHT: VIEWPORT_H},
                locale=LOCALE,
                extra_http_headers={HDR_ACCEPT_LANGUAGE: ACCEPT_LANGUAGE},
            )
            await CACHE.context.add_init_script(STEALTH_JS)
            if CACHE.context.pages:
                CACHE.page = CACHE.context.pages[0]
            else:
                CACHE.page = await CACHE.context.new_page()
            return CACHE.page
        except Exception as e:  # noqa: BLE001 — 无 playwright 的机器是预期形态,降级不中断
            CACHE.unavailable = True
            err(PRINT_BROWSER_DOWN, e)
            return None


async def is_page_challenged(page: PageLike) -> bool:
    """当前标签是否停在人机验证页(按标题判词)。"""
    try:
        title = (await page.title()).lower()
    except Exception:  # noqa: BLE001 — 标签导航中标题不可读,按未验证处理
        return False
    for m in TITLE_CHALLENGE_MARKERS:
        if m in title:
            return True
    return False


async def fetch_browser_html(url: str) -> str | None:
    """有头持久浏览器取一页渲染后 HTML(单标签严格串行);验证框等人点、懒加载滚出来。"""
    page = await get_browser_page()
    if page is None:
        return None
    async with CACHE.sem:
        try:
            await page.goto(url, wait_until=DOMCONTENTLOADED, timeout=NAV_TIMEOUT_MS)
            try:
                await page.wait_for_load_state(NETWORKIDLE, timeout=NETWORK_IDLE_MS)
            except Exception:  # noqa: BLE001, S110 — network-idle 超时是常态节奏,防线在产物侧
                pass
            if await is_page_challenged(page):
                say(PRINT_CHALLENGE_WAIT_TPL.format(s=CHALLENGE_TIMEOUT_MS // 1000, url=url))
                parts = []
                for m in TITLE_CHALLENGE_MARKERS:
                    parts.append(TITLE_COND_TPL.format(marker=m))
                cond = COND_AND.join(parts)
                try:
                    await page.wait_for_function(WAIT_FN_TPL.format(cond=cond),
                                                 timeout=CHALLENGE_TIMEOUT_MS)
                    await page.wait_for_load_state(NETWORKIDLE, timeout=NETWORK_IDLE_MS)
                    say(PRINT_CHALLENGE_OK)
                except Exception:  # noqa: BLE001 — 没人点验证框,跳过该页
                    say(PRINT_CHALLENGE_TIMEOUT)
                    return None
            try:
                for _ in range(SCROLL_PASSES):
                    await page.mouse.wheel(0, SCROLL_STEP_PX)
                    await page.wait_for_timeout(SCROLL_PAUSE_MS)
            except Exception:  # noqa: BLE001, S110 — 滚动只为懒加载,失败无害
                pass
            return await page.content()
        except Exception as e:  # noqa: BLE001 — 单页拿不回按跳过,损耗在设计内
            say(PRINT_SKIP_ERR_TPL.format(name=type(e).__name__, detail=e, url=url[:100]))
            return None


async def close_browser() -> None:
    """收摊(cookie 已随 profile 落盘);lock/sem 原语保留复用。"""
    try:
        if CACHE.context is not None:
            await CACHE.context.close()
        if CACHE.pw is not None:
            await CACHE.pw.stop()
    finally:
        CACHE.pw = None
        CACHE.context = None
        CACHE.page = None
        CACHE.unavailable = False


# =========================================================================
# 3. BFS 探索(层进并发;403/验证壳 → 浏览器兜底)
# =========================================================================


def is_skippable_url(url: str) -> bool:
    """资产/文档/流媒体后缀与已知噪音路径不进地图(PDF 走 raw 落盘)。"""
    path = urlparse(url).path.lower()
    for ext in SKIP_EXTENSIONS:
        if path.endswith(ext):
            return True
    for pattern in SKIP_PATH_PATTERNS:
        if pattern.search(path):
            return True
    return False


def normalize_url(url: str) -> str:
    """去锚点、去尾斜杠(根路径除外)—— 同页不同写法收敛成一个键。"""
    url, _ = urldefrag(url)
    parsed = urlparse(url)
    path = parsed.path
    if path != URL_SLASH:
        path = path.rstrip(URL_SLASH)
    return parsed.scheme + SCHEME_SEP + parsed.netloc + path


def is_in_scope(x: ScopeIn) -> bool:
    """限域:同域 + 种子路径前缀(层级站);带 keywords 时同域 + 路径含词也算(扁平站)。"""
    seed_parsed = urlparse(x.seed_url)
    url_parsed = urlparse(x.url)
    if url_parsed.netloc != seed_parsed.netloc:
        return False
    seed_path = seed_parsed.path.rstrip(URL_SLASH)
    url_path = url_parsed.path.rstrip(URL_SLASH)
    if url_path.startswith(seed_path):
        return True
    low = url_path.lower()
    for kw in x.keywords:
        if kw in low:
            return True
    return False


async def fetch_page(x: FetchPageIn) -> list:
    """抓一页:httpx 直取,403/验证壳转浏览器;收录进 ctx 并回抛下一层候选。
    (原 bfs 内嵌 _fetch_one 出户;逐页跳过 say 留痕不升级 —— 探索的设计内损耗。)"""
    ctx = x.ctx
    async with ctx.sem:
        html = None
        status = 0
        base_url = x.url
        try:
            resp = await ctx.client.get(x.url)
            status = resp.status_code
            if resp.status_code == HTTP_FORBIDDEN:
                html = await fetch_browser_html(x.url)
                if html:
                    say(PRINT_BROWSER_403_TPL.format(url=x.url[:80]))
            else:
                resp.raise_for_status()
                if CT_HTML in resp.headers.get(HDR_CONTENT_TYPE, ""):
                    html = resp.text
                    base_url = str(resp.url)
                    if is_challenge_html(html):
                        browser_html = await fetch_browser_html(x.url)
                        if browser_html:
                            html = browser_html
                            say(PRINT_BROWSER_200_TPL.format(url=x.url[:80]))
        except httpx.HTTPStatusError as e:
            say(PRINT_SKIP_HTTP_TPL.format(code=e.response.status_code, url=x.url[:80]))
            return []
        except Exception as e:  # noqa: BLE001 — 单页网络错按跳过
            say(PRINT_SKIP_ERR_TPL.format(name=type(e).__name__, detail=e, url=x.url[:80]))
            return []

        if not html:
            return []

        soup = BeautifulSoup(html, PARSER_HTML)
        title_tag = soup.find(TAG_TITLE)
        title = title_tag.get_text(strip=True) if title_tag else ""

        html_name = hashlib.md5(x.url.encode()).hexdigest() + HTML_SUFFIX
        async with ctx.lock:
            if len(ctx.discovered) >= ctx.max_pages:
                return []
            row = PageRow(url=x.url, title=title, depth=x.depth,
                          status=status or STATUS_OK, html=html_name)
            ctx.discovered.append(row.model_dump())
            idx = len(ctx.discovered)

        try:
            (ctx.html_dir / html_name).write_text(html, encoding=ENC_UTF8)
        except Exception as e:  # noqa: BLE001 — 缓存写盘失败要留痕(Errno 22 卷抖动病史)
            err(str(ctx.html_dir / html_name), e)

        say(PRINT_PAGE_TPL.format(idx=idx, depth=x.depth, url=x.url[:100]))

        children = []
        if x.depth < ctx.max_depth:
            for a_tag in soup.find_all(TAG_A, href=True):
                abs_url = urljoin(base_url, cast(str, a_tag[ATTR_HREF]))
                norm = normalize_url(abs_url)
                if norm in ctx.visited or norm in ctx.pending:
                    continue
                if is_skippable_url(norm):
                    continue
                if not is_in_scope(ScopeIn(url=norm, seed_url=ctx.seed_url, keywords=ctx.keywords)):
                    continue
                children.append((norm, x.depth + 1))
        return children


async def discover_urls(x: DiscoverIn) -> Path:
    """一颗种子的 BFS 全程:层进并发抓 → html_cache 顺手落盘 → manifest 写盘;
    返回 manifest 路径。"""
    spec = x.spec
    out_dir = paths.CRAWL / spec.slug
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / MANIFEST_FILE
    html_dir = out_dir / HTML_CACHE_DIR
    html_dir.mkdir(parents=True, exist_ok=True)

    seed_url = normalize_url(spec.seed.rstrip(URL_SLASH))
    keywords = []
    for kw in spec.keywords.split(KEYWORDS_SEP):
        kw = kw.strip().lower()
        if kw:
            keywords.append(kw)
    concurrency = spec.concurrency if spec.concurrency > 0 else DISCOVER_CONCURRENCY

    say(PRINT_BFS_START_TPL.format(seed=seed_url))
    say(PRINT_BFS_CFG_TPL.format(depth=spec.depth, max=spec.max_pages, c=concurrency))

    async with httpx.AsyncClient(follow_redirects=True, timeout=HTTP_TIMEOUT_S, verify=False,
                                 headers={HDR_UA: BROWSER_UA, HDR_ACCEPT: ACCEPT_HTML}) as client:
        ctx = CrawlCtx(seed_url=seed_url, keywords=tuple(keywords), max_depth=spec.depth,
                       max_pages=spec.max_pages, html_dir=html_dir,
                       client=cast(HttpAsyncClientLike, client),
                       sem=asyncio.Semaphore(concurrency), lock=asyncio.Lock())
        ctx.visited.add(seed_url)
        current_level = [(seed_url, 0)]

        while current_level and len(ctx.discovered) < ctx.max_pages:
            to_fetch = []
            for u, d in current_level:
                if is_skippable_url(u):
                    continue
                if not is_in_scope(ScopeIn(url=u, seed_url=seed_url, keywords=ctx.keywords)):
                    continue
                to_fetch.append((u, d))
            if not to_fetch:
                break
            remaining = ctx.max_pages - len(ctx.discovered)
            to_fetch = to_fetch[:remaining]
            say(PRINT_LEVEL_TPL.format(n=len(to_fetch), depth=to_fetch[0][1]))

            tasks = []
            for u, d in to_fetch:
                tasks.append(fetch_page(FetchPageIn(ctx=ctx, url=u, depth=d)))
            results = await asyncio.gather(*tasks)

            next_level = []
            for children in results:
                for child_url, child_depth in children:
                    if child_url in ctx.visited or child_url in ctx.pending:
                        continue
                    ctx.pending.add(child_url)
                    ctx.visited.add(child_url)
                    next_level.append((child_url, child_depth))
            current_level = next_level

    manifest = {K_SEED_URL: seed_url, K_SLUG: spec.slug, K_TOTAL_URLS: len(ctx.discovered),
                K_MAX_DEPTH: spec.depth, K_CRAWLED_AT: datetime.now().isoformat(),
                K_PAGES: ctx.discovered}
    paths.write_json(paths.WriteJsonIn(path=manifest_path, payload=manifest, indent=2))
    await close_browser()
    say(PRINT_MANIFEST_TPL.format(n=len(ctx.discovered), path=manifest_path))
    return manifest_path


# =========================================================================
# 4. HTML → Markdown(原 converters 子包塌平;子类/hook/profile-css 零消费者退役)
# =========================================================================


def is_inside_pre(node: Tag | NavigableString) -> bool:
    """是否在 <pre> 里(行内 code 与代码块分流)。"""
    parent = node.parent
    while parent:
        if isinstance(parent, Tag) and parent.name == TAG_PRE:
            return True
        parent = parent.parent
    return False


def inline_children(x: InlineIn) -> str:
    """子节点行内文本拼接。"""
    parts = []
    # pyrefly: ignore[missing-attribute] — InlineIn.node 的宽型是给 inline_text 入口用的;inline_children 只在它认定 Tag 之后被调用
    for child in x.node.children:
        parts.append(inline_text(InlineIn(node=child, url=x.url)))
    return "".join(parts)


def inline_text(x: InlineIn) -> str:
    """节点 → 行内 md 文本(code/粗斜体/链接/图片/换行)。"""
    node = x.node
    if isinstance(node, NavigableString):
        return WS_RE.sub(SPACE_SEP, str(node))
    if not isinstance(node, Tag):
        return ""
    tag = node.name.lower()
    if tag == TAG_CODE and not is_inside_pre(node):
        text = node.get_text()
        return MD_TICK_TPL.format(text=text) if text else ""
    if tag in BOLD_TAGS:
        text = inline_children(x=InlineIn(node=node, url=x.url))
        return MD_BOLD_TPL.format(text=text) if text.strip() else ""
    if tag in EM_TAGS:
        text = inline_children(x=InlineIn(node=node, url=x.url))
        return MD_EM_TPL.format(text=text) if text.strip() else ""
    if tag == TAG_A:
        href = cast(str, node.get(ATTR_HREF, ""))
        text = node.get_text(strip=True)
        if text and href:
            if not href.startswith(SKIP_HREF_PREFIXES):
                href = urljoin(x.url, href)
            return MD_LINK_TPL.format(text=text, href=href)
        return text or ""
    if tag == TAG_BR:
        return LINE_SEP
    if tag == TAG_IMG:
        src = cast(str, node.get(ATTR_SRC, ""))
        if src:
            src = urljoin(x.url, src)
        return MD_IMG_TPL.format(alt=node.get(ATTR_ALT, ""), src=src)
    return inline_children(x=InlineIn(node=node, url=x.url))


def table_lines_of(table: Tag) -> list:
    """HTML 表 → md 表行(列数按最长行补齐)。"""
    rows = []
    for tr in table.find_all(TAG_TR):
        cells = []
        for td in tr.find_all(list(CELL_TAGS)):
            text = td.get_text(separator=SPACE_SEP, strip=True)
            cells.append(WS_RE.sub(SPACE_SEP, text).strip())
        if cells:
            rows.append(cells)
    if not rows:
        return []
    max_cols = 0
    for r in rows:
        if len(r) > max_cols:
            max_cols = len(r)
    for row in rows:
        while len(row) < max_cols:
            row.append("")
    lines = [""]
    lines.append(MD_ROW_EDGE + MD_CELL_SEP.join(rows[0]) + MD_ROW_END)
    lines.append(MD_ROW_EDGE + MD_CELL_SEP.join([MD_HEADER_DASH] * max_cols) + MD_ROW_END)
    for row in rows[1:]:
        lines.append(MD_ROW_EDGE + MD_CELL_SEP.join(row) + MD_ROW_END)
    lines.append("")
    return lines


def code_lang_of(pre: Tag) -> str:
    """代码块语言(从 pre 与其内 code 的 class 里认;highlight/code 这类壳词不算)。"""
    # pyrefly: ignore[bad-argument-type] — bs4 存根把 get 的 default 收成 AttributeValueList|str|None,class 缺席给 [] 是本域惯例
    classes = pre.get(ATTR_CLASS, [])
    code_tag = pre.find(TAG_CODE)
    if isinstance(code_tag, Tag):
        # pyrefly: ignore[unsupported-operation, bad-argument-type] — 同上;class 是多值属性,运行时两边都是 list
        classes = classes + code_tag.get(ATTR_CLASS, [])
    # pyrefly: ignore[not-iterable] — 同上,上面两行的 default=[] 保证 classes 恒是 list
    for cls in classes:
        if not isinstance(cls, str):
            continue
        m = LANG_CLASS_RE.match(cls)
        if m and m.group(1) not in LANG_STOPWORDS:
            return m.group(1)
    return ""


def walk(x: WalkIn) -> None:
    """DOM → md 递归主干(原 BaseConverter._walk 塌平)。Comment 先于文本分流,
    否则 HTML 注释漏进产物(P1 实撞);块级/行内/表格/列表各回各家。"""
    node = x.node
    lines = x.lines
    if isinstance(node, Comment):
        return
    if isinstance(node, NavigableString):
        text = str(node)
        if not text.strip():
            return
        text = WS_RE.sub(SPACE_SEP, text)
        if lines and not lines[-1].endswith(LINE_SEP):
            lines[-1] += text
        else:
            lines.append(text)
        return
    if not isinstance(node, Tag):
        return

    tag = node.name.lower()

    if tag in HEADING_TAGS:
        level = int(tag[1])
        text = node.get_text(separator=SPACE_SEP, strip=True)
        text = WS_RE.sub(SPACE_SEP, text).strip()
        if text:
            lines.append("")
            lines.append(H_LEVEL_TPL.format(hashes=MD_H * level, text=text))
            lines.append("")
        return

    if tag == TAG_PRE:
        code_tag = node.find(TAG_CODE)
        code_text = code_tag.get_text() if code_tag else node.get_text()
        lines.append("")
        lines.append(MD_FENCE + code_lang_of(node))
        for code_line in code_text.rstrip(LINE_SEP).split(LINE_SEP):
            lines.append(code_line)
        lines.append(MD_FENCE)
        lines.append("")
        return

    if tag == TAG_CODE and not is_inside_pre(node):
        text = node.get_text()
        if text:
            if MD_TICK in text:
                lines.append(MD_TICK2_TPL.format(text=text))
            else:
                if lines and not lines[-1].endswith(LINE_SEP):
                    lines[-1] += MD_TICK_TPL.format(text=text)
                else:
                    lines.append(MD_TICK_TPL.format(text=text))
        return

    if tag == TAG_TABLE:
        lines.extend(table_lines_of(node))
        return

    if tag in LIST_TAGS:
        lines.append("")
        for i, li in enumerate(node.find_all(TAG_LI, recursive=False), 1):
            prefix = MD_OL_TPL.format(i=i) if tag == TAG_OL else MD_UL_PREFIX
            li_text = inline_text(InlineIn(node=li, url=x.url)).strip()
            lines.append(prefix + li_text)
        lines.append("")
        return

    if tag == TAG_DL:
        lines.append("")
        for child in node.children:
            if not isinstance(child, Tag):
                continue
            if child.name == TAG_DT:
                text = inline_text(InlineIn(node=child, url=x.url)).strip()
                lines.append(MD_BOLD_TPL.format(text=text))
            elif child.name == TAG_DD:
                dd_lines: list = []
                walk(WalkIn(node=child, lines=dd_lines, url=x.url))
                for dl in dd_lines:
                    if dl.strip():
                        lines.append(MD_DD_INDENT + dl)
                    else:
                        lines.append("")
        lines.append("")
        return

    if tag in BLOCK_TAGS:
        # pyrefly: ignore[no-matching-overload, bad-argument-type] — bs4 存根把 get 的 default 收成 AttributeValueList|str|None;class 是多值属性,运行时恒是 list
        classes = SPACE_SEP.join(node.get(ATTR_CLASS, []))
        is_admonition = False
        for w in ADMONITION_WORDS:
            if w in classes:
                is_admonition = True
                break
        if is_admonition:
            lines.append("")
            adm_title = node.find(class_=ADMONITION_TITLE_CLASS)
            if isinstance(adm_title, Tag):
                lines.append(MD_QUOTE_TITLE_TPL.format(title=adm_title.get_text(strip=True)))
                adm_title.decompose()
            for child in node.children:
                if isinstance(child, Tag):
                    child_text = inline_text(InlineIn(node=child, url=x.url)).strip()
                else:
                    child_text = str(child).strip()
                if child_text:
                    lines.append(MD_QUOTE_PREFIX + child_text)
            lines.append("")
            return
        if tag == TAG_P:
            text = inline_text(InlineIn(node=node, url=x.url)).strip()
            if text:
                lines.append("")
                lines.append(text)
                lines.append("")
            return

    if tag == TAG_A:
        href = cast(str, node.get(ATTR_HREF, ""))
        text = node.get_text(strip=True)
        if text and href:
            if not href.startswith(SKIP_HREF_PREFIXES):
                href = urljoin(x.url, href)
            if lines and not lines[-1].endswith(LINE_SEP):
                lines[-1] += MD_LINK_TPL.format(text=text, href=href)
            else:
                lines.append(MD_LINK_TPL.format(text=text, href=href))
        elif text:
            if lines and not lines[-1].endswith(LINE_SEP):
                lines[-1] += text
            else:
                lines.append(text)
        return

    if tag == TAG_IMG:
        alt = node.get(ATTR_ALT, "")
        src = cast(str, node.get(ATTR_SRC, ""))
        if src:
            src = urljoin(x.url, src)
            lines.append(MD_IMG_TPL.format(alt=alt, src=src))
        return

    if tag == TAG_VIDEO:
        src = cast(str, node.get(ATTR_SRC, ""))
        source_tag = node.find(TAG_SOURCE)
        if not src and isinstance(source_tag, Tag):
            src = cast(str, source_tag.get(ATTR_SRC, ""))
        if src:
            src = urljoin(x.url, src)
            lines.append("")
            lines.append(MD_VIDEO_TPL.format(src=src))
            lines.append("")
        return

    if tag == TAG_IFRAME:
        src = node.get(ATTR_SRC, "")
        title_attr = node.get(ATTR_TITLE, IFRAME_TITLE_FALLBACK)
        if src:
            lines.append("")
            lines.append(MD_LINK_TPL.format(text=title_attr, href=src))
            lines.append("")
        return

    if tag in BOLD_TAGS:
        text = node.get_text(strip=True)
        if text:
            if lines and not lines[-1].endswith(LINE_SEP):
                lines[-1] += MD_BOLD_TPL.format(text=text)
            else:
                lines.append(MD_BOLD_TPL.format(text=text))
        return

    if tag in EM_TAGS:
        text = node.get_text(strip=True)
        if text:
            if lines and not lines[-1].endswith(LINE_SEP):
                lines[-1] += MD_EM_TPL.format(text=text)
            else:
                lines.append(MD_EM_TPL.format(text=text))
        return

    if tag == TAG_HR:
        lines.append("")
        lines.append(MD_HR)
        lines.append("")
        return

    if tag == TAG_BLOCKQUOTE:
        lines.append("")
        for child in node.children:
            if isinstance(child, Tag):
                text = inline_text(InlineIn(node=child, url=x.url)).strip()
            else:
                text = str(child).strip()
            if text:
                lines.append(MD_QUOTE_PREFIX + text)
        lines.append("")
        return

    for child in node.children:
        walk(WalkIn(node=child, lines=lines, url=x.url))


def convert_md(x: ConvertIn) -> str:
    """页面 HTML → 带 frontmatter 的 md(定向抽取的现转入口,8 个 build 消费)。
    fetched = 取回时刻;正文容器按显式 selector,否则默认序列兜底到 body。"""
    soup = BeautifulSoup(x.html, PARSER_HTML)
    title_tag = soup.find(TAG_TITLE)
    title = title_tag.get_text(strip=True) if title_tag else ""

    removes = list(DEFAULT_REMOVE_SELECTORS)
    for sel in x.removes:
        removes.append(sel)
    for selector in removes:
        try:
            for el in soup.select(selector):
                el.decompose()
        except Exception as e:  # noqa: BLE001 — 无效选择器是配置病,留痕不中断
            err(selector, e)

    content = None
    if x.selector:
        content = soup.select_one(x.selector)
    if content is None:
        for selector in DEFAULT_CONTENT_SELECTORS:
            content = soup.select_one(selector)
            if content:
                break
    if content is None:
        content = soup.body or soup

    lines: list = []
    walk(WalkIn(node=content, lines=lines, url=x.url))
    md = LINE_SEP.join(lines)
    md = BLANKS_RE.sub(PARA_SEP, md)
    md = md.strip() + LINE_SEP
    fetched = datetime.now().astimezone().isoformat(timespec=TIMESPEC_SECONDS)
    return FM_TPL.format(url=x.url, title=title, fetched=fetched) + md


# =========================================================================
# 5. 役编排(定时步:全种子探索 + 站点地图 diff = 政策雷达)
# =========================================================================


def urls_of(manifest: Path) -> set:
    """一份 manifest 的 URL 集(坏了/缺席当空 —— diff 会把全量报成新增,宁多报不漏报)。"""
    if not manifest.exists():
        return set()
    try:
        d = json.loads(manifest.read_text(encoding=ENC_UTF8))
    except Exception:  # noqa: BLE001 — 上一份坏了就当空
        return set()
    out = set()
    for p in d.get(K_PAGES, []):
        if isinstance(p, dict):
            out.add(p[K_URL])
        else:
            out.add(p)
    return out


def discover_all() -> None:
    """役步:逐种子探索(进程内,单省失败/超时不拖全轮)→ diff 打进日志(政策雷达)。
    全轮零成功才抛错(网断/被全面封锁,该让役知道 → FAIL_RETRY 短重试)。"""
    ok = 0
    for cfg in SEEDS:
        spec = SeedSpec.model_validate(cfg)
        slug_dir = paths.CRAWL / spec.slug
        manifest = slug_dir / MANIFEST_FILE
        prev = slug_dir / MANIFEST_PREV_FILE
        if manifest.exists():
            slug_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(manifest, prev)
        before = urls_of(prev)

        say(PRINT_SEED_TPL.format(slug=spec.slug, seed=spec.seed))
        try:
            asyncio.run(asyncio.wait_for(discover_urls(DiscoverIn(spec=spec)),
                                         timeout=SEED_TIMEOUT_S))
        except Exception as e:  # noqa: BLE001 — 单省失败保留上一份地图,下轮重试
            err(spec.slug, e)
            continue
        if not manifest.exists():
            err(spec.slug, FileNotFoundError(manifest))
            continue

        after = urls_of(manifest)
        added = sorted(after - before)
        gone = sorted(before - after)
        paths.write_json(paths.WriteJsonIn(path=slug_dir / CHANGES_FILE, payload={K_SLUG: spec.slug, K_DATE: date.today().isoformat(),
                           K_TOTAL: len(after), K_ADDED: added, K_GONE: gone}, indent=2))
        ok += 1
        if before and (added or gone):
            say(PRINT_RADAR_TPL.format(slug=spec.slug, added=len(added), gone=len(gone)))
            for u in added[:DIFF_SHOW_MAX]:
                say(PRINT_RADAR_ADD_TPL.format(url=u))
            for u in gone[:DIFF_SHOW_MAX]:
                say(PRINT_RADAR_GONE_TPL.format(url=u))
        else:
            note = NOTE_FIRST_ROUND if not before else NOTE_NO_CHANGE
            say(PRINT_SEED_OK_TPL.format(slug=spec.slug, n=len(after), note=note))

    if ok == 0:
        raise RuntimeError(GUARD_ALL_FAILED)
    say(PRINT_DISCOVER_DONE_TPL.format(ok=ok, total=len(SEEDS)))


# =========================================================================
# 6. EE 类别抽选回退工具(ee 域 bs4 直解失效时的浏览器版,ee/__init__ 点名)
# =========================================================================


def ee_category_of(heading: str) -> EeCat | None:
    """类别标题 → EeCat(九类之外 = None,不硬塞)。"""
    for kw, key, lab in EE_CAT_MAP:
        if kw.lower() in heading.lower():
            return EeCat(key=key, label=lab)
    return None


def ee_noc_of(occ: dict) -> str:
    """职业行排序键(NOC 码)。"""
    return occ[K_NOC]


async def fetch_ee_categories() -> None:
    """抓 EE「类别抽选」页(Akamai 挡 httpx → 浏览器),DataTables 展开全部分页后
    抽 {noc, teer, title} 按类别分组 → raw/ee/federal-categories.json。"""
    page = await get_browser_page()
    if page is None:
        say(PRINT_BROWSER_NONE)
        return
    await page.goto(EE_URL, wait_until=DOMCONTENTLOADED, timeout=NAV_TIMEOUT_MS)
    try:
        await page.wait_for_load_state(NETWORKIDLE, timeout=NETWORK_IDLE_MS)
    except Exception:  # noqa: BLE001, S110 — network-idle 超时是常态节奏
        pass
    await page.evaluate(EE_EXPAND_JS)
    await page.wait_for_timeout(EE_EXPAND_WAIT_MS)
    blocks = await page.evaluate(EE_EXTRACT_JS)
    await close_browser()

    cats: dict = {}
    for b in blocks:
        hit = ee_category_of(b[K_CAT])
        if hit is None:
            continue
        if hit.key not in cats:
            cats[hit.key] = {K_KEY: hit.key, K_LABEL: hit.label, K_OCCUPATIONS: [], K_SEEN: set()}
        bucket = cats[hit.key]
        for r in b[K_ROWS]:
            noc = None
            for c in r:
                if EE_NOC_RE.fullmatch(c):
                    noc = c
                    break
            if noc is None or noc in bucket[K_SEEN]:
                continue
            title = ""
            for c in r:
                if not EE_NUM_RE.fullmatch(c) and len(c) > len(title):
                    title = c
            teer = None
            for c in r:
                if EE_TEER_RE.fullmatch(c):
                    teer = int(c)
                    break
            bucket[K_SEEN].add(noc)
            bucket[K_OCCUPATIONS].append({K_NOC: noc, K_TEER: teer, K_TITLE: title})

    out_cats = []
    for c in cats.values():
        out_cats.append({K_KEY: c[K_KEY], K_LABEL: c[K_LABEL],
                         K_OCCUPATIONS: sorted(c[K_OCCUPATIONS], key=ee_noc_of)})
    out_file = paths.EE / EE_OUT_FILE
    paths.write_json(paths.WriteJsonIn(path=out_file, payload={K_SOURCE: EE_SOURCE_LABEL, K_URL: EE_URL,
                                 K_FETCHED: date.today().isoformat(),
                                 K_CATEGORIES: out_cats}, indent=2))
    total = 0
    for c in out_cats:
        total += len(c[K_OCCUPATIONS])
    say(PRINT_EE_DONE_TPL.format(path=out_file, cats=len(out_cats), total=total))
    for c in out_cats:
        say(PRINT_EE_CAT_TPL.format(n=len(c[K_OCCUPATIONS]), label=c[K_LABEL]))


def run_ee_categories() -> None:
    """TOOLS 入口:同步壳(asyncio.run)。"""
    asyncio.run(fetch_ee_categories())


# =========================================================================
# 7. urls 哨兵(各域 constants 里的官方 URL 还活着吗;「禁猜 URL」铁律的机器面)
# =========================================================================


def check_official_urls() -> None:
    """役步(链尾哨兵):各域 constants 赋值里的官方 URL 逐条实测,硬红(404/410 或
    跨站重定向)则本轮记失败 → 扣 ping 转红;设计判据与误伤防线见 constants.URLS_DOC。
    """
    rows = collect_official_urls()
    hard: list = []
    soft = 0
    for r in rows:
        got = url_verdict_of(r.url)
        if got.dead:
            hard.append(URLS_P_DEAD_TPL.format(dom=r.dom, url=r.url, status=got.status))
            continue
        if got.moved_to != "":
            hard.append(URLS_P_MOVED_TPL.format(dom=r.dom, url=r.url, final=got.moved_to))
            continue
        if got.soft != "":
            say(URLS_P_SOFT_TPL.format(dom=r.dom, url=r.url, what=got.soft))
            soft += 1
    if len(hard) > 0:
        for line in hard:
            say(line)
        say(URLS_P_SUMMARY_TPL.format(n=len(hard), total=len(rows)))
        sys.exit(1)
    say(URLS_P_OK_TPL.format(total=len(rows), soft=soft))


def collect_official_urls() -> list:
    """ast 扫 etl/*/constants.py 的**赋值**收 URL(不碰 docstring —— 沿革注释里的旧址
    是故意留档;同 URL 多域出现只查一次,记首见域)。"""
    out: list = []
    seen: set = set()
    for f in sorted((paths.ROOT / ETL_DIR_NAME).glob(CONSTANTS_GLOB)):
        tree = ast.parse(f.read_text(encoding=ENC_UTF8), filename=str(f))
        for node in ast.walk(tree):
            if isinstance(node, (ast.Assign, ast.AnnAssign)):
                v = node.value
                if v is None:
                    continue
                for c in ast.walk(v):
                    if isinstance(c, ast.Constant) and isinstance(c.value, str):
                        if is_official_url(c.value) and c.value not in seen:
                            seen.add(c.value)
                            out.append(UrlRow(dom=f.parent.name, url=c.value))
    return out


def is_official_url(s: str) -> bool:
    """这个赋值串要不要进哨兵:http(s) 起头,且不含跳过特征(模板占位/存档站/内网)。"""
    hit = False
    for p in URL_HTTP_PREFIXES:
        if s.startswith(p):
            hit = True
    if hit is False:
        return False
    for m in URL_SKIP_MARKS:
        if m in s:
            return False
    return True


def url_verdict_of(url: str) -> UrlVerdict:
    """一条 URL 实测:死码/跨站跳 = 硬红格;连接失败与非 2xx 其余码 = 软格;全空 = 健康。"""
    try:
        r = httpx.get(url, headers={HDR_UA: BROWSER_UA}, follow_redirects=True,
                      timeout=URL_TIMEOUT_S)
    except Exception as e:  # noqa: BLE001 — 网络故障是软档:留痕不拦轮,判定收进出参
        return UrlVerdict(dead=False, status=0, moved_to="", soft=type(e).__name__)
    if r.status_code in URL_DEAD_CODES:
        return UrlVerdict(dead=True, status=r.status_code, moved_to="", soft="")
    home = bare_host_of(url)
    final = bare_host_of(str(r.url))
    if final != home and is_cdn_host(final) is False:
        return UrlVerdict(dead=False, status=r.status_code, moved_to=final, soft="")
    if r.status_code != STATUS_OK:
        return UrlVerdict(dead=False, status=r.status_code, moved_to="",
                          soft=URLS_P_HTTP_TPL.format(status=r.status_code))
    return UrlVerdict(dead=False, status=r.status_code, moved_to="", soft="")


def is_cdn_host(host: str) -> bool:
    """跳转落点是不是下载门户的正常出口 CDN(判据与误报案例见 URL_CDN_SUFFIXES)。"""
    for s in URL_CDN_SUFFIXES:
        if host.endswith(s):
            return True
    return False


def bare_host_of(url: str) -> str:
    """主机名剥 www. 前缀(www 有无不算迁站;www2→无前缀 = 跨站,NB 实例)。"""
    host = urlparse(url).netloc.lower()
    if host.startswith(WWW_PREFIX):
        return host[len(WWW_PREFIX):]
    return host

