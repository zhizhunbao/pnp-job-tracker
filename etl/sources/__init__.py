"""源注册表:自动发现 etl/sources/ 下的子包(每个子目录 = 一个抓取内容/角色)。

加新源 = 在此目录建 <源>/__init__.py 并定义 META —— auto_update 自动发现,无需改它。
"""
from pathlib import Path

NAMES = sorted(
    p.name for p in Path(__file__).resolve().parent.iterdir()
    if p.is_dir() and (p / "__init__.py").exists() and not p.name.startswith("_")
)
