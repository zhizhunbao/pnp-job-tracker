"""
fsa 域唯一入口(一域一门;2026-08-31 批C 全溶,门直调函数 —— 全溶域的门形,
样张 etl/company/main.py)。

本域是**手动域**:SCHEDULED 为空(GeoNames 源偶尔更新才重跑;调度语义见 __init__),
唯一步骤走 TOOLS 手动点名。一律从仓库根执行:
    python etl/fsa/main.py --only districts
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from fsa.functions import build_districts
from log.functions import err, say

SCHEDULED = []
"""默认链(调度真相):空 —— 手动域,源更新才重跑,步骤在 TOOLS。"""

TOOLS = {
    "districts": build_districts,
}
"""全部可 --only 点名的步:districts = GeoNames → FSA→区维度表(04c 洗区消费)。"""


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
