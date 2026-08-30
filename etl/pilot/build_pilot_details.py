"""build_pilot_details — 社区指定雇主/职业清单**自动刷新**(E6-11 批C,2026-08-15)。

批B 用 agent 一次性抽了 18 社区;本脚本把它变成周更:pilot_extractors/ 里每社区一个抽取函数,
总控逐社区跑,**塌方保旧**:行数掉到基线一半以下、或抽取抛异常 → 该社区沿用上一版行并打「!」
(auto_update 记 ERROR 级);其余社区正常刷新。整脚本永远 exit 0,不拦役。

  IN : 各社区官方源(pilot_extractors 直连) + raw/pilot/pilot-{employers,occupations}.json(保旧底本)
       raw/pilot/pilot-communities.json(社区 → 省/类型)
  OUT: raw/pilot/pilot-employers.json + pilot-occupations.json(原地刷新)

Usage:  uv run python etl/build_pilot_details.py
"""
import io
import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # 分域后上一级才是 etl/
import _paths  # noqa: E402
from extractors import EXTRACTORS  # noqa: E402

if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

IN_COMMUNITIES = _paths.PILOT / "pilot-communities.json"
OUT_EMP = _paths.PILOT / "pilot-employers.json"
OUT_OCC = _paths.PILOT / "pilot-occupations.json"
print(f"IN_COMMUNITIES={IN_COMMUNITIES}\nOUT_EMP={OUT_EMP}\nOUT_OCC={OUT_OCC}", flush=True)

# 批B 基线(2026-08-15 实抽行数);哨兵=新抽 < 基线一半 → 疑似改版塌方,保旧。
# Peace Liard 雇主基线 0(官方待公示):>0 即收,不设下限
BASELINE_EMP = {
    "North Bay and Area": 228, "Sudbury, ON": 426, "Timmins, ON": 153, "Sault Ste. Marie, ON": 151,
    "Thunder Bay, ON": 406, "Superior East Region, ON": 15, "West Kootenay, BC": 263,
    "North Okanagan Shuswap, BC": 450, "Peace Liard, BC": 0, "Kelowna, BC": 52, "Moose Jaw, SK": 147,
    "Claresholm, AB": 23, "Steinbach, MB": 42, "Altona/Rhineland, MB": 23, "Brandon, MB": 39,
    "St. Pierre Jolys, MB": 6, "Pictou County, NS": 60, "Acadian Peninsula, NB": 32,
}
MIN_OCC = 10   # 各社区职业清单都是 ~25 条量级


def load_prev(path: Path) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    if path.exists():
        for r in json.loads(path.read_text(encoding="utf-8")).get("rows", []):
            out.setdefault(r.get("community", ""), []).append(r)
    return out


def main() -> None:
    comms = {r["name"]: r for r in json.loads(IN_COMMUNITIES.read_text(encoding="utf-8"))["rows"]}
    prev_emp, prev_occ = load_prev(OUT_EMP), load_prev(OUT_OCC)
    emp_rows: list[dict] = []
    occ_rows: list[dict] = []
    kept, refreshed = [], []
    # 同名社区双类型(Sudbury/Timmins 各有 RCIP+FCIP 两行)→ 只跑一次抽取
    for name in dict.fromkeys(comms):
        c = comms[name]
        prov = c["province"]
        ctype = "RCIP+FCIP" if sum(1 for r in comms.values() if r["name"] == name) > 1 else c["type"]
        fn = EXTRACTORS.get(name)
        got = None
        if fn is not None:
            try:
                got = fn()
            except Exception as e:  # noqa: BLE001  单社区源挂了不拖垮整轮
                print(f"! {name} 抽取异常({type(e).__name__}: {str(e)[:80]})—— 保旧", flush=True)
        base = BASELINE_EMP.get(name, 0)
        n_emp = len((got or {}).get("employers") or [])
        n_occ = len((got or {}).get("occupations") or [])
        emp_ok = got is not None and (n_emp > 0 if base == 0 else n_emp >= base / 2)
        occ_ok = got is not None and n_occ >= MIN_OCC
        if emp_ok:
            for r in got["employers"]:
                nm = " ".join(str(r.get("name", "")).split())
                if nm:
                    emp_rows.append({"community": name, "province": prov,
                                     "type": str(r.get("type") or ctype),
                                     "name": nm, "location": str(r.get("location") or "").strip(),
                                     "url": got.get("employersUrl", "")})
        else:
            if got is not None and not (base == 0 and n_emp == 0):
                print(f"! {name} 雇主 {n_emp} 行(基线 {base})—— 疑似改版塌方,保旧", flush=True)
            emp_rows.extend(prev_emp.get(name, []))
        if occ_ok:
            for r in got["occupations"]:
                occ_rows.append({"community": name, "province": prov,
                                 "type": str(r.get("type") or ctype),
                                 "noc": str(r.get("noc") or ""), "title": " ".join(str(r.get("title", "")).split()),
                                 "sectorOnly": bool(r.get("sectorOnly")),
                                 "url": got.get("occupationsUrl", "")})
        else:
            if got is not None:
                print(f"! {name} 职业 {n_occ} 行(< {MIN_OCC})—— 疑似改版塌方,保旧", flush=True)
            occ_rows.extend(prev_occ.get(name, []))
        (refreshed if (emp_ok or occ_ok) else kept).append(name)

    today = date.today().isoformat()
    OUT_EMP.write_text(json.dumps({
        "fetched": today,
        "note": ("各社区官方公示的指定雇主名单(批C 自动刷新,pilot_extractors 逐社区抽取;塌方保旧)。"
                 "『指定』≠『在招』;excluded/de-designated 已在抽取层剔除;Peace Liard 官方待公示。"),
        "rows": emp_rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_OCC.write_text(json.dumps({
        "fetched": today,
        "note": "各社区官方优先/在收职业清单(批C 自动刷新;当前有效版)。sectorOnly=官方只给行业名。",
        "rows": occ_rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  ✓ 雇主 {len(emp_rows)} 行 · 职业 {len(occ_rows)} 行 · 刷新 {len(refreshed)} 社区"
          f"{' · 保旧 ' + '、'.join(kept) if kept else ''}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001  总控自身失败也不拦役(raw 保持原样)
        print(f"✗ build_pilot_details 异常退出({type(e).__name__}: {e})—— raw 保持原样,不拦役")
