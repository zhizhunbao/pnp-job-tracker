/**
 * loading 域的形状。
 *
 * @author Frank
 * @time 2026-09-14 14:30:00
 */

/**
 * Loading 的 props。
 */
export type LoadingIn = {
  /**
   * 转圈旁的一句话(调用方从 i18n 取,本件不取词)。
   */
  text: string

  /**
   * 撑满定高的外框,上下也居中(2026-11-09;占位卡、窗口形弹框里独占正文时给 true,不给 = 只左右居中)。
   */
  fill?: boolean
}

/**
 * loadingClsOf 的入参。
 */
export type LoadingClsIn = {
  /**
   * 要不要撑满定高的外框。
   */
  fill: boolean
}
