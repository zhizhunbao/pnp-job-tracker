"""
minwage 域唯一入口(一域一门;一步直调 functions.py 的段函数,零步骤文件 —— 全溶域的门形,
样张 etl/statcan/main.py 与 etl/dli/main.py)。
SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**。
2026-09-13 立域(Frank「省的话 这个省的法律要求 最低工资 是有用的」):ESDC Minimum Wage Database
官方 JSON → raw/minwage/minimum_wage.json;现行档 / 省 × 年序列在 mart 段派生。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/minwage/main.py                # 默认链(1 步)
    python etl/minwage/main.py --only rates   # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from log.functions import err, say
from minwage.functions import scrape_minwage_rates

SCHEDULED = [
    ("rates", scrape_minwage_rates),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。

  scrape_minwage_rates   官方 JSON → 一般成人档逐次调整(省 × 生效日 × 时薪,1965 起)
"""

TOOLS = {
    "rates": scrape_minwage_rates,
}
"""全部可 --only 点名的步(与默认链同一份一步,本域没有不进链的手动件)。"""


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
