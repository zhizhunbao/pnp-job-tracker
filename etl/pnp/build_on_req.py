"""
build_on_req — ON(OINP)Workforce Priority 通道的门槛。规则引擎第二刀,**雇主侧是重点**
(Frank 2026-07-31:「现在 OINP 对雇主也有要求了」)。

两个官方页(ontario.ca 直连 200,不需要浏览器):
  · 通道页    /page/ontario-workforce-priority-stream        申请人侧:语言(按 TEER,技工另有低档)
  · 雇主指南  /page/oinp-employer-job-offer-streams-employer-guide  雇主侧:经营年限 / 营业额 / 全职雇员数 + 工资档

抓这几条(每条带官方原文与出处页):
  申请人  language      TEER 0-3 非技工 CLB 6;TEER 0-3 技工 CLB 5(NOC 大组白名单);TEER 4/5 CLB 4
          languageExempt 近 3 年安省院校指定学历可免考(本站没问学历 → 报告里只陈述,不判定)
          wage          basis=occMedian:不低于该职业该地区的**中位工资档**(官方按 Job Bank 工资报告)
  雇主    empYears      在营 ≥3 年
          empRevenue    GTA $1,000,000 / 指定普查区 $500,000 / 其余 $250,000(后者按近两个财年)
          empStaff      GTA ≥5 名、GTA 外 ≥3 名(须为公民/PR,周 30 小时以上)

**没抓的**:工作经验(官方按「同一雇主同一岗位近 12 个月连续 6 个月 / 安省应届 3 个月 / 部分职业
近 5 年累计 2 年」三套并行,且绑定「同一岗位」——本站问的是通用经验,对不上就不硬套,留空=不收录)。

自校是硬闸(照 build_bc_req):任何一组没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_on_req.py
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

STREAM_URL = "https://www.ontario.ca/page/ontario-workforce-priority-stream"
EMPLOYER_URL = "https://www.ontario.ca/page/oinp-employer-job-offer-streams-employer-guide"
OUT = _paths.PNP / "on-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120 Safari/537.36"}

PROVINCE = "ON"
PROGRAM = "PNP"
STREAM = "Ontario Workforce Priority stream"
GTA = "gta"                  # 多伦多市 + Durham/Halton/Peel/York
LISTED = "on-listed-cd"      # 官方点名的普查区(Ottawa/Waterloo/Hamilton…)
OTHER = "on-other"           # 其余任何地点
OUTSIDE_GTA = "outside-gta"  # 雇员数那条只分 GTA 内外两档
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}

RE_EMP_YEARS = re.compile(r"in active business for at least (\w+) years", re.I)
RE_REV_GTA = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue if the employee will work or "
                        r"report to work at a location in the Greater Toronto Area", re.I)
RE_REV_LISTED = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue if the employee will work or "
                           r"report to work at a location in the following census divisions", re.I)
RE_REV_OTHER = re.compile(r"minimum of \$([\d,]+) in total gross annual revenue in the last two most recently "
                          r"completed fiscal years", re.I)
RE_STAFF = re.compile(r"report to work at a location (in|outside) the GTA ?, your business must have at least "
                      r"(\d+) full-time employees who are Canadian citizens or permanent residents", re.I)
RE_LANG_GENERAL = re.compile(r"CLB level (\d) or higher in all four proficiencies, if your job offer employment "
                             r"position is not a NOC occupation listed as a skilled trade", re.I)
RE_LANG_TRADES = re.compile(r"CLB level (\d) or higher in all four proficiencies, if your job offer employment "
                            r"position is a NOC occupation listed as a skilled trade", re.I)
RE_LANG_45 = re.compile(r"TEER category 4 or 5 employment position, you must have a CLB level (\d) or higher", re.I)
RE_LANG_EXEMPT = re.compile(r"proof that you graduated from an eligible Ontario institution within the last "
                            r"(\d) years", re.I)
RE_WAGE = re.compile(r"must meet or exceed the wage level assigned to the specific region of Ontario where the "
                     r"employee will be working and be at or above either: the median wage level", re.I)
# 技工白名单:官方逐条列「Major/Minor/Unit Group NN」,个别条目自带「excluding … Sub-Major Group NNN」
RE_TRADE_LINE = re.compile(r"(?:Major|Minor|Unit) Group (\d{2,5})\s*[-–—]\s*(.*?)(?=(?:Major|Minor|Unit) Group |$)", re.I)
RE_TRADE_EXCL = re.compile(r"excluding[^)]*?Group (\d{3,5})", re.I)


def page_text(url: str) -> str:
    html = httpx.get(url, headers=UA, follow_redirects=True, timeout=40).text
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": "", "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": STREAM_URL}
    return {**base, **kw}


def main() -> None:
    stream_txt = page_text(STREAM_URL)
    emp_txt = page_text(EMPLOYER_URL)
    reqs: list[dict] = []
    problems: list[str] = []

    # ── 申请人:语言(按 TEER;技工低一档)────────────────────────────────────
    g, t45 = RE_LANG_GENERAL.search(stream_txt), RE_LANG_45.search(stream_txt)
    tr = RE_LANG_TRADES.search(stream_txt)
    if g:
        reqs.append(req(factor="language", value=int(g.group(1)), unit="CLB", appliesTeer="0,1,2,3",
                        section="Applicant requirements — Language",
                        label=f"CLB {g.group(1)} in all four proficiencies (TEER 0-3, non-trades occupations)"))
    else:
        problems.append("语言(TEER 0-3 非技工)没解析到")
    if t45:
        reqs.append(req(factor="language", value=int(t45.group(1)), unit="CLB", appliesTeer="4,5",
                        section="Applicant requirements — Language",
                        label=f"CLB {t45.group(1)} in all four proficiencies (TEER 4 or 5)"))
    else:
        problems.append("语言(TEER 4/5)没解析到")

    # 技工白名单:官方列的是 NOC 大组前缀(72/73/82/83/93/6320/62200),含两处「excluding …」
    trades_block = ""
    m = re.search(r"Skilled Trades occupations The following NOCs qualify as a listed skilled trades occupation:"
                  r"(.*?)Job offer for a TEER category 4 or 5", stream_txt, re.I)
    if m:
        trades_block = m.group(1)
    groups = [x[0] for x in RE_TRADE_LINE.findall(trades_block)]
    excl = RE_TRADE_EXCL.findall(trades_block)
    if tr and groups:
        reqs.append(req(factor="language", value=int(tr.group(1)), unit="CLB", appliesTeer="0,1,2,3",
                        appliesNoc=",".join(groups), excludesNoc=",".join(excl),
                        section="Applicant requirements — Language (skilled trades)",
                        label=f"CLB {tr.group(1)} in all four proficiencies (TEER 0-3, listed skilled trades: "
                              f"NOC groups {', '.join(groups)}"
                              + (f"; excluding {', '.join(excl)}" if excl else "") + ")"))
    else:
        problems.append("语言(技工低档 / NOC 大组白名单)没解析到")

    # 免考条款:本站没问学历 → 只陈述不判定(op='none' + 单独 factor,不会被误当成「没有语言要求」)
    ex = RE_LANG_EXEMPT.search(stream_txt)
    if ex:
        reqs.append(req(factor="languageExempt", op="none", appliesTeer="0,1,2,3", value=int(ex.group(1)), unit="years",
                        section="Applicant requirements — Language",
                        label=f"No language test required if you graduated from an eligible Ontario institution "
                              f"within the last {ex.group(1)} years (2-year+ postsecondary credential, Ontario "
                              f"College Graduate Certificate, Master's or PhD)"))
    else:
        problems.append("语言免考条款没解析到")

    # ── 申请人:工资档(设计 §2 的 basis=occMedian —— 阈值不是绝对数,而是该职业该地区的中位)──
    if RE_WAGE.search(emp_txt):
        reqs.append(req(factor="wage", op=">=", basis="occMedian", unit="CAD/yr", url=EMPLOYER_URL,
                        section="Employer guide — Position is at the required wage level",
                        label="The offered wage must meet or exceed the median wage level for the occupation in "
                              "the Ontario employment region (low wage level allowed for recent Ontario graduates "
                              "in TEER 0-3)"))
    else:
        problems.append("工资档(median wage level)没解析到")

    # ── 雇主侧:经营年限 / 营业额三档 / 雇员数两档 ────────────────────────────
    y = RE_EMP_YEARS.search(emp_txt)
    if y and y.group(1).lower() in WORDS:
        reqs.append(req(subject="employer", factor="empYears", value=WORDS[y.group(1).lower()], unit="years",
                        url=EMPLOYER_URL, section="Employer guide — General requirements",
                        label=f"Business must have been in active business for at least {y.group(1)} years"))
    else:
        problems.append("雇主经营年限没解析到")

    rev = [(GTA, RE_REV_GTA, "Greater Toronto Area (Toronto, Durham, Halton, Peel, York)"),
           (LISTED, RE_REV_LISTED, "listed census divisions (Ottawa, Waterloo, Hamilton, Simcoe, Middlesex, "
                                   "Niagara, Peterborough, Hastings, Thunder Bay and others named in the guide)"),
           (OTHER, RE_REV_OTHER, "any other location in Ontario (last two completed fiscal years)")]
    for area, pat, where in rev:
        mm = pat.search(emp_txt)
        if not mm:
            problems.append(f"雇主营业额档没解析到:{area}")
            continue
        reqs.append(req(subject="employer", factor="empRevenue", value=int(mm.group(1).replace(",", "")),
                        unit="CAD/yr", appliesArea=area, url=EMPLOYER_URL,
                        section="Employer guide — Revenue requirement",
                        label=f"Gross annual revenue of at least ${mm.group(1)} where the employee works: {where}"))

    staff = RE_STAFF.findall(emp_txt)
    for where, n in staff:
        area = GTA if where.lower() == "in" else OUTSIDE_GTA
        reqs.append(req(subject="employer", factor="empStaff", value=int(n), unit="employees", appliesArea=area,
                        url=EMPLOYER_URL, section="Employer guide — Full-time employee requirements",
                        label=f"At least {n} full-time employees who are Canadian citizens or permanent residents "
                              f"at the work location ({'inside' if area == GTA else 'outside'} the GTA)"))
    if len(staff) != 2:
        problems.append(f"雇主雇员数解析到 {len(staff)} 档(官方 GTA 内外各一档)")

    # 档位合理性:营业额必须 GTA > 指定普查区 > 其余;雇员数 GTA > 外(读反了会把门槛说低)
    rv = {r["appliesArea"]: r["value"] for r in reqs if r["factor"] == "empRevenue"}
    if len(rv) == 3 and not (rv[GTA] > rv[LISTED] > rv[OTHER]):
        problems.append(f"雇主营业额三档不是递减:{rv}")
    sv = {r["appliesArea"]: r["value"] for r in reqs if r["factor"] == "empStaff"}
    if len(sv) == 2 and not sv[GTA] > sv[OUTSIDE_GTA]:
        problems.append(f"雇主雇员数两档读反了:{sv}")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "OINP — Ontario Workforce Priority stream & employer guide",
        "url": STREAM_URL, "pageUrl": EMPLOYER_URL,
        # 官方网页不印生效日期(不同于 BC 的 Program Guide PDF);制度锚点是 O. Reg. 422/17 改制
        "guideEffective": "", "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  共 {len(reqs)} 条门槛")
    for f in ("language", "languageExempt", "wage", "empYears", "empRevenue", "empStaff"):
        print(f"  {f:15} {sum(1 for x in reqs if x['factor'] == f)} 条")


if __name__ == "__main__":
    main()
