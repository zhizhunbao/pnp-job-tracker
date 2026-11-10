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
   * 按职位改写的额度;null = 还没拉回来或拉失败(那一行不出)。
   */
  credit: MaybeSubCredit

  /**
   * 新岗推送的状态。
   */
  push: PushPanel
}

/**
 * 按职位改写的额度。
 */
export type SubCredit = {
  /**
   * 额度档(free / pro)。
   */
  plan: string

  /**
   * 还剩几个。
   */
  left: number

  /**
   * 一共几个。
   */
  max: number

  /**
   * 额度哪一刻恢复(ISO);免费额度没有恢复日。
   */
  resetAt: string | null
}

/**
 * 可能还没有的额度。
 */
export type MaybeSubCredit = SubCredit | null

/**
 * 额度接口的回包(信任边界:逐格可缺)。
 */
export type CreditRespJson = {
  /**
   * 额度档。
   */
  plan?: string

  /**
   * 还剩几个。
   */
  left?: number

  /**
   * 一共几个。
   */
  max?: number

  /**
   * 恢复时刻。
   */
  resetAt?: string | null
}

/**
 * `makeCreditLoad` 的入参。
 */
export type CreditLoadIn = {
  /**
   * 额度落格。
   */
  setCredit: (v: MaybeSubCredit) => void
}

/**
 * `creditTextOf` 的入参。
 */
export type CreditTextIn = {
  /**
   * 额度。
   */
  credit: SubCredit

  /**
   * 取词函数。
   */
  t: TFn
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
