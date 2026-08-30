"""
build_ns — NS(新斯科舍)两条具名通道职业清单(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取 Live in NS 官网 → 复用 crawl 的 HTML→md 转换器 → NS 专属正则解析。
liveinnovascotia.com 浏览器 UA 直连 200。抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。
产出 raw/pnp/ns-critical.json(紧缺空缺)· ns-grad.json(毕业生);08_score 目录驱动读 → NS 具名通道。

NS md 写法与 BC/SK 不同(故本脚本带专属正则):
  · 紧缺空缺  `[33102 – Nurse aides …](https://…)`
  · 毕业生    `- NOC 32102: Paramedical occupations`

Usage:  uv run python etl/pnp/build_ns.py   (需 httpx+bs4,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))          # etl/ → _paths
import _paths
from crawl.functions import convert_md
from crawl.scheme import ConvertIn

PROVINCE = "NS"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
# 每条 = 一个 inclusion 具名通道(实时 URL / 输出文件 / 通道英文名 / 前端短标签)
STREAMS = [
    {"url": "https://liveinnovascotia.com/critical-vacancies", "out": "ns-critical.json",
     "stream": "Nova Scotia Critical Vacancies", "label": "NS 紧缺空缺"},
    {"url": "https://liveinnovascotia.com/nova-scotia-graduate", "out": "ns-grad.json",
     "stream": "Nova Scotia Graduate stream", "label": "NS 毕业生"},
]
NOC_PATTERNS = [
    re.compile(r"^[-*]?\s*\[\s*(\d{5})\s*[—–-]\s*([^\]]+?)\s*\]"),       # [33102 – Nurse aides …](url)
    re.compile(r"^[-*]\s*NOC\s*(\d{5})\s*[:：]\s*(.+?)\s*$", re.I),       # - NOC 32102: Paramedical occupations
]


def fetch_md(url: str) -> str:
    html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md = convert_md(ConvertIn(html=html, url=url, selector=None, removes=()))
    return md


def parse_occupations(md: str) -> list[dict]:
    occ: dict[str, str] = {}  # noc → name(去重,首见为准)
    for ln in md.splitlines():
        m = next((p.match(ln) for p in NOC_PATTERNS if p.match(ln)), None)
        if not m:
            continue
        noc, name = m.group(1), re.sub(r"\s+", " ", m.group(2)).strip(" .*")
        if name.upper() in ("NOC", "OCCUPATION", "OCCUPATION TITLE"):  # 跳表头
            continue
        occ.setdefault(noc, name)
    return [{"noc": n, "name": nm} for n, nm in sorted(occ.items())]


# ── NS 主线政策事实(2026-08-03 接入)────────────────────────────────────────────
# 上面两条是**专项**通道;NS 的**主线** Skilled Worker 官方就不发职业清单,四个 tab 逐字读过:
#   · Skilled Worker  按 offer + TEER 判,不列职业
#   · Construction    按**行业**(NAICS 23 建筑业)判,不是 NOC 清单
#   · Occupations in Demand  官方原话「There are no occupations listed in this category at this time.」
#   · Physicians      只开给 NOC 31100/31101/31102
# 所以「NS 没有主线清单」是**政策事实**,不是我们没抓到 —— 必须实抓校验并留证,
# 否则哪天官方真发了清单,站上还在按「无清单」口径说话(ON 2026-06 改制那次就是这么烂掉的)。
# 本表**不带 occupations 键** → 08_score 目录驱动扫描天然跳过,不参与具名打分。
NS_MAIN_URL = "https://liveinnovascotia.com/skilled-worker"
NS_PRIORITY_URL = "https://liveinnovascotia.com/resources/nominee-program-priorities-nova-scotia"
NS_OID_EMPTY = "there are no occupations listed in this category at this time"
POLICY_OUT = "ns-policy.json"


def build_policy() -> None:
    """NS 主线口径 + 提名优先级 → raw/pnp/ns-policy.json。校验失败一律保留旧表并喊人。"""
    try:
        main_md = fetch_md(NS_MAIN_URL)
        prio_md = fetch_md(NS_PRIORITY_URL)
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ NS 政策页抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    low = main_md.lower()
    oid_empty = NS_OID_EMPTY in low
    if not oid_empty and "occupations in demand" not in low:
        print("  ✗ NS 主线页没找到 Occupations in Demand 段(改版?保留旧表,请人工复核)")
        return
    facts = [{
        "key": "noMainList",
        "statement": ("Skilled Worker 主线不公布职业清单:按雇主 offer + TEER 判定;"
                      "Construction 子条件按行业(NAICS 23 建筑业)判,不是 NOC 清单。"),
        "url": NS_MAIN_URL,
    }, {
        "key": "oidList",
        "statement": ("Occupations in Demand 通道当前**没有任何职业在列**(官方原话:There are no "
                      "occupations listed in this category at this time)。" if oid_empty else
                      "⚠️ Occupations in Demand 通道已不再是空表 —— 官方可能重新公布了职业清单,需人工复核并接入。"),
        "url": NS_MAIN_URL,
    }]
    # 提名优先级(2026-04-27 那版:医疗与技术工种 TEER 0-4 首选、TEER 5 不优先)——实抓留证,变了就看得出来
    if (m := re.search(r"TEER\s*(?:levels?\s*)?0\s*[–—-]\s*4", prio_md, re.I)):
        facts.append({
            "key": "priority",
            "statement": ("提名优先级:医疗与技术工种(skilled trades)在 TEER 0-4 为首选;TEER 5 不在优先之列。"
                          f"页面原文命中「{m.group(0)}」。"),
            "url": NS_PRIORITY_URL,
        })
    else:
        print("  ! NS 优先级页没命中 TEER 0-4 表述(政策可能已变,本轮不写该条)")
    if (m := re.search(r"\*(\w+ \d{1,2}, \d{4})\*", prio_md)):   # 优先级页自带发布日期
        facts[-1]["asOf"] = m.group(1) if facts[-1]["key"] == "priority" else facts[-1].get("asOf", "")
    table = {
        "stream": "Nova Scotia Nominee Program — Skilled Worker (main)", "label": "NS 主线口径",
        "province": PROVINCE, "program": "PNP", "type": "policy", "codeless": True,
        "url": NS_MAIN_URL, "fetched": date.today().isoformat(),
        "facts": facts,     # ⚠️ 不叫 occupations:08_score 扫到没这个键就跳过
    }
    (_paths.PNP / POLICY_OUT).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ {'NS 主线口径':<10} {len(facts):>3} 条政策事实 → pnp/{POLICY_OUT}  "
          f"(实时 {table['fetched']};OID 清单{'为空' if oid_empty else '已非空⚠️'})")


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    for s in STREAMS:
        try:
            md = fetch_md(s["url"])
        except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表,不留空
            print(f"  ✗ 抓取失败 {s['out']}: {type(e).__name__} {e}(保留旧表)")
            continue
        occs = parse_occupations(md)
        if not occs:
            print(f"  ✗ 没解析到 NOC: {s['out']}(保留旧表)")
            continue
        table = {
            "stream": s["stream"], "label": s["label"], "province": PROVINCE,
            "type": "indemand",
            "url": s["url"], "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / s["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (实时 {table['fetched']})")
    build_policy()   # 主线口径:官方不发清单这件事本身就是要留证的事实


if __name__ == "__main__":
    main()
