"""
build_oinp — 抓 OINP「Employer Job Offer: In-Demand Skills」流的符合资格职业清单,
建成我们维护的 PNP 维度表(各省 PNP 清单的第一个试点;ontario.ca 用 httpx 即可,无 Cloudflare)。

源(免费,偶尔更新):
  https://www.ontario.ca/page/oinp-employer-job-offer-demand-skills-stream
页面把符合的职业放在 <ul><li>NOC 44101 - …</li> 里,分两组:
  ① 任意地区(any location in Ontario)  ② 仅大多伦多区域外(outside the Greater Toronto Area)

产出:
  raw/crawl/oinp/<date>/in-demand-skills.html   # 原始页(raw 只存原始)
  reference/pnp/oinp-in-demand.json             # 维护表(跟踪):{occupations:[{noc,name,gtaRestricted}], ...}
08_score 读 reference 表 → ON 的 TEER4-5 紧缺通道(精化 pnpEligible)。

Usage:  uv run python etl/build_oinp.py   (或 .venv 的 python)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

URL = "https://www.ontario.ca/page/oinp-employer-job-offer-demand-skills-stream"
OUT_RAW_DIR = _paths.RAW / "crawl" / "oinp"                  # 原始页快照(按日期)
OUT_TABLE = _paths.REFERENCE / "pnp" / "oinp-in-demand.json"  # 维护表(跟踪)
UA = "Mozilla/5.0 (compatible; pnp-job-tracker/1.0)"

LI_NOC = re.compile(r"(\d{5})\s*[-–]\s*(.+)")  # "NOC 44101 - Home support…"(NOC 字样在 <abbr> 里,已被 get_text 去掉)


def parse(html: str) -> list[dict]:
    """从两组 <ul> 里抽 {noc, name, gtaRestricted}。按每个含 NOC 的 <ul> 前面的说明文本判定是否限大多伦多区外。"""
    soup = BeautifulSoup(html, "html.parser")
    occs: dict[str, dict] = {}  # noc → row(去重)
    for ul in soup.find_all("ul"):
        lis = [li for li in ul.find_all("li") if re.search(r"\b\d{5}\b", li.get_text())]
        if not lis:
            continue
        # 该 ul 之前最近的文字块(<p>/<h2>/<h3>)判定地区限制
        ctx = ""
        prev = ul.find_previous(["p", "h2", "h3", "h4"])
        if prev:
            ctx = prev.get_text(" ", strip=True).lower()
        gta = "greater toronto" in ctx and "any location" not in ctx
        for li in lis:
            m = LI_NOC.search(li.get_text(" ", strip=True))
            if not m:
                continue
            noc = m.group(1)
            name = re.sub(r"\s+", " ", m.group(2)).strip(" .")
            occs.setdefault(noc, {"noc": noc, "name": name, "gtaRestricted": gta})
    return list(occs.values())


def main() -> None:
    print(f"IN  : {URL}")
    print(f"OUT raw   : {OUT_RAW_DIR}/<date>/in-demand-skills.html")
    print(f"OUT table : {OUT_TABLE}")
    r = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=30)
    r.raise_for_status()
    html = r.text

    snap = OUT_RAW_DIR / date.today().isoformat()
    snap.mkdir(parents=True, exist_ok=True)
    (snap / "in-demand-skills.html").write_text(html, encoding="utf-8")

    occs = parse(html)
    table = {
        "stream": "OINP Employer Job Offer: In-Demand Skills",
        "province": "ON",
        "url": URL,
        "fetched": date.today().isoformat(),
        "teer": [4, 5],
        "wageRule": "Wage must meet or exceed the local median wage for the occupation/region.",
        "gtaNote": "gtaRestricted=true 的职业只在大多伦多区域(Toronto/Durham/Halton/York/Peel)以外符合。",
        "occupations": sorted(occs, key=lambda x: x["noc"]),
    }
    OUT_TABLE.parent.mkdir(parents=True, exist_ok=True)
    OUT_TABLE.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    n = len(occs)
    gta = sum(1 for o in occs if o["gtaRestricted"])
    print(f"OINP in-demand: {n} 个职业(任意地区 {n - gta} · 限GTA外 {gta})→ {OUT_TABLE}")


if __name__ == "__main__":
    main()
