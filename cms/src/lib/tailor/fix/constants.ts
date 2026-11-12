/**
 * tailor 子桶 fix 的死值。
 *
 * @author Frank
 * @time 2026-11-12 02:00:00
 */

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 一个空格。
 */
export const ONE_SPACE = ' '

/**
 * 本岗简历草稿里「工作经历」那一格的键。
 */
export const KEY_WORK = 'work'

/**
 * 一段工作里「要点」那一格的键。
 */
export const KEY_DESC = 'desc'

/**
 * 不是整数的一格记成它。
 */
export const INT_NONE = -1

/**
 * 换行。
 */
export const LINE_BREAK = '\n'

/**
 * 求职信里段与段之间的分隔(一个空行)。
 */
export const PARA_BREAK = '\n\n'

/**
 * 求职信至少要有几段才能往里加一句(称呼、至少一段正文、结尾、落款)。
 */
export const COVER_PARAS_MIN = 4

/**
 * 加的那一句放在倒数第几段(结尾段与落款之前的最后一段正文)。
 */
export const COVER_FIX_FROM_END = 3

/**
 * 句号。
 */
export const FULL_STOP = '.'
