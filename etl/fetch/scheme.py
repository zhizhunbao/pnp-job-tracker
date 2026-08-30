"""fetch.scheme — 通用抓取域的形状(一参令 XxxIn / 单返回值 XxxOut / 库形状 Protocol 自声明)。

2026-08-30 立(Frank:参数和返回值只允许一个,fetch 也要 scheme);Protocol 只声明
真用的格(company 样张同律),不 import httpx/bs4 —— 叶子零依赖,装配点用真实对象
直接喂(鸭子类型;需要 cast 时只住装配点)。
"""
from dataclasses import dataclass
from typing import Protocol


class HttpResponseLike(Protocol):
    """HTTP 响应形状(fetch 只用这两格)。"""

    text: str
    """响应正文。"""

    def raise_for_status(self) -> object:
        """非 2xx 即抛(httpx 同名方法)。"""


class HttpClientLike(Protocol):
    """HTTP 客户端形状(fetch 只用 get/post 两门)。"""

    def get(self, url: str) -> HttpResponseLike:
        """GET 一发。"""

    def post(self, url: str, data: dict) -> HttpResponseLike:
        """POST 表单一发。"""


class TagLike(Protocol):
    """bs4 元素形状(section_body 只用兄弟遍历一格)。"""

    def find_next_siblings(self) -> list:
        """同级后继元素清单。"""


@dataclass
class FetchIn:
    """fetch() 入参。"""

    client: HttpClientLike
    """已构造的客户端(make_client / make_polite_client 两门出品)。"""

    url: str
    """目标地址。"""

    post_data: dict | None
    """POST 表单体;None = 走 GET(SK 新闻 hub 的 Sitecore 筛选是 POST-only)。"""


@dataclass
class DetailIn:
    """extract_detail() 入参。"""

    html: str
    """详情页 HTML。"""

    selector: str | None
    """正文容器选择器;None = main/article 通用抽取。"""


@dataclass
class DetailOut:
    """extract_detail() 出参(单返回值令:tuple 收编成具名格)。"""

    og_image: str | None
    """og:image 封面图;页面没有 = None(空是事实)。"""

    body: str
    """正文纯文本;抽不到 = 空串(只卡片不出详情,不硬造)。"""


@dataclass
class SectionIn:
    """section_body() 入参。"""

    heading: TagLike
    """日期标题元素(BC/ON/AB 式页面的段首)。"""

    stop_names: tuple[str, ...]
    """遇到即停的同级标题标签名。"""
