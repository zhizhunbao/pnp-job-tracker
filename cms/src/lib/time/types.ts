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

/**
 * cutFallback 的入参。
 */
export type CutFallbackIn = {
  /**
   * 格式化失败的原串(照原样裁,不猜)。
   */
  iso: string

  /**
   * 裁到第几位(MIN_LEN 到分 / SEC_LEN 到秒)。
   */
  len: number
}

/**
 * 天数或「算不了」—— daysSince 的返回。
 * 不折 0:0 天是「今天挂的」,算不出是另一回事,两者在页面上写法不同。
 */
export type MaybeDays = number | null

/**
 * ISO 串或没有 —— 取日期这类入口收得住调用点直接甩过来的空值。
 */
export type MaybeIso = string | null
