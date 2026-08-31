"""
mart 域唯一入口(一域一门;2026-08-31 批H 立域,**移动批**:四个编号汇装件自根迁入改名,
函数体一字未动 —— 方言全溶留后续滚动批,故本门直调步骤文件的 run(),不是全溶域那种
直调 functions.py 段函数;门形样张 etl/jobbank/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(四步逐字复刻旧 build
役册 08 → 09 → 10 → 11 的顺序):评分 → mart 主表 → 榜单 → 地区统计。
本域**不自带役**(__init__ 无 META):load 域的 build 链把本门当一步点用,整链持 Job Bank
仓锁,前后邻居(05d_noc_sanity / employers)不变。
一律从仓库根执行:
    python etl/mart/main.py                  # 默认链(4 步;09 约 9 分钟)
    python etl/mart/main.py --only rankings  # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from mart.build_mart import run as build_mart
from mart.build_mart_rankings import run as build_mart_rankings
from mart.build_mart_stats import run as build_mart_stats
from mart.score_mart_jobs import run as score_mart_jobs

SCHEDULED = [
    ("score", score_mart_jobs),
    ("mart", build_mart),
    ("rankings", build_mart_rankings),
    ("stats", build_mart_stats),
]
"""默认链(汇装真相):按序执行,一步抛错即中止本轮。四步与旧 build 役册的 08/09/10/11
四行一一对应,语义逐字沿用:

  score      NOC → TEER → 每 TEER 自己的评分表 + pnpEligible/pnpStream(processed/all-scored.json)
  mart       跨源汇装 data/mart/(一文件 = 一张 DB 表;中介过滤/去重/评分关联全在这层落定)
  rankings   E5-02 榜单(读 mart 纯聚合,跑在 mart 之后)
  stats      E5-04 省 × 大类 × 中类 预聚合 + 职业/城市/日表(同上)
"""

TOOLS = {
    "score": score_mart_jobs,
    "mart": build_mart,
    "rankings": build_mart_rankings,
    "stats": build_mart_stats,
}
"""全部可 --only 点名的步 = 默认链四步(本域无手动件)。

⚠ --only 是子串匹配(门形样张同款):`--only mart` 只命中 mart 本身,`--only s` 会同时
命中 score 与 stats —— 要单点请写全名。
"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) == 0:
            say(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})")
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    for name, fn in todo:
        say(f"→ {name}")
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            err(name, e)
            return 1
    say(f"✓ 本域 {len(todo)} 步全过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
