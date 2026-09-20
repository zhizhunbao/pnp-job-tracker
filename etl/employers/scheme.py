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

    locations: list = []
    """全部在招地点「市, 省码」,岗多的在前(主场排第一;无在招雇主取指定名单地点;2026-09-13 板上多地点胶囊)。
    2026-09-20 起存全量不再截前三:雇主板的市筛选按它匹配(在招地点里有这个市就算),板上先出三枚、其余格内展开。"""

    locProvs: list = []
    """全部在招省码,岗多的在前(无在招雇主取主省;2026-09-20):雇主板的省筛选按它匹配 —— 原先只比主省,
    Home Depot 主省 ON,筛 Alberta 搜不到它。DDL docs/sql/employer-pool-locs-20260920.sql(GIN 索引)。"""

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

    sector: str | None = None
    """雇主类别(federal / government / municipal / indigenous / public;None = 私营)。2026-09-18 雇主分类批一:
    按名字判,尺子 = names 域 sector_of(与 companies.sector 同一把;池里没有公司页的雇主也有类别)。"""

    district: str | None = None
    """主区(2026-09-18 Frank「区的字段没有啊」「授权,加区字段」):主省主市的在招岗里出现最多的区;
    岗都没带区、或一处在招都没有 = None(不猜:指定名单与公司维表都不记区)。雇主板「区」可选列读它。"""

    designatedPlaces: list = field(default_factory=list)
    """指定资格所在地(2026-09-19 Frank「指定雇主格写明所在地」):「项目|地点」清单 —— AIP 按省给资格(AIP|NB),
    RCIP / FCIP 按社区给(RCIP|Sudbury, ON)。板上只写「AIP、RCIP」、旁边又是在招最多的 Toronto,
    会让人以为多伦多的岗也能走(Englobe 实拍)。非指定 = 空表。"""

    ees: list = field(default_factory=list)
    """在招 EE 类别(2026-09-19 Frank「类别 和 全部大类 雇主也是需要的吧」):该雇主在招岗覆盖的联邦 EE 类别
    (职位板「全部类别」那一套:医疗社服 / STEM / 技工 / 教育 / 运输 …;岗上「A/B」多段的拆开算),岗多的在前;
    岗都不属任何 EE 类别 / 没有在招 = 空表。雇主板「全部类别」下拉按它筛。"""

    broads: list = field(default_factory=list)
    """在招大类(2026-09-18 Frank「再加一个全部类别,是我们正常用的类别」):该雇主在招岗覆盖的本站大类
    (职位板那一套:餐饮 / 医疗 / 技工 / IT …),岗多的在前;未分类不计;没有在招 = 空表。雇主板「全部类别」下拉按它筛。"""

    category: str | None = None
    """公司分类(2026-09-19 Frank「应该单独弄一个公司的分类。和雇主类型联动」):与 sector 两级联动的第二级。
    公立机构 / 政府四档 = names 域 category_of 按名字判(医院 / 卫生局 / 大学 / 学区 …;国防 / 警务 / 综合行政 …);
    私营 = 按在招岗大类反推的本站公司行业 15 类(BROAD_CATEGORY 对照表;全是工种 / 职能岗的反推不了 = None)——
    反推只是兜底,被用户看过的私营雇主由 explore 域的本地模型直接判,板上读数时模型判的优先。"""

    fetched: str
    """构建日(ISO)。"""


class BucketRow(BaseModel):
    """雇主×行业组桶行(星级住这;板的默认切面;2026-09-13 桶键自 27 大类改切 8 行业组)。"""

    model_config = MODEL_CFG

    employerKey: str
    """池外键(= PoolRow.key)。"""

    indGroup: str
    """行业组桶键(noc.GROUP_KEYS 八键;other = 未分类岗桶;空串 = 指定雇主无任何线索的通用桶)。"""

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
    """key → {行业组 → [岗行]}(在招)。"""

    designated_by_key: dict = field(default_factory=dict)
    """key → [designated 行]。"""

    lmia_by_key: dict = field(default_factory=dict)
    """key → LMIA 事实行。"""

    hist_by_key: dict = field(default_factory=dict)
    """key → [岗贴省市对](全史规模代理)。"""

    names: dict = field(default_factory=dict)
    """key → 显示名(三源择优)。"""

    wage_cells: dict = field(default_factory=dict)
    """(行业组, province) → [年薪中位值](水位分母语料)。"""


@dataclass
class KeyIn:
    """按池键取行的入参(聚合函数一参令)。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""


@dataclass
class HomeDistrictIn:
    """home_district_of() 入参:主省主市已定,再在该市的岗里数区。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""

    province: str | None
    """主省。"""

    city: str | None
    """主市(None = 没有市,区也就不数)。"""


@dataclass
class HomeCityIn:
    """home_city_of() 入参:主省已定,再在该省的岗里数市。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""

    province: str | None
    """主省(None = 三源都没给省)。"""


@dataclass
class HomeOut:
    """主场判定出参(在招最多的省市;无岗按指定/公司维表兜底)。"""

    province: str | None
    """主省。"""

    city: str | None
    """主市。"""

    district: str | None = None
    """主区(主市的在招岗里出现最多的区;岗都没带区 = None)。"""


@dataclass
class DesignatedOut:
    """指定归属汇总出参。"""

    programs: list
    """项目清单(去重有序)。"""

    provinces: list
    """归属省清单(去重有序)。"""

    places: list
    """资格所在地清单(「项目|地点」;地点 = 名单上的社区,没有社区的用省码;去重,按项目与地点排序)。"""


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
    """bucket_row_of() 入参(一雇主一行业组)。"""

    ctx: PoolCtx
    """聚合上下文。"""

    key: str
    """池主键。"""

    group: str
    """行业组桶键。"""


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
