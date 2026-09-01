"""
mart 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 pnp/scheme.py 与 ee/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时第三方库内部 import types 当场炸)。
本域形状三档:
① **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体(不是外来数据,不上 pydantic);
② **多返回值收编 XxxOut** = dataclass —— 原来 `return a, b` 的元组一律收成具名格;
③ **跨段累加器 XxxCtx** = dataclass —— 原来靠闭包共享的可变累加器(companies/jobs/seen/计数)
   收成显式载体:原 `build()` 一个 500 行大函数里的 add_company/add_job 两个内嵌函数出户成
   顶层具名函数后,它们改写的那几个集合必须显式传递(方言律⑪内嵌禁令的直接后果);
   原 `LATE_SALARY = [0]` 这种「列表当可变整数」的土办法随之退役,成 ctx 的一个 int 格。

mart 产出行**不上 dataclass**:一表一形共 27 张、列名即 DB 列名(camelCase),
**逐格顺序即文件契约**(seed 直接灌库、cms 直接读)—— 行构造一律住 functions 的 `to_*`
行构造器(方言律⑩:json 边界的键只许住 to_*),形状真相是那些 to_* 函数本身。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass
from datetime import date
from pathlib import Path


# =========================================================================
# 1. 共享词汇(库形 Protocol + 落盘/报数的公共入参)
# =========================================================================


@dataclass
class SalaryGuards:
    """五道薪资护栏各自的拦截计数(原 clean/04d 的模块级 GUARDED dict —— functions 顶层
    不许有常量、更不许有可变状态,收成显式载体逐层传)。

    住共享段而不是第 18 段:两处消费 —— 第 18 段(薪资清洗本体,收尾要报)与第 8 段
    (岗位装配的薪资兜底,MartCtx 带一份、不报)。声明还必须排在 MartCtx 前面:
    dataclass 的字段注解在建类那一刻求值,写在后面会 NameError。
    """

    absurd: int
    """金额本身离谱(单个数 ≥ 年薪上限)。"""

    ratio: int
    """区间高/低比离谱。"""

    cap: int
    """年化后仍超顶。"""

    gig: int
    """计次/计程价,不年化。"""

    hifold: int
    """高时薪只展示不折年薪。"""


@dataclass
class TableWriteIn:
    """write_mart_tables() 入参:一轮 27 张表 + 输出目录。"""

    tables: dict
    """表名 → 行清单。"""

    out_dir: Path
    """data/mart/ 目录(Path)。"""


# =========================================================================
# 2. 档位库:职位三维档(E12-08)
# =========================================================================


@dataclass
class GradeChannelIn:
    """grade_channel() 入参。"""

    noc: str
    """NOC 码(空串 = 未分类)。"""

    teer: int | None
    """TEER 0-5,判不出为 None。"""

    pnp_stream: str | None
    """省具名通道标签,没命中为 None。"""

    pnp_eligible: bool
    """粗筛是否可走雇主 offer 省提名。"""


@dataclass
class GradeSalaryIn:
    """grade_salary() 入参。"""

    salary_annual: float | None
    """帖面折算年薪(缺 = None/0)。"""

    wage_med_annual: float | None
    """该 NOC×省 的 ESDC 中位年薪(缺 = None/0)。"""


@dataclass
class GradeEmpIn:
    """grade_emp() 入参。"""

    term: str | None
    """雇佣期限(permanent/…;未标注为 None)。"""

    hours: str | None
    """工时(full/…;未标注为 None)。"""

    direct: bool
    """是不是第一方直发。"""


@dataclass
class JobGradesIn:
    """job_grades() 入参(职位三维一次算齐)。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER。"""

    pnp_stream: str | None
    """省具名通道标签。"""

    pnp_eligible: bool
    """省提名粗筛位。"""

    salary_annual: float | None
    """帖面折算年薪。"""

    wage_med_annual: float | None
    """ESDC 中位年薪。"""

    term: str | None
    """雇佣期限。"""

    hours: str | None
    """工时。"""

    direct: bool
    """第一方直发位。"""


@dataclass
class JobGradesOut:
    """job_grades() 出参(原 `return ch["g"], detail` 元组收编)。"""

    channel: int
    """通道档(1-5),单列下发主表「通道」列。"""

    detail: dict
    """score_detail jsonb 三维明细。"""

@dataclass
class GradeCellIn:
    """to_grade() 入参:一格档位的两格。"""

    g: int
    """档(1-5)。"""

    v: object
    """原始值(数字 / 标签 / 命中项清单 / 明细 dict)。"""

@dataclass
class CutsIn:
    """grade_of_cuts() 入参:一个百分差 + 一张「从高到低的 (割点, 档)」表。"""

    pct: float
    """百分差。"""

    cuts: tuple
    """割点表(顺序即优先级)。"""

@dataclass
class JobDetailIn:
    """to_job_grade_detail() 入参:职位三维各自的格。"""

    channel: dict
    """通道维。"""

    salary: object
    """薪资维(可 None 不评)。"""

    emp: dict
    """雇佣维。"""


# =========================================================================
# 3. 档位库:公司四维档(E12-08)
# =========================================================================


@dataclass
class GradeSponsorIn:
    """grade_sponsor() 入参。"""

    skilled: int | None
    """技能类(非农业/季节股)LMIA 获批岗位数。"""

    total: int | None
    """LMIA 获批岗位总数。"""

    last_quarter: str | None
    """最近有记录的季度('2025Q4')。"""

    aip: bool
    """是不是 AIP 指定雇主。"""


@dataclass
class GradeActiveIn:
    """grade_active() 入参。"""

    open_jobs: int
    """在库在招岗数。"""

    new30: int
    """近 30 天新发岗数。"""


@dataclass
class GradeFameIn:
    """grade_fame() 入参。"""

    wiki: bool
    """有没有维基条目。"""

    provinces: int
    """在招岗覆盖几个省。"""

    open_jobs: int
    """在库在招岗数。"""


@dataclass
class CompanyGradesIn:
    """company_grades() 入参(公司四维一次算齐)。"""

    skilled: int | None
    """技能类 LMIA 岗位数。"""

    total: int | None
    """LMIA 岗位总数。"""

    last_quarter: str | None
    """LMIA 最近季度。"""

    aip: bool
    """AIP 指定雇主位。"""

    open_jobs: int
    """在库在招岗数。"""

    new30: int
    """近 30 天新发岗数。"""

    avg_pct: float | None
    """该司帖面 vs 同 NOC 中位的均值 %(无样本 = None)。"""

    wiki: bool
    """维基位。"""

    provinces: int
    """覆盖省数。"""


@dataclass
class CompanyGradesOut:
    """company_grades() 出参。"""

    sponsor: int | None
    """担保档(药丸用;全无记录且非 AIP = None 不评)。"""

    detail: dict
    """score_detail jsonb 四维明细。"""

@dataclass
class SponsorValueIn:
    """to_sponsor_value() 入参。"""

    skilled: int
    """技能类获批岗位数。"""

    total: int
    """获批岗位总数。"""

    quarter: object
    """最近有记录的季度。"""

    aip: bool
    """AIP 指定雇主位(为真才多一格)。"""

@dataclass
class CompanyDetailIn:
    """to_company_grade_detail() 入参:公司四维各自的格。"""

    sponsor: object
    """担保维(可 None 不评)。"""

    active: dict
    """活跃维。"""

    salary: object
    """薪资维(可 None)。"""

    fame: dict
    """知名维。"""


# =========================================================================
# 4. 身份预筛(GAP1③:JD 正文 → 红旗 + 命中原句)
# =========================================================================


@dataclass
class VisaQuoteIn:
    """visa_quote() 入参:命中处所在句的粗切范围。"""

    text: str
    """JD 全文。"""

    start: int
    """命中片段起点。"""

    end: int
    """命中片段终点。"""


@dataclass
class VisaFlagOut:
    """detect_visa_flag() 出参(原 `(flag, quote)` 元组收编;没命中 = 两格 None)。"""

    flag: str | None
    """'no_sponsorship' / 'pr_required' / None。"""

    quote: str | None
    """命中原句(citation 惯例,可核验)/ None。"""

@dataclass
class VisaEscapeIn:
    """visa_escaped() 入参:命中片段的两端位置 + 全文。"""

    text: str
    """JD 全文。"""

    start: int
    """命中起点。"""

    end: int
    """命中终点。"""


# =========================================================================
# 5. 评分:省表装载与资格判定(原 08_score 上半)
# =========================================================================


@dataclass
class PnpTables:
    """各省 PNP 维护表装载结果(原 08_score 三个模块级全局的收编)。

    原脚本在 import 时就把三张表算进模块级常量(`PNP_BY_PROV = _load_pnp_tables()`),
    functions.py 顶层只许函数(方言律②)后无处安放 —— 收成本形状,由各步入口装载一次
    再逐层显式传入(值与旧全局逐字同源,判定函数一个字未改)。
    """

    by_prov: dict
    """province → {"type", "nocs", "blocked", "streams"}。"""

    named_by_prov: dict
    """province → 具名通道 NOC 并集(score() 的 +12「省点名招」按它算)。"""

    ee_by_noc: dict
    """NOC → 联邦 EE 类别中文标签(多类别 / 连接)。"""


@dataclass
class PnpJudgeIn:
    """pnp_eligible() / pnp_direct() / any_pr_path() 三个判定的共同入参。"""

    tables: PnpTables
    """省表装载结果。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER(None = 未分类,调用方留空不硬判)。"""

    prov: str
    """省码。"""


@dataclass
class PnpStreamIn:
    """pnp_stream() 入参。"""

    tables: PnpTables
    """省表装载结果。"""

    noc: str
    """NOC 码。"""

    prov: str
    """省码。"""

@dataclass
class PnpMergeIn:
    """merge_pnp_table() 入参:把一份省表并进该省累计桶。"""

    bucket: dict
    """该省的累计桶。"""

    kind: str
    """表语义(indemand / ineligible)。"""

    overlay: bool
    """叠加式排除开关。"""

    nocs: set
    """本表的 NOC 集。"""

    label: str
    """具名通道标签(inclusion 表才用得上)。"""

@dataclass
class PnpStreamBucketIn:
    """to_pnp_stream_bucket() 入参。"""

    label: str
    """通道标签。"""

    nocs: set
    """该通道的 NOC 集。"""


# =========================================================================
# 6. 评分:打分与产出(原 08_score 下半)
# =========================================================================


@dataclass
class ScoreIn:
    """score() 入参。"""

    tables: PnpTables
    """省表装载结果。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER。"""

    prov: str
    """省码。"""

    acc: str
    """可及性档(co-op/junior/intermediate/senior/unknown)。"""

    agency: bool
    """是不是中介发布。"""


@dataclass
class CollectedJob:
    """collect_jobs() 的一条产出(原 `yield (ext, title, agency, prov, hint)` 五元组收编)。"""

    ext: str
    """externalId(loader 的 join 键)。"""

    title: str
    """职位标题。"""

    agency: bool
    """中介位。"""

    prov: str
    """省码。"""

    hint: str
    """源自带的 NOC(Job Bank 官方 NOC 优先于标题猜)。"""


@dataclass
class ScoredRowIn:
    """to_scored_row() 入参。"""

    tables: PnpTables
    """省表装载结果。"""

    job: CollectedJob
    """一条待评分的岗。"""

@dataclass
class AtsExtIn:
    """ats_ext_of() 入参:一条 ATS 岗 + 它所在的公司目录名。"""

    job: dict
    """岗位原始格。"""

    folder: str
    """公司目录名(没有 URL 时的兜底前缀)。"""


# =========================================================================
# 7. mart:公司装配
# =========================================================================


@dataclass
class MartCtx:
    """mart 主表装配的跨段累加器(原 build() 闭包变量的显式载体)。"""

    scored: dict
    """externalId → 08 评分行。"""

    wages: dict
    """NOC → 省码 → ESDC 工资格。"""

    enrich: dict
    """slug → 公司官网富化(简介/行业/官网)。"""

    pilot_occ_sets: dict
    """社区名 → 在收 NOC 集合(RCIP/FCIP 并集)。"""

    expired: set
    """验尸判死的 externalId(jb: 前缀形)。"""

    salary_guards: SalaryGuards
    """薪资兜底现算现补时喂给 apply_salary_to 的护栏计数器。
    ⚠ 2026-08-31 批J:薪资归一件溶进本域第 18 段后,这里不再拉模块对象(原
    `apply_salary: SalaryModuleLike` 按路径拉 clean/04d),改成域内直调 —— 兜底走的
    仍是同一把尺子(现在是字面上的同一个函数)。汇装这一路的护栏计数不报,
    与溶解前拉模块时各自持有一份 GUARDED 的行为相同。"""

    companies: dict
    """slug → 公司行(装配中)。"""

    jobs: list
    """岗位行(装配中)。"""

    seen: set
    """company-slug|title 展示去重集。"""

    seen_ext: set
    """externalId 去重集。"""

    seen_ids: set
    """本轮**真实见过**的 posting(不受展示去重影响;seed 下架对账只认它)。"""

    dropped_expired: int
    """本轮被验尸名单剔除的帖数(报数用)。"""

    late_salary: int
    """本轮抢在 04d 之后落盘、由 09 现算现补的新帖数(报数用)。"""


@dataclass
class CompanyExtraIn:
    """to_ats_company_extra() / to_jb_company_extra() 的共同出参形不另立 —— 两者直接返回
    dict(键序即 companies 行的列序契约)。本形是 add_company() 的入参。
    """

    ctx: MartCtx
    """装配累加器。"""

    name: str
    """公司名。"""

    slug: str
    """公司 slug。"""

    extra: dict
    """来源侧带来的补充列(键序即落盘列序)。"""


@dataclass
class LmiaWindows:
    """LMIA 时间窗(B4:官方粒度=季度,窗=全表最新季往回 4/2/1 季)。"""

    w4: set
    """近 4 季(≈近一年)。"""

    w2: set
    """近 2 季(≈近半年)。"""

    w1: set
    """最近一季。"""


@dataclass
class LmiaFillIn:
    """fill_company_lmia() 入参。"""

    company: dict
    """一家公司行(就地补 lmia* 列)。"""

    entry: dict
    """该公司在 LMIA 聚合表里的记录。"""

    windows: LmiaWindows
    """时间窗。"""


@dataclass
class CompanyAgg:
    """公司四维档的在库聚合(原 agg.setdefault 的匿名 dict)。"""

    open_jobs: int
    """在招岗数。"""

    new30: int
    """近 30 天新发岗数。"""

    pcts: list
    """帖面 vs 中位的百分差样本。"""

    provs: set
    """覆盖省集合。"""

    aip: bool
    """有没有 AIP 岗。"""

@dataclass
class CompanyRowIn:
    """to_company_row() 入参。"""

    name: str
    """公司名。"""

    slug: str
    """公司 slug。"""

    extra: dict
    """来源侧补充列(键序即落盘列序)。"""

@dataclass
class QuarterSumIn:
    """quarter_positions() 入参:逐季明细 + 一个时间窗。"""

    quarters: dict
    """季度 → 该季记录。"""

    window: set
    """要求和的季度集。"""


# =========================================================================
# 8. mart:岗位装配
# =========================================================================


@dataclass
class AtsJobIn:
    """to_ats_job_fields() 入参:一条 ATS 岗 + 它所属公司档的两格。"""

    job: dict
    """ATS jobs.json 里的一条。"""

    ats: str
    """ATS 板名(profile 侧的 jobs.json.ats,缺则 'ats')。"""

    website: str | None
    """公司官网(officialUrl)。"""

    seen_at: str
    """本轮抓取时刻(jobs.json 落盘时间,与 JB 的 last_seen 同义)。"""


@dataclass
class AddJobIn:
    """add_job() 入参。"""

    ctx: MartCtx
    """装配累加器。"""

    external_id: str
    """externalId。"""

    company_slug: str
    """公司 slug。"""

    fields: dict
    """来源侧字段(键序即落盘列序;pilotOcc/datePosted 由 add_job 就地覆写)。"""


@dataclass
class JobRowIn:
    """to_job_row() 入参:落盘一行岗所需的全部已算好的料。"""

    external_id: str
    """externalId。"""

    company_slug: str
    """公司 slug。"""

    fields: dict
    """来源侧字段(已归一 datePosted / 已补 pilotOcc)。"""

    scored: dict
    """该岗的 08 评分行(缺 = 空 dict)。"""

    cls: dict
    """noc → teer/broad/mid/fine 分类结果。"""

    wage: dict
    """该 NOC×省 的 ESDC 工资格。"""

    grades: JobGradesOut
    """职位三维档。"""

    score: int | None
    """移民价值分(#100 薪资分位调整后)。"""


@dataclass
class JdFlagIn:
    """fill_jd_bodies() 的逐岗计数器(原闭包 matched/flagged 的显式载体)。"""

    matched: int
    """写入 description 的岗数。"""

    no_sponsorship: int
    """命中「明确不担保」的岗数。"""

    pr_required: int
    """命中「须 PR/公民」的岗数。"""

@dataclass
class SourceLabelIn:
    """source_label() 入参。"""

    apply_url: str
    """投递地址。"""

    source: str
    """原始来源板。"""

@dataclass
class FillSalaryIn:
    """fill_salary() 入参。"""

    ctx: MartCtx
    """装配累加器(计数器在里面)。"""

    job: dict
    """待兜底的岗(就地改写)。"""

@dataclass
class PilotOccIn:
    """pilot_occ_of() 入参。"""

    community: str
    """岗位所在试点社区(空 = 非试点岗)。"""

    occ_set: set | None
    """该社区的在收 NOC 集合(None = 该社区清单无 NOC)。"""

    noc: str
    """岗位 NOC(空 = 判不了)。"""

@dataclass
class WageOfIn:
    """wage_of() 入参。"""

    wages: dict
    """NOC → 省码 → 工资格。"""

    noc: str
    """NOC 码。"""

    province: str
    """省码。"""

@dataclass
class MvScoreIn:
    """mv_score_of() 入参。"""

    base: int | None
    """评分步给的基分(None = 该岗没分,不调整)。"""

    salary_annual: float | None
    """帖面折算年薪。"""

    wage_med_annual: float | None
    """ESDC 中位年薪。"""

@dataclass
class DirectOfIn:
    """direct_of() 入参。"""

    apply_url: str
    """投递地址。"""

    source: str | None
    """原始来源板。"""

@dataclass
class JbExtIn:
    """mart_jb_ext_of() 入参。"""

    job: dict
    """Job Bank 帖。"""

    key: str
    """展示去重键(最末一档兜底)。"""


# =========================================================================
# 9. mart:维度表
# =========================================================================


@dataclass
class CityKey:
    """城市维度的去重键(原 (city, province) 元组)。"""

    name: str
    """城市名。"""

    province: str
    """省码。"""


@dataclass
class CatI18nIn:
    """to_noc_category_row() 入参。"""

    keys: tuple
    """(broad, mid, fine, teer) 四元组(teer 用 -1 表 None,排序稳定)。"""

    i18n: dict
    """中文名 → (英文名, 韩文名)。"""

@dataclass
class ProvFillIn:
    """fill_tr_stock() 入参。"""

    info: dict
    """省码 → 体量卡(就地填)。"""

    data: dict
    """IRCC 存量表。"""

@dataclass
class TrRefIn:
    """tr_ref_of() 入参。"""

    year: str
    """要取的年份。"""

    quarters: list
    """全部可用参考日(已排序)。"""

@dataclass
class TrRefOut:
    """tr_ref_of() 出参(原元组 + 嵌套三目退役)。"""

    ref: str | None
    """参考日(None = 该年没有可用点)。"""

    label: str | None
    """asOf 标注。"""

@dataclass
class StockCellIn:
    """to_stock_cell() 入参。"""

    n: int | None
    """人数。"""

    year: str
    """年份。"""

@dataclass
class TrSeriesCellIn:
    """to_tr_series_cell() 入参。"""

    cell: dict
    """StatCan 该参考日的原始格。"""

    label: str | None
    """asOf 标注。"""

@dataclass
class StudyFlowIn:
    """to_study_flow_cell() 入参。"""

    latest: str
    """最新年份。"""

    years: dict
    """年份 → 该年各格。"""

@dataclass
class ProvinceRowIn:
    """to_province_row() 入参。"""

    code: str
    """省码。"""

    name: str
    """省全名。"""

    info: dict | None
    """体量卡 jsonb(空 = None)。"""

@dataclass
class CityBuildIn:
    """build_cities() 入参。"""

    jobs: list
    """在库岗(只列实际有岗的市)。"""

    i18n: dict
    """城市译名表。"""

@dataclass
class CityRowIn:
    """to_city_row() 入参。"""

    name: str
    """城市名。"""

    province: str
    """省码。"""

    i18n: dict
    """城市译名表。"""

@dataclass
class DistrictRowIn:
    """to_district_row() 入参。"""

    name: str
    """区名。"""

    city: str
    """所属市。"""

    province: str
    """所属省。"""

@dataclass
class FieldValuesIn:
    """field_values_of() 入参:取某一列的非空取值集。"""

    jobs: list
    """在库岗。"""

    key: str
    """列名。"""

@dataclass
class NlEmployerIn:
    """to_nl_employer_row() 入参。"""

    employer: dict
    """官网名录里的一家。"""

    fetched: str
    """表级取回日。"""

@dataclass
class PilotEmployerIn:
    """to_pilot_employer_row() 入参。"""

    row: dict
    """社区指定雇主的一行。"""

    fetched: str
    """表级取回日。"""


# =========================================================================
# 10. mart:pnp 五表
# =========================================================================


@dataclass
class StatValOut:
    """stat_val() 出参:整数才进 value,官方抑制/不适用值原文留 valueText。"""

    value: int | None
    """整数值,或 None。"""

    text: str
    """原文(value 为 None 时才有内容)。"""


@dataclass
class OpsCtx:
    """build_pnp_ops_stats() 的行累加器(原内嵌 add() 的闭包 rows/seqs)。"""

    rows: list
    """已收的指标行。"""

    seqs: dict
    """(province, metric) → 组内序号游标(重跑顺序一致)。"""


@dataclass
class OpsRowIn:
    """add_ops_row() 入参(原内嵌 add(base, metric, …, text="", section="", period=None)
    的十参形;禁默认值后由调用方逐格写全 —— 原来吃默认值的三格分别写空串 / 空串 / None)。
    """

    ctx: OpsCtx
    """行累加器。"""

    base: dict
    """本行的出处底座(province/program/asOf/period/url/fetched)。"""

    metric: str
    """指标固定词表里的一项。"""

    scope: str
    """通道/行业/分数段/阶段(省级留空)。"""

    kind: str
    """scope 的种类(stream/sector/category/scoreRange/stage;省级留空)。"""

    label: str
    """官方措辞原文(不翻译不改写)。"""

    raw: object
    """官方给的原始值(整数才进 value)。"""

    unit: str
    """单位(spots/people/weeks/months/…;不换算)。"""

    text: str
    """非整数值的原文(官方抑制/自由文本;没有就空串)。"""

    section: str
    """官方小标题(没有就空串)。"""

    period: str | None
    """统计期(None = 本行不带 period 键 —— 原默认值语义,键在不在都是契约)。"""


@dataclass
class ExpandAppliesIn:
    """expand_applies() 入参。"""

    applies: dict
    """官方那条 appliesTo(nocs / anyTrade)。"""

    universe: list
    """NOC 全集(官方名录,不是「库里出现过的岗位」)。"""


@dataclass
class ReqRowIn:
    """to_pnp_requirement_row() 入参。"""

    base: dict
    """表级底座(province/program/url/pageUrl/effective/fetched)。"""

    rule: dict
    """源表 requirements[] 里的一条。"""

    seq: int
    """表内序号。"""


@dataclass
class ScoreFactorIn:
    """to_pnp_score_factor_row() 入参。"""

    fbase: dict
    """因素级底座(表级 + factor/factorMax/factorGroup/groupMax)。"""

    kind: str
    """'rows' 或 'bonus'(落盘时 rows → row)。"""

    seq: int
    """档内序号。"""

    item: dict
    """一档原始格。"""

    universe: list
    """NOC 全集(展开「任何技工工种」用)。"""


@dataclass
class DrawRowIn:
    """to_pnp_draw_row() 入参。"""

    base: dict
    """省级底座(province/label/scale/url/fetched)。"""

    draw: dict
    """一次抽选的原始格。"""

    stream_zh: dict
    """英文通道名 → 中文灰注(缓存没有就留 None)。"""

@dataclass
class PnpOccIn:
    """to_pnp_occupation_row() 入参。"""

    table: dict
    """所属省表(表级列)。"""

    label: str
    """具名通道标签。"""

    occupation: dict
    """一条职业。"""

@dataclass
class DrawsBuildIn:
    """build_pnp_draws() 入参。"""

    stream_zh: dict
    """通道名中文灰注缓存。"""

    ee_history: dict
    """联邦 EE 历次抽选(#135:并进同一张表,province='FED')。"""

    ee_fetched: str
    """联邦抽选表的取回日。"""

@dataclass
class DrawBaseIn:
    """to_draw_base() 入参。"""

    province: str
    """省码。"""

    table: dict
    """该省的抽选块。"""

    fetched: str
    """表级取回日。"""

@dataclass
class NoticeRowIn:
    """to_pnp_notice_row() 入参。"""

    base: dict
    """省级底座。"""

    notice: dict
    """改制通告。"""

@dataclass
class EeDrawIn:
    """to_ee_draw_row() 入参。"""

    category: str
    """类别 key(落进 label)。"""

    draw: dict
    """一次抽选。"""

    fetched: str
    """取回日。"""

@dataclass
class FactorBaseIn:
    """to_score_factor_base() 入参。"""

    base: dict
    """表级底座。"""

    name: str
    """因素名。"""

    factor: dict
    """因素原始块。"""

    gmax: dict
    """官方分组上限表。"""

@dataclass
class ScoreRuleIn:
    """to_pnp_score_rule_row() 入参。"""

    fbase: dict
    """因素级底座。"""

    factor: dict
    """因素原始块(rule/floorAt/capAt 三格进 json 串)。"""

@dataclass
class BasisIn:
    """basis_parts_of() 入参。"""

    basis: str
    """原 basis 串(可能是空串)。"""

    code: str
    """要折进去的编码值。"""

@dataclass
class StatValIn:
    """stat_val() 入参。"""

    raw: object
    """官方给的原始值。"""

    text: str
    """非整数值的原文(没有就空串)。"""

@dataclass
class OpsProvIn:
    """五个 fill_*_ops() 的共同入参。"""

    ctx: OpsCtx
    """行累加器。"""

    base: dict
    """表级底座。"""

    data: dict
    """该省的运营统计表。"""

@dataclass
class SubBaseIn:
    """to_ops_sub_base() 入参:某一节自带出处时的底座覆写。"""

    base: dict
    """表级底座。"""

    block: dict
    """自带 url/fetched 的那一节。"""

    as_of: str
    """该节的口径日(没有就空串)。"""

@dataclass
class MbBlockIn:
    """fill_mb_monthly_ops() 入参。"""

    ctx: OpsCtx
    """行累加器。"""

    base: dict
    """月度页底座。"""

    monthly: dict
    """月度数据块。"""

    page: str
    """月度页名(「MPNP Monthly Data 2026」)。"""

    year: str
    """报告年。"""

    ytd: str
    """年内累计期次(写明到哪个月)。"""

@dataclass
class MbAnnualIn:
    """fill_mb_annual_ops() 入参。"""

    ctx: OpsCtx
    """行累加器。"""

    base: dict
    """年报底座。"""

    annual: dict
    """年报块。"""

    year: str
    """报告年。"""

    section: str
    """年报节名。"""

@dataclass
class OpsRowOut:
    """to_ops_row() 入参(名字带 Out 是因为它装的是 add_ops_row 算完的结果:
    值已过 stat_val、序号已排定 —— 到这一步只剩逐格写进落盘行)。"""

    base: dict
    """出处底座。"""

    metric: str
    """指标名。"""

    scope: str
    """范围。"""

    kind: str
    """范围种类。"""

    label: str
    """官方措辞。"""

    got: StatValOut
    """值/原文两格。"""

    unit: str
    """单位。"""

    section: str
    """官方小标题。"""

    seq: int
    """组内序号。"""

    period: str | None
    """统计期(None = 不落该键)。"""


# =========================================================================
# 11. mart:ee 三表
# =========================================================================


@dataclass
class NumericRangeOut:
    """numeric_range() 出参:官方分数格的保守数值化。"""

    low: float | None
    """下界(识别不了 = None)。"""

    high: float | None
    """上界(开区间 = None)。"""

    kind: str
    """exact / minimum / range / text。"""


@dataclass
class EePointsIn:
    """build_ee_points_grid() 入参。"""

    crs_src: Path
    """CRS 排名分源(Path)。"""

    elig_src: Path
    """资格门槛 + FSW 67 分表源(Path)。"""


@dataclass
class LangCellIn:
    """to_ee_language_row() 入参。"""

    table: dict
    """所属表(program/test/tableNo/benchmark/url/fetched)。"""

    row: dict
    """所属行(rowNo/levelText/nocTeer)。"""

    cell: dict
    """一格(column/valueText)。"""

    level: NumericRangeOut
    """行档位的数值化结果。"""

    seq: int
    """全表内递增序号。"""

@dataclass
class EeDrawsOut:
    """load_ee_draws() 出参(原三个局部变量一起返回)。"""

    by_category: dict
    """类别 key → 最近一次抽选。"""

    history: dict
    """类别 key → 历次抽选。"""

    fetched: str
    """表级取回日。"""

@dataclass
class EeCategoryIn:
    """to_ee_category_row() 入参。"""

    table: dict
    """类别表(表级列)。"""

    category: dict
    """一个类别。"""

    occupation: dict
    """该类别下的一个职业。"""

    draw: dict
    """该类别最近一次抽选(没有 = 空 dict)。"""

@dataclass
class EePointsRowIn:
    """to_ee_points_row() 入参。"""

    grid: str
    """分制('CRS' / 'FSW67')。"""

    row: dict
    """上游已解析好的一行。"""

    seq: int
    """官方页内原序。"""


# =========================================================================
# 12. mart:试点三表
# =========================================================================


@dataclass
class PilotQuotaIn:
    """build_pilot_quota() 入参(批E 起 rcip/fcip 两文件读并集)。"""

    srcs: list
    """名额状态源清单。"""

    communities_srcs: list
    """社区名单源清单(判双身份 type 用)。"""


@dataclass
class QuotaRowIn:
    """to_pilot_quota_row() 入参。"""

    row: dict
    """一行原始格(社区级或社区×NOC 级)。"""

    type_of: dict
    """社区名 → 'RCIP' / 'FCIP' / 'RCIP+FCIP'。"""

    occupation: bool
    """True = 社区×NOC 满额行(带 status/quote/url);False = 社区级名额状态行。"""

@dataclass
class PilotRowIn:
    """to_pilot_community_row() / to_pilot_occupation_row() 的共同入参。"""

    row: dict
    """一行原始格。"""

    fetched: str
    """表级取回日。"""


# =========================================================================
# 13. mart:新闻与直通表
# =========================================================================


@dataclass
class NewsExcerptIn:
    """news_excerpt() 入参。"""

    title: str
    """标题(判「标题复读行」用)。"""

    body: str
    """英文正文。"""


@dataclass
class NewsRowIn:
    """to_news_row() 入参。"""

    item: dict
    """raw 累积表里的一条。"""

    slug: str
    """稳定 slug(date + 标题 slug 化,同 slug 撞车加序号)。"""

    fallback_fetched: str
    """表级 fetched(条目自带 fetchedAt 时不用)。"""

@dataclass
class NewsSlugIn:
    """news_slug_of() 入参。"""

    item: dict
    """一条新闻。"""

    seen: set
    """已用过的 slug(撞车加序号)。"""

@dataclass
class DliRowIn:
    """to_dli_row() 入参。"""

    row: dict
    """上游行(直通)。"""

    url: str
    """着陆页地址(逐行出处)。"""

    fetched: str
    """抓取日。"""

@dataclass
class NocDescIn:
    """build_noc_descriptions() 入参。"""

    jobs: list
    """在库岗(只收出现过的 NOC,控制前端 payload)。"""

    i18n: dict
    """NOC 译名表。"""

@dataclass
class NocDescRowIn:
    """to_noc_description_row() 入参。"""

    noc: str
    """NOC 码。"""

    entry: dict
    """官方名录里的该条。"""

    fetched: str
    """表级取回日。"""

    i18n: dict
    """该 NOC 的译名格。"""

@dataclass
class NocOpeningsIn:
    """build_noc_openings() 入参。"""

    jobs: list
    """在库岗。"""

    descriptions: list
    """noc_descriptions 表(取官方名/译名)。"""

@dataclass
class ClosedJobIn:
    """to_closed_job_row() 入参。"""

    pid: str
    """裸 posting_id(落盘时加 jb: 前缀)。"""

    closed_at: str
    """判死时刻。"""


# =========================================================================
# 14. mart:装配与落盘
# =========================================================================


@dataclass
class NocOpeningIn:
    """to_noc_opening_row() 入参。"""

    noc: str
    """NOC 码。"""

    bucket: dict
    """该 NOC 的在招聚合桶(open/eligible/sal/broad)。"""

    desc: dict
    """该 NOC 的官方名行(缺 = 空 dict)。"""


# =========================================================================
# 15. 榜单(E5-02)
# =========================================================================


@dataclass
class RankJobRowIn:
    """to_rank_job_row() 入参。"""

    slug: str
    """榜单 slug(即 URL 段)。"""

    rank: int
    """名次(1 起)。"""

    job: dict
    """mart.jobs 的一行。"""


@dataclass
class SponsorAgg:
    """最可能担保雇主榜的公司聚合桶(原 agg.setdefault 的匿名 dict)。"""

    name: str
    """公司名。"""

    open_jobs: int
    """在招岗数。"""

    named: int
    """省具名通道命中岗数。"""

    scores: list
    """评分样本。"""

    provs: set
    """覆盖省集合。"""

    official: str
    """官网(取第一条非空)。"""

    lmia: int
    """技能类 LMIA 获批岗位数(第一排序键)。"""

    lmia_quarter: str
    """LMIA 最近季度。"""


@dataclass
class SponsorRowIn:
    """to_sponsor_row() 入参。"""

    slug: str
    """公司 slug。"""

    rank: int
    """名次。"""

    agg: SponsorAgg
    """该公司的聚合桶。"""

@dataclass
class RankNamesIn:
    """fill_company_names() 入参。"""

    jobs: list
    """mart.jobs(就地补 companyName)。"""

    companies: dict
    """slug → 公司行。"""

@dataclass
class SponsorBuildIn:
    """build_sponsor_likely() 入参。"""

    jobs: list
    """mart.jobs。"""

    companies: dict
    """slug → 公司行(取 LMIA 两列)。"""

@dataclass
class SponsorAggIn:
    """to_sponsor_agg() 入参。"""

    name: str
    """公司名。"""

    company: dict
    """该公司的 mart 行。"""

@dataclass
class SponsorBumpIn:
    """bump_sponsor_agg() 入参。"""

    agg: SponsorAgg
    """该公司的聚合桶。"""

    job: dict
    """一条在招岗。"""


# =========================================================================
# 16. 地区统计(E5-04 / E8-14 / E13 / E14)
# =========================================================================


@dataclass
class FlowStatsOut:
    """build_flow_stats() 出参(原 `return dict(flow), avg_open, dict(daily_closed)` 三元组收编)。"""

    flow: dict
    """(noc, province|'all') → 流量指标格。"""

    avg_open: dict
    """(noc, province|'all') → 平均在招天数(样本 <5 = None)。"""

    daily_closed: dict
    """(province, broad) → 当日下架计数。"""


@dataclass
class FlowWindows:
    """build_flow_stats() 的五条时间线(原五个局部变量,逐格传给行判定)。"""

    today: date
    """今天。"""

    cut14: date
    """T−14d。"""

    cut28: date
    """T−28d。"""

    cut30: date
    """T−30d。"""

    cut60: date
    """T−60d。"""

    mom30_gated: bool
    """分母窗起点撞抓取爬坡期 → 整列 mom30d 写 null。"""


@dataclass
class FlowRec:
    """一条参与流量统计的帖(原 recs 里的四元组)。"""

    noc: str
    """NOC 码。"""

    prov: str
    """省码(大写)。"""

    posted: date | None
    """发布日(解析不出 = None)。"""

    pid: str
    """posting_id。"""


@dataclass
class FlowAddIn:
    """bump_flow() 入参:把一条帖记进它所属的各个流量桶。"""

    flow: dict
    """流量桶。"""

    keys: list
    """本条帖归属的 (noc, province|'all') 键。"""

    rec: FlowRec
    """本条帖。"""

    closed_date: date | None
    """判死日(台账没有 = None)。"""

    windows: FlowWindows
    """时间线。"""


@dataclass
class SponsorOfIn:
    """sponsor_of() 入参(E14-02 担保率,只喂 stats_occupation 的 province='all' 全国行)。"""

    quarter: str | None
    """LMIA ∩ JVWS 的最近共同季度(None = 四列整列写 None)。"""

    lmia: dict
    """NOC → 该季 LMIA 获批岗位数。"""

    jvws: dict
    """NOC → 该季 JVWS 全国空缺行。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER(副指标口径按本 NOC 的 TEER,不是 LMIA 项目股别)。"""


@dataclass
class StatsAggIn:
    """stats_agg() 入参。"""

    jobs: list
    """桶内岗位。"""

    cut7: str
    """7 天前的 ISO 日期(new7d 门槛)。"""


@dataclass
class FlowOfIn:
    """flow_of() 入参。"""

    flow: dict
    """流量桶。"""

    avg_open: dict
    """平均在招天数。"""

    key: tuple
    """(noc, province|'all')。"""


@dataclass
class ChannelTierIn:
    """channel_tier() 入参(E13-07 通道四档)。"""

    named_any: set
    """全国任一省具名通道命中的 NOC 并集。"""

    ee_by_noc: dict
    """联邦 EE 类别 NOC 表。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER。"""


@dataclass
class StatsRowIn:
    """to_stats_row() 入参。"""

    key: tuple
    """(province, broad, mid)。"""

    jobs: list
    """桶内岗位。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    today: str
    """本轮 fetched。"""

    difficulty: dict
    """省码 → 难度指数 jsonb 串。"""


@dataclass
class OccRowIn:
    """to_occupation_row() 入参:职业 × 省 的一行。"""

    base: dict
    """该 NOC 的三级分类与译名底座。"""

    province: str
    """省码,或 'all' 全国行。"""

    jobs: list
    """该格的岗位。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    flow: FlowOfIn
    """流量指标查询件。"""

    national: "OccNationalIn | None"
    """全国行专属料(OccNationalIn),省级行为 None。"""


@dataclass
class OccNationalIn:
    """全国行(province='all')才有的四组派生列。"""

    tables: PnpTables
    """省表装载结果(pnpProvs/deadProvs 逐省判)。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER。"""

    channel: ChannelTierIn
    """通道四档入参。"""

    sponsor: SponsorOfIn
    """担保率入参。"""


@dataclass
class PulseIn:
    """fill_pulse_scores() 入参。"""

    rows: list
    """同一 province 分组内的职业行。"""


@dataclass
class DailyRowIn:
    """to_stats_daily_row() 入参。"""

    row: dict
    """stats 表的大类层一行。"""

    today: str
    """本轮日期(主键的一部分)。"""

    daily_closed: dict
    """(province, broad) → 当日下架计数。"""


@dataclass
class SayCountsIn:
    """say_table_counts() 入参:收尾逐表报行数。"""

    tables: dict
    """表名 → 行清单。"""

    width: int
    """表名列宽(对齐用)。"""

@dataclass
class FlowFinishIn:
    """finish_flow() 入参。"""

    flow: dict
    """流量桶。"""

    gated: bool
    """mom30d 是否整列写 null(撞抓取爬坡期)。"""

@dataclass
class MomIn:
    """mom_of() 入参。"""

    now: int
    """本期新发数。"""

    prev: int
    """上期新发数。"""

@dataclass
class ClosedDaysIn:
    """closed_days_of() 入参:一条判死记录 + 它在累积当前态里查回的帖。"""

    closed: dict
    """closed_jobs 的一行(externalId + closedAt)。"""

    posting: dict
    """该帖在 postings.json 里的记录(查回 noc/province/发布日)。"""


@dataclass
class AvgDaysIn:
    """avg_days_open_of() 入参。"""

    postings: list
    """累积当前态(查回 noc/province/发布日)。"""

@dataclass
class ColumnIn:
    """column_of() 入参:取某一列的全部取值。"""

    jobs: list
    """桶内岗位。"""

    key: str
    """列名。"""

@dataclass
class ProvListIn:
    """prov_list_of() 入参:按官方省序连成顿号串。"""

    tables: PnpTables
    """省表装载结果。"""

    noc: str
    """NOC 码。"""

    teer: int | None
    """TEER。"""

    mode: str
    """direct / cond / dead 三种清单口径。"""

@dataclass
class StatsBuildIn:
    """build_stats_rows() 入参。"""

    jobs: list
    """在招岗。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    today: str
    """本轮 fetched。"""

    difficulty: dict
    """省码 → 难度指数 jsonb 串。"""

@dataclass
class DifficultyIn:
    """to_difficulty_cell() 入参。"""

    row: dict
    """难度表的一行。"""

    generated: object
    """本轮生成时刻。"""

@dataclass
class OccBuildIn:
    """build_occupation_rows() 入参。"""

    jobs: list
    """在招岗。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    today: str
    """本轮 fetched。"""

    names: dict
    """NOC → 官方名行。"""

    tables: PnpTables
    """省表装载结果。"""

    flow: dict
    """流量桶。"""

    avg_open: dict
    """平均在招天数。"""

    sponsor_quarter: str | None
    """担保率的共同季度。"""

    sponsor_lmia: dict
    """担保率分子。"""

    sponsor_jvws: dict
    """担保率分母。"""

@dataclass
class OccBaseIn:
    """to_occupation_base() 入参。"""

    noc: str
    """NOC 码。"""

    jobs: list
    """该 NOC 的岗(取任一岗的分类三级)。"""

    names: dict
    """NOC → 官方名行。"""

    today: str
    """本轮 fetched。"""

@dataclass
class SponsorSourcesOut:
    """load_sponsor_sources() 出参。"""

    quarter: str | None
    """共同季度(None = 四列整列写 None)。"""

    lmia: dict
    """NOC → 该季获批岗位数。"""

    jvws: dict
    """NOC → 该季全国空缺行。"""

@dataclass
class SponsorCellIn:
    """to_sponsor_cell() 入参。"""

    quarter: str
    """共同季度。"""

    pos: int
    """该 NOC 当季获批岗位数(ESDC 穷举行政记录:没出现=确实 0,不是抑制)。"""

    jvws: dict | None
    """该 NOC 的 JVWS 全国行(None = 官方未采集/抑制)。"""

    teer: int | None
    """TEER(副指标口径按本 NOC 的 TEER,不是 LMIA 项目股别)。"""

@dataclass
class CityStatsIn:
    """build_city_rows() 入参。"""

    jobs: list
    """在招岗。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    today: str
    """本轮 fetched。"""

@dataclass
class CityStatsRowIn:
    """to_city_stats_row() 入参。"""

    city: str
    """城市名。"""

    province: str
    """省码。"""

    jobs: list
    """该市的岗。"""

    cut7: str
    """7 天前的 ISO 日期。"""

    today: str
    """本轮 fetched。"""

@dataclass
class StatsCountsIn:
    """say_stats_counts() 入参:收尾三张表一起报。"""

    rows: list
    """省级表。"""

    occ_rows: list
    """职业表。"""

    city_rows: list
    """城市表。"""


# =========================================================================
# 17. 跨源清洗:地点
# =========================================================================


@dataclass
class LocKeptOut:
    """clean_ats_file() 出参:这一份 jobs.json 留下与丢弃的岗数。"""

    kept: int
    """留下的(焦点区内)。"""

    dropped: int
    """丢弃的(焦点区外)。"""


@dataclass
class OttawaLocIn:
    """normalize_ottawa() 入参:ATS 岗的两个原始地点字段。"""

    raw_city: str
    """地点字段(源写法五花八门)。"""

    raw_addr: str
    """地址字段(可能带邮编)。"""


@dataclass
class ApplyLocIn:
    """apply_location() 入参:把清洗结果写回岗位行。"""

    job: dict
    """岗位行(原地写五格)。"""

    loc: dict
    """清洗结果(country/province/city/district/address 五格)。"""


@dataclass
class JbLocIn:
    """normalize_jobbank_location() 入参:JB 帖的省/市/地址 + FSA 维度表。"""

    prov: str
    """帖子省码(保留,不猜)。"""

    city: str
    """原始市名(读的是 city_raw,幂等的关键)。"""

    addr: str
    """地址(取邮编用)。"""

    fsa_table: dict
    """FSA → {main, hood, prov} 全国维度表(文件缺时空表)。"""


# =========================================================================
# 18. 跨源清洗:薪资
# =========================================================================


@dataclass
class SalaryTally:
    """薪资清洗一轮的三个报数。"""

    total: int
    """过了一遍的岗数(ATS + JB)。"""

    priced: int
    """带薪资原文的岗数。"""

    updated: int
    """真被改写了的岗数(幂等:值没变的不算)。"""


@dataclass
class SalaryTickIn:
    """salary_tick() 入参:一个岗 + 两个累加器。"""

    job: dict
    """岗位行。"""

    tally: SalaryTally
    """三个报数(原地累加)。"""

    guards: SalaryGuards
    """五道护栏计数(原地累加)。"""


@dataclass
class ApplySalaryIn:
    """apply_salary_to() 入参:一个岗 + 护栏计数。"""

    job: dict
    """岗位行(原地写 salaryAnnual/salaryText)。"""

    guards: SalaryGuards
    """护栏计数(原地累加)。"""


@dataclass
class SalaryParseIn:
    """parse_salary() 入参:薪资原文 + 护栏计数。"""

    raw: str
    """源写的薪资串(任意格式)。"""

    guards: SalaryGuards
    """护栏计数(原地累加)。"""


@dataclass
class SalaryOut:
    """parse_salary() 出参:年薪折算 + 规范显示文本。

    三态各有含义:两格都有 = 正常;annual=None 且 text 非空 = 有信息但不能年化
    (面议 / 按件计 / 高时薪);两格都 None = 源头自相矛盾,一个字都不显示。
    """

    annual: int | None
    """年薪折算(排序/「vs 中位」用)。"""

    text: str | None
    """规范显示文本。"""


@dataclass
class SalaryUnitIn:
    """salary_unit_of() 入参:判「这数是按什么周期给的」。"""

    low: str
    """已小写的解析源文本。"""

    raw: str
    """未剪的原文(计次价词可能落在被剪掉的佣金段里,只能搜它)。"""

    hi: float
    """区间上限(兜底判时薪还是年薪的分界)。"""

    guards: SalaryGuards
    """护栏计数(计次价那条在这里记)。"""


@dataclass
class UnitFixIn:
    """unit_fixed_of() 入参:判出来的单位 + 区间下限(源误标纠正的判据)。"""

    unit: str
    """salary_unit_of() 判出来的周期单位。"""

    lo: float
    """区间下限(时薪 ≥$1000 / 月薪 ≥$2万 都说明填错栏了)。"""


@dataclass
class MoneyTextIn:
    """money_text() 入参:区间两端 + 单位 + 后缀。"""

    lo: float
    """下限。"""

    hi: float
    """上限(等于下限时只显示一个数)。"""

    unit: str
    """薪资单位(年薪档按千元折)。"""

    sub: str
    """单位后缀("/hr"、"/yr"…)。"""


@dataclass
class MoneyIn:
    """money_of() 入参:一个金额 + 它的单位档。"""

    n: float
    """金额。"""

    unit: str
    """薪资单位。"""


# =========================================================================
# 19. 跨源清洗:试点打标
# =========================================================================


@dataclass
class PilotTally:
    """试点打标一轮的三个报数。"""

    flagged: int
    """命中试点社区的帖数。"""

    total: int
    """过了一遍的岗数(JB + ATS,原脚本口径)。"""

    emp_hits: int
    """雇主同时在本社区指定名单上的岗数。"""


@dataclass
class PilotFlagIn:
    """flag_pilot_row() 入参:一个岗 + 两张索引 + 报数。"""

    job: dict
    """岗位行(原地写三格)。"""

    cmap: dict
    """(province, city) → 命中的社区行清单。"""

    emp: dict
    """社区名 → 该社区指定雇主的归一名集合。"""

    tally: PilotTally
    """三个报数(原地累加)。"""


@dataclass
class PilotVerdictOut:
    """pilot_verdict() 出参:类型串与社区名。"""

    pilot: str
    """'RCIP' / 'FCIP' / 'RCIP+FCIP'。"""

    community: str
    """社区名(同城多命中时取 RCIP 行的名)。"""
