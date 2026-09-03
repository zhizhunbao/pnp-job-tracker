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
    """JSON 缩进(mart/raw 惯例 2;大表 1 省体积;compact=True 时忽略)。"""

    sort_keys: bool = False
    """键排序落盘(wages 中位表惯例:diff 稳定;默认不排 = 常规档)。"""

    compact: bool = False
    """紧凑分隔符(",", ":")零缩进(16MB 级大表:体积与 seed 速度;2026-08-30 批D 收编时补格)。"""


@dataclass
class WriteTextIn:
    """write_text() 入参(2026-09-02 立:etl 裸 Path.write_text 零重试,撞卷抖动一击即死整轮中止
    —— 45 处漂移点统一收编进同一把「原子 + 重试」伞;序列化由调用方完成,本函数只管写得上盘)。"""

    path: Path
    """落盘路径。"""

    text: str
    """待写文本(json 的 dumps、md 的拼接都在调用方做完)。"""

    encoding: str = "utf-8"
    """落盘编码(与 constants.ENC_UTF8 同值;scheme 不 import 常量,字面量自抄。
    noc TSV 带 BOM 的 utf-8-sig 是唯一非默认档)。"""

    newline: str | None = None
    """换行转换(None = 平台默认;csv/TSV 落盘传 "" 关转换)。"""
