"""
05b — fetch each Job Bank posting's **detail page raw HTML**, save one snapshot per
posting at raw/httpx/jobbank/<抓取日期>/details/<posting_id>.html. 源框架 v2:抓取只存
原始 HTML,解析(地址/官网/描述 → processed postings + .md)下沉到 clean/05b_parse_details.py。

增量:跳过①已富集(detail_fetched)②原始 HTML 已抓过(跨日期目录查)的帖 —— 只抓真正新的。
每帖抓一次,落在抓取那天的日期目录下。temp+rename 落盘,避免半截 HTML 占位致永不重抓。

Usage:  uv run python etl/05b_scrape_jobbank_details.py
Output: data/raw/httpx/jobbank/<date>/details/<posting_id>.html
"""
import json
import os
import re
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
_POSTING_RE = re.compile(r"/jobposting/(\d+)")


def pid_of(j: dict) -> str:
    """稳定 id = posting_id 字段,缺则从 url 的 /jobposting/<id> 取(与 08/09 join 键一致)。"""
    if j.get("posting_id"):
        return str(j["posting_id"])
    m = _POSTING_RE.search(j.get("url", ""))
    return m.group(1) if m else ""


def detail_html_index() -> dict:
    """所有日期目录下已抓的详情 HTML:posting_id → path。详情每帖抓一次,但落在「抓取那天」的
    raw/httpx/jobbank/<日期>/details/ 下,故要跨日期目录查「是否已抓过」(日期升序,最新覆盖)。"""
    idx: dict[str, Path] = {}
    root = _paths.RAW_HTTPX_JOBBANK
    if root.exists():
        for date_dir in sorted(p for p in root.iterdir() if p.is_dir()):
            for f in (date_dir / "details").glob("*.html"):
                idx[f.stem] = f
    return idx


def main() -> None:
    jobs = json.loads((_paths.PROCESSED_JOBBANK / "postings.json").read_text(encoding="utf-8"))
    raw_dir = _paths.RAW_HTTPX_JOBBANK / datetime.now().date().isoformat() / "details"  # 当天日期目录下
    raw_dir.mkdir(parents=True, exist_ok=True)
    have = detail_html_index()  # 已抓过的(任意日期)→ 不重抓

    def need(j: dict) -> bool:  # 要抓 = 有 url/id、未富集、且原始 HTML 还没抓过
        pid = pid_of(j)
        return bool(pid and j.get("url") and not j.get("detail_fetched") and pid not in have)

    todo = sum(1 for j in jobs if need(j))
    done = skipped = 0
    prov_done: Counter[str] = Counter()
    t0 = time.monotonic()
    TICK = 50  # 心跳频率(否则几十分钟零输出像死机)
    print(f"05b 抓详情 HTML:本轮待抓 {todo} 个(共 {len(jobs)} 帖,其余已抓/已富集跳过)", flush=True)
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=20) as c:
        for j in jobs:
            if not need(j):
                skipped += 1
                continue
            pid = pid_of(j)
            try:
                html = c.get(j["url"]).text
            except Exception:  # noqa: BLE001
                continue
            tmp = raw_dir / f".{pid}.html.tmp"            # temp+rename,避免半截文件占位
            tmp.write_text(html, encoding="utf-8")
            os.replace(tmp, raw_dir / f"{pid}.html")
            done += 1
            prov_done[j.get("province") or "?"] += 1
            if done % TICK == 0 or done == todo:           # 心跳:进度 + 当前省/雇主 + 各省累计
                rate = done / max(time.monotonic() - t0, 1e-6)
                print(f"  …{done}/{todo} ({done * 100 // max(todo, 1)}%) · 刚抓 {j.get('province') or '?'} · "
                      f"{(j.get('employer') or '')[:28]} · {rate:.1f}/s · 累计 {dict(prov_done)}", flush=True)
            time.sleep(0.25)
    print(f"Fetched {done} detail HTML (skipped {skipped}) · 省分布 {dict(prov_done)} -> {raw_dir}", flush=True)


if __name__ == "__main__":
    main()
