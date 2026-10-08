/**
 * 站内投递域的桶(浏览器也能打包的那半):投递页与服务端共用的求职信填空 / 换回占位 / 位置跟随 / 字符判定 / 署名判定,
 * 信的上限。(2026-10-07 投递页撤、放进「我的」,起始态改由 /api/apply/start 取,`loadApplyStart` 不再出桶。)
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */

export { COVER_MAX } from './constants'
export {
  coverFileOf, coverFillOf, coverNormOf, isSenderName, pdfBadCharsOf,
} from './functions'
export type { ApplyStart } from './types'
