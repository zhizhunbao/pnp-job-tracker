"""地区统计 v1(E5-04,三问之「去哪」):省 × NOC 大类 × 中类 预聚合,页面零计算只渲染。

行 = 省 × 大类 × 中类(mid='all'=大类汇总;broad='all'=省级汇总;2026-07-19 Frank 拍板加中类层:
「有了统计信息才会给人提供选哪个行业哪个地区的概率指导」——图表下钻 省→大类→中类→职位板):
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
IN_DIFF = _paths.PROCESSED / "difficulty.json"   # E12-07:省难度指数(04e 产出;缺文件=不挂,列留空)
OUT_STATS = _paths.MART / "stats.json"
# E8-14 每日快照:只产出**今天这一天**的行,seed 按 (date,province,broad) UPSERT 追加,永不 DELETE。
# 趋势图的唯一数据来源;历史补不回来 —— 落地那天才是第一个点,所以先于主图建起来。
OUT_DAILY = _paths.MART / "stats_daily.json"
# E8-14 主图的两个新粒度(现有 stats 是 省×大类×中类,出不了「具体职业」与「城市」两条横轴)
IN_NOC_DESC = _paths.MART / "noc_descriptions.json"   # 职业名(官方名,已随 09 产出)
OUT_OCC = _paths.MART / "stats_occupation.json"       # 职业 × 省(province='all' 为全国行)
OUT_CITY = _paths.MART / "stats_city.json"            # 城市

PROVS = ["ON", "BC", "AB", "SK", "MB", "QC", "NS", "NB", "NL", "PE"]
TODAY = date.today().isoformat()


def median_or_none(vals: list) -> float | None:
    vals = [v for v in vals if isinstance(v, (int, float))]
    return round(statistics.median(vals)) if vals else None


def main() -> None:
    print(f"IN : {IN_JOBS}\nOUT: {OUT_STATS}")
    jobs = [j for j in json.loads(IN_JOBS.read_text(encoding="utf-8")) if j.get("status") != "closed"]
    cut7 = (date.today() - timedelta(days=7)).isoformat()

    buckets: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for j in jobs:
        prov = (j.get("province") or "").upper()
        if prov not in PROVS:
            continue
        broad = j.get("broad") or "未分类"
        mid = j.get("mid") or "未分类"
        buckets[(prov, broad, mid)].append(j)
        buckets[(prov, broad, "all")].append(j)
        buckets[(prov, "all", "all")].append(j)

    diff: dict[str, str] = {}
    if IN_DIFF.exists():
        _d = json.loads(IN_DIFF.read_text(encoding="utf-8"))
        diff = {r["province"]: json.dumps(r | {"generated": _d.get("generated")}, ensure_ascii=False) for r in _d.get("rows", [])}
    rows: list[dict] = []
    for (prov, broad, mid), js in sorted(buckets.items()):
        streams = sorted({j["pnpStream"] for j in js if j.get("pnpStream")})
        cities = Counter(j.get("city") for j in js if j.get("city"))
        rows.append({
            "province": prov, "broad": broad, "mid": mid,
            "openJobs": len(js),
            "new7d": sum(1 for j in js if (j.get("datePosted") or "") >= cut7),
            "medianWageAnnual": median_or_none([j.get("wageMedAnnual") for j in js]),
            "medianSalaryAnnual": median_or_none([j.get("salaryAnnual") for j in js]),
            "namedJobs": sum(1 for j in js if j.get("pnpStream")),
            "streamLabels": "、".join(streams),
            "aipJobs": sum(1 for j in js if j.get("aip")),
            "topCities": json.dumps([{"city": c, "n": n} for c, n in cities.most_common(5)], ensure_ascii=False),
            "fetched": TODAY,
            # E12-07:省级汇总行挂难度指数(jsonb);非省级行留空
            "difficulty": (diff.get(prov) if broad == "all" and mid == "all" else None),
        })

    OUT_STATS.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── E8-14 每日快照 ────────────────────────────────────────────────────────
    # 粒度 = 日 × 省 × 大类(含 all 汇总行),取 stats 的大类层直接投影 —— 不重算,口径与主表天生一致。
    # 一天多跑几轮 ETL 也只会 UPSERT 同一批行(date 是主键的一部分),不会灌出重复点。
    daily = [{"date": TODAY, "province": r["province"], "broad": r["broad"],
              "openJobs": r["openJobs"], "new7d": r["new7d"],
              "medianSalaryAnnual": r["medianSalaryAnnual"], "namedJobs": r["namedJobs"]}
             for r in rows if r["mid"] == "all"]
    OUT_DAILY.write_text(json.dumps(daily, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"stats_daily: {len(daily)} 行(日期 {TODAY})→ {OUT_DAILY}")

    # ── E8-14 主图数据源:职业粒度 + 城市粒度 ────────────────────────────────
    # 都是「当下状态」的维度表(走 dims 的清空+重灌),与 stats_daily 的追加语义不同。
    # 职业名取 noc_descriptions 的官方名 —— 不在这里造名字,拿不到就留空(宁可留空不瞎猜)。
    noc_name: dict[str, dict] = {}
    if IN_NOC_DESC.exists():
        for d in json.loads(IN_NOC_DESC.read_text(encoding="utf-8")):
            noc_name[d.get("noc", "")] = d

    def agg(js: list) -> dict:
        return {"openJobs": len(js),
                "new7d": sum(1 for j in js if (j.get("datePosted") or "") >= cut7),
                "medianSalaryAnnual": median_or_none([j.get("salaryAnnual") for j in js]),
                "namedJobs": sum(1 for j in js if j.get("pnpStream"))}

    occ_rows = []
    by_noc: dict[str, list] = defaultdict(list)
    for j in jobs:
        if j.get("noc"):
            by_noc[j["noc"]].append(j)
    for noc, js in by_noc.items():
        nd = noc_name.get(noc, {})
        base = {"noc": noc, "teer": js[0].get("teer"), "broad": js[0].get("broad", ""),
                "titleZh": nd.get("titleZh", ""), "titleEn": nd.get("title", ""), "fetched": TODAY}
        occ_rows.append({**base, "province": "all", **agg(js)})       # 全国行
        by_p: dict[str, list] = defaultdict(list)
        for j in js:
            if j.get("province"):
                by_p[j["province"]].append(j)
        for prov, pjs in by_p.items():
            occ_rows.append({**base, "province": prov, **agg(pjs)})
    OUT_OCC.write_text(json.dumps(occ_rows, ensure_ascii=False, indent=2), encoding="utf-8")

    city_rows = []
    by_city: dict[tuple, list] = defaultdict(list)
    for j in jobs:
        if j.get("city"):
            by_city[(j["city"], j.get("province", ""))].append(j)
    for (city, prov), js in by_city.items():
        city_rows.append({"city": city, "province": prov, "fetched": TODAY, **agg(js)})
    city_rows.sort(key=lambda r: -r["openJobs"])
    OUT_CITY.write_text(json.dumps(city_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"stats_occupation: {len(occ_rows)} 行({len(by_noc)} 个职业)→ {OUT_OCC}")
    print(f"stats_city: {len(city_rows)} 行 → {OUT_CITY}")

    provs = len({r["province"] for r in rows})
    base = sum(1 for r in rows if r["mid"] == "all")
    print(f"stats: {len(rows)} 行({provs} 省;大类层 {base} 行 + 中类层 {len(rows) - base} 行)→ {OUT_STATS}")


if __name__ == "__main__":
    main()
