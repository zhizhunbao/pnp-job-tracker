"""fetch.functions — 通用抓取域(API/页面直取;#55 §2.5 通用件沉淀于此)。

2026-08-30 定界(Frank):fetch = 通用的抓取与 API 直取域,只住任何域都用得上的件:
  · httpx client 两档(伪装/礼貌)+ 带重试 fetch
  · 日期解析 / slug(子源共享词汇)
  · atom / rss feed 解析
  · 详情页 og:image + 正文抽取(main/article 通用容器,选择器可覆盖)
news 母框架(run/SOURCE 契约/增量合并/防线)同日迁回 etl/news/functions.py ——
「谁的行词汇归谁家」;与 crawl 的分工:fetch 拿已知 URL,crawl 探未知 URL。
零字符串令已就范:词表全住 fetch/constants.py。
"""
from __future__ import annotations

import email.utils
import time
from datetime import datetime

import httpx
from bs4 import BeautifulSoup, Tag

from fetch.scheme import DetailIn, DetailOut, FetchIn, SectionIn
from fetch.constants import (ATTR_CONTENT, ATTR_HREF, BODY_TAGS, BROWSER_UA, BULLET, DATE_LONG_FMT,
                             DATE_LONG_TPL, DATE_RE, FEED_DATE_TAGS, FEED_ENTRY_TAGS, HDR_UA,
                             ISO_DATE_RE, JUNK_TAGS, K_DATE, K_TITLE, K_URL, LINE_SEP,
                             OG_META_PATTERNS, OG_PROP, PARA_SEP, PARSER_HTML, PARSER_XML,
                             POLITE_UA, RETRIES, SECTION_TAKE_TAGS, SLUG_DASH, SLUG_MAXLEN,
                             SLUG_RE, SPACE_SEP, TAG_ARTICLE, TAG_BR, TAG_LI, TAG_LINK, TAG_MAIN,
                             TAG_META, TAG_TITLE, TAIL_NOISE, TRAIL_COLON, WS_RE)


# =========================================================================
# 1. 客户端与请求(伪装/礼貌两档唯一门 + 带重试 fetch)
# =========================================================================


def make_client(timeout: float) -> httpx.Client:
    """伪装档客户端(gov 目录站/官网对无头 UA 挑剔);批A 起全站构造客户端只走这两个门。"""
    return httpx.Client(headers={HDR_UA: BROWSER_UA}, follow_redirects=True, timeout=timeout)


def make_polite_client(timeout: float) -> httpx.Client:
    """礼貌档客户端(自报家门;抓杂牌公司官网,证书宽容是设计 —— 自签/过期站一大把,
    宁可读到内容也不为 TLS 洁癖丢简介)。"""
    return httpx.Client(headers={HDR_UA: POLITE_UA}, follow_redirects=True,
                        timeout=timeout, verify=False)


def fetch(x: FetchIn) -> str:
    """GET;带 post_data 则 POST 表单(SK 新闻 hub 的 Sitecore 部委筛选是 POST-only)。"""
    last: Exception | None = None
    for attempt in range(RETRIES + 1):
        try:
            r = x.client.post(x.url, data=x.post_data) if x.post_data else x.client.get(x.url)
            r.raise_for_status()
            return r.text
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt < RETRIES:
                time.sleep(2 * (attempt + 1))
    raise last  # type: ignore[misc]


# =========================================================================
# 2. 日期与 slug(子源共享词汇)
# =========================================================================


def iso_date(text: str) -> str | None:
    """「June 24, 2026」/ RSS pubDate(RFC 2822)/ ISO 串 → YYYY-MM-DD;解析不出返回 None(不猜)。"""
    if not text:
        return None
    text = text.strip()
    m = ISO_DATE_RE.match(text)
    if m:
        return m.group(0)
    m = DATE_RE.search(text)
    if m:
        try:
            rebuilt = DATE_LONG_TPL.format(month=m.group(1), day=m.group(2), year=m.group(3))
            return datetime.strptime(rebuilt, DATE_LONG_FMT).date().isoformat()
        except ValueError:
            return None
    try:
        return email.utils.parsedate_to_datetime(text).date().isoformat()
    except (ValueError, TypeError):
        return None


def slugify(text: str) -> str:
    """标题 → 锚点 slug(小写、非字母数字折 -、截 SLUG_MAXLEN;单页式源拿它合成条目 URL)。"""
    s = SLUG_RE.sub(SLUG_DASH, (text or "").lower()).strip(SLUG_DASH)
    return s[:SLUG_MAXLEN].rstrip(SLUG_DASH)


# =========================================================================
# 3. feed 解析(atom/rss 子源零 parse)
# =========================================================================


def parse_feed(xml: str) -> list[dict]:
    """atom/rss XML → [{title, date, url}](K_ 三键 wire 格式);三件缺一不收(不猜)。"""
    soup = BeautifulSoup(xml, PARSER_XML)
    items = []
    for entry in soup.find_all(FEED_ENTRY_TAGS):
        title_el = entry.find(TAG_TITLE)
        title = title_el.get_text(SPACE_SEP, strip=True) if title_el else ""
        link_el = entry.find(TAG_LINK)
        url = (link_el.get(ATTR_HREF) or link_el.get_text(strip=True)) if link_el else ""
        date_el = entry.find(FEED_DATE_TAGS)
        date = iso_date(date_el.get_text(strip=True)) if date_el else None
        if title and url and date:
            items.append({K_TITLE: title, K_DATE: date, K_URL: url})
    return items


# =========================================================================
# 4. 详情页抽取(og:image + 正文;页尾样板剥离)
# =========================================================================


def _el_text(el: Tag) -> str:
    """元素 → 文本,块内 <br> 换行保真(联系人块的姓名/头衔/邮箱各占一行,P1c 修:原先压成一坨)。"""
    for br in el.find_all(TAG_BR):
        br.replace_with(LINE_SEP)
    lines = []
    for ln in el.get_text().split(LINE_SEP):
        cleaned = WS_RE.sub(SPACE_SEP, ln).strip()
        if cleaned:
            lines.append(cleaned)
    return LINE_SEP.join(lines)


def _clip_tail(paras: list[str]) -> list[str]:
    """剥页尾样板:从第一个噪音标题(TAIL_NOISE)起全部丢弃。"""
    for i, p in enumerate(paras):
        if p.strip().lower().rstrip(TRAIL_COLON) in TAIL_NOISE:
            return paras[:i]
    return paras


def extract_detail(x: DetailIn) -> DetailOut:
    """详情页 → DetailOut(og:image, 正文纯文本)。正文取 main/article 容器的段落/列表/小标题,
    段落间 \\n\\n、段内 <br> 保留为 \\n;抽不到正文返回空串(只卡片不出详情,不硬造)。
    嵌套列表只在最外层收一次(scope 外的布局 li 不算);og:image 属性经 str() 收窄
    (bs4 可能给 AttributeValueList,company 同例)。"""
    soup = BeautifulSoup(x.html, PARSER_HTML)
    og = soup.find(TAG_META, property=OG_PROP)
    og_val = og.get(ATTR_CONTENT) if og else None
    og_image = str(og_val) if og_val else None
    scope = (soup.select_one(x.selector) if x.selector else None) \
        or soup.find(TAG_MAIN) or soup.find(TAG_ARTICLE) or soup.body
    if scope is None:
        return DetailOut(og_image=og_image, body="")
    for junk in scope.find_all(JUNK_TAGS):
        junk.decompose()
    paras = []
    for el in scope.find_all(BODY_TAGS):
        li = el.find_parent(TAG_LI)
        if li is not None and scope in li.parents:
            continue
        txt = _el_text(el)
        if txt:
            paras.append((BULLET + txt) if el.name == TAG_LI else txt)
    return DetailOut(og_image=og_image, body=PARA_SEP.join(_clip_tail(paras)))


def section_body(x: SectionIn) -> str:
    """日期标题式页面(BC/ON/AB):收集 heading 之后、下一个同级标题之前的正文;
    收集范围内的嵌套列表只收最外层。"""
    take_names = []
    for n in SECTION_TAKE_TAGS:
        if n not in x.stop_names:
            take_names.append(n)
    take = tuple(take_names)
    paras = []
    for sib in x.heading.find_next_siblings():
        if sib.name in x.stop_names:
            break
        for el in ([sib] if sib.name in take else sib.find_all(list(take))):
            li = el.find_parent(TAG_LI)
            if li is not None and (li is sib or sib in li.parents):
                continue
            txt = _el_text(el)
            if txt:
                paras.append((BULLET + txt) if el.name == TAG_LI else txt)
    return PARA_SEP.join(_clip_tail(paras))


def page_og_image(html: str) -> str | None:
    """页级 og:image(正则直取,不建树;单页日期段落式源给缺图条目兜底)。"""
    for pat in OG_META_PATTERNS:
        m = pat.search(html)
        if m:
            return m.group(1)
    return None
