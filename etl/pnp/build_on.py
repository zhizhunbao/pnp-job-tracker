"""
build_on — ON OINP 两条具名通道(**全实时抓** ontario.ca,httpx 即可,无 Cloudflare;md 只作参考):
  · Employer Job Offer: In-Demand Skills(TEER4-5 低技能紧缺,inclusion)→ oinp-in-demand.json「OINP 紧缺技能」
  · Human Capital Priorities: Tech Draws(TEER0-1 科技定向)        → oinp-tech.json「OINP 科技」
两页 NOC 书写不同 → 各一条正则。抓不到/解析空 → 跳过、保留旧表。08_score 目录驱动消费。

Usage:  uv run python etl/pnp/build_on.py   (或 .venv 的 python)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths
import _paths  # noqa: E402

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
IN_DEMAND_URL = "https://www.ontario.ca/page/oinp-employer-job-offer-demand-skills-stream"
TECH_URL = "https://www.ontario.ca/page/oinp-tech-draws"

LI_NOC = re.compile(r"(\d{5})\s*[-–]\s*(.+)")              # In-Demand: "NOC 44101 - Home support…"
TECH_NOC = re.compile(r"(.+?)\s*\(\s*NOC\s*(\d{5})\s*\)", re.I)  # Tech: "Data Scientists ( NOC 21211)"(abbr+&nbsp;)


def fetch(url: str) -> str:
    r = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=30)
    r.raise_for_status()
    return r.text


def parse_in_demand(html: str) -> list[dict]:
    """两组 <ul> 抽 {noc,name,gtaRestricted};按 <ul> 前最近文字块判定是否限大多伦多区外。"""
    soup = BeautifulSoup(html, "html.parser")
    occs: dict[str, dict] = {}
    for ul in soup.find_all("ul"):
        lis = [li for li in ul.find_all("li") if re.search(r"\b\d{5}\b", li.get_text())]
        if not lis:
            continue
        prev = ul.find_previous(["p", "h2", "h3", "h4"])
        ctx = prev.get_text(" ", strip=True).lower() if prev else ""
        gta = "greater toronto" in ctx and "any location" not in ctx
        for li in lis:
            m = LI_NOC.search(li.get_text(" ", strip=True))
            if not m:
                continue
            noc, name = m.group(1), re.sub(r"\s+", " ", m.group(2)).strip(" .")
            occs.setdefault(noc, {"noc": noc, "name": name, "gtaRestricted": gta})
    return list(occs.values())


def parse_tech(html: str) -> list[dict]:
    """Tech Draws:`职业名 (NOC #####)`(只认这个精确格式,自动跳过页面里的资源哈希噪声)。"""
    soup = BeautifulSoup(html, "html.parser")
    occs: dict[str, dict] = {}
    for li in soup.find_all("li"):
        m = TECH_NOC.search(li.get_text(" ", strip=True).replace("\xa0", " "))
        if not m:
            continue
        name, noc = re.sub(r"\s+", " ", m.group(1)).strip(" ."), m.group(2)
        occs.setdefault(noc, {"noc": noc, "name": name})
    return list(occs.values())


def build(url: str, parse, out: str, stream: str, label: str) -> None:
    try:
        occs = parse(fetch(url))
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表
        print(f"  ✗ 抓取失败 {out}: {type(e).__name__} {e}(保留旧表)")
        return
    if not occs:
        print(f"  ✗ 没解析到 NOC: {out}(保留旧表)")
        return
    table = {
        "stream": stream, "label": label, "province": "ON", "type": "indemand",
        "url": url, "fetched": date.today().isoformat(),
        "occupations": sorted(occs, key=lambda x: x["noc"]),
    }
    (_paths.PNP / out).write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ {label:<10} {len(occs):>3} 个职业 → pnp/{out}")


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    build(IN_DEMAND_URL, parse_in_demand, "oinp-in-demand.json",
          "OINP Employer Job Offer: In-Demand Skills", "OINP 紧缺技能")
    build(TECH_URL, parse_tech, "oinp-tech.json",
          "OINP Human Capital Priorities: Tech Draws", "OINP 科技")


if __name__ == "__main__":
    main()
