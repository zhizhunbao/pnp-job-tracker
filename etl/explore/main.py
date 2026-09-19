"""
explore 域唯一入口:雇主探索队列的后台工人(一域一门;门直调函数 —— 全溶域的门形,样张 etl/news/main.py)。

SCHEDULED = 本域步骤真相(只有一步:consume);调度声明(role/interval)在本域 __init__.py 的 META,
auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/explore/main.py                   # 默认链(explore 角色 10 分钟一轮)
    EXPLORE_LIMIT=3 python etl/explore/main.py --only consume    # 本地验收压小
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import err, say
from explore.functions import consume_queue

SCHEDULED = [("consume", consume_queue)]
"""默认链(调度真相):一步,抛错即中止本轮。"""

TOOLS = {
    "consume": consume_queue,
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
