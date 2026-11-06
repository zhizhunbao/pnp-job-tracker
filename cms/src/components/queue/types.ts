/**
 * queue 域(/queue 管理员队列页)的自足形状:四条查询各自的库原始行 → 事实行 → 展示行三段,
 * 整块看板、列声明与几个件的 props 契约。形状全由本域自己声明,不从别的域取(宪法 08-25「types 自声明」)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */

/**
 * 删除一条要的身份(服务端洗行时备好,随展示行下发;点删除钮时交给确认框)。
 */
export type DelSpec = {
  /**
   * 删哪种(unit / apply / site / alias)。
   */
  kind: string

  /**
   * 那一条的键(单元名 / 投递 id / 池主键)。
   */
  key: string

  /**
   * 确认框正文里显示的名字。
   */
  name: string
}

/**
 * 拨删除确认框的函数(null = 关)。
 */
export type DelAskFn = (v: DelSpec | null) => void

/**
 * 胶囊配色(与 tag 桶 TagVariant 同值,本页只用这五种)。
 */
export type QueueVariant = 'info' | 'gray' | 'warn' | 'bad' | 'ok'

/**
 * `SQL.QUEUE_UNITS` 回来的一行(秒数在库里按 now() 现算;int 列驱动按数交回)。
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
   * 状态(run / wait / llm)。
   */
  state: string

  /**
   * 上一轮成败;还没跑完过 = NULL。
   */
  last_ok: boolean | null

  /**
   * 开跑到现在几秒;没开跑过 = NULL。
   */
  run_s: number | null

  /**
   * 上一轮跑完到现在几秒;没跑完过 = NULL。
   */
  ago_s: number | null

  /**
   * 离下一轮还有几秒(负 = 已过点);没有 = NULL。
   */
  due_s: number | null
}

/**
 * 洗净的一行调度单元。
 */
export type UnitFact = {
  /**
   * 单元名。
   */
  name: string

  /**
   * 节奏秒数。
   */
  intervalS: number

  /**
   * 状态(run / wait / llm)。
   */
  state: string

  /**
   * 上一轮成败;还没跑完过 = null。
   */
  lastOk: boolean | null

  /**
   * 开跑到现在几秒;没开跑过 = null。
   */
  runS: number | null

  /**
   * 上一轮跑完到现在几秒;没跑完过 = null。
   */
  agoS: number | null

  /**
   * 离下一轮还有几秒(负 = 已过点);没有 = null。
   */
  dueS: number | null
}

/**
 * 调度单元卡的展示行。
 */
export type UnitRow = {
  /**
   * 行身份(= 单元名)。
   */
  key: string

  /**
   * 单元名。
   */
  name: string

  /**
   * 状态胶囊文字。
   */
  tagText: string

  /**
   * 状态胶囊配色。
   */
  tagVariant: QueueVariant

  /**
   * 第二枚胶囊(上轮失败);空串 = 不出。
   */
  warnText: string

  /**
   * 时间格(已跑多久 / 多久后 / 过点多久)。
   */
  whenText: string

  /**
   * 上一轮格(多久前跑完)。
   */
  lastText: string

  /**
   * 节奏格。
   */
  everyText: string
  /**
   * 删除这一条要的身份(种类、键、确认框里显示的名字)。
   */
  del: DelSpec
}

/**
 * `SQL.QUEUE_APPLY` 回来的一行。
 */
export type ApplyDbRow = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 状态(queued / sending)。
   */
  status: string

  /**
   * 职位名快照。
   */
  job_title: string | null

  /**
   * 公司名快照。
   */
  company: string | null

  /**
   * 用户邮箱;用户已删 = NULL。
   */
  email: string | null

  /**
   * 最后一次变动到现在几秒。
   */
  age_s: number

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 洗净的一行投递待发。
 */
export type ApplyFact = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 状态(queued / sending)。
   */
  status: string

  /**
   * 职位名;没有 = 空串。
   */
  jobTitle: string

  /**
   * 公司名;没有 = 空串。
   */
  company: string

  /**
   * 用户邮箱;没有 = 空串。
   */
  email: string

  /**
   * 最后一次变动到现在几秒。
   */
  ageS: number

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 投递待发卡的展示行。
 */
export type ApplyRow = {
  /**
   * 行身份(= 投递行 id)。
   */
  key: string

  /**
   * 用户邮箱。
   */
  email: string

  /**
   * 职位名。
   */
  jobTitle: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 状态胶囊文字。
   */
  tagText: string

  /**
   * 状态胶囊配色。
   */
  tagVariant: QueueVariant

  /**
   * 第二枚胶囊(卡住);空串 = 不出。
   */
  warnText: string

  /**
   * 等了多久。
   */
  ageText: string
  /**
   * 删除这一条要的身份(种类、键、确认框里显示的名字)。
   */
  del: DelSpec
}

/**
 * `SQL.QUEUE_SITES` 回来的一行。
 */
export type SiteDbRow = {
  /**
   * 雇主池主键。
   */
  key: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 阶段(queued / find / fetch / facts)。
   */
  stage: string

  /**
   * 被真人点开几次。
   */
  open_count: number

  /**
   * 这一步的由头;没有 = NULL。
   */
  stage_note: string | null

  /**
   * 公司表已有官网。
   */
  has_site: boolean

  /**
   * 人工核定过(两个工人都不取)。
   */
  curated: boolean

  /**
   * 雇主池里还有这家(出了池两个工人都取不到)。
   */
  in_pool: boolean

  /**
   * 最近一次点开到现在几秒;没有 = NULL。
   */
  age_s: number | null

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 洗净的一行官网抓取。
 */
export type SiteFact = {
  /**
   * 雇主池主键。
   */
  key: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 阶段(queued / find / fetch / facts)。
   */
  stage: string

  /**
   * 被真人点开几次。
   */
  openCount: number

  /**
   * 这一步的由头;没有 = 空串。
   */
  note: string

  /**
   * 公司表已有官网。
   */
  hasSite: boolean

  /**
   * 人工核定过。
   */
  curated: boolean

  /**
   * 雇主池里还有这家。
   */
  inPool: boolean

  /**
   * 最近一次点开到现在几秒;没有 = null。
   */
  ageS: number | null

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 官网抓取卡的展示行。
 */
export type SiteRow = {
  /**
   * 行身份(= 雇主池主键)。
   */
  key: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 阶段胶囊文字。
   */
  tagText: string

  /**
   * 阶段胶囊配色。
   */
  tagVariant: QueueVariant

  /**
   * 第二枚胶囊(已不在雇主板 / 已核定不取);空串 = 不出。
   */
  warnText: string

  /**
   * 归哪个工人。
   */
  workerText: string

  /**
   * 点开几次。
   */
  timesText: string

  /**
   * 等了多久。
   */
  ageText: string

  /**
   * 由头。
   */
  noteText: string
  /**
   * 删除这一条要的身份(种类、键、确认框里显示的名字)。
   */
  del: DelSpec
}

/**
 * `SQL.QUEUE_ALIAS` 回来的一行。
 */
export type AliasDbRow = {
  /**
   * 雇主池主键。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 被列出几次。
   */
  seen_count: number

  /**
   * 第一次被列出到现在几秒。
   */
  age_s: number

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 洗净的一行译名翻译。
 */
export type AliasFact = {
  /**
   * 雇主池主键。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 被列出几次。
   */
  seenCount: number

  /**
   * 第一次被列出到现在几秒。
   */
  ageS: number

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 译名翻译卡的展示行。
 */
export type AliasRow = {
  /**
   * 行身份(= 雇主池主键)。
   */
  key: string

  /**
   * 雇主名。
   */
  name: string

  /**
   * 被列出几次。
   */
  timesText: string

  /**
   * 等了多久。
   */
  ageText: string
  /**
   * 删除这一条要的身份(种类、键、确认框里显示的名字)。
   */
  del: DelSpec
}

/**
 * `SQL.QUEUE_RUNS` 回来的一行。
 */
export type RunDbRow = {
  /**
   * 历史行 id。
   */
  id: string | number

  /**
   * 单元名。
   */
  name: string

  /**
   * 这一轮成没成。
   */
  ok: boolean

  /**
   * 报错正文;成功 = NULL。
   */
  error: string | null

  /**
   * 这一轮用了几秒。
   */
  dur_s: number

  /**
   * 跑完到现在几秒。
   */
  ago_s: number
}

/**
 * 洗净的一轮历史。
 */
export type RunFact = {
  /**
   * 历史行 id。
   */
  id: string

  /**
   * 单元名。
   */
  name: string

  /**
   * 这一轮成没成。
   */
  ok: boolean

  /**
   * 报错正文;没有 = 空串。
   */
  error: string

  /**
   * 这一轮用了几秒。
   */
  durS: number

  /**
   * 跑完到现在几秒。
   */
  agoS: number
}

/**
 * 最近跑完卡的展示行。
 */
export type RunRow = {
  /**
   * 行身份(= 历史行 id)。
   */
  key: string

  /**
   * 单元名。
   */
  name: string

  /**
   * 结果胶囊文字。
   */
  tagText: string

  /**
   * 结果胶囊配色。
   */
  tagVariant: QueueVariant

  /**
   * 第二枚胶囊(本卡不用,恒空串;状态格与别的卡共用一只)。
   */
  warnText: string

  /**
   * 跑完(多久前)。
   */
  doneText: string

  /**
   * 用时。
   */
  durText: string

  /**
   * 报错正文(挂在这一行下面的跨列细行;空串 = 不挂)。
   */
  errorText: string
}

/**
 * `SQL.QUEUE_NOW` 回来的一行(pg 的 timestamptz 驱动交回 Date)。
 */
export type NowDbRow = {
  /**
   * 库的此刻。
   */
  at: Date
}

/**
 * toQueueBoard 的入参:四条查询与此刻各自洗好的事实行。
 */
export type QueueBoardIn = {
  /**
   * 调度单元。
   */
  units: UnitFact[]

  /**
   * 投递待发。
   */
  apply: ApplyFact[]

  /**
   * 官网抓取。
   */
  sites: SiteFact[]

  /**
   * 译名翻译。
   */
  alias: AliasFact[]

  /**
   * 最近跑完。
   */
  runs: RunFact[]

  /**
   * 此刻(ISO;查不成 = 空数组)。
   */
  now: string[]
}

/**
 * 整块看板(四张卡的展示行、卡头计数与右上角更新时刻)。
 */
export type QueueBoard = {
  /**
   * 调度单元。
   */
  units: UnitRow[]

  /**
   * 调度单元卡头计数。
   */
  unitsCount: string

  /**
   * 投递待发。
   */
  apply: ApplyRow[]

  /**
   * 投递待发卡头计数。
   */
  applyCount: string

  /**
   * 官网抓取。
   */
  sites: SiteRow[]

  /**
   * 官网抓取卡头计数。
   */
  sitesCount: string

  /**
   * 译名翻译。
   */
  alias: AliasRow[]

  /**
   * 译名翻译卡头计数。
   */
  aliasCount: string

  /**
   * 最近跑完。
   */
  runs: RunRow[]

  /**
   * 最近跑完卡头计数。
   */
  runsCount: string

  /**
   * 右上角更新时刻(ISO;空串 = 不渲)。
   */
  updatedAt: string
}

/**
 * countTextOf 的入参。
 */
export type CountTextIn = {
  /**
   * 列出来几条。
   */
  shown: number

  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 带总条数的事实行(totalOf 只读这一格)。
 */
export type TotalRow = {
  /**
   * 不截断的总条数。
   */
  total: number
}

/**
 * 带行身份的展示行(queueRowKeyOf 只读这一格)。
 */
export type KeyedRow = {
  /**
   * 行身份。
   */
  key: string
}

/**
 * 一列声明(只声明本页真用的格;结构上兜得住 table 域的 Col)。
 */
export type QueueCol<T> = {
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
  render: (r: T) => React.ReactNode

  /**
   * 单元格不换行;可省 = 允许折行。
   */
  nowrap?: boolean

  /**
   * 单元格额外类名(长串任意处可折行;可省 = 没有)。
   */
  className?: string
}

/**
 * 胶囊格要读的两枚胶囊(四种展示行都带这三格)。
 */
export type TagsCellRow = {
  /**
   * 第一枚胶囊文字。
   */
  tagText: string

  /**
   * 第一枚胶囊配色。
   */
  tagVariant: QueueVariant

  /**
   * 第二枚胶囊(红);空串 = 不出。
   */
  warnText: string
}

/**
 * Queue(整页正文)的 props。
 */
export type QueueIn = {
  /**
   * 服务端门洗好的整块看板。
   */
  board: QueueBoard
}

/**
 * QueueSection(一张分区白卡)的 props。
 */
export type QueueSectionIn = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 卡头灰字计数。
   */
  count: string

  /**
   * 卡内容(一张表)。
   */
  children: React.ReactNode
}

/**
 * 操作格渲染器(四张表共用一只:读展示行的 del 一格出删除钮)。
 */
export type ActRenderFn = (r: DelCellRow) => React.ReactNode

/**
 * 删除格要读的那一格(四种展示行都带)。
 */
export type DelCellRow = {
  /**
   * 删除这一条要的身份。
   */
  del: DelSpec
}

/**
 * DelButton(行内删除钮)的 props。
 */
export type DelButtonIn = {
  /**
   * 删除这一条要的身份。
   */
  del: DelSpec
}

/**
 * makeDelOpen 的入参。
 */
export type DelOpenIn = {
  /**
   * 拨确认框的函数(不在 Provider 下 = null,钮点了不响)。
   */
  setAsk: DelAskFn | null

  /**
   * 要删的那一条。
   */
  del: DelSpec
}

/**
 * makeDelOk 的入参。
 */
export type DelOkIn = {
  /**
   * 等着确认的那一条(没有 = null)。
   */
  ask: DelSpec | null

  /**
   * 拨确认框。
   */
  setAsk: DelAskFn

  /**
   * 拨「删除失败」那枚胶囊。
   */
  setFailed: (v: boolean) => void

  /**
   * 删完重取服务端数据(router.refresh)。
   */
  refresh: () => void
}

/**
 * 删除确认机(useQueueDel 出)。
 */
export type QueueDelPanel = {
  /**
   * 等着确认的那一条(没有 = null)。
   */
  ask: DelSpec | null

  /**
   * 拨确认框(经上下文下发给每颗删除钮)。
   */
  setAsk: DelAskFn

  /**
   * 上一次删除没成。
   */
  failed: boolean

  /**
   * 确认框「删除」。
   */
  onOk: () => void

  /**
   * 确认框「取消」。
   */
  onCancel: () => void
}
