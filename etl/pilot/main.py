"""
pilot 域唯一入口(一域一门;五个步骤文件 2026-08-31 批C 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py、etl/noc/main.py)。

SCHEDULED = 本域默认链的步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
  employers  AIP 指定雇主(NL/NB/NS;PE 走 Wayback 快照)
  details    社区指定雇主/职业清单自动刷新(E6-11 批C;整步永远 exit 0 不拦役)
  quota      2026-08-15(Frank「没有竞争我怎么知道要不要选 RCIP」):RCIP 名额状态 ——
             职业满额 / 剩余名额 / 每轮上限 / 先到先得。读 crawl 缓存不外连(两个社区破例
             直连,举证见 constants.LIVE_DOC),抓不到就少几行,永远 exit 0 不拦役
communities 与 aip_rules 不进默认链:前者仍作为 build 管线步骤跑(05f 旗标依赖它,
本域不重复调度,见 __init__ docstring),后者随 crawl 缓存轮次手动重跑 —— 两者都在 TOOLS 里。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/pilot/main.py                        # 默认链(三步)
    python etl/pilot/main.py --only communities     # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from pilot.functions import (
    build_aip_rules, build_pilot_communities, build_pilot_details, build_pilot_quota,
    scrape_aip_employers,
)

SCHEDULED = [
    ("employers", scrape_aip_employers),
    ("details", build_pilot_details),
    ("quota", build_pilot_quota),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。"""

TOOLS = {
    "employers": scrape_aip_employers,
    "details": build_pilot_details,
    "quota": build_pilot_quota,
    "communities": build_pilot_communities,
    "aip_rules": build_aip_rules,
}
"""全部可 --only 点名的步(含两个不进默认链的手动件):
  employers    AIP 四省官方指定雇主名录 → raw/aip/aip-designated-employers.{json,md}
  details      18 社区指定雇主/职业清单自动刷新 → raw/pilot/pilot-{employers,occupations}.json
  quota        RCIP 社区名额状态(quote-anchored)→ raw/pilot/pilot-quota.json
  communities  RCIP/FCIP 试点社区名单 → raw/pilot/pilot-communities.json(build 管线也跑它)
  aip_rules    AIP 申请人门槛库(引用核验未过即 exit 1)→ raw/ircc/aip_rules.json
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
