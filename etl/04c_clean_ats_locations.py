"""
04c — normalize job locations into clean structured fields (country/province/city/
district/address) and filter ATS jobs to the focus region (Ottawa, strict).

Runs on BOTH sources so the data layer (not the frontend) holds clean geography:
  - ATS company feeds: messy worldwide locations → keep only Ottawa, drop the rest.
  - Job Bank postings: already Ottawa, just structure + clean.

Output per kept job:  country=Canada · province=ON · city=Ottawa ·
                       district=<规范社区名 或 ""> · address=<精确地址 或 "">
「区」只在有具体社区(Kanata/Nepean/Orléans…)时有值;纯 Ottawa → 空。

Usage:  uv run python etl/04c_clean_ats_locations.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

# 大渥太华市社区:各种写法 → 规范名(Orléans 合并、Kanata North→Kanata)
OTTAWA_DISTRICTS = {
    "kanata": "Kanata", "kanata north": "Kanata", "nepean": "Nepean", "gloucester": "Gloucester",
    "orleans south": "Orléans", "orléans": "Orléans", "orleans": "Orléans",
    "stittsville": "Stittsville", "manotick": "Manotick", "barrhaven": "Barrhaven",
    "vanier": "Vanier", "cumberland": "Cumberland", "greely": "Greely", "carp": "Carp",
    "dunrobin": "Dunrobin", "metcalfe": "Metcalfe", "osgoode": "Osgoode",
    "richmond": "Richmond", "rockcliffe": "Rockcliffe",
}


def clean_address(addr: str) -> str:
    """统一格式;只有「City, ON」无街号/邮编的不算精确地址 → 空。"""
    a = re.sub(r"\s+,", ",", (addr or "").strip())
    a = re.sub(r"\s+", " ", a).strip(" ,")
    return a if re.search(r"\d", a) else ""


def normalize(raw_city: str, raw_addr: str):
    """(返回 None=非渥太华,丢弃) → {country,province,city,district,address}。"""
    text = f"{raw_city or ''} {raw_addr or ''}".lower()
    district = ""
    for key, canon in sorted(OTTAWA_DISTRICTS.items(), key=lambda kv: -len(kv[0])):
        if re.search(r"\b" + re.escape(key) + r"\b", text):
            district = canon
            break
    if not district and "ottawa" not in text:
        return None
    return {"country": "Canada", "province": "ON", "city": "Ottawa",
            "district": district, "address": clean_address(raw_addr)}


def apply(j: dict, loc: dict) -> None:
    j["country"], j["province"], j["city"] = loc["country"], loc["province"], loc["city"]
    j["district"], j["address"] = loc["district"], loc["address"]


def main() -> None:
    kept = dropped = 0
    for jobs_json in _paths.COMPANIES.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        jobs = data.get("jobs", [])
        clean_jobs = []
        for j in jobs:
            loc = normalize(j.get("location", ""), j.get("address", ""))
            if loc is None:
                dropped += 1
                continue
            apply(j, loc)
            clean_jobs.append(j)
            kept += 1
        if jobs:
            data["jobs"], data["count"] = clean_jobs, len(clean_jobs)
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ATS: kept {kept} Ottawa jobs, dropped {dropped} non-Ottawa.")

    jb_path = _paths.JOBBANK / "postings.json"
    if jb_path.exists():
        posts = json.loads(jb_path.read_text(encoding="utf-8"))
        for j in posts:
            loc = normalize(j.get("city", ""), j.get("address", "")) or \
                {"country": "Canada", "province": "ON", "city": "Ottawa", "district": "", "address": clean_address(j.get("address", ""))}
            apply(j, loc)
        jb_path.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Job Bank: structured {len(posts)} postings.")


if __name__ == "__main__":
    main()
