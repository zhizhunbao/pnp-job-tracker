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
"""
from dataclasses import dataclass
from typing import Callable

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

    old: dict
    """上一轮的 provinces 块(抓失败/解析空 → 原样保留)。"""


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

    m: object
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

    client: object
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
class NbSegPickIn:
    """nb_seg_of() 入参:按 any / food 取通告的哪一段。"""

    segs: NbSegsOut
    """切好的两段。"""

    key: str
    """要取哪段(K_ANY / K_FOOD)。"""


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

    table: object
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

    m: object
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

    table: object
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

    table: object
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

    table: object
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
