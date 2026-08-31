"""省移民难度指数(E12-07,2026-07-20 Frank 拍板 stats 卡先行)——一个关注点:难度因子一次算清。
因子:①竞争比=(学签+工签存量)÷ PNP 配额(横向可比,纯人数);②配额趋势=2026/2025-1(腰斩类硬事件压档);
③抽选活跃=近 180 天抽选次数+邀请量(仅 BC/AB/MB/ON 有官方抽选数据,缺=不出该因子);
④分数线水位=最新分在自身近 24 个月分布的分位(分制不可比红线:只跟自己比)。
档位:easy/mid/tight(前端人话「机会较多/一般/竞争激烈」);因子 <2 个 → 总档 null 只列事实。
红线:缺数留空不猜;逐因子带 source+asOf;禁概率。QC 不入(自有体系)。

Usage:  uv run python etl/ircc/main.py --only difficulty

2026-08-31 批H2 归户搬家:自 etl/clean/04e_difficulty.py 迁进 ircc 域改此名
(2026-08-31 Frank 命名令:<动词>_<域/机构>_<内容> 三节要齐,首版 build_difficulty.py 缺中间节,当场改正)。
沿革(逐条从被拆掉的包装件搬来,一条不丢):
  · 批C(2026-08-30)ircc 五步全溶时本件**留在 clean/ 没溶**,理由记的是「clean 是清洗
    横切层、跨源生效」;批H2 复验消费面推翻此判 —— 它的三个输入两个是 ircc 自己的 raw
    (statcan_tr_prov)+ pnp draws + 人工配额表,产出 difficulty.json 只有 11_build_stats
    一个消费者,不跨源生效,按「谁的数据谁管」归 ircc。
  · 随之拆掉的包装三件:ircc/functions.py 的 build_clean_difficulty(subprocess 壳)、
    ircc/constants.py 的 DIFFICULTY_SCRIPT / DIFFICULTY_FAIL_TPL,以及记「批F 把裸
    `python` 换成 sys.executable」的 DIFFICULTY_PY_RETIRED_NOTE —— 换解释器那条坑
    (uv 环境下裸 `python` 解析到基础解释器而非项目 .venv,批F 在 jobbank 域实撞
    ModuleNotFoundError;04e 只用标准库 + paths 没炸纯属侥幸)随子进程一起消失。
  · 「一步失败中止本轮」的硬闸改由本件抛出的异常兑现(门 main 捕获后 return 1),
    与旧的「子进程非零即中止」同义。
搬家批 —— 算法一字未动,只去 `__main__` 收成 run()、模块级 print 挪进 run() 首行
(保持「→ difficulty」在前、路径行在后的旧输出序);样张 etl/ats/scrape_ats_jobs.py。
"""
import json
from datetime import date, timedelta

import paths

# 2026-08-15 方案C(Frank「那就换 C 吧」):竞争比分子整体换 StatCan 常住估算口径 ——
# IRCC 年末许可表停在 2024 且高估(含已离境者),StatCan 季度估算的才是「还在境内抢名额的人」。
# temp_residents.json(IRCC)不再进本脚本;其余消费端(省弹框体量卡等)不受影响。
IN_TR = paths.IRCC / "statcan_tr_prov.json"
IN_ALLOC = paths.IRCC / "pnp_allocations.json"
IN_DRAWS = paths.PNP / "draws.json"
OUT = paths.PROCESSED / "difficulty.json"

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


def run() -> None:
    """本域步骤入口:重算九省移民难度因子 → processed/difficulty.json。

    首行的路径报数是原文件的模块级 print,搬家时挪进这里 —— 模块级会在门 import 时
    就打出来,排到「→ difficulty」之前,与旧子进程的输出序不符。
    """
    print(f"IN_TR={IN_TR}\nIN_ALLOC={IN_ALLOC}\nIN_DRAWS={IN_DRAWS}\nOUT={OUT}", flush=True)
    main()
