/**
 * ops 域的形状:一页运维看板的线格式(服务端洗好、浏览器只负责画)、库原始行、删除请求。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import type { Db } from '../db'

// =========================================================================
// 1. 看板
// =========================================================================

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
 * 要删的那一条。
 */
export type OpsDel = {
  /**
   * 种类。
   */
  kind: string

  /**
   * 键。
   */
  key: string

  /**
   * 确认框里显示的名字。
   */
  name: string
}

/**
 * 一个单元格。
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
  | {
    /**
     * 删除格。
     */
    kind: 'del'

    /**
     * 要删的那一条。
     */
    del: OpsDel
  }
  | {
    /**
     * 复制报错格。
     */
    kind: 'copy'

    /**
     * 要复制的报错全文。
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
     * 事件操作格。
     */
    kind: 'act'

    /**
     * 操作。
     */
    act: {
      /**
       * 事件 id。
       */
      id: number

      /**
       * 改成哪个用户响应。
       */
      to: string

      /**
       * 钮上的字。
       */
      text: string
    }
  }

/**
 * 一行。
 */
export type OpsRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 与列对齐的单元格。
   */
  cells: OpsCell[]
}

/**
 * 一列。
 */
export type OpsCol = {
  /**
   * 列头。
   */
  label: string

  /**
   * 是否允许折行。
   */
  wrap: boolean
}

/**
 * 一张表。
 */
export type OpsTable = {
  /**
   * 表头标题。
   */
  title: string

  /**
   * 标题旁的灰字条数。
   */
  count: string

  /**
   * 列。
   */
  cols: OpsCol[]

  /**
   * 行。
   */
  rows: OpsRow[]
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
 * 一页看板。
 */
export type OpsBoard = {
  /**
   * 四格数字。
   */
  cards: OpsCard[]

  /**
   * 一到两张表。
   */
  tables: OpsTable[]

  /**
   * 取数时刻(ISO)。
   */
  updatedAt: string
}

/**
 * loadOpsBoard 的入参。
 */
export type LoadBoardIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 哪一页。
   */
  sec: string
}

/**
 * 一页的取数入参。
 */
export type SecIn = {
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
 * 一页看板的出参。
 */
export type OpsBoardOut = Promise<OpsBoard>

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
 * tableOf 的入参。
 */
export type TableOfIn = {
  /**
   * 标题。
   */
  title: string

  /**
   * 列。
   */
  cols: OpsCol[]

  /**
   * 行。
   */
  rows: OpsRow[]

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * tagsOf 的入参。
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
 * 可能为空的整数。
 */
export type MaybeInt = number | null

/**
 * 可能为空的文字。
 */
export type MaybeText = string | null

/**
 * 四格。
 */
export type OpsCards = OpsCard[]

/**
 * statsOf 的入参。
 */
export type StatsOfIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 汇总语句。
   */
  sql: string
}

/**
 * 汇总行的出参。
 */
export type StatsOut = Promise<MaybeQueueStats>

/**
 * queueReportRowOf 的入参。
 */
export type QueueReportIn = {
  /**
   * 领域名。
   */
  name: string

  /**
   * 汇总行。
   */
  stats: MaybeQueueStats
}

/**
 * reportRowOf 的入参。
 */
export type ReportRowIn = {
  /**
   * 领域名。
   */
  name: string

  /**
   * 实际情况。
   */
  actual: string

  /**
   * 目标。
   */
  target: string

  /**
   * 是否达标;没有约定目标是 null。
   */
  met: boolean | null

  /**
   * 事件和失败数。
   */
  incidents: number

  /**
   * 用量。
   */
  usage: string
}

/**
 * 服务报告一行加是否达标。
 */
export type ReportRow = {
  /**
   * 表格行。
   */
  row: OpsRow

  /**
   * 是否达标;没有约定目标是 null。
   */
  met: boolean | null

  /**
   * 事件和失败数。
   */
  incidents: number
}

/**
 * 带总条数的一行。
 */
export type TotalRow = {
  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 带总条数的多行。
 */
export type TotalRows = TotalRow[]

/**
 * 额度的 Console 配置。
 */
export type BudgetNote = {
  /**
   * 通知阈值。
   */
  alerts: string

  /**
   * 适用范围。
   */
  scope: string
}

/**
 * 按额度名查 Console 配置。
 */
export type BudgetNoteTable = Record<string, BudgetNote>

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

// =========================================================================
// 2. 库原始行
// =========================================================================

/**
 * 此刻。
 */
export type NowDbRow = {
  /**
   * 库的 now()。
   */
  at: string
}

/**
 * 调度单元。
 */
export type UnitDbRow = {
  /**
   * 单元名。
   */
  name: string

  /**
   * 节奏秒数。
   */
  interval_s: number

  /**
   * 状态。
   */
  state: string

  /**
   * 上一轮成败;没跑过是 null。
   */
  last_ok: boolean | null

  /**
   * 开跑多久了;没开跑过是 null。
   */
  run_s: number | null

  /**
   * 跑完多久了;没跑完过是 null。
   */
  ago_s: number | null

  /**
   * 距下一轮多久;不知道是 null。
   */
  due_s: number | null

  /**
   * 最后一次跑的时长;没有是 null。
   */
  last_dur_s: number | null

  /**
   * 开始时刻文字;没有是 null。
   */
  started_text: string | null

  /**
   * 最后一轮的报错;没有是 null。
   */
  error: string | null
}

/**
 * 运行历史。
 */
export type RunDbRow = {
  /**
   * 运行 ID。
   */
  id: string

  /**
   * 单元名。
   */
  name: string

  /**
   * 成败。
   */
  ok: boolean

  /**
   * 报错;成功是 null。
   */
  error: string | null

  /**
   * 时长。
   */
  dur_s: number

  /**
   * 开始时刻文字。
   */
  started_text: string

  /**
   * 结束时刻文字。
   */
  ended_text: string
}

/**
 * 队列四格的汇总行;没取到是 null。
 */
export type MaybeQueueStats = QueueStatsDbRow | null

/**
 * 队列四格的汇总行。
 */
export type QueueStatsDbRow = {
  /**
   * 待处理。
   */
  waiting: number

  /**
   * 处理中。
   */
  working: number

  /**
   * 今日完成。
   */
  done_today: number

  /**
   * 最久等待秒数;没有是 null。
   */
  oldest_s: number | null
}

/**
 * 待发投递。
 */
export type ApplyDbRow = {
  /**
   * 投递 id。
   */
  id: number

  /**
   * 状态。
   */
  status: string

  /**
   * 职位。
   */
  job_title: string | null

  /**
   * 公司。
   */
  company: string | null

  /**
   * 用户邮箱。
   */
  email: string | null

  /**
   * 等了多久。
   */
  age_s: number

  /**
   * 总条数。
   */
  total: number
}

/**
 * 已完成投递。
 */
export type ApplyDoneDbRow = {
  /**
   * 投递 id。
   */
  id: number

  /**
   * 状态。
   */
  status: string

  /**
   * 职位。
   */
  job_title: string | null

  /**
   * 公司。
   */
  company: string | null

  /**
   * 用户邮箱。
   */
  email: string | null

  /**
   * 完成时刻文字。
   */
  done_text: string

  /**
   * 总条数。
   */
  total: number
}

/**
 * 官网抓取。
 */
export type SiteDbRow = {
  /**
   * 池主键。
   */
  key: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 阶段。
   */
  stage: string

  /**
   * 点开次数。
   */
  open_count: number

  /**
   * 由头。
   */
  stage_note: string | null

  /**
   * 是否已有官网。
   */
  has_site: boolean

  /**
   * 是否人工核定。
   */
  curated: boolean

  /**
   * 是否还在雇主池。
   */
  in_pool: boolean

  /**
   * 等了多久;老数据没有是 null。
   */
  age_s: number | null

  /**
   * 总条数。
   */
  total: number
}

/**
 * 官网抓取历史。
 */
export type SiteDoneDbRow = {
  /**
   * 池主键。
   */
  key: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 阶段。
   */
  stage: string

  /**
   * 点开次数。
   */
  open_count: number

  /**
   * 由头。
   */
  stage_note: string | null

  /**
   * 完成时刻文字。
   */
  done_text: string

  /**
   * 总条数。
   */
  total: number
}

/**
 * 译名翻译。
 */
export type AliasDbRow = {
  /**
   * 池主键。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 被列出次数。
   */
  seen_count: number

  /**
   * 等了多久。
   */
  age_s: number

  /**
   * 总条数。
   */
  total: number
}

/**
 * 译名翻译历史。
 */
export type AliasDoneDbRow = {
  /**
   * 池主键。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 状态。
   */
  status: string

  /**
   * 被列出次数。
   */
  seen_count: number

  /**
   * 完成时刻文字。
   */
  done_text: string

  /**
   * 总条数。
   */
  total: number
}

/**
 * 用量一行。
 */
export type UsageDbRow = {
  /**
   * 功能。
   */
  feature: string

  /**
   * 模型。
   */
  model: string

  /**
   * 通道。
   */
  channel: string

  /**
   * 输入 token;上游没报是 null。
   */
  input_tokens: number | null

  /**
   * 输出 token;上游没报是 null。
   */
  output_tokens: number | null

  /**
   * 缓存读取;上游没报是 null。
   */
  cache_read: number | null

  /**
   * 请求数。
   */
  requests: number
}

/**
 * 成本一行。
 */
export type CostDbRow = {
  /**
   * 日期。
   */
  day: string

  /**
   * 功能。
   */
  feature: string

  /**
   * 模型。
   */
  model: string

  /**
   * 成本。
   */
  cost: number

  /**
   * 请求数。
   */
  requests: number
}

/**
 * 成本四格的汇总行。
 */
export type CostStatsDbRow = {
  /**
   * 30 天合计。
   */
  total: number

  /**
   * 今天。
   */
  today: number
}

/**
 * 额度一行。
 */
export type BudgetDbRow = {
  /**
   * 额度名。
   */
  name: string

  /**
   * 上限。
   */
  limit_usd: number

  /**
   * 已用。
   */
  used_usd: number

  /**
   * 发放日。
   */
  starts_text: string

  /**
   * 到期日。
   */
  expires_text: string

  /**
   * 是否正在生效。
   */
  live: boolean

  /**
   * 距到期天数。
   */
  days_left: number
}

// =========================================================================
// 3. 删除
// =========================================================================
