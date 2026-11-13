/**
 * me 桶子桶 inbox 的形状:收件箱接口回包与各行为函数的契约(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 我在站内回过的一封。
 */
export type InboxReply = {
  /**
   * 回信号。
   */
  id: number

  /**
   * 正文。
   */
  text: string

  /**
   * 发出时刻(ISO)。
   */
  at: string
}

/**
 * 收件箱里的一封雇主来信。
 */
export type InboxItem = {
  /**
   * 信号。
   */
  id: number

  /**
   * 对上的那次投递;对不上为 null。
   */
  appId: number | null

  /**
   * 发件地址。
   */
  fromAddr: string

  /**
   * 发件人名字;信头没给为空串。
   */
  fromName: string

  /**
   * 主题;没写为空串。
   */
  subject: string

  /**
   * 正文。
   */
  text: string

  /**
   * 收到时刻(ISO)。
   */
  at: string

  /**
   * 读过没有。
   */
  read: boolean

  /**
   * 对上的投递的职位名;对不上为空串。
   */
  jobTitle: string

  /**
   * 我回过的几封,先后排。
   */
  replies: InboxReply[]
}

/**
 * 收件箱接口回包。
 */
export type InboxView = {
  /**
   * 我的专属投递邮箱。
   */
  address: string

  /**
   * 雇主回信同时转到账户邮箱没有。
   */
  forward: boolean

  /**
   * 账户邮箱。
   */
  account: string

  /**
   * 来信,新的在前。
   */
  items: InboxItem[]
}

/**
 * 回信接口回包。
 */
export type ReplyRespJson = {
  /**
   * 存下的那封;没存成为 null。
   */
  reply: InboxReply | null
}

/**
 * 点某封信的手柄工厂。
 */
export type PickOfFn = (id: number) => () => void

/**
 * 拉收件箱的入参。
 */
export type LoadInboxIn = {
  /**
   * 落回包。
   */
  setData: (v: InboxView) => void

  /**
   * 落「拉失败」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 当前打开哪一封的取法入参。
 */
export type CurIn = {
  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 点过的信号;没点为 null。
   */
  sel: number | null

  /**
   * 窄屏(窄屏没点就不默认打开第一封)。
   */
  narrow: boolean
}

/**
 * 点信手柄工厂的入参。
 */
export type PickMakeIn = {
  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 换回包(标已读)。
   */
  setData: (v: InboxView) => void

  /**
   * 换当前那封。
   */
  setSel: (v: number | null) => void

  /**
   * 现在显示着的那封的信号(没有为 null;2026-11-13:换到别的信才清回信草稿)。
   */
  curId: number | null

  /**
   * 清回信草稿并收起回信框(换到别的信时调)。
   */
  resetDraft: () => void
}

/**
 * 清回信草稿手柄(makeDraftReset)的入参。
 */
export type DraftResetIn = {
  /**
   * 回信框开没开。
   */
  setOpen: (v: boolean) => void

  /**
   * 换草稿。
   */
  setText: (v: string) => void

  /**
   * 换发信失败的那句说明。
   */
  setNote: (v: string) => void
}

/**
 * 标已读后的回包入参。
 */
export type WithReadIn = {
  /**
   * 原回包。
   */
  data: InboxView

  /**
   * 读了的那封。
   */
  id: number
}

/**
 * 关掉当前那封的入参。
 */
export type UnpickIn = {
  /**
   * 换当前那封。
   */
  setSel: (v: number | null) => void
}

/**
 * 打开对上的那次投递的入参。
 */
export type OpenAppIn = {
  /**
   * 当前那封。
   */
  cur: InboxItem | null

  /**
   * 打开投递记录框(由父桶注入:我的求职那一块的投递记录框)。
   */
  open: (appId: number) => void
}

/**
 * 转发开关手柄工厂的入参。
 */
export type ForwardMakeIn = {
  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 换回包(先改后存,存失败改回)。
   */
  setData: (v: InboxView) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 转发开关存好后那句提示的入参。
 */
export type ForwardSavedIn = {
  /**
   * 开还是关。
   */
  forward: boolean

  /**
   * 账户邮箱。
   */
  account: string

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 改转发开关后的回包入参。
 */
export type WithForwardIn = {
  /**
   * 原回包。
   */
  data: InboxView

  /**
   * 新的开关值。
   */
  forward: boolean
}

/**
 * 发回信手柄工厂的入参。
 */
export type ReplySendIn = {
  /**
   * 当前那封。
   */
  cur: InboxItem | null

  /**
   * 要发的字。
   */
  text: string

  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 换回包(发出后把回信挂到那封下面)。
   */
  setData: (v: InboxView) => void

  /**
   * 在途。
   */
  setBusy: (v: boolean) => void

  /**
   * 发信框底下那句失败说明。
   */
  setNote: (v: string) => void

  /**
   * 开关发信框。
   */
  setOpen: (v: boolean) => void

  /**
   * 清空草稿。
   */
  setText: (v: string) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 回信接口的请求体。
 */
export type ReplyPostIn = {
  /**
   * 回哪一封。
   */
  id: number

  /**
   * 正文。
   */
  text: string
}

/**
 * 回信回包落地的入参。
 */
export type AfterReplyIn = {
  /**
   * 发信手柄的入参(各 setter)。
   */
  x: ReplySendIn

  /**
   * 回的那一封。
   */
  id: number

  /**
   * 回包;网络失败为 null。
   */
  r: Response | null
}

/**
 * 把回信挂上去后的回包入参。
 */
export type WithReplyIn = {
  /**
   * 原回包。
   */
  data: InboxView

  /**
   * 回的那一封。
   */
  id: number

  /**
   * 存下的回信。
   */
  reply: InboxReply
}

/**
 * 布尔开关手柄的入参。
 */
export type FlagSetIn = {
  /**
   * setter。
   */
  set: (v: boolean) => void

  /**
   * 按下后的值。
   */
  v: boolean
}

/**
 * 文本框手柄的入参。
 */
export type TextSetIn = {
  /**
   * setter。
   */
  set: (v: string) => void
}

/**
 * 主题显示的入参。
 */
export type SubjectIn = {
  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 取词(没主题时的占位词)。
   */
  t: TFn
}

/**
 * 收件箱状态机器的入参。
 */
export type InboxIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 打开投递记录框(「打开这次投递」;父桶注入)。
   */
  openApp: (appId: number) => void
}

/**
 * 收件箱状态机器的出参。
 */
export type InboxPanel = {
  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 窄屏(窄屏点信弹框看,宽屏右边一栏看)。
   */
  narrow: boolean

  /**
   * 当前打开的那封;没有为 null。
   */
  cur: InboxItem | null

  /**
   * 点某封信的手柄工厂。
   */
  pickOf: PickOfFn

  /**
   * 关掉当前那封(窄屏弹框的关)。
   */
  onUnpick: () => void

  /**
   * 翻转发开关。
   */
  onForward: () => void

  /**
   * 打开当前那封对上的投递。
   */
  onOpenApp: () => void

  /**
   * 发信框开着没有。
   */
  replying: boolean

  /**
   * 打开发信框。
   */
  onReply: () => void

  /**
   * 关发信框。
   */
  onReplyClose: () => void

  /**
   * 回信草稿。
   */
  replyText: string

  /**
   * 改草稿。
   */
  onReplyText: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 发出。
   */
  onReplySend: () => void

  /**
   * 在途。
   */
  replyBusy: boolean

  /**
   * 发信框底下那句失败说明;没有为空串。
   */
  replyNote: string

  /**
   * 清单搜索框里的字。
   */
  q: string

  /**
   * 改搜索字。
   */
  onQ: (v: string) => void

  /**
   * 清单筛选(全部 / 未读)。
   */
  filter: string

  /**
   * 换筛选。
   */
  onFilter: (v: string) => void

  /**
   * 按搜索与筛选留下的信,新的在前。
   */
  shown: InboxItem[]

  /**
   * 没读的封数(筛选页签上的数)。
   */
  unreadN: number
}

/**
 * 吃收件箱状态的件(正文、转发开关)的 props。
 */
export type InboxPartIn = {
  /**
   * 收件箱状态。
   */
  p: InboxPanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * InboxRow(清单里一封)的 props。
 */
export type InboxRowIn = {
  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 是不是当前打开的那封。
   */
  on: boolean

  /**
   * 点了。
   */
  onClick: () => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * InboxRead(阅读区)与两个弹框的 props。
 */
export type InboxReadIn = {
  /**
   * 收件箱状态。
   */
  p: InboxPanel

  /**
   * 那一封。
   */
  m: InboxItem

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 清单一行的类名入参。
 */
export type InboxRowClsIn = {
  /**
   * 是不是当前打开的那封。
   */
  on: boolean

  /**
   * 没读过。
   */
  unread: boolean
}

/**
 * 清单按搜索与筛选留哪几封的入参。
 */
export type ShownIn = {
  /**
   * 回包;还没回为 null。
   */
  data: InboxView | null

  /**
   * 搜索字(不分大小写,搜发件人、地址、主题、正文、职位名)。
   */
  q: string

  /**
   * 筛选(全部 / 未读)。
   */
  filter: string
}

/**
 * 阅读区里一封信卡片(InboxMsg)的 props。
 */
export type InboxMsgIn = {
  /**
   * 卡上写谁(来信是发件人,回信是「我」)。
   */
  who: string

  /**
   * 头像按这个名字取首字与底色。
   */
  avatarName: string

  /**
   * 谁发给谁那一行。
   */
  toLine: string

  /**
   * 时刻。
   */
  at: string

  /**
   * 正文。
   */
  text: string
}
