"""
build_nl — NL(纽芬兰与拉布拉多)优先处理职位表(每省一个 build 脚本,完全自包含)。

**实时抓**:httpx 直取 gov.nl.ca → 复用 crawl 的 HTML→md 转换器 → 按「行业小标题 + 编号列表」解析。
产出 raw/pnp/nl-priority.json。抓不到/解析空 → 保留旧表(宁可留旧也不留空)。

⚠️ **口径(2026-08-03 接入时逐字核对,别按名字想当然)**:
  · 页面 URL 叫 `excluded-positions`,内容却**不是排除清单** —— 正文原话是这些
    in-demand 职位「exempt from provincial labour market testing」(免 Job Vacancy Assessment /
    AIP 招工测试)并「receive priority processing」。**不在表上 ≠ 不能申请**,只是没有这份加速。
  · 表里是**职位名称文本**(Software Developer / Cage Site Technician…),**不是 NOC 码**,
    官方没给映射。按项目铁律「宁可留空不瞎猜」:原样存 `positions`,**不硬映射 NOC**。
  · 因此本表**不带 `occupations` 键** —— 08_score 目录驱动扫 raw/pnp/*.json 时天然跳过,
    不会被误当成具名通道清单参与打分(与 draws.json 同一手法)。

Usage:  uv run python etl/pnp/build_nl.py   (需 httpx+bs4,系统 python 没装 → 用 .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent))            # etl/ → paths
import paths
from crawl.functions import convert_md
from crawl.scheme import ConvertIn

PROVINCE = "NL"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
URL = "https://www.gov.nl.ca/immigration/excluded-positions/"
OUT = paths.PNP / "nl-priority.json"
NOTE = ("NL 优先处理职位:免省级劳动力市场测试(Job Vacancy Assessment / AIP 招工测试)并优先处理。"
        "**不在表上不等于不能申请**,只是没有这份加速。官方给的是职位名称文本、不是 NOC 码,故本站不做 NOC 映射。")

SECTOR = re.compile(r"^In-demand\s+(.+?)\s+(?:sector\s+)?occupations?\b.*:\s*$", re.I)
GROUP = re.compile(r"^\*\*(.+?)\*\*\s*$")            # **Engineers and Developers**
ITEM = re.compile(r"^\s*(?:\d+\.|[-*])\s+(.+?)\s*$")  # 1. Software Developer


def fetch_md(url: str) -> str:
    html = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).text
    md = convert_md(ConvertIn(html=html, url=url, selector=None, removes=()))
    return md


def parse_positions(md: str) -> list[dict]:
    """→ [{sector, group, title}]。行业小标题开一段,**粗体**是段内分组,编号/项目符号行是职位。"""
    out: list[dict] = []
    sector = group = ""
    for ln in md.splitlines():
        line = ln.strip()
        if (m := SECTOR.match(line)):
            sector, group = re.sub(r"\s+", " ", m.group(1)).strip(), ""
            continue
        if not sector:
            continue
        if (m := GROUP.match(line)):
            group = m.group(1).strip()
            continue
        if (m := ITEM.match(line)):
            raw = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", m.group(1))     # 去 md 链接
            # 「Physician<两个空格>Family Medicine; Psychiatry; …」= 职位 + 分号分隔的专科明细。
            # 明细留在 detail,不塞进 title(否则一条 200 字的「职位名」既没法展示也没法比对)。
            head, detail = (re.split(r"\s{2,}", raw, maxsplit=1) + [""])[:2]
            # 只削尾:.NET Developer 的首字符点是名字的一部分(2026-08-03 实撞,曾被削成 NET)
            title = re.sub(r"\s+", " ", head).strip().strip("*").rstrip(".")
            if title:
                row = {"sector": sector, "group": group, "title": title}
                if (detail := re.sub(r"\s+", " ", detail).strip()):
                    row["detail"] = detail
                out.append(row)
            continue
        if line.startswith("#"):   # 走出正文区(下一个大标题)→ 本段结束
            sector = group = ""
    return out


def main() -> None:
    print(f"OUT: {OUT}")
    paths.PNP.mkdir(parents=True, exist_ok=True)
    try:
        md = fetch_md(URL)
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表
        print(f"  ✗ NL 优先职位抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    positions = parse_positions(md)
    if not positions:
        print("  ✗ NL 没解析到职位(页面改版?保留旧表)")
        return
    table = {
        "stream": "NL priority processing / labour market testing exemption",
        "label": "NL 优先处理职位", "province": PROVINCE, "program": "PNP+AIP",
        "type": "priority",          # 既非 indemand 也非 ineligible —— 不参与具名打分
        "codeless": True,            # 官方给的是职位名不是 NOC,前端不得当清单命中用
        "note": NOTE, "url": URL, "fetched": date.today().isoformat(),
        "positions": positions,      # ⚠️ 不叫 occupations:08_score 扫到没这个键就跳过
    }
    OUT.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    sectors = {p["sector"] for p in positions}
    print(f"  ✓ {'NL 优先职位':<10} {len(positions):>3} 个职位 / {len(sectors)} 个行业 → pnp/{OUT.name}  (实时 {table['fetched']})")
    for s in sorted(sectors):
        print(f"      · {s}: {sum(1 for p in positions if p['sector'] == s)} 个")


if __name__ == "__main__":
    main()
