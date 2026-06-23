"""
09 — build the MART (数据仓库集市层): 把清洗好的各源拼成「列和 DB 表一一对应」的最终表。
seed 从此只读 mart 直接灌库,不再在加载器里东拼西凑(中介过滤/去重/评分关联都下沉到这)。

产出 data/mart/(每个文件 = 一张 Payload 表):
  事实表  companies.json  jobs.json
  维度表  provinces.json  cities.json  districts.json  designated_employers.json

Usage:  uv run python etl/09_build_mart.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

# ── 输入/输出全路径 ──────────────────────────────────────────────
IN_JOBBANK = _paths.JOBBANK / "postings.json"
IN_ATS_COMPANIES = _paths.COMPANIES                       # processed/ats/.../companies/<slug>/
IN_SCORED = _paths.OUTPUT / "all-scored.json"
IN_AIP = _paths.DESIGNATED / "aip-designated-employers.json"
OUT_MART = _paths.DATA / "mart"

PROV_FULL = {
    "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia", "AB": "Alberta",
    "SK": "Saskatchewan", "MB": "Manitoba", "NB": "New Brunswick", "NS": "Nova Scotia",
    "NL": "Newfoundland and Labrador", "PE": "Prince Edward Island",
}
# 大渥太华社区(区维度的规范来源,与 04c 一致)
OTTAWA_DISTRICTS = ["Kanata", "Nepean", "Gloucester", "Orléans", "Stittsville", "Manotick",
                    "Barrhaven", "Vanier", "Cumberland", "Greely", "Carp", "Dunrobin",
                    "Metcalfe", "Osgoode", "Richmond", "Rockcliffe"]
AGENCY = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad|source code", re.I)
SKIP_SLUGS = {"cmc-microsystems"}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "company"


def norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (t or "").lower())


def guess_prov(loc: str) -> str:
    return "ON" if re.search(r"\b(on|ontario)\b", loc or "", re.I) else ""


def build():
    scored = {}
    if IN_SCORED.exists():
        scored = {s["externalId"]: s for s in json.loads(IN_SCORED.read_text(encoding="utf-8"))}

    companies: dict[str, dict] = {}   # slug -> company row
    jobs: list[dict] = []
    seen: set[str] = set()            # company-slug|title 去重
    seen_ext: set[str] = set()        # externalId 去重

    def add_company(name, slug, **extra):
        if slug not in companies:
            companies[slug] = {"slug": slug, "name": name, **{k: v for k, v in extra.items() if v}}

    def add_job(external_id, company_slug, **fields):
        if external_id in seen_ext:
            return
        seen_ext.add(external_id)
        sc = scored.get(external_id, {})
        jobs.append({
            "externalId": external_id, "companySlug": company_slug,
            **{k: v for k, v in fields.items() if v not in (None, "")},
            "noc": sc.get("noc") or None, "category": sc.get("category") or None,
            "accessibility": sc.get("accessibility") or None, "score": sc.get("score"),
            "pnpEligible": bool(sc.get("pnpEligible")), "status": "open",
        })

    # 1) ATS 公司岗(processed/ats/.../companies/<slug>/)
    if IN_ATS_COMPANIES.exists():
        for cdir in sorted(IN_ATS_COMPANIES.iterdir()):
            if not cdir.is_dir() or cdir.name in SKIP_SLUGS:
                continue
            pf, jf = cdir / "profile.json", cdir / "jobs.json"
            if not (pf.exists() and jf.exists()):
                continue
            prof = json.loads(pf.read_text(encoding="utf-8"))
            jd = json.loads(jf.read_text(encoding="utf-8"))
            if not jd.get("jobs"):
                continue
            slug = prof.get("slug") or cdir.name
            add_company(prof.get("name") or slug, slug, website=prof.get("website"),
                        email=prof.get("email"), address=prof.get("address"),
                        sectors=prof.get("sectors"), region=prof.get("region"), source="ats")
            for j in jd["jobs"]:
                key = f"{slug}|{norm(j.get('title',''))}"
                if key in seen:
                    continue
                seen.add(key)
                ext = j.get("url") or key
                add_job(ext, slug, title=j.get("title"), source=jd.get("ats") or "ats", origin="ats",
                        country=j.get("country"), province=j.get("province") or guess_prov(j.get("location", "")),
                        city=j.get("city"), district=j.get("district"), address=j.get("address"),
                        applyUrl=j.get("url"), officialUrl=prof.get("website"),
                        salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                        aip=bool(j.get("aip")), datePosted=j.get("posted"))

    # 2) Job Bank(全国全职业)
    if IN_JOBBANK.exists():
        for j in json.loads(IN_JOBBANK.read_text(encoding="utf-8")):
            if AGENCY.search(j.get("employer", "")):  # 跳过中介
                continue
            cslug = slugify(j.get("employer") or "unknown")
            key = f"{cslug}|{norm(j.get('title',''))}"
            if key in seen:
                continue
            seen.add(key)
            add_company(j.get("employer") or "—", cslug, website=j.get("website"),
                        address=j.get("address"), region=j.get("province"), source="jobbank")
            ext = j.get("url") or key
            add_job(ext, cslug, title=j.get("title"), source=j.get("source") or "Job Bank", origin="jobbank",
                    country=j.get("country"), province=j.get("province") or guess_prov(j.get("city", "")),
                    city=j.get("city"), district=j.get("district"), address=j.get("address"),
                    applyUrl=j.get("url"), officialUrl=j.get("website"),
                    salary=j.get("salary"), salaryAnnual=j.get("salaryAnnual"), salaryText=j.get("salaryText"),
                    aip=bool(j.get("aip")), datePosted=j.get("date"))

    # ── 维度表 ──
    provinces = [{"code": c, "name": n} for c, n in PROV_FULL.items()]
    city_keys = sorted({(j.get("city"), j.get("province")) for j in jobs if j.get("city")})
    cities = [{"name": c, "province": p or ""} for c, p in city_keys]
    districts = [{"name": d, "city": "Ottawa", "province": "ON"} for d in OTTAWA_DISTRICTS]
    designated = []
    if IN_AIP.exists():
        for e in json.loads(IN_AIP.read_text(encoding="utf-8")):
            designated.append({"name": e.get("employer"), "province": e.get("province"),
                               "location": e.get("location"), "isTech": bool(e.get("tech")), "source": "AIP"})

    return {
        "companies": list(companies.values()), "jobs": jobs,
        "provinces": provinces, "cities": cities, "districts": districts,
        "designated_employers": designated,
    }


def main() -> None:
    OUT_MART.mkdir(parents=True, exist_ok=True)
    mart = build()
    for table, rows in mart.items():
        (OUT_MART / f"{table}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print("MART built →", OUT_MART)
    for table, rows in mart.items():
        print(f"  {table:22} {len(rows):5} 行")


if __name__ == "__main__":
    main()
