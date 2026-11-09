"""
opswatch 域唯一入口:运维页的探活与报警节拍(一域一门,样张 etl/indexing/main.py)。

SCHEDULED = 本域步骤真相(只有一步:tick);调度声明在本域 __init__.py 的 META。
一律从仓库根执行:
    python etl/opswatch/main.py

@author Frank
@time 2026-11-08 23:59:00
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from door.functions import run_steps
from opswatch.functions import tick_round

SCHEDULED = [("tick", tick_round)]
"""默认链:一步 tick。"""


def main() -> int:
    """跑默认链;返回进程退出码。"""
    return run_steps(SCHEDULED)


if __name__ == "__main__":
    sys.exit(main())
