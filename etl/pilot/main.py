"""
pilot 域入口:AIP 指定雇主 + 社区细节 + 名额。

一域一门(2026-08-29 Frank「每个域只有一个 main.py」):本文件是本域唯一入口,
STEPS = 本域步骤真相(顺序即语义,一步失败中止本轮 —— 语义见 etl/_steps.py 头注)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:python etl/pilot/main.py [--only 子串]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _steps
from _steps import run_steps

STEPS = [
    ["python", "etl/pilot/scrape_aip_employers.py"],  # AIP 指定雇主(NL/NB/NS;PE 仍 TODO)
    ["python", "etl/pilot/build_pilot_details.py"],  # 社区指定雇主/职业清单自动刷新(E6-11 批C)
    # 2026-08-15(Frank「没有竞争我怎么知道要不要选 RCIP」):RCIP 名额状态 —— 职业满额 /
    # 剩余名额 / 每轮上限 / 先到先得。读 crawl 缓存不外连,抓不到就少几行,永远 exit 0 不拦役
    ["python", "etl/pilot/build_pilot_quota.py"],
]

if __name__ == "__main__":
    sys.exit(run_steps(STEPS))
