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
同日 Frank「照改,加这一列」再住一组 DrawSelectionTest(抽选行 selection 码的三省认法 + 落盘门并回口径 + 真文件金标)。
"""
import json
import re
import tempfile
import unittest
from collections import Counter
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
from pnp.constants import OUT_DRAWS_FILE_TPL, OUT_PNP_DIR  # 2026-09-27 抽选行 selection 码自测读真文件用
from pnp.constants import (  # 2026-09-29 年报目录页发现新一期的自测用(两省链接形)
    NBS_FY_TPL, NBS_REPORT_HREF_RE, NBS_SITE_BASE, NLS_FY_TPL, NLS_REPORT_HREF_RE, NLS_SITE_BASE,
)


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
class StdReqIn:
    """to_std_req() 入参:标准形门槛行(base 十五格 + factor)+ 本省的两个缺省(2026-09-29 去重立:
    SK / NB / PE / NL 四份 to_*_req 逐格同形,只差缺省 stream 与 url,并成一个;QC 子域同形直接用)。"""

    req: ReqIn
    """本行入参(空串 / None = 本行没表态,由下面两个缺省或标准缺省兜)。"""

    stream: str
    """本省缺省通道名。"""

    url: str
    """本省缺省出处页。"""


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
class DrawSelectionsIn:
    """mark_draw_selections() 入参:一省的一串抽选行(2026-09-27 Frank「照改,加这一列」:每行原地补 selection 码)。"""

    prov: str
    """省码(按省分派认法;MB / BC / NB 之外一律空串)。"""

    draws: list
    """抽选行(本轮解析到的,或上一轮落盘的旧行);原地写 selection 格。"""


@dataclass
class DrawRowsIn:
    """split_draw_rows() / mark_draw_programs() 入参:一省的一串抽选行(2026-09-29 抽选卡重排)。"""

    prov: str
    """省码(按省分派拆法与判法)。"""

    draws: list
    """抽选行(本轮解析到的,或上一轮落盘的旧行)。"""


@dataclass
class DrawKindIn:
    """draw_program_of() / draw_unit_of() 入参:一行抽选的省码与 stream(2026-09-29 抽选卡重排)。"""

    prov: str
    """省码。"""

    stream: str
    """该行 stream(各省解析器写的通道 / 批次名;缺格按空串)。"""


@dataclass
class DrawSelectionIn:
    """draw_selection_of() 入参:一行抽选的省码与 note 原文(2026-09-27 Frank「照改,加这一列」)。"""

    prov: str
    """省码。"""

    note: str
    """该行 note(各省解析器照官方原文拼的那格;缺格按空串)。"""


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

    ig_page_txt: str
    """申请人页正文(外省院校毕业须先在 NL 工作满一年那句只在这页;2026-09-30 通道补全批一 1b)。"""


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
    """AB 运营统计一页四堆的累加器(逐表归堆的显式上下文)。
    2026-09-29 加第五堆 federal(额外联邦名额表)。"""

    summary: dict
    """总表(2026 summary)。"""

    streams: list
    """逐 stream 行。"""

    eoi_pool: list
    """EOI 池逐 stream 人数。"""

    draws: list
    """抽选史(canonical 仍归 §10,本表原样留档)。"""

    federal: list
    """额外联邦名额表逐类行(医生 / 法语者,不占本省配额;2026-09-29 立)。"""


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
class AbFederalIn:
    """ab_federal_rows() 入参(2026-09-29 立)。"""

    rows: list
    """额外联邦名额表逐类行(collect_ab_federal 收的)。"""

    text: str
    """整页压平文本(找「… will not count toward … allocation.」那句用)。"""


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
class OnAuditOut:
    """on_audit_of() / fetch_on_audit() 出参:省审计长 2024 年报附录 1 读出来的东西(2026-09-29 立)。"""

    by_year: dict
    """年 → Actual Nominations 合计行的实发提名数(读不成给空表)。"""

    quote: str
    """正文里指向附录 1 的官方原句(补行 label 的前半句)。"""

    table: str
    """附录 1 的表名(不带「Appendix 1: 」)。"""

    problems: list
    """取不到 / 读不成时的自校问题(并进 build_on_stats 的 problems)。"""


@dataclass
class OnAuditMergeIn:
    """on_audit_merge_rows() 入参:逐年页已抽到的行 + 审计长逐年数(2026-09-29 立;同日 Frank「用审计长的数」改判后由
    OnAuditGapIn 改名 —— 不再只补缺年)。"""

    rows: list
    """逐年页抽到的已发提名行(附录没覆盖的年份照用;覆盖的年份对账后换成审计长行)。"""

    audit: OnAuditOut
    """审计长附录 1 读出来的东西。"""


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
    """年报块(处理天数 / 服务承诺 / EOI 池)。2026-09-29 起 EOI 池移出,改由 MbPoolOut 出历年序列。"""

    problems: list
    """自校问题。"""


@dataclass
class MbPoolPageIn:
    """一份年报(mb_pool_series_of 的一项 / mb_pool_row_of 入参;2026-09-29 立)。"""

    year: int
    """年报年(网址里的年)。"""

    url: str
    """年报网址。"""

    html: str | None
    """年报原文(crawl 缓存里没有 = None,序列缺这一年)。"""

    fetched: str
    """缓存那轮的抓取日。"""


@dataclass
class MbPoolRowIn:
    """to_mb_pool_row() 入参:一份年报里认出的池子那句(2026-09-29 立)。"""

    page: MbPoolPageIn
    """那份年报。"""

    label: str
    """官方原句原样。"""

    label_year: str
    """原句里写的年(「at the end of 2023」的 2023;与年报年不同 = 官方笔误,汇装据此在句尾加 [sic])。"""

    value: int | None
    """在册人数。"""

    head: str
    """那句所在节的官方小标题(「10. Expression of Interest Pool」)。"""


@dataclass
class MbPoolOut:
    """mb_pool_years() / mb_pool_series_of() 出参(2026-09-29 立)。"""

    rows: list
    """池子人数历年清单(新到旧,一年一行)。"""

    problems: list
    """自校问题(缺年报 / 认不出那句,一年一条)。2026-09-29 同日改判:只收最新一份年报的问题。"""

    gaps: list
    """旧年份缺口(不是最新一份的年报缺席或认不出;调用方沿用上一版,见 mb_pool_carry_over;2026-09-29 立)。"""


@dataclass
class MbCarryIn:
    """mb_pool_carry_over() 入参(2026-09-29 立)。"""

    rows: list
    """本轮认出的池子行(新到旧)。"""

    gaps: list
    """旧年份缺口的年份。"""

    path: Path
    """上一版 mb-stats.json(不在 = 没有可沿用的)。"""


@dataclass
class MbSayIn:
    """say_mb_stats() 入参:收尾报数的四行素材。"""

    monthly: dict
    """月度块。"""

    annual: dict
    """年报块。"""

    pools: list
    """年报池子人数历年清单(2026-09-29 立,逐年一行报数)。"""

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

    extra: dict
    """并进同一份文件的其他清单(键 → 清单;2026-09-29 NS 两张季表立,BC 传空表)。"""


@dataclass
class NsQuarterlyIn:
    """fetch_ns_quarterly() 入参:NS 一张季表(2026-09-29 立)。"""

    url: str
    """取数地址(带 $limit)。"""

    title: str
    """数据集官方标题(报错用)。"""


@dataclass
class NsPoolRowIn:
    """to_ns_pool_row() 入参:候选池一季的合计。"""

    year: int
    """年。"""

    q: int
    """季号(1–4)。"""

    value: int
    """省提名(NSNP)季末库存合计。"""

    fetched: str
    """抓取日。"""


@dataclass
class NsYtdRowIn:
    """to_ns_ytd_row() 入参:本年某一种审批结果的累计。"""

    year: int
    """年。"""

    q: int
    """累计到第几季(本年最新一季)。"""

    result: str
    """官方结果词(Approved / Refused / Withdrawn)。"""

    value: int
    """省提名(NSNP)累计件数。"""

    fetched: str
    """抓取日。"""


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


@dataclass
class BcFunnelIn:
    """bc_funnel_of() 入参:一份年报的全文 + 出自哪份报告(2026-09-29 立)。"""

    text: str
    """PDF 全文(pdf_text 出参)。"""

    report: BcReportOut
    """报告(只认这一年的句子;section 与 url 用)。"""


@dataclass
class BcFunnelSayIn:
    """say_bc_funnel() 入参:四组逐年数的收尾报数(2026-09-29 立)。"""

    extra: dict
    """并进文件的四份清单(清单键 → 年降序的行)。"""

    last: dict
    """最新一份年报认出的组(清单键 → 行;缺组留痕用)。"""

    report: int
    """最新一份年报的报告年。"""


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
    全程不联网、不读仓内文件。
    2026-09-29 抽选卡重排:拆法交回(省提名, AIP)两份(nl_split_of,原 nl_pnp_invitations_of);解析照旧一批一行,
    拆成两行在落盘门(nl_rows_of / mark_and_merge_draws),本类加拆行与落盘门两组。"""

    def test_split_golden(self) -> None:
        """金标:官方 Notes 的几种写法(真页 2026 年各批原样);两项加起来等于本批总数才认,只有 AIP 一项且等于总数 = 省提名 0。"""
        from pnp import functions as fn
        cases = [("NLPNP – 61, AIP – 01", 62, (61, 1)), ("NLPNP – 41", 41, (41, 0)),
                 ("NLPNP – 94, AIP – 46", 140, (94, 46)), ("AIP – 40", 40, (0, 40)), ("NLPNP - 36", 36, (36, 0)),
                 ("NLPNP — 17, AIP — 40", 57, (17, 40))]
        for note, total, want in cases:
            self.assertEqual(fn.nl_split_of({"note": note, "invitations": total}), want, note)

    def test_split_refuses_to_guess(self) -> None:
        """对不上总数、一项都认不出、总数没公布 → None(整批留一行、项目认不出;汇装见它整省不出合计,不拿本批合计顶)。"""
        from pnp import functions as fn
        self.assertIsNone(fn.nl_split_of({"note": "NLPNP – 94, AIP – 46", "invitations": 141}))
        self.assertIsNone(fn.nl_split_of({"note": "NLPNP – 36", "invitations": 40}))
        self.assertIsNone(fn.nl_split_of({"note": "", "invitations": 10}))
        self.assertIsNone(fn.nl_split_of({"note": "NLPNP – 36", "invitations": None}))

    def test_parse_table_golden(self) -> None:
        """解析金标:照真页的表形(无 <th>,首行 <td> 是表头)造两行,仍是一批一行(本批合计 + Notes 原文),不再带 pnpInvitations。"""
        from pnp import functions as fn
        from pnp.constants import NL_DRAW_STREAM
        html = ("<table><tr><td>Date Issued</td><td>Number of ITAs Issued</td><td>Notes</td></tr>"
                "<tr><td>September 18, 2026</td><td>62</td><td>NLPNP – 61, AIP – 01</td></tr>"
                "<tr><td>September 25, 2026</td><td>41</td><td>NLPNP – 41</td></tr></table>")
        got = fn.parse_nl_draws(html)
        self.assertEqual([(d["date"], d["stream"], d["invitations"], d["note"]) for d in got],
                         [("2026-09-25", NL_DRAW_STREAM, 41, "NLPNP – 41"),
                          ("2026-09-18", NL_DRAW_STREAM, 62, "NLPNP – 61, AIP – 01")])
        self.assertNotIn("pnpInvitations", got[0])

    def test_rows_of(self) -> None:
        """拆行:两项各一行;只有一项只出那一行;两项都是 0 留省提名那行;拆不开整批原样;已拆好的行原样。"""
        from pnp import functions as fn
        from pnp.constants import NL_AIP_STREAM, NL_DRAW_STREAM, NL_PNP_STREAM
        cases = [("NLPNP – 61, AIP – 01", 62, [(NL_PNP_STREAM, 61), (NL_AIP_STREAM, 1)]),
                 ("NLPNP – 41", 41, [(NL_PNP_STREAM, 41)]), ("AIP – 40", 40, [(NL_AIP_STREAM, 40)]),
                 ("NLPNP – 0", 0, [(NL_PNP_STREAM, 0)]), ("NLPNP – 94, AIP – 46", 141, [(NL_DRAW_STREAM, 141)])]
        for note, total, want in cases:
            row = {"date": "2026-09-18", "stream": NL_DRAW_STREAM, "score": None, "note": note, "invitations": total}
            got = fn.nl_rows_of(row)
            self.assertEqual([(r["stream"], r["invitations"]) for r in got], want, note)
            for r in got:
                self.assertEqual((r["date"], r["note"], r["score"]), ("2026-09-18", note, None), note)
        done = {"date": "2026-09-18", "stream": NL_PNP_STREAM, "note": "NLPNP – 41", "score": None, "invitations": 41}
        self.assertEqual(fn.nl_rows_of(done), [done])

    def test_gate_splits_history(self) -> None:
        """落盘门:本轮整批行与历史里整批那一行(还带 09-27 的 pnpInvitations 格)同一处拆,并回后每批只剩拆好的行、各带项目 /
        人数口径两格,不留整批行、不重复。变异探针:历史行不拆直接并回(旧行为),整批行留在历史里 = 与拆好的行重复计数。"""
        from pnp import functions as fn
        from pnp.constants import NL_AIP_STREAM, NL_DRAW_STREAM, NL_PNP_STREAM
        new = [{"date": "2026-09-25", "stream": NL_DRAW_STREAM, "note": "NLPNP – 41", "score": None, "invitations": 41},
               {"date": "2026-09-18", "stream": NL_DRAW_STREAM, "note": "NLPNP – 61, AIP – 01", "score": None,
                "invitations": 62}]
        old = [{"date": "2026-09-18", "stream": NL_DRAW_STREAM, "note": "NLPNP – 61, AIP – 01", "score": None,
                "invitations": 62, "pnpInvitations": 61, "selection": ""},
               {"date": "2025-11-12", "stream": NL_DRAW_STREAM, "note": "NLPNP – 300, AIP – 30", "score": None,
                "invitations": 330, "pnpInvitations": 300, "selection": ""}]
        got = fn.mark_and_merge_draws(MergeDrawsIn(prov="NL", new=[dict(r) for r in new],
                                                   old={"NL": {"draws": [dict(r) for r in old]}}))
        self.assertEqual([(r["date"], r["stream"], r["invitations"], r["program"], r["unit"]) for r in got],
                         [("2026-09-25", NL_PNP_STREAM, 41, "PNP", "invitation"),
                          ("2026-09-18", NL_PNP_STREAM, 61, "PNP", "invitation"),
                          ("2026-09-18", NL_AIP_STREAM, 1, "AIP", "invitation"),
                          ("2025-11-12", NL_PNP_STREAM, 300, "PNP", "invitation"),
                          ("2025-11-12", NL_AIP_STREAM, 30, "AIP", "invitation")])
        for r in got:
            self.assertNotIn("pnpInvitations", r)
        split_new = fn.split_draw_rows(DrawRowsIn(prov="NL", draws=[dict(r) for r in new]))
        bare = fn.merged_draws_of(MergeDrawsIn(prov="NL", new=split_new, old={"NL": {"draws": [dict(r) for r in old]}}))
        self.assertIn(NL_DRAW_STREAM, [r["stream"] for r in bare])


class DrawProgramTest(unittest.TestCase):
    """抽选行项目 / 人数口径两格与人数上限自测(2026-09-29 抽选卡重排,Frank「如果改一个地方,是不是所有省份都得改一遍」):
    判法逐省逐组穷举 + 人数格上限写法金标 / 拒猜 + AB、BC 解析金标(BC 同日同组同分两条「<5」子轮都留)。全程不联网、不读仓内文件。"""

    def test_program_unit(self) -> None:
        """各省各组的判法:NS 同池选取;NB 的 AIP 组是 AIP 的申请入选;NL 拆出来的两行、拆不开的整批;QC 是 PSTQ;其余省提名邀请。"""
        from pnp import functions as fn
        from pnp.constants import NL_AIP_STREAM, NL_DRAW_STREAM, NL_PNP_STREAM
        cases = [("NS", "Monthly EOI selections", "PNP+AIP", "selection"), ("NB", "AIP", "AIP", "application"),
                 ("NB", "NB Express Entry", "PNP", "invitation"), ("NL", NL_PNP_STREAM, "PNP", "invitation"),
                 ("NL", NL_AIP_STREAM, "AIP", "invitation"), ("NL", NL_DRAW_STREAM, "", "invitation"),
                 ("QC", "Stream 1: Highly qualified and specialized skills", "PSTQ", "invitation"),
                 ("AB", "Alberta Opportunity Stream", "PNP", "invitation"), ("BC", "Care: Health", "PNP", "invitation"),
                 ("MB", "Skilled Worker in Manitoba", "PNP", "invitation"), ("ON", "Masters Graduate", "PNP", "invitation"),
                 ("PE", "Labour & Express Entry", "PNP", "invitation"), ("SK", "", "PNP", "invitation")]
        for prov, stream, program, unit in cases:
            kind = DrawKindIn(prov=prov, stream=stream)
            self.assertEqual((fn.draw_program_of(kind), fn.draw_unit_of(kind)), (program, unit), (prov, stream))

    def test_below_of(self) -> None:
        """人数格上限:两省官方写法认成上限;确数、空、范围、拼成英文字的一律 None(不猜)。"""
        from pnp import functions as fn
        for text, want in (("Less than 10", 10), ("<5", 5), (" < 5 ", 5), ("less than 10", 10), ("10", None),
                           ("", None), (None, None), ("Less than ten", None), ("From 10 to 15", None), ("<5*", None)):
            self.assertEqual(fn.below_of(text), want, text)

    def test_parse_ab_below(self) -> None:
        """AB 解析金标(真页表头与两种人数格):「Less than 10」那行 invitations 仍 None、上限 10;确数行上限 None。"""
        from pnp import functions as fn
        html = ("<table><tr><th>Draw date</th><th>Worker stream, pathway, initiative or other focus and selection parameters</th>"
                "<th>Minimum score of invited candidates</th><th>Number of invitations</th></tr>"
                "<tr><td>September 21, 2026</td><td>Alberta Express Entry Stream – Law Enforcement Pathway</td><td>49</td>"
                "<td>Less than 10</td></tr>"
                "<tr><td>September 18, 2026</td><td>Alberta Opportunity Stream</td><td>60</td><td>1,021</td></tr></table>")
        got = fn.parse_ab_draws(html)
        self.assertEqual([(d["date"], d["invitations"], d["invitationsBelow"]) for d in got],
                         [("2026-09-21", None, 10), ("2026-09-18", 1021, None)])

    def test_parse_bc_below(self) -> None:
        """BC 解析金标(真页 2026-09-10 那两行):同日同组同分、人数都写「<5」、选取条件不同的两个子轮都留,上限各 5。
        变异探针:去重键不带选取条件(旧键)时两行会并成一行 —— 这里断言两行,旧键过不了。"""
        from pnp import functions as fn
        html = ("<table><tr><th>Date</th><th>ITA type</th><th>Selection factors</th><th>Minimum score</th>"
                "<th>Number of invitations</th></tr>"
                "<tr><td rowspan='2'>September 10, 2026</td><td rowspan='2'>Care: Veterinary Care</td>"
                "<td>All priority veterinary care occupations</td><td rowspan='2'>90</td><td>&lt;5</td></tr>"
                "<tr><td>Animal health technologists and veterinary technicians (NOC 32104) with valid professional "
                "designation</td><td>&lt;5</td></tr></table>")
        got = fn.parse_bc_draws(html)
        self.assertEqual([(d["date"], d["score"], d["invitations"], d["invitationsBelow"]) for d in got],
                         [("2026-09-10", 90, None, 5), ("2026-09-10", 90, None, 5)])
        self.assertEqual(len({d["note"] for d in got}), 2)

    def test_pe_aip_direct(self) -> None:
        """PE 的 AIP 背书申请那一行:官方原句(直引号、弯引号两种写法)整句认出 → 一行 eoiDraw / op=none、program=AIP、
        原句进 valueText;改一个词(Candidates → candidate)或缓存缺失(空串)→ 不出行、记一条自校问题(不拿关键词凑)。"""
        from pnp import functions as fn
        from pnp.constants import PER_PROBLEM_AIP
        body = ("How do I apply? To be eligible to endorse a foreign national, you must first be a PEI Designated Employer. "
                "A Designated Employer should complete the online AIP Endorsement Application by clicking {q}Apply Now{r} "
                "at the bottom of this page for each of your qualified Candidates. You will receive a secure link.")
        for q, r in (('"', '"'), ("“", "”")):
            got = fn.pe_aip_direct_reqs(body.format(q=q, r=r))
            self.assertEqual(got.problems, [])
            self.assertEqual([(x["factor"], x["op"], x["program"]) for x in got.rows], [("eoiDraw", "none", "AIP")])
            self.assertTrue(got.rows[0]["valueText"].startswith("A Designated Employer should complete"))
        for bad in (body.format(q='"', r='"').replace("Candidates.", "candidate."), ""):
            got = fn.pe_aip_direct_reqs(bad)
            self.assertEqual((got.rows, got.problems), ([], [PER_PROBLEM_AIP]))


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


class NsQuarterlyTest(unittest.TestCase):
    """NS 两张季表合计自测(2026-09-29 立):只算省提名(NSNP,AIP 不进)、年 / 季 / 数认不出的行跳过、候选池新到旧逐季一行、
    审批结果只取最新一年且累计到该年最新一季、统计期与截至月写法。全程不联网、不读仓内文件。"""

    def test_pool_quarters(self) -> None:
        """候选池:逐职业行按季合计,新到旧;坏行跳过。"""
        from pnp import functions as fn
        rows = [{"program": "NSNP", "year": "2026", "quarter": "Q1", "eoi_count": "5"},
                {"program": "NSNP", "year": "2026", "quarter": "Q1", "eoi_count": "3"},
                {"program": "NSNP", "year": "2026", "quarter": "Q2", "eoi_count": "7"},
                {"program": "AIP", "year": "2026", "quarter": "Q2", "eoi_count": "100"},
                {"program": "NSNP", "year": "2026", "quarter": "Q5", "eoi_count": "9"},
                {"program": "NSNP", "year": "x", "quarter": "Q2", "eoi_count": "9"},
                {"program": "NSNP", "year": "2026", "quarter": "Q2", "eoi_count": "n/a"}]
        got = fn.ns_pool_quarters(rows)
        self.assertEqual([(r["period"], r["asOf"], r["value"]) for r in got],
                         [("2026Q2", "2026-06", 7), ("2026Q1", "2026-03", 8)])
        self.assertEqual(got[0]["label"], "Open expressions of interest at quarter end, NSNP, 2026 Q2")

    def test_assessments_ytd(self) -> None:
        """审批结果:只取最新一年,按结果词累计到该年最新一季;AIP 与坏行不进。"""
        from pnp import functions as fn
        rows = [{"program": "NSNP", "year": "2025", "quarter": "Q4", "result": "Approved", "count": "50"},
                {"program": "NSNP", "year": "2026", "quarter": "Q1", "result": "Approved", "count": "10"},
                {"program": "NSNP", "year": "2026", "quarter": "Q2", "result": "Approved", "count": "20"},
                {"program": "NSNP", "year": "2026", "quarter": "Q2", "result": "Refused", "count": "4"},
                {"program": "NSNP", "year": "2026", "quarter": "Q1", "result": "Withdrawn", "count": "3"},
                {"program": "NSNP", "year": "2026", "quarter": "Q1", "result": "", "count": "3"},
                {"program": "AIP", "year": "2026", "quarter": "Q2", "result": "Approved", "count": "99"}]
        got = fn.ns_assessments_ytd(rows)
        self.assertEqual([(r["result"], r["value"], r["period"], r["asOf"]) for r in got],
                         [("Approved", 30, "2026 Q1-Q2", "2026-06"), ("Refused", 4, "2026 Q1-Q2", "2026-06"),
                          ("Withdrawn", 3, "2026 Q1-Q2", "2026-06")])
        self.assertEqual(fn.ns_assessments_ytd([]), [])


class MbPoolYearsTest(unittest.TestCase):
    """MB 年报池子人数历年序列自测(2026-09-29 立):逐份认「N Active EOI profiles at the end of YYYY」,官方原句与原句里的年
    原样照录(2024 年报写「end of 2023」本域也不改,改判在汇装)、所在节的官方小标题逐年照取(2017–2020 是「9.」、2021 起
    「10.」)、缺一份缓存或一份认不出那句各记一条自校问题、那句前面没有节标题不猜。年报原文照 crawl 缓存里 2024 / 2023 /
    2017 三份真页的池子节现造,全程不联网、不读仓内文件。
    2026-09-29 同日 lead 收口改判:只有最新一份年报的问题算自校问题,旧年份缺口记进 gaps、沿用上一版(用例随之改,另加
    最新一份算硬闸与沿用上一版两例;沿用那例写临时文件)。"""

    URL = "https://immigratemanitoba.com/resources/data/annual-report-{year}"
    """年报网址形。"""

    PAGE = ('<html><body><main><h3 class="wp-block-heading">{proc}</h3><p>Processing times are calculated based on date '
            'of submission to decision.</p><h3 class="wp-block-heading">{head}</h3><ul class="wp-block-list">{items}</ul>'
            '</main></body></html>')
    """年报里处理时长节之后接池子节的骨架(照真页的 h3 + ul 形)。"""

    ITEMS_2024 = ('<li><strong>33,746</strong>\xa0Skilled Worker Expression of Interest (EOI) profiles submitted in 2024</li>'
                  '<li><strong>8,162</strong>\xa0Letters of Advice to Apply (LAAs) issued in 2024</li>'
                  '<li><strong>26,678</strong>\xa0Active EOI profiles at the end of 2023</li>')
    """2024 年报池子节三条(第三条就是官方笔误的那句)。"""

    ITEMS_2023 = ('<li><strong></strong><strong>33,524</strong>\xa0Skilled Worker Expression of Interest (EOI) profiles '
                  'submitted in 2023</li><li><strong></strong><strong>16,381</strong>\xa0Letters of Advice to Apply '
                  '(LAAs) issued in 2023</li><li><strong></strong><strong>20,392</strong>\xa0Active EOI profiles at the '
                  'end of 2023</li>')
    """2023 年报池子节三条(真页每条前面多一个空 strong)。"""

    ITEMS_2017 = ('<li><strong>19,774</strong> Skilled Worker EOI profiles submitted in 2017</li>'
                  '<li><strong>4,044</strong> Letters of Advice to Apply issued in 2017</li>'
                  '<li><strong>15,957</strong> active EOI profiles at the end of 2017</li>')
    """2017 年报池子节三条(小写 active)。"""

    ITEMS_NO_POOL = ('<li><strong>26,443</strong> Skilled Worker EOI profiles submitted in 2018</li>'
                     '<li><strong>7,950</strong> Letters of Advice to Apply issued in 2018</li>')
    """认不出那句的一份(照 2018 年报的前两条,故意删掉第三条)。"""

    def page_of(self, year: int) -> MbPoolPageIn:
        """按年份拼一份年报:2021 起新节号(10.)、之前旧节号(9.);2018 用 ITEMS_NO_POOL。"""
        items = {2024: self.ITEMS_2024, 2023: self.ITEMS_2023, 2018: self.ITEMS_NO_POOL, 2017: self.ITEMS_2017}[year]
        proc = "9. Processing Times"
        head = "10. Expression of Interest Pool"
        if year < 2021:
            proc = "8. Processing Times"
            head = "9. Expression of Interest Pool"
        return MbPoolPageIn(year=year, url=self.URL.format(year=year), fetched="2026-09-29",
                            html=self.PAGE.format(proc=proc, head=head, items=items))

    def test_series(self) -> None:
        """2024 / 2023 / 2017 三份出三行(照给的新到旧顺序);2019 缓存缺席、2018 认不出那句各记一条自校问题。"""
        from pnp import functions as fn
        gap = MbPoolPageIn(year=2019, url=self.URL.format(year=2019), html=None, fetched="")
        got = fn.mb_pool_series_of([self.page_of(2024), self.page_of(2023), gap, self.page_of(2018), self.page_of(2017)])
        self.assertEqual([(r["year"], r["labelYear"], r["value"]) for r in got.rows],
                         [(2024, "2023", 26678), (2023, "2023", 20392), (2017, "2017", 15957)])
        self.assertEqual([r["label"] for r in got.rows],
                         ["26,678 Active EOI profiles at the end of 2023", "20,392 Active EOI profiles at the end of 2023",
                          "15,957 active EOI profiles at the end of 2017"])
        self.assertEqual([r["section"] for r in got.rows],
                         ["MPNP Annual Report 2024 — 10. Expression of Interest Pool",
                          "MPNP Annual Report 2023 — 10. Expression of Interest Pool",
                          "MPNP Annual Report 2017 — 9. Expression of Interest Pool"])
        self.assertEqual((got.rows[0]["url"], got.rows[0]["fetched"]), (self.URL.format(year=2024), "2026-09-29"))
        self.assertEqual(got.problems, [])
        self.assertEqual(got.gaps, [2019, 2018])

    def test_latest_is_hard(self) -> None:
        """最新一份(清单第一份)认不出那句 → 自校问题(整份保留旧表);它后面的旧年份缺口照旧只进 gaps。"""
        from pnp import functions as fn
        gap = MbPoolPageIn(year=2017, url=self.URL.format(year=2017), html=None, fetched="")
        got = fn.mb_pool_series_of([self.page_of(2018), gap])
        self.assertEqual(len(got.problems), 1)
        self.assertIn("2018", got.problems[0])
        self.assertEqual(got.gaps, [2017])

    def test_carry_over(self) -> None:
        """旧年份缺口沿用上一版那一年的行,新到旧排好;上一版也没有的年份本轮缺它;没有上一版文件就原样。"""
        import json
        import tempfile
        from pnp import functions as fn
        rows = [{"year": 2024, "value": 26678}, {"year": 2017, "value": 15957}]
        with tempfile.TemporaryDirectory() as tmp:
            prev = Path(tmp) / "mb-stats.json"
            prev.write_text(json.dumps({"eoiPoolYears": [{"year": 2019, "value": 25814}, {"year": 2020, "value": 21859}]}),
                            encoding="utf-8")
            got = fn.mb_pool_carry_over(MbCarryIn(rows=rows, gaps=[2019, 2018], path=prev))
            self.assertEqual([(r["year"], r["value"]) for r in got], [(2024, 26678), (2019, 25814), (2017, 15957)])
            gone = fn.mb_pool_carry_over(MbCarryIn(rows=rows, gaps=[2019], path=Path(tmp) / "none.json"))
            self.assertEqual([r["year"] for r in gone], [2024, 2017])

    def test_refuses_to_guess(self) -> None:
        """那句前面没有节标题 → 不出行(出处节名不编);原文缺席 → 不出行。"""
        from pnp import functions as fn
        bare = "<html><body><ul><li><strong>26,678</strong> Active EOI profiles at the end of 2023</li></ul></body></html>"
        self.assertIsNone(fn.mb_pool_row_of(MbPoolPageIn(year=2024, url="u", html=bare, fetched="f")))
        self.assertIsNone(fn.mb_pool_row_of(MbPoolPageIn(year=2024, url="u", html=None, fetched="")))


class AbFederalTest(unittest.TestCase):
    """AB 额外联邦名额自测(2026-09-29 立):表头「Additional federal space type」那张表归进 federal 一堆,不混进总表与逐
    stream;一类一行,label 挂官方那句原样;缺表或缺那句不出行(不拿表题顶 label)。页面照 AB 处理页真页的 Table 1 /
    Table 2 两段现造(造 soup 借 mb_soup_of:只拆噪音标签,对这几张表与 AB 入口的直解析没差),不联网不读仓。"""

    SUMMARY = ('<h2>Processing summary totals</h2><h3>2026 summary</h3><p><strong>Table 1.</strong> Process summary '
               'totals for 2026</p><div class="goa-table"><table class="table"><thead><tr><th>2026 nomination allocation'
               '</th><th>2026 nominations issued</th><th>2026 nomination spaces remaining</th><th>Applications to be '
               'processed</th></tr></thead><tbody><tr><td class="goa-table-number">6,603</td><td class="goa-table-number">'
               '5,221</td><td class="goa-table-number">1,382</td><td class="goa-table-number">1,092</td></tr></tbody>'
               '</table></div>')
    """Table 1 总表。"""

    NOTE = ('<h2>Additional federal spaces</h2><h3>Additional federal immigration spaces for physicians or Francophones'
            '</h3><p>Up to 10,000 federal immigration spaces are available across all provincial nominee programs for '
            'provinces and territories to nominate practice‑ready physicians or Francophones (in Canada or abroad).</p>'
            '<p>Any AAIP nomination issued in 2026 for a physician or Francophone who meets the federal criteria for this '
            'initiative will not count toward Alberta’s 6,603 nomination allocation.</p>')
    """额外联邦名额那节的两段原文(第二段就是 label 要的那句)。"""

    TABLE = ('<h3>Eligibility</h3><p><strong>Table 2.</strong> Nominations issued through additional federal spaces in '
             '2026</p><div class="goa-table"><table class="table"><thead><tr><th>Additional federal space type</th>'
             '<th>2026 nominations issued</th></tr></thead><tbody><tr><td>Physicians</td><td class="goa-table-number">50'
             '</td></tr><tr><td>Francophones</td><td class="goa-table-number">12</td></tr></tbody></table></div>')
    """Table 2 额外联邦名额表。"""

    LABEL = ("Any AAIP nomination issued in 2026 for a physician or Francophone who meets the federal criteria for this "
             "initiative will not count toward Alberta’s 6,603 nomination allocation.")
    """官方原句(弯撇号照页面原样)。"""

    def rows_of(self, body: str) -> tuple:
        """一页 → (累加器, ab_federal_rows 出的逐类行)。"""
        from pnp import functions as fn
        soup = fn.mb_soup_of("<html><body><main>" + body + "</main></body></html>")
        acc = AbStatsAcc(summary={}, streams=[], eoi_pool=[], draws=[], federal=[])
        for t in soup.find_all("table"):
            fn.collect_ab_table(AbTableIn(table=t, acc=acc))
        got = fn.ab_federal_rows(AbFederalIn(rows=acc.federal, text=fn.fold_ws(soup.get_text(" ", strip=True))))
        return (acc, got)

    def test_federal_rows(self) -> None:
        """医生 50、法语者 12 各一行,label 是官方原句;总表照旧(已发 5,221 不含这 62),逐 stream 一行没多。"""
        acc, got = self.rows_of(self.SUMMARY + self.NOTE + self.TABLE)
        self.assertEqual([(r["category"], r["issued"], r["label"]) for r in got],
                         [("Physicians", 50, self.LABEL), ("Francophones", 12, self.LABEL)])
        self.assertEqual(acc.summary, {"allocation": 6603, "issued": 5221, "remaining": 1382, "toProcess": 1092})
        self.assertEqual(acc.streams, [])

    def test_missing(self) -> None:
        """缺那句 → 不出行;缺表 → 不出行。"""
        self.assertEqual(self.rows_of(self.SUMMARY + self.TABLE)[1], [])
        self.assertEqual(self.rows_of(self.SUMMARY + self.NOTE)[1], [])


class OnAuditTest(unittest.TestCase):
    """ON 省审计长附录 1 自测(2026-09-29 立):取合计行不取配额行、各年之和对不上五年合计就整份不用、只补逐年页没有的年份、
    对不上的年份留痕并以逐年页为准。全程不联网、不读仓内文件(原文片段见 LINES)。"""

    LINES = (
        "Appendix 1: \x07Ontario Nominee Allocations and Nominations, by Stream, ",
        "2019–2023............................................................................................81",
        "Ontario reached its nomination limit in each of at least the last five years, 2019–2023. Appendix 1 ",
        "shows the actual nominations issued by streams/intake system in each year from 2019 to 2023.",
        "12",
        "Appendix 1: \x07Ontario Nominee Allocations and ",
        "Nominations, by Stream, 2019–2023",
        "Source of data: Ministry of Labour, Immigration, Training and Skills Development",
        "2019", "2020", "2021", "2022", "2023", "Total", "% of ", "Total", "5-Year ", "Change ", "(%)",
        "Ontario Allocated Nomination Limits1",
        "7,350", "8,050", "9,000", "9,750", "16,500", "50,650", "–", "124",
        "Actual Nominations", " ", " ",
        "Expression of Interest", " ",
        "Masters Graduate", "805", "405", "1,202", "1,480", "5,407", "9,299", "18", "572",
        "Subtotal", "3,641", "4,555", "4,900", "3,601", "8,253", "24,950", "49", "127",
        "Express Entry Human Capital Priorities", "2,710", "1,996", "3,513", "2,370", "4,985 15,574", "31", "84",
        "Subtotal", "3,750", "3,499", "4,100", "6,149", "8,253", "25,751", "51", "120",
        "Total2", "7,391", "8,054", "9,000", "9,750", "16,506", "50,701", "100", " ",
        "1.\t Includes additional in-year allocations approved by IRCC for a federal pilot project intended to expand ")
    """省审计长 2024 年报 PDF(pa_ONimmigrant_en24.pdf)经 pymupdf 抽出的原文片段(2026-09-29 取自真件):目录页同名一行、正文
    第 12 页指向附录 1 的原句、第 84 页附录 1 表头 + 配额行 + 实发提名几行 + 合计行。表名前的控制字符(BEL)与「4,985 15,574」
    两格粘在一行都是真件原样。"""

    def test_table(self) -> None:
        """真件片段:五年实发提名(不是配额那行)+ 原句 + 表名。"""
        from pnp import functions as fn
        got = fn.on_audit_of("\n".join(self.LINES))
        self.assertEqual(got.by_year, {2019: 7391, 2020: 8054, 2021: 9000, 2022: 9750, 2023: 16506})
        self.assertEqual(got.quote, "Appendix 1 shows the actual nominations issued by streams/intake system in each year "
                                    "from 2019 to 2023.")
        self.assertEqual(got.table, "Ontario Nominee Allocations and Nominations, by Stream, 2019–2023")
        self.assertEqual(got.problems, [])

    def test_unreadable(self) -> None:
        """变异探针:合计行错一个数(各年之和对不上五年合计)、原句没了、只剩目录页 —— 一律空表。"""
        from pnp import functions as fn
        lines = list(self.LINES)
        lines[lines.index("16,506")] = "16,560"
        self.assertEqual(fn.on_audit_of("\n".join(lines)).by_year, {})
        self.assertEqual(fn.on_audit_of("\n".join(self.LINES[:2] + self.LINES[5:])).by_year, {})
        self.assertEqual(fn.on_audit_of("\n".join(self.LINES[:5])).by_year, {})

    def test_merge_rows(self) -> None:
        """逐年页有 2019 / 2020 / 2022 / 2024 / 2025:附录覆盖的 2019–2023 五年一律换成审计长行(url 挂审计长 PDF,2021、2023
        是补的,2019、2020 对不上各留痕一行);2024、2025 照用逐年页;年降序(2026-09-29 Frank「用审计长的数」改判)。"""
        from pnp import functions as fn
        from pnp.constants import ONS_AUDIT_URL
        audit = fn.on_audit_of("\n".join(self.LINES))
        page = []
        for year, value in ((2025, 10750), (2024, 21500), (2022, 9750), (2020, 8050), (2019, 7350)):
            page.append({"year": year, "value": value, "url": "page"})
        with mock.patch.object(fn, "say") as said:
            got = fn.on_audit_merge_rows(OnAuditMergeIn(rows=page, audit=audit))
        self.assertEqual([(r["year"], r["value"], r["url"]) for r in got],
                         [(2025, 10750, "page"), (2024, 21500, "page"), (2023, 16506, ONS_AUDIT_URL),
                          (2022, 9750, ONS_AUDIT_URL), (2021, 9000, ONS_AUDIT_URL), (2020, 8054, ONS_AUDIT_URL),
                          (2019, 7391, ONS_AUDIT_URL)])
        self.assertEqual(got[4]["unit"], "nominations")
        self.assertTrue(got[4]["label"].startswith(audit.quote + " Appendix 1: Ontario Nominee Allocations"))
        self.assertTrue(got[4]["label"].endswith("Actual Nominations, Total, 2021"))
        lines = []
        for c in said.call_args_list:
            lines.append(c.args[0])
        self.assertEqual(len(lines), 3)
        self.assertIn("2019", lines[0])
        self.assertIn("7,391", lines[0])
        self.assertIn("2020", lines[1])
        self.assertIn("以审计长附录为准", lines[0])
        self.assertIn("[2021, 2023]", lines[2])
        self.assertIn("换用审计长 [2019, 2020]", lines[2])


class BcFunnelTest(unittest.TestCase):
    """BC 年报四组 SI 逐年数自测(2026-09-29 立):每份年报只认自己那一年、三种历年收件写法、邀请框数字不带千分位、
    2022 那份年报的链接形、清单按年降序且缺组给空清单。原文片段取自真件(pymupdf 抽文,行断照原样),全程不联网。"""

    def test_2025_report(self) -> None:
        """2025 版:决定数 + 邀请框两格出行,单位与节名各自对;收件数(2022 版起停发)不出键。"""
        from pnp import functions as fn
        text = "\n".join([
            "In 2025, the BC PNP made 6,553 decisions on applications to the SI streams. This is a 25.4% ",
            "decrease from the 8,784 decisions made on SI applications in 2024. 6,195 out of the 6,553 ",
            "2025 ITAs Issued: ", "978 ", "2025 ITAs that led ", "to applications: ", "748* ", "2025 ITA ",
            "conversion rate: ", "76.5% "])
        url = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-statistical-report-2025-pdf"
        got = fn.bc_funnel_of(BcFunnelIn(text=text, report=BcReportOut(year=2025, url=url)))
        self.assertEqual(sorted(got), ["siDecisions", "siItaApplications", "siItasIssued"])
        self.assertEqual((got["siDecisions"]["value"], got["siDecisions"]["unit"], got["siDecisions"]["section"]),
                         (6553, "applications", "BC PNP Statistical Report 2025: Skills Immigration Decisions"))
        self.assertEqual(got["siDecisions"]["label"],
                         "In 2025, the BC PNP made 6,553 decisions on applications to the SI streams")
        self.assertEqual((got["siItasIssued"]["value"], got["siItasIssued"]["unit"]), (978, "invitations"))
        self.assertEqual((got["siItaApplications"]["value"], got["siItaApplications"]["unit"]), (748, "applications"))
        self.assertEqual((got["siItaApplications"]["year"], got["siItaApplications"]["url"]), (2025, url))

    def test_own_year_only(self) -> None:
        """上一年的对照数不收:2022 版里「from 2021, when … 7,623 decisions」不出 2021 行;报告年对不上的邀请框不出键。"""
        from pnp import functions as fn
        text = "\n".join([
            "In 2022, the BC PNP made 7,868 decisions on applications to the SI streams. This is a 3.2% ",
            "increase from 2021, when the BC PNP made 7,623 decisions on SI applications. 6,966 out of the "])
        got = fn.bc_funnel_of(BcFunnelIn(text=text, report=BcReportOut(year=2022, url="u")))
        self.assertEqual((list(got), got["siDecisions"]["year"], got["siDecisions"]["value"]),
                         (["siDecisions"], 2022, 7868))
        got = fn.bc_funnel_of(BcFunnelIn(text="2022 ITAs Issued: \n8,840 ", report=BcReportOut(year=2023, url="u")))
        self.assertEqual(got, {})

    def test_received_forms(self) -> None:
        """收件数三种历年写法都取 SI 那一份(不取含 EI 的全部);2020 版邀请框数字不带千分位。"""
        from pnp import functions as fn
        cases = (
            (2021, "In 2021, 7,976 candidates responded to invitations to apply through the SI stream. This is a 2.1 ",
             7976),
            (2019, "In 2019, 8,292 candidates responded to invitations to apply to the BC PNP: 8,024 were SI \n"
                   "applications (96.8 per cent) and 268 were EI applications (3.2 per cent). This is a 10.2 per cent ",
             8024),
            (2018, "In 2018, the BC PNP received 7,507 applications: 7,412 SI applications (98.7 per cent) and 95 EI ",
             7412),
            (2016, "In 2016, the BC Provincial Nominee \nProgram (BC PNP) received 5,363 \napplications: 5,282 Skills "
                   "Immigration (SI) \napplications (98.5 per cent) and 81 ", 5282))
        for year, text, value in cases:
            got = fn.bc_funnel_of(BcFunnelIn(text=text, report=BcReportOut(year=year, url="u")))
            self.assertEqual((list(got), got["siApplicationsReceived"]["value"]), (["siApplicationsReceived"], value))
            self.assertEqual(got["siApplicationsReceived"]["section"], f"BC PNP Statistical Report {year}: Application Intake")
        got = fn.bc_funnel_of(BcFunnelIn(text="2020 ITAs Issued: \n9386 \n2020 ITAs that led \nto applications: \n6988* ",
                                         report=BcReportOut(year=2020, url="u")))
        self.assertEqual((got["siItasIssued"]["value"], got["siItaApplications"]["value"]), (9386, 6988))

    def test_report_links(self) -> None:
        """入口页:两种报告链接形都认(2022 那份年在前、没有 -pdf 尾),别的链接不认。"""
        from pnp import functions as fn
        html = ('<a href="/immigrate-to-b-c/bc-pnp-statistical-report-2023-pdf">Statistical Report 2023</a>'
                '<a href="/immigrate-to-b-c/2022-bc-pnp-statistical-report">Statistical Report 2022</a>'
                '<a href="/immigrate-to-b-c/bc-pnp-statistical-report-2021-pdf">Statistical Report 2021</a>'
                '<a href="/immigrate-to-b-c/skills-immigration-program-guide-2025">Program Guide</a>')
        got = fn.bc_reports_of(html)
        self.assertEqual([(r.year, r.url) for r in got],
                         [(2021, "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-statistical-report-2021-pdf"),
                          (2022, "https://www.welcomebc.ca/immigrate-to-b-c/2022-bc-pnp-statistical-report"),
                          (2023, "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-statistical-report-2023-pdf")])

    def test_lists_of(self) -> None:
        """并进文件的四份清单:按 BC_FUNNEL_SPECS 的序、年降序,一行都没有的组给空清单。"""
        from pnp import functions as fn
        got = fn.bc_funnel_lists_of({"siItasIssued": [{"year": 2020, "value": 1}, {"year": 2025, "value": 2}]})
        self.assertEqual(list(got), ["siDecisions", "siItasIssued", "siItaApplications", "siApplicationsReceived"])
        self.assertEqual([r["year"] for r in got["siItasIssued"]], [2025, 2020])
        self.assertEqual(got["siDecisions"], [])


class DrawSelectionTest(unittest.TestCase):
    """抽选行 selection 码自测(2026-09-27 Frank「照改,加这一列」):MB / BC / NB 各一组手写金标(真行 note 原样)+ 拒猜 +
    变异探针;落盘门的并回口径(本轮行与旧行都先打码,旧行不因多一格留成两行);另读仓里的真抽选文件(draws-mb / bc / nb.json)
    逐行判,只数到核对当日 CAP,各码行数与认不出的原文种类对金标 —— 之后官方每发一轮文件多几行,金标不跟着动;官方或解析器
    改了已有行的 note,这条会红:核对后改金标(这正是它要拦的事)。纯函数用例不联网不读仓;真文件读不到就跳过。"""

    CAP = "2026-09-27"
    """真文件金标只数到这一天(核对当日)。"""

    MB_TOP2 = ("Draw #280: Occupation-specific selections – Top scoring profiles declaring current employment in Manitoba "
               "in Broad Occupational Category 2 – Natural an")
    """MB 第 280 期按大类取高分者那一行的 note(draws-mb.json 原样;块名截在 MB_BLOCK_NAME_CLIP)。"""

    MB_TOP72 = ("Draw #278: Occupation-specific selections – Top scoring profiles declaring current employment in Manitoba "
                "in major group 72 – Technical trades and tran")
    """MB 第 278 期按主组取高分者那一行的 note(原样)。"""

    MB_TOP9 = ("Draw #276: Occupation-specific selections – Top scoring profiles declaring current employment in Manitoba "
               "in broad occupational category 9 – Occupation")
    """MB 第 276 期那一行的 note(原样;官方这一期写小写)。"""

    BC_WAGE = "Minimum wage of $52/hour and $105,000/year, and NOC 0, 1, 2, or 3"
    """BC 2026-09-24 工资档那一行的 note(表格轮 Selection factors 格原样)。"""

    NB_EXP_GRAD = ("Pathways: NB Experience + NB Graduates. Categories: Construction, Education, social and community "
                   "services, Manufacturing, Other trades, Professional and IT, Sa")
    """NB 2026-09-18 那一行的 note(原样;note 截在 DRAWS_NOTE_CLIP)。"""

    GOLD = {
        "MB": {"": 67, "occ": 9, "franco": 5, "grad": 4, "top:2": 1, "top:72": 1, "top:9": 1},
        "BC": {"": 27, "points": 13, "wage:62:125000": 3, "wage:52:105000": 1, "wage:55:110000": 1,
               "wage:58:115000": 1, "wage:59:120000": 1, "wage:70:145000": 1, "wage:84:170000": 1,
               "wage:90:175000": 1},
        "NB": {"": 22, "path:exp+grad": 8, "path:exp": 5, "path:frwork+frprio": 5, "path:grad": 5, "path:frprio": 2,
               "path:exp+prio": 1, "path:frwork": 1},
    }
    """手写金标:核对当日三份真文件(截至 CAP)每种码各几行(MB 88 行认出 21、BC 45 行认出 23、NB 49 行认出 27)。
    2026-09-29 抽选卡重排改金标:BC 表内去重键补上 Selection factors 格(parse_bc_draws),同日同组同分同人数的兽医技术员子轮
    找回 5 行(05-06 / 06-02 / 07-09 / 08-06 / 09-10,都在 CAP 之前),这 5 行没有选取码 —— BC 50 行认出 23,空串 22 → 27。"""

    MISS = {
        "MB": {"": 40, "Expression of Interest": 24, "Region-specific selection (Winkler)": 1,
               "2. Profiles declaring current employment in Manitoba in the unit group listed below were considered.": 1,
               "Close relative in Manitoba selection": 1},
        "BC": {"All priority health care occupations *": 5, "All priority veterinary care occupations": 5,
               "All priority construction occupations *": 4, "Early childhood educators only *": 3,
               "All priority education occupations *": 1, "Early childhood educators *": 1,
               "Early childhood educators only (NOC 42202) *": 1,
               "All priority construction occupations (including workers who have apprenticeships registered with "
               "SkilledTradesBC) *": 1,
               "Minimum wage of $105/hour, currently working full-time in B.C. for the supporting employer, and the "
               "job offer is NOC TEER 0 or 1": 1,
               "Animal health technologists and veterinary technicians (NOC 32104) with valid professional "
               "designation": 5},
        "NB": {"Employment in New Brunswick": 14, "": 7, "NB Priority Occupations": 1},
    }
    """手写金标:同一批行里认不出(空串)的原文种类与行数。种类的取法见 kind_of:MB 取「Draw #N: 」之后那段
    (空串 = 只有期号、整段就是一个通道)、BC 取整条 note、NB 取路径段(空串 = AIP 行没有路径段)。"""

    def sel(self, prov: str, note: str) -> str:
        """跑一次被测的判码(一行)。"""
        from pnp import functions as fn
        return fn.draw_selection_of(DrawSelectionIn(prov=prov, note=note))

    def kind_of(self, prov: str, note: str) -> str:
        """认不出的行归哪一种原文(只给金标分组用,不是被测逻辑)。"""
        if prov == "MB":
            m = re.fullmatch(r"Draw #\d+(?:: (.+))?", note)
            if m is None:
                return note
            return m.group(1) or ""
        if prov == "NB":
            m = re.match(r"Pathways: (.+?)(?:\. Categories: |$)", note)
            if m is None:
                return ""
            return m.group(1)
        return note

    def real_rows(self, prov: str) -> list:
        """仓里的真抽选文件里、截至 CAP 的行(读不到就跳过本用例)。"""
        path = Path(OUT_PNP_DIR) / OUT_DRAWS_FILE_TPL.format(prov=prov.lower())
        if path.exists() is False:
            self.skipTest("仓里没有 " + path.name)
        rows = []
        for r in json.loads(path.read_text(encoding="utf-8"))["provinces"][prov]["draws"]:
            if r["date"] <= self.CAP:
                rows.append(r)
        return rows

    def codes_of(self, prov: str, rows: list) -> Counter:
        """一串行按 note 判码后的计数。"""
        out: Counter = Counter()
        for r in rows:
            out[self.sel(prov, r.get("note") or "")] += 1
        return out

    def test_mb_golden(self) -> None:
        """MB 金标:子选取名逐字全等 → occ(单复数两种官方写法)/ franco / grad;按大类 / 主组取高分者 → top:N(数字照原文,
        大类、主组、官方小写那一期都认)。"""
        cases = [("Draw #280: Occupation-specific selections", "occ"), ("Draw #275: Occupation-specific selection", "occ"),
                 (self.MB_TOP2, "top:2"), (self.MB_TOP72, "top:72"), (self.MB_TOP9, "top:9"),
                 ("Draw #280: Francophone selection", "franco"),
                 ("Draw #279: Completed post-secondary study in Manitoba", "grad")]
        for note, want in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("MB", note), want)

    def test_mb_refuses_to_guess(self) -> None:
        """MB 拒猜:只有期号(整段一个通道)、老公告兜底名、表外选取名、不限高分的「All profiles」、数字后没有破折号(可能截在
        两位数中间)、截在数字前、子标题换了大小写或单复数写错、不是 MB note 的形、空串 → 一律空串。"""
        top = "Draw #280: Occupation-specific selections – Top scoring profiles declaring current employment in Manitoba in "
        cases = ["Draw #280", "Draw #247: Expression of Interest", "Draw #236: Region-specific selection (Winkler)",
                 "Draw #233: Close relative in Manitoba selection",
                 "Draw #235: 2. Profiles declaring current employment in Manitoba in the unit group listed below were "
                 "considered.",
                 "Draw #279: Occupation-specific selections – All profiles declaring current employment in Manitoba in "
                 "Broad Occupational Category 3 – Health occupations",
                 top + "Broad Occupational Category 1", top + "Broad Occupational Category",
                 self.MB_TOP2.replace("Occupation-specific", "occupation-specific"),
                 "Draw #280: occupation-specific selections", "Draw #280: Francophone selections",
                 "Occupation-specific selections", "Draw #280 Francophone selection", ""]
        for note in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("MB", note), "")

    def test_bc_golden(self) -> None:
        """BC 金标:工资档两种官方写法(表格轮 / 散文轮与存档 PDF)→ wage:时薪:年薪(去千分位);分数档两种写法 → points。"""
        cases = [(self.BC_WAGE, "wage:52:105000"),
                 ("A minimum wage of $62/hour and $125,000/year, and a job offer in NOC TEER 0, 1, 2 or 3",
                  "wage:62:125000"),
                 ("A minimum wage of $90/hour and $175,000/year, and a job offer in NOC TEER 0, 1, 2 or 3",
                  "wage:90:175000"),
                 ("Points", "points"), ("A minimum score of 138 points", "points")]
        for note, want in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("BC", note), want)

    def test_bc_refuses_to_guess(self) -> None:
        """BC 拒猜:只写时薪没写年薪(存档 2025-05-08 那轮)、Care / Build 的职业类别行、小数时薪、年薪单位写法不同、整格小写、
        分数没写数、分数档后面还跟别的条件、空串 → 一律空串(不出半截码)。"""
        cases = ["Minimum wage of $105/hour, currently working full-time in B.C. for the supporting employer, and the job "
                 "offer is NOC TEER 0 or 1",
                 "Early childhood educators only *", "All priority health care occupations *",
                 self.BC_WAGE.replace("$52/hour", "$52.50/hour"), self.BC_WAGE.replace("/year", "/yr"),
                 "points", "A minimum score of points", "A minimum score of 138 points and a job offer", ""]
        for note in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("BC", note), "")

    def test_nb_golden(self) -> None:
        """NB 金标:路径段逐条换短码、照 note 先后用 + 连;类别段截断、没有类别段、类别段里带官方备注都不影响。"""
        cases = [(self.NB_EXP_GRAD, "path:exp+grad"),
                 ("Pathways: NB Experience + NB Priorities. Categories: Construction trades, Health care", "path:exp+prio"),
                 ("Pathways: Francophone Workers in New Brunswick + NB Francophone Priorities. Categories: All sectors",
                  "path:frwork+frprio"),
                 ("Pathways: NB Francophone Priorities. Categories: All sectors", "path:frprio"),
                 ("Pathways: NB Graduates. Categories: All sectors, Note: The June 16 & 17 draw was limited to candidates "
                  "with work permits expiring in 2025", "path:grad"),
                 ("Pathways: NB Experience", "path:exp")]
        for note, want in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("NB", note), want)

    def test_nb_refuses_to_guess(self) -> None:
        """NB 拒猜:表外路径(Employment in New Brunswick)、与 NB Priorities 写法不同的「NB Priority Occupations」、两条里有一条
        认不出(整行空串,不出 path:exp 半截码)、AIP 行没有路径段、截在「. Categories」标记中间、官方全名没缩写(不是 note 的形)、
        路径段是空的、空串 → 一律空串。"""
        cases = ["Pathways: Employment in New Brunswick. Categories: All sectors",
                 "Pathways: NB Priority Occupations. Categories: Health care",
                 "Pathways: NB Experience + Employment in New Brunswick. Categories: All sectors",
                 "Categories: Transportation, Manufacturing", "Pathways: NB Experience. Categ",
                 "Pathways: New Brunswick Experience. Categories: All sectors", "Pathways: . Categories: All sectors",
                 "Pathways: NB Experience, NB Graduates. Categories: All sectors", ""]
        for note in cases:
            with self.subTest(note=note):
                self.assertEqual(self.sel("NB", note), "")

    def test_other_provinces_empty(self) -> None:
        """三省之外一律空串(ON 区域轮、NL 批次注、AB 空注);认法按省分派,MB 的注拿到 BC 判、BC 的注拿到 NB 判都不认。"""
        cases = [("ON", "Targeted draw for Southwestern Ontario."), ("NL", "NLPNP – 61, AIP – 01"), ("AB", ""),
                 ("QC", "Minimum score by invitation profile: 782, 741"), ("BC", "Draw #280: Francophone selection"),
                 ("NB", self.BC_WAGE), ("MB", "Pathways: NB Experience. Categories: All sectors")]
        for prov, note in cases:
            with self.subTest(prov=prov, note=note):
                self.assertEqual(self.sel(prov, note), "")

    def test_text_mutation_probe(self) -> None:
        """变异探针(原文):码跟着原文里的数字 / 次序走 —— 改大类号、主组号、时薪年薪,码当场跟着变;千分位有无同码;
        NB 两条路径倒过来写,码照 note 先后倒过来(不替原文重排)。"""
        self.assertEqual(self.sel("MB", self.MB_TOP2.replace("Category 2 ", "Category 7 ")), "top:7")
        self.assertEqual(self.sel("MB", self.MB_TOP72.replace("group 72 ", "group 73 ")), "top:73")
        self.assertEqual(self.sel("BC", self.BC_WAGE.replace("$52/hour and $105,000", "$53/hour and $106,000")),
                         "wage:53:106000")
        self.assertEqual(self.sel("BC", self.BC_WAGE.replace("$105,000", "$105000")), "wage:52:105000")
        self.assertEqual(self.sel("NB", self.NB_EXP_GRAD.replace("NB Experience + NB Graduates",
                                                                 "NB Graduates + NB Experience")), "path:grad+exp")

    def test_rule_tables_probe(self) -> None:
        """变异探针(规则表):把 MB 子选取表清空,occ / franco / grad 当场认不出(top 不走表照认);NB 路径表拿掉 NB Priorities,
        「NB Experience + NB Priorities」整行空串(不出 path:exp 半截码);BC 分数档正则只剩「Points」,散文写法当场认不出 ——
        证明判码读的就是 constants 那几张表。"""
        from pnp import functions as fn
        with mock.patch.object(fn, "MB_SEL_CODES", {}):
            self.assertEqual(self.sel("MB", "Draw #280: Francophone selection"), "")
            self.assertEqual(self.sel("MB", "Draw #280: Occupation-specific selections"), "")
            self.assertEqual(self.sel("MB", self.MB_TOP2), "top:2")
        nb = dict(fn.NB_SEL_CODES)
        del nb["NB Priorities"]
        with mock.patch.object(fn, "NB_SEL_CODES", nb):
            self.assertEqual(self.sel("NB", "Pathways: NB Experience + NB Priorities. Categories: Health care"), "")
            self.assertEqual(self.sel("NB", self.NB_EXP_GRAD), "path:exp+grad")
        with mock.patch.object(fn, "BC_SEL_POINTS_RE", re.compile(r"Points")):
            self.assertEqual(self.sel("BC", "A minimum score of 138 points"), "")
            self.assertEqual(self.sel("BC", "Points"), "points")

    def test_mark_and_merge(self) -> None:
        """落盘门的并回口径:本轮行与旧行都先按现行规则打码 —— ① 新代码上线后第一轮,旧文件里没这一格的同一行不留两行;
        ② 旧行已带码、空着的格本轮填上了(MB 第 272 期人数 None → 104)照旧只留本轮那行;③ 旧行带着按旧规则判的码,重判后
        与本轮一致、不留两行;④ 只在历史里的旧行也补上码(认得出的给码,认不出的给空串)。
        变异探针:同样的输入跳过打码直接并回(merged_draws_of),② 那行就留成两行 —— 证明「先打码再并回」这一步不能省。"""
        from pnp import functions as fn
        fr = {"date": "2026-09-24", "stream": "Skilled Worker in Manitoba", "checklistKey": "Francophone selection",
              "note": "Draw #280: Francophone selection", "score": None, "invitations": 16}
        sws = {"date": "2026-06-04", "stream": "Skilled Worker Stream", "note": "Draw #272", "score": None,
               "invitations": 104}
        old_sws = dict(sws)
        old_sws["invitations"] = None
        old_sws["selection"] = ""
        stale = dict(fr)
        stale["selection"] = "francophone"
        grad = {"date": "2025-03-21", "stream": "Skilled Worker in Manitoba",
                "checklistKey": "Completed post-secondary study in Manitoba",
                "note": "Draw #241: Completed post-secondary study in Manitoba", "score": 844, "invitations": 101}
        winkler = {"date": "2025-01-09", "stream": "Skilled Worker Overseas",
                   "checklistKey": "Region-specific selection (Winkler)",
                   "note": "Draw #236: Region-specific selection (Winkler)", "score": 615, "invitations": 52}
        first = [dict(fr), dict(old_sws), dict(grad), dict(winkler)]
        restale = [dict(stale), dict(old_sws), dict(grad), dict(winkler)]
        for old in (first, restale):
            label = old[0].get("selection")
            got = fn.mark_and_merge_draws(MergeDrawsIn(prov="MB", new=[dict(fr), dict(sws)], old={"MB": {"draws": old}}))
            with self.subTest(old=label):
                self.assertEqual([(r["note"], r["invitations"], r["selection"]) for r in got],
                                 [("Draw #280: Francophone selection", 16, "franco"), ("Draw #272", 104, ""),
                                  ("Draw #241: Completed post-secondary study in Manitoba", 101, "grad"),
                                  ("Draw #236: Region-specific selection (Winkler)", 52, "")])
        bare = fn.merged_draws_of(MergeDrawsIn(prov="MB", new=[dict(sws)], old={"MB": {"draws": [dict(old_sws)]}}))
        self.assertEqual(len(bare), 2)
        got = fn.mark_and_merge_draws(MergeDrawsIn(prov="MB", new=[dict(sws)], old={"MB": {"draws": [dict(old_sws)]}}))
        self.assertEqual(len(got), 1)

    def test_real_files(self) -> None:
        """金标:仓里三份真抽选文件截至 CAP 的行,各码行数对 GOLD、认不出的原文种类与行数对 MISS(报告里的计数表即此)。"""
        for prov in ("MB", "BC", "NB"):
            with self.subTest(prov=prov):
                rows = self.real_rows(prov)
                self.assertEqual(dict(self.codes_of(prov, rows)), self.GOLD[prov])
                miss: Counter = Counter()
                for r in rows:
                    if self.sel(prov, r.get("note") or "") == "":
                        miss[self.kind_of(prov, r.get("note") or "")] += 1
                self.assertEqual(dict(miss), self.MISS[prov])

    def test_real_files_mutation_probe(self) -> None:
        """变异探针(真文件):把真行原文改掉一处 —— MB「Occupation-specific」去掉连字符,occ 与 top 共 12 行全成空串、franco / grad
        不动;BC「/year」改「/yr」,10 行工资档全成空串、points 不动;NB「NB Graduates」少个 s,带 grad 的 13 行全成空串 ——
        证明金标数是判码读原文读出来的,不是碰巧。"""
        cases = [("MB", "Occupation-specific", "Occupation specific", {"": 79, "franco": 5, "grad": 4}),
                 ("BC", "/year", "/yr", {"": 37, "points": 13}),
                 ("NB", "NB Graduates", "NB Graduate", {"": 35, "path:exp": 5, "path:frwork+frprio": 5,
                                                        "path:frprio": 2, "path:exp+prio": 1, "path:frwork": 1})]
        for prov, old, new, want in cases:
            with self.subTest(prov=prov):
                rows = []
                for r in self.real_rows(prov):
                    m = dict(r)
                    m["note"] = str(r.get("note") or "").replace(old, new)
                    rows.append(m)
                self.assertEqual(dict(self.codes_of(prov, rows)), want)


# =========================================================================
# 41. NB / NL 往年提名(2026-09-29)
# =========================================================================


@dataclass
class NbYearRowsIn:
    """nb_year_rows() 入参:一份 PETL 年报 KPI 表读出的年 → 数,与它出自哪份年报(2026-09-29 立)。"""

    by_year: dict
    """自然年 → 省提名(PNP)行的数。"""

    url: str
    """年报 PDF 地址(进每行出处)。"""

    fy: str
    """年报财年(section 用,如「2024-2025」)。"""


@dataclass
class NlReportIn:
    """nl_nominated_row_of() 入参:一份 IPGS 年报全文与它的出处(2026-09-29 立)。"""

    text: str
    """PDF 全文(原样,空白在函数里折)。"""

    url: str
    """年报 PDF 地址(进该行出处)。"""

    fy: str
    """年报财年(section 用,如「2024-25」)。"""


@dataclass
class ReportDirIn:
    """report_list_of() 入参:一省的年报目录页、链接形与已核实清单(2026-09-29 立,Frank「只抓取然后取数」)。"""

    prov: str
    """省码(留痕用)。"""

    index_urls: tuple
    """目录页,按序读(NL 两页:当前页 + 往年页;NB 一页)。"""

    href_re: re.Pattern
    """本省年报链接的形(第 1 组路径、第 2 组起始年、第 3 组结束年)。"""

    site_base: str
    """链接路径前面补的站根(完整网址的补空串)。"""

    fy_tpl: str
    """本省财年写法的模板(与已核实清单同形)。"""

    known: tuple
    """已核实清单((网址, 财年) 对,财年升序)。"""

    timeout_s: int
    """目录页每次请求的超时。"""


@dataclass
class ReportLinksIn:
    """report_links_of() 入参:一张目录页原文与本省链接形(2026-09-29 立;链接形三格同 ReportDirIn)。"""

    html: str
    """目录页原文。"""

    href_re: re.Pattern
    """本省年报链接的形。"""

    site_base: str
    """链接路径前面补的站根。"""

    fy_tpl: str
    """本省财年写法的模板。"""


@dataclass
class ReportListOut:
    """report_list_of() 出参:本轮要读的年报与目录页可不可用。"""

    reports: list
    """(网址, 财年) 对,财年升序:已核实清单在前,新一期接在后面。"""

    dir_ok: bool
    """目录页取到且每页都认出了年报;False = 只剩已核实清单(调用方据此查旧表会不会丢期)。"""


@dataclass
class NewReportsIn:
    """new_reports_of() 入参(2026-09-29 立)。"""

    known: tuple
    """已核实清单。"""

    found: list
    """目录页认出的全部年报(几页并在一起,可能有同一财年的两份)。"""


@dataclass
class LostUrlsIn:
    """lost_urls_of() 入参:本轮要读的年报与上一版落盘(2026-09-29 立)。"""

    todo: ReportListOut
    """本轮要读的年报。"""

    path: Path
    """上一版落盘处(nb-stats.json / nl-stats.json)。"""

    key: str
    """逐年行所在的清单键(NB nominationsIssued、NL nominatedIndividuals)。"""


class NbNlStatsTest(unittest.TestCase):
    """NB / NL 往年提名自测(2026-09-29 立):NB 年报 KPI 表(真页行序原样)读出三个自然年、AIP 行的数不混进来、表形不对给空表;
    NL 两种措辞的原句(真页原句,PDF 换行落在句中)读出自然年与人数、label 是整句原句、单位是人,年对不上 / 只剩 AIP 的数 /
    没有原句都不出行。全程不联网、不读仓内文件。"""

    def nb_lines(self) -> list[str]:
        """NB 2024-2025 年报第 25 页 KPI 表一带的文本行(pymupdf 抽出来的原样,行尾带空格)。"""
        return ["concerns and provides internal divisional administrative support. ", "Key Performance Indicators* ",
                "Provincial Nominations ", "2024 ", "2023 ", "2022 ", "Provincial Nominee Program (PNP) ", "3,000 ",
                "3,167 ", "2,584 ", "Atlantic Immigration Program (AIP) ", "2,500 ", "2,228 ", "489 ",
                "Certificates issued to International Graduates ", "3,425 ", "2,547 ", "1,233 ", " ", " "]

    def test_nb_table_golden(self) -> None:
        """金标:三个自然年的 PNP 行照读,AIP 行(2,500 / 2,228 / 489)不进;空行夹在格间也照读。"""
        from pnp import functions as fn
        self.assertEqual(fn.nb_nominations_of("\n".join(self.nb_lines())), {2024: 3000, 2023: 3167, 2022: 2584})
        spaced = []
        for line in self.nb_lines():
            spaced += [line, " "]
        self.assertEqual(fn.nb_nominations_of("\n".join(spaced)), {2024: 3000, 2023: 3167, 2022: 2584})

    def test_nb_table_probes(self) -> None:
        """变异探针:没表头 / 没 PNP 行 / PNP 行的数不够 / 数不是数字 / AIP 行排到 PNP 前面(看远了会读错表)→ 一律空表。"""
        from pnp import functions as fn
        lines = self.nb_lines()
        no_title = [s for s in lines if s.strip() != "Provincial Nominations"]
        no_pnp = [s for s in lines if s.strip() != "Provincial Nominee Program (PNP)"]
        short = lines[:9] + lines[10:]
        bad_num = lines[:8] + ["n/a "] + lines[9:]
        aip_first = lines[:6] + lines[10:14] + lines[6:10] + lines[14:]
        for case in (no_title, no_pnp, short, bad_num, aip_first):
            self.assertEqual(fn.nb_nominations_of("\n".join(case)), {})
        self.assertEqual(fn.nb_nominations_of(""), {})

    def test_nb_year_rows(self) -> None:
        """行形:年降序;单位 nominations;label 表头 + 行名 + 年;section 带年报财年;出处照入参。"""
        from pnp import functions as fn
        rows = fn.nb_year_rows(NbYearRowsIn(by_year={2023: 3167, 2024: 3000}, url="u", fy="2024-2025"))
        self.assertEqual([(r["year"], r["value"], r["unit"], r["url"]) for r in rows],
                         [(2024, 3000, "nominations", "u"), (2023, 3167, "nominations", "u")])
        self.assertEqual(rows[0]["label"], "Provincial Nominations, Provincial Nominee Program (PNP), 2024")
        self.assertEqual(rows[0]["section"],
                         "PETL Annual Report 2024-2025: Key Performance Indicators, Provincial Nominations")

    def nl_2024(self) -> str:
        """NL 2024-25 年报第 11 页原文(pymupdf 抽出来的换行原样)。"""
        return ("In the 2024 calendar year, the province welcomed approximately 5,755 new permanent \n"
                "residents, exceeding the original goal of welcoming 4,500 in 2024.  \n"
                "• The AIP endorsed 2,491 individuals for permanent residency, and the PNP nominated \n"
                "5,065 individuals. These 7,556 people are on the path to becoming permanent residents. \n")

    def nl_2023(self) -> str:
        """NL 2023-24 年报第 9 页原文(同上)。"""
        return ("In 2023, the province welcomed 5,485 new permanent residents, exceeding the original \n"
                "goal of welcoming 3,950 in 2023.  \n"
                "• The two main immigration pathways offered by IPGS are the Atlantic Immigration \n"
                "Program (AIP), under which 1,628 individuals were endorsed for permanent residency \n"
                "in 2023, and the Newfoundland and Labrador Provincial Nominee Program (NLPNP), \n"
                "under which 4,838 newcomers were nominated for permanent residency in 2023. \n"
                "These 6,466 individuals are on a pathway to becoming permanent residents in six \n")

    def test_nl_quotes_golden(self) -> None:
        """金标:两种措辞各读出(自然年, 人数);单位是人;label 是折过空白的整句原句;section 带年报财年。"""
        from pnp import functions as fn
        new = fn.nl_nominated_row_of(NlReportIn(text=self.nl_2024(), url="u24", fy="2024-25"))
        old = fn.nl_nominated_row_of(NlReportIn(text=self.nl_2023(), url="u23", fy="2023-24"))
        assert new is not None and old is not None
        self.assertEqual((new["year"], new["value"], new["unit"], new["url"]), (2024, 5065, "people", "u24"))
        self.assertEqual((old["year"], old["value"], old["unit"], old["url"]), (2023, 4838, "people", "u23"))
        self.assertEqual(new["label"], "The AIP endorsed 2,491 individuals for permanent residency, "
                                       "and the PNP nominated 5,065 individuals.")
        self.assertTrue(old["label"].startswith("The two main immigration pathways offered by IPGS are "))
        self.assertTrue(old["label"].endswith("(NLPNP), under which 4,838 newcomers were nominated "
                                              "for permanent residency in 2023."))
        self.assertEqual(new["section"], "IPGS Annual Report 2024-25: Report on Performance")

    def test_nl_quote_probes(self) -> None:
        """变异探针:句尾年与段首年对不上 / 删掉 NLPNP 那半句(只剩 AIP 的 1,628)/ 删掉 PNP 那半句 / 空文 → 不出行。"""
        from pnp import functions as fn
        year_off = self.nl_2023().replace("permanent residency in 2023. \n", "permanent residency in 2022. \n")
        nlpnp_half = (", and the Newfoundland and Labrador Provincial Nominee Program (NLPNP), \n"
                      "under which 4,838 newcomers were nominated for permanent residency in 2023")
        aip_only = self.nl_2023().replace(nlpnp_half, "")
        no_pnp = self.nl_2024().replace(", and the PNP nominated \n5,065 individuals", "")
        for text in (year_off, aip_only):
            self.assertNotEqual(text, self.nl_2023())
        self.assertNotEqual(no_pnp, self.nl_2024())
        for text in (year_off, aip_only, no_pnp, ""):
            self.assertIsNone(fn.nl_nominated_row_of(NlReportIn(text=text, url="u", fy="x")))


class ReportDirTest(unittest.TestCase):
    """年报目录页发现新一期自测(2026-09-29 立,Frank「只抓取然后取数」):两省目录页真页原文(httpx 取回的 HTML 行原样)认出
    年报链接与财年、别的 PDF / 别的机构 / 改名前的部门不认;新一期只收财年晚于已核实清单的、同一财年留后认出的;目录页取不到 /
    认不出只交回已核实清单并留痕;旧表里有已核实清单以外的年报才算会丢期。全程不联网(fetch_html 换成桩)。"""

    def nb_page(self) -> str:
        """NB 部门「Publications and reports」页(petl-publications.html)Annual reports 一节的两条 + 同页会议纪要一条(原样)。"""
        return "\n".join([
            '            <a class="cmp-list__item-link" href="/content/dam/GNB3/org/petl-epft/doc/annual-report-2024-2025'
            '.pdf">Annual Report 2024-2025 (PDF 812 KB)',
            '            <a class="cmp-list__item-link" href="/content/dam/GNB3/org/petl-epft/doc/annual-report-2023-2024'
            '.pdf">Annual Report 2023-2024 (PDF 777 KB)',
            '            <a class="cmp-list__item-link" href="/content/dam/GNB3/org/petl-epft/doc/meeting-summary-accessibi'
            'lity-advisory-board-meeting-2.pdf">Summary Meeting 2 - January 17, 2025 (PDF 158 KB)'])

    def nl_current(self) -> str:
        """NL Annual Reports 当前页那一条(原样:链接文字是部门名,年只在文件名里)。"""
        return ('<li><a href="https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2024-2025.pdf" target="_blank" '
                'rel="attachment noopener wp-att-49271">Immigration, Population Growth and Skills</a></li>')

    def nl_archive(self) -> str:
        """NL Archived Annual Reports 页:部门一节前五条 + 学徒委员会一条(原样)。"""
        return "\n".join([
            '<li><a href="https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2023-2024.pdf" target="_blank" rel="noopener">'
            '2023-2024 Immigration, Population Growth and Skills Annual Report</a></li>',
            '<li><a href="https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2022-2023.pdf" target="_blank" rel="noopener">'
            '2022-2023 Immigration, Population Growth and Skills Annual Report</a> (2.61MB)</li>',
            '<li><a href="https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2021-22.pdf" target="_blank" rel="noopener">'
            '2021-2022 Immigration, Population Growth and Skills Annual Report</a> (3.0 MB)</li>',
            '<li><a href="https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2020-21.pdf" target="_blank" rel="attachment '
            'noopener wp-att-47183">2020-2021 Immigration, Population Growth and Skills Annual Report</a> (1.2 MB)</li>',
            '<li><a href="https://www.assembly.nl.ca/business/electronicdocuments/ISLAnnualReport2019-20.pdf">2019-2020 '
            'Immigration, Skills and Labour Annual Report</a> (1.9 MB)</li>',
            '<li><a href="https://www.gov.nl.ca/jgrd/files/PACBAnnualReport2023-24.pdf" target="_blank" rel="noopener">'
            'Provincial Apprenticeship and Certification Board Annual Report 2023-24</a></li>'])

    def nb_dir(self, known: tuple) -> ReportDirIn:
        """NB 目录页入参(桩页地址随便给,fetch_html 换成桩)。"""
        return ReportDirIn(prov="NB", index_urls=("nb-index",), href_re=NBS_REPORT_HREF_RE, site_base=NBS_SITE_BASE,
                           fy_tpl=NBS_FY_TPL, known=known, timeout_s=1)

    def nl_dir(self, known: tuple) -> ReportDirIn:
        """NL 目录页入参(当前页 + 往年页两张桩页)。"""
        return ReportDirIn(prov="NL", index_urls=("nl-current", "nl-archive"), href_re=NLS_REPORT_HREF_RE,
                           site_base=NLS_SITE_BASE, fy_tpl=NLS_FY_TPL, known=known, timeout_s=1)

    def test_nb_links_golden(self) -> None:
        """金标:NB 两份年报补站根、财年照链接写「2024-2025」形、按财年升序;会议纪要 PDF 不认。"""
        from pnp import functions as fn
        got = fn.report_links_of(ReportLinksIn(html=self.nb_page(), href_re=NBS_REPORT_HREF_RE,
                                               site_base=NBS_SITE_BASE, fy_tpl=NBS_FY_TPL))
        base = "https://www.gnb.ca/content/dam/GNB3/org/petl-epft/doc/annual-report-"
        self.assertEqual(got, [(base + "2023-2024.pdf", "2023-2024"), (base + "2024-2025.pdf", "2024-2025")])

    def test_nl_links_golden(self) -> None:
        """金标:NL 两页的 IPGS 年报五份,财年一律折成「2024-25」形(四位、两位结束年都有);改名前的 ISL(议会站)与
        学徒委员会 PACB 的年报不认。"""
        from pnp import functions as fn
        html = self.nl_current() + "\n" + self.nl_archive()
        got = fn.report_links_of(ReportLinksIn(html=html, href_re=NLS_REPORT_HREF_RE, site_base=NLS_SITE_BASE,
                                               fy_tpl=NLS_FY_TPL))
        self.assertEqual([fy for _, fy in got], ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25"])
        self.assertEqual(got[-1][0], "https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2024-2025.pdf")
        self.assertEqual(got[1][0], "https://www.gov.nl.ca/jgrd/files/IPGSAnnualReport2021-22.pdf")

    def test_links_probes(self) -> None:
        """变异探针:部门改名换了文件名前缀(IPGS → JGRD)/ NB 路径换了部门目录 / 链接不是 .pdf → 一份都不认。"""
        from pnp import functions as fn
        renamed = self.nl_current().replace("IPGSAnnualReport", "JGRDAnnualReport")
        moved = self.nb_page().replace("/petl-epft/", "/jgr-emc/")
        not_pdf = self.nb_page().replace(".pdf", ".html")
        for html, rx, base, tpl in ((renamed, NLS_REPORT_HREF_RE, NLS_SITE_BASE, NLS_FY_TPL),
                                    (moved, NBS_REPORT_HREF_RE, NBS_SITE_BASE, NBS_FY_TPL),
                                    (not_pdf, NBS_REPORT_HREF_RE, NBS_SITE_BASE, NBS_FY_TPL)):
            self.assertEqual(fn.report_links_of(ReportLinksIn(html=html, href_re=rx, site_base=base, fy_tpl=tpl)), [])

    def test_new_reports(self) -> None:
        """新一期:只收财年晚于已核实清单最新一份的;已核实的财年(目录页给的是另一个网址)与更早的不收;同一财年留后认出的;
        升序。已核实清单财年写坏 → 抛错(调用方整份保留旧表)。"""
        from pnp import functions as fn
        known = (("assembly-2023", "2023-24"), ("gov-2024", "2024-25"))
        found = [("a", "2020-21"), ("gov-2023", "2023-24"), ("x", "2024-25"), ("c", "2026-27"), ("b1", "2025-26"),
                 ("b2", "2025-26")]
        got = fn.new_reports_of(NewReportsIn(known=known, found=found))
        self.assertEqual(got, [("b2", "2025-26"), ("c", "2026-27")])
        self.assertEqual(fn.new_reports_of(NewReportsIn(known=known, found=found[:3])), [])
        with self.assertRaises(ValueError):
            fn.new_reports_of(NewReportsIn(known=(("u", "FY2024"),), found=[]))

    def test_list_new_edition(self) -> None:
        """目录页认出新一期:接在已核实清单后面、dir_ok,留痕一行写明财年与网址;NL 往年页里的 2020-21 等旧年报不进清单。"""
        from pnp import functions as fn
        new_line = self.nb_page().replace("2024-2025", "2025-2026").replace("812 KB", "800 KB")
        known = (("legnb-2024", "2024-2025"),)
        with (mock.patch.object(fn, "fetch_html", return_value=self.nb_page() + "\n" + new_line),
              mock.patch.object(fn, "say") as said):
            got = fn.report_list_of(self.nb_dir(known))
        url = "https://www.gnb.ca/content/dam/GNB3/org/petl-epft/doc/annual-report-2025-2026.pdf"
        self.assertEqual((got.reports, got.dir_ok), ([("legnb-2024", "2024-2025"), (url, "2025-2026")], True))
        self.assertEqual(said.call_count, 1)
        self.assertIn("2025-2026", said.call_args[0][0])
        self.assertIn(url, said.call_args[0][0])
        with (mock.patch.object(fn, "fetch_html", side_effect=[self.nl_current(), self.nl_archive()]) as fetched,
              mock.patch.object(fn, "say") as said):
            got = fn.report_list_of(self.nl_dir((("assembly-2023", "2023-24"), ("gov-2024", "2024-25"))))
        self.assertEqual((got.reports, got.dir_ok), ([("assembly-2023", "2023-24"), ("gov-2024", "2024-25")], True))
        self.assertEqual([c[0][0].url for c in fetched.call_args_list], ["nl-current", "nl-archive"])
        self.assertEqual(said.call_count, 0)

    def test_list_fallbacks(self) -> None:
        """目录页取不到(第二页网络错)/ 当前页认不出(改名)/ 往年页认不出 → 只交回已核实清单、dir_ok=False,各留痕一行。"""
        from pnp import functions as fn
        known = (("gov-2024", "2024-25"),)
        renamed = self.nl_current().replace("IPGSAnnualReport", "JGRDAnnualReport")
        cases = (([self.nl_current(), fn.httpx.ConnectError("offline")], "取不到"),
                 ([renamed, self.nl_archive()], "没认出"),
                 ([self.nl_current(), "<html></html>"], "没认出"))
        for pages, word in cases:
            with (mock.patch.object(fn, "fetch_html", side_effect=pages),
                  mock.patch.object(fn, "say") as said):
                got = fn.report_list_of(self.nl_dir(known))
            self.assertEqual((got.reports, got.dir_ok), ([("gov-2024", "2024-25")], False))
            self.assertEqual(said.call_count, 1)
            self.assertIn(word, said.call_args[0][0])

    def test_lost_urls(self) -> None:
        """会不会丢期:目录页不可用、旧表里有已核实清单以外的出处 → 交回那些网址;目录页可用 / 旧表全在清单里 / 旧表不在 → 空。"""
        from pnp import functions as fn
        known = [("u23", "2023-24"), ("u24", "2024-25")]
        rows = [{"year": 2025, "url": "gov-2025"}, {"year": 2024, "url": "u24"}, {"year": 2023, "url": "u23"}]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nl-stats.json"
            path.write_text(json.dumps({"nominatedIndividuals": rows, "nominationsIssued": []}), encoding="utf-8")
            down = ReportListOut(reports=known, dir_ok=False)
            self.assertEqual(fn.lost_urls_of(LostUrlsIn(todo=down, path=path, key="nominatedIndividuals")),
                             ["gov-2025"])
            self.assertEqual(fn.lost_urls_of(LostUrlsIn(todo=down, path=path, key="nominationsIssued")), [])
            up = ReportListOut(reports=known, dir_ok=True)
            self.assertEqual(fn.lost_urls_of(LostUrlsIn(todo=up, path=path, key="nominatedIndividuals")), [])
            gone = Path(tmp) / "missing.json"
            self.assertEqual(fn.lost_urls_of(LostUrlsIn(todo=down, path=gone, key="nominatedIndividuals")), [])
