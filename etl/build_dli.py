"""build_dli — PGWP 可申 DLI 子集(E12-03,旗舰②学校数据·范围化)。

金源 = IRCC「Designated learning institutions list」页 DataTables 的 ajaxSource(官方机器可读 JSON,httpx 直取):
  https://www.canada.ca/content/dam/ircc/documents/json/dli/dli-full-list.json
范围化(规划 §6,不建全 DLI 目录):只取 **PGWP=Yes** 行(约 495 行)→ 按 DLI# 去重成院校级(约 295 所,记 campuses 数)。
省名→省码映射;未知省**跳过**(宁可留空不瞎猜)。⚠️ 源 JSON 法语校名需强制 utf-8 解码(默认 charset 会 mojibake)。

挂 `pnp` 源周更(sources/pnp/META,名单低频);输出 raw/dli/dli.json(跟踪,09 直通进 mart/dli.json)。
Usage:  uv run python etl/build_dli.py
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

IN_URL = "https://www.canada.ca/content/dam/ircc/documents/json/dli/dli-full-list.json"   # 输入:IRCC 官方全量 DLI JSON
# 出处用「人能读的着陆页」(E4-04 惯例),不是数据文件 URL
LANDING = "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html"
OUT_FILE = _paths.DLI / "dli.json"                                                        # 输出:PGWP 子集(院校级)

UA = {"User-Agent": "Mozilla/5.0 (compatible; pnp-job-tracker dli-builder)"}

PROV_CODE = {
    "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
    "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
    "Saskatchewan": "SK", "Yukon": "YT",
}


def main() -> None:
    print(f"IN : {IN_URL}")
    print(f"OUT: {OUT_FILE}")
    r = httpx.get(IN_URL, headers=UA, timeout=60, follow_redirects=True)
    r.raise_for_status()
    r.encoding = "utf-8"                      # 源默认 charset 声明不可靠,法语校名(Collège)防 mojibake
    raw_rows = json.loads(r.text).get("data", [])
    print(f"source rows: {len(raw_rows)}")

    by_dli: dict[str, dict] = {}
    skipped_prov = set()
    for row in raw_rows:
        if row.get("PGWP") != "Yes":
            continue
        prov = PROV_CODE.get((row.get("Province") or "").strip())
        if not prov:
            skipped_prov.add(row.get("Province"))
            continue                          # 未知省:跳过不猜
        num = (row.get("DLI #") or "").strip()
        if not num:
            continue
        cur = by_dli.get(num)
        if cur:
            cur["campuses"] += 1              # 同 DLI# 多校区 → 记数,主城取首行
        else:
            by_dli[num] = {
                "province": prov,
                "name": (row.get("Institution") or "").strip(),
                "dliNumber": num,
                "city": (row.get("City") or "").strip(),
                "campuses": 1,
                "isPublic": "Public" in (row.get("Public/Private") or ""),
                "gradProgram": (row.get("Grad Program") == "Yes"),
            }

    rows = sorted(by_dli.values(), key=lambda x: (x["province"], x["name"]))
    if skipped_prov:
        print(f"skipped unknown provinces: {sorted(str(s) for s in skipped_prov)}")
    if len(rows) < 100:                       # 防线:官方源结构变了宁可整轮失败,别灌半截
        raise SystemExit(f"suspiciously few PGWP institutions ({len(rows)}) — source schema changed?")

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out = {"url": LANDING, "fetched": date.today().isoformat(), "rows": rows}
    tmp = OUT_FILE.with_suffix(".tmp")        # 原子写(04c 惯例)
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(OUT_FILE)
    pub = sum(1 for x in rows if x["isPublic"])
    atl = sum(1 for x in rows if x["province"] in ("NS", "NB", "PE", "NL") and x["isPublic"])
    print(f"wrote {len(rows)} institutions (public {pub}, Atlantic public {atl}) fetched={out['fetched']}")


if __name__ == "__main__":
    main()
