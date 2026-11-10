/**
 * apply 子桶 entry 的参数:投递框开在哪一屏的几个名字、没额度时的说明词条。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */

/**
 * 屏:两个选择(免费有额度的第一屏)。
 */
export const MODE_CHOOSE = 'choose'

/**
 * 屏:三屏框(按这个职位改写)。
 */
export const MODE_TAILOR = 'tailor'

/**
 * 屏:基础简历投递。
 */
export const MODE_BASE = 'base'

/**
 * 额度档:会员(与 lib/apply/credit 的 PLAN_PRO 同值,各域自抄)。
 */
export const PLAN_PRO = 'pro'

/**
 * 父桶的步骤名:第一步(父桶 STEP_RESUME 同值)。
 */
export const STEP_RESUME = 'resume'

/**
 * 父桶的步骤名:求职信(父桶 STEP_LETTER 同值;父桶的离页存草稿只在这一步之后才存)。
 */
export const STEP_LETTER = 'letter'

/**
 * 已经发出去的投递状态(父桶 SENT_STATUSES 同值)。
 */
export const SENT_STATUSES = ['sent', 'replied', 'bounced', 'sending']

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 日期在 ISO 串里占几位(年-月-日)。
 */
export const DATE_LEN = 10

/**
 * 词条:免费额度用完。
 */
export const KEY_OUT_FREE = 'ap.creditOut'

/**
 * 词条:免费额度还剩几个。
 */
export const KEY_LEFT_FREE = 'ap.leftFree'

/**
 * 词条:会员本期额度还剩几个。
 */
export const KEY_LEFT_PRO = 'ap.leftPro'

/**
 * 词条:会员本期额度用完,带恢复日。
 */
export const KEY_OUT_PRO = 'ap.creditOutPro'
