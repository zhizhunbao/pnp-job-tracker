/**
 * 收件箱域(lib/inbox)的形状:库行 → 洗净 → 对外行三段律,Resend 收信回调与收信接口的线格式,各函数的入参与结果。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import type { Db } from '../db'

// =========================================================================
// 1. 投递邮箱
// =========================================================================

/**
 * 用户 id(payload 的主键两形)。
 */
export type InboxUserId = string | number

/**
 * 本人专属地址的库行。
 */
export type AliasDbRow = {
  /**
   * 地址名(@ 前那段)。
   */
  alias: string | null

  /**
   * 转发开关。
   */
  forward: boolean | null
}

/**
 * 本人专属地址(洗净)。
 */
export type AliasFact = {
  /**
   * 地址名。
   */
  alias: string

  /**
   * 收到回信同时转到账户邮箱。
   */
  forward: boolean
}

/**
 * 没建过地址给 null。
 */
export type MaybeAlias = AliasFact | null

/**
 * `ensureAlias` 的入参。
 */
export type AliasEnsureIn = {
  /**
   * 能查的连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId
}

/**
 * `ensureAlias` 的返回。
 */
export type AliasOut = Promise<AliasFact>

/**
 * `loadAlias` 的返回。
 */
export type MaybeAliasOut = Promise<MaybeAlias>

/**
 * `addressOf` 的入参。
 */
export type AddressIn = {
  /**
   * 地址名。
   */
  alias: string

  /**
   * 挂在哪一条投递上(子地址标记);不挂给 null。
   */
  appId: number | null
}

/**
 * `inboxAddressOf` 的入参(投递发信 / 投递框起始态要用的回复地址)。
 */
export type InboxAddressIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 挂在哪一条投递上;不挂给 null。
   */
  appId: number | null
}

/**
 * `inboxAddressOf` 的返回(收件箱没开通给空串)。
 */
export type InboxAddressOut = Promise<string>

/**
 * 一个地址拆成的显示名与地址。
 */
export type ParsedAddr = {
  /**
   * 地址(小写)。
   */
  addr: string

  /**
   * 显示名(没有给空串)。
   */
  name: string
}

/**
 * 收件人里认出来的本站地址。
 */
export type RecipientHit = {
  /**
   * 地址名。
   */
  alias: string

  /**
   * 子地址标记里的投递行 id;没标记给 null。
   */
  appId: number | null
}

/**
 * 没认出本站地址给 null。
 */
export type MaybeRecipientHit = RecipientHit | null

/**
 * `recipientHitOf` 的入参。
 */
export type RecipientHitIn = {
  /**
   * 收件人(to + cc,原样)。
   */
  addrs: string[]

  /**
   * 收信子域。
   */
  domain: string
}

// =========================================================================
// 2. 收信
// =========================================================================

/**
 * Resend 收信回调体(线格式,只读用到的格)。
 */
export type ReceivedEventJson = {
  /**
   * 事件名。
   */
  type?: string

  /**
   * 事件数据。
   */
  data?: ReceivedDataJson
}

/**
 * 收信回调的 data 段(只有元信息,正文要另取)。
 */
export type ReceivedDataJson = {
  /**
   * Resend 收信 id。
   */
  email_id?: string

  /**
   * 发件人(可能带显示名)。
   */
  from?: string

  /**
   * 收件人。
   */
  to?: string[]

  /**
   * 抄送。
   */
  cc?: string[]

  /**
   * 标题。
   */
  subject?: string

  /**
   * Message-ID。
   */
  message_id?: string
}

/**
 * Resend 收信接口回的全文(线格式,只读用到的格)。
 */
export type ReceivedEmailJson = {
  /**
   * 纯文本正文。
   */
  text?: string | null

  /**
   * HTML 正文。
   */
  html?: string | null

  /**
   * 邮件头(小写键)。
   */
  headers?: ReceivedHeadersJson

  /**
   * 标题。
   */
  subject?: string | null

  /**
   * Message-ID。
   */
  message_id?: string | null
}

/**
 * 收信接口的邮件头(小写键 → 值;个别头可能是数组)。
 */
export type ReceivedHeadersJson = Record<string, string | string[]>

/**
 * 收信回调 data 段(洗净)。
 */
export type ReceivedFact = {
  /**
   * Resend 收信 id(缺席给空串)。
   */
  emailId: string

  /**
   * 发件人原样(可能带显示名)。
   */
  from: string

  /**
   * 收件人 + 抄送原样。
   */
  addrs: TextList

  /**
   * 标题。
   */
  subject: string

  /**
   * Message-ID。
   */
  messageId: string
}

/**
 * 收信全文(洗净)。
 */
export type ReceivedEmailFact = {
  /**
   * 标题(没有给空串)。
   */
  subject: string

  /**
   * 纯文本正文。
   */
  text: string

  /**
   * Message-ID(没有给空串)。
   */
  messageId: string

  /**
   * In-Reply-To(没有给空串)。
   */
  inReplyTo: string

  /**
   * 这一封回的是哪几封(In-Reply-To + References 里的 Message-ID)。
   */
  refs: TextList
}

/**
 * 取不到全文给 null。
 */
export type MaybeReceivedEmail = ReceivedEmailFact | null

/**
 * 一串文字。
 */
export type TextList = string[]

/**
 * id 或没有。
 */
export type MaybeId = number | null

/**
 * 请求体 / 查询参数里的 id 原样。
 */
export type RawId = string | number | null

/**
 * `fetchReceived` 的返回。
 */
export type ReceivedOut = Promise<MaybeReceivedEmail>

/**
 * 转发收件人换算(投递域的 recipientOf:测试号改投 Resend 测试地址;签名由那个域定死)。
 */
export type MailToFn = (x: MailToIn) => string

/**
 * MailToFn 的入参(照投递域 RecipientIn 全格照抄)。
 */
export type MailToIn = {
  /**
   * 本人账户邮箱。
   */
  userEmail: string

  /**
   * 真收件人。
   */
  employerEmail: string
}

/**
 * `receiveInbound` 的入参。
 */
export type ReceiveIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 回调原始体(已验过签)。
   */
  body: string

  /**
   * 转发收件人换算。
   */
  mailTo: MailToFn
}

/**
 * `receiveInbound` 的结果(RECV_* 之一)。
 */
export type ReceiveOut = Promise<string>

/**
 * 回调认人的库行。
 */
export type AliasUserDbRow = {
  /**
   * 用户 id。
   */
  user_id: number | string | null

  /**
   * 转发开关。
   */
  forward: boolean | null

  /**
   * 账户邮箱。
   */
  email: string | null
}

/**
 * 回调认出的人。
 */
export type AliasUserFact = {
  /**
   * 用户 id。
   */
  userId: number

  /**
   * 转发开关。
   */
  forward: boolean

  /**
   * 账户邮箱。
   */
  email: string
}

/**
 * id 库行。
 */
export type IdDbRow = {
  /**
   * id。
   */
  id: number | string | null
}

/**
 * 计数库行。
 */
export type CountDbRow = {
  /**
   * 个数。
   */
  n: number | string | null
}

/**
 * `linkAppOf` 的入参。
 */
export type LinkAppIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: number

  /**
   * 子地址标记里的投递行 id;没标记给 null。
   */
  tagAppId: number | null

  /**
   * In-Reply-To 与 References 里的 Message-ID。
   */
  refs: TextList

  /**
   * 发件地址。
   */
  from: string
}

/**
 * `linkAppOf` 的返回(对不上给 null)。
 */
export type LinkAppOut = Promise<MaybeId>

/**
 * 一封收到的信洗出来的几格(记库与转发用)。
 */
export type InMail = {
  /**
   * 收件人(本人)。
   */
  user: AliasUserFact

  /**
   * 对上的投递;对不上给 null。
   */
  appId: number | null

  /**
   * 发件人。
   */
  from: ParsedAddr

  /**
   * 收件地址(本人的专属地址)。
   */
  to: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 纯文本正文。
   */
  text: string

  /**
   * Message-ID(没有给空串)。
   */
  messageId: string

  /**
   * In-Reply-To(没有给空串)。
   */
  inReplyTo: string

  /**
   * Resend 收信 id。
   */
  inboundId: string
}

/**
 * `inMailOf` 的入参。
 */
export type InMailOfIn = {
  /**
   * 洗净的回调元信息(全文缺格时兜底)。
   */
  d: ReceivedFact

  /**
   * 洗净的全文。
   */
  full: ReceivedEmailFact

  /**
   * 收件人(本人)。
   */
  user: AliasUserFact

  /**
   * 发件人。
   */
  from: ParsedAddr

  /**
   * 本人地址名。
   */
  alias: string

  /**
   * 对上的投递;对不上给 null。
   */
  appId: number | null
}

/**
 * `headerOf` 的入参。
 */
export type HeaderOfIn = {
  /**
   * 收信接口回的全文。
   */
  full: ReceivedEmailJson

  /**
   * 小写头名。
   */
  key: string
}

/**
 * `forwardIn` 的入参。
 */
export type ForwardIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 收到的那一封。
   */
  mail: InMail

  /**
   * 收件箱里的信 id。
   */
  msgId: number

  /**
   * 转发收件人换算。
   */
  mailTo: MailToFn
}

/**
 * 转发信正文的几格。
 */
export type ForwardTextIn = {
  /**
   * 收到的那一封。
   */
  mail: InMail

  /**
   * 收件箱里的信 id。
   */
  msgId: number
}

/**
 * 建地址时名字段来源的库行(投递英文署名,没有给账户邮箱)。
 */
export type SeedDbRow = {
  /**
   * 名字段来源。
   */
  seed: string | null
}

/**
 * 自定义邮件头(头名 → 值;同 lib/mail 的 ResendHeaders,本域自声明)。
 */
export type MailHeaders = Record<string, string>

/**
 * 写库没有返回值。
 */
export type WriteOut = Promise<void>

/**
 * `textOf` 的入参(全文接口回的正文两形)。
 */
export type TextOfIn = {
  /**
   * 纯文本正文。
   */
  text: string

  /**
   * HTML 正文。
   */
  html: string
}

// =========================================================================
// 3. 回信
// =========================================================================

/**
 * 要回的那一封的库行。
 */
export type MsgOneDbRow = {
  /**
   * 信 id。
   */
  id: number | string | null

  /**
   * 挂的投递。
   */
  application_id: number | string | null

  /**
   * 发件地址。
   */
  from_addr: string | null

  /**
   * 标题。
   */
  subject: string | null

  /**
   * Message-ID。
   */
  message_id: string | null

  /**
   * 本人的地址名。
   */
  alias: string | null

  /**
   * 本人的投递署名。
   */
  sender_name: string | null
}

/**
 * 要回的那一封(洗净)。
 */
export type MsgOneFact = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 挂的投递;没有给 null。
   */
  appId: number | null

  /**
   * 发件地址(回给谁)。
   */
  fromAddr: string

  /**
   * 标题。
   */
  subject: string

  /**
   * Message-ID(没有给空串)。
   */
  messageId: string

  /**
   * 本人的地址名。
   */
  alias: string

  /**
   * 本人的投递署名(没有给空串)。
   */
  senderName: string
}

/**
 * 没有这一封(或不是本人的)给 null。
 */
export type MaybeMsgOne = MsgOneFact | null

/**
 * 发件人显示(投递域的 senderFromOf:「名字 via Offer2PR <apply@…>」;签名由那个域定死)。
 */
export type FromOfFn = (name: string) => string

/**
 * `sendReply` 的入参。
 */
export type SendReplyIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 账户邮箱(测试号改投测试地址要它)。
   */
  userEmail: string

  /**
   * 回的是哪一封。
   */
  id: number

  /**
   * 回信正文(已收窄)。
   */
  text: string

  /**
   * 收件人换算。
   */
  mailTo: MailToFn

  /**
   * 发件人显示。
   */
  fromOf: FromOfFn
}

/**
 * `sendReply` 的结果。
 */
export type SendReplyFact = {
  /**
   * 发出去了。
   */
  ok: boolean

  /**
   * 失败原因(notFound / mail / disabled;成功给空串)。
   */
  why: string

  /**
   * 记进去的那一封(失败给 null)。
   */
  reply: InboxReplyRow | null
}

/**
 * `sendReply` 的返回。
 */
export type SendReplyOut = Promise<SendReplyFact>

/**
 * 记回出去的信的回行。
 */
export type OutAddDbRow = {
  /**
   * 信 id。
   */
  id: number | string | null

  /**
   * 记下的时刻。
   */
  received_at: TimeCell
}

/**
 * 记回出去的信的回行(洗净)。
 */
export type OutAddFact = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 记下的时刻(ISO)。
   */
  at: string
}

/**
 * 回信请求体(线格式)。
 */
export type ReplyBodyJson = {
  /**
   * 回的是哪一封。
   */
  id?: number | string

  /**
   * 正文。
   */
  text?: string
}

/**
 * 回信请求体(收窄后)。
 */
export type ReplyBody = {
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
 * 不合形给 null。
 */
export type MaybeReplyBody = ReplyBody | null

/**
 * 读了一封的请求体(线格式)。
 */
export type ReadBodyJson = {
  /**
   * 信 id。
   */
  id?: number | string
}

/**
 * 转发开关的请求体(线格式)。
 */
export type PrefsBodyJson = {
  /**
   * 开 / 关。
   */
  forward?: boolean
}

// =========================================================================
// 4. 清单与一条投递
// =========================================================================

/**
 * 库回的时刻格。
 */
export type TimeCell = Date | string | null

/**
 * 收件箱一封的库行。
 */
export type MsgDbRow = {
  /**
   * 信 id。
   */
  id: number | string | null

  /**
   * 挂的投递。
   */
  application_id: number | string | null

  /**
   * 方向。
   */
  direction: string | null

  /**
   * 发件地址。
   */
  from_addr: string | null

  /**
   * 发件人名。
   */
  from_name: string | null

  /**
   * 标题。
   */
  subject: string | null

  /**
   * 正文(截过)。
   */
  body_text: string | null

  /**
   * 收到 / 发出的时刻。
   */
  received_at: TimeCell

  /**
   * 读的时刻。
   */
  read_at: TimeCell

  /**
   * 回的是哪一封。
   */
  reply_of: number | string | null

  /**
   * 挂的投递的职位名快照。
   */
  job_title: string | null
}

/**
 * 收件箱一封(洗净)。
 */
export type MsgFact = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 挂的投递;没有给 null。
   */
  appId: number | null

  /**
   * 是本人回出去的。
   */
  out: boolean

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
   * 收到 / 发出的时刻(ISO)。
   */
  at: string

  /**
   * 读过了。
   */
  read: boolean

  /**
   * 回的是哪一封;不是回信给 null。
   */
  replyOf: number | null

  /**
   * 相关职位名(没有给空串)。
   */
  jobTitle: string
}

/**
 * 本人回出去的一封(挂在它回的那一封下面)。
 */
export type InboxReplyRow = {
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
 * 收件箱一封(对外)。
 */
export type InboxMsgRow = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 挂的投递;没有给 null。
   */
  appId: number | null

  /**
   * 发件地址(本人收件箱里给本人看,是发件人自己的地址)。
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
  replies: InboxReplyRow[]
}

/**
 * 两个方向的信。
 */
export type MsgFacts = MsgFact[]

/**
 * 收件箱清单。
 */
export type InboxMsgRows = InboxMsgRow[]

/**
 * `inboxRowsOf` 的入参(两个方向的信 → 收件箱清单:收到的一封一行,回出去的挂上去)。
 */
export type InboxRowsIn = {
  /**
   * 两个方向的信。
   */
  facts: MsgFacts

  /**
   * 信是新的在前(收件箱清单)= true;先来的在前(一条投递的往来)= false。回出去的一律先发的在前。
   */
  desc: boolean
}

/**
 * `loadInbox` 的入参。
 */
export type InboxIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 账户邮箱。
   */
  email: string
}

/**
 * GET /api/inbox 的回包。
 */
export type InboxJson = {
  /**
   * 专属地址(收件箱没开通给空串)。
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
   * 收到的信。
   */
  items: InboxMsgRow[]
}

/**
 * `loadInbox` 的返回。
 */
export type InboxOut = Promise<InboxJson>

/**
 * 本人一类的入参(连接 + 用户 id)。
 */
export type UserIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId
}

/**
 * 计数的返回。
 */
export type CountOut = Promise<number>

/**
 * 本人某一封 / 某一条的入参。
 */
export type UserIdIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 信 id 或投递行 id。
   */
  id: number
}

/**
 * `saveForward` 的入参。
 */
export type ForwardSetIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 开 / 关。
   */
  forward: boolean
}

/**
 * 「打开」一条投递:发出那一封的库行。
 */
export type ThreadAppDbRow = {
  /**
   * 投递行 id。
   */
  id: number | string | null

  /**
   * 公司名快照(邮件预览的收件人;雇主邮箱不下发)。
   */
  company: string | null

  /**
   * 实际的回复地址。
   */
  reply_to: string | null

  /**
   * 简历附件名。
   */
  resume_file: string | null

  /**
   * 求职信附件名(空 = 没附)。
   */
  cover_file: string | null

  /**
   * 标题。
   */
  subject: string | null

  /**
   * 正文。
   */
  body_text: string | null

  /**
   * 发出时刻。
   */
  sent_at: TimeCell

  /**
   * 投递署名。
   */
  sender_name: string | null
}

/**
 * 「打开」一条投递:发出那一封(对外)。
 */
export type ThreadAppRow = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 公司名(邮件预览的收件人)。
   */
  company: string

  /**
   * 回复邮箱(子地址标记去掉)。
   */
  replyTo: string

  /**
   * 简历附件名。
   */
  resumeFile: string

  /**
   * 求职信附件名(空串 = 没附)。
   */
  coverFile: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文。
   */
  body: string

  /**
   * 发出时刻(ISO)。
   */
  sentAt: string

  /**
   * 英文姓名(投递署名;没有给空串)。
   */
  senderName: string
}

/**
 * 不是本人的 / 还没发给 null。
 */
export type MaybeThreadApp = ThreadAppRow | null

/**
 * GET /api/inbox/thread 的回包。
 */
export type ThreadJson = {
  /**
   * 发出那一封。
   */
  app: ThreadAppRow

  /**
   * 挂在这一条投递上的收到的信(回出去的挂在下面)。
   */
  messages: InboxMsgRow[]

  /**
   * 同时转到账户邮箱。
   */
  forward: boolean

  /**
   * 账户邮箱。
   */
  account: string
}

/**
 * `loadThread` 的入参。
 */
export type ThreadIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: InboxUserId

  /**
   * 账户邮箱。
   */
  email: string

  /**
   * 投递行 id。
   */
  appId: number
}

/**
 * `loadThread` 的返回(不是本人的 / 还没发给 null)。
 */
export type ThreadOut = Promise<ThreadJson | null>
