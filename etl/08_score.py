"""
08_score — classify each job by official Canadian NOC 2021 **TEER (0-5)** and score
it per its TEER's own rubric (each TEER = its own standard). Reads ATS company-folder
jobs + Job Bank jobs. Output keyed by externalId for the loader.

TEER = NOC 5-digit code's 2nd digit:
  0 管理 · 1 学位 · 2 大专/学徒(2年+) · 3 大专/培训 · 4 高中 · 5 无正式教育
移民含义: TEER 0-3 = 技能岗,可走雇主Offer省提名(OINP等);TEER 4-5 受限,除非在紧缺清单。

Usage:  uv run python etl/08_score.py
Output: data/output/all-scored.json
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

REGION = "ottawa-kanata-north"

# 标题关键词 → NOC（用于推断 TEER 和职业紧缺度）
NOC_RULES: list[tuple[str, str]] = [
    (r"data scientist|machine learning|\bml engineer|\bai engineer|data engineer", "21211"),
    (r"software engineer|\bswe\b", "21231"),
    (r"software develop|\bsde\b|full[-\s]?stack|back[-\s]?end|front[-\s]?end develop|devops|site reliability|cloud (engineer|developer)", "21232"),
    (r"web developer|\bprogrammer\b", "21234"),
    (r"database|\bdba\b", "21223"),
    (r"cyber|security engineer|infosec", "21220"),
    (r"\bqa\b|quality assurance|\bsdet\b|test engineer", "22222"),
    (r"network engineer|it support|support (analyst|specialist)|help ?desk|desktop support", "22221"),
    (r"computer engineer|firmware|embedded|hardware engineer|fpga", "21311"),
    (r"systems analyst|business systems|information systems|solutions? (engineer|architect)|sales engineer", "21222"),
    (r"(it|information systems|computer).*(manager|director)|engineering manager", "20012"),
    (r"registered nurse|\brn\b|nurse practitioner", "31301"),
    (r"practical nurse|\blpn\b|\brpn\b", "32101"),
    (r"personal support worker|\bpsw\b|nurse aide|health ?care aide|patient care", "44101"),
    (r"pharmacist", "31120"),
    (r"physiotherap|physical therap|occupational therap", "31202"),
    (r"medical lab|laboratory tech|x-?ray|imaging tech", "32120"),
    (r"dentist|dental hygien", "31110"),
    (r"physician|family doctor|general practitioner", "31102"),
    (r"electrician", "72200"),
    (r"plumber|plumbing|pipefitter", "72300"),
    (r"welder|welding", "72106"),
    (r"carpenter", "72310"),
    (r"machinist|cnc|tool and die", "72100"),
    (r"hvac|refrigeration|gas (fitter|technician)", "72402"),
    (r"(automotive|auto) (technician|mechanic)|\bmechanic\b|millwright", "72410"),
    (r"truck driver|long haul|class (a|1) driver", "73300"),
    (r"construction (labour|labor|helper)|general labour|general labor", "75110"),
    (r"\bchef\b|sous[-\s]?chef|kitchen manager", "62200"),
    (r"\bcook\b", "63200"),
    (r"\bserver\b|waiter|waitress|bartender|barista", "65200"),
    (r"\baccountant\b|financial analyst", "11100"),
    (r"bookkeep|payroll|accounting (clerk|tech)", "12200"),
    (r"administrative (assistant|officer)|office (manager|admin)|executive assistant", "13110"),
    (r"receptionist|office clerk|data entry", "14101"),
    (r"human resources|\bhr\b (manager|generalist|advisor)|recruiter", "11200"),
    (r"early childhood educator|\bece\b|daycare|childcare", "42202"),
    (r"social worker|community (worker|support)", "41300"),
    (r"teacher|instructor|educator|professor|tutor", "41220"),
    (r"retail (sales|associate)|sales associate|store (clerk|associate)|cashier", "64100"),
    (r"customer service|call (centre|center)|security guard", "64409"),
    (r"cleaner|janitor|housekeep|custodian|dishwasher", "65310"),
    (r"warehouse|order picker|shipper|material handler|delivery driver|courier", "75101"),
    (r"\bsales (manager|representative)|account (executive|manager)|business develop", "60010"),
    # —— 科技公司常见商业/专业岗 ——
    (r"product (manager|owner)|project manager|program manager|scrum master|delivery manager", "20012"),
    (r"marketing|digital (marketing|media)|\bseo\b|content (manager|specialist|writer)|communications|brand", "11202"),
    (r"\bux\b|\bui\b|product designer|graphic design|\bdesigner\b", "52120"),
    (r"business analyst|operations (analyst|manager|coordinator|specialist)", "21222"),
    (r"finance (manager|analyst)|controller|treasur", "11100"),
    (r"customer success|client (success|services)|implementation (specialist|manager)|onboarding|technical writer", "12013"),
    (r"\b(senior |sr )?(manager|director|\bvp\b|head of|chief|president)\b", "00012"),  # 兜底:管理岗→TEER0
]

# 每个 TEER 的评分基线(移民可行性导向)
TEER_BASE = {0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20}
# PNP 优先紧缺职业(前2位): 21/22 科技, 31/32 医疗, 72/73 技工运输, 42 教育社区
INDEMAND2 = {"21", "22", "31", "32", "72", "73", "42"}
# OINP 紧缺技能(TEER4-5 专门通道)
INDEMAND_LOW = {"44101", "75110", "85100", "85101", "84120", "65202"}
AGENCY_RE = re.compile(r"recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad", re.I)
ACC = {"co-op": 6, "junior": 6, "intermediate": 4, "senior": 2, "unknown": 3}


def classify(title: str) -> str:
    t = title.lower()
    for pat, noc in NOC_RULES:
        if re.search(pat, t):
            return noc
    return ""


def teer_of(noc: str) -> int | None:
    return int(noc[1]) if noc and len(noc) == 5 and noc[1].isdigit() else None


def accessibility(title: str) -> str:
    t = title.lower()
    if re.search(r"co[-\s]?op|intern|new grad", t):
        return "co-op"
    if re.search(r"\bjunior\b|\bjr\b|associate|entry[-\s]?level|apprentice", t):
        return "junior"
    if re.search(r"senior|\bsr\b|staff|principal|lead|\biii\b|director|manager|supervisor", t):
        return "senior"
    if re.search(r"intermediate|\bii\b", t):
        return "intermediate"
    return "unknown"


def score(noc: str, teer: int | None, prov: str, acc: str, agency: bool) -> int:
    s = TEER_BASE.get(teer, 18) if teer is not None else 18
    if noc[:2] in INDEMAND2:
        s += 10                       # 紧缺技能职业
    if noc in INDEMAND_LOW:
        s += 12                       # TEER4-5 专门紧缺通道
    if not agency:
        s += 12
    s += ACC.get(acc, 3)
    if prov != "ON":
        s -= 6
    return max(0, min(100, s))


def guess_prov(loc: str) -> str:
    return "ON" if re.search(r"\b(on|ontario)\b", loc or "", re.I) else ""


def collect():
    """Yield (externalId, title, agency, province, hint_noc)."""
    region_dir = _paths.COMPANIES / REGION
    if region_dir.exists():
        for folder in region_dir.iterdir():
            if not folder.is_dir() or not (folder / "jobs.json").exists():
                continue
            prof = json.loads((folder / "profile.json").read_text(encoding="utf-8")) if (folder / "profile.json").exists() else {}
            ag = bool(AGENCY_RE.search(prof.get("sectors", "") + " " + prof.get("name", "")))
            for j in json.loads((folder / "jobs.json").read_text(encoding="utf-8")).get("jobs", []):
                yield (j.get("url") or f"{folder.name}:{j.get('title','')}", j.get("title", ""), ag, guess_prov(j.get("location", "")), "")
    jb = _paths.JOBBANK / "jobbank-on.json"
    if jb.exists():
        for j in json.loads(jb.read_text(encoding="utf-8")):
            m = re.search(r"NOC\s*(\d{5})", j.get("search_occupation", ""))  # 搜索时用的 NOC,较准
            yield (j.get("url") or f"jb:{j.get('posting_id','')}", j.get("title", ""),
                   bool(AGENCY_RE.search(j.get("employer", ""))), j.get("province", ""), m.group(1) if m else "")


def main() -> None:
    out = []
    for ext_id, title, agency, prov, hint in collect():
        noc = classify(title) or hint
        teer = teer_of(noc)
        acc = accessibility(title)
        out.append({"externalId": ext_id, "noc": noc,
                    "category": f"TEER {teer}" if teer is not None else "未分类",
                    "accessibility": acc, "score": score(noc, teer, prov, acc, agency)})
    _paths.OUTPUT.mkdir(parents=True, exist_ok=True)
    (_paths.OUTPUT / "all-scored.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scored {len(out)} jobs → all-scored.json")
    print("TEER 分布:", dict(sorted(Counter(o["category"] for o in out).items())))


if __name__ == "__main__":
    main()
