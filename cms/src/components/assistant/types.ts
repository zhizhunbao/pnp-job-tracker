/**
 * assistant 组件桶的形状:线格式、对话里的一条消息、一轮的结果、整机面板与各件的 props。
 * 线格式与 lib/assistant 的回包对齐,本域自己声明(只声明真读的格)。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */

/**
 * 界面语种。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 取词函数(本域只用到键与字两格)。
 */
export type TFn = (key: string) => string

/**
 * 探活回包(线上形状,格可缺)。
 */
export type ReadyJson = {
  /**
   * 助手现在能不能用。
   */
  ready?: boolean
}

/**
 * 回包里的一条链接(线上形状,格可缺)。
 */
export type LinkJson = {
  /**
   * 页面键。
   */
  key?: string

  /**
   * 站内相对地址。
   */
  url?: string
}

/**
 * 可能不是对象的线上一条链接。
 */
export type MaybeLinkJson = LinkJson | null

/**
 * 一轮问答的回包(线上形状,格可缺)。
 */
export type ReplyJson = {
  /**
   * 类别。
   */
  kind?: string

  /**
   * 正文。
   */
  say?: string

  /**
   * 站内链接。
   */
  links?: MaybeLinkJson[]
}

/**
 * 可能不是对象的回包。
 */
export type MaybeReplyJson = ReplyJson | null

/**
 * 带给服务端的一条历史。
 */
export type Turn = {
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
 * sendTurn 的入参。
 */
export type SendIn = {
  /**
   * 本轮提问(已 trim、已截长)。
   */
  text: string

  /**
   * 界面语种。
   */
  lang: Lang

  /**
   * 之前几轮。
   */
  history: Turn[]
}

/**
 * 一轮的结果码。
 */
export type SendStatus = 'ok' | 'limit' | 'offline' | 'net'

/**
 * sendTurn 的返回。
 */
export type SendOut = {
  /**
   * 结果码。
   */
  status: SendStatus

  /**
   * 助手的回复;没答上是 null。
   */
  reply: MaybeReply
}

/**
 * 回复的三类(与 lib/assistant 的 KIND 同值)。
 */
export type Kind = 'answer' | 'refuse' | 'off'

/**
 * 一条能渲的链接。
 */
export type Link = {
  /**
   * 页名词条键。
   */
  labelKey: string

  /**
   * 站内相对地址。
   */
  url: string
}

/**
 * 验过形的助手回复。
 */
export type Reply = {
  /**
   * 类别。
   */
  kind: Kind

  /**
   * 正文;refuse 与 off 是空串。
   */
  say: string

  /**
   * 站内链接。
   */
  links: Link[]
}

/**
 * 可能没有的回复。
 */
export type MaybeReply = Reply | null

/**
 * 对话里的一条消息。
 */
export type Msg = {
  /**
   * 消息号(本页发号,当 key 用)。
   */
  id: number

  /**
   * 谁说的。
   */
  role: 'user' | 'assistant'

  /**
   * 类别;访客说的恒为 answer。
   */
  kind: Kind

  /**
   * 正文;refuse 与 off 是空串,界面出固定的一句话。
   */
  say: string

  /**
   * 站内链接;访客说的恒为空。
   */
  links: Link[]
}

/**
 * userMsgOf 的入参。
 */
export type UserMsgIn = {
  /**
   * 消息号。
   */
  id: number

  /**
   * 访客打的字。
   */
  text: string
}

/**
 * botMsgOf 的入参。
 */
export type BotMsgIn = {
  /**
   * 消息号。
   */
  id: number

  /**
   * 验过形的回复。
   */
  reply: Reply
}

/**
 * msgsWith 的入参。
 */
export type MsgsWithIn = {
  /**
   * 现有的消息。
   */
  list: Msg[]

  /**
   * 新来的一条。
   */
  item: Msg
}

/**
 * msgsAfterSend 的入参。
 */
export type AfterSendIn = {
  /**
   * 现有的消息(最后一条是访客刚发的)。
   */
  list: Msg[]

  /**
   * 访客刚发的那条的消息号(没答上时把它撤掉,字放回输入框)。
   */
  mineId: number

  /**
   * 这一轮的结果。
   */
  out: SendOut

  /**
   * 发给回复的消息号。
   */
  replyId: number
}

/**
 * sayOf 的入参。
 */
export type SayIn = {
  /**
   * 一条消息。
   */
  msg: Msg

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * historyOf 的入参。
 */
export type HistoryIn = {
  /**
   * 现有的消息。
   */
  msgs: Msg[]

  /**
   * 取词函数(refuse 与 off 那两句固定话要取词)。
   */
  t: TFn
}

/**
 * 本域全部的可变状态。
 */
export type AssistantCache = {
  /**
   * 最后发出的消息号。
   */
  seq: number
}

/**
 * 出错一档。
 */
export type ErrKind = 'none' | 'limit' | 'net'

/**
 * 整机面板:状态与手柄(两枚 DOM 引用另交,不进面板对象)。
 */
export type AssistantPanelState = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 盒子在线;false 时不出入口。
   */
  ready: boolean

  /**
   * 面板开着。
   */
  open: boolean

  /**
   * 对话里的消息(刷新页面就没了)。
   */
  msgs: Msg[]

  /**
   * 输入框里的字。
   */
  draft: string

  /**
   * 在等回复。
   */
  busy: boolean

  /**
   * 等了超过三秒。
   */
  slow: boolean

  /**
   * 出错一档。
   */
  err: ErrKind

  /**
   * 开面板。
   */
  show: () => void

  /**
   * 关面板。
   */
  hide: () => void

  /**
   * 发送输入框里的字。
   */
  send: () => void

  /**
   * 输入框改字。
   */
  onDraft: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 输入框按键:回车发送,Shift 加回车换行。
   */
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

/**
 * useAssistant 的返回。
 */
export type AssistantOut = {
  /**
   * 整机面板。
   */
  p: AssistantPanelState

  /**
   * 输入框的 DOM 引用(开面板时聚焦)。
   */
  inputEl: React.RefObject<HTMLTextAreaElement | null>

  /**
   * 对话区的 DOM 引用(来新消息滚到底)。
   */
  threadEl: React.RefObject<HTMLDivElement | null>
}

/**
 * AssistantPanel 的 props(同 useAssistant 的返回)。
 */
export type AssistantPanelIn = AssistantOut

/**
 * AssistantBubble 的 props。
 */
export type AssistantBubbleIn = {
  /**
   * 这一条。
   */
  msg: Msg

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * AssistantTyping 的 props。
 */
export type AssistantTypingIn = {
  /**
   * 等了超过三秒。
   */
  slow: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * useSend 的入参。
 */
export type UseSendIn = {
  /**
   * 界面语种。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 现有的消息。
   */
  msgs: Msg[]

  /**
   * 输入框里的字。
   */
  draft: string

  /**
   * 在等回复。
   */
  busy: boolean

  /**
   * 消息落格。
   */
  setMsgs: React.Dispatch<React.SetStateAction<Msg[]>>

  /**
   * 输入框落格。
   */
  setDraft: (v: string) => void

  /**
   * 等待落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 「超过三秒」落格。
   */
  setSlow: (v: boolean) => void

  /**
   * 出错落格。
   */
  setErr: (v: ErrKind) => void

  /**
   * 在线落格(503 时收起入口)。
   */
  setReady: (v: boolean) => void

  /**
   * 开合落格。
   */
  setOpen: (v: boolean) => void
}
