"""employers.scheme — 雇主池形状(产出行 pydantic,律⑨;聚合上下文 dataclass)。

读侧四源是既有 mart/raw 表(dict 扫描 + K_ 常量,crawl cache 同例);
写侧两张产出行走 BaseModel —— 字段名即 DB 列名(camelCase,mart 全表同惯例,
docs/sql DDL 对齐)。
"""
from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""域内 pydantic 统一配置(company 样张同款)。"""


class PoolRow(BaseModel):
    """雇主池全局行(一行 = 一雇主)。"""

    model_config = MODEL_CFG

    key: str
    """池主键:有 slug 用 slug,三源独有雇主用 n:+归一名(与 slug 空间不撞)。"""

    slug: str | None
    """公司详情页 slug;三源独有(无公司页)= None(空是事实,不硬造)。"""

    name: str
    """雇主显示名(三源择优:companies > designated > LMIA)。"""

    industry: str | None
    """行业(companies.sectors;无源 = None)。"""

    province: str | None
    """主省(在招岗数最多省;无岗雇主取 designated/companies 省)。"""

    city: str | None
    """主市(同上口径)。"""

    designated: bool
    """指定雇主命中(AIP/RCIP/FCIP 任一)。"""

    designatedPrograms: list = []
    """命中的项目清单(徽章灰注用)。"""

    designatedProvinces: list = []
    """指定归属省清单。"""

    openJobsTotal: int
    """全桶在招总岗数。"""

    histJobs: int
    """历史累计岗贴数(含已下架;规模代理,进事实不进星级 —— 大公司未必要新人)。"""

    provincesActive: int
    """运营省数(全史岗贴 distinct;规模代理)。"""

    citiesActive: int
    """运营市数(同上)。"""

    websiteKnown: bool
    """官网已知(companies.website 非空;规模代理:可核实性)。"""

    lmiaSkilledTotal: int
    """技能类 LMIA 获批总数(TEER≤3;旁证,永不入全局排序)。"""

    lmiaLastQuarter: str | None
    """最近 LMIA 获批季(无记录 = None)。"""

    fetched: str
    """构建日(ISO)。"""


class BucketRow(BaseModel):
    """雇主×大类桶行(星级住这;板的默认切面)。"""

    model_config = MODEL_CFG

    employerKey: str
    """池外键(= PoolRow.key)。"""

    broad: str
    """本站大类桶键(jobs.broad 词表;指定雇主无 NOC 线索且无在招 = 空串通用桶)。"""

    openJobs: int
    """桶内在招岗数。"""

    latestPosted: str | None
    """桶内最新发布日。"""

    topTitles: list = []
    """桶内主要职业名(频次前 N;号脉不筛选)。"""

    entryJobs: int
    """入门可及岗数(junior/co-op 档 或 学徒友好)。"""

    entryShare: int | None
    """入门占比(百分比整数;无在招 = None)。"""

    minExperience: str | None
    """桶内已知最低经验档(unknown 不表态;全 unknown = None)。"""

    lmiaSkilled: int
    """桶内技能类 LMIA 获批份数(逐 NOC 判 TEER≤3 后归桶)。"""

    lmiaLastQuarter: str | None
    """桶内最近获批季(粗到雇主级;无 = None)。"""

    star: int
    """切面星 1-5(权重拍死:指定>>在招+入门>技能LMIA;机会参考≠资格认定)。"""

    wageMedAnnual: int | None
    """桶内雇主岗年薪中位(无薪资数据 = None,不折 0 —— 可空数值保 null 律)。"""

    wageIndexPct: int | None
    """工资水位 = 桶内中位 vs 同桶同省全体中位的百分比(100=持平;分母缺 = None)。"""


@dataclass
class StarIn:
    """star_of() 入参(桶级信号四格)。"""

    designated: bool
    """雇主级指定命中。"""

    open_jobs: int
    """桶内在招。"""

    entry_jobs: int
    """桶内入门可及。"""

    lmia_skilled: int
    """桶内技能类 LMIA。"""


@dataclass
class PoolCtx:
    """一轮池构建的聚合上下文(load 段装载,聚合段逐步读;任务级局部累加器)。"""

    companies_by_slug: dict = field(default_factory=dict)
    """slug → companies 行。"""

    norm_to_slug: dict = field(default_factory=dict)
    """归一名 → slug(designated/LMIA 挂靠用;残差不硬合)。"""

    open_by_key: dict = field(default_factory=dict)
    """key → {broad → [岗行]}(在招)。"""

    designated_by_key: dict = field(default_factory=dict)
    """key → [designated 行]。"""

    lmia_by_key: dict = field(default_factory=dict)
    """key → LMIA 事实行。"""

    hist_by_key: dict = field(default_factory=dict)
    """key → [岗贴省市对](全史规模代理)。"""

    names: dict = field(default_factory=dict)
    """key → 显示名(三源择优)。"""

    wage_cells: dict = field(default_factory=dict)
    """(broad, province) → [年薪中位值](水位分母语料)。"""


@dataclass
class KeyIn:
    """按池键取行的入参(聚合函数一参令)。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""


@dataclass
class HomeOut:
    """主场判定出参(在招最多的省市;无岗按指定/公司维表兜底)。"""

    province: str | None
    """主省。"""

    city: str | None
    """主市。"""


@dataclass
class DesignatedOut:
    """指定归属汇总出参。"""

    programs: list
    """项目清单(去重有序)。"""

    provinces: list
    """归属省清单(去重有序)。"""


@dataclass
class HistOut:
    """全史规模代理出参。"""

    jobs: int
    """历史累计岗贴数。"""

    provinces: int
    """运营省数。"""

    cities: int
    """运营市数。"""


@dataclass
class BucketIn:
    """bucket_row_of() 入参(一雇主一大类)。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""

    broad: str
    """大类桶键。"""


@dataclass
class ScanOut:
    """桶内在招岗扫描出参(一次遍历产全部派生格)。"""

    entry: int
    """入门可及岗数。"""

    min_exp: str | None
    """已知最低经验档。"""

    top_titles: list
    """频次前 N 职业名。"""

    wages: list
    """年薪中位值清单(水位分子语料)。"""

    latest: str | None
    """最新发布日。"""

    prov_top: str | None
    """桶内岗最多的省(水位分母 cell 键)。"""
