"""
indexing 域函数 —— 全部行为住这(照 explore 样张,方言律全集见 docs/design/etl分域-20260829.md §4)。

三个入口(零参):notify_round(默认链,实发)/ dry_round(干跑:只算不调 Google、不落盘)/ run_tests(决策逻辑自测)。
**零字符串令**(字面量全住 constants)/ **显式循环令**(禁推导 / genexp / lambda)/ **内嵌禁令** /
**一参令**(多入参收 scheme 的 XxxIn dataclass)。实发与干跑走同一条执行路(execute):差别只在 send 碰不碰 Google、
run_round 落不落盘 —— 干跑报的数就是实发这一轮会做的事。
依赖单边:本文件 → constants/scheme + 基础设施叶(paths / log / fetch)+ cryptography(RS256 签名;2026-09-26 为本域加的唯一依赖)。

@author Frank
@time 2026-09-26 02:41:24
"""
import base64
import json
import os
import sys
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import cast
from urllib.parse import urlsplit
from xml.etree import ElementTree

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

import paths
from fetch.functions import make_client
from log.functions import say
from indexing.constants import (
    ASCII, B64_PAD, BEARER_TPL, DAILY_QUOTA, DAYS_PER_WEEK, DRY_SHOW_N, DST_END_MONTH, DST_END_NTH, DST_END_UTC_HOUR,
    DST_START_MONTH, DST_START_NTH, DST_START_UTC_HOUR, EMPTY_SITEMAP_TPL, ENV_KEY_FILE, ERR_WHY_TPL, FIELD_NONE, FLUSH_N,
    GONE_STATUSES, GRANT_JWT_BEARER, HDR_AUTH, HDR_X_ROBOTS, HTTP_FAIL_TPL, HTTP_FORBIDDEN, HTTP_OK_MAX, HTTP_OK_MIN,
    HTTP_TIMEOUT_S, HTTP_TOO_MANY, INDEXING_SCOPE, ISO_FMT, JOB_PATH_PREFIX, JOBS_SHARD_PREFIX, JSON_COMPACT_SEPS,
    JSON_INDENT, JWT_ALG, JWT_SEP, JWT_TTL_S, JWT_TYP, K_ACCESS_TOKEN, K_ALG, K_AUD, K_CLIENT_EMAIL, K_ERROR, K_ERROR_DESC,
    K_EXP, K_IAT, K_ISS, K_KID, K_MESSAGE, K_PRIVATE_KEY, K_PRIVATE_KEY_ID, K_SCOPE, K_TYP, K_TYPE, KEY_BAD_MSG,
    KEY_NOT_RSA_MSG, KEY_TYPE_SA, LASTMOD_MISSING_WORD, LASTMOD_NONE_TS, META_CONTENT_RE, META_NAME_RE, META_TAG_RE,
    MODE_DRY, MODE_LIVE, MSG_MAX_LEN, NET_STOP_TPL, NO_KEY_LIVE_MSG, NOINDEX_RE, NOTE_NO_KEY, NOTE_NO_KEY_FILE_TPL,
    OUT_STATE, OWNER_TPL, P_ASSERTION, P_GRANT_TYPE, P_TYPE, P_URL, PAGE_CHECK_MAX, PDT_OFFSET_H, PRINT_429_TPL,
    PRINT_API_FAIL_TPL, PRINT_DONE_TPL, PRINT_PLAN_TPL, PRINT_QUOTA_OUT_TPL, PRINT_RETIRE_TPL, PRINT_SAMPLE_DEL_TPL,
    PRINT_SAMPLE_TPL, PRINT_SENT_TPL, PRINT_UNSURE_TPL, PST_OFFSET_H, PUBLISH_URL, RES_FAILED, RES_SENT, ROBOTS_NAMES,
    SITE_HOST, SITE_ROOT, SITE_SCHEME, SITEMAP_INDEX_URL, SITEMAP_MIN_URLS, STOP_NET, STOP_OWNER, STOP_QUOTA, SUNDAY,
    TAG_LASTMOD, TAG_LOC, TAG_SITEMAP, TAG_URL, TEST_VERBOSITY, TEXT_ENCODING, TOKEN_EMPTY_MSG, TOKEN_ERR_TPL,
    TOKEN_FAIL_TPL, TOKEN_URL, TYPE_DELETED, TYPE_UPDATED, V_DELETE, V_KEEP, V_UNSURE, WHY_HTTP_TPL, WHY_INDEXABLE,
    WHY_NOINDEX_HDR, WHY_NOINDEX_META,
)
from indexing.scheme import (
    ExecIn, HttpClientLike, HttpResponseLike, IndexingDecisionTest, IndexState, JudgeIn, JwtIn, MergeIn, Notice,
    NotifyIn, NthSundayIn, PageSeen, Plan, PlanIn, PublishIn, PublishOut, QuotaIn, Retired, RetireIn, RoundCtx, RoundIn,
    SendIn, ServiceKey, SignIn, SitemapOut, SitemapUrl, Tally, TokenIn, Verdict, XmlGetIn,
)

# =========================================================================
# 1. 入口:一轮 = 读密钥 → 读状态 → 读 sitemap → 先撤回 → 再推新 → 落盘
# =========================================================================


def notify_round() -> None:
    """notify 步入口(默认链):实发一轮 —— 没配密钥一行警告跳过;今日额度已用完跳过;否则先撤回、再推新,状态落盘。"""
    run_round(RoundIn(dry=False))


def dry_round() -> None:
    """dry 步入口:干跑一轮 —— 读线上 sitemap 与本地状态、查离开 sitemap 的页,只算「会推多少、会撤多少」;
    不要密钥、不调 Google、不落盘。"""
    run_round(RoundIn(dry=True))


def run_round(x: RoundIn) -> None:
    """一轮的骨架:读密钥(干跑不读)→ 读状态 → 算太平洋日与剩余额度 → 读 sitemap → 规划 → 执行 → 落盘(干跑不落)→ 收口。

    没配密钥在一切网络之前就退(不读 sitemap、不打 Google、不写状态)。落盘放 finally:执行段中途抛(换 token 失败等)
    也先把已发的记下,免得下轮重发白烧额度。
    """
    key: ServiceKey | None = None
    if x.dry is False:
        key = key_of_env()
        if key is None:
            return
    state = read_state()
    today = pacific_day_of(datetime.now(timezone.utc))
    left = quota_left_of(QuotaIn(quota=state.quota, today=today))
    if left == 0 and x.dry is False:
        say(PRINT_QUOTA_OUT_TPL.format(day=today, quota=DAILY_QUOTA))
        return
    with make_client(timeout=HTTP_TIMEOUT_S) as raw:
        client = cast(HttpClientLike, raw)
        site = read_sitemap(client)
        plan = plan_of(PlanIn(rows=site.rows, state=state))
        say(PRINT_PLAN_TPL.format(shards=site.shards, total=len(site.rows), skipped=site.skipped, missing=site.missing,
                                  bad=site.bad, notified=len(state.notified), kept=plan.kept,
                                  departed=len(plan.departed), fresh=len(plan.fresh), day=today, left=left,
                                  quota=DAILY_QUOTA))
        ctx = RoundCtx(client=client, key=key, token=FIELD_NONE, dry=x.dry, persist=x.dry is False, state=state,
                       today=today, tally=Tally())
        try:
            execute(ExecIn(ctx=ctx, plan=plan))
        finally:
            if ctx.persist:
                write_state(state)
    report_round(ExecIn(ctx=ctx, plan=plan))


def report_round(x: ExecIn) -> None:
    """收口:干跑先列样本;打收尾行;403 / 网络断在这里抛(状态已落盘)—— 门的 err 接,本轮算失败、不发心跳。
    429 不抛:只是今天发不动了,✗ 行已留痕,太平洋零点后自然恢复。"""
    ctx = x.ctx
    t = ctx.tally
    if ctx.dry:
        show_samples(x)
    say(PRINT_DONE_TPL.format(mode=mode_of(ctx), deleted=len(t.deleted), retired=len(t.retired),
                              unsure=len(t.unsure), pushed=len(t.pushed), failed=len(t.failed),
                              used=DAILY_QUOTA - left_of(ctx), quota=DAILY_QUOTA))
    if t.stop == STOP_OWNER:
        raise RuntimeError(OWNER_TPL.format(email=email_of(ctx), site=SITE_ROOT, message=t.stop_note))
    if t.stop == STOP_NET:
        raise RuntimeError(NET_STOP_TPL.format(note=t.stop_note))


def show_samples(x: ExecIn) -> None:
    """干跑样本:会撤的、会推的各列至多 DRY_SHOW_N 条(会推的按 lastmod 新→旧 = 实发的发送次序)。"""
    for url in x.ctx.tally.deleted[:DRY_SHOW_N]:
        say(PRINT_SAMPLE_DEL_TPL.format(url=url))
    for row in x.plan.fresh[:min(DRY_SHOW_N, len(x.ctx.tally.pushed))]:
        say(PRINT_SAMPLE_TPL.format(url=row.loc, lastmod=lastmod_text_of(row)))


def lastmod_text_of(row: SitemapUrl) -> str:
    """样本行里的 lastmod(缺席写「缺」)。"""
    if row.lastmod == FIELD_NONE:
        return LASTMOD_MISSING_WORD
    return row.lastmod


def mode_of(ctx: RoundCtx) -> str:
    """收尾行里的模式说法。"""
    if ctx.dry:
        return MODE_DRY
    return MODE_LIVE


def email_of(ctx: RoundCtx) -> str:
    """服务账号邮箱(报 403 用;干跑没有密钥 = 空串)。"""
    if ctx.key is None:
        return FIELD_NONE
    return ctx.key.client_email


# =========================================================================
# 2. 读 sitemap(职位分册)
# =========================================================================


def read_sitemap(client: HttpClientLike) -> SitemapOut:
    """读线上 sitemap:索引 → 本站职位分册(路径以 JOBS_SHARD_PREFIX 开头,含批 1 新增的 jobs-new.xml)→ 每条 url 的
    loc + lastmod;同一网址出现在两个分册里只留 lastmod 新的那条(位置按先出现的)。

    自家站,不落 crawl 层:crawl 层存的是「别人的页面原文」,好让解析出错时离线重来;这里读的是本站自己现算的清单,
    要的就是此刻的真相,留旧版反而会拿过期清单去撤回。任一分册拿不到整轮抛 —— 拿半份 sitemap 算「离开」
    会把整片撤掉;一条本站职位网址都没有同样抛(SITEMAP_MIN_URLS 防线)。
    """
    shards = shard_locs_of(xml_of(XmlGetIn(client=client, url=SITEMAP_INDEX_URL)))
    seen: dict[str, SitemapUrl] = {}
    skipped = 0
    for loc in shards:
        for el in xml_of(XmlGetIn(client=client, url=loc)).iter(TAG_URL):
            row = to_sitemap_url(el)
            if is_own_job(row.loc) is False:
                skipped += 1
                continue
            merge_url(MergeIn(seen=seen, row=row))
    out = SitemapOut(rows=list(seen.values()), shards=len(shards), skipped=skipped, missing=0, bad=0)
    count_lastmod(out)
    if len(out.rows) < SITEMAP_MIN_URLS:
        raise RuntimeError(EMPTY_SITEMAP_TPL.format(shards=len(shards)))
    return out


def xml_of(x: XmlGetIn) -> ElementTree.Element:
    """GET 一份 sitemap XML → 根元素(按字节交给解析器,编码听 XML 声明的);非 2xx 抛。"""
    r = x.client.get(x.url, headers={})
    if r.is_success is False:
        raise RuntimeError(HTTP_FAIL_TPL.format(status=r.status_code, url=x.url))
    return ElementTree.fromstring(r.content)


def shard_locs_of(root: ElementTree.Element) -> list[str]:
    """索引里本站的职位分册地址(别的主机、非 https、core / companies 分册一律不认)。"""
    locs: list[str] = []
    for item in root.iter(TAG_SITEMAP):
        loc = text_of(item.find(TAG_LOC))
        parts = urlsplit(loc)
        if parts.scheme == SITE_SCHEME and parts.hostname == SITE_HOST and parts.path.startswith(JOBS_SHARD_PREFIX):
            locs.append(loc)
    return locs


def text_of(el: ElementTree.Element | None) -> str:
    """元素文本(去首尾空白;元素缺席 / 无文本 = 空串)。"""
    if el is None or el.text is None:
        return FIELD_NONE
    return el.text.strip()


def to_sitemap_url(el: ElementTree.Element) -> SitemapUrl:
    """分册里一条 url 元素 → SitemapUrl(行构造器:lastmod 在这里解析成排序键,缺 / 坏 = LASTMOD_NONE_TS)。"""
    lastmod = text_of(el.find(TAG_LASTMOD))
    return SitemapUrl(loc=text_of(el.find(TAG_LOC)), lastmod=lastmod, lastmod_ts=lastmod_ts_of(lastmod))


def lastmod_ts_of(text: str) -> float:
    """lastmod → epoch 秒(W3C 日期 / 日期时间,带 Z 或偏移;不带时区按 UTC)。缺席或解析不了 = LASTMOD_NONE_TS ——
    与「缺 lastmod 的排最后」同一档;坏的另由 count_lastmod 记数进规划行,不静默。"""
    if text == FIELD_NONE:
        return LASTMOD_NONE_TS
    try:
        stamp = datetime.fromisoformat(text)
    except ValueError:
        return LASTMOD_NONE_TS
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.timestamp()


def is_own_job(url: str) -> bool:
    """这是本站的职位页吗(https + 本站主机 + /jobs/ 路径)—— 只有它们才去通知 Google。"""
    parts = urlsplit(url)
    return parts.scheme == SITE_SCHEME and parts.hostname == SITE_HOST and parts.path.startswith(JOB_PATH_PREFIX)


def merge_url(x: MergeIn) -> None:
    """去重并入:同一网址只留 lastmod 新的那条(dict 覆盖值不挪位,位置按先出现的)。"""
    old = x.seen.get(x.row.loc)
    if old is None or x.row.lastmod_ts > old.lastmod_ts:
        x.seen[x.row.loc] = x.row


def count_lastmod(out: SitemapOut) -> None:
    """数 lastmod 缺席与坏掉的条数(进规划行)。"""
    for row in out.rows:
        if row.lastmod == FIELD_NONE:
            out.missing += 1
        elif row.lastmod_ts == LASTMOD_NONE_TS:
            out.bad += 1


# =========================================================================
# 3. 规划与排序(纯函数)
# =========================================================================


def plan_of(x: PlanIn) -> Plan:
    """规划:已通知且还在 sitemap 的不动;已通知但离开 sitemap 的进待撤(按当初通知的先后);
    sitemap 里还没通知过的进待推(lastmod 新→旧)。"""
    live: set[str] = set()
    fresh: list[SitemapUrl] = []
    for row in x.rows:
        live.add(row.loc)
        if row.loc not in x.state.notified:
            fresh.append(row)
    departed: list[str] = []
    kept = 0
    for url in x.state.notified:
        if url in live:
            kept += 1
        else:
            departed.append(url)
    return Plan(departed=departed, fresh=fresh_order_of(fresh), kept=kept)


def fresh_order_of(rows: list[SitemapUrl]) -> list[SitemapUrl]:
    """待推次序:lastmod 新→旧,缺 / 坏的排最后;同值保 sitemap 原序(sorted 稳定,reverse=True 也保稳定)。"""
    return sorted(rows, key=lastmod_key_of, reverse=True)


def lastmod_key_of(row: SitemapUrl) -> float:
    """排序键:lastmod 的 epoch 秒。"""
    return row.lastmod_ts


# =========================================================================
# 4. 额度与太平洋时区
# =========================================================================


def pacific_day_of(now: datetime) -> str:
    """UTC 时刻(带时区)→ 美国太平洋时区的日期 YYYY-MM-DD(Indexing API 的日额度按它的零点重置)。

    不用 zoneinfo:Windows venv 没带 IANA 时区库(实测 ZoneInfoNotFoundError),容器镜像也不保证有 tzdata
    (compose 的 TZ 取 EST5EDT 正是为了不靠它),为一个时区再加 tzdata 包又多一个依赖。美国夏令时规则(2007 起)
    住 constants 的 DST_* 几格:三月第二个周日 10:00 UTC 起、十一月第一个周日 09:00 UTC 止;规则再改只动那几格。
    """
    start = nth_sunday_utc_of(NthSundayIn(year=now.year, month=DST_START_MONTH, nth=DST_START_NTH,
                                          hour=DST_START_UTC_HOUR))
    end = nth_sunday_utc_of(NthSundayIn(year=now.year, month=DST_END_MONTH, nth=DST_END_NTH, hour=DST_END_UTC_HOUR))
    offset = PST_OFFSET_H
    if start <= now < end:
        offset = PDT_OFFSET_H
    return (now + timedelta(hours=offset)).date().isoformat()


def nth_sunday_utc_of(x: NthSundayIn) -> datetime:
    """某年某月第 n 个周日的某个 UTC 整点(夏令时切换时刻)。"""
    first = datetime(x.year, x.month, 1, x.hour, tzinfo=timezone.utc)
    return first + timedelta(days=(SUNDAY - first.weekday()) % DAYS_PER_WEEK + (x.nth - 1) * DAYS_PER_WEEK)


def quota_left_of(x: QuotaIn) -> int:
    """今日剩余额度(纯函数):记账日不是今天 = 新的一天,整 DAILY_QUOTA;记超了按 0 算。"""
    if x.quota.day != x.today:
        return DAILY_QUOTA
    return max(DAILY_QUOTA - x.quota.used, 0)


def left_of(ctx: RoundCtx) -> int:
    """本轮此刻的剩余额度。"""
    return quota_left_of(QuotaIn(quota=ctx.state.quota, today=ctx.today))


def spend(ctx: RoundCtx) -> None:
    """记一次发布请求(干跑也记在内存里 —— 额度切分与实发走同一条路;干跑不落盘)。"""
    roll_quota(ctx)
    ctx.state.quota.used += 1


def exhaust(ctx: RoundCtx) -> None:
    """Google 回 429:今日额度记满(本轮停,当天后面几轮不再白撞;太平洋零点后自然重置)。"""
    roll_quota(ctx)
    ctx.state.quota.used = max(ctx.state.quota.used, DAILY_QUOTA)


def roll_quota(ctx: RoundCtx) -> None:
    """记账日换成今天(跨过太平洋零点后的第一次记账把已用清零)。"""
    if ctx.state.quota.day != ctx.today:
        ctx.state.quota.day = ctx.today
        ctx.state.quota.used = 0


# =========================================================================
# 5. 撤回判定(查页)与执行
# =========================================================================


def execute(x: ExecIn) -> None:
    """执行(实发与干跑同一条路):先撤回、再推新;撞上整轮停(429 / 403 / 网络断)立刻收手。"""
    retract(x)
    if x.ctx.tally.stop == FIELD_NONE:
        push_fresh(x)


def retract(x: ExecIn) -> None:
    """先撤回:离开 sitemap 的已通知网址逐个查页(每轮至多 PAGE_CHECK_MAX 个,额度用完即止,剩下的下轮接着查)——
    404 / 410 / noindex 才发 URL_DELETED;页面仍可收录(比如岗还在架只是没了投递邮箱)只从状态里退役、不发;
    查不动(网络 / 5xx / 其他状态码)留痕并留在已通知里,下轮再查。"""
    ctx = x.ctx
    checked = 0
    for url in x.plan.departed:
        if checked >= PAGE_CHECK_MAX or left_of(ctx) == 0:
            return
        checked += 1
        verdict = judge_page(JudgeIn(client=ctx.client, url=url))
        if verdict.kind == V_KEEP:
            retire(RetireIn(ctx=ctx, url=url, sent=None, why=verdict.why))
            ctx.tally.retired.append(url)
            say(PRINT_RETIRE_TPL.format(url=url, why=verdict.why))
            continue
        if verdict.kind == V_UNSURE:
            ctx.tally.unsure.append(url)
            say(PRINT_UNSURE_TPL.format(url=url, why=verdict.why))
            continue
        res = send(SendIn(ctx=ctx, url=url, kind=TYPE_DELETED))
        if res == RES_SENT:
            retire(RetireIn(ctx=ctx, url=url, sent=TYPE_DELETED, why=verdict.why))
            ctx.tally.deleted.append(url)
        elif res == RES_FAILED:
            ctx.tally.failed.append(url)
        else:
            return


def judge_page(x: JudgeIn) -> Verdict:
    """查一个离开 sitemap 的页:GET(跟随跳转,看落地页)→ verdict_of;网络断 / 超时 = 没结论(由头 = 异常类名与详情)。"""
    try:
        r = x.client.get(x.url, headers={})
    except httpx.TransportError as e:
        return Verdict(kind=V_UNSURE, why=ERR_WHY_TPL.format(name=type(e).__name__, detail=e))
    return verdict_of(PageSeen(status=r.status_code, robots=r.headers.get(HDR_X_ROBOTS, FIELD_NONE), html=r.text))


def verdict_of(x: PageSeen) -> Verdict:
    """撤回判定(纯函数):404 / 410 → 撤;2xx 且(X-Robots-Tag 头或 robots / googlebot meta 写了 noindex / none)→ 撤;
    2xx 可收录 → 只退役;其余状态码(5xx、403 挑战页、没跟完的 3xx)→ 没结论。"""
    if x.status in GONE_STATUSES:
        return Verdict(kind=V_DELETE, why=WHY_HTTP_TPL.format(status=x.status))
    if x.status < HTTP_OK_MIN or x.status >= HTTP_OK_MAX:
        return Verdict(kind=V_UNSURE, why=WHY_HTTP_TPL.format(status=x.status))
    if NOINDEX_RE.search(x.robots) is not None:
        return Verdict(kind=V_DELETE, why=WHY_NOINDEX_HDR)
    if has_noindex_meta(x.html):
        return Verdict(kind=V_DELETE, why=WHY_NOINDEX_META)
    return Verdict(kind=V_KEEP, why=WHY_INDEXABLE)


def has_noindex_meta(html: str) -> bool:
    """页里有没有 name = robots / googlebot、content 含 noindex / none 的 meta(属性先后都认)。"""
    for m in META_TAG_RE.finditer(html):
        tag = m.group(0)
        name = META_NAME_RE.search(tag)
        if name is None or name.group(1).lower() not in ROBOTS_NAMES:
            continue
        content = META_CONTENT_RE.search(tag)
        if content is not None and NOINDEX_RE.search(content.group(1)) is not None:
            return True
    return False


def retire(x: RetireIn) -> None:
    """一条网址出已通知、进已撤回(sent = URL_DELETED:发过撤回;None:页面仍可收录,只退役没发)。"""
    x.ctx.state.notified.pop(x.url, None)
    x.ctx.state.retired[x.url] = Retired(type=x.sent, at=now_iso(), why=x.why)
    flush(x.ctx)


def flush(ctx: RoundCtx) -> None:
    """实发每记满 FLUSH_N 条落一次盘(中途被杀不丢已发的记录);干跑与自测(persist=False)不落。"""
    ctx.dirty += 1
    if ctx.persist and ctx.dirty >= FLUSH_N:
        write_state(ctx.state)
        ctx.dirty = 0


def push_fresh(x: ExecIn) -> None:
    """再推新:sitemap 里还没通知过的,按规划次序(lastmod 新→旧)用完今日剩余额度,发 URL_UPDATED。"""
    ctx = x.ctx
    for row in x.plan.fresh:
        if left_of(ctx) == 0:
            return
        res = send(SendIn(ctx=ctx, url=row.loc, kind=TYPE_UPDATED))
        if res == RES_SENT:
            notify(NotifyIn(ctx=ctx, url=row.loc))
            ctx.tally.pushed.append(row.loc)
        elif res == RES_FAILED:
            ctx.tally.failed.append(row.loc)
        else:
            return


def notify(x: NotifyIn) -> None:
    """一条网址记进已通知(URL_UPDATED 发成);以前撤回 / 退役过、这回又进了 sitemap 的,从已撤回里拿掉。"""
    x.ctx.state.notified[x.url] = Notice(type=TYPE_UPDATED, at=now_iso())
    x.ctx.state.retired.pop(x.url, None)
    flush(x.ctx)


# =========================================================================
# 6. Google 鉴权与发布
# =========================================================================


def send(x: SendIn) -> str:
    """发一次通知,返回 RES_SENT / RES_FAILED,或整轮停的 STOP_*(同时记进 tally.stop / stop_note)。

    干跑:只在内存里记额度,返回 RES_SENT,不碰 Google。实发:本轮头一回用时换 access token(失败直接抛);
    没拿到回应(网络断)不记额度、整轮停;拿到回应就记一次额度(Google 那边已计数,宁多记不少记);2xx 成功;
    429 → 今日额度记满、整轮停;403 → 资源所有者没配、整轮停;其余状态逐条留痕,接着发下一条。
    """
    ctx = x.ctx
    if ctx.dry:
        spend(ctx)
        return RES_SENT
    if ctx.token == FIELD_NONE:
        ctx.token = token_of(TokenIn(client=ctx.client, key=key_of_ctx(ctx)))
    try:
        out = publish(PublishIn(client=ctx.client, token=ctx.token, url=x.url, kind=x.kind))
    except httpx.TransportError as e:
        ctx.tally.stop = STOP_NET
        ctx.tally.stop_note = ERR_WHY_TPL.format(name=type(e).__name__, detail=e)
        return STOP_NET
    spend(ctx)
    if HTTP_OK_MIN <= out.status < HTTP_OK_MAX:
        say(PRINT_SENT_TPL.format(kind=x.kind, url=x.url))
        return RES_SENT
    if out.status == HTTP_TOO_MANY:
        exhaust(ctx)
        say(PRINT_429_TPL.format(day=ctx.today, message=out.message))
        ctx.tally.stop = STOP_QUOTA
        return STOP_QUOTA
    if out.status == HTTP_FORBIDDEN:
        ctx.tally.stop = STOP_OWNER
        ctx.tally.stop_note = out.message
        return STOP_OWNER
    say(PRINT_API_FAIL_TPL.format(status=out.status, kind=x.kind, url=x.url, message=out.message))
    return RES_FAILED


def key_of_ctx(ctx: RoundCtx) -> ServiceKey:
    """实发路径上的密钥(入口已挡住没配的;拿不到就是代码病,当场抛)。"""
    if ctx.key is None:
        raise RuntimeError(NO_KEY_LIVE_MSG)
    return ctx.key


def token_of(x: TokenIn) -> str:
    """服务账号换 access token:签 JWT(RS256,scope = indexing)→ POST TOKEN_URL(jwt-bearer 授权)→ access_token;
    非 2xx 或回包缺 token 抛(报错只带状态码与 Google 原话,不带私钥与断言)。"""
    assertion = jwt_of(JwtIn(key=x.key, now=int(time.time())))
    r = x.client.post(TOKEN_URL, data={P_GRANT_TYPE: GRANT_JWT_BEARER, P_ASSERTION: assertion}, json=None, headers={})
    if r.is_success is False:
        raise RuntimeError(TOKEN_FAIL_TPL.format(status=r.status_code, message=message_of(r)))
    token = to_access_token(r.json())
    if token == FIELD_NONE:
        raise RuntimeError(TOKEN_EMPTY_MSG)
    return token


def jwt_of(x: JwtIn) -> str:
    """签 JWT(RFC 7519,RS256):头 {alg, typ, kid} + 体 {iss, scope, aud, iat, exp},各段 base64url 去补位,点号连接。"""
    head = {K_ALG: JWT_ALG, K_TYP: JWT_TYP, K_KID: x.key.private_key_id}
    claims = {K_ISS: x.key.client_email, K_SCOPE: INDEXING_SCOPE, K_AUD: TOKEN_URL, K_IAT: x.now,
              K_EXP: x.now + JWT_TTL_S}
    signing_input = JWT_SEP.join((b64url_of(json.dumps(head, separators=JSON_COMPACT_SEPS).encode(ASCII)),
                                  b64url_of(json.dumps(claims, separators=JSON_COMPACT_SEPS).encode(ASCII))))
    signature = sign_rs256(SignIn(pem=x.key.private_key, data=signing_input.encode(ASCII)))
    return JWT_SEP.join((signing_input, b64url_of(signature)))


def b64url_of(raw: bytes) -> str:
    """base64url 编码去补位(JWT 各段的写法)。"""
    return base64.urlsafe_b64encode(raw).rstrip(B64_PAD).decode(ASCII)


def sign_rs256(x: SignIn) -> bytes:
    """RSASSA-PKCS1-v1_5 + SHA-256 签名(= JWT 的 RS256;私钥是服务账号密钥里的 PEM)。"""
    key = serialization.load_pem_private_key(x.pem.encode(ASCII), password=None)
    if isinstance(key, rsa.RSAPrivateKey):
        return key.sign(x.data, padding.PKCS1v15(), hashes.SHA256())
    raise ValueError(KEY_NOT_RSA_MSG)


def to_access_token(body: object) -> str:
    """换 token 回包 → access_token(缺 / 不是字符串 = 空串)。"""
    if isinstance(body, dict):
        token = body.get(K_ACCESS_TOKEN)
        if isinstance(token, str):
            return token
    return FIELD_NONE


def publish(x: PublishIn) -> PublishOut:
    """POST 一条通知到 PUBLISH_URL,返回状态码与(非 2xx 时的)Google 原话;网络断的 TransportError 照抛给 send。"""
    r = x.client.post(PUBLISH_URL, data=None, json={P_URL: x.url, P_TYPE: x.kind},
                      headers={HDR_AUTH: BEARER_TPL.format(token=x.token)})
    if r.is_success:
        return PublishOut(status=r.status_code, message=FIELD_NONE)
    return PublishOut(status=r.status_code, message=message_of(r))


def message_of(r: HttpResponseLike) -> str:
    """Google 回包里的错误原话:JSON 的 error.message(发布接口)或 error + error_description(换 token 接口);
    不是 JSON 就截原文头 MSG_MAX_LEN 字。"""
    try:
        body = r.json()
    except ValueError:
        return r.text[:MSG_MAX_LEN]
    return to_message(body)


def to_message(body: object) -> str:
    """错误回包 → 原话(认不出形状 = 空串)。"""
    if isinstance(body, dict):
        error = body.get(K_ERROR)
        if isinstance(error, dict):
            return str(error.get(K_MESSAGE, FIELD_NONE))
        if isinstance(error, str):
            return TOKEN_ERR_TPL.format(error=error, desc=body.get(K_ERROR_DESC, FIELD_NONE))
    return FIELD_NONE


def key_of_env() -> ServiceKey | None:
    """读密钥:环境变量 → 文件路径(相对路径按仓库根)→ 服务账号 JSON。没配 / 文件还没放 = 一行警告,返回 None(本轮跳过);
    文件在但形状不对直接抛 —— 配错了要红,不当「没配」混过去。"""
    raw = os.environ.get(ENV_KEY_FILE, FIELD_NONE).strip()
    if raw == FIELD_NONE:
        say(NOTE_NO_KEY)
        return None
    path = Path(raw)
    if path.is_absolute() is False:
        path = paths.ROOT / raw
    if path.exists() is False:
        say(NOTE_NO_KEY_FILE_TPL.format(path=raw))
        return None
    return to_service_key(json.loads(path.read_text(encoding=TEXT_ENCODING)))


def to_service_key(raw: object) -> ServiceKey:
    """服务账号 JSON → ServiceKey(行构造器,密钥文件的键只住这);type 不是 service_account 或缺邮箱 / 私钥即抛
    (报错不带私钥内容)。"""
    if isinstance(raw, dict):
        email = raw.get(K_CLIENT_EMAIL)
        pem = raw.get(K_PRIVATE_KEY)
        kid = raw.get(K_PRIVATE_KEY_ID)
        if isinstance(kid, str) is False:
            kid = FIELD_NONE
        if raw.get(K_TYPE) == KEY_TYPE_SA and isinstance(email, str) and isinstance(pem, str) \
                and email != FIELD_NONE and pem != FIELD_NONE:
            return ServiceKey(client_email=email, private_key=pem, private_key_id=str(kid))
    raise ValueError(KEY_BAD_MSG)


# =========================================================================
# 7. 状态读写
# =========================================================================


def read_state() -> IndexState:
    """读上轮状态(缺文件 = 空状态:头一次跑);坏文件照抛(JSON / 形状校验错),不许悄悄重置 —— 重置 = 全部重推、额度白烧。"""
    if OUT_STATE.exists() is False:
        return IndexState()
    return IndexState.model_validate(json.loads(OUT_STATE.read_text(encoding=TEXT_ENCODING)))


def write_state(state: IndexState) -> None:
    """状态落盘 OUT_STATE(原子写;首轮先建目录)。"""
    OUT_STATE.parent.mkdir(parents=True, exist_ok=True)
    paths.write_json(paths.WriteJsonIn(path=OUT_STATE, payload=state.model_dump(), indent=JSON_INDENT))


def now_iso() -> str:
    """此刻(UTC,秒级,状态里的时刻格式)。"""
    return datetime.now(timezone.utc).strftime(ISO_FMT)


# =========================================================================
# 8. 自测(用例住 scheme)
# =========================================================================


def run_tests() -> None:
    """test 步入口:跑决策逻辑自测(用例集住 scheme 的 IndexingDecisionTest,库垫片先例 gate.scheme);
    有失败 sys.exit(1) 穿门(SystemExit 不被门的 except Exception 捕获)。"""
    suite = unittest.TestLoader().loadTestsFromTestCase(IndexingDecisionTest)
    if unittest.TextTestRunner(verbosity=TEST_VERBOSITY).run(suite).wasSuccessful() is False:
        sys.exit(1)
