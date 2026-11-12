/**
 * apply 桶的子桶 from 的形状(2026-11-11 任务书第 48 条)。
 *
 * @author Frank
 * @time 2026-11-11 23:50:00
 */

/**
 * 记投递入口(rememberFrom)的入参。
 */
export type FromIn = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 入口(小写字母,最多 16 个:picks / saved / draft / jobs …)。
   */
  from: string
}
