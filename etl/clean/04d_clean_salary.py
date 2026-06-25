"""
04d — normalize raw salary strings into clean structured fields, at the DATA layer
(was in the frontend `parseSalary`; per the project rule, cleaning belongs here).

Reads each job's raw `salary` string and writes back:
  - salaryAnnual : int | None   年薪折算(排序/「vs 中位」用;时薪×2080、范围取中点)
  - salaryText   : str          规范显示文本(如 "$96K–$135K/yr"、"$35/hr")

Runs on BOTH sources (same as 04c geography cleaning). 原地清洗:读哪个文件就写回哪个。

Usage:  uv run python etl/clean/04d_clean_salary.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/ 上层(_paths 在那)
import _paths  # noqa: E402

# ── 输入/输出全路径(先声明再用;原地清洗 → IN 与 OUT 同址)──────────────
IN_COMPANIES_DIR = _paths.COMPANIES                  # processed/ontario/ottawa/kanata-north/companies/
IN_JOBBANK_FILE = _paths.PROCESSED_JOBBANK / "postings.json"   # processed/jobbank/postings.json(原地清洗)
OUT_COMPANIES_DIR = IN_COMPANIES_DIR                  # 各 <slug>/jobs.json 原地写回
OUT_JOBBANK_FILE = IN_JOBBANK_FILE                    # 原地写回

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")
# 只取「$ 锚定」的金额(含范围):$24.74-31.37 / $700,000 to $775,000。
# 避开杂数:工会号(CUPE 1975)、Phase 4、邮编等没有 $ 前缀的数字。
_MONEY = re.compile(r"\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*\$?\s?(\d[\d,]*(?:\.\d+)?))?")
# 年化倍数:时薪×2080、日薪×260(工作日)、周×52、双周×26、月×12
MULT = {"hr": 2080, "day": 260, "wk": 52, "biwk": 26, "mo": 12, "yr": 1}
SUB = {"hr": "/hr", "day": "/day", "wk": "/wk", "biwk": "/2wk", "mo": "/mo", "yr": "/yr"}


def _amounts(raw: str) -> list[float]:
    """优先取 $ 锚定金额;没有 $ 时退回全部数字(老行为,兜底无 $ 的薪资)。"""
    vals: list[float] = []
    for a, b in _MONEY.findall(raw):
        for x in (a, b):
            if x:
                vals.append(float(x.replace(",", "")))
    if vals:
        return vals
    return [float(m.replace(",", "")) for m in _NUM.findall(raw)]


def parse_salary(raw: str) -> tuple[int | None, str]:
    """任意格式 → (年薪数值, 规范文本)。只用 $ 锚定金额,支持 daily/biweekly。"""
    if not raw:
        return None, "—"
    allnums = [n for n in _amounts(raw) if n > 0]
    nums = [n for n in allnums if n < 1_000_000]  # 过滤离谱金额(源 typo)
    use = nums or allnums
    if not use:
        return None, raw
    low = raw.lower()
    lo, hi = min(use), max(use)
    # 单位判断(biweekly 必须在 week 之前;daily 单列)+ 常识纠错
    if re.search(r"bi[-\s]?week|every\s+two\s+weeks|fortnight", low):
        unit = "biwk"
    elif "month" in low:
        unit = "mo"
    elif "week" in low:
        unit = "wk"
    elif re.search(r"\bdaily\b|per\s+day|/\s?day", low):
        unit = "day"
    elif re.search(r"hour|/\s?hr|hourly", low):
        unit = "hr"
    else:
        unit = "hr" if hi < 2000 else "yr"
    if unit == "hr" and lo >= 1000:  # 时薪值≥$1000 → 实为年薪(源误标)
        unit = "yr"
    annual = round(((lo + hi) / 2) * MULT[unit])
    sub = SUB[unit]
    money = (lambda n: f"${round(n / 1000)}K") if unit == "yr" else (lambda n: f"${round(n)}")
    text = f"{money(lo)}{sub}" if lo == hi else f"{money(lo)}–{money(hi)}{sub}"
    return annual, text


def apply_to(job: dict) -> bool:
    """读 raw salary → 写回 salaryAnnual/salaryText;有变化返回 True。"""
    annual, text = parse_salary(job.get("salary") or "")
    new_text = text if job.get("salary") else None
    if job.get("salaryAnnual") == annual and job.get("salaryText") == new_text:
        return False
    job["salaryAnnual"], job["salaryText"] = annual, new_text
    return True


def main() -> None:
    print(f"IN/OUT companies : {OUT_COMPANIES_DIR}")
    print(f"IN/OUT job bank  : {OUT_JOBBANK_FILE}")
    total = priced = updated = 0

    # 1) ATS 公司岗
    for jobs_json in IN_COMPANIES_DIR.rglob("jobs.json"):
        data = json.loads(jobs_json.read_text(encoding="utf-8"))
        changed = False
        for j in data.get("jobs", []):
            total += 1
            if j.get("salary"):
                priced += 1
            if apply_to(j):
                updated += 1
                changed = True
        if changed:
            jobs_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2) Job Bank 帖子
    if IN_JOBBANK_FILE.exists():
        postings = json.loads(IN_JOBBANK_FILE.read_text(encoding="utf-8"))
        changed = False
        for j in postings:
            total += 1
            if j.get("salary"):
                priced += 1
            if apply_to(j):
                updated += 1
                changed = True
        if changed:
            OUT_JOBBANK_FILE.write_text(json.dumps(postings, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Salary cleaned: {updated} jobs updated · {priced}/{total} have a salary")


if __name__ == "__main__":
    main()
