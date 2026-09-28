"""
pathways 域形状(照 citations 样张:产出文件 = dataclass,字段声明序 = 落盘键序;域内接线形状(XxxIn)= dataclass,
一参令下多入参收编的口袋)。产出行本身是 functions 的 to_pathway_row 拼的 dict —— 行键是 camelCase(列对齐库表、mart 直通),
写成 dataclass 字段会撞 pep8 命名规则。

@author Frank
@time 2026-09-28 14:52:58
"""
from dataclasses import dataclass

# =========================================================================
# 1. 入口
# =========================================================================


@dataclass
class PathwaysFile:
    """产物文件形状(只有行;不带生成时刻 —— 表没变文件就一字不变,mart 与 git 都不会白动)。"""

    rows: list
    """全部通道行(PATHWAYS 顺序)。"""


@dataclass
class Tally:
    """收口行的三个数。"""

    defaults: int
    """省默认通道条数。"""

    named: int
    """挂岗位通道名的条数。"""

    closed: int
    """已关停条数。"""


# =========================================================================
# 3. 读 pnp 产物
# =========================================================================


@dataclass
class PnpFacts:
    """raw/pnp 的现值(自校拿对照表来对的那一面;全是官方原样写法)。"""

    draw_streams: set
    """抽选表里出现过的抽选组(各省抽选行 stream)。"""

    req_streams: set
    """门槛表里出现过的流(各省门槛行 stream)。"""

    quota_scopes: set
    """统计表通道级配额行的写法(streams 行 stream)。"""

    list_labels: set
    """全部职业清单的 label(含排除式与信号表)。"""

    board_labels: set
    """会给岗位挂通道名的清单 label(汇装 pnp_stream 的清单来源,判法见 functions 的 board_label_of)。"""


# =========================================================================
# 4. 自校
# =========================================================================


@dataclass
class CheckIn:
    """自校入参:对照表 + pnp 现值。"""

    table: list
    """通道对照表(PATHWAYS)。"""

    facts: PnpFacts
    """pnp 现值。"""


@dataclass
class EntryIn:
    """逐条自校入参:对照表的一段 + pnp 现值。"""

    entry: dict
    """对照表的一段(PW_*)。"""

    facts: PnpFacts
    """pnp 现值。"""


# =========================================================================
# 5. 产出行
# =========================================================================


@dataclass
class RowIn:
    """行构造器入参:对照表一段 + 它的序号。"""

    entry: dict
    """对照表的一段(PW_*)。"""

    seq: int
    """序号(PATHWAYS 顺序,从 1 起)。"""
