"""
company 域行形状(三件套形制**全站样张**,2026-08-30)。

⚠ 抽屉名 Python 方言定 **scheme.py** 不叫 types.py(2026-08-30 两拍):types.py 会遮蔽
标准库 types 模块(域目录=脚本 sys.path[0],httpx/bs4 内部 import types 当场炸,实撞);
名字 Frank 拍 scheme(压过 shapes 提议)。cms 侧照旧 types.ts,这是两方言唯一的名字分叉;
运行时校验若来,另开抽屉不占此名。

形状两档(2026-08-30 Frank 三拍定形):
① **边界行形状 = pydantic BaseModel**(Frank「python 有这个优势可以用,没必要写一堆 to 函数」):
  校验/默认值/别名兜底/model_validate 一站式,五只手写 to_* 退役 —— 这是 cms schemas.ts
  (TypeBox 运行时校验)的 Python 对应物,scheme = types+schemas 合体;
  use_attribute_docstrings=True 让逐格裸字符串 docstring 直接成为字段 description。
② **域内接线形状(XxxIn)= dataclass**:不是外来数据,校验加不了值,保持轻。
库类型用 Protocol 只声明真用的格;字段默认值是形状语义,不违「函数禁默认参」。
import 两个洞:typing/标准库/pydantic + **本域 constants**(2026-08-30 开:兜底值与
清洗词表进形状配置,单向边无环 —— 叶子律的域内松绑,跨域仍零)。
"""
from dataclasses import dataclass
from typing import Protocol

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from company.constants import HTTPS_PREFIX, KANATA_REGION_LABEL, URL_SCHEMES

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置:多余键忽略(外来 json 什么都可能带)、按字段名构造照常、
逐格裸字符串 docstring 直接成为字段 description(pydantic 官方通道)。"""


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    text: str
    """响应体文本。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""

    def json(self) -> object:
        """响应体按 JSON 解析(Places 响应;形状由 PlacesEnvelope.model_validate 收窄)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:get 与 post(post 2026-09-04 随 Places 步加)。

    方法签名按「本域怎么调」收窄;默认值是库形状特批(cms「库定死签名的除外」同律)。
    Pyrefly 对 Protocol 实参判定保守,不认 httpx.Client 的结构等价 ——
    装配点用 typing.cast 喂真客户端(断言只住装配点,cms 同律)。
    """

    def get(self, url: str, *, params: dict | None = None,
            timeout: float | None = None) -> HttpResponseLike:
        """GET 一个 URL;params/timeout 按需传。"""
        ...

    def post(self, url: str, *, json: dict | None = None,
             headers: dict | None = None) -> HttpResponseLike:
        """POST JSON 体(Places 文本搜索);默认值是库形状特批,同 get。"""
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

    def decompose(self) -> None:
        """整块摘掉本节点(about 步剥导航/脚本)。"""
        ...


class CompanyRow(BaseModel):
    """公司目录一行(九格;进域即校验:缺格补空串,老数据 employer 键兜 name,多余键忽略)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = Field(default="", validation_alias=AliasChoices("name", "employer"))
    """公司名(目录站原文;老引导数据的 employer 键兜底)。"""

    website: str = ""
    """官网 URL;目录没给则空串。"""

    email: str = ""
    """联系邮箱;可能空串(个人信息,只进 Admin 不公开展示)。"""

    phone: str = ""
    """联系电话;可能空串(同上)。"""

    sectors: str = ""
    """行业标签原文(is_tech 的判据原料之一)。"""

    address: str = ""
    """街道地址原文;可能空串。"""

    careers_page: str = ""
    """careers 页 URL;careers 步补写,抓不到为空串。"""

    description: str = ""
    """公司简介原文(is_tech 的判据原料之二)。"""

    region: str = KANATA_REGION_LABEL
    """地域标识(数据分层「区」级;缺格兜 Kanata 标签 —— 引导数据同源)。"""


class CareersProbe(BaseModel):
    """careers 探测一次的结果(全空 = 没找到;默认值=探测前的初态,形状语义)。"""

    careers_url: str = ""
    """招聘页 URL。"""

    ats: str = ""
    """识别出的 ATS 平台名;自建或未知为空串。"""

    status: str = ""
    """首页 HTTP 状态码,或 ERR+异常名。"""

    note: str = ""
    """备注(如 no careers page found)。"""


class CareerScanRow(BaseModel):
    """careers 步输出一行(-careers.json 的元素)= 目录行身份四格 + 探测四格。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = ""
    """公司名。"""

    website: str = ""
    """官网 URL。"""

    sectors: str = ""
    """行业标签(带过来供人工翻查)。"""

    email: str = ""
    """邮箱(同上)。"""

    careers_url: str = ""
    """招聘页 URL;没找到为空串。"""

    ats: str = ""
    """ATS 平台名。"""

    status: str = ""
    """探测状态码/错误。"""

    note: str = ""
    """探测备注。"""


class ProfileRow(BaseModel):
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


class CareersFileRow(BaseModel):
    """一司一档的 careers.json(招聘页档,三格)。"""

    careers_url: str
    """招聘页 URL。"""

    ats: str
    """ATS 平台名。"""

    status: str
    """探测状态。"""


class IndexRow(BaseModel):
    """一司一档根上 _index.json 的一行。"""

    slug: str
    """文件夹名。"""

    name: str
    """公司名。"""

    website: str
    """官网。"""

    has_careers: bool
    """有没有招聘页档。"""


class PostingLead(BaseModel):
    """postings.json 一帖里本域真读的四格(model_validate 直进;清洗住 validator)。"""

    model_config = MODEL_CFG
    """一帖几十个键,只读四格。"""

    employer: str = ""
    """雇主名;空串=帖子没写。"""

    website: str = ""
    """雇主官网;空串=没带;裸域自动补 https(normalize_website)。"""

    url: str = ""
    """帖子 URL(反查 JD .md 用)。"""

    province: str = ""
    """省码(找官网搜索词用)。"""

    @field_validator("employer", "website", "url", "province", mode="before")
    @classmethod
    def none_as_empty(cls, v: object) -> object:
        """postings 里这些格可能是 null —— 统一折空串(原 to_posting_lead 的 or 空串兜底)。"""
        if v is None:
            return ""
        return v

    @field_validator("website", mode="after")
    @classmethod
    def normalize_website(cls, v: str) -> str:
        """官网缺协议头就补 https(原 to_posting_lead 的值级清洗,搬进形状配置)。"""
        site = v.strip()
        if site and not site.startswith(URL_SCHEMES):
            return HTTPS_PREFIX + site
        return site


class SiteLead(BaseModel):
    """有官网的目标公司(targets 表的值)。"""

    name: str
    """公司名。"""

    website: str
    """官网 URL(自带或找官网命中)。"""

    found: str = ""
    """官网来路:空串=帖子自带;jd/searched=找官网命中(前端小字标注)。"""


class NositeLead(BaseModel):
    """无官网的公司(nosite 表的值;岗数=搜索优先级)。"""

    name: str
    """公司名。"""

    province: str
    """省码。"""

    jobs: int = 0
    """该雇主的岗数(价值密度,岗多先搜)。"""


class EnrichRecord(BaseModel):
    """官网富化缓存一行(company_enrich.json 的值;对外文件契约,09 汇装直读)。

    空串=该格没走到/没取到(统一空串不缺键;09 侧 .get 语义不变);旧缓存多余键忽略。
    """

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = ""
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


class MetaOut(BaseModel):
    """extract_meta 的产出(拿不到就空,不猜)。"""

    description: str
    """简介。"""

    sectors: str
    """行业词。"""

class WpData(BaseModel):
    """WP AJAX 信封的 data 层(只读 posts)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    posts: list[str] | str = ""
    """卡片 HTML:可能是分片列表,也可能一整串。"""


class WpEnvelope(BaseModel):
    """WP AJAX 信封(原 to_wp_html 的键词汇,收进形状)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    data: WpData
    """载荷层。"""



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
class DdgOut:
    """ddg_find 的出参:命中站点或空串;failed 区分「查无」与「传输失败」(后者不记 nosite)。"""

    site: str
    """命中的官网(https://域);空串 = 没命中。"""

    failed: bool
    """请求本身失败(断连/超时/非 2xx)。"""


@dataclass
class DdgLoopIn:
    """ddg_search_loop 的入参(find_websites 的第二阶梯,2026-09-05 拆出以放熔断与分批落盘)。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    cache: dict
    """slug → EnrichRecord(原地更新)。"""

    targets: dict
    """slug → SiteLead(原地更新)。"""

    nosite: dict
    """slug → NositeLead。"""

    find_limit: int
    """本轮 DDG 预算。"""


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


@dataclass
class WikiProbe:
    """一次 Wikidata 查询的三态结果(2026-08-31 批J:原件用 `dict | str | None` 三型
    + `__err__` 哨兵表达,收成一个显式形 —— 语义逐字对应)。

    failed=True 对应原来的 ERR 哨兵:网络/限速失败,**不写缓存**、下轮重试
    (与「查过确实没有」必须分开 —— 首跑 23/1666 偏低就是失败被记成了未命中)。
    """

    failed: bool
    """请求失败(不缓存)。"""

    found: bool
    """严格匹配上且有英文维基条目(= 知名;别名与知名同一门槛)。"""

    zh: str
    """中文条目名(官方标签,不机翻)。"""

    ko: str
    """韩文条目名。"""

    wiki: str
    """英文维基条目 URL。"""


@dataclass
class EntityIn:
    """entity_probe() 入参:一个 Wikidata 实体 + 归一后的目标名。"""

    entity: dict
    """wbgetentities 返回的一个实体。"""

    target: str
    """归一后的公司名(严格相等才收)。"""


@dataclass
class ProbeIn:
    """facts_probe() 入参:公司名 + 上一轮缓存里它那一行。"""

    name: str
    """公司名(按名查)。"""

    cached: dict
    """上一轮 by_name 里这家的行(空 dict = 没查过)。"""


@dataclass
class FactsIndustryOut:
    """industry_by_slug() 出参:行业多数派 + 投票明细 + 开放岗数。"""

    industry: dict
    """slug → 大类中文值(多数派)。"""

    by_slug: dict
    """slug → 大类计票(定候选还要用它数在库岗)。"""

    n_open: int
    """参与投票的开放岗数(报数用)。"""


@dataclass
class CandsIn:
    """facts_candidates() 入参:两条候选门槛各自要的料。"""

    by_slug: dict
    """slug → 大类计票(数在库岗)。"""

    name_of: dict
    """slug → 公司名。"""

    companies: list
    """mart 公司行(取 LMIA 技能岗数)。"""


@dataclass
class SaveFactsIn:
    """save_company_facts() 入参:落盘一次要的三份(原内嵌 save() 的闭包变量出户)。"""

    industry: dict
    """slug → 行业。"""

    by_name: dict
    """本轮查到的 by_name 行。"""

    prev_names: dict
    """上一轮的 by_name(旧缓存合并写:中途落盘不冲掉本轮还没遍历到的已查条目)。"""


class LocalizedText(BaseModel):
    """Places 的本地化文本格({text, languageCode});只读 text。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    text: str = ""
    """文本;缺格空串。"""


class AddressComponent(BaseModel):
    """Places 地址分量(市/省从 types 认)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    long_text: str = Field(default="", validation_alias=AliasChoices("longText", "long_text"))
    """全名(Ottawa / Ontario)。"""

    short_text: str = Field(default="", validation_alias=AliasChoices("shortText", "short_text"))
    """短名(ON)。"""

    types: list[str] = Field(default_factory=list)
    """分量类型码(locality / administrative_area_level_1 …)。"""


class LatLng(BaseModel):
    """Places 坐标。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    latitude: float = 0.0
    """纬度。"""

    longitude: float = 0.0
    """经度。"""


class PlaceHit(BaseModel):
    """Places 文本搜索的一条候选(两档掩码的并集;键名 camelCase 走别名,缺格取默认)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    id: str = ""
    """place id(稳定主键,复查/详情用)。"""

    short_formatted_address: str = Field(default="",
                                         validation_alias=AliasChoices("shortFormattedAddress", "short_formatted_address"))
    """短地址(街道 + 市)。"""

    address_components: list[AddressComponent] = Field(default_factory=list,
                                                       validation_alias=AliasChoices("addressComponents", "address_components"))
    """地址分量。"""

    location: LatLng = Field(default_factory=LatLng)
    """坐标。"""

    google_maps_uri: str = Field(default="", validation_alias=AliasChoices("googleMapsUri", "google_maps_uri"))
    """Google 地图页链接。"""

    national_phone_number: str = Field(default="",
                                       validation_alias=AliasChoices("nationalPhoneNumber", "national_phone_number"))
    """本地格式电话(Enterprise 档才有)。"""

    international_phone_number: str = Field(
        default="", validation_alias=AliasChoices("internationalPhoneNumber", "international_phone_number"))
    """国际格式电话(Enterprise 档才有)。"""

    rating: float = 0.0
    """Google 评分(Enterprise 档才有;0 = 没有)。"""

    user_rating_count: int = Field(default=0, validation_alias=AliasChoices("userRatingCount", "user_rating_count"))
    """评分人数。"""

    display_name: LocalizedText = Field(default_factory=LocalizedText,
                                        validation_alias=AliasChoices("displayName", "display_name"))
    """Google 侧的公司/店名。"""

    formatted_address: str = Field(default="", validation_alias=AliasChoices("formattedAddress", "formatted_address"))
    """格式化地址。"""

    website_uri: str = Field(default="", validation_alias=AliasChoices("websiteUri", "website_uri"))
    """官网 URL;缺格空串 = Google 也没有。"""

    primary_type: str = Field(default="", validation_alias=AliasChoices("primaryType", "primary_type"))
    """主业务类型码(如 software_company)。"""

    primary_type_display_name: LocalizedText = Field(
        default_factory=LocalizedText,
        validation_alias=AliasChoices("primaryTypeDisplayName", "primary_type_display_name"))
    """主业务类型的人话名。"""

    types: list[str] = Field(default_factory=list)
    """全部类型码。"""

    business_status: str = Field(default="", validation_alias=AliasChoices("businessStatus", "business_status"))
    """营业状态(OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY)。"""


class PlacesEnvelope(BaseModel):
    """Places 文本搜索响应信封:只读 places 列表(零候选时键缺席 → 空表)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    places: list[PlaceHit] = Field(default_factory=list)
    """候选列表(按相关度)。"""


class PlaceRecord(BaseModel):
    """company_places.json 的值:一司一条查询结果(对外文件契约;空串 = 没走到/没取到)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = ""
    """我方公司名(查询用的原名)。"""

    query: str = ""
    """实际发出的搜索词(复核误命中时看)。"""

    status: str = ""
    """hit / miss / fail(词表见 constants.ST_*)。"""

    note: str = ""
    """失败原因。"""

    fetched: str = ""
    """本记录产出时刻(ISO,UTC)。"""

    place_id: str = ""
    """采信候选的 place id。"""

    place_name: str = ""
    """采信候选在 Google 侧的名字(与我方名对照,判误命中)。"""

    address: str = ""
    """格式化地址。"""

    website: str = ""
    """官网 URL。"""

    primary_type: str = ""
    """主业务类型码。"""

    primary_type_label: str = ""
    """主业务类型人话名。"""

    types: list[str] = Field(default_factory=list)
    """全部类型码。"""

    business_status: str = ""
    """营业状态。"""

    tier: str = ""
    """查询用的档位(pro / enterprise;当月免费额按此计)。"""

    short_address: str = ""
    """短地址。"""

    city: str = ""
    """市(addressComponents 的 locality)。"""

    province: str = ""
    """省码(administrative_area_level_1 的短名)。"""

    lat: float = 0.0
    """纬度。"""

    lng: float = 0.0
    """经度。"""

    maps_url: str = ""
    """Google 地图页链接。"""

    phone: str = ""
    """本地格式电话。"""

    phone_intl: str = ""
    """国际格式电话。"""

    rating: float = 0.0
    """Google 评分;0 = 没有。"""

    rating_count: int = 0
    """评分人数。"""


class PlaceCompany(BaseModel):
    """companies.json 一行本步真读的四格。"""

    model_config = MODEL_CFG
    """公司表几十个键,只读四格。"""

    slug: str = ""
    """公司 slug(缓存键、raw 文件名)。"""

    name: str = ""
    """公司名。"""

    region: str = ""
    """省码或区标签(搜索词的地域部分)。"""

    website: str = ""
    """库里已有的官网;空串 = 缺,sites 步的目标。"""

    lmia_4q: int = Field(default=0, validation_alias=AliasChoices("lmiaPositions4q", "lmia_4q"))
    """近四季 LMIA 获批岗位数(担保信号;>0 才是候选)。"""

    @field_validator("region", "website", mode="before")
    @classmethod
    def none_as_empty(cls, v: object) -> object:
        """region/website 可能是 null —— 折空串。"""
        if v is None:
            return ""
        return v

    @field_validator("lmia_4q", mode="before")
    @classmethod
    def none_lmia_as_zero(cls, v: object) -> object:
        """lmiaPositions4q 缺格/null —— 折 0(这里 0 = 没有担保信号,不是替官方编数)。"""
        if v is None:
            return 0
        return v


class MartJob(BaseModel):
    """jobs.json 一行本步真读的两格(数在招岗)。"""

    model_config = MODEL_CFG
    """岗位表几十个键,只读两格。"""

    company_slug: str = Field(default="", validation_alias=AliasChoices("companySlug", "company_slug"))
    """所属公司 slug。"""

    status: str = ""
    """open / closed。"""

    teer: str = ""
    """TEER 档(0-5;mart 里是数字或串,统一成串;空串 = 未分类)。"""

    @field_validator("company_slug", "status", "teer", mode="before")
    @classmethod
    def none_as_empty(cls, v: object) -> object:
        """三格可能是 null —— 折空串;teer 数字折串。"""
        if v is None:
            return ""
        return str(v)


@dataclass
class PlaceTarget:
    """一家待查公司(候选表的行)。"""

    slug: str
    """公司 slug。"""

    name: str
    """公司名。"""

    region: str
    """省码或区标签。"""

    website: str
    """库里已有的官网(空串 = 缺)。"""

    open_jobs: int
    """在招岗数(优先级第一键)。"""

    lmia_4q: int
    """近四季 LMIA 岗位数(优先级第二键)。"""


@dataclass
class JobCounts:
    """jobs.json 一遍扫出的两张计数(job_counts_by_slug 的出参)。"""

    open: dict
    """slug → 在招岗数。"""

    skilled: dict
    """slug → 在招 TEER 0-3 岗数。"""


@dataclass
class PlacesCandsIn:
    """places_candidates 的入参。"""

    companies: list
    """PlaceCompany 列表。"""

    counts: JobCounts
    """在招 / 在招 TEER 0-3 两张计数。"""


@dataclass
class PickPlacesIn:
    """pick_places_todo 的入参。"""

    cache: dict
    """slug → PlaceRecord。"""

    cands: list
    """PlaceTarget 候选(已排序)。"""

    limit: int
    """本轮最多查几家(总闸)。"""

    pro_budget: int
    """本轮 Pro 档还能查几家(当月免费额减已用)。"""

    ent_budget: int
    """本轮 Enterprise 档还能查几家。"""


@dataclass
class SkipPlacesIn:
    """should_skip_places 的入参。"""

    cache: dict
    """slug → PlaceRecord。"""

    slug: str
    """待判公司。"""


@dataclass
class MonthUsage:
    """当月两档已发出的 Places 请求数(month_usage_of 的出参;一参令下两档一起算)。"""

    pro: int
    """Pro 档次数。"""

    ent: int
    """Enterprise 档次数。"""


@dataclass
class PlacesSearchIn:
    """places_search 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    key: str
    """API 密钥(只在请求头里走)。"""

    target: PlaceTarget
    """待查公司。"""

    tier: str
    """档位(决定掩码与计费)。"""


@dataclass
class ToPlaceIn:
    """to_place_record 的入参。"""

    target: PlaceTarget
    """待查公司。"""

    query: str
    """发出的搜索词。"""

    hits: list
    """PlaceHit 候选(可空)。"""

    tier: str
    """档位。"""


class AboutRecord(BaseModel):
    """company_about.json 的值:一司一份官网正文(对外文件契约;空串 = 没走到/没取到)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = ""
    """公司名。"""

    website: str = ""
    """官网(首页 URL)。"""

    about_url: str = ""
    """About 页 URL;空串 = 首页没露出介绍页链接。"""

    text: str = ""
    """首页 + About 页正文(剥标签、折空白、裁长)。"""

    status: str = ""
    """ok / fail。"""

    note: str = ""
    """失败原因。"""

    fetched: str = ""
    """本记录产出时刻(ISO,UTC)。"""


class BriefRecord(BaseModel):
    """company_brief.json 的值:一司一份五节简介(对外文件契约,09 汇装直读)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    name: str = ""
    """公司名。"""

    brief: str = ""
    """五节英文([WHAT][BASE][SIZE][FOUNDED][NOTE] 各一行)。"""

    brief_zh: str = ""
    """五节中文(同结构);空串 = 译文没过节标记校验,等重跑。"""

    model: str = ""
    """生成用的模型名。"""

    sources: list[str] = Field(default_factory=list)
    """出处 URL(首页、About 页)。"""

    status: str = ""
    """ok / fail。"""

    note: str = ""
    """失败原因。"""

    fetched: str = ""
    """本记录产出时刻(ISO,UTC)。"""


@dataclass
class AboutTarget:
    """一家待抓正文的公司。"""

    slug: str
    """公司 slug。"""

    name: str
    """公司名。"""

    website: str
    """官网 URL(库里的或 sites 步刚找到的)。"""


@dataclass
class PickAboutIn:
    """pick_about_todo 的入参。"""

    cache: dict
    """slug → AboutRecord。"""

    targets: list
    """AboutTarget 候选(已排序)。"""

    limit: int
    """本轮最多抓几家。"""


@dataclass
class AboutFetchIn:
    """fetch_about 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    target: AboutTarget
    """待抓公司。"""


@dataclass
class PageIn:
    """fetch_site_page 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    url: str
    """页面地址。"""

    title: str
    """crawl manifest 页行的标题(公司名)。"""


@dataclass
class PageOut:
    """fetch_site_page 的出参。"""

    html: str
    """页面原文;空串 = 没拿到。"""

    note: str
    """没拿到的原因;拿到为空串。"""


@dataclass
class AboutLinkIn:
    """about_link_of 的入参。"""

    html: str
    """首页原文。"""

    base: str
    """首页 URL(相对链接的基址;About 页必须同站)。"""


@dataclass
class PageTextIn:
    """page_text_of 的入参。"""

    html: str
    """页面原文。"""

    limit: int
    """裁到几字。"""


@dataclass
class LlmCfg:
    """brief 步的模型接线(读环境一次)。"""

    base: str
    """Ollama 基址;空串 = 没配。"""

    model: str
    """模型名。"""


@dataclass
class PickBriefIn:
    """pick_brief_todo 的入参。"""

    cache: dict
    """slug → BriefRecord。"""

    about: dict
    """slug → AboutRecord(只取 ok 的)。"""

    limit: int
    """本轮最多做几家。"""


@dataclass
class BriefOneIn:
    """brief_one 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    cfg: LlmCfg
    """模型接线。"""

    about: AboutRecord
    """这家的官网正文。"""


@dataclass
class LlmCallIn:
    """call_company_llm 的入参。"""

    client: HttpClientLike
    """复用的 httpx 客户端。"""

    cfg: LlmCfg
    """模型接线。"""

    prompt: str
    """提示词。"""

    tokens: int
    """生成上限。"""
