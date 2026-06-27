"""
build_pnp_from_policy — 从已抓取的 raw/policy/<省>/md/*.md 解析出各省 PNP 具名通道职业清单,
产出 raw/pnp/<省>-<通道>.json 维护表(与 build_oinp 同 schema)。08_score 目录驱动读取,自动生效。

为什么:省政策原文(crawl 出的 .md)里已含 NOC 清单,不必再抓——复用本地数据。
每条 SOURCE = 一个具名通道 = 一个 json 文件。md frontmatter 自带 source/fetched,直接沿用(权威+可追溯)。

两种 md 写法都支持:
  · 列表  `- 21211 — Data scientists`
  · 表格  `| 21211 | Data scientists |`

Usage:  PYTHONUTF8=1 python etl/build_pnp_from_policy.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

POLICY = _paths.RAW / "policy"
SK = "sk-immigration/md/browse-sinp-programs/applicants-international-skilled-workers"

# 每条 = 一个 inclusion 具名通道。type 一律 indemand(命中清单 → 具名);label 是前端原样显示的短标签。
SOURCES = [
    {"md": "bc-immigration/md/bc-pnp-tech-occupations.md", "out": "bc-tech.json",
     "province": "BC", "stream": "BC PNP priority tech occupations", "label": "BC PNP 科技"},
    {"md": f"{SK}/health-talent-pathway.md", "out": "sk-health.json",
     "province": "SK", "stream": "SINP Health Talent Pathway", "label": "SK 医疗"},
    {"md": f"{SK}/sinp-innovation-tech-talent-pathway.md", "out": "sk-tech.json",
     "province": "SK", "stream": "SINP Innovation & Tech Talent Pathway", "label": "SK 科技"},
    {"md": f"{SK}/agriculture-talent-pathway.md", "out": "sk-agri.json",
     "province": "SK", "stream": "SINP Agriculture Talent Pathway", "label": "SK 农业"},
]

LINE_DASH = re.compile(r"^[-*]\s*(\d{5})\s*[—–-]\s*(.+?)\s*$")     # - 21211 — Data scientists
LINE_PIPE = re.compile(r"^\|\s*(\d{5})\s*\|\s*([^|]+?)\s*\|")        # | 21211 | Data scientists |


def front_matter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    fm = {}
    if m:
        for ln in m.group(1).splitlines():
            kv = re.match(r"(\w+):\s*(.+)", ln)
            if kv:
                fm[kv.group(1)] = kv.group(2).strip().strip('"')
    return fm


def parse_occupations(text: str) -> list[dict]:
    occ: dict[str, str] = {}  # noc → name(去重,首见为准)
    for ln in text.splitlines():
        m = LINE_DASH.match(ln) or LINE_PIPE.match(ln)
        if not m:
            continue
        noc, name = m.group(1), re.sub(r"\s+", " ", m.group(2)).strip(" .*")
        if name.upper() in ("NOC", "OCCUPATION", "OCCUPATION TITLE"):  # 跳表头
            continue
        occ.setdefault(noc, name)
    return [{"noc": n, "name": nm} for n, nm in sorted(occ.items())]


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    for s in SOURCES:
        md = POLICY / s["md"]
        if not md.exists():
            print(f"  ✗ 缺 md: {md}")
            continue
        text = md.read_text(encoding="utf-8", errors="replace")
        fm = front_matter(text)
        occs = parse_occupations(text)
        if not occs:
            print(f"  ✗ 没解析到 NOC: {s['out']}")
            continue
        table = {
            "stream": s["stream"], "label": s["label"], "province": s["province"],
            "type": "indemand",
            "url": fm.get("source", ""), "fetched": (fm.get("fetched", "") or "")[:10],
            "occupations": occs,
        }
        out = _paths.PNP / s["out"]
        out.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (源 {table['fetched']})")


if __name__ == "__main__":
    main()
