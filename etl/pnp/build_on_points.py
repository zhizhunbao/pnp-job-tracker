"""
build_on_points — ON(OINP)Workforce Priority 通道的 **EOI 打分表**。省估分的第三个省。

**为什么现在能做了**(E12-09 当初的结论已过期,记档免得下次又照旧说法办事):
2026-07-27 逐省实核时 ON 是「改制后 EOI 未开、官方不公布分值表」→ 当时只能选 SK。
2026-07-31 复核:新 Workforce Priority 通道页已经把**全套 scoring factors 印在页面上**
(TEER 档 / 职业大类 / 时薪 / 安省经验 / 报税收入 / 在加身份 / 学历 / 加拿大学历数 /
语言 / 二语 / 地区),而且 invitations 页逐轮公布 **Score range**(如「57 and above」)——
自算分能对上一条真实的官方线,这正是 E12-09 选省的唯一标准。

**官方没有印的两样,一样都不许编**:
  · 总分上限:页面不写 → maxTotal 留空(前端就不显示「/xxx」,不拿各项相加冒充官方总分);
  · 申请门槛:ON 没有 SK 那种「至少 60 分才能申请」→ passMark 留空,对照锚点用真实抽选线。

安省经验那节官方有**两套阶梯**(在 job offer 岗位上的月数;不足 6 个月时改看在安省的总月数)——
本脚本只收第一套(在岗月数),第二套是替代口径,两套相加会凭空多算 12 分。

自校是硬闸:11 个因素少一个、或某个因素的档位分数不是递减 → 保留旧表 exit 1。

Usage:  uv run python etl/pnp/build_on_points.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths

PAGE_URL = "https://www.ontario.ca/page/ontario-workforce-priority-stream"
OINP_URL = "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp"
OUT = _paths.PNP / "on-points.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120 Safari/537.36"}

# 官方小节标题 → 本站因素键 + 分组。
# 键名尽量复用站内已有的(education / language / language2 / wage / area),显示层的 ps.f.* 文案直接沿用;
# ON 独有的四个(teerCat/occCat/onExp/earnings/status/canEdu)另加文案键。
# 分组照官方页的四个大标题:Employment / Education / Language / Regionalization。
SECTIONS: list[tuple[str, re.Pattern, str]] = [
    ("teerCat", re.compile(r"NOC TEER category\b", re.I), "employment"),
    ("occCat", re.compile(r"NOC broad occupational category\b", re.I), "employment"),
    ("wage", re.compile(r"\bHourly wage\b", re.I), "employment"),
    ("onExp", re.compile(r"Ontario work experience Job offer applicants", re.I), "employment"),
    ("earnings", re.compile(r"Canadian work experience: earnings history", re.I), "employment"),
    ("status", re.compile(r"Legal status in Canada", re.I), "employment"),
    ("education", re.compile(r"Highest level of education", re.I), "education"),
    ("canEdu", re.compile(r"Number of Canadian education credentials", re.I), "education"),
    ("language", re.compile(r"Official language ability", re.I), "language"),
    ("language2", re.compile(r"Knowledge of official languages", re.I), "language"),
    ("area", re.compile(r"Regional immigration: location of work location", re.I), "region"),
]
# 档位行 = 「标签 — N points」。标签**不能**用「除句号外的任意字符」去截:
# 官方的时薪档写着「$35 to $39.99 per hour」,句号在数字里;而档位之间又夹着整段解释文字。
# 所以改成:先定位每个「— N points」,标签取它前面那段文字里**最后一个句子**
# (句子边界 = 句号/冒号后面跟空格 —— $39.99 里的句号后面没有空格,不会被切开)。
POINTS = re.compile(r"—\s+(\d{1,2}) points?\b")   # raw string is mandatory: \b in a plain string becomes a backspace char
SENTENCE = re.compile(r"(?<=[.:])\s+")

# 安省经验第二套阶梯的引子(「不足 6 个月时改看在安省的总月数」)——从这里开始的行不收
ON_EXP_ALT = re.compile(r"If the applicant has less than 6 months work experience", re.I)


def page_text() -> str:
    html = httpx.get(PAGE_URL, headers=UA, follow_redirects=True, timeout=40).text
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    return re.sub(r"\s+", " ", main.get_text(" ", strip=True))


def clean(label: str) -> str:
    """去掉行首残留的连接词/标点;官方把 NOC、TEER、EOI 做成了链接,拍平后会粘在标签前后。"""
    s = re.sub(r"\s+", " ", label).strip(" .,–—")
    s = re.sub(r"^(?:and|or|the|a)\s+", "", s, flags=re.I)
    return s.strip()


def main() -> None:
    txt = page_text()
    start = txt.find("Scoring factors")
    if start < 0:
        print("✗ 没找到 Scoring factors 段(保留旧表不覆盖)")
        sys.exit(1)
    body = txt[start:]

    # 各节的起点(按在正文中出现的位置排序),节的范围=本节起点 → 下一节起点
    marks: list[tuple[int, int, str, str]] = []
    for key, pat, group in SECTIONS:
        m = pat.search(body)
        if m:
            marks.append((m.start(), m.end(), key, group))
    marks.sort()

    factors: dict[str, dict] = {}
    problems: list[str] = []
    for i, (pos, head_end, key, group) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
        # 从**小节标题之后**开始取档位:标题后面往往直接接第一档(中间没有句号),
        # 不跳过它,第一档的标签就会带上标题本身(实撞:「Ontario work experience Job offer applicants Over 24 months…」)
        chunk = body[head_end:end]
        if key == "onExp":
            cut = ON_EXP_ALT.search(chunk)          # 第二套阶梯不收(替代口径,不是加项)
            if cut:
                chunk = chunk[:cut.start()]
        rows, cursor = [], 0
        for m in POINTS.finditer(chunk):
            label = clean(SENTENCE.split(chunk[cursor:m.start()])[-1])
            cursor = m.end()
            if label:
                rows.append({"label": label, "points": int(m.group(1))})
        if not rows:
            problems.append(f"{key}: 一档都没解析到")
            continue
        factors[key] = {"group": group, "rows": rows, "bonus": [], "max": max(r["points"] for r in rows)}

    missing = [k for k, _, _ in SECTIONS if k not in factors]
    if missing:
        problems.append("缺因素:" + ", ".join(missing))
    for k, f in factors.items():
        pts = [r["points"] for r in f["rows"]]
        if pts != sorted(pts, reverse=True):
            problems.append(f"{k}: 档位分数不是递减 {pts}(节的边界串了)")
        if any(p > 20 for p in pts):
            problems.append(f"{k}: 出现异常大的分值 {pts}")
    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "ON",
        # system 带上通道名:ON 已公布的抽选线全是**改制前那几条已关停通道**的 EOI 分,
        # 与本表(新 Workforce Priority 通道)不是同一套分制 —— 显示层按括号里的通道名过滤,
        # 对不上就不给线(与「线按通道设」红线同族)。
        "system": "OINP EOI points (Ontario Workforce Priority stream)",
        # 官方页不印总分上限、也没有「至少 N 分才能申请」的门槛 → 两个都留空,对照锚点用真实抽选线
        "maxTotal": None, "passMark": None,
        "source": "OINP — Ontario Workforce Priority stream, scoring factors",
        "url": PAGE_URL, "pageUrl": OINP_URL,
        "guideEffective": "", "fetched": date.today().isoformat(),
        "groupMax": {}, "factors": factors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  {len(factors)} 个因素,各项上限合计 {sum(f['max'] for f in factors.values())} 分(官方不公布总分)")
    for k, f in factors.items():
        print(f"  {k:12} 组{f['group']:11} {len(f['rows'])} 档  最高 {f['max']}")


if __name__ == "__main__":
    main()
