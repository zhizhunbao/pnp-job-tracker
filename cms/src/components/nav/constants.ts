/**
 * nav 域的死值。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */

/**
 * 定制样式钮的统一底座:ghost 底最素,视觉全由本域的加倍类定形(与 tag / tabs 桶同名同义,各家一份)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 抽屉关闭钮的 aria-label(照 modal 桶 CLOSE_ARIA 的先例:英文死值,要不要走 i18n 跟 modal 一起定)。
 */
export const CLOSE_ARIA = 'close'

/**
 * 当前项的 aria-current 值(WAI-ARIA 定死的词:读屏把它念成「当前页」;打错不报错只是失能,所以起名)。
 */
export const CURRENT_PAGE = 'page'

/**
 * 非当前项的 aria-current 值(WAI-ARIA 定的「不是当前」;显式写出,不靠缺席)。
 */
export const CURRENT_NONE = 'false'

/**
 * 抽屉的 ARIA 角色(WAI-ARIA dialog:窄屏拉出来盖在内容上,读屏要知道这是一块浮层)。
 */
export const ROLE_DIALOG = 'dialog'

/**
 * 计数格「没有要看的」的值:0 不出红点。
 */
export const COUNT_NONE = 0
