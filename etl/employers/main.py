"""
employers 域唯一入口(一域一门;2026-08-30 立域,company 全溶门形)。

本域无自带役:池表由 build 役末段点名(mart 之后、upload 之前 —— 池表也要随轮上传)。
一律从仓库根执行:
    python etl/employers/main.py                # 默认链(pool)
    python etl/employers/main.py --only pool
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps
from employers.functions import build_employer_pool

SCHEDULED = [("pool", build_employer_pool)]
"""默认链:雇主池两表(全局 + 分桶)。
2026-09-26 门循环改走 door 叶 run_steps(Frank「推广」):一步失败不再中止本轮 —— 失败的步留痕,其余步照跑,有失败仍返回 1(告警照常)。
同日晚改判回一步失败即中止(Frank「其中一个失败,其余照跑?那我怎么知道这个失败」):门叶改回 fail-fast,本门一字不改;互不相干的步拆成各自的调度单元(各自容器、各自 ping)。
"""

TOOLS = {
    "pool": build_employer_pool,
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
