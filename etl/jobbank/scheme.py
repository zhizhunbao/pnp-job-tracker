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
例外(2026-09-26 到期即验批):第 12 段自测用例集(unittest.TestCase,「不用 class」的外部库例外,先例
gate.scheme 的 JobbankStoreLockTest、indexing.scheme 的 IndexingDecisionTest)引本域 constants 造帖子行与名单;
被测的 jobbank.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。
"""
import unittest
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol
from unittest import mock

from jobbank.constants import (
    K_CHECKED, K_DATE, K_DEAD, K_DIRECT, K_HOWTO_UNTIL, K_LAST_SEEN, K_POSTING_ID, K_SOURCE, K_UNTIL, K_URL,
    TIER_NORMAL, TIER_OVERDUE, TIER_RECHECK,
)


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
class StaleIn:
    """is_detail_stale() / is_stale_refreshed() 入参:一帖 + 它手上最新的详情快照。"""

    job: dict
    """帖子行(读 K_DETAIL_STALE)。"""

    raw_file: "Path | None"
    """该帖最新的详情 HTML 快照;None = 还没抓过。"""


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
    """merge_rows() 出参:四个计数。"""

    added: int
    """新增的帖数。"""

    updated: int
    """更新的帖数。"""

    skipped_old: int
    """因早于截止日跳过的行数。"""

    stale: int
    """已抓过详情、这轮列表标题变了的帖数(记了详情欠重抓;2026-09-25)。"""


@dataclass
class TitleChangeIn:
    """is_title_changed() 入参:store 里的帖 + 这轮列表抓到的标题。"""

    job: dict
    """store 里的帖子行(合并前)。"""

    title: str
    """这轮列表行的标题。"""


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

    index: "JdIndexUpdates"
    """本轮的详情索引增量(写 .md 时顺手记一行,收尾一次落盘)。"""


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

    index: "JdIndexUpdates"
    """本轮的详情索引增量(2026-09-12 汇装提速批 1(Frank「跑完,拆吧。不然每次都半小时等不起」,设计稿 docs/design/汇装提速-20260912.md §5))。"""


@dataclass
class JdIndexUpdates:
    """本轮新写 .md 的详情索引增量(parse_details 循环累加,收尾一次合并进 index.json 与正文桶;
    2026-09-12 汇装提速批 1(Frank「跑完,拆吧。不然每次都半小时等不起」,设计稿 docs/design/汇装提速-20260912.md §5))。"""

    entries: dict
    """url → {pid, file, mtime, experience}。"""

    bodies: dict
    """正文桶名 → {url: 正文(去 frontmatter 原文;清洗归 mart)}。"""


@dataclass
class JdMergeIn:
    """merge_jd_scan() 入参:回填累加器(索引行表 + 正文桶表)与这一篇的扫描结果。"""

    entries: dict
    """url → 索引行(原地合并)。"""

    bodies: dict
    """桶名 → {url: 正文}(原地合并)。"""

    row: "JdMdScan"
    """这一篇。"""


@dataclass
class JdMdScan:
    """回填件读一篇既有 .md 得到的一行(取不到 url 的 .md 不产此形)。"""

    url: str
    """frontmatter 的 url(索引键)。"""

    pid: str
    """帖号(url 里取;取不到空串)。"""

    file: str
    """.md 文件名。"""

    mtime: str
    """文件修改时刻(ISO,UTC)。"""

    experience: str
    """Experience 节短语。"""

    body: str
    """正文(去 frontmatter 原文)。"""


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

    howto: dict
    """howto.json 记录表(帖号 → 记录;2026-09-26 起挑帖读它的截止日:验尸自己还没记帖页截止日的直发帖用这份)。"""

    now: datetime
    """本轮起始时刻。"""


@dataclass
class CandidateOut:
    """candidates_of() 出参:排好序的候选 + 报数。"""

    cands: list
    """(排序键, 帖号, 地址, 挑帖时知道的截止日) 四元组清单,已按排序键升序;排序键以档位打头(constants 的 TIER_*)。
    第四格 2026-09-26 加:验活时拿它比帖页截止日,晚了 = 延期。"""

    off_board: int
    """因不在板上而跳过的帖数(本轮到期的帖里数)。"""

    fresh: int
    """last_seen 在近 3 天内的候选数(排在队尾)。2026-09-26 起只数常规档(前两档不按 last_seen 排)。"""

    young: int
    """因发布不满 VERIFY_YOUNG_DAYS 天而跳过的帖数(2026-09-26 起)。"""

    overdue: int
    """候选里截止日已过完、那之后还没验过的(TIER_OVERDUE 档)。"""

    recheck: int
    """候选里截止日已过完、验过仍活着、到了 12 小时复检的(TIER_RECHECK 档)。"""


@dataclass
class UntilKnownIn:
    """until_known_of() 入参:一帖挑帖时用哪个截止日。"""

    state: dict
    """判死/验活名单(读 K_UNTIL 格)。"""

    howto: dict
    """howto.json 记录表。"""

    pid: str
    """帖号。"""


@dataclass
class PickIn:
    """pick_of() 入参:一帖此刻该不该验(纯函数的全部输入)。"""

    job: dict
    """帖子行(读发布日 / last_seen / 来源 / 是否直发)。"""

    checked: str
    """上次验活时刻(ISO;空串 = 没验活过)。"""

    until: str
    """挑帖时知道的截止日(YYYY-MM-DD;空串 = 不知道或帖页没写)。"""

    no_until: bool
    """验尸验活过这帖、帖页没写截止日(K_UNTIL 格记的空串);还没验过的是 False(不知道 ≠ 没有)。"""

    now: datetime
    """此刻。"""


@dataclass
class PickOut:
    """pick_of() 出参。"""

    due: bool
    """本轮该验。"""

    young: bool
    """因发布不满 VERIFY_YOUNG_DAYS 天而不验(截止日没过完时才会是 True)。"""

    key: tuple
    """排序键:(档位, 串, 串);档内次序见 constants 的 TIER_* 三格。"""


@dataclass
class TallyPickIn:
    """tally_pick() 入参:一个入选的候选计进报数。"""

    out: CandidateOut
    """本轮挑帖结果(原地累加 overdue / recheck / fresh)。"""

    key: tuple
    """这个候选的排序键(档位打头)。"""

    fresh: bool
    """last_seen 在近 3 天内。"""


@dataclass
class VerifyIn:
    """verify_batch() 入参:本轮预算内的候选 + 判死名单。"""

    cands: list
    """本轮要验的候选(排序键, 帖号, 地址, 挑帖时知道的截止日)。"""

    state: dict
    """判死/验活名单(原地累积)。"""

    now: datetime
    """本轮起始时刻(判死/验活都记它)。"""


@dataclass
class VerifyOut:
    """verify_batch() 出参:本轮四个计数。"""

    dead: int
    """新判死。"""

    alive: int
    """仍在招。"""

    errs: int
    """网络错误跳过(保留活口,下轮再验)。"""

    extended: int
    """仍在招里帖页截止日比挑帖时知道的晚(延期了;2026-09-26 起数)。"""


@dataclass
class JudgeIn:
    """judge_page() 入参:一份帖页回包 + 要原地写的名单与计数。"""

    state: dict
    """判死/验活名单(原地写 K_DEAD / K_CHECKED / K_UNTIL)。"""

    out: VerifyOut
    """本轮计数(原地累加)。"""

    pid: str
    """帖号。"""

    until: str
    """挑帖时知道的截止日(比帖页的晚没晚)。"""

    status: int
    """HTTP 状态码。"""

    html: str
    """帖页原文(不落盘,只在内存里判死、抽截止日)。"""

    now: datetime
    """本轮起始时刻(判死/验活都记它)。"""


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


# =========================================================================
# 11. 投递方式
# =========================================================================


class HttpPostClientLike(Protocol):
    """httpx 客户端里投递方式段真用的一门(POST 表单;第 1 段 HttpClientLike 只声明了 get)。"""

    def post(self, url: str, data: dict, headers: dict) -> HttpResponseLike:
        """POST 一个表单(超时挂在客户端上,不逐次传)。"""
        ...


@dataclass
class HowtoPickIn:
    """howto_targets() 入参:从 store 里挑本轮该查的帖。"""

    postings: list
    """全部帖子行。"""

    on_board: set | None
    """09 上一轮落的「还在板上」帖号;None = 名单文件还没有,退回全查。"""

    dead: dict
    """验尸判死名单(帖号 → 判死时刻);判死的不查。"""

    state: dict
    """howto.json 已有记录(帖号 → 记录);查过的不再查,上次出错的重查。"""


@dataclass
class HowtoPickOut:
    """howto_targets() 出参。"""

    board: int
    """板上 Job Bank 直发帖数(判死的不算)。"""

    todo: list
    """待查帖号(帖号大的在前 = 新帖优先)。"""


@dataclass
class HowtoBatchIn:
    """howto_batch() 入参:本轮预算内的帖号 + 记录表。"""

    pids: list
    """本轮要查的帖号。"""

    state: dict
    """howto.json 记录表(原地写入)。"""

    now: datetime
    """本轮起始时刻(记录的检查时刻、截止日比较都用它)。"""


@dataclass
class HowtoBatchOut:
    """howto_batch() 出参:本轮四个计数。"""

    mail: int
    """有投递区且拿到邮箱。"""

    gone: int
    """已下架。"""

    none: int
    """没有投递区但截止日未到。"""

    errs: int
    """请求出错 / 非 200(下轮重查)。"""


@dataclass
class HowtoOneIn:
    """howto_one() 入参:查一帖。"""

    client: HttpPostClientLike
    """复用的客户端(伪装档 + TLS 1.2 封顶,见 fetch 叶;装配点 cast)。"""

    pid: str
    """帖号。"""

    now: datetime
    """本轮起始时刻。"""

    pages: list
    """待落盘的回包原文(CachePage;攒够一批进 crawl 层)。"""


@dataclass
class HowtoParseIn:
    """howto_of() 入参:一份回包。"""

    html: str
    """回包原文(JSF 局部提交的 XML,投递区 HTML 在 CDATA 里)。"""

    now: datetime
    """本轮起始时刻(检查时刻;截止日与它的日期比)。"""


@dataclass
class HowtoRecordIn:
    """to_howto_record() 入参:一条记录的五格。"""

    at: datetime
    """检查时刻。"""

    status: str
    """状态(HOWTO_OK / HOWTO_GONE / HOWTO_NONE / HOWTO_ERROR)。"""

    emails: list
    """雇主邮箱。"""

    methods: list
    """投递渠道键。"""

    until: str
    """截止日(YYYY-MM-DD;没有给空串)。"""


@dataclass
class HowtoTallyIn:
    """tally_howto() 入参:一条新记录计进本轮计数。"""

    out: HowtoBatchOut
    """本轮计数(原地累加)。"""

    rec: dict
    """刚写进记录表的一条。"""


@dataclass
class HowtoFlushIn:
    """flush_howto() 入参:落一次盘。"""

    state: dict
    """howto.json 记录表(整份写)。"""

    pages: list
    """待落盘的回包原文(写完清空)。"""


# =========================================================================
# 12. 自测
# =========================================================================


class JobbankVerifyTest(unittest.TestCase):
    """死岗验尸自测(2026-09-26 到期即验批立;跑法 `python etl/jobbank/main.py --only test`):帖页截止日抽取、
    「截止日过完」时刻、挑帖三档与节奏(到期优先、12 小时复检、延期重排、新帖 3 天、Indeed 2 天)、候选排序、
    判死 / 验活落名单、逐小时轮次下的整条节奏。形制照宪法判定层测试:穷举输入断言性质 + 手写金标,不做快照矩阵;
    全程不联网、不读写仓内文件(被测函数全是纯函数,或只改用例自己造的名单)。节奏数字在用例里手写(12 小时 /
    2 天 / 7 天 / 3 天 / 次日 08:00 UTC),改常量而不改用例 = 用例红,逼着同步改口径说明。"""

    def now_of(self) -> datetime:
        """用例统一的「此刻」:2026-09-26 16:00 UTC(多伦多 12:00 EDT)。"""
        return datetime(2026, 9, 26, 16, 0, tzinfo=timezone.utc)

    def at(self, text: str) -> datetime:
        """「2026-09-25 08:00」→ UTC 时刻。"""
        return datetime.strptime(text, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)

    def ago(self, hours: float) -> str:
        """此刻往前 hours 小时的验活时刻串(与 judge_page 落名单的写法一致)。"""
        return (self.now_of() - timedelta(hours=hours)).isoformat()

    def job_of(self, pid: str, source: str, posted: str) -> dict:
        """造一条帖子行:来源板 source(「Job Bank」= 雇主直发)、发布日 posted(列表页原文写法;空串 = 缺)。"""
        return {K_POSTING_ID: pid, K_URL: "https://www.jobbank.gc.ca/jobsearch/jobposting/" + pid, K_SOURCE: source,
                K_DIRECT: source == "Job Bank", K_DATE: posted, K_LAST_SEEN: "2026-09-26T03:00:00Z"}

    def state_of(self) -> dict:
        """空的判死 / 验活 / 截止日名单。"""
        return {K_DEAD: {}, K_CHECKED: {}, K_UNTIL: {}}

    def pick(self, job: dict, checked: str, until: str, now: datetime) -> PickOut:
        """跑一次 pick_of(帖页截止日还不知道)。"""
        return self.pick_page(job, checked, until, False, now)

    def pick_page(self, job: dict, checked: str, until: str, no_until: bool, now: datetime) -> PickOut:
        """跑一次 pick_of(no_until = 验尸验活过、帖页没写截止日)。"""
        from jobbank import functions as fn
        return fn.pick_of(PickIn(job=job, checked=checked, until=until, no_until=no_until, now=now))

    def page_of(self, until: str) -> str:
        """造一份活帖页(until 空串 = 帖页没写截止日,Indeed 转帖那样)。"""
        if until == "":
            return "<html><title>cook - Job posting - Job Bank</title><h3>Salary</h3></html>"
        return ("<html><title>cook - Job posting - Job Bank</title><h3>Advertised until</h3>\n"
                '\t\t\t\t<p property="validThrough">' + until + "\n\t\t\t\t</p></html>")

    def test_page_until_golden(self) -> None:
        """帖页截止日抽取金标:真帖页那一格(换行 + 缩进 + 尾随 span)、属性在前 / 单引号 / 前后空白都认;没有这格
        (Indeed 转帖)、死帖页、这格写的不是日期、别的 microdata 格、validThrough 不是 property 属性值 —— 一律空串。"""
        from jobbank import functions as fn
        real = ('<h3>Advertised until</h3>\n\t\t\t\t<p property="validThrough">2026-10-05\n'
                '\t\t\t\t\t<span id="tp_expiryDate" class="timepickler"></span>\n\t\t\t\t</p></div>')
        cases = [
            (real, "2026-10-05"),
            ('<p class="x" property="validThrough">2026-11-30</p>', "2026-11-30"),
            ("<p property='validThrough'> 2026-12-01 </p>", "2026-12-01"),
            ("<h3>Salary</h3><p>$25.00 hourly</p>", ""),
            ("<h1>Job posting no longer advertised</h1>", ""),
            ('<p property="validThrough">To be determined</p>', ""),
            ('<p property="datePosted">2026-09-01</p>', ""),
            ('<td class="validThrough">2026-09-01</td>', ""),
            ("", ""),
        ]
        for html, want in cases:
            with self.subTest(html=html):
                self.assertEqual(fn.page_until_of(html), want)

    def test_until_end_golden(self) -> None:
        """「截止日过完」时刻金标:D 次日 08:00 UTC(跨月、跨年、闰日、冬令时);空串 = 没有截止日;日历上不存在的日子
        留痕(err)后当没有。"""
        from jobbank import functions as fn
        cases = [
            ("2026-09-25", "2026-09-26 08:00"),
            ("2026-09-30", "2026-10-01 08:00"),
            ("2026-12-31", "2027-01-01 08:00"),
            ("2028-02-28", "2028-02-29 08:00"),
            ("2026-01-15", "2026-01-16 08:00"),
        ]
        for until, want in cases:
            with self.subTest(until=until):
                self.assertEqual(fn.until_end_of(until), self.at(want))
        self.assertIsNone(fn.until_end_of(""))
        with mock.patch.object(fn, "err") as logged:
            self.assertIsNone(fn.until_end_of("2026-02-30"))
        logged.assert_called_once()

    def test_until_end_after_takedown(self) -> None:
        """穷举 2026-01-01 起 800 天:「过完」时刻按多伦多夏令时(UTC−4)与冬令时(UTC−5)换算都落在 D 次日、
        且不早于凌晨 3 点 —— Job Bank 凌晨 2 点前后的下架批之后(早了会白验)。"""
        from jobbank import functions as fn
        day = date(2026, 1, 1)
        for _ in range(800):
            end = fn.until_end_of(day.isoformat())
            self.assertIsNotNone(end)
            if end is None:
                return
            for offset in (4, 5):
                local = end - timedelta(hours=offset)
                self.assertEqual(local.date(), day + timedelta(days=1), day)
                self.assertGreaterEqual(local.hour, 3, day)
            day = day + timedelta(days=1)

    def test_pick_golden(self) -> None:
        """挑帖金标(此刻 09-26 16:00 UTC):截止日过完后没验 / 验在下架批之前 → 队头;过完后验过 → 满 12 小时才再验;
        截止日没到 → 7 天;发布不满 3 天不验,但截止日已过完的照验;发布日缺 = 不算新帖。2 天一档见 test_pick_no_until。"""
        direct = self.job_of("1", "Job Bank", "September 1, 2026")
        indeed = self.job_of("2", "indeed.com", "September 1, 2026")
        other = self.job_of("3", "Jobillico", "September 1, 2026")
        cases = [
            (direct, "", "2026-09-24", True, TIER_OVERDUE, False),
            (direct, self.at("2026-09-25 07:00").isoformat(), "2026-09-24", True, TIER_OVERDUE, False),
            (direct, self.at("2026-09-26 04:00").isoformat(), "2026-09-25", True, TIER_OVERDUE, False),
            (direct, self.at("2026-09-25 09:00").isoformat(), "2026-09-24", True, TIER_RECHECK, False),
            (direct, self.ago(12), "2026-09-24", True, TIER_RECHECK, False),
            (direct, self.ago(7), "2026-09-25", False, TIER_RECHECK, False),
            (indeed, self.ago(7), "2026-09-25", False, TIER_RECHECK, False),
            (direct, self.ago(24 * 5), "2026-09-26", False, TIER_NORMAL, False),
            (direct, self.ago(24 * 7), "2026-09-30", True, TIER_NORMAL, False),
            (direct, self.ago(24 * 7 - 0.02), "2026-09-30", False, TIER_NORMAL, False),
            (direct, self.ago(24 * 8), "", True, TIER_NORMAL, False),
            (indeed, self.ago(48), "", False, TIER_NORMAL, False),
            (indeed, self.ago(24 * 7), "", True, TIER_NORMAL, False),
            (other, self.ago(24 * 3), "", False, TIER_NORMAL, False),
            (other, self.ago(24 * 8), "2026-10-20", True, TIER_NORMAL, False),
            (other, "", "", True, TIER_NORMAL, False),
            (self.job_of("5", "Job Bank", "September 25, 2026"), "", "2026-10-16", False, -1, True),
            (self.job_of("6", "indeed.com", "September 25, 2026"), "", "", False, -1, True),
            (self.job_of("7", "Job Bank", "September 24, 2026"), "", "2026-09-25", True, TIER_OVERDUE, False),
            (self.job_of("8", "Job Bank", "September 23, 2026"), "", "", True, TIER_NORMAL, False),
            (self.job_of("9", "Job Bank", ""), "", "", True, TIER_NORMAL, False),
        ]
        for job, checked, until, due, tier, young in cases:
            with self.subTest(pid=job[K_POSTING_ID], checked=checked, until=until):
                got = self.pick(job, checked, until, self.now_of())
                self.assertEqual(got.due, due)
                self.assertEqual(got.young, young)
                if tier >= 0:
                    self.assertEqual(got.key[0], tier)

    def test_pick_no_until(self) -> None:
        """2 天一档金标(2026-09-26 lead 细节拍板:判据是「帖页没有截止日的转帖」,不是来源名):验尸验活过、帖页没写
        截止日的转帖 —— Indeed、AgCareers、CareersInFood、没见过的新来源、来源名大小写不同 —— 满 48 小时就验、47 小时
        不验;帖页截止日还不知道(新码没验过)的转帖照 7 天;直发帖帖页没写截止日也照 7 天;新帖照样先不验。"""
        cases = [
            ("indeed.com", True, 48, True),
            ("indeed.com", True, 47, False),
            ("Indeed.com", True, 49, True),
            ("AgCareers.com", True, 48, True),
            ("CareersInFood.com", True, 50, True),
            ("Some New Board", True, 48, True),
            ("AgCareers.com", True, 47, False),
            ("indeed.com", False, 48, False),
            ("indeed.com", False, 24 * 7, True),
            ("AgCareers.com", False, 24 * 3, False),
            ("Job Bank", True, 48, False),
            ("Job Bank", True, 24 * 7, True),
        ]
        for source, no_until, hours, due in cases:
            with self.subTest(source=source, no_until=no_until, hours=hours):
                job = self.job_of("1", source, "September 1, 2026")
                got = self.pick_page(job, self.ago(hours), "", no_until, self.now_of())
                self.assertEqual((got.due, got.young, got.key[0]), (due, False, TIER_NORMAL))
        young = self.pick_page(self.job_of("2", "indeed.com", "September 25, 2026"), "", "", True, self.now_of())
        self.assertEqual((young.due, young.young), (False, True))

    def test_pick_edges(self) -> None:
        """边界金标:截止日 09-25 的帖在 09-26 08:00:00 起算过完(含这一刻),07:59:59 仍走常规;过完后第一次验在
        08:00,12 小时后的 20:00 整点起才再验。"""
        job = self.job_of("1", "Job Bank", "September 1, 2026")
        recent = self.at("2026-09-24 12:00").isoformat()
        self.assertEqual(self.pick(job, recent, "2026-09-25", self.at("2026-09-26 08:00")).key[0], TIER_OVERDUE)
        early = self.pick(job, recent, "2026-09-25", self.at("2026-09-26 08:00") - timedelta(seconds=1))
        self.assertEqual((early.due, early.key[0]), (False, TIER_NORMAL))
        first = self.at("2026-09-26 08:00").isoformat()
        self.assertFalse(self.pick(job, first, "2026-09-25", self.at("2026-09-26 19:59")).due)
        self.assertTrue(self.pick(job, first, "2026-09-25", self.at("2026-09-26 20:00")).due)

    def test_pick_properties(self) -> None:
        """穷举性质(3 种来源 × 6 种发布日 × 23 种帖页状态(21 个截止日 + 没写 + 不知道)× 18 种上次验活,7,452 组):
        ① 四种情形不重不漏 —— 过完没验 = 队头必验;过完验过 = 复检档、满 12 小时才验;没过完且新帖 = 不验;
        其余 = 常规档,满 2 天(帖页没写截止日的转帖)/ 7 天才验;② 该验的往后任何时刻都还该验(单调);③ 截止日没到 =
        不知道截止日(延期的帖回到常规节奏);④ 同样的状态,「不知道」时该验的,知道了帖页没写也一定该验(只会更勤)。"""
        from jobbank import functions as fn
        now = self.now_of()
        sources = ("Job Bank", "indeed.com", "Jobillico")
        posted_list = ("", "September 26, 2026", "September 25, 2026", "September 24, 2026",
                       "September 23, 2026", "September 1, 2026")
        untils = [("", False), ("", True)]
        for day in range(15, 36):
            if day <= 30:
                untils.append(("2026-09-" + str(day).zfill(2), False))
            else:
                untils.append(("2026-10-" + str(day - 30).zfill(2), False))
        hours_ago = (0.5, 1, 6, 11.9, 12, 13, 24, 36, 47, 48, 49, 72, 120, 167, 168, 169, 400)
        checks = [""]
        for h in hours_ago:
            checks.append(self.ago(h))
        n = 0
        for source in sources:
            for posted in posted_list:
                job = self.job_of("1", source, posted)
                for until, no_until in untils:
                    for checked in checks:
                        n += 1
                        got = self.pick_page(job, checked, until, no_until, now)
                        self.check_partition(job, checked, until, no_until, got)
                        for later in (timedelta(hours=1), timedelta(hours=12), timedelta(days=3)):
                            if got.due:
                                self.assertTrue(self.pick_page(job, checked, until, no_until, now + later).due,
                                                (source, posted, until, checked))
                        end = fn.until_end_of(until)
                        if end is not None and end > now:
                            bare = self.pick(job, checked, "", now)
                            self.assertEqual((got.due, got.young, got.key[:1]), (bare.due, bare.young, bare.key[:1]))
                        if got.due and until == "":
                            self.assertTrue(self.pick_page(job, checked, "", True, now).due)
        self.assertEqual(n, 3 * 6 * 23 * 18)

    def check_partition(self, job: dict, checked: str, until: str, no_until: bool, got: PickOut) -> None:
        """性质①的逐组判定:按规格把这组输入归进四种情形之一,断言 pick_of 的结论与之相符。"""
        from jobbank import functions as fn
        now = self.now_of()
        end = fn.until_end_of(until)
        last = None
        if checked != "":
            last = datetime.fromisoformat(checked)
        posted = fn.expired_date_of(job[K_DATE])
        label = (job[K_SOURCE], job[K_DATE], until, no_until, checked)
        if end is not None and now >= end and (last is None or last < end):
            self.assertEqual((got.due, got.young, got.key[0]), (True, False, TIER_OVERDUE), label)
        elif end is not None and now >= end and last is not None:
            self.assertEqual((got.due, got.young, got.key[0]),
                             (now - last >= timedelta(hours=12), False, TIER_RECHECK), label)
        elif posted is not None and now - posted < timedelta(days=3):
            self.assertEqual((got.due, got.young), (False, True), label)
        else:
            gap = timedelta(days=7)
            if job[K_SOURCE] != "Job Bank" and no_until:
                gap = timedelta(days=2)
            self.assertEqual((got.due, got.young, got.key[0]),
                             (last is None or now - last >= gap, False, TIER_NORMAL), label)

    def test_candidates_order(self) -> None:
        """候选金标:三档依次排(队头按截止日早→晚,复检档按上次验早→晚,常规档按 last_seen 旧→新);验尸自己记的
        帖页截止日压过 howto 那份(延期了就不再按旧截止日排队头;帖页没写记的空串同样压过,不退回 howto 的旧截止日);
        判死 / 不在板上 / 非 Job Bank 帖 / 新帖不进候选,各自计数;第四格带出挑帖时用的截止日;帖页记了空串的转帖
        (Indeed、AgCareers)3 天前验过就到期,还没记过帖页的 Indeed 转帖照 7 天不到期。"""
        from jobbank import functions as fn
        state = self.state_of()
        rows = []
        specs = [
            ("A", "Job Bank", "", "2026-09-01T00:00:00Z"),
            ("B", "Job Bank", self.ago(24 * 9), "2026-09-02T00:00:00Z"),
            ("C", "Job Bank", self.ago(24 * 8), "2026-09-10T00:00:00Z"),
            ("D", "Job Bank", self.at("2026-09-25 09:00").isoformat(), "2026-09-03T00:00:00Z"),
            ("M", "Job Bank", self.at("2026-09-25 12:00").isoformat(), "2026-09-01T00:00:00Z"),
            ("L", "Job Bank", self.ago(24), "2026-09-01T00:00:00Z"),
            ("E", "indeed.com", self.ago(24 * 3), "2026-09-20T00:00:00Z"),
            ("F", "Jobillico", self.ago(24 * 3), "2026-09-04T00:00:00Z"),
            ("H", "Job Bank", "", "2026-09-05T00:00:00Z"),
            ("I", "Job Bank", "", "2026-09-06T00:00:00Z"),
            ("K", "Jobillico", self.ago(24 * 10), "2026-09-08T00:00:00Z"),
            ("N", "indeed.com", self.ago(24 * 3), "2026-09-07T00:00:00Z"),
            ("O", "AgCareers.com", self.ago(24 * 3), "2026-09-15T00:00:00Z"),
        ]
        for pid, source, checked, last_seen in specs:
            job = self.job_of(pid, source, "September 1, 2026")
            job[K_LAST_SEEN] = last_seen
            rows.append(job)
            if checked != "":
                state[K_CHECKED][pid] = checked
        young = self.job_of("G", "Job Bank", "September 25, 2026")
        ats = self.job_of("J", "Job Bank", "September 1, 2026")
        ats[K_URL] = "https://boards.greenhouse.io/acme/jobs/1"
        rows.extend([young, ats])
        state[K_DEAD]["H"] = self.ago(30)
        state[K_UNTIL]["C"] = "2026-10-09"
        state[K_UNTIL]["D"] = "2026-09-24"
        state[K_UNTIL]["M"] = "2026-09-23"
        state[K_UNTIL]["L"] = ""
        state[K_UNTIL]["E"] = ""
        state[K_UNTIL]["O"] = ""
        howto = {"A": {K_HOWTO_UNTIL: "2026-09-20"}, "B": {K_HOWTO_UNTIL: "2026-09-24"},
                 "C": {K_HOWTO_UNTIL: "2026-09-20"}, "G": {K_HOWTO_UNTIL: "2026-10-16"},
                 "L": {K_HOWTO_UNTIL: "2026-09-20"}}
        on_board = {"A", "B", "C", "D", "E", "F", "G", "J", "K", "L", "M", "N", "O"}
        out = fn.candidates_of(CandidateIn(postings=rows, state=state, on_board=on_board, howto=howto,
                                           now=self.now_of()))
        order = []
        for _key, pid, _url, _until in out.cands:
            order.append(pid)
        self.assertEqual(order, ["A", "B", "D", "M", "K", "C", "O", "E"])
        self.assertEqual((out.overdue, out.recheck, out.young, out.off_board), (2, 2, 1, 1))
        self.assertEqual(out.cands[0][3], "2026-09-20")
        self.assertEqual(out.cands[5][3], "2026-10-09")

    def test_judge_page(self) -> None:
        """判死 / 验活金标:活帖记验活时刻与帖页截止日(晚于挑帖时知道的 = 延期,计数;早了照记不计;帖页没写记空串);
        410 / 404 / 页头过期标记判死并摘截止日格、验活时刻不动;过期标记落在页头 6,000 字节之外不算。"""
        from jobbank import functions as fn
        now = self.now_of()
        state = self.state_of()
        state[K_CHECKED]["9"] = self.ago(200)
        state[K_UNTIL]["9"] = "2026-09-20"
        out = VerifyOut(dead=0, alive=0, errs=0, extended=0)
        alive = [
            ("1", "2026-09-25", self.page_of("2026-10-09"), "2026-10-09", 1),
            ("2", "", self.page_of(""), "", 0),
            ("3", "2026-10-09", self.page_of("2026-10-01"), "2026-10-01", 0),
            ("4", "2026-10-09", self.page_of("2026-10-09"), "2026-10-09", 0),
            ("5", "", "x" * 6000 + "Job posting expired", "", 0),
        ]
        for pid, known, html, want_until, want_ext in alive:
            before = out.extended
            fn.judge_page(JudgeIn(state=state, out=out, pid=pid, until=known, status=200, html=html, now=now))
            self.assertEqual(state[K_CHECKED][pid], now.isoformat())
            self.assertEqual(state[K_UNTIL][pid], want_until)
            self.assertEqual(out.extended - before, want_ext, pid)
            self.assertNotIn(pid, state[K_DEAD])
        dead = [(410, self.page_of("")), (404, ""), (200, "<title>Job posting expired - Job Bank</title>")]
        for status, html in dead:
            with self.subTest(status=status):
                state[K_UNTIL]["9"] = "2026-09-20"
                state[K_DEAD].pop("9", None)
                fn.judge_page(JudgeIn(state=state, out=out, pid="9", until="2026-09-20", status=status, html=html,
                                      now=now))
                self.assertEqual(state[K_DEAD]["9"], now.isoformat())
                self.assertNotIn("9", state[K_UNTIL])
                self.assertEqual(state[K_CHECKED]["9"], self.ago(200))
        self.assertEqual((out.alive, out.dead, out.extended, out.errs), (5, 3, 1, 0))

    def run_rounds(self, job: dict, howto: dict, span: tuple, script: list) -> list:
        """逐小时一轮地跑挑帖 + 判帖(span = (起, 止) 两个「YYYY-MM-DD HH:MM」,可带第三格 = 旧码留下的上次验活时刻;
        script = [(起效时刻, 状态码, 帖页截止日)],按时刻取最后一条起效的当回包),返回每次真去验的时刻「MM-DD HH:MM」
        清单;判死即停。"""
        from jobbank import functions as fn
        state = self.state_of()
        if len(span) > 2:
            state[K_CHECKED][job[K_POSTING_ID]] = self.at(span[2]).isoformat()
        pid = job[K_POSTING_ID]
        now = self.at(span[0])
        stop = self.at(span[1])
        seen = []
        while now <= stop and pid not in state[K_DEAD]:
            picked = fn.candidates_of(CandidateIn(postings=[job], state=state, on_board={pid}, howto=howto, now=now))
            for _key, cid, _url, until in picked.cands:
                status, page_until = self.reply_at(script, now)
                html = self.page_of(page_until)
                fn.judge_page(JudgeIn(state=state, out=VerifyOut(dead=0, alive=0, errs=0, extended=0), pid=cid,
                                      until=until, status=status, html=html, now=now))
                seen.append(now.strftime("%m-%d %H:%M"))
            now = now + timedelta(hours=1)
        return seen

    def reply_at(self, script: list, now: datetime) -> tuple:
        """剧本里此刻生效的回包 (状态码, 帖页截止日)。"""
        got = (200, "")
        for since, status, until in script:
            if self.at(since) <= now:
                got = (status, until)
        return got

    def test_rounds_direct(self) -> None:
        """直发帖整条节奏(逐小时轮次,起点 09-20 10:00 名单为空 → 第一轮按常规档首验,howto 截止日 09-24):
        ① 下架批 09-25 06:00 → 过完后只在 09-25 08:00 验一次即判死;② 过完还挂着(截止日没挪)到 09-26 20:00 →
        08:00 起每 12 小时一验,第四次判死;③ 过完那次看到延期到 10-09 → 回常规 7 天一验,新截止日过完(10-10 08:00)
        那一轮再验。"""
        job = self.job_of("1", "Job Bank", "September 1, 2026")
        howto = {"1": {K_HOWTO_UNTIL: "2026-09-24"}}
        gone = [("2026-09-01 00:00", 200, "2026-09-24"), ("2026-09-25 06:00", 410, "")]
        zombie = [("2026-09-01 00:00", 200, "2026-09-24"), ("2026-09-26 20:00", 410, "")]
        renew = [("2026-09-01 00:00", 200, "2026-09-24"), ("2026-09-25 07:00", 200, "2026-10-09"),
                 ("2026-10-10 06:00", 410, "")]
        self.assertEqual(self.run_rounds(job, howto, ("2026-09-20 10:00", "2026-09-28 00:00"), gone),
                         ["09-20 10:00", "09-25 08:00"])
        self.assertEqual(self.run_rounds(job, howto, ("2026-09-20 10:00", "2026-09-28 00:00"), zombie),
                         ["09-20 10:00", "09-25 08:00", "09-25 20:00", "09-26 08:00", "09-26 20:00"])
        self.assertEqual(self.run_rounds(job, howto, ("2026-09-20 10:00", "2026-10-12 00:00"), renew),
                         ["09-20 10:00", "09-25 08:00", "10-02 08:00", "10-09 08:00", "10-10 08:00"])

    def test_rounds_forwarded(self) -> None:
        """转帖整条节奏(逐小时轮次,09-20 发布):Indeed 转帖满 3 天(09-23 00:00)首验、记下帖页没写截止日,之后每 2 天
        一验,10-01 下架那轮判死;AgCareers 转帖同样(以后新冒出来的同类自动进);非 Indeed 转帖首验记下帖页截止日 10-20,
        09-28 中午下架 → 7 天后(09-30 00:00)那一验判死;旧码 09-24 00:00 验过、还没记帖页的 Indeed 转帖先照 7 天
        (10-01 00:00),记下没写截止日后才 2 天一验。"""
        indeed = self.job_of("2", "indeed.com", "September 20, 2026")
        other = self.job_of("3", "Jobillico", "September 20, 2026")
        indeed_script = [("2026-09-01 00:00", 200, ""), ("2026-10-01 00:00", 410, "")]
        other_script = [("2026-09-01 00:00", 200, "2026-10-20"), ("2026-09-28 12:00", 410, "")]
        self.assertEqual(self.run_rounds(indeed, {}, ("2026-09-20 00:00", "2026-10-05 00:00"), indeed_script),
                         ["09-23 00:00", "09-25 00:00", "09-27 00:00", "09-29 00:00", "10-01 00:00"])
        self.assertEqual(self.run_rounds(other, {}, ("2026-09-20 00:00", "2026-10-05 00:00"), other_script),
                         ["09-23 00:00", "09-30 00:00"])
        ag = self.job_of("4", "AgCareers.com", "September 20, 2026")
        self.assertEqual(self.run_rounds(ag, {}, ("2026-09-20 00:00", "2026-10-05 00:00"), indeed_script),
                         ["09-23 00:00", "09-25 00:00", "09-27 00:00", "09-29 00:00", "10-01 00:00"])
        old = self.job_of("5", "indeed.com", "September 1, 2026")
        late = [("2026-09-01 00:00", 200, ""), ("2026-10-06 00:00", 410, "")]
        self.assertEqual(self.run_rounds(old, {}, ("2026-09-26 00:00", "2026-10-08 00:00", "2026-09-24 00:00"), late),
                         ["10-01 00:00", "10-03 00:00", "10-05 00:00", "10-07 00:00"])
