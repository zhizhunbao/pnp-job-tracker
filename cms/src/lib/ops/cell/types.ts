/**
 * ops 子桶 cell 的形状(子桶自声明)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */

/**
 * 词条的插值表({k} → 值)。
 */
export type OpsVars = Record<string, string | number>

/**
 * 一条界面文字:词条键加插值,由组件桶取词(2026-11-10 Frank:内部页也要三语,界面字不进 lib)。
 */
export type OpsMsg = {
  /**
   * 词条键(`ops.` 开头,文字住 lib/i18n)。
   */
  key: string

  /**
   * 插值;没有是空表。
   */
  vars: OpsVars
}

/**
 * 一段要显示的文字:字符串是数据原文(原样显示,不翻译),OpsMsg 是界面文字(取词后显示)。
 */
export type OpsText = string | OpsMsg

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
  text: OpsText
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
    text: OpsText
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
  value: OpsText

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
  value: OpsText | number

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
  text: OpsText

  /**
   * 主胶囊的变体。
   */
  variant: OpsTag['variant']

  /**
   * 红胶囊的文字;没有是空串。
   */
  warn: OpsText
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

/**
 * spanAsOf 的入参。
 */
export type SpanAsIn = {
  /**
   * 秒数。
   */
  s: number

  /**
   * 键头(后接时长单位)。
   */
  head: string

  /**
   * 这一句其余的插值;没有是空表。
   */
  vars: OpsVars
}
