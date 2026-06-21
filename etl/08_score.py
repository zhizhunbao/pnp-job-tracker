"""
08_score — compute NOC classification, new-grad accessibility, and an immigration
value score (0-100) for each scraped job. Output keyed by externalId(=apply url)
so the loader can attach score/noc to the matching Payload job.

Scoring (移民可行性权重最高 = 40，用户确认):
  移民可行性 40 · NOC匹配 25 · 直接雇主(非中介) 15 · 雇主可担保(在目录) 10 · 应届友好 10
Current data = Ottawa/Kanata North direct employers (province ON), so 移民可行性 keys
off OINP 雇主Offer(非EE,不看CRS) for tech occupations.

Usage:  uv run python etl/08_score.py
Output: data/output/<region>-scored.json
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

REGION = "ottawa-kanata-north"

# 标题关键词 → (NOC, tier)。tier: core=核心软件/数据, adj=科技相邻, ''=非科技
NOC_RULES: list[tuple[str, str, str]] = [
    (r"data scientist|machine learning|\bml engineer|\bai engineer", "21211", "core"),
    (r"data engineer", "21211", "core"),
    (r"software engineer|\bswe\b|software developer in test", "21231", "core"),
    (r"software develop|\bsde\b|full[-\s]?stack|back[-\s]?end|front[-\s]?end developer", "21232", "core"),
    (r"devops|site reliability|\bsre\b|platform engineer|cloud (engineer|developer|architect)", "21232", "core"),
    (r"web developer", "21234", "core"),
    (r"\bprogrammer\b", "21230", "core"),
    (r"database|\bdba\b", "21223", "adj"),
    (r"cyber|security engineer|infosec|appsec", "21220", "adj"),
    (r"\bqa\b|quality|tester|\bsdet\b|test engineer", "22222", "adj"),
    (r"network engineer|network specialist", "22220", "adj"),
    (r"it support|support (analyst|specialist|engineer)|desktop support|help ?desk|service desk", "22221", "adj"),
    (r"computer engineer|firmware|embedded|hardware engineer|fpga|asic", "21311", "adj"),
    (r"systems analyst|business systems|information systems specialist", "21222", "adj"),
    (r"engineering manager|director.*engineering", "20010", "adj"),
    (r"(it|information systems|computer).*(manager|director)", "20012", "adj"),
    (r"solutions? (engineer|architect)|sales engineer|technical (account|support) (manager|specialist)", "21222", "adj"),
]


def classify(title: str) -> tuple[str, str]:
    t = title.lower()
    for pat, noc, tier in NOC_RULES:
        if re.search(pat, t):
            return noc, tier
    return "", ""


def accessibility(title: str) -> str:
    t = title.lower()
    if re.search(r"co[-\s]?op|intern|new grad|graduate program", t):
        return "co-op"
    if re.search(r"\bjunior\b|\bjr\b|associate|entry[-\s]?level", t):
        return "junior"
    if re.search(r"senior|\bsr\b|staff|principal|lead|\biii\b|\bdirector\b|\bvp\b|\bhead\b|manager", t):
        return "senior"
    if re.search(r"intermediate|\bii\b", t):
        return "intermediate"
    return "unknown"


AGENCY_RE = re.compile(r"recruit|staffing|talent|consulting services|outsourc|personnel", re.I)
ACC_BONUS = {"co-op": 10, "junior": 9, "intermediate": 7, "senior": 4, "unknown": 6}


def score(noc_tier: str, province: str, acc: str, is_agency: bool) -> int:
    # 移民可行性 (40): ON 科技岗 → OINP 雇主Offer(非EE,不看CRS)
    if noc_tier in ("core", "adj") and province == "ON":
        viability = 34
    elif province == "ON":
        viability = 12
    else:
        viability = 8
    noc_match = {"core": 25, "adj": 15}.get(noc_tier, 0)
    direct = 0 if is_agency else 15
    sponsor = 10  # 在 Kanata North 目录 = 已建公司
    return viability + noc_match + direct + sponsor + ACC_BONUS.get(acc, 6)


def guess_prov(loc: str) -> str:
    return "ON" if re.search(r"\b(on|ontario)\b", loc or "", re.I) else ""


def main() -> None:
    region_dir = _paths.COMPANIES / REGION
    out = []
    for folder in sorted(p for p in region_dir.iterdir() if p.is_dir()):
        jobs_file = folder / "jobs.json"
        if not jobs_file.exists():
            continue
        profile = json.loads((folder / "profile.json").read_text(encoding="utf-8")) if (folder / "profile.json").exists() else {}
        is_agency = bool(AGENCY_RE.search((profile.get("sectors", "") + " " + profile.get("name", ""))))
        data = json.loads(jobs_file.read_text(encoding="utf-8"))
        for j in data.get("jobs", []):
            title = j.get("title", "")
            noc, tier = classify(title)
            acc = accessibility(title)
            prov = guess_prov(j.get("location", ""))
            out.append({
                "externalId": j.get("url") or f"{folder.name}:{title}",
                "noc": noc,
                "accessibility": acc,
                "score": score(tier, prov, acc, is_agency),
            })
    _paths.OUTPUT.mkdir(parents=True, exist_ok=True)
    out_file = _paths.OUTPUT / f"{REGION}-scored.json"
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    scored = [o for o in out if o["score"]]
    top = sorted(out, key=lambda o: o["score"], reverse=True)[:5]
    print(f"Scored {len(out)} jobs → {out_file}")
    print("Top 5:", [(o["noc"], o["score"]) for o in top])


if __name__ == "__main__":
    main()
