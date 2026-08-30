"""
company 域行形状(三件套形制**全站样张**,2026-08-30)。

⚠ 抽屉名 Python 方言定 **scheme.py** 不叫 types.py(2026-08-30 两拍):types.py 会遮蔽
标准库 types 模块(域目录=脚本 sys.path[0],httpx/bs4 内部 import types 当场炸,实撞);
名字 Frank 拍 scheme(压过 shapes 提议)。cms 侧照旧 types.ts,这是两方言唯一的名字分叉;
运行时校验若来,另开抽屉不占此名。

形状一律 **dataclass**(2026-08-30 Frank「还是有很多字段常量啊」定形):属性访问 r.name,
字段键词汇从 functions 消失 —— json 进出边界的键只许住 functions 的 to_* 行构造器
(cms「db 词汇只许 to* 体内」直译)与 dataclasses.asdict。
库类型用 Protocol 只声明真用的格(cms「只声明真读的格」同律);字段默认值是形状语义
(TypedDict total=False 的等价物),不违「函数禁默认参」。
本文件只许 import typing/标准库。
"""
from dataclasses import dataclass
from typing import Protocol


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    text: str
    """响应体文本。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:只有 get。

    方法签名按「本域怎么调」收窄;默认值是库形状特批(cms「库定死签名的除外」同律)。
    Pyrefly 对 Protocol 实参判定保守,不认 httpx.Client 的结构等价 ——
    装配点用 typing.cast 喂真客户端(断言只住装配点,cms 同律)。
    """

    def get(self, url: str, *, params: dict | None = None,
            timeout: float | None = None) -> HttpResponseLike:
        """GET 一个 URL;params/timeout 按需传。"""
        ...


class TagLike(Protocol):
    """bs4 节点里本域真用的格(soup 与卡片同形;装配点 cast,同上)。"""

    def select(self, sel: str) -> list["TagLike"]:
        """CSS 选择,返回子节点列表。"""
        ...

    def select_one(self, sel: str) -> "TagLike | None":
        """CSS 选择,返回首个命中或 None。"""
        ...

    def find_all(self, name: str, href: bool = False) -> list["TagLike"]:
        """按标签名找(href=True 只要带链接的)。"""
        ...

    def get_text(self, separator: str = "", strip: bool = False) -> str:
        """取文本。"""
        ...

    def __getitem__(self, key: str) -> object:
        """取属性(如 href)。"""
        ...


@dataclass
class CompanyRow:
    """公司目录一行(kanata-north.json 的元素;目录站抓下来的原样九格,空值空串不缺席)。"""

    name: str
    """公司名(目录站原文)。"""

    website: str
    """官网 URL;目录没给则空串。"""

    email: str
    """联系邮箱;可能空串(个人信息,只进 Admin 不公开展示)。"""

    phone: str
    """联系电话;可能空串(同上)。"""

    sectors: str
    """行业标签原文(is_tech 的判据原料之一)。"""

    address: str
    """街道地址原文;可能空串。"""

    careers_page: str
    """careers 页 URL;careers 步补写,抓不到为空串。"""

    description: str
    """公司简介原文(is_tech 的判据原料之二)。"""

    region: str
    """地域标识(数据分层「区」级)。"""


@dataclass
class CareersProbe:
    """careers 探测一次的结果(全空 = 没找到;默认值=探测前的初态,形状语义)。"""

    careers_url: str = ""
    """招聘页 URL。"""

    ats: str = ""
    """识别出的 ATS 平台名;自建或未知为空串。"""

    status: str = ""
    """首页 HTTP 状态码,或 ERR+异常名。"""

    note: str = ""
    """备注(如 no careers page found)。"""


@dataclass
class CareerScanRow:
    """careers 步输出一行(-careers.json 的元素)= 目录行身份四格 + 探测四格。"""

    name: str
    """公司名。"""

    website: str
    """官网 URL。"""

    sectors: str
    """行业标签(带过来供人工翻查)。"""

    email: str
    """邮箱(同上)。"""

    careers_url: str
    """招聘页 URL;没找到为空串。"""

    ats: str
    """ATS 平台名。"""

    status: str
    """探测状态码/错误。"""

    note: str
    """探测备注。"""


@dataclass
class ProfileRow:
    """一司一档的 profile.json(身份档)。"""

    name: str
    """公司名。"""

    slug: str
    """文件夹名(slugify 产,撞名带序号)。"""

    region: str
    """地域。"""

    website: str
    """官网。"""

    email: str
    """邮箱。"""

    phone: str
    """电话。"""

    sectors: str
    """行业。"""

    address: str
    """地址。"""

    description: str
    """简介。"""


@dataclass
class CareersFileRow:
    """一司一档的 careers.json(招聘页档,三格)。"""

    careers_url: str
    """招聘页 URL。"""

    ats: str
    """ATS 平台名。"""

    status: str
    """探测状态。"""


@dataclass
class IndexRow:
    """一司一档根上 _index.json 的一行。"""

    slug: str
    """文件夹名。"""

    name: str
    """公司名。"""

    website: str
    """官网。"""

    has_careers: bool
    """有没有招聘页档。"""


@dataclass
class PostingLead:
    """postings.json 一帖里本域真读的四格(to_posting_lead 产)。"""

    employer: str
    """雇主名;空串=帖子没写。"""

    website: str
    """雇主官网;空串=没带。"""

    url: str
    """帖子 URL(反查 JD .md 用)。"""

    province: str
    """省码(找官网搜索词用)。"""


@dataclass
class SiteLead:
    """有官网的目标公司(targets 表的值)。"""

    name: str
    """公司名。"""

    website: str
    """官网 URL(自带或找官网命中)。"""

    found: str = ""
    """官网来路:空串=帖子自带;jd/searched=找官网命中(前端小字标注)。"""


@dataclass
class NositeLead:
    """无官网的公司(nosite 表的值;岗数=搜索优先级)。"""

    name: str
    """公司名。"""

    province: str
    """省码。"""

    jobs: int = 0
    """该雇主的岗数(价值密度,岗多先搜)。"""


@dataclass
class EnrichRecord:
    """官网富化缓存一行(company_enrich.json 的值;对外文件契约,09 汇装直读)。

    空串=该格没走到/没取到(dataclass 化后统一空串,不再缺键;09 侧 .get 语义不变)。
    """

    name: str
    """公司名。"""

    website: str = ""
    """官网 URL。"""

    found: str = ""
    """官网来路(jd/searched;空=自带)。"""

    status: str = ""
    """found/ok/fail/nosite(词表见 constants.ST_*)。"""

    note: str = ""
    """失败原因。"""

    fetched: str = ""
    """本记录产出时刻(ISO,UTC)。"""

    description: str = ""
    """官网简介。"""

    sectors: str = ""
    """行业词。"""


@dataclass
class MetaOut:
    """extract_meta 的产出(拿不到就空,不猜)。"""

    description: str
    """简介。"""

    sectors: str
    """行业词。"""


@dataclass
class CardColIn:
    """card_col 的入参(原 fetch_kanata 内嵌函数 col,2026-08-30 内嵌禁令出户)。"""

    card: TagLike
    """一张公司卡片节点。"""

    label: str
    """明细列标签(Website/Email/…,词表在 constants.KANATA_LBL_*)。"""


@dataclass
class MetaScanIn:
    """first_meta_match 的入参(原 extract_meta 内嵌函数 meta 出户)。"""

    page: str
    """首页 HTML。"""

    patterns: tuple
    """按置信序排的预编译模式(constants.META_*_PATTERNS)。"""


@dataclass
class SkipFindIn:
    """should_skip_find 的入参(原 find_websites 内嵌函数 cache_skip 出户)。"""

    cache: dict
    """slug → EnrichRecord 增量缓存。"""

    slug: str
    """要判的公司 slug。"""


@dataclass
class FetchTextIn:
    """fetch_text 的入参(一参令)。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    url: str
    """要取的页面。"""

    want_status: bool = False
    """True 时 4xx 以上也按「没有」返回空串。"""


@dataclass
class GuardMatchIn:
    """guard_match 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端(首页标题复核用)。"""

    name: str
    """公司名。"""

    dom: str
    """候选裸域。"""


@dataclass
class DdgFindIn:
    """ddg_find 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    name: str
    """公司名。"""

    province: str
    """省码(进搜索词)。"""


@dataclass
class FindWebsitesIn:
    """find_websites 的入参(cache/targets 原地更新)。"""

    cache: dict
    """slug → EnrichRecord。"""

    targets: dict
    """slug → SiteLead。"""

    nosite: dict
    """slug → NositeLead。"""

    find_limit: int = 0
    """本轮 DDG 预算。"""


@dataclass
class PickTodoIn:
    """pick_todo 的入参。"""

    cache: dict
    """slug → EnrichRecord。"""

    targets: dict
    """slug → SiteLead。"""

    refresh_days: int = 0
    """成功记录多久后刷新。"""


@dataclass
class FetchProfileIn:
    """fetch_profile 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    lead: SiteLead
    """目标公司。"""
