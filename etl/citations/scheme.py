"""
citations 域形状(照 dli/load 样张;2026-08-31 批D 立域)。

三档:① 库形状 Protocol 自声明只真用的格(HttpGetLike,装配点 cast 喂 httpx.Client);
② 产出行 = dataclass(字段声明序 = 落盘键序,asdict 直接出 JSON,键从 functions 消失);
③ 域内接线形状(XxxIn)= dataclass,一参令下多入参收编的口袋。
"""
from dataclasses import dataclass
from typing import Protocol


class HttpRespLike(Protocol):
    """HTTP 响应形状(着陆页抓取只用这两格)。"""

    status_code: int
    """状态码(只有 200 算验证通过)。"""

    text: str
    """页面 HTML 全文。"""


class HttpGetLike(Protocol):
    """抓取客户端形状(只用 get 一门)。"""

    def get(self, url: str, headers: dict, timeout: int, follow_redirects: bool) -> HttpRespLike:
        """取一个着陆页(签名由 httpx 定死,外部规定)。"""


@dataclass
class PageMeta:
    """一个着陆页的验证结果(title/description 是**原文**,不经 LLM 不翻译)。"""

    status: str
    """verified / unverified。"""

    title: str
    """页面标题原文(抓不到留空)。"""

    description: str
    """meta description 原文(抓不到留空)。"""


@dataclass
class SourceRow:
    """注册表一行(字段声明序 = 落盘键序;数据集级与派生级共用一形)。"""

    field: str
    """前端字段名。"""

    kind: str
    """dataset(抓网验证)/ derived(本站派生)。"""

    publisher: str
    """发布机构(派生行 = 本站)。"""

    url: str
    """着陆页 URL(派生行留空)。"""

    title: str
    """着陆页标题原文(派生行留空)。"""

    description: str
    """着陆页描述原文(派生行留空)。"""

    status: str
    """verified / unverified / derived。"""

    fetched: str
    """本轮抓取日 ISO。"""

    note: str
    """本站口径一句(仅派生行)。"""


@dataclass
class SourceFile:
    """产出文件形状(抓取日 + 全部行)。"""

    fetched: str
    """本轮抓取日 ISO。"""

    rows: list[SourceRow]
    """数据集级行(逐字段展开)+ 派生行。"""


@dataclass
class FetchIn:
    """fetch_meta() 入参。"""

    client: HttpGetLike
    """抓取客户端(httpx.Client 经装配点 cast 喂入)。"""

    url: str
    """着陆页 URL。"""


@dataclass
class DatasetRowIn:
    """to_dataset_row() 入参。"""

    field: str
    """前端字段名(一个 dataset 的 fields 逐个展开)。"""

    dataset: dict
    """注册表条目(publisher/url 从这取)。"""

    meta: PageMeta
    """该 URL 的验证结果(同 URL 只抓一次)。"""

    fetched: str
    """本轮抓取日 ISO。"""


@dataclass
class DerivedRowIn:
    """to_derived_row() 入参。"""

    entry: dict
    """派生条目(field/note 从这取)。"""

    fetched: str
    """本轮抓取日 ISO。"""


@dataclass
class StatusCount:
    """收口计数:验过的与没验上的行数。"""

    verified: int
    """status=verified 的行数。"""

    unverified: int
    """status=unverified 的行数。"""
