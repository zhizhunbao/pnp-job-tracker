/**
 * 收件箱域(lib/inbox)的常量。2026-10-10 批 3「收件箱」(Frank 拍板:每人一个专属投递邮箱;雇主回信进站内收件箱,
 * 默认同时转一份到账户邮箱、可关;收到回信那一条投递记成「雇主回复」)。设计稿 docs/design/我的/我的求职-20261009.md 1.5 / 2.5 / 1.6 / 2.6。
 * 表 docs/sql/inbox-20261010.sql:inbox_aliases / inbox_messages。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

// =========================================================================
// 1. 投递邮箱
// =========================================================================

/**
 * 收信子域(如 in.offer2pr.com;Resend 收信 + Cloudflare MX 指过去)。没配 = 收件箱没开通:投递的回复地址照旧用账户邮箱,不建专属地址。
 */
export const INBOUND_DOMAIN = (process.env.INBOUND_DOMAIN || '').trim().toLowerCase()

/**
 * 专属地址名字段最长几个字母(英文名转小写只留字母,太长截掉)。
 */
export const ALIAS_NAME_MAX = 12

/**
 * 名字段一个字母都取不出来时的替补。
 */
export const ALIAS_NAME_FALLBACK = 'me'

/**
 * 随机段的字母表(去掉易混的 0 / 1 / l / o)。
 */
export const ALIAS_RAND_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'

/**
 * 随机段几位(32 字母表 5 位 ≈ 3300 万种,同一个名字猜不中;地址被猜到 = 有人能往他收件箱塞信)。
 */
export const ALIAS_RAND_LEN = 5

/**
 * 名字段与随机段之间的分隔。
 */
export const ALIAS_SEP = '.'

/**
 * 撞了别人的地址最多重试几次(5 位随机段撞上的概率极小,重试到顶就是库出了别的事)。
 */
export const ALIAS_TRIES = 5

/**
 * 名字段只留小写字母。
 */
export const NAME_DROP_RE = /[^a-z]/g

/**
 * 地址里的 @。
 */
export const AT = '@'

/**
 * 子地址分隔(alias+a123:+ 后面是这一封投递的标记,雇主一回信就知道是哪一封)。
 */
export const PLUS = '+'

/**
 * 子地址标记的头字母(a = application)。
 */
export const APP_TAG = 'a'

/**
 * 子地址标记:a + 投递行 id。
 */
export const APP_TAG_RE = /^a(?<id>\d{1,9})$/

/**
 * 专属地址本身的合形(防回调里的怪地址进 SQL 前就挡掉;与表上的 CHECK 同口径)。
 */
export const ALIAS_RE = /^[a-z0-9.]{3,40}$/

/**
 * 「名字 <地址>」里取尖括号里的地址。
 */
export const ADDR_IN_ANGLE_RE = /<(?<addr>[^<>\s]+@[^<>\s]+)>/

/**
 * 尖括号前面的显示名(去掉两头空白与引号)。
 */
export const NAME_QUOTES_RE = /^["'\s]+|["'\s]+$/g

/**
 * 地址显示名与尖括号的分界。
 */
export const ANGLE_L = '<'

// =========================================================================
// 2. 收信
// =========================================================================

/**
 * Resend 收到一封信的回调事件名。
 */
export const EV_RECEIVED = 'email.received'

/**
 * Resend 收信接口(GET 加邮件 id 取全文;回调里只有元信息)。依据 https://resend.com/docs/api-reference/emails/retrieve-received-email 。
 */
export const RECEIVED_URL = 'https://api.resend.com/emails/receiving/'

/**
 * 鉴权头名。
 */
export const HDR_AUTH = 'Authorization'

/**
 * 鉴权头前缀(带尾空格)。
 */
export const BEARER_PREFIX = 'Bearer '

/**
 * 收信接口回的邮件头(小写键):这一封回的是哪一封。
 */
export const HDR_IN_REPLY_TO_LC = 'in-reply-to'

/**
 * 收信接口回的邮件头(小写键):整串往来的 Message-ID。
 */
export const HDR_REFERENCES_LC = 'references'

/**
 * 发信时带的头:回的是哪一封。
 */
export const HDR_IN_REPLY_TO = 'In-Reply-To'

/**
 * 发信时带的头:整串往来。
 */
export const HDR_REFERENCES = 'References'

/**
 * 从邮件头里抠 Message-ID(尖括号连同里面)。
 */
export const MSG_ID_RE = /<[^<>\s]+>/g

/**
 * 方向:收到的。
 */
export const DIR_IN = 'in'

/**
 * 方向:本人回出去的。
 */
export const DIR_OUT = 'out'

/**
 * 正文最多存多少字(与表上的 CHECK 同值;超长截掉,不拒收)。
 */
export const BODY_MAX = 100000

/**
 * HTML 里整块丢掉的段(样式与脚本)。
 */
export const HTML_DROP_RE = /<(style|script|head)[\s\S]*?<\/\1>/gi

/**
 * HTML 里换行的标签(br、段落、块的收尾)。
 */
export const HTML_BREAK_RE = /<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi

/**
 * 其余标签一律去掉。
 */
export const HTML_TAG_RE = /<[^>]+>/g

/**
 * 三行以上空行压成一个空行。
 */
export const BLANKS_RE = /\n{3,}/g

/**
 * 行尾空白。
 */
export const TRAIL_SPACE_RE = /[ \t]+\n/g

/**
 * 常见实体 → 字(只还原这几个;别的原样留着,不冒险解析)。
 */
export const HTML_ENTITIES: Record<string, string> = {
  /**
   * 和号。
   */
  '&amp;': '&',

  /**
   * 小于号。
   */
  '&lt;': '<',

  /**
   * 大于号。
   */
  '&gt;': '>',

  /**
   * 双引号。
   */
  '&quot;': '"',

  /**
   * 单引号。
   */
  '&#39;': "'",

  /**
   * 不换行空格。
   */
  '&nbsp;': ' ',
}

/**
 * 实体匹配。
 */
export const HTML_ENTITY_RE = /&(amp|lt|gt|quot|#39|nbsp);/g

/**
 * 换行。
 */
export const NEWLINE = '\n'

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 收信结果:不是收信事件 / 对不上本站地址(回 200 不重试)。
 */
export const RECV_IGNORED = 'ignored'

/**
 * 收信结果:地址合形但不是任何人的(回 200 不重试)。
 */
export const RECV_UNKNOWN = 'unknown'

/**
 * 收信结果:发件人就是本站收信子域(自己转自己,掐掉防回环)。
 */
export const RECV_LOOP = 'loop'

/**
 * 收信结果:同一封回调重放(已经记过)。
 */
export const RECV_DUP = 'dup'

/**
 * 收信结果:全文取不到(回 502,让 Resend 重试)。
 */
export const RECV_FETCH = 'fetch'

/**
 * 收信结果:记进收件箱了。
 */
export const RECV_STORED = 'stored'

// =========================================================================
// 3. 转发与回信
// =========================================================================

/**
 * 转发信标题头。
 */
export const FWD_SUBJECT_HEAD = 'Fwd: '

/**
 * 转发信正文的分隔行。
 */
export const FWD_SEP = '---------- Forwarded message ----------'

/**
 * 转发信正文:发件人一行。
 */
export const FWD_FROM = 'From: '

/**
 * 转发信正文:标题一行。
 */
export const FWD_SUBJECT = 'Subject: '

/**
 * 转发信正文:去站内看的一行。
 */
export const FWD_LINK = 'Open in Offer2PR: '

/**
 * 转发信页脚:为什么收到这一封。
 */
export const FWD_FOOT = 'You get this copy because forwarding is on in Offer2PR > Inbox.'

/**
 * 站点根(去站内收件箱的链接)。
 */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

/**
 * 站内收件箱某一封的路径头(后接信 id;收件箱认 `?msg=` 深链)。
 */
export const INBOX_PATH_HEAD = '/account?sec=inbox&msg='

/**
 * 回信标题头。
 */
export const RE_HEAD = 'Re: '

/**
 * 标题已经是回信的(不再叠 Re:)。
 */
export const RE_RE = /^re:/i

/**
 * 发件人显示名后的尖括号。
 */
export const ADDR_L = ' <'

/**
 * 发件人地址的右尖括号。
 */
export const ADDR_R = '>'

/**
 * HTML 正文的换行。
 */
export const HTML_BR = '<br>'

/**
 * HTML 里要转义的字。
 */
export const HTML_ESC_RE = /[&<>"]/g

/**
 * 转义表。
 */
export const HTML_ESC: Record<string, string> = {
  /**
   * 和号。
   */
  '&': '&amp;',

  /**
   * 小于号。
   */
  '<': '&lt;',

  /**
   * 大于号。
   */
  '>': '&gt;',

  /**
   * 双引号。
   */
  '"': '&quot;',
}

/**
 * 回信正文最长几个字。
 */
export const REPLY_MAX = 10000

/**
 * 每人每天最多回几封(防拿站内回信当群发)。
 */
export const REPLY_LIMIT_DAILY = 30

/**
 * 回信限流计数键前缀。
 */
export const REPLY_LIMIT_PREFIX = 'inbox-reply:'

// =========================================================================
// 4. 接口
// =========================================================================

/**
 * 收件箱一次最多列多少封(两个方向合计)。
 */
export const LIST_LIMIT = 200

/**
 * 查询参数:投递行 id(GET /api/inbox/thread?app=)。
 */
export const P_APP = 'app'

/**
 * 响应的缓存头:只给本人,哪一层都不许存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 错误体:要登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误体:请求体或参数不合形。
 */
export const E_BODY = 'body'

/**
 * 错误体:没有这一封 / 这一条(或不是本人的)。
 */
export const E_NOT_FOUND = 'notFound'

/**
 * 错误体:超限。
 */
export const E_LIMIT = 'limit'

/**
 * 错误体:发信没配置。
 */
export const E_MAIL_OFF = 'mailOff'

/**
 * 错误体:发信失败。
 */
export const E_MAIL = 'mail'
