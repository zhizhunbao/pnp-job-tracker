/**
 * inbox 组件桶的形状:/api/inbox 的线格式(本站接口每格都发,写必填)、整机面板与各件 props。形状本桶自声明。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 本人回出去的一封。
 */
export type InboxReply = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 正文。
   */
  text: string

  /**
   * 发出的时刻(ISO)。
   */
  at: string
}

/**
 * 收到的一封。
 */
export type InboxItem = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 挂的投递(「打开这次投递」);没有给 null。
   */
  appId: number | null

  /**
   * 发件地址。
   */
  fromAddr: string

  /**
   * 发件人名(没有给空串)。
   */
  fromName: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文。
   */
  text: string

  /**
   * 收到的时刻(ISO)。
   */
  at: string

  /**
   * 读过了。
   */
  read: boolean

  /**
   * 相关职位名(没有给空串)。
   */
  jobTitle: string

  /**
   * 本人回出去的(先发的在前)。
   */
  replies: InboxReply[]
}

/**
 * GET /api/inbox 的回包(收件箱整份)。
 */
export type InboxView = {
  /**
   * 专属投递邮箱(收件箱没开通给空串)。
   */
  address: string

  /**
   * 同时转到账户邮箱。
   */
  forward: boolean

  /**
   * 账户邮箱。
   */
  account: string

  /**
   * 收到的信(新的在前)。
   */
  items: InboxItem[]
}

/**
 * Inbox(整节)的 props。
 */
export type InboxIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 收件箱整机的面板。
 */
export type InboxPanel = {
  /**
   * 收件箱(还没拉回来 = null)。
   */
  data: InboxView | null

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 窄屏(手机:只出清单,点一封弹阅读框)。
   */
  narrow: boolean

  /**
   * 阅读区那一封(网页端没点过默认第一封;手机没点 = null)。
   */
  cur: InboxItem | null

  /**
   * 造「点了某一封」。
   */
  pickOf: PickOfFn

  /**
   * 关手机阅读框。
   */
  onUnpick: () => void

  /**
   * 勾 / 不勾「同时转到」。
   */
  onForward: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 开「打开这次投递」(阅读区那一封挂的投递)。
   */
  onOpenApp: () => void

  /**
   * 回信框开着。
   */
  replying: boolean

  /**
   * 开回信框。
   */
  onReply: () => void

  /**
   * 关回信框。
   */
  onReplyClose: () => void

  /**
   * 回信正文。
   */
  replyText: string

  /**
   * 改回信正文。
   */
  onReplyText: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 发回信。
   */
  onReplySend: () => void

  /**
   * 正在发。
   */
  replyBusy: boolean

  /**
   * 回信没发出去那一句(没有给空串)。
   */
  replyNote: string
}

/**
 * 「点了某一封」的工厂(签名:信 id → 点击手柄)。
 */
export type PickOfFn = (id: number) => () => void

/**
 * 收件箱的落格两件(写整份、拨失败)。
 */
export type LoadInboxIn = {
  /**
   * 写整份。
   */
  setData: (v: InboxView) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * `makePickOf` 的入参。
 */
export type PickMakeIn = {
  /**
   * 当前整份。
   */
  data: InboxView | null

  /**
   * 写整份(读了那一封本地先标已读)。
   */
  setData: (v: InboxView) => void

  /**
   * 写选中的信。
   */
  setSel: (v: number | null) => void
}

/**
 * `withRead` 的入参。
 */
export type WithReadIn = {
  /**
   * 当前整份。
   */
  data: InboxView

  /**
   * 读了哪一封。
   */
  id: number
}

/**
 * `makeForward` 的入参。
 */
export type ForwardMakeIn = {
  /**
   * 当前整份。
   */
  data: InboxView | null

  /**
   * 写整份。
   */
  setData: (v: InboxView) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `forwardSavedOf` 的入参(2026-10-11 批 5)。
 */
export type ForwardSavedIn = {
  /**
   * 存上的开 / 关。
   */
  forward: boolean

  /**
   * 账户邮箱(开着时转到哪)。
   */
  account: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `withForward` 的入参。
 */
export type WithForwardIn = {
  /**
   * 当前整份。
   */
  data: InboxView

  /**
   * 开 / 关。
   */
  forward: boolean
}

/**
 * `curOf` 的入参。
 */
export type CurIn = {
  /**
   * 当前整份。
   */
  data: InboxView | null

  /**
   * 选中的信 id。
   */
  sel: number | null

  /**
   * 窄屏。
   */
  narrow: boolean
}

/**
 * `makeReplySend` 的入参。
 */
export type ReplySendIn = {
  /**
   * 回的是哪一封。
   */
  cur: InboxItem | null

  /**
   * 正文。
   */
  text: string

  /**
   * 当前整份。
   */
  data: InboxView | null

  /**
   * 写整份(发出去的挂到那一封下面)。
   */
  setData: (v: InboxView) => void

  /**
   * 拨正在发。
   */
  setBusy: (v: boolean) => void

  /**
   * 写没发出去那一句。
   */
  setNote: (v: string) => void

  /**
   * 拨回信框开关。
   */
  setOpen: (v: boolean) => void

  /**
   * 写回信正文。
   */
  setText: (v: string) => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 回信接口的回包。
 */
export type ReplyRespJson = {
  /**
   * 记进去的那一封(没记上给 null)。
   */
  reply: InboxReply | null
}

/**
 * `withReply` 的入参。
 */
export type WithReplyIn = {
  /**
   * 当前整份。
   */
  data: InboxView

  /**
   * 回的是哪一封。
   */
  id: number

  /**
   * 发出去的那一封。
   */
  reply: InboxReply
}

/**
 * `makeFlagSet` 的入参。
 */
export type FlagSetIn = {
  /**
   * 落格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么。
   */
  v: boolean
}

/**
 * `makeTextSet` 的入参。
 */
export type TextSetIn = {
  /**
   * 落格。
   */
  set: (v: string) => void
}

/**
 * `makeOpenApp` 的入参。
 */
export type OpenAppIn = {
  /**
   * 阅读区那一封。
   */
  cur: InboxItem | null

  /**
   * 开只读投递框(myjobs 桶的 openAppView;签名由那个桶定死)。
   */
  open: (appId: number) => void
}

/**
 * `makeUnpick` 的入参。
 */
export type UnpickIn = {
  /**
   * 写选中的信。
   */
  setSel: (v: number | null) => void
}

/**
 * 地址卡的 props。
 */
export type InboxAddrIn = {
  /**
   * 整机面板。
   */
  p: InboxPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 清单一行的 props。
 */
export type InboxRowIn = {
  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 选中。
   */
  on: boolean

  /**
   * 点了。
   */
  onClick: () => void

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 阅读区的 props(网页端右栏与手机阅读框共用)。
 */
export type InboxReadIn = {
  /**
   * 整机面板。
   */
  p: InboxPanel

  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 标题要不要画在阅读区里(手机阅读框的标题在窗口标题栏,不重复)。
   */
  withTitle: boolean
}

/**
 * 手机阅读框的 props。
 */
export type InboxModalIn = {
  /**
   * 整机面板。
   */
  p: InboxPanel

  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 回信请求体(postReply)。
 */
export type ReplyPostIn = {
  /**
   * 回的是哪一封。
   */
  id: number

  /**
   * 正文。
   */
  text: string
}

/**
 * `afterReply` 的入参。
 */
export type AfterReplyIn = {
  /**
   * 造手柄时的入参(各落格与取词函数)。
   */
  x: ReplySendIn

  /**
   * 回的是哪一封。
   */
  id: number

  /**
   * 响应(网络异常 = null)。
   */
  r: Response | null
}

/**
 * `subjectOf` 的入参。
 */
export type SubjectIn = {
  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 取词函数。
   */
  t: TFn
}
