"""
build_bc_req — BC PNP 的**门槛**(不是分数、不是清单)。规则引擎第一刀的数据底座。

三张表各管一件事,别混:
  · pnp_occupations   这个职业**在不在**公开清单(build_bc 等)
  · pnp_score_factors 在了之后**能打几分**(build_bc_sirs / build_sk_points)
  · pnp_requirements   打分之前**先要满足什么**(本脚本)—— 语言、最低家庭收入、经验、雇主侧

来源与 build_bc_sirs 同一份官方 PDF(Skills Immigration Program Guide;网页正文只写「详见指南」)。
抓这几条(每条都带官方原文与节号,报告里每句话都能点回去核对):
  3.4  语言:TEER 2/3/4/5 → 四项均 CLB 4;TEER 0/1 → 注册时不强制交成绩(op='none',不是「没要求」)
  3.10 最低家庭收入:家庭人数 × 居住区域(大温 / BC 其余)二维表,7×2 = 14 行
  4.1(c) 技术工人通道:近十年内 ≥2 年 TEER 0-3 工作经验(24 个月)
  6.7/6.8 **雇主侧**门槛(subject='employer'):在 BC 经营满 1 年;大温 ≥5 名全职雇员、大温外 ≥3 名
         —— 这几项本站没有雇主事实,报告里一律 unknown 说「要雇主出材料」,不猜不编

自校是硬闸(照 build_bc_sirs / build_sk_points 惯例):任何一组没解析到就**保留旧表不覆盖**并 exit 1。
门槛错一位比没有更危险 —— 用户会照着它决定考不考雅思、跳不跳槽。

Usage:  uv run python etl/pnp/build_bc_req.py
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import fitz  # pymupdf
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

PDF_URL = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf"
PAGE_URL = "https://www.welcomebc.ca/immigrate-to-b-c/for-workers"
OUT = _paths.PNP / "bc-req.json"

PROVINCE = "BC"
PROGRAM = "PNP"
ALL_STREAMS = "BC PNP Skills Immigration (all streams)"      # Part 3/6 是通用要求,逐条落到每个通道
SKILLED_WORKER = "BC PNP Skilled Worker stream"              # 4.1 专属
METRO = "metro-vancouver"
REST = "rest-of-bc"

# 页眉页脚(每页重复)先剥掉再把全文压成一行 —— 否则每个句子都被分页切成两半,正则得写成天书
FURNITURE = [
    re.compile(r"BC PNP Skills Immigration Program Guide"),
    re.compile(r"\d+ \| ?P a g e"),
    re.compile(r"===PAGE \d+==="),
    re.compile(r"The information in the guide is effective [A-Z][a-z]+ \d{1,2}, \d{4}\."
               r" ?Please check our website to ensure you are using the correct version\."),
]
FOOTER_DATE = re.compile(r"information in the guide is effective ([A-Z][a-z]+ \d{1,2}, \d{4})")
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
         "seven": 7, "eight": 8, "nine": 9, "ten": 10}

# ── 各条门槛的取值正则(全部跑在「剥页眉 + 压成一行」之后的全文上)────────────────
RE_LANG_CLB = re.compile(
    r"classified under NOC TEER ([\d, ]*?or \d)[,.]? you must demonstrate English or French language "
    r"proficiency at Canadian Language Benchmark \(CLB\) level (\d)", re.I)
RE_LANG_NONE = re.compile(
    r"Language requirements for occupations classified under NOC TEER ([\d ]*or \d)\b.{0,120}?"
    r"you are not required to submit valid language test results at the time of registration", re.I)
RE_INCOME = re.compile(r"(\d|7 or more) \$([\d,]+) CAD \$([\d,]+) CAD")
RE_EXP = re.compile(
    r"minimum of (\w+) years of full-time \(or full-time equivalent\) work experience "
    r"in any skilled occupation \(NOC TEER ([\d, ]*or \d)\)", re.I)
RE_EMP_YEARS = re.compile(r"Your employer must have operated in B\.C\. for at least (\w+) year", re.I)
RE_EMP_STAFF = re.compile(
    r"If your employer is located (within|outside of) the Metro Vancouver Regional District, "
    r"your employer must have at least (\w+) indeterminate, full-time employees", re.I)


def flatten(doc) -> str:
    txt = "\n".join(p.get_text() for p in doc)
    for pat in FURNITURE:
        txt = pat.sub(" ", txt)
    return re.sub(r"\s+", " ", txt).strip()


def teers(s: str) -> list[int]:
    """'2, 3, 4 or 5' → [2,3,4,5];官方就是这么写的,别自己推区间。"""
    return [int(x) for x in re.findall(r"\d", s)]


def req(**kw) -> dict:
    """一行门槛。缺省值写全,mart 一行一记录、列对齐 DB。"""
    base = {"stream": ALL_STREAMS, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesArea": "", "familySize": None, "basis": "",
            "label": "", "section": ""}
    return {**base, **kw}


def main() -> None:
    r = httpx.get(PDF_URL, timeout=60, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    doc = fitz.open(stream=r.content, filetype="pdf")

    # 生效日期:页脚每页都印,改版时可能只更新了改动页 → 取最新的那个(= 本版生效日)
    dates = sorted({datetime.strptime(d, "%B %d, %Y").date() for d in FOOTER_DATE.findall("\n".join(p.get_text() for p in doc))})
    eff = dates[-1].isoformat() if dates else ""

    txt = flatten(doc)
    reqs: list[dict] = []
    problems: list[str] = []

    # 3.4 语言 ──────────────────────────────────────────────────────────────────
    m = RE_LANG_CLB.search(txt)
    if m:
        reqs.append(req(factor="language", op=">=", value=int(m.group(2)), unit="CLB",
                        appliesTeer=teers(m.group(1)), section="3.4",
                        label=f"CLB {m.group(2)} in each of the four competencies "
                              f"(NOC TEER {m.group(1)})"))
    else:
        problems.append("3.4 语言门槛没解析到")
    m = RE_LANG_NONE.search(txt)
    if m:
        # 「注册时不强制交成绩」≠「没有语言要求」:BC 保留在审批阶段要成绩的权力,措辞照官方
        reqs.append(req(factor="language", op="none", appliesTeer=teers(m.group(1)), section="3.4",
                        label=f"No language test required at registration (NOC TEER {m.group(1)}); "
                              f"the BC PNP may still request results during assessment"))
    else:
        problems.append("3.4 TEER 0/1 的免交条款没解析到")

    # 3.10 最低家庭收入(7 档 × 2 区域)──────────────────────────────────────────
    rows = RE_INCOME.findall(txt)
    for size, metro, rest in rows:
        n = 7 if size.startswith("7") else int(size)
        for area, val in ((METRO, metro), (REST, rest)):
            reqs.append(req(factor="income", op=">=", value=int(val.replace(",", "")), unit="CAD/yr",
                            appliesArea=area, familySize=n, section="3.10",
                            label=f"Minimum family income {size} person(s), "
                                  f"{'Metro Vancouver Regional District' if area == METRO else 'rest of B.C.'}: ${val} CAD"))
    if len(rows) != 7:
        problems.append(f"3.10 最低家庭收入表解析到 {len(rows)} 档(官方 7 档)")
    else:
        metro_vals = [int(m_.replace(",", "")) for _, m_, _ in rows]
        rest_vals = [int(r_.replace(",", "")) for _, _, r_ in rows]
        if metro_vals != sorted(metro_vals) or rest_vals != sorted(rest_vals):
            problems.append("3.10 收入表不是随家庭人数递增(列错位)")
        if any(a <= b for a, b in zip(metro_vals, rest_vals)):
            problems.append("3.10 大温某档不高于 BC 其余(两列读反了)")

    # 4.1(c) 技术工人通道的工作经验 ────────────────────────────────────────────
    m = RE_EXP.search(txt)
    if m and m.group(1).lower() in WORDS:
        yrs = WORDS[m.group(1).lower()]
        reqs.append(req(stream=SKILLED_WORKER, factor="experience", op=">=", value=yrs * 12, unit="months",
                        section="4.1(c)",
                        label=f"{m.group(1).title()} years of full-time skilled work experience "
                              f"(NOC TEER {m.group(2)}) within the last ten years"))
    else:
        problems.append("4.1(c) 工作经验门槛没解析到")

    # 6.7 / 6.8 雇主侧 ─────────────────────────────────────────────────────────
    m = RE_EMP_YEARS.search(txt)
    if m and m.group(1).lower() in WORDS:
        reqs.append(req(subject="employer", factor="empYears", op=">=", value=WORDS[m.group(1).lower()],
                        unit="years", section="6.7",
                        label=f"Employer must have operated in B.C. for at least {m.group(1)} "
                              f"year{'s' if WORDS[m.group(1).lower()] > 1 else ''}"))
    else:
        problems.append("6.7 雇主经营年限没解析到")
    staff = RE_EMP_STAFF.findall(txt)
    for where, word in staff:
        if word.lower() not in WORDS:
            continue
        area = METRO if where.lower() == "within" else REST
        reqs.append(req(subject="employer", factor="empStaff", op=">=", value=WORDS[word.lower()],
                        unit="employees", appliesArea=area, section="6.8",
                        label=f"Employer must have at least {word} indeterminate, full-time employees in B.C. "
                              f"({'inside' if area == METRO else 'outside'} Metro Vancouver)"))
    if len(staff) != 2:
        problems.append(f"6.8 雇员数门槛解析到 {len(staff)} 条(官方大温内外各一条)")
    if not eff:
        problems.append("没解析到指南生效日期")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "BC PNP Skills Immigration Program Guide",
        "url": PDF_URL, "pageUrl": PAGE_URL,
        "guideEffective": eff, "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  指南生效 {eff},共 {len(reqs)} 条门槛")
    for f in ("language", "income", "experience", "empYears", "empStaff"):
        n = sum(1 for x in reqs if x["factor"] == f)
        print(f"  {f:12} {n} 条")


if __name__ == "__main__":
    main()
