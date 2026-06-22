"""
Kanata North directory scraper — harvest all member companies of Canada's largest
tech park (Kanata North Business Association, ~520 companies) for the employer-job-
offer PNP route. This is the Ottawa employer universe to approach directly — far
bigger than the handful currently posting on Job Bank.

How it works (reverse-engineered, no browser needed): the directory page renders
client-side, but the data is served by the theme's WordPress AJAX action
`elevatex_load_more_companies` via /wp-admin/admin-ajax.php. Passing a large
`posts_per_page` returns every company as rendered HTML cards in a JSON envelope;
we parse name / address / website / phone / email / sectors / description from each
`article.company`.

Output is the Stage-1 seed list (region → company → official site) for the pipeline:
  ① this directory  → ② each company's careers/ATS page  → ③ scrape its postings.

Usage:
  uv run python scripts/jobs/kanata_north_directory.py
  uv run python scripts/jobs/kanata_north_directory.py --tech-only

Output (data/companies/):
  kanata-north.json / .csv / .md
"""
import argparse
import csv
import json
import re
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

import _paths
PROJECT_ROOT = _paths.ROOT
OUT_DIR = _paths.RAW_COMPANIES
AJAX = "https://www.kanatanorthba.com/wp-admin/admin-ajax.php"
REFERER = "https://www.kanatanorthba.com/member-directory/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
# Sector keywords that mark a company as tech/IT-relevant for the user's NOCs.
TECH_TERMS = ("software", "technolog", "information technology", " it ", "telecom", "saas",
              "cyber", "data", "artificial intelligence", " ai", "cloud", "semiconductor",
              "electronics", "engineering", "computer", "digital", "developer", "wireless",
              "fintech", "network")


def fetch_companies() -> list[dict]:
    with httpx.Client(headers={"User-Agent": USER_AGENT, "Referer": REFERER},
                      follow_redirects=True, timeout=60) as c:
        r = c.get(AJAX, params={"action": "elevatex_load_more_companies",
                                "paged": "1", "posts_per_page": "1000"})
        r.raise_for_status()
        payload = r.json()
    posts = payload["data"]["posts"]
    html = "".join(posts) if isinstance(posts, list) else posts
    soup = BeautifulSoup(html, "html.parser")

    rows = []
    for art in soup.select("article.company"):
        def col(label: str) -> str:
            # each detail lives in a div.col whose text is "Label: value"
            for d in art.select("div.col"):
                txt = re.sub(r"\s+", " ", d.get_text(" ", strip=True))
                if txt.lower().startswith(label.lower()):
                    return txt[len(label):].strip(" :")
            return ""
        name = art.select_one("h2.company__heading")
        desc = art.select_one("p.company__description")
        terms = art.select_one("div.company__terms")
        rows.append({
            "name": name.get_text(strip=True) if name else "",
            "website": col("Website"),
            "email": col("Email"),
            "phone": col("Phone"),
            "address": col("Location") or (
                art.select_one("p.company__address").get_text(strip=True)
                if art.select_one("p.company__address") else ""),
            "sectors": re.sub(r"\s+", " ", terms.get_text(", ", strip=True)) if terms else "",
            "description": re.sub(r"\s+", " ", desc.get_text(" ", strip=True)) if desc else "",
            "careers_page": "",  # Stage 3: to resolve
            "region": "Ottawa · Kanata North (ON)",
        })
    return [r for r in rows if r["name"]]


def is_tech(c: dict) -> bool:
    blob = (c["sectors"] + " " + c["description"]).lower()
    return any(t in blob for t in TECH_TERMS)


def write_outputs(rows: list[dict], tech_only: bool) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = OUT_DIR / "kanata-north"
    stem.with_suffix(".json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = ["name", "website", "email", "phone", "sectors", "address", "careers_page", "description", "region"]
    with open(stem.with_suffix(".csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows({k: r.get(k, "") for k in fields} for r in rows)

    tech_n = sum(1 for r in rows if is_tech(r))
    L = [f"# Kanata North 科技园企业名录（渥太华 · {len(rows)} 家）\n",
         "> 来源：Kanata North Business Association 会员目录（admin-ajax 逆向直取，非编造）。",
         f"> 其中约 **{tech_n}** 家科技/工程相关。含官网+邮箱+电话，可直接联系——雇主 offer 路线的渥太华雇主全集。",
         "> 下一步：解析各公司官网的 careers/ATS 页 → 抓真实在招。\n",
         "| 公司 | 官网 | 行业 | 邮箱 | 电话 |", "|---|---|---|---|---|"]
    shown = [r for r in rows if (not tech_only or is_tech(r))]
    for r in sorted(shown, key=lambda r: r["name"].lower()):
        site = ""
        if r["website"]:
            label = re.sub(r"^https?://(www\.)?", "", r["website"]).rstrip("/")
            site = f"[{label}](<{r['website']}>)"
        L.append(f"| {r['name']} | {site} | {r['sectors'][:40]} | {r['email']} | {r['phone']} |")
    L.append(f"\n*由 `scripts/jobs/kanata_north_directory.py` 生成。tech_only={tech_only}。*")
    stem.with_suffix(".md").write_text("\n".join(L), encoding="utf-8")
    print(f"Wrote {len(rows)} companies ({tech_n} tech) → {stem}.md / .csv / .json")


def main() -> None:
    ap = argparse.ArgumentParser(description="Scrape Kanata North BA member directory.")
    ap.add_argument("--tech-only", action="store_true", help="Markdown lists only tech/eng companies.")
    args = ap.parse_args()
    rows = fetch_companies()
    write_outputs(rows, args.tech_only)


if __name__ == "__main__":
    main()
