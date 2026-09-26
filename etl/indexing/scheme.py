"""
indexing 域形状(照 explore / jdformat 样张:状态文件的边界形状 = pydantic BaseModel,域内接线形状 = dataclass,
库类型用 Protocol 只声明真用的格)+ 决策逻辑自测(unittest 用例集与 HTTP 替身 —— 「不用 class」的外部库例外,
先例 gate.scheme 的 JobbankStoreLockTest,跑法 `python etl/indexing/main.py --only test`)。
import:标准库 / pydantic / httpx(替身要抛它的网络错)/ cryptography(签名用例现造一把 RSA 钥)+ 本域 constants;
被测的 indexing.functions 在用例体内现取 —— functions 反过来 import 本文件,顶部 import 会成环。

@author Frank
@time 2026-09-26 02:44:38
"""
from __future__ import annotations

import base64
import itertools
import json
import os
import tempfile
import unittest
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol, cast
from unittest import mock

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from pydantic import BaseModel, ConfigDict, Field

from indexing.constants import (
    DAILY_QUOTA, ENV_KEY_FILE, FIELD_NONE, GRANT_JWT_BEARER, INDEXING_SCOPE, K_ACCESS_TOKEN, K_ERROR, K_MESSAGE,
    LASTMOD_NONE_TS, NOTE_NO_KEY, P_ASSERTION, P_GRANT_TYPE, P_TYPE, P_URL, SITE_ROOT, SITEMAP_INDEX_URL, STOP_NET,
    STOP_OWNER, STOP_QUOTA, TOKEN_URL, TYPE_DELETED, TYPE_UPDATED, V_DELETE, V_KEEP, V_UNSURE,
)

# =========================================================================
# 1. 入口:一轮 = 读密钥 → 读状态 → 读 sitemap → 先撤回 → 再推新 → 落盘
# =========================================================================


@dataclass
class RoundIn:
    """run_round() 入参。"""

    dry: bool
    """True = 干跑(不要密钥、不调 Google、不落盘)。"""


@dataclass
class Tally:
    """一轮的账(干跑 = 这一轮实发会做的事;各清单按发生先后)。"""

    deleted: list[str] = field(default_factory=list)
    """发了(干跑:会发)URL_DELETED 的网址。"""

    retired: list[str] = field(default_factory=list)
    """离开 sitemap 但页面仍可收录、只退役没发的网址。"""

    unsure: list[str] = field(default_factory=list)
    """查页没结论、留到下轮再查的网址。"""

    pushed: list[str] = field(default_factory=list)
    """发了(干跑:会发)URL_UPDATED 的网址。"""

    failed: list[str] = field(default_factory=list)
    """Google 回了别的错(非 429 / 403)的网址。"""

    stop: str = FIELD_NONE
    """整轮停的由头(STOP_QUOTA / STOP_OWNER / STOP_NET;空串 = 没停)。"""

    stop_note: str = FIELD_NONE
    """整轮停时的原话(403 的 Google 原话 / 网络错的异常)。"""


@dataclass
class RoundCtx:
    """一轮的执行上下文(实发与干跑同一形;执行段就地改 state 与 tally)。"""

    client: HttpClientLike
    """HTTP 客户端(读 sitemap、查页、打 Google 同一个)。"""

    key: ServiceKey | None
    """服务账号密钥(干跑 = None:干跑不碰 Google)。"""

    token: str
    """本轮的 access token(空串 = 还没换;实发头一回用时换)。"""

    dry: bool
    """干跑开关。"""

    persist: bool
    """落不落盘(实发 True;干跑与自测 False)。"""

    state: IndexState
    """状态(就地改;落盘由 run_round 收尾与 flush 负责)。"""

    today: str
    """本轮的太平洋时区日期(额度记账日)。"""

    tally: Tally
    """本轮的账。"""

    dirty: int = 0
    """上次落盘后又记了几条(满 FLUSH_N 落一次)。"""


@dataclass
class ExecIn:
    """execute() / retract() / push_fresh() / report_round() / show_samples() 共用入参。"""

    ctx: RoundCtx
    """本轮上下文。"""

    plan: Plan
    """本轮规划。"""


# =========================================================================
# 2. 读 sitemap(职位分册)
# =========================================================================


class HttpResponseLike(Protocol):
    """httpx 响应里本域真用的格。"""

    status_code: int
    """HTTP 状态码。"""

    is_success: bool
    """2xx 判定。"""

    text: str
    """响应正文(查页看 robots meta;错误回包不是 JSON 时截它)。"""

    content: bytes
    """响应字节(sitemap XML 按字节交给解析器,编码听 XML 声明的)。"""

    headers: Mapping[str, str]
    """响应头(查 X-Robots-Tag;httpx 头名大小写不敏感)。"""

    def json(self) -> object:
        """响应体按 JSON 解析(不是 JSON 抛 ValueError)。"""
        ...


class HttpClientLike(Protocol):
    """httpx 客户端里本域真用的格:get(读 sitemap / 查页)与 post(换 token 走表单、发通知走 JSON)。
    Pyrefly 对 Protocol 实参判定保守,装配点用 typing.cast 喂真客户端(断言只住装配点;自测里的替身同样 cast)。"""

    def get(self, url: str, *, headers: dict) -> HttpResponseLike:
        """GET(关键字参是库形状特批)。"""
        ...

    def post(self, url: str, *, data: dict | None, json: object, headers: dict) -> HttpResponseLike:
        """POST:表单走 data(json 给 None),JSON 体走 json(data 给 None)—— 关键字参是库形状特批。"""
        ...


@dataclass
class SitemapUrl:
    """sitemap 职位分册里的一条网址(to_sitemap_url 洗过)。"""

    loc: str
    """网址。"""

    lastmod: str
    """lastmod 原文(缺席 = 空串)。"""

    lastmod_ts: float
    """lastmod 的 epoch 秒(缺 / 坏 = LASTMOD_NONE_TS)。"""


@dataclass
class SitemapOut:
    """read_sitemap() 产出。"""

    rows: list[SitemapUrl]
    """本站职位网址(去重后,按先出现的次序)。"""

    shards: int
    """读了几个职位分册。"""

    skipped: int
    """剔掉的非本站职位页条数(别的主机 / 不是 https / 不是 /jobs/ 路径)。"""

    missing: int
    """lastmod 缺席的条数。"""

    bad: int
    """lastmod 解析不了的条数。"""


@dataclass
class XmlGetIn:
    """xml_of() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    url: str
    """XML 地址。"""


@dataclass
class MergeIn:
    """merge_url() 入参。"""

    seen: dict[str, SitemapUrl]
    """已收的网址 → 行(就地并入)。"""

    row: SitemapUrl
    """新读到的一行。"""


# =========================================================================
# 3. 规划与排序(纯函数)
# =========================================================================


@dataclass
class PlanIn:
    """plan_of() 入参。"""

    rows: list[SitemapUrl]
    """sitemap 里的本站职位网址。"""

    state: IndexState
    """上轮状态。"""


@dataclass
class Plan:
    """plan_of() 产出。"""

    departed: list[str]
    """已通知过、现已离开 sitemap 的网址(按当初通知的先后):待撤。"""

    fresh: list[SitemapUrl]
    """sitemap 里还没通知过的(lastmod 新→旧):待推。"""

    kept: int
    """已通知过、还在 sitemap 里的条数(不动)。"""


# =========================================================================
# 4. 额度与太平洋时区
# =========================================================================


@dataclass
class QuotaIn:
    """quota_left_of() 入参。"""

    quota: Quota
    """状态里的额度记账。"""

    today: str
    """此刻的太平洋时区日期。"""


@dataclass
class NthSundayIn:
    """nth_sunday_utc_of() 入参。"""

    year: int
    """年。"""

    month: int
    """月。"""

    nth: int
    """第几个周日(1 起)。"""

    hour: int
    """UTC 整点。"""


# =========================================================================
# 5. 撤回判定(查页)与执行
# =========================================================================


@dataclass
class JudgeIn:
    """judge_page() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    url: str
    """要查的页。"""


@dataclass
class PageSeen:
    """查页看到的(verdict_of 的入参)。"""

    status: int
    """落地页状态码(跟随跳转之后)。"""

    robots: str
    """X-Robots-Tag 头(没有 = 空串)。"""

    html: str
    """页面正文。"""


@dataclass
class Verdict:
    """撤回判定。"""

    kind: str
    """V_DELETE / V_KEEP / V_UNSURE。"""

    why: str
    """由头(状态码 / noindex 出处 / 异常)。"""


@dataclass
class RetireIn:
    """retire() 入参。"""

    ctx: RoundCtx
    """本轮上下文。"""

    url: str
    """要退出已通知的网址。"""

    sent: str | None
    """发了什么(URL_DELETED;None = 页面仍可收录,只退役没发)。"""

    why: str
    """由头。"""


@dataclass
class NotifyIn:
    """notify() 入参。"""

    ctx: RoundCtx
    """本轮上下文。"""

    url: str
    """URL_UPDATED 发成的网址。"""


# =========================================================================
# 6. Google 鉴权与发布
# =========================================================================


@dataclass
class SendIn:
    """send() 入参。"""

    ctx: RoundCtx
    """本轮上下文。"""

    url: str
    """要通知的网址。"""

    kind: str
    """URL_UPDATED / URL_DELETED。"""


@dataclass
class ServiceKey:
    """服务账号密钥里本域真用的三格(to_service_key 洗过)。"""

    client_email: str
    """服务账号邮箱(JWT 的 iss;也是要在 GSC 里加成「所有者」的那个)。"""

    private_key: str
    """PEM 私钥(只拿来签名,不进任何日志)。"""

    private_key_id: str
    """私钥编号(JWT 头的 kid;缺 = 空串)。"""


@dataclass
class TokenIn:
    """token_of() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    key: ServiceKey
    """服务账号密钥。"""


@dataclass
class JwtIn:
    """jwt_of() 入参。"""

    key: ServiceKey
    """服务账号密钥。"""

    now: int
    """签发时刻(epoch 秒)。"""


@dataclass
class SignIn:
    """sign_rs256() 入参。"""

    pem: str
    """PEM 私钥。"""

    data: bytes
    """待签字节(JWT 的「头.体」)。"""


@dataclass
class PublishIn:
    """publish() 入参。"""

    client: HttpClientLike
    """HTTP 客户端。"""

    token: str
    """access token。"""

    url: str
    """要通知的网址。"""

    kind: str
    """URL_UPDATED / URL_DELETED。"""


@dataclass
class PublishOut:
    """publish() 产出。"""

    status: int
    """HTTP 状态码。"""

    message: str
    """非 2xx 时的 Google 原话(2xx = 空串)。"""


# =========================================================================
# 7. 状态读写
# =========================================================================

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置(照 jdformat):多余键忽略、按字段名构造照常、逐格裸字符串 docstring 直接成为字段 description。"""


class Notice(BaseModel):
    """已通知:一条网址发过 URL_UPDATED。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    type: str = TYPE_UPDATED
    """通知类型(恒 URL_UPDATED)。"""

    at: str = FIELD_NONE
    """发成的时刻(UTC)。"""


class Retired(BaseModel):
    """已撤回 / 已退役:一条已通知过的网址离开了 sitemap。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    type: str | None = None
    """URL_DELETED = 发过撤回;null = 页面仍可收录,只从状态里退役、没发任何通知(记录了「没发」,不是没记录)。"""

    at: str = FIELD_NONE
    """退出已通知的时刻(UTC)。"""

    why: str = FIELD_NONE
    """由头(http 404 / noindex 出处 / 页面仍可收录)。"""


class Quota(BaseModel):
    """额度记账(按太平洋时区的日子记)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    day: str = FIELD_NONE
    """记账日(太平洋时区 YYYY-MM-DD;空串 = 还没发过)。"""

    used: int = 0
    """该日已用的发布请求数(拿到 Google 回应就记,429 时记满)。"""


class IndexState(BaseModel):
    """state.json 的整体(本域的文件契约,只有本域读写)。"""

    model_config = MODEL_CFG
    """统一边界配置。"""

    notified: dict[str, Notice] = Field(default_factory=dict)
    """已通知:网址 → 记录(插入序 = 通知先后)。"""

    retired: dict[str, Retired] = Field(default_factory=dict)
    """已撤回 / 已退役:网址 → 记录。"""

    quota: Quota = Field(default_factory=Quota)
    """额度记账。"""


# =========================================================================
# 8. 自测(用例住 scheme)
# =========================================================================


@dataclass
class FakeResponse:
    """HTTP 响应替身(HttpResponseLike 的格一个不少)。"""

    status_code: int
    """状态码。"""

    is_success: bool
    """2xx 判定。"""

    text: str
    """正文。"""

    content: bytes
    """字节(= 正文的 utf-8)。"""

    headers: dict[str, str]
    """响应头(键一律小写:替身不做大小写折叠)。"""

    body: object
    """json() 的返回。"""

    def json(self) -> object:
        """响应体按 JSON(替身直接给 body)。"""
        return self.body


def resp_of(status: int, text: str) -> FakeResponse:
    """造一个替身响应(无特殊头,json() 给 None)。"""
    return FakeResponse(status_code=status, is_success=200 <= status < 300, text=text, content=text.encode("utf-8"),
                        headers={}, body=None)


def b64url_decode(text: str) -> bytes:
    """base64url 解码(补回去掉的补位)。"""
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


@dataclass
class FakeClient:
    """HTTP 替身:GET 按网址查 routes(查不到 = 404),每次记进 gets;POST 到 TOKEN_URL 回一个假 token(表单记进 forms),
    POST 到发布端点按 codes 队列依次回状态码(0 = 抛 httpx.ConnectError;队列空 = 200),请求体记进 posted。"""

    routes: dict[str, FakeResponse]
    """GET 路由表:网址 → 响应。"""

    codes: list[int]
    """发布端点的状态码队列。"""

    gets: list[str] = field(default_factory=list)
    """GET 过的网址(按先后)。"""

    posted: list[object] = field(default_factory=list)
    """发布端点收到的请求体(按先后)。"""

    forms: list[dict] = field(default_factory=list)
    """换 token 端点收到的表单(按先后)。"""

    def get(self, url: str, *, headers: dict) -> FakeResponse:
        """GET(替身)。"""
        self.gets.append(url)
        hit = self.routes.get(url)
        if hit is None:
            return resp_of(404, "")
        return hit

    def post(self, url: str, *, data: dict | None, json: object, headers: dict) -> FakeResponse:
        """POST(替身)。"""
        if url == TOKEN_URL:
            if data is not None:
                self.forms.append(data)
            return FakeResponse(status_code=200, is_success=True, text="", content=b"", headers={},
                                body={K_ACCESS_TOKEN: "fake-token"})
        self.posted.append(json)
        code = 200
        if len(self.codes) > 0:
            code = self.codes.pop(0)
        if code == 0:
            raise httpx.ConnectError("fake network down")
        return FakeResponse(status_code=code, is_success=200 <= code < 300, text="", content=b"", headers={},
                            body={K_ERROR: {K_MESSAGE: "fake http " + str(code)}})


@dataclass
class Sink:
    """say 的替身:吞掉进度行,留给断言看。"""

    lines: list[str] = field(default_factory=list)
    """收到的行。"""

    def say(self, msg: str) -> None:
        """收一行。"""
        self.lines.append(msg)


class IndexingDecisionTest(unittest.TestCase):
    """indexing 域决策逻辑自测(2026-09-26 立域同批):撤回判定 / 额度切分 / 待推排序 / 太平洋日期 / sitemap 解析与防线 /
    整轮停语义 / RS256 签名 / 密钥形状 / 状态文件 / 没配密钥的轮。形制照宪法判定层测试:穷举输入断言性质 + 手写金标,
    不做快照矩阵;全程不联网、不写仓内文件(HTTP 走 FakeClient 替身,执行段 persist=False,say 换 Sink,
    状态文件用例落临时目录)。"""

    def ctx_of(self, fake: FakeClient, state: IndexState, dry: bool) -> RoundCtx:
        """造一轮上下文:今天固定 2026-09-26;token 预置(实发用例不走换 token,专测签名的用例自己清空);密钥是假的
        (403 报错要点名它的邮箱)。"""
        key = ServiceKey(client_email="bot@proj.iam.gserviceaccount.com", private_key="", private_key_id="")
        return RoundCtx(client=cast(HttpClientLike, fake), key=key, token="preset", dry=dry, persist=False, state=state,
                        today="2026-09-26", tally=Tally())

    def rows_of(self, count: int) -> list[SitemapUrl]:
        """造 count 条待推网址(/jobs/100 起,lastmod 递减 = 原序即发送序)。"""
        rows: list[SitemapUrl] = []
        for i in range(count):
            rows.append(SitemapUrl(loc=SITE_ROOT + "/jobs/" + str(100 + i), lastmod="", lastmod_ts=float(1000 - i)))
        return rows

    def index_xml(self, locs: list[str]) -> str:
        """造一份 sitemap 索引 XML。"""
        parts = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for loc in locs:
            parts.append("<sitemap><loc>" + loc + "</loc></sitemap>")
        parts.append("</sitemapindex>")
        return "\n".join(parts)

    def urlset_xml(self, pairs: list[tuple[str, str]]) -> str:
        """造一份 sitemap 分册 XML(lastmod 给空串 = 不写这一格)。"""
        parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for loc, lastmod in pairs:
            item = "<url><loc>" + loc + "</loc>"
            if lastmod != "":
                item = item + "<lastmod>" + lastmod + "</lastmod>"
            parts.append(item + "</url>")
        parts.append("</urlset>")
        return "\n".join(parts)

    def locs_of(self, rows: list[SitemapUrl]) -> list[str]:
        """行 → 网址清单(保序)。"""
        out: list[str] = []
        for row in rows:
            out.append(row.loc)
        return out

    def test_verdict_golden(self) -> None:
        """撤回判定金标:404 / 410 → 撤;2xx + noindex(头、meta 两种属性序、单引号、googlebot、none)→ 撤;
        2xx 可收录 → 退役;noindex 写在别的 meta / 正文里不算;其余状态码(哪怕页里有 noindex)→ 没结论。"""
        from indexing import functions as fn
        noindex = '<head><meta name="robots" content="noindex"/></head>'
        cases = [
            (404, "", "", V_DELETE),
            (410, "", "", V_DELETE),
            (200, "", noindex, V_DELETE),
            (200, "", '<meta content="noindex, nofollow" name="robots">', V_DELETE),
            (200, "", "<meta name='googlebot' content='noindex'>", V_DELETE),
            (200, "", '<META NAME="ROBOTS" CONTENT="NOINDEX">', V_DELETE),
            (200, "", '<meta name="robots" content="none">', V_DELETE),
            (200, "noindex", "<html></html>", V_DELETE),
            (203, "googlebot: noindex", "<html></html>", V_DELETE),
            (200, "", '<meta name="robots" content="index, follow">', V_KEEP),
            (200, "", '<meta name="description" content="noindex jobs board">', V_KEEP),
            (200, "", '<meta property="og:site_name" content="noindex">', V_KEEP),
            (200, "", "<p>noindex</p>", V_KEEP),
            (200, "all", "", V_KEEP),
            (500, "", noindex, V_UNSURE),
            (503, "", "", V_UNSURE),
            (403, "", "", V_UNSURE),
            (301, "", "", V_UNSURE),
        ]
        for status, robots, html, want in cases:
            with self.subTest(status=status, robots=robots, html=html):
                self.assertEqual(fn.verdict_of(PageSeen(status=status, robots=robots, html=html)).kind, want)

    def test_verdict_status_exhaustive(self) -> None:
        """穷举状态码 100..599(页里不带 noindex):只有 404 / 410 撤、只有 2xx 退役,其余全是没结论 —— 没有第四种。"""
        from indexing import functions as fn
        for status in range(100, 600):
            got = fn.verdict_of(PageSeen(status=status, robots="", html="<html></html>")).kind
            want = V_UNSURE
            if status in (404, 410):
                want = V_DELETE
            elif 200 <= status < 300:
                want = V_KEEP
            self.assertEqual(got, want, status)

    def test_quota_left(self) -> None:
        """额度金标 + 穷举性质:记账日不是今天 = 整 DAILY_QUOTA;同一天 = max(DAILY_QUOTA − 已用, 0)。"""
        from indexing import functions as fn
        today = "2026-09-26"
        self.assertEqual(fn.quota_left_of(QuotaIn(quota=Quota(), today=today)), DAILY_QUOTA)
        self.assertEqual(fn.quota_left_of(QuotaIn(quota=Quota(day="2026-09-25", used=DAILY_QUOTA), today=today)),
                         DAILY_QUOTA)
        self.assertEqual(fn.quota_left_of(QuotaIn(quota=Quota(day=today, used=37), today=today)), DAILY_QUOTA - 37)
        for used in range(0, DAILY_QUOTA * 2):
            same = fn.quota_left_of(QuotaIn(quota=Quota(day=today, used=used), today=today))
            other = fn.quota_left_of(QuotaIn(quota=Quota(day="2026-09-25", used=used), today=today))
            self.assertEqual(same, max(DAILY_QUOTA - used, 0), used)
            self.assertEqual(other, DAILY_QUOTA, used)

    def test_pacific_day_golden(self) -> None:
        """太平洋日期金标:2026 年夏令时 3/8 起、11/1 止(2027 是 3/14);零点在 PST = 08:00 UTC、在 PDT = 07:00 UTC;跨年。"""
        from indexing import functions as fn
        cases = [
            ("2026-03-08T07:59:59", "2026-03-07"),
            ("2026-03-08T08:00:00", "2026-03-08"),
            ("2026-03-08T09:59:59", "2026-03-08"),
            ("2026-03-08T10:00:00", "2026-03-08"),
            ("2026-03-09T06:59:59", "2026-03-08"),
            ("2026-03-09T07:00:00", "2026-03-09"),
            ("2026-07-01T06:59:59", "2026-06-30"),
            ("2026-07-01T07:00:00", "2026-07-01"),
            ("2026-11-01T06:59:59", "2026-10-31"),
            ("2026-11-01T07:00:00", "2026-11-01"),
            ("2026-11-01T08:59:59", "2026-11-01"),
            ("2026-11-01T09:00:00", "2026-11-01"),
            ("2026-11-02T07:59:59", "2026-11-01"),
            ("2026-11-02T08:00:00", "2026-11-02"),
            ("2027-01-01T07:59:59", "2026-12-31"),
            ("2027-01-01T08:00:00", "2027-01-01"),
            ("2027-03-14T09:00:00", "2027-03-14"),
            ("2027-03-15T06:59:59", "2027-03-14"),
            ("2027-03-15T07:00:00", "2027-03-15"),
        ]
        for iso, want in cases:
            with self.subTest(iso=iso):
                now = datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)
                self.assertEqual(fn.pacific_day_of(now), want)

    def test_pacific_day_lengths(self) -> None:
        """穷举 2026 全年每个 UTC 整点:太平洋日恰好一天 23 小时(3/8 拨快)、一天 25 小时(11/1 拨回),其余全是 24 小时
        (头尾两天只截到一部分,不计)。"""
        from indexing import functions as fn
        hours: dict[str, int] = {}
        t = datetime(2026, 1, 1, tzinfo=timezone.utc)
        end = datetime(2027, 1, 1, tzinfo=timezone.utc)
        while t < end:
            day = fn.pacific_day_of(t)
            hours[day] = hours.get(day, 0) + 1
            t = t + timedelta(hours=1)
        inner = sorted(hours)[1:-1]
        odd: dict[str, int] = {}
        for day in inner:
            if hours[day] != 24:
                odd[day] = hours[day]
        self.assertEqual(len(inner), 364)
        self.assertEqual(odd, {"2026-03-08": 23, "2026-11-01": 25})

    def test_fresh_order(self) -> None:
        """待推次序金标 + 穷举全排列性质:lastmod 新→旧、缺 / 坏的排最后、同值保输入原序(720 种输入次序逐一验)。"""
        from indexing import functions as fn
        rows = [
            SitemapUrl(loc="a", lastmod="x", lastmod_ts=5.0),
            SitemapUrl(loc="b", lastmod="", lastmod_ts=LASTMOD_NONE_TS),
            SitemapUrl(loc="c", lastmod="x", lastmod_ts=9.0),
            SitemapUrl(loc="d", lastmod="x", lastmod_ts=5.0),
            SitemapUrl(loc="e", lastmod="x", lastmod_ts=1.0),
            SitemapUrl(loc="f", lastmod="bad", lastmod_ts=LASTMOD_NONE_TS),
        ]
        self.assertEqual(self.locs_of(fn.fresh_order_of(rows)), ["c", "a", "d", "e", "b", "f"])
        for perm in itertools.permutations(rows):
            out = fn.fresh_order_of(list(perm))
            self.assertEqual(sorted(self.locs_of(out)), ["a", "b", "c", "d", "e", "f"])
            for i in range(len(out) - 1):
                self.assertGreaterEqual(out[i].lastmod_ts, out[i + 1].lastmod_ts)
                if out[i].lastmod_ts == out[i + 1].lastmod_ts:
                    self.assertLess(perm.index(out[i]), perm.index(out[i + 1]))

    def test_plan_partition(self) -> None:
        """规划金标 + 穷举性质(已通知 × sitemap 各取 5 条网址的全部子集,1024 种):待撤 = 已通知 − sitemap(按通知先后)、
        不动数 = |已通知 ∩ sitemap|、待推 = sitemap − 已通知,三者不重不漏。"""
        from indexing import functions as fn
        u = SITE_ROOT + "/jobs/"
        state = IndexState()
        for n in ("1", "2", "3"):
            state.notified[u + n] = Notice(at="t")
        rows = [SitemapUrl(loc=u + "2", lastmod="", lastmod_ts=3.0), SitemapUrl(loc=u + "4", lastmod="", lastmod_ts=1.0),
                SitemapUrl(loc=u + "5", lastmod="", lastmod_ts=2.0)]
        plan = fn.plan_of(PlanIn(rows=rows, state=state))
        self.assertEqual(plan.departed, [u + "1", u + "3"])
        self.assertEqual(plan.kept, 1)
        self.assertEqual(self.locs_of(plan.fresh), [u + "5", u + "4"])
        pool = ["p", "q", "r", "s", "t"]
        for mask_n in range(32):
            for mask_s in range(32):
                st = IndexState()
                live: list[SitemapUrl] = []
                for i in range(5):
                    if mask_n >> i & 1:
                        st.notified[pool[i]] = Notice(at="t")
                    if mask_s >> i & 1:
                        live.append(SitemapUrl(loc=pool[i], lastmod="", lastmod_ts=float(i)))
                got = fn.plan_of(PlanIn(rows=live, state=st))
                live_set = set(self.locs_of(live))
                notified = set(st.notified)
                self.assertEqual(set(got.departed), notified - live_set)
                self.assertEqual(got.kept, len(notified & live_set))
                self.assertEqual(set(self.locs_of(got.fresh)), live_set - notified)

    def test_dry_split(self) -> None:
        """干跑额度切分:剩 3 次,待撤三条(404 / 仍可收录 / noindex)、待推四条 —— 先撤 404 与 noindex 两条(退役那条不占额度),
        再推 lastmod 最新的一条;一次 Google 都不打,额度在内存里记满。"""
        from indexing import functions as fn
        u = SITE_ROOT + "/jobs/"
        fake = FakeClient(routes={u + "1": resp_of(404, ""), u + "2": resp_of(200, "<html>ok</html>"),
                                  u + "3": resp_of(200, '<meta name="robots" content="noindex"/>')}, codes=[])
        state = IndexState(quota=Quota(day="2026-09-26", used=DAILY_QUOTA - 3))
        for n in ("1", "2", "3", "9"):
            state.notified[u + n] = Notice(at="t")
        rows = [
            SitemapUrl(loc=u + "9", lastmod="", lastmod_ts=50.0),
            SitemapUrl(loc=u + "10", lastmod="", lastmod_ts=10.0),
            SitemapUrl(loc=u + "11", lastmod="", lastmod_ts=30.0),
            SitemapUrl(loc=u + "12", lastmod="", lastmod_ts=20.0),
            SitemapUrl(loc=u + "13", lastmod="", lastmod_ts=LASTMOD_NONE_TS),
        ]
        ctx = self.ctx_of(fake, state, True)
        plan = fn.plan_of(PlanIn(rows=rows, state=state))
        with mock.patch.object(fn, "say", Sink().say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
        t = ctx.tally
        self.assertEqual(t.deleted, [u + "1", u + "3"])
        self.assertEqual(t.retired, [u + "2"])
        self.assertEqual(t.pushed, [u + "11"])
        self.assertEqual(t.stop, "")
        self.assertEqual(fake.gets, [u + "1", u + "2", u + "3"])
        self.assertEqual(fake.posted, [])
        self.assertEqual(fake.forms, [])
        self.assertEqual(fn.left_of(ctx), 0)
        self.assertEqual(state.retired[u + "1"].type, TYPE_DELETED)
        self.assertIsNone(state.retired[u + "2"].type)
        self.assertEqual(list(state.notified), [u + "9", u + "11"])

    def test_live_stop_on_429(self) -> None:
        """实发撞 429:第一条成、第二条 429 → 整轮停、今日额度记满、只记成功那条;第三条起不再发;收口不抛(只留痕)。"""
        from indexing import functions as fn
        fake = FakeClient(routes={}, codes=[200, 429])
        state = IndexState()
        ctx = self.ctx_of(fake, state, False)
        plan = fn.plan_of(PlanIn(rows=self.rows_of(5), state=state))
        sink = Sink()
        with mock.patch.object(fn, "say", sink.say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
            fn.report_round(ExecIn(ctx=ctx, plan=plan))
        self.assertEqual(ctx.tally.stop, STOP_QUOTA)
        self.assertEqual(ctx.tally.pushed, [SITE_ROOT + "/jobs/100"])
        self.assertEqual(len(fake.posted), 2)
        self.assertEqual(fake.posted[0], {P_URL: SITE_ROOT + "/jobs/100", P_TYPE: TYPE_UPDATED})
        self.assertEqual(list(state.notified), ctx.tally.pushed)
        self.assertEqual(state.quota.used, DAILY_QUOTA)
        self.assertEqual(fn.left_of(ctx), 0)
        self.assertTrue(any_line_starts(sink.lines, "✗ Google 回 429"))

    def test_live_stop_on_403(self) -> None:
        """实发撞 403:整轮停、什么都不记成已通知;收口抛错,报错里点名服务账号邮箱与「所有者」(告诉 Frank 去 GSC 加人)。"""
        from indexing import functions as fn
        fake = FakeClient(routes={}, codes=[403])
        state = IndexState()
        ctx = self.ctx_of(fake, state, False)
        plan = fn.plan_of(PlanIn(rows=self.rows_of(3), state=state))
        with mock.patch.object(fn, "say", Sink().say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
            with self.assertRaises(RuntimeError) as caught:
                fn.report_round(ExecIn(ctx=ctx, plan=plan))
        self.assertEqual(ctx.tally.stop, STOP_OWNER)
        self.assertEqual(ctx.tally.pushed, [])
        self.assertEqual(len(fake.posted), 1)
        self.assertEqual(len(state.notified), 0)
        self.assertEqual(state.quota.used, 1)
        self.assertIn("bot@proj.iam.gserviceaccount.com", str(caught.exception))
        self.assertIn("所有者", str(caught.exception))

    def test_live_other_errors_continue(self) -> None:
        """实发撞别的错(500 / 400):逐条留痕、接着发下一条;失败的不记成已通知,但都记额度(拿到回应就算)。"""
        from indexing import functions as fn
        fake = FakeClient(routes={}, codes=[500, 200, 400, 200])
        state = IndexState()
        ctx = self.ctx_of(fake, state, False)
        plan = fn.plan_of(PlanIn(rows=self.rows_of(4), state=state))
        sink = Sink()
        with mock.patch.object(fn, "say", sink.say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
            fn.report_round(ExecIn(ctx=ctx, plan=plan))
        u = SITE_ROOT + "/jobs/"
        self.assertEqual(ctx.tally.failed, [u + "100", u + "102"])
        self.assertEqual(ctx.tally.pushed, [u + "101", u + "103"])
        self.assertEqual(ctx.tally.stop, "")
        self.assertEqual(list(state.notified), [u + "101", u + "103"])
        self.assertEqual(state.quota.used, 4)
        self.assertTrue(any_line_starts(sink.lines, "✗ Google 回 500"))

    def test_live_network_stop(self) -> None:
        """实发时网络断:整轮停、断的那条不记额度也不记已通知;收口抛错(本轮算失败)。"""
        from indexing import functions as fn
        fake = FakeClient(routes={}, codes=[200, 0])
        state = IndexState()
        ctx = self.ctx_of(fake, state, False)
        plan = fn.plan_of(PlanIn(rows=self.rows_of(3), state=state))
        with mock.patch.object(fn, "say", Sink().say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
            with self.assertRaises(RuntimeError):
                fn.report_round(ExecIn(ctx=ctx, plan=plan))
        self.assertEqual(ctx.tally.stop, STOP_NET)
        self.assertEqual(ctx.tally.pushed, [SITE_ROOT + "/jobs/100"])
        self.assertEqual(state.quota.used, 1)
        self.assertEqual(len(fake.posted), 2)

    def test_read_sitemap(self) -> None:
        """sitemap 解析:只读本站 https 职位分册(jobs-0 / jobs-new / jobs-1;core、companies、外站、http 分册不读);
        只收本站 /jobs/ 网址;跨分册重复只留 lastmod 新的那条、位置按先出现;lastmod 缺 / 坏分别计数。"""
        from indexing import functions as fn
        api = SITE_ROOT + "/api/sitemaps/"
        u = SITE_ROOT + "/jobs/"
        index = self.index_xml([api + "core.xml", api + "jobs-0.xml", api + "jobs-new.xml", api + "companies-0.xml",
                                "https://evil.example/api/sitemaps/jobs-9.xml", "http://offer2pr.com/api/sitemaps/jobs-2.xml",
                                api + "jobs-1.xml"])
        shard0 = self.urlset_xml([(u + "1", "2026-09-26T05:00:00.000Z"), (u + "2", ""),
                                  ("https://evil.example/jobs/3", "2026-09-26"), (SITE_ROOT + "/companies/acme", "2026-09-26"),
                                  (u + "4", "not-a-date")])
        shard_new = self.urlset_xml([(u + "1", "2026-09-26T06:00:00Z"), (u + "5", "2026-09-25")])
        shard1 = self.urlset_xml([(u + "6", "2026-09-24T12:00:00+00:00"), (u + "5", "2026-09-01")])
        fake = FakeClient(routes={SITEMAP_INDEX_URL: resp_of(200, index), api + "jobs-0.xml": resp_of(200, shard0),
                                  api + "jobs-new.xml": resp_of(200, shard_new), api + "jobs-1.xml": resp_of(200, shard1)},
                          codes=[])
        out = fn.read_sitemap(cast(HttpClientLike, fake))
        self.assertEqual(self.locs_of(out.rows), [u + "1", u + "2", u + "4", u + "5", u + "6"])
        self.assertEqual((out.shards, out.skipped, out.missing, out.bad), (3, 2, 1, 1))
        self.assertEqual(out.rows[0].lastmod, "2026-09-26T06:00:00Z")
        self.assertEqual(out.rows[3].lastmod, "2026-09-25")
        self.assertEqual(out.rows[1].lastmod_ts, LASTMOD_NONE_TS)
        self.assertEqual(out.rows[2].lastmod_ts, LASTMOD_NONE_TS)
        self.assertEqual(fake.gets, [SITEMAP_INDEX_URL, api + "jobs-0.xml", api + "jobs-new.xml", api + "jobs-1.xml"])

    def test_read_sitemap_guards(self) -> None:
        """sitemap 防线:任一职位分册非 2xx → 整轮抛(不拿半份清单算「离开」);分册里一条本站职位网址都没有、
        索引里一个职位分册都没有 → 整轮抛。"""
        from indexing import functions as fn
        api = SITE_ROOT + "/api/sitemaps/"
        index = self.index_xml([api + "jobs-0.xml", api + "jobs-1.xml"])
        good = self.urlset_xml([(SITE_ROOT + "/jobs/1", "")])
        broken = FakeClient(routes={SITEMAP_INDEX_URL: resp_of(200, index), api + "jobs-0.xml": resp_of(200, good),
                                    api + "jobs-1.xml": resp_of(502, "")}, codes=[])
        with self.assertRaises(RuntimeError):
            fn.read_sitemap(cast(HttpClientLike, broken))
        foreign = self.urlset_xml([("https://evil.example/jobs/1", "")])
        empty = FakeClient(routes={SITEMAP_INDEX_URL: resp_of(200, index), api + "jobs-0.xml": resp_of(200, self.urlset_xml([])),
                                   api + "jobs-1.xml": resp_of(200, foreign)}, codes=[])
        with self.assertRaises(RuntimeError):
            fn.read_sitemap(cast(HttpClientLike, empty))
        no_shard = FakeClient(routes={SITEMAP_INDEX_URL: resp_of(200, self.index_xml([api + "core.xml"]))}, codes=[])
        with self.assertRaises(RuntimeError):
            fn.read_sitemap(cast(HttpClientLike, no_shard))

    def test_jwt_and_token(self) -> None:
        """RS256:现造一把 RSA 钥 → jwt_of 的三段可解、头体各格对、签名用公钥验得过(验不过 verify 直接抛);
        实发路径一轮只换一次 token,换 token 表单是 jwt-bearer + 同样验得过的断言。"""
        from indexing import functions as fn
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pem = private.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                    serialization.NoEncryption()).decode("ascii")
        key = ServiceKey(client_email="bot@proj.iam.gserviceaccount.com", private_key=pem, private_key_id="kid-1")
        token = fn.jwt_of(JwtIn(key=key, now=1790000000))
        parts = token.split(".")
        self.assertEqual(len(parts), 3)
        self.assertEqual(json.loads(b64url_decode(parts[0])), {"alg": "RS256", "typ": "JWT", "kid": "kid-1"})
        self.assertEqual(json.loads(b64url_decode(parts[1])),
                         {"iss": key.client_email, "scope": INDEXING_SCOPE, "aud": TOKEN_URL, "iat": 1790000000,
                          "exp": 1790003600})
        private.public_key().verify(b64url_decode(parts[2]), (parts[0] + "." + parts[1]).encode("ascii"),
                                    padding.PKCS1v15(), hashes.SHA256())
        fake = FakeClient(routes={}, codes=[])
        ctx = self.ctx_of(fake, IndexState(), False)
        ctx.key = key
        ctx.token = ""
        plan = fn.plan_of(PlanIn(rows=self.rows_of(3), state=ctx.state))
        with mock.patch.object(fn, "say", Sink().say):
            fn.execute(ExecIn(ctx=ctx, plan=plan))
        self.assertEqual(len(fake.forms), 1)
        self.assertEqual(len(ctx.tally.pushed), 3)
        self.assertEqual(fake.forms[0][P_GRANT_TYPE], GRANT_JWT_BEARER)
        sent = str(fake.forms[0][P_ASSERTION]).split(".")
        private.public_key().verify(b64url_decode(sent[2]), (sent[0] + "." + sent[1]).encode("ascii"),
                                    padding.PKCS1v15(), hashes.SHA256())

    def test_to_service_key(self) -> None:
        """密钥形状:服务账号 JSON 三格齐 → ServiceKey(缺 private_key_id 只是 kid 空);type 不对 / 缺邮箱 / 私钥空 /
        不是对象 → 抛(配错了要红,不当「没配」)。"""
        from indexing import functions as fn
        good = {"type": "service_account", "client_email": "a@b", "private_key": "PEM", "private_key_id": "k"}
        key = fn.to_service_key(good)
        self.assertEqual((key.client_email, key.private_key, key.private_key_id), ("a@b", "PEM", "k"))
        no_kid = {"type": "service_account", "client_email": "a@b", "private_key": "PEM"}
        self.assertEqual(fn.to_service_key(no_kid).private_key_id, "")
        bads: list[object] = [
            {"type": "authorized_user", "client_email": "a@b", "private_key": "PEM"},
            {"type": "service_account", "private_key": "PEM"},
            {"type": "service_account", "client_email": "a@b", "private_key": ""},
            {"type": "service_account", "client_email": 7, "private_key": "PEM"},
            [],
            "service_account",
            None,
        ]
        for bad in bads:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    fn.to_service_key(bad)

    def test_state_file(self) -> None:
        """状态文件契约:缺文件 = 空状态;写出去再读回来一格不差;只退役的 type 落成 JSON null(记录了「没发」);
        坏 JSON 照抛(不许悄悄重置成空 —— 重置 = 全部重推、额度白烧)。落临时目录,不碰仓内状态。"""
        from indexing import functions as fn
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "indexing" / "state.json"
            with mock.patch.object(fn, "OUT_STATE", target):
                self.assertEqual(fn.read_state(), IndexState())
                state = IndexState(quota=Quota(day="2026-09-26", used=7))
                state.notified[SITE_ROOT + "/jobs/1"] = Notice(type=TYPE_UPDATED, at="2026-09-26T10:00:00Z")
                state.retired[SITE_ROOT + "/jobs/2"] = Retired(type=None, at="2026-09-26T10:01:00Z", why="页面仍可收录")
                state.retired[SITE_ROOT + "/jobs/3"] = Retired(type=TYPE_DELETED, at="2026-09-26T10:02:00Z", why="http 404")
                fn.write_state(state)
                self.assertIn('"type": null', target.read_text(encoding="utf-8"))
                self.assertEqual(fn.read_state(), state)
                target.write_text("{not json", encoding="utf-8")
                with self.assertRaises(ValueError):
                    fn.read_state()

    def test_no_key_skips(self) -> None:
        """没配密钥:环境变量没设 / 指向的文件不在 → 返回 None,各只打一行 ⚠ 警告(不是 ✗,调度层不升 ERROR)。"""
        from indexing import functions as fn
        sink = Sink()
        with mock.patch.object(fn, "say", sink.say):
            with mock.patch.dict(os.environ, {ENV_KEY_FILE: ""}):
                self.assertIsNone(fn.key_of_env())
            with mock.patch.dict(os.environ, {ENV_KEY_FILE: "secrets/definitely-missing-google-key.json"}):
                self.assertIsNone(fn.key_of_env())
        self.assertEqual(len(sink.lines), 2)
        for line in sink.lines:
            self.assertTrue(line.startswith("⚠ 未配置 Google Indexing 密钥,本轮跳过"), line)

    def test_notify_round_without_key_touches_nothing(self) -> None:
        """实发入口没配密钥:一行警告就退 —— 不开 HTTP 客户端(不读 sitemap、不打 Google)、不写状态(被调即判红)。"""
        from indexing import functions as fn
        sink = Sink()
        with mock.patch.dict(os.environ, {ENV_KEY_FILE: ""}), \
                mock.patch.object(fn, "say", sink.say), \
                mock.patch.object(fn, "make_client", side_effect=AssertionError("no http without key")), \
                mock.patch.object(fn, "write_state", side_effect=AssertionError("no write without key")):
            fn.notify_round()
        self.assertEqual(sink.lines, [NOTE_NO_KEY])


def any_line_starts(lines: list[str], head: str) -> bool:
    """有没有一行以 head 开头(断言留痕用)。"""
    for line in lines:
        if line.startswith(head):
            return True
    return False
