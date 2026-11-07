/**
 * me 桶子桶 inbox 的死值(收件箱;2026-11-07 自 inbox 桶在新域重写,接口与事件名照旧)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */

/**
 * 收件箱清单接口。
 */
export const URL_INBOX = '/api/inbox'

/**
 * 转发开关接口。
 */
export const URL_PREFS = '/api/inbox/prefs'

/**
 * 标已读接口。
 */
export const URL_READ = '/api/inbox/read'

/**
 * 站内回信接口。
 */
export const URL_REPLY = '/api/inbox/reply'

/**
 * 深链查询参数:`?msg=<信号>` 直接打开那封(收件箱通知邮件里的链接)。
 */
export const P_MSG = 'msg'

/**
 * 读了一封后在 window 上抛的事件名(顶栏铃铛与左侧导航的未读数听它重拉)。
 */
export const EV_UNREAD = 'inbox:unread'

/**
 * fetch 带 cookie。
 */
export const CRED_INCLUDE = 'include'

/**
 * POST 方法名。
 */
export const METHOD_POST = 'POST'

/**
 * PATCH 方法名。
 */
export const METHOD_PATCH = 'PATCH'

/**
 * 请求头名:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * JSON 的 MIME。
 */
export const MIME_JSON = 'application/json'

/**
 * 回信接口「发信服务没开」的状态码。
 */
export const ST_UNAVAILABLE = 503

/**
 * 空串(判空与清空用)。
 */
export const TEXT_NONE = ''

/**
 * 右上角提示:成功档。
 */
export const TOAST_OK = 'ok'

/**
 * 右上角提示:失败档。
 */
export const TOAST_ERR = 'err'

/**
 * 日期切片起点(`YYYY-MM-DD HH:mm` 取 `MM-DD`)。
 */
export const MD_FROM = 5

/**
 * 日期切片终点。
 */
export const MD_TO = 10

/**
 * 发件人「名字 <地址>」的左括号。
 */
export const ADDR_L = ' <'

/**
 * 发件人「名字 <地址>」的右括号。
 */
export const ADDR_R = '>'

/**
 * 清单里一封信的摘要最多几个字(效果图:发件人、主题下面一行灰字)。
 */
export const SNIPPET_LEN = 60

/**
 * 摘要截断后补的省略号。
 */
export const SNIPPET_MORE = '…'

/**
 * 摘要里把换行与连续空白压成一个空格。
 */
export const SPACE_RUN_RE = /\s+/g

/**
 * 压空白后填的那一个空格。
 */
export const ONE_SPACE = ' '

/**
 * 定制样式钮的统一底座:ghost 底最素,视觉全由本桶的加倍类定形。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 主按钮档。
 */
export const PRIMARY_KIND = 'primary'

/**
 * 次按钮档。
 */
export const SECONDARY_KIND = 'secondary'

/**
 * 全站分区卡的全局类(main.css 的 .cardMd)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 收件箱弹框(读信、回信)记尺寸的键(与原 inbox 桶同一个键,用户拉过的尺寸接着用)。
 */
export const IB_MODAL_PREF = 'adv_modal_pref'

/**
 * 收件箱弹框默认宽。
 */
export const IB_MODAL_W = 900

/**
 * 收件箱弹框默认高。
 */
export const IB_MODAL_H = 760

/**
 * 回信框的行数。
 */
export const REPLY_ROWS = 8

/**
 * 回信最长字数(与回信接口的上限一致)。
 */
export const REPLY_MAX = 10000
