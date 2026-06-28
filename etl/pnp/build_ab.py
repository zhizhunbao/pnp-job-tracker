"""
build_ab — 抓 AAIP(阿尔伯塔)「Alberta Opportunity Stream」的**不符合资格职业**清单,
建成我们维护的 PNP 维度表。各省 PNP 清单的第二个源,演示与 OINP 相反的语义。

与 OINP 的关键区别 —— 两种模型:
  · OINP「In-Demand Skills」= **inclusion**:TEER4-5 默认不符合,只有清单内的才符合。
  · AAIP「Opportunity Stream」= **exclusion(permissive)**:TEER 0-5 默认都符合,
    只有这张「ineligible occupations」表里的不符合。
所以本表 type="ineligible";08_score 据 type 反向判定(除清单外都可走)。

源(免费,偶尔更新;alberta.ca 虽走 Cloudflare 但 httpx 直抓 200,无需 headless):
  https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility
页面 "Table 1. List of ineligible occupations" 是个 <table>,列:NOC code(2021)/TEER/Occupation。
NOC 带 `*` = 条件性不符合(如未认证 ECE);粗筛信号下保守按不符合处理(去掉星号)。

产出:
  raw/aaip/<date>/opportunity-stream-eligibility.html  # 原始页(raw 只存原始)
  pnp/aaip-ineligible.json                          # 维护表(跟踪)

Usage:  uv run python etl/pnp/build_ab.py   (或 .venv 的 python)
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

URL = "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility"
OUT_RAW_DIR = _paths.RAW / "aaip"                     # 原始页快照(按日期)
OUT_TABLE = _paths.PNP / "aaip-ineligible.json"   # 维护表(跟踪)
UA = "Mozilla/5.0 (compatible; pnp-job-tracker/1.0)"

NOC5 = re.compile(r"^\d{5}\*?$")  # "00010" 或 "60040*"(星号=条件性不符合)


def parse(html: str) -> list[dict]:
    """找列头含「NOC code」的表,抽 {noc, teer, name}。去掉 NOC 的星号(保守按不符合)。"""
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
            noc = c[0].rstrip("*")
            teer = int(c[1]) if c[1].isdigit() else None
            name = re.sub(r"\s+", " ", c[2]).strip(" .")
            occs.setdefault(noc, {"noc": noc, "teer": teer, "name": name})
        return list(occs.values())
    return []


def main() -> None:
    print(f"IN  : {URL}")
    print(f"OUT raw   : {OUT_RAW_DIR}/<date>/opportunity-stream-eligibility.html")
    print(f"OUT table : {OUT_TABLE}")
    r = httpx.get(URL, headers={"User-Agent": UA}, follow_redirects=True, timeout=30)
    r.raise_for_status()
    html = r.text

    snap = OUT_RAW_DIR / date.today().isoformat()
    snap.mkdir(parents=True, exist_ok=True)
    (snap / "opportunity-stream-eligibility.html").write_text(html, encoding="utf-8")

    occs = parse(html)
    if not occs:
        raise SystemExit("解析失败:没找到含「NOC code」的不符合资格表 —— 页面结构可能变了")
    table = {
        "stream": "AAIP Alberta Opportunity Stream",
        "province": "AB",
        "type": "ineligible",  # 排除型:除本表外 TEER0-5 都符合(与 OINP inclusion 相反)
        "url": URL,
        "fetched": date.today().isoformat(),
        "note": "AOS 接受 TEER0-5(4/5 需 CLB4),本表是不符合资格的职业;原带 * 为条件性不符合,粗筛下按不符合处理。",
        "occupations": sorted(occs, key=lambda x: x["noc"]),
    }
    OUT_TABLE.parent.mkdir(parents=True, exist_ok=True)
    OUT_TABLE.write_text(json.dumps(table, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"AAIP ineligible: {len(occs)} 个不符合资格职业 → {OUT_TABLE}")


if __name__ == "__main__":
    main()
