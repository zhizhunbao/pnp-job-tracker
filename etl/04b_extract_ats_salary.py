"""
04b — extract salary from the scraped ATS job descriptions (.md) and write it back
into each company's jobs.json `salary` field, so the loader can show ATS salaries
(Job Bank already had structured salary; ATS posts bury it in the description text).

Matches common phrasings: "Salary range: $X to $Y CAD", "Pay range - $X-$Y per year",
"Hiring salary range ... between $X - $Y", "$28.00 per hour", "$X - $Y CAD per hour".

Usage:  uv run python etl/04b_extract_ats_salary.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

AMOUNT = r"\$\s?\d[\d,]*(?:\.\d+)?"
RANGE = rf"{AMOUNT}(?:\s*(?:-|–|—|to)\s*\$?\s?\d[\d,]*(?:\.\d+)?)?"
UNIT = r"(?:\s*(?:CAD|USD))?(?:\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|/\s?year|per\s+annum|annually|a\s+year))?"
# 关键词锚定(更准):salary/pay/compensation … 后面 40 字符内出现金额
ANCHORED = re.compile(
    r"(?:salary range|pay range|hiring salary range|base salary range|salary|compensation)[^$]{0,40}(" + RANGE + UNIT + ")",
    re.I,
)
# 兜底:带「per hour/year」单位的金额(避免误抓商品价格)
WITH_UNIT = re.compile(
    r"(" + RANGE + r"\s*(?:CAD|USD)?\s*(?:per\s+hour|/\s?hour|hourly|per\s+year|/\s?year|per\s+annum|annually|a\s+year))",
    re.I,
)


def clean(s: str) -> str:
    s = s.replace("&nbsp;", " ").replace(" ", " ")
    s = re.sub(r"\s+", " ", s).strip(" .:-–—")
    return s


def extract_salary(text: str) -> str:
    text = text.replace("&nbsp;", " ").replace(" ", " ")
    m = ANCHORED.search(text)
    if m and m.group(1).strip() not in ("$", ""):
        return clean(m.group(1))
    m = WITH_UNIT.search(text)
    if m:
        return clean(m.group(1))
    return ""


def main() -> None:
    comp = _paths.COMPANIES
    # url -> .md 路径索引(.md frontmatter 带 url:)
    idx: dict[str, Path] = {}
    for md in comp.rglob("jobs/*.md"):
        head = md.read_text(encoding="utf-8")[:600]
        m = re.search(r"^url:\s*(.+)$", head, re.M)
        if m:
            idx[m.group(1).strip()] = md
    total = updated = 0
    for jobs_json in comp.rglob("jobs.json"):
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


if __name__ == "__main__":
    main()
