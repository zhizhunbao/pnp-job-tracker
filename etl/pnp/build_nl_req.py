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

# ── International Graduate 通道(2026-08-05 补)──────────────────────────────
# 为什么补:人工复盘 C01 把这条排为「Day 0 唯一可递交」的第一路径,而引擎一个字说不出来 ——
# 库里 NL 只有 Skilled Worker 那 5 行。**它是本站唯一一条不设工作经验门槛的省提名通道**,
# 对「刚毕业 0 经验」这一整类用户,少了它整份回答就少了最优解。
# URL 不是猜的(CLAUDE.md 铁律):#4 那页当时不在 crawl 里,href 是从已抓的
# `international-graduate-category` 分类页正文里抠出来的。
IG_URL = "https://www.gov.nl.ca/immigration/4-international-graduate-category-eligibility-criteria"
IG_LANG_URL = "https://www.gov.nl.ca/immigration/11-language-testing-international-graduate"
STREAM_IG = "NLPNP International Graduate Category"

# 官方那份「Applicants must:」清单是**穷举式**的,下面每条对着一句原文
RE_IG_PGWP = re.compile(r"Post-Graduation work permit \(PGWP\) that has at least (\w+) \((\d+)\) months? validity", re.I)
RE_IG_TEER = re.compile(r"In a NOC TEER level ([\d, ]*or \d) occupation", re.I)
RE_IG_HOURS = re.compile(r"minimum of \w+ \((\d+)\) hours per week", re.I)
RE_IG_MONTHS = re.compile(r"at least one \(1\) year \(twelve \((\d+)\) months\) in duration", re.I)
RE_IG_AGE = re.compile(r"Be (\d+) to (\d+) years old", re.I)
# 🔴 op='none' 是**断言没有这条门槛**,不是「我们没查到」。所以拿这个反向正则自证:
#    官方清单里但凡出现「工作经验」字样,就说明它其实有要求 → 不发这一行,并报问题。
RE_IG_EXPERIENCE = re.compile(r"(?:work|employment) experience|(?:months|years) of experience", re.I)
# 语言页:TEER 4(in-demand)必考 CLB N;TEER 0-3 不强制 —— 但官方留了酌情权,这句不能漏
RE_IG_LANG_CLB = re.compile(r"Canadian Language Benchmark \(CLB\) (\d) in each", re.I)
RE_IG_LANG_TEER4 = re.compile(r"TEER Category 4 \(in-demand\) occupation must submit proof of language", re.I)
RE_IG_LANG_DISCRETION = re.compile(r"discretion to request language testing.{0,120}TEER Level 0, 1, 2 or 3", re.I | re.S)

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

    # ── International Graduate 通道 ────────────────────────────────────────────
    ig_txt, ig_lang_txt = page_text(IG_URL), page_text(IG_LANG_URL)
    m_pgwp, m_teer = RE_IG_PGWP.search(ig_txt), RE_IG_TEER.search(ig_txt)
    m_hours, m_months, m_age = RE_IG_HOURS.search(ig_txt), RE_IG_MONTHS.search(ig_txt), RE_IG_AGE.search(ig_txt)
    ig_clbs = {int(x) for x in RE_IG_LANG_CLB.findall(ig_lang_txt)}
    m_t4, m_disc = RE_IG_LANG_TEER4.search(ig_lang_txt), RE_IG_LANG_DISCRETION.search(ig_lang_txt)
    for m, what in ((m_pgwp, "PGWP 剩余有效期"), (m_teer, "收的 TEER 档位"), (m_hours, "每周最低小时数"),
                    (m_months, "offer 最短时长"), (m_age, "年龄区间"), (m_t4, "TEER 4 必考语言那句"),
                    (m_disc, "官方对 TEER 0-3 保留的语言酌情权那句")):
        if not m:
            problems.append(f"IG 通道「{what}」没解析到(资格页可能改版)")
    if len(ig_clbs) != 1:
        problems.append(f"IG 语言档解析到 {sorted(ig_clbs)} 个 —— 需人工核对")

    if all((m_pgwp, m_teer, m_hours, m_months, m_age, m_t4, m_disc)) and len(ig_clbs) == 1:
        ig_clb = next(iter(ig_clbs))
        ig_teers = teers(m_teer.group(1))                      # 0,1,2,3(TEER 4 另有 in-demand 限定)
        # ① 语言:TEER 4(in-demand)必考
        reqs.append(req(stream=STREAM_IG, factor="language", value=ig_clb, unit="CLB", appliesTeer=[4], url=IG_LANG_URL,
                        section="International Graduate — Language Testing",
                        label=f"An offer in a TEER 4 (in-demand) occupation must come with a language test at "
                              f"CLB/NCLC {ig_clb} in each of the four abilities"))
        # ② 语言:TEER 0-3 不强制 —— 但**必须带上官方那句酌情权**,不然就是替官方打包票
        reqs.append(req(stream=STREAM_IG, factor="language", op="none", appliesTeer=ig_teers, url=IG_LANG_URL,
                        section="International Graduate — Language Testing",
                        label=f"No language test is required up front for an offer in TEER "
                              f"{', '.join(str(t) for t in ig_teers)}; the officer may still request one at their "
                              f"discretion regardless of the TEER level"))
        # ③ 🔴 **本站唯一一条「不设工作经验门槛」的省提名通道** —— 这是它的全部价值所在。
        #    官方那份「Applicants must:」是穷举清单,通篇没有经验这一项;上面的反向正则替这句话作证。
        if RE_IG_EXPERIENCE.search(ig_txt):
            problems.append("IG 资格页出现了「工作经验」字样 —— 「不设经验门槛」这条断言不再成立,须人工重读")
        else:
            reqs.append(req(stream=STREAM_IG, factor="experience", op="none", appliesTeer=[*ig_teers, 4], url=IG_URL,
                            section="International Graduate Category Eligibility Criteria",
                            label=f"This category sets no minimum work-experience requirement: the published "
                                  f"criteria are a PGWP with at least {m_pgwp.group(2)} months validity left plus a "
                                  f"job offer of at least {m_months.group(1)} months at "
                                  f"{m_hours.group(1)}+ hours a week, applicant aged {m_age.group(1)}-{m_age.group(2)}"))

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
