"""
clean/05_parse_jobbank — 解析 Job Bank 列表原始 HTML 快照 → 增量合并去重到
processed/jobbank/postings.json(累积 store)。源框架 v2:抓取(05)只存原始 HTML,
解析在这里下沉到 clean → processed。这是从旧 05 的「边抓边解析」拆出来的解析半。

读哪份:`raw/httpx/jobbank/listing/<最新日期>/` 目录(按目录名取 max,容器异步/跨午夜更稳),
按该目录 manifest.json 列出的页文件逐个解析(复用 05 的 parse_article)。
合并规则:与旧 05 一致 —— 只覆盖**原始抓取字段**(SCRAPED_KEYS),保留 04c/04d/05b 的衍生字段;
since-days 行过滤(早于 cutoff 的帖跳过,用 manifest 里的 cutoff 保证与抓取一致);
按 posting_id 去重;按日期降序写回(temp+os.replace 原子写,消除「读到半写」竞态)。

IN  : data/raw/httpx/jobbank/listing/<date>/*.html (+ manifest.json)
OUT : data/processed/jobbank/postings.json
Usage:  uv run python etl/clean/05_parse_jobbank.py [--since-days N]
"""
import argparse
import importlib
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths / 05 在那)
import _paths  # noqa: E402

_s05 = importlib.import_module("05_scrape_jobbank")  # 模块名以数字开头 → 只能 importlib
parse_article = _s05.parse_article                  # 单一解析逻辑,不重复实现
parse_date = _s05.parse_date

# 只覆盖原始抓取字段 + posting_id(键的可靠来源),保留下游(04c/04d/05b)算出的
# country/district/salaryAnnual/address… 衍生字段。
SCRAPED_KEYS = ("posting_id", "title", "employer", "city", "province", "salary", "date", "source", "direct", "url", "search_occupation")
_POSTING_RE = re.compile(r"/jobposting/(\d+)")


def pid_of(r: dict) -> str:
    """稳定去重键 = posting_id 字段,缺则从 url 的 /jobposting/<id> 取(与 08/09 的 jb:<id> join 键一致)。
    历史记录(旧 all-occupations 写入)无 posting_id 字段,只有 url —— 必须从 url 兜底,否则会漏认/丢数据。"""
    if r.get("posting_id"):
        return str(r["posting_id"])
    m = _POSTING_RE.search(r.get("url", ""))
    return m.group(1) if m else ""

IN_LISTING_ROOT = _paths.RAW_HTTPX_JOBBANK / "listing"        # 列表 HTML 快照根(按日期)
OUT_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"     # 累积 store


def latest_snapshot_dir() -> Path | None:
    if not IN_LISTING_ROOT.exists():
        return None
    days = sorted((d for d in IN_LISTING_ROOT.iterdir() if d.is_dir()), key=lambda d: d.name)
    return days[-1] if days else None


def load_postings() -> dict[str, dict]:
    if OUT_POSTINGS.exists():
        rows = json.loads(OUT_POSTINGS.read_text(encoding="utf-8"))
        return {pid: r for r in rows if (pid := pid_of(r))}  # 按 url 派生键,认全历史记录
    return {}


def write_postings(by_id: dict[str, dict]) -> None:
    """按日期降序写回(新帖在前);temp + os.replace 同目录原子 rename。"""
    OUT_POSTINGS.parent.mkdir(parents=True, exist_ok=True)
    rows = list(by_id.values())
    rows.sort(key=lambda r: (parse_date(r.get("date", "")) or datetime.min.date()), reverse=True)
    tmp = OUT_POSTINGS.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, OUT_POSTINGS)
    print(f"Wrote {len(rows)} postings → {OUT_POSTINGS}", flush=True)


def parse_snapshot(snap: Path) -> list[dict]:
    """按 manifest(缺则 glob)读该快照目录的页 HTML → parse_article 解析出所有行。"""
    manifest_f = snap / "manifest.json"
    if manifest_f.exists():
        files = [snap / p["file"] for p in json.loads(manifest_f.read_text(encoding="utf-8")).get("pages", [])]
    else:
        files = sorted(snap.glob("*.html"))
    rows: list[dict] = []
    for f in files:
        if not f.exists():
            continue
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")
        rows += [x for x in (parse_article(a) for a in soup.select("article")) if x and x["posting_id"]]
    return rows


def cutoff_of(snap: Path, since_days: int):
    """优先用 manifest 里抓取时算好的 cutoff(与抓取一致);缺则按今天-since_days。"""
    mf = snap / "manifest.json"
    if mf.exists():
        c = json.loads(mf.read_text(encoding="utf-8")).get("cutoff")
        if c:
            try:
                return datetime.strptime(c, "%Y-%m-%d").date()
            except ValueError:
                pass
    return datetime.now().date() - timedelta(days=since_days)


def main() -> None:
    ap = argparse.ArgumentParser(description="解析 Job Bank 列表 HTML 快照 → processed/jobbank/postings.json")
    ap.add_argument("--since-days", type=int, default=3, help="manifest 缺 cutoff 时的回退窗口")
    args = ap.parse_args()

    print(f"IN  listing : {IN_LISTING_ROOT}/<latest>/", flush=True)
    print(f"OUT postings: {OUT_POSTINGS}", flush=True)
    snap = latest_snapshot_dir()
    if snap is None:
        print("没有 listing 快照可解析(raw/httpx/jobbank/listing/ 为空)——跳过", flush=True)
        return
    cutoff = cutoff_of(snap, args.since_days)
    rows = parse_snapshot(snap)

    by_id = load_postings()
    base = len(by_id)
    added = updated = skipped_old = 0
    for row in rows:
        d = parse_date(row["date"])
        if d is not None and d < cutoff:   # 早于截止 → 跳过(与旧 05 行过滤一致)
            skipped_old += 1
            continue
        pid = pid_of(row)
        if not pid:
            continue
        scraped = {k: row.get(k, "") for k in SCRAPED_KEYS}
        if pid in by_id:
            by_id[pid].update(scraped)     # 保留衍生字段
            updated += 1
        else:
            by_id[pid] = scraped
            added += 1
    write_postings(by_id)
    print(f"解析 {snap.name}: {len(rows)} 行 → +{added} new · {updated} updated · "
          f"{skipped_old} 跳过(早于 {cutoff}) · base {base} → {len(by_id)}", flush=True)


if __name__ == "__main__":
    main()
