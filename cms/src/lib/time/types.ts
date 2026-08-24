/**
 * time 域的形状。
 *
 * @author Frank
 * @time 2026-08-24 12:00:00
 */

/**
 * daysSince 的入参。
 */
export type DaysSinceIn = {
  /**
   * 起点(ISO 串或纯日期 'YYYY-MM-DD');空串/null = 算不了。
   */
  iso: string | null

  /**
   * 参照的此刻(毫秒;调用方传 Date.now(),测试里可注固定值 ——
   * 纯函数不自己读时钟,不然没法测)。
   */
  now: number
}
