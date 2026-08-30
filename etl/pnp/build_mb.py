"""
build_mb — MB 省提名(MPNP)在需职业清单(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取 MPNP「Manitoba In-Demand Occupations List」页(浏览器 UA 直连 200)→ 复用 crawl
的 HTML→md 转换器 → 按节标题分桶解析。旧记忆「MB 无职业清单」是错的(E6-09 全省核查纠正)。

页面结构(2026-07-25 核实):按 NOC 大类分 9 节(1 商务/2 科技…9 制造)= **在需职业总表**,
另有一节 **Rural in-demand occupations** = 仅当就业地在**首都区(温尼伯)以外**才算在需 → 分两桶,
不合并(合并会让温尼伯岗误显在需)。**注意 URL**:`/work/in-demand-occupations/` 已被站方重定向到
2023 年的一篇更新通告(只有增补几条),真正的现行总表在 `/mpnp/idol/`。

页面**不含**每职业的 stream 限定列(正文那句「limited to specific skilled streams」是概述,
表里没有该列)→ **不猜 stream 维度**,只落 NOC+名称(宁可留空也不瞎猜)。
在需 = EOI 抽选优先信号,非硬性资格门槛;08_score 按 inclusion 消费(TEER4-5 凭清单可走)。
抓不到/解析空 → 跳过、保留旧表(宁可留旧也不留空)。

Usage:  uv run python etl/pnp/build_mb.py   (需 httpx,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → _paths
import _paths
from crawl.functions import convert_md
from crawl.scheme import ConvertIn

PROVINCE = "MB"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
URL = "https://immigratemanitoba.com/mpnp/idol/"
BUCKETS = {
    "main": {"out": "mb-indemand.json", "label": "MB 在需职业",
             "stream": "MPNP In-Demand Occupations List",
             "note": "MPNP 在需职业:EOI 抽选中获优先,非硬性资格门槛;各 stream 另有自己的条件与语言要求。"},
    "rural": {"out": "mb-indemand-rural.json", "label": "MB 乡镇在需",
              "stream": "MPNP In-Demand Occupations List – rural (outside the Manitoba Capital Region)",
              "note": "仅当就业地在曼省首都区(温尼伯及周边)**以外**时才算在需;温尼伯岗不适用。"},
}
# 表行:| NOC | TEER | 职业名 | 最低 CLB | 2016 对应 | 2016 技能等级 |
ROW = re.compile(r"^\|\s*(\d{5})\s*\|\s*\d\s*\|\s*([^|]+?)\s*\|")


def fetch_md() -> str:
    html = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md = convert_md(ConvertIn(html=html, url=URL, selector=None, removes=()))
    return md


def parse_buckets(md: str) -> dict[str, dict[str, str]]:
    """按节标题分桶:「N – 大类」九节 → main;「Rural in-demand occupations」→ rural;其余节(说明/注)不收。"""
    out: dict[str, dict[str, str]] = {k: {} for k in BUCKETS}
    bucket = None
    for ln in md.splitlines():
        h = re.match(r"^#{2,4}\s+(.+?)\s*$", ln)
        if h:
            title = h.group(1).strip().lower()
            bucket = "rural" if "rural" in title else ("main" if re.match(r"^\d\s*[‐-―-]", title) else None)
            continue
        m = ROW.match(ln.strip())
        if bucket and m:
            out[bucket].setdefault(m.group(1), re.sub(r"\s+", " ", m.group(2)).strip())
    return out


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    try:
        md = fetch_md()
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表,不留空
        print(f"  ✗ 抓取失败 {URL}: {type(e).__name__} {e}(保留旧表)")
        return
    buckets = parse_buckets(md)
    for key, cfg in BUCKETS.items():
        occs = [{"noc": n, "name": nm} for n, nm in sorted(buckets[key].items())]
        if not occs:
            print(f"  ✗ 没解析到 NOC: {cfg['out']}(保留旧表)")
            continue
        table = {
            "stream": cfg["stream"], "label": cfg["label"], "province": PROVINCE,
            "type": "indemand", "note": cfg["note"],
            "url": URL, "fetched": date.today().isoformat(),
            "occupations": occs,
        }
        (_paths.PNP / cfg["out"]).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {cfg['label']:<8} {len(occs):>3} 个职业 → pnp/{cfg['out']}  (实时 {table['fetched']})")


if __name__ == "__main__":
    main()
