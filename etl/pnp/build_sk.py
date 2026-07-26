"""
build_sk — SK(萨斯喀彻温)SINP 三条 Talent Pathway 的职业清单(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取省政府页 → 复用 crawl 的 HTML→md 转换器(原始 HTML 里 NOC 混在脚本哈希里,
必须经转换器抽干净)→ 同一套 NOC 正则解析。saskatchewan.ca 用浏览器 UA 直连 200(无真挑战,
那个 cloudflare email-decode 脚本是误报)。抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。
产出 raw/pnp/sk-health.json · sk-tech.json · sk-agri.json;08_score 目录驱动读 → SK 具名通道。

Usage:  uv run python etl/pnp/build_sk.py   (需 httpx+bs4,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))          # etl/ → _paths
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → converters(HTML→md)
import _paths  # noqa: E402
from converters import get_converter  # noqa: E402

PROVINCE = "SK"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}
_SK = ("https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/"
       "saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/")
# 每条 = 一个 inclusion 具名通道(实时 URL / 输出文件 / 通道英文名 / 前端短标签)
# E6-09 全省核查(2026-07-25):三张清单与官方逐条吻合,但语义比「in-demand」窄——这三条都是
# Talent Pathway,除了 NOC 在清单内,还要**萨省雇主的长期全职 offer + 雇主先拿 EPA**;
# 2026 起另有行业配额封顶(住宿餐饮 15%、零售 5%、卡车运输 5%)未建模。清单本身仍是 inclusion
# (type 不改,08_score 语义就是 inclusion/exclusion 二选一),条件写在这里作数据层事实。
SK_NOTE = ("SINP Talent Pathway:除职业在清单内,还需萨省雇主长期全职 offer 且雇主已获 EPA;"
           "2026 起住宿餐饮/零售/卡车运输三行业另有配额封顶(15%/5%/5%)。")
STREAMS = [
    {"url": _SK + "health-talent-pathway", "out": "sk-health.json",
     "stream": "SINP Health Talent Pathway", "label": "SK 医疗"},
    {"url": _SK + "sinp-innovation-tech-talent-pathway", "out": "sk-tech.json",
     "stream": "SINP Innovation & Tech Talent Pathway", "label": "SK 科技"},
    {"url": _SK + "agriculture-talent-pathway", "out": "sk-agri.json",
     "stream": "SINP Agriculture Talent Pathway", "label": "SK 农业"},
]
NOC_PATTERNS = [
    re.compile(r"^[-*]\s*(\d{5})\s*[—–-]\s*(.+?)\s*$"),   # - 21211 — Data scientists
    re.compile(r"^\|\s*(\d{5})\s*\|\s*([^|]+?)\s*\|"),     # | 21211 | Data scientists |
]


def fetch_md(url: str) -> str:
    html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md, _ = get_converter().convert(html, url, _PROFILE)
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
            "type": "indemand", "note": SK_NOTE,
            "url": s["url"], "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / s["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (实时 {table['fetched']})")


if __name__ == "__main__":
    main()
