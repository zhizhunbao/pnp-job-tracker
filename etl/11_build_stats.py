"""地区统计 v1(E5-04,三问之「去哪」):省 × NOC 大类 预聚合,页面零计算只渲染。

行 = 省 × 大类(含 broad='all' 省级汇总):
  openJobs        在招岗数(本站抓取口径)
  new7d           7 天新增(datePosted 近 7 天)
  medianWageAnnual 中位年薪 —— 口径=ESDC:取该桶内各岗「所在 NOC×省 的 ESDC 中位年薪」的中位数(不是帖面薪资)
  medianSalaryAnnual 帖面中位年薪 —— 口径=本站折算:该桶内岗位帖面年薪的中位数(对照用)
  namedJobs / streamLabels  省具名通道命中岗数 + 通道名列表(来自省官网清单)
  aipJobs         AIP 指定雇主岗数(大西洋四省)
  topCities       桶内在招量前 5 的城市(json:[{city,n}])
v1 只做省级(市级后置);RNIP 待 E6 有数据再并入。
输入:mart/jobs.json(跑在 09 之后);输出:mart/stats.json(seed 灌 stats 表)。
"""
from __future__ import annotations

import json
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")

IN_JOBS = _paths.MART / "jobs.json"
OUT_STATS = _paths.MART / "stats.json"

PROVS = ["ON", "BC", "AB", "SK", "MB", "QC", "NS", "NB", "NL", "PE"]
TODAY = date.today().isoformat()


def median_or_none(vals: list) -> float | None:
    vals = [v for v in vals if isinstance(v, (int, float))]
    return round(statistics.median(vals)) if vals else None


def main() -> None:
    print(f"IN : {IN_JOBS}\nOUT: {OUT_STATS}")
    jobs = [j for j in json.loads(IN_JOBS.read_text(encoding="utf-8")) if j.get("status") != "closed"]
    cut7 = (date.today() - timedelta(days=7)).isoformat()

    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for j in jobs:
        prov = (j.get("province") or "").upper()
        if prov not in PROVS:
            continue
        broad = j.get("broad") or "未分类"
        buckets[(prov, broad)].append(j)
        buckets[(prov, "all")].append(j)

    rows: list[dict] = []
    for (prov, broad), js in sorted(buckets.items()):
        streams = sorted({j["pnpStream"] for j in js if j.get("pnpStream")})
        cities = Counter(j.get("city") for j in js if j.get("city"))
        rows.append({
            "province": prov, "broad": broad,
            "openJobs": len(js),
            "new7d": sum(1 for j in js if (j.get("datePosted") or "") >= cut7),
            "medianWageAnnual": median_or_none([j.get("wageMedAnnual") for j in js]),
            "medianSalaryAnnual": median_or_none([j.get("salaryAnnual") for j in js]),
            "namedJobs": sum(1 for j in js if j.get("pnpStream")),
            "streamLabels": "、".join(streams),
            "aipJobs": sum(1 for j in js if j.get("aip")),
            "topCities": json.dumps([{"city": c, "n": n} for c, n in cities.most_common(5)], ensure_ascii=False),
            "fetched": TODAY,
        })

    OUT_STATS.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    provs = len({r["province"] for r in rows})
    print(f"stats: {len(rows)} 行({provs} 省 × 大类含 all)→ {OUT_STATS}")


if __name__ == "__main__":
    main()
