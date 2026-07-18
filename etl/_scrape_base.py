"""_scrape_base — 抓取母脚本(#55 §2.5 模板方法;E12-06 news 为首个原生样板)。

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
  }
"""
from __future__ import annotations

import email.utils
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")
TIMEOUT = 30
RETRIES = 2                 # 每 URL 最多 1+2 次
DETAIL_SLEEP = 1.0          # 详情页抓取间隔(礼貌频控)
MAX_DETAIL_PER_RUN = 15     # 每轮每子源最多抓 N 个详情页(12h 一轮,追平只是时间问题)
MAX_AGE_DAYS = 400          # 只收这个窗口内的条目(AB 页带 2020 年陈年更新,旧闻不进站)
MIN_TOTAL = 10              # 全轮防线:合并后至少 N 条(首轮 ~几十条,低于此 = 结构性故障)

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
DATE_RE = re.compile(rf"({MONTHS})\s+(\d{{1,2}}),?\s+(20\d\d)", re.I)


# ---------- 抓取 ----------

def make_client() -> httpx.Client:
    return httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=TIMEOUT)


def fetch(client: httpx.Client, url: str) -> str:
    last: Exception | None = None
    for attempt in range(RETRIES + 1):
        try:
            r = client.get(url)
            r.raise_for_status()
            return r.text
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt < RETRIES:
                time.sleep(2 * (attempt + 1))
    raise last  # type: ignore[misc]


# ---------- 日期 ----------

def iso_date(text: str) -> str | None:
    """「June 24, 2026」/ RSS pubDate / ISO 串 → YYYY-MM-DD;解析不出返回 None(不猜)。"""
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
    try:  # RFC 2822(RSS pubDate)
        return email.utils.parsedate_to_datetime(text).date().isoformat()
    except (ValueError, TypeError):
        return None


def slugify(text: str, maxlen: int = 60) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:maxlen].rstrip("-")


# ---------- feed 解析(atom/rss 子源零 parse)----------

def parse_feed(xml: str) -> list[dict]:
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


# ---------- 详情页:og:image + 正文 ----------

def extract_detail(html: str, body_selector: str | None = None) -> tuple[str | None, str]:
    """详情页 → (og:image, 正文纯文本)。正文取 main/article 容器的段落/列表/小标题,
    保留段落分隔(\\n\\n);抽不到正文返回空串(只卡片不出详情,不硬造)。"""
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:image")
    og_image = og.get("content") if og and og.get("content") else None
    scope = (soup.select_one(body_selector) if body_selector else None) \
        or soup.find("main") or soup.find("article") or soup.body
    if scope is None:
        return og_image, ""
    for junk in scope.find_all(["nav", "script", "style", "form", "aside", "footer", "header"]):
        junk.decompose()
    paras = []
    for el in scope.find_all(["p", "li", "h2", "h3", "h4"]):
        li = el.find_parent("li")
        if li is not None and scope in li.parents:   # 嵌套列表只在最外层收一次(scope 外的布局 li 不算)
            continue
        txt = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
        if txt:
            paras.append(("• " + txt) if el.name == "li" else txt)
    return og_image, "\n\n".join(paras)


def section_body(heading, stop_names: tuple[str, ...]) -> str:
    """日期标题式页面(BC/ON/AB):收集 heading 之后、下一个同级标题之前的正文。"""
    take = tuple(n for n in ("p", "li", "h4", "h5", "h6") if n not in stop_names)
    paras = []
    for sib in heading.find_next_siblings():
        if sib.name in stop_names:
            break
        for el in ([sib] if sib.name in take else sib.find_all(list(take))):
            li = el.find_parent("li")
            if li is not None and (li is sib or sib in li.parents):   # 收集范围内的嵌套列表只收最外层
                continue
            txt = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
            if txt:
                paras.append(("• " + txt) if el.name == "li" else txt)
    return "\n\n".join(paras)


def page_og_image(html: str) -> str | None:
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html) \
        or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', html)
    return m.group(1) if m else None


# ---------- 主流程 ----------

def _load(out_file: Path) -> list[dict]:
    if not out_file.exists():
        return []
    try:
        return json.loads(out_file.read_text(encoding="utf-8")).get("items", [])
    except (json.JSONDecodeError, OSError):
        return []


def run(sources: list[dict], out_file: Path) -> None:
    """母入口:逐子源抓列表 → 增量补详情 → 按 URL 合并去重 → 防线 → 原子写盘。"""
    print(f"OUT: {out_file}")
    existing = _load(out_file)
    by_url: dict[str, dict] = {it["url"]: it for it in existing}
    today = datetime.now(timezone.utc).date()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with make_client() as client:
        for src in sources:
            region = src["region"]
            try:
                raw = fetch(client, src["list_url"])
                if src["kind"] in ("atom", "rss"):
                    items = parse_feed(raw)
                else:
                    items = src["parse"](raw)
                    list_og = page_og_image(raw)     # 单页日期段落式源:条目缺图用页级 og 兜底
                    for it in items:
                        if "bodyEn" in it and not it.get("ogImage"):
                            it["ogImage"] = list_og
                fresh: list[dict] = []
                for it in items:
                    d = it.get("date")
                    if not (it.get("title") and it.get("url") and d):
                        continue                                    # 缺件宁可不收,不猜
                    if (today - datetime.strptime(d, "%Y-%m-%d").date()).days > MAX_AGE_DAYS:
                        continue
                    it["url"] = urljoin(src["list_url"], it["url"])
                    if it["url"] not in by_url:
                        fresh.append(it)
                detail_budget = MAX_DETAIL_PER_RUN
                added = 0
                for it in fresh:
                    if "bodyEn" not in it:                          # 列表式源:抓详情页补 og+正文
                        if detail_budget <= 0:
                            continue                                # 超预算的留给下一轮(12h)
                        detail_budget -= 1
                        try:
                            og, body = extract_detail(fetch(client, it["url"]),
                                                      src.get("body_selector"))
                            it["ogImage"], it["bodyEn"] = og, body
                        except Exception as e:  # noqa: BLE001
                            print(f"  ! {region} detail {it['url']}: {type(e).__name__}: {e}")
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
                print(f"✓ {region}: list {len(items)} · new {added}"
                      + (f" (deferred {len(fresh) - added})" if len(fresh) > added else ""))
            except Exception as e:  # noqa: BLE001
                print(f"✗ {region}: {type(e).__name__}: {e} —— 保留旧数据,下轮重试")

    merged = sorted(by_url.values(), key=lambda x: (x["date"], x["url"]), reverse=True)
    if len(merged) < len(existing):
        raise SystemExit(f"merged {len(merged)} < existing {len(existing)} —— 累积表只增不缩,拒绝写盘")
    if len(merged) < MIN_TOTAL:
        raise SystemExit(f"suspiciously few items ({len(merged)} < {MIN_TOTAL}) —— 不写盘")
    atomic_write_json(out_file, {"fetched": now_iso, "items": merged})
    per = {}
    for it in merged:
        per[it["region"]] = per.get(it["region"], 0) + 1
    print(f"wrote {len(merged)} items " + " ".join(f"{k}={v}" for k, v in sorted(per.items())))


def atomic_write_json(out_file: Path, payload: dict) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_file.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(out_file)
