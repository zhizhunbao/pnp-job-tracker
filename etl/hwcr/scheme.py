"""
hwcr 域形状(照样张 etl/dli/scheme.py;2026-09-04 立域)。

两档形状:① 边界行 = pydantic BaseModel(接口 JSON 的下划线键与产出 JSON 的驼峰键靠别名兜);
② 域内接线形状(XxxIn/XxxOut)= dataclass(不是外来数据,校验加不了值)。
"""
from dataclasses import dataclass

import httpx
from pydantic import BaseModel, ConfigDict, Field, field_validator

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(多余键忽略、按字段名构造照常、逐格裸字符串 docstring 直接成为字段 description)。"""


class HwcrApiField(BaseModel):
    """接口帖行里的一格结构化字段(data 数组元素:name/value/icon)。"""

    model_config = MODEL_CFG

    name: str = ""
    """格名(房屋户型/坐标地址/房屋描述/出租租金/联系方式)。"""

    value: str = ""
    """格值(自由文本)。"""

    @field_validator("*", mode="before")
    @classmethod
    def blank_when_null(cls, v: object) -> object:
        """缺格写 null → 折空串。"""
        if v is None:
            return ""
        return v


class HwcrApiPic(BaseModel):
    """接口帖行里的一张图(pictures 数组元素;只读 url)。"""

    model_config = MODEL_CFG

    url: str = ""
    """原图地址(阿里云 OSS)。"""


class HwcrApiPost(BaseModel):
    """接口返回的一帖(只声明真读的格;user 等私密格不进来)。"""

    model_config = MODEL_CFG

    id: int
    """帖 id(增量去重键)。"""

    content: str = ""
    """全文(【格名】:值 换行拼接;判词与地标扫描用)。"""

    template_id: int = Field(default=0, validation_alias="convenience_template_id")
    """模板 id(17 出租 / 16 求租 …;null → 0)。"""

    created_at: str = Field(default="", validation_alias="create_time")
    """发布时间「YYYY-MM-DD HH:MM:SS」。"""

    updated_at: str = Field(default="", validation_alias="update_time")
    """更新时间(同 id 取新)。"""

    is_end: int = 0
    """站方「已结束」标(0 在招;1 结束)。"""

    source: str = Field(default="", validation_alias="msg_source")
    """消息来源(站方标的城市群名)。"""

    fields: list[HwcrApiField] = Field(default=[], validation_alias="data")
    """结构化格(出租模板五格)。"""

    pictures: list[HwcrApiPic] = []
    """图片。"""

    @field_validator("template_id", "is_end", mode="before")
    @classmethod
    def zero_when_null(cls, v: object) -> object:
        """接口整数格写 null → 0(template_id 实测有 null;0 不是任何模板 id,等于「未知」)。"""
        if v is None:
            return 0
        return v

    @field_validator("content", "created_at", "updated_at", "source", mode="before")
    @classmethod
    def blank_when_null(cls, v: object) -> object:
        """接口文本格写 null → 空串。"""
        if v is None:
            return ""
        return v

    @field_validator("fields", "pictures", mode="before")
    @classmethod
    def empty_when_null(cls, v: object) -> object:
        """接口数组格写 null → 空数组。"""
        if v is None:
            return []
        return v


class HwcrApiResp(BaseModel):
    """列表接口外壳(succ + data 数组)。"""

    model_config = MODEL_CFG

    succ: bool = False
    """站方成功标。"""

    data: list[HwcrApiPost] = []
    """帖行。"""


class HwcrPostRow(BaseModel):
    """raw 累积表的一帖(接口行洗成本域形:五格折成 dict,图只留 url)。
    键名就是字段名(下划线):本表要回读(增量合并),pyrefly 的 pydantic 插件把 alias 当必填构造参数,
    驼峰别名在这里只添乱;对外产出 RoomRow 才走驼峰。"""

    model_config = MODEL_CFG

    id: int
    """帖 id。"""

    template_id: int
    """模板 id。"""

    kind: str
    """模板名(出租/求租…;查不到留空串)。"""

    created_at: str
    """发布时间。"""

    updated_at: str
    """更新时间。"""

    is_end: bool
    """站方已结束标。"""

    source: str
    """消息来源。"""

    content: str
    """全文。"""

    fields: dict[str, str]
    """格名 → 格值。"""

    pictures: list[str]
    """图片地址。"""


class HwcrRawFile(BaseModel):
    """raw 累积表外壳(出处 + 抓取日 + 帖行)。"""

    model_config = MODEL_CFG

    url: str
    """出处着陆页。"""

    fetched: str
    """最近一次抓取日 ISO。"""

    posts: list[HwcrPostRow]
    """帖行(按 created_at 降序)。"""


class GeoHit(BaseModel):
    """Nominatim 一条命中(只读三格)。"""

    model_config = MODEL_CFG

    lat: str
    """纬度(串)。"""

    lon: str
    """经度(串)。"""

    display_name: str = ""
    """命中的完整地名(报告里给人核对)。"""


class GeoPoint(BaseModel):
    """一个坐标点 + 命中地名。"""

    model_config = MODEL_CFG

    lat: float
    """纬度。"""

    lon: float
    """经度。"""

    name: str
    """Nominatim 命中地名。"""


class RoomRow(BaseModel):
    """产出清单的一行(字段序 = 落盘键序)。"""

    model_config = MODEL_CFG

    id: int
    """帖 id。"""

    posted_at: str = Field(serialization_alias="postedAt")
    """发布日 YYYY-MM-DD。"""

    distance_km: float | None = Field(serialization_alias="distanceKm")
    """到 Lisgar 的直线距离;位置不明 = null(记录了「不知道」)。"""

    walk_min: int | None = Field(serialization_alias="walkMin")
    """步行分钟估;位置不明 = null。"""

    precision: str
    """位置精度(address/postal/landmark/unknown)。"""

    query: str
    """送去地理编码的查询串(空串 = 没东西可查)。"""

    place: str
    """Nominatim 命中地名(空串 = 没命中)。"""

    address: str
    """帖里的地址原文。"""

    layout: str
    """户型原文。"""

    rent_text: str = Field(serialization_alias="rentText")
    """租金原文。"""

    rent_monthly: int | None = Field(serialization_alias="rentMonthly")
    """租金抽数;抽不出 = null。"""

    description: str
    """描述原文。"""

    contact: str
    """联系方式原文(实测一律「联系超人」)。"""

    link: str
    """帖子分享链接。"""

    pictures: list[str]
    """图片地址。"""


class RoomsFile(BaseModel):
    """产出清单外壳。"""

    model_config = MODEL_CFG

    anchor: str
    """锚点地址。"""

    anchor_point: GeoPoint = Field(serialization_alias="anchorPoint")
    """锚点坐标。"""

    generated: str
    """生成日 ISO。"""

    rows: list[RoomRow]
    """清单行(距离升序,位置不明排尾)。"""


@dataclass
class PageIn:
    """fetch_housing_page() 入参。"""

    client: httpx.Client
    """httpx 客户端(fetch 域两门出品;只用 get)。真类型不用自声明鸭子形:httpx.Client.get 带一串
    kw-only 参数、text 是 property,pyrefly 判鸭子形不可赋,鸭子形反而比真形贵。"""

    page: int
    """页码(1 起)。"""


@dataclass
class MergeIn:
    """merge_posts() 入参。"""

    old: list[HwcrPostRow]
    """已有累积行。"""

    new: list[HwcrPostRow]
    """本轮抓到的行。"""


@dataclass
class MergeOut:
    """merge_posts() 出参。"""

    posts: list[HwcrPostRow]
    """合并后的行(created_at 降序)。"""

    added: int
    """新增帖数。"""

    updated: int
    """同 id 但 updated_at 更新的帖数。"""


@dataclass
class GeoStat:
    """geocode 一轮的计数(缓存命中/现查/未命中);单返回值令下由调用方持有并累加。"""

    cached: int = 0
    """crawl 层已有响应的次数。"""

    fetched: int = 0
    """现打 Nominatim 的次数。"""

    miss: int = 0
    """查了但没命中的次数。"""


@dataclass
class GeoIn:
    """geocode() 入参。"""

    client: httpx.Client
    """httpx 客户端(只用 get)。"""

    query: str
    """自由文本查询串。"""

    stat: GeoStat
    """地理编码计数器(就地累加)。"""


@dataclass
class Located:
    """locate_post() 出参:一帖的地点解析结果。"""

    precision: str
    """address/postal/landmark/unknown。"""

    query: str
    """送查的串(unknown 时空串)。"""

    point: GeoPoint | None
    """坐标;查不到 = None。"""


@dataclass
class LocateIn:
    """locate_post() 入参。"""

    client: httpx.Client
    """httpx 客户端。"""

    post: HwcrPostRow
    """待解析的帖。"""

    fsa: dict[str, GeoPoint]
    """FSA → 质心(GeoNames 本地表,build 起头读一次)。"""

    stat: GeoStat
    """地理编码计数器(就地累加)。"""


@dataclass
class DistanceIn:
    """distance_km_of() 入参。"""

    a: GeoPoint
    """点 A。"""

    b: GeoPoint
    """点 B。"""


@dataclass
class RoomRowIn:
    """to_room_row() 入参。"""

    post: HwcrPostRow
    """帖。"""

    located: Located
    """地点解析结果。"""

    anchor: GeoPoint
    """锚点坐标。"""


@dataclass
class ReportIn:
    """report_of() 入参。"""

    rows: list[RoomRow]
    """清单行(已排序)。"""

    total: int
    """窗口内出租帖总数(含非单间)。"""


@dataclass
class RowBlockIn:
    """row_lines_of() 入参。"""

    n: int
    """报告里的序号(节内 1 起)。"""

    row: RoomRow
    """清单行。"""


@dataclass
class HitCheckIn:
    """is_hit_plausible() 入参。"""

    precision: str
    """这一级的精度(address/postal/landmark)。"""

    query: str
    """送查的串。"""

    point: GeoPoint
    """Nominatim 命中。"""
