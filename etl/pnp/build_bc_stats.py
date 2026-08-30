"""
build_bc_stats — BC(BC PNP)**注册池分数分布** + **官方处理时长**。
「被抽中概率」与「等多久」的 BC 版答案。

与 build_sk_stats / build_ab_stats 同族(官方运营统计)。BC 的发法又不一样:
不发池子总人数,发**Skills Immigration 注册池按 SIRS 分数段的人数分布**(约 13 档)——
配合同页抽选史的「最低邀请分」,能直接读出「我这个分数上面压着多少人」:
比分数线高 → 下一轮大概率被捞;比分数线低 → 能看到差的那几档里各有多少人。
这比单个总数更有用,是三省(SK 配额账本 / AB 池子总数 / BC 分数分布)里颗粒度最细的分母。

页面与 build_draws.py 的 BC 源是**同一页**(invitations-to-apply,SSR,httpx 直取):
抽选史表归 build_draws(canonical),本脚本只取 build_draws 注释里写明「不取」的那张池分布表。
「<5」这类隐私抑制值原样保留(raw),不硬转数字 —— 编个 4 出来就是撒谎。

**处理时长**(2026-08-04 补):官方在 Skills Immigration 通道页(同文见 /for-workers)印着
「Generally, around 80% of cases will be processed within the following timelines」+ 三档阶段时长。
站内此前写着「BC 没有处理时长」是**错的**,这一段就是来推翻它的。两点口径:
  · 官方给的单位是 **months**,原样存 months(metric=processing_months),**不折成 weeks** ——
    3 个月折成 13 周是替官方编了个它没给的精度;SK 那边官方本来就发 weeks,各存各的原单位。
  · 「80% 分位」是这三个数的全部意义,所以它进每一行的 label(官方原句),
    让任何引用都不可能把「80% 的案子」说成「所有案子」。
  · 这一页从 crawl 缓存读(etl/crawl/cache.py),不再自己发请求;池分布那半仍是实时抓
    (crawl 每小时一轮,池子官方更新更勤,实时更准)。
  · 企业家通道页(entrepreneur-immigration)另有一张自己的时长表(6 weeks / 4 months ×2 / 6 months),
    **故意不收**:本站服务的是拿雇主 offer 的打工人,EI 是另一条产品线,阶段名也不可比。
    这是决定不是缺口 —— 要收的话在这里加一页即可。

自校是硬闸(照 build_bc_req):分布表没找到 / 档数异常 / as-of 没解析到就**保留旧表不覆盖**并 exit 1。

Usage:  uv run python etl/pnp/build_bc_stats.py
        uv run python etl/pnp/build_bc_stats.py --processing-only   # 只重算处理时长(纯读缓存,不联网)
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
import _paths
from crawl.functions import get_cached_page

URL = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply"
# 处理时长页(同文另见 /immigrate-to-b-c/for-workers;取通道主页这一份)
PROC_URL = "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration"
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
# 「Generally, around 80% of cases will be processed within the following timelines:」——
# 这三个数的口径句,必须跟着每一行走
RE_PCTL = re.compile(r"(Generally,[^.:]*?(\d+)% of cases will be processed within the following timelines)", re.I)
RE_DUR = re.compile(r"^(\d+)\s+(week|month)s?$", re.I)   # 「3 months」/「6 weeks」


def cells(tr) -> list[str]:
    return [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]


def build_processing() -> tuple:
    """Skills Immigration 官方处理时长 → ({...}, [问题]);读 crawl 缓存,不发请求。
    单位原样保留官方的 months/weeks(见文件头口径),不换算。"""
    problems: list = []
    hit = get_cached_page(PROC_URL)
    html, fetched = hit.html, hit.fetched
    if not html:
        return {}, [f"crawl 缓存里没有 {PROC_URL}(先跑 etl/crawl/discover_sources.py)"]
    soup = BeautifulSoup(html, "html.parser")
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))

    m = RE_PCTL.search(text)
    if not m:
        problems.append("处理时长的「80% of cases」口径句没解析到(官方句式改了?)")
    pctl_label = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

    rows: list = []
    for tbl in soup.find_all("table"):
        cs = [cells(tr) for tr in tbl.find_all("tr")]
        if not cs or len(cs[0]) < 2 or "stage" not in cs[0][0].lower():
            continue
        for r in cs[1:]:
            if len(r) < 2:
                continue
            d = RE_DUR.match(r[1].strip())
            if not d:
                continue          # 认不出的时长写法一律不猜(表尾注等)
            rows.append({"stage": r[0].strip(), "value": int(d.group(1)),
                         "unit": d.group(2).lower() + "s", "raw": r[1].strip()})
        break
    if len(rows) < 3:
        problems.append(f"处理时长表只解析到 {len(rows)} 个阶段(期望 ≥3)")
    return {"url": PROC_URL, "fetched": fetched, "asOf": "",   # 官方这页不印口径日
            "percentileLabel": pctl_label, "rows": rows}, problems


def main() -> None:
    print(f"OUT: {OUT}")
    # 只重算处理时长:纯读 crawl 缓存,池分布保持旧值不动(池子那半要联网)
    if "--processing-only" in sys.argv:
        proc, problems = build_processing()
        if problems:
            print("✗ 自校未过,保留旧表不覆盖:")
            for p in problems:
                print("   -", p)
            sys.exit(1)
        d = json.loads(OUT.read_text(encoding="utf-8"))
        d["processing"] = proc
        OUT.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ {OUT}(只更新 processing;pool {len(d.get('pool', []))} 档原样保留)")
        for r in proc["rows"]:
            print(f"    {r['stage']:<26} {r['raw']}")
        return

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

    proc, proc_problems = build_processing()
    problems += proc_problems

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
        # 处理时长自带 url/fetched/asOf(与池子不同源、不同口径日),09 按这一节自己的出处出行
        "processing": proc,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUT}  asOf {as_of}:{len(pool)} 档,可计数注册 {total_known:,} 人")
    for r in pool:
        print(f"    {r['scoreRange']:>10}  {r['registrations']}")
    for r in proc["rows"]:
        print(f"    处理时长 {r['stage']:<26} {r['raw']}")


if __name__ == "__main__":
    main()
