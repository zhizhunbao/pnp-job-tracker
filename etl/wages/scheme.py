"""
wages 域行形状(照样张 etl/company/scheme.py;2026-08-30 批D 全溶)。

两档形状:① 边界行(WDS 元数据、JVWS 原始表)= pydantic BaseModel(驼峰键住
validation_alias,键从 functions 消失);② 域内接线与洗净事实(XxxIn/XxxOut/XxxFact)
= dataclass。落盘用的驼峰键由 functions 的 to_* 行构造器一次拼(⑩ 号方言律)。
"""
from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 company)。"""


# =========================================================================
# 1. ESDC 中位工资(CSV 行 → 洗净事实 → 落盘 entry)
# =========================================================================


@dataclass
class WageCsvRow:
    """源 CSV 一行里真用到的七格(列名住 to_wage_csv_row 体内)。"""

    noc: str
    """NOC 五位码(已去 NOC_ 前缀)。"""

    prov: str
    """省码或 NAT(已大写)。"""

    er: str
    """经济区码(4 位 = 整省,6 位 = 经济区)。"""

    annual_flag: bool
    """数值是不是年薪率(否则是时薪)。"""

    median: str
    """中位工资原始文本(必备,缺了整条跳过)。"""

    low: str
    """低位工资原始文本(可能空)。"""

    high: str
    """高位工资原始文本(可能空)。"""

    year: str
    """数据参考期(可能空)。"""


@dataclass
class HourlyIn:
    """to_hr_yr() 入参。"""

    raw: str
    """工资原始文本。"""

    annual_flag: bool
    """按年薪率还是时薪解读。"""


@dataclass
class WagePair:
    """一档工资的两种口径(统一存 hourly + annual 便于对比/显示)。"""

    hourly: float
    """时薪。"""

    annual: int
    """年薪。"""


@dataclass
class WageEntryIn:
    """to_wage_entry() 入参(low/high/year 缺则不写键)。"""

    median: WagePair
    """中位(必备)。"""

    low: WagePair | None
    """低位。"""

    high: WagePair | None
    """高位。"""

    year: str
    """数据参考期。"""


@dataclass
class WageProbeIn:
    """say_wage_probe() 入参。"""

    table: dict
    """维度表(NOC → 地区 → entry)。"""

    noc: str
    """探针 NOC 五位码。"""


# =========================================================================
# 2. StatCan JVWS(WDS 元数据 + 全表 CSV → 省级空缺事实)
# =========================================================================


class JvwsMember(BaseModel):
    """维度成员(地理/NOC/统计量三个维度共用一种形状)。"""

    model_config = MODEL_CFG

    member_id: int = Field(validation_alias="memberId")
    """成员 ID(坐标里按它对号)。"""

    member_name_en: str = Field(default="", validation_alias="memberNameEn")
    """成员英文名(地理名查省码、统计量名认 Job vacancies)。"""

    geo_level: int | None = Field(default=None, validation_alias="geoLevel")
    """地理层级(0=Canada,2=省/准州,更细的是经济区);非地理维度没这格。"""

    classification_code: str | None = Field(default=None, validation_alias="classificationCode")
    """分类码(NOC 维度才有;五位=叶节点)。"""


class JvwsDimension(BaseModel):
    """一个维度及其成员表。"""

    model_config = MODEL_CFG

    dimension_position_id: int = Field(validation_alias="dimensionPositionId")
    """维度位(1=地理,2=NOC,3=统计量)。"""

    member: list[JvwsMember] = []
    """成员表。"""


class JvwsMeta(BaseModel):
    """WDS getCubeMetadata 的 object 段(只声明真用的格)。"""

    model_config = MODEL_CFG

    cube_title_en: str = Field(default="", validation_alias="cubeTitleEn")
    """表名(报行用)。"""

    archive_status_en: str = Field(default="", validation_alias="archiveStatusEn")
    """归档状态(不是 CURRENT 就整轮失败,禁止凭旧表号跑)。"""

    release_time: str = Field(default="", validation_alias="releaseTime")
    """最新发布时刻(落进产出的 source 段)。"""

    cube_start_date: str = Field(default="", validation_alias="cubeStartDate")
    """数据起始日。"""

    cube_end_date: str = Field(default="", validation_alias="cubeEndDate")
    """数据结束日。"""

    dimension: list[JvwsDimension] = []
    """三个维度。"""


class JvwsMetaEnvelope(BaseModel):
    """WDS 响应外壳(响应是单元素数组,取 [0] 后进这层)。"""

    model_config = MODEL_CFG

    object: JvwsMeta
    """元数据本体(缺了整轮失败)。"""


@dataclass
class JvwsBufRow:
    """全表 CSV 扫出来的省级候选行(未截季度窗前)。"""

    ref_date: str
    """参考期(YYYY-MM)。"""

    province: str
    """省码。"""

    noc: str
    """NOC 五位码。"""

    value: str
    """值原始文本(空 = 抑制/未采集)。"""

    status: str
    """质量码原始文本。"""


@dataclass
class JvwsFact:
    """洗净的空缺事实(字段序 = 落盘键序,见 functions.to_jvws_row)。"""

    quarter: str
    """季度码。"""

    ref_date: str
    """参考期(落盘键 refDate)。"""

    province: str
    """省码。"""

    noc: str
    """NOC 五位码。"""

    vacancies: int | None
    """空缺岗位数;🔴 VALUE 缺失写 None 不折 0(官方抑制值不能替官方编数字)。"""

    quality: str | None
    """质量码(A-F / '..' / 'x';空串折 None)。"""


@dataclass
class JvwsExtractOut:
    """extract_rows() 出参。"""

    facts: list
    """截过季度窗的空缺事实。"""

    quarters: list
    """覆盖的季度码(升序)。"""


@dataclass
class CurlGetIn:
    """curl_get() 入参(out_path 为 None = 收 stdout)。"""

    url: str
    """目标 URL。"""

    out_path: object
    """落盘路径;None 表示把响应体收进 stdout。"""

    timeout: int
    """超时秒数。"""


@dataclass
class DimensionAtIn:
    """dimension_at() 入参。"""

    meta: JvwsMeta
    """元数据本体。"""

    position: int
    """维度位。"""


@dataclass
class JvwsScanIn:
    """scan_zip() 入参(三张对照表,扫全表时逐行查)。"""

    geo_map: dict
    """地理成员 ID → 省码(只含省级)。"""

    noc_map: dict
    """NOC 成员 ID → 五位码(只含叶节点)。"""

    stat_id: str
    """Job vacancies 统计量的成员 ID。"""


@dataclass
class JvwsScanOut:
    """scan_zip() 出参。"""

    buf: list
    """省级候选行(全历史,未截季度窗)。"""

    dates: list
    """出现过的参考期(按文件顺序,末尾是最新)。"""


@dataclass
class JvwsFactIn:
    """to_jvws_fact() 入参。"""

    row: JvwsBufRow
    """候选行。"""

    quarter: str
    """该参考期对应的季度码。"""


@dataclass
class JvwsProbeIn:
    """jvws_probe() 入参(全国口径某季某 NOC 的探针)。"""

    facts: list
    """全部空缺事实。"""

    quarter: str
    """季度码。"""

    noc: str
    """NOC 五位码。"""


@dataclass
class JvwsSayProbeIn:
    """say_jvws_probe() 入参。"""

    facts: list
    """全部空缺事实。"""

    quarter: str
    """最新季度码。"""

    noc: str
    """探针 NOC。"""

    label: str
    """探针中文名(报行里显示)。"""


@dataclass
class JvwsFileIn:
    """to_jvws_file() 入参。"""

    meta: JvwsMeta
    """元数据本体(出处与发布时刻从这来)。"""

    fetched: str
    """抓取日 ISO。"""

    quarters: list
    """覆盖季度。"""

    rows: list
    """落盘行(已过 to_jvws_row)。"""


# =========================================================================
# 3. JVWS 列对齐表(原始表 → mart 行)
# =========================================================================


class JvwsSource(BaseModel):
    """原始表的 source 段(mart 只用出处与抓取日两格)。"""

    model_config = MODEL_CFG

    url: str = ""
    """官方页 URL。"""

    fetched: str = ""
    """抓取日 ISO。"""


class JvwsRawRow(BaseModel):
    """原始表的一行(驼峰键住 validation_alias)。"""

    model_config = MODEL_CFG

    noc: str
    """NOC 五位码。"""

    province: str
    """省码。"""

    quarter: str
    """季度码。"""

    ref_date: str = Field(validation_alias="refDate")
    """参考期。"""

    vacancies: int | None = None
    """空缺岗位数(None = 抑制/未采集)。"""

    quality: str | None = None
    """质量码。"""


class JvwsRawFile(BaseModel):
    """原始表整体形状。"""

    model_config = MODEL_CFG

    source: JvwsSource
    """出处段。"""

    quarters: list[str] = []
    """覆盖季度。"""

    rows: list[JvwsRawRow] = []
    """空缺行。"""


@dataclass
class MartRowIn:
    """to_mart_row() 入参。"""

    row: JvwsRawRow
    """原始行。"""

    source_url: str
    """出处 URL(每行带,列对齐 DB)。"""

    fetched: str
    """抓取日 ISO(同上)。"""
