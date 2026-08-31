"""
ee 域唯一入口(一域一门;3 个步骤文件 2026-08-30 批C 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张 etl/company/main.py 与 etl/pnp/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**(旧 _steps.py 同款硬闸):
自校失败会 exit 1 的步骤一律钉在末尾(本域是 rules,它压根不进默认链)。
(直调后这条硬闸由 SystemExit 兑现:functions 里的 say_missing 走 sys.exit(1)、
自校抛 SystemExit(原句),都不被 `except Exception` 接住,进程当场退出 1 ——
与旧的「子进程 exit 1 即中止」逐字同义。)
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/ee/main.py                # 默认链(2 步)
    python etl/ee/main.py --only rules   # 单步调试 / 手动工具(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from ee.functions import build_ircc_ee_categories, build_ircc_ee_draws, build_ircc_ee_rules

SCHEDULED = [
    ("categories", build_ircc_ee_categories),
    ("draws", build_ircc_ee_draws),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。逐步说明:

  build_ircc_ee_categories  类别抽选职业清单(httpx 直取,解析为空则保留旧表打 ⚠)
  build_ircc_ee_draws       抽选轮次(IRCC 开放 JSON;byCategory / history / recent 三块)
"""

TOOLS = {
    "categories": build_ircc_ee_categories,
    "draws": build_ircc_ee_draws,
    "rules": build_ircc_ee_rules,
}
"""全部可 --only 点名的步(默认链 2 步 + 一个不进链的手动件)。
不进默认链的那个及其理由:
  rules  联邦 EE 官方口径三表(CRS 计分 / 资格规则 / 语言换算)。纯读 crawl 缓存不发请求,
         节奏跟着 crawl 役走;且它自校失败会 exit 1,进链就会把后面的步骤一起拖掉。
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
