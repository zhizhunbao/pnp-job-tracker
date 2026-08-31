"""
jobbank 域行形状(一参令 XxxIn / 单返回值 XxxOut / 库形状 Protocol 自声明;
照 company/scheme.py 与 ee/scheme.py 样张,段横幅与 constants/functions 同名同序镜像)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
⚠ **帖子行不上 dataclass**:processed/jobbank/postings.json 是**开放累积 store** ——
本域只写「原始抓取字段 + 详情富集字段」,04c(地点)/04d(薪资)/05e/05f(打标)/mart
还会往同一行上挂 country/district/salaryAnnual/pilot… 若在这里定成 dataclass,等于替
下游几个域宣布字段全集,一加字段就得改形状(ee「产出行不上 pydantic」同款判据)。
故帖子行保持 dict,键一律走 constants 的 K_ 词族(零字符串令下的行为等价物)。
本域上形状的是**接线**:多入参函数的 XxxIn、多返回值的 XxxOut,以及库形状 Protocol
(bs4 节点 / httpx 客户端只声明真用的格,装配点 cast)。
方法签名按「本域怎么调」收窄,默认值是库形状特批(cms「库定死签名的除外」同律)。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Protocol


# =========================================================================
# 1. 共享词汇(bs4 节点 / HTTP 客户端 / 文本清洗的形)
# =========================================================================


class SoupNodeLike(Protocol):
    """bs4 标签节点形 —— 只声明本域真用的格(ee 的 SoupNodeLike 先例)。

    find/select_one 等声明成可空:本域到处 `x if x else ""` 地判空,这是真实用法。
    """

    name: str
    """标签名(序列化时判块级/标题/li 用)。"""

    parent: "SoupNodeLike | None"
    """父节点(雇佣形态取不到 attribute-value 外层时退回它)。"""

    def select(self, selector: str) -> "list[SoupNodeLike]":
        """CSS 选择,返回子节点清单。"""
        ...

    def select_one(self, selector: str) -> "SoupNodeLike | None":
        """CSS 选择,返回首个命中或 None。"""
        ...

    def find(self, name: str, href: object = None) -> "SoupNodeLike | None":
        """按标签名找第一个(列表行按 href 正则找帖子链接)。"""
        ...

    def find_all(self, name: str) -> "list[SoupNodeLike]":
        """按标签名找全部。"""
        ...

    def find_next(self, name: str) -> "SoupNodeLike | None":
        """文档序向后第一个命中(h4 后面那张 ul)。"""
        ...

    def find_previous(self, name: str) -> "SoupNodeLike | None":
        """文档序向前第一个命中(校验 ul 确实归属这个 h4)。"""
        ...

    def find_parent(self, name: str, class_: str) -> "SoupNodeLike | None":
        """向上找带某个类名的祖先(雇佣形态的 attribute-value 外层)。"""
        ...

    def get_text(self, separator: str = "", strip: bool = False) -> str:
        """压平文本(分隔符与 strip 两档用法都有,不能拉平)。"""
        ...

    def get(self, key: str, default: str = "") -> str:
        """取属性(如 href),缺了给默认。"""
        ...

    def __getitem__(self, key: str) -> str:
        """取属性(缺了抛 —— 列表行的 href 必须在)。"""
        ...


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的三格。"""

    text: str
    """响应体 HTML。"""

    status_code: int
    """HTTP 状态码(验尸判 404/410 用)。"""

    def raise_for_status(self) -> object:
        """非 2xx 即抛(抓取重试的判据)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的一门。"""

    def get(self, url: str) -> HttpResponseLike:
        """GET 一发(超时挂在客户端上,不逐次传)。"""
        ...


@dataclass
class LabelIn:
    """clean_labeled() 入参:一段文本 + 要剥掉的前缀标签(「Location: …」)。"""

    text: str
    """原文。"""

    label: str
    """前缀标签(大小写不敏感比对);空串 = 只压空白不剥。"""


# =========================================================================
# 2. 列表快照抓取
# =========================================================================


@dataclass
class ListingIn:
    """fetch_listing_snapshots() 入参:一轮抓取的四个节奏参数。"""

    provinces: list
    """要抓的省码清单。"""

    since_days: int
    """增量窗口天数(决定 cutoff)。"""

    max_pages: int
    """每省翻页上限(失控保险)。"""

    delay: float
    """翻页之间的礼貌间隔秒数。"""


@dataclass
class ProvinceIn:
    """snapshot_province() 入参:一个省的一轮翻页。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    prov: str
    """省码。"""

    cutoff: date
    """截止日(整页都早于它 = 该省到头)。"""

    snap_dir: Path
    """本轮快照目录。"""

    pages: list
    """manifest 的页清单(存一页往里记一项)。"""

    max_pages: int
    """翻页上限。"""

    delay: float
    """翻页间隔。"""


@dataclass
class PageIn:
    """fetch_listing_page() 入参:某省某页(含重试)。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    prov: str
    """省码。"""

    page: int
    """页号。"""


@dataclass
class PageOut:
    """fetch_listing_page() 出参:页 HTML 或最后一次的错误说明。"""

    html: str
    """页面原始 HTML;取不到为空串。"""

    error: str
    """最后一次失败的说明;空串 = 拿到了。"""


@dataclass
class AllOldIn:
    """all_rows_old() 入参:一页的行 + 截止日。"""

    rows: list
    """本页解析出的行。"""

    cutoff: date
    """截止日。"""


# =========================================================================
# 3. 列表快照解析
# =========================================================================


@dataclass
class CutoffIn:
    """cutoff_of() 入参:快照目录 + 回退窗口。"""

    snap: Path
    """快照目录。"""

    since_days: int
    """manifest 缺 cutoff 时的回退窗口天数。"""


@dataclass
class MergeIn:
    """merge_rows() 入参:本轮解析出的行往累积 store 里合。"""

    rows: list
    """本轮解析出的行。"""

    by_id: dict
    """累积 store(posting_id → 行;原地合并)。"""

    cutoff: date
    """截止日(早于它的行跳过)。"""

    fetched: str
    """本快照的抓取时刻(写进 last_seen)。"""


@dataclass
class MergeOut:
    """merge_rows() 出参:三个计数。"""

    added: int
    """新增的帖数。"""

    updated: int
    """更新的帖数。"""

    skipped_old: int
    """因早于截止日跳过的行数。"""


# =========================================================================
# 4. 详情快照抓取
# =========================================================================


@dataclass
class NeedIn:
    """needs_detail() 入参:这帖要不要抓详情。"""

    job: dict
    """帖子行。"""

    have: dict
    """已抓过的详情 HTML 索引(posting_id → 路径)。"""


@dataclass
class SaveIn:
    """save_detail_html() 入参:落一份详情快照(temp+rename)。"""

    raw_dir: Path
    """当天的详情目录。"""

    pid: str
    """帖号。"""

    html: str
    """页面原始 HTML。"""


@dataclass
class TickIn:
    """detail_tick() 入参:心跳一行的五个数。"""

    done: int
    """已抓数。"""

    todo: int
    """本轮待抓总数。"""

    prov: str
    """当前帖的省码。"""

    employer: str
    """当前帖的雇主名(截断显示)。"""

    rate: float
    """每秒抓取速率。"""


# =========================================================================
# 5. 详情快照解析
# =========================================================================


@dataclass
class ShouldParseIn:
    """should_parse() 入参:这帖要不要(重)解析详情。"""

    job: dict
    """帖子行。"""

    raw_file: "Path | None"
    """该帖的详情 HTML 快照;None = 还没抓过。"""

    reparse: bool
    """REPARSE=1 强制重解析全部。"""


@dataclass
class EnrichIn:
    """enrich_job() 入参:一帖的详情解析与落盘。"""

    job: dict
    """帖子行(原地富集)。"""

    raw_file: Path
    """该帖的详情 HTML 快照。"""

    seen: set
    """本轮已用过的文件名主干(撞车时加帖号)。"""


@dataclass
class EmploymentOut:
    """employment_of() 出参:雇佣期 + 全职/兼职(没标注 = 双空,宁缺不猜)。"""

    term: str
    """雇佣期(permanent/term/casual/seasonal)。"""

    hours: str
    """工时档(full/part)。"""


@dataclass
class ReqIn:
    """req_section() 入参:入职要求区按 h4 标题取归属它的 ul。"""

    soup: SoupNodeLike
    """详情页。"""

    heading: str
    """h4 标题前缀。"""


@dataclass
class StemIn:
    """stem_of() 入参:详情 .md 的可读文件名两段。"""

    employer: str
    """雇主名。"""

    title: str
    """职位名。"""


@dataclass
class DetailMdIn:
    """write_detail_md() 入参:一帖的 .md 落盘。"""

    job: dict
    """帖子行(已富集)。"""

    address: str
    """地址(写进 frontmatter)。"""

    website: str
    """官网(同上)。"""

    posted: str
    """详情页发布日(同上)。"""

    desc: str
    """描述正文。"""

    seen: set
    """本轮已用过的文件名主干(撞车时加帖号)。"""


@dataclass
class DetailTally:
    """详情解析收尾那行的四个全库覆盖数(本轮解析数由入口自己数)。"""

    addrs: int
    """全库有地址的帖数。"""

    webs: int
    """全库有官网的帖数。"""

    emp: int
    """全库有雇佣形态的帖数。"""

    certs: int
    """全库有证书要求的帖数。"""


# =========================================================================
# 6. 公司档构建
# =========================================================================


@dataclass
class CompanyIn:
    """write_company() 入参:一家公司(省/市/雇主三元组)的一份档案。"""

    prov: str
    """省码。"""

    city: str
    """城市。"""

    employer: str
    """雇主名。"""

    jobs: list
    """该雇主在该市的全部帖子行。"""

    index: dict
    """url → 详情 .md 路径(取职位描述用)。"""


@dataclass
class FieldIn:
    """first_value() / any_value() 入参:一组帖子 + 要看的那一格。"""

    jobs: list
    """一家公司的全部帖子行。"""

    key: str
    """要取的键。"""


@dataclass
class DupIn:
    """dup_tail() 入参:同名职位文件撞车时的后缀来源。"""

    job: dict
    """帖子行。"""

    seen: set
    """本轮已用过的文件名主干(没帖号时拿它的个数当序号)。"""


@dataclass
class JobMdIn:
    """to_job_md() 入参:一岗的 frontmatter + 描述。"""

    job: dict
    """帖子行。"""

    desc: str
    """从详情 .md 取来的描述(取不到为空串)。"""


# =========================================================================
# 7. 岗位质检
# =========================================================================


@dataclass
class FlagIn:
    """add_flag() 入参:记一行可疑。"""

    flags: dict
    """分类 → 可疑行清单(原地累积)。"""

    category: str
    """可疑分类名。"""

    job: dict
    """帖子行。"""

    why: str
    """为什么可疑。"""


@dataclass
class FlagRowIn:
    """to_flag_row() 入参:帖子行 + 为什么可疑。"""

    job: dict
    """帖子行。"""

    why: str
    """可疑说明。"""


@dataclass
class CategoryIn:
    """category_counter() 入参:帖子清单 + 评分产物。"""

    posts: list
    """全部帖子行。"""

    scored: dict
    """externalId → 评分行。"""


@dataclass
class CheckIn:
    """check_job() 入参:逐帖过全部质检规则。"""

    flags: dict
    """分类 → 可疑行清单(原地累积)。"""

    job: dict
    """帖子行。"""

    seen_url: set
    """已见过的帖子地址(查重复)。"""


# =========================================================================
# 8. 死岗验尸
# =========================================================================


@dataclass
class CandidateIn:
    """candidates_of() 入参:从累积 store 里挑本轮该验的帖。"""

    postings: list
    """全部帖子行。"""

    state: dict
    """判死/验活名单。"""

    on_board: set | None
    """09 上一轮落的「还在板上」帖号;None = 名单文件还没有,退回全验。"""

    now: datetime
    """本轮起始时刻。"""


@dataclass
class CandidateOut:
    """candidates_of() 出参:排好序的候选 + 两个报数。"""

    cands: list
    """(风险键, 帖号, 地址) 三元组清单,已按风险键升序。"""

    off_board: int
    """因不在板上而跳过的帖数。"""

    fresh: int
    """last_seen 在近 3 天内的候选数(排在队尾)。"""


@dataclass
class VerifyIn:
    """verify_batch() 入参:本轮预算内的候选 + 判死名单。"""

    cands: list
    """本轮要验的候选(风险键, 帖号, 地址)。"""

    state: dict
    """判死/验活名单(原地累积)。"""

    now: datetime
    """本轮起始时刻(判死/验活都记它)。"""


@dataclass
class VerifyOut:
    """verify_batch() 出参:本轮三个计数。"""

    dead: int
    """新判死。"""

    alive: int
    """仍在招。"""

    errs: int
    """网络错误跳过(保留活口,下轮再验)。"""


# =========================================================================
# 9. 无经验友好打标
# =========================================================================


@dataclass
class ApprenticeTally:
    """无经验打标的四个累计数(逐行改写的可变载体;原脚本四个局部变量的收编,
    内嵌禁令下计数只能显式传 —— 同本域 DetailTally 的先例)。"""

    flagged: int
    """判为「不要经验」的帖数。"""

    by_phrase: int
    """靠官方 Experience 短语命中的帖数。"""

    by_title: int
    """靠标题 apprenti 命中的帖数。"""

    total: int
    """过了一遍的 Job Bank 帖数(ATS 那一轮不计入,原脚本口径)。"""


@dataclass
class ApprenticeRowIn:
    """flag_apprentice_row() 入参:一帖 + 短语索引 + 累计数。"""

    job: dict
    """帖子行(原地写两个字段)。"""

    phrases: dict
    """帖号 → 官方 Experience 短语。"""

    tally: ApprenticeTally
    """四个累计数(原地累加)。"""


# =========================================================================
# 10. NOC 失配护栏
# =========================================================================


@dataclass
class SanityRowIn:
    """blank_mismatched_noc() 入参:一帖 + 中位工资表。"""

    job: dict
    """帖子行(命中才原地置空 noc 并留痕)。"""

    wages: dict
    """NOC×省 中位工资表(可为空表:文件缺时护栏落 ABS_FLOOR 兜底)。"""


@dataclass
class SanityWageIn:
    """wage_median_of() 入参:查某 NOC 在某省的年薪中位。"""

    wages: dict
    """中位工资表。"""

    noc: str
    """五位 NOC 码。"""

    province: str
    """省码(空串照原脚本原样去查,查不到再走全国兜底键)。"""


@dataclass
class SanityJudgeIn:
    """is_salary_mismatch() 入参:中位(可能没有)与本帖年薪。"""

    med: float | None
    """该 NOC 的年薪中位;None = 表里没有,走绝对下限那条。"""

    annual: float
    """本帖年薪折算(04d 算的;链序保证它先跑)。"""
