"""
news 域入口:官方新闻聚合。

一域一门(2026-08-29 Frank「每个域只有一个 main.py」):本文件是本域唯一入口,
STEPS = 本域步骤真相(顺序即语义,一步失败中止本轮 —— 语义见 etl/_steps.py 头注)。
调度声明(role/interval)在本域 __init__.py 的 META;auto_update 按 role 自动发现。
一律从仓库根执行:python etl/news/main.py [--only 子串]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # etl/(上一级)有 _steps
from _steps import run_steps

STEPS = [
    ["python", "etl/news/scrape_immigration_news.py"],
]

if __name__ == "__main__":
    sys.exit(run_steps(STEPS))
