"""
ops 域入口:来源验证 + 配额公告哨兵 + 新鲜度哨兵。

一域一门(2026-08-29 Frank「每个域只有一个 main.py」):本文件是本域唯一入口,
STEPS = 本域步骤真相(顺序即语义,一步失败中止本轮 —— 语义见 etl/_steps.py 头注)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:python etl/ops/main.py [--only 子串]
手动工具走 TOOLS 通道(company 全溶门同形,2026-08-30 首件 report_ruff):
    python etl/ops/main.py --only report_ruff   # 写法债报告 → reports/ruff-<时间戳>.md
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _steps
from log.functions import err, say
from _steps import run_steps
from ops.report_ruff import run as run_report_ruff

STEPS = [
    ["python", "etl/ops/verify_field_source_pages.py"],  # 字段级来源注册表(E4-04:验证 URL+抽 title/meta)
    ["python", "etl/pnp/watch_prov_allocations.py"],  # 省提名名额公告哨兵(2026-08-14;沿革:原 ircc 役末步,月→周无害)
    # ↓ B3-1 新鲜度哨兵(2026-08-03):按 etl/source_manifest.json 逐文件核 fetched vs cadence,
    #   超期 exit 1 → 本轮记失败 → healthchecks 不 ping → 报警。钉死在最末尾:
    #   它红了不挡任何真实步骤,但让 ping 第一次证明「数据是新的」。
    ["python", "etl/ops/check_freshness.py"],
]

TOOLS = {
    "report_ruff": run_report_ruff,  # 写法债报告(每批溶解收口跑,不进定时链)
}
# 手动工具区:--only 命中 TOOLS 键时进程内直调(全溶门形);没命中落回 STEPS 跑步器。


def main() -> int:
    """--only 命中工具则直调,否则跑定时链 STEPS;返回进程退出码。"""
    args = sys.argv[1:]
    if len(args) >= 2 and args[0] == "--only":
        picked = []
        for k, f in TOOLS.items():
            if args[1] in k:
                picked.append((k, f))
        if len(picked) > 0:
            for name, fn in picked:
                say(f"→ {name}")
                try:
                    fn()
                except Exception as e:  # noqa: BLE001
                    err(name, e)
                    return 1
            say(f"✓ 工具 {len(picked)} 步全过")
            return 0
    return run_steps(STEPS)


if __name__ == "__main__":
    sys.exit(main())
