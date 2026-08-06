"""
build_nb_req — NB(NBPNP Skilled Worker)的**门槛**。走三份官方申请指南 PDF,三份互为校验。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_nb:技术工人 + AIP 两张**不受理**清单,叠加式排除)
  · pnp_score_factors 能打几分(NB 无分值表 —— 官方是 EOI 择优,不公布打分)
  · pnp_requirements   打分之前先要满足什么(本脚本)

**PDF 链接从通道页现取**(同 build_ns_req 的理由:官方随时换文件名)。NB Skilled Worker 下有三条
并列 pathway,各一份指南:New Brunswick Experience / Graduates / Priority Occupations。

抓这几条:
  语言  CLB/NCLC 4(听说读写四项)—— **三份指南必须都写这个数**,对不上就判解析出错。
        三条 pathway 语言口径一致,所以可以作为「NB 的语言门槛」不分 TEER 地陈述。
  经验(C5b-0,2026-08-05 补;只补 Experience 一条 pathway,理由见下)
        与**该支持雇主**连续全职 6 个月(basis='employerTenure',照 MB SWM/build_mb_req.py 先例 ——
        rules.ts 已有专门的口径隔离分支:这类行**只摆门槛不判定**,不会被拿去跟「同职业总经验」比大小,
        2026-08-04 那次「口径隔离」修的正是这个坑,现在补 NB 这一条是安全的)。
        residence(NB 居住满 6 个月)形状上一起补 —— 引擎目前没有 residence 分支消费它,
        但 pnp_requirements 是通用行形状,数据层先落上不等未来的引擎功能;不算「硬塞」。

**仍然没抓 —— 经验的另外两条 pathway**:
  · Graduates:不设经验门槛(尚未确认官方是否有 op='none' 式明文条款,留后续核实)
  · Priority Occupations:1 年带薪相关经验,但只对**省政府境外招聘团**发出的 offer 生效 ——
    这条的适用范围本站题库判不出(不是「你干了几年」能问出来的),继续不收录。
  三条 pathway 分属不同 stream 字符串,Experience 这条门槛只挂在它自己的 stream 上,
  不会被挑到走 Graduates/Priority Occupations 的人身上(stream 字段虽然引擎当前不按它筛选,
  但 basis='employerTenure' 的行本身就只摆门槛不判定,不存在「误判某条路的人」的风险)。

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
# 只在 New Brunswick Experience 指南「YOUR ELIGIBILITY」段落里找,不套另外两份指南
RE_EXP_TENURE = re.compile(
    r"you must already have at least (\d+) months? of full-time work experience with the supporting employer", re.I)
RE_NB_RESIDENCE = re.compile(
    r"You must have been living in New Brunswick with valid temporary resident status for the past (\d+) months?", re.I)
EXPERIENCE_STREAM = "New Brunswick Skilled Worker stream — New Brunswick Experience pathway"


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
    exp_txt = ""
    for name, url in urls.items():
        txt = pdf_text(url)
        if name == "New Brunswick Experience":
            exp_txt = txt
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

    # ── New Brunswick Experience pathway:与支持雇主的在职时长 + NB 居住时长 ──────
    # 只挂 stream=EXPERIENCE_STREAM,不当成三条 pathway 通用门槛(Graduates/Priority Occupations
    # 不是这个口径,见文件头说明)。basis='employerTenure' 触发 rules.ts 的口径隔离分支。
    te = RE_EXP_TENURE.search(exp_txt)
    if te:
        reqs.append(req(stream=EXPERIENCE_STREAM, factor="experience", value=int(te.group(1)), unit="months",
                        basis="employerTenure", url=urls["New Brunswick Experience"],
                        section="Your eligibility — 1. NB employment",
                        label=re.sub(r"\s+", " ", te.group(0)).strip().capitalize()))
    else:
        problems.append("New Brunswick Experience 指南里的雇主在职时长(6 个月)没解析到")
    tr = RE_NB_RESIDENCE.search(exp_txt)
    if tr:
        reqs.append(req(stream=EXPERIENCE_STREAM, factor="residence", value=int(tr.group(1)), unit="months",
                        url=urls["New Brunswick Experience"],
                        section="Your eligibility — 4. NB residency",
                        label=re.sub(r"\s+", " ", tr.group(0)).strip()))
    else:
        problems.append("New Brunswick Experience 指南里的 NB 居住时长(6 个月)没解析到")

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
