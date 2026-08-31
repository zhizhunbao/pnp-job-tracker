"""
ats 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 company/scheme.py 与 ee/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types,域目录=脚本
sys.path[0] 时 httpx/bs4 内部 import types 当场炸)。
本域形状三档:
① **职位行 AtsJob** = dataclass —— 六家 ATS 各自的载荷经 to_* 行构造器归一成同一形状,
  「字段键从 functions 消失」(方言律⑩);落 jobs.json 时由 to_job_row 转回 wire 字典;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— httpx 客户端/响应只声明本域真用的格(HttpClientLike 先例);
  Pyrefly 对 Protocol 实参判定保守,装配点用 typing.cast 喂真客户端(断言只住装配点)。
方法签名按「本域怎么调」收窄,默认值是库形状特批(cms「库定死签名的除外」同律)。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


# =========================================================================
# 1. 共享词汇(HTTP 库形状)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的两格。"""

    text: str
    """响应体文本(careers 页 HTML)。"""

    def json(self) -> object:
        """载荷解析;真身是 dict 还是 list 按各家 ATS 而定,收窄住 json_obj/json_rows 两个装配点。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的两个方法(GET 各家公开 JSON,POST Workday cxs 翻页)。"""

    def get(self, url: str, headers: dict | None = None) -> HttpResponseLike:
        """GET 一个 URL;Workday 详情要带 Accept 头。"""
        ...

    def post(self, url: str, headers: dict | None = None,
             json: dict | None = None) -> HttpResponseLike:
        """POST 一个 JSON 体(Workday cxs 翻页只认 POST)。"""
        ...


# =========================================================================
# 2. ATS 抓岗
# =========================================================================


@dataclass
class AtsJob:
    """一个第一方职位(六家 ATS + Workday 归一后的同一形状)。

    默认值是形状语义(某家 ATS 给不出这格就是空),不违「函数禁默认参」。
    """

    title: str
    """职位标题。"""

    location: str
    """地点文本(各家原文)。"""

    url: str
    """帖子公开页地址。"""

    department: str
    """部门/团队;给不出为空串。"""

    posted: str
    """发布日(YYYY-MM-DD;解析不出为空串)。"""

    address: str
    """从描述里抽到的街道地址;抽不到为空串。"""

    salary: str = ""
    """ATS 结构化薪资文本;只有 lever/bamboohr 给,其余空串留给薪资抽取段补。"""

    description: str = ""
    """完整描述 —— 只进 .md,不进 jobs.json。"""

    tech: bool = False
    """标题命中科技岗判据(抓完统一打标)。"""


@dataclass
class TokenIn:
    """ats_token() 入参:从 careers 页 HTML 认 board token。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """该公司的招聘页地址。"""

    ats: str
    """ATS 名(决定用哪条正则)。"""


@dataclass
class AtsFetchIn:
    """六家 ATS 取岗的公共入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    ats: str
    """ATS 名(分派用)。"""

    token: str
    """该公司在 ATS 上的 board token。"""


@dataclass
class AtsFetchOut:
    """fetch_ats_jobs() 出参:职位清单 + 「这家炸没炸」。

    原脚本出错时返回 `{"error": …}` 混在职位清单的位置上,靠 isinstance(dict) 认 ——
    2026-08-31 批I 拆成两格:炸了跳过这家,**空清单不等于炸**(照旧要写空的 jobs.json)。
    """

    jobs: list
    """归一后的 AtsJob 清单。"""

    failed: bool
    """True = 这家抓炸了(跳过,不落盘);False = 正常(清单可能为空)。"""


@dataclass
class CompanyIn:
    """scrape_company() 入参:一家公司一轮。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    folder: Path
    """该公司的档案目录。"""


@dataclass
class CompanyOut:
    """scrape_company() 出参:这家的三种下场(照原脚本逐字保留)。"""

    scraped: bool
    """产出了职位清单(不管几条)。"""

    skipped: bool
    """记进跳过计数(ATS 不支持 / 认不出 token / 抓炸 / Workday 零命中);
    没有 careers.json 或 ats 为空的两种,原脚本连跳过都不记 —— 两格都 False。"""

    tech: int
    """本家科技岗数。"""


@dataclass
class DetailIn:
    """逐岗取详情的入参(bamboohr / smartrecruiters 两家都要二次请求)。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    token: str
    """board token。"""

    job_id: str
    """岗位号。"""


@dataclass
class BambooJobIn:
    """to_bamboo_job() 入参:清单行 + 二次请求拿到的详情。"""

    row: dict
    """清单里的一行原始载荷。"""

    detail: "BambooDetail"
    """详情页给的描述与结构化薪资。"""

    token: str
    """board token(拼公开页地址用)。"""

    job_id: str
    """岗位号(同上)。"""


@dataclass
class SmartJobIn:
    """to_smart_job() 入参:清单行 + 二次请求拼好的描述。"""

    row: dict
    """清单里的一行原始载荷。"""

    description: str
    """jobAd 四段拼成的描述。"""

    token: str
    """board token(拼公开页地址用)。"""

    job_id: str
    """岗位号(同上)。"""


@dataclass
class BambooDetail:
    """bamboo_detail() 出参:详情页给的描述与结构化薪资(取不到 = 两格空串)。"""

    description: str
    """描述 HTML。"""

    compensation: str
    """结构化薪资文本。"""


@dataclass
class WorkdayTarget:
    """一个 Workday 站点(从 careers 页 HTML 发现)。"""

    host: str
    """站点域名(<tenant>.wdN.myworkdayjobs.com)。"""

    tenant: str
    """租户名(子域第一段)。"""

    site: str
    """站点路径名(主站 / 学生站等)。"""


@dataclass
class WorkdayFindIn:
    """workday_targets() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """该公司的招聘页地址。"""


@dataclass
class WorkdayFetchIn:
    """fetch_workday() 入参:一家公司的全部 Workday 站点。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    targets: list
    """WorkdayTarget 清单。"""


@dataclass
class WorkdaySiteIn:
    """workday_site_jobs() 入参:单个站点翻页 + 跨站点去重集。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    target: WorkdayTarget
    """本站点。"""

    seen: set
    """已收的 externalPath(跨站点共用,同一岗只收一次)。"""


@dataclass
class WorkdayPageIn:
    """workday_page_jobs() 入参:一页 cxs 结果 + 本站点前缀。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    base: str
    """本站点的 cxs 端点前缀。"""

    postings: list
    """本页职位(原始载荷 dict)。"""

    seen: set
    """跨站点去重集。"""


@dataclass
class WorkdayDetailIn:
    """workday_detail() 入参:一岗的 cxs 详情。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    base: str
    """本站点的 cxs 端点前缀。"""

    path: str
    """该岗的 externalPath。"""


@dataclass
class WorkdayJobIn:
    """to_workday_job() 入参:翻页行 + 详情体(详情取不到时是空 dict)。"""

    posting: dict
    """翻页里的一行原始载荷。"""

    info: dict
    """jobPostingInfo 详情体。"""


@dataclass
class WriteJobsIn:
    """write_company_jobs() 入参:把一家公司这轮抓到的岗落盘(jobs.json + jobs/*.md)。"""

    folder: Path
    """该公司的档案目录。"""

    ats: str
    """ATS 名(写进 jobs.json 与 .md frontmatter)。"""

    token: str
    """board token(写进 jobs.json)。"""

    jobs: list
    """AtsJob 清单。"""


@dataclass
class ScrapeTally:
    """抓岗一轮的计数(原 summary/skipped 两个明细清单只被 len()/sum() 消费,
    2026-08-31 批I 简化优先于收编:整清单退役,只留收尾那行真正用到的三个数)。"""

    companies: int
    """成功产出职位清单的公司数。"""

    tech: int
    """科技岗总数。"""

    skipped: int
    """跳过的公司数(ATS 不支持 / 认不出 token / 抓炸 / Workday 零命中)。"""


# =========================================================================
# 3. ATS 薪资抽取
# =========================================================================


@dataclass
class FillIn:
    """fill_company_salaries() 入参:一家公司的 jobs.json + 全域的 url → .md 索引。"""

    jobs_json: Path
    """该公司的职位清单文件(就地写回)。"""

    index: dict
    """url → 职位详情 .md 路径。"""


@dataclass
class SalaryTally:
    """抽薪资的计数(整轮收尾那行的两个数,也是单家公司的小计)。"""

    total: int
    """扫过的职位数。"""

    updated: int
    """补上薪资的职位数。"""
