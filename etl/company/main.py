"""
company 域唯一入口(一域一门;步骤 2026-08-30 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张;未溶域仍走 _steps 跑步器)。

默认链只有官网富化(唯一定时步,挂 enrich 角色 6h);Kanata 三件是休眠引导工具
(要扩 ATS 地域时手动跑),不进默认链 —— 语义与旧役册完全一致。
一律从仓库根执行:
    python etl/company/main.py                 # 默认链(enrich)
    python etl/company/main.py --only kanata   # 休眠工具:kanata / folders / careers / enrich
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from functions import (
    build_company_folders, enrich_company_websites, scrape_company_careers, scrape_kanata_directory,
)

SCHEDULED = [("enrich", enrich_company_websites)]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。"""

TOOLS = {
    "kanata": scrape_kanata_directory,
    "folders": build_company_folders,
    "careers": scrape_company_careers,
    "enrich": enrich_company_websites,
}
"""全部可 --only 点名的步(含休眠引导工具)。"""


def main() -> int:
    """跑默认链或 --only 点名的单步;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = [(k, f) for k, f in TOOLS.items() if args[1] in k]
        if len(picked) == 0:
            print(f"✗ --only {args[1]} 没命中(可选:{'/'.join(TOOLS)})", flush=True)
            return 1
        todo = picked
    else:
        todo = SCHEDULED
    for name, fn in todo:
        print(f"→ {name}", flush=True)
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            print(f"✗ {name} 失败({type(e).__name__}: {e}),本域本轮中止", flush=True)
            return 1
    print(f"✓ 本域 {len(todo)} 步全过", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
