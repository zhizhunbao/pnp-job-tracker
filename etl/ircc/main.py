"""
ircc 域入口:开放数据月更役。

一域一门(2026-08-29 Frank「每个域只有一个 main.py」):本文件是本域唯一入口,
STEPS = 本域步骤真相(顺序即语义,一步失败中止本轮 —— 语义见 etl/_steps.py 头注)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:python etl/ircc/main.py [--only 子串]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _steps
from _steps import run_steps

STEPS = [
    ["python", "etl/ircc/scrape_ircc_stats.py"],
    ["python", "etl/ircc/scrape_statcan_npr.py"],
    ["python", "etl/ircc/scrape_statcan_tr_prov.py"],
    ["python", "etl/clean/04e_difficulty.py"],  # 04e 重算难度因子(清洗横切层,消费上面三步的 raw)
    ["python", "etl/ircc/build_ircc_pgwp_rules.py"],
    ["python", "etl/ircc/build_ircc_fees.py"],   # G8:联邦段官方规费(段落定位+交叉自校硬闸;拆中介报价的原料)
]

if __name__ == "__main__":
    sys.exit(run_steps(STEPS))
