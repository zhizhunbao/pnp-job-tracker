"""crawl 缓存的**读取入口** —— 定向抽取脚本从这里拿官方页原文,不必自己发请求。

为什么有这个模块(2026-08-03 Frank 拍板的延伸):crawl 役每小时把九省官网整站爬一遍,
页面原文已经躺在 `data/crawl/<slug>/html_cache/`。定向脚本再 httpx 一次,等于同一页抓两遍,
而且各脚本自己猜 URL(那正是 MB「官方不发运营统计」这条假结论的病根:2026-08-03 那轮
mb-mpnp 的种子只圈了 `/mpnp/`,没覆盖 `/resources/data/`,就把「这一轮没爬到」写成了
「官方不公布」)。**先查 manifest,再谈抓不到。**

用法(照 build_mb_stats.py):
    from cache import get
    html, fetched = get("https://immigratemanitoba.com/resources/data/monthly-data-2026")

约定:
  · 同一 URL 被多个种子爬到(mb-mpnp 与 mb-root 都有 /mpnp/…)→ 取 **crawled_at 最新**的那份;
  · 只认 status 200 的缓存;找不到返回 (None, "") —— 由调用方决定是报错还是回退 httpx
    (本项目惯例:自校未过就保留旧表不覆盖,别拿半份数据把好数据盖了);
  · `fetched` 返回该轮 crawl 的日期(ISO),抽取脚本原样写进 raw 表 —— 出处日期必须是
    页面**真正被取回**的那天,不是脚本跑的今天。
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402


def _variants(url: str) -> set:
    u = (url or "").strip()
    return {u, u.rstrip("/"), u.rstrip("/") + "/"}


def get(url: str) -> tuple:
    """crawl 缓存里这一页的 (html, fetched_date);没爬到 → (None, "")。"""
    want = _variants(url)
    best = None            # (crawled_at, html_path)
    for man in sorted(_paths.CRAWL.glob("*/manifest.json")):
        try:
            d = json.loads(man.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 — 单个 manifest 坏了不拖垮其余种子
            continue
        at = str(d.get("crawled_at") or "")
        for p in d.get("pages", []):
            if p.get("status") != 200 or not p.get("html") or p.get("url") not in want:
                continue
            f = man.parent / "html_cache" / p["html"]
            if f.exists() and (best is None or at > best[0]):
                best = (at, f)
    if best is None:
        return None, ""
    return best[1].read_text(encoding="utf-8", errors="replace"), best[0][:10]
