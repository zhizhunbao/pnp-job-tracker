"""
ircc 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 company/scheme.py 与 pnp/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状两档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格。
联邦产出行不上 pydantic:raw/ircc/*.json **逐格顺序即文件契约**(09 汇装、11_build_stats
直接读),行构造留在 functions 的各段里按 K_ 键逐格写全,校验靠各步自校硬闸。
段编号 2026-08-31 批H2 随 functions/constants 同步前移:原段5(04e 包装,本段无形状)退役,
原段6/7 成段5/6。
2026-08-31 批I3 溶段:build_ircc_difficulty.py(批H2 归户时留的步骤文件)溶成段7,
本段的形状全是新增 —— 落盘行仍走 to_* 行构造器逐格写全(json 键只许住 to_*)。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass
from typing import Iterator, Protocol


# =========================================================================
# 1. 共享词汇(自校失败的抬头 + 逐条问题)
# =========================================================================


class SheetLike(Protocol):
    """openpyxl 工作表形 —— Protocol 自声明只真用的格(company/scheme.py 的 TagLike 先例;
    叶子律下 scheme 不 import openpyxl,裸 object 又让检查器判不动 —— 2026-08-31 批G 补形)。
    read_only 工作簿的活动表恒在,拿不到即官方 XLSX 塌方该炸;装配点 cast。"""

    def iter_rows(self, *, values_only: bool) -> Iterator[tuple]:
        """逐行,每行是各格的值元组。"""
        ...


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
# 5. PGWP 规则库
# =========================================================================


@dataclass
class PgwpReqIn:
    """to_pgwp_req() 入参:一条人抄的规则 + 它出处页的 URL。"""

    rule: dict
    """constants.PGWP_RULES 里的一条。"""

    url: str
    """该条 quote 出自的页。"""


# =========================================================================
# 6. 联邦段官方规费
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


# =========================================================================
# 7. 省移民难度指数
# =========================================================================


@dataclass
class PoolOut:
    """to_pool() 出参:一省一季度的人数池三格。

    双持两列各计一次(学签池 = 仅学签 + 学工双持,工签池 = 仅工签 + 学工双持)——
    公式仍 = 两列相加,与旧 IRCC 口径同构,用户可自行验算。访客/庇护从不计入。
    """

    study: int
    """学签池。"""

    work: int
    """工签池。"""

    total: int
    """合计(竞争比的分子)。"""


@dataclass
class QuotaOut:
    """to_quota() 出参:一省的配额取数(最新年有值优先,否则退上一年)+ 两年都有才出的趋势。"""

    value: int | None
    """配额人数(两年都空 = None,该省不出竞争比因子)。"""

    year: int
    """这个配额是哪一年的。"""

    source: str
    """配额出处(源表逐年出处住 sources 子表,行级 source 恒缺 → 原式 `a.get('source', '')`
    落的一直是空串,搬段时原样保留:改它等于改产物,不属本批)。"""

    trend: float | None
    """两年都有值才算的趋势(最新年 / 上一年 - 1);缺一年 = None,不出趋势因子。"""


@dataclass
class DrawRow:
    """一条省抽选记录(只读三格:日期 / 邀请量 / 分数线)。"""

    date: str
    """抽选日(缺格当空串,原式 `x.get('date') or ''`)。"""

    invitations: int
    """邀请量(缺格当 0,原式 `x.get('invitations') or 0`)。"""

    score: int | None
    """分数线(缺 = 该场不进水位分布)。"""


@dataclass
class ScoredDraw:
    """带分抽选(水位分位的样本:窗内 + 分数非空)。"""

    date: str
    """抽选日。"""

    score: int
    """分数线。"""


@dataclass
class CompIn:
    """comp_ratio() 入参:竞争比的分子与分母。"""

    pool: int
    """人数池。"""

    quota: int | None
    """配额。"""


@dataclass
class CompFactorIn:
    """to_comp_factor() 入参:竞争比因子行的各格。"""

    value: float
    """竞争比。"""

    pool: int
    """人数池合计。"""

    pool_study: int
    """学签池。"""

    pool_work: int
    """工签池。"""

    quota: int
    """配额。"""

    quota_year: int
    """配额年份。"""

    source: str
    """StatCan 分省存量表的来源。"""

    as_of: str
    """快照月(季度参考日截前 7 位)。"""


@dataclass
class TrendFactorIn:
    """to_trend_factor() 入参:配额趋势因子行的各格。"""

    value: float
    """趋势(最新年 / 上一年 - 1)。"""

    source: str
    """配额表出处。"""

    as_of: str
    """趋势的年份标(原脚本写死最新配额年)。"""


@dataclass
class ActivityFactorIn:
    """to_activity_factor() 入参:抽选活跃因子行的各格。"""

    value: int
    """窗内抽选次数。"""

    invitations: int
    """窗内邀请量合计。"""

    source: str
    """省抽选页地址。"""

    as_of: str
    """今天(活跃度是「截至今天回看 180 天」)。"""


@dataclass
class ScoreFactorIn:
    """to_score_factor() 入参:分数线水位因子行的各格。"""

    value: int
    """最新分在窗内分布里的分位(百分数)。"""

    latest_score: int
    """最新一场的分数线。"""

    scale: str
    """该省的分制(分制不可比红线:只跟自己比)。"""

    source: str
    """省抽选页地址。"""

    as_of: str
    """最新一场的抽选日。"""


@dataclass
class ActivityIn:
    """activity_of() 入参:一省的抽选行 + 活跃窗与今天。"""

    rows: list
    """该省全部抽选行(DrawRow)。"""

    block: dict
    """该省抽选块(取出处地址)。"""

    cut: str
    """活跃窗起始日。"""

    today_iso: str
    """今天(因子的 asOf)。"""


@dataclass
class ScoredIn:
    """scored_draws() 入参:一省的抽选行 + 水位窗起始日。"""

    rows: list
    """该省全部抽选行(DrawRow)。"""

    cut: str
    """水位窗起始日。"""


@dataclass
class ScoreLevelIn:
    """score_level_of() 入参:窗内带分抽选(已按日期升序)+ 该省抽选块。"""

    scored: list
    """带分抽选(ScoredDraw),末位 = 最新一场。"""

    block: dict
    """该省抽选块(取分制与出处地址)。"""


@dataclass
class DiffProvIn:
    """difficulty_row() 入参:重算一省难度要的全部上下文。"""

    prov: str
    """省码。"""

    by_prov: dict
    """分省临时居民存量({省码: {季度: {证型: 值}}})。"""

    latest_ref: str
    """最新季度参考日。"""

    tr_asof: str
    """快照月。"""

    tr_source: str
    """分省存量表的来源。"""

    alloc: dict
    """配额表({省码: 配额行})。"""

    draws: dict
    """省抽选表({省码: 省块})。"""

    cut_activity: str
    """活跃窗起始日(今天减 180 天)。"""

    cut_score: str
    """水位窗起始日(今天减 730 天)。"""

    today_iso: str
    """今天(活跃因子的 asOf)。"""


@dataclass
class DiffProvOut:
    """difficulty_row() 出参:落盘行 + 控制台报数要的三格(原 print 直接取局部变量)。"""

    row: dict
    """落盘的一省行。"""

    tier: str | None
    """总档(竞争比缺 → None,只列事实)。"""

    comp: float | None
    """竞争比(缺 → None)。"""

    n_factors: int
    """本省出了几个因子。"""


@dataclass
class DiffRowIn:
    """to_difficulty_row() 入参:一省行的三格。"""

    prov: str
    """省码。"""

    tier: str | None
    """总档。"""

    factors: list
    """因子行清单。"""


@dataclass
class DiffDocIn:
    """to_difficulty_doc() 入参:落盘表的三格。"""

    generated: str
    """生成日。"""

    tr_asof: str
    """分省存量的快照月(表级)。"""

    rows: list
    """九省行。"""
