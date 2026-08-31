"""
gate 域唯一入口(一域一门;2026-08-31 批K 立域全溶,门直调函数 —— 全溶域的门形,
样张 etl/noc/main.py 与 etl/load/main.py)。

本域是**工具域**:SCHEDULED 为空(闸是给人和 hook 跑的,不进任何角色容器 ——
__init__ 无 META),全部步骤走 TOOLS 手动点名。
🔴 命中件用 sys.exit(1) 表态,SystemExit 不被门的 except Exception 捕获,**穿门**
直接成为进程退出码 —— pre-push 与 CI 靠它拦。
一律从仓库根执行:
    python etl/gate/main.py --only shape      # 形制十规自查(pre-push 这条)
    python etl/gate/main.py --only prune      # 修完存量后收紧基线(只紧不松)
    python etl/gate/main.py --only report     # 写法债报告 → reports/ruff-<时间戳>.md
    python etl/gate/main.py --only locktest   # build/jobbank 跨进程锁的真件自查
⚠ --only 是子串匹配(门形样张同款):四个键 shape/prune/report/locktest 两两无包含关系,
点名任一只命中它自己。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from gate.functions import check_shape, prune_baseline, report_ruff, run_lock_tests

SCHEDULED = []
"""默认链(调度真相):空 —— 工具域,不进定时链,全在 TOOLS。"""

TOOLS = {
    "shape": check_shape,
    "prune": prune_baseline,
    "report": report_ruff,
    "locktest": run_lock_tests,
}
"""全部可 --only 点名的步(本域只有手动件):
  shape     形制十规自查:域间 import / IN-OUT 常量 / 一域一门 / 裸 print /
            functions 方言四查 / 域文件名白名单;硬红零容忍,②③ 走基线只紧不松
  prune     修掉存量后收紧基线(拒绝在有新增违规时写盘)
  report    etl 写法债报告四段(闸视角 / 裸账统计 / 已溶区余账 / 存量区 top 30)
  locktest  Job Bank 仓锁与 build 汇装链的真件自查(6 例;原 etl/test_jobbank_lock.py)
"""


def main() -> int:
    """跑默认链(空)或 --only 点名的单步;返回进程退出码。"""
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
