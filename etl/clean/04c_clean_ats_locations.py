"""
04c — normalize job locations into clean structured fields (country/province/
district/address) and filter ATS jobs to the focus region (Ottawa, strict).

Runs on BOTH sources so the data layer (not the frontend) holds clean geography:
  - ATS company feeds: messy worldwide locations → keep only Ottawa, drop the rest.
  - Job Bank postings: already Ottawa, just structure + clean.

社区(区)判定:① 文本里的社区名优先;② 文本没写但地址带加拿大邮编时,用
高置信度的渥太华郊区 FSA(邮编前3位)兜底。central Ottawa 的 FSA 不猜,留空。

Output per kept job:  country=Canada · province=ON · city=Ottawa ·
                       district=<规范社区名 或 ""> · address=<精确地址 或 "">

Usage:  uv run python etl/clean/04c_clean_ats_locations.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths 在那)
import _paths  # noqa: E402

# ── 输入/输出全路径(先声明再用;原地清洗 → IN 与 OUT 同址)──────────────
IN_COMPANIES_DIR = _paths.COMPANIES                  # processed/ontario/ottawa/kanata-north/companies/
IN_JOBBANK_FILE = _paths.JOBBANK / "postings.json"   # raw/ontario/ottawa/jobbank/postings.json
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                  # 各 <slug>/jobs.json 原地写回
OUT_JOBBANK_FILE = IN_JOBBANK_FILE                    # 原地写回

# 大渥太华市社区:各种写法 → 规范名(Orléans 合并、Kanata North→Kanata)
OTTAWA_DISTRICTS = {
    "kanata": "Kanata", "kanata north": "Kanata", "nepean": "Nepean", "gloucester": "Gloucester",
    "orleans south": "Orléans", "orléans": "Orléans", "orleans": "Orléans",
    "stittsville": "Stittsville", "manotick": "Manotick", "barrhaven": "Barrhaven",
    "vanier": "Vanier", "cumberland": "Cumberland", "greely": "Greely", "carp": "Carp",
    "dunrobin": "Dunrobin", "metcalfe": "Metcalfe", "osgoode": "Osgoode",
    "richmond": "Richmond", "rockcliffe": "Rockcliffe",
}

# 邮编兜底:渥太华郊区 FSA(前3位) → 社区。只收高置信度单一社区的 FSA;
# central Ottawa(K1A/K1N/K1P/K1R/K1S/K1Y/K2P…)跨多社区,不映射 → 留空(不瞎猜)。
FSA_DISTRICT = {
    "K2K": "Kanata", "K2L": "Kanata", "K2M": "Kanata", "K2T": "Kanata", "K2V": "Kanata", "K2W": "Kanata",
    "K2S": "Stittsville",
    "K2J": "Barrhaven",
    "K2H": "Nepean", "K2E": "Nepean", "K2G": "Nepean", "K2C": "Nepean",
    "K1C": "Orléans", "K1E": "Orléans", "K4A": "Orléans",
    "K1B": "Gloucester", "K1J": "Gloucester", "K1T": "Gloucester",
    "K1K": "Vanier", "K1L": "Vanier",
    "K4M": "Manotick", "K4P": "Greely",
}
_POSTAL = re.compile(r"\b([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d\b")  # 加拿大邮编 A1A 1A1 → 取 FSA
OTTAWA_FSA_PREFIX = ("K1", "K2")  # 邮编 K1*/K2* 几乎全是渥太华市(用邮编判定,避免 "Richmond Hill" 撞 Ottawa 社区名)
OTTAWA_CITY_NAMES = {k for k in OTTAWA_DISTRICTS} | {"ottawa"}  # 无邮编时:按 city 精确名判定(不子串匹配地址)


def fsa_of(s: str) -> str:
    """从含邮编的文本取 FSA(前3位,大写);无邮编返回 ""。"""
    m = _POSTAL.search(s or "")
    return m.group(1).upper() if m else ""


def clean_address(addr: str) -> str:
    """统一格式;只有「City, ON」无街号/邮编的不算精确地址 → 空。"""
    a = re.sub(r"\s+,", ",", (addr or "").strip())
    a = re.sub(r"\s+", " ", a).strip(" ,")
    return a if re.search(r"\d", a) else ""


def normalize(raw_city: str, raw_addr: str):
    """(返回 None=非渥太华,丢弃) → {country,province,city,district,address}。"""
    raw = f"{raw_city or ''} {raw_addr or ''}"
    text = raw.lower()
    district = ""
    for key, canon in sorted(OTTAWA_DISTRICTS.items(), key=lambda kv: -len(kv[0])):
        if re.search(r"\b" + re.escape(key) + r"\b", text):
            district = canon
            break
    if not district:  # 文本没写社区 → 邮编 FSA 兜底
        district = FSA_DISTRICT.get(fsa_of(raw), "")
    # 是否渥太华:文本含 ottawa / 已识别到社区(含邮编兜底的)→ 都算
    if not district and "ottawa" not in text:
        return None
    return {"country": "Canada", "province": "ON", "city": "Ottawa",
            "district": district, "address": clean_address(raw_addr)}


def normalize_jobbank(prov: str, city: str, addr: str) -> dict:
    """Job Bank 多省:保留帖子自带省/市;区只在大渥太华内判定。
    Ottawa 判定以**邮编 FSA 为准**(K1*/K2*),避免 "Richmond Hill" 等撞 Ottawa 社区名;
    无邮编时才退回 city 精确名(不子串匹配地址)。"""
    prov = (prov or "").strip().upper()
    city_c = re.sub(r"\s+", " ", (city or "").strip())
    fsa = fsa_of(f"{city or ''} {addr or ''}")
    district = ""
    in_ottawa = False
    if prov == "ON":
        if fsa:
            in_ottawa = fsa[:2] in OTTAWA_FSA_PREFIX or fsa in FSA_DISTRICT
        else:  # 无邮编 → 按 city 精确名(整城名匹配,不子串)
            in_ottawa = city_c.lower() in OTTAWA_CITY_NAMES
    if in_ottawa:
        district = FSA_DISTRICT.get(fsa, "") or OTTAWA_DISTRICTS.get(city_c.lower(), "")
        city_c = "Ottawa"  # 大渥太华:各社区统一为 city=Ottawa + district=社区
    return {"country": "Canada", "province": prov, "city": city_c,
            "district": district, "address": clean_address(addr)}


def apply(j: dict, loc: dict) -> None:
    j["country"], j["province"], j["city"] = loc["country"], loc["province"], loc["city"]
    j["district"], j["address"] = loc["district"], loc["address"]


def main() -> None:
    print(f"IN/OUT companies : {OUT_COMPANIES_DIR}")
    print(f"IN/OUT job bank  : {OUT_JOBBANK_FILE}")
    kept = dropped = 0
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
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

    if IN_JOBBANK_FILE.exists():
        posts = json.loads(IN_JOBBANK_FILE.read_text(encoding="utf-8"))
        for j in posts:
            # 幂等:原始市名存进 city_raw,永远从原始值清洗(04c 读写同字段会自污染,故隔离)
            if not j.get("city_raw"):
                j["city_raw"] = j.get("city", "")
            apply(j, normalize_jobbank(j.get("province", ""), j.get("city_raw", ""), j.get("address", "")))
        OUT_JOBBANK_FILE.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        from collections import Counter
        dist = Counter(j.get("province", "?") for j in posts)
        print(f"Job Bank: structured {len(posts)} postings across {len(dist)} provinces {dict(dist)}.")


if __name__ == "__main__":
    main()
