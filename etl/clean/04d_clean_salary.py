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
import os
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
# 佣金/奖金/补贴子句:该词及之后不算底薪("$25 hourly + $400 commission per sale" 只取 $25)
_EXTRA = re.compile(r"\+|\bplus\b|\bcommission\b|\bbonus(?:es)?\b|\btips?\b|\bgratuit", re.I)
# 含 $ 的括号=换算注释("$40.39 ($6,552.07/mo)"),剥掉再解析;纯文字括号(to be negotiated)无害不动
_PAREN_MONEY = re.compile(r"\([^)]*\$[^)]*\)")
# 无 $ 回退的白名单:纯数字+单位/连接/议薪词才可信("48.85 - 61.21"、"20-35/hr depending on experience"),
# 其余("35% commission"、"CUPE 777"、"after 90 Days")一律不猜
_PLAIN_OK = {"per", "hour", "hourly", "hr", "hrs", "h", "year", "yr", "yearly", "annually",
             "annual", "annum", "month", "monthly", "mo", "week", "weekly", "wk", "weeks",
             "biweekly", "bi", "day", "daily", "cad", "to", "a", "an", "and", "from",
             "based", "on", "as", "with", "depending", "depends", "experience", "negotiable",
             "commensurate", "starting", "wage", "rate", "salary", "pay"}
# 年化倍数:时薪×2080、日薪×260(工作日)、周×52、双周×26、月×12
MULT = {"hr": 2080, "day": 260, "wk": 52, "biwk": 26, "mo": 12, "yr": 1}
SUB = {"hr": "/hr", "day": "/day", "wk": "/wk", "biwk": "/2wk", "mo": "/mo", "yr": "/yr"}

# 护栏(E7-04 回归:榜首出现 49.7 亿年薪 —— 源 typo 漏过旧过滤):
# 全库合法最高年薪 ~$810K(医生岗),合法区间高/低比 ≤~9;超限=源 typo,置 NULL 不猜
ANNUAL_MAX = 1_000_000
RATIO_MAX = 10
GUARDED = {"absurd": 0, "ratio": 0, "cap": 0}  # 三道护栏各拦了多少条(main 里汇报)


def _amounts(text: str) -> list[float]:
    """优先取 $ 锚定金额;没有 $ 时回退全部数字,但仅限「纯薪资表达」(白名单词+无 %)。"""
    vals: list[float] = []
    for a, b in _MONEY.findall(text):
        for x in (a, b):
            if x:
                vals.append(float(x.replace(",", "")))
    if vals:
        return vals
    if "%" in text or any(w not in _PLAIN_OK for w in re.findall(r"[a-z]+", text.lower())):
        return []
    return [float(m.replace(",", "")) for m in _NUM.findall(text)]


def parse_salary(raw: str) -> tuple[int | None, str]:
    """任意格式 → (年薪数值, 规范文本)。解析不出/护栏拦下 → (None, 原文)。"""
    if not raw:
        return None, "—"
    base = _EXTRA.split(raw, maxsplit=1)[0] or raw          # 剪掉佣金/奖金子句
    stripped = _PAREN_MONEY.sub(" ", base)                   # 剥含 $ 的换算括号
    text_src = stripped if _MONEY.search(stripped) else base  # 剥完没金额就用剪后原文
    nums = [n for n in _amounts(text_src) if 0 < n < ANNUAL_MAX]
    if not nums:
        if any(n >= ANNUAL_MAX for n in _amounts(text_src)):  # 只有离谱金额(如 -$4,972,171,264)
            GUARDED["absurd"] += 1
        return None, raw
    lo, hi = min(nums), max(nums)
    if hi / lo > RATIO_MAX:  # 区间上限 typo("$20.00 to $999.00 hourly")→ 整条不可信
        GUARDED["ratio"] += 1
        return None, raw
    low = text_src.lower()
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
    if unit == "mo" and lo >= 20_000:  # 月薪≥$2万 → 实为年薪(源误标,同上)
        unit = "yr"
    annual = round(((lo + hi) / 2) * MULT[unit])
    if annual > ANNUAL_MAX:  # 最终护栏:年化后仍离谱("$600.00 hourly")→ NULL
        GUARDED["cap"] += 1
        return None, raw
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
            tmp = OUT_JOBBANK_FILE.with_suffix(".json.tmp")  # 原子写:与 05/05b 一致
            tmp.write_text(json.dumps(postings, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(tmp, OUT_JOBBANK_FILE)

    guarded = sum(GUARDED.values())
    print(f"Salary cleaned: {updated} jobs updated · {priced}/{total} have a salary")
    print(f"  护栏拦截 {guarded} 条置 NULL:离谱金额 {GUARDED['absurd']} · 区间比>{RATIO_MAX} {GUARDED['ratio']} · 年化>{ANNUAL_MAX:,} {GUARDED['cap']}")


if __name__ == "__main__":
    main()
