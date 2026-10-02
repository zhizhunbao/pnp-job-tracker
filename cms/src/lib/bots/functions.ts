/**
 * 爬虫域的行为:判一个浏览器标识该不该挡(页面门调,边缘运行时,纯函数)。
 *
 * @author Frank
 * @time 2026-10-01 21:00:00
 */

import { BOT_BLOCK_RE } from './constants'

// =========================================================================
// 1. 挡爬虫
// =========================================================================

/**
 * 这个浏览器标识是不是要挡的非搜索类爬虫(名单与理由见 BOT_BLOCK_RE)。
 *
 * @param ua 请求头里的浏览器标识,没带就传空串。
 * @returns 要挡就是 true。
 */
export function isBlockedBot(ua: string): boolean {
  return BOT_BLOCK_RE.test(ua)
}
