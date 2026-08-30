"""news.scheme — news 母框架的形状(一参令 XxxIn)。

2026-08-30 立(随母框架从 fetch 迁回);SOURCE 子源契约仍是 dict(七个 scrape_* 子源
的存量形态,pydantic 化随批C news 溶解一并判)。
"""
from dataclasses import dataclass
from pathlib import Path


@dataclass
class RunIn:
    """run() 入参。"""

    sources: list[dict]
    """子源清单(SOURCE 契约 dict,见 news.functions 文件头)。"""

    out_file: Path
    """落盘路径(raw/news/news.json)。"""
