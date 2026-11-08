/**
 * ops 子桶 cell 的常量(子桶不取父桶,用到的自抄一份)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */

/**
 * 单元格的种类。
 */
export const CELL = {
  /**
   * 一段文字。
   */
  text: 'text',

  /**
   * 一到两枚胶囊。
   */
  tags: 'tags',
} as const

/**
 * 胶囊变体。
 */
export const VAR = {
  /**
   * 红:失败。
   */
  bad: 'bad',
} as const

/**
 * 没有值时显示的横线。
 */
export const DASH = '—'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 文字单位。
 */
export const TEXT = {
  /**
   * 百分号。
   */
  pct: '%',

  /**
   * 美元符号。
   */
  usd: '$',
}

/**
 * 时长单位。
 */
export const UNIT = {
  /**
   * 秒。
   */
  sec: ' 秒',

  /**
   * 分钟。
   */
  min: ' 分钟',

  /**
   * 小时。
   */
  hour: ' 小时',

  /**
   * 天。
   */
  day: ' 天',
}

/**
 * 一分钟的秒数。
 */
export const MINUTE_S = 60

/**
 * 一小时的秒数。
 */
export const HOUR_S = 3600

/**
 * 一天的秒数。
 */
export const DAY_S = 86400

/**
 * 千分位的区域。
 */
export const NUM_LOCALE = 'en-CA'

/**
 * 百分比换算。
 */
export const PCT_BASE = 100

/**
 * 官网抓取阶段的显示词。
 */
export const STAGE_TEXT: Record<string, string> = {
  /**
   * 排队中。
   */
  queued: '排队中',

  /**
   * 查找官网。
   */
  find: '查找官网',

  /**
   * 抓取。
   */
  fetch: '抓取',

  /**
   * 整理。
   */
  facts: '整理',

  /**
   * 办完。
   */
  done: '完成',

  /**
   * 办完但什么也没有。
   */
  none: '未找到',
}

/**
 * 投递与译名历史状态的显示词。
 */
export const DONE_TEXT: Record<string, string> = {
  /**
   * 已发。
   */
  sent: '已发出',

  /**
   * 已回复。
   */
  replied: '已回复',

  /**
   * 退信。
   */
  bounced: '退信',

  /**
   * 拒绝。
   */
  declined: '已拒绝',

  /**
   * 译名完成。
   */
  done: '完成',

  /**
   * 译名跳过。
   */
  skip: '跳过',
}
