/**
 * 提醒域的死值:三类提醒信的文案模板、邮件 HTML 模板、窗口与上限、退订页文案。
 * (08-22 曾拍「两个都叫 mail 合并」;2026-08-23 Frank 改拍两域分开「方便我理解」——
 * 发信接缝的常量随 sendMail/unsubToken 归基建叶 lib/mail。)
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */

/**
 * 站点根 URL(邮件里的链接一律绝对地址;显式取 env,不信运行时推断)。
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

/**
 * 首轮游标兜底:没发过信的用户只回看 36 小时,不倒灌历史。
 */
export const LOOKBACK_MS = 36 * 3600_000

/**
 * 「当日新抽选」窗口(近 2 天,按类别去重)。
 */
export const DRAW_WINDOW_MS = 2 * 86400_000

/**
 * 周报周期(距上次 ≥7 天)。
 */
export const WEEK_MS = 7 * 86400_000

/**
 * A 档案匹配信最多带几条岗。
 */
export const MATCH_TOP = 10

/**
 * C 周报单轮上限(防超时;游标语义下一轮自动续)。
 */
export const WEEKLY_CAP = 200

/**
 * 收藏摘要最多列几条。
 */
export const SAVED_SHOW = 20

/**
 * 一轮提醒里每次 payload.find 的扫描上限(用户、saved-search、免费用户三处同一口径):
 * 一轮跑不完剩下的靠游标语义下一轮自然续,不在单轮里无限翻页把整批拖超时。
 */
export const SCAN_LIMIT = 1000

/**
 * 单个用户取多少条收藏来做周报摘要(摘要只列 SAVED_SHOW 条,多取是为了算在招/已下架比例)。
 */
export const SAVED_LIMIT = 200

/**
 * ISO 时间戳截到日的长度(`2026-08-26T…` 前 10 位 = `YYYY-MM-DD`):
 * 库里 date_posted 是 date 列,比较基准要日不要时分秒。
 */
export const ISO_DATE_LEN = 10

/**
 * 档案 NOC 码的合法形状(五位数字)。
 */
export const NOC_RE = /^\d{5}$/

/**
 * 省码的合法长度(两位字母,如 ON/BC):档案里的目标省逐个验形,长度不对的丢掉不猜。
 */
export const PROV_CODE_LEN = 2

/**
 * 静默时段默认起点(多伦多时间 20:00;2026-08-16 Frank「晚上不要给我用户发邮件」)。
 * 窗口内整轮不发、游标不回写 —— 下一个白天窗口自然补发,一封不丢。可用 ALERT_QUIET_START 覆盖。
 */
export const QUIET_START_DEF = 20

/**
 * 静默时段默认止点(早 8 点;可用 ALERT_QUIET_END 覆盖)。
 */
export const QUIET_END_DEF = 8

/**
 * 用户主要在加拿大,东部时间当全体近似。
 */
export const ET_ZONE = 'America/Toronto'

/**
 * A 档案匹配信的标题模板。
 */
export const SUBJ_MATCH = '{n} new jobs match your immigration path — Offer2PR'

/**
 * 抽选段:你的 CRS 高于分数线。
 */
export const DRAW_ABOVE = 'New draw: "{c}" cutoff {dr} — your CRS {crs} is {d} above'

/**
 * 抽选段:你的 CRS 低于分数线。
 */
export const DRAW_BELOW = 'New draw: "{c}" cutoff {dr} — your CRS {crs} is {d} below'

/**
 * 一键退订邮件头的头名(2026-11-11;知识库 ui-ux/gmail/email-sender-guidelines.md 的 One-Click Unsubscribe:
 * 两个头一起带,收件人点了,发件方在那个 HTTPS 网址上收到一个 POST)。只有提醒类的信带,确认信不带。
 */
export const HDR_LIST_UNSUB = 'List-Unsubscribe'

/**
 * 一键退订邮件头的值模板:尖括号里一个 HTTPS 网址(不带 mailto;知识库 gmail FAQ 的 Mailto Link:mailto 不算一键)。
 */
export const LIST_UNSUB_VALUE = '<{url}>'

/**
 * 一键退订的第二个头名。
 */
export const HDR_LIST_UNSUB_POST = 'List-Unsubscribe-Post'

/**
 * 一键退订第二个头的固定值。
 */
export const LIST_UNSUB_POST_VALUE = 'List-Unsubscribe=One-Click'

/**
 * 一键退订 POST 的应答:已退订(只回一行字,不给落地页 —— 知识库 gmail FAQ 的 Landing Page)。
 */
export const UNSUB_POST_DONE = 'unsubscribed'

/**
 * 一键退订 POST 的应答:链接不对。
 */
export const UNSUB_POST_INVALID = 'invalid link'

/**
 * 一键退订 POST 的应答:写库失败。
 */
export const UNSUB_POST_FAIL = 'failed'

/**
 * C2 档案版周报标题。
 */
export const SUBJ_WK = '{n} new jobs for you this week — Offer2PR'

/**
 * C 收藏版周报标题(Open / Closed 与正文标签用词一致)。
 */
export const SUBJ_SAVED = 'Your {total} saved jobs: {open} open, {closed} closed — Offer2PR'

/**
 * 退订链接模板。
 */
export const UNSUB_URL = '{site}/api/alerts/unsub?u={u}&t={t}'

/**
 * 走查预览用的退订占位链接。
 */
export const UNSUB_PREVIEW = '{site}/api/alerts/unsub?u=0&t=preview'

/**
 * 收藏条目缺标题时的占位。
 */
export const TITLE_NONE = '—'

/**
 * 岗状态:在招。
 */
export const ST_OPEN = 'open'

/**
 * C2 档案版的省筛选片段(有目标省时拼进 SQL 模板参数位)。
 */
export const PROV_COND = ' AND j.province = ANY($3)'

/**
 * 没有目标省时拼进 SQL 模板的**空**片段:整句少一段 WHERE,等于全国不限省。
 * 空串在这儿不是「没取到」,是**这一维不筛** —— 与之配套,查询参数也少传一位
 * (只传 [cut7, nocs],不带 provs),两处必须同时改,否则 $3 悬空。
 */
export const PROV_COND_NONE = ''

/**
 * 收藏画像对的键分隔。
 */
export const PAIR_KEY_SEP = '|'

/**
 * ?preview 的周报档取值。
 */
export const PREVIEW_WEEKLY = 'weekly'

/**
 * ?dry 的开启取值。
 */
export const DRY_ON = '1'

/**
 * 范围描述里职业名、省码之间的分隔。
 */
export const DIMS_SEP = ', '

/**
 * 职业名查不到时的范围描述。
 */
export const DIMS_FALLBACK = '{n} occupations'

/**
 * 范围描述:职业加省份。
 */
export const DIMS_PROVS = '{occ} ({provs})'

/**
 * 范围描述:职业,全国。
 */
export const DIMS_NATION = '{occ} (Canada-wide)'

/**
 * A/B 信的最小发信间隔（2026-08-23 Frank「邮件提醒发得也太频繁了」：
 * auto_update 每轮 seed 成功都触发一次，而 jobbank 一天多轮增量 ——
 * 游标只保证不重复同一岗，不管节奏，于是一天能收五六封）。
 * 取 20h 不取 24h：每日触发时刻有漂移，24 整会隔三差五跳过一天。
 * 当天后续新岗自动攒进明天那封（游标不动）。
 */
export const ALERT_MIN_GAP_MS = 20 * 3600_000

/**
 * ?dry 参数名。
 */
export const P_DRY = 'dry'

/**
 * ?preview 参数名。
 */
export const P_PREVIEW = 'preview'

/**
 * ?force 参数名(无视静默窗口,走查用)。
 */
export const P_FORCE = 'force'

/**
 * 开关参数的开启取值(?force=1 / ?dry=1 同一约定)。
 */
export const SWITCH_ON = '1'

/**
 * deferred 响应里静默窗口的人话范围模板。
 */
export const QUIET_RANGE = '{qs}:00\u2013{qe}:00 America/Toronto'

/**
 * 退订链接参数名:用户 id。
 */
export const P_USER = 'u'

/**
 * 退订链接参数名:token。
 */
export const P_TOKEN = 't'

/**
 * 退订写的表(weeklyOptOut 在用户表上)。
 */
export const USERS_WEEKLY_OPT = 'users'

/**
 * 退订与确认结果页的外壳。
 */
export const UNSUB_PAGE = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offer2PR</title><body style="font-family:system-ui,sans-serif;color:#1f2937;max-width:480px;margin:80px auto;padding:0 16px;text-align:center"><p style="font-size:20px;font-weight:700">Offer2PR</p>{body}</body></html>'

/**
 * 退订页三态:链接无效。
 */
export const UNSUB_MSG_INVALID = '<p>This link is not valid.</p>'

/**
 * 退订页三态:已退订。
 */
export const UNSUB_MSG_DONE = '<p><strong>You have been unsubscribed from job alerts.</strong></p><p style="font-size:13px;color:#6b7280">You can turn them back on anytime on your account page.</p>'

/**
 * 退订页三态:操作失败。
 */
export const UNSUB_MSG_FAIL = '<p>Something went wrong. Please try again later.</p>'

/**
 * runAlerts 产物的 kind：计数。
 */
export const K_COUNTS = 'counts'

/**
 * runAlerts 产物的 kind：预览 HTML。
 */
export const K_PREVIEW = 'preview'

/**
 * 退订三态：链接无效。
 */
export const US_INVALID = 'invalid'

/**
 * 退订三态：已退订。
 */
export const US_DONE = 'done'

/**
 * 退订三态：写库失败。
 */
export const US_FAIL = 'fail'

/**
 * 用户表 collection 名（选人/回写游标/退订共用）。
 */
export const COL_USERS = 'users'

/**
 * saved-jobs collection 名。
 */
export const COL_SAVED_JOBS = 'saved-jobs'

/**
 * 匹配引擎的高档位。
 */
export const LEVEL_HIGH = 'high'

/**
 * 匹配引擎的中档位（ALERT_MATCH_LEVEL 的取值之一）。
 */
export const LEVEL_MID = 'mid'

/**
 * 取 ET 小时用的 locale。
 */
export const ET_LOCALE = 'en-CA'

/**
 * Intl 小时格式取值。
 */
export const HOUR_NUMERIC = 'numeric'

/**
 * 邮件里城市与省的分隔。
 */
export const SEP_LOC = ', '

/**
 * 上游没给这一格时的空串占位:payload 文档展开不出的关联字段(owner 邮箱)、
 * 库行里的可空列(标题、公司名、薪资文本、省码、职业名)。
 * 空串进邮件模板 = 这一格什么都不显示;与 `TITLE_NONE` / `SAL_NONE` 的「—」不同 ——
 * 那两个是明说「这项没有」,这个是整格不出现(公司名缺了就不占一行,不摆个横线在那儿)。
 */
export const FIELD_NONE = ''

/**
 * 查询参数没带时的值:`searchParams.get()` 取不到返回 null,统一收成空串再往下走
 * (宪法禁 `undefined` 进契约,`?? ''` 也禁,所以是「先给空串、取到再覆盖」)。
 * 下游一律用 `=== ''` 判「这个参数没带」,不用真假值 —— `dry=0` 也是带了参数。
 */
export const PARAM_NONE = ''

// =========================================================================
// 新岗推送(「我的求职」末段;2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 16b / 16d;
// 表 docs/sql/digest-prefs-20261010.sql)
// =========================================================================

/**
 * 推送频率:不发(没设过也是它;新用户默认)。
 */
export const FREQ_OFF = 'off'

/**
 * 推送频率:每天(今日推荐)。
 */
export const FREQ_DAILY = 'daily'

/**
 * 推送频率:每周(收藏岗动态,即原周报)。
 */
export const FREQ_WEEKLY = 'weekly'

/**
 * 认得的三档频率(请求体只收这三个)。
 */
export const FREQS = ['off', 'daily', 'weekly'] as const

/**
 * 每一轮每一档最多取多少收件人(同 SCAN_LIMIT)。
 */
export const DIGEST_USERS_MAX = 1000

/**
 * 每日推送两封之间至少隔多久(20 小时:每小时跑一轮,一天只发一封,早晚漂一点不重发)。
 */
export const DAILY_GAP_MS = 20 * 3600_000

/**
 * 每日推送一封最多列几条(Pro 无上限的推荐里取前几条;免费号本来就只有 3 条)。
 */
export const DAILY_MAIL_MAX = 10

/**
 * ?preview=daily:只渲染第一封每日推送的 HTML 返回,不发信不写库(走查用)。
 */
export const PREVIEW_DAILY = 'daily'

/**
 * 请求体里的频率字段。
 */
export const FIELD_FREQ = 'freq'

/**
 * 请求体里的收件邮箱字段。
 */
export const FIELD_EMAIL = 'email'

/**
 * 邮箱格式(粗校:有 @、两边非空、域名带点、不含空白)。
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 链接里的用户 id 只认纯数字(确认链接;别的当无效)。
 */
export const USER_ID_RE = /^\d+$/

/**
 * 邮箱最长多少字(RFC 5321 上限)。
 */
export const EMAIL_MAX_LEN = 254

/**
 * 错误体:要登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误体:请求体不合形(频率不认得)。
 */
export const E_BODY = 'body'

/**
 * 错误体:邮箱格式不对。
 */
export const E_EMAIL = 'email'

/**
 * 错误体:确认信没发出去(新邮箱没记成待确认)。
 */
export const E_MAIL = 'mail'

/**
 * 推送设置响应的缓存头:只给本人,哪一层都不许存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 存推送设置的结果:直接生效。
 */
export const PUT_SAVED = 'saved'

/**
 * 存推送设置的结果:新邮箱待确认(确认信已发)。
 */
export const PUT_PENDING = 'pending'

/**
 * 换收件邮箱的确认链接模板。
 */
export const CONFIRM_URL = '{site}/api/alerts/confirm?u={u}&t={t}'

/**
 * 确认信标题。
 */
export const CONFIRM_SUBJ = 'Confirm your email — Offer2PR'

/**
 * 确认页:已确认。
 */
export const CONFIRM_MSG_DONE = '<p><strong>Your email is confirmed.</strong></p><p><a href="{site}/account" style="color:#2563eb">Back to my account</a></p>'

/**
 * 确认页:链接无效。
 */
export const CONFIRM_MSG_INVALID = '<p>This link is not valid or has expired.</p>'

/**
 * 每日推送标题。
 */
export const SUBJ_DAILY = "Today's picks: {n} jobs — Offer2PR"

/**
 * 每日推送取今日推荐时记推荐记录的来源(2026-11-11 任务书第 48 条;lib/myjobs 的 via,本域自抄)。
 */
export const PICKS_VIA_MAIL = 'mail'
