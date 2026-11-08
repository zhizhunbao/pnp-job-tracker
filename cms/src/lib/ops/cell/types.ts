/**
 * ops 子桶 cell 的形状(子桶自声明)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */

/**
 * 可能为空的整数。
 */
export type MaybeInt = number | null

/**
 * addIntOf 的入参。
 */
export type AddIntIn = {
  /**
   * 累计值。
   */
  a: MaybeInt

  /**
   * 这一行;驱动可能交回串。
   */
  b: number | null
}

/**
 * 可能为空的文字。
 */
export type MaybeText = string | null

/**
 * 一枚胶囊。
 */
export type OpsTag = {
  /**
   * 变体。
   */
  variant: 'gray' | 'info' | 'ok' | 'warn' | 'bad'

  /**
   * 文字。
   */
  text: string
}

/**
 * 这个子桶造的单元格。
 */
export type OpsCell =
  | {
    /**
     * 文字格。
     */
    kind: 'text'

    /**
     * 文字。
     */
    text: string
  }
  | {
    /**
     * 胶囊格。
     */
    kind: 'tags'

    /**
     * 胶囊。
     */
    tags: OpsTag[]
  }

/**
 * 一格数字。
 */
export type OpsCard = {
  /**
   * 数字。
   */
  value: string

  /**
   * 标题。
   */
  label: string
}

/**
 * cardOf 的入参。
 */
export type CardOfIn = {
  /**
   * 数字。
   */
  value: string | number

  /**
   * 标题。
   */
  label: string
}

/**
 * tagsCell 的入参。
 */
export type TagsOfIn = {
  /**
   * 主胶囊的文字。
   */
  text: string

  /**
   * 主胶囊的变体。
   */
  variant: OpsTag['variant']

  /**
   * 红胶囊的文字;没有是空串。
   */
  warn: string
}

/**
 * usdOf 的入参。
 */
export type UsdOfIn = {
  /**
   * 金额。
   */
  n: number

  /**
   * 小数位。
   */
  digits: number
}

/**
 * pctOf 的入参。
 */
export type PctOfIn = {
  /**
   * 已用。
   */
  used: number

  /**
   * 上限。
   */
  limit: number
}
