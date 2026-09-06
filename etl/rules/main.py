"""
rules 域门 —— 联邦试点申请人门槛库(AIP / RCIP / FCIP,quote-anchored)的唯一入口。

用法:
    python etl/rules/main.py                 # 默认链:aip → rcip → fcip(三份规则表逐一核引用落盘)
    python etl/rules/main.py --only rcip     # 只跑一步(--only 按子串匹配 TOOLS 键)

2026-09-06 立域:aip 步从 aip 域 main 的 SCHEDULED/TOOLS 搬来(键名 rules → aip),rcip / fcip 新增。
引用核验未过 → 保留旧表 + SystemExit(1) 中止本轮 → 报警语义与 aip 时代一字不差。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from log.functions import err, say
from rules.functions import build_aip_rules, build_fcip_rules, build_rcip_rules

SCHEDULED = [
    ("aip", build_aip_rules),
    ("rcip", build_rcip_rules),
    ("fcip", build_fcip_rules),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。三步都只读 crawl 缓存零网络开销,
crawl 役周更缓存后下一轮自动重核;引用消失只影响那一份表(前面已落盘的不回滚,后面的不跑)。"""

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
