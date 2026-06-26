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
    # —— 全职业职位板:常见非科技岗扩充(降低未分类;首位=大分类、次位=TEER 已核对)——
    (r"food (counter|service) (attendant|worker)|kitchen helper|food (prep|preparer)|fast food", "65201"),     # 服务 T5
    (r"production (labourer|labour|worker|associate)|food processing|process(ing)? (worker|labourer)|\bassembler\b|packaging", "95106"),  # 制造 T5
    (r"farm (machinery|equipment) operator|general farm worker|farm hand|nursery worker|greenhouse worker", "84120"),  # 资源 T4
    (r"harvest|fruit picker|livestock (labour|worker)|agricultur(e|al) (worker|labour)", "85100"),             # 资源 T5
    (r"automotive (service )?(technician|tech)|auto (body|service) (technician|tech)", "72410"),               # 技工 T2
    (r"landscap|groundskeep|lawn (care|maintenance)|grounds maintenance", "85121"),                            # 资源 T5
    (r"(transport |long[-\s]?haul )?truck driver|tractor[-\s]?trailer|class (a|1) driver", "73300"),           # 技工 T3
    (r"(delivery|courier|transport) driver|driver[-\s]?helper|\bchauffeur\b", "75101"),                        # 技工 T5
    (r"home support|personal care|care (aide|attendant|worker)|caregiver|continuing care", "44101"),           # 教育/社区 T4
    (r"general office|office (clerk|support)|administrative clerk|filing clerk|\bclerk\b", "14100"),           # 商务 T4
    (r"shipper|receiver|material handler|warehouse (worker|associate)|order (picker|fulfilment)|forklift", "75101"),  # 技工 T5
    (r"food service supervisor|retail (supervisor|team lead)|shift supervisor|\bsupervisor\b", "62020"),       # 服务 T2
    (r"service station attendant|gas (bar |station )?attendant|parking attendant|\battendant\b", "65100"),     # 服务 T5
    (r"painter|drywall|roofer|flooring|insulation|glazier", "73100"),                                          # 技工 T3
    (r"\binstaller\b|installation tech", "72404"),                                                             # 技工 T2
    (r"general (labour|labourer|help|helper)|\blabourer\b|manual labour", "75110"),                            # 技工 T5
    (r"\b(senior |sr )?(manager|director|\bvp\b|head of|chief|president)\b", "00012"),  # 兜底:管理岗→TEER0
]

# 每个 TEER 的评分基线(移民可行性导向)
TEER_BASE = {0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20}
# PNP 优先紧缺职业(前2位): 21/22 科技, 31/32 医疗, 72/73 技工运输, 42 教育社区
INDEMAND2 = {"21", "22", "31", "32", "72", "73", "42"}
# 各省 PNP 维护表:province → {"type", "nocs"}。目录驱动——扫 pnp/*.json
# (每文件一省,build_<prov>.py 产出),按文件 province 字段归省。加新省=丢一个 json,本脚本不改。
# 两种语义(由文件 type 区分,默认 indemand):
#   · indemand(如 OINP):TEER4-5 默认不符合,只有清单内 NOC 才符合(inclusion)。
#   · ineligible(如 AAIP):TEER0-5 默认都符合,清单内 NOC 不符合(exclusion/permissive)。
# 某省没文件 = 无 TEER4-5 专门通道,只吃 TEER0-3 粗筛(留空不猜,符合「宁可留空」)。
def _load_pnp_tables() -> dict[str, dict]:
    out: dict[str, dict] = {}
    pnp_dir = _paths.PNP
    if pnp_dir.exists():
        for f in pnp_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            prov = data.get("province")
            nocs = {o["noc"] for o in data.get("occupations", []) if o.get("noc")}
            if not (prov and nocs):
                continue
            t = out.setdefault(prov, {"type": data.get("type", "indemand"), "nocs": set()})
            t["nocs"].update(nocs)
    return out
PNP_BY_PROV = _load_pnp_tables()
# score() 的 +12「TEER4-5 专门紧缺通道」只对 inclusion 型有意义
# (exclusion 表里的 NOC 是「不符合」,绝不能加分)。
INDEMAND_LOW_BY_PROV = {p: t["nocs"] for p, t in PNP_BY_PROV.items() if t["type"] == "indemand"}
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


# 不属 PNP 体系的省:魁省走自己的甄选(CSQ/Arrima),不发省提名 → 一律不标 pnpEligible。
NON_PNP_PROV = {"QC"}


def pnp_eligible(noc: str, teer: int | None, prov: str) -> bool:
    """能否走雇主 offer 省提名,按省精准(不跨省套用)。魁省不属 PNP,直接排除。
    · 有 exclusion 表的省(如 AB/AAIP):TEER0-5 默认都可走,清单内 NOC 不可。
    · 其余(有 inclusion 表如 ON/OINP,或无表):TEER0-3 粗筛通用,
      TEER4-5 仅当 NOC 在该省 inclusion 清单内才可。"""
    if prov in NON_PNP_PROV:
        return False
    tbl = PNP_BY_PROV.get(prov)
    if tbl and tbl["type"] == "ineligible":
        return teer is not None and noc not in tbl["nocs"]
    nocs = tbl["nocs"] if tbl else set()
    return teer in (0, 1, 2, 3) or noc in nocs


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
    if noc in INDEMAND_LOW_BY_PROV.get(prov, set()):
        s += 12                       # TEER4-5 专门紧缺通道(按省)
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
    region_dir = _paths.COMPANIES  # 已含地域(processed/<region>/companies)
    if region_dir.exists():
        for folder in region_dir.iterdir():
            if not folder.is_dir() or not (folder / "jobs.json").exists():
                continue
            prof = json.loads((folder / "profile.json").read_text(encoding="utf-8")) if (folder / "profile.json").exists() else {}
            ag = bool(AGENCY_RE.search(prof.get("sectors", "") + " " + prof.get("name", "")))
            for j in json.loads((folder / "jobs.json").read_text(encoding="utf-8")).get("jobs", []):
                yield (j.get("url") or f"{folder.name}:{j.get('title','')}", j.get("title", ""), ag, guess_prov(j.get("location", "")), "")
    jb = _paths.PROCESSED_JOBBANK / "postings.json"
    if jb.exists():
        for j in json.loads(jb.read_text(encoding="utf-8")):
            m = re.search(r"NOC\s*(\d{5})", j.get("search_occupation", ""))  # 搜索时用的 NOC(旧关键词模式)
            hint = j.get("noc") or (m.group(1) if m else "")                  # 优先官方 NOC(05b 从详情页抽,权威)
            mid = re.search(r"/jobposting/(\d+)", j.get("url", ""))          # 稳定 ID:与 09_build_mart 一致(join 键)
            pid = str(j.get("posting_id") or (mid.group(1) if mid else ""))
            ext = f"jb:{pid}" if pid else (j.get("url") or f"jb:{j.get('posting_id','')}")
            yield (ext, j.get("title", ""),
                   bool(AGENCY_RE.search(j.get("employer", ""))), j.get("province", ""), hint)


def main() -> None:
    out = []
    for ext_id, title, agency, prov, hint in collect():
        noc = hint or classify(title)   # 源 NOC(JB 官方)优先,无则用标题关键词猜
        teer = teer_of(noc)
        acc = accessibility(title)
        out.append({"externalId": ext_id, "noc": noc,
                    "category": f"TEER {teer}" if teer is not None else "未分类",
                    "accessibility": acc, "score": score(noc, teer, prov, acc, agency),
                    "pnpEligible": pnp_eligible(noc, teer, prov)})
    _paths.PROCESSED.mkdir(parents=True, exist_ok=True)
    (_paths.PROCESSED / "all-scored.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scored {len(out)} jobs → all-scored.json")
    print("TEER 分布:", dict(sorted(Counter(o["category"] for o in out).items())))


if __name__ == "__main__":
    main()
