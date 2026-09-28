"""
pnp 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 company/scheme.py 与 load/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状两档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格。
省提名的产出行不上 pydantic:各省表结构互不相同且**逐格顺序即文件契约**(raw/pnp/*.json 直接
被 09 汇装读),行构造留在 functions 的表段里按 K_ 键逐格写全,校验靠各步自校硬闸。
import 两个洞:标准库 + 本域 constants(叶子律的域内松绑,跨域仍零)。
2026-09-26 起末段另住 ON 劳动力优先表守望的自测用例集(unittest 要求以 TestCase 子类交付用例 ——
「不用 class」的外部库例外,先例 gate.scheme / indexing.scheme;跑法 `python etl/pnp/main.py --only test`);
被测的 pnp.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。
2026-09-27 九省体检修复批再住三组:MbDrawTotalTest / DrawMergeTest / SkAgriStarTest(同一个 test 步跑)。
同日 Frank 拍板「看得出才改判」再住一组:EmployerSectorTablesTest(雇主行业条件与带星号码如实记进表)。
"""
import json
import re
import tempfile
import unittest
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable, Iterator, Protocol
from unittest import mock

from pnp.constants import (
    FACTOR_EOI_DRAW, GQ_SKIP_TAGS, ON_WORKFORCE_URL, OP_NONE, OWP_TABLE, OWP_V_BLOCKED, OWP_V_NO_CACHE,
    OWP_V_NO_QUOTE, OWP_V_OK, SKR_DIRECT_STREAM, SKR_DIRECT_URL,
)
from pnp.constants import (  # 2026-09-27 九省体检修复批的三组自测用
    DRAWS_ON_INV_URL, K_SECTOR_QUOTE, SK_AGRI_SECTOR_QUOTE, SK_NOC_PATTERNS, SK_STREAMS,
)
from pnp.constants import SK_AGRI_SECTOR  # 2026-09-27 Frank 拍板「看得出才改判」(SK 农业带星号码标行业键)


class SoupNodeLike(Protocol):
    """bs4 标签节点形 —— Protocol 自声明只真用的格(company/scheme.py 的 TagLike、
    ee/scheme.py 的 SoupNodeLike 先例;叶子律下 scheme 不 import bs4,裸 object 又让
    检查器判不动 —— 2026-08-31 Frank IDE 实拍 missing-attribute 后补形)。
    find/find_previous 声明为非可选:这是本域的用法主张(找不到即炸=解析塌方该炸),
    不是 bs4 的全量真相;方法签名库定死,一参令例外。"""

    name: str
    """标签名(判 <p>/<ul>/<table> 用)。"""

    def __call__(self, *args: object, **kwargs: object) -> "list[SoupNodeLike]":
        """soup(名字清单) = find_all 的简写(清场那步就这么写的)。"""
        ...

    def find_all(self, *args: object, **kwargs: object) -> "list[SoupNodeLike]":
        """按标签名收后代清单。"""
        ...

    def find(self, *args: object, **kwargs: object) -> "SoupNodeLike":
        """第一个命中的后代。"""
        ...

    def find_previous(self, *args: object, **kwargs: object) -> "SoupNodeLike":
        """文档序向前第一个命中(表格找它上方最近的标题用)。"""
        ...

    def find_next(self, *args: object, **kwargs: object) -> "SoupNodeLike":
        """文档序向后第一个命中(QC 折叠块标题找它的正文、NS 小标题找它下方的列表用;2026-09-26)。"""
        ...

    def get_text(self, *args: object, **kwargs: object) -> str:
        """压平文本。"""
        ...

    def get(self, *args: object, **kwargs: object) -> str | None:
        """取属性值(本域只取 rowspan/colspan 这类单值属性,缺席 = None)。"""
        ...

    def __getitem__(self, key: str) -> str:
        """按属性名直取(本域只取 href,单值;多值属性 bs4 会给清单,本域不碰)。"""
        ...

    def decompose(self) -> None:
        """就地拆掉该节点(清场用)。"""
        ...

    def replace_with(self, *args: object, **kwargs: object) -> object:
        """就地换成别的内容(<br> 换成换行符用)。"""
        ...


class PdfTableLike(Protocol):
    """pymupdf 表格对象形 —— 本域只用它交回稀疏格矩阵。"""

    def extract(self) -> list:
        """一张表 → 逐行的格清单(空格是 None)。"""
        ...


class PdfTablesLike(Protocol):
    """pymupdf TableFinder 形 —— 本域只取 tables 一格。"""

    tables: list[PdfTableLike]
    """该页找到的表清单。"""


class PdfPageLike(Protocol):
    """pymupdf 页对象形(只真用的两格;find_tables 声明为非可选,同 SoupNodeLike 的用法主张)。"""

    def get_text(self, *args: object, **kwargs: object) -> str:
        """整页文本。"""
        ...

    def find_tables(self, *args: object, **kwargs: object) -> PdfTablesLike:
        """该页的表格查找器。"""
        ...


class PdfDocLike(Protocol):
    """pymupdf 文档形 —— 本域只逐页遍历。"""

    def __iter__(self) -> Iterator[PdfPageLike]:
        """逐页。"""
        ...


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格(抽选名意译那一步)。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错。"""
        ...

    def json(self) -> dict:
        """响应体 JSON。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:只有 post(company/scheme.py HttpClientLike 先例)。

    Pyrefly 对 Protocol 实参判定保守,不认 httpx.Client 的结构等价 ——
    装配点用 typing.cast 喂真客户端(断言只住装配点)。
    """

    def post(self, url: str, *, json: dict, timeout: float) -> HttpResponseLike:
        """POST 一个 URL(本地 Ollama /api/generate)。"""
        ...


ParseDrawsFn = Callable[[str], list]
"""省抽选解析器形(HTML 一进、抽选行清单一出;build_draws 的 BC/AB/MB/NL 四省共用调度)。"""


@dataclass
class FetchHtmlIn:
    """fetch_html() 入参(一参令)。"""

    url: str
    """要取的页面。"""

    timeout_s: int
    """超时秒数(各步原值照搬,不统一 —— 页面大小差异是事实)。"""


@dataclass
class TextOfHtmlIn:
    """text_of_html() 入参 —— 六份 page_text 抄本收拢后的差异开关(2026-08-30 批B)。"""

    html: str
    """页面原文。"""

    drop_junk: bool
    """先拆 script/style/nav/header/footer 再取文(nl_req/mb_req/on_stats 三处原有的一步)。"""

    main_only: bool
    """只取 <main> 容器(找不到退回整篇);False = 整篇(mb_req/sk_points 一族原样)。"""


@dataclass
class PageTextIn:
    """page_text() 入参(取页 + 抽文一步到位)。"""

    url: str
    """页地址。"""

    timeout_s: int
    """超时秒数。"""

    drop_junk: bool
    """见 TextOfHtmlIn.drop_junk。"""

    main_only: bool
    """见 TextOfHtmlIn.main_only。"""

    cache_first: bool = False
    """True = 先查 crawl 缓存(每小时一轮的整站爬),没有才发请求 —— 同一页不抓两遍。"""


@dataclass
class FailIn:
    """fail_keep_old() 入参:自校未过时的报数形。"""

    problems: list
    """问题清单(逐条一行)。"""

    header: str
    """抬头句(中文档 PRINT_SELFCHECK_FAIL / NL 分值表用英文档)。"""

    bullet: str
    """每条问题的前缀(中文档三空格 + 短横;NL 档单空格 + 短横)。"""


@dataclass
class ReqIn:
    """一行门槛的入参(七省 req(**kw) 抄本的收编形,2026-08-30 批B)。

    ⚠ **各省的 base 键集不同、且顺序即文件契约** —— 所以收的是入参不是出参:
    七个 to_*_req 各自按本省的键序写全,空串/None 表示「本行没表态」,由 to_* 兜省级缺省
    (stream/url/subject/op 各省不同)。
    """

    factor: str
    """门槛因素(language/experience/empYears/…);每省的 base 里都没有它,故落在键序末尾。"""

    stream: str = ""
    """通道名;空串 = 用本省 base 的默认通道。"""

    subject: str = ""
    """判定对象;空串 = applicant。"""

    op: str = ""
    """比较符;空串 = >=(none 表示「本档不设成绩门槛」,是断言不是缺失)。"""

    value: int | None = None
    """阈值;None = 本行不是数值门槛。"""

    value_text: str = ""
    """阈值的文字形(数值表达不了时用;现存七省全空,格子留着是文件契约)。"""

    unit: str = ""
    """单位(CLB/months/years/employees/CAD-yr…)。"""

    applies_teer: list | str | None = None
    """适用 TEER;None = 用本省 base 的空档(BC/AB/NS/NL/MB 是空列表,ON 是空串)。"""

    applies_noc: str = ""
    """适用 NOC(最具体的那行胜出)。"""

    excludes_noc: str = ""
    """排除的 NOC 大组。"""

    applies_area: str = ""
    """适用区域(大温/GTA/圣约翰斯区…)。"""

    applies_condition: str = ""
    """条件行标记(ab-local-experience / grad-other-province / recent-on-graduate)。"""

    family_size: int | None = None
    """家庭人数(只有 BC 的最低收入表分档)。"""

    basis: str = ""
    """口径隔离标记(employerTenure / occMedian / windowMonths=N)。"""

    label: str = ""
    """官方原文或按原文写的一句话(报告里每句都能点回官方页)。"""

    section: str = ""
    """出处节名/节号。"""

    url: str = ""
    """本行出处页;空串 = 用本省 base 的默认出处。"""


@dataclass
class SelfCheckIn:
    """count_factor() 入参:按 factor 数门槛条数(收尾报数用)。"""

    reqs: list
    """门槛行清单。"""

    factor: str
    """要数的因素名。"""


@dataclass
class FactorCountsIn:
    """say_factor_counts() 入参:门槛步收尾按因素报条数。"""

    reqs: list
    """门槛行清单。"""

    order: tuple
    """要报的因素顺序(各省自己的 *_FACTOR_ORDER)。"""

    tpl: str
    """报数模板(12 字档 / 15 字档)。"""


@dataclass
class CellsOut:
    """cells_of() 出参(原 `return label, pts` 元组;BC SIRS 稀疏格一行)。"""

    label: str
    """标签(第一个非空格)。"""

    points: int | None
    """分值(最后一个纯数字格);None = 这行没有分。"""


@dataclass
class ProvinceDrawsIn:
    """province_draws() 入参:一省抽选的抓取 + 解析 + 兜底(原 build(prov,url,parse,…) 六参)。"""

    prov: str
    """省码。"""

    url: str
    """官方抽选页。"""

    parse: ParseDrawsFn
    """本省的解析器。"""

    scale: str | None
    """省自评分制名(None = 官方不发分数线,前端不得凭空造一列)。"""

    label: str
    """前端显示的通道族名。"""


@dataclass
class PutDrawsIn:
    """put_prov_draws() 入参:一省抽选单元的落盘(2026-09-26 晚按省拆;并回本省历史 → draws-<省>.json)。"""

    prov: str
    """省码(文件名取它的小写)。"""

    block: dict
    """本轮建好的省块(label / scale / url / draws,ON 另有 notice);走到落盘的都是全部官方页成功的。"""


@dataclass
class MergeDrawsIn:
    """merge_draws() 入参:本轮解析结果并回历史(抽选是只增不减的历史)。"""

    prov: str
    """省码(报数用)。"""

    new: list
    """本轮解析到的抽选行。"""

    old: dict
    """上一轮的 provinces 块。"""


@dataclass
class DrawCoverIn:
    """is_draw_covered() 入参:一条旧抽选行 + 本轮解析到的全部行(2026-09-27 九省体检:空格被本轮填上的旧行不留两行)。"""

    old: dict
    """上一轮落盘的一条抽选行。"""

    new: list
    """本轮解析到的抽选行。"""


@dataclass
class PeDrawRowsIn:
    """pe_draw_rows() 入参:PE 表的一个邀请日 → 该日的抽选行(两类邀请各一行)。"""

    date: str
    """ISO 邀请日。"""

    row: list
    """expand_table 展开后的整行(列位见 DRAWS_PE_*_COL)。"""

    note: str
    """该轮的选择依据原文(官方 Selection Attributes 列,已截断)。"""


@dataclass
class BcProseIn:
    """bc_prose_items() 入参:BC 一个散文轮的日期小标题(2026-09-26 抽选补全)。"""

    head: SoupNodeLike
    """该轮的 h3 日期小标题节点(列项必须挂在它之下)。"""

    date: str
    """ISO 抽选日。"""


@dataclass
class QcDrawIn:
    """qc_draw_of() 入参:QC 一轮一个 stream 的折叠块 → 一行抽选(2026-09-26)。"""

    date: str
    """ISO 邀请日(两天一轮取后一天)。"""

    stream: str
    """所在 stream 段的标题原文(「Stream 1: Highly qualified and specialized skills」)。"""

    body: str
    """折叠块正文(已折空白;不换行空格的千分位已折成普通空格)。"""


@dataclass
class CachedDrawsIn:
    """cached_draws_of() 入参:只读 crawl 缓存的一省抽选(NS / QC,2026-09-26)。"""

    prov: str
    """省码。"""

    url: str
    """官方抽选页(进 draws.json 的 url;缓存落空时报数用)。"""

    html: str | None
    """读门取回的页面原文;None = crawl 缓存里没有这页。"""

    parse: ParseDrawsFn
    """本省的解析器。"""

    scale: str | None
    """计分制名(None = 官方不发分数线)。"""

    label: str
    """前端显示的项目族名。"""


@dataclass
class OnDrawsOut:
    """parse_on() 出参(原 `return draws, notice` 元组)。"""

    draws: list
    """带「issued N invitations」的条目 → 抽选行。"""

    notice: dict | None
    """最新一条更新(有新动静一小时内自动跟上);没解析到 = None。"""


@dataclass
class MbBlock:
    """MB 一期公告里的一个「流」数据块(原 (name, laa, score) 元组)。"""

    name: str
    """子标题(整段加粗的那句)。"""

    laa: int | None
    """该段发出的 Letters of Advice to Apply 数。"""

    score: int | None
    """该段的最低分;None = 官方这段没写分。"""

    parent: str
    """上层通道(「Skilled Worker in Manitoba」这类下面紧跟子标题的标题);''=本段自己就是顶层(2026-09-24)。"""


@dataclass
class NoticeOfIn:
    """notice_of() 入参:整页里挑出同时含这几个关键词的那条通告。"""

    md: str
    """整页 md。"""

    must: tuple
    """必须同时命中的关键词。"""


@dataclass
class TenureIn:
    """swm_tenure_row() 入参:MB SWM 在职时长一行(原 build_swm 内嵌函数 tenure 出户)。"""

    m: re.Match[str]
    """官方原句的正则命中(group(1)=整句、group(2)=数词)。"""

    months_per_unit: int
    """把官方数词折成月的倍数(官方写「月」= 1,写「年」= 12)。"""

    cond: str
    """条件行标记(空串 = 一般情形;grad-other-province = 外省毕业生)。"""


@dataclass
class TenureOut:
    """swm_tenure_row() 出参(单返回值令:行与问题一起交回)。"""

    row: dict | None
    """门槛行;None = 数词认不出。"""

    problem: str
    """问题描述;空串 = 没问题。"""


@dataclass
class SwmOut:
    """build_mb_swm() 出参(原 `return rows, problems` 元组)。"""

    rows: list
    """SWM 在职时长两档 + 不计入时段三行。"""

    problems: list
    """自校问题清单。"""


@dataclass
class ProcessingOut:
    """build_bc_processing() 出参(原 `return {...}, problems` 元组)。"""

    processing: dict
    """处理时长块(自带 url/fetched/asOf,与池子不同源不同口径日)。"""

    problems: list
    """自校问题清单。"""


@dataclass
class YearPageOut:
    """fetch_on_year_page() 出参(原 `return text, url, fetched` 元组)。"""

    text: str | None
    """页面正文;None = 缓存与实抓都拿不到,或被反爬拦截。"""

    url: str
    """该年更新页地址。"""

    fetched: str
    """取回日期(缓存那轮的日期,或实抓当天);拿不到 = 空串。"""


@dataclass
class LatestIn:
    """latest_cached_year() 入参:crawl 缓存里最新的那一年。"""

    url_tpl: str
    """带 {year} 的 URL 模板。"""

    years: range
    """从新到旧的年份序(不写死,明年不静默过期)。"""


@dataclass
class LatestOut:
    """latest_cached_year() 出参(原四元组)。"""

    year: int | None
    """命中的年份;None = 一年都没有。"""

    url: str
    """该年页地址。"""

    html: str | None
    """页面原文。"""

    fetched: str
    """crawl 那轮的日期。"""


@dataclass
class ColIn:
    """col_of() 入参:表头里含该关键词的列号。"""

    rows: list
    """行矩阵(第一行是表头)。"""

    header_kw: str
    """表头关键词(大小写不敏感)。"""


@dataclass
class SectionTableIn:
    """sectioned_table_of() 入参:按官方小标题定位一张表(原 main 内嵌函数 table 出户)。"""

    tabs: list
    """[(最近一个标题文本, 行矩阵)] 清单。"""

    head_kw: str
    """小标题关键词。"""


@dataclass
class DaysIn:
    """days_of() 入参:一行里第 i 格的「N days」(原 main 内嵌函数 days 出户)。"""

    row: list
    """表格一行。"""

    index: int
    """要读的列号。"""


@dataclass
class MbPageOut:
    """fetch_mb_eoi_page() 出参(原 `return html, fetched, note` 元组)。"""

    html: str
    """页面原文。"""

    fetched: str
    """取回日期(缓存回退时如实标成缓存那轮的日期,不假装是今天抓的)。"""

    note: str
    """来路(live / cache),只进收尾报数。"""


@dataclass
class PointRow:
    """MB EOI 官方表的一行(原 (sub, label, raw) 元组)。"""

    sub: str
    """子标题(第二格为空的那种行);空串 = 没有子标题。"""

    label: str
    """档位标签,或 MAX_ALL_LABEL / MAX_SUB_LABEL 两个记号。"""

    raw: str
    """分值原文。"""


@dataclass
class SliceIn:
    """slice_between() 入参:两个锚点之间的正文片段。"""

    text: str
    """全文。"""

    start: str
    """起锚(含)。"""

    end: str
    """止锚(不含)。"""


@dataclass
class RowsByLabelsIn:
    """rows_by_labels() 入参:按给定标签序切段,各段取一个数。"""

    text: str
    """本节正文。"""

    labels: list
    """标签序(即官方档位顺序)。"""

    last_number: bool = False
    """True = 取段内最后一个数(Connection 那节的排版);默认取第一个。"""


@dataclass
class EmployerRowIn:
    """parse_nl_employer() 入参。"""

    html: str
    """雇主页原文。"""

    url: str
    """雇主页地址。"""


@dataclass
class TranslateIn:
    """qwen_translate() 入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    name: str
    """待意译的抽选通道名。"""


@dataclass
class HitsIn:
    """hits_in_text() 入参:一段纯文本里的疑似名额句。"""

    text: str
    """纯文本(HTML 已剥标签)。"""

    src_prov: str
    """来源省码(窗口里没点名省名时的归属);空串 = 不归属。"""

    want: dict
    """{省: {监视年份}}。"""


@dataclass
class BuildTableIn:
    """write_pnp_table() 入参:表落盘 + 收尾报数(各清单步共用的最后一步)。"""

    filename: str
    """raw/pnp 下的文件名。"""

    table: dict
    """整张表。"""

    line: str
    """收尾报数行(各步文案不同,已在调用处成句)。"""


@dataclass
class CountIn:
    """count_by_key() 入参:清单里某个键等于某值的条数(收尾报数用)。"""

    rows: list
    """行清单。"""

    key: str
    """要比的键。"""

    value: object
    """要比的值。"""


@dataclass
class OccRow:
    """一条「NOC + 职业名」(各省清单表的行原料;落盘时按 K_NOC/K_NAME 两格写出)。"""

    noc: str
    """五位 NOC 码。"""

    name: str
    """职业名(官方原文)。"""


@dataclass
class NbSegsOut:
    """nb_notice_segs() 出参:一条通告按官方分界句切成的两段。"""

    food: str
    """分界句之前 = 住宿餐饮业(NAICS 72)条件性那段;空串 = 该通告没有这段。"""

    any_sector: str
    """分界句之后 = 不论行业那段。"""


@dataclass
class NocLinesIn:
    """parse_noc_lines() 入参(SK / NS 两份清单解析器收拢后的差异 = 正则表)。"""

    md: str
    """页面 md。"""

    patterns: list
    """按优先序排的职业行正则(首个命中为准)。"""


@dataclass
class SkSectorIn:
    """sk_sector_free() 入参:农业通道页去掉带星号的职业码(2026-09-27 九省体检)。
    同日 Frank 拍板「看得出才改判」:函数改名 sk_sector_marked(带星号码照收并标行业键),入参多一格 sector。"""

    md: str
    """页面 md(同 parse_noc_lines 吃的那份)。"""

    occs: list
    """parse_noc_lines 解析出的职业行(星号已剥)。"""

    quote: str
    """星号脚注原句(SK_STREAMS 那条的 sectorQuote 键)。"""

    sector: str
    """带星号码行上要记的雇主行业键(SK_STREAMS 那条的 employerSector 键;2026-09-27)。"""


@dataclass
class NbSegPickIn:
    """nb_seg_of() 入参:按 any / food 取通告的哪一段。"""

    segs: NbSegsOut
    """切好的两段。"""

    key: str
    """要取哪段(K_ANY / K_FOOD)。"""


@dataclass
class AbNocTableIn:
    """ab_noc_table_of() 入参:一页 HTML + 目标表表头判词。"""

    html: str
    """页原文。"""

    head_kw: str
    """目标表首行要含的判词(小写)。"""


@dataclass
class MbDrawIn:
    """mb_draw_of() 入参:一期公告里的一段数据块。"""

    date: str
    """抽选日(ISO)。"""

    num: str
    """期号。"""

    block: "MbBlock"
    """这一段。"""


@dataclass
class AbPageIn:
    """ab_page_html() 入参:一张阿省官方页。"""

    url: str
    """页地址。"""

    title: str
    """落 crawl 缓存时的页标题。"""


@dataclass
class NbDrawIn:
    """nb_draw_of() 入参:一轮 NB 抽选的原料(最新一轮块与历史表两种表共用)。"""

    date: str
    """官网日期原文(可能是区间)。"""

    base: str
    """通道名(已去 New Brunswick 前缀与 stream 尾;AIP 折成短名;认不出为空串)。"""

    pathways: list
    """pathway 格的各行(可能一行挤着几条)。"""

    categories: list
    """职业类别格的各行(可能一行挤着几条)。"""

    inv: str
    """邀请数格原文(可能带脚注记号)。"""


@dataclass
class NbSplitIn:
    """nb_known_split() 入参:一行文字 + 官方名单。"""

    text: str
    """一行(可能几条官方名空格连写)。"""

    names: tuple
    """官方名单。"""

    canon: bool
    """切出来给名单里的规范写法(True)还是原文片段(False)。"""


@dataclass
class NbSplitLinesIn:
    """nb_split_lines() 入参:多行 + 官方名单。"""

    lines: list
    """各行。"""

    names: tuple
    """官方名单。"""

    canon: bool
    """同 NbSplitIn.canon。"""


@dataclass
class NbColIn:
    """nb_col_lines() / nb_col_text() 入参:历史表一行的格 + 列号表 + 列键。"""

    cells: list
    """这一行的格。"""

    cols: dict
    """列键 → 列号。"""

    key: str
    """要取的列键。"""


@dataclass
class NbStreamIn:
    """nb_stream_of() 入参:通道名 + pathway 清单。"""

    base: str
    """通道名(表格前最近一个居中加粗段落)。"""

    pathways: list
    """pathway 清单(可空)。"""


@dataclass
class MbBlockNameIn:
    """mb_block_name() 入参:MB 一期公告里某个数据块的命名素材。"""

    heading: str
    """最近的整段加粗子标题。"""

    desc: str
    """前面最近的普通段落原句(同一子标题下第 2 个数据块靠它区分)。"""

    count: int
    """本子标题下这是第几个带数据的 ul。"""


@dataclass
class OnColIn:
    """on_col_or() 入参:按关键词取列号,找不到用兜底列号。"""

    heads: list
    """表头(已小写)。"""

    header_kw: str
    """列名关键词。"""

    fallback: int
    """找不到时的兜底列号。"""


@dataclass
class MbIesTableIn:
    """mb_ies_table() 入参:一条路径的资格页 md + 路径名 + 出处。"""

    md: str
    """资格页转成的 markdown(表格行以 | 开头)。"""

    pathway: str
    """路径名(即通道名)。"""

    url: str
    """出处页。"""

@dataclass
class RuleRowsIn:
    """rule_rows() 入参:一页折成一行的正文 + 落到哪条通道 + 规则清单 + 本省的行构造器。"""

    to_row: Callable[[ReqIn], dict]
    """本省的 to_*_req(行的键集各省不同,由它兜)。"""

    txt: str
    """页面正文(已 fold_ws 成一行)。"""

    stream: str
    """通道名。"""

    url: str
    """出处页。"""

    section: str
    """段名。"""

    rules: tuple
    """(原句正则, factor, 单位, 标签模板, 问题句) 五元组清单。"""

@dataclass
class ReqsOut:
    """一组门槛的产出(行 + 自校问题;七省门槛步的分段拼装口)。"""

    rows: list
    """门槛行。"""

    problems: list
    """自校问题。"""


@dataclass
class AreaMapIn:
    """area_value_map() 入参:按 factor 挑出 {区域: 阈值}。"""

    reqs: list
    """门槛行清单。"""

    factor: str
    """要挑的因素。"""


@dataclass
class OnChunkIn:
    """on_points_chunk() 入参:一节正文的切段。"""

    body: str
    """Scoring factors 段全文。"""

    head_end: int
    """本节标题结束位置(从标题**之后**开始取档位)。"""

    end: int
    """下一节起点(或全文末尾)。"""

    key: str
    """本节的因素键(安省经验那节要截掉第二套阶梯)。"""


@dataclass
class SirsSectionIn:
    """sirs_section_of() 入参:一张表属于哪一节。"""

    head: str
    """表头前两行拼成的小写判词。"""

    rows: list
    """该表的 CellsOut 行(表头认不出时看有没有 work 档位行)。"""


@dataclass
class SirsCollectIn:
    """collect_sirs_tables() 入参:一张表的档位/加分就地并进四节的桶。"""

    table: PdfTableLike
    """pymupdf 表格对象。"""

    buckets: dict
    """四节的累加器({节: {rows, bonus}})。"""


@dataclass
class SirsProblemsIn:
    """sirs_problems() 入参:BC SIRS 的逐节自校素材。"""

    eff: str
    """指南生效日。"""

    designations: list
    """执业资格对照表。"""

    factors: dict
    """五节 factors 块。"""


@dataclass
class SkGroupIn:
    """sk_group_* 系列入参:某个分组的逐因素运算。"""

    factors: dict
    """全部因素。"""

    group: str
    """分组键(I / II)。"""


@dataclass
class SkPointsOut:
    """sk_collect_factors() 出参(原 factors / official 两个累加器)。"""

    factors: dict
    """逐因素分值块。"""

    official: dict
    """官方自印的 MAXIMUM 行(I / II / TOTAL)。"""


@dataclass
class SkHeadIn:
    """sk_head_problems() 入参:自校第一关的三个官方数。"""

    pass_mark: int | None
    """官方申请门槛分。"""

    group_max: dict
    """官方分组上限。"""

    max_total: int | None
    """官方总分上限。"""


@dataclass
class SkMathIn:
    """sk_math_problems() 入参:自校第二关的对账素材。"""

    factors: dict
    """逐因素分值块。"""

    group_max: dict
    """官方分组上限。"""

    max_total: int | None
    """官方总分上限。"""


@dataclass
class SkPagesIn:
    """SK 门槛两页交叉核对的入参。"""

    eo: str
    """With an Employment Offer 页正文。"""

    oid: str
    """Occupations In-Demand 页正文。"""


@dataclass
class CollectTenureIn:
    """collect_tenure() 入参:一档 SWM 在职时长的解析结果并进累加器。"""

    m: re.Match[str]
    """官方原句的正则命中。"""

    months_per_unit: int
    """官方数词折成月的倍数。"""

    cond: str
    """条件行标记。"""

    rows: list
    """门槛行累加器。"""

    problems: list
    """自校问题累加器。"""


@dataclass
class MbIdolOut:
    """mb_idol_occupations() 出参。"""

    occ: dict
    """{noc: (teer, minCLB, title)}。"""

    conflicts: int
    """两张清单给了不同 CLB 的职业数(已取高档,供人工抽查)。"""


@dataclass
class NbGuidesOut:
    """nb_read_guides() 出参:三份指南读完的结果。"""

    clbs: dict
    """{pathway 名: CLB}。"""

    versions: set
    """封面版本(YYYY-MM)集合。"""

    exp_txt: str
    """New Brunswick Experience 那份指南的正文。"""

    problems: list
    """自校问题。"""


@dataclass
class NlIgIn:
    """nl_ig_reqs() 入参:International Graduate 通道的两页正文。"""

    ig_txt: str
    """资格页正文。"""

    ig_lang_txt: str
    """语言测试页正文。"""


@dataclass
class SkGroupNameIn:
    """sk_processing_group() 入参:一行处理时长归哪一组。"""

    name: str
    """行名(类别)。"""

    head: str
    """该表表头第一格(二次复核靠它区分)。"""


@dataclass
class SkProcOut:
    """sk_processing() 出参。"""

    processing: list
    """处理时长行。"""

    quarter: str
    """季度口径(YYYYQN)。"""


@dataclass
class SkAllocOut:
    """sk_allocation() 出参。"""

    allocation: list
    """逐档配额与 YTD。"""

    problems: list
    """读不成数字的行。"""


@dataclass
class SkAllocCheckIn:
    """sk_alloc_problems() 入参。"""

    allocation: list
    """逐档配额行。"""

    total: dict | None
    """合计行。"""


@dataclass
class HasGroupIn:
    """has_group() 入参:处理时长里有没有某一组。"""

    rows: list
    """处理时长行。"""

    group: str
    """要找的组名。"""


@dataclass
class AbStatsAcc:
    """AB 运营统计一页四堆的累加器(逐表归堆的显式上下文)。"""

    summary: dict
    """总表(2026 summary)。"""

    streams: list
    """逐 stream 行。"""

    eoi_pool: list
    """EOI 池逐 stream 人数。"""

    draws: list
    """抽选史(canonical 仍归 §10,本表原样留档)。"""


@dataclass
class AbTableIn:
    """collect_ab_table() 入参。"""

    table: SoupNodeLike
    """一张表。"""

    acc: AbStatsAcc
    """四堆累加器。"""


@dataclass
class AbStreamRowIn:
    """ab_stream_row() 入参。"""

    stream: str
    """该行属于哪个 stream。"""

    vals: list
    """五格值(assessingUpTo 是文字格)。"""


@dataclass
class AbCheckIn:
    """ab_stats_problems() 入参。"""

    acc: AbStatsAcc
    """四堆累加器。"""


@dataclass
class OnYearIn:
    """ON 逐年页的解析入参。"""

    page: YearPageOut
    """该年页的正文/地址/取回日。"""

    year: int
    """页面对应的年份(出处节名用;数字本身取官方句子里写的那个)。"""


@dataclass
class OnWaybackIn:
    """fetch_on_year_wayback() 入参:官方原页与年份(快照时间戳按次年算)。"""

    url: str
    """官方逐年页 URL。"""

    year: int
    """该页对应的年份。"""


@dataclass
class YearValuesIn:
    """say_year_values() 入参:逐年数字一行。"""

    head: str
    """抬头(配额 / 已发提名数)。"""

    rows: list
    """带 year/value 的行。"""


@dataclass
class MbPlanIn:
    """mb_plan_block() 入参:月度页一张表要取哪几列。"""

    tabs: list
    """[(小标题, 行矩阵)]。"""

    head_kw: str
    """官方小标题关键词。"""

    cols: list
    """[(列关键词, scope 名)]。"""


@dataclass
class MbPlanOut:
    """mb_plan_block() 出参。"""

    block: dict
    """{section, rows};缺 Total 行时为空 dict。"""

    problems: list
    """自校问题。"""


@dataclass
class MbInventoryIn:
    """mb_inventory_block() 入参。"""

    rows: list
    """库存表行矩阵。"""

    last: list
    """最后一个有数据的月份那一行。"""

    month_name: str
    """该月的月名。"""

    year: int
    """月度页的年份。"""


@dataclass
class MbMonthlyIn:
    """mb_monthly_block() 入参。"""

    tabs: list
    """[(小标题, 行矩阵)]。"""

    year: int
    """月度页的年份。"""


@dataclass
class MbMonthlyOut:
    """mb_monthly_block() 出参。"""

    monthly: dict
    """月度块(键序即文件契约)。"""

    problems: list
    """自校问题。"""

    through_month: str
    """统计到哪个月(月名);没解析到为空串。"""


@dataclass
class MbFactorOut:
    """MB EOI 单个因子的产出。"""

    factor: dict
    """因子块;解析失败时为空 dict。"""

    problems: list
    """自校问题。"""


@dataclass
class MbSimpleIn:
    """mbp_simple_factor() 入参(Age / Work / Education 三个单表单选因子)。"""

    table: SoupNodeLike
    """该因子的表。"""

    key: str
    """因素键。"""

    bonus_kw: str
    """归 bonus 的档位判词;空串 = 没有 bonus。"""


@dataclass
class MbAdaptOut:
    """mbp_adapt_buckets() 出参。"""

    buckets: dict
    """{子块名: 档位清单}。"""

    sub_official: dict
    """{子块名: 官方 Maximum subtotal}。"""

    overall: int | None
    """整个 Adaptability 因子的官方 Maximum points。"""


@dataclass
class MbAdaptCollectIn:
    """mbp_collect_adapt() 入参:三个子块入 factors。"""

    adapt: MbAdaptOut
    """解析好的三个子块。"""

    factors: dict
    """因素累加器。"""

    adapt_max: dict
    """三个子块各自 max 的累加器(算组上限用)。"""


@dataclass
class NlpCheckIn:
    """nlp_problems() 入参。"""

    pass_mark: int | None
    """通道页现取的 pass mark。"""

    factors: dict
    """六个因素。"""


@dataclass
class NlEmployerStatsIn:
    """say_nl_employer_stats() 入参。"""

    employers: list
    """雇主行清单。"""

    skipped: list
    """跳过的雇主页地址。"""


@dataclass
class OccProbeIn:
    """occ_by_noc() 入参:清单里某个 NOC 那一行。"""

    occupations: list
    """职业清单。"""

    noc: str
    """要探的 NOC 码。"""


@dataclass
class WindowProvIn:
    """provs_in_window() 入参:命中窗口的省归属。"""

    win: str
    """命中上下文窗口。"""

    src_prov: str
    """来源省码;空串 = 不归属。"""


@dataclass
class HitSrcIn:
    """hit_with_src() 入参:一条命中挂上来源。"""

    hit: dict
    """命中行。"""

    src: str
    """来源文件/地址。"""


@dataclass
class SeenEntryIn:
    """seen_entry() 入参:state 里记一条已见命中。"""

    hit: dict
    """命中行(已带 src)。"""

    today: str
    """首次命中日期。"""


@dataclass
class OnEntryIn:
    """on_entry_of() 入参:ON 更新流里从第 i 行开头认一条更新条目。"""

    lines: list
    """整页压平后的内容行。"""

    i: int
    """当前行号。"""

    page_year: str | None
    """页面自报的年份(新格式条目不带年份;锚不到就只吃老格式,宁缺勿猜)。"""


@dataclass
class AbSectionIn:
    """AB 运营统计逐堆收集器的共享入参。"""

    rows: list
    """该表的行矩阵。"""

    head: list
    """表头(已小写)。"""

    section: str
    """该表前面最近的标题(节名)。"""

    acc: AbStatsAcc
    """四堆累加器。"""


@dataclass
class MbAnnualOut:
    """mb_annual_block() 出参。"""

    block: dict
    """年报块(处理天数 / 服务承诺 / EOI 池)。"""

    problems: list
    """自校问题。"""


@dataclass
class MbSayIn:
    """say_mb_stats() 入参:收尾报数的四行素材。"""

    monthly: dict
    """月度块。"""

    annual: dict
    """年报块。"""

    through_month: str
    """统计到哪个月(月名)。"""


@dataclass
class MbAdaptStepIn:
    """mbp_adapt_step() 入参。"""

    table: SoupNodeLike
    """Adaptability 那张表。"""

    factors: dict
    """因素累加器(三个子因素就地并入)。"""


@dataclass
class MbAdaptStepOut:
    """mbp_adapt_step() 出参。"""

    group_adapt: int | None
    """Adaptability 组上限(进 groupMax 与总分推导)。"""

    problems: list
    """自校问题。"""


@dataclass
class ScanIn:
    """扫描两个源的共享上下文(hits 是可变累加器:任务级局部对象,不是模块态)。"""

    want: dict
    """{省: {监视年份}}。"""

    watch_provs: set
    """真有监视目标的省。"""

    hits: list
    """命中累加器。"""

# =========================================================================
# 35. 金标体检(C01;2026-08-31 批D 收编)
# =========================================================================


@dataclass
class GoldCheckIn:
    """gold_check 的入参:一条体检断言。"""

    fails: list
    """本轮失败名单(原地 append;体检跑完非空则 exit 1)。"""

    name: str
    """体检名(打印用,也是失败名单里的身份)。"""

    ok: bool
    """断言结果。"""

    detail: str
    """补充说明(空串=不拼尾巴)。"""


@dataclass
class PtsIn:
    """score_row_exists 的入参:分值表里找一档。"""

    rows: list
    """MB 的 pnp_score_factors 行集。"""

    factor: str
    """因子名(age/work/education/language/risk)。"""

    points: int
    """该档分值。"""

    label_has: str
    """label 必须包含的子串(小写比对;空串=不限)。"""


# =========================================================================
# 36. 门槛取证器(2026-08-31 批D 收编)
# =========================================================================


class GateText(HTMLParser):
    """HTML → 正文抽取器(标准库 HTMLParser 垫片 —— 「不用 class」的外部库例外:
    库要求以子类回调收数据;跳 script/style/nav/footer,其余文本进 buf)。
    住 scheme 因 functions 顶层只许函数(方言律②);状态是单次 feed 的局部累积,
    每次解析新建实例,不跨调用共享。"""

    def __init__(self) -> None:
        """初始化空 buf 与跳层计数。"""
        super().__init__()
        self.buf: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        """进跳过标签则计数 +1(库定死签名,attrs 不用)。"""
        if tag in GQ_SKIP_TAGS:
            self.skip += 1

    def handle_endtag(self, tag: str) -> None:
        """出跳过标签则计数 −1。"""
        if tag in GQ_SKIP_TAGS and self.skip:
            self.skip -= 1

    def handle_data(self, data: str) -> None:
        """不在跳过层的非空文本收进 buf。"""
        if not self.skip and data.strip():
            self.buf.append(data.strip())


# =========================================================================
# 37. NS / BC 已发提名数(2026-09-08)
# =========================================================================


@dataclass
class YearRowIn:
    """to_year_row() 入参:运营统计的一条逐年数(形同 ON 的 on_issued_row 出参)。"""

    year: int
    """年份。"""

    label: str
    """官方措辞(数据集标题 / 表名 + 年)。"""

    value: int
    """提名数。"""

    section: str
    """出处小标题(数据集标题 / 报告名 + 表名)。"""

    url: str
    """出处页。"""

    fetched: str
    """抓取日。"""


@dataclass
class YearStatsIn:
    """write_year_stats() 入参:一省只有 nominationsIssued 的运营统计文件。"""

    path: Path
    """落盘处。"""

    prov: str
    """省码。"""

    source: str
    """来源名。"""

    url: str
    """来源页。"""

    note: str
    """口径注。"""

    rows: list
    """逐年已发提名行(年降序)。"""


@dataclass
class BcReportOut:
    """bc_report_of() 出参:最新一份 Statistical Report。"""

    year: int
    """报告年。"""

    url: str
    """PDF 地址。"""


@dataclass
class BcYearRowsIn:
    """bc_year_rows() 入参:表里的年 → 合计 + 出自哪份报告。"""

    by_year: dict
    """年 → Total 行提名数。"""

    report: BcReportOut
    """报告(section 与 url 用)。"""


# =========================================================================
# 38. PE 配额与已发提名(2026-09-09)
# =========================================================================


@dataclass
class PeTablesOut:
    """pe_tables_of() 出参:一份年报解析出的配额行与财年已发行。"""

    allocation: list
    """配额行(自然年,形同 to_year_row)。"""

    nominations: list
    """已发行(财年起始年,asOf 带 FY 标签)。"""


@dataclass
class PeAllocColsOut:
    """pe_alloc_cols_of() 出参:配额表的列头。"""

    years: list
    """按列序的年份(字符串)。"""

    revised: list
    """按列序的是否修订列。"""

    next_line: int
    """列头之后第一行的下标。"""


@dataclass
class PeRowsIn:
    """pe_table_rows_of() 入参:从某行起读「行名 + N 个数」直到 Total 行。"""

    lines: list
    """整页行。"""

    start: int
    """起读下标。"""

    ncols: int
    """每行几个数。"""


@dataclass
class PeAllocRowsIn:
    """pe_alloc_rows_of() 入参。"""

    lines: list
    """整页行。"""

    title: int
    """标题行下标。"""

    section: str
    """标题原文(进 section)。"""

    url: str
    """报告 URL。"""


@dataclass
class PeNomRowIn:
    """pe_nomination_row_of() 入参。"""

    lines: list
    """整页行。"""

    title: int
    """标题行下标。"""

    y1: str
    """财年起始年。"""

    y2: str
    """财年结束年两位。"""

    url: str
    """报告 URL。"""


@dataclass
class PeAllocColsIn:
    """pe_alloc_cols_of() 入参:整页行与配额表标题行下标。"""

    lines: list
    """整页行。"""

    title: int
    """标题行下标。"""


@dataclass
class PeTablesIn:
    """pe_tables_of() 入参:一份年报全文与它的 URL。"""

    text: str
    """PDF 全文。"""

    url: str
    """报告 URL(进每行出处)。"""


# =========================================================================
# 39. ON 劳动力优先表守望(2026-09-26)
# =========================================================================


@dataclass
class OwpRefreshIn:
    """owp_refreshed_of() 入参:人工表原文与缓存抓取日。"""

    text: str
    """on-workforce-priority.json 的原文(按字节解码,换行照旧)。"""

    date: str
    """crawl 缓存那轮的日期(ISO;读门没给 / 形状不对 → 不刷)。"""


class NlDrawSplitTest(unittest.TestCase):
    """NL 抽选行拆省提名份数自测(2026-09-27 Frank 勾「全年已邀请合计」):Notes 两项 / 只有一项 / 对不上 / 认不出 + 解析金标。
    全程不联网、不读仓内文件。"""

    def test_split_golden(self) -> None:
        """金标:官方 Notes 的几种写法(真页 2026 年各批原样);两项加起来等于本批总数才认,只有 AIP 一项且等于总数 = 0。"""
        from pnp import functions as fn
        cases = [("NLPNP – 61, AIP – 01", 62, 61), ("NLPNP – 41", 41, 41), ("NLPNP – 94, AIP – 46", 140, 94),
                 ("AIP – 40", 40, 0), ("NLPNP - 36", 36, 36), ("NLPNP — 17, AIP — 40", 57, 17)]
        for note, total, want in cases:
            self.assertEqual(fn.nl_pnp_invitations_of({"note": note, "invitations": total}), want, note)

    def test_split_refuses_to_guess(self) -> None:
        """对不上总数、一项都认不出、总数没公布 → None(汇装见 None 整省不出合计,不拿本批合计顶)。"""
        from pnp import functions as fn
        self.assertIsNone(fn.nl_pnp_invitations_of({"note": "NLPNP – 94, AIP – 46", "invitations": 141}))
        self.assertIsNone(fn.nl_pnp_invitations_of({"note": "NLPNP – 36", "invitations": 40}))
        self.assertIsNone(fn.nl_pnp_invitations_of({"note": "", "invitations": 10}))
        self.assertIsNone(fn.nl_pnp_invitations_of({"note": "NLPNP – 36", "invitations": None}))

    def test_parse_table_golden(self) -> None:
        """解析金标:照真页的表形(无 <th>,首行 <td> 是表头)造两行,invitations 仍是本批合计、pnpInvitations 是省提名那一份。"""
        from pnp import functions as fn
        html = ("<table><tr><td>Date Issued</td><td>Number of ITAs Issued</td><td>Notes</td></tr>"
                "<tr><td>September 18, 2026</td><td>62</td><td>NLPNP – 61, AIP – 01</td></tr>"
                "<tr><td>September 25, 2026</td><td>41</td><td>NLPNP – 41</td></tr></table>")
        got = fn.parse_nl_draws(html)
        self.assertEqual([(d["date"], d["invitations"], d["pnpInvitations"]) for d in got],
                         [("2026-09-25", 41, 41), ("2026-09-18", 62, 61)])


class OnWorkforceWatchTest(unittest.TestCase):
    """ON 劳动力优先表守望自测(2026-09-26 Frank 定守望同批):判定四态(原句在 / 原句不在 / 缓存缺失 / 拦截页)
    + 表里日期的字符串替换 + 真页真表金标。判定与替换都是纯函数,全程不联网、不写仓内文件;
    金标只读仓里的真表与 crawl 缓存里的真页(本机没有缓存就跳过)。"""

    def page_of(self, body: str) -> str:
        """造一页 ontario.ca 形的 HTML:正文在 <main> 里,外面带导航与页脚噪音。"""
        return ("<html><head><title>Ontario Workforce Priority stream | ontario.ca</title></head><body>"
                "<nav>Home Immigration Ontario Immigrant Nominee Program</nav><main>" + body + "</main>"
                "<footer>Updated: August 11, 2026</footer></body></html>")

    def table_of(self, fetched: str) -> str:
        """造一份手排版的人工表原文(两空格缩进、LF 换行,同真表的排法)。"""
        return ('{\n  "province": "ON",\n  "type": "ineligible",\n  "fetched": "' + fetched + '",\n'
                '  "note": "官方不设职业清单",\n  "occupations": []\n}\n')

    def test_quote_present(self) -> None:
        """原句在 → ok:真页的切法(分类名是链接、NOC 包 <abbr>、行内换行缩进)照认;大小写与空白变化不影响。"""
        from pnp import functions as fn
        real = ('<h2>Overview</h2><p>The Ontario Workforce Priority stream offers eligible skilled foreign workers '
                'with a qualifying job offer and work experience in any <a href="https://www.canada.ca/en/'
                'immigration-refugees-citizenship/services/immigrate-canada/find-national-occupation-code.html">'
                'National Occupational Classification</a> (<abbr>NOC</abbr>) occupation a pathway to apply to '
                'permanently live and work in Ontario.</p>')
        self.assertEqual(fn.owp_verdict_of(self.page_of(real)), OWP_V_OK)
        spaced = "<p>Work\n    experience in ANY National Occupational\tClassification ( NOC ) occupation.</p>"
        self.assertEqual(fn.owp_verdict_of(self.page_of(spaced)), OWP_V_OK)

    def test_quote_absent(self) -> None:
        """原句不在 → no-quote:改成清单式写法、只剩 TEER 字样、原句只剩半句、原句只在导航里(不在正文)都算不在。"""
        from pnp import functions as fn
        cases = [
            "<p>work experience in an eligible occupation listed below</p><ul><li>21231 Software engineers</li></ul>",
            "<p>Job offers in TEER 0, 1, 2 or 3 occupations only.</p>",
            "<p>work experience in any National Occupational Classification</p>",
            "<p>Overview of the stream.</p>",
        ]
        for body in cases:
            with self.subTest(body=body):
                self.assertEqual(fn.owp_verdict_of(self.page_of(body)), OWP_V_NO_QUOTE)
        in_nav = ("<html><body><nav>work experience in any National Occupational Classification (NOC) occupation</nav>"
                  "<main><p>Overview of the stream.</p></main></body></html>")
        self.assertEqual(fn.owp_verdict_of(in_nav), OWP_V_NO_QUOTE)

    def test_cache_missing(self) -> None:
        """缓存缺失 → no-cache:读门给 None(没爬到)与空串一个口径。"""
        from pnp import functions as fn
        self.assertEqual(fn.owp_verdict_of(None), OWP_V_NO_CACHE)
        self.assertEqual(fn.owp_verdict_of(""), OWP_V_NO_CACHE)

    def test_blocked_page(self) -> None:
        """Radware 验证壳 → blocked(不当成官方改版,也不刷)。"""
        from pnp import functions as fn
        shell = "<html><head><title>Radware Captcha Page</title></head><body><p>Please verify you are human</p></body></html>"
        self.assertEqual(fn.owp_verdict_of(shell), OWP_V_BLOCKED)

    def test_refresh_text(self) -> None:
        """日期替换:只换 fetched 那一格(其余字节一个不动);缓存日不比表里新、缓存日形状不对 → 原样;
        fetched 格不是恰好一处 → None(不动表)。"""
        from pnp import functions as fn
        table = self.table_of("2026-07-25")
        got = fn.owp_refreshed_of(OwpRefreshIn(text=table, date="2026-09-26"))
        self.assertEqual(got, self.table_of("2026-09-26"))
        for date in ("2026-07-25", "2026-07-01", "", "2026-9-26", "tomorrow"):
            with self.subTest(date=date):
                self.assertEqual(fn.owp_refreshed_of(OwpRefreshIn(text=table, date=date)), table)
        crlf = table.replace("\n", "\r\n")
        self.assertEqual(fn.owp_refreshed_of(OwpRefreshIn(text=crlf, date="2026-09-26")),
                         self.table_of("2026-09-26").replace("\n", "\r\n"))
        missing = table.replace('"fetched"', '"checked"')
        self.assertIsNone(fn.owp_refreshed_of(OwpRefreshIn(text=missing, date="2026-09-26")))
        doubled = table.replace('"occupations": []', '"occupations": [],\n  "fetched": "2026-07-25"')
        self.assertIsNone(fn.owp_refreshed_of(OwpRefreshIn(text=doubled, date="2026-09-26")))

    def test_real_page_and_table(self) -> None:
        """金标:crawl 缓存里的真流页判 ok;仓里的真表刷一个更新的日期后仍是合法 JSON,且除 fetched 外逐键不变。"""
        from pnp import functions as fn
        hit = fn.get_cached_page(ON_WORKFORCE_URL)
        if hit.html is None:
            self.skipTest("crawl 缓存里没有 ON 流页(本机未跑 crawl)")
        self.assertEqual(fn.owp_verdict_of(hit.html), OWP_V_OK)
        text = Path(OWP_TABLE).read_bytes().decode("utf-8")
        got = fn.owp_refreshed_of(OwpRefreshIn(text=text, date="2999-12-31"))
        self.assertIsNotNone(got)
        before = json.loads(text)
        after = json.loads(str(got))
        self.assertEqual(after["fetched"], "2999-12-31")
        before["fetched"] = after["fetched"]
        self.assertEqual(after, before)
        self.assertEqual(len(str(got)), len(text))


class SkDirectApplyTest(unittest.TestCase):
    """SK「持 offer 直接申请、不经 EOI 抽选」认句自测(2026-09-27,lead 派工「萨省『直接申请不抽选』事实没入库」):
    官方原句整段在 → 出一行 eoiDraw / op=none(原句原样进 valueText);措辞一变 → 不出行、记自校问题(不拿关键词凑)。
    纯函数用例不联网不读仓;金标只读 crawl 缓存里的真页(本机没有缓存就跳过)。"""

    QUOTE = ("An employment offer provides applicants with the ability to apply directly to the SINP. "
             "Applicants without employment offers must be invited to apply through the Expression of Interest system.")
    """官方原句(Connecting Family Members to Saskatchewan's Labour Market 页 Employment Offer 小节,2026-09-27 缓存原样)。"""

    def test_quote_golden(self) -> None:
        """金标:原句夹在真页前后文里 → 恰好一行,各格照 streamClosed 那一行的形;大小写变化照认。"""
        from pnp import functions as fn
        txt = ("These connections help approved applicants successfully settle in Saskatchewan as a permanent "
               "resident. Employment Offer " + self.QUOTE + " Applicants with employment offers receive 30 points "
               "on the International Skilled Worker's Points Grid .")
        got = fn.sk_direct_reqs(txt)
        self.assertEqual(got.problems, [])
        self.assertEqual(len(got.rows), 1)
        row = got.rows[0]
        self.assertEqual((row["factor"], row["op"], row["value"], row["valueText"]),
                         (FACTOR_EOI_DRAW, OP_NONE, None, self.QUOTE))
        self.assertEqual((row["stream"], row["subject"], row["url"]), (SKR_DIRECT_STREAM, "applicant", SKR_DIRECT_URL))
        self.assertEqual(len(fn.sk_direct_reqs(txt.upper()).rows), 1)

    def test_refuses_to_guess(self) -> None:
        """措辞变了(must → may、只剩前半句、只剩后半句、两句倒序)或页面空 → 不出行、恰好一条自校问题。"""
        from pnp import functions as fn
        first, second = self.QUOTE.split(". ", 1)
        cases = [self.QUOTE.replace("must be invited", "may be invited"), first + ".", second,
                 second + " " + first + ".", ""]
        for txt in cases:
            with self.subTest(txt=txt):
                got = fn.sk_direct_reqs(txt)
                self.assertEqual(got.rows, [])
                self.assertEqual(len(got.problems), 1)

    def test_real_page(self) -> None:
        """金标:crawl 缓存里的真页按入口同一种取文法(去噪、只取正文、压平空白)能认出原句。"""
        from pnp import functions as fn
        hit = fn.get_cached_page(SKR_DIRECT_URL)
        if hit.html is None:
            self.skipTest("crawl 缓存里没有 SK Connecting Family Members 页(本机未跑 crawl)")
        txt = fn.fold_ws(fn.text_of_html(TextOfHtmlIn(html=hit.html, drop_junk=True, main_only=True)))
        got = fn.sk_direct_reqs(txt)
        self.assertEqual(got.problems, [])
        self.assertEqual(got.rows[0]["valueText"], self.QUOTE)


class MbDrawTotalTest(unittest.TestCase):
    """MB 抽选公告缺「LAA issued」行时认整期总数句自测(2026-09-27 九省体检:第 272 期邀请数落空,MB 全年少 104)。
    纯函数用例照真页(抽选索引页)的切法现造,不联网不读仓;金标只读 crawl 缓存里的两期真页与月度页(本机没有缓存就跳过)。"""

    HEAD = ('<article class="post"><h2 class="entry-title"><a href="#">Expression of Interest Draw #{num}</a></h2>'
            '<div class="entry-meta"><span class="published">{date}</span></div><div class="ast-excerpt-container">'
            '<h3 class="wp-block-heading"><strong>Skilled Worker Stream</strong></h3>'
            '<p>Profiles submitted under the Skilled Worker in Manitoba pathway or the Skilled Worker Overseas pathway '
            'that declared being directly invited by the MPNP under a strategic recruitment initiative.</p>')
    """一期公告的开头(标题、日期、段标题、段说明;照 2026-06 两期真页原句)。"""

    SPLIT = ('<p>The following numbers of Letters of Advice to Apply were issued to candidates declaring receipt of an '
             'Invitation to Apply (ITA) under the strategic recruitment initiatives listed below:</p>'
             '<ul class="wp-block-list"><li>Employer Services: <strong>{a}</strong></li>'
             '<li>Ethnocultural Communities: <strong>{b}</strong></li>'
             '<li>Francophone Community: <strong>{c}</strong></li>'
             '<li>Regional Communities: <strong>{d}</strong></li>'
             '<li>Temporary Public Policy to Facilitate Work Permits for Prospective Provincial Nominee Program '
             'Candidates (TPP): <strong>{e}</strong></li></ul>')
    """五项定向分项(引导句 + 列表)。"""

    TOTAL = ('<p>Of the <strong>{n}</strong> Letters of Advice to Apply issued in this draw, <strong>{m}</strong> were '
             'issued to candidates who declared a valid Express Entry profile number and job seeker validation code.</p>')
    """整期总数句。"""

    LAA = '<ul class="wp-block-list"><li>Number of Letters of Advice to Apply issued: <strong>{n}</strong></li></ul>'
    """段内的 LAA 行(第 272 期缺的就是它)。"""

    TAIL = "</div></article>"
    """一期公告的收尾。"""

    def page_of(self, body: str) -> str:
        """把若干期公告包进一页索引页。"""
        return "<html><body><main>" + body + "</main></body></html>"

    def test_total_sentence_golden(self) -> None:
        """金标(第 272 期真页的形:没有 LAA 行、有总数句 104、分项 40 / 6 / 17 / 2 / 39):恰好一行,邀请数 104,
        通道 / 注 / 分数照老逻辑;同页第 273 期(LAA 行 124 + 总数句 124)照旧一段一行取 LAA 行,不因总数句多出一行。"""
        from pnp import functions as fn
        d272 = (self.HEAD.format(num=272, date="June 4, 2026") + self.SPLIT.format(a=40, b=6, c=17, d=2, e=39)
                + self.TOTAL.format(n=104, m=15) + self.TAIL)
        d273 = (self.HEAD.format(num=273, date="June 18, 2026") + self.LAA.format(n=124)
                + self.SPLIT.format(a=49, b=9, c=15, d=19, e=32) + self.TOTAL.format(n=124, m=22) + self.TAIL)
        got = fn.parse_mb_draws(self.page_of(d273 + d272))
        want = [("2026-06-18", "Skilled Worker Stream", "Draw #273", None, 124),
                ("2026-06-04", "Skilled Worker Stream", "Draw #272", None, 104)]
        self.assertEqual([(r["date"], r["stream"], r["note"], r["score"], r["invitations"]) for r in got], want)
        self.assertEqual(fn.mb_total_of("Of the\n1,874\nLetters of Advice to Apply issued in this draw,"), 1874)

    def test_refuses_to_guess(self) -> None:
        """没有 LAA 行也没有总数句 → 邀请数留空(不拿分项加总 40+6+17+2+39 顶);几句总数对不上 → 留空;空正文 → 留空。"""
        from pnp import functions as fn
        bare = self.HEAD.format(num=272, date="June 4, 2026") + self.SPLIT.format(a=40, b=6, c=17, d=2, e=39) + self.TAIL
        self.assertIsNone(fn.parse_mb_draws(self.page_of(bare))[0]["invitations"])
        two = (self.HEAD.format(num=272, date="June 4, 2026") + self.TOTAL.format(n=104, m=15)
               + self.TOTAL.format(n=105, m=15) + self.TAIL)
        self.assertIsNone(fn.parse_mb_draws(self.page_of(two))[0]["invitations"])
        same = (self.HEAD.format(num=272, date="June 4, 2026") + self.TOTAL.format(n=104, m=15)
                + self.TOTAL.format(n=104, m=15) + self.TAIL)
        self.assertEqual(fn.parse_mb_draws(self.page_of(same))[0]["invitations"], 104)
        self.assertIsNone(fn.mb_total_of(""))

    def test_real_pages(self) -> None:
        """金标:crawl 缓存里第 272 / 273 期的真页各解析出 104 / 124,两期之和等于官方月度页 6 月那格 SW LAAs(228)。"""
        from pnp import functions as fn
        tpl = "https://immigratemanitoba.com/2026/06/expression-of-interest-draw-{num}"
        got = {}
        for num in (272, 273):
            hit = fn.get_cached_page(tpl.format(num=num))
            if hit.html is None:
                self.skipTest("crawl 缓存里没有 MB 第 272 / 273 期公告页(本机未跑 crawl)")
            rows = fn.parse_mb_draws(hit.html)
            self.assertEqual(len(rows), 1, num)
            got[num] = rows[0]["invitations"]
        self.assertEqual(got, {272: 104, 273: 124})
        month = fn.get_cached_page("https://immigratemanitoba.com/resources/data/monthly-data-2026")
        if month.html is None:
            self.skipTest("crawl 缓存里没有 MB 2026 月度页")
        june = None
        for sec in fn.sectioned_tables(fn.mb_soup_of(month.html)):
            grid = sec[1]
            if grid and "SW LAAs" in grid[0]:
                for row in grid[1:]:
                    if row[0] == "June":
                        june = fn.int_of(row[grid[0].index("SW LAAs")])
        self.assertEqual(june, 228)
        self.assertEqual(got[272] + got[273], june)


class DrawMergeTest(unittest.TestCase):
    """抽选并回历史自测(2026-09-27 九省体检:ON 同日同流同分同人数的两个区域轮被四格键吃掉一行;MB 第 272 期修好后
    旧的空行不许留成第二行)。性质用例全程现造行,不联网不读仓;金标读 crawl 缓存里的 ON invitations 真页(没有就跳过)。"""

    SW = {"date": "2026-04-23", "stream": "Employer Job Offer: International Student stream",
          "note": "Targeted draw for Southwestern Ontario.", "score": 84, "invitations": 173}
    """ON 2026-04-23 的 Southwestern 那一轮(注截短;四格与下一行全同)。"""

    CEN = {"date": "2026-04-23", "stream": "Employer Job Offer: International Student stream",
           "note": "Targeted draw for Central Ontario (excluding GTA).", "score": 84, "invitations": 173}
    """同日同流同分同人数的 Central Ontario 那一轮(原先被吃掉的就是它)。"""

    OLDER = {"date": "2025-11-06", "stream": "Employer Job Offer: Foreign Worker stream", "note": "", "score": 55,
             "invitations": 400}
    """页面已下架的旧轮(只在历史里)。"""

    def merge(self, new: list, prev: list) -> list:
        """跑一次被测的并回(省码 ON;旧块照 draws-<省>.json 的 provinces 形)。"""
        from pnp import functions as fn
        return fn.merge_draws(MergeDrawsIn(prov="ON", new=new, old={"ON": {"draws": prev}}))

    def test_same_round_twins_kept(self) -> None:
        """本轮两行四格全同、注不同 → 两行都收;历史里已有其中一行 → 不重复。"""
        got = self.merge([self.SW, self.CEN], [])
        self.assertEqual(len(got), 2)
        got = self.merge([self.SW, self.CEN], [self.SW, self.OLDER])
        self.assertEqual(sorted(r["note"] for r in got),
                         sorted([self.SW["note"], self.CEN["note"], self.OLDER["note"]]))

    def test_cross_round_duplicates_blocked(self) -> None:
        """跨轮语义不变:历史与本轮同一行只留一行;本轮没有的旧轮照留;逐格全同的重复(本轮内、历史内)只留一行;
        四格键相同的旧行照旧被本轮挡掉(本轮的注改了写法也不重复)。"""
        self.assertEqual(self.merge([self.SW], [self.SW]), [self.SW])
        self.assertEqual(len(self.merge([self.SW, self.SW], [self.OLDER, self.OLDER])), 2)
        renamed = dict(self.SW)
        renamed["note"] = "Targeted draw for Southwestern Ontario. Please refer to the OINP Program Updates page."
        self.assertEqual(self.merge([renamed], [self.SW]), [renamed])

    def test_history_twins_survive(self) -> None:
        """历史里两行四格全同、注不同,本轮页面上都没了(下架) → 两行都留(不在历史里再吃一次)。"""
        got = self.merge([self.OLDER], [self.SW, self.CEN])
        self.assertEqual(len(got), 3)

    def test_filled_cell_supersedes_old(self) -> None:
        """旧行空着的格本轮填上了(MB 第 272 期:邀请数 None → 104)→ 只留本轮那行;旧行有值的格与本轮不同(注不同、
        人数不同)→ 是另一轮,照留。"""
        old: dict = {"date": "2026-06-04", "stream": "Skilled Worker Stream", "note": "Draw #272", "score": None,
                     "invitations": None}
        new: dict = dict(old)
        new["invitations"] = 104
        self.assertEqual(self.merge([new], [old]), [new])
        other: dict = dict(old)
        other["note"] = "Draw #271"
        self.assertEqual(len(self.merge([new], [other])), 2)
        counted: dict = dict(new)
        counted["invitations"] = 96
        self.assertEqual(len(self.merge([new], [counted])), 2)

    def test_real_on_page(self) -> None:
        """金标:crawl 缓存里的 ON invitations 真页,2026-01-01 至 2026-09-27(核对当日)共 55 行、合计 13,278 份(官方表
        逐行加总);并回空历史后 55 行全在,其中 2026-04-23 International Student 流 84 分 173 份的有两行(Southwestern、
        Central Ontario)。只数到核对当日:之后官方每发一轮,页上多一行,金标不跟着动;页上已不列那两行(归档)就跳过。"""
        from pnp import functions as fn
        hit = fn.get_cached_page(DRAWS_ON_INV_URL)
        if hit.html is None:
            self.skipTest("crawl 缓存里没有 ON invitations 页(本机未跑 crawl)")
        rows = self.merge(fn.parse_on_draws(hit.html), [])
        y2026 = []
        for r in rows:
            if "2026-01-01" <= r["date"] <= "2026-09-27":
                y2026.append(r)
        seen_twin_day = False
        for r in y2026:
            if r["date"] == self.SW["date"]:
                seen_twin_day = True
        if seen_twin_day is False:
            self.skipTest("ON invitations 页上已不列 2026-04-23 那一轮(归档)")
        self.assertEqual(len(y2026), 55)
        total = 0
        twins = 0
        for r in y2026:
            total += r["invitations"]
            if (r["date"], r["stream"], r["score"], r["invitations"]) == (self.SW["date"], self.SW["stream"], 84, 173):
                twins += 1
        self.assertEqual(total, 13278)
        self.assertEqual(twins, 2)


class SkAgriStarTest(unittest.TestCase):
    """SK 农业通道带星号职业码不收自测(2026-09-27 九省体检:星号 = 担保雇主须属 NAICS 11 / 311 / 33311 / 411 / 49313,
    本站判不了,照 AB_TOURISM_GENERIC 先例不收)。纯函数用例现造 md(照真页 md 的表格行写法),金标读 crawl 缓存里的真页;
    变异探针改的是官方页上的星号(本站的「表」就是星号本身)。
    2026-09-27 Frank 拍板「看得出才改判」:带星号码改为照收并在行上标 employerSector(sk_sector_marked)—— 下面「留下的码」
    改读「不带行业条件的码」,原金标一格不变;另断言带星号码一个不少地在表里、都标了 SK_AGRI_SECTOR。"""

    KEPT = {"84120", "85100", "85101", "85103"}
    """手写金标:2026-09-27 真页上不带星号的四个码(畜牧 / 牲畜 / 收割 / 苗圃温室)。"""

    STARRED = {"14401", "75101", "94140", "94141", "94143", "94204", "95106"}
    """手写金标:同日真页上带星号的七个码(仓管、搬运、食品加工三码、机械装配、食品加工普工)。"""

    MD = ("The following agricultural and related occupations are eligible through this stream:\n"
          "| NOC | Description |\n| --- | --- |\n"
          "| 14401 | Storekeepers and partspersons* |\n| 75101 | Material handlers* |\n"
          "| 84120 | Specialized livestock workers and farm machinery operators |\n| 85100 | Livestock labourers |\n"
          "| 95106 | Labourers in food and beverage processing* |\n"
          "*Occupations that require the sponsoring employer to be under:\n"
          "NAICS 11 – Agriculture, forestry, fishing and hunting\nNAICS 311 – Food manufacturing\n")
    """照真页 md 写法现造的一段(表格行 + 星号脚注)。"""

    def rows_of(self, md: str) -> list | None:
        """同 build_sk 的前两步:按 SK 行写法解析 → 带星号码标行业键(sk_sector_marked);自校没过返回 None(2026-09-27)。"""
        from pnp import functions as fn
        occs = fn.parse_noc_lines(NocLinesIn(md=md, patterns=SK_NOC_PATTERNS))
        return fn.sk_sector_marked(SkSectorIn(md=md, occs=occs, quote=SK_AGRI_SECTOR_QUOTE, sector=SK_AGRI_SECTOR))

    def occs_of(self, md: str) -> list | None:
        """同 build_sk 的前两步:按 SK 行写法解析 → 去星号码;返回留下的码(自校没过返回 None)。
        2026-09-27 起「留下的码」= 行上不带 employerSector 的码(带星号码照收但标了行业键,见 marked_of)。"""
        rows = self.rows_of(md)
        if rows is None:
            return rows
        out = []
        for o in rows:
            if "employerSector" not in o:
                out.append(o["noc"])
        return out

    def marked_of(self, md: str) -> dict | None:
        """带星号、标了行业键的码 → 行业键(自校没过返回 None;2026-09-27)。"""
        rows = self.rows_of(md)
        if rows is None:
            return rows
        out = {}
        for o in rows:
            if "employerSector" in o:
                out[o["noc"]] = o["employerSector"]
        return out

    def test_synthetic_golden(self) -> None:
        """带星号的三码不收、不带的两码照收;星号码认的是职业名尾巴上的星号(名字已剥掉星号的解析结果不受影响)。
        2026-09-27 起带星号的三码照收、标 skAgriFood(清单卡照官方全列),不带的两码原样。"""
        self.assertEqual(self.occs_of(self.MD), ["84120", "85100"])
        self.assertEqual(self.marked_of(self.MD), {"14401": "skAgriFood", "75101": "skAgriFood", "95106": "skAgriFood"})
        rows = self.rows_of(self.MD)
        if rows is None:
            self.fail("现造页自校没过")
        self.assertEqual(len(rows), 5)

    def test_refuses_to_guess(self) -> None:
        """脚注原句不在(措辞变了)→ None;脚注在却一个星号码都没认出(版式变了)→ None;两种都保留旧表。"""
        no_quote = self.MD.replace("*Occupations that require the sponsoring employer to be under:", "* Employer rules:")
        self.assertIsNone(self.occs_of(no_quote))
        no_star = self.MD.replace("* |", " |")
        self.assertIsNone(self.occs_of(no_star))

    def test_only_agri_carries_quote(self) -> None:
        """只有农业那条带 sectorQuote 键:医疗页的星号意思不同(「也可走 Employment Offer」),不许被这条规则去码。
        2026-09-27 起同一条还带 employerSector = skAgriFood(与 mart 域的行业键逐字相同),别的两条不带。"""
        carried = []
        sectors = []
        for s in SK_STREAMS:
            if K_SECTOR_QUOTE in s:
                carried.append(s["out"])
            if "employerSector" in s:
                sectors.append((s["out"], s["employerSector"]))
        self.assertEqual(carried, ["sk-agri.json"])
        self.assertEqual(sectors, [("sk-agri.json", "skAgriFood")])

    def test_real_page(self) -> None:
        """金标:crawl 缓存里的农业通道真页 → 带星号七码全部不收,留下四码;另跑一遍变异探针 —— 把 75101 的星号去掉、
        给 84120 加上星号,留下的码当场跟着变(金标对照能拦住官方改星号 / 解析漏星号)。官方真改了星号,这条会红:
        核对官方页后改 KEPT / STARRED 两份金标(这正是它要拦的事)。"""
        from pnp import functions as fn
        url = SK_STREAMS[2]["url"]
        hit = fn.get_cached_page(url)
        if hit.html is None:
            self.skipTest("crawl 缓存里没有 SK 农业通道页(本机未跑 crawl)")
        md = fn.convert_md(fn.ConvertIn(html=hit.html, url=url, selector=None, removes=()))
        self.assertEqual(fn.sk_starred_nocs(md), self.STARRED)
        kept = self.occs_of(md)
        if kept is None:
            self.fail("真页自校没过(脚注原句或星号码认不出)")
        self.assertEqual(set(kept), self.KEPT)
        marked = self.marked_of(md)
        if marked is None:
            self.fail("真页自校没过")
        self.assertEqual(set(marked), self.STARRED)
        self.assertEqual(set(marked.values()), {"skAgriFood"})
        mutated = md.replace("| Material handlers* |", "| Material handlers |").replace(
            "| Specialized livestock workers and farm machinery operators |",
            "| Specialized livestock workers and farm machinery operators* |")
        self.assertNotEqual(mutated, md)
        kept = self.occs_of(mutated)
        if kept is None:
            self.fail("变异后的页自校没过(星号还在,不该判改版)")
        self.assertEqual(set(kept), (self.KEPT - {"84120"}) | {"75101"})


class EmployerSectorTablesTest(unittest.TestCase):
    """雇主行业条件与带星号码如实记进表的自测(2026-09-27 Frank 拍板「看得出才改判」:pnp 域只记官方写的条件,判雇主归 mart)。
    配置金标(三个行业键挂在哪几张表;卫生局表不挂)+ 现造页纯函数用例 + crawl 缓存真页金标(本机没跑 crawl 就跳过)+ 变异探针
    (改页上的星号,记下的码当场跟着变)。建表那步落系统临时目录,不碰仓内文件;缓存缺页一律跳过,不联网。
    同日 Frank 选「只上纯属改对的」:NS 建筑、AB 科技两张表维持现状(不带行业键,NS 建筑照旧 20 码),这两项改成现状金标。"""

    AOS_PARTIAL = {"60040", "42200", "42202", "33100"}
    """手写金标:AOS 页 Table 1 带星号的四个码(2026-09-27 crawl 缓存 ab-aaip bbf84819… 原样)。"""

    RRS_PARTIAL = {"60040", "42200", "33100"}
    """手写金标:乡村振兴页 Table 1 带星号的三个码(同日 ab-aaip 0cf7f671… 原样)。"""

    NS_22 = {"70010", "70011", "72011", "72014", "72020", "72102", "72106", "72200", "72201", "72310", "72320", "72401",
             "72402", "72500", "73100", "73102", "73110", "73200", "73400", "75101", "75110", "75119"}
    """手写金标:NS Skilled Worker 页 CONSTRUCTION 页签列出的 22 码(同日 ns-root 495d2957… 原样)。"""

    TABLE_HTML = ("<table><tr><th>NOC code (2021)</th><th>NOC TEER category</th><th>Occupation</th></tr>"
                  "<tr><td>00010</td><td>0</td><td>Legislators</td></tr>"
                  "<tr><td>60040*</td><td>0</td><td>Escort agency managers, massage parlour managers</td></tr>"
                  "<tr><td>42200*</td><td>2</td><td>Justices of the peace</td></tr></table>")
    """照真页写法现造的一张排除表(表头判词 + 一行不带星号 + 两行带星号)。"""

    def test_config_keys(self) -> None:
        """配置金标:NB 餐饮住宿段 naics72、BC 法语教师桶 bcPublicSchool、SK 农业那条 skAgriFood;BC 卫生局桶不挂(官方卫生局名单
        不在缓存,不凭印象列);别的 NB 段、BC 桶、SK 条都不挂。现状金标(2026-09-27 Frank 选「只上纯属改对的」):NS 建筑照旧剔掉
        75101 / 75119 两个通用码(NS_CONSTR_GENERIC 原样),AB 科技表不带行业键见 test_ab_tech_status_quo。"""
        from pnp import constants as c
        nb = []
        for nt in c.NB_NOTICES:
            for key in ("any", "food"):
                seg = nt.get(key)
                if isinstance(seg, dict) and "employerSector" in seg:
                    nb.append((nt["key"], key, seg["employerSector"]))
        self.assertEqual(nb, [("pnp", "food", "naics72")])
        bc = []
        for key, cfg in c.BC_BUCKETS.items():
            if "employerSector" in cfg:
                bc.append((key, cfg["employerSector"]))
        self.assertEqual(bc, [("education", "bcPublicSchool")])
        self.assertNotIn("employerSector", c.BC_BUCKETS["health_authority"])
        self.assertEqual(c.SK_AGRI_SECTOR, "skAgriFood")
        self.assertEqual(c.NS_CONSTR_GENERIC, {"75101", "75119"})

    def test_aos_partial_synthetic(self) -> None:
        """现造表:带星号的两行 partial 为真、不带的为假;码尾星号照旧剥掉(码与名字不受影响)。"""
        from pnp import functions as fn
        rows = fn.parse_ab_aos(self.TABLE_HTML)
        got = {}
        for r in rows:
            got[r["noc"]] = r["partial"]
        self.assertEqual(got, {"00010": False, "60040": True, "42200": True})
        self.assertEqual(fn.ab_starred_of(AbNocTableIn(html=self.TABLE_HTML, head_kw="noc code")), {"60040", "42200"})
        self.assertEqual(fn.ab_starred_of(AbNocTableIn(html=self.TABLE_HTML.replace("*", ""), head_kw="noc code")), set())

    def test_aos_partial_real(self) -> None:
        """金标:crawl 缓存里的 AOS 真页 → 34 码、带星号恰好四码;变异探针:去掉 42202 的星号,记下的码当场少一个。"""
        from pnp import functions as fn
        hit = fn.get_cached_page("https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility")
        if hit.html is None:
            self.skipTest("crawl 缓存里没有 AOS 资格页(本机未跑 crawl)")
        rows = fn.parse_ab_aos(hit.html)
        partial = set()
        for r in rows:
            if r["partial"]:
                partial.add(r["noc"])
        self.assertEqual(len(rows), 34)
        self.assertEqual(partial, self.AOS_PARTIAL)
        mutated = hit.html.replace("42202*", "42202")
        self.assertNotEqual(mutated, hit.html)
        partial = set()
        for r in fn.parse_ab_aos(mutated):
            if r["partial"]:
                partial.add(r["noc"])
        self.assertEqual(partial, self.AOS_PARTIAL - {"42202"})

    def test_rrs_starred_real(self) -> None:
        """金标:crawl 缓存里的乡村振兴资格真页 → 17 码里带星号恰好三码;变异探针:去掉 33100 的星号,当场少一个。"""
        from pnp import functions as fn
        hit = fn.get_cached_page("https://www.alberta.ca/aaip-rural-renewal-stream-eligibility")
        if hit.html is None:
            self.skipTest("crawl 缓存里没有乡村振兴资格页(本机未跑 crawl)")
        self.assertEqual(len(fn.ab_noc_table_of(AbNocTableIn(html=hit.html, head_kw="noc code"))), 17)
        self.assertEqual(fn.ab_starred_of(AbNocTableIn(html=hit.html, head_kw="noc code")), self.RRS_PARTIAL)
        mutated = hit.html.replace("33100*", "33100")
        self.assertNotEqual(mutated, hit.html)
        self.assertEqual(fn.ab_starred_of(AbNocTableIn(html=mutated, head_kw="noc code")), self.RRS_PARTIAL - {"33100"})

    def test_ns_construction_real(self) -> None:
        """现状金标(2026-09-27 Frank 选「只上纯属改对的」):crawl 缓存里的 NS Skilled Worker 真页 → 建表照旧写出 20 码(官方 22 码
        去掉 75101 / 75119)、不带 employerSector;变异探针:把 NS_CONSTR_GENERIC 清空,当场变回官方 22 码 —— 证明是这张剔除表在剔,
        不是页上碰巧少了。表落系统临时目录;缓存里没有这页就跳过(建表那步缓存缺页会直连,本用例不许联网)。"""
        from pnp import functions as fn
        if fn.get_cached_page(fn.NS_MAIN_URL).html is None:
            self.skipTest("crawl 缓存里没有 NS Skilled Worker 页(本机未跑 crawl)")
        for generic, want in ((fn.NS_CONSTR_GENERIC, self.NS_22 - {"75101", "75119"}), (set(), self.NS_22)):
            with tempfile.TemporaryDirectory() as tmp:
                with mock.patch.object(fn, "OUT_PNP_DIR", Path(tmp)), mock.patch.object(fn, "NS_CONSTR_GENERIC", generic):
                    fn.build_ns_construction()
                table = json.loads((Path(tmp) / "ns-construction.json").read_text(encoding="utf-8"))
            codes = set()
            for o in table["occupations"]:
                codes.add(o["noc"])
            self.assertEqual(codes, want)
            self.assertNotIn("employerSector", table)

    def test_ab_tech_status_quo(self) -> None:
        """现状金标(2026-09-27 Frank 选「只上纯属改对的」):AB 科技表照旧不带 employerSector(雇主是不是科技业本批不判,等第二步)。
        build_ab 整跑一遍、取数全打桩:AOS 页取不到(留旧表)、科技 PDF 换成现造两行、医护页取不到、警务 / 旅游 / 乡村振兴三步跳过;
        表落系统临时目录,不联网、不碰仓内文件。"""
        from pnp import functions as fn
        occs = [{"noc": "21231", "teer": 1, "name": "Software engineers and designers"},
                {"noc": "21232", "teer": 1, "name": "Software developers and programmers"}]
        with tempfile.TemporaryDirectory() as tmp:
            with (mock.patch.object(fn, "OUT_PNP_DIR", Path(tmp)),
                  mock.patch.object(fn, "fetch_html", side_effect=RuntimeError("offline")),
                  mock.patch.object(fn, "fetch_bytes", return_value=b""),
                  mock.patch.object(fn, "parse_ab_tech", return_value=occs),
                  mock.patch.object(fn, "ab_dhcp_html", side_effect=RuntimeError("offline")),
                  mock.patch.object(fn, "build_ab_law"), mock.patch.object(fn, "build_ab_tourism"),
                  mock.patch.object(fn, "build_ab_rural")):
                fn.build_ab()
            table = json.loads((Path(tmp) / "ab-tech.json").read_text(encoding="utf-8"))
        self.assertNotIn("employerSector", table)
        codes = []
        for o in table["occupations"]:
            codes.append(o["noc"])
        self.assertEqual(codes, ["21231", "21232"])

