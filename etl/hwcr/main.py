"""
hwcr 域唯一入口(一域一门;全溶域的门形,样张 etl/dli/main.py)。

默认链两步:scrape(列表接口 → crawl → raw)→ build(raw → Lisgar 附近出租单间清单)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/hwcr/main.py                 # 默认链
    python etl/hwcr/main.py --only scrape   # 只抓
    python etl/hwcr/main.py --only build    # 只算清单(读已有 raw,不发列表请求)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from hwcr.functions import build_hwcr_lisgar_rooms, scrape_hwcr_ottawa_housing

SCHEDULED = [
    ("scrape", scrape_hwcr_ottawa_housing),
    ("build", build_hwcr_lisgar_rooms),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。"""

TOOLS = {
    "scrape": scrape_hwcr_ottawa_housing,
    "build": build_hwcr_lisgar_rooms,
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
