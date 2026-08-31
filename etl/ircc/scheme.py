"""
ircc 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 company/scheme.py 与 pnp/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状两档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格。
联邦产出行不上 pydantic:raw/ircc/*.json **逐格顺序即文件契约**(09 汇装、11_build_stats、
clean/04e 直接读),行构造留在 functions 的各段里按 K_ 键逐格写全,校验靠各步自校硬闸。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass


# =========================================================================
# 1. 共享词汇(自校失败的抬头 + 逐条问题)
# =========================================================================


@dataclass
class FailIn:
    """fail_keep_old() 入参:抬头 + 已排好版的逐条明细。"""

    header: str
    """抬头(哪一道闸没过)。"""

    lines: list
    """逐条明细(调用方按各自的模板排好版)。"""


# =========================================================================
# 2. IRCC 开放数据:年末存量 + PNP 登陆数 + 新发学签流量
# =========================================================================


@dataclass
class YearTotals:
    """latest_year_totals() / pnp_latest_full_year() 出参(原 (year, dict) 元组收编)。"""

    year: str
    """取到的年份。"""

    by_prov: dict
    """省码 → 人数。"""


@dataclass
class CellAtIn:
    """cell_at() 入参(原 study_flow 的内嵌 at() 出户后的载体)。"""

    row: list
    """一行原格。"""

    index: int
    """列下标(越界当 0)。"""


@dataclass
class FlowMonthsIn:
    """flow_months_of() 入参。"""

    mo_row: list
    """月份表头行。"""

    start: int
    """本年度的起始列。"""


@dataclass
class FlowGotIn:
    """flow_got_of() 入参。"""

    row: list
    """省行。"""

    months: list
    """本年度的 [(月名, 列下标)]。"""


@dataclass
class FlowYearIn:
    """flow_year_row() 入参。"""

    row: list
    """省行。"""

    start: int
    """本年度的起始列(年总计列 = start + YEAR_TOTAL_OFFSET)。"""

    got: list
    """本年度有数的 [(月名, 值)]。"""


@dataclass
class FlowTailIn:
    """flow_tail_of() 入参:收尾报数只列最近几年的 ON。"""

    flow: dict
    """省码 → 年 → 年块。"""

    years: list
    """全部年份(升序)。"""


# =========================================================================
# 3. NPR 占总人口比
# =========================================================================


@dataclass
class NprRowsIn:
    """npr_rows_of() 入参:两条序列(总人口 / NPR)。"""

    pop: dict
    """季度参考日 → 总人口。"""

    npr: dict
    """季度参考日 → 非永久居民数。"""


@dataclass
class QuartersIn:
    """quarters_to_target_of() 入参。"""

    share: float
    """最新一季的占比。"""

    per_q: float
    """每季度变化(负=在降)。"""


# =========================================================================
# 4. StatCan 分省临时居民存量
# =========================================================================


@dataclass
class MemberIds:
    """member_ids() 出参(原 (geo, typ) 元组收编)。"""

    geo: dict
    """省码 → StatCan memberId。"""

    types: dict
    """证型键 → StatCan memberId。"""


@dataclass
class CoordIn:
    """coord_of() 入参:WDS 坐标的前两维。"""

    geo: int
    """省的 memberId。"""

    typ: int
    """证型的 memberId。"""


@dataclass
class ByProvIn:
    """tr_prov_by_prov() 入参:响应块 + 成员 id(响应乱序,靠 id 反解)。"""

    blocks: list
    """WDS 响应块清单。"""

    ids: MemberIds
    """请求时用的成员 id。"""


# =========================================================================
# 5. 省移民难度因子重算(本段无形状 —— 只是一个零参包装函数)
# =========================================================================


# =========================================================================
# 6. PGWP 规则库
# =========================================================================


@dataclass
class PgwpReqIn:
    """to_pgwp_req() 入参:一条人抄的规则 + 它出处页的 URL。"""

    rule: dict
    """constants.PGWP_RULES 里的一条。"""

    url: str
    """该条 quote 出自的页。"""


# =========================================================================
# 7. 联邦段官方规费
# =========================================================================


@dataclass
class FeeRowIn:
    """fee_row() 入参:一条费用行的五格。"""

    stream: str
    """条目名。"""

    amount: int
    """金额(整数加元)。"""

    value_text: str
    """官方原文片段(已截断)。"""

    label: str
    """一句话说明。"""

    section: str
    """出处小节。"""


@dataclass
class SectionItemsIn:
    """section_items() 入参。"""

    seg: str
    """Economic immigration 一节的文本块。"""


@dataclass
class ItemsOut:
    """section_items() / bio_items() 出参:解析出的行 + 没解析到的问题。"""

    reqs: list
    """费用行。"""

    problems: list
    """自校问题(非空即保留旧表)。"""
