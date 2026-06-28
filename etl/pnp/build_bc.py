"""
build_bc — BC 省 PNP 具名通道职业清单(每省一个 build 脚本,完全自包含,不共享模块)。

⚠️ 唯一仍**解析本地 md** 的省(AB/ON/SK/NS 都已改实时抓):welcomebc.ca 的 BC PNP 科技清单页
2026-06 已下线/改版(原 URL 实测 404,通用页 0 个 NOC),实时源未定位 → 暂用 policy crawl 的旧 md
保底(宁可留旧也不瞎猜)。**TODO:定位 welcomebc 现行 priority/tech occupations 页后改成实时抓**。
从 raw/policy/bc-immigration/md/*.md 解析,自动读 frontmatter 的 source/fetched。
产出 raw/pnp/bc-tech.json;08_score 目录驱动读 → BC 具名通道,自动生效。

BC md 写法:列表 `- 21211 — Data scientists` 或表格 `| 21211 | Data scientists |`。

Usage:  PYTHONUTF8=1 python etl/pnp/build_bc.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths
import _paths  # noqa: E402

POLICY = _paths.RAW / "policy"
PROVINCE = "BC"
# 每条 = 一个 inclusion 具名通道(md 路径 / 输出文件 / 通道英文名 / 前端短标签)
STREAMS = [
    {"md": "bc-immigration/md/bc-pnp-tech-occupations.md", "out": "bc-tech.json",
     "stream": "BC PNP priority tech occupations", "label": "BC PNP 科技"},
]
NOC_PATTERNS = [
    re.compile(r"^[-*]\s*(\d{5})\s*[—–-]\s*(.+?)\s*$"),   # - 21211 — Data scientists
    re.compile(r"^\|\s*(\d{5})\s*\|\s*([^|]+?)\s*\|"),     # | 21211 | Data scientists |
]


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
            "stream": s["stream"], "label": s["label"], "province": PROVINCE,
            "type": "indemand",
            "url": fm.get("source", ""), "fetched": (fm.get("fetched", "") or "")[:10],
            "occupations": occs,
        }
        (_paths.PNP / s["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {s['label']:<10} {len(occs):>3} 个职业 → pnp/{s['out']}  (源 {table['fetched']})")


if __name__ == "__main__":
    main()
