"""
door 叶唯一入口(基础设施叶:无 META、不进调度;门只为自测留一个 --only test)。

一律从仓库根执行:
    python etl/door/main.py --only test    # 门循环自测(一步失败即中止、返回码 1;2026-09-26 晚由「其余照跑」改判)

@author Frank
@time 2026-09-26 16:09:33
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import say
from door.functions import run_steps, run_tests

SCHEDULED = []
"""默认链(调度真相):空 —— 基础设施叶,只有自测工具。"""

TOOLS = {
    "test": run_tests,
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
