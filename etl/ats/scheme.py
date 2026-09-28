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
§4 自测(2026-09-26 /fe Frank「补」截止日批立):unittest 用例集 + HTTP 替身 ——「不用 class」的外部库例外,
先例 indexing.scheme / gate.scheme,跑法 `python etl/ats/main.py --only test`;被测的 ats.functions 在用例体内现取
(functions 反过来 import 本文件,顶部 import 会成环)。
2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」,§4 加两组:工时 / 雇佣期(AtsEmploymentTest)、薪资锚词(AtsSalaryTest)。
同日 §4 再加一组:BambooHR 发布日改从详情取(AtsBambooPostedTest,JSON 接口替身 JsonResponse / JsonClient)。
"""
import json
import tempfile
import unittest
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Protocol, cast
from unittest import mock


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

    valid_through: str = ""
    """截止日(YYYY-MM-DD):雇主招聘系统里明写的才有(Workday / SuccessFactors / Oracle / Recruitee / Greenhouse
    各有一格),其余空串 —— 不推算(2026-09-26 /fe Frank「补」)。"""

    employment_hours: str = ""
    """工时(full / part):职位页 JSON-LD 的 employmentType(Phenom 另读 workHours)认得出的才有,
    现只有自建 WordPress 站(Calian)与 Phenom(Sienna)两家读;认不出空串 —— 没标注 ≠ 兼职,不猜
    (2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」)。"""

    employment_term: str = ""
    """雇佣期(permanent / term / casual / seasonal):同上一格的来源与口径,认不出空串。"""


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
    """bamboo_detail() 出参:详情页给的描述与结构化薪资(取不到 = 两格空串)。
    2026-09-27 多一格发布日(清单行没有,改从详情取;取不到同样空串)。"""

    description: str
    """描述 HTML。"""

    compensation: str
    """结构化薪资文本。"""

    posted: str
    """发布日(YYYY-MM-DD,详情 jobOpening 的 datePosted 经 iso_of 归一;没有 = 空串)。"""


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
class JdMdScan:
    """回填件读一篇既有 .md 得到的一行(2026-09-13 汇装提速批 2(设计稿 docs/design/汇装提速-20260912.md §5;Frank「批2」);取不到 url 的 .md 不产此形)。"""

    url: str
    """frontmatter 的 url(索引键)。"""

    file: str
    """.md 相对 companies 目录的路径。"""

    mtime: str
    """文件修改时刻(ISO,UTC)。"""

    body: str
    """正文(去 frontmatter 原文)。"""


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


@dataclass
class EmploymentOut:
    """employment_of() 出参:职位页结构化标签归一出的工时与雇佣期(各自认不出为空串)。"""

    hours: str
    """工时:full / part / 空串。"""

    term: str
    """雇佣期:permanent / term / casual / seasonal / 空串。"""


@dataclass
class LabelHitIn:
    """label_hit_of() 入参:归一后的标签 + 一张短语表。"""

    labels: list
    """归一后的标签(小写、符号折空格、首尾各垫一个空格,短语按整词比)。"""

    table: dict
    """短语 → 值(EMPLOYMENT_HOURS_OF 或 EMPLOYMENT_TERM_OF)。"""


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


@dataclass
class PhenomFetchIn:
    """fetch_phenom() 入参:一家 Phenom 招聘站。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """招聘站地址(只用它的 origin 去拼站点地图)。"""

    company: str
    """公司文件夹名(crawl 层 slug 用)。"""


@dataclass
class SiteFetchIn:
    """fetch_site_jobs() 入参:一家逐页读职位页的招聘站。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """招聘站地址。"""

    company: str
    """公司文件夹名(crawl 层 slug 用)。"""

    ats: str
    """ATS 名(分派依据)。"""


@dataclass
class OrcFetchIn:
    """fetch_oracle() 入参:一家 Oracle 招聘云站点。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """入口地址(从里面认主机与站点号)。"""


@dataclass
class EfJobIn:
    """to_ef_job() 入参:清单行 + 详情 + 主机。"""

    row: dict
    """清单里的这一行。"""

    detail: dict
    """这一岗的详情载荷;取不到为空 dict。"""

    host: str
    """主机(拼公开页地址用)。"""


@dataclass
class OrcJobIn:
    """to_orc_job() 入参:清单行 + 详情 + 站点坐标。"""

    row: dict
    """清单里的这一行。"""

    detail: dict
    """这一岗的详情载荷;取不到为空 dict。"""

    host: str
    """主机。"""

    site: str
    """站点号。"""


@dataclass
class SfFetchIn:
    """fetch_successfactors() 入参:一家 SuccessFactors 招聘站。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    careers_url: str
    """招聘站地址(只用它的 origin 去拼搜索页)。"""

    company: str
    """公司文件夹名(crawl 层 slug 用)。"""


@dataclass
class SfJobIn:
    """to_sf_job() 入参:一个职位页。"""

    url: str
    """职位页地址。"""

    html: str
    """职位页原文。"""


@dataclass
class PhenomJobIn:
    """to_phenom_job() 入参:一个职位页。"""

    url: str
    """职位页地址。"""

    html: str
    """职位页原文。"""


# =========================================================================
# 4. 自测(用例住 scheme)
# =========================================================================


@dataclass
class FakeResponse:
    """HTTP 响应替身(HttpResponseLike 的两格)。"""

    text: str
    """正文。"""

    def json(self) -> object:
        """载荷(本组用例只读页面正文,不走 JSON)。"""
        return None


@dataclass
class FakeClient:
    """HTTP 替身:GET 按网址查 pages(查不到回空页),每次记进 asked;本组用例只走 GET。"""

    pages: dict[str, str]
    """网址 → 页面原文。"""

    asked: list[str] = field(default_factory=list)
    """GET 过的网址(按先后)。"""

    def get(self, url: str, headers: dict | None = None) -> FakeResponse:
        """GET(替身;headers 照库形状收下不用)。"""
        self.asked.append(url)
        return FakeResponse(text=self.pages.get(url, ""))


class AtsDeadlineTest(unittest.TestCase):
    """截止日抽取自测(2026-09-26 /fe Frank「补」同批):共享的截止日归一 / 五家行构造器各取自家那一格 / 落盘行带键 /
    SuccessFactors 缓存页过期判定与重取。形制照宪法判定层测试:穷举输入断言性质 + 手写金标(写法样例取自当天实测载荷),
    不做快照矩阵;全程不联网、不写仓内文件(认不出的写法会留痕,用例里把 err 换成替身并数它被叫了几次;
    缓存索引 / 缓存写门 / 清单翻页 / 礼貌间隔全换替身,缓存页落临时目录)。"""

    def sf_page(self, valid: str) -> str:
        """造一张 SuccessFactors 职位页:标题 + 发布时刻 + 截止时刻三格微数据(valid 给空串 = 页上没写截止)。"""
        meta = ""
        if valid != "":
            meta = '<meta itemprop="validThrough" content="' + valid + '">'
        return ('<div class="jobDisplayShell" itemscope="itemscope" itemtype="http://schema.org/JobPosting">'
                '<span itemprop="title">Senior Analyst</span>'
                '<meta itemprop="datePosted" content="Tue Sep 08 00:00:00 UTC 2026">' + meta + "</div>")

    def sf_stamp(self, offset: int) -> str:
        """今天往后 offset 天(负数往前)写成 SuccessFactors 的时刻写法(多伦多零点 = 04:00 UTC,与实测页同形)。"""
        return (date.today() + timedelta(days=offset)).strftime("%a %b %d 04:00:00 UTC %Y")

    def calendar_iso(self, raw: str) -> str:
        """独立对照尺:`YYYY-MM-DD` 在日历上真有这天就原样给回,否则空串(按年月日整数现造,不经被测函数)。"""
        parts = raw.split("-")
        try:
            return date(int(parts[0]), int(parts[1]), int(parts[2])).isoformat()
        except ValueError:
            return ""

    def test_deadline_golden(self) -> None:
        """截止日归一金标:纯日期 / 带时刻带时区 / 带空格 UTC / 首尾空白 / ISO 基本式 → 日期部分(不换时区);
        None 与空白静默给空;别的写法、日历上没有的日子 → 空串且每个都留痕。"""
        from ats import functions as fn
        quiet = [
            ("2026-09-30", "2026-09-30"),
            ("2026-10-01T03:59:00+00:00", "2026-10-01"),
            ("2026-10-15T23:59:59.000Z", "2026-10-15"),
            ("2026-09-24 14:15:22 UTC", "2026-09-24"),
            ("  2026-09-30  ", "2026-09-30"),
            ("20260930", "2026-09-30"),
            ("", ""),
            ("   ", ""),
            (None, ""),
        ]
        loud = ["Thu Oct 01 04:00:00 UTC 2026", "September 30, 2026", "2026/09/30", "2026-9-30", "30-09-2026",
                "2026-02-30", "2026-13-01", "2026-00-10", 1790453708000]
        with mock.patch.object(fn, "err") as spy:
            for raw, want in quiet:
                with self.subTest(raw=raw):
                    self.assertEqual(fn.deadline_of(raw), want)
            self.assertEqual(spy.call_count, 0)
            for bad in loud:
                with self.subTest(bad=bad):
                    self.assertEqual(fn.deadline_of(bad), "")
            self.assertEqual(spy.call_count, len(loud))

    def test_deadline_exhaustive(self) -> None:
        """穷举性质:2026–2027 每一天 × 四种写法都取回同一天;月 00–13 × 日 00–32 全组合里,日历上有这天才原样取回、
        没有就空串 —— 输出只有「空串」与「合法 YYYY-MM-DD」两种形。"""
        from ats import functions as fn
        day = date(2026, 1, 1)
        while day < date(2028, 1, 1):
            iso = day.isoformat()
            for raw in (iso, iso + "T00:00:00-04:00", iso + " 12:00:00 UTC", iso + "T23:59:59.000Z"):
                self.assertEqual(fn.deadline_of(raw), iso, raw)
            day = day + timedelta(days=1)
        with mock.patch.object(fn, "err"):
            for month in range(14):
                for dom in range(33):
                    raw = "2026-" + str(month).zfill(2) + "-" + str(dom).zfill(2)
                    self.assertEqual(fn.deadline_of(raw), self.calendar_iso(raw), raw)

    def test_adapters_golden(self) -> None:
        """五家行构造器金标:各取自家那一格(写法取自 2026-09-26 实测载荷);格子空 / 缺席 → 空串,不拿发布日之类的别的日子顶。"""
        from ats import functions as fn
        posting = {"title": "QNX Developer", "locationsText": "Ottawa, Ontario"}
        info = {"title": "QNX Developer", "startDate": "2026-09-13", "endDate": "2026-09-30"}
        self.assertEqual(fn.to_workday_job(WorkdayJobIn(posting=posting, info=info)).valid_through, "2026-09-30")
        no_end = {"title": "QNX Developer", "startDate": "2026-09-13"}
        self.assertEqual(fn.to_workday_job(WorkdayJobIn(posting=posting, info=no_end)).valid_through, "")
        self.assertEqual(fn.to_workday_job(WorkdayJobIn(posting=posting, info={})).valid_through, "")
        row = {"Id": "40266", "Title": "Engineer", "PostedDate": "2026-09-18", "PostingEndDate": "2026-10-05"}
        detail = {"ExternalPostedStartDate": "2026-09-18T13:41:47+00:00", "ExternalPostedEndDate": "2026-10-01T03:59:00+00:00"}
        self.assertEqual(fn.to_orc_job(OrcJobIn(row=row, detail=detail, host="h", site="CX_1")).valid_through, "2026-10-01")
        self.assertEqual(fn.to_orc_job(OrcJobIn(row=row, detail={}, host="h", site="CX_1")).valid_through, "2026-10-05")
        bare = {"Id": "40266", "Title": "Engineer", "PostedDate": "2026-09-18", "PostingEndDate": None}
        blank = {"ExternalPostedEndDate": None}
        self.assertEqual(fn.to_orc_job(OrcJobIn(row=bare, detail=blank, host="h", site="CX_1")).valid_through, "")
        offer = {"title": "Researcher", "created_at": "2026-09-24 14:15:22 UTC", "close_at": "2026-10-10 23:59:00 UTC"}
        self.assertEqual(fn.to_recruitee_job(offer).valid_through, "2026-10-10")
        self.assertEqual(fn.to_recruitee_job({"title": "Researcher", "close_at": None}).valid_through, "")
        gh = {"title": "Engineer", "updated_at": "2026-09-25T16:45:00-04:00", "application_deadline": "2026-10-15T23:59:59.000Z"}
        self.assertEqual(fn.to_greenhouse_job(gh).valid_through, "2026-10-15")
        self.assertEqual(fn.to_greenhouse_job({"title": "Engineer", "application_deadline": None}).valid_through, "")
        url = "https://careers.bankofcanada.ca/job/Ottawa-Analyst/1234/"
        cases = [("Thu Oct 01 04:00:00 UTC 2026", "2026-10-01"), ("Tue Dec 01 05:00:00 UTC 2026", "2026-12-01"),
                 ("Tue Oct 06 18:30:00 UTC 2026", "2026-10-06"), ("", ""), ("2026-10-01", "")]
        for valid, want in cases:
            with self.subTest(valid=valid):
                job = fn.to_sf_job(SfJobIn(url=url, html=self.sf_page(valid)))
                if job is None:
                    self.fail(valid)
                self.assertEqual(job.valid_through, want)
                self.assertEqual(job.posted, "2026-09-08")

    def test_job_row_carries_deadline(self) -> None:
        """落盘行:valid_through 键有值原样写、没有写空串(mart 那头 `or None` 不落列);description 照旧不进清单。"""
        from ats import functions as fn
        full = AtsJob(title="Dev", location="Ottawa, Ontario", url="https://x/job/1", department="", posted="2026-09-13",
                      address="", salary="", description="<p>body</p>", valid_through="2026-09-30")
        row = fn.to_job_row(full)
        self.assertEqual(row["valid_through"], "2026-09-30")
        self.assertNotIn("description", row)
        bare = AtsJob(title="Dev", location="Ottawa, Ontario", url="https://x/job/1", department="", posted="2026-09-13",
                      address="")
        self.assertEqual(fn.to_job_row(bare)["valid_through"], "")

    def test_sf_lapsed(self) -> None:
        """缓存页过期判定(口径同 seed:早于今天才算过,当天不算):穷举今天前后各 400 天,过期当且仅当偏移为负;
        没写截止 / 写法认不出 → 不算过期(不为认不出的页多打请求)。"""
        from ats import functions as fn
        for offset in range(-400, 401):
            self.assertEqual(fn.is_sf_lapsed(self.sf_page(self.sf_stamp(offset))), offset < 0, offset)
        self.assertFalse(fn.is_sf_lapsed(self.sf_page("")))
        self.assertFalse(fn.is_sf_lapsed(self.sf_page("2026-09-01")))

    def test_sf_refetch_only_lapsed(self) -> None:
        """清单三页 = 没缓存 / 缓存未过期 / 缓存已过期:只请求第一、三页,这两页回写缓存;已过期那页重取回来带着延后的
        新截止日(雇主延期)→ 落出的岗用新日子,不拿缓存里的旧日子误关。"""
        from ats import functions as fn
        urls = ["https://sf.example/job/a/1/", "https://sf.example/job/b/2/", "https://sf.example/job/c/3/"]
        later = self.sf_page(self.sf_stamp(10))
        client = FakeClient(pages={urls[0]: later, urls[2]: later})
        with tempfile.TemporaryDirectory() as tmp:
            fine = Path(tmp) / "fine.html"
            fine.write_text(self.sf_page(self.sf_stamp(3)), encoding="utf-8")
            lapsed = Path(tmp) / "lapsed.html"
            lapsed.write_text(self.sf_page(self.sf_stamp(-3)), encoding="utf-8")
            with mock.patch.object(fn, "sf_job_urls", return_value=urls), \
                    mock.patch.object(fn, "load_cache_index", return_value={urls[1]: fine, urls[2]: lapsed}), \
                    mock.patch.object(fn, "put_cached_pages") as put, mock.patch.object(fn.time, "sleep"):
                jobs = fn.fetch_successfactors(SfFetchIn(client=cast(HttpClientLike, client),
                                                         careers_url="https://sf.example/search/", company="acme"))
        self.assertEqual(client.asked, [urls[0], urls[2]])
        written: list[str] = []
        for page in put.call_args.args[0].pages:
            written.append(page.url)
        self.assertEqual(written, [urls[0], urls[2]])
        got: list[str] = []
        for job in jobs:
            got.append(job.valid_through)
        want = (date.today() + timedelta(days=10)).isoformat()
        self.assertEqual(got, [want, (date.today() + timedelta(days=3)).isoformat(), want])


class AtsEmploymentTest(unittest.TestCase):
    """工时 / 雇佣期抽取自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」):标签归一金标(写法取自当天 Calian / Sienna
    缓存页实测值 + schema.org 枚举)+ 枚举全子集穷举性质 + 两家行构造器从 JSON-LD 取值 + 落盘行带键。
    职位页按实测结构现造,不联网、不读仓内文件。"""

    def ld_page(self, node: dict) -> str:
        """造一张职位页:head 里一块 JSON-LD(node 原样序列化)。"""
        return ('<html><head><script type="application/ld+json">' + json.dumps(node, ensure_ascii=False)
                + "</script></head><body></body></html>")

    def test_employment_golden(self) -> None:
        """标签 → (工时, 雇佣期) 金标:Calian 自由文本、Sienna 枚举 + workHours、法语写法、一组标签里打架 = 空、
        认不出(Student / 错字 / INTERN 类 / 词中子串)= 空、缺席 = 空。"""
        from ats import functions as fn
        cases = [
            (["Full Time"], "full", ""),
            (["Part Time"], "part", ""),
            (["PART_TIME"], "part", ""),
            (["PART_TIME", "24 hours per week"], "part", ""),
            (["FULL_TIME", "40 hours per week"], "full", ""),
            (["TEMPORARY"], "", "term"),
            (["CONTRACTOR"], "", "term"),
            (["FULL_TIME", "TEMPORARY"], "full", "term"),
            (["PER_DIEM"], "", "casual"),
            (["SEASONAL"], "", "seasonal"),
            (["Casual"], "", "casual"),
            (["Contract"], "", "term"),
            (["Permanent Full Time"], "full", "permanent"),
            (["Full-time, contract"], "full", "term"),
            (["Full-Time, 1 year contract (renewable)"], "full", "term"),
            (["Full-time, Casual"], "full", "casual"),
            (["Temps Plein"], "full", ""),
            (["Temps-partiel"], "part", ""),
            (["Occasionnel"], "", "casual"),
            (["Full-time or Part-time"], "", ""),
            (["Full-time and Part-time"], "", ""),
            (["Casual, Part-time, or Full-time"], "", "casual"),
            (["FULL_TIME", "Part time"], "", ""),
            (["TEMPORARY", "PER_DIEM"], "", ""),
            (["INTERN"], "", ""),
            (["VOLUNTEER"], "", ""),
            (["OTHER"], "", ""),
            (["Student"], "", ""),
            (["Full-tiime"], "", ""),
            (["Subcontractor"], "", ""),
            (["24 hours per week"], "", ""),
            ([], "", ""),
        ]
        for labels, hours, term in cases:
            with self.subTest(labels=labels):
                got = fn.employment_of(labels)
                self.assertEqual((got.hours, got.term), (hours, term))

    def test_employment_enum_subsets(self) -> None:
        """穷举性质:schema.org 八个枚举 + SEASONAL 的全部 512 个子集 × 正反两种顺序 —— 工时 = FULL_TIME / PART_TIME 恰好在一个时取它,
        否则空;雇佣期 = 子集映射出的雇佣期值恰好一种时取它,否则空(INTERN / VOLUNTEER / OTHER 不映射);与顺序无关。
        对照尺在用例里独立现写,不经被测函数的短语表。"""
        from ats import functions as fn
        enums = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "VOLUNTEER", "PER_DIEM", "OTHER", "SEASONAL"]
        term_of = {"CONTRACTOR": "term", "TEMPORARY": "term", "PER_DIEM": "casual", "SEASONAL": "seasonal"}
        for mask in range(1 << len(enums)):
            picked: list[str] = []
            for i in range(len(enums)):
                if mask >> i & 1:
                    picked.append(enums[i])
            hours = ""
            if "FULL_TIME" in picked and "PART_TIME" not in picked:
                hours = "full"
            if "PART_TIME" in picked and "FULL_TIME" not in picked:
                hours = "part"
            terms: set[str] = set()
            for name in picked:
                if name in term_of:
                    terms.add(term_of[name])
            term = ""
            if len(terms) == 1:
                term = terms.pop()
            for order in (picked, picked[::-1]):
                got = fn.employment_of(order)
                self.assertEqual((got.hours, got.term), (hours, term), order)

    def test_ld_labels_shapes(self) -> None:
        """JSON-LD 标签格的形状:串 → 一个;串数组 → 逐个(非串元素跳过);缺席 / 数字 / 对象 → 空清单。"""
        from ats import functions as fn
        self.assertEqual(fn.ld_labels_of("Full Time"), ["Full Time"])
        self.assertEqual(fn.ld_labels_of(["PART_TIME", "TEMPORARY"]), ["PART_TIME", "TEMPORARY"])
        self.assertEqual(fn.ld_labels_of(["FULL_TIME", 3, None, {"x": 1}]), ["FULL_TIME"])
        self.assertEqual(fn.ld_labels_of(None), [])
        self.assertEqual(fn.ld_labels_of(40), [])
        self.assertEqual(fn.ld_labels_of({"@type": "DefinedTerm"}), [])

    def test_adapters_employment(self) -> None:
        """两家行构造器从 JSON-LD 取值(结构照 2026-09-27 缓存页):Calian 的 JobPosting 包在 @graph 里、写自由文本「Full Time」;
        Sienna 顶层 JobPosting、枚举数组 + workHours;Sienna 标题里的「Temporary」不算(只读结构化标签);两格都缺 → 空串。"""
        from ats import functions as fn
        place = {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": "Ottawa", "addressRegion": "ON"}}
        calian = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "name": "Careers"},
            {"@type": "JobPosting", "title": "Physics Resource - Specialist", "datePosted": "2026-09-18 12:14:13",
             "employmentType": "Full Time", "jobLocation": [place], "description": "<p>Role</p>"}]}
        job = fn.to_wp_job(PhenomJobIn(url="https://careers.calian.com/careers/df-physics-resource-specialist-58285/",
                                       html=self.ld_page(calian)))
        if job is None:
            self.fail("calian")
        self.assertEqual((job.employment_hours, job.employment_term), ("full", ""))
        url = "https://careers.siennaliving.ca/job/SILICACOOKT078826EXTERNALENCA/Cook-Temporary-Part-Time-6am-to-2pm"
        sienna = {"@type": "JobPosting", "@context": "http://schema.org", "title": "Cook - Temporary Part Time - 6am to 2pm",
                  "datePosted": "2026-09-14", "employmentType": ["PART_TIME"], "workHours": "24 hours per week",
                  "jobLocation": place, "description": "&lt;p&gt;Role&lt;/p&gt;"}
        temp = dict(sienna)
        temp["employmentType"] = ["FULL_TIME", "TEMPORARY"]
        bare = dict(sienna)
        del bare["employmentType"]
        del bare["workHours"]
        cases = [(sienna, ("part", "")), (temp, ("full", "term")), (bare, ("", ""))]
        for node, want in cases:
            with self.subTest(want=want):
                job = fn.to_phenom_job(PhenomJobIn(url=url, html=self.ld_page(node)))
                if job is None:
                    self.fail(url)
                self.assertEqual((job.employment_hours, job.employment_term), want)
                self.assertEqual(job.location, "Ottawa, ON")

    def test_job_row_carries_employment(self) -> None:
        """落盘行:employment_hours / employment_term 两键有值原样写、没有写空串(与 valid_through 同理人人都有)。"""
        from ats import functions as fn
        full = AtsJob(title="Cook", location="Ottawa, ON", url="https://x/job/1", department="", posted="2026-09-14",
                      address="", employment_hours="part", employment_term="term")
        row = fn.to_job_row(full)
        self.assertEqual((row["employment_hours"], row["employment_term"]), ("part", "term"))
        bare = AtsJob(title="Cook", location="Ottawa, ON", url="https://x/job/1", department="", posted="2026-09-14",
                      address="")
        row = fn.to_job_row(bare)
        self.assertEqual((row["employment_hours"], row["employment_term"]), ("", ""))


class AtsSalaryTest(unittest.TestCase):
    """薪资锚词自测(2026-09-27 Frank 勾「ATS 工时、雇佣期、薪资和小修」):两个新锚词的正例(写法取自 Bank of Canada / Sienna 的
    .md 实文)+ 不该认的反例(奖金、报销上限、营收、预算、奖学金 —— 离锚词再近也不认)+ 正反拼接性质 + 老锚词回归。
    全程只喂字符串,不读仓内文件。"""

    positives = [
        ("• • Salaries are based on qualifications and experience and typically range from $126,765 to $149,135 (job grade 18)",
         "$126,765 to $149,135"),
        ("Rate of Pay: $24.55 (as per collective agreement)", "$24.55"),
        ("Rate of Pay: $55,451.00 - $69,314.00", "$55,451.00 - $69,314.00"),
        ("Rate of Pay $23.00 - $25.00 per hour", "$23.00 - $25.00 per hour"),
        ("Rate of Pay: Min $20.50", "$20.50"),
        ("Rate of Pay: starting at $22.40", "$22.40"),
        ("Rate of Pay:</strong> $24.00", "$24.00"),
        ("Rate of Pay: &lt;/span&gt;&lt;strong&gt;$24.00", "$24.00"),
    ]
    """正例(原文, 应抽出的薪资串):Bank of Canada 一条 + Sienna 七种胶水写法。"""

    negatives = [
        "We offer competitive salaries and a $2,500 signing bonus.",
        "Rate of pay: competitive, plus a $1,000 signing bonus",
        "Rate of pay: as per collective agreement. Referral bonus of $500 for eligible staff.",
        "Rate of pay: as per collective agreement. Tuition reimbursement up to $5,000.",
        "Annual revenues range from $10 million to $50 million.",
        "Salaries and benefits make up most of our $40 million budget.",
        "Salaries are reviewed yearly. Revenue ranges from $5 to $9 million.",
        "These $10,000 CAD scholarships are awarded to female identifying candidates specializing in economics and finance.",
    ]
    """反例(都该抽出空串):奖金、报销上限、营收、预算、奖学金;最后一条是 Bank of Canada 在架帖原文。"""

    def test_new_anchors_golden(self) -> None:
        """两个新锚词金标:「Salaries … range from」与「Rate of Pay」后跟冒号 / 空格 / Min / starting at / 标签残留。"""
        from ats import functions as fn
        for text, want in self.positives:
            with self.subTest(text=text):
                self.assertEqual(fn.salary_of(text), want)

    def test_non_salary_amounts(self) -> None:
        """反例一律空串。"""
        from ats import functions as fn
        for text in self.negatives:
            with self.subTest(text=text):
                self.assertEqual(fn.salary_of(text), "")

    def test_negatives_never_steal(self) -> None:
        """拼接性质:每条反例放在每条正例前面或后面(换行隔开),抽出的都还是正例那份薪资 —— 非薪资金额抢不走锚定。"""
        from ats import functions as fn
        for text, want in self.positives:
            for noise in self.negatives:
                with self.subTest(text=text, noise=noise):
                    self.assertEqual(fn.salary_of(noise + "\n" + text), want)
                    self.assertEqual(fn.salary_of(text + "\n" + noise), want)

    def test_old_anchors_unchanged(self) -> None:
        """老锚词回归:salary range、compensation 长前缀、兜底带单位金额照旧;一个金额都没有给空串。"""
        from ats import functions as fn
        cases = [
            ("Salary range: $80,000 - $100,000 annually", "$80,000 - $100,000 annually"),
            ("Total compensation (based on 2,080 hours per year) ranges from $52,000 to $60,000", "$52,000 to $60,000"),
            ("Hourly wage $19.50 per hour, weekends", "$19.50 per hour"),
            ("No numbers here", ""),
        ]
        for text, want in cases:
            with self.subTest(text=text):
                self.assertEqual(fn.salary_of(text), want)


@dataclass
class JsonResponse:
    """JSON 响应替身(HttpResponseLike 的两格;BambooHR 清单 / 详情两个接口只读载荷)。"""

    payload: object
    """载荷原样。"""

    text: str = ""
    """正文(本组用例不读)。"""

    def json(self) -> object:
        """载荷。"""
        return self.payload


@dataclass
class JsonClient:
    """HTTP 替身:GET 按网址先查 errors(抛那个异常)、再查 payloads 回 JSON 载荷;每次记进 asked。本组用例只走 GET。"""

    payloads: dict[str, object]
    """网址 → 载荷。"""

    errors: dict[str, Exception] = field(default_factory=dict)
    """网址 → GET 时抛的异常。"""

    asked: list[str] = field(default_factory=list)
    """GET 过的网址(按先后)。"""

    def get(self, url: str, headers: dict | None = None) -> JsonResponse:
        """GET(替身;headers 照库形状收下不用)。"""
        self.asked.append(url)
        if url in self.errors:
            raise self.errors[url]
        return JsonResponse(payload=self.payloads.get(url))


class AtsBambooPostedTest(unittest.TestCase):
    """BambooHR 发布日改从详情取自测(2026-09-27;清单行没有 datePosted,立域以来 BambooHR 岗发布日全是空串):
    清单 + 详情两个接口换替身 —— 载荷结构照 BambooHR 公开 careers 接口手写(清单行只有岗位号 / 名 / 部门 / 地点,
    详情 result.jobOpening 带描述 / 薪资 / datePosted;⚠ datePosted 这一格没拿实测载荷核过,本批不许对 BambooHR 发请求),
    地点与岗位号取自 processed 里真有的一家(Giatec)。断言:发布日取详情那一格、请求数不变(一个清单 + 每岗一个详情)、
    日期写法金标、详情取不到时三格空串且留痕。全程不联网、不读写仓内文件。"""

    def test_posted_from_detail(self) -> None:
        """清单行没有发布日、详情里有:发布日取详情那一格;描述 / 薪资照旧取详情;请求 = 一个清单 + 每岗一个详情(不多发)。"""
        from ats import functions as fn
        list_url = "https://giatecscientific.bamboohr.com/careers/list"
        d292 = "https://giatecscientific.bamboohr.com/careers/292/detail"
        d167 = "https://giatecscientific.bamboohr.com/careers/167/detail"
        rows = [{"id": "292", "jobOpeningName": "IT Operations Lead",
                 "departmentLabel": "Software Development - SmartMix", "employmentStatusLabel": "Full-Time",
                 "location": {"city": "Ottawa", "state": "Ontario"}},
                {"id": "167", "jobOpeningName": "Talent Community @ Giatec", "departmentLabel": None,
                 "location": {"city": "Ottawa", "state": "Ontario"}}]
        client = JsonClient(payloads={
            list_url: {"meta": {"totalCount": 2}, "result": rows},
            d292: {"result": {"jobOpening": {"jobOpeningName": "IT Operations Lead", "datePosted": "2026-09-15",
                                             "description": "<p>Run IT operations.</p>", "compensation": " $90,000 "}}},
            d167: {"result": {"jobOpening": {"jobOpeningName": "Talent Community @ Giatec", "datePosted": "2025-11-03",
                                             "description": "<p>Join us.</p>", "compensation": None}}},
        })
        jobs = fn.bamboohr_jobs(AtsFetchIn(client=cast(HttpClientLike, client), ats="bamboohr",
                                           token="giatecscientific"))
        self.assertEqual(client.asked, [list_url, d292, d167])
        got: list[tuple] = []
        for job in jobs:
            got.append((job.title, job.location, job.posted, job.salary, job.url))
        self.assertEqual(got, [
            ("IT Operations Lead", "Ottawa, Ontario", "2026-09-15", "$90,000",
             "https://giatecscientific.bamboohr.com/careers/292"),
            ("Talent Community @ Giatec", "Ottawa, Ontario", "2025-11-03", "",
             "https://giatecscientific.bamboohr.com/careers/167"),
        ])
        self.assertEqual(fn.to_job_row(jobs[0])["posted"], "2026-09-15")

    def test_posted_shapes(self) -> None:
        """详情 datePosted 的写法:纯日期 / 带时刻带时区 → 日期部分;缺席 / None / 空串 / 详情体为空 → 空串(不拿别的日子顶)。"""
        from ats import functions as fn
        url = "https://acme.bamboohr.com/careers/7/detail"
        cases = [("2026-09-15", "2026-09-15"), ("2026-09-15T13:02:11-04:00", "2026-09-15"), ("", "")]
        for raw, want in cases:
            with self.subTest(raw=raw):
                opening = {"description": "<p>x</p>", "datePosted": raw}
                client = JsonClient(payloads={url: {"result": {"jobOpening": opening}}})
                self.assertEqual(fn.bamboo_detail(DetailIn(client=cast(HttpClientLike, client), token="acme",
                                                           job_id="7")).posted, want)
        bare = [{"result": {"jobOpening": {"description": "<p>x</p>"}}},
                {"result": {"jobOpening": {"datePosted": None}}},
                {"result": {"jobOpening": None}}, {"result": None}]
        for payload in bare:
            with self.subTest(payload=payload):
                client = JsonClient(payloads={url: payload})
                self.assertEqual(fn.bamboo_detail(DetailIn(client=cast(HttpClientLike, client), token="acme",
                                                           job_id="7")).posted, "")

    def test_detail_unreachable(self) -> None:
        """详情取不到(抛错):这一岗照收,发布日 / 描述 / 薪资三格空串,留痕一次(不静默)。"""
        from ats import functions as fn
        list_url = "https://acme.bamboohr.com/careers/list"
        detail = "https://acme.bamboohr.com/careers/7/detail"
        row = {"id": "7", "jobOpeningName": "Dev", "location": "Remote"}
        client = JsonClient(payloads={list_url: {"result": [row]}}, errors={detail: RuntimeError("boom")})
        with mock.patch.object(fn, "err") as spy:
            jobs = fn.bamboohr_jobs(AtsFetchIn(client=cast(HttpClientLike, client), ats="bamboohr", token="acme"))
        self.assertEqual(spy.call_count, 1)
        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual((job.posted, job.description, job.salary, job.location), ("", "", "", "Remote"))
