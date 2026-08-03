"""
build_pe_req — PE(PEI PNP Workforce)的**门槛**。与 build_pe.py 同一份官方申请指南 PDF。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_pe:Occupations in Demand 8 个具名 NOC)
  · pnp_score_factors 能打几分(PE 的 EOI 打分表未抓)
  · pnp_requirements   打分之前先要满足什么(本脚本)

**走 PDF 是被迫也是更好**:princeedwardisland.ca 的 HTML 页在 Radware 反爬后面(httpx 拿到验证壳),
而文件服务器 `/sites/default/files/` 不挡 —— 同 build_pe.py 的结论,两个脚本读同一份指南。

抓这几条:
  语言  CLB/NCLC 4(四条 Workforce 通道口径一致 → 不分 TEER 陈述)
  经验  24 个月(Skilled Worker 通道:近 5 年内 2 年全职)——**只挂 TEER 0-3**:
        · Critical Worker(TEER 4/5)官方写的是「2 年全职经验**或**相关学历」,有替代路径,
          当成硬门槛会把「有学历没经验」的人误判成不合格 → 不挂 TEER 4/5;
        · Occupations in Demand 只要 1 年,但那是 8 个具名 NOC 的专项(build_pe 那张表),
          写进 label 陈述,不另开一行(引擎的 experience 不按 NOC 挑行)。

**没抓的**:年龄 18-59、高中/大专学历(引擎无对应因素);最低收入(PE 只写「有足够财力支付移民费用」,
**不发数额表** —— 全国只有 BC 发布了收入表,这是结论不是缺口)。

自校是硬闸:任何一组没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_pe_req.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import fitz  # pymupdf
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

GUIDE_URL = "https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf"
PAGE_URL = "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-pnp-workforce-streams"
OUT = _paths.PNP / "pe-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "PE"
PROGRAM = "PNP"
STREAM = "PEI PNP Workforce streams (Skilled Worker / Critical Worker / International Graduate / Occupations in Demand)"
SKILLED = "PEI PNP Workforce — Skilled Worker stream"
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "ten": 10}

# 官方指南里 PDF 用的是 U+2010 连字符(full‐time),别写死普通 '-' —— 用 . 兜一位
RE_LANG = re.compile(r"minimum score of CLB ?/ ?NCLC (\d)", re.I)
RE_EXP = re.compile(r"have at least (\w+) years of full.time work experience in the past (\w+) years", re.I)
RE_EXP_OID = re.compile(r"have at least (\w+) year of work experience directly related to the job", re.I)
# 页脚:「PEI Workforce Application Guide • • • January 2026 – page 2」
RE_EFFECTIVE = re.compile(r"([A-Z][a-z]+ \d{4}) ?[–—-] ?page \d+")


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": GUIDE_URL}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    with fitz.open(stream=httpx.get(GUIDE_URL, headers=UA, follow_redirects=True, timeout=60).content,
                   filetype="pdf") as doc:
        raw = "\n".join(p.get_text() for p in doc)
    txt = re.sub(r"\s+", " ", raw)

    reqs: list[dict] = []
    problems: list[str] = []

    # ── 语言:四条通道同一个数,取全篇出现的**唯一**值;出现两个不同值说明官方分了档,得人工看 ──
    langs = {int(x) for x in RE_LANG.findall(txt)}
    if not langs:
        problems.append("语言门槛没解析到")
    elif len(langs) > 1:
        problems.append(f"指南里出现多个语言门槛 {sorted(langs)} —— 官方可能已分档,需人工核对")
    else:
        clb = next(iter(langs))
        reqs.append(req(factor="language", value=clb, unit="CLB",
                        section="Step 1: Assess Your Eligibility",
                        label=f"A valid language test from an IRCC-approved institution with a minimum score of "
                              f"CLB/NCLC {clb} (test valid for 2 years); required by all PEI Workforce streams"))

    # ── 经验:Skilled Worker 通道 2 年,只挂 TEER 0-3(理由见文件头)──────────────
    e, o = RE_EXP.search(txt), RE_EXP_OID.search(txt)
    if not e or e.group(1).lower() not in WORDS or e.group(2).lower() not in WORDS:
        problems.append("Skilled Worker 经验门槛没解析到")
    elif not o or o.group(1).lower() not in WORDS:
        problems.append("Occupations in Demand 的 1 年经验没解析到(label 要引用它)")
    else:
        yrs, window = WORDS[e.group(1).lower()], WORDS[e.group(2).lower()]
        reqs.append(req(stream=SKILLED, factor="experience", value=yrs * 12, unit="months",
                        appliesTeer=[0, 1, 2, 3], section="Skilled Worker Stream",
                        label=f"At least {e.group(1)} years ({yrs * 12} months) of full-time work experience in the "
                              f"past {e.group(2)} ({window}) years, with a full-time non-seasonal job offer in NOC "
                              f"TEER 0-3 (the Occupations in Demand stream requires only "
                              f"{WORDS[o.group(1).lower()] * 12} months, but is limited to its named NOC list)"))

    eff = RE_EFFECTIVE.search(txt)
    if not eff:
        problems.append("没解析到指南版本(页脚「月份 年份 – page N」)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "PEI Workforce Application Guide",
        "url": GUIDE_URL, "pageUrl": PAGE_URL,
        "guideEffective": eff.group(1), "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  指南版本 {eff.group(1)},共 {len(reqs)} 条门槛")
    for f in ("language", "experience"):
        print(f"  {f:12} {sum(1 for x in reqs if x['factor'] == f)} 条")


if __name__ == "__main__":
    main()
