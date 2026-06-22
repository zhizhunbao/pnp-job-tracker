"""
Careers-page finder — Stage 2 of the employer-offer pipeline. Takes a region's
company directory (e.g. data/companies/kanata-north.json) and, for each company,
visits its OWN official website to locate the careers/jobs page and detect the
applicant-tracking system (ATS) behind it.

This is the reliable, first-party path the user wants: enumerate a region's
companies exhaustively, then go straight to each company's site — NOT a third-party
aggregator (Job Bank/Indeed), whose top "employers" are recruiting agencies and
which covers only ~5-10% of the real employer pool.

Method per company:
  1. GET the homepage, scan links for careers/jobs URLs and embedded ATS domains.
  2. If none found, probe common paths (/careers, /jobs, /join-us, ...).
  3. Record the careers URL + ATS type (greenhouse/lever/workday/... give clean
     JSON job feeds for Stage 3).

Usage:
  uv run python scripts/jobs/careers_finder.py                              # kanata-north.json, tech only
  uv run python scripts/jobs/careers_finder.py --in data/companies/X.json --all

Output (data/companies/):
  <stem>-careers.json / .csv / .md
"""
import argparse
import csv
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

import _paths
PROJECT_ROOT = _paths.ROOT
OUT_DIR = _paths.RAW_COMPANIES
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
TECH_TERMS = ("software", "technolog", "information technology", "saas", "cyber", "data",
              "artificial intelligence", "cloud", "semiconductor", "electronics",
              "engineering", "computer", "digital", "developer", "wireless", "fintech", "network")
# ATS platforms that power first-party careers pages (clean job feeds for Stage 3).
ATS = ["greenhouse.io", "lever.co", "bamboohr", "myworkdayjobs", "workday", "ashbyhq",
       "jobvite", "icims", "smartrecruiters", "recruitee", "workable", "breezy.hr",
       "teamtailor", "applytojob", "bullhorn", "rippling", "dayforcehcm"]
CAREERS_RE = re.compile(r"career|jobs?|join[-\s]?us|we[-'\s]*re[-\s]?hiring|work[-\s]?with[-\s]?us|"
                        r"opportunit|life[-\s]?at|positions", re.I)
COMMON_PATHS = ["/careers", "/careers/", "/career", "/jobs", "/jobs/", "/join-us",
                "/join", "/company/careers", "/about/careers", "/we-are-hiring"]


def detect_ats(html: str) -> str:
    low = html.lower()
    for a in ATS:
        if a in low:
            return a.split(".")[0]
    return ""


def find_careers(website: str) -> dict:
    out = {"careers_url": "", "ats": "", "status": "", "note": ""}
    try:
        with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=12) as c:
            r = c.get(website)
            out["status"] = r.status_code
            html = r.text
            out["ats"] = detect_ats(html)
            soup = BeautifulSoup(html, "html.parser")

            # 1) explicit careers link in homepage
            best = ""
            for a in soup.find_all("a", href=True):
                href, text = a["href"], a.get_text(" ", strip=True)
                if any(x in href.lower() for x in ATS):  # link straight to ATS board
                    best = href
                    break
                if CAREERS_RE.search(href) or CAREERS_RE.search(text or ""):
                    cand = urljoin(website, href)
                    # prefer a careers/jobs path over generic 'opportunities' text matches
                    if re.search(r"career|jobs?", href, re.I):
                        best = cand
                        break
                    best = best or cand
            if best:
                out["careers_url"] = best
                if not out["ats"]:
                    out["ats"] = detect_ats(_safe_get(c, best))
                return out

            # 2) probe common careers paths
            root = f"{urlparse(str(r.url)).scheme}://{urlparse(str(r.url)).netloc}"
            for p in COMMON_PATHS:
                u = root + p
                hh = _safe_get(c, u, want_status=True)
                if hh:
                    out["careers_url"] = u
                    out["ats"] = detect_ats(hh) or out["ats"]
                    return out
            out["note"] = "no careers page found"
    except Exception as e:  # noqa: BLE001
        out["status"] = f"ERR {type(e).__name__}"
    return out


def _safe_get(client: httpx.Client, url: str, want_status: bool = False) -> str:
    try:
        r = client.get(url)
        if want_status and r.status_code >= 400:
            return ""
        return r.text
    except Exception:  # noqa: BLE001
        return ""


def is_tech(c: dict) -> bool:
    blob = (c.get("sectors", "") + " " + c.get("description", "")).lower()
    return any(t in blob for t in TECH_TERMS)


def main() -> None:
    ap = argparse.ArgumentParser(description="Find each company's careers page + ATS.")
    ap.add_argument("--in", dest="infile", default=str(OUT_DIR / "kanata-north.json"))
    ap.add_argument("--all", action="store_true", help="Process all companies, not just tech.")
    ap.add_argument("--workers", type=int, default=10)
    args = ap.parse_args()

    companies = json.load(open(args.infile, encoding="utf-8"))
    targets = [c for c in companies if c.get("website") and (args.all or is_tech(c))]
    print(f"Resolving careers pages for {len(targets)} companies ({args.workers} workers)...")

    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(find_careers, c["website"]): c for c in targets}
        for fut in as_completed(futs):
            c = futs[fut]
            r = fut.result()
            results.append({"name": c["name"], "website": c["website"],
                            "sectors": c.get("sectors", ""), "email": c.get("email", ""), **r})
    results.sort(key=lambda r: (r["ats"] == "", not r["careers_url"], r["name"].lower()))

    stem = Path(args.infile).with_name(Path(args.infile).stem + "-careers")
    Path(stem).with_suffix(".json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = ["name", "careers_url", "ats", "website", "email", "sectors", "status", "note"]
    with open(Path(stem).with_suffix(".csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows({k: r.get(k, "") for k in fields} for r in results)

    with_careers = [r for r in results if r["careers_url"]]
    with_ats = [r for r in results if r["ats"]]
    L = [f"# {Path(args.infile).stem} · 公司招聘页定位（Stage 2）\n",
         f"> {len(results)} 家公司 → 找到 careers 页 **{len(with_careers)}** 家，其中 **{len(with_ats)}** 家用标准 ATS（可直取职位 JSON）。",
         "> 全程访问公司**官网第一方**，非聚合站。下一步 Stage 3：从这些页/ATS 抓真实在招。\n",
         "| 公司 | careers 页 | ATS | 邮箱 |", "|---|---|---|---|"]
    for r in with_careers:
        cu = r["careers_url"]
        L.append(f"| {r['name']} | [开](<{cu}>) | {r['ats'] or '自建'} | {r['email']} |")
    no = [r for r in results if not r["careers_url"]]
    L.append(f"\n_未找到公开 careers 页的 {len(no)} 家（可能无招聘页/需深抓）：_ "
             + "、".join(r["name"] for r in no[:40]))
    Path(stem).with_suffix(".md").write_text("\n".join(L), encoding="utf-8")
    print(f"Done — {len(with_careers)}/{len(results)} careers pages, {len(with_ats)} via ATS.\n  {stem}.md")
    from collections import Counter
    print("ATS 分布:", dict(Counter(r["ats"] for r in with_ats)))


if __name__ == "__main__":
    main()
