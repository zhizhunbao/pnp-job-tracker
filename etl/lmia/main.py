"""
lmia 域唯一入口(一域一门;步骤 2026-08-30 批D 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py)。

默认链只有一步(ESDC 季度雇主表,挂 ee 角色容器月检查),语义与旧 STEPS 完全一致。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/lmia/main.py                     # 默认链(增量:已缓存季度不重下)
    python etl/lmia/main.py --only employers    # 点名单步
    LMIA_QUARTERS=12 python etl/lmia/main.py    # 扩窗到 12 季
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from lmia.functions import build_esdc_lmia_employers

SCHEDULED = [("employers", build_esdc_lmia_employers)]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "employers": build_esdc_lmia_employers,
}
"""全部可 --only 点名的步。"""


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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
