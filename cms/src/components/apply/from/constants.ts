/**
 * apply 桶的子桶 from —— 这一封投递是从哪个页面发起的(2026-11-11 任务书第 48 条)的死值。
 * 父桶 functions.ts 贴着 1000 行,新关注点照 letter 的形开子桶;依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-11 23:50:00
 */

/**
 * 记投递入口的 cookie 名(服务端存草稿、发送时读:lib/apply 的 ENTRY_COOKIE_RE)。
 */
export const FROM_COOKIE = 'apply_from'

/**
 * cookie 里职位 id 与入口之间的分隔。
 */
export const FROM_SEP = '.'

/**
 * cookie 的尾巴:全站可读、留一天、同站才带。
 */
export const FROM_COOKIE_TAIL = '; path=/; max-age=86400; samesite=lax'

/**
 * cookie 名与值之间的等号。
 */
export const FROM_EQ = '='

/**
 * 入口:职位板、职位页、职位框(职位桶广播「要投这一岗」的都算)。
 */
export const FROM_JOBS = 'jobs'
