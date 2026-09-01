"""news.functions — news 全域行为(母框架 + 九个子源解析 + AI 翻译/打分;#55 §2.5 模板方法)。

2026-08-30 从 fetch 迁回(Frank 定界:fetch 只做通用抓取与 API 直取,SOURCE 契约、
行构造、节奏参数都是 news 的行词汇,归 news 域);通用件(客户端/feed 解析/正文抽取)
仍从 fetch.functions 取。原 atomic_write_json 与 paths.write_json 行为重复,退役 ——
落盘改走 paths.write_json(带 OSError 五次退避,吃到批A 的写盘抗抖)。
2026-08-30 批C 子源溶解:七个 scrape_*.py 子源与入口脚本 scrape_immigration_news.py
全溶进本文件(company 全溶样张同形),兄弟裸导入体系随之消亡;门 main.py 直调这里的
四个零参入口(scrape_immigration_news / score_missing / translate_missing /
translate_titles_missing),顺序即原入口脚本的 __main__ 四行。

子源契约(news_sources() 的装配,母框架按键读):
  {
      "region":   "MB",              # federal / 两字母省码(前端省筛选 chips 直接用)
      "list_url": "https://…/feed/", # 列表页或 feed URL
      "kind":     "rss",             # atom | rss | html
      "parse":    parse_fn,          # 仅 html:list_url 页 HTML → [{title, date, url, bodyEn?}]
                                     #   date=ISO;url 可相对(母 urljoin);带 bodyEn = 单页日期段落式
                                     #   源(BC/ON/AB/NB),母不再抓详情页
      "citation": "https://…",       # 出处着陆页(E4-04 惯例:人能读的页;缺省 = list_url)
      "post_data": {...},            # 可选:列表页要 POST 表单才出结果时填(SK Sitecore 筛选)
      "body_selector": "div.x",      # 可选:详情页正文容器选择器(缺省 main/article 通用抽取)
  }
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import cast
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

import paths
from log.functions import err, say
from fetch.functions import (extract_detail, fetch, iso_date, make_client, page_og_image,
                             parse_feed, section_body, slugify)
from fetch.scheme import DetailIn, FetchIn, HttpClientLike, SectionIn
from news.scheme import (CallLlmIn, CallTitleIn, LlmClientLike, LlmConfig, MakeLlmClientIn, NbBoxLike,
                         NumberedIn, RunIn, TitleCheckIn, TranslateOneIn, TranslateTask)
from news.constants import (AB_HEAD_SEL, AB_HEAD_SEP, AB_LIST_URL, AB_STOP_TAGS, ALIGN_SHOW_MAX,
                            ANCHOR_SEP, ANCHOR_SLUG_TPL, ANCHOR_URL_TPL, ANTHROPIC_BASE,
                            ANTHROPIC_VERSION, ATTR_ID, BC_DATE_ONLY_RE, BC_LIST_URL,
                            BC_STOP_TAGS, BC_STRONG_TAGS, BC_TITLE_LEN_MAX, BODY_CAP, CJK_RE,
                            COUNT_PAIR_TPL, DATE_ISO_FMT, DATE_ISO_TPL, DETAIL_SLEEP_S, ELLIPSIS,
                            ENC_UTF8, ENV_API_KEY, ENV_LLM_BASE, ENV_LLM_MODEL, ENV_ON,
                            ENV_REBODY, ENV_SCORE_BUDGET, ENV_TITLE_BUDGET,
                            ENV_TRANSLATE_BUDGET, ERR_ALIGN_TPL, ERR_SENTINEL, FEED_KINDS,
                            GUARD_FEW_TPL, GUARD_SHRINK_TPL, HDR_ANTHROPIC_VERSION, HDR_API_KEY,
                            HREF_ATTR, HTML_PARSER, IMP_RE, IRCC_CITATION, IRCC_LIST_URL,
                            K_BODY_EN, K_BODY_KO, K_BODY_SELECTOR, K_BODY_ZH, K_CITATION, K_DATE,
                            K_FETCHED, K_FETCHED_AT, K_IMPORTANCE, K_IMPORTANCE_NOTE, K_ITEMS,
                            K_KIND, K_LIST_URL, K_OG_IMAGE, K_PARSE, K_POST_DATA, K_REGION,
                            K_SUMMARY_KO, K_SUMMARY_ZH, K_TITLE, K_TITLE_ZH, K_URL, KIND_ATOM,
                            KIND_HTML, KIND_RSS, LANG_ZH, LANGS, LINE_SEP, LLM_LOCAL_MODEL_DEFAULT,
                            LLM_MODEL, MAX_AGE_DAYS, MAX_DETAIL_PER_RUN, MB_BODY_SELECTOR,
                            MB_CITATION, MB_LIST_URL, MD_BOLD_KEEP, MD_BOLD_MARK, MD_BOLD_RE,
                            MD_HEAD_RE, MIN_TOTAL, MONTH_NUM, NB_DATE_RE,
                            ATTR_CLASS, NB_ALERT_CLASS_RE, NB_LIST_URL, NB_PAST_HEAD, TAG_DIV,
                            NB_TITLE_LEN_MAX, NS_CITATION, NS_LINK_SEL,
                            NS_LIST_URL, NS_ROW_SEL, ON_LIST_URL, ON_STOP_TAGS, OUT_NEWS_FILE,
                            P_CONTENT, P_MAX_TOKENS, P_MESSAGE, P_MESSAGES, P_MINISTRY_ID,
                            P_MODEL, P_MONTH, P_NUM_PREDICT, P_OPTIONS, P_PROMPT, P_RESPONSE,
                            P_ROLE, P_SC_ACTION, P_SC_CONTROLLER, P_STREAM, P_TEMPERATURE,
                            P_TEXT, P_TEXT_BLOCK, P_THINK, P_YEAR, PAIR_SEP, PARA_SEP,
                            PATH_ANTHROPIC_MESSAGES, PATH_OLLAMA_CHAT, PATH_OLLAMA_GENERATE,
                            PRINT_DEFERRED_TPL, PRINT_LEFT_TPL, PRINT_OUT_TPL, PRINT_REBODY_TPL,
                            PRINT_REGION_TPL, PRINT_SCORE_TPL, PRINT_TITLE_BAD_LEN,
                            PRINT_TITLE_BAD_TPL, PRINT_TITLE_DONE_TPL, PRINT_TITLE_NONE,
                            PRINT_TITLE_SKIP, PRINT_TRANSLATE_DONE_TPL, PRINT_TRANSLATE_NONE,
                            PRINT_TRANSLATE_OFF_TPL, PRINT_TRANSLATE_SKIP, PRINT_WROTE_TPL,
                            PROMPT, PROMPT_KO, PROMPT_SCORE, PROMPT_TITLE, QC_BODY_SELECTOR,
                            QC_LINK_SEL, QC_LIST_URL, QC_ROW_SEL, REGION_AB, REGION_BC,
                            REGION_FEDERAL, REGION_MB, REGION_NB, REGION_NS, REGION_ON,
                            REGION_QC, REGION_SK, ROLE_USER, SCORE_BODY_LEN,
                            SCORE_BUDGET_DEFAULT, SCORE_TIMEOUT_S, SCORE_TOKENS, SEG_RE, SEG_TPL,
                            SENTINEL, SK_LIST_URL, SK_MINISTRY_ID, SK_ROW_SEL, SK_SC_ACTION,
                            SK_SC_CONTROLLER, SK_URL_DATE_RE, TAG_H2, TAG_H3, TAG_H4, TAG_MAIN,
                            TAG_P, TEXT_JOIN_SEP, THINK_RE, TIMEOUT_S, TITLE_BUDGET_DEFAULT,
                            TITLE_LEN_SLACK, TITLE_STRIP_CHARS, TITLE_TEMPERATURE,
                            TITLE_TIMEOUT_S, TITLE_TOKENS, TRANSLATE_BUDGET_DEFAULT,
                            TRANSLATE_TIMEOUT_S, TRANSLATE_TOKENS, TS_UTC_FMT, URL_TAIL_SLASH,
                            WHERE_DETAIL_TPL, WHERE_KEEP_TPL, WHERE_REBODY_TPL,
                            WHERE_SCORE_TPL, WHERE_TITLE_TPL, WHERE_TRANSLATE_TPL, WS_FOLD_RE)

# =========================================================================
# 1. 母框架(增量合并 → 防线 → 原子写盘)
# =========================================================================


def load_items(out_file: Path) -> list[dict]:
    """读上一轮落盘的累积条目;文件不存在/损坏按空表起步(增量合并的底座)。"""
    if not out_file.exists():
        return []
    try:
        return json.loads(out_file.read_text(encoding=ENC_UTF8)).get(K_ITEMS, [])
    except (json.JSONDecodeError, OSError):
        return []


def merge_key(it: dict) -> tuple[str, str]:
    """合并排序键:日期为主、URL 定序(调用处 reverse=True = 新在前)。"""
    return (it[K_DATE], it[K_URL])


def run(x: RunIn) -> None:
    """母入口:逐子源抓列表 → 增量补详情 → 按 URL 合并去重 → 防线 → 原子写盘。

    · 单页日期段落式源(自带 bodyEn):条目缺图用页级 og:image 兜底;
    · title/url/date 缺件宁可不收,不猜;超 MAX_AGE_DAYS 的旧闻不进站;
    · 列表式源抓详情页补 og+正文,每轮每子源限 MAX_DETAIL_PER_RUN,超预算留下一轮(12h);
    · NEWS_REBODY=1:对存量条目重抓详情正文(锚点合成 url 的单页式源跳过);失败保留旧正文。
    """
    say(PRINT_OUT_TPL.format(out=x.out_file))
    existing = load_items(x.out_file)
    by_url: dict[str, dict] = {}
    for it in existing:
        by_url[it[K_URL]] = it
    today = datetime.now(timezone.utc).date()
    now_iso = datetime.now(timezone.utc).strftime(TS_UTC_FMT)

    with make_client(timeout=TIMEOUT_S) as client:
        client_like = cast(HttpClientLike, client)
        for src in x.sources:
            region = src[K_REGION]
            try:
                raw = fetch(FetchIn(client=client_like, url=src[K_LIST_URL], post_data=src.get(K_POST_DATA)))
                if src[K_KIND] in FEED_KINDS:
                    items = parse_feed(raw)
                else:
                    items = src[K_PARSE](raw)
                    list_og = page_og_image(raw)
                    for it in items:
                        if K_BODY_EN in it and not it.get(K_OG_IMAGE):
                            it[K_OG_IMAGE] = list_og
                fresh: list[dict] = []
                for it in items:
                    d = it.get(K_DATE)
                    if not (it.get(K_TITLE) and it.get(K_URL) and d):
                        continue
                    if (today - datetime.strptime(d, DATE_ISO_FMT).date()).days > MAX_AGE_DAYS:
                        continue
                    it[K_URL] = urljoin(src[K_LIST_URL], it[K_URL])
                    if it[K_URL] not in by_url:
                        fresh.append(it)
                detail_budget = MAX_DETAIL_PER_RUN
                added = 0
                for it in fresh:
                    if K_BODY_EN not in it:
                        if detail_budget <= 0:
                            continue
                        detail_budget -= 1
                        try:
                            page = fetch(FetchIn(client=client_like, url=it[K_URL], post_data=None))
                            d = extract_detail(DetailIn(html=page, selector=src.get(K_BODY_SELECTOR)))
                            it[K_OG_IMAGE], it[K_BODY_EN] = d.og_image, d.body
                        except Exception as e:  # noqa: BLE001
                            err(WHERE_DETAIL_TPL.format(region=region, url=it[K_URL]), e)
                            it.setdefault(K_OG_IMAGE, None)
                            it.setdefault(K_BODY_EN, "")
                        time.sleep(DETAIL_SLEEP_S)
                    row: dict = {K_REGION: region, K_TITLE: it[K_TITLE].strip(), K_DATE: it[K_DATE],
                           K_URL: it[K_URL], K_OG_IMAGE: it.get(K_OG_IMAGE),
                           K_BODY_EN: it.get(K_BODY_EN, ""), K_BODY_ZH: "", K_SUMMARY_ZH: "",
                           K_CITATION: src.get(K_CITATION) or src[K_LIST_URL],
                           K_FETCHED_AT: now_iso}
                    by_url[row[K_URL]] = row
                    added += 1
                line = PRINT_REGION_TPL.format(region=region, listed=len(items), added=added)
                if len(fresh) > added:
                    line = line + PRINT_DEFERRED_TPL.format(n=len(fresh) - added)
                say(line)
                if os.environ.get(ENV_REBODY) == ENV_ON:
                    redone = 0
                    for it in by_url.values():
                        if it[K_REGION] != region or ANCHOR_SEP in it[K_URL]:
                            continue
                        try:
                            page = fetch(FetchIn(client=client_like, url=it[K_URL], post_data=None))
                            d = extract_detail(DetailIn(html=page, selector=src.get(K_BODY_SELECTOR)))
                            if d.body:
                                it[K_BODY_EN] = d.body
                                it[K_OG_IMAGE] = d.og_image or it.get(K_OG_IMAGE)
                                redone += 1
                        except Exception as e:  # noqa: BLE001
                            err(WHERE_REBODY_TPL.format(url=it[K_URL]), e)
                        time.sleep(DETAIL_SLEEP_S)
                    if redone:
                        say(PRINT_REBODY_TPL.format(region=region, n=redone))
            except Exception as e:  # noqa: BLE001
                err(WHERE_KEEP_TPL.format(region=region), e)

    merged = sorted(by_url.values(), key=merge_key, reverse=True)
    if len(merged) < len(existing):
        raise SystemExit(GUARD_SHRINK_TPL.format(n=len(merged), prev=len(existing)))
    if len(merged) < MIN_TOTAL:
        raise SystemExit(GUARD_FEW_TPL.format(n=len(merged), floor=MIN_TOTAL))
    paths.write_json(paths.WriteJsonIn(path=x.out_file, payload={K_FETCHED: now_iso, K_ITEMS: merged}, indent=1))
    per = {}
    for it in merged:
        per[it[K_REGION]] = per.get(it[K_REGION], 0) + 1
    per_parts = []
    for k, v in sorted(per.items()):
        per_parts.append(COUNT_PAIR_TPL.format(key=k, n=v))
    say(PRINT_WROTE_TPL.format(n=len(merged), parts=PAIR_SEP.join(per_parts)))


def scrape_immigration_news() -> None:
    """抓取步(门直调的第一件):九个子源交母框架跑一轮,落 OUT_NEWS_FILE。"""
    run(RunIn(sources=news_sources(), out_file=OUT_NEWS_FILE))


# =========================================================================
# 2. 子源装配(SOURCE 契约 dict;顺序即抓取顺序)
# =========================================================================


def news_sources() -> list[dict]:
    """九个子源的 SOURCE 清单(联邦锚点先行,省源按历史入册序 BC/AB/MB/NB/NS/ON/SK/QC)。

    P0 2026-07-18 逐源实测:PE 被 Radware 挡、NL 无新闻页,不硬上(缺源写在册,不装有)。
    """
    ircc = {K_REGION: REGION_FEDERAL, K_LIST_URL: IRCC_LIST_URL, K_KIND: KIND_ATOM,
            K_CITATION: IRCC_CITATION}
    bc = {K_REGION: REGION_BC, K_LIST_URL: BC_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_bc, K_CITATION: BC_LIST_URL}
    ab = {K_REGION: REGION_AB, K_LIST_URL: AB_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_ab, K_CITATION: AB_LIST_URL}
    mb = {K_REGION: REGION_MB, K_LIST_URL: MB_LIST_URL, K_KIND: KIND_RSS,
          K_CITATION: MB_CITATION, K_BODY_SELECTOR: MB_BODY_SELECTOR}
    nb = {K_REGION: REGION_NB, K_LIST_URL: NB_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_nb, K_CITATION: NB_LIST_URL}
    ns = {K_REGION: REGION_NS, K_LIST_URL: NS_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_ns, K_CITATION: NS_CITATION}
    on = {K_REGION: REGION_ON, K_LIST_URL: ON_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_on, K_CITATION: ON_LIST_URL}
    sk = {K_REGION: REGION_SK, K_LIST_URL: SK_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_sk, K_CITATION: SK_LIST_URL,
          K_POST_DATA: {P_SC_CONTROLLER: SK_SC_CONTROLLER, P_SC_ACTION: SK_SC_ACTION,
                        P_TEXT: "", P_YEAR: "", P_MONTH: "", P_MINISTRY_ID: SK_MINISTRY_ID}}
    qc = {K_REGION: REGION_QC, K_LIST_URL: QC_LIST_URL, K_KIND: KIND_HTML,
          K_PARSE: parse_qc, K_CITATION: QC_LIST_URL, K_BODY_SELECTOR: QC_BODY_SELECTOR}
    return [ircc, bc, ab, mb, nb, ns, on, sk, qc]


# =========================================================================
# 3. 子源解析:AB(单页日期段落式,h3.goa-title =「日期: 标题」)
# =========================================================================


def parse_ab(html: str) -> list[dict]:
    """AAIP Updates 页 → 条目行;日期/标题/正文缺一不收(不猜)。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    items = []
    for h3 in soup.select(AB_HEAD_SEL):
        head = WS_FOLD_RE.sub(TEXT_JOIN_SEP, h3.get_text(TEXT_JOIN_SEP, strip=True))
        date = iso_date(head)
        title = head.split(AB_HEAD_SEP, 1)[1].strip() if AB_HEAD_SEP in head else head
        body = section_body(SectionIn(heading=h3, stop_names=AB_STOP_TAGS))
        if not (date and title and body):
            continue
        anchor = ANCHOR_SLUG_TPL.format(date=date, slug=slugify(title))
        items.append({K_TITLE: title, K_DATE: date,
                      K_URL: ANCHOR_URL_TPL.format(base=AB_LIST_URL, anchor=anchor),
                      K_BODY_EN: body})
    return items


# =========================================================================
# 4. 子源解析:BC(单页日期段落式,h2 = 裸日期)
# =========================================================================


def parse_bc(html: str) -> list[dict]:
    """BC PNP News 页 → 条目行;标题取首段粗体,没有就取首段截断。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    main = soup.find(TAG_MAIN) or soup.body
    items = []
    # pyrefly: ignore[missing-attribute] — soup.body 只有空文档才是 None;正文容器拿不到即解析塌方,该炸
    for h2 in main.find_all(TAG_H2):
        head = h2.get_text(TEXT_JOIN_SEP, strip=True)
        date = iso_date(head)
        if not date or BC_DATE_ONLY_RE.fullmatch(head.strip()) is None:
            continue
        body = section_body(SectionIn(heading=h2, stop_names=BC_STOP_TAGS))
        first_p = h2.find_next_sibling(TAG_P)
        strong = first_p.find(BC_STRONG_TAGS) if first_p else None
        title = WS_FOLD_RE.sub(TEXT_JOIN_SEP, strong.get_text(TEXT_JOIN_SEP, strip=True)) if strong else \
            (body.split(PARA_SEP)[0][:BC_TITLE_LEN_MAX] if body else "")
        if not (title and body):
            continue
        anchor = ANCHOR_SLUG_TPL.format(date=date, slug=slugify(title))
        items.append({K_TITLE: title, K_DATE: date,
                      K_URL: ANCHOR_URL_TPL.format(base=BC_LIST_URL, anchor=anchor),
                      K_BODY_EN: body})
    return items


# =========================================================================
# 5. 子源解析:NB(通告页,标题是通用词、日期藏正文)
# =========================================================================


def nb_date_from(body: str) -> str | None:
    """从通告正文里提发布/生效日;提不出返回 None(无日期的通告不收)。"""
    m = NB_DATE_RE.search(body)
    return iso_date(m.group(0)) if m else None


def nb_title_of(box: NbBoxLike) -> str:
    """警示框 → 标题(框里的 <p> 就是官方真标题;2026-08-31 换址重锚:旧版从正文首句
    剥 Effective 从句的 nb_title_from 随旧结构退役)。超长截断挂省略号。"""
    p = box.find(TAG_P)
    if p is None:
        return ""
    t = WS_FOLD_RE.sub(TEXT_JOIN_SEP, p.get_text(TEXT_JOIN_SEP, strip=True)).strip()
    if len(t) > NB_TITLE_LEN_MAX:
        return t[:NB_TITLE_LEN_MAX].rstrip() + ELLIPSIS
    return t


def nb_box_body(box: NbBoxLike) -> str:
    """警示框之后的正文:收同级组件 div 的整块文本,至下一个警示框/含 H2 的组件为止
    (新站是 AEM 网格,通告正文不与标题同框 —— 散在其后的兄弟组件里)。"""
    paras: list = []
    for sib in box.find_next_siblings():
        classes = TEXT_JOIN_SEP.join(sib.get(ATTR_CLASS) or [])
        if NB_ALERT_CLASS_RE.search(classes) or sib.find(TAG_H2) is not None:
            break
        txt = WS_FOLD_RE.sub(TEXT_JOIN_SEP, sib.get_text(PARA_SEP, strip=True)).strip()
        if txt:
            paras.append(txt)
    return PARA_SEP.join(paras)


def parse_nb(html: str) -> list[dict]:
    """NBPNP Important notices 页 → 条目行;同标题去重。

    2026-08-31 换址重锚(结构举证见 constants.NB_LIST_URL):一条通告 = 警示框标题 +
    其后兄弟组件正文;文档序走到「Past notices」H2 之后全是存档,当场收工。
    """
    soup = BeautifulSoup(html, HTML_PARSER)
    main = soup.find(TAG_MAIN) or soup.body
    items = []
    seen = set()
    # pyrefly: ignore[missing-attribute] — 同上
    for box in main.find_all(TAG_DIV, class_=NB_ALERT_CLASS_RE):
        prev_h2 = box.find_previous(TAG_H2)
        if prev_h2 is not None and NB_PAST_HEAD in prev_h2.get_text(TEXT_JOIN_SEP, strip=True).lower():
            break
        body = nb_box_body(box)
        if not body:
            continue
        date = nb_date_from(body)
        if not date:
            continue
        title = nb_title_of(box)
        if not title or title in seen:
            continue
        seen.add(title)
        anchor = box.get(ATTR_ID) or ANCHOR_SLUG_TPL.format(date=date, slug=slugify(title))
        items.append({K_TITLE: title, K_DATE: date,
                      K_URL: ANCHOR_URL_TPL.format(base=NB_LIST_URL, anchor=anchor),
                      K_BODY_EN: body})
    return items


# =========================================================================
# 6. 子源解析:NS(Drupal 分类列表,详情页由母抓)
# =========================================================================


def parse_ns(html: str) -> list[dict]:
    """NSNP/AIP Program Updates 列表页 → 条目行(标题+链接+发布日)。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    items = []
    for row in soup.select(NS_ROW_SEL):
        a = row.select_one(NS_LINK_SEL)
        if not a:
            continue
        title = WS_FOLD_RE.sub(TEXT_JOIN_SEP, a.get_text(TEXT_JOIN_SEP, strip=True))
        url = a[HREF_ATTR]
        for h2 in row.select(TAG_H2):
            h2.extract()
        date = iso_date(row.get_text(TEXT_JOIN_SEP, strip=True))
        if title and date:
            items.append({K_TITLE: title, K_DATE: date, K_URL: url})
    return items


# =========================================================================
# 7. 子源解析:ON(年度页,h4 为条目粒度)
# =========================================================================


def parse_on(html: str) -> list[dict]:
    """OINP Updates 年度页 → 条目行;日期取前置最近的 h3,锚点优先用 h4 自带 id。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    main = soup.find(TAG_MAIN) or soup.body
    items = []
    # pyrefly: ignore[missing-attribute] — 同上
    for h4 in main.find_all(TAG_H4):
        title = WS_FOLD_RE.sub(TEXT_JOIN_SEP, h4.get_text(TEXT_JOIN_SEP, strip=True))
        prev_h3 = h4.find_previous(TAG_H3)
        date = iso_date(prev_h3.get_text(TEXT_JOIN_SEP, strip=True)) if prev_h3 else None
        body = section_body(SectionIn(heading=h4, stop_names=ON_STOP_TAGS))
        if not (title and date and body):
            continue
        anchor = h4.get(ATTR_ID) or ANCHOR_SLUG_TPL.format(date=date, slug=slugify(title))
        items.append({K_TITLE: title, K_DATE: date,
                      K_URL: ANCHOR_URL_TPL.format(base=ON_LIST_URL, anchor=anchor),
                      K_BODY_EN: body})
    return items


# =========================================================================
# 8. 子源解析:QC(TYPO3 Solr 结果页,详情页由母抓)
# =========================================================================


def parse_qc(html: str) -> list[dict]:
    """quebec.ca 新闻搜索结果(按 MIFI 部委筛选)→ 条目行。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    items = []
    for li in soup.select(QC_ROW_SEL):
        a = li.select_one(QC_LINK_SEL)
        p = li.find(TAG_P)
        date = iso_date(p.get_text(TEXT_JOIN_SEP, strip=True)) if p else None
        if not (a and date):
            continue
        title = WS_FOLD_RE.sub(TEXT_JOIN_SEP, a.get_text(TEXT_JOIN_SEP, strip=True))
        if title:
            items.append({K_TITLE: title, K_DATE: date, K_URL: a[HREF_ATTR]})
    return items


# =========================================================================
# 9. 子源解析:SK(Sitecore POST-only 结果区,日期从 URL 路径取)
# =========================================================================


def parse_sk(html: str) -> list[dict]:
    """saskatchewan.ca 新闻 hub 结果区 → 条目行;URL 路径 /2026/july/16/ 即日期。"""
    soup = BeautifulSoup(html, HTML_PARSER)
    items = []
    for a in soup.select(SK_ROW_SEL):
        m = SK_URL_DATE_RE.search(cast(str, a[HREF_ATTR]))
        month = MONTH_NUM.get(m.group(2).lower()) if m else None
        if not month:
            continue
        title = WS_FOLD_RE.sub(TEXT_JOIN_SEP, a.get_text(TEXT_JOIN_SEP, strip=True))
        if not title:
            continue
        items.append({K_TITLE: title, K_URL: a[HREF_ATTR],
                      # pyrefly: ignore[missing-attribute] — m 为 None 时 month 也为 None,上方 `if not month: continue` 已拦住
                      K_DATE: DATE_ISO_TPL.format(year=m.group(1), month=month,
                                                  # pyrefly: ignore[missing-attribute] — 同上
                                                  day=int(m.group(3)))})
    return items


# =========================================================================
# 10. LLM 后端接线(局域网 Ollama 优先 / Anthropic 兜底;两个端点两只发射器)
# =========================================================================


def llm_config() -> LlmConfig:
    """读环境定后端(NEWS_LLM_BASE 设了走局域网 Ollama,否则 Anthropic haiku)。

    原入口脚本在模块导入时读一次,溶解后每个步骤入口现读 —— 一次进程内语义相同。
    """
    return LlmConfig(base=os.environ.get(ENV_LLM_BASE, "").strip().rstrip(URL_TAIL_SLASH),
                     local_model=os.environ.get(ENV_LLM_MODEL, LLM_LOCAL_MODEL_DEFAULT),
                     api_key=os.environ.get(ENV_API_KEY, "").strip())


def make_llm_client(x: MakeLlmClientIn) -> httpx.Client:
    """按后端造客户端:局域网盒零认证头,Anthropic 带 key 与版本头。"""
    headers: dict = {}
    base_url = x.cfg.base
    if base_url == "":
        base_url = ANTHROPIC_BASE
        headers = {HDR_API_KEY: x.cfg.api_key, HDR_ANTHROPIC_VERSION: ANTHROPIC_VERSION}
    return httpx.Client(base_url=base_url, timeout=x.timeout_s, headers=headers)


def call_llm(x: CallLlmIn) -> str:
    """单轮生成:Ollama /api/generate(think 关,剥 think 块双保险)或 Anthropic /v1/messages。"""
    if x.cfg.base != "":
        r = x.client.post(PATH_OLLAMA_GENERATE,
                          json={P_MODEL: x.cfg.local_model, P_PROMPT: x.prompt,
                                P_STREAM: False, P_THINK: False,
                                P_OPTIONS: {P_NUM_PREDICT: x.tokens}})
        r.raise_for_status()
        return THINK_RE.sub("", r.json()[P_RESPONSE]).strip()
    r = x.client.post(PATH_ANTHROPIC_MESSAGES,
                      json={P_MODEL: LLM_MODEL, P_MAX_TOKENS: x.tokens,
                            P_MESSAGES: [{P_ROLE: ROLE_USER, P_CONTENT: x.prompt}]})
    r.raise_for_status()
    text = ""
    for block in r.json()[P_CONTENT]:
        text += block.get(P_TEXT_BLOCK, "")
    return text.strip()


def call_title_llm(x: CallTitleIn) -> str:
    """标题灰注一发:Ollama /api/chat + 提示词内 /no_think,取首行并剥引号。"""
    r = x.client.post(PATH_OLLAMA_CHAT,
                      json={P_MODEL: x.cfg.local_model, P_THINK: False, P_STREAM: False,
                            P_OPTIONS: {P_TEMPERATURE: TITLE_TEMPERATURE,
                                        P_NUM_PREDICT: TITLE_TOKENS},
                            P_MESSAGES: [{P_ROLE: ROLE_USER, P_CONTENT: x.prompt}]})
    r.raise_for_status()
    out = (r.json().get(P_MESSAGE, {}).get(P_CONTENT) or "").strip()
    out = THINK_RE.sub("", out).strip()
    out = strip_md(out).strip(TITLE_STRIP_CHARS)
    return out.splitlines()[0].strip() if out else ""


def strip_md(s: str) -> str:
    """剥 LLM 溜出来的 Markdown 记号(**粗体**/行首 #);正文是纯文本渲染,记号=噪音。"""
    s = MD_BOLD_RE.sub(MD_BOLD_KEEP, s)
    return MD_HEAD_RE.sub("", s).replace(MD_BOLD_MARK, "")


# =========================================================================
# 11. 全文翻译与速读(zh/ko 同编号协议;新增条目才调,随行存 raw = 幂等缓存)
# =========================================================================


def translate_missing() -> None:
    """翻译步(门直调的第三件):按预算给缺译条目补速读+逐段译文,单条失败不断轮。"""
    cfg = llm_config()
    if cfg.base == "" and cfg.api_key == "":
        say(PRINT_TRANSLATE_SKIP)
        return
    data = json.loads(OUT_NEWS_FILE.read_text(encoding=ENC_UTF8))
    todo = pick_translate_todo(data[K_ITEMS])
    if len(todo) == 0:
        say(PRINT_TRANSLATE_NONE)
        return
    budget = int(os.environ.get(ENV_TRANSLATE_BUDGET, TRANSLATE_BUDGET_DEFAULT))
    done = 0
    with make_llm_client(MakeLlmClientIn(cfg=cfg, timeout_s=TRANSLATE_TIMEOUT_S)) as c:
        client = cast(LlmClientLike, c)
        for task in todo[:budget]:
            try:
                translate_one(TranslateOneIn(client=client, cfg=cfg, task=task))
                done += 1
            except Exception as e:  # noqa: BLE001
                err(WHERE_TRANSLATE_TPL.format(lang=task.lang, url=task.item[K_URL]), e)
    if done:
        paths.write_json(paths.WriteJsonIn(path=OUT_NEWS_FILE, payload=data, indent=1))
    if budget == 0:
        say(PRINT_TRANSLATE_OFF_TPL.format(n=len(todo)))
        return
    line = PRINT_TRANSLATE_DONE_TPL.format(done=done, total=len(todo))
    if len(todo) > done:
        line = line + PRINT_LEFT_TPL.format(n=len(todo) - done)
    say(line)


def pick_translate_todo(items: list) -> list[TranslateTask]:
    """待翻队列 =(条目, 目标语)对:zh 缺 summaryZh / ko 缺 summaryKo(各自独立补,预算按调用数计)。"""
    todo: list[TranslateTask] = []
    for it in items:
        if not it.get(K_BODY_EN):
            continue
        for lang in LANGS:
            if not it.get(summary_key_of(lang)):
                todo.append(TranslateTask(item=it, lang=lang))
    return todo


def summary_key_of(lang: str) -> str:
    """目标语 → 速读行键(队列判缺与回写共用同一把尺)。"""
    if lang == LANG_ZH:
        return K_SUMMARY_ZH
    return K_SUMMARY_KO


def translate_one(x: TranslateOneIn) -> None:
    """一条一语:编号喂入 → 哨兵切分 → 速读/重要度/逐段译文就地补;失败抛出去留空重试。

    grounding 红线:只喂抓到的官方正文,禁外推,展示层标「AI 翻译·以原文为准」。
    重要度只在中文调用里产(单一来源);bodyZh 与速读同一次赋值 —— 对不齐就整条不落,
    不留「有速读没正文」的半成品(前端按序配对的前提)。
    """
    it = x.task.item
    paras = clip_paragraphs(it[K_BODY_EN])
    tpl = PROMPT if x.task.lang == LANG_ZH else PROMPT_KO
    prompt = tpl.format(title=it[K_TITLE], n=len(paras), body=number_paragraphs(paras))
    text = call_llm(CallLlmIn(client=x.client, cfg=x.cfg, prompt=prompt, tokens=TRANSLATE_TOKENS))
    summary, sep, body = text.partition(SENTINEL)
    if not (sep and summary.strip() and body.strip()):
        raise ValueError(ERR_SENTINEL)
    summary = strip_md(summary.strip())
    if x.task.lang == LANG_ZH:
        first, _, rest = summary.partition(LINE_SEP)
        m = IMP_RE.match(first.strip())
        if m:
            it[K_IMPORTANCE], it[K_IMPORTANCE_NOTE] = int(m.group(1)), m.group(2).strip()
            summary = rest.strip()
        it[K_SUMMARY_ZH], it[K_BODY_ZH] = summary, parse_numbered_body(
            NumberedIn(body=body, total=len(paras)))
        return
    it[K_SUMMARY_KO], it[K_BODY_KO] = summary, parse_numbered_body(
        NumberedIn(body=body, total=len(paras)))


def clip_paragraphs(body_en: str) -> list[str]:
    """按 BODY_CAP 截原文段落(整段计预算,不在段中间截断——截半段编号就废了)。

    超长稿只翻前 N 整段,尾段对照缺=只显英文,不错位。
    """
    paras: list[str] = []
    used = 0
    for raw in body_en.split(PARA_SEP):
        p = raw.strip()
        if not p:
            continue
        if used + len(p) > BODY_CAP and paras:
            break
        paras.append(p)
        used += len(p)
    return paras


def number_paragraphs(paras: list[str]) -> str:
    """原文逐段挂 [1..N] 编号喂入(对齐协议 v2 的发送侧)。"""
    lines = []
    for i, p in enumerate(paras):
        lines.append(SEG_TPL.format(n=i + 1, text=p))
    return PARA_SEP.join(lines)


def parse_numbered_body(x: NumberedIn) -> str:
    """按编号解析译文 → 与原文同序同段数的正文;缺号/空段=抛错(整条重试,不出错位页面)。"""
    parts = SEG_RE.split(x.body)
    numbered: dict[int, str] = {}
    for k, txt in zip(parts[1::2], parts[2::2]):
        t = strip_md(txt).strip()
        if t:
            numbered[int(k)] = t
    missing = []
    for k in range(1, x.total + 1):
        if k not in numbered:
            missing.append(k)
    if missing:
        more = ELLIPSIS if len(missing) > ALIGN_SHOW_MAX else ""
        raise ValueError(ERR_ALIGN_TPL.format(missing=missing[:ALIGN_SHOW_MAX], more=more, n=x.total))
    out = []
    for k in range(1, x.total + 1):
        out.append(numbered[k])
    return PARA_SEP.join(out)


# =========================================================================
# 12. 重要度打分(P1e 稳态:翻译走线上实时,重要度必须提前 —— banner TOP5/徽标/只看重要全靠它)
# =========================================================================


def score_missing() -> None:
    """打分步(门直调的第二件):轻量必跑,给没有重要度的条目补 1-5 分与一句理由。"""
    cfg = llm_config()
    if cfg.base == "" and cfg.api_key == "":
        return
    data = json.loads(OUT_NEWS_FILE.read_text(encoding=ENC_UTF8))
    todo = []
    for it in data[K_ITEMS]:
        if it.get(K_BODY_EN) and not it.get(K_IMPORTANCE):
            todo.append(it)
    if len(todo) == 0:
        return
    budget = int(os.environ.get(ENV_SCORE_BUDGET, SCORE_BUDGET_DEFAULT))
    done = 0
    with make_llm_client(MakeLlmClientIn(cfg=cfg, timeout_s=SCORE_TIMEOUT_S)) as c:
        client = cast(LlmClientLike, c)
        for it in todo[:budget]:
            try:
                prompt = PROMPT_SCORE.format(title=it[K_TITLE], body=it[K_BODY_EN][:SCORE_BODY_LEN])
                text = call_llm(CallLlmIn(client=client, cfg=cfg, prompt=prompt, tokens=SCORE_TOKENS))
                m = IMP_RE.match(text.splitlines()[0].strip()) if text else None
                if m:
                    it[K_IMPORTANCE], it[K_IMPORTANCE_NOTE] = int(m.group(1)), m.group(2).strip()
                    done += 1
            except Exception as e:  # noqa: BLE001
                err(WHERE_SCORE_TPL.format(url=it[K_URL]), e)
    if done:
        paths.write_json(paths.WriteJsonIn(path=OUT_NEWS_FILE, payload=data, indent=1))
    say(PRINT_SCORE_TPL.format(done=done, total=len(todo)))


# =========================================================================
# 13. 标题中文灰注(E13-06,与正文 bodyZh 独立;本地 Ollama-only)
# =========================================================================


def translate_titles_missing() -> None:
    """标题步(门直调的第四件):独立预算给缺灰注的标题补一行中文;不过校验宁可留空。"""
    cfg = llm_config()
    if cfg.base == "":
        say(PRINT_TITLE_SKIP)
        return
    data = json.loads(OUT_NEWS_FILE.read_text(encoding=ENC_UTF8))
    todo = []
    for it in data[K_ITEMS]:
        if it.get(K_TITLE) and not it.get(K_TITLE_ZH):
            todo.append(it)
    if len(todo) == 0:
        say(PRINT_TITLE_NONE)
        return
    budget = int(os.environ.get(ENV_TITLE_BUDGET, TITLE_BUDGET_DEFAULT))
    done = 0
    with make_llm_client(MakeLlmClientIn(cfg=cfg, timeout_s=TITLE_TIMEOUT_S)) as c:
        client = cast(LlmClientLike, c)
        for it in todo[:budget]:
            try:
                out = call_title_llm(CallTitleIn(client=client, cfg=cfg,
                                                 prompt=PROMPT_TITLE.format(title=it[K_TITLE])))
                if title_ok(TitleCheckIn(out=out, source=it[K_TITLE])):
                    it[K_TITLE_ZH] = out
                    done += 1
                else:
                    say(PRINT_TITLE_BAD_TPL.format(url=it[K_URL], out=out[:PRINT_TITLE_BAD_LEN]))
            except Exception as e:  # noqa: BLE001
                err(WHERE_TITLE_TPL.format(url=it[K_URL]), e)
    if done:
        paths.write_json(paths.WriteJsonIn(path=OUT_NEWS_FILE, payload=data, indent=1))
    line = PRINT_TITLE_DONE_TPL.format(done=done, total=len(todo))
    if len(todo) > done:
        line = line + PRINT_LEFT_TPL.format(n=len(todo) - done)
    say(line)


def title_ok(x: TitleCheckIn) -> bool:
    """标题译文过关校验:非空、含中文字符、不比原标题离谱地长(拦「展开成大段解读」的失败样)。"""
    if x.out == "":
        return False
    if CJK_RE.search(x.out) is None:
        return False
    return len(x.out) <= len(x.source) + TITLE_LEN_SLACK
