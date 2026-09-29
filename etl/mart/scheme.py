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
§23 自测(2026-09-26 /fe Frank 勾「省提名标签吃工时与雇佣期」批立):unittest 用例集 ——「不用 class」的外部库例外,
先例 indexing.scheme / ats.scheme / gate.scheme,跑法 `python etl/mart/main.py --only test`;被测的 mart.functions 与
mart.constants 在用例体内现取(functions 反过来 import 本文件,顶部 import 会成环)。
2026-09-27 同段加四组(薪资写法 / 投递邮箱 / ATS 工时雇佣期 / 运营统计补行);ATS 那组在系统临时目录现造公司档,不碰仓内文件。
同日九省体检修复批再加 MartRuralRenewalTest(AB 乡村振兴社区岗只认 RRS 自己的排除表;真表金标只读仓里 raw/pnp 两张表)。
同日 Frank 拍板「看得出才改判」再加 MartEmployerSectorTest(雇主行业三态 + 五条改判规则;现造 raw/pnp 小表落系统临时目录走真装载器,
真表金标只读仓里 raw/pnp)。同日 Frank 选「只上纯属改对的」:其中 NS 建筑、AB 科技两条改为现状金标,实际改判的是四条。
"""
import json
import re
import tempfile
import unittest
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from unittest import mock


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

    lowday: int = 0
    """日薪低得不可能(< SAL_DAY_MIN),整条置空(2026-09-19;给默认值 —— 构造处不用逐个补)。"""


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
    """province → {"type", "nocs", "blocked", "cond", "partial", "streams"}(cond / partial 两格 2026-09-27「看得出才改判」加:
    条件式叠加排除的码 → 行业键、排除表里官方带星号的码;通道桶另带 cond 格)。"""

    named_by_prov: dict
    """province → 具名通道 NOC 并集(score() 的 +12「省点名招」按它算;带雇主行业条件的码也在 —— 省点名了这个职业,
    分数不随雇主变,2026-09-27)。同日 Frank 选「只上纯属改对的」:并的是各通道 named 格,行级带条件的码(SK 农业带星号码)不在,
    与合入前逐码相同(见 constants.K_NAMED)。"""

    community_by_prov: dict
    """province → 按社区名单判的通道 {label, places, excluded, partial}(2026-09-24 AB 乡村振兴;partial 2026-09-27 加)。"""

    ee_by_noc: dict
    """NOC → 联邦 EE 类别中文标签(多类别 / 连接)。"""


@dataclass
class WageShortIn:
    """wage_short_of 的入参(2026-09-29 工资分档)。"""

    floors: dict
    """各省工资线口径 {省: {TEER: 口径}}(wage_floors_of 给)。"""

    prov: str
    """省码。"""

    teer: int | None
    """职业 TEER;没分类 None(不判)。"""

    salary: float | None
    """帖面年薪;没有 None(不判)。"""

    wage: dict
    """该职业该省的 ESDC 工资格(wage_of 给;中位 annual、低位 lowAnnual)。"""


@dataclass
class WageBlockIn:
    """with_wage_block 的入参。"""

    scored: dict
    """评分行(不改它,要改判就拷一份)。"""

    short: bool
    """工资够不够「谁都得过」那条线(wage_short_of 给)。"""


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

    hours: str
    """这岗的工时(full / part;''= 没标注,或职业 × 省级判定本就不看具体 offer)。2026-09-26 起 offer_fits 要看。"""

    term: str
    """这岗的雇佣期(permanent / term / seasonal / casual;''= 同上)。2026-09-26 起 offer_fits 要看。"""

    city: str
    """这岗的城市(''= 没有,或职业 × 省级判定本就不看具体城市)。2026-09-27 起 pnp_eligible 要看:岗位在 AB 乡村振兴
    指定社区的,资格只认该通道自己的排除表(is_community_hit)。"""

    employer: str
    """这岗的雇主名(''= 没有,或职业 × 省级判定本就不落到哪个雇主 —— 按看不出判)。2026-09-27 Frank 拍板「看得出才改判」起要看:
    带雇主行业条件的清单(K_EMPLOYER_SECTOR)按它判三态。"""

    title: str
    """这岗的职位名(''= 同上)。2026-09-27 起 AB 带星号码要看(K_PARTIAL:看得出不属官方点名的那一小类才不排除)。"""

    certs: str
    """这岗源头写明的证书要求(Job Bank 证书栏逐条以换行连接;别的源没有这一栏、或职业 × 省级判定 = '')。用途同 title。"""


@dataclass
class PnpStreamIn:
    """pnp_stream() 入参。"""

    tables: PnpTables
    """省表装载结果。"""

    noc: str
    """NOC 码。"""

    prov: str
    """省码。"""

    teer: int | None
    """TEER(2026-09-24 起 SK 现有工签要看;None = 职业码没认出)。"""

    city: str
    """城市(2026-09-24 起 AB 乡村振兴要看;''=没有)。"""

    hours: str
    """这岗的工时(同 PnpJudgeIn.hours;2026-09-26 起过不了该省 offer 门槛就不挂通道名)。"""

    term: str
    """这岗的雇佣期(同 PnpJudgeIn.term)。"""

    employer: str
    """这岗的雇主名(同 PnpJudgeIn.employer;2026-09-27 起带行业条件的具名清单看得出雇主在该行业才挂)。"""

    title: str
    """这岗的职位名(同 PnpJudgeIn.title)。"""

    certs: str
    """这岗的证书栏(同 PnpJudgeIn.certs)。"""


@dataclass
class SectorIn:
    """employer_sector_of() 入参:一个行业键 + 一个雇主名(2026-09-27 Frank 拍板「看得出才改判」)。"""

    sector: str
    """行业键(SECTOR_* 之一;本域不认得的键按看不出判)。"""

    employer: str
    """雇主名(''= 没有)。"""


@dataclass
class StreamHitIn:
    """is_stream_hit() 入参:一条具名通道桶 + 这岗的判定入参(2026-09-27)。"""

    stream: dict
    """通道桶(to_pnp_stream_bucket 的形:label / nocs / cond)。"""

    judge: PnpJudgeIn
    """这岗的判定入参(职业码与雇主名在里面)。"""


@dataclass
class CodeExclIn:
    """is_code_excluded() 入参:一张排除表的码集与其中带星号的码 + 这岗的判定入参(AOS 与乡村振兴两张表共用,2026-09-27)。"""

    codes: set
    """排除码集。"""

    partial: set
    """其中官方带星号的码(同码只一小类不合格)。"""

    judge: PnpJudgeIn
    """这岗的判定入参。"""


@dataclass
class SectorWarnIn:
    """say_unknown_sectors() 入参:一张表的文件名 + 它的条件码表(2026-09-27)。"""

    file: str
    """raw/pnp 下的文件名。"""

    cond: dict
    """这张表里带雇主行业条件的码 → 行业键。"""


@dataclass
class WordsIn:
    """is_any_word() 入参:一组词(一词一条的编译正则)+ 一段文字(2026-09-27)。"""

    words: tuple
    """词表(constants 里 *_WORDS 的一格)。"""

    text: str
    """要查的文字(雇主名;或 职位名 + 雇主名 + 证书栏)。"""


@dataclass
class EeLabelIn:
    """ee_label_of() 入参:一条岗的职业码 + 省。"""

    tables: PnpTables
    """省表装载结果(用它的 ee_by_noc)。"""

    noc: str
    """NOC 码。"""

    prov: str
    """省码(NON_EE_PROV 里的省不挂类别)。"""

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

    cond: dict
    """本表带雇主行业条件的码 → 行业键(cond_of 取;没有条件 = 空,2026-09-27)。"""

    partial: set
    """本表官方带星号的码(partial_of 取;排除表才有,2026-09-27)。"""

    named: set
    """本表算进省点名的码(本表 NOC 集减去行级带条件的码,row_cond_of 取;2026-09-27,见 constants.K_NAMED)。"""

@dataclass
class PnpStreamBucketIn:
    """to_pnp_stream_bucket() 入参。"""

    label: str
    """通道标签。"""

    nocs: set
    """该通道的 NOC 集。"""

    cond: dict
    """该通道带雇主行业条件的码 → 行业键(2026-09-27)。"""

    named: set
    """该通道算进省点名的码(2026-09-27,见 constants.K_NAMED)。"""


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

    city: str
    """城市(2026-09-24 起 AB 乡村振兴要按城市对社区名单;''=没有)。"""

    hours: str
    """工时(emp_of 取的值:源标注优先、整理版补空;''= 都没写)。2026-09-26 起判通道要看。"""

    term: str
    """雇佣期(同上)。"""

    employer: str
    """雇主名(Job Bank / 板仓帖子行的 employer 格,ATS 取公司档 profile 的 name;''= 没写)。2026-09-27 Frank 拍板「看得出才改判」起
    判带行业条件的清单要看 —— 只用岗行里已有的名字,不连库、不新抓公司数据。"""

    certs: str
    """证书栏(Job Bank 帖子行 certificates 逐条以换行连接;板仓与 ATS 没有 = '')。2026-09-27 起 AB 带星号码要看。"""


@dataclass
class EmpOfIn:
    """emp_of() 入参:源标注的两格 + 这岗的 jdformat 整理记录。"""

    hours: str
    """源标注的工时(''= 源没写;ATS 岗源头就没有这格)。"""

    term: str
    """源标注的雇佣期(同上)。"""

    rec: dict | None
    """jdformat 整理记录(load_formatted 的一行;None = 这岗没整理过)。"""


@dataclass
class EmpOut:
    """emp_of() 的产出:这岗落到岗位行、也拿去判通道的工时 / 雇佣期。"""

    hours: str
    """工时(''= 源与整理版都没写)。"""

    term: str
    """雇佣期(同上)。"""


@dataclass
class ScoredRowIn:
    """to_scored_row() 入参。"""

    tables: PnpTables
    """省表装载结果。"""

    job: CollectedJob
    """一条待评分的岗。"""

    labels: dict
    """classify 域判出的职业码(externalId → 五位码;只有 ok 的进表)。
    只在源带码与标题规则都落空时用它填空 —— 层序是 源带码 → 规则 → 模型 → 留空。"""

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

    wage_floors: dict
    """各省岗位工资「谁都得过」那条线按 TEER 取哪一档(wage_floors_of 由门槛表推出;2026-09-29 工资分档)。"""

    wages: dict
    """NOC → 省码 → ESDC 工资格。"""

    enrich: dict
    """slug → 公司官网富化(简介/行业/官网)。"""

    places: dict
    """slug → Google Places 命中行(官网/地址;2026-09-05)。"""

    careers: dict
    """slug → 公司官方招聘页链接(只含探测回 200 且不与官网同址的;2026-09-16)。"""

    briefs: dict
    """slug → qwen 五节简介行(英/中/出处;2026-09-05)。"""

    dead_sites: dict
    """slug → 死站的官网主机名(sites 域记了 dead 的;公司行的官网等于它就清空;2026-09-20)。"""

    site_facts: dict
    """slug → 公司官网整理记录(只含 ok 行;总部三格 + 原句 + 出处、并进简介的三节;2026-09-20)。"""

    wiki_hq: dict
    """slug → 维基总部兜底记录(只含 ok 行;官网没标总部的公司才用;2026-09-20)。"""

    search_hq: dict
    """slug → 搜总部记录(只含 ok 行;官网与维基都没给总部才用,第三来路;2026-09-22)。"""

    formatted: dict
    """externalId → qwen 五节整理版记录(jdformat 域预生成;2026-09-15)。"""

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
    """company-slug|title 展示去重集(2026-09-28 起键里加城市:company-slug|title|city,见 constants.DEDUP_CITY_KEY_TPL)。"""

    seen_ext: set
    """externalId 去重集。"""

    seen_ids: set
    """本轮**真实见过**的 posting(不受展示去重影响;seed 下架对账只认它)。"""

    dropped_expired: int
    """本轮被验尸名单剔除的帖数(报数用)。"""

    late_salary: int
    """本轮抢在 04d 之后落盘、由 09 现算现补的新帖数(报数用)。"""

    emp_src: dict
    """externalId → 原帖自带的工时 / 雇佣期(EmpOut;add_job 在整理版补空之前记。判「全」只认它,qwen 补的不算;2026-09-28)。"""

    stated_none: dict
    """externalId → 原帖明写不公布的格 → 原文(板仓行 stated_none,如 Jobillico 薪资栏「À discuter」;2026-09-28)。"""


@dataclass
class SiteCheckIn:
    """is_unofficial_site() 入参。"""

    url: object
    """公司行里的官网 / 招聘页(可能缺、可能不是串)。"""

    name: str
    """雇主名(名里带主机自己名字的算主人,不摘)。"""


@dataclass
class HqStreetIn:
    """hq_street_of() 入参。"""

    address: str
    """官网整理记录里的总部街址格(可能连着市 / 省 / 邮编)。"""

    city: str
    """总部所在市(截断的锚点;'' = 不截)。"""


@dataclass
class CareersHostIn:
    """careers_host_ok() 入参(2026-09-22 招聘页域名闸)。"""

    careers: str
    """招聘页链接。"""

    website: str
    """公司官网链接;'' = 没记。"""


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
class FillFormattedIn:
    """fill_formatted() 入参。"""

    fields: dict
    """来源侧字段(原地补 jdFormatted / jdFormattedAt,就业性质 / 工时只填空)。"""

    rec: dict | None
    """该岗的整理记录;None = 还没整理。"""


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
    """source_label() 入参。(2026-09-15 来源改显示原始板后,投递地址那格用不上撤掉。)"""

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
class BoardJobIn:
    """board_ext_of() / to_board_job_fields() 入参:一条第三方板帖 + 它的板名(2026-09-06)。"""

    job: dict
    """板仓的一行(与 Job Bank 仓同键)。"""

    origin: str
    """板名(jobillico / jobboom / careerbeacon;IN_BOARD_STORES 表里的第二格)。"""


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

    macro: dict
    """城市刻度表(City|PP → 行;statcan 段6 产,2026-09-11 城市段批二;缺文件传空表)。"""

@dataclass
class CityRowIn:
    """to_city_row() 入参。"""

    name: str
    """城市名。"""

    province: str
    """省码。"""

    i18n: dict
    """城市译名表。"""

    macro: dict
    """城市刻度表(City|PP → 行)。"""

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
class OfferFormIn:
    """to_offer_form_table() / to_offer_form_rule() 入参(2026-09-27 门槛卡批一)。"""

    prov: str
    """省码。"""

    url: str
    """出处页。"""

    quotes: tuple
    """官方原句(一到几句,逐字)。"""

    blocked: tuple
    """过不了的工时 / 雇佣期取值(PROV_OFFER_BLOCKED 那一省)。"""


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

    checklist: dict
    """抽选类别名 → 门槛清单 JSON 串(人工核定表没有就留 None)。"""

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

    checklist: dict
    """抽选类别 → 门槛清单(人工核定表)。"""

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
class JdSources:
    """两份 JD 索引 + 正文桶缓存(2026-09-13 汇装提速批 2(设计稿 docs/design/汇装提速-20260912.md §5;Frank「批2」);fill_jd_bodies 一轮一份)。"""

    jb: dict
    """Job Bank 索引:url → {pid, file, mtime, experience}。"""

    ats: dict
    """ATS 索引:url → {file, mtime, body}。"""

    buckets: dict
    """已读的正文桶:桶名 → {url: 原文}(懒读,同桶只读一次)。"""


@dataclass
class JdRawIn:
    """jd_raw_of() 入参:索引来源与这一岗的 applyUrl。"""

    src: "JdSources"
    """两份索引 + 桶缓存。"""

    url: str
    """这一岗的 applyUrl。"""


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
    checklist: dict
    """抽选类别名 → 门槛清单 JSON 串(联邦类别轮次按 drawName 对;没有就留 None)。"""


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

    pools: list
    """年报池子人数历年清单(mb-stats.json 顶层 eoiPoolYears;一年一行,每行自带年报网址 / 抓取日 / 出处节名;
    2026-09-29 立)。"""

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


@dataclass
class OpsExtraBaseIn:
    """to_ops_extra_base() 入参:运营统计补行(人工核对表配额 / 抽选文件全年合计)的出处五格(2026-09-27)。"""

    province: str
    """省码。"""

    as_of: str
    """口径日(配额补行没有 = 空串;全年合计 = 最近一轮的日期)。"""

    period: str
    """统计期(本年,四位年串)。"""

    url: str
    """出处(核对表里该年那一格的来源 / 该省抽选页)。"""

    fetched: str
    """取回日(核对表 checkedAt / 抽选文件 fetched)。"""


@dataclass
class AllocGapIn:
    """fill_alloc_gap_ops() 入参:行累加器 + 人工核对表 + 本年(2026-09-27)。"""

    ctx: OpsCtx
    """行累加器(各省统计表出完的行都在里面,判「本年有没有 allocation 行」看它)。"""

    table: dict
    """人工核对表 pnp_allocations.json 整份(只读;文件没有 = 空表)。"""

    year: str
    """本年(四位年串)。"""


@dataclass
class AllocProvsIn:
    """alloc_provs_of() 入参。"""

    rows: list
    """运营统计行。"""

    year: str
    """本年。"""


@dataclass
class AllocLabelIn:
    """alloc_label_of() 入参:核对表一行的 note + 本年配额数 + 本年 + 出处。"""

    note: str
    """核对表该省那一行的 note(官方原句一律用「」括着)。"""

    value: int
    """本年配额数(在原句里按千分位写法找它)。"""

    year: str
    """本年。"""

    url: str
    """本年那一格的出处(开放数据集页 → 取数据集名)。"""


@dataclass
class DrawYtdIn:
    """fill_draw_ytd_ops() 入参(2026-09-27)。"""

    ctx: OpsCtx
    """行累加器。"""

    tables: list
    """各省抽选文件读出来的整份(load_draw_tables;一份一省,外形 {source, fetched, provinces: {省: 块}})。"""

    year: str
    """本年。"""


@dataclass
class DrawYtdOfIn:
    """draw_ytd_of() 入参:一省的抽选行 + 本年。"""

    prov: str
    """省码(挑不算邀请的 stream 用)。"""

    draws: list
    """该省抽选块的 draws[]。"""

    year: str
    """本年。"""


@dataclass
class DrawYtdOut:
    """draw_ytd_of() 出参:一省本年带日期抽选行的合计与三个计数。"""

    total: int
    """计入的人数合计。"""

    rounds: int
    """计入的行数(一行 = 一条通道的一轮)。"""

    unknown: int
    """人数没公布或日期认不出的行数(> 0 = 该省不出合计)。"""

    dropped: int
    """本年里因「不是邀请」被剔出合计的行数(NB 的 AIP 组)。"""

    latest: str
    """计入行里最近的日期(原样:ISO 日或只到月的 YYYY-MM)。"""


@dataclass
class YtdLabelIn:
    """ytd_label_of() 入参。"""

    tpl: str
    """label 模板(邀请 / 选取两种)。"""

    got: DrawYtdOut
    """该省合计。"""

    year: str
    """本年。"""

    prov: str
    """省码(剔出行的 stream 名按它取)。"""


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

    qs: dict | None
    """该校命中的 QS 榜行(按 dliName 对上;榜外 None,qsRank 留空不瞎猜)。"""

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


@dataclass
class MissingIn:
    """missing_fields_of() 入参:一条装配好的岗 + 判「全」要的三样来路(2026-09-28 缺数据修复批)。"""

    row: dict
    """装配好的 jobs 行。"""

    noc_from: str
    """评分行记的职业码来路(source / rule / model;没码是空串)。"""

    emp: EmpOut
    """原帖自带的工时 / 雇佣期(整理版补空之前记的)。"""

    stated: dict
    """原帖明写不公布的格 → 原文。"""


@dataclass
class PendingRowIn:
    """to_pending_row() 入参(2026-09-28)。"""

    row: dict
    """装配好的 jobs 行。"""

    missing: list
    """缺的格(missing_fields_of 算的)。"""

    noc_from: str
    """职业码来路(qwen 判的码不进已有格)。"""

    emp: EmpOut
    """原帖自带的工时 / 雇佣期。"""

    stated: dict
    """原帖明写不公布的格 → 原文。"""

    employer: str
    """雇主名(公司行的 name)。"""


@dataclass
class HeldSplitIn:
    """held_split_of() 入参(2026-09-28 接闸)。"""

    jobs: list
    """装配好的全部岗位行。"""

    pending: list
    """待修清单(pending_jobs_of 算的)。"""


@dataclass
class HeldSplitOut:
    """held_split_of() 的产出。"""

    kept: list
    """六格齐全、上线的岗位行(进 jobs.json)。"""

    held: list
    """扣下名单行 [{externalId}](进 held_jobs.json,seed 照它关掉在架的)。"""


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

    home: bool
    """这家公司本部在不在渥太华(公司档的地域 / 地址里写着);在 = 远程写法的岗算渥太华。"""


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

    mined: int
    """薪资格本来是空的、从正文里挖出来的岗数(2026-09-15)。"""


@dataclass
class SalaryTextIn:
    """salary_text_ok() 入参:挖出的金额串 + 按哪种单位去判它可信不可信。"""

    body: str
    """挖出的金额串(已归一空白、已还原 K)。"""

    unit: str
    """按哪种单位判(SAL_UNIT_HR / SAL_UNIT_YR)。2026-09-27 起还有 SAL_UNIT_BIWK(两周)。"""


@dataclass
class SalaryHitIn:
    """salary_hit_blocked() 入参:正文 + 挖到的金额段在正文里的起止(2026-09-27)。"""

    desc: str
    """岗位正文。"""

    start: int
    """金额段起点(往前看封顶话术与挂名词)。"""

    end: int
    """金额段终点(往后看紧挨的挂名词)。"""


@dataclass
class BoardSalaryIn:
    """clean_board_salary() 入参:两个累加器(板仓与 Job Bank 仓同一轮报数)。"""

    tally: SalaryTally
    """总数/有薪/改写 三计数。"""

    guards: SalaryGuards
    """五道护栏各拦了多少。"""


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
class BoardPilotIn:
    """flag_board_pilot() 入参:两张索引 + 报数(与 Job Bank 仓同一轮)。"""

    cmap: dict
    """(province, city) → 社区行清单。"""

    emp: dict
    """试点指定雇主名索引(与 PilotFlagIn.emp 同一份)。"""

    tally: PilotTally
    """打标报数。"""


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


# =========================================================================
# 20. cities 步(纯常量段,无形状 —— 镜像占位)
# =========================================================================


# =========================================================================
# 21. mart:宏观时间序列(macro_series 长表,把脉页省份段 2026-09-06)
# =========================================================================


@dataclass
class MinWageAtIn:
    """minwage_rate_at() 入参:一省按生效日升序的调整行 + 要问的那一天。"""

    rows: list
    """该省的调整行(minwage 文件形,已按生效日升序)。"""

    day: str
    """那一天(YYYY-MM-DD)。"""


@dataclass
class MacroRowIn:
    """to_macro_row() 入参 —— 一行 = 一个(geo, key, period)点。"""

    geo: str
    """CA 或两位省码。"""

    key: str
    """指标键(契约 §3 键表)。"""

    period: str
    """季/月度 = `YYYY-MM-DD`(refPer),年度 = `YYYY`。"""

    freq: str
    """Q / M / A。"""

    value: float
    """值(官方缺位的点根本不出行,不折 0)。"""

    as_of: str
    """该点数据截至:完整年 = `YYYY`,进行年 YTD = `YYYY-MM`,季/月 = period 本身。"""

    unit: str
    """people / dollars_millions / percent / nominations。"""

    source: str
    """官方页 URL。"""

    fetched: str
    """raw 抓取日。"""


@dataclass
class StatcanPeriodIn:
    """statcan_period_of() 入参(文件自报的频率 + 该点的 refPer)。"""

    freq: str
    """Q / M / A。"""

    ref_per: str
    """WDS 的参考日(`YYYY-MM-DD`)。"""


@dataclass
class StudyAsOfIn:
    """study_as_of_of() 入参(年 + 该年的流量块)。"""

    year: str
    """年份。"""

    block: dict
    """study_flow 的年块({n, complete, throughMonth})。"""


@dataclass
class PrBlockIn:
    """macro_pr_block_rows() 入参:PR 按年表的一块(prAll / prPnp 同一套解法)。"""

    by_year: dict
    """年 → {省码: 人数}。"""

    key: str
    """落盘键(prAll / prPnp)。"""

    ytd_year: str
    """进行年(该年 as_of 取抓取日的年月)。"""

    source: str
    """官方页 URL。"""

    fetched: str
    """raw 抓取日。"""


@dataclass
class CompPoolIn:
    """macro_comp_pool_of() 入参:一地区一配额年的分子该取哪一期。"""

    index: dict
    """(geo, key) → {period: 行} 的点索引(macro_point_index 产)。"""

    geo: str
    """地区码。"""

    year: str
    """配额年(alloc 行的 period)。"""


@dataclass
class CompPoolOut:
    """macro_comp_pool_of() / macro_pool_at() 出参:分子与它的口径。"""

    pool: float
    """在库人头(三键之和)。"""

    as_of: str
    """年末期 = 年(`YYYY`);进行年退到年内最新一期 = `YYYY-MM`;macro_pool_at 里先放期键,由调用方定。"""

    source: str
    """分子那期的出处(StatCan 表页)。"""


@dataclass
class PrefixedYearIn:
    """prefixed_year_of() 入参:列名与期望前缀。"""

    col: str
    """列名(y2026 / c2023)。"""

    prefix: str
    """前缀。"""


@dataclass
class RatioRowsIn:
    """macro_ratio_rows() 入参:分子键 ÷ 分母键 → 百分比行。"""

    index: dict
    """(geo, key) → {period: 行} 的点索引(macro_point_index 产)。"""

    num_key: str
    """分子键。"""

    den_key: str
    """分母键。"""

    out_key: str
    """产出键。"""


@dataclass
class PoolAtIn:
    """macro_pool_at() 入参:一地区一期。"""

    index: dict
    """点索引(同 CompPoolIn.index)。"""

    geo: str
    """地区码。"""

    period: str
    """期键(`YYYY-MM-DD`)。"""


# =========================================================================
# 22. 跨源清洗:投递邮箱
# =========================================================================


@dataclass
class ApplyTally:
    """fill_apply_emails() 的三个计数(原地累加)。"""

    jb: int
    """从 howto 投递区拿到邮箱的岗。"""

    text: int
    """从正文抽到邮箱的岗。"""

    until: int
    """用 howto 截止日补上 validThrough 的岗。"""


@dataclass
class HowtoRecIn:
    """howto_rec_of() 入参:一个 jobs 行 + howto 记录表。"""

    row: dict
    """jobs 行。"""

    howto: dict
    """howto.json 记录表(帖号 → 记录)。"""


# =========================================================================
# 23. 自测(用例住 scheme)
# =========================================================================


class MartOfferTest(unittest.TestCase):
    """省提名 offer 门槛与 EE 省别自测(2026-09-26 /fe Frank 勾「省提名标签吃工时与雇佣期」同批):offer_fits 省 × 工时 ×
    雇佣期穷举(含空值)对照手写金标 / pnp_eligible 与 pnp_stream 带门槛前后的性质(过门槛 = 原判,不过 = 两格都不挂)/
    QC、NU 不属 PNP 一律不挂 / 魁省不挂 EE 类别 / emp_of 取值口径与 fill_formatted 落列逐格不变 / 评分行整行接线。
    形制照宪法判定层测试:穷举输入断言性质 + 手写金标 + 变异探针,不做快照矩阵;全程不读不写仓内文件(省表在用例里现造)。"""

    def test_offer_form_rows(self) -> None:
        """offer 形态门槛行(2026-09-27 门槛卡批一):只出登记了原句的省(先上 AB);取值编码与 PROV_OFFER_BLOCKED 那一省逐值相同
        (评分与展示读同一份,变异探针:改门槛表行跟着变);主体不是 applicant / employer(不进判定);行键与各省门槛文件出的行同名同序。"""
        from mart import functions as fn
        rows = fn.offer_form_rows()
        self.assertEqual([r["province"] for r in rows], ["AB", "ON", "BC", "SK", "MB", "NS", "NB", "NL", "PE"])
        on = rows[1]
        self.assertEqual(on["basis"], "valueCode=part,term,seasonal,casual")
        self.assertIn("full-time and permanent position in Ontario", on["valueText"])
        ab = rows[0]
        self.assertEqual(ab["basis"], "valueCode=part,seasonal,casual")
        self.assertIsNone(ab["value"])
        self.assertEqual((ab["subject"], ab["factor"], ab["op"]), ("offer", "offerForm", "notIn"))
        self.assertIn("must have a full-time job offer", ab["valueText"])
        self.assertIn("part-time, casual or seasonal employees", ab["valueText"])
        self.assertEqual(ab["url"], "https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility")
        self.assertNotIn(ab["subject"], ("applicant", "employer"))
        ref = fn.to_pnp_requirement_row(ReqRowIn(base=fn.to_req_table_base({"province": "AB"}), rule={"factor": "language"},
                                                 seq=0))
        self.assertEqual(list(ab.keys()), list(ref.keys()))
        with mock.patch.object(fn, "PROV_OFFER_BLOCKED", {"AB": ("part",)}):
            self.assertEqual(fn.offer_form_rows()[0]["basis"], "valueCode=part")
        with mock.patch.object(fn, "PROV_OFFER_BLOCKED", {}):
            self.assertEqual(fn.offer_form_rows(), [])

    def golden_blocked(self) -> dict[str, set[str]]:
        """手写金标:各省官方原句逐字读成「卡哪几个值」(与 constants.PROV_OFFER_BLOCKED 各写一份、互相对照;原句见该常量)。
        full-time + permanent / indeterminate 的省四值全卡;AB 原句点名 part-time、casual、seasonal 三种;MB 的 long-term
        卡兼职、季节、casual,合同工照毕业生通道「minimum 1-year contract」放行(2026-09-26 Frank「不卡」);只写
        non-seasonal / not seasonal 的 NB、NL、PE 卡兼职与季节两值。
        2026-09-29 PE 补 casual(官方指南「offered a seasonal, part-time or casual job」不可申请)。"""
        four = {"part", "term", "seasonal", "casual"}
        return {"ON": four, "BC": four, "SK": four, "NS": four, "YT": four, "NT": four,
                "AB": {"part", "seasonal", "casual"}, "MB": {"part", "seasonal", "casual"},
                "NB": {"part", "seasonal"}, "NL": {"part", "seasonal"}, "PE": {"part", "seasonal", "casual"}}

    def provs(self) -> list[str]:
        """穷举用的省码:十一个有 PNP 口径的省与领地 + QC、NU(不属 PNP)+ 空串(没有省)+ 一个不存在的码。"""
        return ["ON", "BC", "SK", "MB", "NS", "YT", "NT", "AB", "NB", "NL", "PE", "QC", "NU", "", "XX"]

    def hours_values(self) -> list[str]:
        """工时全部取值(含空值)。"""
        return ["", "full", "part"]

    def term_values(self) -> list[str]:
        """雇佣期全部取值(含空值)。"""
        return ["", "permanent", "term", "seasonal", "casual"]

    def tables(self) -> PnpTables:
        """现造省表(形同 load_pnp_by_prov 的桶):ON 在需式一条具名通道(卡车司机 73300);AB 排除式,排除 65201、
        具名通道一条(汽修 72410);SK 排除式空表;EE 类别表一码(21231 → STEM)。
        2026-09-27「看得出才改判」:桶形多了 cond / partial 两格,这里给空(本组不带雇主行业条件,另有 MartEmployerSectorTest)。"""
        by_prov = {
            "ON": {"type": "indemand", "nocs": {"73300"}, "blocked": set(), "cond": {}, "partial": set(),
                   "streams": [{"label": "ON 具名", "nocs": {"73300"}, "cond": {}}]},
            "AB": {"type": "ineligible", "nocs": {"65201"}, "blocked": set(), "cond": {}, "partial": set(),
                   "streams": [{"label": "AB 具名", "nocs": {"72410"}, "cond": {}}]},
            "SK": {"type": "ineligible", "nocs": set(), "blocked": set(), "cond": {}, "partial": set(), "streams": []},
        }
        return PnpTables(by_prov=by_prov, named_by_prov={"ON": {"73300"}, "AB": {"72410"}}, community_by_prov={},
                         ee_by_noc={"21231": "STEM"})

    def judge(self, prov: str, noc: str, hours: str, term: str) -> PnpJudgeIn:
        """造一份判定入参(TEER 取职业码第二位;城市给空串 —— 社区通道另有 MartRuralRenewalTest,2026-09-27;
        雇主名 / 职位名 / 证书栏给空串 —— 雇主行业条件另有 MartEmployerSectorTest,同日)。"""
        return PnpJudgeIn(tables=self.tables(), noc=noc, teer=int(noc[1]), prov=prov, hours=hours, term=term,
                          city="", employer="", title="", certs="")

    def stream_in(self, prov: str, noc: str, hours: str, term: str) -> PnpStreamIn:
        """造一份通道名入参(城市、雇主名、职位名、证书栏给空串:社区通道与雇主行业条件不在本组用例里)。"""
        return PnpStreamIn(tables=self.tables(), noc=noc, prov=prov, teer=int(noc[1]), city="", hours=hours, term=term,
                           employer="", title="", certs="")

    def fits_of(self, prov: str, hours: str, term: str) -> bool:
        """独立对照尺:按手写金标判过不过门槛(不经被测函数)。"""
        blocked = self.golden_blocked().get(prov, set())
        return hours not in blocked and term not in blocked

    def test_offer_fits_exhaustive(self) -> None:
        """穷举 省 × 工时 × 雇佣期(含空值)逐格对照手写金标;另断言四条性质:两格都空一律放行、全职 + 永久一律放行、
        表外的省(QC / NU / 空 / 不存在)一律放行、表内的省兼职与季节工一律不放行。"""
        from mart import functions as fn
        for prov in self.provs():
            for hours in self.hours_values():
                for term in self.term_values():
                    got = fn.offer_fits(self.judge(prov, "21231", hours, term))
                    self.assertEqual(got, self.fits_of(prov, hours, term), (prov, hours, term))
            self.assertTrue(fn.offer_fits(self.judge(prov, "21231", "", "")), prov)
            self.assertTrue(fn.offer_fits(self.judge(prov, "21231", "full", "permanent")), prov)
        for prov in ("QC", "NU", "", "XX"):
            for hours in self.hours_values():
                for term in self.term_values():
                    self.assertTrue(fn.offer_fits(self.judge(prov, "21231", hours, term)), (prov, hours, term))
        for prov in self.golden_blocked():
            self.assertFalse(fn.offer_fits(self.judge(prov, "21231", "part", "")), prov)
            self.assertFalse(fn.offer_fits(self.judge(prov, "21231", "", "seasonal")), prov)

    def test_offer_fits_golden(self) -> None:
        """手写金标:按各省原句逐条读出来的代表格(term 合同在 AB / MB / NB / NL / PE 不卡;casual 只在 NB / NL / PE 不卡)。"""
        from mart import functions as fn
        cases = [
            ("ON", "part", "permanent", False), ("ON", "full", "term", False), ("ON", "full", "permanent", True),
            ("ON", "", "", True), ("ON", "full", "", True), ("ON", "", "seasonal", False),
            ("BC", "full", "casual", False), ("SK", "", "term", False), ("MB", "full", "term", True),
            ("MB", "", "term", True), ("MB", "part", "term", False), ("MB", "full", "casual", False),
            ("MB", "full", "seasonal", False), ("MB", "full", "permanent", True),
            ("NS", "part", "", False), ("YT", "full", "seasonal", False), ("NT", "full", "term", False),
            ("AB", "full", "term", True), ("AB", "full", "casual", False), ("AB", "part", "", False),
            ("AB", "", "seasonal", False), ("NB", "full", "casual", True), ("NB", "full", "seasonal", False),
            ("NL", "full", "term", True), ("NL", "part", "permanent", False), ("PE", "", "term", True),
            ("PE", "full", "seasonal", False), ("QC", "part", "casual", True), ("NU", "part", "seasonal", True),
            ("", "part", "casual", True),
        ]
        for prov, hours, term, want in cases:
            with self.subTest(prov=prov, hours=hours, term=term):
                self.assertEqual(fn.offer_fits(self.judge(prov, "21231", hours, term)), want)

    def test_offer_table_mutation_probe(self) -> None:
        """变异探针:把常量表里 AB 改成只卡兼职(= 只读了「full-time job offer」那半句)、把 MB 改回连合同工一起卡
        (= 没照 Frank 09-26「不卡」),穷举对照都必须当场抓到分歧 —— 证明 offer_fits 读的是那张表、穷举用例真能拦住表被改错。"""
        from mart import constants as c
        from mart import functions as fn
        for prov, bad in (("AB", ("part",)), ("MB", ("part", "term", "seasonal", "casual"))):
            with mock.patch.dict(c.PROV_OFFER_BLOCKED, {prov: bad}):
                diffs = 0
                for hours in self.hours_values():
                    for term in self.term_values():
                        if fn.offer_fits(self.judge(prov, "21231", hours, term)) != self.fits_of(prov, hours, term):
                            diffs += 1
                self.assertGreater(diffs, 0, prov)
        self.assertTrue(fn.offer_fits(self.judge("AB", "21231", "full", "term")))
        self.assertFalse(fn.offer_fits(self.judge("AB", "21231", "full", "casual")))
        self.assertTrue(fn.offer_fits(self.judge("MB", "21231", "full", "term")))

    def test_pnp_gate_property(self) -> None:
        """性质:带上工时 / 雇佣期后,过门槛的格 pnp_eligible 与 pnp_stream 都等于两格给空串时的原判;不过门槛的两格都不挂
        (False / None)。穷举 省 × 四个职业码(具名通道码、排除码、TEER 1、TEER 5)× 工时 × 雇佣期。"""
        from mart import functions as fn
        for prov in self.provs():
            for noc in ("73300", "72410", "65201", "21231", "95106"):
                base_e = fn.pnp_eligible(self.judge(prov, noc, "", ""))
                base_s = fn.pnp_stream(self.stream_in(prov, noc, "", ""))
                for hours in self.hours_values():
                    for term in self.term_values():
                        key = (prov, noc, hours, term)
                        got_e = fn.pnp_eligible(self.judge(prov, noc, hours, term))
                        got_s = fn.pnp_stream(self.stream_in(prov, noc, hours, term))
                        if self.fits_of(prov, hours, term):
                            self.assertEqual(got_e, base_e, key)
                            self.assertEqual(got_s, base_s, key)
                        else:
                            self.assertFalse(got_e, key)
                            self.assertIsNone(got_s, key)

    def test_pnp_gate_golden(self) -> None:
        """手写金标:具名通道岗兼职 → 两格都不挂;没标注 → 照旧挂;AB 的 term 合同照旧挂、casual 不挂;MB 的 TEER 1 合同工
        照旧可、季节工不可;魁省与 NU 不属 PNP → 任何工时 / 雇佣期都不可(NU 2026-09-26 Frank 拍)。"""
        from mart import functions as fn
        cases = [
            ("ON", "73300", "full", "permanent", True, "ON 具名"), ("ON", "73300", "part", "permanent", False, None),
            ("ON", "73300", "", "", True, "ON 具名"), ("ON", "21231", "full", "term", False, None),
            ("ON", "21231", "full", "", True, None), ("AB", "72410", "full", "term", True, "AB 具名"),
            ("AB", "72410", "full", "casual", False, None), ("AB", "65201", "full", "permanent", False, None),
            ("MB", "21231", "full", "term", True, None), ("MB", "21231", "full", "seasonal", False, None),
            ("QC", "21231", "full", "permanent", False, None), ("NU", "21231", "full", "permanent", False, None),
            ("NU", "21231", "", "", False, None), ("NU", "21231", "part", "seasonal", False, None),
        ]
        for prov, noc, hours, term, want_e, want_s in cases:
            with self.subTest(prov=prov, noc=noc, hours=hours, term=term):
                self.assertEqual(fn.pnp_eligible(self.judge(prov, noc, hours, term)), want_e)
                self.assertEqual(fn.pnp_stream(self.stream_in(prov, noc, hours, term)), want_s)

    def test_non_pnp_provs(self) -> None:
        """性质:QC、NU 两地穷举 职业码 × 工时 × 雇佣期 一律不可、一律不挂通道名 —— 连省表里硬塞一条它们的具名通道
        (现实里没有)也不挂,「一律」不靠数据碰巧缺席。"""
        from mart import functions as fn
        tables = self.tables()
        for prov in ("QC", "NU"):
            tables.by_prov[prov] = {"type": "indemand", "nocs": {"21231"}, "blocked": set(), "cond": {}, "partial": set(),
                                    "streams": [{"label": prov + " 具名", "nocs": {"21231"}, "cond": {}}]}
        for prov in ("QC", "NU"):
            for noc in ("21231", "73300", "95106"):
                for hours in self.hours_values():
                    for term in self.term_values():
                        key = (prov, noc, hours, term)
                        judge = PnpJudgeIn(tables=tables, noc=noc, teer=int(noc[1]), prov=prov, hours=hours, term=term,
                                           city="", employer="", title="", certs="")
                        self.assertFalse(fn.pnp_eligible(judge), key)
                        self.assertIsNone(fn.pnp_stream(PnpStreamIn(tables=tables, noc=noc, prov=prov, teer=int(noc[1]),
                                                                    city="", hours=hours, term=term, employer="",
                                                                    title="", certs="")), key)

    def test_ee_label(self) -> None:
        """EE 类别:魁省一律不挂;别的省(连同没有省的岗)职业码在类别表上才挂,不在给 None。穷举省 × 两个职业码。"""
        from mart import functions as fn
        tables = self.tables()
        for prov in self.provs():
            for noc in ("21231", "95106"):
                got = fn.ee_label_of(EeLabelIn(tables=tables, noc=noc, prov=prov))
                if prov == "QC" or noc != "21231":
                    self.assertIsNone(got, (prov, noc))
                else:
                    self.assertEqual(got, "STEM", (prov, noc))

    def test_emp_of_golden(self) -> None:
        """取值口径金标:源标注优先、源空才用整理版、整理版缺格或没整理记录给空串。"""
        from mart import functions as fn
        rec = {"hrs": "part", "term": "term"}
        cases = [
            ("full", "", rec, "full", "term"), ("", "", rec, "part", "term"), ("", "permanent", rec, "part", "permanent"),
            ("", "", None, "", ""), ("full", "casual", None, "full", "casual"), ("", "", {}, "", ""),
            ("", "", {"hrs": "", "term": "seasonal"}, "", "seasonal"),
        ]
        for hours, term, r, want_h, want_t in cases:
            with self.subTest(hours=hours, term=term, rec=r):
                got = fn.emp_of(EmpOfIn(hours=hours, term=term, rec=r))
                self.assertEqual((got.hours, got.term), (want_h, want_t))

    def old_fill_emp(self, fields: dict, rec: dict) -> None:
        """对照尺:2026-09-26 收进 emp_of 之前 fill_formatted 里的「只填空」原写法(逐字抄,不经被测函数)。"""
        if not fields.get("employmentTerm") and rec.get("term"):
            fields["employmentTerm"] = rec["term"]
        if not fields.get("employmentHours") and rec.get("hrs"):
            fields["employmentHours"] = rec["hrs"]

    def test_fill_formatted_unchanged(self) -> None:
        """收编前后落列逐格不变(连键序):岗位行两格各取 缺席 / None / 空串 / 有值,整理记录两格各取 缺席 / 空串 / 有值,
        全组合跑新 fill_formatted 与原写法对照。"""
        from mart import functions as fn
        cells: list[tuple[str, str | None] | None] = [None, ("x", None), ("x", ""), ("x", "v")]
        rec_cells: list[str | None] = [None, "", "r"]
        for t_cell in cells:
            for h_cell in cells:
                for r_term in rec_cells:
                    for r_hrs in rec_cells:
                        fields: dict = {"title": "t"}
                        if t_cell is not None:
                            fields["employmentTerm"] = t_cell[1]
                        if h_cell is not None:
                            fields["employmentHours"] = h_cell[1]
                        rec: dict = {"formatted": "f", "at": "a"}
                        if r_term is not None:
                            rec["term"] = r_term
                        if r_hrs is not None:
                            rec["hrs"] = r_hrs
                        want = dict(fields)
                        want["jdFormatted"] = "f"
                        want["jdFormattedAt"] = "a"
                        self.old_fill_emp(want, rec)
                        got = dict(fields)
                        fn.fill_formatted(FillFormattedIn(fields=got, rec=rec))
                        self.assertEqual(list(got.items()), list(want.items()), (t_cell, h_cell, r_term, r_hrs))

    def test_scored_row_wiring(self) -> None:
        """评分行整行接线:兼职的具名通道岗两格都不挂、分数照算;魁省 EE 码岗不挂类别;安省同码全职永久岗挂类别;
        NU 的 TEER 1 全职永久岗不可提名、EE 类别照挂(NU 在魁省以外)。"""
        from mart import functions as fn
        tables = self.tables()
        part = CollectedJob(ext="jb:1", title="Truck Driver", agency=False, prov="ON", hint="73300", city="",
                            hours="part", term="permanent", employer="", certs="")
        row = fn.to_scored_row(ScoredRowIn(tables=tables, job=part, labels={}))
        self.assertFalse(row["pnpEligible"])
        self.assertIsNone(row["pnpStream"])
        self.assertGreater(row["score"], 0)
        full = CollectedJob(ext="jb:2", title="Truck Driver", agency=False, prov="ON", hint="73300", city="",
                            hours="full", term="permanent", employer="", certs="")
        row = fn.to_scored_row(ScoredRowIn(tables=tables, job=full, labels={}))
        self.assertTrue(row["pnpEligible"])
        self.assertEqual(row["pnpStream"], "ON 具名")
        qc = CollectedJob(ext="jb:3", title="Software Engineer", agency=False, prov="QC", hint="21231", city="",
                          hours="full", term="permanent", employer="", certs="")
        self.assertIsNone(fn.to_scored_row(ScoredRowIn(tables=tables, job=qc, labels={}))["eeCategory"])
        on = CollectedJob(ext="jb:4", title="Software Engineer", agency=False, prov="ON", hint="21231", city="",
                          hours="full", term="permanent", employer="", certs="")
        self.assertEqual(fn.to_scored_row(ScoredRowIn(tables=tables, job=on, labels={}))["eeCategory"], "STEM")
        nu = CollectedJob(ext="jb:5", title="Software Engineer", agency=False, prov="NU", hint="21231", city="",
                          hours="full", term="permanent", employer="", certs="")
        row = fn.to_scored_row(ScoredRowIn(tables=tables, job=nu, labels={}))
        self.assertFalse(row["pnpEligible"])
        self.assertIsNone(row["pnpStream"])
        self.assertEqual(row["eeCategory"], "STEM")

    def test_title_noc_supervisors(self) -> None:
        """标题兜底归类的主管三分(2026-09-27 九省体检 NB / NL 实撞):带餐饮语境的归 62020;零售主管归 62010;
        裸 supervisor / shift supervisor 不硬塞进 62020(交官方示例职称表,查不到 = 未分类)。金标取在招岗真标题。"""
        from mart import functions as fn
        for t in ("food service supervisor", "Restaurant Supervisor", "kitchen supervisor", "cafeteria supervisor",
                  "unit supervisor - food services"):
            self.assertEqual(fn.classify_title(t), "62020", t)
        for t in ("Retail supervisor-south centre mall", "Merchandiser retail team lead"):
            self.assertEqual(fn.classify_title(t), "62010", t)
        for t in ("Traffic Supervisor", "Highway Supervisor", "Medical Radiation Technologist 3 (Supervisor)",
                  "Speech language pathologist 2 - supervisor", "Shift Supervisor", "Maintenance Supervisor",
                  "Department Supervisor"):
            self.assertNotEqual(fn.classify_title(t), "62020", t)


class MartBlockTest(unittest.TestCase):
    """省提名「走不了的原因码」自测(2026-09-29 Frank「有些职位不满足门槛 也要弹框 并说明」「就直接说 兼职」;工资选「分档判」):
    pnp_block_of 与 pnp_eligible 同一把尺子(穷举 省 × 工时 × 雇佣期 × 职业:可提名 ⇔ 省提名省且原因码为空)/ 工作性质的码就是
    卡住的那个取值 / 手写金标(兼职、合同工、排除清单、BC TEER 5 职业不收)/ 工资线由门槛表推出(中位行管全档、应届低位行把
    TEER 0-3 降成低位;变异探针)/ 工资改判只动可提名岗、原评分行不改。全程不读不写仓内文件(省表借 MartOfferTest 现造)。"""

    def base(self) -> "MartOfferTest":
        """借 MartOfferTest 的现造省表与判定入参(同一套省表,两组用例口径不分叉)。"""
        return MartOfferTest()

    def test_block_matches_eligible(self) -> None:
        """穷举:可提名 ⇔ 省提名省且原因码为空;工作性质卡住时码就是卡住的那个取值;非省提名省原因码一律空。"""
        from mart import functions as fn
        base = self.base()
        for prov in base.provs():
            for hours in base.hours_values():
                for term in base.term_values():
                    for noc in ("21231", "72410", "65201", "73300", "65100"):
                        x = base.judge(prov, noc, hours, term)
                        block = fn.pnp_block_of(x)
                        pnp_prov = prov not in ("QC", "NU", "")
                        self.assertEqual(fn.pnp_eligible(x), pnp_prov and block == "", (prov, noc, hours, term))
                        if not pnp_prov:
                            self.assertEqual(block, "", (prov, noc))
                        elif not fn.offer_fits(x):
                            self.assertIn(block, (hours, term), (prov, noc, hours, term))

    def test_block_golden(self) -> None:
        """手写金标:工时先于雇佣期;工作性质先于清单;排除清单 list;BC TEER 5 不在清单 occ;全职长期的技术岗空。"""
        from mart import functions as fn
        cases = [
            ("ON", "21231", "part", "permanent", "part"), ("ON", "21231", "full", "term", "term"),
            ("ON", "21231", "part", "seasonal", "part"), ("ON", "21231", "full", "casual", "casual"),
            ("AB", "65201", "full", "permanent", "list"), ("AB", "65201", "part", "permanent", "part"),
            ("BC", "65100", "full", "permanent", "occ"), ("ON", "21231", "full", "permanent", ""),
            ("QC", "21231", "part", "", ""),
        ]
        for prov, noc, hours, term, want in cases:
            self.assertEqual(fn.pnp_block_of(self.base().judge(prov, noc, hours, term)), want, (prov, noc, hours, term))

    def test_wage_floors(self) -> None:
        """工资线:中位行(无条件、appliesTeer 空)管 0-5;应届低位行把 TEER 0-3 降成低位;变异探针:去掉应届行全档中位,
        去掉中位行不成线;别的因素不进来。"""
        from mart import functions as fn
        median = {"province": "ON", "factor": "wage", "basis": "occMedian", "appliesTeer": "", "appliesCondition": ""}
        low = {"province": "ON", "factor": "wage", "basis": "occLow", "appliesTeer": "0,1,2,3",
               "appliesCondition": "recent-on-graduate"}
        other = {"province": "AB", "factor": "language", "basis": "", "appliesTeer": "", "appliesCondition": ""}
        self.assertEqual(fn.wage_floors_of([median, low, other]),
                         {"ON": {0: "occLow", 1: "occLow", 2: "occLow", 3: "occLow", 4: "occMedian", 5: "occMedian"}})
        self.assertEqual(fn.wage_floors_of([median])["ON"][2], "occMedian")
        self.assertEqual(fn.wage_floors_of([low, other]), {})

    def test_wage_short_and_block(self) -> None:
        """谁都过不了才算不够:TEER 5 低于中位不够、等于中位够;TEER 3 介于低位与中位够(应届生能用)、低于低位不够;
        缺 TEER / 缺薪资 / 本省没线不判。改判只动可提名岗:可提名 + 不够 → 否、通道名清空、码 wage;原评分行不改。"""
        from mart import functions as fn
        floors = {"ON": {3: "occLow", 5: "occMedian"}}
        wage = {"annual": 50000, "lowAnnual": 35000}
        cases = [(5, 49000.0, "ON", True), (5, 50000.0, "ON", False), (3, 40000.0, "ON", False), (3, 34000.0, "ON", True),
                 (None, 1000.0, "ON", False), (5, None, "ON", False), (5, 1000.0, "AB", False)]
        for teer, salary, prov, want in cases:
            got = fn.wage_short_of(WageShortIn(floors=floors, prov=prov, teer=teer, salary=salary, wage=wage))
            self.assertEqual(got, want, (teer, salary, prov))
        sc = {"pnpEligible": True, "pnpStream": "ON 具名", "pnpBlock": ""}
        out = fn.with_wage_block(WageBlockIn(scored=sc, short=True))
        self.assertEqual((out["pnpEligible"], out["pnpStream"], out["pnpBlock"]), (False, "", "wage"))
        self.assertEqual(sc["pnpEligible"], True)
        blocked = {"pnpEligible": False, "pnpStream": "", "pnpBlock": "part"}
        self.assertIs(fn.with_wage_block(WageBlockIn(scored=blocked, short=True)), blocked)
        self.assertIs(fn.with_wage_block(WageBlockIn(scored=sc, short=False)), sc)


class MartRuralRenewalTest(unittest.TestCase):
    """AB 乡村振兴(RRS)社区岗的资格与通道名自测(2026-09-27 九省体检:社区分支先过 pnp_eligible,而它用 AOS 的 34 码表,
    把 RRS 自己不排除的幼教 / 小学教师这批挡掉)。性质与金标用现造省表(形同 load_pnp_tables 的桶);真表金标读仓里
    raw/pnp 的 ab-rural.json / aaip-ineligible.json(只读);变异探针改的是社区表(排除码 / 社区名单)。"""

    RRS_TABLE1 = {"00010", "60040", "41100", "51111", "51122", "42200", "53121", "53122", "53124", "53200", "33100",
                  "44100", "44101", "64321", "55109", "65229", "85101"}
    """手写金标:官方 aaip-rural-renewal-stream-eligibility 页 Table 1「List of ineligible occupations」的 17 码
    (2026-09-27 crawl 缓存 ab-aaip 原样;60040 / 42200 / 33100 带星号 = 该码只部分职业不合格,本站整码不收)。"""

    AOS = {"42202", "41221", "00010", "44101", "65211"}
    """现造的 AOS 排除码(真表 34 码里挑五个:幼教、小学教师、议员、居家护理、娱乐场所服务员)。"""

    RRS = {"00010", "44101"}
    """现造的 RRS 排除码(真表 17 码里挑两个,都同时在 AOS 里)。"""

    PLACES = {"medicine hat", "rocky mountain house"}
    """现造的指定社区(小写,同 load_community_tables 的形)。"""

    def tables(self, excluded: set, places: set) -> PnpTables:
        """现造省表:AB 排除式(排除 AOS 五码)+ 一条具名通道(汽修 72410)+ 乡村振兴社区表(名单与排除码由用例给)。
        2026-09-27「看得出才改判」:桶形多了 cond / partial 两格,这里给空(带星号码另有 MartEmployerSectorTest)。"""
        by_prov = {"AB": {"type": "ineligible", "nocs": set(self.AOS), "blocked": set(), "cond": {}, "partial": set(),
                          "streams": [{"label": "AB 具名", "nocs": {"72410"}, "cond": {}}]}}
        comm = {"AB": {"label": "AB 乡村振兴", "places": set(places), "excluded": set(excluded), "partial": set()}}
        return PnpTables(by_prov=by_prov, named_by_prov={"AB": {"72410"}}, community_by_prov=comm, ee_by_noc={})

    def both(self, tables: PnpTables, row: tuple) -> tuple:
        """一格 (城市, 职业码, 工时, 雇佣期) → (pnp_eligible, pnp_stream);职业码空串 = 没认出(TEER None)。
        雇主名 / 职位名 / 证书栏给空串(2026-09-27:本组不带雇主行业条件)。"""
        from mart import functions as fn
        city, noc, hours, term = row
        teer = None
        if noc != "":
            teer = int(noc[1])
        judge = PnpJudgeIn(tables=tables, noc=noc, teer=teer, prov="AB", hours=hours, term=term, city=city,
                           employer="", title="", certs="")
        stream = fn.pnp_stream(PnpStreamIn(tables=tables, noc=noc, prov="AB", teer=teer, city=city, hours=hours,
                                           term=term, employer="", title="", certs=""))
        return fn.pnp_eligible(judge), stream

    def test_rrs_golden(self) -> None:
        """手写金标:社区里 AOS 排除、RRS 不排除的码(幼教 42202、小学教师 41221)→ 可 + 乡村振兴;社区外照旧按 AOS 不可;
        RRS 自己排除的码不可;具名通道优先;兼职 / casual 过不了 offer 门槛;城市大小写与首尾空白不影响;职业码没认出不判。"""
        t = self.tables(self.RRS, self.PLACES)
        cases = [
            (("Medicine Hat", "42202", "full", "permanent"), (True, "AB 乡村振兴")),
            (("Rocky Mountain House", "41221", "full", "permanent"), (True, "AB 乡村振兴")),
            ((" medicine HAT ", "42202", "", ""), (True, "AB 乡村振兴")),
            (("Medicine Hat", "42202", "full", "term"), (True, "AB 乡村振兴")),
            (("Edmonton", "42202", "full", "permanent"), (False, None)),
            (("", "41221", "full", "permanent"), (False, None)),
            (("Medicine Hat", "00010", "full", "permanent"), (False, None)),
            (("Medicine Hat", "44101", "full", "permanent"), (False, None)),
            (("Medicine Hat", "72410", "full", "permanent"), (True, "AB 具名")),
            (("Medicine Hat", "21231", "full", "permanent"), (True, "AB 乡村振兴")),
            (("Edmonton", "21231", "full", "permanent"), (True, None)),
            (("Medicine Hat", "42202", "part", "permanent"), (False, None)),
            (("Medicine Hat", "42202", "full", "casual"), (False, None)),
            (("Medicine Hat", "", "full", "permanent"), (False, None)),
        ]
        for row, want in cases:
            with self.subTest(row=row):
                self.assertEqual(self.both(t, row), want)

    def test_rrs_property(self) -> None:
        """性质(全职永久,穷举 AOS ∪ RRS ∪ 两个表外码 × 社区内 / 社区外 / 没城市):社区内可不可只看 RRS 表,社区外 / 没城市
        只看 AOS 表(原判一格不变);社区内可的码,不在具名通道上就挂乡村振兴。"""
        t = self.tables(self.RRS, self.PLACES)
        for noc in sorted(self.AOS | self.RRS | {"21231", "72410"}):
            got_in = self.both(t, ("Medicine Hat", noc, "full", "permanent"))
            self.assertEqual(got_in[0], noc not in self.RRS, noc)
            if got_in[0] and noc != "72410":
                self.assertEqual(got_in[1], "AB 乡村振兴", noc)
            for city in ("Calgary", ""):
                self.assertEqual(self.both(t, (city, noc, "full", "permanent"))[0], noc not in self.AOS, (city, noc))

    def test_rrs_real_tables(self) -> None:
        """真表金标:仓里 ab-rural.json 的排除码 = 官方 Table 1 的 17 码,且都在 AOS 真表里(差集就是这次放行的码);
        在招真岗(Job Bank 帖号 50284794 Medicine Hat 幼教 42202、50069779 Rocky Mountain House 小学教师 41221,
        2026-09-27 mart 在招行原样)整行接线后可提名、挂乡村振兴;同一岗搬到 Edmonton 照旧不可。
        官方改了 Table 1(pnp_ab 单元每小时重建 ab-rural.json),这条会红:核对官方页后改 RRS_TABLE1。"""
        from mart import functions as fn
        tables = fn.load_pnp_tables()
        comm = tables.community_by_prov.get("AB")
        if comm is None:
            self.skipTest("仓里没有 AB 乡村振兴社区表(raw/pnp/ab-rural.json)")
        self.assertEqual(comm["excluded"], self.RRS_TABLE1)
        aos = tables.by_prov["AB"]["nocs"]
        self.assertTrue(self.RRS_TABLE1 <= aos)
        self.assertIn("42202", aos - self.RRS_TABLE1)
        self.assertIn("41221", aos - self.RRS_TABLE1)
        jobs = [("jb:50284794", "early childhood education worker", "42202", "Medicine Hat"),
                ("jb:50069779", "elementary school teacher", "41221", "Rocky Mountain House")]
        for ext, title, noc, city in jobs:
            job = CollectedJob(ext=ext, title=title, agency=False, prov="AB", hint=noc, city=city, hours="full",
                               term="permanent", employer="", certs="")
            row = fn.to_scored_row(ScoredRowIn(tables=tables, job=job, labels={}))
            self.assertEqual((row["pnpEligible"], row["pnpStream"]), (True, "AB 乡村振兴"), ext)
            moved = CollectedJob(ext=ext, title=title, agency=False, prov="AB", hint=noc, city="Edmonton",
                                 hours="full", term="permanent", employer="", certs="")
            row = fn.to_scored_row(ScoredRowIn(tables=tables, job=moved, labels={}))
            self.assertEqual((row["pnpEligible"], row["pnpStream"]), (False, None), ext)

    def test_rrs_table_mutation_probe(self) -> None:
        """变异探针:社区表的排除码换成 AOS 表(= 这次修掉的旧口径)、从 RRS 表里拿掉 00010、社区名单拿掉 Medicine Hat ——
        金标格当场跟着变,证明判定读的是 RRS 自己那张表与社区名单。"""
        ece = ("Medicine Hat", "42202", "full", "permanent")
        mp = ("Medicine Hat", "00010", "full", "permanent")
        self.assertEqual(self.both(self.tables(self.RRS, self.PLACES), ece), (True, "AB 乡村振兴"))
        self.assertEqual(self.both(self.tables(self.AOS, self.PLACES), ece), (False, None))
        self.assertEqual(self.both(self.tables(self.RRS - {"00010"}, self.PLACES), mp), (True, "AB 乡村振兴"))
        self.assertEqual(self.both(self.tables(self.RRS, {"rocky mountain house"}), ece), (False, None))


class MartEmployerSectorTest(unittest.TestCase):
    """「看得出才改判」自测(2026-09-27 Frank 拍板):雇主行业三态 employer_sector_of 与四条改判规则(NB 餐饮住宿放行、
    BC 法语教师、AB 带星号码、SK 农业带星号码)。形制照宪法判定层测试:真数据金标(雇主名 / 职位名 / 证书栏都是 2026-09-27
    mart 在招岗原样)+ 性质 + 变异探针(词表逐词删、表上的条件键删,金标当场跟着变);省表走真装载器(现造 raw/pnp 小表落系统临时目录,
    不碰仓内文件),规则真表金标读仓里 raw/pnp(只读;pnp 单元还没按新口径重建时跳过)。
    同日 Frank 选「只上纯属改对的」:NS 建筑、AB 科技两条不接线,规则金标改成现状金标(修前修后通道名一致);两个行业键的词表金标
    与逐词探针照留(第二步的高置信层);分数与职业级通道档照原样(省点名不收行级带条件的码,test_named_unchanged)。"""

    GOLDEN = {
        "naics72": [
            ("AW Restaurant", "in"), ("Québec Resto", "in"), ("C4U Cafe", "in"), ("Carey Centre Cafeteria", "in"),
            ("Taj Bistro", "in"), ("Brasserie 1026", "in"), ("Q Pizza", "in"), ("O Sushi", "in"), ("DINER 81", "in"),
            ("Tavern 1883", "in"), ("Cedars Eatery", "in"), ("L-Eat Catering", "in"), ("MASTER CATERERS 2005 LTD.", "in"),
            ("Buffet Royale", "in"), ("DONAIR DUDE", "in"), ("SHAWARMA CORNER", "in"), ("Dojo Ramen", "in"),
            ("Park Hotel", "in"), ("Motel 8", "in"), ("Nomi Resort", "in"), ("Banff International Hostel", "in"),
            ("Dashwood Manor Seaside Bed & Breakfast", "in"), ("Mimi's Pub", "in"), ("DESI BAR & GRILL", "in"),
            ("A & W Food Services", "in"), ("Tim Horton", "in"), ("McDonald's", "in"), ("Dairy Queen", "in"),
            ("Burger King", "in"), ("Starbucks", "in"), ("Kingston Marriott", "in"), ("Tru By Hilton", "in"),
            ("Best Western", "in"), ("HOLIDAY INN", "in"), ("Days Inn", "in"), ("Comfort Inn", "in"), ("Quality inn", "in"),
            ("RAMADA INN", "in"), ("WYNDHAM GARDEN", "in"), ("Sheraton Laval", "in"), ("Sodexo Canada Ltd", "in"),
            ("Aramark Canada Ltd.", "in"), ("Compass Group Canada", "in"), ("Pattersons Family Restaurant", "in"),
            ("St. Paul's Hospital", "out"), ("Bio Health Center", "out"), ("Wolfville Nursing Home", "out"),
            ("Long Term Care Facility", "out"), ("Retirement Home", "out"), ("Laura Manor Special Care Home", "out"),
            ("Government of Canada", "out"), ("City of Delta", "out"), ("Department of Health", "out"),
            ("National Defence", "out"), ("Canadian Forces Non-Public Funds", "out"), ("Correctional Service Canada", "out"),
            ("Fisheries and Oceans Canada     - Canadian Coast Guard - Fleet* (* Note: Effective 1 September 2025, the "
             "Canadian Coast Guard has transferred to DND by Order-in-Council.)", "out"),
            ("Parks Canada", "out"), ("BC Public Service", "out"),
            ("School District No. 52", "out"), ("Conseil scolaire catholique MonAvenir", "out"), ("OC Cleaning", "out"),
            ("D&P Janitorial", "out"), ("Cooke Aquaculture Inc.", "out"), ("DTL Grocery", "out"),
            ("Garg's Groceries", "out"), ("T&T Supermarket", "out"), ("YXL Convenience", "out"), ("Kays Wholesale", "out"),
            ("Vitalité Health Network", "out"), ("Windsor Court Retirement Residence", "out"), ("Mama's Grocery", "out"),
            ("Department of Tourism, Heritage & Culture", "out"), ("Lanark Lodge Long Term Care Home", "out"),
            ("Southern Comfort Villa Residence", "unknown"), ("Villa du Repos Inc.", "unknown"), ("Petro Canada", "unknown"),
            ("Royal Oaks Golf Club", "unknown"), ("Amsterdam Inn & Suites", "unknown"), ("Inn Style Ltd", "unknown"),
            ("Fairmont Dentistry", "unknown"), ("EDO JAPAN University Heights", "unknown"), ("Osmow's College SQ", "unknown"),
            ("19th Hole Indoor Golf & Social", "unknown"), ("CRB Supermarket / Riverside Restaurant", "unknown"),
            ("Bahay Kubo Filipino Restaurant and Groceries", "unknown"), ("Aladdin Donair Wholesale", "unknown"), ("", "unknown"),
        ],
        "naics23": [
            ("T2 Construction", "in"), ("JS Contracting", "in"), ("Local Contractor", "in"), ("KC Roofing", "in"),
            ("J&M Drywall", "in"), ("Omega Formwork Inc.", "in"), ("Maco Paving", "in"), ("W&B Excavating", "in"),
            ("BLR Excavation", "in"), ("X Masonry", "in"), ("KDG Plumbing", "in"), ("OSG Renovation", "in"),
            ("Habermehl Contracting Ltd", "in"), ("CASTONE CONSTRUCTION LIMITED", "in"),
            ("Work Bangers Construction Inc.", "in"),
            ("WE Landscape", "out"), ("Lawn Hero", "out"), ("Irving Shipbuilding", "out"), ("JOEY Shipyards", "out"),
            ("Tidal Boatworks 2017", "out"), ("PAL Aerospace", "out"), ("FV FOODS", "out"), ("W Farms", "out"),
            ("Econo lumber", "out"), ("Ardent Mills ULC", "out"), ("UNIVERSITE LAVAL", "out"), ("ABM College", "out"),
            ("Akiva School", "out"), ("St. Paul's Hospital", "out"), ("Government of Canada", "out"), ("City of Delta", "out"),
            ("Fed Supply", "out"), ("Gulf Coast Materials", "out"), ("Matériaux Audet", "out"), ("HJV Equipment", "out"),
            ("Town Car Rental", "out"), ("Click Modular Homes", "out"), ("Accumetal Manufacturing Inc.", "out"),
            ("BIOTHEC FORESTERIE INC.", "out"), ("MBC Logging", "out"), ("OC Cleaning", "out"), ("D&P Janitorial", "out"),
            ("COMMUNITY BUILDERS", "out"), ("BBX Moving", "out"), ("PAL TRUCKING", "out"), ("SR TRANSPORT", "out"),
            ("DGA Global Hauling", "out"), ("East West Gardening Services Ltd.", "out"), ("Oxford Frozen Foods", "out"),
            ("IMP Aerospace and Defence", "out"), ("The Government of Nova Scotia", "out"),
            ("Armdale Lawn Care Incorporated", "out"),
            ("K.P. LABOUR CONTRACTOR LTD.", "unknown"), ("JCB Construction Canada", "unknown"),
            ("LIMA'S GARDENS AND CONSTRUCTION INC.", "unknown"), ("Kappil Contracting On Demand Inc.", "unknown"),
            ("Lawncraft Landscaping & construction Ltd.", "unknown"), ("Coastal Drywall Supplies Ltd", "unknown"),
            ("HMC Construction modulaire", "unknown"), ("Michelin North America Canada Inc.", "unknown"),
            ("Haggerty Electrical Ltd.", "unknown"), ("JAZ Renovations LTD / Paint Guys", "unknown"),
        ],
        "bcPublicSchool": [
            ("School District No. 52", "in"), ("School District #74 (Gold Trail)", "in"),
            ("Conseil scolaire catholique MonAvenir", "in"),
            ("Catholic Independent Schools Diocese of Prince George", "out"), ("AB - private household", "out"),
            ("IQRA Islamic School", "unknown"), ("Lax Kw'alaams Band", "unknown"), ("Department of National Defence", "unknown"),
            ("Canadian Forces Non-Public Funds", "unknown"),
        ],
        "abTech": [
            ("Lakes Software", "in"), ("Pluto IT Solutions", "in"), ("ThirdEye CyberSecurity", "in"),
            ("Visual-Eyes Software (SOTH Inc.)", "in"), ("Princeton IT Services Inc", "in"),
            ("MGR Workforce", "out"), ("YES Employment Services", "out"),
            ("Robert Half", "unknown"), ("Alberta Health Services", "unknown"), ("Microsoft Canada", "unknown"),
            ("Richie It Solutions Inc", "unknown"), ("Tech-Eyes", "unknown"), ("Accenture", "unknown"),
        ],
        "skAgriFood": [
            ("W Farms", "in"), ("JBC Cattle Inc.", "in"), ("DAM Livestock", "in"), ("HARVEST GRAIN KINDERSLEY LTD.", "in"),
            ("Harvest Grain Zealandia Ltd", "in"), ("Superior Pulses Inc.", "in"), ("Oxford Frozen Foods", "in"),
            ("Canada Packers", "in"), ("Patton Poultry Breeders Inc.", "in"), ("Lovingly Made Flour Mills", "in"),
            ("Saputo Dairy Products Canada G.P.", "in"),
            ("Fed Supply", "out"), ("FENS MARKET", "out"), ("BOLD Centre", "out"), ("HJV Equipment", "out"),
            ("Williams Machinery LP", "out"), ("All Budget Car Dealer", "out"), ("Hardy Sales", "out"),
            ("Town Car Rental", "out"), ("VISTA CREDIT", "out"), ("K5 Insurance", "out"), ("Fed Finance", "out"),
            ("Grasshopper Retail Inc.", "out"), ("Noodle store", "out"), ("DTL Grocery", "out"), ("T&T Supermarket", "out"),
            ("AW Restaurant", "out"), ("A & W Food Services", "out"), ("L-Eat Catering", "out"), ("Kays Wholesale", "out"),
            ("BG Distribution", "out"), ("SR TRANSPORT", "out"), ("PAL TRUCKING", "out"), ("DGA Global Hauling", "out"),
            ("MV Express", "out"), ("K.P. LABOUR CONTRACTOR LTD.", "out"), ("HORIZON EMPLOI", "out"),
            ("Employment Hero", "out"), ("Wood", "out"), ("ATMS Cabinet", "out"), ("AB Millwork Ltd", "out"),
            ("Edge Grain", "unknown"), ("Ah-So Sushi Farm Boy Kingston", "unknown"), ("Caledonia Clover Farm", "unknown"),
            ("Farm Lending Canada Inc", "unknown"), ("Steve's Livestock Transport", "unknown"),
            ("Vanee Farm Centre Inc", "unknown"), ("NutraSun Foods Ltd.", "unknown"), ("Maple Leaf Foods Inc.", "unknown"),
            ("Canada Golden Foods Limited.", "unknown"), ("Bourgault Industries Ltd.", "unknown"),
            ("Flaman Group of Companies", "unknown"), ("Flaman Fitness", "unknown"), ("BOURGAULT MACHINES INC", "unknown"),
            ("The Home Depot Canada", "unknown"),
        ],
    }
    """真数据金标:行业键 → (雇主名, 三态)。雇主名全是 2026-09-27 mart 在招岗的原样(Job Bank / 板仓 employer 格);每张词表的
    每个词都至少有一家「删了这个词判法就变」的雇主在里面(test_word_probe 逐词删着验),另收派工点名的例子与核词时撞出来的反例。
    三态逐家人工核过(见交付报告抽样清单)。"""

    PARTIAL_GOLDEN = [
        ("60040", "nail salon manager", "Gloss nail bar", "", True),
        ("60040", "hairstyling salon manager", "Hello Hair Salon Ltd.", "", True),
        ("60040", "barber shop manager", "ROMANTIKO BARBER SHOP - SIERRA", "", True),
        ("60040", "truck wash manager", "CALGARY CAR TRUCK WASH & LUBE CORP", "", True),
        ("60040", "cleaning service manager", "EYAEYO CLEANING SERVICES LTD.", "", True),
        ("60040", "janitorial services manager", "MR. PERFECT SERVICES LTD.", "", True),
        ("60040", "laundry manager", "Northern Lights Inn", "", True),
        ("60040", "tattoo studio manager", "Don’t Cry Tattoo Corp", "", True),
        ("60040", "pet grooming salon manager", "Oh My Dog Spa and Grooming - North", "", True),
        ("60040", "driving school manager", "Punjab Driving Academy & Globe Driving Academy", "", True),
        ("60040", "manager, home care service", "Trista", "", True),
        ("60040", "spa manager", "Leela Eco Spa", "", False),
        ("60040", "esthetic services manager", "Gratitude Beauty Inc.", "", False),
        ("60040", "Beauty salon supervisor", "Velvet Salon & Spa Inc", "", False),
        ("60040", "", "", "", False),
        ("33100", "dental assistant", "Cameron Dental", "", True),
        ("33100", "registered dental assistant", "Cool Dental", "", True),
        ("33100", "chair-side assistant - dental", "Ocean Periodontal & Dental Implant Centre", "", True),
        ("33100", "dental laboratory assistant", "style153 dental lab", "", False),
        ("33100", "dental laboratory technician assistant", "JAIJIA DENTAL LAB", "", False),
        ("42200", "paralegal", "Gloria E. Hammermeister Law", "", True),
        ("42200", "legal services officer - courts", "Native Counselling Services of Alberta", "", True),
        ("42200", "", "", "", False),
        ("42202", "early childhood educator (ece) - level 3", "PRECIOUS STARS DAYCARE & OSC", "", True),
        ("42202", "early childhood educator (ECE)", "Little Tots Daycare",
         "Child development supervisor (ECE level 3)\nEarly Childhood Education (ECE) Certificate\nFirst Aid Certificate\n"
         "CPR Certificate", True),
        ("42202", "child care worker - level 2", "Kids Avenue Early Learning Centre",
         "Child development worker (ECE level 2)\nFirst Aid Certificate\nCPR Certificate", True),
        ("42202", "early childhood educator (ECE) assistant", "Little Feet Daycare",
         "Child development assistant (ECE level 1)\nChild development worker (ECE level 2)\n"
         "Early Childhood Education (ECE) Certificate\nFirst Aid Certificate", False),
        ("42202", "early childhood educator (ece) - level 1", "Les Petits Géants", "", False),
        ("42202", "early childhood educator (ECE)", "Sunshine Childcare", "Early Childhood Education (ECE) Certificate",
         False),
        ("42202", "early childhood educator (ECE)", "BrightPath Kids Canada", "", False),
    ]
    """带星号码真数据金标:(职业码, 职位名, 雇主名, 证书栏, 看得出不属官方点名那一小类)。除两条空串格外都是 2026-09-27 在招岗原样
    (AB 为主;「Northern Lights Inn」jb:50244694、「Ocean Periodontal & Dental Implant Centre」jb:50181394 是 BC 的同码岗,拿来给
    laundry / chair-side 两词作证)。BrightPath 那条(jb:50379011)正文自由文本里写着「Level 2 Certification OR B.Ed.」,但评分段读不到
    正文,照挡(见交付报告;那岗是兼职,本就过不了阿省 offer 门槛)。"""

    PARTIAL_INSIDE_WITNESS = [
        ("60040", "nail salon manager", "Lotus Massage Nails"), ("60040", "cleaning service manager", "Elite Escort Services"),
        ("60040", "hair salon manager", "Body Rub Studio"), ("60040", "nail salon manager", "Parlour 9 Nails"),
        ("60040", "tattoo studio manager", "Erotic Ink"), ("60040", "nail salon manager", "Sensual Nails"),
        ("60040", "cleaning service manager", "Adult Services Cleaning"),
        ("33100", "dental assistant", "Smile Dental Lab"), ("33100", "dental assistant - laboratory", "Bright Dental"),
        ("33100", "dental assistant (bench)", "Bright Dental"), ("33100", "dental assistant", "Denture Clinic Inc."),
        ("33100", "dental assistant", "ABC Dental Technology"),
        ("42200", "justice of the peace", "Alberta Courts"), ("42200", "juge de paix", "Cour du Québec"),
        ("42202", "early childhood educator - level 1 or level 2", "Happy Daycare"),
        ("42202", "early childhood educator assistant - level 2", "Happy Daycare"),
        ("42202", "early childhood educator - level 2 or uncertified", "Happy Daycare"),
    ]
    """否决词的现造作证格(职业码, 职位名, 雇主名):每格恰好命中一个否决词、又带一个放行词 —— 删掉那个否决词就该放行。在招里没有
    按摩院 / 太平绅士 / 牙科技工所招 dental assistant 这类岗,否决词只能拿现造格验(派工要求的变异探针,2026-09-27)。"""

    def state_of(self, sector: str, name: str) -> str:
        """一个名字的三态(被测函数)。"""
        from mart import functions as fn
        return fn.employer_sector_of(SectorIn(sector=sector, employer=name))

    def test_golden(self) -> None:
        """真数据金标逐家对照(五个行业键全在;每个行业三态都有例子)。"""
        from mart import constants as c
        self.assertEqual(set(self.GOLDEN), set(c.SECTOR_IN_WORDS))
        self.assertEqual(set(c.SECTOR_IN_WORDS), set(c.SECTOR_OUT_WORDS))
        for sector, cases in self.GOLDEN.items():
            states = set()
            for name, want in cases:
                states.add(want)
                with self.subTest(sector=sector, name=name):
                    self.assertEqual(self.state_of(sector, name), want)
            self.assertLessEqual({"in", "unknown"}, states, sector)

    def test_word_probe(self) -> None:
        """变异探针:两张词表逐词删(每次只删一个),该行业的金标至少一家当场变判 —— 词表改一词就红;也证明每个词都有真雇主作证。"""
        from mart import constants as c
        for table in (c.SECTOR_IN_WORDS, c.SECTOR_OUT_WORDS):
            for sector, words in table.items():
                for i in range(len(words)):
                    short = words[:i] + words[i + 1:]
                    changed = 0
                    with mock.patch.dict(table, {sector: short}):
                        for name, want in self.GOLDEN[sector]:
                            if self.state_of(sector, name) != want:
                                changed += 1
                    self.assertGreater(changed, 0, (sector, words[i].pattern))

    def test_property(self) -> None:
        """性质:空名 / 纯空白 / 名字里并列商号(斜杠)一律看不出;本域不认得的行业键一律看不出;在行业的名字拼上一个不在行业的词
        (两边都命中)一律看不出;名字整体转大写不改判 —— 科技那条除外:只认大写 IT(小写 it 是代词),「Richie It Solutions Inc」
        看不出、转成大写才认得出,这是有意的,单独断言。"""
        from mart import constants as c
        for sector in c.SECTOR_IN_WORDS:
            for name in ("", "   "):
                self.assertEqual(self.state_of(sector, name), "unknown", (sector, name))
            ins = []
            outs = []
            for name, want in self.GOLDEN[sector]:
                if want == "in":
                    ins.append(name)
                if want == "out":
                    outs.append(name)
                if name.strip() == "":
                    continue
                self.assertEqual(self.state_of(sector, name + " / Other Co"), "unknown", (sector, name))
                if sector != "abTech":
                    self.assertEqual(self.state_of(sector, name.upper()), want, (sector, name))
            for a in ins:
                for b in outs[:3]:
                    self.assertEqual(self.state_of(sector, a + " " + b), "unknown", (sector, a, b))
        self.assertEqual(self.state_of("abTech", "Richie It Solutions Inc"), "unknown")
        self.assertEqual(self.state_of("abTech", "RICHIE IT SOLUTIONS INC"), "in")
        self.assertEqual(self.state_of("abTech", "Fix It Services"), "unknown")
        self.assertEqual(self.state_of("bcHealthAuthority", "Fraser Health Authority"), "unknown")
        self.assertEqual(self.state_of("nope", "T2 Construction"), "unknown")

    def outside_of(self, row: tuple) -> bool:
        """一格带星号码金标 → is_partial_outside(被测函数;省表与城市在这一判里不看,给空)。"""
        from mart import functions as fn
        noc, title, employer, certs = row[:4]
        tables = PnpTables(by_prov={}, named_by_prov={}, community_by_prov={}, ee_by_noc={})
        return fn.is_partial_outside(PnpJudgeIn(tables=tables, noc=noc, teer=int(noc[1]), prov="AB", hours="", term="",
                                                city="", employer=employer, title=title, certs=certs))

    def test_partial_golden(self) -> None:
        """带星号码真数据金标逐格对照;表上带星号而本站没定判据的码(现造 99999)一律看不出。"""
        for row in self.PARTIAL_GOLDEN:
            with self.subTest(row=row[:3]):
                self.assertEqual(self.outside_of(row), row[4])
        self.assertFalse(self.outside_of(("99999", "anything", "Any Co", "")))

    def test_partial_word_probe(self) -> None:
        """变异探针:放行词逐词删,真金标至少一格从放行变不放行;否决词逐词删,现造作证格从不放行变放行(每格恰好靠那一个词挡住)。"""
        from mart import constants as c
        for noc, words in c.PARTIAL_OUTSIDE_WORDS.items():
            for i in range(len(words)):
                with mock.patch.dict(c.PARTIAL_OUTSIDE_WORDS, {noc: words[:i] + words[i + 1:]}):
                    changed = 0
                    for row in self.PARTIAL_GOLDEN:
                        if row[0] == noc and self.outside_of(row) != row[4]:
                            changed += 1
                self.assertGreater(changed, 0, (noc, words[i].pattern))
        for noc, words in c.PARTIAL_INSIDE_WORDS.items():
            for i in range(len(words)):
                flipped = 0
                for w_noc, title, employer in self.PARTIAL_INSIDE_WITNESS:
                    if w_noc != noc:
                        continue
                    self.assertFalse(self.outside_of((noc, title, employer, "")), (noc, title))
                    with mock.patch.dict(c.PARTIAL_INSIDE_WORDS, {noc: words[:i] + words[i + 1:]}):
                        if self.outside_of((noc, title, employer, "")):
                            flipped += 1
                self.assertGreater(flipped, 0, (noc, words[i].pattern))

    def raw_tables(self) -> dict:
        """现造的 raw/pnp 小表(文件名 → 表;形同 pnp 域 build_* 的产出,新键照 2026-09-27 口径):NB 两张叠加排除(不论行业 3 码 /
        餐饮住宿 4 码带 naics72)、NS 建筑(现状:官方 22 码剔 75101 / 75119 共 20 码,不带行业键)、BC 排除表 + 法语教师(带
        bcPublicSchool)、AB 的 AOS 表(带星号四码 partial)+ 科技(现状:不带行业键)+ 乡村振兴(排除 3 码,全带星号)、SK Job Offer
        排除表 + 农业(带星号的行级 skAgriFood)。NS 建筑与 AB 科技两张照现状写:2026-09-27 Frank 选「只上纯属改对的」。"""
        ns = []
        for noc in ("70010", "70011", "72011", "72014", "72020", "72102", "72106", "72200", "72201", "72310", "72320",
                    "72401", "72402", "72500", "73100", "73102", "73110", "73200", "73400", "75110"):
            ns.append({"noc": noc})
        return {
            "nb-ineligible.json": {"province": "NB", "type": "ineligible", "overlay": True, "label": "NB 不符合清单",
                                   "occupations": [{"noc": "65100"}, {"noc": "94142"}, {"noc": "95106"}]},
            "nb-ineligible-food.json": {"province": "NB", "type": "ineligible", "overlay": True, "label": "NB 餐饮住宿不符合",
                                        "employerSector": "naics72",
                                        "occupations": [{"noc": "62020"}, {"noc": "63200"}, {"noc": "65201"},
                                                        {"noc": "65310"}]},
            "ns-construction.json": {"province": "NS", "type": "indemand", "label": "NS 建筑", "occupations": ns},
            "bc-ineligible.json": {"province": "BC", "type": "ineligible", "label": "BC 不合格职业",
                                   "occupations": [{"noc": "65201"}]},
            "bc-education.json": {"province": "BC", "type": "indemand", "label": "BC 法语教师",
                                  "employerSector": "bcPublicSchool", "occupations": [{"noc": "41220"}, {"noc": "41221"}]},
            "aaip-ineligible.json": {"province": "AB", "type": "ineligible", "label": "AAIP 不符合清单",
                                     "occupations": [{"noc": "60040", "partial": True}, {"noc": "42200", "partial": True},
                                                     {"noc": "42202", "partial": True}, {"noc": "33100", "partial": True},
                                                     {"noc": "00010", "partial": False}, {"noc": "41221", "partial": False}]},
            "ab-tech.json": {"province": "AB", "type": "indemand", "label": "AB 科技",
                             "occupations": [{"noc": "21232"}, {"noc": "22222"}, {"noc": "32120"}]},
            "ab-rural.json": {"province": "AB", "type": "community", "label": "AB 乡村振兴",
                              "communities": ["Medicine Hat"], "excluded": ["00010", "33100", "60040"],
                              "excludedPartial": ["33100", "60040"]},
            "sk-joboffer-excluded.json": {"province": "SK", "type": "ineligible", "label": "SK Job Offer 不合格清单",
                                          "occupations": [{"noc": "65201"}]},
            "sk-agri.json": {"province": "SK", "type": "indemand", "label": "SK 农业",
                             "occupations": [{"noc": "85100"}, {"noc": "75101", "employerSector": "skAgriFood"},
                                             {"noc": "95106", "employerSector": "skAgriFood"}]},
        }

    def load_tables(self, raw: dict) -> PnpTables:
        """把现造小表落到系统临时目录,真装载器 load_pnp_tables 读进来(IN_PNP_DIR / IN_EE_CATEGORIES 临时指过去)。"""
        from mart import functions as fn
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, table in raw.items():
                (root / name).write_text(json.dumps(table, ensure_ascii=False), encoding="utf-8")
            with mock.patch.object(fn, "IN_PNP_DIR", root), mock.patch.object(fn, "IN_EE_CATEGORIES", root / "none.json"):
                return fn.load_pnp_tables()

    def scored(self, tables: PnpTables, job: tuple) -> tuple:
        """一条在招岗 (岗号, 省, 城市, 职业码, 雇主名, 职位名, 工时, 雇佣期, 证书栏) → (pnpEligible, pnpStream)(整行接线)。"""
        from mart import functions as fn
        ext, prov, city, noc, employer, title, hours, term, certs = job
        row = fn.to_scored_row(ScoredRowIn(tables=tables, job=CollectedJob(
            ext=ext, title=title, agency=False, prov=prov, hint=noc, city=city, hours=hours, term=term, employer=employer,
            certs=certs), labels={}))
        return row["pnpEligible"], row["pnpStream"]

    def jobs(self) -> list:
        """规则金标:(在招岗, 修后 (pnpEligible, pnpStream))。岗全是 2026-09-27 mart 在招行原样(工时 / 雇佣期 / 证书栏照抄);
        判的是现造省表(raw_tables)上的修后判法 —— 修前 NB 餐饮住宿码与 AB 带星号码一律不可、带条件的具名清单按码一律挂名。
        NS 建筑、AB 科技两组是现状金标(修前修后通道名一致:造船厂、轮胎厂、卫生局照旧挂名,75101 照旧不在 NS 建筑清单上;
        2026-09-27 Frank 选「只上纯属改对的」)。"""
        return [
            (("careerbeacon:1834701", "NB", "Grand Falls", "63200", "Vitalité Health Network", "Food Services - Cook", "full",
              "term", ""), (True, None)),
            (("careerbeacon:2233635", "NB", "St. George", "63200", "Cooke Aquaculture Inc.", "Deckhand/Cook - Large Vessel",
              "full", "", ""), (True, None)),
            (("gcjobs:2422528", "NB", "Dorchester", "65201", "Correctional Service Canada",
              "Food Service Attendant, consider a career with the Correctional Service of Canada–Atlantic Region", "full",
              "permanent", ""), (True, None)),
            (("jb:50283658", "NB", "Fredericton", "62020", "Windsor Court Retirement Residence", "assistant kitchen manager",
              "full", "permanent", ""), (True, None)),
            (("jb:50294478", "NB", "Sackville", "63200", "Pattersons Family Restaurant", "licensed cook", "full", "permanent",
              ""), (False, None)),
            (("jb:50276199", "NB", "Bathurst", "62020", "Southern Comfort Villa Residence", "kitchen supervisor", "full",
              "permanent", ""), (False, None)),
            (("jb:50337811", "NB", "St. George", "95106", "Cooke Aquaculture Inc.", "labourer - food and beverage processing",
              "full", "permanent", ""), (False, None)),
            (("jb:50364690", "NB", "Saint John", "65310", "Maid in Heaven Cleaning Inc.", "maid - cleaning services", "part",
              "permanent", ""), (False, None)),
            (("jb:50364425", "NS", "Bedford", "72310", "Habermehl Contracting Ltd", "carpenter", "full", "permanent", ""),
             (True, "NS 建筑")),
            (("jb:50356489", "NS", "Sydney", "75101", "Work Bangers Construction Inc.", "material handler", "full",
              "permanent", ""), (True, None)),
            (("jb:50241179", "NS", "Halifax", "75110", "Irving Shipbuilding", "construction labourer", "full", "permanent",
              ""), (True, "NS 建筑")),
            (("jb:50266499", "NS", "Waterville", "72201", "Michelin North America Canada Inc.", "industrial electrician",
              "full", "permanent", ""), (True, "NS 建筑")),
            (("jb:50294237", "BC", "Surrey", "41221", "IQRA Islamic School", "elementary school teacher", "full", "permanent",
              "Provincial or Territorial Teaching Certificate"), (True, None)),
            (("jb:49948052", "BC", "Prince Rupert", "41221", "Catholic Independent Schools Diocese of Prince George",
              "teacher, primary school", "full", "permanent", "Provincial or Territorial Teaching Certificate"),
             (True, None)),
            (("jb:50316794", "AB", "Red Deer", "22222", "Visual-Eyes Software (SOTH Inc.)", "software tester", "full", "",
              ""), (True, "AB 科技")),
            (("jobillico:17565351", "AB", "Calgary", "32120", "Alberta Health Services",
              "Magnetic resonance imaging technologist i", "full", "permanent", ""), (True, "AB 科技")),
            (("jb:50357104", "AB", "Edmonton", "21232", "Richie It Solutions Inc", "software developer", "full", "permanent",
              ""), (True, "AB 科技")),
            (("jb:50357627", "AB", "Medicine Hat", "60040", "Gloss nail bar", "nail salon manager", "full", "permanent", ""),
             (True, "AB 乡村振兴")),
            (("jb:50350834", "AB", "Calgary", "60040", "Leela Eco Spa", "spa manager", "full", "permanent", ""),
             (False, None)),
            (("jb:50362776", "AB", "Fort Saskatchewan", "33100", "Cameron Dental", "dental assistant", "full", "permanent",
              ""), (True, None)),
            (("jb:50366436", "AB", "Calgary", "33100", "style153 dental lab", "dental laboratory assistant", "full",
              "permanent", ""), (False, None)),
            (("jb:50358206", "AB", "Edmonton", "42200", "Gloria E. Hammermeister Law", "paralegal", "full", "permanent", ""),
             (True, None)),
            (("jb:50377628", "AB", "Fort McMurray", "42202", "Little Tots Daycare", "early childhood educator (ECE)", "full",
              "permanent", "Child development supervisor (ECE level 3)\nEarly Childhood Education (ECE) Certificate\n"
              "First Aid Certificate\nCPR Certificate"), (True, None)),
            (("jb:50098047", "AB", "Sylvan Lake", "42202", "Sylvan Lake Daycare", "early childhood educator (ECE)", "full",
              "permanent", "Child development assistant (ECE level 1)\nChild development worker (ECE level 2)\n"
              "Early Childhood Education (ECE) Certificate\nFirst Aid Certificate\nCPR Certificate"), (False, None)),
            (("jb:50163008", "SK", "Zealandia", "75101", "Harvest Grain Zealandia Ltd", "material handler", "full",
              "permanent", ""), (True, "SK 农业")),
            (("jb:50093344", "SK", "Verwood", "95106", "Superior Pulses Inc.", "food processing labourer", "full", "permanent",
              ""), (True, "SK 农业")),
            (("jb:50077095", "SK", "Regina", "75101", "NutraSun Foods Ltd.", "material handler", "full", "permanent", ""),
             (True, "SK 现有工签")),
            (("jb:50355761", "SK", "Saskatoon", "75101", "Two Men And A Truck", "material handler", "full", "permanent", ""),
             (True, "SK 现有工签")),
        ]

    def test_rules_golden(self) -> None:
        """规则金标整行接线:NB 医院 / 水产养殖 / 联邦监狱 / 养老院的厨房岗放行、餐馆照挡、看不出(Villa Residence)照挡、不论行业
        那张表照挡、兼职照 offer 门槛挡;BC 法语教师私校 / 教会学校不挂;AB 带星号码按一小类判;SK 农业只挂给看得出的农业 / 食品制造雇主,
        看不出的照旧落现有工签。NS 建筑、AB 科技是现状金标(2026-09-27 Frank 选「只上纯属改对的」):造船厂 / 轮胎厂照旧挂 NS 建筑、
        75101 照旧不在 NS 建筑清单上,卫生局 / 小写 It 的公司照旧挂 AB 科技。"""
        tables = self.load_tables(self.raw_tables())
        for job, want in self.jobs():
            with self.subTest(ext=job[0]):
                self.assertEqual(self.scored(tables, job), want)

    def test_rules_occupation_level(self) -> None:
        """性质:职业 × 省级(雇主 / 职位名 / 证书栏给空串)一律看不出 —— NB 餐饮住宿码照挡、AB 带星号码照挡、带条件的具名清单不算
        命中(SK 农业带星号 75101 落现有工签档而非直可)。现状金标(2026-09-27 Frank 选「只上纯属改对的」):NS 建筑表不带条件,
        TEER 5 的 75110 照旧直可,雇主是谁都一样。"""
        from mart import functions as fn
        tables = self.load_tables(self.raw_tables())
        for prov, noc in (("NB", "63200"), ("AB", "60040"), ("AB", "42202")):
            judge = PnpJudgeIn(tables=tables, noc=noc, teer=int(noc[1]), prov=prov, hours="", term="", city="", employer="",
                               title="", certs="")
            self.assertFalse(fn.pnp_eligible(judge), (prov, noc))
        judge = PnpJudgeIn(tables=tables, noc="75101", teer=5, prov="SK", hours="", term="", city="", employer="", title="",
                           certs="")
        self.assertTrue(fn.pnp_eligible(judge))
        self.assertFalse(fn.pnp_direct(judge))
        for employer in ("", "Irving Shipbuilding", "Habermehl Contracting Ltd"):
            judge = PnpJudgeIn(tables=tables, noc="75110", teer=5, prov="NS", hours="", term="", city="", employer=employer,
                               title="construction worker", certs="")
            self.assertTrue(fn.pnp_direct(judge), employer)

    def test_rules_mutation_probe(self) -> None:
        """变异探针:表上的条件键删掉(= pnp 单元还是旧口径的表)→ 金标退回改前判法:NB 医院厨师不可、AB 牙医诊所助理不可、
        SK 搬运工(NutraSun)挂 SK 农业、BC 私校老师挂 BC 法语教师;乡村振兴社区(Medicine Hat)里的美甲店经理同理不可。证明判法读的是
        表上的键,不是职业码碰巧。反向探针:给 NS 建筑表补上 naics23(= 第二步接线的样子),造船厂当场摘掉 NS 建筑 —— 现状金标
        靠的是表上没有这个键(2026-09-27 Frank 选「只上纯属改对的」)。"""
        raw = self.raw_tables()
        del raw["nb-ineligible-food.json"]["employerSector"]
        del raw["bc-education.json"]["employerSector"]
        for o in raw["aaip-ineligible.json"]["occupations"]:
            o["partial"] = False
        for o in raw["sk-agri.json"]["occupations"]:
            o.pop("employerSector", None)
        raw["ab-rural.json"]["excludedPartial"] = []
        tables = self.load_tables(raw)
        vit = ("careerbeacon:1834701", "NB", "Grand Falls", "63200", "Vitalité Health Network", "Food Services - Cook",
               "full", "term", "")
        dent = ("jb:50362776", "AB", "Fort Saskatchewan", "33100", "Cameron Dental", "dental assistant", "full", "permanent",
                "")
        nut = ("jb:50077095", "SK", "Regina", "75101", "NutraSun Foods Ltd.", "material handler", "full", "permanent", "")
        cis = ("jb:49948052", "BC", "Prince Rupert", "41221", "Catholic Independent Schools Diocese of Prince George",
               "teacher, primary school", "full", "permanent", "Provincial or Territorial Teaching Certificate")
        nail = ("jb:50357627", "AB", "Medicine Hat", "60040", "Gloss nail bar", "nail salon manager", "full", "permanent", "")
        self.assertEqual(self.scored(tables, vit), (False, None))
        self.assertEqual(self.scored(tables, dent), (False, None))
        self.assertEqual(self.scored(tables, nut), (True, "SK 农业"))
        self.assertEqual(self.scored(tables, cis), (True, "BC 法语教师"))
        self.assertEqual(self.scored(tables, nail), (False, None))
        self.assertEqual(self.scored(self.load_tables(self.raw_tables()), nail), (True, "AB 乡村振兴"))
        wired = self.raw_tables()
        wired["ns-construction.json"]["employerSector"] = "naics23"
        irv = ("jb:50241179", "NS", "Halifax", "75110", "Irving Shipbuilding", "construction labourer", "full", "permanent", "")
        self.assertEqual(self.scored(self.load_tables(wired), irv), (True, None))
        self.assertEqual(self.scored(self.load_tables(self.raw_tables()), irv), (True, "NS 建筑"))

    def test_named_unchanged(self) -> None:
        """性质 + 变异探针(2026-09-27 Frank 选「只上纯属改对的」):省点名(score 的 +12、职业级通道档)照合入前 —— SK 农业行级带条件
        的星号码不算点名、不带条件的照算;整表带条件的 BC 法语教师照算;同一个星号码岗,雇主认得出(Harvest Grain)也好、认不出也好,
        分数一样。探针:把星号码行上的 employerSector 删掉(= 合入前一版照收的表),它当场算进点名。"""
        from mart import functions as fn
        tables = self.load_tables(self.raw_tables())
        self.assertEqual(tables.named_by_prov["SK"], {"85100"})
        self.assertLessEqual({"41220", "41221"}, tables.named_by_prov["BC"])
        self.assertIn("75110", tables.named_by_prov["NS"])
        scores = set()
        for employer in ("Harvest Grain Zealandia Ltd", "NutraSun Foods Ltd."):
            row = fn.to_scored_row(ScoredRowIn(tables=tables, job=CollectedJob(
                ext="x", title="material handler", agency=False, prov="SK", hint="75101", city="Regina", hours="full",
                term="permanent", employer=employer, certs=""), labels={}))
            scores.add(row["score"])
        self.assertEqual(len(scores), 1)
        raw = self.raw_tables()
        for o in raw["sk-agri.json"]["occupations"]:
            o.pop("employerSector", None)
        self.assertEqual(self.load_tables(raw).named_by_prov["SK"], {"85100", "75101", "95106"})

    def test_real_tables(self) -> None:
        """真表金标(读仓里 raw/pnp,只读):pnp 单元按 2026-09-27 口径重建过的表才验 —— NB 餐饮住宿表带 naics72、BC 法语教师表带
        bcPublicSchool 而卫生局表不带、AOS 表带星号的恰好是 60040 / 42200 / 42202 / 33100、乡村振兴表带星号的恰好是 60040 / 42200 /
        33100、SK 农业表带星号七码都标 skAgriFood;现状金标(同日 Frank 选「只上纯属改对的」):NS 建筑表照旧 20 码、不含 75101 /
        75119、不带行业键,AB 科技表不带行业键。表还是旧口径(没有新键)就跳过:等容器换版、pnp 各省单元跑过一轮再验。"""
        from mart import functions as fn
        if not fn.IN_PNP_DIR.exists():
            self.skipTest("仓里没有 raw/pnp")
        paths_of = {}
        for f in sorted(fn.IN_PNP_DIR.glob("*.json")):
            paths_of[f.name] = f
        need = ("nb-ineligible-food.json", "ns-construction.json", "bc-education.json", "ab-tech.json",
                "aaip-ineligible.json", "ab-rural.json", "sk-agri.json", "bc-health-authority.json")
        for name in need:
            if name not in paths_of:
                self.skipTest("仓里缺 raw/pnp/" + name)
        tbl = {}
        for name in need:
            tbl[name] = json.loads(paths_of[name].read_text(encoding="utf-8"))
        if "employerSector" not in tbl["nb-ineligible-food.json"] or "excludedPartial" not in tbl["ab-rural.json"]:
            self.skipTest("raw/pnp 还是旧口径(pnp 单元未按 2026-09-27 口径重建)")
        self.assertEqual(tbl["nb-ineligible-food.json"].get("employerSector"), "naics72")
        ns_codes = set()
        for o in tbl["ns-construction.json"]["occupations"]:
            ns_codes.add(o["noc"])
        self.assertEqual(len(ns_codes), 20)
        self.assertEqual({"75101", "75119"} & ns_codes, set())
        self.assertNotIn("employerSector", tbl["ns-construction.json"])
        self.assertEqual(tbl["bc-education.json"].get("employerSector"), "bcPublicSchool")
        self.assertNotIn("employerSector", tbl["bc-health-authority.json"])
        self.assertNotIn("employerSector", tbl["ab-tech.json"])
        partial = set()
        for o in tbl["aaip-ineligible.json"]["occupations"]:
            if o.get("partial") is True:
                partial.add(o["noc"])
        self.assertEqual(partial, {"60040", "42200", "42202", "33100"})
        self.assertEqual(set(tbl["ab-rural.json"]["excludedPartial"]), {"60040", "42200", "33100"})
        marked = set()
        for o in tbl["sk-agri.json"]["occupations"]:
            if o.get("employerSector") == "skAgriFood":
                marked.add(o["noc"])
        self.assertEqual(marked, {"14401", "75101", "94140", "94141", "94143", "94204", "95106"})


class MartSalaryTextTest(unittest.TestCase):
    """正文挖薪资自测(2026-09-27 Frank 勾「薪资抽取补三种写法」):新写法逐条金标(取证样例原句,出自 Jobillico / Jobboom /
    CareerBeacon 正文)、非薪资金额反例一律不挖、旧注释里记着的原判照过、挖出的串经下游 parse_salary 单位不变、两道挂名词闸的
    变异探针。全程只喂字符串,不读不写仓内文件。"""

    def positives(self) -> list[tuple[str, str]]:
        """手写金标:(正文片段, 该挖出的串)。"""
        return [
            ("Salaire : 25$ à 37$ de l'heure", "$25 - $37 per hour"),
            ("Rémunération : 25$ à 37$", "$25 - $37 per hour"),
            ("Salaire : 47 000 $ - 50 000 $ par année", "$47,000 - $50,000 per year"),
            ("Taux horaire : 18,50 $/heure", "$18.50 per hour"),
            ("Salaire : 23,10 $ l'heure + assurances collectives", "$23.10 per hour"),
            ("Poste de jour | 20,94 $/h | 4 jours/semaine | Permanent", "$20.94 per hour"),
            ("Salaire : 22 à 25 $ de l’heure", "$22 - $25 per hour"),
            ("Salaire annuel entre 47 064 $ et 66 039 $ selon l’expérience", "$47,064 - $66,039 per year"),
            ("Échelle de rémunération totale : 17, 00 $ - 25, 00 $. Le taux horaire convenu", "$17.00 - $25.00 per hour"),
            ("Salary: Min. $98 420 yearly", "$98,420 per year"),
            ("Place of work: Kuujjuaq\nSalary: Min. $98 420 yearly, max. $135 335 yearly (class 94)",
             "$98,420 - $135,335 per year"),
            ("Salary: Min. $60 074 - Max. $102 839 a year (Class 9)", "$60,074 - $102,839 per year"),
            ("Salary: Min.: $43 348 yearly – Max. $71 800 yearly (Class 6)", "$43,348 - $71,800 per year"),
            ("Salary: Minimum of $63,716 and maximum of $109,329 per year", "$63,716 - $109,329 per year"),
            ("Pay Grade: TE 26\n\nSalary Range: $2,013.12 - $2,244.03 Bi-Weekly\n\nEmployment Equity Statement",
             "$2,013.12 - $2,244.03 bi-weekly"),
            ("## Wage\n\n$ 2,807 to $ 3,448 bi-weekly based on education", "$2,807 - $3,448 bi-weekly"),
            ("Total earning range: $18.00 - $27.00 The agreed upon hourly rate will be commensurate with experience",
             "$18.00 - $27.00 per hour"),
            ("Salary:\n\n$42,000.00 - $92,000.00\nPay Type:\n\nSalaried", "$42,000.00 - $92,000.00 per year"),
            ("Salary or Pay Band: Pay Band 17 $40.610 to $43.510 (3 step range)", "$40.610 - $43.510 per hour"),
            ("Candidats de 18 à 25 ans; salaire : 22 $/h", "$22 per hour"),
            ("Shift Premium: 2nd Shift ($3) 3rd Shift ($4) Weekend ($3) Pay: $25.52/hr", "$25.52 per hour"),
        ]

    def negatives(self) -> list[str]:
        """反例:营收、签约奖金、报销上限、罚款、年龄数字、补贴 / 生活费差额、收入潜力、封顶话术、写了两周却是时薪量级 —— 一律不挖。"""
        return [
            "Notre entreprise réalise un chiffre d'affaires de 800 000 $ par année.",
            "The company generates $2 500 000 per year in revenue.",
            "With annual revenue of $750,000 per year, we are growing fast.",
            "Rémunération : prime à la signature de 25 000 $",
            "Compensation: $25,000 signing bonus after 6 months",
            "Prime de soir de 15 $/h",
            "Remboursement annuel de 30 000 $ par année pour les études",
            "Tuition reimbursement up to $5,250 per year",
            "Remboursement des frais jusqu’à 1 000 $ par année",
            "Toute absence non motivée entraîne une amende de 20 $ de l’heure.",
            "Late cancellations incur a fine of $50 per hour.",
            "Âge : 18 ans et plus. Salaire à discuter.",
            "Cost of living differential: Minimum of $20 500/year",
            "The total amount of these allowances will normally fall between $24,595 to $49,517 per year",
            "vous avez le potentiel de gagner 70 000 $ par an",
            "Earning potential of over $35/hr in one of our busy salons",
            "Salaire concurrentiel pouvant atteindre 60 000 $ par année",
            "Up to $140,000",
            "Prime de 4$/h",
            "Wage: $25 - $30 bi-weekly",
            "starting annual salary of $74.984.00",
        ]

    def documented(self) -> list[tuple[str, str]]:
        """旧注释里记着的原判(2026-09-15 那批):照过 —— 串换成规范写法,parse_salary 算出的年薪与文本不变。"""
        return [
            ("expected range of compensation for this role is $53,000-$78,000", "$53,000 - $78,000 per year"),
            ("$22.40 - $25.40 per hour", "$22.40 - $25.40 per hour"),
            ("Salary: $43,000, per year", "$43,000 per year"),
            ("Salary: $55K", "$55,000 per year"),
            ("$4,000 per year", ""),
            ("$5.95/hour night premium", ""),
            ("Salary: To be discussed", ""),
        ]

    def parse(self, raw: str) -> SalaryOut:
        """下游那把尺子(parse_salary)读挖出的串。"""
        from mart import functions as fn
        return fn.parse_salary(SalaryParseIn(raw=raw, guards=SalaryGuards(absurd=0, ratio=0, cap=0, gig=0, hifold=0)))

    def test_new_formats_golden(self) -> None:
        """新写法逐条金标。"""
        from mart import functions as fn
        for text, want in self.positives():
            with self.subTest(text=text):
                self.assertEqual(fn.salary_from_text(text), want)

    def test_non_salary_amounts_rejected(self) -> None:
        """反例一律不挖(空串)。"""
        from mart import functions as fn
        for text in self.negatives():
            with self.subTest(text=text):
                self.assertEqual(fn.salary_from_text(text), "")

    def test_documented_cases_unchanged(self) -> None:
        """原判照过:串与金标一致;parse_salary 读规范串与读旧式原串结果相同(年薪与显示文本)。"""
        from mart import functions as fn
        old_raw = {"$53,000 - $78,000 per year": "$53,000-$78,000 per year", "$43,000 per year": "$43,000, per year"}
        for text, want in self.documented():
            with self.subTest(text=text):
                got = fn.salary_from_text(text)
                self.assertEqual(got, want)
                if want in old_raw:
                    self.assertEqual(self.parse(got), self.parse(old_raw[want]))

    def test_mined_strings_parse_to_same_unit(self) -> None:
        """性质:每条挖出的串,下游 parse_salary 都能年化、单位与挖的时候判的一致(时薪 /hr、年薪 /yr、两周 /2wk)。"""
        for text, want in self.positives():
            with self.subTest(text=text):
                out = self.parse(want)
                shown = out.text or ""
                self.assertIsNotNone(out.annual)
                if want.endswith("per hour"):
                    self.assertTrue(shown.endswith("/hr"), shown)
                elif want.endswith("bi-weekly"):
                    self.assertTrue(shown.endswith("/2wk"), shown)
                else:
                    self.assertTrue(shown.endswith("/yr"), shown)

    def test_biweekly_annualised_26(self) -> None:
        """两周薪按 26 期年化(SAL_MULT 的 biwk):$2,013.12–$2,244.03 → 中点 × 26 = 55,343。"""
        self.assertEqual(self.parse("$2,013.12 - $2,244.03 bi-weekly").annual, 55343)

    def test_not_pay_guard_probe(self) -> None:
        """变异探针:两道挂名词闸换成永不命中,奖金 / 营收 / 罚款 / 报销那几条反例当场被挖出来 —— 证明拦住它们的是这两道闸,
        而不是碰巧量级不对。"""
        from mart import functions as fn
        never = re.compile(r"(?!x)x")
        probes = ["Notre entreprise réalise un chiffre d'affaires de 800 000 $ par année.",
                  "Rémunération : prime à la signature de 25 000 $", "Compensation: $25,000 signing bonus after 6 months",
                  "Late cancellations incur a fine of $50 per hour.",
                  "Remboursement annuel de 30 000 $ par année pour les études"]
        with mock.patch.object(fn, "SAL_TXT_NOT_PAY_RE", never), mock.patch.object(fn, "SAL_TXT_NOT_PAY_AFTER_RE", never):
            for text in probes:
                with self.subTest(text=text):
                    self.assertNotEqual(fn.salary_from_text(text), "")
        for text in probes:
            self.assertEqual(fn.salary_from_text(text), "")


class MartApplyMailTest(unittest.TestCase):
    """正文抽投递邮箱自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」(其中「邮箱 confidentialité 误删」)):保密语境里紧挨着投递动作的邮箱要收、便利安排 / 无障碍 / 隐私类
    照旧排除(Bell 帖英法两版原句)、硬排除词不被投递动词改口的性质、投递动作判据的变异探针。"""

    def positives(self) -> list[tuple[str, str]]:
        """手写金标:(正文片段, 该抽到的邮箱)。"""
        return [
            ("Faites-nous parvenir votre curriculum vitae en toute confidentialité à l’adresse jfg@jean-francoisgiroux.com "
             "à l’attention de Jean-François Giroux", "jfg@jean-francoisgiroux.com"),
            ("Please send us your application in complete confidentiality at: rh@groupemontpetit.com, specifying the "
             "reference number: 26-0123P.", "rh@groupemontpetit.com"),
            ("Faites parvenir votre CV en toute confidentialité à emplois@acme.ca", "emplois@acme.ca"),
            ("Postulez en toute confidentialité à carrieres@acme.ca", "carrieres@acme.ca"),
            ("Apply online or via info@neobridge.ca for confidential consideration.", "info@neobridge.ca"),
            ("Send your resume to hr@acme.ca", "hr@acme.ca"),
        ]

    def negatives(self) -> list[str]:
        """反例:便利安排 / 无障碍 / 隐私 / 泛泛的咨询邮箱。"""
        return [
            "Nous encourageons les personnes qui pourraient avoir besoin d’accommodements pendant le processus d’embauche "
            "à nous en informer. Pour faire une demande en toute confidentialité, envoyez un courriel directement à votre "
            "responsable du recrutement ou à retail.recruitment@bell.ca afin de prendre les dispositions nécessaires.",
            "We encourage individuals who may require accommodations during the hiring process to let us know. For a "
            "confidential inquiry, email your recruiter or retail.recruitment@bell.ca to make arrangements.",
            "If you require accommodation, please send your request in confidence to accessibility@acme.ca",
            "Toutes les candidatures seront traitées en toute confidentialité. Questions : info@acme.ca",
            "Please send your application through our portal; for confidential questions write to help@acme.ca",
        ]

    def test_golden(self) -> None:
        """正反金标。"""
        from mart import functions as fn
        for text, want in self.positives():
            with self.subTest(text=text):
                self.assertEqual(fn.text_mail_of(text), want)
        for text in self.negatives():
            with self.subTest(text=text):
                self.assertEqual(fn.text_mail_of(text), "")

    def test_hard_skip_words_never_overridden(self) -> None:
        """性质:保密语境 + 紧挨的投递动作,只要窗口里有无障碍 / 便利安排 / 隐私 / 退订 / 平等就业这类词,一律照旧排除。"""
        from mart import functions as fn
        for word in ("accommodation", "accessibility", "privacy", "adaptation", "handicap", "disability",
                     "unsubscribe", "désabonner", "equity"):
            with self.subTest(word=word):
                text = "Send your CV in complete confidentiality to hr@acme.ca (" + word + ")"
                self.assertEqual(fn.text_mail_of(text), "")

    def test_verb_rule_probe(self) -> None:
        """变异探针:投递动作判据换成永不命中,保密语境那几条正例全部丢掉、不带保密词的那条照收 —— 证明救回它们的是这条判据。"""
        from mart import functions as fn
        with mock.patch.object(fn, "APPLY_VERB_NEAR_RE", re.compile(r"(?!x)x")):
            for text, want in self.positives():
                with self.subTest(text=text):
                    if want == "hr@acme.ca":
                        self.assertEqual(fn.text_mail_of(text), want)
                    else:
                        self.assertEqual(fn.text_mail_of(text), "")


class MartAtsEmpTest(unittest.TestCase):
    """ATS 工时 / 雇佣期透传自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」):to_ats_job_fields 落列键名与 Job Bank 同、
    缺键老数据不落列;collect_ats_jobs 读源两格;评分段(判通道)与岗位装配段(fill_formatted 落列)穷举组合下取值逐格相同。
    公司档在系统临时目录现造(mock 掉 IN_ATS_COMPANIES),不碰仓内文件。"""

    def src_cells(self) -> list[str | None]:
        """岗位行一格的四种状态:缺键 / 空串 / 两种有值(None 代表缺键)。"""
        return [None, "", "full", "part"]

    def term_cells(self) -> list[str | None]:
        """雇佣期一格的状态(None 代表缺键)。"""
        return [None, "", "permanent", "casual"]

    def recs(self) -> list[dict | None]:
        """整理记录的状态:没整理 / 两格都缺 / 只有工时 / 两格都有。"""
        return [None, {"formatted": "f", "at": "a"}, {"formatted": "f", "at": "a", "hrs": "part"},
                {"formatted": "f", "at": "a", "hrs": "full", "term": "term"}]

    def job_of(self, n: int, hours: str | None, term: str | None) -> dict:
        """现造一条 ATS 岗(None = 不写这个键)。"""
        job: dict = {"title": "Engineer " + str(n), "url": "https://jobs.example.test/" + str(n)}
        if hours is not None:
            job["employment_hours"] = hours
        if term is not None:
            job["employment_term"] = term
        return job

    def test_fields_keys_same_as_jobbank(self) -> None:
        """落列键名与 Job Bank 帖同(employmentTerm / employmentHours);有值照落,空串与缺键经 present_of 都不落列。"""
        from mart import functions as fn
        jb = fn.to_jb_job_fields({"employment_term": "term", "employment_hours": "part"})
        ats = fn.to_ats_job_fields(AtsJobIn(job={"employment_term": "term", "employment_hours": "part"}, ats="lever",
                                            website=None, seen_at="t"))
        self.assertEqual((ats["employmentTerm"], ats["employmentHours"]), (jb["employmentTerm"], jb["employmentHours"]))
        for job in ({}, {"employment_term": "", "employment_hours": ""}):
            fields = fn.to_ats_job_fields(AtsJobIn(job=job, ats="lever", website=None, seen_at="t"))
            kept = fn.present_of(fields)
            self.assertNotIn("employmentTerm", kept)
            self.assertNotIn("employmentHours", kept)

    def test_collect_and_fill_same_ruler(self) -> None:
        """穷举 源工时 × 源雇佣期 × 整理记录:评分段 collect_ats_jobs 取到的两格 == 岗位装配段 to_ats_job_fields + fill_formatted
        落列的两格(缺席按空串比);另断言源标注优先、源空才用整理版、缺键老数据照常跑。"""
        from mart import functions as fn
        combos = []
        jobs = []
        n = 0
        for hours in self.src_cells():
            for term in self.term_cells():
                for rec in self.recs():
                    n += 1
                    job = self.job_of(n, hours, term)
                    jobs.append(job)
                    combos.append((job, rec))
        formatted: dict = {}
        for job, rec in combos:
            if rec is not None:
                formatted[job["url"]] = rec
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "acme"
            folder.mkdir()
            (folder / "jobs.json").write_text(json.dumps({"jobs": jobs}), encoding="utf-8")
            with mock.patch.object(fn, "IN_ATS_COMPANIES", Path(tmp)):
                got = fn.collect_ats_jobs(formatted)
        self.assertEqual(len(got), len(combos))
        by_ext = {}
        for c in got:
            by_ext[c.ext] = c
        for job, rec in combos:
            with self.subTest(job=job, rec=rec):
                scored = by_ext[job["url"]]
                fields = fn.to_ats_job_fields(AtsJobIn(job=job, ats="lever", website=None, seen_at="t"))
                fn.fill_formatted(FillFormattedIn(fields=fields, rec=rec))
                shown = (fields.get("employmentHours") or "", fields.get("employmentTerm") or "")
                self.assertEqual((scored.hours, scored.term), shown)
                src_h = job.get("employment_hours") or ""
                if src_h != "":
                    self.assertEqual(scored.hours, src_h)
                elif rec is not None:
                    self.assertEqual(scored.hours, rec.get("hrs") or "")
                else:
                    self.assertEqual(scored.hours, "")


class MartOpsExtraTest(unittest.TestCase):
    """运营统计补行自测(2026-09-27 Frank 勾「2026 名额小表」):人工核对表补配额(本年已有行不补、该年没数 / 没出处不补、label 取
    含本数的原句或数据集名、补完再跑不重复)+ 全年已邀请四条口径(缺数整省不出 / NB 的 AIP 不并入 / NS 另出选取 / QC 与 FED 不出)
    + 合计与最近日期金标 + 行形与既有行同形 + 变异探针。核对表与抽选文件在用例里现造,不读仓内文件。"""

    def ctx_with_rows(self) -> OpsCtx:
        """现造各省统计表已出的省级 allocation 行:ON 2026(period 年)、AB(只有 asOf)、SK(period 季度)、MB 只有 2025。"""
        from mart import functions as fn
        ctx = OpsCtx(rows=[], seqs={})
        for prov, period, as_of in (("ON", "2026", ""), ("AB", "", "2026-09-23"), ("SK", "2026Q2", ""), ("MB", "2025", "")):
            base = fn.to_ops_base({"province": prov, "asOf": as_of, "quarter": period, "url": "u", "fetched": "f"})
            fn.add_ops_row(OpsRowIn(ctx=ctx, base=base, metric="allocation", scope="", kind="", label="", raw=1,
                                    unit="spots", text="", section="", period=None))
        return ctx

    def alloc_table(self) -> dict:
        """现造人工核对表(形同 pnp_allocations.json)。"""
        news = "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/news"
        ns = "https://data.novascotia.ca/Immigration-and-Migration/Annual-Allocations-for-Immigration-Programs/8rf7-hw2p"
        return {"checkedAt": "2026-08-15", "rows": [
            {"prov": "ON", "y2026": 14119, "sources": {"y2026": "https://on.example/2026"}, "note": ""},
            {"prov": "AB", "y2026": 6603, "sources": {"y2026": "https://ab.example"}, "note": ""},
            {"prov": "SK", "y2026": 4761, "sources": {"y2026": "https://sk.example"}, "note": ""},
            {"prov": "MB", "y2026": 8000, "sources": {"y2026": "https://mb.example"},
             "note": "官方原句「For 2026, Manitoba was allocated 8,000 nominations in total.」"},
            {"prov": "BC", "y2026": 6254, "sources": {"y2026": news},
             "note": "「total allocation of 6,214 for 2025」;2026-08-18 条目「has received an additional 1,000 nominations "
                     "from the federal government, resulting in an allocation of 6,254 for 2026」"},
            {"prov": "NS", "y2026": 2344, "sources": {"y2026": ns}, "note": "省官方开放数据(NSNP 单列)"},
            {"prov": "NB", "y2026": None, "sources": {}, "note": ""},
            {"prov": "PE", "y2026": 1500, "sources": {}, "note": ""},
            {"prov": "NL", "y2026": 2000, "sources": {"y2026": "https://nl.example/page"}, "note": "无原句"},
        ]}

    def test_alloc_gap_rows(self) -> None:
        """只补本年没有行的省(BC / NS / MB / NL),AB(只有 asOf)与 SK(季度 period)算已有;该年空或没出处的 NB / PE 不补;
        label 取含本数与本年的那句原句(不是 2025 那句)、NS 取数据集名、没有可引的给空串;行与既有行键同名同序;再跑一次不重复。"""
        from mart import functions as fn
        ctx = self.ctx_with_rows()
        before = len(ctx.rows)
        fn.fill_alloc_gap_ops(AllocGapIn(ctx=ctx, table=self.alloc_table(), year="2026"))
        added = ctx.rows[before:]
        by_prov = {}
        for r in added:
            by_prov[r["province"]] = r
        self.assertEqual(set(by_prov), {"BC", "NS", "MB", "NL"})
        bc = by_prov["BC"]
        self.assertEqual((bc["metric"], bc["value"], bc["unit"], bc["period"], bc["scope"], bc["scopeKind"], bc["asOf"]),
                         ("allocation", 6254, "nominations", "2026", "", "", ""))
        self.assertEqual(bc["label"], "has received an additional 1,000 nominations from the federal government, "
                                      "resulting in an allocation of 6,254 for 2026")
        self.assertTrue(bc["url"].startswith("https://www.welcomebc.ca/"))
        self.assertEqual(bc["fetched"], "2026-08-15")
        self.assertEqual(by_prov["NS"]["label"], "Annual Allocations for Immigration Programs")
        self.assertEqual(by_prov["MB"]["label"], "For 2026, Manitoba was allocated 8,000 nominations in total.")
        self.assertEqual(by_prov["NL"]["label"], "")
        for r in added:
            self.assertEqual(list(r.keys()), list(ctx.rows[0].keys()))
        fn.fill_alloc_gap_ops(AllocGapIn(ctx=ctx, table=self.alloc_table(), year="2026"))
        self.assertEqual(len(ctx.rows), before + len(added))

    def draw_file(self, prov: str, draws: list[dict]) -> dict:
        """现造一份抽选文件(形同 draws-*.json:一份一省)。"""
        return {"fetched": "2026-09-27", "provinces": {prov: {"url": "https://" + prov.lower() + ".example/draws",
                                                              "draws": draws}}}

    def draw_tables(self) -> list[dict]:
        """现造各省抽选文件。"""
        one = self.draw_file
        return [
            one("ON", [{"date": "2026-04-30", "stream": "FW", "invitations": 786},
                       {"date": "2026-04-30", "stream": "IS", "invitations": 277},
                       {"date": "2026-02-02", "stream": "FW", "invitations": 100},
                       {"date": "2025-12-10", "stream": "FW", "invitations": None},
                       {"date": "", "stream": "FW", "invitations": 5}]),
            one("AB", [{"date": "2026-09-21", "stream": "Law", "invitations": None},
                       {"date": "2026-09-22", "stream": "Tech", "invitations": 100}]),
            one("NB", [{"date": "2026-09-18", "stream": "NB Skilled Worker", "invitations": 197},
                       {"date": "2026-09-10", "stream": "AIP", "invitations": 60},
                       {"date": "2026-08-20", "stream": "AIP", "invitations": None},
                       {"date": "2026-07-16", "stream": "NB Express Entry", "invitations": 115}]),
            one("NS", [{"date": "2026-07", "stream": "Monthly EOI selections", "invitations": 671},
                       {"date": "2026-06", "stream": "Monthly EOI selections", "invitations": 531},
                       {"date": "2025-12", "stream": "Monthly EOI selections", "invitations": 400}]),
            one("QC", [{"date": "2026-09-24", "stream": "Stream 1", "invitations": 86}]),
            one("FED", [{"date": "2026-09-24", "stream": "CEC", "invitations": 3000}]),
            one("BC", [{"date": "June 4, 2026", "stream": "Care", "invitations": 10},
                       {"date": "2026-09-24", "stream": "Tech", "invitations": 426}]),
            one("PE", [{"date": "2025-09-17", "stream": "Labour", "invitations": 195}]),
        ]

    def ytd(self) -> dict:
        """跑一遍全年合计,按省收行。"""
        from mart import functions as fn
        ctx = OpsCtx(rows=[], seqs={})
        fn.fill_draw_ytd_ops(DrawYtdIn(ctx=ctx, tables=self.draw_tables(), year="2026"))
        out = {}
        for r in ctx.rows:
            out[r["province"]] = r
        return out

    def test_ytd_four_rules(self) -> None:
        """四条口径:① AB 本年有一轮人数没公布、BC 有一行日期认不出 → 两省不出(ON 去年那轮 null 不影响今年);② NB 的 AIP 两行
        (含一行 null)不并入;③ NS 出 selections_ytd、单位 people;④ QC、FED 不出。PE 本年没有抽选 → 不出。"""
        got = self.ytd()
        self.assertEqual(set(got), {"ON", "NB", "NS"})
        self.assertEqual((got["NB"]["metric"], got["NB"]["value"], got["NB"]["unit"]), ("invitations_ytd", 312, "invitations"))
        self.assertIn("excluding 2 AIP rows", got["NB"]["label"])
        self.assertEqual((got["NS"]["metric"], got["NS"]["value"], got["NS"]["unit"]), ("selections_ytd", 1202, "people"))

    def test_ytd_golden_row(self) -> None:
        """金标:ON 本年三行 786 + 277 + 100 = 1,163,asOf = 最近一轮 2026-04-30,url = 该省抽选页,period = 本年,label 写三轮;
        NS 的 asOf 只到月(不编具体哪天);行与 to_ops_base 出的行键同名同序。"""
        from mart import functions as fn
        got = self.ytd()
        on = got["ON"]
        self.assertEqual((on["value"], on["asOf"], on["url"], on["period"], on["label"]),
                         (1163, "2026-04-30", "https://on.example/draws", "2026", "Sum of 3 rounds in 2026"))
        self.assertEqual(got["NS"]["asOf"], "2026-07")
        ref = OpsCtx(rows=[], seqs={})
        fn.add_ops_row(OpsRowIn(ctx=ref, base=fn.to_ops_base({"province": "ON"}), metric="allocation", scope="",
                                kind="", label="", raw=1, unit="spots", text="", section="", period="2026"))
        self.assertEqual(list(on.keys()), list(ref.rows[0].keys()))

    def test_ytd_rule_tables_probe(self) -> None:
        """变异探针:把「不算邀请的 stream」表清空,NB 的合计当场变(且那行 null 让 NB 整省不出);把「按选取公布的省」表清空,
        NS 就被当成邀请 —— 证明 ② ③ 两条读的是那两张表。"""
        from mart import functions as fn
        with mock.patch.object(fn, "DRAW_NOT_INVITE_STREAMS", {}):
            self.assertNotIn("NB", self.ytd())
        with mock.patch.object(fn, "DRAW_SELECT_PROVS", ()):
            self.assertEqual(self.ytd()["NS"]["metric"], "invitations_ytd")

    def test_ytd_pnp_part_only(self) -> None:
        """NL(2026-09-27):批次合计里夹着 AIP,只加省提名那一份 —— 2026 两行 61 + 41 = 102(不是合计 62 + 41 = 103),去年那行不算;
        有一行缺省提名那一格(拆格前的历史行 / Notes 认不出)→ NL 整省不出;label 写明只算省提名。"""
        from mart import functions as fn

        def nl(draws: list) -> dict:
            ctx = OpsCtx(rows=[], seqs={})
            table = {"fetched": "2026-09-27", "provinces": {"NL": {"url": "https://nl.example/ita", "draws": draws}}}
            fn.fill_draw_ytd_ops(DrawYtdIn(ctx=ctx, tables=[table], year="2026"))
            return {r["province"]: r for r in ctx.rows}

        rows = [{"date": "2026-09-25", "stream": "NLPNP + AIP (ITA batch)", "invitations": 41, "pnpInvitations": 41},
                {"date": "2026-09-18", "stream": "NLPNP + AIP (ITA batch)", "invitations": 62, "pnpInvitations": 61},
                {"date": "2025-11-12", "stream": "NLPNP + AIP (ITA batch)", "invitations": 330}]
        got = nl(rows)["NL"]
        self.assertEqual((got["metric"], got["value"], got["asOf"]), ("invitations_ytd", 102, "2026-09-25"))
        self.assertIn("provincial nominee invitations only", got["label"])
        gap = [{"date": "2026-09-25", "stream": "NLPNP + AIP (ITA batch)", "invitations": 41, "pnpInvitations": 41},
               {"date": "2026-03-06", "stream": "NLPNP + AIP (ITA batch)", "invitations": 445}]
        self.assertNotIn("NL", nl(gap))
        with mock.patch.object(fn, "DRAW_PNP_PART_PROVS", ()):
            self.assertEqual(nl(rows)["NL"]["value"], 103)

    def test_as_of_month_from_period(self) -> None:
        """截至月(2026-09-27 省提名弹框「2026 年配额」卡的「截至」行):MB 月度块 throughMonth 英文月名 → `YYYY-MM`、
        SK 季度 → 该季最后一个月;认不得给空串(不猜);官方写了 asOf 的照写不改。"""
        from mart import functions as fn
        self.assertEqual(fn.mb_as_of_of({"year": 2026, "throughMonth": "August"}), "2026-08")
        self.assertEqual(fn.mb_as_of_of({"year": 2026, "throughMonth": "Sept."}), "2026-09")
        self.assertEqual(fn.mb_as_of_of({"year": 2026, "throughMonth": "Août"}), "")
        self.assertEqual(fn.mb_as_of_of({"year": 2026}), "")
        self.assertEqual([fn.quarter_as_of_of(q) for q in ("2026Q1", "2026Q2", "2025Q3", "2025Q4")],
                         ["2026-03", "2026-06", "2025-09", "2025-12"])
        self.assertEqual([fn.quarter_as_of_of(q) for q in ("2026", "2026Q5", "")], ["", "", ""])
        self.assertEqual(fn.to_ops_base({"province": "SK", "quarter": "2026Q2"})["asOf"], "2026-06")
        ab = fn.to_ops_base({"province": "AB", "asOf": "2026-09-23", "quarter": "2026Q2"})
        self.assertEqual(ab["asOf"], "2026-09-23")


class MartPendingTest(unittest.TestCase):
    """待修清单判「全」自测(2026-09-28 Frank「先做拆分」;设计稿 docs/design/缺数据不上线与Opus修复-20260928.md 第二节)。

    金标:一条齐全的 Job Bank 岗不进清单;六格逐格缺一格各报那一格;职业码是 qwen 判的算缺(标题规则 / 源带码的不算缺);
    工时 / 雇佣期只看原帖带的(岗位行里 qwen 补上的值不算);薪资空但原帖明写「待议」的不算缺;六格全缺按六格顺序报。
    待修行:已有格里不出现 qwen 的码,原帖正文与明写不公布的格原样带上,标题与雇主名还原转义符。只喂字典,不读仓内文件。"""

    full = {"externalId": "jb:1", "origin": "jobbank", "noc": "65201", "employmentHours": "full",
            "employmentTerm": "permanent", "salaryText": "$18.00 hourly", "province": "ON", "city": "Ottawa",
            "title": "Cook &amp; Helper", "applyUrl": "https://example.test/1", "datePosted": "2026-09-28",
            "description": "We are hiring a full-time permanent cook."}
    """一条六格齐全的岗位行(标题带转义符,验还原)。"""

    def row_without(self, key: str) -> dict:
        """齐全行去掉一格。"""
        out: dict = {}
        for k, v in self.full.items():
            if k != key:
                out[k] = v
        return out

    def missing(self, row: dict, noc_from: str, hours: str, term: str, stated: dict) -> list:
        """跑 missing_fields_of(原帖工时 / 雇佣期与明写不公布的格由参数给)。"""
        from mart import functions as fn
        return fn.missing_fields_of(MissingIn(row=row, noc_from=noc_from, emp=EmpOut(hours=hours, term=term),
                                              stated=stated))

    def test_full_row_not_pending(self) -> None:
        """齐全行(源带码或标题规则)不缺格。"""
        self.assertEqual(self.missing(self.full, "source", "full", "permanent", {}), [])
        self.assertEqual(self.missing(self.full, "rule", "full", "permanent", {}), [])

    def test_each_field(self) -> None:
        """六格逐格缺一格,各报那一格;qwen 的码算缺;岗位行里有工时 / 雇佣期但原帖没带的算缺。"""
        self.assertEqual(self.missing(self.row_without("noc"), "", "full", "permanent", {}), ["noc"])
        self.assertEqual(self.missing(self.full, "model", "full", "permanent", {}), ["noc"])
        self.assertEqual(self.missing(self.full, "source", "", "permanent", {}), ["hours"])
        self.assertEqual(self.missing(self.full, "source", "full", "", {}), ["term"])
        self.assertEqual(self.missing(self.row_without("salaryText"), "source", "full", "permanent", {}), ["salary"])
        self.assertEqual(self.missing(self.row_without("province"), "source", "full", "permanent", {}), ["province"])
        self.assertEqual(self.missing(self.row_without("city"), "source", "full", "permanent", {}), ["city"])

    def test_stated_salary_not_missing(self) -> None:
        """薪资空但原帖明写「待议」的不算缺;明写的是别的格,薪资照样算缺。"""
        row = self.row_without("salaryText")
        self.assertEqual(self.missing(row, "source", "full", "permanent", {"salary": "À discuter"}), [])
        self.assertEqual(self.missing(row, "source", "full", "permanent", {"hours": "x"}), ["salary"])

    def test_all_missing_order(self) -> None:
        """六格全缺按六格顺序报。"""
        row = {"externalId": "x:1"}
        self.assertEqual(self.missing(row, "", "", "", {}), ["noc", "hours", "term", "salary", "province", "city"])

    def test_pending_row(self) -> None:
        """待修行:qwen 的码不进已有格、工时 / 雇佣期取原帖值、正文与明写格原样带、标题与雇主名还原转义符。"""
        from mart import functions as fn
        row = self.row_without("salaryText")
        emp = EmpOut(hours="full", term="")
        out = fn.to_pending_row(PendingRowIn(row=row, missing=["noc", "term"], noc_from="model", emp=emp,
                                             stated={"salary": "À discuter"}, employer="A &amp; B Inc."))
        self.assertEqual(out["missing"], ["noc", "term"])
        self.assertEqual(out["have"], {"hours": "full", "province": "ON", "city": "Ottawa"})
        self.assertEqual(out["stated_none"], {"salary": "À discuter"})
        self.assertEqual((out["title"], out["employer"]), ("Cook & Helper", "A & B Inc."))
        self.assertEqual(out["text"], self.full["description"])

    def test_held_split(self) -> None:
        """接闸:清单里的岗不进上线行、按 externalId 出扣下名单(排序、去重);上线行保持原序。"""
        from mart import functions as fn
        jobs = [{"externalId": "a"}, {"externalId": "b"}, {"externalId": "c"}, {"externalId": "d"}, {"externalId": "e"}]
        pending = [{"ext": "d"}, {"ext": "b"}, {"ext": "b"}]
        out = fn.held_split_of(HeldSplitIn(jobs=jobs, pending=pending))
        self.assertEqual(out.kept, [{"externalId": "a"}, {"externalId": "c"}, {"externalId": "e"}])
        self.assertEqual(out.held, [{"externalId": "b"}, {"externalId": "d"}])
        empty = fn.held_split_of(HeldSplitIn(jobs=jobs, pending=[]))
        self.assertEqual((empty.kept, empty.held), (jobs, []))

    def test_held_guard(self) -> None:
        """保险丝:扣下超过在招的 45% 抛错停轮(判「全」出错时不清空职位板);正好一半以下放行。"""
        from mart import functions as fn
        jobs = [{"externalId": "a"}, {"externalId": "b"}, {"externalId": "c"}, {"externalId": "d"}]
        with self.assertRaises(RuntimeError):
            fn.held_split_of(HeldSplitIn(jobs=jobs, pending=[{"ext": "a"}, {"ext": "b"}]))
        out = fn.held_split_of(HeldSplitIn(jobs=jobs, pending=[{"ext": "a"}]))
        self.assertEqual(len(out.kept), 3)


class MartNsOpsTest(unittest.TestCase):
    """NS 两张季表出行自测(2026-09-29 立):候选池逐季一行(期间、截至月、出处照行内)、批准 → nominations_ytd、拒签 →
    refusals_ytd、撤回 → withdrawals_ytd、认不出的结果词不出行、逐年已发提名照旧出。数据在用例里现造,不读仓内文件。"""

    def test_fill_ns_ops(self) -> None:
        """一份现造的 ns-stats.json 走一遍 fill_ns_ops。"""
        from mart import functions as fn
        pool_url = "https://data.novascotia.ca/d/aezx-2h5c"
        res_url = "https://data.novascotia.ca/d/evyn-w34t"
        d = {"province": "NS", "asOf": "", "url": "https://data.novascotia.ca/x", "fetched": "2026-09-29",
             "nominationsIssued": [{"year": 2025, "label": "Nomination Certificates Issued, 2025", "value": 3368,
                                    "unit": "nominations", "section": "S", "url": "u", "fetched": "f"}],
             "eoiPoolQuarters": [
                 {"year": 2026, "period": "2026Q2", "asOf": "2026-06", "label": "L2", "value": 7942, "section": "P",
                  "url": pool_url, "fetched": "2026-09-29"},
                 {"year": 2026, "period": "2026Q1", "asOf": "2026-03", "label": "L1", "value": 7937, "section": "P",
                  "url": pool_url, "fetched": "2026-09-29"}],
             "assessmentsYtd": [
                 {"year": 2026, "period": "2026 Q1-Q2", "asOf": "2026-06", "result": r, "label": r, "value": v,
                  "section": "R", "url": res_url, "fetched": "2026-09-29"}
                 for r, v in (("Approved", 819), ("Refused", 341), ("Withdrawn", 475), ("Pending", 1))]}
        ctx = OpsCtx(rows=[], seqs={})
        fn.fill_ns_ops(OpsProvIn(ctx=ctx, base=fn.to_ops_base(d), data=d))
        got = [(r["metric"], r["period"], r["asOf"], r["value"], r["url"]) for r in ctx.rows]
        self.assertEqual(got, [
            ("nominations_issued", "2025", "", 3368, "u"),
            ("eoi_pool_total", "2026Q2", "2026-06", 7942, pool_url),
            ("eoi_pool_total", "2026Q1", "2026-03", 7937, pool_url),
            ("nominations_ytd", "2026 Q1-Q2", "2026-06", 819, res_url),
            ("refusals_ytd", "2026 Q1-Q2", "2026-06", 341, res_url),
            ("withdrawals_ytd", "2026 Q1-Q2", "2026-06", 475, res_url)])


class MartNbNlOpsTest(unittest.TestCase):
    """NB / NL 往年提名出行自测(2026-09-29 立):两份现造的年报统计文件经 build_pnp_ops_stats 按省分派出行 ——
    NB 逐年已发提名 → nominations_issued(单位 nominations,统计期 = 自然年,asOf 空)、NL 逐年提名人数 → nominated_individuals
    (单位 people,不混进 nominations_issued);两份文件都登记进 IN_PNP_STATS(漏登记 = 行静默不出)。
    配额核对表与抽选文件打桩成空,数据在用例里现造,不读仓内文件。"""

    def nb_stats(self) -> dict:
        """现造 nb-stats.json(形同 pnp 域 write_year_stats 的产出:只有逐年 nominationsIssued)。"""
        url = "https://nb.example/petl-2024-2025.pdf"
        rows = []
        for year, value in ((2024, 3000), (2023, 3167)):
            label = "Provincial Nominations, Provincial Nominee Program (PNP), " + str(year)
            rows.append({"year": year, "label": label, "value": value, "unit": "nominations", "section": "S",
                         "url": url, "fetched": "2026-09-29"})
        return {"province": "NB", "program": "PNP", "source": "PETL Annual Report", "url": url, "note": "",
                "asOf": "", "fetched": "2026-09-29", "processing": [], "allocation": [], "nominationsIssued": rows}

    def nl_stats(self) -> dict:
        """现造 nl-stats.json(nominationsIssued 空,提名人数在 nominatedIndividuals,单位 people 行自带)。"""
        rows = []
        for year, value in ((2024, 5065), (2023, 4838)):
            rows.append({"year": year, "label": "L" + str(year), "value": value, "unit": "people", "section": "S",
                         "url": "https://nl.example/" + str(year) + ".pdf", "fetched": "2026-09-29"})
        return {"province": "NL", "program": "PNP", "source": "IPGS Annual Report",
                "url": "https://nl.example/2024.pdf", "note": "", "asOf": "", "fetched": "2026-09-29", "processing": [],
                "allocation": [], "nominationsIssued": [], "nominatedIndividuals": rows}

    def test_dispatch_rows(self) -> None:
        """两份文件落临时目录走一遍 build_pnp_ops_stats:省 / 指标名 / 统计期 / asOf / 值 / 单位 / 出处金标,label 原样带过去。"""
        from mart import functions as fn
        with tempfile.TemporaryDirectory() as tmp:
            files = []
            for name, d in (("nb-stats.json", self.nb_stats()), ("nl-stats.json", self.nl_stats())):
                p = Path(tmp) / name
                p.write_text(json.dumps(d), encoding="utf-8")
                files.append(p)
            with mock.patch.object(fn, "load_alloc_table", return_value={}), \
                    mock.patch.object(fn, "load_draw_tables", return_value=[]):
                rows = fn.build_pnp_ops_stats(files)
        got = [(r["province"], r["metric"], r["period"], r["asOf"], r["value"], r["unit"], r["url"]) for r in rows]
        nb_url = "https://nb.example/petl-2024-2025.pdf"
        self.assertEqual(got, [
            ("NB", "nominations_issued", "2024", "", 3000, "nominations", nb_url),
            ("NB", "nominations_issued", "2023", "", 3167, "nominations", nb_url),
            ("NL", "nominated_individuals", "2024", "", 5065, "people", "https://nl.example/2024.pdf"),
            ("NL", "nominated_individuals", "2023", "", 4838, "people", "https://nl.example/2023.pdf")])
        self.assertEqual(rows[0]["label"], "Provincial Nominations, Provincial Nominee Program (PNP), 2024")
        self.assertEqual(rows[2]["label"], "L2024")

    def test_registered(self) -> None:
        """两份文件都在 IN_PNP_STATS 里(汇装只读这张清单上的文件)。"""
        from mart import constants as mc
        names = [p.name for p in mc.IN_PNP_STATS]
        self.assertIn("nb-stats.json", names)
        self.assertIn("nl-stats.json", names)


class MartBcFunnelOpsTest(unittest.TestCase):
    """BC 年报四组 SI 逐年数出行自测(2026-09-29 立):bc-nominations.json 的 siDecisions / siItasIssued / siItaApplications /
    siApplicationsReceived 各出自己的指标(统计期 = 年、单位照行、出处照行内那份年报),已发提名照旧出;bc-stats.json 形状的
    表(没有这四个键)一行不多出。数据在用例里现造,不读仓内文件。"""

    def test_bc_funnel_rows(self) -> None:
        """一份现造的 bc-nominations.json 走 fill_year_metric_ops(build_pnp_ops_stats 对 BC 两份文件都调它)。"""
        from mart import functions as fn
        r25 = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-statistical-report-2025-pdf"
        r21 = "https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-statistical-report-2021-pdf"
        d: dict = {"province": "BC", "asOf": "", "url": r25, "fetched": "2026-09-29"}
        for key, year, value, unit, url in (("nominationsIssued", 2025, 6214, "nominations", r25),
                                            ("siDecisions", 2025, 6553, "applications", r25),
                                            ("siItasIssued", 2025, 978, "invitations", r25),
                                            ("siItasIssued", 2021, 11582, "invitations", r21),
                                            ("siItaApplications", 2025, 748, "applications", r25),
                                            ("siApplicationsReceived", 2021, 7976, "applications", r21)):
            d.setdefault(key, []).append({"year": year, "label": "L", "value": value, "unit": unit, "section": "S",
                                          "url": url, "fetched": "2026-09-29"})
        ctx = OpsCtx(rows=[], seqs={})
        fn.fill_year_metric_ops(OpsProvIn(ctx=ctx, base=fn.to_ops_base(d), data=d))
        got = [(r["metric"], r["period"], r["value"], r["unit"], r["url"], r["scope"]) for r in ctx.rows]
        self.assertEqual(got, [
            ("nominations_issued", "2025", 6214, "nominations", r25, ""),
            ("si_decisions", "2025", 6553, "applications", r25, ""),
            ("si_itas_issued", "2025", 978, "invitations", r25, ""),
            ("si_itas_issued", "2021", 11582, "invitations", r21, ""),
            ("si_ita_applications", "2025", 748, "applications", r25, ""),
            ("si_applications_received", "2021", 7976, "applications", r21, "")])
        ctx = OpsCtx(rows=[], seqs={})
        stats = {"province": "BC", "asOf": "2026-09-01", "url": "u", "fetched": "f", "pool": [], "processing": {}}
        fn.fill_year_metric_ops(OpsProvIn(ctx=ctx, base=fn.to_ops_base(stats), data=stats))
        self.assertEqual(ctx.rows, [])


class MartMbPoolTest(unittest.TestCase):
    """MB 年报池子历年序列出行自测(2026-09-29 立,Frank 拍板):一年一行、新到旧(raw 顺序乱也照排,最新一年 seq 0)、
    period 记年报年、asOf 记该年 12 月、每行挂自己那份年报的网址与节名;2024 年报原句写「end of 2023」→ period 仍记 2024、
    label 句尾加「 [sic]」,其余年份 label 原样;处理承诺照旧一行。数字照 2017 / 2023 / 2024 三份年报原句,数据在用例里
    现造,不读仓内文件。"""

    URL = "https://immigratemanitoba.com/resources/data/annual-report-{year}"
    """年报网址形。"""

    def test_fill_mb_pool(self) -> None:
        """一份现造的 mb-stats.json(年报池子三年,故意乱序)走一遍 fill_mb_ops。
        案例页 PNP_OPS_STATS 按 COALESCE(as_of, period) 取每省最新一行,而 as_of 落库是空串不是 NULL(COALESCE 退不到
        period)—— 所以断言 asOf 各行互不相同、最大的是 2024 年那行。"""
        from mart import functions as fn
        pools = [{"year": 2023, "label": "20,392 Active EOI profiles at the end of 2023", "labelYear": "2023",
                  "value": 20392, "section": "MPNP Annual Report 2023 — 10. Expression of Interest Pool",
                  "url": self.URL.format(year=2023), "fetched": "2026-09-29"},
                 {"year": 2017, "label": "15,957 active EOI profiles at the end of 2017", "labelYear": "2017",
                  "value": 15957, "section": "MPNP Annual Report 2017 — 9. Expression of Interest Pool",
                  "url": self.URL.format(year=2017), "fetched": "2026-09-29"},
                 {"year": 2024, "label": "26,678 Active EOI profiles at the end of 2023", "labelYear": "2023",
                  "value": 26678, "section": "MPNP Annual Report 2024 — 10. Expression of Interest Pool",
                  "url": self.URL.format(year=2024), "fetched": "2026-09-29"}]
        d = {"province": "MB", "asOf": "", "url": "https://immigratemanitoba.com/resources/data/monthly-data-2026",
             "fetched": "2026-09-29", "monthly": {},
             "annual": {"url": self.URL.format(year=2024), "fetched": "2026-09-29", "year": 2024,
                        "section": "MPNP Annual Report 2024 — 9. Processing Times", "commitmentMonths": 6,
                        "commitmentLabel": "C", "processing": []},
             "eoiPoolYears": pools}
        ctx = OpsCtx(rows=[], seqs={})
        fn.fill_mb_ops(OpsProvIn(ctx=ctx, base=fn.to_ops_base(d), data=d))
        pool = [r for r in ctx.rows if r["metric"] == "eoi_pool_total"]
        self.assertEqual([(r["period"], r["asOf"], r["value"], r["seq"], r["url"]) for r in pool], [
            ("2024", "2024-12", 26678, 0, self.URL.format(year=2024)),
            ("2023", "2023-12", 20392, 1, self.URL.format(year=2023)),
            ("2017", "2017-12", 15957, 2, self.URL.format(year=2017))])
        self.assertEqual([r["label"] for r in pool], ["26,678 Active EOI profiles at the end of 2023 [sic]",
                                                      "20,392 Active EOI profiles at the end of 2023",
                                                      "15,957 active EOI profiles at the end of 2017"])
        self.assertEqual(pool[2]["section"], "MPNP Annual Report 2017 — 9. Expression of Interest Pool")
        keys = [r["asOf"] for r in pool]
        self.assertEqual(len(set(keys)), len(keys))
        self.assertEqual(max(keys), "2024-12")
        commit = [(r["value"], r["period"]) for r in ctx.rows if r["metric"] == "processing_commitment"]
        self.assertEqual(commit, [(6, "2024")])


class MartAbFederalTest(unittest.TestCase):
    """AB 额外联邦名额出行自测(2026-09-29 立):一类一行、指标 nominations_additional_federal、scope = 官方类别名
    (scopeKind=category,不算 streamKey)、label 原样、口径日同页;issued / allocation / remaining 三个既有指标的省级行
    一个数不变(不并入);旧 ab-stats.json 没有这一键就一行不出。数据在用例里现造,不读仓内文件。"""

    LABEL = ("Any AAIP nomination issued in 2026 for a physician or Francophone who meets the federal criteria for this "
             "initiative will not count toward Alberta’s 6,603 nomination allocation.")
    """官方原句(弯撇号照页面原样)。"""

    def test_fill_ab_federal(self) -> None:
        """一份现造的 ab-stats.json 走一遍 fill_ab_ops;再删掉这一键重跑一遍。"""
        from mart import functions as fn
        d = {"province": "AB", "asOf": "2026-09-23", "url": "https://www.alberta.ca/aaip-processing-information",
             "fetched": "2026-09-29",
             "summary": {"allocation": 6603, "issued": 5221, "remaining": 1382, "toProcess": 1092},
             "streams": [], "eoiPool": [],
             "additionalFederal": [{"category": "Physicians", "issued": 50, "label": self.LABEL},
                                   {"category": "Francophones", "issued": 12, "label": self.LABEL}]}
        ctx = OpsCtx(rows=[], seqs={})
        fn.fill_ab_ops(OpsProvIn(ctx=ctx, base=fn.to_ops_base(d), data=d))
        fed = [(r["scope"], r["scopeKind"], r["streamKey"], r["value"], r["unit"], r["label"], r["asOf"])
               for r in ctx.rows if r["metric"] == "nominations_additional_federal"]
        self.assertEqual(fed, [("Physicians", "category", "", 50, "nominations", self.LABEL, "2026-09-23"),
                               ("Francophones", "category", "", 12, "nominations", self.LABEL, "2026-09-23")])
        prov = {}
        for r in ctx.rows:
            if r["scope"] == "" and r["metric"] in ("allocation", "issued", "remaining"):
                prov[r["metric"]] = r["value"]
        self.assertEqual(prov, {"allocation": 6603, "issued": 5221, "remaining": 1382})
        del d["additionalFederal"]
        ctx2 = OpsCtx(rows=[], seqs={})
        fn.fill_ab_ops(OpsProvIn(ctx=ctx2, base=fn.to_ops_base(d), data=d))
        self.assertEqual([r for r in ctx2.rows if r["metric"] == "nominations_additional_federal"], [])
