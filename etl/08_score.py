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
# 三种语义(由文件 type + overlay 区分,默认 indemand):
#   · indemand(如 OINP):TEER4-5 默认不符合,只有清单内 NOC 才符合(inclusion)。
#   · ineligible(如 AAIP):TEER0-5 默认都符合,清单内 NOC 不符合(exclusion/permissive)。
#   · ineligible + overlay=true(如 NB 不受理清单):**叠加式排除**——不改该省默认规则
#     (NB Skilled Worker 仍要技能岗 offer,TEER4-5 不因此放开),只是命中清单即不可。
# 某省没文件 = 无 TEER4-5 专门通道,只吃 TEER0-3 粗筛(留空不猜,符合「宁可留空」)。
def _load_pnp_tables() -> dict[str, dict]:
    out: dict[str, dict] = {}
    pnp_dir = _paths.PNP
    if pnp_dir.exists():
        for f in sorted(pnp_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            # program=AIP 的表(如 NB 的 AIP 背书不受理清单)只作展示维度:AIP 与省提名是两条路,
            # 混进来会让 pnpEligible 被 AIP 的规则误伤 → 这里跳过,前端在 AIP 那一行单独判。
            if data.get("program", "PNP") != "PNP":
                continue
            prov = data.get("province")
            nocs = {o["noc"] for o in data.get("occupations", []) if o.get("noc")}
            # 空表守卫:inclusion 空=坏抓取,跳过;exclusion 空是合法政策事实
            # (ON 2026-06 改制后无职业清单 → 空排除集 = TEER0-5 全可,on-workforce-priority.json)
            if not prov or (not nocs and data.get("type") != "ineligible"):
                continue
            typ = data.get("type", "indemand")
            t = out.setdefault(prov, {"type": "indemand", "nocs": set(), "blocked": set(), "streams": []})
            if typ == "ineligible" and data.get("overlay"):
                # 叠加式排除:只记「命中即不可」,不碰 type/nocs(该省默认 TEER 规则原样保留)
                t["blocked"].update(nocs)
            elif typ == "ineligible":
                # exclusion 文件定义该省资格规则(排除集),独占 type 与 nocs —— 不与 inclusion 混
                # (否则 inclusion 的 NOC 会被并进排除集、被误判不符合)。顺序无关:exclusion 总会重置 nocs。
                t["type"] = "ineligible"
                t["nocs"] = set(nocs)
            else:
                # inclusion 文件:① 叠加具名通道标签(stream,任何省都生效,与资格 type 解耦)
                #                 ② 仅当该省非 exclusion 时,才并入资格 nocs(TEER4-5 凭清单可走)
                t["streams"].append({"label": data.get("label") or data.get("stream") or "", "nocs": nocs})
                if t["type"] != "ineligible":
                    t["nocs"].update(nocs)
    return out
PNP_BY_PROV = _load_pnp_tables()
# score() 的 +12「省点名招」按**具名通道命中**算,与资格 inclusion/exclusion 解耦。
# 对 indemand 省,这等于其 inclusion nocs(分数不变);新覆盖的是 exclusion 省(如 AB)的具名通道。
NAMED_STREAM_NOCS_BY_PROV: dict[str, set] = {}
for _p, _t in PNP_BY_PROV.items():
    _s: set = set().union(*[st["nocs"] for st in _t["streams"]]) if _t["streams"] else set()
    if _s:
        NAMED_STREAM_NOCS_BY_PROV[_p] = _s
# 联邦 Express Entry「类别抽选」清单(全国单一源,与 PNP 是两条不同路 → 独立信号,不混 pnpEligible)。
# NOC → 类别中文标签;多类别罕见,出现则 / 连接。文件无 = 不标。
def _load_ee() -> dict[str, str]:
    acc: dict[str, list[str]] = {}
    f = _paths.EE / "federal-categories.json"
    if f.exists():
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            data = {}
        for c in data.get("categories", []):
            lab = c.get("label") or c.get("key")
            for o in c.get("occupations", []):
                noc = o.get("noc")
                if noc and lab and lab not in acc.setdefault(noc, []):
                    acc[noc].append(lab)
    return {noc: "/".join(labs) for noc, labs in acc.items()}
EE_BY_NOC = _load_ee()
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

# ── E13-09 五省「普通通道」(2026-08-07 深夜拍板修口径根:inclusion 模型对 TEER4-5 系统性低估)──
# 不看职业清单的雇主/经验锚定通道,逐省锚官方原句(全文见 docs/implementation/E13-把脉首页/09_*.md §2):
# · direct = 拿 offer 即可入池:NL Skilled Worker「a full-time job or job offer: In a TEER 0, 1, 2,
#   3, 4 or 5 occupation」(gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria)
# · cond = 须先省内同雇主干满 6 个月:MB SWM(immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility)、
#   NS Skilled Worker TEER4-5(liveinnovascotia.com/skilled-worker)、NB Experience(gnb.ca
#   …/nb-skilled-worker-stream.html)、PE Critical Worker TEER4-5(pei_workforce_application_guide.pdf)
UNIVERSAL_DIRECT_PROVS = {"NL"}
UNIVERSAL_COND_PROVS = {"MB", "NS", "NB", "PE"}


def pnp_eligible(noc: str, teer: int | None, prov: str) -> bool:
    """能否走雇主 offer 省提名,按省精准(不跨省套用)。魁省不属 PNP,直接排除。
    · 命中该省叠加式排除清单(NB 不受理职业)→ 一律不可,先于一切判。
    · 有 exclusion 表的省(AB/AAIP;BC/SK;ON 2026-06 改制后空排除集=全职业可):
      TEER0-5 默认都可走,清单内 NOC 不可。
    · 其余(inclusion 表省 MB/NS/NB/PE/NL):TEER0-3 粗筛通用,TEER4-5 清单命中可,
      **清单没命中也有五省普通通道兜底**(E13-09:direct=NL 拿 offer 即可;
      cond=MB/NS/NB/PE 先省内同雇主 6 个月)——直可/需前置的区分由 pnp_direct 承担。"""
    if prov in NON_PNP_PROV:
        return False
    tbl = PNP_BY_PROV.get(prov)
    if tbl and noc in tbl["blocked"]:
        return False
    if tbl and tbl["type"] == "ineligible":
        return teer is not None and noc not in tbl["nocs"]
    nocs = tbl["nocs"] if tbl else set()
    if teer in (0, 1, 2, 3) or noc in nocs:
        return True
    return teer is not None and prov in (UNIVERSAL_DIRECT_PROVS | UNIVERSAL_COND_PROVS)


def pnp_direct(noc: str, teer: int | None, prov: str) -> bool:
    """在 pnp_eligible 之内再分档:**拿 offer 即可入池**(不需先省内工作)。
    榜A「雇主担保可提名省份」直陈行用它;eligible−direct = 「先省内工作 6 个月」灰行。
    TEER0-3 通用、排除式省默认、具名清单命中、NL 普通通道 → direct;
    仅靠 MB/NS/NB/PE 普通通道兜底的 TEER4-5 → 非 direct(cond)。"""
    if not pnp_eligible(noc, teer, prov):
        return False
    if teer in (0, 1, 2, 3):
        return True
    tbl = PNP_BY_PROV.get(prov)
    if tbl and tbl["type"] == "ineligible":
        return True
    if noc in (tbl["nocs"] if tbl else set()):
        return True
    return prov in UNIVERSAL_DIRECT_PROVS


def pnp_stream(noc: str, prov: str) -> str | None:
    """命中某省 inclusion 清单时,返回该具名通道的短标签(如「OINP 紧缺技能」)。
    泛 TEER0-3 技能岗、exclusion 型省(无具名 in-demand 通道)、未命中 → None,
    前端对 None 退回泛标签/留空(宁可不具名,也不瞎贴通道名)。"""
    tbl = PNP_BY_PROV.get(prov)
    if not tbl:
        return None
    for s in tbl["streams"]:  # 具名通道与资格 type 解耦:exclusion 省(AB)也能挂通道标签
        if noc in s["nocs"] and s["label"]:
            return s["label"]
    return None


# ── E13-08 跨通道「完全无路可走」判定 ────────────────────────────────────────
# 「无路可走」是强负断言,举证标准高于正向:每条通道锚官方原句,举不出就保守=不判死。
# · AIP 大西洋四省:job offer 须 TEER 0-4 —— 原句「for TEER 0, 1, 2 or 3 job offers …
#   for TEER 4 job offers at the same or higher skill level as your qualifying work experience」
#   https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate/job-offer.html
AIP_PROVS = {"NB", "NS", "PE", "NL"}
AIP_TEERS = {0, 1, 2, 3, 4}
# · 联邦保育专项(Home Care Worker Immigration Pilots)四 NOC 逐字锚 —— 原句
#   「HCWIP: Child Care — Home child care providers (NOC 44100) / Early childhood educators and
#   assistants (NOC 42202)」「HCWIP: Home Support — Home support workers, caregivers and related
#   occupations (NOC 44101) / Nurse aides, orderlies and patient service associates (NOC 33102)」
#   https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers/home-care-worker-immigration-pilots/child-care-home-support/eligibility.html
#   ⚠️ 2026-04 起两 stream 暂停收件(积压处理中,通道本身仍在 → 原则判定计入,不因暂停判死):
#   https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/pausing-home-care-worker-immigration-pilots-application-intake.html
CAREGIVER_NOCS = {"44100", "42202", "44101", "33102"}


def any_pr_path(noc: str, teer: int | None, prov: str) -> bool:
    """该省对该职业**原则上**是否存在任一通用 PR 通道(E13-08;粗筛信号,非资格认定)。

    口径 v2(2026-08-07 深夜 Frank 拍板「排除清单口径」,v1 的 inclusion 模型被官方原句证伪):
    **九省全部存在雇主/经验锚定的普通提名通道,不看紧缺清单、不限 TEER** —— 逐省锚句:
      · BC/AB/SK/ON:排除式资格(pnp_eligible 既有模型,TEER0-5 默认可)
      · MB SWM:同雇主 6 个月全职 + 长期 offer,无职业清单 —— immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility
        「a Manitoba company has offered you a full-time, long-term job after you have completed six months
         or more of continuous full-time employment with that company」
      · NS Skilled Worker:TEER4-5 同雇主 6 个月可走 —— liveinnovascotia.com/skilled-worker
        「Workers in TEER 4 or 5 … must already have six months' experience with the employer」
      · NB Experience:NB 雇主 + 同雇主 6 个月 + 住满 6 个月,无清单 —— …/nb-skilled-worker-stream.html
      · NL Skilled Worker:「a full-time job or job offer: In a TEER 0, 1, 2, 3, 4 or 5 occupation」
        —— gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria
      · PE:官方指南 PDF(pei_workforce_application_guide.pdf)为源;负断言举证不出「无路」→ 不判死
    因此判死只剩一种情形:**该省明文排除/不受理清单命中**(AAIP/BC/SK 排除集、NB 不受理 overlay),
    且联邦三路(EE / AIP / 保育专项)也救不回来。sector 级暂停(NS 餐饮住宿 2024-04 起)与保育专项闭门
    同属「暂停≠无路」,不判死只留痕。
    RCIP 社区级不进省判(站级脚注);QC 走自身体系不判死;teer=None 由调用方留空不硬判。"""
    tbl = PNP_BY_PROV.get(prov)
    blocked = bool(tbl) and (noc in tbl["blocked"] or (tbl["type"] == "ineligible" and noc in tbl["nocs"]))
    if not blocked:
        return True
    if teer in (0, 1, 2, 3) or noc in EE_BY_NOC:
        return True
    if prov in AIP_PROVS and teer in AIP_TEERS:
        return True
    return noc in CAREGIVER_NOCS


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
    if noc in NAMED_STREAM_NOCS_BY_PROV.get(prov, set()):
        s += 12                       # 省具名通道(点名招,inclusion/exclusion 省都算)
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
                    "pnpEligible": pnp_eligible(noc, teer, prov),
                    "pnpStream": pnp_stream(noc, prov),
                    "eeCategory": EE_BY_NOC.get(noc) or None})
    _paths.PROCESSED.mkdir(parents=True, exist_ok=True)
    (_paths.PROCESSED / "all-scored.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scored {len(out)} jobs → all-scored.json")
    print("TEER 分布:", dict(sorted(Counter(o["category"] for o in out).items())))


if __name__ == "__main__":
    main()
