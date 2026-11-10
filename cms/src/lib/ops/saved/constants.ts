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
export const ROWS_TAIL = ' 条'

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 200

/**
 * 表头标题。
 */
export const TITLE_SAVED = '全部收藏'

/**
 * 四格的标题。
 */
export const CARD = {
  /**
   * 总条数。
   */
  total: '收藏总数',

  /**
   * 收藏过的用户数。
   */
  users: '收藏过的用户',

  /**
   * 被收藏的职位数。
   */
  jobs: '被收藏的职位',

  /**
   * 今天新增。
   */
  today: '今天新增',
} as const

/**
 * 用户收藏表。
 */
export const SAVED_COLS = [
  { label: '收藏时间', wrap: false }, { label: '用户', wrap: false }, { label: '职位', wrap: true }, { label: '职位号', wrap: false },
  { label: '状态', wrap: false },
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
  wish: '想投',

  /**
   * 已投。
   */
  applied: '已投',

  /**
   * 面试中。
   */
  interview: '面试中',

  /**
   * 拿到 offer。
   */
  offer: 'offer',
}
