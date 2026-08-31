"""
mart 域唯一入口(一域一门;2026-08-31 批H 立域后同日批I 全溶 —— 六个文件(四个编号汇装件 +
grades / visa_flag 两个私件库)溶进 constants/scheme/functions 三件,本门自此**直调函数**,
不再 `from mart.build_mart import run`;门形样张 etl/pnp/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(四步逐字复刻旧 build
役册 08 → 09 → 10 → 11 的顺序):评分 → mart 主表 → 榜单 → 地区统计。
本域**不自带役**(__init__ 无 META):load 域的 build 链把本门当一步点用,整链持 Job Bank
仓锁,前后邻居(jobbank --only noc_sanity / employers)不变。
2026-08-31 批J(clean/ 退役):三个跨源清洗步归户本域,只进 TOOLS 不进 SCHEDULED ——
build 链在默认链之前先 `--only locations` / `--only salary` / `--only pilot_flag` 各点一次。
一律从仓库根执行:
    python etl/mart/main.py                  # 默认链(4 步;mart 主表约 9 分钟)
    python etl/mart/main.py --only rankings  # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from mart.functions import (
    build_mart, build_mart_rankings, build_mart_stats, clean_job_locations, clean_job_salary,
    flag_job_pilot, score_mart_jobs,
)

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
    "locations": clean_job_locations,
    "salary": clean_job_salary,
    "pilot_flag": flag_job_pilot,
}
"""全部可 --only 点名的步 = 默认链四步 + 三个跨源清洗步:

  locations   ATS/JB 同一套地点清洗(country/province/city/district/address;ATS 岗筛焦点区)
  salary      ATS/JB 同一套薪资归一(salaryAnnual / salaryText + 五道护栏)
  pilot_flag  城市×省 → pilot / pilotCommunity / pilotEmployer(RCIP/FCIP 并集)

三步 2026-08-31 批J 自 clean/04c、04d、05f 归户全溶(判据:跨源清洗不归任何单源域)。
**不进本域默认链**:它们跟的是 load 域 build 链的节奏,在评分之前由那条链逐步点名,
顺序与溶解前逐位相同(locations → salary →(aip/rcip/fcip)→ pilot_flag → jobbank noc_sanity)。

⚠ --only 是子串匹配(门形样张同款):`--only mart` 只命中 mart 本身,`--only s` 会同时
命中 score / stats / salary —— 要单点请写全名。批J 三个新键与既有四键互不误命中
(逐对核过:locations / salary / pilot_flag 既不含既有键、也不被既有键含)。
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
