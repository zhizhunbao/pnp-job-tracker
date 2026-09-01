"""
crawl 域唯一入口(一域一门;2026-08-30 全溶,门直调 functions 不再 subprocess ——
company 全溶门形)。

默认链 = 全种子探索(政策雷达,1h 一轮)+ urls 哨兵(官方 URL 活性实测,批Q);
ee_categories 是回退工具(ee 域 bs4 直解失效时的浏览器版,手动跑),不进默认链。
一律从仓库根执行:
    python etl/crawl/main.py                       # 默认链(discover 全种子)
    python etl/crawl/main.py --only ee_categories  # 回退工具
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from crawl.functions import check_official_urls, discover_all, run_ee_categories

SCHEDULED = [
    ("discover", discover_all),
    ("urls", check_official_urls),
]
"""默认链(调度真相):全种子探索 + diff 政策雷达 → urls 哨兵钉链尾(2026-08-31 批Q:
各域 constants 里的官方 URL 逐条实测,404/410/跨站跳 = 硬红扣 ping;判据见
constants.URLS_DOC —— NB 迁版三周没人发现的答案)。"""

TOOLS = {
    "discover": discover_all,
    "ee_categories": run_ee_categories,
    "urls": check_official_urls,
}
"""全部可 --only 点名的步(含回退工具)。"""


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
