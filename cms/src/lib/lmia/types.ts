/**
 * LMIA 口径域的形状 —— 本域自己声明(政策事实与维护说明见 constants 头)。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

/**
 * 工资分类:高薪 / 低薪 / 判不了。
 */
export type LmiaWageClass = 'high' | 'low' | null

/**
 * `lmiaWageClass` 的入参。
 */
export type LmiaWageClassIn = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 年薪;没有则 null(判不了,不猜)。
   */
  salaryAnnual: number | null
}
