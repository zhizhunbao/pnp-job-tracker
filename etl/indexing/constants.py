"""
indexing 域常量 —— 全部字面量住这(零字符串令:functions 体内不写字面量)。
分段镜像 functions:1 入口 → 2 读 sitemap → 4 额度与太平洋时区 → 5 撤回判定与执行 → 6 Google 鉴权与发布 → 7 状态读写
→ 8 自测(3 规划与排序是纯函数,没有自己的常量)。

@author Frank
@time 2026-09-26 02:41:38
"""
import re

import paths

# =========================================================================
# 1. 入口:一轮 = 读密钥 → 读状态 → 读 sitemap → 先撤回 → 再推新 → 落盘
# =========================================================================

FIELD_NONE = ""
"""「没有」的占位:空串。"""

HTTP_TIMEOUT_S = 120
"""HTTP 超时秒(sitemap 职位分册一片 5000 条、约 0.8MB,cms 现算;Google 两个接口通常亚秒回)。"""

PRINT_QUOTA_OUT_TPL = "今日({day},太平洋时区)额度 {quota} 次已用完,本轮跳过(不读 sitemap、不打 Google)"
"""当天额度用完的轮(太平洋零点后自然重置)。"""

PRINT_PLAN_TPL = (
    "sitemap 职位分册 {shards} 个,共 {total} 条(非本站职位页剔 {skipped} 条;lastmod 缺 {missing}、坏 {bad});"
    "已通知 {notified}(仍在 sitemap {kept}、已离开 {departed});待推 {fresh};"
    "今日({day},太平洋时区)额度剩 {left}/{quota}"
)
"""规划之后的一行(干跑与实发同一行)。"""

MODE_DRY = "干跑(只算不发、不落盘)"
"""收口行里的模式说法:干跑。"""

MODE_LIVE = "实发"
"""收口行里的模式说法:实发。"""

PRINT_DONE_TPL = (
    "✓ 本轮{mode}:撤回 {deleted} · 只退役 {retired} · 查页没结论 {unsure} · 推新 {pushed} · Google 回错 {failed};"
    "今日额度已用 {used}/{quota}"
)
"""收尾一行。"""

DRY_SHOW_N = 5
"""干跑时列出的样本条数(会撤的、会推的各至多这么多条)。"""

PRINT_SAMPLE_DEL_TPL = "  会撤 {url}"
"""干跑样本:会发 URL_DELETED 的。"""

PRINT_SAMPLE_TPL = "  会推 {url}(lastmod {lastmod})"
"""干跑样本:会发 URL_UPDATED 的。"""

LASTMOD_MISSING_WORD = "缺"
"""样本行里 lastmod 缺席的说法。"""

OWNER_TPL = (
    "Google 回 403:服务账号 {email} 不是 Search Console 资源 {site}/ 的所有者(或这个 Google Cloud 项目没启用 Indexing API)。"
    "到 GSC「设置 → 用户和权限」把这个邮箱加成「所有者」;本轮已停。Google 原话:{message}"
)
"""403 的报错(抛给门的 err 接:本轮算失败、不发心跳 —— 配错了要红)。"""

NET_STOP_TPL = "发通知时网络断了({note}),本轮已停,没发出去的下轮再发"
"""发布请求没拿到回应(不记额度;抛给门的 err 接)。"""

# =========================================================================
# 2. 读 sitemap(职位分册)
# =========================================================================

SITE_ROOT = "https://offer2pr.com"
"""站点根 = Search Console 资源 https://offer2pr.com/(Indexing API 只收已验证资源下的网址,服务账号要是它的所有者)。"""

SITE_SCHEME = "https"
"""本站网址的协议(分册与职位网址都只认它)。"""

SITE_HOST = "offer2pr.com"
"""本站主机名(分册与职位网址都只认它:别的主机既不去读,也不拿去通知 Google)。"""

SITEMAP_INDEX_URL = SITE_ROOT + "/api/sitemaps/index.xml"
"""sitemap 索引(cms app/api/sitemaps 现算;批 1 起职位分册只列有投递邮箱、在架、正文完整、不重复的岗)。"""

JOBS_SHARD_PREFIX = "/api/sitemaps/jobs-"
"""职位分册的路径前缀:jobs-0..N.xml 与批 1 新增的 jobs-new.xml 都认(core / companies 分册不认)。"""

JOB_PATH_PREFIX = "/jobs/"
"""职位页的路径前缀(Indexing API 只许职位页与直播页用;分册里混进别的页不推,记进「剔」数)。"""

SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
"""sitemap 协议命名空间(ElementTree 的限定名前缀)。"""

TAG_SITEMAP = SITEMAP_NS + "sitemap"
"""索引里的分册项。"""

TAG_URL = SITEMAP_NS + "url"
"""分册里的网址项。"""

TAG_LOC = SITEMAP_NS + "loc"
"""网址 / 分册地址。"""

TAG_LASTMOD = SITEMAP_NS + "lastmod"
"""最后修改时刻(可能缺)。"""

LASTMOD_NONE_TS = -1.0
"""lastmod 缺席或解析不了时的排序键(比任何真实 epoch 秒都小 → 倒序时排最后)。"""

SITEMAP_MIN_URLS = 1
"""防线:职位分册一条本站职位网址都没有 = 站点异常,整轮抛,不许拿空清单去算「离开」再撤回。"""

HTTP_FAIL_TPL = "http {status}:{url}"
"""读 sitemap 非 2xx 的报错(整轮抛:拿半份 sitemap 算「离开」会把整片撤掉)。"""

EMPTY_SITEMAP_TPL = "sitemap 职位分册 {shards} 个里一条本站职位网址都没有 —— 疑似站点异常,本轮不动状态"
"""SITEMAP_MIN_URLS 防线的报错。"""

# =========================================================================
# 4. 额度与太平洋时区
# =========================================================================

DAILY_QUOTA = 200
"""每天发布请求上限(URL_UPDATED 与 URL_DELETED 合计):Google Indexing API 默认每个项目每天 200 次,按美国太平洋时区零点重置。
**申请加额后改这里**(Google Cloud 控制台 → Indexing API → 配额,申请批下来的新数写进来)。"""

DST_START_MONTH = 3
"""美国夏令时起始月(2007 起:三月第二个周日 2:00 本地)。"""

DST_START_NTH = 2
"""起始于该月第几个周日。"""

DST_START_UTC_HOUR = 10
"""起始时刻的 UTC 整点(2:00 PST = 10:00 UTC)。"""

DST_END_MONTH = 11
"""美国夏令时结束月(十一月第一个周日 2:00 本地)。"""

DST_END_NTH = 1
"""结束于该月第几个周日。"""

DST_END_UTC_HOUR = 9
"""结束时刻的 UTC 整点(2:00 PDT = 09:00 UTC)。"""

PST_OFFSET_H = -8
"""太平洋标准时相对 UTC 的小时数。"""

PDT_OFFSET_H = -7
"""太平洋夏令时相对 UTC 的小时数。"""

SUNDAY = 6
"""datetime.weekday() 里周日的值(周一 = 0)。"""

DAYS_PER_WEEK = 7
"""一周天数(算第 n 个周日)。"""

# =========================================================================
# 5. 撤回判定(查页)与执行
# =========================================================================

PAGE_CHECK_MAX = 300
"""每轮至多查多少个离开 sitemap 的页(一次 GET 一页,打的是生产站:sitemap 口径一改可能一下离开几千条,
分几轮慢慢查,别一轮把 Render 打满 —— 热路径打爆连接池 = 生产 500 的旧账)。"""

FLUSH_N = 20
"""实发时每记 N 条(通知成 / 撤回 / 退役)落一次盘(中途被杀不丢已发的记录,免得下轮重发白烧额度)。"""

GONE_STATUSES = (404, 410)
"""页面已不在的状态码:发 URL_DELETED。"""

HTTP_OK_MIN = 200
"""2xx 下界(含)。"""

HTTP_OK_MAX = 300
"""2xx 上界(不含)。"""

HDR_X_ROBOTS = "x-robots-tag"
"""响应头里的 robots 指令(httpx 头名大小写不敏感)。"""

META_TAG_RE = re.compile(r"<meta\b[^>]*>", re.I)
"""页面里的 meta 标签。"""

META_NAME_RE = re.compile(r"""\bname\s*=\s*["']?([^"'\s/>]+)""", re.I)
"""meta 标签的 name 属性值。"""

META_CONTENT_RE = re.compile(r"""\bcontent\s*=\s*["']([^"']*)["']""", re.I)
"""meta 标签的 content 属性值(带引号的写法;Next 的 metadata 一律带引号)。"""

ROBOTS_NAMES = frozenset(("robots", "googlebot"))
"""管收录的 meta name(小写比)。"""

NOINDEX_RE = re.compile(r"\b(?:noindex|none)\b", re.I)
"""不许收录的指令(none = noindex + nofollow)。cms 下架岗页输出 `<meta name="robots" content="noindex"/>`、查无此岗回 404。"""

V_DELETE = "delete"
"""判定:页面没了或不许收录 → 发 URL_DELETED。"""

V_KEEP = "keep"
"""判定:页面仍可收录(比如岗还在架只是没了投递邮箱)→ 只从状态里退役,不发。"""

V_UNSURE = "unsure"
"""判定:查不动(网络 / 5xx / 其他状态码)→ 留在已通知里,下轮再查。"""

WHY_HTTP_TPL = "http {status}"
"""判定由头:状态码。"""

WHY_NOINDEX_HDR = "noindex(X-Robots-Tag 头)"
"""判定由头:响应头不许收录。"""

WHY_NOINDEX_META = "noindex(robots meta)"
"""判定由头:页里 robots meta 不许收录。"""

WHY_INDEXABLE = "页面仍可收录"
"""判定由头:可收录。"""

ERR_WHY_TPL = "{name}: {detail}"
"""异常转由头(类名 + 详情)。"""

PRINT_RETIRE_TPL = "  退役不发 {url}({why})"
"""离开 sitemap 但页面仍可收录的一行。"""

PRINT_UNSURE_TPL = "✗ 查页没结论,留到下轮再查:{url}({why})"
"""查不动的一行(✗ = 调度层升 ERROR)。"""

# =========================================================================
# 6. Google 鉴权与发布
# =========================================================================

ENV_KEY_FILE = "GOOGLE_INDEXING_KEY_FILE"
"""服务账号 JSON 密钥路径的环境变量(compose 从根 .env 注入;相对路径按仓库根解析,推荐 secrets/google-indexing.json)。
密钥文件本身 gitignore(/secrets/),Frank 亲手放;没配 = 每轮一行警告跳过,不崩、不重试。"""

NOTE_NO_KEY = "⚠ 未配置 Google Indexing 密钥,本轮跳过(环境变量 GOOGLE_INDEXING_KEY_FILE 未设)"
"""没配密钥(一轮一行,不刷屏;行首 ⚠ 不是 ✗,调度层按普通级别记)。"""

NOTE_NO_KEY_FILE_TPL = "⚠ 未配置 Google Indexing 密钥,本轮跳过(GOOGLE_INDEXING_KEY_FILE 指向的 {path} 不存在)"
"""环境变量设了、文件还没放。"""

TOKEN_URL = "https://oauth2.googleapis.com/token"
"""服务账号换 access token 的端点(同时是 JWT 的 aud;不用密钥文件里的 token_uri —— 签好的断言只发给这个固定地址)。"""

INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing"
"""Indexing API 的授权范围。"""

PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
"""发布通知的端点(一次一条网址)。"""

TYPE_UPDATED = "URL_UPDATED"
"""通知类型:新页 / 页面更新了,来抓。"""

TYPE_DELETED = "URL_DELETED"
"""通知类型:页面没了,删掉。"""

GRANT_JWT_BEARER = "urn:ietf:params:oauth:grant-type:jwt-bearer"
"""换 token 的授权类型(RFC 7523)。"""

P_GRANT_TYPE = "grant_type"
"""换 token 表单:授权类型键。"""

P_ASSERTION = "assertion"
"""换 token 表单:签好的 JWT 键。"""

P_URL = "url"
"""发布请求体:网址键。"""

P_TYPE = "type"
"""发布请求体:通知类型键。"""

HDR_AUTH = "Authorization"
"""鉴权头名。"""

BEARER_TPL = "Bearer {token}"
"""鉴权头值。"""

K_ACCESS_TOKEN = "access_token"
"""换 token 回包:token 键。"""

K_ERROR = "error"
"""错误回包:错误键(发布接口是对象,换 token 接口是字符串)。"""

K_MESSAGE = "message"
"""发布接口错误对象里的原话键。"""

K_ERROR_DESC = "error_description"
"""换 token 接口的错误说明键。"""

TOKEN_ERR_TPL = "{error}: {desc}"
"""换 token 接口错误的拼法。"""

MSG_MAX_LEN = 300
"""回包不是 JSON 时截原文多少字当原话。"""

K_TYPE = "type"
"""密钥文件:类型键。"""

K_CLIENT_EMAIL = "client_email"
"""密钥文件:服务账号邮箱键。"""

K_PRIVATE_KEY = "private_key"
"""密钥文件:PEM 私钥键。"""

K_PRIVATE_KEY_ID = "private_key_id"
"""密钥文件:私钥编号键(JWT 头的 kid)。"""

KEY_TYPE_SA = "service_account"
"""密钥文件 type 的合法值。"""

KEY_BAD_MSG = "GOOGLE_INDEXING_KEY_FILE 指向的文件不是服务账号 JSON 密钥(要有 type=service_account、client_email、private_key)"
"""密钥文件形状不对(配错了要红,不当「没配」跳过;报错里不带私钥内容)。"""

KEY_NOT_RSA_MSG = "服务账号私钥不是 RSA 私钥,签不了 RS256"
"""私钥类型不对。"""

NO_KEY_LIVE_MSG = "实发路径拿不到密钥(入口本该先挡住)"
"""防御:实发却没有密钥。"""

K_ALG = "alg"
"""JWT 头:算法键。"""

K_TYP = "typ"
"""JWT 头:类型键。"""

K_KID = "kid"
"""JWT 头:私钥编号键。"""

K_ISS = "iss"
"""JWT 体:签发人(服务账号邮箱)。"""

K_SCOPE = "scope"
"""JWT 体:授权范围。"""

K_AUD = "aud"
"""JWT 体:受众(换 token 端点)。"""

K_IAT = "iat"
"""JWT 体:签发时刻(epoch 秒)。"""

K_EXP = "exp"
"""JWT 体:过期时刻(epoch 秒)。"""

JWT_ALG = "RS256"
"""JWT 签名算法。"""

JWT_TYP = "JWT"
"""JWT 类型。"""

JWT_TTL_S = 3600
"""JWT 有效期秒(Google 上限一小时)。"""

JWT_SEP = "."
"""JWT 三段的分隔。"""

JSON_COMPACT_SEPS = (",", ":")
"""JWT 头 / 体序列化的紧凑分隔符。"""

B64_PAD = b"="
"""base64url 要剥掉的补位符。"""

ASCII = "ascii"
"""JWT 各段与 PEM 的编码。"""

HTTP_FORBIDDEN = 403
"""资源所有者没配(或项目没启用 Indexing API):停本轮、报清楚。"""

HTTP_TOO_MANY = 429
"""额度用尽:停本轮,今日额度记满。"""

RES_SENT = "sent"
"""发送结果:成功(干跑 = 会发)。"""

RES_FAILED = "failed"
"""发送结果:Google 回了别的错,这条留痕、接着发下一条。"""

STOP_QUOTA = "quota"
"""整轮停:429。"""

STOP_OWNER = "owner"
"""整轮停:403。"""

STOP_NET = "net"
"""整轮停:网络断。"""

TOKEN_FAIL_TPL = "换 access token 失败:http {status} —— {message}"
"""换 token 非 2xx(整轮抛)。"""

TOKEN_EMPTY_MSG = "换 access token:回包里没有 access_token"
"""换 token 回包缺 token(整轮抛)。"""

PRINT_SENT_TPL = "  {kind} {url}"
"""实发成功一行(留作审计痕)。"""

PRINT_API_FAIL_TPL = "✗ Google 回 {status}:{kind} {url} —— {message}"
"""Google 回了别的错的一行。"""

PRINT_429_TPL = "✗ Google 回 429(额度用尽):本轮停,今日({day},太平洋时区)额度记满 —— {message}"
"""429 的一行。"""

# =========================================================================
# 7. 状态读写
# =========================================================================

OUT_STATE = paths.PROCESSED_INDEXING / "state.json"
"""[out] 本域状态(也是下一轮的输入):notified = 已通知过 URL_UPDATED 的网址 → {type, at};
retired = 离开 sitemap 后撤回(type = URL_DELETED)或只退役(type = null,页面仍可收录没发)的网址 → {type, at, why};
quota = {day(太平洋时区日期), used(当日已用发布请求数)}。坏文件照抛,不许悄悄重置(重置 = 全部重推、额度白烧)。"""

JSON_INDENT = 1
"""落盘缩进。"""

TEXT_ENCODING = "utf-8"
"""读写编码。"""

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"
"""状态里的时刻格式(UTC)。"""

# =========================================================================
# 8. 自测(用例住 scheme)
# =========================================================================

TEST_VERBOSITY = 2
"""unittest 运行档:逐条打用例名与结果(同 gate 锁自查)。"""
