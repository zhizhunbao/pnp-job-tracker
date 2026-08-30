"""
build_pgwp — 联邦 PGWP 规则库(B1-4,2026-08-03;设计 docs/design/PGWP规则库-20260803.md)。

**quote-anchored**(Frank 拍板「原文为准」):规则表每行带官方原文引用(valueText),
本脚本每轮实抓 about/eligibility 两页,**逐条验证引用仍逐字存在于页面**——
页面改版引用消失 → 保留旧表 + exit 1(钉 ircc 役末尾,红了触发 healthchecks 报警;
crawl 役的 fed-pgwp 地图 diff 是第二道雷达)。规则是人工从原文抄的,机器管的是「原文没变」。

产出 raw/ircc/pgwp_rules.json,形状对齐 raw/pnp/<省>-req.json(province='FED' program='PGWP',
09 IN_REQ_TABLES 直接消费 → mart pnp_requirements → 引擎 facts.requirements 免费拿到;
pnp_draws 的 FED 行是同款先例)。第一期只收时长档/合并/一生一次/申请窗/最低时长/语言;
field-of-study CIP 六表 = 第二期(Frank 拍板)。

Usage:  uv run python etl/build_pgwp.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent.parent  # 分域后上一级才是 etl/
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE / "crawl"))  # converters(HTML→md)
import _paths
from converters import get_converter

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}

BASE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation"
URL_ABOUT = BASE + "/about.html"
URL_ELIG = BASE + "/eligibility.html"

OUT = _paths.IRCC / "pgwp_rules.json"

# 每行 = 一条官方规则:quote 必须逐字(归一化后)出现在 page 页面上,否则整表不更新。
# subject 恒 applicant;stream 区分时长档/学位层级;数值语义见 basis(人读)与引擎(机读 factor+stream+value)。
RULES = [
    {"page": "about", "factor": "pgwpLength", "stream": "masters", "op": ">=", "value": 36, "unit": "months",
     "effective": "2024-02-15", "basis": "permit=36;minProgramMonths=8;level=master",
     "label": "Master's degree >=8 months -> 3-year PGWP",
     "quote": "You can apply for a 3-year PGWP, even if your master's program was less than 2 years"},
    {"page": "about", "factor": "pgwpLength", "stream": "short", "op": "=", "value": None, "unit": "months",
     "basis": "permitEqualsProgram;minProgramMonths=8;maxMonthsExclusive=24",
     "label": "Program 8 months to <2 years -> PGWP up to same length",
     "quote": "We may give you a PGWP that's valid for up to the same length as your study program"},
    {"page": "about", "factor": "pgwpLength", "stream": "long", "op": ">=", "value": 36, "unit": "months",
     "basis": "permit=36;minProgramMonths=24",
     "label": "Program 2 years or more -> 3-year PGWP",
     "quote": "If your program was 2 years or more"},
    # 合并条款位于官方页「How long is a PGWP valid」下：各段时长用于确定工签长度；最终仍是 may、不是保证签发。
    {"page": "about", "factor": "pgwpCombine", "stream": "", "op": "rule", "value": None, "unit": "",
     "basis": "eachMinProgramMonths=8;languageTakesHigher",
     "label": "More than 1 program: lengths may combine (each PGWP-eligible & >=8 months; higher language req applies)",
     "quote": "You may be able to get a PGWP that combines the length of each program as long as you meet the eligibility requirement for each program"},
    {"page": "about", "factor": "pgwpOnce", "stream": "", "op": "rule", "value": 1, "unit": "lifetime",
     "basis": "oncePerLifetime",
     "label": "One PGWP per lifetime",
     "quote": "You can't get a PGWP if you already had one after completing an earlier program of study"},
    {"page": "elig", "factor": "pgwpWindow", "stream": "", "op": "<=", "value": 180, "unit": "days",
     "basis": "applyWithinDaysOfCompletion=180",
     "label": "Apply within 180 days of completion confirmation",
     "quote": "you apply for your PGWP within 180 days of confirmation that you completed your program of study"},
    {"page": "elig", "factor": "pgwpMinProgram", "stream": "", "op": ">=", "value": 8, "unit": "months",
     "basis": "minProgramMonths=8;quebecHours=900",
     "label": "Program must be at least 8 months (900 hours for Quebec programs)",
     "quote": "was at least 8 months long (or 900 hours for Quebec programs)"},
    {"page": "elig", "factor": "pgwpLanguage", "stream": "degree", "op": ">=", "value": 7, "unit": "CLB",
     "effective": "2024-11-01", "basis": "appliesSince=2024-11-01(PGWP application date)",
     "label": "University degree/program graduates: CLB 7 in all 4 areas",
     "quote": "minimum level of Canadian Language Benchmarks (CLB) 7 in English"},
    {"page": "elig", "factor": "pgwpLanguage", "stream": "college", "op": ">=", "value": 5, "unit": "CLB",
     "effective": "2024-11-01", "basis": "appliesSince=2024-11-01(PGWP application date)",
     "label": "College/polytechnic/non-university graduates: CLB 5 in all 4 areas",
     "quote": "minimum level of Canadian Language Benchmarks (CLB) 5 in English"},
]


def norm(t: str) -> str:
    """归一化后再比对:去 md 强调星号、弯引号→直引号、压空白 —— 引用核对不被排版噪音干扰。"""
    t = t.replace("*", "").replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", t)


def fetch_norm(url: str) -> str:
    html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md, _ = get_converter().convert(html, url, _PROFILE)
    return norm(md)


def main() -> None:
    print(f"OUT : {OUT}")
    pages = {"about": (URL_ABOUT, fetch_norm(URL_ABOUT)), "elig": (URL_ELIG, fetch_norm(URL_ELIG))}
    missing = [r for r in RULES if norm(r["quote"]) not in pages[r["page"]][1]]
    if missing:
        print(f"✗ {len(missing)}/{len(RULES)} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:")
        for r in missing:
            print(f"✗   [{r['factor']}/{r['stream']}] {r['quote'][:80]}")
        raise SystemExit(1)

    reqs = [{
        "stream": r["stream"], "subject": "applicant", "factor": r["factor"], "op": r["op"],
        "value": r["value"], "valueText": r["quote"], "unit": r["unit"],
        "basis": r["basis"], "label": r["label"], "section": r["page"],
        "effective": r.get("effective", ""), "url": pages[r["page"]][0],
    } for r in RULES]
    OUT.write_text(json.dumps({
        "province": "FED", "program": "PGWP", "url": URL_ABOUT,
        "fetched": date.today().isoformat(),
        "note": "quote-anchored:valueText=官方原文,本脚本每轮验证其仍在页面上;字段语义见 basis。"
                "多个合格课程可合并时长来确定 PGWP 长度;官方措辞为 may,不保证签发。",
        "requirements": reqs,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(reqs)} 条规则全部引用核验通过 → {OUT.name}")


if __name__ == "__main__":
    main()
