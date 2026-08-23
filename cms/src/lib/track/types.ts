/**
 * 埋点域的形状 —— 本域自己声明(两条腿的来龙去脉见 functions 头)。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

/**
 * 埋点 data 的取值(低基数枚举)。
 */
export type TrackData = Record<string, string | number>

/**
 * 埋点 data 或没给(`pickProp` 的入参)。
 */
export type MaybeTrackData = TrackData | null

/**
 * 页面上挂的 umami 面(只认 track 这一格)。
 */
export type UmamiLike = {
  /**
   * umami 的事件上报。
   */
  umami: {
    /**
     * 上报一条事件。
     */
    // eslint-disable-next-line local/no-optional -- umami 脚本定的形状:data 可省,镜像它
    track: (e: string, d?: object) => void
  } | null
}
