"""
build_ab — AB AAIP 两份清单(**全实时抓** alberta.ca,httpx 即可;md 只作参考):
  · Alberta Opportunity Stream「不符合资格职业」(exclusion)→ aaip-ineligible.json
    —— 排除型:除本表外 TEER0-5 都符合(与 OINP inclusion 相反)。
  · Accelerated Tech Pathway 职业清单(PDF,inclusion 具名通道)→ ab-tech.json「AB 科技」
    —— TEER0-3 高技能科技/管理岗;命中 → 具名通道标签(资格仍由上面的排除表定,二者解耦)。

08_score 把「具名通道(stream)」与「资格 type」解耦:exclusion 省也能挂 inclusion 通道标签。

Usage:  uv run python etl/pnp/build_ab.py   (需 httpx+bs4+pymupdf,系统 python 没装 → .venv / docker etl 镜像)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import fitz  # pymupdf,解析 PDF
import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _paths
import _paths  # noqa: E402

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
AOS_URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility"
TECH_PDF_URL = "https://www.alberta.ca/system/files/custom_downloaded_images/lbr-aaip-tech-pathway-nocs-codes-list.pdf"

NOC5 = re.compile(r"^\d{5}\*?$")            # "00010" / "60040*"(星号=条件性不符合)
PDF_NOC = re.compile(r"^(\d{5})\s+(.+)$")    # PDF 行:"00012 Senior managers - …"


def parse_aos(html: str) -> list[dict]:
    """找列头含「NOC code」的表,抽 {noc,teer,name};去掉 NOC 星号(保守按不符合)。"""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        head = " ".join(th.get_text(" ", strip=True) for th in rows[0].find_all(["th", "td"])).lower() if rows else ""
        if "noc code" not in head:
            continue
        occs: dict[str, dict] = {}
        for tr in rows[1:]:
            c = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
            if len(c) < 3 or not NOC5.match(c[0]):
                continue
            occs.setdefault(c[0].rstrip("*"), {"noc": c[0].rstrip("*"),
                                               "teer": int(c[1]) if c[1].isdigit() else None,
                                               "name": re.sub(r"\s+", " ", c[2]).strip(" .")})
        return list(occs.values())
    return []


def parse_tech_pdf(data: bytes) -> list[dict]:
    """PDF 每行「##### 职业名」→ {noc,name}。"""
    doc = fitz.open(stream=data, filetype="pdf")
    txt = "\n".join(p.get_text() for p in doc)
    occs: dict[str, dict] = {}
    for ln in txt.splitlines():
        m = PDF_NOC.match(ln.strip())
        if m:
            occs.setdefault(m.group(1), {"noc": m.group(1), "name": re.sub(r"\s+", " ", m.group(2)).strip(" .")})
    return list(occs.values())


def main() -> None:
    _paths.PNP.mkdir(parents=True, exist_ok=True)
    # ① 不符合资格清单(exclusion,HTML 表)
    try:
        occ1 = parse_aos(httpx.get(AOS_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=30).text)
    except Exception as e:  # noqa: BLE001
        occ1 = None
        print(f"  ✗ 抓取失败 aaip-ineligible.json: {type(e).__name__} {e}(保留旧表)")
    if occ1:
        (_paths.PNP / "aaip-ineligible.json").write_text(json.dumps({
            "stream": "AAIP Alberta Opportunity Stream", "label": "AAIP 不符合清单",
            "province": "AB", "type": "ineligible", "url": AOS_URL, "fetched": date.today().isoformat(),
            "note": "除本表外 TEER0-5 都符合;原带 * 为条件性不符合,粗筛下按不符合处理。",
            "occupations": sorted(occ1, key=lambda x: x["noc"]),
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ AAIP 不符合清单  {len(occ1)} 个职业 → pnp/aaip-ineligible.json")
    elif occ1 is not None:
        print("  ✗ 没解析到不符合资格表(保留旧表)")

    # ② 加速科技通道(inclusion 具名,PDF)
    try:
        occ2 = parse_tech_pdf(httpx.get(TECH_PDF_URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=40).content)
    except Exception as e:  # noqa: BLE001
        occ2 = None
        print(f"  ✗ 抓取失败 ab-tech.json: {type(e).__name__} {e}(保留旧表)")
    if occ2:
        (_paths.PNP / "ab-tech.json").write_text(json.dumps({
            "stream": "AAIP Accelerated Tech Pathway", "label": "AB 科技",
            "province": "AB", "type": "indemand", "url": TECH_PDF_URL, "fetched": date.today().isoformat(),
            "occupations": sorted(occ2, key=lambda x: x["noc"]),
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ AB 科技         {len(occ2)} 个职业 → pnp/ab-tech.json")
    elif occ2 is not None:
        print("  ✗ Tech PDF 没解析到 NOC(保留旧表)")


if __name__ == "__main__":
    main()
