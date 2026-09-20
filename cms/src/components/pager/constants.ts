/**
 * pager 域的死值:两个翻页钮的无障碍名与页码分隔符。
 *
 * @author Frank
 * @time 2026-08-24 16:00:00
 */

/**
 * 上一页钮的无障碍名。
 * 纯图标钮(里面只有一个 svg)必须有名字,否则读屏只报一句「按钮」。
 * 给的是箭头字符本身而不是「上一页」三个字 —— 本域是全站通用件、不携词
 * (词归 lib/i18n),真要念出人话得由调用方传进来;眼下先保证有名字。
 */
export const PREV_ARIA = '‹'

/**
 * 下一页钮的无障碍名:右向单角引号,与 PREV_ARIA 的左向那个成对。
 * 同样是纯图标钮(里面只有一个 IconChevronRight),没有名字读屏只报一句「按钮」;
 * 取箭头字符而不是「下一页」三个字的判据见 PREV_ARIA —— 本域不携词。
 */
export const NEXT_ARIA = '›'

/**
 * 当前页与总页数之间的分隔,渲染成「1 / 5」。
 * 斜杠两边各留一个空格是排版决定:贴着写成 1/5 会被读成分数,
 * 而这两个数是「第几页」与「共几页」,不是一个比值。
 */
export const PAGE_SEP = ' / '

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 「显示更多」钮的底:白底描边(与职位板那一行同款)。
 */
export const MORE_BTN_KIND = 'secondary'

/**
 * 「显示更多」在途时的钮面占位。
 */
export const MORE_BUSY = '…'

/**
 * 不加类(「显示更多」钮平时不带附加类)。
 */
export const CLS_NONE = ''

/**
 * 页码链接行露哪些页:当前页的相对偏移(首页、末页另加)。
 * ±1 ±2 给人翻,±10 ±100 给爬虫跳 —— 只有「下一页」的话第 800 页要顺着爬 800 跳才到
 * (2026-09-20 站内链接批三,设计稿 docs/design/站内链接与收录-20260920.md)。
 */
export const LINK_OFFSETS = [-100, -10, -2, -1, 0, 1, 2, 10, 100]

/**
 * 页码之间不连续时的省略记号。
 */
export const LINK_GAP = '…'

/**
 * 页号参数名(0 起;第 0 页不带参数 = 列表页本身)。
 */
export const LINK_PAGE_PARAM = 'page='

/**
 * 查询串起头。
 */
export const LINK_QUERY_HEAD = '?'

/**
 * 查询参数之间的连接符。
 */
export const LINK_QUERY_SEP = '&'

/**
 * 页码链接走整页跳转(裸 a,不走 next/link):十来条动态页链接一进视口就被预取,等于每次看板多打十次库。
 */
export const LINK_TARGET = '_self'

/**
 * 页码链接行的无障碍名。
 */
export const LINK_NAV_ARIA = 'Pages'

/**
 * 「这一格不是链接」的记号(当前页与省略格的 href)。
 */
export const LINK_NONE = ''
