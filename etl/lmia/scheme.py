"""
lmia 域行形状(照样张 etl/company/scheme.py;2026-08-30 批D 全溶)。

两档形状:① 边界行(CKAN 包详情)= pydantic BaseModel;② 域内接线与累加形状
(XxxIn / 聚合体)= dataclass —— 累加体带 set/dict 可变格,出域的驼峰键由
functions 的 to_* 行构造器一次拼(⑩ 号方言律:json 键只许住 to_*)。
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from pydantic import BaseModel, ConfigDict, field_validator

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 company)。"""

NormNameFn = Callable[[str], str]
"""公司名归一函数形(aip/flag_aip_jobs 的 norm_name,原 clean/05c、2026-08-31 批H2 归户;
单一来源,importlib 拉进来当参数传)。"""


class CkanResource(BaseModel):
    """CKAN 包里的一个资源(只用 url 一格)。"""

    model_config = MODEL_CFG

    url: str = ""
    """资源直链(季度 xlsx 靠文件名正则认)。"""

    @field_validator("url", mode="before")
    @classmethod
    def blank_when_null(cls, v: object) -> object:
        """缺格写 null → 折空串(原脚本 `res.get("url") or ""` 的形状化)。"""
        if v is None:
            return ""
        return v


class CkanResult(BaseModel):
    """CKAN package_show 的 result 段。"""

    model_config = MODEL_CFG

    resources: list[CkanResource] = []
    """全部资源(含各季度 xlsx 与说明文件)。"""


class CkanPackage(BaseModel):
    """CKAN package_show 响应外壳。"""

    model_config = MODEL_CFG

    result: CkanResult
    """包详情(缺了整轮失败 —— 源改版必须当场红)。"""


@dataclass
class QuarterSource:
    """一个季度的源(季度码 + 直链)。"""

    quarter: str
    """季度码,形如 2026Q1(大写)。"""

    url: str
    """xlsx 直链。"""


@dataclass
class LmiaCells:
    """数据行里真用到的六格(cells[:8] 里的 Address / Incorporate Status 不留)。"""

    prov: str
    """省/地区。"""

    stream: str
    """项目股别(技能类口径靠它判)。"""

    employer: str
    """雇主名(原样,聚合键另算)。"""

    occ: str
    """职业(NOC 码-名)。"""

    lmias: str
    """获批 LMIA 数(原始文本)。"""

    positions: str
    """获批职位数(原始文本)。"""


@dataclass
class LmiaCounts:
    """一行的两个计数(已转 int)。"""

    lmias: int
    """获批 LMIA 数。"""

    positions: int
    """获批职位数。"""


@dataclass
class LmiaEmployer:
    """一个雇主的累加体(键序即落盘序,见 functions.to_employer_row)。"""

    name: str
    """首次出现的雇主名写法。"""

    provinces: set = field(default_factory=set)
    """出现过的省(落盘前排序成列表)。"""

    streams: dict = field(default_factory=dict)
    """股别 → 职位数。"""

    quarters: dict = field(default_factory=dict)
    """季度 → [LMIA 数, 职位数]。"""

    lmias: int = 0
    """全窗口 LMIA 数。"""

    positions: int = 0
    """全窗口职位数。"""

    positions_skilled: int = 0
    """技能类三股的职位数(落盘键 positionsSkilled)。"""

    nocs: dict = field(default_factory=dict)
    """NOC(补零五位)→ 职位数。"""


@dataclass
class CountsIn:
    """to_counts() 入参(两格原始文本)。"""

    lmias: str
    """获批 LMIA 数文本。"""

    positions: str
    """获批职位数文本。"""


@dataclass
class ParseQuarterIn:
    """parse_quarter() 入参。"""

    path: Path
    """季度 xlsx 路径。"""

    quarter: str
    """季度码。"""

    table: dict
    """累加目标(聚合键 → LmiaEmployer),就地改。"""

    norm_name: NormNameFn
    """聚合键算法(aip/flag_aip_jobs 单一来源;原 clean/05c,2026-08-31 批H2 归户)。"""


@dataclass
class AccumIn:
    """accumulate_row() 入参 —— 一行落进累加体要的全部上下文。"""

    table: dict
    """累加目标。"""

    key: str
    """聚合键(norm_name 算过)。"""

    cells: LmiaCells
    """本行六格。"""

    counts: LmiaCounts
    """本行两个计数。"""

    quarter: str
    """季度码。"""


@dataclass
class ProbeIn:
    """say_probe() 入参(收口探针一行要的上下文)。"""

    table: dict
    """聚合表。"""

    key: str
    """探针名归一后的聚合键。"""

    probe: str
    """探针名原文(报行里显示的那个)。"""


@dataclass
class LmiaFileIn:
    """to_lmia_file() 入参。"""

    quarters: list
    """本轮覆盖的季度码(升序)。"""

    employers: dict
    """聚合键 → 落盘行。"""
