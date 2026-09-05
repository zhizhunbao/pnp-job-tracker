/**
 * 站内向导对话框(挂件面板里的那半)的死值:接口、类别、边界、埋点、字面量。
 * 设计稿 docs/design/顾问改向导-20260904.md §5;2026-09-05 批三立桶,替 components/chat 的 ChatBox 半边。
 * 见客文案一律在 lib/i18n(`chat.*` 键空间沿用,`guide.dest.*` 是目的地名)。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */

/**
 * 一轮带路 / 记下的接口。
 */
export const URL_GUIDE = '/api/guide'

/**
 * 给某一轮留邮箱的接口。
 */
export const URL_GUIDE_EMAIL = '/api/guide/email'

/**
 * 请求方法。
 */
export const METHOD_POST = 'POST'

/**
 * 请求头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 体。
 */
export const MIME_JSON = 'application/json'

/**
 * 带 cookie(鉴权与免费池按账号)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 限流状态码(免费池用完 / 匿名池超限)。
 */
export const TOO_MANY = 429

/**
 * 四类(与 lib/guide 的 KIND 同字面量,本桶自抄)。
 */
export const KIND = {
  /**
   * 站上有这一页,带过去。
   */
  nav: 'nav',

  /**
   * 站上没有,记下。
   */
  question: 'question',

  /**
   * 想要站上加什么,记下。
   */
  suggestion: 'suggestion',

  /**
   * 打招呼、问向导能干什么。
   */
  chat: 'chat',
} as const

/**
 * 目的地名的 i18n 键前缀(后接 lib/guide 的目的地键)。
 */
export const DEST_KEY_PREFIX = 'guide.dest.'

/**
 * 空态四条胶囊的 i18n 键(点即发)。
 */
export const CHIP_KEYS = ['chat.chip1', 'chat.chip2', 'chat.chip3', 'chat.chip4']

/**
 * 留邮箱的状态机:没点 → 展开填 → 发送中 → 已记 / 失败。
 */
export const EMAIL = {
  /**
   * 还没点「留个邮箱」。
   */
  idle: 'idle',

  /**
   * 输入框已展开。
   */
  open: 'open',

  /**
   * 请求在路上。
   */
  sending: 'sending',

  /**
   * 写到了。
   */
  sent: 'sent',

  /**
   * 没写到(重试仍在输入框)。
   */
  fail: 'fail',
} as const

/**
 * 一轮的故障态:空串 = 正常;limit = 限流;net = 没连上。
 */
export const FAULT = {
  /**
   * 正常。
   */
  none: '',

  /**
   * 限流。
   */
  limit: 'limit',

  /**
   * 没连上服务。
   */
  net: 'net',
} as const

/**
 * 输入框字数上限(服务端同值兜底)。
 */
export const TEXT_LEN_MAX = 1200

/**
 * 离上限这么近才显示计数。
 */
export const NUM_WARN_SLACK = 200

/**
 * 多轮上下文只带最近这么多轮。
 */
export const HISTORY_MAX = 6

/**
 * 输入框自动长高的上限(px)。
 */
export const TA_H_MAX = 160

/**
 * 邮箱输入上限。
 */
export const EMAIL_MAX = 200

/**
 * 贴底判定的余量(px):离底不到这么多就算在底。
 */
export const STICK_SLACK_PX = 48

/**
 * 用户发出一句。
 */
export const EV_SUBMIT = 'chat-submit'

/**
 * 一轮落地。
 */
export const EV_ANSWER = 'chat-answer'

/**
 * 点了「打开 X」。
 */
export const EV_NAV = 'guide-nav'

/**
 * 留了邮箱。
 */
export const EV_EMAIL = 'guide-email'

/**
 * 胶囊与卡的钮档(通用桶 Button 的 kind)。
 */
export const PLAIN_BTN_KIND = 'ghost' as const

/**
 * 发送钮图标尺寸。
 */
export const SEND_ICON_PX = 19

/**
 * 字数计数的分隔。
 */
export const COUNT_SEP = '/'

/**
 * 空串:「没有」的成语。
 */
export const TEXT_NONE = ''

/**
 * 输入框重排高度用。
 */
export const H_AUTO = 'auto'

/**
 * 像素单位。
 */
export const PX = 'px'

/**
 * 回车键名。
 */
export const KEY_ENTER = 'Enter'

/**
 * 触屏判定的媒体查询(触屏回车换行,桌面回车发送)。
 */
export const COARSE_MQ = '(pointer: coarse)'

/**
 * 多轮历史里的角色名。
 */
export const ROLE = {
  /**
   * 用户轮。
   */
  user: 'user',

  /**
   * 向导轮。
   */
  assistant: 'assistant',
} as const

/**
 * 邮箱输入框的 type。
 */
export const INPUT_EMAIL = 'email'

/**
 * 埋点里目的地字段名。
 */
export const EV_PROP_DEST = 'dest'
