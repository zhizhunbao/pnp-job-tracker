"""
Company directory by region — Stage 1 of the "scrape employers' own careers pages"
pipeline for the employer-job-offer PNP route.

Rationale (user's plan): aggregators like Job Bank are thin and stale; the real
hiring data lives on each company's own careers page. But you first need the list
of *which companies* exist per region. This builds that seed list from REAL data —
the employers already found by the Job Bank sweep (scripts/jobs/jobbank_scraper.py)
— grouped province → city → company, and attaches each region's tech-ecosystem
directory sources to harvest further companies (incl. ones not currently posting).

Pipeline:
  Stage 1 (this file): region → company seed list  [from Job Bank data + directory sources]
  Stage 2 (next):      resolve each company's official site + careers/ATS page
  Stage 3 (next):      scrape postings from those careers pages (Greenhouse/Lever/etc.)

Usage:
  uv run python scripts/jobs/company_directory.py

Input:  data/jobs/jobbank-*.json   (from the Job Bank sweep)
Output: data/companies/companies-by-region.md  +  .json
"""
import glob
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
JOBS_DIR = PROJECT_ROOT / "data" / "jobs"
OUT_DIR = PROJECT_ROOT / "data" / "companies"

PROV_NAME = {
    "ON": "安大略（ON）", "SK": "萨斯喀彻温（SK）", "AB": "阿尔伯塔（AB）",
    "BC": "不列颠哥伦比亚（BC）", "MB": "曼尼托巴（MB）", "NB": "新不伦瑞克（NB）",
    "NS": "新斯科舍（NS）", "NL": "纽芬兰与拉布拉多（NL）", "PE": "爱德华王子岛（PE）",
}

# Per-region tech-ecosystem directories to harvest more companies from (Stage 2 targets).
# These are curated local-tech member/portfolio lists — the company universe to approach,
# not just who is posting today. NOTE: many are JS-rendered (need Playwright) — marked here
# as harvest targets, not yet scraped.
DIRECTORY_SOURCES = {
    "ON": [
        ("Ottawa · Kanata North Tech Park 会员名录", "https://www.kanatanorth.com/members/"),
        ("Ottawa · Invest Ottawa 企业", "https://www.investottawa.ca/"),
        ("Waterloo · Communitech 成员", "https://www.communitech.ca/"),
        ("Toronto · MaRS Discovery District", "https://www.marsdd.com/"),
    ],
    "AB": [
        ("Calgary · Platform Calgary", "https://www.platformcalgary.com/"),
        ("Edmonton · Edmonton Unlimited", "https://edmontonunlimited.com/"),
        ("AI · Amii (Alberta Machine Intelligence Institute)", "https://www.amii.ca/"),
    ],
    "BC": [("Vancouver · BC Tech Association", "https://wearebctech.com/")],
    "SK": [("Saskatoon · Co.Labs", "https://www.colab.ca/")],
    "NB": [
        ("Venn Innovation", "https://www.venninnovation.com/"),
        ("Opportunities NB", "https://onbcanada.ca/"),
    ],
    "NS": [
        ("Halifax · Volta", "https://voltaeffect.com/"),
        ("Digital Nova Scotia", "https://digitalnovascotia.com/"),
    ],
    "NL": [("St. John's · Genesis Centre", "https://genesiscentre.ca/"),
           ("techNL", "https://www.technl.ca/")],
    "PE": [("Startup Zone", "https://startupzone.ca/")],
    "MB": [("North Forge Technology Exchange", "https://northforge.ca/")],
}

# Province display order = our PNP-strategy priority (ON first; Atlantic grouped).
PROV_ORDER = ["ON", "AB", "BC", "SK", "NB", "NS", "NL", "PE", "MB"]


def load_companies() -> dict:
    """province -> city -> employer -> list of job dicts (from Job Bank sweep)."""
    by_prov: dict = {}
    for f in glob.glob(str(JOBS_DIR / "jobbank-*.json")):
        if "comparison" in f:
            continue
        for r in json.load(open(f, encoding="utf-8")):
            prov = r.get("province") or "?"
            city = r.get("city") or "—"
            emp = r.get("employer") or "—"
            by_prov.setdefault(prov, {}).setdefault(city, {}).setdefault(emp, []).append(r)
    return by_prov


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    by_prov = load_companies()

    # JSON: flat list of unique companies with region + roles + a Job Bank link.
    flat = []
    for prov, cities in by_prov.items():
        for city, emps in cities.items():
            for emp, jobs in emps.items():
                flat.append({
                    "province": prov, "city": city, "employer": emp,
                    "tech_postings": len(jobs),
                    "roles": sorted({j["title"] for j in jobs if j.get("title")}),
                    "any_direct": any(j.get("direct") for j in jobs),
                    "jobbank_url": jobs[0].get("url", ""),
                    "official_site": "",   # Stage 2: to resolve
                    "careers_page": "",    # Stage 3: to resolve
                })
    flat.sort(key=lambda c: (PROV_ORDER.index(c["province"]) if c["province"] in PROV_ORDER else 99,
                             c["city"], -c["tech_postings"]))
    (OUT_DIR / "companies-by-region.json").write_text(
        json.dumps(flat, ensure_ascii=False, indent=2), encoding="utf-8")

    # Markdown
    total = len(flat)
    L = ["# 各地域科技公司清单（雇主 offer 路线 · 第一阶段种子表）\n",
         f"> 共 **{total}** 家真实科技雇主，按 省 → 市 分组。来源：Job Bank 实测在招数据（非编造）。",
         "> 用途：这是「去公司官网抓招聘页」流水线的**种子公司表**。`官网` / `careers 页` 两列待第二阶段解析填充。",
         "> 每个省末尾附 **目录源 URL**——用于扩展到当前未挂岗、但存在于本地科技生态的公司。\n",
         "> 流水线：① 本表（region→公司）→ ② 解析各公司官网 + careers/ATS 页 → ③ 抓 careers 页职位。\n"]

    for prov in PROV_ORDER:
        if prov not in by_prov and prov not in DIRECTORY_SOURCES:
            continue
        cities = by_prov.get(prov, {})
        n_emp = sum(len(e) for e in cities.values())
        L.append(f"\n## {PROV_NAME.get(prov, prov)} — {n_emp} 家\n")
        # cities sorted by employer count
        for city in sorted(cities, key=lambda c: -len(cities[c])):
            emps = cities[city]
            L.append(f"### {city}（{len(emps)} 家）\n")
            L.append("| 公司 | 科技岗 | 在招职位 | 直接发布 | 官网 | careers 页 | Job Bank |")
            L.append("|---|---:|---|:---:|---|---|---|")
            for emp, jobs in sorted(emps.items(), key=lambda kv: -len(kv[1])):
                roles = ", ".join(sorted({j["title"] for j in jobs if j.get("title")}))[:50]
                direct = "✅" if any(j.get("direct") for j in jobs) else ""
                jb = jobs[0].get("url", "")
                L.append(f"| {emp} | {len(jobs)} | {roles} | {direct} | _待填_ | _待填_ | [开](<{jb}>) |")
            L.append("")
        # directory sources for expansion
        if prov in DIRECTORY_SOURCES:
            L.append(f"**{prov} 扩展目录源（待抓取更多公司）：**")
            for label, url in DIRECTORY_SOURCES[prov]:
                L.append(f"- {label} — <{url}>")
            L.append("")

    L.append("\n---\n*由 `scripts/jobs/company_directory.py` 生成（读 `data/jobs/jobbank-*.json`）。"
             "重跑 Job Bank 扫描后重跑本脚本即可刷新。*")
    (OUT_DIR / "companies-by-region.md").write_text("\n".join(L), encoding="utf-8")
    print(f"Wrote {total} companies → {OUT_DIR / 'companies-by-region.md'}")
    # console summary
    from collections import Counter
    c = Counter(x["province"] for x in flat)
    for p in PROV_ORDER:
        if c.get(p):
            print(f"  {p}: {c[p]} companies")


if __name__ == "__main__":
    main()
