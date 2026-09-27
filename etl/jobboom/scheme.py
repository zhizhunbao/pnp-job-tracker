"""
jobboom 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 ats/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 详情页 ld+json JobPosting 经 to_job_fact 归一;落 raw jobs.json
  时由 to_fact_row 转回 wire 字典,建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— httpx 客户端/响应只声明本域真用的格;装配点用 typing.cast 喂真客户端。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
§7 自测(2026-09-27 门迁 door 叶同批立;编号随 functions 的段号,本文件没有 §6):unittest 用例集 + HTTP 替身 ——
「不用 class」的外部库例外,先例 gcjobs / ats / door.scheme,跑法 `python etl/jobboom/main.py --only test`;
被测的 jobboom.functions 与 door 叶在用例体内现取(functions 反过来 import 本文件,顶部 import 会成环)。
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
    """响应体文本(sitemap XML / 详情页 HTML)。"""

    def raise_for_status(self) -> object:
        """非 2xx 抛错(单页失败按跳过留痕)。
        2026-09-27 起只有详情页照旧跳过;站点地图(索引 / 子图)失败改抛错停轮(见 functions.collect_sitemap_urls)。"""
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
class UrlsOut:
    """urls_by_id() 出参(帖号 → URL 表 + 剔掉的转载数)。"""

    urls: dict
    """帖号 → 详情 URL(只含雇主直发)。"""

    syndicated: int
    """URL 雇主段 = job-bank 的条数(Job Bank 转载,剔)。"""


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
    """详情 URL(英文站点地图的 job-description 形)。"""

    lang: str
    """页语言(恒 en)。"""

    title: str
    """职位标题。"""

    employer: str
    """雇主名(hiringOrganization.name)。"""

    employer_url: str
    """雇主页地址(Jobboom 不给,恒空串)。"""

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
class ParseIn:
    """parse_details() 入参(2026-09-20 立:解析步分「例行增量」与「换解析器后全量重来」两档)。"""

    force: bool
    """True = 事实表里已有的帖也重解析并覆盖(手动件 `--only reparse`);False = 例行增量,见了帖号就跳过。"""


@dataclass
class ParseTally:
    """parse_jobboom_details() 的计数器。"""

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
    """to_posting_row() 入参(一条事实 + 本轮时刻 + 英译)。"""

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
    """build_jobboom_postings() 的计数器。"""

    rows: int
    """入仓行数。"""

    gone: int
    """事实表里有、站点地图这轮已不在列的帖数。"""

    expired: int
    """已过截止日的帖数。"""

    blank: int
    """无标题(解析残缺)的帖数。"""


# =========================================================================
# 7. 自测(用例住 scheme)
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


class JobboomEnumGuardTest(unittest.TestCase):
    """「枚举失败 → 不出快照 / 不下架」自测(2026-09-27 门迁 door 叶同批立)。

    假站:索引列英文职位子图 dynamic-en.xml + 一张分类子图;职位子图 = 直发 3001~3008 + Job Bank 转载 7001~7003(雇主段 job-bank,剔);
    上一轮板仓 = 3001~3008 在架 + 3 帖(9001~9003)此刻已过截止日。把真枚举步与真建仓步按门的顺序接进 door.run_steps 跑:
    子图 / 索引取不到(404 / 断网)、回 200 却是空壳、子图只剩一截(漏近四成)、子图里只剩转载帖(直发零帖),门都返回 1、
    建仓不跑,枚举表与板仓一个字节不变 —— 改判前职位子图(本板只有一张)或索引一取不到,枚举表就写成空表、建仓把整板清空;
    齐全的一轮与只少一帖(一成二)的一轮放行,板仓照新枚举重写(阳性对照)。
    全程不联网、不写仓内文件:网络换替身,枚举表 / 事实表 / 译名表 / 板仓指到临时目录,crawl 写门与仓锁换替身。"""

    live = ["3001", "3002", "3003", "3004", "3005", "3006", "3007", "3008"]
    """上一轮板仓里在架的 8 帖(雇主直发)。"""

    expired = ["9001", "9002", "9003"]
    """上一轮板仓里此刻已过截止日的 3 帖。"""

    base = "https://www.jobboom.com"
    """假站根(与被测模块的正则同域)。"""

    def job_url(self, employer: str, pid: str) -> str:
        """一条详情 URL(雇主段 employer;job-bank = Job Bank 转载)。"""
        return self.base + "/en/job-description/it/developer/montreal/" + employer + "/" + pid

    def urlset(self, locs: list) -> str:
        """一张子图 XML。"""
        body = ""
        for loc in locs:
            body += "<url><loc>" + loc + "</loc></url>"
        return "<urlset>" + body + "</urlset>"

    def child(self) -> str:
        """英文职位子图的网址。"""
        return self.base + "/sitemap/dynamic-en.xml"

    def child_page(self, pids: list) -> str:
        """职位子图原文:给定直发帖 + 固定三条 Job Bank 转载帖。"""
        locs: list = []
        for pid in pids:
            locs.append(self.job_url("acme", pid))
        for pid in ("7001", "7002", "7003"):
            locs.append(self.job_url("job-bank", pid))
        return self.urlset(locs)

    def site(self) -> dict:
        """齐全的假站:网址 → 原文。"""
        from jobboom.constants import SITEMAP_INDEX_URL
        return {
            SITEMAP_INDEX_URL: self.urlset([self.child(), self.base + "/sitemap/sector.xml"]),
            self.child(): self.child_page(self.live),
        }

    def site_without(self, url: str) -> dict:
        """齐全假站去掉一张(那张 GET 回 404)。"""
        out: dict = {}
        for k, v in self.site().items():
            if k != url:
                out[k] = v
        return out

    def fact(self, pid: str, until: str) -> dict:
        """事实表里的一帖(建仓段按它出行;截止日 until)。"""
        return asdict(JobFact(
            posting_id=pid, url=self.job_url("acme", pid), lang="en", title="Développeur " + pid, employer="Acme",
            employer_url="", city="Montréal", province="QC", postal="", street="", country="CA",
            date_posted="2026-09-20", valid_through=until, salary_lo="", salary_hi="", salary_unit="",
            employment_types=[], industry="", description="",
        ))

    def seed_files(self, tmp: Path) -> None:
        """临时目录里铺上一轮的三份文件:枚举表 11 帖、事实表 11 帖 + 本轮新帖 3009、板仓 11 行(3 行此刻已过截止日)。"""
        urls: dict = {}
        facts: dict = {}
        rows: list = []
        for pid in self.live:
            facts[pid] = self.fact(pid, "2099-12-31")
        for pid in self.expired:
            facts[pid] = self.fact(pid, "2000-01-01")
        facts["3009"] = self.fact("3009", "2099-12-31")
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
        from jobboom import functions as fn
        from door import functions as door
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            self.seed_files(tmp)
            before = self.files_of(tmp)
            with ExitStack() as stack:
                for name in ("OUT_URLS", "IN_URLS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "urls.json"))
                stack.enter_context(mock.patch.object(fn, "IN_JOBS", tmp / "jobs.json"))
                stack.enter_context(mock.patch.object(fn, "IN_TITLES", tmp / "titles_en.json"))
                for name in ("OUT_POSTINGS", "IN_POSTINGS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "postings.json"))
                stack.enter_context(mock.patch.object(fn, "make_client", return_value=nullcontext(client)))
                stack.enter_context(mock.patch.object(fn, "put_cached_page"))
                stack.enter_context(mock.patch.object(fn, "jobbank_store_lock", return_value=nullcontext()))
                code = door.run_steps([("sitemap", fn.scrape_jobboom_sitemap), ("store", fn.build_jobboom_postings)])
            after = self.files_of(tmp)
        return code, before, after

    def stored_ids_of(self, text: str) -> list:
        """板仓原文里的帖号(排好序)。"""
        out: list = []
        for row in json.loads(text):
            out.append(row["posting_id"])
        return sorted(out)

    def assert_kept(self, client: FakeClient) -> None:
        """跑一轮,断言门返回 1 且三份文件一字不变。"""
        code, before, after = self.round_of(client)
        self.assertEqual(code, 1)
        self.assertEqual(after, before)

    def test_sitemap_error_stops_round(self) -> None:
        """取不到 —— 职位子图回 404、职位子图断网、索引回 404 —— 门返回 1、建仓不跑,三份文件一字不变(整板不会被清空)。"""
        from jobboom.constants import SITEMAP_INDEX_URL
        cases = [("child-404", FakeClient(pages=self.site_without(self.child()))),
                 ("child-down", FakeClient(pages=self.site(), down={self.child()})),
                 ("index-404", FakeClient(pages=self.site_without(SITEMAP_INDEX_URL)))]
        for label, client in cases:
            with self.subTest(case=label):
                self.assert_kept(client)

    def test_empty_sitemap_stops_round(self) -> None:
        """回 200 却是空壳 —— 职位子图一条 <loc> 都没有、索引一条 <loc> 都没有 —— 门返回 1、三份文件一字不变。"""
        from jobboom.constants import SITEMAP_INDEX_URL
        for url in (self.child(), SITEMAP_INDEX_URL):
            with self.subTest(url=url):
                site = self.site()
                site[url] = "<html><body>Access denied</body></html>"
                self.assert_kept(FakeClient(pages=site))

    def test_truncated_sitemap_stops_round(self) -> None:
        """职位子图只剩一截(直发只列 3001~3005):上一版在架 8 帖漏 3 帖(近四成,过两成)→ 换版闸拦下,三份文件一字不变。"""
        site = self.site()
        site[self.child()] = self.child_page(["3001", "3002", "3003", "3004", "3005"])
        self.assert_kept(FakeClient(pages=site))

    def test_only_syndicated_stops_round(self) -> None:
        """职位子图里只剩 Job Bank 转载帖(剔完直发零帖)→ 换版闸按空清单拦下,门返回 1、三份文件一字不变。"""
        site = self.site()
        site[self.child()] = self.child_page([])
        self.assert_kept(FakeClient(pages=site))

    def test_complete_round_rewrites(self) -> None:
        """阳性对照:齐全的一轮(多一条新帖 3009)→ 门返回 0,枚举表换成本轮 9 帖(转载帖不进),板仓照新枚举重写为 9 行;
        上一版里过了截止日的 3 帖不在本轮照样放行。"""
        site = self.site()
        site[self.child()] = self.child_page(self.live + ["3009"])
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 0)
        self.assertEqual(sorted(json.loads(after["urls.json"])), sorted(self.live + ["3009"]))
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(self.live + ["3009"]))
        self.assertEqual(after["jobs.json"], before["jobs.json"])

    def test_small_churn_passes(self) -> None:
        """正常撤帖放行:职位子图少了 3008(上一版在架 8 帖漏 1 帖,一成二,没过两成)→ 门返回 0,板仓里没有 3008。"""
        site = self.site()
        site[self.child()] = self.child_page(self.live[:-1])
        code, before, after = self.round_of(FakeClient(pages=site))
        self.assertEqual(code, 0)
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(self.live[:-1]))
