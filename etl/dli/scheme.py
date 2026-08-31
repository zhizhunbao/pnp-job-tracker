"""
dli 域行形状(照样张 etl/company/scheme.py;2026-08-30 批D 全溶)。

两档形状:① 边界行 = pydantic BaseModel(源 JSON 的列名靠 validation_alias 兜、
产出 JSON 的驼峰键靠 serialization_alias 兜 —— 键从 functions 消失);
② 域内接线形状(XxxIn/XxxOut)= dataclass(不是外来数据,校验加不了值)。
"""
from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field, field_validator

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 company:多余键忽略、按字段名构造照常、
逐格裸字符串 docstring 直接成为字段 description)。"""


class DliSourceRow(BaseModel):
    """IRCC 全量 DLI JSON 的一行(列名带空格/斜杠,全走 validation_alias)。"""

    model_config = MODEL_CFG

    province: str = Field(default="", validation_alias="Province")
    """省全名(未知省跳过,见 constants.PROV_CODE)。"""

    pgwp: str = Field(default="", validation_alias="PGWP")
    """该校该项目毕业能不能申 PGWP(只留 Yes 行,范围化判据)。"""

    institution: str = Field(default="", validation_alias="Institution")
    """校名(法语校名靠强制 utf-8 解码保形)。"""

    dli_number: str = Field(default="", validation_alias="DLI #")
    """DLI 编号(去重键:同号多校区折一所,记 campuses 数)。"""

    city: str = Field(default="", validation_alias="City")
    """校区所在城市(同号多校区取首行)。"""

    sector: str = Field(default="", validation_alias="Public/Private")
    """公私立标注(含 Public 子串即判公立)。"""

    grad_program: str = Field(default="", validation_alias="Grad Program")
    """有没有研究生项目。"""

    @field_validator("*", mode="before")
    @classmethod
    def blank_when_null(cls, v: object) -> object:
        """源里缺格写 null → 折空串(原脚本逐格 `or ""` 的形状化)。"""
        if v is None:
            return ""
        return v


class DliRow(BaseModel):
    """院校级产出行(字段序 = 落盘键序;驼峰键住 serialization_alias)。"""

    model_config = MODEL_CFG

    province: str
    """省码(PROV_CODE 查得,未知省的行压根不进来)。"""

    name: str
    """校名。"""

    dli_number: str = Field(serialization_alias="dliNumber")
    """DLI 编号。"""

    city: str
    """主城(同 DLI# 多校区取首行)。"""

    campuses: int
    """同 DLI# 下的校区数(首行建档记 1,后续行累加)。"""

    is_public: bool = Field(serialization_alias="isPublic")
    """是不是公立。"""

    grad_program: bool = Field(serialization_alias="gradProgram")
    """有没有研究生项目。"""


class DliSource(BaseModel):
    """源 JSON 外壳(DataTables 惯例:行住 data 键)。"""

    model_config = MODEL_CFG

    data: list[DliSourceRow] = []
    """全量行(含 PGWP=No,过滤在 functions)。"""


class DliFile(BaseModel):
    """产出文件形状(出处 + 抓取日 + 院校行)。"""

    model_config = MODEL_CFG

    url: str
    """出处着陆页(E4-04:给人看的页,不是数据文件 URL)。"""

    fetched: str
    """抓取日 ISO。"""

    rows: list[DliRow]
    """院校行(按省码 + 校名排序)。"""


@dataclass
class DliRowIn:
    """to_dli_row() 入参(省码已由调用方查表兜过)。"""

    source: DliSourceRow
    """源行。"""

    province: str
    """查表得到的省码。"""


@dataclass
class DliFold:
    """fold_pgwp_rows() 出参:折完的院校行 + 跳过的未知省名。"""

    rows: list[DliRow]
    """院校级行(未排序)。"""

    skipped: list[str]
    """未知省名(去重后,只用于留痕报行)。"""


@dataclass
class PublicCount:
    """count_public() 出参:两个收口探针数。"""

    public: int
    """公立院校数。"""

    atlantic: int
    """大西洋四省的公立院校数(AIP 相关)。"""
