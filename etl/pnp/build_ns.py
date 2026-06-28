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
sys.path.insert(0, str(_HERE.parent / "crawl"))  # etl/crawl/ → converters(HTML→md)
import _paths  # noqa: E402
from converters import get_converter  # noqa: E402

PROVINCE = "NS"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
_PROFILE = {"content_selector": None, "remove_selectors": [], "css_file": None, "direct_suffix": None, "converter": None}
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
            "type": "indemand",
            "url": s["url"], "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / s["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (实时 {table['fetched']})")


if __name__ == "__main__":
    main()
