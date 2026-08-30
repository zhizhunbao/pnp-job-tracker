"""StatCan 分省临时居民存量(季度)—— IRCC 年末存量停在 2024 后,2025/2026 唯一的官方分省刻度。

2026-08-14 立项(竞争卡年份列缺口探索):StatCan 表 17-10-0121-01 分省 × 证型
(仅学签 / 仅工签 / 学+工)× 季度,WDS 免密钥,最新参考日领先 IRCC 年末表一年半。
**口径与 IRCC 不可混列**:StatCan=常住人口估算(净掉已离境/未入境),IRCC=有效许可持有人 ——
ON 学签 IRCC 2024-12=482,100 vs StatCan 同期常住估算约六成。竞争卡要不要用、怎么标注
是产品拍板(2026-08-14 Frank 批的是「接入落 raw」),本脚本不进 mart、不灌库。

  IN : StatCan WDS getCubeMetadata + getDataFromCubePidCoordAndLatestNPeriods (pid 17100121)
  OUT: raw/ircc/statcan_tr_prov.json

口径注:refPer 是季度参考日(1/1、4/1、7/1、10/1);"2026-01-01" ≈ 2025 年末快照。
StatCan 每季度发布并修订前序季度 → 每轮全量重取近 N 季,不做增量拼接。

Usage:  uv run python etl/scrape_statcan_tr_prov.py
"""
import io
import json
import os
import sys
from datetime import date
from pathlib import Path

import httpx

if os.name == "nt":  # 本机控制台 cp1252 打不了 ✗/中文;容器由 auto_update 设 PYTHONIOENCODING
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import paths

OUT = paths.IRCC / "statcan_tr_prov.json"
print(f"OUT={OUT}", flush=True)

WDS = "https://www150.statcan.gc.ca/t1/wds/rest"
PID = 17100121
QUARTERS = 8                       # 近 2 年:覆盖「IRCC 停更后」的全部空窗
SRC_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710012101"
UA = {"User-Agent": "offer2pr-tr-prov/1.0"}
PROV = {
    "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE", "Nova Scotia": "NS",
    "New Brunswick": "NB", "Quebec": "QC", "Ontario": "ON", "Manitoba": "MB",
    "Saskatchewan": "SK", "Alberta": "AB", "British Columbia": "BC",
}
TYPES = {                          # 输出键 → StatCan 维度成员名(改名=改版,靠 metadata 解析兜住)
    "studyOnly": "Study permit holders only",
    "workOnly": "Work permit holders only",
    "workStudy": "Work and study permit holders",
}


def member_ids() -> tuple[dict[str, int], dict[str, int]]:
    """metadata 解析省/证型的 memberId(不写死:StatCan 重排成员时坐标会静默错位)。"""
    r = httpx.post(f"{WDS}/getCubeMetadata", json=[{"productId": PID}], headers=UA, timeout=60)
    r.raise_for_status()
    dims = r.json()[0]["object"]["dimension"]
    geo = {m["memberNameEn"]: int(m["memberId"]) for d in dims if d["dimensionNameEn"] == "Geography" for m in d["member"]}
    typ = {m["memberNameEn"]: int(m["memberId"]) for d in dims if "type" in d["dimensionNameEn"].lower() for m in d["member"]}
    return ({code: geo[name] for name, code in PROV.items() if name in geo},
            {key: typ[name] for key, name in TYPES.items() if name in typ})


def main() -> None:
    paths.IRCC.mkdir(parents=True, exist_ok=True)
    try:
        geo_ids, typ_ids = member_ids()
        if len(geo_ids) < 10 or len(typ_ids) < 3:
            raise RuntimeError(f"维度成员缺位(省 {len(geo_ids)}/10,证型 {len(typ_ids)}/3)—— 疑似表改版")
        reqs = [{"productId": PID, "coordinate": f"{g}.{t}.0.0.0.0.0.0.0.0", "latestN": QUARTERS}
                for g in geo_ids.values() for t in typ_ids.values()]
        r = httpx.post(f"{WDS}/getDataFromCubePidCoordAndLatestNPeriods", json=reqs, headers=UA, timeout=120)
        r.raise_for_status()
        # 响应块**不按请求顺序**回来(实测乱序)—— 只能从块自带 coordinate 反解 (省, 证型)
        prov_of = {g: p for p, g in geo_ids.items()}
        key_of = {t: k for k, t in typ_ids.items()}
        by_prov: dict[str, dict[str, dict[str, int]]] = {}
        for blk in r.json():
            if blk.get("status") != "SUCCESS":
                raise RuntimeError(f"WDS 返回 {blk.get('status')}")
            o = blk["object"]
            g, t = (int(x) for x in o["coordinate"].split(".")[:2])
            prov, key = prov_of.get(g), key_of.get(t)
            if not prov or not key:
                raise RuntimeError(f"响应坐标 {o['coordinate']} 对不上请求的省/证型")
            for p in o["vectorDataPoint"]:
                if p.get("value") is not None:
                    by_prov.setdefault(prov, {}).setdefault(p["refPer"], {})[key] = int(p["value"])
        latest = max(q for p in by_prov.values() for q in p)
        if (by_prov.get("ON", {}).get(latest, {}).get("studyOnly") or 0) < 50000:
            raise RuntimeError("ON 最新学签存量 <5 万 —— 量级失真,疑似坐标错位/表改版")
    except Exception as e:  # noqa: BLE001  抓取失败 → 保留旧表(宁可留旧也不留空)
        print(f"  ✗ StatCan 分省存量抓取失败: {type(e).__name__} {e}(保留旧表)")
        return

    OUT.write_text(json.dumps({
        "source": SRC_URL, "fetched": date.today().isoformat(),
        "types": {k: TYPES[k] for k in typ_ids},
        "byProv": by_prov, "latestRefPer": latest,
        "note": ("StatCan 17-10-0121-01 分省临时居民**常住估算**(季度参考日快照;每季修订前序,故每轮全量重取)。"
                 "**与 IRCC 有效许可持有人口径不可混列**(后者不净离境,量级高约四成)。"
                 "refPer 2026-01-01 ≈ 2025 年末。消费端待拍板:落 raw 不进 mart。"),
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    on = by_prov.get("ON", {}).get(latest, {})
    print(f"  ✓ 分省存量 {len(by_prov)} 省 × {QUARTERS} 季 → {OUT.name}", flush=True)
    print(f"      最新 {latest}: ON 仅学签 {on.get('studyOnly', 0):,} · 仅工签 {on.get('workOnly', 0):,} "
          f"· 学+工 {on.get('workStudy', 0):,}", flush=True)


if __name__ == "__main__":
    main()
