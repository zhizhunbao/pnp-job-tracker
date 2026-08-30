"""news.functions — news 母框架(增量合并 → 防线 → 原子写盘;#55 §2.5 模板方法)。

2026-08-30 从 fetch 迁回(Frank 定界:fetch 只做通用抓取与 API 直取,SOURCE 契约、
行构造、节奏参数都是 news 的行词汇,归 news 域);通用件(客户端/feed 解析/正文抽取)
仍从 fetch.functions 取。原 atomic_write_json 与 _paths.write_json 行为重复,退役 ——
落盘改走 _paths.write_json(带 OSError 五次退避,吃到批A 的写盘抗抖)。

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

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import cast
from urllib.parse import urljoin

import _paths
from _log import err, say
from fetch.functions import extract_detail, fetch, make_client, page_og_image, parse_feed
from fetch.scheme import DetailIn, FetchIn, HttpClientLike
from news.scheme import RunIn
from news.constants import (ANCHOR_SEP, COUNT_PAIR_TPL, DATE_ISO_FMT, DETAIL_SLEEP_S, ENC_UTF8,
                            ENV_ON, ENV_REBODY, FEED_KINDS, GUARD_FEW_TPL, GUARD_SHRINK_TPL,
                            K_BODY_EN, K_BODY_SELECTOR, K_BODY_ZH, K_CITATION, K_DATE, K_FETCHED,
                            K_FETCHED_AT, K_ITEMS, K_KIND, K_LIST_URL, K_OG_IMAGE, K_PARSE,
                            K_POST_DATA, K_REGION, K_SUMMARY_ZH, K_TITLE, K_URL, MAX_AGE_DAYS,
                            MAX_DETAIL_PER_RUN, MIN_TOTAL, PAIR_SEP, PRINT_DEFERRED_TPL,
                            PRINT_OUT_TPL, PRINT_REBODY_TPL, PRINT_REGION_TPL, PRINT_WROTE_TPL,
                            TIMEOUT_S, TS_UTC_FMT, WHERE_DETAIL_TPL, WHERE_KEEP_TPL,
                            WHERE_REBODY_TPL)


def _load(out_file: Path) -> list[dict]:
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
    existing = _load(x.out_file)
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
    _paths.write_json(x.out_file, {K_FETCHED: now_iso, K_ITEMS: merged}, indent=1)
    per = {}
    for it in merged:
        per[it[K_REGION]] = per.get(it[K_REGION], 0) + 1
    per_parts = []
    for k, v in sorted(per.items()):
        per_parts.append(COUNT_PAIR_TPL.format(key=k, n=v))
    say(PRINT_WROTE_TPL.format(n=len(merged), parts=PAIR_SEP.join(per_parts)))
