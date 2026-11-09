/**
 * me 桶子桶 sub 的形状:「我的订阅」一页的状态机器、付款记录与新岗推送的接口回包、各件的 props(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 「我的订阅」状态机器(useSub)的入参。
 */
export type SubIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * Pro 到期日(ISO;/api/users/me 原样递进来,归一前形状);从没买过 = null 或压根没这一格。
   */
  until?: string | null
}

/**
 * 「我的订阅」状态机器的出参。
 */
export type SubPanel = {
  /**
   * 是 Pro(到期日在此刻之后)。
   */
  pro: boolean

  /**
   * 到期日(ISO;免费态为空串)。
   */
  until: string

  /**
   * 定价框开着没有。
   */
  open: boolean

  /**
   * 开定价框(「升级 Pro」/「续买」)。
   */
  onOpen: () => void

  /**
   * 关定价框。
   */
  onClose: () => void

  /**
   * 付款记录;null = 还没拉回来。
   */
  payments: PaymentRows | null

  /**
   * 付款记录拉失败了。
   */
  payFailed: boolean

  /**
   * 新岗推送的状态。
   */
  push: PushPanel

  /**
   * 提醒列表(2026-11-08)。
   */
  alerts: AlertsPanel
}

/**
 * 新岗推送的状态(useSub 里那一份)。
 */
export type PushPanel = {
  /**
   * 设置拉回来了没有。
   */
  ready: boolean

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 选中的频率(空串 = 不发;下拉的空值档就是它)。
   */
  freq: string

  /**
   * 改频率。
   */
  setFreq: (v: string) => void

  /**
   * 邮箱框里的字。
   */
  email: string

  /**
   * 改邮箱框。
   */
  setEmail: (v: string) => void

  /**
   * 贴在邮箱框下面的那一句(只剩「邮箱格式不对」;没有 = 空串)。
   */
  note: string

  /**
   * 正在存。
   */
  busy: boolean

  /**
   * 点「保存」。
   */
  onSave: () => void
}

/**
 * 本子桶各件的 props(页标题动作、正文、正文里的各段)。
 */
export type SubPartIn = {
  /**
   * 「我的订阅」状态。
   */
  s: SubPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 一张分区卡(SubSec)的 props。
 */
export type SubSecIn = {
  /**
   * 卡头标题。
   */
  title: string

  /**
   * 卡内容。
   */
  children: React.ReactNode
}

/**
 * proOf 的入参。
 */
export type ProOfIn = {
  /**
   * Pro 到期日(ISO);null = 从没买过。
   */
  until: string | null
}

/**
 * makeFlagSet 的入参(把一个布尔格拨成定值的小手柄:定价框的开 / 关)。
 */
export type FlagSetIn = {
  /**
   * 拨哪格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么。
   */
  v: boolean
}

/**
 * 一笔付款(/api/stripe/payments 的线格式;只声明真读的格)。
 */
export type PaymentRow = {
  /**
   * Checkout 会话 id(行身份)。
   */
  id: string

  /**
   * 付款时刻(ISO)。
   */
  paidAt: string

  /**
   * 买的天数。
   */
  days: number

  /**
   * 实付金额(元)。
   */
  amount: number

  /**
   * 货币码(小写)。
   */
  currency: string

  /**
   * Stripe 收据地址(没有 = 空串)。
   */
  receiptUrl: string
}

/**
 * 付款记录清单。
 */
export type PaymentRows = PaymentRow[]

/**
 * 付款记录接口的回包。
 */
export type PaymentsRespJson = {
  /**
   * 清单;缺席按零条读。
   */
  items?: PaymentRow[]
}

/**
 * `makePaymentsLoad` 的入参。
 */
export type PaymentsLoadIn = {
  /**
   * 清单落格。
   */
  setItems: (v: PaymentRows) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 付款记录的展示行(洗好的字;单元格只管摆)。
 */
export type PayCellRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 日期(年-月-日)。
   */
  date: string

  /**
   * 内容(「Pro 90 天」)。
   */
  item: string

  /**
   * 金额(「CA$14.69」)。
   */
  amount: string

  /**
   * 收据地址(空串 = 不出钮)。
   */
  receiptUrl: string

  /**
   * 「收据」的字。
   */
  receiptText: string
}

/**
 * `payCellRowsOf` 的入参。
 */
export type PayCellRowsIn = {
  /**
   * 清单。
   */
  items: PaymentRows

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 付款记录表的一列(交给 table 桶;只声明本桶用到的格)。
 */
export type PayCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染。
   */
  render: (r: PayCellRow) => React.ReactNode

  /**
   * 单元格不换行。
   */
  nowrap?: boolean
}

/**
 * 拉推送设置(makeLoadPush)的入参。
 */
export type LoadPushIn = {
  /**
   * 写频率。
   */
  setFreq: (v: string) => void

  /**
   * 写邮箱。
   */
  setEmail: (v: string) => void

  /**
   * 拨「拉回来了」。
   */
  setReady: (v: boolean) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 存推送设置(makeSavePush)的入参。
 */
export type SavePushIn = {
  /**
   * 频率(空串 = 不发)。
   */
  freq: string

  /**
   * 邮箱框里的字。
   */
  email: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 写那一句。
   */
  setNote: (v: string) => void

  /**
   * 拨「正在存」。
   */
  setBusy: (v: boolean) => void
}

/**
 * 存设置回包 → 右上角提示(pushToastOf)的入参。
 */
export type PushNoteIn = {
  /**
   * 回包。
   */
  d: PushSaveJson

  /**
   * HTTP 成没成。
   */
  ok: boolean

  /**
   * 填的邮箱。
   */
  email: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 推送设置(线格式)。
 */
export type PushPrefsJson = {
  /**
   * 频率:off / daily / weekly。
   */
  freq?: string

  /**
   * 实际收件邮箱。
   */
  email?: string

  /**
   * 待确认的新邮箱。
   */
  pending?: string
}

/**
 * 存推送设置的回包。
 */
export type PushSaveJson = {
  /**
   * saved / pending / mail。
   */
  result?: string

  /**
   * 错误码(body / email / auth)。
   */
  error?: string
}

/**
 * 推送频率下拉的选项字(makeFreqLabel 造的函数形)。
 */
export type FreqLabelFn = (v: string) => string

/**
 * 存设置后的那一句右上角提示(与 toast 桶的 ToastMsg 同形,本桶自声明)。
 */
export type PushToast = {
  /**
   * 哪一档。
   */
  kind: 'ok' | 'warn' | 'err'

  /**
   * 粗体那一行。
   */
  title: string

  /**
   * 灰字副行(空串 = 没有)。
   */
  detail: string
}

/**
 * 按筛选条件的一条提醒(洗净后)。
 */
export type AlertDoc = {
  /**
   * 提醒号。
   */
  id: string

  /**
   * 提醒名。
   */
  name: string

  /**
   * 这套筛选。
   */
  filters: Record<string, string | boolean>

  /**
   * 频率:off / daily / weekly。
   */
  freq: string
}

/**
 * /api/saved-searches 的一行(线格式,取值前收窄)。
 */
export type AlertDocJson = {
  /**
   * 提醒号。
   */
  id: number | string

  /**
   * 提醒名。
   */
  name?: string | null

  /**
   * 筛选。
   */
  filters?: Record<string, string | boolean> | null

  /**
   * 频率。
   */
  freq?: string | null
}

/**
 * /api/saved-searches 的回包。
 */
export type AlertsRespJson = {
  /**
   * 各行。
   */
  docs: AlertDocJson[]
}

/**
 * 菜单一项。
 */
export type AlertMenuItem = {
  /**
   * 身份。
   */
  key: string

  /**
   * 字。
   */
  text: string

  /**
   * 危险操作。
   */
  danger: boolean

  /**
   * 点击。
   */
  onClick: () => void
}

/**
 * 提醒表一行(展示)。
 */
export type AlertRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 提醒名。
   */
  name: string

  /**
   * 下拉的值;空串 = 不发。
   */
  freq: string

  /**
   * 选频率。
   */
  onFreq: (v: string) => void

  /**
   * 下拉选项的字。
   */
  labelOf: FreqLabelFn

  /**
   * 「不发」的字。
   */
  offText: string

  /**
   * 改条件的地址;空串 = 这一行不能改。
   */
  href: string

  /**
   * 「改条件」的字。
   */
  editText: string

  /**
   * 行末菜单。
   */
  menu: AlertMenuItem[]

  /**
   * 菜单钮的字。
   */
  more: string
}

/**
 * 提醒表一列。
 */
export type AlertCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 列头。
   */
  label: string

  /**
   * 单元格。
   */
  render: (r: AlertRow) => React.ReactNode
}

/**
 * 待确认的删除。
 */
export type AlertAsk = {
  /**
   * 提醒名。
   */
  name: string

  /**
   * 确认后跑。
   */
  run: () => void
}

/**
 * 提醒列表的状态。
 */
export type AlertsPanel = {
  /**
   * 窄屏。
   */
  narrow: boolean

  /**
   * 提醒清单拉失败。
   */
  failed: boolean

  /**
   * 各行(第一行恒为按档案推荐)。
   */
  rows: AlertRow[]

  /**
   * 待确认的删除;没有为 null。
   */
  ask: AlertAsk | null

  /**
   * 确认删除。
   */
  onAskOk: () => void

  /**
   * 取消删除。
   */
  onAskClose: () => void
}

/**
 * 拉提醒清单的入参。
 */
export type LoadAlertsIn = {
  /**
   * 落清单。
   */
  setDocs: (docs: AlertDoc[]) => void

  /**
   * 落失败。
   */
  setFailed: (v: boolean) => void
}

/**
 * 洗提醒表行的入参。
 */
export type AlertRowsIn = {
  /**
   * 提醒清单。
   */
  docs: AlertDoc[]

  /**
   * 按档案推荐那一行的频率(下拉的值)。
   */
  profileFreq: string

  /**
   * 选按档案推荐的频率。
   */
  onProfileFreq: (v: string) => void

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 落清单。
   */
  setDocs: (docs: AlertDoc[]) => void

  /**
   * 落待确认的删除。
   */
  setAsk: (a: AlertAsk | null) => void
}

/**
 * 改频率 / 删除一条的入参。
 */
export type AlertActIn = {
  /**
   * 这一条。
   */
  doc: AlertDoc

  /**
   * 全部清单。
   */
  docs: AlertDoc[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 落清单。
   */
  setDocs: (docs: AlertDoc[]) => void
}

/**
 * 确认手柄的入参。
 */
export type AlertAskOkIn = {
  /**
   * 待确认的删除。
   */
  ask: AlertAsk | null

  /**
   * 落待确认的删除。
   */
  setAsk: (a: AlertAsk | null) => void
}

/**
 * 按档案推荐选频率的入参。
 */
export type ProfileFreqIn = {
  /**
   * 收件邮箱。
   */
  email: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 落频率。
   */
  setFreq: (v: string) => void

  /**
   * 落提示。
   */
  setNote: (v: string) => void

  /**
   * 落忙。
   */
  setBusy: (v: boolean) => void
}

/**
 * AlertList 的 props。
 */
export type AlertListIn = {
  /**
   * 提醒列表。
   */
  a: AlertsPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * AlertItem 的 props。
 */
export type AlertItemIn = {
  /**
   * 这一行。
   */
  row: AlertRow
}

/**
 * 存一条提醒频率的入参。
 */
export type AlertFreqSendIn = {
  /**
   * 这一条的手柄入参。
   */
  x: AlertActIn

  /**
   * 新频率。
   */
  freq: string
}

/**
 * 造「点删除」的入参。
 */
export type AlertAskMakeIn = {
  /**
   * 待确认的删除。
   */
  ask: AlertAsk

  /**
   * 落待确认的删除。
   */
  setAsk: (a: AlertAsk | null) => void
}
