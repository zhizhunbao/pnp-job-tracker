"""
Job Bank scraper — mine real tech job postings (employer + salary + location)
from Canada's official Job Bank (jobbank.gc.ca), for the employer-job-offer PNP
route. This is the only scrapable source of actual openings for provinces that
publish no designated-employer list (Ontario, Saskatchewan, Alberta, BC...).

Why this exists: the OINP/SINP/AAIP employer-job-offer streams need a real job
offer, but none of those provinces publish an employer list. Job Bank does list
live postings, filterable by occupation + province, so it's where you actually
find candidate sponsoring employers.

How it works:
  - Searches jobbank.gc.ca by occupation keyword, server-side filtered by province
    via the (verified) `fprov=<PROV>` parameter, paginated with `page=N`.
  - Parses each result via stable CSS selectors (li.business / li.location /
    li.salary / span.job-source / a[href*=jobposting]).
  - Optional client-side city filter (e.g. Ottawa area), de-dupes by posting id,
    and flags "direct" postings (posted on Job Bank by the employer) vs aggregator
    re-posts (Indeed/ZipRecruiter) — direct ones are the more actionable leads.

Usage:
  uv run python scripts/jobs/jobbank_scraper.py                       # default: 3 core NOCs, Ontario, Ottawa area
  uv run python scripts/jobs/jobbank_scraper.py --prov ON --ottawa
  uv run python scripts/jobs/jobbank_scraper.py --prov SK --max-pages 10
  uv run python scripts/jobs/jobbank_scraper.py --prov ON --all-cities --direct-only

Output (data/jobs/):
  jobbank-<prov>.json   — structured rows
  jobbank-<prov>.csv    — spreadsheet
  jobbank-<prov>.md     — leads grouped by employer (most postings first)
"""
import argparse
import csv
import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

import _paths
PROJECT_ROOT = _paths.ROOT
OUT_DIR = _paths.RAW_JOBBANK
BASE = "https://www.jobbank.gc.ca/jobsearch/jobsearch"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Default occupations to mine — broad tech/IT job-title variants → NOC label.
# Job Bank caps each keyword search at ~100 and exhausts in a few pages, so coverage
# comes from MANY keyword variants (their union), not deep pagination.
DEFAULT_OCCUPATIONS = {
    "software developer": "21232", "software engineer": "21231", "senior software": "21231",
    "full stack developer": "21232", "backend developer": "21232", "frontend developer": "21234",
    "web developer": "21234", "mobile developer": "21232", "programmer": "21230",
    "data scientist": "21211", "data engineer": "21211", "data analyst": "21223",
    "machine learning": "21211", "devops": "21232", "cloud engineer": "21232",
    "cloud architect": "21231", "database administrator": "21223", "systems analyst": "21222",
    "business systems": "21221", "information systems": "21222", "IT manager": "20012",
    "network engineer": "22220", "IT support": "22221", "QA analyst": "22222",
    "cybersecurity": "21220", "computer engineer": "21311",
}

# 全加拿大省份(领地暂跳过)。QC 也抓——站点是全职业职位板,PNP 只是其中一种状态标记。
ALL_PROVINCES = ["ON", "QC", "SK", "AB", "BC", "MB", "NB", "NS", "NL", "PE"]

PROV_FULL = {
    "ON": "ontario", "QC": "quebec", "BC": "british-columbia", "AB": "alberta",
    "SK": "saskatchewan", "MB": "manitoba", "NB": "new-brunswick", "NS": "nova-scotia",
    "NL": "newfoundland-and-labrador", "PE": "prince-edward-island",
}

# Ottawa census-area municipalities (all Ontario side; Gatineau is QC, excluded).
OTTAWA_CITIES = ["ottawa", "kanata", "nepean", "gloucester", "orléans", "orleans",
                 "stittsville", "barrhaven", "manotick"]

POSTING_RE = re.compile(r"/jobsearch/jobposting/(\d+)")


def clean(text: str, strip_label: str = "") -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    if strip_label and text.lower().startswith(strip_label.lower()):
        text = text[len(strip_label):].strip()
    return text


def parse_article(art) -> dict | None:
    link = art.find("a", href=POSTING_RE)
    if not link:
        return None
    pid_m = POSTING_RE.search(link["href"])
    title_el = art.select_one("span.noctitle") or art.select_one("h3.title")
    src_el = art.select_one("span.job-source")
    loc = clean(art.select_one("li.location").get_text() if art.select_one("li.location") else "", "Location")
    city_m = re.match(r"(.*?)\s*\(([A-Z]{2})\)", loc)
    source = clean(src_el.get_text()) if src_el else ""
    return {
        "posting_id": pid_m.group(1) if pid_m else "",
        "title": clean(title_el.get_text()) if title_el else "",
        "employer": clean(art.select_one("li.business").get_text() if art.select_one("li.business") else ""),
        "city": city_m.group(1).strip() if city_m else loc,
        "province": city_m.group(2) if city_m else "",
        "salary": clean(art.select_one("li.salary").get_text() if art.select_one("li.salary") else "", "Salary"),
        "date": clean(art.select_one("li.date").get_text() if art.select_one("li.date") else ""),
        "source": source,
        "direct": "job bank" in source.lower(),  # posted directly on Job Bank by the employer
        "url": "https://www.jobbank.gc.ca" + link["href"].split(";")[0],
    }


def fetch_page(client: httpx.Client, keyword: str, prov: str, page: int) -> list[dict]:
    url = f"{BASE}?searchstring={quote_plus(keyword)}&fprov={prov}&sort=D&page={page}"
    r = client.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    rows = [parse_article(a) for a in soup.select("article")]
    return [x for x in rows if x and x["posting_id"]]


def scrape(occupations: dict, prov: str, max_pages: int, delay: float) -> list[dict]:
    seen: set[str] = set()
    results: list[dict] = []
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        for keyword, noc in occupations.items():
            kept_before = len(results)
            for page in range(1, max_pages + 1):
                try:
                    rows = fetch_page(client, keyword, prov, page)
                except Exception as e:  # noqa: BLE001 — log and move on
                    print(f"  ! {keyword} p{page}: {type(e).__name__} {e}")
                    break
                if not rows:
                    break
                fresh = 0
                for row in rows:
                    if row["posting_id"] in seen:
                        continue
                    seen.add(row["posting_id"])
                    row["search_occupation"] = f"{keyword} (NOC {noc})"
                    results.append(row)
                    fresh += 1
                if fresh == 0:  # whole page already seen → end of new content
                    break
                time.sleep(delay)
            print(f"  · {keyword} (NOC {noc}): +{len(results) - kept_before} postings")
    return results


# ── 全职业 · 按省 · sort=D · 增量(最新几天)──────────────────────────
# 源框架 v2:抓取只存**原始 HTML 快照**(raw/jobbank/<日期>/<省>-pNN.html),
# 不解析、不合并。解析→去重合并到 processed/jobbank/postings.json 在 clean/05_parse_jobbank.py。
# 这里只用页内日期决定翻几页(纯翻页控制,不产出数据)。parse_article 供 parse 脚本 import。
def parse_date(s: str):
    """'June 22, 2026' → date;解析不了返回 None(当作新帖,保留)。"""
    s = (s or "").strip()
    for fmt in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def fetch_all_occupations_snapshots(provinces: list[str], since_days: int, max_pages: int, delay: float) -> dict:
    """各省全职业、按日期降序翻页:每页**原始 HTML** 整存进当天 listing 快照目录 + manifest。
    用页内日期判断翻到何处停(page_all_old,纯翻页控制);不解析合并(那在 clean/05_parse_jobbank.py)。"""
    cutoff = datetime.now().date() - timedelta(days=since_days)
    snap_dir = _paths.RAW_JOBBANK / datetime.now().date().isoformat()  # 日期直接挂源下,与 details/ 平级
    snap_dir.mkdir(parents=True, exist_ok=True)
    manifest = {"fetched_at": datetime.now().isoformat(timespec="seconds"),
                "since_days": since_days, "cutoff": cutoff.isoformat(), "pages": []}
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        for prov in provinces:
            saved = 0
            for page in range(1, max_pages + 1):
                url = f"{BASE}?fprov={prov}&sort=D&page={page}"
                # #118b:抓取失败重试 3 次再放弃(静默断页=另一种漏帖);彻底失败大声告警
                r = None
                for attempt in range(3):
                    try:
                        r = client.get(url, timeout=30)
                        r.raise_for_status()
                        break
                    except Exception as e:  # noqa: BLE001
                        err = f"{type(e).__name__} {e}"
                        r = None
                        time.sleep(2 * (attempt + 1))
                if r is None:
                    print(f"  ⚠ {prov} p{page}: 连续 3 次失败({err})——本省本轮提前止,可能缺帖!", flush=True)
                    break
                soup = BeautifulSoup(r.text, "html.parser")
                rows = [x for x in (parse_article(a) for a in soup.select("article")) if x and x["posting_id"]]
                if not rows:  # 空页 → 该省到头
                    break
                (snap_dir / f"{PROV_FULL.get(prov, prov.lower())}-p{page:02d}.html").write_text(r.text, encoding="utf-8")  # 整页原始 HTML
                manifest["pages"].append({"prov": prov, "page": page, "file": f"{PROV_FULL.get(prov, prov.lower())}-p{page:02d}.html", "rows": len(rows)})
                saved += 1
                # 整页都早于截止 → 该省到头(降序);date 解析不了当作新,保留继续翻
                if all(parse_date(x["date"]) is not None and parse_date(x["date"]) < cutoff for x in rows):
                    break
                time.sleep(delay)
            else:
                # #118b(Frank:「固定页数不行,万一比这个多还是漏」):翻页由截止日自然停,
                # max_pages 只是失控保险——真翻满还没跨天=可能截断,必须大声告警而非静默
                print(f"  ⚠ {prov}: 翻满 {max_pages} 页仍未跨过截止日 {cutoff}——可能截断!上调 --max-pages", flush=True)
            print(f"  · {prov}: 存 {saved} 页快照 (since {cutoff})", flush=True)
    (snap_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListing 快照 → {snap_dir} ({len(manifest['pages'])} 页)", flush=True)
    return manifest


def write_outputs(rows: list[dict], prov: str, scope: str) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # OUT_DIR 已是地域专属(raw/<region>/jobbank),文件名不再带省码 → postings.json
    stem = OUT_DIR / "postings"
    (stem.with_suffix(".json")).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = ["employer", "title", "city", "province", "salary", "date", "source", "direct",
              "search_occupation", "url", "posting_id"]
    with open(stem.with_suffix(".csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})

    # Markdown: group by employer (most postings first = strongest leads).
    by_emp: dict[str, list[dict]] = {}
    for r in rows:
        by_emp.setdefault(r["employer"], []).append(r)
    ranked = sorted(by_emp.items(), key=lambda kv: len(kv[1]), reverse=True)
    direct_n = sum(1 for r in rows if r["direct"])

    L = [f"# Job Bank 科技岗线索 — {prov}（{scope}）\n",
         f"> 共 {len(rows)} 个职位 / {len(by_emp)} 家雇主；其中 **{direct_n}** 个为雇主直接在 Job Bank 发布（最值得直接联系）。",
         "> 来源 jobbank.gc.ca，按 NOC 关键词 + 省份(fprov)抓取。直接 offer 路线的真实雇主线索。\n",
         "## 雇主线索（按在招职位数排序）\n",
         "| 雇主 | 在招科技岗 | 地点 | 薪资样例 | 直接发布 |", "|---|---:|---|---|:---:|"]
    for emp, js in ranked:
        cities = sorted({j["city"] for j in js if j["city"]})
        sal = next((j["salary"] for j in js if j["salary"]), "")
        L.append(f"| {emp} | {len(js)} | {', '.join(cities)[:40]} | {sal} | "
                 f"{'✅' if any(j['direct'] for j in js) else ''} |")
    L.append("\n## 全部职位\n")
    L.append("| 雇主 | 职位 | 地点 | 薪资 | 日期 | 来源 | 链接 |")
    L.append("|---|---|---|---|---|---|---|")
    for r in sorted(rows, key=lambda r: r["employer"]):
        L.append(f"| {r['employer']} | {r['title']} | {r['city']} ({r['province']}) | {r['salary']} | "
                 f"{r['date']} | {r['source']} | [开](<{r['url']}>) |")
    L.append("\n*由 `scripts/jobs/jobbank_scraper.py` 生成；重跑即刷新。*")
    stem.with_suffix(".md").write_text("\n".join(L), encoding="utf-8")
    return {"jobs": len(rows), "employers": len(by_emp), "direct": direct_n, "stem": str(stem)}


PROV_NAME = {
    "ON": "安大略（ON）", "QC": "魁北克（QC）", "SK": "萨斯喀彻温（SK）", "AB": "阿尔伯塔（AB）",
    "BC": "不列颠哥伦比亚（BC）", "MB": "曼尼托巴（MB）", "NB": "新不伦瑞克（NB）",
    "NS": "新斯科舍（NS）", "NL": "纽芬兰与拉布拉多（NL）", "PE": "爱德华王子岛（PE）",
}


def build_comparison(per_prov: dict) -> None:
    """Write a cross-province comparison from {prov: rows}."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = []
    for prov, rows in per_prov.items():
        emps = {}
        for r in rows:
            emps.setdefault(r["employer"], 0)
            emps[r["employer"]] += 1
        top = sorted(emps.items(), key=lambda kv: kv[1], reverse=True)[:3]
        summary.append({
            "prov": prov, "name": PROV_NAME.get(prov, prov),
            "jobs": len(rows), "employers": len(emps),
            "direct": sum(1 for r in rows if r["direct"]),
            "top_employers": top,
        })
    summary.sort(key=lambda s: s["jobs"], reverse=True)

    (OUT_DIR / "jobbank-comparison.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    L = ["# Job Bank 跨省科技岗对比（雇主 offer 路线）\n",
         "> 同一套科技 NOC 关键词、各省 `fprov` 全省抓取。**雇主 offer 省提名路线下，这反映各省真实能找到科技 offer 的难易。**\n",
         "| 省 | 科技在招职位 | 雇主数 | 直接发布 | 在招最多的雇主 |",
         "|---|---:|---:|---:|---|"]
    for s in summary:
        tops = "；".join(f"{e}({n})" for e, n in s["top_employers"]) or "—"
        L.append(f"| {s['name']} | {s['jobs']} | {s['employers']} | {s['direct']} | {tops} |")
    L.append("\n> “直接发布”= 雇主直接在 Job Bank 挂岗（最值得直接联系）。各省明细见 `jobbank-<省>.md`。")
    L.append("\n*由 `scripts/jobs/jobbank_scraper.py --prov ALL` 生成。*")
    (OUT_DIR / "jobbank-comparison.md").write_text("\n".join(L), encoding="utf-8")
    print(f"\n跨省对比 → {OUT_DIR / 'jobbank-comparison.md'}")
    for s in summary:
        print(f"  {s['prov']:<3} jobs={s['jobs']:<4} employers={s['employers']:<4} direct={s['direct']}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape jobbank.gc.ca tech postings for the employer-offer PNP route.")
    ap.add_argument("--prov", default="ON", help="Province code (ON, SK, AB, ...) or ALL for a full sweep + comparison.")
    ap.add_argument("--ottawa", action="store_true", help="Keep only Ottawa-area cities (default for ON).")
    ap.add_argument("--all-cities", action="store_true", help="Keep the whole province (no city filter).")
    ap.add_argument("--direct-only", action="store_true", help="Keep only employer-direct Job Bank postings.")
    ap.add_argument("--max-pages", type=int, default=15, help="Max result pages per occupation (25 jobs/page).")
    ap.add_argument("--delay", type=float, default=0.4, help="Delay between page requests (seconds).")
    ap.add_argument("--occupations", nargs="*", help="Override: 'keyword=NOC' pairs, e.g. 'web developer=21234'.")
    ap.add_argument("--all-occupations", action="store_true",
                    help="全职业·按省·sort=D·增量:无关键词,抓最新 N 天的新帖合并进全国 postings.json。")
    ap.add_argument("--since-days", type=int, default=3, help="--all-occupations 模式:只抓最近 N 天的帖(默认 3)。")
    args = ap.parse_args()

    # 全职业增量模式(新):各省最新几天 → 合并进全国单文件,按 posting_id 去重。
    if args.all_occupations:
        provinces = ALL_PROVINCES if args.prov.upper() == "ALL" else [p.strip().upper() for p in args.prov.split(",")]
        print(f"All-occupations listing snapshot: provinces={provinces}, since_days={args.since_days}")
        fetch_all_occupations_snapshots(provinces, args.since_days, args.max_pages, args.delay)
        return

    occupations = DEFAULT_OCCUPATIONS
    if args.occupations:
        occupations = {}
        for spec in args.occupations:
            kw, _, noc = spec.partition("=")
            occupations[kw.strip()] = noc.strip() or "?"

    # Universal sweep: scrape every destination province, write per-province files + comparison.
    if args.prov.upper() == "ALL":
        per_prov = {}
        for prov in ALL_PROVINCES:
            print(f"\n=== {prov} ===")
            rows = scrape(occupations, prov, args.max_pages, args.delay)
            if args.direct_only:
                rows = [r for r in rows if r["direct"]]
            write_outputs(rows, prov, "全省" + (" · 仅直接发布" if args.direct_only else ""))
            per_prov[prov] = rows
        build_comparison(per_prov)
        return

    print(f"Scraping Job Bank: prov={args.prov}, occupations={list(occupations)}")
    rows = scrape(occupations, args.prov.upper(), args.max_pages, args.delay)

    # City filter (Ottawa default for ON unless --all-cities).
    scope = "全省"
    use_ottawa = args.ottawa or (args.prov.upper() == "ON" and not args.all_cities)
    if use_ottawa:
        rows = [r for r in rows if any(c in r["city"].lower() for c in OTTAWA_CITIES)]
        scope = "渥太华地区"
    if args.direct_only:
        rows = [r for r in rows if r["direct"]]
        scope += " · 仅直接发布"

    summary = write_outputs(rows, args.prov.upper(), scope)
    print(f"\nDone — {summary['jobs']} jobs / {summary['employers']} employers / "
          f"{summary['direct']} direct.\n  {summary['stem']}.md / .csv / .json")


if __name__ == "__main__":
    main()
