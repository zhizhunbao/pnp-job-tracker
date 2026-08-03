"""
build_sk_req — SK(SINP International Skilled Worker)主线的**门槛**。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_sk:三条 Talent Pathway 具名 + 主线**排除**清单)
  · pnp_score_factors 能打几分(build_sk_points,60/110 是入池线)
  · pnp_requirements   打分之前先要满足什么(本脚本)

**两个官方页各抓一遍再交叉核对**(saskatchewan.ca 直连 200,不需要浏览器):
  · With an Employment Offer   有 offer 的那条主线
  · Occupations In-Demand      无 offer 的那条主线(EE 子类条件同 OID)
两页都写「CLB 4」「近 10 年内至少 1 年本职业工作经验」——**两页对不上就判解析出错**,
不取其中一页了事:同一制度两处口径不一致,只可能是我们读错了或官方在改版。

抓这几条:
  语言  CLB 4(不分 TEER —— SK 主线本身只收 TEER 0-3,TEER 门槛由排除清单那侧承担)
  经验  12 个月(近 10 年内、本职业、全职)——口径正是本站问的「同职业总经验(境内外)」

**没抓的**:
  · 60/110 入池分(那是分值表的事,已在 build_sk_points;门槛表里再放一条没人消费)
  · 结算资金(SK 官方不发自己的表,直接指向 IRCC 的 proof-of-funds 联邦表 → 不是省门槛)
  · 最低家庭收入(SK **不设** —— 全国只有 BC 发布了收入表;这是结论不是缺口)
  · 学历/ECA(题库口径对不上,同 build_on_req 的处理)

自校是硬闸:任何一组没解析到、或两页对不上就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_sk_req.py
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

_SK = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
       "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/")
EO_URL = _SK + "international-skilled-worker-with-employment-offer"
OID_URL = _SK + "international-skilled-worker-occupations-in-demand"
OUT = _paths.PNP / "sk-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "SK"
PROGRAM = "PNP"
STREAM = "SINP International Skilled Worker (Employment Offer / Occupations In-Demand / Express Entry)"
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}

# 「Have a language score of at least Canadian Language Benchmark (CLB) 4」(EO 页)
# 「Have a language score of at least 4 – Canadian Language Benchmark (CLB) 4」(OID 页,多一个数字)
RE_LANG = re.compile(r"language score of at least (?:\d+ ?[–—-] ?)?Canadian Language Benchmark \(CLB\) (\d)", re.I)
# 「Have at least one-year work experience in the past 10 years」(EO 页)
RE_EXP_EO = re.compile(r"at least (\w+)[- ]year work experience in the past (\d+) years", re.I)
# 「a minimum of one year of full-time (minimum 30 hours per week) paid work experience … over the past 10 years」(OID 页)
RE_EXP_OID = re.compile(r"minimum of (\w+) year of full-time \(minimum (\d+) hours per week\) paid work experience "
                        r"in a skilled occupation over the past (\d+) years", re.I)


def page_text(url: str) -> str:
    html = httpx.get(url, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": EO_URL}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    eo, oid = page_text(EO_URL), page_text(OID_URL)
    reqs: list[dict] = []
    problems: list[str] = []

    # ── 语言:两页都写 CLB 4,对不上就是读错了 ──────────────────────────────────
    a, b = RE_LANG.search(eo), RE_LANG.search(oid)
    if not a or not b:
        problems.append(f"语言门槛没解析到(EO {'✓' if a else '✗'} / OID {'✓' if b else '✗'})")
    elif a.group(1) != b.group(1):
        problems.append(f"两页语言门槛对不上:EO CLB {a.group(1)} vs OID CLB {b.group(1)}")
    else:
        reqs.append(req(factor="language", value=int(a.group(1)), unit="CLB",
                        section="Eligibility — Language",
                        label=f"Canadian Language Benchmark (CLB) {a.group(1)} or higher; employers and "
                              f"regulatory bodies may require higher scores"))

    # ── 经验:两页都是「近 10 年内 1 年本职业全职经验」────────────────────────
    e, o = RE_EXP_EO.search(eo), RE_EXP_OID.search(oid)
    if not e or not o:
        problems.append(f"工作经验门槛没解析到(EO {'✓' if e else '✗'} / OID {'✓' if o else '✗'})")
    elif e.group(1).lower() not in WORDS or o.group(1).lower() not in WORDS:
        problems.append(f"经验年数不是已知词:EO '{e.group(1)}' / OID '{o.group(1)}'")
    elif WORDS[e.group(1).lower()] != WORDS[o.group(1).lower()] or e.group(2) != o.group(3):
        problems.append(f"两页经验门槛对不上:EO {e.group(1)} 年/近 {e.group(2)} 年 "
                        f"vs OID {o.group(1)} 年/近 {o.group(3)} 年")
    else:
        yrs = WORDS[e.group(1).lower()]
        reqs.append(req(factor="experience", value=yrs * 12, unit="months",
                        section="Eligibility — Work experience",
                        label=f"{e.group(1).title()} year of full-time (at least {o.group(2)} hours per week) paid "
                              f"work experience in your intended occupation within the past {e.group(2)} years"))

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "SINP — International Skilled Worker (Employment Offer & Occupations In-Demand)",
        "url": EO_URL, "pageUrl": OID_URL,
        "guideEffective": "",       # 官方网页不印生效日期
        "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  共 {len(reqs)} 条门槛")
    for f in ("language", "experience"):
        print(f"  {f:12} {sum(1 for x in reqs if x['factor'] == f)} 条")


if __name__ == "__main__":
    main()
