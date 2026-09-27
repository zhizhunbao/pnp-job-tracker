"""
hireac 域行形状(一参令 XxxIn / 单返回值 XxxOut;照 careerbeacon/scheme.py 样张)。

抽屉名 scheme.py 不叫 types.py(2026-08-30 拍板:types.py 遮蔽标准库 types)。
本域形状三档:
① **事实行 JobFact** = dataclass —— 详情页「标签: 值」表格经 to_job_fact 归一;落 raw jobs.json
  时由 asdict 转回 wire 字典,建仓时由 to_posting_row 转成 Job Bank 仓同形的行;
② **域内接线形状 XxxIn** = dataclass —— 多入参函数的一参令载体;
③ **库形状 Protocol** —— playwright 页面只声明本域真用的格;装配点用 typing.cast 喂 crawl 给的真页。
import 只有标准库(叶子律:形状本域自声明,零跨域)。
§5 自测(2026-09-27 门迁 door 叶同批立):unittest 用例集 + 页面替身 ——「不用 class」的外部库例外,先例 gcjobs / ats / door.scheme,
跑法 `python etl/hireac/main.py --only test`;被测的 hireac.functions 与 door 叶在用例体内现取
(functions 反过来 import 本文件,顶部 import 会成环)。

@author Frank
@time 2026-09-13
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
class PageJsIn:
    """page_js_of() 入参(照当前页分页器的排序拼出翻到第 n 页的页内调用)。"""

    html: str
    """当前页原文(分页器在里头)。"""

    n: int
    """目标页号。"""


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


# =========================================================================
# 5. 自测(用例住 scheme)
# =========================================================================


@dataclass
class FakePage:
    """playwright 页面替身(BrowserPageLike 的五格):pages = 各页原文(下标 0 = 第 1 页);cur = 分页器当前页号;
    stuck 里的页号翻不过去(页内翻页调用不生效 = 翻页超时的形)。等待一律立即返回。"""

    pages: list
    """各页列表原文。"""

    stuck: set = field(default_factory=set)
    """翻不过去的页号。"""

    cur: int = 1
    """分页器当前页号(页内翻页调用改它)。"""

    url: str = "https://hireac.algonquincollege.com/myAccount/careerEmployment/postings.htm"
    """当前地址(已登录的板正门)。"""

    async def goto(self, url: str, wait_until: str, timeout: int) -> object:
        """导航(替身:只记地址)。"""
        self.url = url
        return None

    async def wait_for_timeout(self, ms: int) -> None:
        """等固定毫秒(替身:不等)。"""
        return None

    async def content(self) -> str:
        """当前页原文。"""
        return self.pages[self.cur - 1]

    async def evaluate(self, js: str, arg: object = None) -> object:
        """页内 JS(替身):读页号给当前页号;翻页调用按页号换页(stuck 里的不换);其余给 None。"""
        from hireac.constants import CURRENT_PAGE_JS
        if js == CURRENT_PAGE_JS:
            return str(self.cur)
        for n in range(1, len(self.pages) + 1):
            if "'" + str(n) + "','advanced'" in js and n not in self.stuck:
                self.cur = n
        return None


class HireacEnumGuardTest(unittest.TestCase):
    """「枚举失败 → 不出快照 / 不下架」自测(2026-09-27 门迁 door 叶同批立)。

    假板两页(第 1 页 11~13 带两页分页器、第 2 页 14~16);上一轮板仓 = 这 6 帖在架 + 3 帖(91~93)此刻已过截止日。
    把真抓取步(列表翻页用真 collect_rows 走页面替身;进板 / cookie / 详情回放 / 关浏览器换替身)与真建仓步
    按门的顺序接进 door.run_steps 跑:登录过期、翻不到第 2 页、第 2 页表格一直是旧行、首页零行、分页器丢了(漏一半),
    门都返回 1、建仓不跑,列表行表与板仓一个字节不变 —— mart / seed 读到的还是上一版,没列到的帖不会被下架;
    齐全的一轮与只少一帖(一成七)的一轮放行,板仓照新列表重写(阳性对照)。
    全程不起浏览器、不写仓内文件:行表 / 事实表 / 板仓指到临时目录,crawl 写门与仓锁换替身。"""

    live = ["11", "12", "13", "14", "15", "16"]
    """上一轮板仓里在架的 6 帖。"""

    expired = ["91", "92", "93"]
    """上一轮板仓里此刻已过截止日的 3 帖。"""

    def list_page(self, rids: list, last: int) -> str:
        """一张列表页:给定行(tr + 行内 buildForm 表单参数)+ 分页器(last > 1 时带 1..last 的翻页钮)。"""
        html = "<table>"
        for rid in rids:
            html += ('<tr id="posting' + rid + '" class="searchResult"><td><a onclick="orbisAppSr.buildForm('
                     "{'action':'_-_-x','postingId':'" + rid + "'}, '').submit()\">Job " + rid + "</a></td></tr>")
        html += "</table>"
        if last > 1:
            for n in range(1, last + 1):
                html += ("<a onclick=\"loadPostingTable('', 'id',  'desc', '" + str(n) + "','advanced','', null)\">"
                         + str(n) + "</a>")
        return html

    def board(self) -> list:
        """齐全的假板两页原文。"""
        return [self.list_page(["11", "12", "13"], 2), self.list_page(["14", "15", "16"], 2)]

    def fact(self, rid: str, deadline: str) -> dict:
        """事实表里的一帖(建仓段按它出行;截止日 deadline)。"""
        return asdict(JobFact(
            posting_id=rid, title="Job " + rid, employer="Acme", division="", kind="Full-Time", city="Ottawa",
            province="ON", postal="", street="", salary_kind="", hours="", term="", category="", description="",
            requirements="", deadline=deadline, apply_url="", apply_email="", procedure="", website="",
            language="", country="Canada", first_seen="2026-09-20",
        ))

    def seed_files(self, tmp: Path) -> None:
        """临时目录里铺上一轮的三份文件:行表 9 行、事实表 9 帖 + 本轮新帖 17、板仓 9 行(3 行此刻已过截止日)。"""
        rows: dict = {}
        facts: dict = {}
        stored: list = []
        for rid in self.live:
            facts[rid] = self.fact(rid, "2099-12-31")
        for rid in self.expired:
            facts[rid] = self.fact(rid, "2000-01-01")
        facts["17"] = self.fact("17", "2099-12-31")
        for rid in self.live + self.expired:
            rows[rid] = {"action": "_-_-old", "postingId": rid}
            stored.append({"posting_id": rid, "title": facts[rid]["title"], "valid_through": facts[rid]["deadline"]})
        (tmp / "rows.json").write_text(json.dumps(rows), encoding="utf-8")
        (tmp / "jobs.json").write_text(json.dumps(facts), encoding="utf-8")
        (tmp / "postings.json").write_text(json.dumps(stored), encoding="utf-8")

    def files_of(self, tmp: Path) -> dict:
        """三份文件的原文(文件名 → 文本)。"""
        out: dict = {}
        for name in ("rows.json", "jobs.json", "postings.json"):
            out[name] = (tmp / name).read_text(encoding="utf-8")
        return out

    def round_of(self, page: FakePage, login_ok: bool) -> tuple:
        """铺好上一轮文件,在替身沙箱里按门的顺序跑「抓取 → 建仓」两步;返回 (门的返回码, 跑前三份文件, 跑后三份文件)。
        login_ok=False 时进板那一步按登录过期抛错。"""
        from hireac import functions as fn
        from door import functions as door
        board = mock.AsyncMock()
        if login_ok is False:
            board = mock.AsyncMock(side_effect=RuntimeError("login expired"))
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            self.seed_files(tmp)
            before = self.files_of(tmp)
            with ExitStack() as stack:
                for name in ("OUT_ROWS", "IN_ROWS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "rows.json"))
                stack.enter_context(mock.patch.object(fn, "IN_JOBS", tmp / "jobs.json"))
                for name in ("OUT_POSTINGS", "IN_POSTINGS"):
                    stack.enter_context(mock.patch.object(fn, name, tmp / "postings.json"))
                stack.enter_context(mock.patch.object(fn, "require_cookie_file"))
                stack.enter_context(mock.patch.object(fn, "get_browser_page", mock.AsyncMock(return_value=page)))
                stack.enter_context(mock.patch.object(fn, "open_board", board))
                stack.enter_context(mock.patch.object(fn, "save_browser_cookies", mock.AsyncMock(return_value=0)))
                stack.enter_context(mock.patch.object(fn, "close_browser", mock.AsyncMock()))
                stack.enter_context(mock.patch.object(fn, "fetch_details", mock.AsyncMock(
                    return_value=DetailBatchOut(done=0, failed=0, skipped=0))))
                stack.enter_context(mock.patch.object(fn, "put_cached_pages"))
                stack.enter_context(mock.patch.object(fn, "jobbank_store_lock", return_value=nullcontext()))
                code = door.run_steps([("scrape", fn.scrape_hireac), ("store", fn.build_hireac_postings)])
            after = self.files_of(tmp)
        return code, before, after

    def stored_ids_of(self, text: str) -> list:
        """板仓原文里的行号(排好序)。"""
        out: list = []
        for row in json.loads(text):
            out.append(row["posting_id"])
        return sorted(out)

    def assert_kept(self, page: FakePage, login_ok: bool) -> None:
        """跑一轮,断言门返回 1 且三份文件一字不变。"""
        code, before, after = self.round_of(page, login_ok)
        self.assertEqual(code, 1)
        self.assertEqual(after, before)

    def test_session_failures_stop_round(self) -> None:
        """会话坏了 —— 登录过期(进板抛)、第 2 页翻不过去(页号不到位)、第 2 页表格一直是第 1 页的旧行 ——
        门返回 1、建仓不跑,三份文件一字不变。"""
        stale = self.board()
        stale[1] = stale[0]
        cases = [("login", FakePage(pages=self.board()), False),
                 ("page2-stuck", FakePage(pages=self.board(), stuck={2}), True),
                 ("page2-stale", FakePage(pages=stale), True)]
        for label, page, login_ok in cases:
            with self.subTest(case=label):
                self.assert_kept(page, login_ok)

    def test_empty_first_page_stops_round(self) -> None:
        """首页一行都没有(「全部在招」没点开 / 改版的形)→ 门返回 1、三份文件一字不变(整板不会被剔光)。"""
        self.assert_kept(FakePage(pages=[self.list_page([], 1)]), True)

    def test_pager_lost_stops_round(self) -> None:
        """分页器丢了(首页不带翻页钮,只读首页)→ 本轮 3 行,上一版在架 6 帖漏 3 帖(一半,过两成)
        → 换版闸拦下,门返回 1、三份文件一字不变。"""
        self.assert_kept(FakePage(pages=[self.list_page(["11", "12", "13"], 1)]), True)

    def test_complete_round_rewrites(self) -> None:
        """阳性对照:齐全的一轮(第 2 页多一行新帖 17)→ 门返回 0,行表换成本轮 7 行,板仓照新列表重写为 7 行;
        上一版里过了截止日的 3 帖不在本轮照样放行。"""
        pages = [self.list_page(["11", "12", "13"], 2), self.list_page(["14", "15", "16", "17"], 2)]
        code, before, after = self.round_of(FakePage(pages=pages), True)
        self.assertEqual(code, 0)
        self.assertEqual(sorted(json.loads(after["rows.json"])), sorted(self.live + ["17"]))
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(self.live + ["17"]))
        self.assertEqual(after["jobs.json"], before["jobs.json"])

    def test_small_churn_passes(self) -> None:
        """正常撤帖放行:第 2 页少了 16(上一版在架 6 帖漏 1 帖,一成七,没过两成)→ 门返回 0,板仓里没有 16。"""
        pages = [self.list_page(["11", "12", "13"], 2), self.list_page(["14", "15"], 2)]
        code, before, after = self.round_of(FakePage(pages=pages), True)
        self.assertEqual(code, 0)
        self.assertEqual(self.stored_ids_of(after["postings.json"]), sorted(self.live[:-1]))
