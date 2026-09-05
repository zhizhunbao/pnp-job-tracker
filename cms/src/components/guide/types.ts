/**
 * 站内向导对话框的类型:线上回包、一轮、面板、各件的 props 与各手柄工厂的入参。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */

/**
 * 三语。各桶自抄。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 四类。
 */
export type GuideKind = 'nav' | 'question' | 'suggestion' | 'chat'

/**
 * 留邮箱状态。
 */
export type EmailState = 'idle' | 'open' | 'sending' | 'sent' | 'fail'

/**
 * 一轮的故障态。
 */
export type Fault = '' | 'limit' | 'net'

/**
 * /api/guide 线上回来的形状(自家接口,每格都发;缺格由 toReply 补)。
 */
export type ReplyWire = {
  /**
   * asks.id;写库失败 null。
   */
  id?: number | null

  /**
   * 线程 id。
   */
  thread?: string

  /**
   * 类别。
   */
  kind?: string

  /**
   * 目的地键。
   */
  dest?: string | null

  /**
   * 带参站内路径。
   */
  url?: string | null

  /**
   * 向导那一句。
   */
  say?: string

  /**
   * 解析出的职业码。
   */
  noc?: string | null

  /**
   * 解析出的省码。
   */
  prov?: string | null
}

/**
 * 校验后的回包(两态:必填 / null)。
 */
export type GuideReply = {
  /**
   * asks.id;写库失败 null(留邮箱那步会跳过)。
   */
  id: number | null

  /**
   * 线程 id。
   */
  thread: string

  /**
   * 类别(认不出按 question)。
   */
  kind: GuideKind

  /**
   * 目的地键;非 nav 是 null。
   */
  dest: string | null

  /**
   * 带参站内路径;非 nav 是 null。
   */
  url: string | null

  /**
   * 向导那一句;问题与建议是空串。
   */
  say: string
}

/**
 * 一轮:用户那句 + 回包 + 故障 + 留邮箱状态。
 */
export type GuideTurn = {
  /**
   * 用户那句原文。
   */
  q: string

  /**
   * 回包;还没回来是 null。
   */
  reply: GuideReply | null

  /**
   * 故障态。
   */
  fault: Fault

  /**
   * 留邮箱状态。
   */
  email: EmailState

  /**
   * 邮箱输入框现值。
   */
  emailDraft: string
}

/**
 * 轮次清单。
 */
export type TurnList = GuideTurn[]

/**
 * 一轮的局部更新(只写要改的格)。
 */
export type TurnPatch = Partial<GuideTurn>

/**
 * 发给接口的一轮历史。
 */
export type HistoryTurn = {
  /**
   * 谁说的。
   */
  role: 'user' | 'assistant'

  /**
   * 说了什么。
   */
  content: string
}

/**
 * 输入框 change 事件。
 */
export type ComposerChangeEvent = React.ChangeEvent<HTMLTextAreaElement>

/**
 * 输入框键盘事件。
 */
export type ComposerKeyEvent = React.KeyboardEvent<HTMLTextAreaElement>

/**
 * 邮箱框 change 事件。
 */
export type EmailChangeEvent = React.ChangeEvent<HTMLInputElement>

/**
 * 历史区 DOM 引用。
 */
export type ThreadRef = React.RefObject<HTMLDivElement | null>

/**
 * 输入框 DOM 引用。
 */
export type TaRef = React.RefObject<HTMLTextAreaElement | null>

/**
 * 可变布尔引用(贴底 / 触屏)。
 */
export type MutBool = {
  /**
   * 现值。
   */
  current: boolean
}

/**
 * 轮次落格(函数式更新)。
 */
export type SetTurns = (f: (prev: TurnList) => TurnList) => void

/**
 * 字符串落格。
 */
export type SetText = (v: string) => void

/**
 * 布尔落格。
 */
export type SetBool = (v: boolean) => void

/**
 * 发话手柄。
 */
export type SendFn = (q: string) => void

/**
 * 零参手柄。
 */
export type VoidFn = () => void

/**
 * 对话面板:状态 + 手柄,各件只读它。
 */
export type GuidePanel = {
  /**
   * 界面语取词。
   */
  t: TFn

  /**
   * 输入框现值。
   */
  input: string

  /**
   * 轮次。
   */
  turns: TurnList

  /**
   * 有一轮在路上。
   */
  busy: boolean

  /**
   * 输入框 change。
   */
  onChange: (e: ComposerChangeEvent) => void

  /**
   * 输入框键盘(桌面回车发送)。
   */
  onKeyDown: (e: ComposerKeyEvent) => void

  /**
   * 发送钮。
   */
  onSubmit: VoidFn

  /**
   * 点胶囊:把那句话发出去。
   */
  onChip: SendFn

  /**
   * 历史区滚动(贴底判定)。
   */
  onScroll: VoidFn

  /**
   * 点「打开 X」(埋点;跳转由链接自己走)。
   */
  onNav: (i: number) => void

  /**
   * 点「留个邮箱」。
   */
  onEmailOpen: (i: number) => void

  /**
   * 邮箱框输入。
   */
  onEmailChange: (x: EmailChangeIn) => void

  /**
   * 发送邮箱。
   */
  onEmailSend: (i: number) => void
}

/**
 * 邮箱框输入的入参。
 */
export type EmailChangeIn = {
  /**
   * 第几轮。
   */
  i: number

  /**
   * 现值。
   */
  value: string
}

/**
 * GuideBox 的 props(挂件壳递进来;三格都可不传)。
 */
export type GuideBoxIn = {
  /**
   * 嵌在挂件面板里:卸掉自己的卡壳,历史区改撑满父级剩余高度。
   */
  compact?: boolean

  /**
   * 变 true 时聚焦输入框(触屏跳过)。
   */
  autoFocus?: boolean

  /**
   * 预填问句(只进输入框不自动发送)。
   */
  prefill?: string
}

/**
 * useGuideBox 的入参。
 */
export type GuideBoxHookIn = {
  /**
   * 预填问句。
   */
  prefill: string

  /**
   * 变 true 时聚焦输入框。
   */
  autoFocus: boolean
}

/**
 * useGuideBox 的返回:面板 + 两枚 DOM 引用。
 */
export type GuideBoxOut = {
  /**
   * 面板。
   */
  p: GuidePanel

  /**
   * 历史区引用。
   */
  threadEl: ThreadRef

  /**
   * 输入框引用。
   */
  taEl: TaRef
}

/**
 * GuideHello 的 props。
 */
export type GuideHelloIn = {
  /**
   * 面板。
   */
  p: GuidePanel
}

/**
 * GuideTurn 的 props。
 */
export type GuideTurnIn = {
  /**
   * 面板。
   */
  p: GuidePanel

  /**
   * 这一轮。
   */
  turn: GuideTurn

  /**
   * 第几轮。
   */
  i: number
}

/**
 * GuideCards 的 props。
 */
export type GuideCardsIn = GuideTurnIn

/**
 * GuideEmail 的 props。
 */
export type GuideEmailIn = GuideTurnIn

/**
 * GuideComposer 的 props。
 */
export type GuideComposerIn = {
  /**
   * 面板。
   */
  p: GuidePanel

  /**
   * 输入框引用。
   */
  taEl: TaRef
}

/**
 * 发话依赖包(hook 装配,一次发话全用它)。
 */
export type SendDeps = {
  /**
   * 现有轮次。
   */
  turns: TurnList

  /**
   * 有一轮在路上。
   */
  busy: boolean

  /**
   * 语种。
   */
  lang: Lang

  /**
   * 提问时所在页路径。
   */
  path: string

  /**
   * 轮次落格。
   */
  setTurns: SetTurns

  /**
   * 输入框落格。
   */
  setInput: SetText

  /**
   * 忙态落格。
   */
  setBusy: SetBool

  /**
   * 输入框引用(发出后复位高度)。
   */
  taEl: TaRef

  /**
   * 贴底引用(发出后强制贴底)。
   */
  stick: MutBool
}

/**
 * sendNow 的入参。
 */
export type SendNowIn = {
  /**
   * 依赖包。
   */
  deps: SendDeps

  /**
   * 要发的话。
   */
  q: string
}

/**
 * patchTurn 的入参。
 */
export type PatchTurnIn = {
  /**
   * 轮次落格。
   */
  setTurns: SetTurns

  /**
   * 第几轮。
   */
  i: number

  /**
   * 要改的格。
   */
  patch: TurnPatch
}

/**
 * mergeTurn 的入参。
 */
export type MergeTurnIn = {
  /**
   * 原轮。
   */
  turn: GuideTurn

  /**
   * 要改的格。
   */
  patch: TurnPatch
}

/**
 * replyTextOf 的入参。
 */
export type ReplyTextIn = {
  /**
   * 界面语取词。
   */
  t: TFn

  /**
   * 这一轮。
   */
  turn: GuideTurn
}

/**
 * destLabelOf 的入参。
 */
export type DestLabelIn = {
  /**
   * 界面语取词。
   */
  t: TFn

  /**
   * 目的地键。
   */
  dest: string
}

/**
 * makeComposerKey 的入参。
 */
export type MakeKeyIn = {
  /**
   * 触屏引用。
   */
  coarse: MutBool

  /**
   * 输入框现值。
   */
  input: string

  /**
   * 发话手柄。
   */
  send: SendFn
}

/**
 * makeSubmit 的入参。
 */
export type MakeSubmitIn = {
  /**
   * 输入框现值。
   */
  input: string

  /**
   * 发话手柄。
   */
  send: SendFn
}

/**
 * makeComposerChange 的入参。
 */
export type MakeChangeIn = {
  /**
   * 输入框落格。
   */
  setInput: SetText
}

/**
 * makeNav / makeEmailOpen / makeEmailChange 的入参:只要轮次落格。
 */
export type MakeTurnsIn = {
  /**
   * 轮次落格。
   */
  setTurns: SetTurns
}

/**
 * makeNav 的入参。
 */
export type MakeNavIn = {
  /**
   * 现有轮次(取目的地打埋点)。
   */
  turns: TurnList
}

/**
 * makeEmailSend 的入参。
 */
export type MakeEmailSendIn = {
  /**
   * 现有轮次(取 id / thread / 草稿)。
   */
  turns: TurnList

  /**
   * 轮次落格。
   */
  setTurns: SetTurns
}

/**
 * postEmail 的入参。
 */
export type PostEmailIn = {
  /**
   * 轮次落格。
   */
  setTurns: SetTurns

  /**
   * 第几轮。
   */
  i: number

  /**
   * 这一轮。
   */
  turn: GuideTurn
}

/**
 * tsx 里手柄工厂的入参:面板 + 轮位(组件体内禁内嵌函数,点击手柄由工厂造)。
 */
export type TurnHandleIn = {
  /**
   * 面板。
   */
  p: GuidePanel

  /**
   * 第几轮。
   */
  i: number
}

/**
 * makeChipClick 的入参。
 */
export type ChipHandleIn = {
  /**
   * 面板。
   */
  p: GuidePanel

  /**
   * 胶囊文案的 i18n 键。
   */
  key: string
}

/**
 * makeStickEffect / makeScroll 的入参。
 */
export type StickIn = {
  /**
   * 历史区引用。
   */
  threadEl: ThreadRef

  /**
   * 贴底引用。
   */
  stick: MutBool
}

/**
 * makeAutofocusEffect 的入参。
 */
export type AutofocusIn = {
  /**
   * 输入框引用。
   */
  taEl: TaRef
}

/**
 * makeCoarseEffect 的入参。
 */
export type CoarseIn = {
  /**
   * 触屏引用。
   */
  coarse: MutBool
}
