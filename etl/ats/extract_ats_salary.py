"""
04b — extract salary from the scraped ATS job descriptions (.md) and write it back
into each company's jobs.json `salary` field, so the loader can show ATS salaries
(Job Bank already had structured salary; ATS posts bury it in the description text).

Matches common phrasings: "Salary range: $X to $Y CAD", "Pay range - $X-$Y per year",
"Hiring salary range ... between $X - $Y", "$28.00 per hour", "$X - $Y CAD per hour",
"compensation (based on 2,080 hours per year) ranges from $X to $Y".

Usage:  uv run python etl/ats/main.py --only salary

2026-08-31 批H2 归户搬家:自 etl/clean/04b_extract_ats_salary.py 迁进 ats 域改此名
(判据「谁的数据谁管」—— 本件只对 ATS 生效,不是真横切:它读 ATS 各司 jobs/*.md、
写回同一批 jobs.json,别的源一个字都不碰)。搬家批 —— 抽取逻辑一字未动,只去 `__main__`
收成 run()(一域一门,门在 ats/main.py),门从 subprocess 包装改直调
(旧包装 ats/main.py 的 extract_ats_salary/STEP_PY/SALARY_SCRIPT/STEP_FAIL_TPL 同批拆除;
批F 立域时留 subprocess 是因为文件还住 clean/,归户后没有跨进程的理由)。
样张 etl/ats/scrape_ats_jobs.py(同域同批同形:去 __main__ + 收 run() + 裸 `import paths`)。
"""
import json
import re
from pathlib import Path

import paths

# ── 输入/输出全路径(先声明再用)──────────────────────────────────────
# 输入:各公司 <slug>/jobs/*.md 描述 + <slug>/jobs.json;输出:原地写回 jobs.json 的 salary
IN_COMPANIES_DIR = paths.COMPANIES                  # processed/ontario/ottawa/kanata-north/companies/
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                  # 原地写回

AMOUNT = r"\$\s?\d[\d,]*(?:\.\d+)?"
RANGE = rf"{AMOUNT}(?:\s*(?:-|–|—|to)\s*\$?\s?\d[\d,]*(?:\.\d+)?)?"
UNIT = r"(?:\s*(?:CAD|USD))?(?:\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|/\s?year|per\s+annum|annually|a\s+year))?"
# 关键词锚定(更准):salary/pay/compensation … 后面 80 字符内出现金额
# (80 而非 40:覆盖 "compensation (based on 2,080 hours per year) ranges from $X" 这种长前缀)
ANCHORED = re.compile(
    r"(?:salary range|pay range|hiring salary range|base salary range|salary|compensation)[^$]{0,80}(" + RANGE + UNIT + ")",
    re.I,
)
# 兜底:带「per hour/year」单位的金额(避免误抓商品价格)
WITH_UNIT = re.compile(
    r"(" + RANGE + r"\s*(?:CAD|USD)?\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|/\s?year|per\s+annum|annually|a\s+year))",
    re.I,
)


def clean(s: str) -> str:
    s = s.replace("&nbsp;", " ").replace(" ", " ")
    s = re.sub(r"\s+", " ", s).strip(" .:-–—")
    return s


def extract_salary(text: str) -> str:
    text = text.replace("&nbsp;", " ").replace(" ", " ")
    m = ANCHORED.search(text)
    if m and m.group(1).strip() not in ("$", ""):
        return clean(m.group(1))
    m = WITH_UNIT.search(text)
    if m:
        return clean(m.group(1))
    return ""


def main() -> None:
    print(f"IN/OUT companies : {OUT_COMPANIES_DIR}")
    # url -> .md 路径索引(.md frontmatter 带 url:)
    idx: dict[str, Path] = {}
    for md in IN_COMPANIES_DIR.rglob("jobs/*.md"):
        head = md.read_text(encoding="utf-8")[:600]
        m = re.search(r"^url:\s*(.+)$", head, re.M)
        if m:
            idx[m.group(1).strip()] = md
    total = updated = 0
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        jobs = data.get("jobs", [])
        changed = False
        for j in jobs:
            total += 1
            if j.get("salary"):
                continue
            md = idx.get((j.get("url") or "").strip())
            if not md:
                continue
            sal = extract_salary(md.read_text(encoding="utf-8"))
            if sal:
                j["salary"] = sal
                updated += 1
                changed = True
        if changed:
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted salary for {updated}/{total} ATS jobs (from .md descriptions)")


def run() -> None:
    """本域步骤入口:从各司 jobs/*.md 描述里抽结构化薪资,就地补进 jobs.json 的 salary。"""
    main()
