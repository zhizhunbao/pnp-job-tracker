"""
build_nl_req — NL(NLPNP Skilled Worker)的**门槛**。走官方资格政策页(gov.nl.ca 直连 200)。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_nl:优先处理职位——职位名文本非 NOC,不参与打分)
  · pnp_score_factors 能打几分(NL 无分值表 —— EOI 择优,官方只发邀请数不发分数线)
  · pnp_requirements   打分之前先要满足什么(本脚本)

NL 这份的看点是**分档方式跟别省相反**:官方明说 Skilled Worker 收 TEER 0-5 全档,
但**只有 TEER 4/5 要交语言成绩**,TEER 0-3 不要求 —— 对高技能岗来说这是全国最松的一条。
所以本脚本产出两行:
  · TEER 4/5   language CLB 4(官方逐项列了 IELTS/CELPIP/PTE/TEF/TCF 的 CLB 4 等值分)
  · TEER 0-3   language op='none'(官方不要求交成绩;引擎见 op='none' 出「这档不设成绩门槛」)
**TEER 0-3 那一档是算出来的,不是写死的**:从官方「In a TEER 0, 1, 2, 3, 4 or 5 occupation」
减去「Applicants with TEER 4 or 5 job offers must submit …」的那一档 —— 官方哪天收窄了档位,
这里跟着变,不用改代码。

**没抓的**:
  · 经验:NL 不设通用年限门槛,只要求「具备该 NOC 的 employment requirements」(职业本身的要求,
    每个 NOC 不同,不是省门槛)。硬塞一个数是编的。
  · 年龄 21-59、结算资金(官方只写「足够」不发数额)、雇主 JVA(引擎无对应因素)。
  · 最低收入:NL **不设**收入表(全国只有 BC 发布;这是结论不是缺口)。

自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_nl_req.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

POLICY_URL = "https://www.gov.nl.ca/immigration/4-skilled-worker-category-eligibility-criteria/"
PAGE_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
            "provincial-nominee-program/applicants/skilled-worker-category/")
# B2-4(2026-08-03):雇主侧门槛 —— NLPNP 官方雇主资格页发的正是引擎那套形状:
# 现管经营 ≥2 年(特殊情形 1 年)+ 本地全职雇员(圣约翰斯区 ≥2 / 区外 ≥1)
EMPLOYER_URL = ("https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/"
                "provincial-nominee-program/employers/employer-criteria")
OUT = _paths.PNP / "nl-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "NL"
PROGRAM = "PNP"
STREAM = "NLPNP Skilled Worker Category"

# 「In a TEER 0, 1, 2, 3, 4 or 5 occupation」—— 本通道收的全部档位
RE_ALL_TEERS = re.compile(r"In a TEER ([\d, ]*or \d) occupation", re.I)
# 「Applicants with TEER 4 or 5 job offers must submit a valid language proficiency test」
RE_TEST_TEERS = re.compile(r"Applicants with TEER ([\d ]*or \d) job offers must submit a valid language "
                           r"proficiency test", re.I)
# 「Minimum scores (CLB 4 equivalent)」—— 逐个考试重复,取唯一值
RE_CLB = re.compile(r"Minimum scores \(CLB (\d) equivalent\)", re.I)

# ── 雇主侧(B2-4)——三个数各一条正则,任何一条没解析到整表不更新 ──────────────
# 「Operated under current management for at least 2 years (or 1 year in special cases)」
RE_EMP_YEARS = re.compile(r"Operated under current management for at least (\d+) years?", re.I)
# 「In St. John's area: at least 2 full-time local employees」(弯引号在 page_text 已压成空白无碍)
RE_STAFF_SJ = re.compile(r"In St\.?\s*John.{0,3}s area:? at least (\d+) full-?time local employees?", re.I)
# 「Outside St. John's: at least 1 full-time local employee」
RE_STAFF_OUT = re.compile(r"Outside St\.?\s*John.{0,3}s:? at least (\d+) full-?time local employees?", re.I)


def page_text(url: str) -> str:
    html = httpx.get(url, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "nav", "header", "footer"]):
        t.decompose()
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def teers(s: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d", s)]


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": POLICY_URL}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    txt = page_text(POLICY_URL)
    reqs: list[dict] = []
    problems: list[str] = []

    all_m, test_m = RE_ALL_TEERS.search(txt), RE_TEST_TEERS.search(txt)
    clbs = {int(x) for x in RE_CLB.findall(txt)}
    if not all_m:
        problems.append("通道收的 TEER 档位没解析到")
    if not test_m:
        problems.append("「哪些 TEER 要交语言成绩」没解析到")
    if not clbs:
        problems.append("语言等值档(CLB N equivalent)没解析到")
    elif len(clbs) > 1:
        problems.append(f"页面里出现多个语言档 {sorted(clbs)} —— 官方可能已分档,需人工核对")

    if all_m and test_m and len(clbs) == 1:
        clb = next(iter(clbs))
        need, whole = teers(test_m.group(1)), teers(all_m.group(1))
        exempt = [t for t in whole if t not in need]
        if not need or not exempt:
            problems.append(f"档位算不出来:全档 {whole},要考的 {need}")
        else:
            reqs.append(req(factor="language", value=clb, unit="CLB", appliesTeer=need,
                            section="Skilled Worker Category Eligibility Criteria — language",
                            label=f"Applicants with NOC TEER {test_m.group(1)} job offers must submit a valid "
                                  f"language test at CLB/NCLC {clb} equivalent, valid throughout processing"))
            reqs.append(req(factor="language", op="none", appliesTeer=exempt,
                            section="Skilled Worker Category Eligibility Criteria — language",
                            label=f"No language test is required for NOC TEER "
                                  f"{', '.join(str(t) for t in exempt)} job offers; the category accepts job offers "
                                  f"in TEER {all_m.group(1)} occupations"))

    # ── 雇主侧(B2-4):经营年限(全省)+ 本地全职雇员(圣约翰斯区/区外两档,照 BC 大温内外先例)──
    emp_txt = page_text(EMPLOYER_URL)
    m_years, m_sj, m_out = RE_EMP_YEARS.search(emp_txt), RE_STAFF_SJ.search(emp_txt), RE_STAFF_OUT.search(emp_txt)
    for m, what in ((m_years, "经营年限"), (m_sj, "圣约翰斯区雇员数"), (m_out, "区外雇员数")):
        if not m:
            problems.append(f"雇主侧「{what}」没解析到(雇主资格页可能改版)")
    if m_years and m_sj and m_out:
        emp_stream = "NLPNP (employer criteria, all streams)"
        reqs.append(req(stream=emp_stream, subject="employer", factor="empYears", value=int(m_years.group(1)),
                        unit="years", url=EMPLOYER_URL, section="Employer Criteria — established in NL",
                        label=f"Employer must be permanently based in NL, registered with Service NL, and operated "
                              f"under current management for at least {m_years.group(1)} years (1 year in special cases)"))
        reqs.append(req(stream=emp_stream, subject="employer", factor="empStaff", value=int(m_sj.group(1)),
                        unit="employees", appliesArea="st-johns", url=EMPLOYER_URL,
                        section="Employer Criteria — local staff",
                        label=f"In the St. John's area: at least {m_sj.group(1)} full-time local employees"))
        reqs.append(req(stream=emp_stream, subject="employer", factor="empStaff", value=int(m_out.group(1)),
                        unit="employees", appliesArea="rest-of-nl", url=EMPLOYER_URL,
                        section="Employer Criteria — local staff",
                        label=f"Outside St. John's: at least {m_out.group(1)} full-time local employee(s)"))

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "NLPNP — Skilled Worker Category Eligibility Criteria Policy",
        "url": POLICY_URL, "pageUrl": PAGE_URL,
        "guideEffective": "",       # 官方政策页不印生效日期
        "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  共 {len(reqs)} 条门槛")
    for r in reqs:
        print(f"  TEER {r['appliesTeer']}  op={r['op']}  CLB={r['value']}")


if __name__ == "__main__":
    main()
