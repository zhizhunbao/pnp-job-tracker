"""
ee 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 company/scheme.py 与 pnp/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状两档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格。
联邦产出行不上 pydantic:raw/ee/*.json **逐格顺序即文件契约**(09 汇装与引擎直接读),
行构造留在 functions 的各段里按 K_ 键逐格写全,校验靠各步自校硬闸。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass


# =========================================================================
# 1. 共享词汇(本段无形状 —— 共享的只有 today_iso / norm 两个纯函数)
# =========================================================================


# =========================================================================
# 2. 类别抽选职业清单
# =========================================================================


@dataclass
class CatMatch:
    """classify_category() 出参:类别短 key + 中文标签(没命中 = 两格空串)。"""

    key: str
    """类别短 key(join 键)。"""

    label: str
    """中文标签。"""


@dataclass
class CatBucket:
    """一个类别的收集桶。

    原脚本把去重集塞在产出 dict 的 `_seen` 临时键里,2026-08-30 批C 形状化拆开 ——
    去重集是过程状态,不该跟产出行同住一个 dict。
    """

    key: str
    """类别短 key。"""

    label: str
    """中文标签。"""

    occupations: list
    """已收的职业行(dict,键序即文件契约)。"""

    seen: set
    """已收的 NOC 码(同一类别内去重)。"""


@dataclass
class BucketFillIn:
    """fill_cat_bucket() 入参(一参令)。"""

    bucket: CatBucket
    """要往里加职业的桶。"""

    table: object
    """本类别的一张 HTML 表。"""


# =========================================================================
# 3. 抽选轮次
# =========================================================================


@dataclass
class DrawsOut:
    """collect_draws() 出参:每类别最近一次 + 每类别历次(原两个 dict 一起返回)。"""

    by_cat: dict
    """类别 key → 最近一次抽选行。"""

    history: dict
    """类别 key → 历次抽选行清单(限 HIST_PER_CAT 条且在 HIST_MONTHS 窗内)。"""


# =========================================================================
# 4. 官方口径:CRS/FSW 计分 + 语言换算 + 资格规则
# =========================================================================


@dataclass
class LoadOut:
    """load_page() 出参(原 (main, fetched) 元组收编)。"""

    main: object
    """页面的 <main> 容器(BeautifulSoup 节点)。"""

    fetched: str
    """该页真正被取回那天(crawl 轮次日期)。"""


@dataclass
class PageIn:
    """「一页 + 出处 + 取回日」三件套入参(窄表 / 语言表 / ECA 教育表共用)。"""

    main: object
    """页面的 <main> 容器。"""

    url: str
    """出处地址(逐行写进产出行)。"""

    fetched: str
    """取回日。"""


@dataclass
class GridRowsIn:
    """grid_rows() 入参:一页 + 「是不是 FSW selection factors 表」开关。

    原脚本用 `section_of=nearest_heading` 默认参数 + 一处 lambda 覆盖;
    2026-08-30 批C 一参令(禁默认值)与显式循环令(禁 lambda)后收成本开关。
    """

    page: PageIn
    """要解析的页。"""

    fsw_section: bool
    """True = section 恒 FSW/Selection factors 且恒 detail;False = 回溯标题链。"""


@dataclass
class SectionOfIn:
    """section_of() 入参:一张表 + FSW 开关。"""

    table: object
    """要判段的表。"""

    fsw_section: bool
    """见 GridRowsIn.fsw_section。"""


@dataclass
class HeadingOut:
    """nearest_heading() / section_of() 出参。"""

    letter: str
    """段字母(A–D;FSW 表恒 FSW)。"""

    label: str
    """段名。"""

    heading: str
    """本表小标题(回溯到的第一个标题)。"""

    is_detail: bool
    """是不是 breakdown 明细表。"""


@dataclass
class TableOut:
    """parse_table() 出参:一张 HTML 表拆成表头与数据行。"""

    factor: str
    """第一列表头。"""

    columns: list
    """其余列表头。"""

    body: list
    """数据行(每行一个字符串清单)。"""


@dataclass
class PreviousHeadingIn:
    """previous_heading() 入参(一参令)。"""

    table: object
    """本表节点。"""

    tag: str
    """要回溯的标题标签名。"""

    accepted: dict
    """标题白名单:原文 → 落盘值(命中才认)。"""


@dataclass
class PageCtx:
    """一页的解析上下文(规则核验与窄表解析共用)。"""

    url: str
    """出处地址。"""

    fetched: str
    """取回日。"""

    main: object
    """<main> 容器。"""

    text: str
    """归一化后的全文(引用逐字核验的比对底本)。"""


@dataclass
class LangBodyIn:
    """lang_body_of() 入参:列数齐整校验的三件。"""

    body: list
    """数据行。"""

    width: int
    """表头列数(每行都必须等宽)。"""

    table_no: int
    """官方表号(报错时点名)。"""


@dataclass
class LangCtxIn:
    """lang_ctx_of() 入参。"""

    table: object
    """语言表节点。"""

    table_no: int
    """官方表号。"""

    headers: list
    """本表表头。"""


@dataclass
class LangCtx:
    """lang_ctx_of() 出参:一张语言表的上下文三件(缺一即保留旧表)。"""

    program: str
    """项目码(FSW/FST/CEC)。"""

    test: str
    """考试全名。"""

    benchmark_header: str
    """档位列表头(CLB Level / NCLC Level)。"""


@dataclass
class ValueColsIn:
    """lang_value_cols() 入参。"""

    total: int
    """表头列数。"""

    level_idx: int
    """档位列下标(排除)。"""

    teer_idx: int
    """TEER 列下标(排除;-1 = 本表没有这列)。"""


@dataclass
class LangRowIn:
    """to_lang_row() 入参(一参令)。"""

    row: list
    """一行原格。"""

    row_no: int
    """行号。"""

    headers: list
    """表头。"""

    level_idx: int
    """档位列下标。"""

    teer_idx: int
    """TEER 列下标(-1 = 没有)。"""

    value_cols: list
    """成绩列下标清单。"""


@dataclass
class LangTableIn:
    """to_lang_table() 入参(一参令)。"""

    table_no: int
    """官方表号。"""

    table: object
    """表节点。"""

    page: PageIn
    """所属页(出处 + 取回日)。"""


@dataclass
class EcaMatch:
    """eca_table_of() 出参:ECA 教育表的定位结果。"""

    table_no: int
    """表序号(写进产出行的 table 格)。"""

    body: list
    """数据行。"""

    found: bool
    """有没有找到(没找到 = 保留旧表)。"""


@dataclass
class ReqRowIn:
    """to_req_row() 入参:一条人抄的规则 + 它出处页的上下文。"""

    rule: dict
    """constants.RULES 里的一条。"""

    page: PageCtx
    """该条 quote 出自的页。"""


@dataclass
class MissingSayIn:
    """say_missing() 入参:核验未过的抬头 + 逐条明细。"""

    header: str
    """抬头(哪一道闸没过)。"""

    rules: list
    """没命中的规则行。"""


@dataclass
class EligFetchedIn:
    """elig_fetched_of() 入参:表级 fetched 取各页最大值。"""

    eca_fetched: str
    """ECA 页的取回日。"""

    pages: dict
    """页键 → PageCtx。"""
