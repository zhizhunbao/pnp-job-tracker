"""省移民难度指数(E12-07,2026-07-20 Frank 拍板 stats 卡先行)——一个关注点:难度因子一次算清。
因子:①竞争比=(学签+工签存量)÷ PNP 配额(横向可比,纯人数);②配额趋势=2026/2025-1(腰斩类硬事件压档);
③抽选活跃=近 180 天抽选次数+邀请量(仅 BC/AB/MB/ON 有官方抽选数据,缺=不出该因子);
④分数线水位=最新分在自身近 24 个月分布的分位(分制不可比红线:只跟自己比)。
档位:easy/mid/tight(前端人话「机会较多/一般/竞争激烈」);因子 <2 个 → 总档 null 只列事实。
红线:缺数留空不猜;逐因子带 source+asOf;禁概率。QC 不入(自有体系)。
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import _paths  # noqa: E402

# 2026-08-15 方案C(Frank「那就换 C 吧」):竞争比分子整体换 StatCan 常住估算口径 ——
# IRCC 年末许可表停在 2024 且高估(含已离境者),StatCan 季度估算的才是「还在境内抢名额的人」。
# temp_residents.json(IRCC)不再进本脚本;其余消费端(省弹框体量卡等)不受影响。
IN_TR = _paths.IRCC / "statcan_tr_prov.json"
IN_ALLOC = _paths.IRCC / "pnp_allocations.json"
IN_DRAWS = _paths.PNP / "draws.json"
OUT = _paths.PROCESSED / "difficulty.json"
print(f"IN_TR={IN_TR}\nIN_ALLOC={IN_ALLOC}\nIN_DRAWS={IN_DRAWS}\nOUT={OUT}", flush=True)

PROVS = ["ON", "BC", "AB", "SK", "MB", "NS", "NB", "NL", "PE"]
# 竞争比分档阈(首跑分布:MB~12 SK~? AB~34 ON~77 BC~84 → 三档切 20/50;定案见设计文档 §4)
COMP_EASY, COMP_TIGHT = 20, 50
TODAY = date.today()


def tier_of_comp(v: float) -> str:
    return "easy" if v < COMP_EASY else "tight" if v > COMP_TIGHT else "mid"


def main() -> None:
    tr = json.loads(IN_TR.read_text(encoding="utf-8"))
    alloc = {r["prov"]: r for r in json.loads(IN_ALLOC.read_text(encoding="utf-8"))["rows"]}
    draws = json.loads(IN_DRAWS.read_text(encoding="utf-8"))["provinces"]
    by_prov = tr.get("byProv") or {}
    latest_ref = tr.get("latestRefPer") or max(q for p in by_prov.values() for q in p)
    tr_asof = latest_ref[:7]                     # 季度参考日 → 快照月(如 2026-04);前端原样显示不再拼 -12
    rows = []
    for p in PROVS:
        factors = []
        # ① 竞争比(StatCan 常住估算):访客/庇护从不计入;学签=仅学签+学工双持,工签=仅工签+学工双持
        #    (双持两列各计一次 → 公式仍=两列相加,与旧 IRCC 口径同构,用户可自行验算)
        v = (by_prov.get(p) or {}).get(latest_ref) or {}
        pool_study = (v.get("studyOnly") or 0) + (v.get("workStudy") or 0)
        pool_work = (v.get("workOnly") or 0) + (v.get("workStudy") or 0)
        pool = pool_study + pool_work
        a = alloc.get(p) or {}
        quota, qyear = (a.get("y2026"), 2026) if a.get("y2026") else (a.get("y2025"), 2025)
        comp = round(pool / quota, 1) if pool and quota else None
        if comp is not None:
            factors.append({"key": "comp", "value": comp, "pool": pool, "poolStudy": pool_study, "poolWork": pool_work,
                            "quota": quota, "quotaYear": qyear,
                            "tier": tier_of_comp(comp), "source": tr.get("source", ""), "asOf": tr_asof})
        # ② 配额趋势(两年都有才出)
        if a.get("y2026") and a.get("y2025"):
            trend = round(a["y2026"] / a["y2025"] - 1, 3)
            factors.append({"key": "quotaTrend", "value": trend, "tier": "easy" if trend >= 0 else "tight" if trend <= -0.3 else "mid",
                            "source": a.get("source", ""), "asOf": "2026"})
        # ③④ 抽选活跃 + 水位(有官方抽选数据的省才出)
        d = draws.get(p)
        if d and d.get("draws"):
            cut180 = (TODAY - timedelta(days=180)).isoformat()
            recent = [x for x in d["draws"] if (x.get("date") or "") >= cut180]
            inv = sum(x.get("invitations") or 0 for x in recent)
            factors.append({"key": "activity", "value": len(recent), "invitations": inv,
                            "tier": "easy" if len(recent) >= 8 else "tight" if len(recent) <= 2 else "mid",
                            "source": d.get("url", ""), "asOf": TODAY.isoformat()})
            cut24m = (TODAY - timedelta(days=730)).isoformat()
            scored = sorted([x for x in d["draws"] if x.get("score") is not None and (x.get("date") or "") >= cut24m], key=lambda x: x["date"])
            if len(scored) >= 6:
                latest = scored[-1]["score"]
                pct = round(sum(1 for x in scored if x["score"] <= latest) / len(scored) * 100)
                factors.append({"key": "scoreLevel", "value": pct, "latestScore": latest, "scale": d.get("scale", ""),
                                "tier": "easy" if pct < 40 else "tight" if pct > 70 else "mid",
                                "source": d.get("url", ""), "asOf": scored[-1]["date"]})
        # 合成:竞争比(全省可得的主导因子)定基档;配额腰斩(≤-30%)压到 tight;
        # 竞争比缺 → null(2026-07-20 调整:原「因子<2 不给档」会废掉 5 省,竞争比单因子即够给档,卡上显依据数)
        tier = None
        if comp is not None:
            tier = tier_of_comp(comp)
            if any(f["key"] == "quotaTrend" and f["value"] <= -0.3 for f in factors):
                tier = "tight"
        rows.append({"province": p, "tier": tier, "factors": factors})
        print(f"{p}: tier={tier} comp={comp} factors={len(factors)}", flush=True)
    OUT.write_text(json.dumps({"generated": TODAY.isoformat(), "trAsOf": tr_asof, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done → {OUT}", flush=True)


if __name__ == "__main__":
    main()
