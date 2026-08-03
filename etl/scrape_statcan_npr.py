"""StatCan 非永久居民(NPR)占总人口比 —— 联邦「临时人口降到 5%」目标的**唯一可核验刻度**。

2026-08-03 立项(Frank:「政府说要把临时人口降低到 5% 以下,现在是多少了」)。这个数**不在 IRCC 口径里**:
IRCC 开放数据给的是学签/工签**许可持有人**(会重复计人、不含访客与庇护申请人),
分母「加拿大总人口」它也不发。占比只能取 StatCan 季度人口估算。

为什么值钱:它是各省提名配额被砍、PNP 越来越卷的**上游原因**。峰值 2024-10 的 7.59% → 2026-04 的 6.18%,
配额同步下滑;用户在报告里看到的「难度」变化,根子在这条曲线上。

  IN : StatCan WDS(免密钥 REST):v1=加拿大季度总人口 / v1566927590=非永久居民(NPR)总数
  OUT: raw/ircc/npr_share.json   (季度序列 + 最新占比 + 距 5% 目标的人数缺口)

口径注:refPer 是季度**参考日**(1/1、4/1、7/1、10/1),StatCan 每季度发布并会修订前序季度 →
本脚本每次全量重取近 N 个季度,不做增量拼接(修订才不会被旧值盖住)。

Usage:  uv run python etl/scrape_statcan_npr.py
"""
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _paths  # noqa: E402

OUT = _paths.IRCC / "npr_share.json"
print(f"OUT={OUT}", flush=True)

WDS = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods"
V_POP = 1              # 加拿大总人口(季度)
V_NPR = 1566927590     # 非永久居民总数(季度)
QUARTERS = 20          # 取近 5 年,够画趋势也够算年化降速
TARGET = 0.05          # 联邦目标:临时人口占比 5%
SRC_URLS = {
    "population": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901",
    "npr": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710012101",
}


def series(vector: int) -> dict[str, float]:
    r = httpx.post(WDS, json=[{"vectorId": vector, "latestN": QUARTERS}],
                   headers={"User-Agent": "offer2pr-npr/1.0"}, timeout=60)
    r.raise_for_status()
    blk = r.json()[0]
    if blk.get("status") != "SUCCESS":
        raise RuntimeError(f"WDS 返回 {blk.get('status')} (vector {vector})")
    return {p["refPer"]: float(p["value"]) for p in blk["object"]["vectorDataPoint"] if p.get("value") is not None}


def main() -> None:
    _paths.IRCC.mkdir(parents=True, exist_ok=True)
    try:
        pop, npr = series(V_POP), series(V_NPR)
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表(宁可留旧也不留空)
        print(f"  ✗ StatCan 抓取失败: {type(e).__name__} {e}(保留旧表)")
        return
    rows = [{"refPer": q, "population": int(pop[q]), "npr": int(npr[q]), "share": round(npr[q] / pop[q], 5)}
            for q in sorted(npr) if q in pop]
    if len(rows) < 4:
        print(f"  ✗ 只取到 {len(rows)} 个季度(<4,疑似 WDS 改版)—— 保留旧表")
        return
    latest, peak = rows[-1], max(rows, key=lambda r: r["share"])
    # 年化降速:用最近 4 个季度(不足 4 个就用现有跨度),外推到 5% 还要几个季度
    span = rows[-5:] if len(rows) >= 5 else rows
    per_q = (span[-1]["share"] - span[0]["share"]) / max(len(span) - 1, 1)
    gap_people = int(latest["npr"] - latest["population"] * TARGET)
    quarters_to_target = round((TARGET - latest["share"]) / per_q, 1) if per_q < 0 else None
    out = {
        "source": SRC_URLS, "fetched": date.today().isoformat(),
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "target": TARGET, "quarters": rows,
        "latest": latest, "peak": peak,
        "perQuarterChange": round(per_q, 5),
        "gapToTargetPeople": gap_people,
        "quartersToTarget": quarters_to_target,
        "note": ("NPR=非永久居民(含学签/工签持有人及其家属、访客、庇护申请人),分母=StatCan 季度总人口估算。"
                 "**与 IRCC 许可持有人数不可混用**(后者会重复计人且不含访客/庇护)。"
                 "StatCan 每季度发布并修订前序季度,故每轮全量重取。quartersToTarget 是按最近四季降速的"
                 "线性外推,不是官方预测。"),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  ✓ NPR 占比 {len(rows)} 个季度 → {OUT.name}")
    print(f"      最新 {latest['refPer']}: {latest['share']*100:.2f}%  "
          f"({latest['npr']:,} / {latest['population']:,})")
    print(f"      峰值 {peak['refPer']}: {peak['share']*100:.2f}%   目标 5% 还差 {gap_people:,} 人")
    print(f"      降速 {per_q*100:+.2f} 个百分点/季度 → 按此外推还需约 {quarters_to_target} 个季度")


if __name__ == "__main__":
    main()
