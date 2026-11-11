/**
 * ops 桶的子桶 saved 的常量:用户收藏页的列、四格与状态词。
 * 出处:2026-11-10 Frank「应该在运维模块能看到全部」;父桶 functions 贴近 1000 行,新页开子桶。
 *
 * @author Frank
 * @time 2026-11-10 12:00:00
 */

/**
 * 单元格种类。
 */
export const CELL = {
  /**
   * 主名加灰字。
   */
  named: 'named',
} as const

/**
 * 胶囊变体。
 */
export const VAR = {
  /**
   * 灰:只是收着。
   */
  gray: 'gray',

  /**
   * 蓝:已经往下走了一步。
   */
  info: 'info',
} as const

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 条数的单位。
 */
export const ROWS_KEY = 'ops.rows'

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 200

/**
 * 表头标题。
 */
export const TITLE_SAVED = 'ops.tt.saved'

/**
 * 四格的标题。
 */
export const CARD = {
  /**
   * 总条数。
   */
  total: 'ops.card.savedTotal',

  /**
   * 收藏过的用户数。
   */
  users: 'ops.card.savedUsers',

  /**
   * 被收藏的职位数。
   */
  jobs: 'ops.card.savedJobs',

  /**
   * 今天新增。
   */
  today: 'ops.card.savedToday',
} as const

/**
 * 用户收藏表。
 */
export const SAVED_COLS = [
  { label: 'ops.col.savedAt', wrap: false }, { label: 'ops.col.user', wrap: false }, { label: 'ops.col.job', wrap: true }, { label: 'ops.col.jobId', wrap: false },
  { label: 'ops.col.status', wrap: false },
]

/**
 * 只是收着的状态码(站上点收藏落的值)。
 */
export const STATUS_WISH = 'wish'

/**
 * 状态码 → 显示词;表外的原样显示。
 */
export const STATUS_NAME: Record<string, string> = {
  /**
   * 想投。
   */
  wish: 'ops.saved.wish',

  /**
   * 已投。
   */
  applied: 'ops.saved.applied',

  /**
   * 面试中。
   */
  interview: 'ops.saved.interview',

  /**
   * 拿到 offer。
   */
  offer: 'offer',
}
