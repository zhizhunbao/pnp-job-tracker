/**
 * ops 子桶 route 的形状(子桶自声明)。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */
import type { Db } from '@/lib/db'

// =========================================================================
// 1. 看板
// =========================================================================

/**
 * 一枚胶囊。
 */
export type RouteTag = {
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
 * 一个单元格。与父桶同形,子桶自声明。
 */
export type RouteCell =
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
    tags: RouteTag[]
  }
  | {
    /**
     * 复制报错格。
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
    main: string

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
export type RouteRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 与列对齐的单元格。
   */
  cells: RouteCell[]
}

/**
 * 一列。
 */
export type RouteCol = {
  /**
   * 列头。
   */
  label: string

  /**
   * 能不能折行。
   */
  wrap: boolean
}

/**
 * 一张表。
 */
export type RouteTable = {
  /**
   * 表头标题。
   */
  title: string

  /**
   * 灰字条数。
   */
  count: string

  /**
   * 列。
   */
  cols: RouteCol[]

  /**
   * 行。
   */
  rows: RouteRow[]
}

/**
 * tableOf 的入参。
 */
export type RouteTableIn = {
  /**
   * 标题。
   */
  title: string

  /**
   * 列。
   */
  cols: RouteCol[]

  /**
   * 行。
   */
  rows: RouteRow[]
}

/**
 * 一页看板。
 */
export type RouteBoard = {
  /**
   * 四格。
   */
  cards: {
    /**
     * 数字。
     */
    value: string

    /**
     * 标题。
     */
    label: string
  }[]

  /**
   * 表。
   */
  tables: RouteTable[]

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
export type BoardOut = Promise<RouteBoard>

// =========================================================================
// 2. 通道与访问
// =========================================================================

/**
 * 只有一个计数的原始行。
 */
export type CountDbRow = {
  /**
   * 计数。
   */
  n: number
}

/**
 * 可能为空的数字。
 */
export type MaybeNumber = number | null

/**
 * 功能的最近模型原始行。
 */
export type RouteModelDbRow = {
  /**
   * 功能。
   */
  feature: string

  /**
   * 模型。
   */
  model: string
}

/**
 * 功能通道登记的一行。
 */
export type RouteInfo = {
  /**
   * 功能代码。
   */
  feature: string

  /**
   * 功能名。
   */
  name: string

  /**
   * 决定主通道的环境变量;固定通道是空串。
   */
  env: string

  /**
   * 默认主通道。
   */
  main: string
}

/**
 * routeRowOf 的入参。
 */
export type RouteRowIn = {
  /**
   * 功能登记。
   */
  route: RouteInfo

  /**
   * 主通道。
   */
  main: string

  /**
   * 各功能最近模型。
   */
  models: RouteModelDbRow[]
}

/**
 * 实测原始行。
 */
export type EvalDbRow = {
  /**
   * id。
   */
  id: number

  /**
   * 功能。
   */
  feature: string

  /**
   * 模型。
   */
  model: string

  /**
   * 状态。
   */
  state: string

  /**
   * 任务准确度。
   */
  accuracy: number | null

  /**
   * 一致性。
   */
  consistency: number | null

  /**
   * 语气。
   */
  tone: number | null

  /**
   * 隐私。
   */
  privacy: number | null

  /**
   * 评分方式。
   */
  method: string | null

  /**
   * 样本数。
   */
  samples: number

  /**
   * 平均延迟。
   */
  latency_ms: number | null

  /**
   * 花费。
   */
  cost_usd: number

  /**
   * 开始时刻。
   */
  started_text: string
}

/**
 * Key 登记的一行。
 */
export type KeyInfo = {
  /**
   * Key 名。
   */
  name: string

  /**
   * 末四位。
   */
  last4: string

  /**
   * Workspace。
   */
  workspace: string

  /**
   * 关联账号。
   */
  account: string

  /**
   * 是否启用。
   */
  active: boolean

  /**
   * 创建日。
   */
  created: string
}
