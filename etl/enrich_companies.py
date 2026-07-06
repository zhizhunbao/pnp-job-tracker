"""
enrich_companies — 抓公司官网首页,提取「简介 + 行业」落库(E8-04 / D1=B,2026-07-06)。

背景:Job Bank 公司只带官网 URL(~24%),无简介/行业 → 弹窗事实段几乎空(0.1%)。
本脚本按官网 URL 抓首页,从 og:description / meta description 提简介、meta keywords 提行业,
落 data/processed/company_enrich.json(slug → {description, sectors, website, fetched, status}),
09_build_mart 合并进 companies 行。**增量**:已缓存(成功或近期失败)跳过;**每轮限量**(--limit),
逐轮累积覆盖;**失败容错**:抓不到只记 status,不炸整轮。抓取留本地(容器内 httpx),非 gov 站无 403 顾虑。

Usage:  python etl/enrich_companies.py [--limit N] [--refresh-days D]
"""
import argparse
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

IN_POSTINGS = _paths.PROCESSED_JOBBANK / "postings.json"      # 公司官网来源(employer + website)
IN_ATS = _paths.PROCESSED_ATS                                # ATS 公司已自带 profile,跳过
OUT_CACHE = _paths.PROCESSED / "company_enrich.json"         # 增量缓存(slug → 富化结果)

UA = "Mozilla/5.0 (compatible; PNPJobTracker/1.0; +https://offer2pr.com)"
RETRY_FAILED_DAYS = 30      # 失败的公司多久后才重试(避免每轮死磕抓不动的站)
MAX_DESC = 600             # 简介截断(事实段展示够用,过长是整页倒灌)


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "company"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def days_since(iso: str) -> float:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except Exception:  # noqa: BLE001
        return 1e9


def clean_text(s: str) -> str:
    s = html.unescape(s or "")           # &#x27; → ' 、&amp; → & 等实体解码
    s = re.sub(r"\s+", " ", s).strip()
    return s[:MAX_DESC].strip()


def extract(html: str) -> dict:
    """从首页 HTML 提简介/行业(纯正则,不依赖 bs4;拿不到就空)。"""
    def meta(patterns: list[str]) -> str:
        for pat in patterns:
            m = re.search(pat, html, re.I | re.S)
            if m and m.group(1).strip():
                return m.group(1).strip()
        return ""
    desc = meta([
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
    ])
    if not desc:  # 兜底:首个够长的 <p>
        for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.I | re.S):
            txt = re.sub(r"<[^>]+>", "", m.group(1)).strip()
            if len(txt) >= 80:
                desc = txt
                break
    kw = meta([r'<meta[^>]+name=["\']keywords["\'][^>]+content=["\']([^"\']+)["\']'])
    sectors = ", ".join([k.strip() for k in kw.split(",")[:4] if k.strip()]) if kw else ""
    return {"description": clean_text(desc), "sectors": clean_text(sectors)}


def company_targets() -> dict[str, dict]:
    """slug → {name, website} —— 有官网、非 ATS(ATS 自带 profile)的 Job Bank 公司。"""
    targets: dict[str, dict] = {}
    if not IN_POSTINGS.exists():
        return targets
    ats_slugs = {p.name for p in IN_ATS.iterdir()} if IN_ATS.exists() else set()
    for j in json.loads(IN_POSTINGS.read_text(encoding="utf-8")):
        site = (j.get("website") or "").strip()
        emp = j.get("employer") or ""
        if not site or not emp:
            continue
        if not site.startswith(("http://", "https://")):
            site = "https://" + site
        sl = slugify(emp)
        if sl in ats_slugs or sl in targets:
            continue
        targets[sl] = {"name": emp, "website": site}
    return targets


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=300, help="本轮最多抓多少家(逐轮累积)")
    ap.add_argument("--refresh-days", type=int, default=180, help="成功记录多久后刷新")
    args = ap.parse_args()

    cache: dict[str, dict] = {}
    if OUT_CACHE.exists():
        cache = json.loads(OUT_CACHE.read_text(encoding="utf-8"))

    targets = company_targets()
    # 待抓 = 有官网、缓存缺失 / 成功过期 / 失败超冷却
    todo = []
    for sl, info in targets.items():
        c = cache.get(sl)
        if c is None:
            todo.append((sl, info))
        elif c.get("status") == "ok" and days_since(c.get("fetched", "")) > args.refresh_days:
            todo.append((sl, info))
        elif c.get("status") == "fail" and days_since(c.get("fetched", "")) > RETRY_FAILED_DAYS:
            todo.append((sl, info))
    todo = todo[: args.limit]

    print(f"IN postings : {IN_POSTINGS}")
    print(f"目标公司(有官网,非 ATS): {len(targets)} · 缓存: {len(cache)} · 本轮抓: {len(todo)}(limit {args.limit})")

    ok = fail = 0
    with httpx.Client(follow_redirects=True, timeout=8,
                      headers={"User-Agent": UA}, verify=False) as client:
        for sl, info in todo:
            rec = {"name": info["name"], "website": info["website"], "fetched": now_iso()}
            try:
                r = client.get(info["website"])
                if r.is_success and r.text:
                    data = extract(r.text)
                    if data["description"] or data["sectors"]:
                        rec.update(data)
                        rec["status"] = "ok"
                        ok += 1
                    else:
                        rec["status"] = "fail"; rec["note"] = "no meta"
                        fail += 1
                else:
                    rec["status"] = "fail"; rec["note"] = f"http {r.status_code}"
                    fail += 1
            except Exception as e:  # noqa: BLE001
                rec["status"] = "fail"; rec["note"] = type(e).__name__
                fail += 1
            cache[sl] = rec
            time.sleep(0.2)  # 礼貌:轻微限速

    OUT_CACHE.parent.mkdir(parents=True, exist_ok=True)
    OUT_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    total_ok = sum(1 for c in cache.values() if c.get("status") == "ok")
    print(f"本轮 ✓ {ok} 抓到 · ✗ {fail} 无内容/失败 · 累计成功 {total_ok}/{len(cache)} 家 → {OUT_CACHE.name}")


if __name__ == "__main__":
    main()
