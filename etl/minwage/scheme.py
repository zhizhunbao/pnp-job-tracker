"""
minwage 域形状(2026-09-13 立域;照 dli 样张:pydantic 边界模型 + dataclass 入参)。
import 只有标准库与 pydantic(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 dli:多余键忽略、按字段名构造照常、逐格裸字符串 docstring 成为 description)。"""


class ProvSourceRow(BaseModel):
    """源辖区表的一行。"""

    model_config = MODEL_CFG

    prov_id: int
    """内部编号。"""

    province_code: str
    """两位码(FE / NF / ON …)。"""


class WageSourceRow(BaseModel):
    """源调整表的一行(只声明真读的格;变体行也进来,过滤在 functions)。"""

    model_config = MODEL_CFG

    prov_prov_id: int
    """辖区内部编号。"""

    effective_date: str
    """生效日(YYYY/MM/DD HH:MM:SS)。"""

    expiry_date: str = ""
    """失效日;现行档没有此键。"""

    minimum_wage_amount: float
    """时薪(加元)。"""

    rt_rate_type_id: int
    """档型编号。"""

    minimum_wage_ind: int
    """一般档标志。"""


class MinWageData(BaseModel):
    """源 data 段:辖区表 + 调整表(变体注释表不读)。"""

    model_config = MODEL_CFG

    provinces: list[ProvSourceRow]
    """辖区表。"""

    wages: list[WageSourceRow]
    """调整表。"""


class MinWageSource(BaseModel):
    """源 JSON 顶层。"""

    model_config = MODEL_CFG

    data: MinWageData
    """三张表所在的段。"""


class MinWageRow(BaseModel):
    """产出行:一般成人档一次调整(字段序 = 落盘键序;驼峰键住 serialization_alias)。"""

    model_config = MODEL_CFG

    province: str
    """地区码(两位省码;联邦 CA)。"""

    effective_date: str = Field(serialization_alias="effectiveDate")
    """生效日(YYYY-MM-DD)。"""

    expiry_date: str = Field(serialization_alias="expiryDate")
    """失效日(YYYY-MM-DD;现行档空串)。"""

    rate: float
    """时薪。"""


class MinWageFile(BaseModel):
    """落盘文件:出处 + 抓取日 + 行。"""

    model_config = MODEL_CFG

    url: str
    """出处着陆页。"""

    fetched: str
    """抓取日(ISO)。"""

    rows: list[MinWageRow]
    """一般档逐次调整,按地区、生效日升序。"""


@dataclass
class RowIn:
    """to_row() 入参:源调整行 + 辖区内部编号 → 本站地区码表。"""

    w: WageSourceRow
    """源调整行。"""

    codes: dict
    """prov_id → 地区码(联邦 CA、NF 并 NL)。"""
