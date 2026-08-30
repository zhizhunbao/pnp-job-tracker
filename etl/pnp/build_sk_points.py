"""
build_sk_points — SK SINP「国际技术工人打分表」(Points Grid,110 分制,60 分申请门槛)。
E12-09 的第二个省 —— 有两个省才谈得上「换哪个省更快」。

**为什么选 SK 作第二个省**(2026-07-27 逐个实核,记档免得下次重走):
  · ON:改制后 EOI 系统官方称今夏开放、**尚未开**,没有分值表也没有分数线(立项文档已写死不许拿旧通道分数线充数);
  · AB:alberta.ca 全站 AAIP 页面**不公布 EOI 分值表**(只公布每次抽选的分数),自算无从算起;
  · MB:官网有 100 分制**申请评估表**,但抽选公布的是 1000 分制的 EOI「Ranking score」,
    两套分制不是一回事,官网也没公布 1000 分制的构成 —— 拿 100 分去对 825 的线是错的对照,弃;
  · SK:官方 Points Grid 全表在 HTML 里(110 分),而且**EOI 排名用的就是这张表**(官方原话:
    「the criteria for the EOI point score in the SINP point assessment grid」),另有官方硬门槛
    **≥60 分才能申请** —— 自算分能对上一条真实的官方线,选它。
  · SK 官方目前**不公布逐次抽选分数线**(站内 pnp_draws 里 SK 本来就是空)→ 对照锚点用 60 分门槛,不编分数线。

自校是硬闸(照 build_bc_sirs 惯例):分节最高可得必须等于官方自己印在表里的
「MAXIMUM POINTS FOR FACTOR I/II」与「MAXIMUM POINTS TOTAL」,不过就**保留旧表不覆盖** ——
分数表错一位比没有更危险。

产出 data/raw/pnp/sk-points.json:
  passMark   官方申请门槛(60)——SK 没有抽选线,这是唯一的官方对照锚
  groupMax   {"I": 80, "II": 30} 官方分组上限;组内各因素相加封顶到这个数
  factors    education/work5/work610/language1/language2/age(组 I)+ offer/connection(组 II)
             组 II 两块按官方是**按子类二选一**(Employment Offer 一块、In-Demand/Express Entry 一块),
             靠 groupMax=30 封顶,任何组合都不会超过官方上限

Usage:  uv run python etl/pnp/build_sk_points.py
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

PAGE_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program/assess-your-eligibility")
SINP_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
            "saskatchewan-immigrant-nominee-program")
OUT = _paths.PNP / "sk-points.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# 官方小节标题 → 本站因素键。顺序即匹配顺序,一行命中就切换当前因素。
# 「a)」「b)」两个子块在官方是**相加**的(工作经验近 5 年 + 6-10 年;首考语言 + 二语),所以各自成一个因素。
SECTIONS = [
    (re.compile(r"^FACTOR I\b", re.I), ("group", "I")),
    (re.compile(r"^FACTOR II\b", re.I), ("group", "II")),
    (re.compile(r"^EDUCATION AND TRAINING", re.I), ("factor", "education")),
    (re.compile(r"^a\)\s*Work experience", re.I), ("factor", "work5")),
    (re.compile(r"^b\)\s*In the 6-10 years", re.I), ("factor", "work610")),
    (re.compile(r"^a\)\s*First Language", re.I), ("factor", "language1")),
    (re.compile(r"^b\)\s*Second Language", re.I), ("factor", "language2")),
    (re.compile(r"^AGE\b", re.I), ("factor", "age")),
    (re.compile(r"^The following points are for the Employment Offer", re.I), ("factor", "offer")),
    (re.compile(r"^The following points are for the Occupation In-Demand", re.I), ("factor", "connection")),
    # 只作分节切换、本身不带档位的标题(SKILLED WORK EXPERIENCE / LANGUAGE ABILITY 下面还有 a)b))
    (re.compile(r"^(SKILLED WORK EXPERIENCE|LANGUAGE ABILITY)", re.I), ("factor", "")),
]
MAX_ROW = re.compile(r"^MAXIMUM POINTS (?:FOR )?(?:FACTOR )?(I{1,2}|TOTAL)", re.I)
# connection 三条按官方可同时主张(20+5+5=30,正好等于组上限)→ 存成 bonus(前端多选);
# 其余因素都是「档位里挑一条」→ 存成 row(前端单选)。
ADDITIVE = {"connection"}


def first_line(td) -> str:
    """一格的标签 = 第一行文字。官方把整段解释塞在同一格的 <ul> 里,解释不进标签。"""
    txt = td.get_text("\n", strip=True)
    return re.sub(r"\s+", " ", txt.split("\n")[0]).strip()


def main() -> None:
    html = httpx.get(PAGE_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    soup = BeautifulSoup(html, "html.parser")

    page_text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    m = re.search(r"at least (\d{2}) points to apply", page_text, re.I)
    pass_mark = int(m.group(1)) if m else None

    table = None
    for tb in soup.find_all("table"):
        if "FACTOR I" in tb.get_text():
            table = tb
            break

    factors: dict[str, dict] = {}
    official: dict[str, int] = {}          # 官方自己印的 MAXIMUM 行:I / II / TOTAL
    group, factor = "", ""
    for tr in (table.find_all("tr") if table else []):
        tds = tr.find_all("td")
        if not tds:
            continue
        label = first_line(tds[0])
        raw_pts = tds[-1].get_text(strip=True) if len(tds) > 1 else ""
        pts = int(raw_pts) if re.fullmatch(r"\d{1,3}", raw_pts) else None

        mm = MAX_ROW.match(label)
        if mm and pts is not None:
            official[mm.group(1).upper()] = pts
            continue

        hit = next((v for pat, v in SECTIONS if pat.match(label)), None)
        if hit:
            kind, val = hit
            if kind == "group":
                group, factor = val, ""
            else:
                factor = val
                if factor:
                    factors.setdefault(factor, {"group": group, "rows": [], "bonus": []})
            continue

        if pts is None or not factor:
            continue
        bucket = "bonus" if factor in ADDITIVE else "rows"
        factors[factor][bucket].append({"label": label, "points": pts})

    for f in factors.values():
        f["max"] = max((x["points"] for x in f["rows"]), default=0) + sum(x["points"] for x in f["bonus"])

    group_max = {"I": official.get("I"), "II": official.get("II")}
    max_total = official.get("TOTAL")

    # ── 自校:分节最高可得 vs 官方印在表里的 MAXIMUM 行 ────────────────────────────
    problems = []
    if pass_mark is None:
        problems.append("没解析到官方申请门槛(「at least NN points to apply」)")
    for g in ("I", "II"):
        if group_max.get(g) is None:
            problems.append(f"没解析到官方 MAXIMUM POINTS FOR FACTOR {g}")
    if max_total is None:
        problems.append("没解析到官方 MAXIMUM POINTS TOTAL")
    if problems:
        return fail(problems)

    # 组 I 各因素相加;组 II 官方是按子类二选一 → 取组内最大的那一块
    best_i = sum(f["max"] for f in factors.values() if f["group"] == "I")
    best_ii = max((f["max"] for f in factors.values() if f["group"] == "II"), default=0)
    if best_i != group_max["I"]:
        problems.append(f"FACTOR I 最高 {best_i} ≠ 官方 {group_max['I']}("
                        + ", ".join(f"{k}={v['max']}" for k, v in factors.items() if v["group"] == "I") + ")")
    if best_ii != group_max["II"]:
        problems.append(f"FACTOR II 最高 {best_ii} ≠ 官方 {group_max['II']}("
                        + ", ".join(f"{k}={v['max']}" for k, v in factors.items() if v["group"] == "II") + ")")
    if group_max["I"] + group_max["II"] != max_total:
        problems.append(f"官方 I({group_max['I']}) + II({group_max['II']}) ≠ 官方 TOTAL {max_total}")
    for k, f in factors.items():
        if not f["rows"] and not f["bonus"]:
            problems.append(f"{k}: 一行都没解析到")
    if problems:
        return fail(problems)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "SK", "system": "SINP Points Grid", "maxTotal": max_total, "passMark": pass_mark,
        "source": "SINP International Skilled Worker Points Grid", "url": PAGE_URL, "pageUrl": SINP_URL,
        # 官方这页不印生效日期(不同于 BC 的 Program Guide PDF)→ 留空,过期锚只能靠 fetched
        "guideEffective": "", "fetched": date.today().isoformat(),
        "groupMax": group_max, "factors": factors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  {max_total} 分制,申请门槛 {pass_mark}")
    for k, f in factors.items():
        print(f"  {k:12} 组{f['group']:2} {len(f['rows'])} 档 + {len(f['bonus'])} 项加分  最高 {f['max']}")


def fail(problems: list[str]) -> None:
    print("✗ 自校未过,保留旧表不覆盖:")
    for p in problems:
        print("   -", p)
    sys.exit(1)


if __name__ == "__main__":
    main()
