"""
build_wages — ESDC/Job Bank 工资开放数据 → 我们维护的「NOC×地区 中位工资」维度表。
源(免费,年度更新,加拿大开放政府许可):
  https://open.canada.ca/data/en/dataset/adad580f-76b0-4502-bd05-20c125de9116
NOC 2021 五位码 × 经济区(国/省/区)的 low/median/high 时薪。

Usage:  uv run python etl/build_wages.py
"""
import csv
import io
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

# ── 输入/输出全路径 ──────────────────────────────────────────────
WAGE_URL = ("https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116/"
            "resource/9da94d63-b178-4a64-aeb3-b6a3bd721ad2/download/"
            "2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv")
IN_CSV = _paths.WAGES / "wage2025.csv"   # 下载缓存(可重下)
OUT_TABLE = _paths.WAGES / "wages.json"            # 我们维护的维度表


def download() -> str:
    IN_CSV.parent.mkdir(parents=True, exist_ok=True)
    if IN_CSV.exists():
        print(f"用已缓存的 {IN_CSV}")
        return IN_CSV.read_text(encoding="utf-8-sig", errors="replace")
    print(f"下载 {WAGE_URL}")
    with httpx.Client(timeout=120, follow_redirects=True) as c:
        r = c.get(WAGE_URL)
        r.raise_for_status()
    IN_CSV.write_bytes(r.content)
    return r.content.decode("utf-8-sig", errors="replace")


def main() -> None:
    text = download()
    reader = csv.DictReader(io.StringIO(text))
    # 取「省级」中位:prov 是省码 + ER_Code 为 4 位(ERxx=整省);另存「国家级」(prov=NAT)兜底。
    # Annual_Wage_Flag=1 → 数值是年薪率,否则是时薪。统一存 hourly + annual 便于对比/显示。
    table: dict[str, dict] = {}
    kept = 0
    for r in reader:
        noc = (r.get("NOC_CNP") or "").replace("NOC_", "").strip()
        prov = (r.get("prov") or "").strip().upper()
        er = (r.get("ER_Code_Code_RE") or "").strip()
        med = (r.get("Median_Wage_Salaire_Median") or "").strip()
        if not (noc and med):
            continue
        is_province = prov != "NAT" and len(er) == 4   # ERxx=整省(ER00 是 NAT)
        if not (is_province or prov == "NAT"):
            continue                                    # 跳过经济区(6位)粒度,先只要省级+国家级
        try:
            v = float(med)
        except ValueError:
            continue
        annual_flag = (r.get("Annual_Wage_Flag_Salaire_annuel") or "").strip() == "1"
        hourly = round(v / 2080, 2) if annual_flag else v
        annual = round(v) if annual_flag else round(v * 2080)
        key = "NAT" if prov == "NAT" else prov
        table.setdefault(noc, {})[key] = {"hourly": hourly, "annual": annual}
        kept += 1

    OUT_TABLE.write_text(json.dumps(table, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"建表完成:{len(table)} 个 NOC(省级+国家级 {kept} 条)→ wages/wages.json")
    for noc in ("21311", "31301", "63200", "73300"):
        print(f"  NOC {noc}: NAT={table.get(noc, {}).get('NAT')} ON={table.get(noc, {}).get('ON')}")


if __name__ == "__main__":
    main()
