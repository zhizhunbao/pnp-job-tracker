"""
statcan 域唯一入口(一域一门;三步全是 functions.py 的段函数直调,零步骤文件 ——
全溶域的门形,样张 etl/ee/main.py 与 etl/eligibility/main.py)。

SCHEDULED = 本域步骤真相 —— **顺序即语义,一步失败中止本轮**:
自校失败会 exit 1 的步骤一律钉在末尾(本域是 cubes:任一张表未更新就让本轮红)。
(直调后这条硬闸由 SystemExit 兑现:functions 里 scrape_statcan_cubes 走 sys.exit(1),
不被 `except Exception` 接住,进程当场退出 1。)
2026-09-06 立域:npr_share / tr_prov 两步自 ircc 域 main 的 SCHEDULED/TOOLS 搬来
(产物路径不动,仍写 raw/ircc/);cubes 是新增(把脉页省份段四张宏观表 → raw/statcan/)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:
    python etl/statcan/main.py                # 默认链(3 步)
    python etl/statcan/main.py --only cubes   # 单步调试(见 TOOLS)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from log.functions import err, say
from statcan.functions import scrape_statcan_city, scrape_statcan_cubes, scrape_statcan_npr, scrape_statcan_tr_prov

SCHEDULED = [
    ("npr_share", scrape_statcan_npr),
    ("tr_prov", scrape_statcan_tr_prov),
    ("cubes", scrape_statcan_cubes),
    ("city", scrape_statcan_city),
]
"""默认链(调度真相):按序执行,一步抛错即中止本轮。逐步说明:

  scrape_statcan_npr      NPR 占总人口比(联邦「临时人口降到 5%」目标的唯一可核验刻度)
  scrape_statcan_tr_prov  分省临时居民存量(IRCC 年末存量停在 2024 后的唯一分省刻度)

↓ 自校失败会 exit 1 的步骤钉在最后:排前面会把后面的一起拖掉。

  scrape_statcan_cubes    四张宏观表(人口 / 临时居民 / GDP / 失业率)→ raw/statcan/<pid>.json
  scrape_statcan_city     城市刻度(CSD 人口 + CMA 失业率;2026-09-11 城市段批二)→ city_macro.json
"""

TOOLS = {
    "npr_share": scrape_statcan_npr,
    "tr_prov": scrape_statcan_tr_prov,
    "cubes": scrape_statcan_cubes,
    "city": scrape_statcan_city,
}
"""全部可 --only 点名的步(与默认链同一份四步,本域没有不进链的手动件)。"""


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
