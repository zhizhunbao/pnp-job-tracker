"""build_mb_points — MB(MPNP)EOI 排名系统六因子完整积分表(1000 分制,无硬性 passMark)。

**为什么现在能做了**(build_sk_points 当初写死「MB 官网没公布 1000 分制的构成」,那条已过期):
2026-07-27 逐省实核时只查了 apply 主页,没点进 `/mpnp/apply/eoi`——那页其实把六因子的官方
积分表**全部印成了 HTML `<table>`**(Language proficiency / Age / Work experience / Education /
Adaptability / Risk),每个因子表尾还印着官方自己的「Maximum points」/「Maximum subtotal」行,
可以像 build_sk_points 一样拿这些数字做自校硬闸。

六因子里三个需要特殊处理,照官方原样存、不替官方编造:
  · **Language proficiency**:First Official Language 是「per band」——阅读/写作/听力/口语
    四项各自按同一张 CLB 表打分后相加,不是查一次乘四(四项 CLB 不同时,应分别取对应档相加)。
    表内 max 用「四项都在最高档」算 = 25×4 + 25(第二官语言,一次性、不分项) = 125,与官方页尾
    Maximum points 125 对上才算自校过 —— 附 rule 字段写清楚这条乘法,前端/后续消费者别再猜。
  · **Adaptability**:官方把它拆成三个子块(Connection to Manitoba 200 / Manitoba Demand 500 /
    Regional development 50),且官方原话「Regional development 可以和其他 Manitoba connection
    组合,但不能和 Manitoba Demand 组合」——三块封顶各自的 Maximum subtotal,整个 Adaptability
    因子封顶 500(= Manitoba Demand 单项就封顶,不是三块相加)。本表把三块拆成三个因子
    (adaptConnection/adaptDemand/adaptRegional),用 group="adaptability" + groupMax 复用
    build_sk_points 那套「组内封顶」的既有消费形状,不新造字段。
  · **Risk assessment**:官方唯一一个可以为负的因子,「外省工作经历」「外省学业经历」两项
    互不排斥、可以同时成立,存进 bonus(可加总)而不是 rows(单选);两项都触发时 -100-100=-200,
    与官方页尾 Maximum points -200 对上。

maxTotal(1000)官方页面没有印成一个单独的数字,是五个正向因子的 Maximum points/Adaptability
groupMax 相加算出来的(125+75+175+125+500=1000,Risk 是纯扣分项、不计入分制上限)——
这条推导也进自校,算不出 1000 就报错,不写死。

自校是硬闸(照 build_sk_points 惯例):任何一个因子的自算 max 对不上官方自己印在表里的
Maximum points/Maximum subtotal,或 1000 对不上,就**保留旧表不覆盖**,exit 1。

URL 来源:data/crawl/mb-mpnp/manifest.json → https://immigratemanitoba.com/mpnp/apply/eoi
(2026-08-03 那轮 crawl 已收,html_cache/d776bf6cf2ccd1239f6b0518e4c56611.html)。
运行时先 httpx 实抓同一 URL,抓不到(网络/改版)才回退读 crawl 缓存,
fetched 如实标成缓存那轮的抓取日,不能假装是今天抓的。

Usage:  uv run python etl/pnp/build_mb_points.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
import _paths
from crawl.functions import get_cached_page

PAGE_URL = "https://immigratemanitoba.com/mpnp/apply/eoi"
MPNP_URL = "https://immigratemanitoba.com/mpnp"
OUT = _paths.PNP / "mb-points.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120 Safari/537.36"}

# 官方六张表的表头第一格文字 → 本站因素键(Adaptability 后面再拆成三个子因素)。
FACTOR_TABLES = {
    "Language proficiency": "language",
    "Age": "age",
    "Years of work experience": "work",
    "Highest level of completed education": "education",
    "Adaptability factor": "adaptability",
    "Risk factor": "risk",
}
POINTS = re.compile(r"^(-?\d+)(?:\s*per band)?$", re.I)


def fetch() -> tuple:
    """(html, fetched_date, note)——先 httpx 实抓,抓不到回退 crawl 缓存。"""
    try:
        resp = httpx.get(PAGE_URL, headers=UA, follow_redirects=True, timeout=40)
        resp.raise_for_status()
        return resp.text, date.today().isoformat(), "live"
    except Exception as e:  # noqa: BLE001 — 网络/改版都不该崩脚本,回退缓存
        hit = get_cached_page(PAGE_URL)
        html, fetched = hit.html, hit.fetched
        if html:
            print(f"! httpx 实抓失败({e}),回退读取 crawl 缓存(抓取日 {fetched})")
            return html, fetched, "cache"
        print(f"✗ httpx 实抓失败({e}),crawl 缓存里也没有这页,无法产出")
        sys.exit(1)


def clean(label: str) -> str:
    """曲引号→直引号(官方页用 &#8217;),去掉脚注星号(Risk 那行「…province*」)。"""
    s = label.replace("’", "'").replace("‘", "'")
    return re.sub(r"\*\s*$", "", s).strip()


def parse_pts(raw: str):
    m = POINTS.match(raw.strip())
    return int(m.group(1)) if m else None


def header_label(table) -> str:
    tr = table.find("tr")
    cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])] if tr else []
    return cells[0] if cells else ""


def table_rows(table) -> list:
    """[(子标题, label, raw_points)]——第一行(表头)跳过;第二格为空的行是子标题(不进数据);
    label 统一成 __MAXALL__(Maximum points,整个因子的官方上限)或
    __MAXSUB__(Maximum subtotal,当前子标题那一块的官方上限)。"""
    out, sub, seen_header = [], "", False
    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        label, raw = cells[0], cells[1]
        if not seen_header:
            seen_header = True
            continue
        if raw.strip() == "":
            sub = label
            continue
        m = re.match(r"^Maximum (points|subtotal)$", label, re.I)
        if m:
            out.append((sub, "__MAXALL__" if m.group(1).lower() == "points" else "__MAXSUB__", raw))
            continue
        out.append((sub, label, raw))
    return out


def main() -> None:
    print(f"OUT: {OUT}")
    html, fetched, note = fetch()
    soup = BeautifulSoup(html, "html.parser")
    main_el = soup.find("main") or soup

    tables: dict = {}
    for t in main_el.find_all("table"):
        key = FACTOR_TABLES.get(header_label(t))
        if key and key not in tables:  # 只认第一张(同页面不会重复,防御一下)
            tables[key] = t

    problems: list = []
    missing = [k for k in FACTOR_TABLES.values() if k not in tables]
    if missing:
        problems.append("页面上没找到这些因子表(改版了?):" + ", ".join(missing))
    if problems:
        return fail(problems)

    factors: dict = {}

    # ── Language proficiency(First Official Language 按 per band 四项相加 + Second 一次性 25)──
    rows_lang, bonus_lang, official = [], [], None
    for sub, label, raw in table_rows(tables["language"]):
        if label == "__MAXALL__":
            official = parse_pts(raw)
            continue
        pts, lbl = parse_pts(raw), clean(label)
        if sub.lower().startswith("first"):
            rows_lang.append({"label": f"First Official Language — {lbl}", "points": pts})
        else:
            bonus_lang.append({"label": f"Second Official Language — {lbl}", "points": pts})
    first_max = max((r["points"] for r in rows_lang), default=0)
    lang_max = first_max * 4 + sum(b["points"] for b in bonus_lang)
    if not rows_lang or not bonus_lang:
        problems.append("language: First/Second Official Language 有一块没解析到")
    if official is not None and lang_max != official:
        problems.append(f"language: 自算 {first_max}×4+{sum(b['points'] for b in bonus_lang)}={lang_max} ≠ 官方 Maximum points {official}")
    factors["language"] = {
        "rows": rows_lang, "bonus": bonus_lang, "bandCount": 4, "max": lang_max,
        "rule": ("First Official Language 每档是「per band」:阅读/写作/听力/口语四项各自按本表同一档"
                 "打分后相加(四项 CLB 不同档时应分别取值相加,不是查一次乘四);此处 max 按四项都在"
                 "最高档估算 = 25×4 + Second Official Language 25 = 125。"
                 " Second Official Language 按总体 CLB≥5 一次性加 25,不分项、不按 band 乘。"),
    }

    # ── Age / Work experience / Education:单表单选,官方 Maximum points 就是自算 max ──
    for key, bonus_kw in (("age", None), ("work", "fully recognized"), ("education", None)):
        rows, bonus, official = [], [], None
        for sub, label, raw in table_rows(tables[key]):
            if label == "__MAXALL__":
                official = parse_pts(raw)
                continue
            lbl, pts = clean(label), parse_pts(raw)
            if bonus_kw and lbl.lower().startswith(bonus_kw):
                bonus.append({"label": lbl, "points": pts})
            else:
                rows.append({"label": lbl, "points": pts})
        if not rows:
            problems.append(f"{key}: 一档都没解析到")
            continue
        fmax = max(r["points"] for r in rows) + sum(b["points"] for b in bonus)
        if official is not None and fmax != official:
            problems.append(f"{key}: 自算 max {fmax} ≠ 官方 Maximum points {official}")
        factors[key] = {"rows": rows, "bonus": bonus, "max": fmax}

    # ── Adaptability:拆成三个子因素,group="adaptability" 复用 SK 那套「组内封顶」形状 ──
    buckets: dict = {}
    sub_official: dict = {}
    overall_official = None
    for sub, label, raw in table_rows(tables["adaptability"]):
        if label == "__MAXSUB__":
            sub_official[sub] = parse_pts(raw)
            continue
        if label == "__MAXALL__":
            overall_official = parse_pts(raw)
            continue
        buckets.setdefault(sub, []).append({"label": clean(label), "points": parse_pts(raw)})

    ADAPT = [("Connection to Manitoba", "adaptConnection"),
             ("Manitoba Demand", "adaptDemand"),
             ("Regional development", "adaptRegional")]
    adapt_max: dict = {}
    for sub_name, fkey in ADAPT:
        rows = buckets.get(sub_name, [])
        if not rows:
            problems.append(f"adaptability/{sub_name}: 一档都没解析到")
            continue
        fmax = max(r["points"] for r in rows)
        if sub_official.get(sub_name) is not None and fmax != sub_official[sub_name]:
            problems.append(f"adaptability/{sub_name}: 自算 max {fmax} ≠ 官方 Maximum subtotal {sub_official[sub_name]}")
        adapt_max[fkey] = fmax
        factors[fkey] = {"group": "adaptability", "rows": rows, "bonus": [], "max": fmax}
    if "adaptRegional" in factors:
        factors["adaptRegional"]["rule"] = (
            "Regional development 可与 Connection to Manitoba 组合相加(最高 200+50=250),"
            "但不能与 Manitoba Demand 叠加;Adaptability 因子总上限由 Manitoba Demand 单项封顶(见 groupMax.adaptability)。")

    group_adapt = max(adapt_max.get("adaptConnection", 0) + adapt_max.get("adaptRegional", 0),
                       adapt_max.get("adaptDemand", 0)) if adapt_max else None
    if overall_official is None:
        problems.append("adaptability: 没解析到官方 Maximum points(整个因子的上限)")
    elif group_adapt != overall_official:
        problems.append(f"adaptability: 自算组合上限 {group_adapt} ≠ 官方 Maximum points {overall_official}"
                        f"(connection={adapt_max.get('adaptConnection')} + regional={adapt_max.get('adaptRegional')}"
                        f" vs demand={adapt_max.get('adaptDemand')})")

    # ── Risk assessment:唯一可负的因子,两项负分不互斥 → 存 bonus(可加总)──
    rows_risk, bonus_risk, official = [], [], None
    for sub, label, raw in table_rows(tables["risk"]):
        if label == "__MAXALL__":
            official = parse_pts(raw)
            continue
        lbl, pts = clean(label), parse_pts(raw)
        (bonus_risk if pts and pts < 0 else rows_risk).append({"label": lbl, "points": pts})
    if not rows_risk and not bonus_risk:
        problems.append("risk: 一档都没解析到")
    risk_max = max((r["points"] for r in rows_risk), default=0) + sum(b["points"] for b in bonus_risk)
    if official is not None and risk_max != official:
        problems.append(f"risk: 自算 {risk_max} ≠ 官方 Maximum points {official}")
    factors["risk"] = {
        "rows": rows_risk, "bonus": bonus_risk, "max": risk_max,
        "rule": "外省工作经历、外省学业经历互不排斥,可同时成立、按加总计(两项都触发 = -100-100 = -200)。",
    }

    if problems:
        return fail(problems)

    # ── 总分:五个正向因子相加(Risk 是纯扣分项,不计入分制上限)──
    max_total = (factors["language"]["max"] + factors["age"]["max"] + factors["work"]["max"]
                 + factors["education"]["max"] + group_adapt)
    if max_total != 1000:
        problems.append(f"五因子(不含 Risk)相加 = {max_total} ≠ 1000(官方 EOI 总分制)")
    if problems:
        return fail(problems)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "province": "MB", "system": "MPNP EOI", "maxTotal": max_total,
        # 官方 EOI 没有「至少 N 分才能申请」的硬门槛(靠每轮 LAA 抽选线,不是固定 pass mark)→ 留空
        "passMark": None,
        "source": "MPNP Expression of Interest (EOI) — EOI ranking system, six factors",
        "url": PAGE_URL, "pageUrl": MPNP_URL,
        "guideEffective": "", "fetched": fetched,
        "groupMax": {"adaptability": group_adapt},
        "factors": factors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ {OUT}  {max_total} 分制({note} 抓取,fetched={fetched}),passMark=null(无固定门槛,靠 LAA 抽选线)")
    for k, f in factors.items():
        g = f.get("group", "")
        print(f"  {k:16} 组{g:12} {len(f['rows'])} 档 + {len(f['bonus'])} 项加分  最高 {f['max']}")


def fail(problems: list) -> None:
    print("✗ 自校未过,保留旧表不覆盖:")
    for p in problems:
        print("   -", p)
    sys.exit(1)


if __name__ == "__main__":
    main()
