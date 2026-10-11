/**
 * 通知域(lib/notify)的常量:顶栏铃铛的清单口径与接口词(2026-10-11 批 5「提示统一 + 顶栏铃铛」,
 * Frank「所有的消息 是不是应该统一放到一个地方显示」,照 Azure 门户的 Notifications)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

/**
 * 清单最多几条(每段先各截这么多再合,合完再截)。
 */
export const NOTIFY_LIMIT = 20

/**
 * 「已发出」只列几天内的。
 */
export const SENT_DAYS = 7

/**
 * 通知种类:今日推荐那一条(库里恒有一行,条数为 0 就丢)。
 */
export const KIND_PICKS = 'picks'

/**
 * 空串(库里没给的文字格)。
 */
export const TEXT_NONE = ''

/**
 * 接口错误码:没登录。
 */
export const E_AUTH = 'auth'

/**
 * 接口错误码:没查成(表没建、库挂了;已留痕)。
 */
export const E_LOAD = 'load'

/**
 * 只给本人、谁都别存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 查询参数:浏览器按时区预选的省码(今日推荐按它算,同 /api/myjobs/picks)。
 */
export const P_PROV = 'prov'

/**
 * 省码形(只认两位大写字母,别的当没给)。
 */
export const PROV_RE = /^[A-Z]{2}$/
