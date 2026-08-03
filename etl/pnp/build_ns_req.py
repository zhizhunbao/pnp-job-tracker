"""
build_ns_req — NS(NSNP Skilled Worker)的**门槛**。走官方申请指南 PDF。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_ns:Critical Vacancies / Graduate 两条专项 + 主线政策事实)
  · pnp_score_factors 能打几分(NS 无分值表 —— 官方不打分,是 EOI 择优)
  · pnp_requirements   打分之前先要满足什么(本脚本)

**PDF 链接不写死**:官方把指南放在带月份的目录下(…/2026-02/Guide-NSNP-Skilled-Worker-English.pdf),
写死等于下次改版就抓到旧版。改从通道页现取「Application Guide」那个链接,再下 PDF ——
同 build_sk.py 从产品 API 现取 format id 的手法。

抓这几条(每条带官方原文与节名):
  语言    TEER 0-3 → CLB 5;TEER 4/5 → CLB 4(官方明示适用于 Skilled Worker / Critical Construction
          Worker / Occupations in Demand 三个 category)
  经验    近 5 年内 12 个整月且 ≥1,560 小时,须与所获 offer 相关的**带薪**工作
  雇主侧  在新斯科舍经营满 2 年(subject='employer';本站没有雇主事实,报告里只作雇主线索用)

**没抓的**:
  · 年龄 21-55(题库没问年龄区间口径,且引擎没有 age 因素 —— 收了没人消费,见 §E「算好了没人用」)
  · 结算资金 / LICO:NS 官方**不发自己的表**,直接指向 IRCC 的 settlement funds 与联邦 LICO Table 1。
    那是联邦口径不是省门槛,且报告的 income 判定要和「该职业该省中位年薪」比 —— 拿家庭 LICO 去比
    个人职业中位是两个不可比的数(08-02 已因此撤过一次并排展示)。留白比硬凑强。
  · TEER 4/5 的「与 NS 雇主 6 个月带薪经验」:口径是**在职时长**,与本站问的同职业总经验对不上。

自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_ns_req.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import fitz  # pymupdf
import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

PAGE_URL = "https://liveinnovascotia.com/skilled-worker"
OUT = _paths.PNP / "ns-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "NS"
PROGRAM = "PNP"
STREAM = "Nova Scotia Nominee Program — Skilled Worker stream"

# 页眉页脚(每页重复,会把句子切两半)先剥掉,再让正则跑在压成一行的全文上
FURNITURE = re.compile(r"\d+ Skilled Worker Nova Scotia Nominee Program \([A-Z][a-z]+ \d{4}\)")
EFFECTIVE = re.compile(r"Nova Scotia Nominee Program \(([A-Z][a-z]+ \d{4})\)")

RE_LANG_HI = re.compile(
    r"For Skilled Worker \(A\), Critical Construction Worker \(B\), and Occupations in Demand \(D\) Categories "
    r"NOC TEER ([\d, ]*and \d) If your first language is NOT English or French.{0,260}?"
    r"Canadian Language Benchmarks \(CLB\) Level (\d) or higher", re.I)
RE_LANG_LO = re.compile(
    r"NOC TEER (\d and \d) You must submit the results of one of these language tests.{0,600}?"
    r"at least the CLB level (\d) criteria", re.I)
RE_EXP = re.compile(
    r"You have worked (\d+) complete calendar months within the last (\d+) years "
    r"and a minimum of ([\d,]+) hours", re.I)
RE_EMP_YEARS = re.compile(r"The employer must have operated in Nova Scotia for at least (\d+) years", re.I)


def guide_url() -> str:
    """从通道页现取官方申请指南 PDF(目录名带月份,写死会抓到旧版)。"""
    soup = BeautifulSoup(httpx.get(PAGE_URL, headers=UA, follow_redirects=True, timeout=45).text, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf") and "skilled-worker" in href.lower() and "english" in href.lower() \
                and "change" not in href.lower():
            return href if href.startswith("http") else "https://liveinnovascotia.com" + href
    return ""


def teers(s: str) -> list[int]:
    """'0, 1, 2, and 3' → [0,1,2,3];官方就是这么写的,别自己推区间。"""
    return [int(x) for x in re.findall(r"\d", s)]


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": ""}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    url = guide_url()
    if not url:
        print("  ✗ 通道页上没找到 Skilled Worker 申请指南 PDF(改版?保留旧表,请人工复核)")
        sys.exit(1)
    print(f"  指南: {url}")
    with fitz.open(stream=httpx.get(url, headers=UA, follow_redirects=True, timeout=60).content,
                   filetype="pdf") as doc:
        raw = "\n".join(p.get_text() for p in doc)
    eff_m = EFFECTIVE.search(raw)
    # 先压一次让页眉页脚变成可匹配的一行,剥掉之后**再压一次** —— 剥出来的空洞会在被切断的
    # 句子中间留下多个空格(「(CLB) Level ␣␣ 5 or higher」),不二次压正则里的单空格就对不上
    txt = re.sub(r"\s+", " ", FURNITURE.sub(" ", re.sub(r"\s+", " ", raw))).strip()

    reqs: list[dict] = []
    problems: list[str] = []

    # ── 语言:两档 ─────────────────────────────────────────────────────────────
    hi, lo = RE_LANG_HI.search(txt), RE_LANG_LO.search(txt)
    if hi:
        reqs.append(req(factor="language", value=int(hi.group(2)), unit="CLB", appliesTeer=teers(hi.group(1)),
                        section="Language — NOC TEER 0, 1, 2 and 3",
                        label=f"Canadian Language Benchmarks (CLB) or NCLC Level {hi.group(2)} or higher for jobs "
                              f"in NOC TEER {hi.group(1)} (Skilled Worker, Critical Construction Worker and "
                              f"Occupations in Demand categories)"))
    else:
        problems.append("语言(TEER 0-3)没解析到")
    if lo:
        reqs.append(req(factor="language", value=int(lo.group(2)), unit="CLB", appliesTeer=teers(lo.group(1)),
                        section="Language — NOC TEER 4 and 5",
                        label=f"An approved language test showing at least CLB/NCLC {lo.group(2)} is mandatory for "
                              f"jobs in NOC TEER {lo.group(1)}, issued within two years of the NSNP submission"))
    else:
        problems.append("语言(TEER 4/5)没解析到")
    if hi and lo and not int(hi.group(2)) > int(lo.group(2)):
        problems.append(f"语言两档读反了(TEER 0-3 {hi.group(2)} 应高于 TEER 4/5 {lo.group(2)})")

    # ── 经验 ──────────────────────────────────────────────────────────────────
    e = RE_EXP.search(txt)
    if e:
        reqs.append(req(factor="experience", value=int(e.group(1)), unit="months",
                        section="Skilled Workers — work experience",
                        label=f"{e.group(1)} complete calendar months of paid work within the last {e.group(2)} years "
                              f"and a minimum of {e.group(3)} hours, related to the job being offered "
                              f"(volunteer work and unpaid internships do not count)"))
    else:
        problems.append("工作经验门槛没解析到")

    # ── 雇主侧:经营年限 ───────────────────────────────────────────────────────
    y = RE_EMP_YEARS.search(txt)
    if y:
        reqs.append(req(subject="employer", factor="empYears", value=int(y.group(1)), unit="years",
                        section="Core Requirements — employer",
                        label=f"The employer must have operated in Nova Scotia for at least {y.group(1)} years"))
    else:
        problems.append("雇主经营年限没解析到")
    if not eff_m:
        problems.append("没解析到指南版本(页脚 Nova Scotia Nominee Program (月份 年份))")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "Nova Scotia Nominee Program — Skilled Worker Application Guide",
        "url": url, "pageUrl": PAGE_URL,
        "guideEffective": eff_m.group(1), "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  指南版本 {eff_m.group(1)},共 {len(reqs)} 条门槛")
    for f in ("language", "experience", "empYears"):
        print(f"  {f:12} {sum(1 for x in reqs if x['factor'] == f)} 条")


if __name__ == "__main__":
    main()
