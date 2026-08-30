"""fetch.functions — 抓取母脚本(#55 §2.5 模板方法;E12-06 news 为首个原生样板;
2026-08-30 由单文件 etl/_fetch.py 升格目录域,常量拆 fetch/constants.py;
同日注释/默认值/推导式/裸 print 就范方言律①④⑤⑪ —— 零字符串与一参令随批C news 溶解)。

母管「怎么抓」的一切通用件,子脚本只填「抓哪 + 怎么从该站挑出行」:
  · httpx client(UA / 超时 / 重试 / 详情页频控)
  · atom / rss feed 解析(feed 类子源连 parse 都不用写)
  · 详情页 og:image + 正文抽取(main/article 通用容器,选择器可按源覆盖)
  · 按 URL 累积去重(同 postings 增量惯例:抓挂了旧数据还在)
  · 逐子源 try/except 隔离(一子源改版只丢该子源,不断全轮)
  · 防线:合并后条数只增不缩,可疑缩水整轮不写盘
  · 原子写盘(tmp + replace,04c 惯例)+ 汇总打印

子脚本契约(etl/news/scrape_*.py):
  SOURCE = {
      "region":   "MB",              # federal / 两字母省码(前端省筛选 chips 直接用)
      "list_url": "https://…/feed/", # 列表页或 feed URL
      "kind":     "rss",             # atom | rss | html
      "parse":    parse_fn,          # 仅 html:list_url 页 HTML → [{title, date, url, bodyEn?}]
                                     #   date=ISO;url 可相对(母 urljoin);带 bodyEn = 单页日期段落式
                                     #   源(BC/ON/AB),母不再抓详情页
      "citation": "https://…",       # 出处着陆页(E4-04 惯例:人能读的页;缺省 = list_url)
      "post_data": {...},            # 可选:列表页要 POST 表单才出结果时填(SK Sitecore 筛选)
      "body_selector": "div.x",      # 可选:详情页正文容器选择器(缺省 main/article 通用抽取)
  }
"""
from __future__ import annotations

import email.utils
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

from _log import err, say
from fetch.constants import (BROWSER_UA, DATE_RE, DETAIL_SLEEP, MAX_AGE_DAYS, MAX_DETAIL_PER_RUN,
                             MIN_TOTAL, POLITE_UA, RETRIES, SLUG_MAXLEN, TAIL_NOISE, TIMEOUT)


# =========================================================================
# 1. 客户端与请求(伪装/礼貌两档唯一门 + 带重试 fetch)
# =========================================================================


def make_client(timeout: float) -> httpx.Client:
    """伪装档客户端(gov 目录站/官网对无头 UA 挑剔);批A 起全站构造客户端只走这两个门。"""
    return httpx.Client(headers={"User-Agent": BROWSER_UA}, follow_redirects=True, timeout=timeout)


def make_polite_client(timeout: float) -> httpx.Client:
    """礼貌档客户端(自报家门;抓杂牌公司官网,证书宽容是设计 —— 自签/过期站一大把,
    宁可读到内容也不为 TLS 洁癖丢简介)。"""
    return httpx.Client(headers={"User-Agent": POLITE_UA}, follow_redirects=True,
                        timeout=timeout, verify=False)


def fetch(client: httpx.Client, url: str, post_data: dict | None) -> str:
    """GET;带 post_data 则 POST 表单(SK 新闻 hub 的 Sitecore 部委筛选是 POST-only)。"""
    last: Exception | None = None
    for attempt in range(RETRIES + 1):
        try:
            r = client.post(url, data=post_data) if post_data else client.get(url)
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
    m = re.match(r"\d{4}-\d{2}-\d{2}", text)
    if m:
        return m.group(0)
    m = DATE_RE.search(text)
    if m:
        try:
            return datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%B %d %Y").date().isoformat()
        except ValueError:
            return None
    try:
        return email.utils.parsedate_to_datetime(text).date().isoformat()
    except (ValueError, TypeError):
        return None


def slugify(text: str) -> str:
    """标题 → 锚点 slug(小写、非字母数字折 -、截 SLUG_MAXLEN;单页式源拿它合成条目 URL)。"""
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:SLUG_MAXLEN].rstrip("-")


# =========================================================================
# 3. feed 解析(atom/rss 子源零 parse)
# =========================================================================


def parse_feed(xml: str) -> list[dict]:
    """atom/rss XML → [{title, date, url}];三件缺一不收(缺件宁可不收,不猜)。"""
    soup = BeautifulSoup(xml, "xml")
    items = []
    for entry in soup.find_all(["entry", "item"]):
        title_el = entry.find("title")
        title = title_el.get_text(" ", strip=True) if title_el else ""
        link_el = entry.find("link")
        url = (link_el.get("href") or link_el.get_text(strip=True)) if link_el else ""
        date_el = entry.find(["published", "updated", "pubDate", "dc:date"])
        date = iso_date(date_el.get_text(strip=True)) if date_el else None
        if title and url and date:
            items.append({"title": title, "date": date, "url": url})
    return items


# =========================================================================
# 4. 详情页抽取(og:image + 正文;页尾样板剥离)
# =========================================================================


def _el_text(el: Tag) -> str:
    """元素 → 文本,块内 <br> 换行保真(联系人块的姓名/头衔/邮箱各占一行,P1c 修:原先压成一坨)。"""
    for br in el.find_all("br"):
        br.replace_with("\n")
    lines = []
    for ln in el.get_text().split("\n"):
        cleaned = re.sub(r"\s+", " ", ln).strip()
        if cleaned:
            lines.append(cleaned)
    return "\n".join(lines)


def _clip_tail(paras: list[str]) -> list[str]:
    """剥页尾样板:从第一个噪音标题(TAIL_NOISE)起全部丢弃。"""
    for i, p in enumerate(paras):
        if p.strip().lower().rstrip(":") in TAIL_NOISE:
            return paras[:i]
    return paras


def extract_detail(html: str, body_selector: str | None) -> tuple[str | None, str]:
    """详情页 → (og:image, 正文纯文本)。正文取 main/article 容器的段落/列表/小标题,
    段落间 \\n\\n、段内 <br> 保留为 \\n;抽不到正文返回空串(只卡片不出详情,不硬造)。
    嵌套列表只在最外层收一次(scope 外的布局 li 不算);og:image 属性经 str() 收窄
    (bs4 可能给 AttributeValueList,company 同例)。"""
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:image")
    og_val = og.get("content") if og else None
    og_image = str(og_val) if og_val else None
    scope = (soup.select_one(body_selector) if body_selector else None) \
        or soup.find("main") or soup.find("article") or soup.body
    if scope is None:
        return og_image, ""
    for junk in scope.find_all(["nav", "script", "style", "form", "aside", "footer", "header"]):
        junk.decompose()
    paras = []
    for el in scope.find_all(["p", "li", "h2", "h3", "h4"]):
        li = el.find_parent("li")
        if li is not None and scope in li.parents:
            continue
        txt = _el_text(el)
        if txt:
            paras.append(("• " + txt) if el.name == "li" else txt)
    return og_image, "\n\n".join(_clip_tail(paras))


def section_body(heading: Tag, stop_names: tuple[str, ...]) -> str:
    """日期标题式页面(BC/ON/AB):收集 heading 之后、下一个同级标题之前的正文;
    收集范围内的嵌套列表只收最外层。"""
    take_names = []
    for n in ("p", "li", "h4", "h5", "h6"):
        if n not in stop_names:
            take_names.append(n)
    take = tuple(take_names)
    paras = []
    for sib in heading.find_next_siblings():
        if sib.name in stop_names:
            break
        for el in ([sib] if sib.name in take else sib.find_all(list(take))):
            li = el.find_parent("li")
            if li is not None and (li is sib or sib in li.parents):
                continue
            txt = _el_text(el)
            if txt:
                paras.append(("• " + txt) if el.name == "li" else txt)
    return "\n\n".join(_clip_tail(paras))


def page_og_image(html: str) -> str | None:
    """页级 og:image(正则直取,不建树;单页日期段落式源给缺图条目兜底)。"""
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html) \
        or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', html)
    return m.group(1) if m else None


# =========================================================================
# 5. news 母框架(增量合并 → 防线 → 原子写盘)
# =========================================================================


def _load(out_file: Path) -> list[dict]:
    """读上一轮落盘的累积条目;文件不存在/损坏按空表起步(增量合并的底座)。"""
    if not out_file.exists():
        return []
    try:
        return json.loads(out_file.read_text(encoding="utf-8")).get("items", [])
    except (json.JSONDecodeError, OSError):
        return []


def merge_key(it: dict) -> tuple[str, str]:
    """合并排序键:日期为主、URL 定序(调用处 reverse=True = 新在前)。"""
    return (it["date"], it["url"])


def run(sources: list[dict], out_file: Path) -> None:
    """母入口:逐子源抓列表 → 增量补详情 → 按 URL 合并去重 → 防线 → 原子写盘。

    · 单页日期段落式源(自带 bodyEn):条目缺图用页级 og:image 兜底;
    · title/url/date 缺件宁可不收,不猜;超 MAX_AGE_DAYS 的旧闻不进站;
    · 列表式源抓详情页补 og+正文,每轮每子源限 MAX_DETAIL_PER_RUN,超预算留下一轮(12h);
    · NEWS_REBODY=1:对存量条目重抓详情正文(一次性回填,抽取器修复后用;锚点合成
      url(含 #)= 单页式源,正文来自列表页解析,跳过);失败保留旧正文。
    """
    say(f"OUT: {out_file}")
    existing = _load(out_file)
    by_url: dict[str, dict] = {}
    for it in existing:
        by_url[it["url"]] = it
    today = datetime.now(timezone.utc).date()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with make_client(timeout=TIMEOUT) as client:
        for src in sources:
            region = src["region"]
            try:
                raw = fetch(client, src["list_url"], src.get("post_data"))
                if src["kind"] in ("atom", "rss"):
                    items = parse_feed(raw)
                else:
                    items = src["parse"](raw)
                    list_og = page_og_image(raw)
                    for it in items:
                        if "bodyEn" in it and not it.get("ogImage"):
                            it["ogImage"] = list_og
                fresh: list[dict] = []
                for it in items:
                    d = it.get("date")
                    if not (it.get("title") and it.get("url") and d):
                        continue
                    if (today - datetime.strptime(d, "%Y-%m-%d").date()).days > MAX_AGE_DAYS:
                        continue
                    it["url"] = urljoin(src["list_url"], it["url"])
                    if it["url"] not in by_url:
                        fresh.append(it)
                detail_budget = MAX_DETAIL_PER_RUN
                added = 0
                for it in fresh:
                    if "bodyEn" not in it:
                        if detail_budget <= 0:
                            continue
                        detail_budget -= 1
                        try:
                            og, body = extract_detail(fetch(client, it["url"], None),
                                                      src.get("body_selector"))
                            it["ogImage"], it["bodyEn"] = og, body
                        except Exception as e:  # noqa: BLE001
                            err(f"{region} detail {it['url']}", e)
                            it.setdefault("ogImage", None)
                            it.setdefault("bodyEn", "")
                        time.sleep(DETAIL_SLEEP)
                    row = {"region": region, "title": it["title"].strip(), "date": it["date"],
                           "url": it["url"], "ogImage": it.get("ogImage"),
                           "bodyEn": it.get("bodyEn", ""), "bodyZh": "", "summaryZh": "",
                           "citation": src.get("citation") or src["list_url"],
                           "fetchedAt": now_iso}
                    by_url[row["url"]] = row
                    added += 1
                say(f"✓ {region}: list {len(items)} · new {added}"
                    + (f" (deferred {len(fresh) - added})" if len(fresh) > added else ""))
                if os.environ.get("NEWS_REBODY") == "1":
                    redone = 0
                    for it in by_url.values():
                        if it["region"] != region or "#" in it["url"]:
                            continue
                        try:
                            og, body = extract_detail(fetch(client, it["url"], None),
                                                      src.get("body_selector"))
                            if body:
                                it["bodyEn"] = body
                                it["ogImage"] = og or it.get("ogImage")
                                redone += 1
                        except Exception as e:  # noqa: BLE001
                            err(f"rebody {it['url']}", e)
                        time.sleep(DETAIL_SLEEP)
                    if redone:
                        say(f"  ↻ {region}: rebody {redone}")
            except Exception as e:  # noqa: BLE001
                err(f"{region}(保留旧数据,下轮重试)", e)

    merged = sorted(by_url.values(), key=merge_key, reverse=True)
    if len(merged) < len(existing):
        raise SystemExit(f"merged {len(merged)} < existing {len(existing)} —— 累积表只增不缩,拒绝写盘")
    if len(merged) < MIN_TOTAL:
        raise SystemExit(f"suspiciously few items ({len(merged)} < {MIN_TOTAL}) —— 不写盘")
    atomic_write_json(out_file, {"fetched": now_iso, "items": merged})
    per = {}
    for it in merged:
        per[it["region"]] = per.get(it["region"], 0) + 1
    per_parts = []
    for k, v in sorted(per.items()):
        per_parts.append(f"{k}={v}")
    say(f"wrote {len(merged)} items " + " ".join(per_parts))


def atomic_write_json(out_file: Path, payload: dict) -> None:
    """原子写 JSON(tmp + replace,04c 惯例;与 _paths.write_json 的收拢挂台账,批C 一并判)。"""
    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(out_file)
