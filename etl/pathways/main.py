"""
pathways 域唯一入口(一域一门;2026-09-28 立域,门直调函数 —— 照样张 etl/citations/main.py)。

默认链只有一步:读 raw/pnp 现值 → 拿通道对照表逐格对 → 全对上才写 processed/pathways/pathways.json。
调度声明(role/interval/ping)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
控制台强制 UTF-8(照 citations/main.py 门形):Windows 本地控制台 cp1252 打不出中文。
一律从仓库根执行:
    python etl/pathways/main.py                     # 默认链
    python etl/pathways/main.py --only pathways     # 点名单步

@author Frank
@time 2026-09-28 14:52:58
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    # pyrefly: ignore[missing-attribute] — typeshed 把 sys.stdout 标成 TextIO,运行时是 TextIOWrapper(带 reconfigure)
    sys.stdout.reconfigure(encoding="utf-8")

from log.functions import say
from door.functions import run_steps
from pathways.functions import build_pathways

SCHEDULED = [("pathways", build_pathways)]
"""默认链(调度真相):按序执行,一步失败即中止本轮(门叶 run_steps 的 fail-fast 语义;自校红走 sys.exit(1),门叶接住记失败)。"""

TOOLS = {
    "pathways": build_pathways,
}
"""全部可 --only 点名的步:
  pathways  自校通道对照表并写 processed/pathways/pathways.json
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
    return run_steps(todo)


if __name__ == "__main__":
    sys.exit(main())
