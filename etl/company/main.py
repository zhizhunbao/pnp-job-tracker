"""
company 域唯一入口(一域一门;步骤 2026-08-30 全溶进 functions.py,本门直调函数,
不再 subprocess —— 全溶域的门形,样张;未溶域仍走 _steps 跑步器)。

默认链只有官网富化(唯一定时步,挂 enrich 角色 6h);Kanata 三件与雇主 D 富化(2026-08-31
批J 自 clean/_enrich_company_facts.py 归户)是休眠引导/手动工具,不进默认链 ——
语义与旧役册完全一致。
一律从仓库根执行:
    python etl/company/main.py                 # 默认链(enrich)
    python etl/company/main.py --only kanata   # 手动件:kanata / folders / careers / facts
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from company.functions import (
    build_company_folders, enrich_company_facts, enrich_company_websites, scrape_company_careers,
    scrape_kanata_directory,
)

SCHEDULED = [("enrich", enrich_company_websites)]
"""默认链(调度真相):按序执行,一步抛错即中止本轮(_steps 同款语义)。"""

TOOLS = {
    "kanata": scrape_kanata_directory,
    "folders": build_company_folders,
    "careers": scrape_company_careers,
    "enrich": enrich_company_websites,
    "facts": enrich_company_facts,
}
"""全部可 --only 点名的步(含休眠引导工具)。

  facts  雇主 D 富化(行业多数派 + Wikidata 中韩别名/知名);2026-08-31 批J 自
         clean/_enrich_company_facts.py 归户全溶(判据:逐公司抓数据 = 公司域的活)。
         ⛔ Wikidata 那半边已退役(#109/#111),别再批量跑;行业那半边可手动重跑。
         **不进默认链**,与 Kanata 三件同属手动件。

⚠ --only 是子串匹配:facts 与既有四键互不误命中(逐对核过)。
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
