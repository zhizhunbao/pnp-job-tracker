"""
build_nb_req — NB(NBPNP Skilled Worker)的**门槛**。走三份官方申请指南 PDF,三份互为校验。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_nb:技术工人 + AIP 两张**不受理**清单,叠加式排除)
  · pnp_score_factors 能打几分(NB 无分值表 —— 官方是 EOI 择优,不公布打分)
  · pnp_requirements   打分之前先要满足什么(本脚本)

**PDF 链接从通道页现取**(同 build_ns_req 的理由:官方随时换文件名)。NB Skilled Worker 下有三条
并列 pathway,各一份指南:New Brunswick Experience / Graduates / Priority Occupations。

抓这一条:
  语言  CLB/NCLC 4(听说读写四项)—— **三份指南必须都写这个数**,对不上就判解析出错。
        三条 pathway 语言口径一致,所以可以作为「NB 的语言门槛」不分 TEER 地陈述。

**没抓的 —— 经验(重要,别当漏抓)**:三条 pathway 的经验口径互不相同且都不是通用门槛:
  · Experience:与**该支持雇主**连续全职 6 个月 + 在 NB 住满 6 个月(口径是在职/居住时长)
  · Graduates:不设经验门槛
  · Priority Occupations:1 年带薪相关经验,但只对**省政府境外招聘团**发出的 offer 生效
引擎的 experience 是「同职业总经验」一条通吃,把其中任何一条塞进去,都会对走另外两条路的人
说错话(拿 Experience 那条走 6 个月的人会被判「差 6 个月」)。判不了就不出这一行 ——
同 Frank 2026-08-02「这一条不参与判定,那还显示干什么」,与 rules.ts 铁律①「unknown 是一等公民」。

同理没抓:年龄 ≥19、高中学历 + ECA(引擎无对应因素);最低收入(NB **不设**收入表)。

自校是硬闸:三份指南任一没解析到、或 CLB 数对不上就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_nb_req.py
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

PAGE_URL = ("https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/"
            "nb-immigration-program-streams/nb-skilled-worker-stream.html")
OUT = _paths.PNP / "nb-req.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "NB"
PROGRAM = "PNP"
STREAM = "New Brunswick Skilled Worker stream (Experience / Graduates / Priority Occupations)"
# 三条 pathway 的指南文件名关键字 → 官方 pathway 名(用来认链接,也用来在自校里报是哪份缺了)
PATHWAYS = {
    "guide-new-brunswick-experience": "New Brunswick Experience",
    "guide-new-brunswick-graduates": "New Brunswick Graduates",
    "guide-new-brunswick-priority-occupations": "New Brunswick Priority Occupations",
}

# 「have at least Canadian Language Benchmarks (CLB) 4 in listening, reading, writing, and speaking」
# (Graduates 那份写的是「have a minimum of …」)
RE_LANG = re.compile(r"have (?:at least|a minimum of) Canadian Language Benchmarks \(CLB\) (\d) in listening", re.I)
# 指南封面/页眉的版本:「New Brunswick Experience (2026-06)」
RE_VERSION = re.compile(r"New Brunswick (?:Experience|Graduates|Priority Occupations) \((\d{4}-\d{2})\)")


def guide_urls() -> dict[str, str]:
    """从通道页现取三份指南 PDF(key = PATHWAYS 的官方 pathway 名)。"""
    soup = BeautifulSoup(httpx.get(PAGE_URL, headers=UA, follow_redirects=True, timeout=45).text, "html.parser")
    found: dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        for key, name in PATHWAYS.items():
            if key in href.lower():
                found.setdefault(name, href if href.startswith("http") else "https://www2.gnb.ca" + href)
    return found


def pdf_text(url: str) -> str:
    with fitz.open(stream=httpx.get(url, headers=UA, follow_redirects=True, timeout=60).content,
                   filetype="pdf") as doc:
        return re.sub(r"\s+", " ", "\n".join(p.get_text() for p in doc))


def req(**kw) -> dict:
    base = {"stream": STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "familySize": None, "basis": "", "label": "", "section": "", "url": PAGE_URL}
    return {**base, **kw}


def main() -> None:
    print(f"OUT: {OUT}")
    urls = guide_urls()
    problems: list[str] = []
    missing = [n for n in PATHWAYS.values() if n not in urls]
    if missing:
        print(f"  ✗ 通道页上没找到指南 PDF:{', '.join(missing)}(改版?保留旧表,请人工复核)")
        sys.exit(1)

    clbs: dict[str, int] = {}
    versions: set[str] = set()
    for name, url in urls.items():
        txt = pdf_text(url)
        m = RE_LANG.search(txt)
        if m:
            clbs[name] = int(m.group(1))
        else:
            problems.append(f"{name} 指南里没解析到语言门槛")
        v = RE_VERSION.search(txt)
        if v:
            versions.add(v.group(1))
        print(f"  {name:32} CLB {m.group(1) if m else '?'}  版本 {v.group(1) if v else '?'}")

    reqs: list[dict] = []
    if len(set(clbs.values())) > 1:
        problems.append(f"三份指南语言门槛对不上:{clbs}")
    elif clbs:
        clb = next(iter(clbs.values()))
        reqs.append(req(factor="language", value=clb, unit="CLB",
                        section="Overview — eligibility",
                        label=f"Canadian Language Benchmarks (CLB) or NCLC {clb} in listening, reading, writing and "
                              f"speaking; required by all three Skilled Worker pathways "
                              f"({', '.join(sorted(clbs))})"))
    if not versions:
        problems.append("没解析到指南版本(封面 pathway 名后的 YYYY-MM)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "New Brunswick Skilled Worker stream — pathway application guides",
        # 表级 url 指通道页(三份指南是并列的三份,拿其中一份当整份出处会对不上另外两条 pathway)
        "url": PAGE_URL, "pageUrl": PAGE_URL,
        "guideEffective": sorted(versions)[-1], "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  指南版本 {sorted(versions)[-1]},共 {len(reqs)} 条门槛")


if __name__ == "__main__":
    main()
