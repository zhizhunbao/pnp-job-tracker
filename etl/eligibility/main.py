"""
eligibility 域门 —— 联邦试点申请人门槛库(AIP / RCIP / FCIP,quote-anchored)的唯一入口。

用法:
    python etl/eligibility/main.py                 # 默认链:aip → rcip → fcip(三份规则表逐一核引用落盘)
    python etl/eligibility/main.py --only rcip     # 只跑一步(--only 按子串匹配 TOOLS 键)

2026-09-06 立域:aip 步从 aip 域 main 的 SCHEDULED/TOOLS 搬来(键名 rules → aip),rcip / fcip 新增。
引用核验未过 → 保留旧表 + SystemExit(1) 中止本轮 → 报警语义与 aip 时代一字不差。

⚡ 2026-09-26 晚改判(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」「一单元一容器」):
默认链三步拆成三个调度单元(UNITS:eligibility_aip / eligibility_rcip / eligibility_fcip,一试点一单元),
一单元一容器一 ping,容器跑 `--only <单元名>`,单元内一步失败即中止(door 叶)。SCHEDULED 不再是调度真相,
只剩手动全跑;调度声明从 META 改为 __init__ 的 METAS(一单元一条)。
    python etl/eligibility/main.py --only eligibility_aip   # 跑一个单元(容器就是这么跑的)
"""
import sys
from itertools import chain
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from log.functions import say
from door.functions import run_steps
from eligibility.functions import build_aip_rules, build_fcip_rules, build_rcip_rules

UNITS = {
    "eligibility_aip": [("aip", build_aip_rules)],
    "eligibility_rcip": [("rcip", build_rcip_rules)],
    "eligibility_fcip": [("fcip", build_fcip_rules)],
}
"""调度单元(调度真相,2026-09-26 晚立;Frank「其中一个失败,其余照跑?那我怎么知道这个失败」→ 选「拆 + 每个单元配 ping」
「一单元一容器」,pnp 同批同形)。一单元 = 一个容器(SOURCE = 单元名)= 一个 healthchecks 检查项;
容器跑 `python etl/eligibility/main.py --only <单元>`,单元内按序跑、**一步失败即中止**(door 叶),哪个单元坏了哪个 ping 红。
声明(role / interval / ping)在 __init__ 的 METAS。
切法:一试点一单元 —— 三份规则表都只读 crawl 缓存、各落各的文件,互不依赖;一份引用消失只红它自己那个 ping。"""

SCHEDULED = list(chain.from_iterable(UNITS.values()))
"""默认链(不带参数跑 = 各单元的步按 UNITS 顺序拼成一串;一步失败即中止)。
2026-09-26 晚改判:容器不再跑这条链(每个容器只跑自己那个单元,见 UNITS);它只剩「手动全跑一遍」这个用途,
步序与改判前逐项相同(aip → rcip → fcip),下面原文保留 —— 只是分进了各单元。
原文:默认链(调度真相):按序执行,一步抛错即中止本轮。三步都只读 crawl 缓存零网络开销,
crawl 役周更缓存后下一轮自动重核;引用消失只影响那一份表(前面已落盘的不回滚,后面的不跑)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "aip": build_aip_rules,
    "rcip": build_rcip_rules,
    "fcip": build_fcip_rules,
}
"""全部可 --only 点名的步:
  aip    AIP 申请人门槛库 → raw/ircc/aip_rules.json(原 aip 域 rules 步,路径不变)
  rcip   RCIP 申请人门槛库 → raw/ircc/rcip_rules.json
  fcip   FCIP 申请人门槛库 → raw/ircc/fcip_rules.json
"""


def main() -> int:
    """跑默认链、点名的调度单元(UNITS,名字整名命中;容器走这条)或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        if args[1] in UNITS:
            return run_steps(UNITS[args[1]])
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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
