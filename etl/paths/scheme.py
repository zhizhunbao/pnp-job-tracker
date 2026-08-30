"""paths.scheme — 写盘形状(一参令 XxxIn;2026-08-30 Frank 咬默认值参数后就范)。"""
from dataclasses import dataclass
from pathlib import Path


@dataclass
class WriteJsonIn:
    """write_json() 入参(indent 必填 —— 默认值参数禁,调用方表态)。"""

    path: Path
    """落盘路径。"""

    payload: object
    """待序列化对象(dict/list;序列化错误照抛,那是代码病不是环境病)。"""

    indent: int
    """JSON 缩进(mart/raw 惯例 2;大表 1 省体积)。"""
