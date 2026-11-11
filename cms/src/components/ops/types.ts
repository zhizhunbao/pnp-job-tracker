/**
 * ops 组件域的形状:各小件的 props 与删除确认机。线格式归 lib/ops。
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
    main: OpsText

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
   * 灰字条数。
   */
  count: OpsText

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
  value: OpsText

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
   * 取数时刻。
   */
  updatedAt: string
}

/**
 * OpsCellView 的 props。
 */
export type OpsCellViewIn = {
  /**
   * 这个单元格。
   */
  cell: OpsCell

  /**
   * 取词。
   */
  t: TFn
}

/**
 * CopyError 的 props。
 */
export type CopyErrorIn = {
  /**
   * 要复制的报错全文。
   */
  text: string
}

/**
 * OpsTags 的 props。
 */
export type OpsTagsIn = {
  /**
   * 胶囊。
   */
  tags: OpsTag[]
}

/**
 * 单元格渲染件。
 */
export type OpsCellFn = (props: OpsCellViewIn) => React.ReactNode

/**
 * opsColsOf 的入参。
 */
export type OpsColsIn = {
  /**
   * 这张表。
   */
  table: OpsTable

  /**
   * 单元格渲染件。由 tsx 递进来,本文件不引组件,免得成环。
   */
  Cell: OpsCellFn

  /**
   * 取词。
   */
  t: TFn
}

/**
 * makeOpsCell 的入参。
 */
export type OpsCellMakeIn = {
  /**
   * 列序号。
   */
  index: number

  /**
   * 单元格渲染件。
   */
  Cell: OpsCellFn

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 通用 Table 的一列。
 */
export type OpsTableCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 列头。
   */
  label: string

  /**
   * 取值。
   */
  render: (r: OpsRow) => React.ReactNode

  /**
   * 不折行。
   */
  nowrap?: boolean

  /**
   * 列类名。
   */
  className?: string
}

/**
 * 三个分类的图标。
 */
export type OpsNavIcons = {
  /**
   * 总览。
   */
  report: React.ReactNode

  /**
   * 调度。
   */
  schedule: React.ReactNode

  /**
   * 队列。
   */
  queue: React.ReactNode

  /**
   * 费用。
   */
  fee: React.ReactNode

  /**
   * 事件。
   */
  incident: React.ReactNode

  /**
   * 数据新鲜度。
   */
  fresh: React.ReactNode

  /**
   * AI 通道。
   */
  channel: React.ReactNode

  /**
   * 访问。
   */
  access: React.ReactNode

  /**
   * 用户收藏。
   */
  saved: React.ReactNode
}

/**
 * 造一个不带子项的顶层项要的东西。
 */
export type OpsSoloIn = {
  /**
   * 页面 id。
   */
  sec: string

  /**
   * 图标。
   */
  icon: React.ReactNode
}

/**
 * 导航一项。
 */
export type OpsNavItem = {
  /**
   * 身份。
   */
  key: string

  /**
   * 文字。
   */
  label: string

  /**
   * 图标。
   */
  icon: React.ReactNode

  /**
   * 条数。
   */
  count: number

  /**
   * 跳转地址;类别是 null。
   */
  href: string | null

  /**
   * 子项。
   */
  subs: OpsNavItem[]
}

/**
 * useOpsPage 的入参。
 */
export type OpsPageIn = {
  /**
   * 总行数。
   */
  total: number

  /**
   * 每页几行。
   */
  size: number
}

/**
 * useOpsPage 的出参。
 */
export type OpsPageOut = {
  /**
   * 当前页,0 起。
   */
  page: number

  /**
   * 总页数。
   */
  max: number

  /**
   * 翻页手柄。
   */
  onPage: (p: number) => void
}

/**
 * OpsShell 的 props。
 */
export type OpsShellIn = {
  /**
   * 这一页的内容。
   */
  children: React.ReactNode
}

/**
 * OpsNav 的 props。
 */
export type OpsNavIn = {
  /**
   * 当前页。
   */
  value: string

  /**
   * 点了某一项。
   */
  onPick: (key: string) => void
}

/**
 * OpsView 的 props。
 */
export type OpsViewIn = {
  /**
   * 这一页的看板。
   */
  board: OpsBoard
}

/**
 * OpsTableCard 的 props。
 */
export type OpsTableCardIn = {
  /**
   * 这张表。
   */
  table: OpsTable
}

/**
 * OpsRowCard 的 props。
 */
export type OpsRowCardIn = {
  /**
   * 这一行。
   */
  row: OpsRow
}

/**
 * DelButton 的 props。
 */
export type DelButtonIn = {
  /**
   * 要删的那一条。
   */
  del: OpsDel
}

/**
 * 拨删除确认框。
 */
export type DelAskFn = (del: OpsDel | null) => void

/**
 * 删除确认机。
 */
export type OpsDelPanel = {
  /**
   * 等着确认的那一条。
   */
  ask: OpsDel | null

  /**
   * 拨框。
   */
  setAsk: DelAskFn

  /**
   * 上一次删除没成。
   */
  failed: boolean

  /**
   * 确认。
   */
  onOk: () => void

  /**
   * 取消。
   */
  onCancel: () => void
}

/**
 * makeDelOk 的入参。
 */
export type DelOkIn = {
  /**
   * 等着确认的那一条。
   */
  ask: OpsDel | null

  /**
   * 拨框。
   */
  setAsk: DelAskFn

  /**
   * 标失败。
   */
  setFailed: (v: boolean) => void

  /**
   * 重取服务端数据。
   */
  refresh: () => void
}

/**
 * makeDelOpen 的入参。
 */
export type DelOpenIn = {
  /**
   * 拨框手柄。
   */
  setAsk: DelAskFn | null

  /**
   * 要删的那一条。
   */
  del: OpsDel
}

/**
 * 设置 banner 更新时刻的手柄。
 */
export type SetUpdatedFn = (iso: string) => void

/**
 * 手机卡片要的几段。
 */
export type RowCardParts = {
  /**
   * 标题。
   */
  title: string

  /**
   * 其余文字。
   */
  note: string
}

/**
 * 分区条要显示的两段。
 */
export type PickText = {
  /**
   * 分类。
   */
  head: string

  /**
   * 子项。
   */
  sub: string
}

/**
 * 一个事件操作。
 */
export type OpsAct = {
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

/**
 * makeAlertAct 的入参。
 */
export type AlertActIn = {
  /**
   * 操作。
   */
  act: OpsAct

  /**
   * 重取。
   */
  refresh: () => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * AlertButton 的 props。
 */
export type AlertButtonIn = {
  /**
   * 操作。
   */
  act: OpsAct
}

/**
 * 取词函数(与 lib/i18n 的 TFn 同形:键加可选插值;types 自声明)。
 */
export type TFn = (key: string, vars?: OpsVars) => string

/**
 * sayOf 的入参。
 */
export type SayIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 数据原文或界面文字。
   */
  s: OpsText
}

/**
 * pickTextOf 的入参。
 */
export type PickIn = {
  /**
   * 当前页。
   */
  sec: string

  /**
   * 取词。
   */
  t: TFn
}

/**
 * navSayOf 的入参。
 */
export type NavSayIn = {
  /**
   * 文字还是词条键的导航项。
   */
  items: OpsNavItem[]

  /**
   * 取词。
   */
  t: TFn
}

/**
 * cardsSayOf 的入参。
 */
export type CardsSayIn = {
  /**
   * 四格。
   */
  cards: OpsCard[]

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 取词后的一格数字。
 */
export type OpsCardView = {
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
 * rowCardPartsOf 的入参。
 */
export type RowPartsIn = {
  /**
   * 这一行。
   */
  row: OpsRow

  /**
   * 取词。
   */
  t: TFn
}

/**
 * makeCopyError 的入参。
 */
export type CopyMakeIn = {
  /**
   * 报错全文。
   */
  text: string

  /**
   * 取词。
   */
  t: TFn
}
