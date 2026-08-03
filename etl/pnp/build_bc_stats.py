"""
build_bc_stats — BC(BC PNP)**注册池分数分布**。「被抽中概率」的 BC 版分母。

与 build_sk_stats / build_ab_stats 同族(官方运营统计)。BC 的发法又不一样:
不发池子总人数,发**Skills Immigration 注册池按 SIRS 分数段的人数分布**(约 13 档)——
配合同页抽选史的「最低邀请分」,能直接读出「我这个分数上面压着多少人」:
比分数线高 → 下一轮大概率被捞;比分数线低 → 能看到差的那几档里各有多少人。
这比单个总数更有用,是三省(SK 配额账本 / AB 池子总数 / BC 分数分布)里颗粒度最细的分母。

页面与 build_draws.py 的 BC 源是**同一页**(invitations-to-apply,SSR,httpx 直取):
抽选史表归 build_draws(canonical),本脚本只取 build_draws 注释里写明「不取」的那张池分布表。
「<5」这类隐私抑制值原样保留(raw),不硬转数字 —— 编个 4 出来就是撒谎。

自校是硬闸(照 build_bc_req):分布表没找到 / 档数异常 / as-of 没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_bc_stats.py
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply"
OUT = _paths.PNP / "bc-stats.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"}

PROVINCE = "BC"
NOTE = ("BC PNP Skills Immigration 注册池按 SIRS 分数段的人数分布(官方定期更新)。"
        "配合 pnp_draws 里 BC 的「最低邀请分」使用:高于最近分数线 → 池中排位靠前;"
        "低于 → 分布表能读出差的每一档压着多少人。「<5」为官方隐私抑制值,原样保留。"
        "抽选史的 canonical 维度表归 build_draws.py,本表不重复。")

# 「… in the Skills Immigration registration pool as of July 7, 2026:」
RE_ASOF = re.compile(r"Skills Immigration registration pool as of ([A-Z][a-z]+ \d{1,2}, \d{4})")
RE_RANGE = re.compile(r"^\d+\s*(\+|[-–—]\s*\d+)$")   # 「150+」/「140 - 149」(容忍长短横与空格)


def cells(tr) -> list[str]:
    return [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]


def main() -> None:
    print(f"OUT: {OUT}")
    html = httpx.get(URL, headers=UA, follow_redirects=True, timeout=45).text
    soup = BeautifulSoup(html, "html.parser")
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    problems: list[str] = []

    m = RE_ASOF.search(text)
    as_of = ""
    if m:
        try:
            as_of = datetime.strptime(m.group(1), "%B %d, %Y").date().isoformat()
        except ValueError:
            pass
    if not as_of:
        problems.append("池分布的 as-of 日期没解析到(官方句式改了?)")

    pool: list[dict] = []
    for tbl in soup.find_all("table"):
        rows = [cells(tr) for tr in tbl.find_all("tr")]
        if not rows or len(rows[0]) != 2 or "score range" not in rows[0][0].lower():
            continue
        for rng, n in (r for r in rows[1:] if len(r) == 2):
            if not RE_RANGE.match(rng.strip()):
                continue    # 档名不像分数段(表尾注/合计行)→ 跳过;档数由自校兜底
            n_clean = n.replace(",", "").strip()
            pool.append({"scoreRange": rng, "registrations": int(n_clean) if n_clean.isdigit() else n})
        break

    if len(pool) < 8:
        problems.append(f"池分布只解析到 {len(pool)} 档(期望 ≥8)")
    elif not any(isinstance(r["registrations"], int) and r["registrations"] > 100 for r in pool):
        problems.append("池分布数字异常(没有任何档超过 100 人,疑似列错位)")

    if problems:
        print("✗ 自校未过,保留旧表不覆盖:")
        for p in problems:
            print("   -", p)
        sys.exit(1)

    total_known = sum(r["registrations"] for r in pool if isinstance(r["registrations"], int))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": PROVINCE, "program": "PNP",
        "source": "BC PNP — Invitations to apply (Skills Immigration registration pool)",
        "url": URL, "note": NOTE,
        "asOf": as_of, "fetched": date.today().isoformat(),
        "pool": pool,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  asOf {as_of}:{len(pool)} 档,可计数注册 {total_known:,} 人")
    for r in pool:
        print(f"    {r['scoreRange']:>10}  {r['registrations']}")


if __name__ == "__main__":
    main()
