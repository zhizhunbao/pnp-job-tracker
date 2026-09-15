"""
hireac 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 careerbeacon/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 详情页「标签: 值」表格经 to_job_fact 归一;落 raw jobs.json
  时由 asdict 转回 wire 字典,建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— playwright 页面只声明本域真用的格;装配点用 typing.cast 喂 crawl 给的真页。
import 只有标准库(叶子律:形状本域自声明,零跨域)。

@author Frank
@time 2026-09-13
"""
from dataclasses import dataclass
from typing import Protocol


# =========================================================================
# 1. 共享词汇(浏览器页面形状)
# =========================================================================


class BrowserPageLike(Protocol):
    """playwright 页面里本域真用的五格(crawl.get_browser_page 给的单例标签)。"""

    url: str
    """当前地址(判登录态过期)。"""

    async def goto(self, url: str, wait_until: str, timeout: int) -> object:
        """导航。"""
        ...

    async def wait_for_timeout(self, ms: int) -> None:
        """等固定毫秒。"""
        ...

    async def content(self) -> str:
        """当前 DOM 的 outerHTML。"""
        ...

    async def evaluate(self, js: str, arg: object = None) -> object:
        """页内跑一段 JS(翻页 / 点钮 / 读页号 / 回放表单)。"""
        ...


# =========================================================================
# 2. 抓取(列表翻页 + 详情回放)
# =========================================================================


@dataclass
class WaitPageIn:
    """wait_page() 入参(等分页器的当前页号变成 n)。"""

    page: BrowserPageLike
    """板所在标签。"""

    n: int
    """目标页号。"""


@dataclass
class FreshHtmlIn:
    """fresh_html() 入参(翻页后等表格真的换成新一页的行)。"""

    page: BrowserPageLike
    """板所在标签。"""

    n: int
    """目标页号(只用于报错)。"""

    prev: set
    """上一页的行号集合;新页行号与它零交集才算翻到。"""


@dataclass
class DetailBatchIn:
    """fetch_details() 入参(本轮在列的全部行;函数内剔已缓存并按上限截断)。"""

    page: BrowserPageLike
    """板所在标签(回放要在这页的上下文里 fetch)。"""

    rows: dict
    """行号 → 详情表单参数。"""


@dataclass
class DetailBatchOut:
    """fetch_details() 出参。"""

    done: int
    """成功入缓存的张数。"""

    failed: int
    """回放失败(非 200 / 正文无判词)跳过的张数。"""

    skipped: int
    """已缓存不必回放的张数。"""


@dataclass
class DetailKeyIn:
    """detail_key_of() 入参(行号 + 表单里的帖号 → crawl 层键)。"""

    row_id: str
    """行号(本地帖数字 / 联播帖 CC-数字)。"""

    posting_id: str
    """表单参数里的帖号(去前缀的数字)。"""


# =========================================================================
# 3. 详情解析
# =========================================================================


@dataclass
class JobFact:
    """一条帖子的原始事实(详情表格归一后;空串 = 页上没给)。"""

    posting_id: str
    """行号(本地帖数字 / 联播帖 CC-数字)。"""

    title: str
    """职位标题。"""

    employer: str
    """雇主名。"""

    division: str
    """雇主部门(本地帖)。"""

    kind: str
    """岗位类型原文(Position Type / Job Type)。"""

    city: str
    """城市。"""

    province: str
    """省码。"""

    postal: str
    """邮编(联播帖)。"""

    street: str
    """街道地址(联播帖)。"""

    salary_kind: str
    """薪资类型原文(本地帖 Hourly / Salary;无金额)。"""

    hours: str
    """周工时原文(本地帖)。"""

    term: str
    """学年原文(本地帖)。"""

    category: str
    """岗位类别原文(本地帖)。"""

    description: str
    """描述纯文本。"""

    requirements: str
    """要求纯文本。"""

    deadline: str
    """截止日(ISO 日期;认不出留空串)。"""

    apply_url: str
    """投递网址(本地帖「If by Website」/ 联播帖「Click Here to Apply」)。"""

    apply_email: str
    """投递邮箱(本地帖)。"""

    procedure: str
    """投递方式原文。"""

    website: str
    """雇主官网(联播帖)。"""

    language: str
    """岗位语言(联播帖)。"""

    country: str
    """国家原文(联播帖;本地帖空串)。"""

    first_seen: str
    """本站首次解析到这帖的日期(ISO;板上不给发布日,拿它当发布日)。"""


@dataclass
class DetailFieldsIn:
    """to_job_fact() 入参(一张详情页抽出的「标签 → 值」+ 行号 + 解析日)。"""

    posting_id: str
    """行号。"""

    fields: dict
    """标签 → 纯文本值。"""

    seen: str
    """解析日(ISO)。"""


@dataclass
class PickIn:
    """pick() 入参(几个候选标签里取第一个有值的)。"""

    fields: dict
    """标签 → 值。"""

    keys: list
    """候选标签(按优先序)。"""


@dataclass
class Location:
    """地点归一结果。"""

    city: str
    """城市(认不出留空串)。"""

    province: str
    """省码(认不出留空串)。"""


@dataclass
class ParseTally:
    """parse_hireac_details() 的计数器。"""

    parsed: int
    """本轮新解析的张数。"""

    skipped: int
    """已解析过跳过的张数。"""

    missing: int
    """在列但缓存里没有原文的张数(本轮回放没抓到)。"""


# =========================================================================
# 4. postings 仓
# =========================================================================


@dataclass
class PostingRowIn:
    """to_posting_row() 入参(一条事实 + 本轮时刻)。"""

    fact: JobFact
    """归一后的事实。"""

    seen_at: str
    """本轮建仓时刻(ISO Z)。"""


@dataclass
class UnitByKindIn:
    """unit_by_kind_of() 入参(正文金额没带单位:按板上类型格与金额量级补)。"""

    kind: str
    """板上 Salary 类型格原文(Hourly / Salary / …)。"""

    amount: float
    """正文抽到的金额(低值)。"""


@dataclass
class StoreTally:
    """build_hireac_postings() 的计数器。"""

    rows: int
    """入仓行数。"""

    gone: int
    """事实表里有、本轮列表已不在列的帖数。"""

    expired: int
    """已过截止日的帖数。"""

    blank: int
    """无标题(解析残缺)的帖数。"""

    foreign: int
    """国家写明且不是 Canada 的帖数。"""
