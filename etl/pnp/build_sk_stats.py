"""
build_sk_stats — SK(SINP)官方**处理时长 + 配额用量**。「我要等多久 / 我这行还有没有名额」的官方答案。

这页是 2026-08-03 Frank 一句「官方没有数据么」问出来的:此前我们断言「分母没有省公布」,
错了 —— 萨省每季度发处理时长(80% 分位、掐头去尾),且**配额按行业切分并逐日更新已用数**。
这是全国目前发现的唯一一份「配额 vs 已用」官方表,直接回答「今年还剩多少名额」。

产出 raw/pnp/sk-stats.json,三块:
  processing   各类别处理周数(ISW / SK Experience / 二次复核 / 雇主 EPA),含季度口径
  allocation   2026 提名配额按行业三档(优先 / 受限 / 其他)+ Nominations YTD + 总数
               页面明示 YTD 数字「周一至周五每日更新」→ as-of 就是 fetched 当天
  sectors      优先行业(不设上限)与受限行业(带百分比与绝对名额)名单

随手钉进来的**政策事实**(note 里,带出处):Employment Offer 子类**不走 EOI 池**——
官方 EOI 系统页明写「能递 EOI 的是 Occupations In-Demand 与 Express Entry」,EO 不在其中。
即:有雇主 offer 就直接递,没有「等抽选」这一步。这一条是木匠案例里「等着被捞」焦虑的官方否定。

**不抓的**:intake window 逐窗口表(rowspan 嵌套、且只关受限三行业 —— 木匠/技工在优先行业
不受窗口限制;「我这行还有没有名额」由 allocation 表回答)。清单若要做受限行业提醒再回来。

自校是硬闸(照 build_bc_req):任何一块没解析到 / 数字对不上就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_sk_stats.py
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

URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
       "saskatchewan-immigrant-nominee-program/sinp-processing-statistics")
EOI_URL = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
           "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/"
           "international-skilled-worker-eoi-system")
OUT = _paths.PNP / "sk-stats.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "SK"
NOTE = ("SINP 处理时长为官方季度实测(80% 分位,掐掉最快最慢各 10%),官方注明不可用于预测未来申请;"
        "Nominations YTD 周一至周五每日更新,as-of 即 fetched 当天。"
        "政策事实:International Skilled Worker 的 Employment Offer 子类**不走 EOI 池**"
        "(官方 EOI 页明示只有 Occupations In-Demand 与 Express Entry 递 EOI)——"
        f"有雇主 offer 即直接递申请,无抽选等待步骤。出处:{EOI_URL}")

RE_QUARTER = re.compile(r"Quarter (\d), (\d{4})")
RE_WEEKS = re.compile(r"(\d+)\s*weeks?", re.I)
# 「Trucking receives 5 per cent (238 spots)」/「… receive 15 per cent (714 spots)」
RE_CAPPED = re.compile(r"([A-Za-z ,]+?) receives? (\d+) per cent \((\d+) spots\)")
RE_PRIORITY = re.compile(r"Priority Sectors for (\d{4}) include:(.*?)These sectors", re.S)


def cells(tr) -> list[str]:
    return [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]


def main() -> None:
    print(f"OUT: {OUT}")
    html = httpx.get(URL, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    problems: list[str] = []

    # ── 处理时长:所有两列表(类别 | N weeks)。按行内容归组,不赌表的出现顺序 ──────
    processing: list[dict] = []
    quarter = ""
    for tbl in soup.find_all("table"):
        rows = [cells(tr) for tr in tbl.find_all("tr")]
        if not rows or len(rows[0]) != 2:
            continue
        q = RE_QUARTER.search(rows[0][1] or "")
        if q:
            quarter = f"{q.group(2)}Q{q.group(1)}"
        for name, val in (r for r in rows[1:] if len(r) == 2):
            w = RE_WEEKS.search(val)
            group = ("EPA" if "Position Assessment" in name
                     else "Second Review" if "Applicant" in name and "Review" in rows[0][0]
                     else "Saskatchewan Experience" if name in ("Existing Work Permit", "International Students")
                     else "International Skilled Worker")
            processing.append({"group": group, "category": name,
                               "weeks": int(w.group(1)) if w else None, "raw": val})
    if sum(1 for p in processing if p["weeks"] is not None) < 5:
        problems.append(f"处理时长只解析到 {sum(1 for p in processing if p['weeks'] is not None)} 条有效(期望 ≥5)")
    if not any(p["group"] == "EPA" for p in processing):
        problems.append("雇主 EPA 处理时长没解析到")
    if not quarter:
        problems.append("季度口径(Quarter N, YYYY)没解析到")

    # ── 配额表:表头含 Nominee Sector ─────────────────────────────────────────
    allocation: list[dict] = []
    for tbl in soup.find_all("table"):
        rows = [cells(tr) for tr in tbl.find_all("tr")]
        if not rows or "Nominee Sector" not in rows[0][0]:
            continue
        for r in rows[1:]:
            if len(r) < 3:
                continue
            try:
                allocation.append({"sector": r[0],
                                   "allocation": int(r[1].replace(",", "")),
                                   "nominationsYtd": int(r[2].replace(",", ""))})
            except ValueError:
                problems.append(f"配额行读不成数字:{r}")
    total = next((a for a in allocation if a["sector"].lower() == "total"), None)
    parts = [a for a in allocation if a is not total]
    if not total or len(parts) < 3:
        problems.append(f"配额表不完整(解析到 {len(allocation)} 行,需 3 档 + Total)")
    else:
        if sum(p["allocation"] for p in parts) != total["allocation"]:
            problems.append("配额分档之和 ≠ Total(列错位)")
        if any(a["nominationsYtd"] > a["allocation"] for a in allocation):
            problems.append("某档 YTD 超过配额(两列读反了)")

    # ── 行业名单 ──────────────────────────────────────────────────────────────
    pm = RE_PRIORITY.search(soup.get_text("\n", strip=True).replace("’", "'"))
    priority = [s.strip() for s in pm.group(2).split("\n") if s.strip()] if pm else []
    capped = [{"sector": m.group(1).strip(), "pct": int(m.group(2)), "spots": int(m.group(3))}
              for m in RE_CAPPED.finditer(text)]
    if len(priority) < 4:
        problems.append(f"优先行业只解析到 {len(priority)} 个(期望 ≥4)")
    if len(capped) != 3:
        problems.append(f"受限行业解析到 {len(capped)} 个(官方 3 个:卡车/零售/餐饮住宿)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": "PNP",
        "source": "SINP Processing Statistics", "url": URL, "note": NOTE,
        "quarter": quarter, "fetched": date.today().isoformat(),
        "processing": processing, "allocation": allocation,
        "prioritySectors": priority, "cappedSectors": capped,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  {quarter} 处理时长 {len(processing)} 条;配额 Total "
          f"{total['allocation']:,} 已用 {total['nominationsYtd']:,}"
          f"({total['nominationsYtd'] / total['allocation']:.0%});优先行业 {len(priority)}、受限 {len(capped)}")


if __name__ == "__main__":
    main()
