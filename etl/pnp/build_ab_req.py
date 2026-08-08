"""
build_ab_req — AB(AAIP Alberta Opportunity Stream)的**门槛**。

三张表各管一件事(照 build_bc_req 惯例,别混):
  · pnp_occupations   这个职业**在不在**清单(build_ab:tech 具名 + AOS 排除清单)
  · pnp_score_factors 在了之后**能打几分**(AB 暂无分值表,B4-4)
  · pnp_requirements   打分之前**先要满足什么**(本脚本)

来源与 build_ab.py 同一个官方页(alberta.ca 直连 200,不需要浏览器)。抓这几条:
  语言  TEER 0-3 → CLB 5;TEER 4/5 → CLB 4;**NOC 33102(护理助理)单独 CLB 7**
        —— 33102 那条走 appliesNoc,引擎按「最具体的那行胜出」自动盖过通用档(同 ON 技工低档的机制)
  经验  24 个月(近 30 个月内,加拿大境内外都算)

**只收 24 个月那条,不收「阿省境内 12 个月」那条**:官方两条是「或」的关系,但本站问的经验是
「同职业总经验(境内外)」——拿境内 12 个月的门槛去比一个境内外合计的数,会把门槛说低,
说低比不说更危险(用户会据此决定跳不跳槽)。境内那条写进 label 陈述,不作判定阈值。

**没抓的**:学历(高中及以上,与本站题库口径对不上)、最低收入(AOS 官方**不设**家庭收入门槛 ——
全国只有 BC 发布了收入表,别省一律没有,这本身是结论,不是缺口)。

**雇主侧(B2 补,2026-08-08)**:上面那句「AOS 不设经营年限/营业额/雇员数」是错的 —— 之前只读了
Eligibility 页(申请人侧),没读它链接指向的
`Job offer and employer requirements` 页(alberta.ca 直连 200,同一站点):
官方原句「have been in continuous and active operation in Alberta for a minimum of 2 complete
fiscal years」「have a minimum total gross annual revenue of $400,000 for the most recent fiscal
year」「employment of a minimum of 3 full-time (or full-time equivalent) employees in Alberta」——
三个数全province-wide、不分区(不同于 BC/ON 按大温/GTA 内外分档)。
官方还给了「够不上 400k/3 人时按经营年限算配额上限(2 年→1 个提名、3 年→2 个……)」和「公共部门
雇主免营业额/雇员数要求」两条豁免/换算规则,**不落成阈值行**:前者是名额换算不是资格线,后者是
公共部门整体不进这套判定(设计 §1 已单独处理),硬塞成 empRevenue/empStaff 的一行会被规则引擎当
成「这也是道数值门槛」误读。

自校是硬闸(照 build_bc_req / build_on_req):任何一组没解析到就**保留旧表不覆盖**并 exit 1。
门槛错一位比没有更危险。

Usage:  uv run python etl/pnp/build_ab_req.py
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

AOS_URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility"
# B2(2026-08-08):雇主侧门槛的官方页——AOS eligibility 页正文里点名「must meet all Alberta job offer
# and employer requirements」链到的页,alberta.ca 直连 200,不在 data/crawl/ab-aaip 缓存里(种子只爬了
# AAIP 命名空间下的页,这条不在种子深度内),按铁律③(缓存没有→可 httpx 直取省官网)现抓。
EMPLOYER_URL = "https://www.alberta.ca/job-offer-and-employer-requirements"
OUT = _paths.PNP / "ab-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "AB"
PROGRAM = "PNP"
STREAM = "AAIP Alberta Opportunity Stream"

# 官方原句(压成一行之后):
#   「If you are working in a NOC 0, 1, 2 or 3 occupation Minimum of 5 for each English language skill」
RE_LANG_TIER = re.compile(
    r"If you are working in a NOC ([\d, ]*or \d) occupation Minimum of (\d) for each English language skill", re.I)
#   「under NOC code 33102 (nurse aides…), the AAIP requires a minimum language test score of CLB of 7」
RE_LANG_NOC = re.compile(
    r"under NOC code (\d{5}) \(([^)]+)\), the AAIP requires a minimum language test score of CLB of (\d)", re.I)
#   「a minimum of 24 months of full-time work experience in your current occupation in Canada or abroad
#    within the last 30 months」
RE_EXP_ANY = re.compile(
    r"a minimum of (\d+) months of full-time work experience in your current occupation in Canada or abroad "
    r"within the last (\d+) months", re.I)
#   境内那条只用来写进 label(不作阈值),但解析不到说明页面改版了 → 同样进自校
RE_EXP_AB = re.compile(
    r"a minimum of (\d+) months full-time work experience in your current occupation in Alberta "
    r"within the last (\d+) months", re.I)

# ── 雇主侧(B2)三条,Job offer and employer requirements 页 ─────────────────────
#   「have been in continuous and active operation in Alberta for a minimum of 2 complete fiscal years」
RE_EMP_YEARS = re.compile(
    r"have been in continuous and active operation in Alberta for a minimum of (\d+) complete fiscal years", re.I)
#   「have a minimum total gross annual revenue of $400,000 for the most recent fiscal year」
RE_EMP_REVENUE = re.compile(
    r"have a minimum total gross annual revenue of \$([\d,]+) for the most recent fiscal year", re.I)
#   「employment of a minimum of 3 full-time (or full-time equivalent) employees in Alberta」
RE_EMP_STAFF = re.compile(
    r"employment of a minimum of (\d+) full-time \(or full-time equivalent\) employees in Alberta", re.I)


def page_text(url: str) -> str:
    html = httpx.get(url, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def teers(s: str) -> list[int]:
    """'0, 1, 2 or 3' → [0,1,2,3];官方就是这么写的,别自己推区间。"""
    return [int(x) for x in re.findall(r"\d", s)]


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": AOS_URL}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    txt = page_text(AOS_URL)
    reqs: list[dict] = []
    problems: list[str] = []

    # ── 语言:按 TEER 两档 ───────────────────────────────────────────────────────
    tiers = RE_LANG_TIER.findall(txt)
    for band, clb in tiers:
        reqs.append(req(factor="language", value=int(clb), unit="CLB", appliesTeer=teers(band),
                        section="Language requirements — Table 2",
                        label=f"CLB {clb} in each English (or NCLC {clb} in each French) language skill "
                              f"for occupations in NOC TEER {band}"))
    if len(tiers) != 2:
        problems.append(f"语言两档解析到 {len(tiers)} 条(官方 TEER 0-3 / TEER 4-5 各一条)")
    else:
        hi, lo = int(tiers[0][1]), int(tiers[1][1])
        if not hi > lo:
            problems.append(f"语言两档读反了(TEER 0-3 {hi} 应高于 TEER 4/5 {lo})")

    # ── 语言:33102 单独一档(appliesNoc → 引擎自动盖过通用档)────────────────────
    m = RE_LANG_NOC.search(txt)
    if m:
        reqs.append(req(factor="language", value=int(m.group(3)), unit="CLB", appliesNoc=m.group(1),
                        section="Language requirements",
                        label=f"CLB {m.group(3)} in each English (or NCLC {m.group(3)} in each French) language "
                              f"skill for NOC {m.group(1)} ({m.group(2)})"))
    else:
        problems.append("33102 的单独语言档没解析到")

    # ── 经验:只收「境内外都算」那条(见文件头)────────────────────────────────
    any_ = RE_EXP_ANY.search(txt)
    ab = RE_EXP_AB.search(txt)
    if any_ and ab:
        reqs.append(req(factor="experience", value=int(any_.group(1)), unit="months",
                        section="Work experience requirements",
                        label=f"{any_.group(1)} months of full-time work experience in your current occupation "
                              f"in Canada or abroad within the last {any_.group(2)} months "
                              f"(alternatively {ab.group(1)} months in Alberta within the last {ab.group(2)} months)"))
    else:
        problems.append("工作经验门槛没解析到(境内外 24 个月 / 阿省 12 个月两条须同时在)")

    # ── 雇主侧(B2):经营年限 + 营业额 + 全职雇员数,三条都是 province-wide 不分区 ──────
    emp_txt = page_text(EMPLOYER_URL)
    m_years, m_rev, m_staff = RE_EMP_YEARS.search(emp_txt), RE_EMP_REVENUE.search(emp_txt), RE_EMP_STAFF.search(emp_txt)
    for m, what in ((m_years, "经营年限"), (m_rev, "营业额"), (m_staff, "全职雇员数")):
        if not m:
            problems.append(f"雇主侧「{what}」没解析到(job-offer-and-employer-requirements 页可能改版)")
    if m_years and m_rev and m_staff:
        emp_stream = "AAIP (job offer & employer requirements, all streams)"
        reqs.append(req(stream=emp_stream, subject="employer", factor="empYears", value=int(m_years.group(1)),
                        unit="years", url=EMPLOYER_URL, section="Job offer and employer requirements — Employer requirements",
                        label=f"The Alberta employer must have been in continuous and active operation in Alberta "
                              f"for a minimum of {m_years.group(1)} complete fiscal years (the year used for tax or "
                              f"accounting purposes) prior to application submission"))
        reqs.append(req(stream=emp_stream, subject="employer", factor="empRevenue",
                        value=int(m_rev.group(1).replace(",", "")), unit="CAD/yr", url=EMPLOYER_URL,
                        section="Job offer and employer requirements — Employer requirements",
                        label=f"The Alberta employer must have a minimum total gross annual revenue of "
                              f"${m_rev.group(1)} for the most recent fiscal year (the year used for tax or "
                              f"accounting purposes)"))
        reqs.append(req(stream=emp_stream, subject="employer", factor="empStaff", value=int(m_staff.group(1)),
                        unit="employees", url=EMPLOYER_URL,
                        section="Job offer and employer requirements — Employer requirements",
                        label=f"Employment of a minimum of {m_staff.group(1)} full-time (or full-time equivalent) "
                              f"employees in Alberta (independent contractors do not count; two part-time employees "
                              f"may count as one full-time equivalent at an average of 30+ hours/week combined). "
                              f"If an employer cannot meet the revenue and staff minimums, it may still qualify but "
                              f"is capped on the number of nominees it can support based on years of operation "
                              f"(2 years → 1 nominee, 3 years → 2 nominees, +1 per additional year); Indigenous, "
                              f"municipal, provincial, Government of Canada and Government of Alberta employers are "
                              f"exempt from the revenue and staff minimums"))

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "AAIP — Alberta Opportunity Stream eligibility",
        "url": AOS_URL, "pageUrl": AOS_URL,
        "guideEffective": "",        # 官方网页不印生效日期(不同于 BC/NS/PE 的指南 PDF)
        "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  共 {len(reqs)} 条门槛")
    for f in ("language", "experience", "empYears", "empRevenue", "empStaff"):
        print(f"  {f:12} {sum(1 for x in reqs if x['factor'] == f)} 条")


if __name__ == "__main__":
    main()
