"""
jobillico 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 ats/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 详情页 ld+json JobPosting 经 to_job_fact 归一;落 raw jobs.json
  时由 to_fact_row 转回 wire 字典,建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— httpx 客户端/响应只声明本域真用的格;装配点用 typing.cast 喂真客户端。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass
from typing import Protocol


# =========================================================================
# 1. 共享词汇(HTTP 库形状)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的两格。"""

    text: str
    """响应体文本(sitemap XML / 详情页 HTML)。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错(单页失败按跳过留痕)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的一门。"""

    def get(self, url: str) -> HttpResponseLike:
        """GET 一发(超时挂在客户端上,不逐次传)。"""
        ...


# =========================================================================
# 2. 站点地图枚举
# =========================================================================


@dataclass
class SitemapIn:
    """collect_sitemap_urls() 入参(一张子图:取回并缓存 → <loc> 清单)。"""

    client: HttpClientLike
    """已构造的客户端。"""

    url: str
    """子图地址。"""


# =========================================================================
# 3. 详情原文抓取
# =========================================================================


@dataclass
class DetailBatchIn:
    """fetch_details() 入参(本轮要抓的 URL 清单)。"""

    client: HttpClientLike
    """已构造的客户端。"""

    urls: list
    """待抓详情 URL(已剔缓存过的,已按本轮上限截断)。"""


@dataclass
class DetailBatchOut:
    """fetch_details() 出参。"""

    done: int
    """成功入缓存的页数。"""

    failed: int
    """取不到(网络/非 2xx)跳过的页数。"""


# =========================================================================
# 4. 详情解析
# =========================================================================


@dataclass
class JobFact:
    """一条帖子的原始事实(ld+json JobPosting 归一后;空串 = 页上没给)。"""

    posting_id: str
    """帖号(URL 末段)。"""

    url: str
    """详情 URL(枚举时选定的语言版)。"""

    lang: str
    """页语言(en / fr)。"""

    title: str
    """职位标题。"""

    employer: str
    """雇主名(hiringOrganization.name)。"""

    employer_url: str
    """Jobillico 公司页地址。"""

    city: str
    """城市。"""

    province: str
    """省码。"""

    postal: str
    """邮编。"""

    street: str
    """街道地址。"""

    country: str
    """国家码(addressCountry,一般 CA;留着给 mart 地点段判国)。"""

    date_posted: str
    """发布日(ISO)。"""

    valid_through: str
    """截止日(ISO)。"""

    salary_lo: str
    """薪资低值 / 单值(原串)。"""

    salary_hi: str
    """薪资高值(单值时空串)。"""

    salary_unit: str
    """薪资单位(HOUR/YEAR/…)。"""

    employment_types: list
    """雇佣形态清单(FULL_TIME/PERMANENT/…)。"""

    industry: str
    """行业文本。"""

    description: str
    """描述纯文本。"""


@dataclass
class LdPostingIn:
    """to_job_fact() 入参(一块 JobPosting 字典 + 它来自哪个 URL)。"""

    posting_id: str
    """帖号。"""

    url: str
    """详情 URL。"""

    lang: str
    """页语言。"""

    data: dict
    """ld+json 解出的 JobPosting 字典。"""


@dataclass
class ParseTally:
    """parse_jobillico_details() 的计数器。"""

    parsed: int
    """本轮新解析的页数。"""

    skipped: int
    """已解析过跳过的页数。"""

    missing: int
    """缓存里有页但页上没有 JobPosting 块的数。"""


# =========================================================================
# 6. postings 仓
# =========================================================================


@dataclass
class PostingRowIn:
    """to_posting_row() 入参(一条事实 + 本轮时刻)。"""

    fact: JobFact
    """归一后的事实。"""

    seen_at: str
    """本轮建仓时刻(ISO Z)。"""

    title_en: str
    """英译标题(缓存里有才非空;空串 = 用原标题)。"""


@dataclass
class SalaryTextIn:
    """salary_text_of() 入参(薪资三格 → Job Bank 写法)。"""

    lo: str
    """低值 / 单值。"""

    hi: str
    """高值(空串 = 单值)。"""

    unit: str
    """schema.org 单位词。"""


@dataclass
class StoreTally:
    """build_jobillico_postings() 的计数器。"""

    rows: int
    """入仓行数。"""

    gone: int
    """事实表里有、站点地图这轮已不在列的帖数。"""

    expired: int
    """已过截止日的帖数。"""

    blank: int
    """无标题(解析残缺)的帖数。"""
