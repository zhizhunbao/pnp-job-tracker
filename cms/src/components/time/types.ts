/**
 * time 组件域的形状:日期/时间渲染件的 props 契约。
 * 值的口径归 lib/time(ymd/fmtLocal/daysSince),这里只管**怎么显示**。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */

/**
 * 显示档:date 纯日期 'YYYY-MM-DD' / minute 到分 / second 到秒。
 */
export type TimeGrain = 'date' | 'minute' | 'second'

/**
 * 字色档:dim 灰小字(列表里的次要时间)/ normal 正文色。
 */
export type TimeTone = 'dim' | 'normal'

/**
 * TimeText(时间戳文本)的 props。
 */
export type TimeTextIn = {
  /**
   * 库里的 ISO 串;null/空 = 显示空值符。
   */
  iso: string | null

  /**
   * 显示档(可省 = date)。
   */
  grain?: TimeGrain

  /**
   * 字色档(可省 = dim —— 时间在列表里几乎都是次要信息)。
   */
  tone?: TimeTone
}

/**
 * DateAge(日期 + 已挂天数)的 props。
 */
export type DateAgeIn = {
  /**
   * 发布日 ISO 串;null = 显示空值符。
   */
  iso: string | null

  /**
   * 天数后缀的文案函数(i18n 在调用方,组件不携词):
   * 收天数给一句「N 天」/「今天」。
   */
  ageText: (days: number) => string

  /**
   * 算不算天数(已关闭的岗不算 —— 它的「已挂」停在关闭那天,不该继续涨)。
   */
  aging: boolean
}

/**
 * textOf 的入参。
 */
export type TimeTextValueIn = {
  /**
   * ISO 串;null/空 = 给空值符。
   */
  iso: string | null

  /**
   * 显示档。
   */
  grain: TimeGrain
}
