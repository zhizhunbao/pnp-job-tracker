"""
sites 域行形状(照 jdformat 样张:边界行形状 = pydantic BaseModel,域内接线形状 = dataclass,
库类型用 Protocol 只声明真用的格;import 两个洞:标准库 / pydantic + 本域 constants)。
"""
from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from sites.constants import ST_FAIL

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置:多余键忽略、按字段名构造照常、逐格裸字符串 docstring 直接成为字段 description。"""


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""

    text: str
    """响应正文。"""

    url: object
    """跟完跳转后的最终地址(httpx.URL;用 str() 取串)。"""

    def json(self) -> object:
        """响应体按 JSON 解析。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:post(打盒子;抓页 2026-09-20 起一律走 crawl 域有头浏览器,get 一格随之撤)。Pyrefly 对 Protocol 实参判定保守,
    装配点用 typing.cast 喂真客户端(断言只住装配点)。"""

    def post(self, url: str, *, json: object, headers: dict | None = None) -> HttpResponseLike:
        """POST JSON 体(关键字参是库形状特批;headers 2026-09-20 加:visit 步打 cms 接口要带钥匙)。"""
        ...

    def get(self, url: str, *, params: dict, headers: dict) -> HttpResponseLike:
        """GET(2026-09-20 加回:visit 步向 cms 取活;抓页仍一律走有头浏览器)。"""
        ...


class CmsLike(Protocol):
    """cms 接线里本域真用的格(fetch 叶 cms_config() 的出参;本文件不 import 别的域,形状自己声明)。"""

    base: str
    """站点根;没配 = 空串。"""

    headers: dict
    """带钥匙的请求头。"""


class PagesRecord(BaseModel):
    """pages.json 的值:一家公司官网的抓取记录(原文在 crawl 层,这里只记抓了哪几页)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    status: str = ST_FAIL
    """ok / fail。"""

    urls: list[str] = []
    """抓到的页面地址(首页在前;跟完跳转后的最终地址,crawl 层按它取原文)。"""

    at: str = ""
    """抓取时刻(ISO,UTC)。"""

    note: str = ""
    """失败由头(no text / robots / http N / 异常类名);ok 为空串。"""

    host: str = ""
    """官网主机名(去 www.;同主机名 24 小时只抓一次的尺子。2026-09-20 加,存量记录为空串)。"""

    fails: int = 0
    """连续几轮「域名不解析」(到 DEAD_FAILS 记死站;抓成 / 别的失败归零)。"""

    cache_slug: str = ""
    """原文住在哪家的 crawl 目录(同主机名复用别家刚抓的缓存时 = 那一家的 slug;空串 = 自己的)。"""


class FactsRecord(BaseModel):
    """facts.json 的值:一家公司的官网七节整理记录(对外文件契约,mart 汇装直读)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    status: str = ST_FAIL
    """ok / fail。"""

    what: str = ""
    """主营业务;'' = 官网没写 / 没过原句核对。"""

    hq_address: str = ""
    """总部街址。"""

    hq_city: str = ""
    """总部所在市。"""

    hq_province: str = ""
    """总部所在省(两位码;加拿大以外是国名)。"""

    size: str = ""
    """规模(雇员数 / 网点数)。"""

    founded: str = ""
    """成立年份 / 母公司。"""

    offices: str = ""
    """总部之外的办公地点。"""

    newcomers: str = ""
    """官网对新移民 / 外籍员工 / 工签担保怎么说(只认官网原句,没提就空)。"""

    benefits: str = ""
    """福利与怎么投。"""

    quotes: dict[str, str] = {}
    """节标记 → 过了核对的页面原句(出处凭据;没过核对的节不在这里,它的值也被清空)。"""

    sources: list[str] = []
    """喂给模型的页面地址(出处网址)。"""

    name_ok: bool = False
    """官网归属闸(2026-09-20 Frank「这个是错的啊」:Best Buy Express 的官网记成了 bell.ca,整理出来的是 Bell 的总部):
    公司名对得上这个官网才算数 —— 名字里的词在主机名里 / 主机名是名字的缩写 / 页面文字里有这家公司的名字,三样占一样。
    对不上的记录照留(原文与原句都在),但 mart 不拿它进库;存量由 facts 步开头回填。"""

    hq_source: str = ""
    """总部原句出自哪一页(2026-09-20:公司卡「总部」点开的出处;原句在几页里都找不到 —— 首页被裁过中段 —— 记首页;没有总部给空串)。"""

    pages_at: str = ""
    """整理所依据的那一轮抓取时刻(官网重抓后它变了 = 该重新整理)。"""

    model: str = ""
    """整理用的模型名。"""

    at: str = ""
    """整理时刻(ISO,UTC)。"""

    note: str = ""
    """失败由头(no page text / empty / nothing verified / http N / 异常类名);ok 为空串。"""


@dataclass
class LlmCfg:
    """盒子接线。"""

    base: str
    """Ollama 基址(空串 = 没配)。"""

    model: str
    """模型名。"""


@dataclass
class Target:
    """范围内的一家公司(有官网 且 有在招岗)。"""

    slug: str
    """公司 slug。"""

    name: str
    """公司名。"""

    website: str
    """官网。"""

    open_jobs: int
    """当前在招岗数(排队用:多的在前)。"""

    seen: float = 0.0
    """最近一次被用户看过的时刻(epoch 秒;点开优先于列出;0 = 没人看过。例行轮排队:看过的在前、最近的在前)。"""


@dataclass
class PickFetchIn:
    """pick_fetch_todo() 入参。"""

    targets: list
    """范围内的公司(已按在招岗数排好)。"""

    cache: dict
    """slug → PagesRecord。"""

    limit: int
    """本轮上限。"""


@dataclass
class PickFactsIn:
    """pick_facts_todo() 入参。"""

    targets: list
    """范围内的公司(已按在招岗数排好)。"""

    pages: dict
    """slug → PagesRecord。"""

    cache: dict
    """slug → FactsRecord。"""

    limit: int
    """本轮上限。"""


@dataclass
class FetchPageIn:
    """fetch_page() 入参。"""

    slug: str
    """crawl 层站点目录名。"""

    url: str
    """要抓的页面地址。"""


@dataclass
class FetchedPage:
    """fetch_page() 出参。"""

    url: str
    """跟完跳转后的最终地址;'' = 没抓到。"""

    html: str
    """页面原文;'' = 没抓到。"""

    note: str
    """没抓到的由头;抓到了为空串。"""


@dataclass
class LinksIn:
    """extra_links_of() 入参。"""

    html: str
    """首页原文。"""

    base: str
    """首页的最终地址(相对链接按它拼、同站按它判)。"""


@dataclass
class FactsOneIn:
    """facts_one() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    target: Target
    """要整理的公司。"""

    pages: PagesRecord
    """它的抓取记录。"""


@dataclass
class LlmCallIn:
    """call_llm() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cfg: LlmCfg
    """盒子接线。"""

    prompt: str
    """提示词全文。"""


@dataclass
class AnswerIn:
    """value_of() 入参。"""

    answer: str
    """模型回答全文。"""

    key: str
    """要取的那一行的键。"""


@dataclass
class VerifyIn:
    """quote_ok() 入参。"""

    quote: str
    """模型给的页面原句。"""

    blob: str
    """喂给模型的页面文字全文(已压空白、小写)。"""


@dataclass
class AbbrevIn:
    """is_abbrev_of() 入参。"""

    label: str
    """主机名的一段(已压成小写字母数字)。"""

    initials: str
    """公司名各词的首字母串。"""


@dataclass
class BackfillNameIn:
    """backfill_name_ok() 入参。"""

    cache: dict
    """整理记录(slug → FactsRecord)。"""

    targets: list
    """范围内的公司(取名字用)。"""


@dataclass
class NameOkIn:
    """name_ok_of() 入参。"""

    name: str
    """公司名。"""

    host: str
    """官网首页的主机名(跟完跳转后的)。"""

    blob: str
    """几页页面文字(原样;函数里自己压)。"""


@dataclass
class HqSourceIn:
    """hq_source_of() 入参。"""

    slug: str
    """公司 slug(定位 crawl 层的站点目录)。"""

    quote: str
    """总部那一节过了核对的页面原句。"""

    urls: list[str]
    """喂给模型的页面地址(按抓取序,首页在前)。"""


@dataclass
class SectionIn:
    """keep_section() 入参。"""

    rec: FactsRecord
    """正在填的记录。"""

    answer: str
    """模型回答全文。"""

    blob: str
    """页面文字全文(已压空白、小写)。"""

    mark: str
    """节标记。"""


@dataclass
class VisitTodo:
    """点开优先的一条待办(cms 取活接口给的)。"""

    key: str
    """池主键(交活用)。"""

    slug: str
    """公司 slug(各份缓存的键)。"""

    name: str
    """公司名。"""

    website: str
    """官网。"""


@dataclass
class CmsIn:
    """打 cms 接口的入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    cms: CmsLike
    """cms 接线。"""

    payload: dict
    """取活 = 查询参数;交活 = 请求体。"""


@dataclass
class VisitOneIn:
    """visit_one() 入参。"""

    client: HttpClientLike
    """HTTP 客户端(打 cms 与盒子)。"""

    cms: CmsLike
    """cms 接线。"""

    cfg: LlmCfg
    """盒子地址与模型名。"""

    todo: VisitTodo
    """这一家。"""


@dataclass
class HostPickIn:
    """host_cached_of() 入参。"""

    pages: dict
    """全部抓取记录。"""

    host: str
    """这一家的官网主机名。"""

    slug: str
    """这一家的 slug(自己的记录另判)。"""


@dataclass
class SeenIn:
    """seen_of() 入参。"""

    seen: dict
    """seen.json 整表。"""

    slug: str
    """公司 slug。"""


@dataclass
class HqStreetIn:
    """hq_street_of() 入参。"""

    address: str
    """模型抄下来的街址(常连市 / 省 / 邮编一起)。"""

    city: str
    """总部所在市。"""


@dataclass
class CarryIn:
    """carry_fails() 入参。"""

    rec: PagesRecord
    """这一轮的抓取记录。"""

    prev: PagesRecord | None
    """上一轮的记录;没有 = None。"""


@dataclass
class VisitDoneIn:
    """done_payload_of() 入参。"""

    key: str
    """池主键。"""

    facts: FactsRecord
    """这一家的整理记录。"""

    host: str
    """这一轮抓的官网主机名(cms 拿它判原简介是不是出自这个官网)。"""

