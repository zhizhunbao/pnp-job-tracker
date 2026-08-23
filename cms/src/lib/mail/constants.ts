/**
 * 邮件域的死值(2026-08-23 Frank「两个都叫 mail 然后合并到一起」:mailer(怎么发一封)与
 * alerts(这一轮提醒谁)并为一域 —— 现状全站主动触达只有邮件这一条通道)。
 * 前半:发信接缝(Resend);后半:三类提醒信的文案模板、邮件 HTML 模板、窗口与上限。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */


/**
 * 有没有配发信密钥(没配 = dry-run)。
 */
export const MAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

/**
 * 发件人(env 可换;默认 Resend 测试身份)。
 */
export const FROM = process.env.RESEND_FROM || 'Offer2PR <onboarding@resend.dev>'

/**
 * 退订 token 的 HMAC 消息前缀(api/alerts/unsub 同源校验)。
 */
export const UNSUB_PREFIX = 'unsub:'

/**
 * 退订 token 的 HMAC 算法。
 */
export const HMAC_ALGO = 'sha256'

/**
 * 退订 token 的输出编码。
 */
export const HEX_ENC = 'hex'

/**
 * Resend 发信端点(HTTP 直调,不引 SDK —— Ponytail)。
 */
export const RESEND_URL = 'https://api.resend.com/emails'

/**
 * 发信请求的 HTTP 方法。
 */
export const METHOD_POST = 'POST'

/**
 * Authorization 头的 Bearer 前缀。
 */
export const BEARER_PREFIX = 'Bearer '

/**
 * JSON 请求体的 MIME。
 */
export const JSON_MIME = 'application/json'


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
 * 收藏画像的 (省, 大类) 对最多进标题几组。
 */
export const DIM_PAIRS = 3

/**
 * 档案 NOC 码的合法形状(五位数字)。
 */
export const NOC_RE = /^\d{5}$/

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
 * B saved-search 信的标题模板。
 */
export const SUBJ_SEARCH = '{n} new jobs match your saved search — Offer2PR'

/**
 * A 档案匹配信的标题模板。
 */
export const SUBJ_MATCH = '{n} new jobs match your immigration path — Offer2PR'

/**
 * 信首句。
 */
export const HI_LINE = 'New jobs relevant to you (click a title for details):'

/**
 * 抽选段:你的 CRS 高于分数线。
 */
export const DRAW_ABOVE = 'New draw: "{c}" cutoff {dr} — your CRS {crs} is {d} above'

/**
 * 抽选段:你的 CRS 低于分数线。
 */
export const DRAW_BELOW = 'New draw: "{c}" cutoff {dr} — your CRS {crs} is {d} below'

/**
 * 尾部「去职位板」链接文案。
 */
export const OPEN_BOARD = 'Open job board'

/**
 * A/B 信的退订说明(saved search 在账户页删除即停)。
 */
export const UNSUB_SAVED = 'Delete the saved search on your account page to stop alerts'

/**
 * 岗位表一行(链接落本站详情页 —— 2026-08-03 Frank:直跳 Job Bank 原帖=流量白送)。
 */
export const TR_JOB = `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee"><a href="{href}" style="color:#2563eb;text-decoration:none">{title}</a></td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{company}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{where}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{salary}</td>
  </tr>`

/**
 * 岗位表外壳。
 */
export const TABLE_JOBS = '<table style="border-collapse:collapse;font-size:13px;font-family:system-ui,sans-serif">{rows}</table>'

/**
 * 抽选段落(黄底)。
 */
export const DRAW_P = '<p style="background:#fef3c7;padding:8px 12px;border-radius:8px">{line}</p>'

/**
 * A/B 信外壳。
 */
export const EMAIL_SHELL = `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong></p>
    {draws}
    <p>{hi}</p>{table}
    <p style="margin-top:14px"><a href="{site}" style="color:#2563eb">{open}</a></p>
    <p style="color:#9ca3af;font-size:12px">{unsub}</p></div>`

/**
 * C 收藏版周报:一行(标题/公司/状态)。
 */
export const TR_WEEKLY = `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{title}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">{company}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{status}</td>
  </tr>`

/**
 * 在招徽标。
 */
export const BADGE_OPEN = '<span style="color:#15803d">在招 open</span>'

/**
 * 已下架徽标。
 */
export const BADGE_CLOSED = '<span style="color:#9ca3af">已下架 closed</span>'

/**
 * C 收藏版周报外壳(zh+en 双语一封:免费用户多无档案语言偏好,不猜)。
 */
export const WEEKLY_SHELL = `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong> · 每周求职看板摘要 / Weekly saved-jobs digest</p>
    <table style="border-collapse:collapse;font-size:13px">{rows}</table>
    {newp}
    <p><a href="{site}/account" style="color:#2563eb">建档案,看每岗与你的匹配度 / Build a profile for per-job match</a></p>
    <p style="color:#9ca3af;font-size:12px">状态以官方原帖为准 · Status per official posting ·
      <a href="{unsubUrl}" style="color:#9ca3af">退订本摘要 Unsubscribe</a> · <a href="{site}/account" style="color:#9ca3af">账户设置 Settings</a></p></div>`

/**
 * C 收藏版周报「本周新增」段(newN>0 才出)。
 */
export const WEEKLY_NEW_P = '<p>你的方向({dims})近 7 天新增 <strong>{n}</strong> 岗 / {n} new jobs this week in your saved directions — <a href="{site}" style="color:#2563eb">看新岗 View →</a></p>'

/**
 * C2 档案版周报(E5-07):一行(标题/公司/薪资)。
 */
export const TR_PROFILE = `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee">{title}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">{company}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#15803d">{sal}</td>
  </tr>`

/**
 * C2 档案版周报的头行三语模板(一个字都不编:数字全来自库内当周真实新增)。
 */
export const WK_HEAD = {
  /**
   * 中文头行。
   */
  zh: '{d} 本周新增 <strong>{n}</strong> 个岗,其中 <strong>{e}</strong> 个可提名,中位年薪 <strong>{m}</strong>',

  /**
   * 英文头行。
   */
  en: '<strong>{n}</strong> new jobs this week in {d} · <strong>{e}</strong> PNP-eligible · median <strong>{m}</strong>',

  /**
   * 韩文头行。
   */
  ko: '{d} 이번 주 신규 <strong>{n}</strong>건 · 지명 가능 <strong>{e}</strong>건 · 중위 연봉 <strong>{m}</strong>',
} as const

/**
 * C2 档案版周报的 CTA 三语模板。
 */
export const WK_CTA = {
  /**
   * 中文 CTA。
   */
  zh: '看这 {n} 个新岗',

  /**
   * 英文 CTA。
   */
  en: 'View these {n} jobs',

  /**
   * 韩文 CTA。
   */
  ko: '신규 {n}건 보기',
} as const

/**
 * C2 档案版周报的脚注三语。
 */
export const WK_FOOT = {
  /**
   * 中文脚注。
   */
  zh: '数据来自官方公开发布,状态以原帖为准',

  /**
   * 英文脚注。
   */
  en: 'Official public data; status per the original posting',

  /**
   * 韩文脚注。
   */
  ko: '공식 공개 데이터이며 상태는 원문 공고 기준입니다',
} as const

/**
 * 退订词三语。
 */
export const WK_UNSUB = {
  /**
   * 中文。
   */
  zh: '退订本摘要',

  /**
   * 英文。
   */
  en: 'Unsubscribe',

  /**
   * 韩文。
   */
  ko: '수신 거부',
} as const

/**
 * 账户设置词三语。
 */
export const WK_SETTINGS = {
  /**
   * 中文。
   */
  zh: '账户设置',

  /**
   * 英文。
   */
  en: 'Settings',

  /**
   * 韩文。
   */
  ko: '계정 설정',
} as const

/**
 * C2 档案版周报外壳(头行按 locale 出单语;空 locale 回 zh+en —— 不猜语言,
 * 也不让人读半篇看不懂的字)。
 */
export const PROFILE_SHELL = `<div style="font-family:system-ui,sans-serif;color:#1f2937;font-size:14px">
    <p>🍁 <strong>Offer2PR</strong></p>
    {heads}
    <table style="border-collapse:collapse;font-size:13px">{rows}</table>
    <p style="margin-top:14px"><a href="{site}" style="color:#2563eb">{cta}</a></p>
    <p style="color:#9ca3af;font-size:12px">{foot} ·
      <a href="{unsubUrl}" style="color:#9ca3af">{unsub}</a> · <a href="{site}/account" style="color:#9ca3af">{settings}</a></p></div>`

/**
 * C2 头行段落(第二语言压灰上提)。
 */
export const PROFILE_HEAD_P = '<p style="{style}">{head}</p>'

/**
 * C2 头行第二语言的压灰样式。
 */
export const PROFILE_HEAD_DIM = 'color:#6b7280;margin-top:-6px'

/**
 * C2 档案版周报标题三 locale 模板(空/未知 locale 用 zh)。
 */
export const SUBJ_WK = {
  /**
   * 中文标题。
   */
  zh: '你的方向本周新增 {n} 个岗({e} 个可提名) — Offer2PR',

  /**
   * 英文标题。
   */
  en: '{n} new jobs in your direction ({e} PNP-eligible) — Offer2PR',

  /**
   * 韩文标题。
   */
  ko: '이번 주 신규 {n}건(지명 가능 {e}건) — Offer2PR',
} as const

/**
 * C 收藏版周报标题模板(中文站语;收藏数/在招/下架)。
 */
export const SUBJ_SAVED = {
  /**
   * 中文标题（原串原样；空/未知 locale 用它 —— 与 C2 的 SUBJ_WK 同口径）。
   */
  zh: '你收藏的 {total} 个岗:{open} 在招 · {closed} 已下架 — Offer2PR',

  /**
   * 英文标题（open/closed 与正文徽标术语一致）。
   */
  en: 'Your {total} saved jobs: {open} open · {closed} closed — Offer2PR',

  /**
   * 韩文标题。
   */
  ko: '저장한 공고 {total}건: 모집 중 {open}건 · 마감 {closed}건 — Offer2PR',
} as const

/**
 * 退订链接模板。
 */
export const UNSUB_URL = '{site}/api/alerts/unsub?u={u}&t={t}'

/**
 * 走查预览用的退订占位链接。
 */
export const UNSUB_PREVIEW = '{site}/api/alerts/unsub?u=0&t=preview'

/**
 * 中位年薪的占位(没有数据不编数)。
 */
export const SAL_NONE = '—'

/**
 * 中位年薪的千位表示模板。
 */
export const SAL_K = '${k}K'

/**
 * 收藏条目缺标题时的占位。
 */
export const TITLE_NONE = '—'

/**
 * 岗状态:在招。
 */
export const ST_OPEN = 'open'

/**
 * 详情页路径段(邮件链接 = SITE + 它 + id)。
 */
export const JOB_PATH = '/jobs/'

/**
 * C2 档案版的省筛选片段(有目标省时拼进 SQL 模板参数位)。
 */
export const PROV_COND = ' AND j.province = ANY($3)'

/**
 * 收藏画像对的键分隔。
 */
export const PAIR_KEY_SEP = '|'

/**
 * (省, 大类) 计数条件的三段(拼位次参数)。
 */
export const PAIR_L = '(province = $'

/**
 * 中段。
 */
export const PAIR_M = ' AND broad = $'

/**
 * 尾段。
 */
export const PAIR_R = ')'

/**
 * 收藏画像对在标题里的省·类连接符。
 */
export const DIM_JOIN = '\u00b7'

/**
 * 多个画像对之间的分隔。
 */
export const DIMS_LIST_SEP = ' / '

/**
 * OR 连接。
 */
export const OR_SEP = ' OR '

/**
 * ?preview 的周报档取值。
 */
export const PREVIEW_WEEKLY = 'weekly'

/**
 * ?dry 的开启取值。
 */
export const DRY_ON = '1'

/**
 * 邮件语言码:中文。
 */
export const L_ZH = 'zh'

/**
 * 邮件语言码:英文。
 */
export const L_EN = 'en'

/**
 * 邮件语言码:韩文。
 */
export const L_KO = 'ko'

/**
 * 职业名列表的分隔(按邮件语言)。
 */
export const DIMS_SEP = {
  /**
   * 中文用顿号。
   */
  zh: '\u3001',

  /**
   * 英文用逗号。
   */
  en: ', ',

  /**
   * 韩文同英文。
   */
  ko: ', ',
} as const

/**
 * 职业名一个都没有时的兜底(码数说话)。
 */
export const DIMS_FALLBACK = {
  /**
   * 中文。
   */
  zh: '{n} \u4e2a\u804c\u4e1a',

  /**
   * 英文。
   */
  en: '{n} occupations',

  /**
   * 韩文(沿用英文口径 —— 与老实现一致)。
   */
  ko: '{n} occupations',
} as const

/**
 * 带目标省的范围描述。
 */
export const DIMS_PROVS = {
  /**
   * 中文。
   */
  zh: '{provs} \u7684{occ}',

  /**
   * 英文。
   */
  en: '{occ} ({provs})',

  /**
   * 韩文(沿用英文口径 —— 与老实现一致)。
   */
  ko: '{occ} ({provs})',
} as const

/**
 * 不限省(全国)的范围描述。
 */
export const DIMS_NATION = {
  /**
   * 中文。
   */
  zh: '{occ}\uff08\u5168\u56fd\uff09',

  /**
   * 英文。
   */
  en: '{occ} (Canada-wide)',

  /**
   * 韩文。
   */
  ko: '{occ}\uff08\uc804\uad6d\uff09',
} as const

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
 * ?lang 参数名(preview 语言覆盖)。
 */
export const P_LANG = 'lang'

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
 * 退订确认页外壳(双语一页)。
 */
export const UNSUB_PAGE = '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;color:#1f2937;max-width:480px;margin:80px auto;text-align:center"><p style="font-size:28px">🍁</p>{body}</body>'

/**
 * 退订页三态:链接无效。
 */
export const UNSUB_MSG_INVALID = '<p>链接无效。<br/>Invalid link.</p>'

/**
 * 退订页三态:已退订。
 */
export const UNSUB_MSG_DONE = '<p><strong>已退订每周摘要。</strong><br/>You have been unsubscribed from the weekly digest.</p><p style="font-size:13px;color:#9ca3af">可在账户页随时重新开启 / Re-enable anytime on your account page.</p>'

/**
 * 退订页三态:操作失败。
 */
export const UNSUB_MSG_FAIL = '<p>操作失败,请稍后再试。<br/>Something went wrong, please try again later.</p>'

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
 * saved-searches collection 名。
 */
export const COL_SEARCHES = 'saved-searches'

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
