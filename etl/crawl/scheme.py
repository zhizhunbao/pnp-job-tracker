"""crawl.scheme — 探索域的形状(一参令 XxxIn / 单返回值 Out / 边界行 pydantic)。

2026-08-30 全溶立(fetch 同日先例);种子册常量是 dict(JSON 装得下住 constants),
进函数前经 SeedSpec.model_validate 洗成有效行(律⑨:边界行形状 = pydantic)。
asyncio 原语与 httpx 客户端字段原按存量宽型(object)登记,2026-08-31 批G 收紧成 Protocol
(company/scheme.py 的 HttpClientLike/TagLike 样张):只声明本域真用的格,装配点 cast。
"""

from asyncio import Lock, Semaphore
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel, ConfigDict

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""域内 pydantic 统一配置(company 样张同款:多余键忽略)。"""


class HttpHeadersLike(Protocol):
    """httpx 响应头里本域真用的格:只有带默认值的 get。"""

    def get(self, key: str, default: str) -> str:
        """取一个头,缺席给默认值。"""
        ...


class HttpResponseLike(Protocol):
    """httpx 异步响应里本域真用的格。"""

    status_code: int
    """HTTP 状态码。"""

    text: str
    """响应体文本。"""

    url: object
    """最终地址(跟随重定向后;本域只 str() 它当相对链接基准)。"""

    headers: HttpHeadersLike
    """响应头。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错。"""
        ...


class HttpAsyncClientLike(Protocol):
    """httpx.AsyncClient 里本域真用的格:只有 get。

    Pyrefly 对 Protocol 实参判定保守,不认 httpx.AsyncClient 的结构等价 ——
    装配点用 typing.cast 喂真客户端(断言只住装配点)。
    """

    async def get(self, url: str) -> HttpResponseLike:
        """GET 一个 URL(超时/重定向/请求头由客户端自带配置管)。"""
        ...


class MouseLike(Protocol):
    """playwright 鼠标里本域真用的格:只有滚轮(懒加载滚出来)。"""

    async def wheel(self, delta_x: int, delta_y: int) -> None:
        """滚一段。"""
        ...


class PageLike(Protocol):
    """playwright 标签页里本域真用的格(浏览器兜底 + EE 类别页两处消费)。

    evaluate 声明为交回清单:本域两处调用一处丢弃结果、一处取行清单 —— 这是用法主张,
    不是 playwright 的全量真相。方法签名库定死,一参令例外。
    """

    mouse: MouseLike
    """鼠标。"""

    async def title(self) -> str:
        """当前标题(判人机验证页用)。"""
        ...

    async def goto(self, url: str, *, wait_until: str, timeout: int) -> object:
        """导航到一页。"""
        ...

    async def wait_for_load_state(self, state: str, *, timeout: int) -> None:
        """等到某个加载态。"""
        ...

    async def wait_for_function(self, expression: str, *, timeout: int) -> object:
        """等一段 JS 判据成真(等人点验证框)。"""
        ...

    async def wait_for_timeout(self, timeout: int) -> None:
        """干等一段毫秒。"""
        ...

    async def content(self) -> str:
        """渲染后的整页 HTML。"""
        ...

    async def evaluate(self, expression: str) -> list:
        """在页内跑一段 JS 并交回结果。"""
        ...


class BrowserRequestLike(Protocol):
    """Playwright 路由请求里脚本预处理真用的格。"""

    url: str
    """待加载资源 URL。"""


class BrowserResponseLike(Protocol):
    """Playwright route.fetch 响应里真用的格。"""

    status: int
    """HTTP 状态。"""

    headers: dict[str, str]
    """响应头。"""

    async def body(self) -> bytes:
        """读取已解压响应体。"""
        ...


class BrowserRouteLike(Protocol):
    """Playwright 路由里脚本预处理真用的格。"""

    request: BrowserRequestLike
    """当前请求。"""

    async def continue_(self) -> None:
        """非目标资源原样继续。"""
        ...

    async def fetch(self) -> BrowserResponseLike:
        """取得目标资源原响应。"""
        ...

    async def fulfill(self, *, status: int, headers: dict[str, str], body: bytes) -> None:
        """以改写后的响应完成请求。"""
        ...

    async def abort(self, error_code: str) -> None:
        """规则漂移时拒绝执行原脚本。"""
        ...


class ScriptPatchSpec(BaseModel):
    """一个浏览器脚本精确替换规则。"""

    model_config = ConfigDict(extra="forbid", use_attribute_docstrings=True)

    url_contains: str
    """目标脚本 URL 的稳定判词。"""

    find: str
    """必须精确出现的原脚本文本。"""

    replace: str
    """交给浏览器执行的替换文本。"""

    expected_count: int
    """每份命中脚本的预期替换次数。"""


@dataclass
class ScriptRewriteIn:
    """rewrite_script() 入参。"""

    route: BrowserRouteLike
    """Playwright 当前资源路由。"""

    patches: tuple[ScriptPatchSpec, ...]
    """启动时严格校验过的脚本规则。"""


class SeedSpec(BaseModel):
    """一条探索种子(constants.SEEDS 的洗净形)。"""

    model_config = MODEL_CFG

    slug: str
    """产出目录名(data/crawl/<slug>/)。"""

    seed: str
    """起爬 URL。"""

    depth: int
    """BFS 深度上限。"""

    max_pages: int
    """页数上限。"""

    keywords: str = ""
    """扁平站限域关键词(逗号分隔;空 = 路径前缀限域)。"""

    concurrency: int = 0
    """并发收窄(0 = 用 DISCOVER_CONCURRENCY 默认档;有墙 = 1)。"""


class PageRow(BaseModel):
    """manifest 里的一页(discover 产出行)。"""

    model_config = MODEL_CFG

    url: str
    """页地址(规范化后)。"""

    title: str
    """页标题(空串 = 没抽到)。"""

    depth: int
    """发现深度。"""

    status: int
    """HTTP 状态(浏览器兜底按 200 记)。"""

    html: str
    """html_cache 文件名(md5(url).html)。"""


@dataclass
class CacheHit:
    """get_cached_page() 出参(单返回值令:原 (html, fetched) 元组收编)。"""

    html: str | None
    """页面原文;没爬到 = None(由调用方决定报错还是回退)。"""

    fetched: str
    """该轮 crawl 的日期(ISO,YYYY-MM-DD);没爬到 = 空串。出处日期必须是页面
    真正被取回的那天,不是脚本跑的今天。"""


@dataclass
class CachePutIn:
    """put_cached_page() 入参(一页原文 → html_cache 落盘 + manifest 登记)。
    2026-09-02 Frank 拍板数据链 crawl → raw → processed → mart:任何抓取(含浏览器渲染态)
    的页面原文都从这道门进 crawl 层,再由各域抽数据到 raw。"""

    slug: str
    """站点 slug(data/crawl/<slug>/;无则建)。"""

    url: str
    """页面地址(缓存文件名 = md5(url).html;取回靠 get_cached_page(url))。"""

    html: str
    """页面原文(渲染态取 outerHTML)。"""

    title: str
    """页标题(manifest 页行;空串可)。"""


@dataclass
class ScopeIn:
    """is_in_scope() 入参。"""

    url: str
    """待判 URL(已规范化)。"""

    seed_url: str
    """种子 URL(同域 + 路径前缀判据)。"""

    keywords: tuple[str, ...]
    """扁平站关键词(空元组 = 纯路径前缀限域)。"""


@dataclass
class CrawlCtx:
    """一轮 BFS 的共享上下文(可变累加器,fetch_page 出户后闭包变量的显式化 ——
    「外部库回调交回结果的接缝」特批同款:任务级局部对象,不是模块态)。"""

    seed_url: str
    """规范化后的种子 URL。"""

    keywords: tuple[str, ...]
    """限域关键词。"""

    max_depth: int
    """深度上限。"""

    max_pages: int
    """页数上限。"""

    html_dir: Path
    """本 slug 的 html_cache 目录。"""

    client: HttpAsyncClientLike
    """httpx.AsyncClient(装配点 cast 直喂)。"""

    sem: Semaphore
    """并发闸。"""

    lock: Lock
    """discovered 计数的互斥。"""

    visited: set = field(default_factory=set)
    """已排队/已访问 URL 集。"""

    pending: set = field(default_factory=set)
    """已入下一层队列的 URL 集。"""

    discovered: list = field(default_factory=list)
    """已收录页行(dict,PageRow.model_dump)。"""


@dataclass
class DiscoverIn:
    """discover_urls() 入参(一颗种子的 BFS 全程)。"""

    spec: SeedSpec
    """洗净的种子行。"""


@dataclass
class FetchPageIn:
    """fetch_page() 入参(一页抓取任务)。"""

    ctx: CrawlCtx
    """本轮共享上下文。"""

    url: str
    """页地址。"""

    depth: int
    """本页深度。"""


@dataclass
class ConvertIn:
    """convert_md() 入参。"""

    html: str
    """页面原文。"""

    url: str
    """页地址(相对链接绝对化的基准 + frontmatter source)。"""

    selector: str | None
    """正文容器选择器;None = DEFAULT_CONTENT_SELECTORS 逐个兜底。"""

    removes: tuple[str, ...]
    """额外要拆掉的选择器(叠加在 DEFAULT_REMOVE_SELECTORS 之上)。"""


@dataclass
class WalkIn:
    """walk()(DOM→md 递归)入参。"""

    node: object
    """bs4 节点(Tag / NavigableString / Comment)。"""

    lines: list
    """md 行累加器(递归共享)。"""

    url: str
    """相对链接绝对化基准。"""


@dataclass
class InlineIn:
    """inline_text() / inline_children() 入参。"""

    node: object
    """bs4 节点。"""

    url: str
    """相对链接绝对化基准。"""


@dataclass
class EeCat:
    """EE 类别命中(ee_category_of() 出参;None = 标题不是九类之一)。"""

    key: str
    """短 key(与 ee 域 CAT_MAP 对齐,能 join 进 ee_categories)。"""

    label: str
    """中文标签。"""


@dataclass
class UrlRow:
    """urls 哨兵的一条被检项(2026-08-31 段7):哪个域的哪条官方 URL。"""

    dom: str
    """URL 所在域(constants.py 的宿主目录名)。"""

    url: str
    """官方 URL 原文。"""


@dataclass
class UrlVerdict:
    """url_verdict_of() 出参:一条 URL 的实测判定(四格互斥,全空 = 健康)。"""

    dead: bool
    """命中死码(404/410)。"""

    status: int
    """实测状态码(异常档为 0)。"""

    moved_to: str
    """跨站重定向的落点主机(空 = 没跨站)。"""

    soft: str
    """软故障描述(异常名或「HTTP 4xx/5xx」;空 = 无)。"""
