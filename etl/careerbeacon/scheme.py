"""
careerbeacon 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 jobillico/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 详情页 ld+json JobPosting 经 to_job_fact 归一;落 raw jobs.json
  时由 asdict 转回 wire 字典,建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— httpx 客户端/响应只声明本域真用的格;装配点用 typing.cast 喂真客户端。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
§6 自测(2026-09-27 门迁 door 叶同批立):unittest 用例集 + HTTP 替身 ——「不用 class」的外部库例外,先例 gcjobs / ats / door.scheme,
跑法 `python etl/careerbeacon/main.py --only test`;被测的 careerbeacon.functions 与 door 叶在用例体内现取
(functions 反过来 import 本文件,顶部 import 会成环)。

@author Frank
@time 2026-09-11
"""
import json
import tempfile
import unittest
from contextlib import ExitStack, nullcontext
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Protocol
from unittest import mock


# =========================================================================
# 1. 共享词汇(HTTP 库形状)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的两格。"""

    text: str
    """响应体文本(列表页 / 详情页 HTML)。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错(单页失败按跳过留痕)。
        2026-09-27 起只有详情页照旧跳过;列表页失败改抛错停轮(枚举不全不落盘,见 functions.collect_province_urls)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的一门。"""

    def get(self, url: str) -> HttpResponseLike:
        """GET 一发(超时挂在客户端上,不逐次传)。"""
        ...


# =========================================================================
# 2. 省列表页枚举
# =========================================================================


@dataclass
class ProvinceIn:
    """collect_province_urls() 入参(一个省的列表页:分页取回并缓存 → 帖号 → URL)。"""

    client: HttpClientLike
    """已构造的客户端。"""

    slug: str
    """列表页 slug(nova-scotia / new-brunswick / …)。"""


@dataclass
class ProvinceOut:
    """collect_province_urls() 出参。"""

    urls: dict
    """该省枚举到的 帖号 → 详情 URL。"""

    pages: int
    """成功取回的列表页数。"""


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
    """帖号(详情 URL 的 /en/job/ 后第一段)。"""

    url: str
    """详情 URL(已切掉 utm 查询串)。"""

    title: str
    """职位标题。"""

    employer: str
    """雇主名(hiringOrganization.name)。"""

    employer_url: str
    """雇主块给的公司页地址(本站多数不给)。"""

    city: str
    """城市。"""

    province: str
    """省码。"""

    postal: str
    """邮编。"""

    street: str
    """街道地址(本站多数不给)。"""

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

    data: dict
    """ld+json 解出的 JobPosting 字典。"""


@dataclass
class ParseIn:
    """parse_details() 入参(2026-09-20 立:解析步分「例行增量」与「换解析器后全量重来」两档)。"""

    force: bool
    """True = 事实表里已有的帖也重解析并覆盖(手动件 `--only reparse`);False = 例行增量,见了帖号就跳过。"""


@dataclass
class ParseTally:
    """parse_careerbeacon_details() 的计数器。"""

    parsed: int
    """本轮新解析的页数。"""

    skipped: int
    """已解析过跳过的页数。"""

    missing: int
    """缓存里有页但页上没有 JobPosting 块的数。"""


# =========================================================================
# 5. postings 仓
# =========================================================================


@dataclass
class PostingRowIn:
    """to_posting_row() 入参(一条事实 + 本轮时刻)。"""

    fact: JobFact
    """归一后的事实。"""

    seen_at: str
    """本轮建仓时刻(ISO Z)。"""


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
    """build_careerbeacon_postings() 的计数器。"""

    rows: int
    """入仓行数。"""

    gone: int
    """事实表里有、本轮枚举已不在列的帖数。"""

    expired: int
    """已过截止日的帖数。"""

    blank: int
    """无标题(解析残缺)的帖数。"""


# =========================================================================
# 6. 自测(用例住 scheme)
# =========================================================================


@dataclass
class FakeResponse:
    """HTTP 响应替身(HttpResponseLike 的两格;状态码 ≥ 400 时 raise_for_status 抛,形同 httpx)。"""

    text: str
    """正文。"""

    status: int
    """状态码。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错(替身抛 RuntimeError 带状态码),否则回自己。"""
        if self.status >= 400:
            raise RuntimeError("HTTP " + str(self.status))
        return self


@dataclass
class FakeClient:
    """HTTP 替身:GET 按网址查 pages 回 200;网址在 down 里就直接抛(断网 / 超时的形);都不在回 404。"""

    pages: dict
    """网址 → 页面原文。"""

    down: set = field(default_factory=set)
    """一 GET 就抛网络错的网址。"""

    def get(self, url: str) -> FakeResponse:
        """GET(替身)。"""
        if url in self.down:
            raise ConnectionError("fake network down: " + url)
        if url in self.pages:
            return FakeResponse(text=self.pages[url], status=200)
        return FakeResponse(text="", status=404)


class CareerbeaconEnumGuardTest(unittest.TestCase):
    """「枚举失败 → 不出快照 / 不下架」自测(2026-09-27 门迁 door 叶同批立)。

    假站两省:NS 两页(101~103 / 104~105)、PE 一页(201~202);上一轮板仓 = 这 7 帖在架 + 3 帖(901~903)此刻已过截止日。
    把真枚举步与真建仓步按门的顺序接进 door.run_steps 跑:单页取不到(404 / 断网)、省首页回拦截页、分页器只剩首页(漏两成以上)
    三种坏法,门都返回 1、建仓不跑,枚举表与板仓一个字节不变 —— mart / seed 读到的还是上一版,没枚举到的帖不会被下架;
    齐全的一轮与只少一帖(一成四,正常撤帖)的一轮放行,两步都跑、板仓照新枚举重写(阳性对照:证明用例看得见建仓)。
    上一版里过了截止日的 3 帖本轮不在枚举里(占上一版三成)也放行:它们本就该出仓,不算漏。
    全程不联网、不写仓内文件:网络换替身,枚举表 / 事实表 / 板仓指到临时目录,crawl 写门、仓锁、礼貌间隔换替身。"""

    live = ["101", "102", "103", "104", "105", "201", "202"]
    """上一轮板仓里在架的 7 帖。"""

    expired = ["901", "902", "903"]
    """上一轮板仓里此刻已过截止日的 3 帖(本轮不在枚举里是正常出仓)。"""

    def url_of(self, slug: str, n: int) -> str:
        """省列表页第 n 页的网址(走被测模块的模板)。"""
        from careerbeacon.constants import LIST_URL_TPL
        return LIST_URL_TPL.format(slug=slug, n=n)

    def list_page(self, pids: list, last: int) -> str:
        """一张列表页:给定帖的岗链(带 utm 查询串,照实测)+ 分页链接(last > 1 时带到末页的页号链)。"""
        html = "<html><body>"
        for pid in pids:
            html += '<a href="https://www.careerbeacon.com/en/job/' + pid + '/acme/developer/halifax-ns?utm_source=cb">x</a>'
        if last > 1:
            html += '<a href="?page=' + str(last) + '">' + str(last) + "</a>"
        return html + "</body></html>"

    def site(self) -> dict:
        """齐全的假站:网址 → 页面原文(NS 首页带到第 2 页的分页链接)。"""
        return {
            self.url_of("nova-scotia", 1): self.list_page(["101", "102", "103"], 2),
            self.url_of("nova-scotia", 2): self.list_page(["104", "105"], 1),
            self.url_of("prince-edward-island", 1): self.list_page(["201", "202"], 1),
        }

    def site_without(self, url: str) -> dict:
        """齐全假站去掉一张页(那张页 GET 回 404)。"""
        out: dict = {}
        for k, v in self.site().items():
            if k != url:
                out[k] = v
        return out

    def fact(self, pid: str, until: str) -> dict:
        """事实表里的一帖(建仓段按它出行;截止日 until)。"""
        return asdict(JobFact(
            posting_id=pid, url="https://www.careerbeacon.com/en/job/" + pid + "/acme/developer/halifax-ns",
            title="Developer " + pid, employer="Acme", employer_url="", city="Halifax", province="NS", postal="",
            street="", country="CA", date_posted="2026-09-20", valid_through=until, salary_lo="", salary_hi="",
            salary_unit="", employment_types=[], industry="", description="",
        ))

    def seed_files(self, tmp: Path) -> None:
        """临时目录里铺上一轮的三份文件:枚举表 10 帖、事实表 10 帖 + 本轮新帖 106、板仓 10 行(3 行此刻已过截止日)。"""
        urls: dict = {}
        facts: dict = {}
        rows: list = []
        for pid in self.live:
            facts[pid] = self.fact(pid, "2099-12-31")
        for pid in self.expired:
            facts[pid] = self.fact(pid, "2000-01-01")
        facts["106"] = self.fact("106", "2099-12-31")
        for pid in self.live + self.expired:
            urls[pid] = facts[pid]["url"]
            rows.append({"posting_id": pid, "title": facts[pid]["title"], "valid_through": facts[pid]["valid_through"]})
        (tmp / "urls.json").write_text(json.dumps(urls), encoding="utf-8")
        (tmp / "jobs.json").write_text(json.dumps(facts), encoding="utf-8")
        (tmp / "postings.json").write_text(json.dumps(rows), encoding="utf-8")

    def files_of(self, tmp: Path) -> dict:
        """三份文件的原文(文件名 → 文本)。"""
        out: dict = {}
        for name in ("urls.json", "jobs.json", "postings.json"):
            out[name] = (tmp / name).read_text(encoding="utf-8")
        return out

    def round_of(self, client: FakeClient) -> tuple:
        """铺好上一轮文件,在替身沙箱里按门的顺序跑「枚举 → 建仓」两步;返回 (门的返回码, 跑前三份文件, 跑后三份文件)。"""
        from careerbeacon import functions as fn
        from door import functions as door
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            self.seed_files(tmp)
            before = self.files_of(tmp)
            with ExitStack() as stack:
                for name in ("OUT_URLS", "IN_URLS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "urls.json"))
                stack.enter_context(mock.patch.object(fn, "IN_JOBS", tmp / "jobs.json"))
                for name in ("OUT_POSTINGS", "IN_POSTINGS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "postings.json"))
                stack.enter_context(mock.patch.object(fn, "PROV_OF_SLUG", {"nova-scotia": "NS", "prince-edward-island": "PE"}))
                stack.enter_context(mock.patch.object(fn, "make_client", return_value=nullcontext(client)))
                stack.enter_context(mock.patch.object(fn, "put_cached_pages"))
                stack.enter_context(mock.patch.object(fn, "LIST_SLEEP_S", 0))
                stack.enter_context(mock.patch.object(fn, "jobbank_store_lock", return_value=nullcontext()))
                code = door.run_steps([("pages", fn.scrape_careerbeacon_pages), ("store", fn.build_careerbeacon_postings)])
            after = self.files_of(tmp)
        return code, before, after

    def stored_ids_of(self, text: str) -> list:
        """板仓原文里的帖号(排好序)。"""
        out: list = []
        for row in json.loads(text):
            out.append(row["posting_id"])
        return sorted(out)

    def test_page_error_stops_round(self) -> None:
        """单页取不到 —— NS 第 2 页 404、NS 第 2 页断网、PE 首页 404 —— 门返回 1、建仓不跑,三份文件一字不变。"""
        second = self.url_of("nova-scotia", 2)
        pe = self.url_of("prince-edward-island", 1)
        cases = [("ns2-404", FakeClient(pages=self.site_without(second))),
                 ("ns2-down", FakeClient(pages=self.site(), down={second})),
                 ("pe1-404", FakeClient(pages=self.site_without(pe)))]
        for label, client in cases:
            with self.subTest(case=label):
                code, before, after = self.round_of(client)
                self.assertEqual(code, 1)
                self.assertEqual(after, before)

    def test_blocked_first_page_stops_round(self) -> None:
        """省首页回 200 却是拦截页(一条岗链都没有)→ 门返回 1、三份文件一字不变(整省不会被当成零帖)。"""
        site = self.site()
        site[self.url_of("prince-edward-island", 1)] = "<html><body>Access denied</body></html>"
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 1)
        self.assertEqual(after, before)

    def test_pager_lost_stops_round(self) -> None:
        """分页器只剩首页(NS 首页不带第 2 页的链接)→ 本轮 5 帖,上一版在架 7 帖漏 2 帖(近三成,过两成)
        → 换版闸拦下:门返回 1、三份文件一字不变。"""
        site = self.site()
        site[self.url_of("nova-scotia", 1)] = self.list_page(["101", "102", "103"], 1)
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 1)
        self.assertEqual(after, before)

    def test_complete_round_rewrites(self) -> None:
        """阳性对照:齐全的一轮(NS 第 2 页多一条新帖 106)→ 门返回 0,枚举表换成本轮 8 帖,板仓照新枚举重写为 8 行;
        上一版里过了截止日的 3 帖不在本轮(占上一版三成)照样放行。"""
        site = self.site()
        site[self.url_of("nova-scotia", 2)] = self.list_page(["104", "105", "106"], 1)
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 0)
        self.assertEqual(sorted(json.loads(after["urls.json"])), sorted(self.live + ["106"]))
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(self.live + ["106"]))
        self.assertEqual(after["jobs.json"], before["jobs.json"])

    def test_small_churn_passes(self) -> None:
        """正常撤帖放行:NS 第 2 页少了 104(上一版在架 7 帖漏 1 帖,一成四,没过两成)→ 门返回 0,板仓里没有 104。"""
        site = self.site()
        site[self.url_of("nova-scotia", 2)] = self.list_page(["105"], 1)
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 0)
        want: list = []
        for pid in self.live:
            if pid != "104":
                want.append(pid)
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(want))
