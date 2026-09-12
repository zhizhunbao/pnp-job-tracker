"""
qs 域行形状(照样张 etl/dli/scheme.py;2026-09-12 开域)。

两档形状:① 边界行 = pydantic BaseModel(源 JSON 键靠 validation_alias 兜、
产出 JSON 的驼峰键靠 serialization_alias 兜);② 域内接线形状 = dataclass。
"""
from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field, field_validator

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 dli:多余键忽略、按字段名构造照常、裸字符串 docstring 成 description)。"""


class QsSourceRow(BaseModel):
    """QS 排名端点 score_nodes 的一行(只读真用的四格)。"""

    model_config = MODEL_CFG

    title: str = ""
    """QS 侧校名(与 IRCC DLI 名单写法有别的走 constants.DLI_NAME 映射)。"""

    rank: str = ""
    """名次(源给字符串数字;并列时 rank_display 带 = 号,这格仍是纯数)。"""

    rank_display: str = ""
    """展示名次(如 "=45";前端原样显示,排序用 rank)。"""

    city: str = ""
    """QS 标注的城市(只留痕,不参与装配 —— 校区城以 DLI 名单为准)。"""

    @field_validator("*", mode="before")
    @classmethod
    def blank_when_null(cls, v: object) -> object:
        """源里缺格写 null → 折空串(照 dli 同名验证器)。"""
        if v is None:
            return ""
        return v


class QsSource(BaseModel):
    """排名端点外壳(行住 score_nodes 键)。"""

    model_config = MODEL_CFG

    score_nodes: list[QsSourceRow] = []
    """加拿大上榜行(countries=ca 端点侧已筛)。"""


class QsRow(BaseModel):
    """产出行(字段序 = 落盘键序;驼峰键住 serialization_alias)。"""

    model_config = MODEL_CFG

    name: str
    """QS 侧校名(出处原文)。"""

    dli_name: str = Field(serialization_alias="dliName")
    """IRCC DLI 名单侧校名(DLI_NAME 映射,表外 = 原名;mart build_dli 按这格 join)。"""

    rank: int
    """名次(排序键;并列取纯数)。"""

    rank_display: str = Field(serialization_alias="rankDisplay")
    """展示名次(如 "=45")。"""


class QsFile(BaseModel):
    """产出文件形状(出处 + 抓取日 + 榜行)。"""

    model_config = MODEL_CFG

    url: str
    """出处着陆页(E4-04:给人看的页,不是数据端点)。"""

    fetched: str
    """抓取日 ISO。"""

    rows: list[QsRow]
    """榜行(按 rank 升序)。"""


@dataclass
class QsFold:
    """fold_qs_rows() 出参:折完的榜行 + rank 解析不动的校名(留痕)。"""

    rows: list[QsRow]
    """榜行(未排序)。"""

    skipped: list[str]
    """rank 不是整数被跳过的校名。"""
