/**
 * ops 子桶 watch 的形状(子桶自声明)。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */
import type { Db } from '@/lib/db'

// =========================================================================
// 1. 看板
// =========================================================================

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
export type WatchTag = {
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
export type WatchCell =
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
    tags: WatchTag[]
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
 * 表的一行。
 */
export type WatchRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 与列对齐的单元格。
   */
  cells: WatchCell[]
}

/**
 * 一列。
 */
export type WatchCol = {
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
export type WatchTable = {
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
  cols: WatchCol[]

  /**
   * 行。
   */
  rows: WatchRow[]
}

/**
 * tableOf 的入参。
 */
export type WatchTableIn = {
  /**
   * 标题。
   */
  title: string

  /**
   * 列。
   */
  cols: WatchCol[]

  /**
   * 行。
   */
  rows: WatchRow[]
}

/**
 * 一页看板。
 */
export type WatchBoard = {
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
  tables: WatchTable[]

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
export type BoardOut = Promise<WatchBoard>

/**
 * 四格。
 */
export type BoardCards = WatchBoard['cards']

/**
 * 一串单元格。
 */
export type WatchCells = WatchCell[]

/**
 * 一串文字。
 */
export type TextList = string[]

// =========================================================================
// 2. 报警
// =========================================================================

/**
 * 一条规则的本轮结果。
 */
export type Signal = {
  /**
   * 规则 id。
   */
  rule: string

  /**
   * 是否触发。
   */
  firing: boolean

  /**
   * 条件明细。
   */
  condition: string
}

/**
 * 调度单元的原始行(只声明读的格)。
 */
export type UnitDbRow = {
  /**
   * 单元名。
   */
  name: string

  /**
   * 状态。
   */
  state: string

  /**
   * 上轮结果。
   */
  last_ok: boolean | null

  /**
   * 距下一轮秒数。
   */
  due_s: number | null
}

/**
 * 投递原始行(只声明读的格)。
 */
export type ApplyDbRow = {
  /**
   * 状态。
   */
  status: string

  /**
   * 已等秒数。
   */
  age_s: number
}

/**
 * 额度原始行(只声明读的格)。
 */
export type BudgetDbRow = {
  /**
   * 已用。
   */
  used_usd: number

  /**
   * 上限。
   */
  limit_usd: number

  /**
   * 是否生效。
   */
  live: boolean
}

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
 * 计数行。
 */
export type CountRows = CountDbRow[]

/**
 * 全部规则这一轮的结果。
 */
export type Signals = Signal[]

/**
 * 判定规则要的全部事实。
 */
export type SignalFacts = {
  /**
   * 生效额度已用金额。
   */
  usedUsd: number

  /**
   * 上一轮以来的降级数。
   */
  degraded: number

  /**
   * 各通道探活。
   */
  probes: ProbeStatDbRow[]

  /**
   * 调度单元。
   */
  units: UnitDbRow[]

  /**
   * 卡住的投递数。
   */
  stuck: number

  /**
   * 超过警告线的数据集名。
   */
  staleSets: string[]
}

/**
 * channelSignalOf 的入参。
 */
export type ChannelSignalIn = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 探活汇总。
   */
  stats: ProbeStatDbRow[]
}

/**
 * unitNamesOf 的入参。
 */
export type UnitNamesIn = {
  /**
   * 单元。
   */
  units: UnitDbRow[]

  /**
   * 谓词。
   */
  test: (u: UnitDbRow) => boolean
}

/**
 * goldenCardsOf 的入参。
 */
export type GoldenIn = {
  /**
   * 探活汇总。
   */
  probes: ProbeStatDbRow[]

  /**
   * 流量。
   */
  traffic: TrafficDbRow[]

  /**
   * 饱和度文字。
   */
  saturation: string
}

/**
 * loadFacts 的出参。
 */
export type SignalFactsOut = Promise<SignalFacts>

/**
 * 条件明细的入参。
 */
export type CondIn = {
  /**
   * 规则 id。
   */
  rule: string

  /**
   * 明细名字。
   */
  names: string[]
}

/**
 * 发通知的函数。
 */
export type NotifyFn = (signal: Signal) => Promise<void>

/**
 * 发一封信的函数(上层注入)。
 */
export type SendFn = (mail: SendMail) => Promise<boolean>

/**
 * 一封信。
 */
export type SendMail = {
  /**
   * 收件人。
   */
  to: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文。
   */
  html: string
}

/**
 * makeMailNotify 的入参。
 */
export type MailNotifyIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 发信函数。
   */
  send: SendFn
}

/**
 * 管理员邮箱原始行。
 */
export type AdminDbRow = {
  /**
   * 邮箱。
   */
  email: string
}

/**
 * runRules 的入参。
 */
export type RunRulesIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 新触发时的通知。
   */
  notify: NotifyFn
}

/**
 * runRules 的出参:新触发了几条。
 */
export type RunRulesOut = Promise<number>

/**
 * fireOne 的入参。
 */
export type FireOneIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 这条规则。
   */
  signal: Signal

  /**
   * 通知。
   */
  notify: NotifyFn
}

/**
 * fireOne 的出参:是否新触发。
 */
export type FireOneOut = Promise<boolean>

/**
 * 事件原始行。
 */
export type AlertDbRow = {
  /**
   * id。
   */
  id: number

  /**
   * 规则 id。
   */
  rule: string

  /**
   * 条件。
   */
  condition: string

  /**
   * 用户响应。
   */
  user_state: string

  /**
   * 发生时刻。
   */
  fired_text: string

  /**
   * 恢复时刻。
   */
  resolved_text: string | null

  /**
   * 根因。
   */
  cause: string | null

  /**
   * 对策。
   */
  action: string | null

  /**
   * 总条数。
   */
  total: number
}

/**
 * 洗净的事件操作。
 */
export type AlertActFact = {
  /**
   * 事件 id。
   */
  id: number

  /**
   * 改成哪个用户响应。
   */
  state: string
}

/**
 * 可能为空的事件操作。
 */
export type MaybeAlertAct = AlertActFact | null

/**
 * 事件操作的线格式。
 */
export type AlertActJson = {
  /**
   * 事件 id。
   */
  id?: number

  /**
   * 用户响应。
   */
  state?: string
}

/**
 * setAlertState 的入参。
 */
export type SetAlertIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 操作。
   */
  act: AlertActFact
}

/**
 * setAlertState 的出参:动了几行。
 */
export type SetAlertOut = Promise<number>

/**
 * 找不到时也能显示的规则。
 */
export type RuleInfo = {
  /**
   * 规则 id。
   */
  id: string

  /**
   * 规则名。
   */
  name: string

  /**
   * 监控对象。
   */
  target: string

  /**
   * 信号。
   */
  signal: string

  /**
   * 条件。
   */
  condition: string

  /**
   * 业务影响。
   */
  impact: string
}

// =========================================================================
// 3. 数据新鲜度
// =========================================================================

/**
 * 数据集原始行。
 */
export type FreshDbRow = {
  /**
   * 单元名。
   */
  name: string

  /**
   * 最新成功时刻。
   */
  last_text: string | null

  /**
   * 距今秒数。
   */
  age_s: number | null
}

/**
 * 数据集原始行的集合。
 */
export type FreshRows = FreshDbRow[]

/**
 * 洗净的数据集。
 */
export type FreshFact = {
  /**
   * 数据集名。
   */
  name: string

  /**
   * 最新数据时间。
   */
  lastText: string

  /**
   * 警告线(秒)。
   */
  lineS: number

  /**
   * 是否超过警告线。
   */
  stale: boolean
}

// =========================================================================
// 4. 通道
// =========================================================================

/**
 * 一次探活。
 */
export type ProbeFact = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 是否可用。
   */
  ok: boolean

  /**
   * 耗时;没测到是 null。
   */
  ms: number | null

  /**
   * 失败原因;成功是 null。
   */
  error: string | null
}

/**
 * 可能为空的探活。
 */
export type MaybeProbe = ProbeFact | null

/**
 * 调度器报来的 Ollama 探活(线格式)。
 */
export type TickJson = {
  /**
   * Ollama 探活。
   */
  ollama?: {
    /**
     * 是否可用。
     */
    ok?: boolean

    /**
     * 耗时。
     */
    ms?: number | null

    /**
     * 失败原因。
     */
    error?: string | null
  }
}

/**
 * saveProbes 的入参。
 */
export type SaveProbesIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 这一轮的探活。
   */
  probes: ProbeFact[]
}

/**
 * 只写库的出参。
 */
export type WriteOut = Promise<void>

/**
 * 探活汇总原始行。
 */
export type ProbeStatDbRow = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 最近一次结果。
   */
  ok: boolean

  /**
   * 最近一次耗时。
   */
  ms: number | null

  /**
   * 最近一次失败原因。
   */
  error: string | null

  /**
   * 24 小时探活次数。
   */
  n: number

  /**
   * 24 小时成功次数。
   */
  n_ok: number
}

/**
 * 可能为空的探活汇总。
 */
export type MaybeProbeStat = ProbeStatDbRow | null

/**
 * 流量原始行。
 */
export type TrafficDbRow = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 请求数。
   */
  requests: number

  /**
   * 失败数。
   */
  errors: number
}

/**
 * 可能为空的流量。
 */
export type MaybeTraffic = TrafficDbRow | null

/**
 * trafficFor 的入参。
 */
export type TrafficForIn = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 全部流量。
   */
  rows: TrafficDbRow[]
}

/**
 * 通道一行的入参。
 */
export type ChannelRowIn = {
  /**
   * 通道代码。
   */
  channel: string

  /**
   * 探活汇总。
   */
  probe: ProbeStatDbRow | null

  /**
   * 流量。
   */
  traffic: TrafficDbRow | null

  /**
   * 饱和度文字。
   */
  saturation: string
}

/**
 * 百分比的入参。
 */
export type RatioIn = {
  /**
   * 分子。
   */
  part: number

  /**
   * 分母。
   */
  whole: number
}

/**
 * ruleTextOf 的入参。
 */
export type RuleTextIn = {
  /**
   * 规则号。
   */
  rule: string

  /**
   * 哪一格(RULE_PART 的值)。
   */
  part: string
}
