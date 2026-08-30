"""
build_ee_rules — 联邦 Express Entry 官方口径:**CRS/FSW 计分 + 语言换算 + 资格规则**。

铁律「URL → 数据 → SQL」:先 grep `data/crawl/*/manifest.json` 确认 canada.ca 的 EE 区
从未被覆盖(2026-08-05 实测:只有 fed-pgwp / fed-rcip 两个联邦 slug)→ 在
`etl/crawl/discover_sources.py` 加 `fed-ee` 种子实爬(97 页)→ 本脚本只**读 crawl 缓存**
(etl/crawl/cache.get),不自己猜 URL、不重复发请求。

一个关注点一个脚本(宪法 §清洗-3):CRS 计分与 CEC/FSW/FST 资格同源于同一次 fed-ee 爬取、
共用同一套「HTML 表 → 窄表行」解析器,故一个脚本集中产出。

两种数据两种做法:
  · **CRS 计分表** = 官方 HTML 表格,机器逐格解析成**窄表**(一行 = 一个 criterion × 一列表头),
    列数各表不同(2~5 列)→ 窄表天然容纳,不必为每张表定宽列。数字原样搬,不折算、不推导。
  · **资格规则** = 散在正文里的句子,照 build_pgwp.py 的 **quote-anchored** 惯例:规则由人从
    原文抄成结构化行,每轮跑再逐条验证 `valueText` 仍逐字在页面上;引用消失(改版)→
    **保留旧表 + exit 1**,绝不拿半份数据盖好数据。

举证纪律:每行带 {url, fetched},fetched = 该页**真正被取回**那天(crawl 轮次日期),不是今天。
页面没写的东西一律不写(如 CRS 总分 1200 分:官方页面上并无「1,200」字样 → 本表只落各段
官方原文写明的 Maximum 句子,不替官方求和)。抓不到 → not-collected,绝不写「官方不公布」。

Usage:  uv run python etl/build_ee_rules.py
"""
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent.parent  # 分域后上一级才是 etl/
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE / "crawl"))
import _paths
from cache import get as crawl_get

# ── IN(crawl 役产物;URL 是键,实体在 html_cache/)───────────────────────────
IN_CRAWL = _paths.CRAWL / "fed-ee"                      # manifest.json + html_cache/
_EE = ("https://www.canada.ca/en/immigration-refugees-citizenship/services/"
       "immigrate-canada/express-entry/")
IN_URL_CRS = _EE + "check-score/crs-criteria.html"          # CRS 计分表(A/B/C/D 四段 20 张表)
IN_URL_CEC = _EE + "who-can-apply/canadian-experience-class.html"
IN_URL_FSW = _EE + "who-can-apply/federal-skilled-workers.html"   # 含 67 分 selection factors
IN_URL_FST = _EE + "who-can-apply/federal-skilled-trades.html"
# RCIP(Rural / Francophone Community Immigration Pilots)不是 Express Entry 项目,不挂在 _EE 前缀下,
# 但门槛表同样落 province='FED'、同一份 fed-eligibility.json(C5b-0,2026-08-05)——两条 pilot 的
# 「Work experience」页文案逐字相同(已用 fed-rcip crawl 缓存核对),Rural 页作为 quote 出处,
# Franco 页只做交叉核验(见 main() 里的 missing_franco 检查),不重复落两条一样的行。
_RCIP = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/"
IN_URL_RCIP_RURAL = _RCIP + "rural-immigration/eligibility/work-experience.html"
IN_URL_RCIP_FRANCO = _RCIP + "franco-immigration/eligibility/work-experience.html"
# RCIP(Rural)语言门槛页(2026-08-14 L2-09 用例横测暴露:库里没有语言行 → 引擎把「没收录」
# 当成「不要求」,语言没考的人也看到「即可申请」)。Franco 试点语言规则不同(NCLC 5 一刀切,
# 纯法语),不共享这批行 —— 交叉核验只对经验行。
IN_URL_RCIP_LANG = _RCIP + "rural-immigration/eligibility/language-test.html"
# FCIP(法语社区试点)2026-08-15 立成独立通道(Frank「还有法语区,都拆成不同的策略文件吧」)。
# **不与 RCIP 共享语言行**:官方 NCLC 5 一刀切、且是法语;经验页文案与 Rural 页逐字相同,
# 但落成 program='FCIP' 自己的行 —— 两条 pilot 的社区名单、名额、语言尺子都不是一回事。
IN_URL_FCIP_ELIG = _RCIP + "franco-immigration/eligibility.html"
IN_URL_FCIP_LANG = _RCIP + "franco-immigration/eligibility/language-test.html"
IN_URL_LANG = _EE + "documents/language-test.html"          # 三个项目的最低 CLB/NCLC 门槛表
IN_URL_ECA = _EE + "documents/education-assessment.html"     # ECA 结果 → FSW 教育 selection factor 分

# ── OUT ────────────────────────────────────────────────────────────────────
OUT_CRS = _paths.EE / "crs-grid.json"
OUT_ELIG = _paths.EE / "fed-eligibility.json"
OUT_LANG = _paths.EE / "language-grid.json"

SECTION_RE = re.compile(r"^([A-D])\.\s+(.+?)\s*$")


def norm(t: str) -> str:
    """归一化后再比对:弯引号→直引号、压空白 —— 引用核对不被排版噪音干扰(同 build_pgwp)。"""
    t = t.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", t).strip()


def load(url: str) -> tuple[BeautifulSoup, str]:
    """只走 crawl 缓存:没爬到就报错,不偷偷 httpx 补(那正是「猜 URL」的老病根)。"""
    html, fetched = crawl_get(url)
    if not html:
        raise SystemExit(f"✗ crawl 缓存里没有这一页(先跑 etl/crawl/discover_sources.py fed-ee):{url}")
    return BeautifulSoup(html, "html.parser").find("main"), fetched


def page_updated(main: BeautifulSoup) -> str:
    """canada.ca「Page details」的官方改版日期(GCDS web component,不是 <time>)。找不到→空串。"""
    t = main.find("gcds-date-modified")
    return t.get_text(strip=True) if t else ""


def parse_table(tbl) -> tuple[str, list[str], list[list[str]]]:
    """一张 HTML 表 → (第一列表头, 其余列表头, 数据行)。表头 = 第一个 tr。"""
    rows = [[norm(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
            for tr in tbl.find_all("tr")]
    rows = [r for r in rows if r]
    if not rows:
        return "", [], []
    head, body = rows[0], rows[1:]
    return head[0], head[1:], body


def as_points(text: str):
    """'90' → 90;'n/a' / 'Not eligible to apply' → None(原文留在 pointsText,不瞎猜)。"""
    m = re.fullmatch(r"([\d,]+)", text)
    return int(m.group(1).replace(",", "")) if m else None


def nearest_heading(tbl) -> tuple[str, str, str, bool]:
    """回溯最近的标题链 → (section 字母, section 名, 本表小标题, 是否 breakdown 明细表)。"""
    heading = ""
    letter = label = ""
    is_detail = False
    for h in tbl.find_all_previous(["h2", "h3", "h4"]):
        txt = norm(h.get_text(" ", strip=True))
        if not heading:
            heading = txt
        if "breakdown" in txt.lower():
            is_detail = True
        m = SECTION_RE.match(txt)
        if m:
            letter, label = m.group(1), m.group(2)
            break
    return letter, label, heading, is_detail


def grid_rows(main, url: str, fetched: str, section_of=nearest_heading) -> list[dict]:
    """所有表 → 窄表行:一行 = 一个 criterion × 一个列表头。列数各表不同,窄表天然容纳。"""
    out: list[dict] = []
    for idx, tbl in enumerate(main.find_all("table")):
        letter, label, heading, is_detail = section_of(tbl)
        factor, cols, body = parse_table(tbl)
        for row in body:
            criterion, cells = row[0], row[1:]
            for j, cell in enumerate(cells):
                out.append({
                    "section": letter, "sectionLabel": label,
                    "kind": "detail" if is_detail else "summary",
                    "table": idx, "heading": heading,
                    "factor": factor, "criterion": criterion,
                    "column": cols[j] if j < len(cols) else "",
                    "points": as_points(cell), "pointsText": cell,
                    "url": url, "fetched": fetched,
                })
    return out


PROGRAM_HEADINGS = {
    "Federal Skilled Worker Program": "FSW",
    "Federal Skilled Trades Program": "FST",
    "Canadian Experience Class": "CEC",
}
TEST_NAMES = {
    "CELPIP": "CELPIP-G",
    "IELTS": "IELTS General Training",
    "PTE Core": "PTE Core",
    "TEF Canada": "TEF Canada",
    "TCF Canada": "TCF Canada",
}


def previous_heading(tbl, tag: str, accepted: dict[str, str]) -> str:
    """取本表之前最近一个命中白名单的标题;页面里的说明性 h3 不会误当 program。"""
    for h in tbl.find_all_previous(tag):
        text = norm(h.get_text(" ", strip=True))
        if text in accepted:
            return accepted[text]
    return ""


def language_tables(main, url: str, fetched: str) -> list[dict]:
    """language-test.html 的 T4–T26 → 23 张原表的稳定结构;数字不在这里换算或推导。"""
    tables = main.find_all("table")
    selected = list(enumerate(tables[4:], start=4))
    if len(selected) != 23:
        raise SystemExit(f"✗ 语言换算表预期 T4–T26 共 23 张,实际 {len(selected)} 张——保留旧表")

    out = []
    for table_no, tbl in selected:
        parsed = [[norm(c.get_text(" ", strip=True)) for c in tr.find_all(["th", "td"])]
                  for tr in tbl.find_all("tr")]
        parsed = [r for r in parsed if r]
        headers, body = parsed[0], parsed[1:]
        if not body or any(len(r) != len(headers) for r in body):
            raise SystemExit(f"✗ 语言表 T{table_no} 列数不齐——保留旧表")

        program = previous_heading(tbl, "h3", PROGRAM_HEADINGS)
        test_heading = norm(tbl.find_previous("h4").get_text(" ", strip=True))
        test = next((code for prefix, code in TEST_NAMES.items() if test_heading.startswith(prefix)), "")
        benchmark_header = next((h for h in headers if h in {"CLB Level", "NCLC Level"}), "")
        if not program or not test or not benchmark_header:
            raise SystemExit(f"✗ 语言表 T{table_no} 上下文识别失败"
                             f"(program={program!r}, test={test!r}, benchmark={benchmark_header!r})——保留旧表")

        level_idx = headers.index(benchmark_header)
        teer_idx = headers.index("NOC TEER") if "NOC TEER" in headers else None
        value_cols = [i for i in range(len(headers)) if i not in {level_idx, teer_idx}]
        out.append({
            "tableNo": table_no, "program": program, "test": test,
            "benchmark": "CLB" if benchmark_header.startswith("CLB") else "NCLC",
            "headers": headers,
            "rows": [{
                "rowNo": row_no,
                "levelText": row[level_idx],
                "nocTeer": row[teer_idx] if teer_idx is not None else "",
                "cells": [{"column": headers[i], "valueText": row[i]} for i in value_cols],
            } for row_no, row in enumerate(body)],
            "url": url, "fetched": fetched,
        })
    return out


def fsw_education_rows(main, url: str, fetched: str) -> list[dict]:
    """ECA 报告解读页的 FSW 教育表;一行保留一个官方 assessment result 别名。"""
    expected = [
        "Assessment result (Canadian equivalency)",
        "Level of education for Express Entry profile",
        "Federal Skilled Workers Program selection factor points",
    ]
    match = None
    for table_no, tbl in enumerate(main.find_all("table")):
        factor, cols, body = parse_table(tbl)
        if [factor, *cols] == expected:
            match = (table_no, tbl, body)
            break
    if match is None:
        raise SystemExit("✗ ECA 页找不到 FSW 教育 selection factor 官方表——保留旧表")

    table_no, tbl, body = match
    rows = []
    for result, profile_level, points_text in body:
        rows.append({
            "section": "FSW", "sectionLabel": "Selection factors",
            "kind": "detail", "table": table_no,
            "heading": profile_level,
            # 这张表同时有 ECA 原结果与 EE profile 档位;现有窄表无额外列:
            # profile 档位放 heading、ECA 原结果放 criterion;factor 保持可被消费端稳定筛出的 Education。
            "factor": "Education", "criterion": result,
            "column": expected[2],
            "points": as_points(points_text), "pointsText": points_text,
            "url": url, "fetched": fetched,
        })
    if len(rows) < 100:
        raise SystemExit(f"✗ ECA 页 FSW 教育表只解析出 {len(rows)} 行——保留旧表")
    return rows


def crs_sections(main) -> list[dict]:
    """四段的官方 Maximum 原句原样收下(页面上没写的总分不替官方求和)。"""
    text = norm(main.get_text(" ", strip=True))
    heads = [(norm(h.get_text(" ", strip=True)), SECTION_RE.match(norm(h.get_text(" ", strip=True))))
             for h in main.find_all(["h2", "h3"])]
    marks = [(m.group(1), m.group(2), text.find(h)) for h, m in heads if m and text.find(h) >= 0]
    out = []
    for i, (letter, lab, pos) in enumerate(marks):
        end = marks[i + 1][2] if i + 1 < len(marks) else len(text)
        quotes = re.findall(r"Maximum [\d,]+ points(?: total)?", text[pos:end])
        out.append({"letter": letter, "label": lab, "maxQuotes": sorted(set(quotes))})
    return out


# ── 资格规则:人从官方原文抄的结构化行,机器只管「原文没变」(照 build_pgwp)──────
# page: cec/fsw/fst/lang  ·  quote 必须逐字(归一化后)出现在该页上,否则整表不更新。
RULES = [
    # ---- Canadian Experience Class ----
    {"program": "CEC", "page": "cec", "factor": "workTeer", "op": "in", "value": "0,1,2,3", "unit": "TEER",
     "label": "CEC: skilled work experience must be TEER 0/1/2/3",
     "quote": "be in 1 or more of these NOC categories: training, education, experience and responsibilities (TEER) 0, 1, 2, or 3"},
    {"program": "CEC", "page": "cec", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1;hoursPerWeek=30",
     "label": "CEC: 1 year (1,560 hours) of Canadian skilled work in the 3 years before applying",
     "quote": "be at least 1 year of work or 1,560 hours total (30 hours per week) in the 3 years before you apply"},
    {"program": "CEC", "page": "cec", "factor": "workLocation", "op": "rule", "value": "canada", "unit": "",
     "label": "CEC: experience must be gained in Canada while authorized to work",
     "quote": "be gained by working in Canada while authorized to work under temporary resident status"},
    {"program": "CEC", "page": "cec", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "CEC: self-employment and full-time-student work experience do not count",
     "quote": "Self-employment and work experience gained while you were a full-time student"},
    {"program": "CEC", "page": "cec", "factor": "education", "op": "rule", "value": "none", "unit": "",
     "label": "CEC: no education requirement",
     "quote": "There is no education requirement for the Canadian Experience Class"},
    {"program": "CEC", "page": "cec", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "CEC: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "CEC", "page": "lang", "factor": "language", "stream": "teer-0-1", "op": ">=", "value": 7, "unit": "CLB",
     "label": "CEC (TEER 0 or 1): CLB/NCLC 7 in all 4 abilities",
     "quote": "TEER 0 or 1 CLB 7 NCLC 7"},
    {"program": "CEC", "page": "lang", "factor": "language", "stream": "teer-2-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "CEC (TEER 2 or 3): CLB/NCLC 5 in all 4 abilities",
     "quote": "TEER 2 or 3 CLB 5 NCLC 5"},

    # ---- Federal Skilled Worker ----
    {"program": "FSW", "page": "fsw", "factor": "workTeer", "op": "in", "value": "0,1,2,3", "unit": "TEER",
     "label": "FSW: skilled work experience must be TEER 0/1/2/3",
     "quote": "be in 1 of these TEER categories: 0, 1, 2, or 3"},
    {"program": "FSW", "page": "fsw", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "minYears=1;continuous=true;hoursPerWeek=30",
     "label": "FSW: 1 year of continuous work (1,560 hours)",
     "quote": "be at least 1 year of continuous work or 1,560 hours total (30 hours per week)"},
    {"program": "FSW", "page": "fsw", "factor": "workRecency", "op": "<=", "value": 10, "unit": "years",
     "label": "FSW: experience obtained within the last 10 years, in Canada or abroad",
     "quote": "have been obtained within the last 10 years, in Canada or abroad"},
    {"program": "FSW", "page": "fsw", "factor": "passMark", "op": ">=", "value": 67, "unit": "points",
     "basis": "outOf=100;separateFromCRS=true",
     "label": "FSW: 67 of 100 selection-factor points to qualify",
     "quote": "If you score 67 points or higher , you may qualify for the Federal Skilled Worker Program"},
    {"program": "FSW", "page": "fsw", "factor": "education", "op": "rule", "value": "eca-required", "unit": "",
     "label": "FSW: foreign education needs a completed credential + ECA",
     "quote": "a completed educational credential and an Educational Credential Assessment for immigration purposes"},
    {"program": "FSW", "page": "fsw", "factor": "proofOfFunds", "op": "rule", "value": "required-unless-jobofer", "unit": "",
     "basis": "waivedIf=legallyWorkInCanada+validJobOffer",
     "label": "FSW: proof of funds required unless legally able to work in Canada with a valid job offer",
     "quote": "You don't need proof of funds if you: are currently able to legally work in Canada, and have a valid job offer from an employer in Canada"},
    {"program": "FSW", "page": "fsw", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "FSW: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "FSW", "page": "lang", "factor": "language", "stream": "first-official", "op": ">=", "value": 7, "unit": "CLB",
     "label": "FSW: CLB 7 (NCLC 7) minimum in all 4 abilities, first official language",
     "quote": "Language Minimum level for all 4 abilities English CLB 7 French NCLC7"},

    # ---- Federal Skilled Trades ----
    {"program": "FST", "page": "fst", "factor": "workNocGroups", "op": "in",
     "value": "72(-726),73,82,83,92,93(-932),6320,62200", "unit": "NOC",
     "label": "FST: experience must be in the listed NOC major/minor/unit groups",
     "quote": "Major Groups 72 (excluding Sub-Major Group 726), 73 , 82 , 83 , 92 , or 93 (excluding Sub-Major Group 932) Minor Group 6320 Unit Group 62200"},
    {"program": "FST", "page": "fst", "factor": "workHours", "op": ">=", "value": 3120, "unit": "hours",
     "basis": "windowYears=5;minYears=2",
     "label": "FST: 2 years (3,120 hours) of full-time skilled-trade work in the 5 years before applying",
     "quote": "be at least 2 years of full-time work experience (or 3,120 hours total) in a skilled trade within the 5 years before you apply"},
    {"program": "FST", "page": "fst", "factor": "jobOfferOrCertificate", "op": "rule", "value": "required", "unit": "",
     "label": "FST: needs a >=1-year full-time job offer OR a Canadian certificate of qualification",
     "quote": "a valid job offer of full-time employment for a total period of at least 1 year, or a certificate of qualification in your skilled trade issued by a Canadian provincial, territorial or federal authority"},
    {"program": "FST", "page": "fst", "factor": "education", "op": "rule", "value": "none", "unit": "",
     "label": "FST: no education requirement",
     "quote": "There is no education requirement for the Federal Skilled Trades Program"},
    {"program": "FST", "page": "fst", "factor": "residence", "op": "rule", "value": "outside-QC", "unit": "",
     "label": "FST: must plan to live outside Quebec",
     "quote": "You must plan to live outside the province of Quebec"},
    {"program": "FST", "page": "lang", "factor": "language", "stream": "speaking-listening", "op": ">=", "value": 5, "unit": "CLB",
     "label": "FST: CLB/NCLC 5 for speaking and listening",
     "quote": "English Speaking and listening CLB 5"},
    {"program": "FST", "page": "lang", "factor": "language", "stream": "reading-writing", "op": ">=", "value": 4, "unit": "CLB",
     "label": "FST: CLB/NCLC 4 for reading and writing",
     "quote": "English Reading and writing CLB 4"},

    # ---- Rural and Francophone Community Immigration Pilots (RCIP) ----
    # C5b-0:引擎缺的工作经验门槛行。Rural/Franco 两条 pilot 的 Work experience 页文案逐字相同
    # (fed-rcip crawl 缓存 2025-08-13 版核对过),quote 出自 Rural 页,main() 里另外核验 Franco 页同款。
    {"program": "RCIP", "page": "rcip_rural", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "RCIP: 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "you need at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"program": "RCIP", "page": "rcip_rural", "factor": "workSelfEmployed", "op": "rule", "value": "excluded", "unit": "",
     "label": "RCIP: self-employed work does not count toward the experience requirement",
     "quote": "not be from a self-employed job"},
    # RCIP 语言门槛按 offer 的 TEER 分档(2026-08-14 补;stream=teer-a-b 闭区间,引擎 fedLangApplies 消费)
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-0-1", "op": ">=", "value": 6, "unit": "CLB",
     "label": "RCIP: TEER 0 or 1 job offer needs CLB 6",
     "quote": "TEER 0 or 1: CLB 6"},
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-2-3", "op": ">=", "value": 5, "unit": "CLB",
     "label": "RCIP: TEER 2 or 3 job offer needs CLB 5",
     "quote": "TEER 2 or 3: CLB 5"},
    {"program": "RCIP", "page": "rcip_lang", "factor": "language", "stream": "teer-4-5", "op": ">=", "value": 4, "unit": "CLB",
     "label": "RCIP: TEER 4 or 5 job offer needs CLB 4",
     "quote": "TEER 4 or 5: CLB 4"},

    # ---- Francophone Community Immigration Pilot (FCIP) ----
    # 2026-08-15:FCIP 立成第 14 条通道,门槛行**自己一份**(先前 program='FCIP' 一行都没有,
    # 判定层只能如实落「本站未收录」)。语言是它与 RCIP 最大的区别:NCLC 5 一刀切、且是**法语**。
    {"program": "FCIP", "page": "fcip_elig", "factor": "workHours", "op": ">=", "value": 1560, "unit": "hours",
     "basis": "windowYears=3;minYears=1",
     "label": "FCIP: 1 year (1,560 hours) of related work experience in the past 3 years",
     "quote": "have at least 1 year (1,560 hours) of related work experience in the past 3 years"},
    {"program": "FCIP", "page": "fcip_elig", "factor": "offerDesignatedEmployer", "op": "rule", "value": "required", "unit": "",
     "label": "FCIP: job offer must come from a designated employer in the community",
     "quote": "have a valid job offer from a designated employer in the community"},
    {"program": "FCIP", "page": "fcip_lang", "factor": "language", "op": ">=", "value": 5, "unit": "NCLC",
     "label": "FCIP: NCLC 5 in all 4 abilities (French)",
     "quote": "You need a minimum score of NCLC 5 in all 4 abilities to apply for the Francophone Community Immigration Pilot (FCIP)."},
]


def main() -> None:
    print(f"IN  : {IN_CRAWL}  (crawl 缓存,不重复发请求)")
    for u in (IN_URL_CRS, IN_URL_CEC, IN_URL_FSW, IN_URL_FST, IN_URL_LANG, IN_URL_ECA,
              IN_URL_RCIP_RURAL, IN_URL_RCIP_FRANCO):
        print(f"      {u}")
    print(f"OUT : {OUT_CRS}")
    print(f"OUT : {OUT_ELIG}")
    print(f"OUT : {OUT_LANG}")

    # ── 1. CRS 计分表 ────────────────────────────────────────────────────
    crs_main, crs_fetched = load(IN_URL_CRS)
    rows = grid_rows(crs_main, IN_URL_CRS, crs_fetched)
    sections = crs_sections(crs_main)
    letters = {s["letter"] for s in sections}
    if letters != {"A", "B", "C", "D"} or len(rows) < 150:   # 2026-08-05 实测 186 行,留裕量
        raise SystemExit(f"✗ CRS 页结构变了(段={sorted(letters)}, 行={len(rows)})—— 保留旧表,人工重核")

    OUT_CRS.parent.mkdir(parents=True, exist_ok=True)
    OUT_CRS.write_text(json.dumps({
        "source": "Express Entry: Comprehensive Ranking System (CRS) criteria",
        "url": IN_URL_CRS, "fetched": crs_fetched, "pageUpdated": page_updated(crs_main),
        "note": "窄表:一行 = 一个 criterion × 一个列表头(各表列数 2~5,不定宽)。points 为官方原格数字,"
                "非数字格(n/a、Not eligible to apply)points=None、原文留在 pointsText。"
                "kind=summary 是各段封顶速览表,detail 是逐档明细表。"
                "官方页面并未写出 CRS 总分上限,本表只收各段原文 Maximum 句(sections[].maxQuotes),不替官方求和。",
        "sections": sections,
        "rows": rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ CRS 计分表 {len(rows)} 行 / {len(sections)} 段 → {OUT_CRS.name}")

    # ── 2. 资格规则(quote-anchored)+ FSW 67 分 selection factors ────────
    pages = {}
    for key, url in (("cec", IN_URL_CEC), ("fsw", IN_URL_FSW), ("fst", IN_URL_FST), ("lang", IN_URL_LANG),
                     ("rcip_rural", IN_URL_RCIP_RURAL), ("rcip_franco", IN_URL_RCIP_FRANCO),
                     ("rcip_lang", IN_URL_RCIP_LANG),
                     ("fcip_elig", IN_URL_FCIP_ELIG), ("fcip_lang", IN_URL_FCIP_LANG)):
        m, fetched = load(url)
        pages[key] = {"url": url, "fetched": fetched, "main": m,
                      "text": norm(m.get_text(" ", strip=True))}

    missing = [r for r in RULES if norm(r["quote"]) not in pages[r["page"]]["text"]]
    if missing:
        print(f"✗ {len(missing)}/{len(RULES)} 条官方引用在页面上消失(改版?)—— 保留旧表,人工重核:")
        for r in missing:
            print(f"✗   [{r['program']}/{r['factor']}] {r['quote'][:90]}")
        raise SystemExit(1)

    # RCIP 两条 pilot 共享**经验**文案:Rural 页(上面已核验)之外,交叉核验 Franco 页也逐字命中,
    # 否则「两条 pilot 都是 1,560 小时」这个结论只验证了一半就写进了库。
    # 语言行不进这道闸:Franco 是 NCLC 5 一刀切(纯法语),与 Rural 的 TEER 分档不同源。
    rcip_missing_franco = [r for r in RULES if r["program"] == "RCIP" and r["page"] == "rcip_rural"
                           and norm(r["quote"]) not in pages["rcip_franco"]["text"]]
    if rcip_missing_franco:
        print("✗ RCIP 引用在 Franco pilot 页上对不上(Rural/Franco 文案已经不一致?)—— 保留旧表,人工重核:")
        for r in rcip_missing_franco:
            print(f"✗   [{r['program']}/{r['factor']}] {r['quote'][:90]}")
        raise SystemExit(1)

    reqs = [{
        "program": r["program"], "stream": r.get("stream", ""), "subject": "applicant",
        "factor": r["factor"], "op": r["op"], "value": r["value"], "valueText": r["quote"],
        "unit": r["unit"], "basis": r.get("basis", ""), "label": r["label"],
        "url": pages[r["page"]]["url"], "fetched": pages[r["page"]]["fetched"],
    } for r in RULES]

    # FSW 的 67 分 selection factors 是真表格 → 同一套窄表解析器(section 恒 FSW)
    sel = grid_rows(pages["fsw"]["main"], pages["fsw"]["url"], pages["fsw"]["fetched"],
                    section_of=lambda t: ("FSW", "Selection factors", nearest_heading(t)[2], True))
    if len(sel) < 30:
        raise SystemExit(f"✗ FSW selection factors 表只解析出 {len(sel)} 行 —— 页面结构变了,保留旧表")

    # FSW 页教育段只给去 ECA 页的链接,真正的 25 分档在 ECA 报告解读页第三张官方表。
    # URL 来自 fed-ee manifest 的真实命中,不是凭印象拼接;每个 ECA result 别名都保留,供报告原文精确匹配。
    eca_main, eca_fetched = load(IN_URL_ECA)
    education = fsw_education_rows(eca_main, IN_URL_ECA, eca_fetched)
    sel.extend(education)

    OUT_ELIG.write_text(json.dumps({
        "source": "Express Entry: Who can apply (CEC / FSW / FST) + Rural and Francophone Community "
                  "Immigration Pilots (RCIP): Work experience",
        # 表级 province:联邦源统一 FED(同 raw/ircc/pgwp_rules.json、fees.json)——09 的
        # build_pnp_requirements 从这里取,少了它 23 条会静默落成 province=''(引擎按省挑行永远挑不到)。
        # program 不在表级:这一个文件装四个项目(含 RCIP),逐行写在 requirements[].program 上。
        "province": "FED",
        "fetched": max([eca_fetched, *(p["fetched"] for p in pages.values())]),
        "note": "quote-anchored:valueText=官方原文,本脚本每轮验证其仍逐字在页面上;字段语义见 basis。"
                "requirements 形状对齐 raw/ircc/pgwp_rules.json(09 IN_REQ_TABLES 可直接消费)。"
                "selectionFactors = FSW 67 分制的官方表格(与 CRS 排名分是两套分,官方明确写明不同)。"
                "其中教育档来自 fed-ee 缓存命中的 ECA 报告解读页;criterion=ECA assessment result、"
                "heading=EE profile 教育档、points=FSW 教育分(最高 25),没有把 CRS 教育分混入。"
                "RCIP(program=RCIP)不是 Express Entry 项目、不参与 CRS,只是同表落 province='FED' 的"
                "经验门槛;来源是 Rural/Franco 两条 pilot 各自的 Work experience 官方页(文案逐字相同,"
                "已交叉核验),不是 fed-ee 那 97 页种子(RCIP 走 fed-rcip crawl slug)。",
        "programs": [
            {"code": code, "name": name, "url": pages[k]["url"],
             "fetched": pages[k]["fetched"], "pageUpdated": page_updated(pages[k]["main"])}
            for code, name, k in (("CEC", "Canadian Experience Class", "cec"),
                                  ("FSW", "Federal Skilled Worker Program", "fsw"),
                                  ("FST", "Federal Skilled Trades Program", "fst"),
                                  ("RCIP", "Rural and Francophone Community Immigration Pilots", "rcip_rural"),
                                  ("FCIP", "Francophone Community Immigration Pilot", "fcip_elig"))
        ],
        "requirements": reqs,
        "selectionFactors": sel,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ 资格规则 {len(reqs)} 条(引用全部核验通过)+ FSW selection factors {len(sel)} 行"
          f"(其中 ECA 教育 {len(education)} 行) → {OUT_ELIG.name}")

    # ── 3. 语言成绩 ↔ CLB/NCLC 换算(T4–T26,独立于计分表)──────────────
    lang_tables = language_tables(pages["lang"]["main"], IN_URL_LANG, pages["lang"]["fetched"])
    OUT_LANG.write_text(json.dumps({
        "source": "Express Entry: Language test results",
        "url": IN_URL_LANG, "fetched": pages["lang"]["fetched"],
        "pageUpdated": page_updated(pages["lang"]["main"]),
        "note": "language-test.html 的 T4–T26 共 23 张官方表。原始分数区间只存 valueText,"
                "不在 raw 层擅自补边界;表号、行号、原表头与项目上下文全部保留。"
                "该数据不是 CRS/FSW points,09 单独产出 ee_language_grid,禁止参与分数求和。",
        "tables": lang_tables,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ 语言换算 {len(lang_tables)} 张表 / "
          f"{sum(len(t['rows']) for t in lang_tables)} 个档位 → {OUT_LANG.name}")


if __name__ == "__main__":
    main()
