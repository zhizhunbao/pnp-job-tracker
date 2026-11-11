/**
 * ops 子桶 saved 的形状(子桶自声明)。
 *
 * @author Frank
 * @time 2026-11-10 12:00:00
 */
import type { Db } from '@/lib/db'

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
 * 一枚胶囊。
 */
export type SavedTag = {
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
 * 一个单元格。与父桶同形,子桶自声明。
 */
export type SavedCell =
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
    tags: SavedTag[]
  }
  | {
    /**
     * 复制报错格。子桶不产,为接住 cell 子桶的返回形状。
     */
    kind: 'copy'

    /**
     * 要复制的全文。
     */
    text: string
  }
  | {
    /**
     * 主名加灰字格。
     */
    kind: 'named'

    /**
     * 主名。
     */
    main: OpsText

    /**
     * 灰字。
     */
    sub: string
  }
  | {
    /**
     * 删除格。子桶不产,为接住 cell 子桶的返回形状。
     */
    kind: 'del'

    /**
     * 要删的那一条。
     */
    del: {
      /**
       * 种类。
       */
      kind: string

      /**
       * 键。
       */
      key: string

      /**
       * 显示名。
       */
      name: string
    }
  }

/**
 * 表的一行。
 */
export type SavedRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 与列对齐的单元格。
   */
  cells: SavedCell[]
}

/**
 * 一张表。
 */
export type SavedTable = {
  /**
   * 表头标题。
   */
  title: string

  /**
   * 灰字条数。
   */
  count: OpsText

  /**
   * 列。
   */
  cols: {
    /**
     * 列头。
     */
    label: string

    /**
     * 能不能折行。
     */
    wrap: boolean
  }[]

  /**
   * 行。
   */
  rows: SavedRow[]
}

/**
 * 一页看板。
 */
export type SavedBoard = {
  /**
   * 四格。
   */
  cards: {
    /**
     * 数字。
     */
    value: OpsText

    /**
     * 标题。
     */
    label: string
  }[]

  /**
   * 表。
   */
  tables: SavedTable[]

  /**
   * 取数时刻。
   */
  updatedAt: string
}

/**
 * 看板入参。
 */
export type BoardIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 取数时刻。
   */
  updatedAt: string
}

/**
 * 看板出参。
 */
export type BoardOut = Promise<SavedBoard>

/**
 * 一条收藏的原始行。
 */
export type SavedDbRow = {
  /**
   * 收藏行号。
   */
  id: number

  /**
   * 职位号;职位已清掉时为空。
   */
  job_id: number | null

  /**
   * 收藏那一刻的职位名。
   */
  title: string | null

  /**
   * 收藏那一刻的公司名。
   */
  company: string | null

  /**
   * 状态码。
   */
  status: string | null

  /**
   * 收藏人的邮箱;账号已删时为空。
   */
  email: string | null

  /**
   * 收藏时间(多伦多)。
   */
  saved_text: string | null
}

/**
 * 可能为空的文字。
 */
export type MaybeText = string | null

/**
 * 四格的原始行。
 */
export type SavedStatsDbRow = {
  /**
   * 总条数。
   */
  total: number

  /**
   * 收藏过的用户数。
   */
  users: number

  /**
   * 被收藏的职位数。
   */
  jobs: number

  /**
   * 今天新增。
   */
  today: number
}
