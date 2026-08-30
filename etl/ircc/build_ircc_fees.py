"""
build_fees — 联邦段官方规费(G8 v1,2026-08-03;案例库 C14「中介开价 3 万值吗」的拆账原料)。

源 = IRCC 官方费用总表(ircc.canada.ca/english/information/fees/fees.asp,httpx 直连 200)。
只收 **Economic immigration (including Express Entry)** 一节(官方明示适用于 PNP/EE/AIP/RCIP)
+ 生物识别两档。**段落定位后逐项正则**,任何一项没解析到 → 保留旧表 exit 1(硬闸,照 build_pgwp)。

产出走 pnp_requirements 形状(province='FED' program='PR-fees',factor='fee',stream 区分条目)——
第三次复用同一张表(PGWP 同款先例):零新表零 DDL,引擎 facts.requirements 免费拿到;
requirementLines 不认识 factor='fee' → 天然不进门槛节,只被 fees 消费点读。
省级申请费(BC/ON/SK/MB…)= G8 二期,各省官方页原句待逐个核。

Usage:  uv run python etl/build_fees.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent.parent  # 分域后上一级才是 etl/
sys.path.insert(0, str(_HERE))
import _paths

URL = "https://ircc.canada.ca/english/information/fees/fees.asp"
OUT = _paths.IRCC / "fees.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

# 段内条目:label 正则 → stream 名。金额格式恒为 1,234.00
ITEMS = [
    (r"Your application This amount includes the processing fee and the right of permanent residence fee\.?\s*([\d,]+)\.00",
     "principal", "Principal applicant — processing + right of permanent residence fee"),
    (r"Your application \(without right of permanent residence fee\)\s*([\d,]+)\.00",
     "principalNoRprf", "Principal applicant — processing only (without RPRF)"),
    (r"Include your spouse or partner[^$]*?([\d,]+)\.00",
     "spouse", "Spouse or partner — processing + RPRF"),
    (r"Include a dependent child\s*([\d,]+)\.00",
     "child", "Dependent child (per child)"),
]
# 官方措辞:「Biometrics – per individual 85.00」「Biometrics – per family of 2 or more … 170.00」
# (family 行的金额隔着一整段资格说明,允许中间最多 400 字符)
RE_BIO_P = re.compile(r"Biometrics [–-] per individual\s*([\d,]+)\.00", re.I)
RE_BIO_F = re.compile(r"Biometrics [–-] per family of 2 or more.{0,400}?([\d,]+)\.00", re.I)
SECTION = "Economic immigration (including Express Entry)"


def main() -> None:
    print(f"OUT: {OUT}")
    html = httpx.get(URL, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "nav", "header", "footer"]):
        t.decompose()
    txt = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))

    i = txt.find(SECTION)
    problems: list[str] = []
    reqs: list[dict] = []
    if i < 0:
        problems.append(f"没找到段落标题「{SECTION}」(页面可能改版)")
    else:
        seg = txt[i:i + 3000]   # 该节自己的费率块;下一节标题前肯定覆盖到
        for pat, stream, label in ITEMS:
            m = re.search(pat, seg)
            if not m:
                problems.append(f"「{stream}」没解析到")
                continue
            amount = int(m.group(1).replace(",", ""))
            reqs.append({"stream": stream, "subject": "applicant", "factor": "fee", "op": "=",
                         "value": amount, "valueText": m.group(0)[:180], "unit": "CAD",
                         "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
                         "familySize": None, "basis": "", "label": label,
                         "section": SECTION, "url": URL})
    for regex, stream, label in ((RE_BIO_P, "biometricsPerson", "Biometrics — per person"),
                                 (RE_BIO_F, "biometricsFamily", "Biometrics — per family (2+ people)")):
        m = regex.search(txt)
        if not m:
            problems.append(f"「{stream}」没解析到")
            continue
        amount = int(next(g for g in m.groups() if g).replace(",", ""))
        reqs.append({"stream": stream, "subject": "applicant", "factor": "fee", "op": "=",
                     "value": amount, "valueText": m.group(0)[:180], "unit": "CAD",
                     "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
                     "familySize": None, "basis": "", "label": label, "section": "Biometrics", "url": URL})

    # 交叉自校:principal - principalNoRprf = 永居权费,应为正数且 ≤ principal 的一半(改版最容易先烂在这)
    by = {r["stream"]: r["value"] for r in reqs}
    if "principal" in by and "principalNoRprf" in by:
        rprf = by["principal"] - by["principalNoRprf"]
        if not (0 < rprf < by["principalNoRprf"]):
            problems.append(f"永居权费差值异常:{by['principal']} - {by['principalNoRprf']} = {rprf}")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.write_text(json.dumps({
        "province": "FED", "program": "PR-fees",
        "source": "IRCC — fee list (Economic immigration incl. Express Entry / PNP / AIP / RCIP)",
        "url": URL, "fetched": date.today().isoformat(),
        "note": "官方原文锚在每行 valueText;RPRF = principal - principalNoRprf。省级申请费 = G8 二期。",
        "requirements": reqs,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(reqs)} 条费用:", {r['stream']: r['value'] for r in reqs})


if __name__ == "__main__":
    main()
