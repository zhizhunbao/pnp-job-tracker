"""
build_mb_req — MB(MPNP)的**门槛**。曼省这份最值钱的地方:**语言门槛是逐职业发布的**。

三张表各管一件事(照 build_bc_req 惯例):
  · pnp_occupations   在不在清单(build_mb:In-Demand 主清单 + 乡镇清单)
  · pnp_score_factors 能打几分(MB 分值表尚未抓,B4-4)
  · pnp_requirements   打分之前先要满足什么(本脚本)

两个官方源(immigratemanitoba.com 直连 200):
  · In-Demand Occupations List  每个在需职业一行,**自带 Minimum CLB 一列** —— 这一列
    build_mb.py 只取了 NOC 与职业名,把它丢了。它正是「这个职业在曼省要几分语言」的官方答案,
    对「中介推我去曼省」这类问题是直接可用的一句话,所以在这里逐职业收进门槛表。
  · Skilled Worker Overseas 资格页  TEER 4/5 的**硬性**语言下限 CLB 4(不分职业)

引擎按「appliesNoc 最具体的那行胜出」挑行(同 ON 技工低档的机制):
命中在需清单 → 用该职业那一档;没命中 → 落到 TEER 4/5 的 CLB 4(TEER 0-3 则一行都不出)。

**SWM 在职时长**(2026-08-04 补,推翻本文件原来那句「不抓」):
  MPNP 确实没有「通用 N 年同职业经验」这道门槛,但 SWM 的**在职时长**是一道硬资格线,
  而且是「外省毕业生怎么走曼省」这个真问题的临门一脚 —— 原来只写在这段注释里,
  等于库里查不到、报告说不出、用户以为没有。现在按官方原句逐条收进 pnp_requirements:
    · 一般情形:与该雇主连续全职 **6 个月**;
    · **在加拿大其他省/地区读的书**:与该雇主连续全职 **1 年**(appliesCondition='grad-other-province');
    · 不计入的时段(自雇 / 无授权工作 / 全日制在读期间的 co-op 工作)另存一行。
  🔴 口径隔离靠 `basis='employerTenure'`:量的是「在**这家**雇主干了多久」,不是本站问的
  同职业总经验。规则引擎认这个 basis,**只摆门槛不判定**(拿海外 5 年去判「6 个月达标」
  是假话,判 fail 也是假话 —— 本站根本没问过在职时长)。

**仍没抓的**:
  · SWO 的经验只进分值表(不满 1 年 = 0 分),不是资格线
  · 60/100 入池分(分值表的事,B4-4)
  · 结算资金 / 最低家庭收入(MB **不设**收入表 —— 全国只有 BC 发布了;这是结论不是缺口)

自校是硬闸:两个源任一没解析到、或逐职业条数异常就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_mb_req.py
        uv run python etl/pnp/build_mb_req.py --swm-only   # 只重算 SWM 在职时长(读 crawl 缓存,不联网)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))           # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → converters(HTML→md)+ cache(crawl 缓存)
import _paths
import cache
from converters import get_converter

IDOL_URL = "https://immigratemanitoba.com/mpnp/idol/"
SWO_URL = "https://immigratemanitoba.com/mpnp/skilled-worker/swo/eligibility/"
SWM_URL = "https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility"
# B2-4(2026-08-03):雇主侧 —— MB 雇主招外籍走 Employer Direct Initiative(EDI;TRRP 同文):
# 「owned and actively operated the business for at least three consecutive years」。
# MPNP SWM 主线本身不设雇主年限数字(SWM 的 6 个月是申请人在职时长,见头注);EDI 是雇主端的申请通道。
EDI_URL = "https://immigratemanitoba.com/employer-services/edi/"
OUT = _paths.PNP / "mb-req.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}

PROVINCE = "MB"
PROGRAM = "PNP"
IDOL_STREAM = "MPNP In-Demand Occupations List"
SWO_STREAM = "MPNP Skilled Worker Overseas"
SWM_STREAM = "MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM) Pathway"
SWM_SECTION = "Eligibility — Skilled Worker in Manitoba: ongoing Manitoba employment"
MIN_OCC = 100     # 在需清单实见 150+ 行;低于此数视为改版/解析异常

# IDOL 表行:| NOC | TEER | 职业名 | 最低 CLB | 2016 对应 | 2016 技能等级 |
ROW = re.compile(r"^\|\s*(\d{5})\s*\|\s*(\d)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|")
# 「Applicants whose occupation is classified at TEER 4 or 5 … must … have at least CLB/NCLC 4」
RE_SWO_FLOOR = re.compile(r"occupation is classified at TEER ([\d ]*or \d).{0,140}?"
                          r"have at least CLB/NCLC (\d)", re.I)
# EDI:「owned and actively operated the business for at least three consecutive years」(B2-4)
_WORD_N = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
           "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}
RE_EDI_YEARS = re.compile(r"owned and actively operated the business for at least (\w+) consecutive years", re.I)
# SWM 在职时长两档(官方一句两个 bullet:一般 6 个月 / 外省毕业 1 年)。整句捕获 = label 就是官方原文。
RE_SWM_BASE = re.compile(
    r"(Ongoing Manitoba employment means that you possess a valid work permit and\s*"
    r"a Manitoba company has offered you a full-time, long-term job after you have completed "
    r"(\w+) months? or more of continuous full-time employment with that company)", re.I)
RE_SWM_GRAD = re.compile(
    r"(if you graduated from a post-secondary program in another Canadian province/territory, "
    r"a Manitoba company has offered you a full-time, long-term job after you have completed "
    r"at least (\w+) years? or more of continuous full-time employment with that company)", re.I)
# 不计入的时段(自雇 / 无授权工作 / 全日制在读期间的 co-op)——「1 年」怎么算全看这一句
RE_SWM_EXCL = re.compile(
    r"(Any periods of self-employment, unauthorized work, or periods of employment during which "
    r"you were engaged in full-time study.{0,80}?will not be included when calculating the period "
    r"of qualifying work experience in Manitoba\.)", re.I)


def page_text(url: str, cache_first: bool = False) -> str:
    """页面正文纯文本。cache_first=True 时先查 crawl 缓存(每小时一轮的整站爬),
    缓存没有才发请求 —— 同一页不抓两遍(etl/crawl/cache.py)。"""
    html = cache.get(url)[0] if cache_first else None
    if not html:
        html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    for t in soup(["script", "style", "nav", "header", "footer"]):
        t.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True))


def teers(s: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d", s)]


def req(**kw) -> dict:
    base = {"stream": IDOL_STREAM, "subject": "applicant", "op": ">=", "value": None, "valueText": "",
            "unit": "", "appliesTeer": [], "appliesNoc": "", "excludesNoc": "", "appliesArea": "",
            "appliesCondition": "", "familySize": None, "basis": "", "label": "", "section": "",
            "url": IDOL_URL}
    return {**base, **kw}


def build_swm() -> tuple:
    """SWM 在职时长两档 + 不计入时段 → ([门槛行], [问题])。读 crawl 缓存,不发请求。
    basis='employerTenure':量的是「在这家雇主连续全职多久」,不是同职业总经验(见文件头红线)。"""
    problems: list = []
    text = page_text(SWM_URL, cache_first=True)
    rows: list = []

    def tenure(m, months_per_unit: int, cond: str):
        n = _WORD_N.get(m.group(2).lower()) or (int(m.group(2)) if m.group(2).isdigit() else None)
        if n is None:
            problems.append(f"SWM 在职时长的数词认不出:{m.group(2)!r}")
            return
        rows.append(req(stream=SWM_STREAM if not cond else f"{SWM_STREAM} (graduated in another Canadian province/territory)",
                        url=SWM_URL, factor="experience", value=n * months_per_unit, unit="months",
                        basis="employerTenure", appliesCondition=cond, section=SWM_SECTION,
                        label=re.sub(r"\s+", " ", m.group(1)).strip()))

    mb_ = RE_SWM_BASE.search(text)
    if mb_:
        tenure(mb_, 1, "")
    else:
        problems.append("SWM 一般情形的在职时长(六个月)没解析到")
    mg = RE_SWM_GRAD.search(text)
    if mg:
        tenure(mg, 12, "grad-other-province")      # 官方用「年」→ 统一折成月,单位口径一张表只留一种
    else:
        problems.append("SWM 外省毕业生的在职时长(一年)没解析到")

    me = RE_SWM_EXCL.search(text)
    if me:
        # 「哪些时段不算数」不是阈值,是**算法说明** —— op='none' + value 留空,规则引擎不拿它判定,
        # 但它必须在库里:一年怎么算全看这一句(co-op 打的工不算)。
        rows.append(req(stream=SWM_STREAM, url=SWM_URL, factor="experienceExcluded", op="none",
                        basis="employerTenure", section=SWM_SECTION,
                        label=re.sub(r"\s+", " ", me.group(1)).strip()))
    else:
        problems.append("SWM 不计入时段那一句(self-employment / co-op)没解析到")
    return rows, problems


def main() -> None:
    print(f"OUT: {OUT}")
    # 只重算 SWM 在职时长:读 crawl 缓存,其余门槛(逐职业 CLB / SWO / EDI)原样保留
    if "--swm-only" in sys.argv:
        swm, problems = build_swm()
        if problems:
            print("✗ 自校未过,保留旧表不覆盖:")
            for p in problems:
                print("   -", p)
            sys.exit(1)
        d = json.loads(OUT.read_text(encoding="utf-8"))
        kept = [r for r in d.get("requirements", []) if not str(r.get("stream", "")).startswith(SWM_STREAM)]
        d["requirements"] = kept + swm
        OUT.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ {OUT}(只更新 SWM {len(swm)} 条;其余 {len(kept)} 条原样保留)")
        for r in swm:
            print(f"    {r['factor']:<20} {r['op']} {r['value']} {r['unit']}  cond={r['appliesCondition'] or '-'}")
        return

    reqs: list[dict] = []
    problems: list[str] = []

    # ── SWM 资格页:在职时长两档 + 不计入时段 ─────────────────────────────────
    swm, swm_problems = build_swm()
    reqs += swm
    problems += swm_problems

    # ── SWO 资格页:TEER 4/5 的硬性下限 ────────────────────────────────────────
    m = RE_SWO_FLOOR.search(page_text(SWO_URL, cache_first=True))
    if m:
        reqs.append(req(stream=SWO_STREAM, url=SWO_URL, factor="language", value=int(m.group(2)), unit="CLB",
                        appliesTeer=teers(m.group(1)),
                        section="Skilled Worker Overseas — Factor 1: Language Proficiency",
                        label=f"Applicants whose occupation is classified at NOC TEER {m.group(1)} must have at "
                              f"least CLB/NCLC {m.group(2)} to be eligible to apply"))
    else:
        problems.append("SWO 的 TEER 4/5 语言下限没解析到")

    # ── In-Demand 清单:逐职业 Minimum CLB ────────────────────────────────────
    html = httpx.get(IDOL_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=45).text
    md, _ = get_converter().convert(html, IDOL_URL, _PROFILE)
    occ: dict[str, tuple[int, int, str]] = {}    # noc → (teer, minCLB, title)
    conflicts = 0
    for ln in md.splitlines():
        r = ROW.match(ln.strip())
        if not r:
            continue
        noc, teer, title, clb = r.group(1), int(r.group(2)), re.sub(r"\s+", " ", r.group(3)).strip(), int(r.group(4))
        prev = occ.get(noc)
        if prev and prev[1] != clb:
            # 同一职业在主清单/乡镇清单给了不同档 → 取高的(说高了只会让人多考一次,
            # 说低了会让他以为够了),并计数上报,便于人工复核
            conflicts += 1
            if clb <= prev[1]:
                continue
        occ[noc] = (teer, clb, title)
    if len(occ) < MIN_OCC:
        problems.append(f"在需清单只解析到 {len(occ)} 个职业(<{MIN_OCC},疑似改版)")
    for noc, (teer, clb, title) in sorted(occ.items()):
        reqs.append(req(factor="language", value=clb, unit="CLB", appliesNoc=noc, appliesTeer=[teer],
                        section="In-Demand Occupations List — Minimum CLB",
                        label=f"The MPNP In-Demand Occupations List sets a minimum CLB {clb} for NOC {noc} "
                              f"({title}, TEER {teer})"))

    # ── 雇主侧(B2-4):EDI 经营年限(全省一档,无雇员数/营业额数字门槛)─────────────
    edi = RE_EDI_YEARS.search(page_text(EDI_URL, cache_first=True))
    if not edi:
        problems.append("EDI 雇主经营年限没解析到(employer-services/edi 页可能改版)")
    else:
        years = _WORD_N.get(edi.group(1).lower()) or (int(edi.group(1)) if edi.group(1).isdigit() else None)
        if years is None:
            problems.append(f"EDI 年限词认不出:{edi.group(1)!r}")
        else:
            reqs.append(req(stream="MPNP Employer Direct Initiative (EDI)", subject="employer",
                            factor="empYears", value=years, unit="years", url=EDI_URL,
                            section="EDI — employer eligibility",
                            label=f"Employer must have owned and actively operated the business for at least "
                                  f"{edi.group(1)} consecutive years immediately prior to applying (TRRP: same bar)"))

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": PROGRAM,
        "source": "MPNP — Skilled Worker in Manitoba eligibility & In-Demand Occupations List & Skilled Worker Overseas eligibility",
        "url": IDOL_URL, "pageUrl": SWO_URL,
        "guideEffective": "",       # 官方网页不印生效日期
        "fetched": date.today().isoformat(),
        "requirements": reqs,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  共 {len(reqs)} 条门槛(逐职业 {len(occ)} 个 + TEER 4/5 下限 1 条 + SWM {len(swm)} 条 + EDI)")
    if conflicts:
        print(f"  ⚠ {conflicts} 个职业在两张清单里的 Minimum CLB 不一致,已取高档(请人工抽查)")


if __name__ == "__main__":
    main()
