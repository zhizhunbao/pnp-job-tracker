/**
 * funnel 域(/funnel 转化漏斗内部看板)的自足形状:库原始行 → 事实行 → 展示行三段,
 * 加上列声明与三个件的 props 契约。
 * 形状全由本域自己声明,不从别的域取(宪法 08-25「types 自声明」)—— 列声明 FunnelCol
 * 只声明本表真用的那几格,结构上兜得住 table 域的 Col。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */

/**
 * `SQL.FUNNEL_EVENTS` 回来的那一行(按天计数的原始行)。计数列在 pg 里是 bigint,
 * 驱动回来可能是串,所以逐格过词汇表;prop 是可空的维度串。
 * 2026-08-27 lint 还账批把原来的 `any` 换成本形状,取值表达式一个字没动。
 */
export type FunnelEventDbRow = {
  /**
   * 埋点名(与 lib/funnel 的 FUNNEL_STEPS 同一套键)。
   */
  event: string

  /**
   * 维度串(入口/定价来路;没有维度是 NULL)。
   */
  prop: string | null

  /**
   * 近 30 天计数。
   */
  d30: string | number | null

  /**
   * 近 7 天计数。
   */
  d7: string | number | null

  /**
   * 近 1 天计数。
   */
  d1: string | number | null
}

/**
 * `SQL.FUNNEL_USERS` 回来的那一行(真实付费两个数)。
 */
export type FunnelPayDbRow = {
  /**
   * proUntil 有值的用户数(含人工赠送)。
   */
  pro: string | number | null

  /**
   * 有 Stripe 会话记录的用户数(真走过 Checkout 的)。
   */
  stripe: string | number | null
}

/**
 * 洗净的一行埋点计数(空值决策已在行构造器里做完,消费端直接用)。
 */
export type FunnelEventFact = {
  /**
   * 埋点名。
   */
  event: string

  /**
   * 维度串;没有维度是空串。
   */
  prop: string

  /**
   * 近 30 天计数。
   */
  d30: number

  /**
   * 近 7 天计数。
   */
  d7: number

  /**
   * 近 1 天计数。
   */
  d1: number
}

/**
 * 洗净的真实付费两个数。两个数分开摆:proUntil 有值的(含人工赠送)与真走过 Checkout 的
 * —— 手工开的 Pro 不能冒充收款。信号用 stripe_sessions(webhook 拨 proUntil 时写的
 * session id),**不用 stripe_customer_id**:2026-08-01 实核 92 个用户里那一列一个都没有,
 * 拿它当付费信号会永远显示 0 = 假数。
 */
export type FunnelPayFact = {
  /**
   * proUntil 有值的用户数。
   */
  pro: number

  /**
   * 其中真走过 Checkout 的用户数。
   */
  stripe: number
}

/**
 * 漏斗表的一行展示行(数字与转化率都已洗成字,单元格只管摆出来)。
 */
export type FunnelCellRow = {
  /**
   * 行身份(= 埋点名)。
   */
  key: string

  /**
   * 步骤显示名;表里没起名的步骤照原样出埋点名。
   */
  label: string

  /**
   * 近 30 天计数的显示串。
   */
  d30Text: string

  /**
   * 近 7 天计数的显示串。
   */
  d7Text: string

  /**
   * 昨天计数的显示串。
   */
  d1Text: string

  /**
   * 相邻转化率的显示串;这一步不给转化率时是横杠。
   */
  rateText: string
}

/**
 * 尾行「⑥ 真实付费」的展示行。
 */
export type FunnelPayCellRow = {
  /**
   * proUntil 有值的人数(显示串)。
   */
  proText: string

  /**
   * 括在「其中走过 Checkout 的 N 人」里的整句说明。
   */
  noteText: string
}

/**
 * 分组行(按入口 / 按来路)里的一条展示行。
 */
export type FunnelPropCellRow = {
  /**
   * 条目身份(= 维度串)。
   */
  key: string

  /**
   * 「维度串 次数」整条已拼好的显示串。
   */
  text: string
}

/**
 * 整块看板的展示数据(服务端门洗好,视图件零业务逻辑)。
 */
export type FunnelBoard = {
  /**
   * 漏斗表的行。
   */
  rows: FunnelCellRow[]

  /**
   * 尾行的真实付费两个数。
   */
  pay: FunnelPayCellRow

  /**
   * 锁区曝光按入口分组;一条都没有就不渲那一行。
   */
  byEntry: FunnelPropCellRow[]

  /**
   * 打开定价按来路分组;一条都没有就不渲那一行。
   */
  byPricing: FunnelPropCellRow[]

  /**
   * 30 天一条计数都没有(表刚建好,或事件还没打到生产)。
   */
  empty: boolean
}

/**
 * 漏斗表的单元格渲染器(纯文本列直接给取值函数,不为一列造一个组件)。
 */
export type FunnelCellFn = (r: FunnelCellRow) => React.ReactNode

/**
 * 漏斗表的一列声明(只声明本表真用的那几格;结构上兜得住 table 域的 Col)。
 */
export type FunnelCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染器。
   */
  render: FunnelCellFn

  /**
   * 单元格不换行;可省 = 允许折行。
   */
  nowrap?: boolean

  /**
   * 数字列右对齐;可省 = 左对齐。
   */
  align?: 'right'

  /**
   * 列级类(整列同一个视觉形态时用它,省掉一枚只为套色的单元格组件);可省 = 不加类。
   */
  className?: string
}

/**
 * `toFunnelBoard` 的入参:两条查询各自洗好的事实行。
 */
export type FunnelBoardIn = {
  /**
   * 按天计数的事实行(每个埋点 × 每个维度一行)。
   */
  events: FunnelEventFact[]

  /**
   * 真实付费的事实行;查不到时是空清单(表还没建 → 空页面照常渲染)。
   */
  pays: FunnelPayFact[]
}

/**
 * `toFunnelPropRows` 的入参:从哪个埋点分组。
 */
export type FunnelPropRowsIn = {
  /**
   * 按天计数的事实行。
   */
  events: FunnelEventFact[]

  /**
   * 要分组的埋点名。
   */
  event: string
}

/**
 * `stepCountsOf` 的入参。
 */
export type StepCountsIn = {
  /**
   * 按天计数的事实行。
   */
  events: FunnelEventFact[]
}

/**
 * `sumStepOf` 的入参:某一步在某个时间窗上的合计。
 */
export type SumStepIn = {
  /**
   * 按天计数的事实行。
   */
  events: FunnelEventFact[]

  /**
   * 要合计的埋点名。
   */
  event: string

  /**
   * 时间窗(哪一列)。
   */
  window: FunnelWindow
}

/**
 * 计数的三个时间窗(与 SQL 的三列同名)。
 */
export type FunnelWindow = 'd30' | 'd7' | 'd1'

/**
 * 各步 → 近 30 天计数(喂给 lib/funnel 的转化率函数)。
 */
export type StepCounts = Record<string, number>

/**
 * 相邻转化率表:步骤名 → 该步相对上一步的转化率;这一步不给转化率时是 null。
 */
export type RateMap = Map<string, number | null>

/**
 * `rateTextOf` 的入参。
 */
export type RateTextIn = {
  /**
   * 三条并行链各自算好的相邻转化率。
   */
  chainRate: RateMap

  /**
   * 旧形态那条链的相邻转化率(按 LEGACY_STEPS 的顺序)。
   */
  legacyRates: (number | null)[]

  /**
   * 这一步的埋点名。
   */
  event: string

  /**
   * 这一步在 FUNNEL_STEPS 里的序号。
   */
  index: number
}

/**
 * `chainRateOf` 的入参。
 */
export type ChainRateIn = {
  /**
   * 各步近 30 天计数。
   */
  counts: StepCounts
}

/**
 * 一条链上某一步的相邻转化率。
 */
export type RateEntry = {
  /**
   * 这一步的埋点名。
   */
  step: string

  /**
   * 相对上一步的转化率;分母为 0 时是 null。
   */
  rate: number | null
}

/**
 * `chainEntriesOf` 的入参:一条链的步骤序列与它算好的相邻转化率。
 */
export type ChainEntriesIn = {
  /**
   * 链的步骤序列(第一步没有「上一步」,不产条目)。
   */
  steps: readonly string[]

  /**
   * 相邻转化率(比步骤序列少一格)。
   */
  rates: (number | null)[]
}

/**
 * `propLineClsOf` 的入参。
 */
export type PropLineClsIn = {
  /**
   * 紧跟在另一条分组行下面(间距收窄)。
   */
  tight: boolean
}

/**
 * Funnel(看板正文)的 props。
 * 旁边原有返回钮的两格形状(GoBackFn 点击手柄 / GoBackIn 无历史可回时的落点),
 * 2026-09-03 撤编:Frank「所有主页面都不应该有返回按钮」。
 */
export type FunnelIn = {
  /**
   * 服务端门洗好的整块看板数据。
   */
  board: FunnelBoard

  /**
   * 数据更新时刻(ETL 心跳 checkedAt 的 ISO;'' = 还没拿到,不渲)。
   */
  updatedAt: string
}

/**
 * FunnelPayRow(尾行「⑥ 真实付费」)的 props。
 */
export type FunnelPayRowIn = {
  /**
   * 尾行的两个数。
   */
  pay: FunnelPayCellRow
}

/**
 * FunnelPropLine(一条分组行)的 props。
 */
export type FunnelPropLineIn = {
  /**
   * 行首的引子(说清这一行按什么分组)。
   */
  head: string

  /**
   * 分组条目(已按 30 天次数从多到少排好)。
   */
  items: FunnelPropCellRow[]

  /**
   * 紧跟在另一条分组行下面(间距收窄);可省 = 自己是第一条。
   */
  tight?: boolean
}
