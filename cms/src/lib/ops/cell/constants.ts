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
 * 带时长的句子的键头,后接 UNIT 的一格成词条键(时长的数走插值 d)。
 */
export const SPAN = {
  /**
   * 只有时长。
   */
  dur: 'ops.dur.',

  /**
   * 每隔多久。
   */
  every: 'ops.every.',

  /**
   * 过点多久。
   */
  late: 'ops.late.',

  /**
   * 多久之后。
   */
  after: 'ops.after.',
}

/**
 * 时长单位(词条键的末段)。
 */
export const UNIT = {
  /**
   * 秒。
   */
  sec: 'sec',

  /**
   * 分钟。
   */
  min: 'min',

  /**
   * 小时。
   */
  hour: 'hour',

  /**
   * 天。
   */
  day: 'day',
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
  queued: 'ops.stage.queued',

  /**
   * 查找官网。
   */
  find: 'ops.stage.find',

  /**
   * 抓取。
   */
  fetch: 'ops.stage.fetch',

  /**
   * 整理。
   */
  facts: 'ops.stage.facts',

  /**
   * 办完。
   */
  done: 'ops.stage.done',

  /**
   * 办完但什么也没有。
   */
  none: 'ops.stage.none',
}

/**
 * 投递与译名历史状态的显示词。
 */
export const DONE_TEXT: Record<string, string> = {
  /**
   * 已发。
   */
  sent: 'ops.done.sent',

  /**
   * 已回复。
   */
  replied: 'ops.done.replied',

  /**
   * 退信。
   */
  bounced: 'ops.done.bounced',

  /**
   * 拒绝。
   */
  declined: 'ops.done.declined',

  /**
   * 译名完成。
   */
  done: 'ops.done.done',

  /**
   * 译名跳过。
   */
  skip: 'ops.done.skip',
}
