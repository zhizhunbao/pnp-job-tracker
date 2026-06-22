"""
Materialize one-folder-per-company structure: data/companies/<region>/<slug>/.

Convention (per user): each company gets its own folder that accumulates everything
we learn about it, from every source:
    data/companies/<region>/<company-slug>/
        profile.json    — identity: name, website, email, phone, sectors, address, region
        careers.json     — careers_url + detected ATS (Stage 2)
        jobs.json        — postings scraped from its own careers/ATS page (Stage 3)
        linkedin.json    — LinkedIn company jobs (authenticated, later)
        indeed.json      — Indeed jobs (authenticated, later)

This script seeds profile.json (+ careers.json where known) from the flat directory
exports. Later stages write the remaining files into the same folder.

Usage:
  uv run python scripts/jobs/build_company_folders.py \
      --directory data/companies/kanata-north.json \
      --careers   data/companies/kanata-north-careers.json \
      --region    ottawa-kanata-north

Output: data/companies/<region>/<slug>/profile.json  (+ careers.json)
"""
import argparse
import json
import re
from pathlib import Path

import _paths
PROJECT_ROOT = _paths.ROOT
COMPANIES_DIR = _paths.COMPANIES


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return (s or "company")[:60].strip("-")


def main() -> None:
    ap = argparse.ArgumentParser(description="Build one-folder-per-company structure.")
    ap.add_argument("--directory", default=str(_paths.RAW_COMPANIES / "kanata-north.json"),
                    help="Flat company directory JSON (profiles).")
    ap.add_argument("--careers", default=str(_paths.RAW_COMPANIES / "kanata-north-careers.json"),
                    help="Careers-finder JSON (optional).")
    ap.add_argument("--region", default="ottawa-kanata-north", help="Region folder name.")
    args = ap.parse_args()

    companies = json.load(open(args.directory, encoding="utf-8"))
    careers_by_name = {}
    if args.careers and Path(args.careers).exists():
        for c in json.load(open(args.careers, encoding="utf-8")):
            careers_by_name[c["name"].lower()] = c

    region_dir = COMPANIES_DIR  # _paths.COMPANIES 已含地域(processed/<region>/companies)
    region_dir.mkdir(parents=True, exist_ok=True)

    seen: dict[str, int] = {}
    made = careers_written = 0
    index = []
    for co in companies:
        name = co.get("name") or co.get("employer") or ""
        if not name:
            continue
        slug = slugify(name)
        if slug in seen:  # disambiguate rare collisions
            seen[slug] += 1
            slug = f"{slug}-{seen[slug]}"
        else:
            seen[slug] = 0
        folder = region_dir / slug
        folder.mkdir(parents=True, exist_ok=True)

        profile = {
            "name": name,
            "slug": slug,
            "region": co.get("region", args.region),
            "website": co.get("website", ""),
            "email": co.get("email", ""),
            "phone": co.get("phone", ""),
            "sectors": co.get("sectors", ""),
            "address": co.get("address", ""),
            "description": co.get("description", ""),
        }
        (folder / "profile.json").write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
        made += 1

        car = careers_by_name.get(name.lower())
        if car and (car.get("careers_url") or car.get("ats")):
            (folder / "careers.json").write_text(json.dumps({
                "careers_url": car.get("careers_url", ""),
                "ats": car.get("ats", ""),
                "status": car.get("status", ""),
            }, ensure_ascii=False, indent=2), encoding="utf-8")
            careers_written += 1
        index.append({"slug": slug, "name": name, "website": profile["website"],
                      "has_careers": bool(car and car.get("careers_url"))})

    (region_dir / "_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Region '{args.region}': {made} company folders created, "
          f"{careers_written} with careers.json.\n  {region_dir}")


if __name__ == "__main__":
    main()
