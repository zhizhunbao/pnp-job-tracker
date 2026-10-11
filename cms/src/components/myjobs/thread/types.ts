/**
 * myjobs 子桶 thread 的形状(2026-10-10 批 3「点已投行『打开』」只读投递框):/api/inbox/thread 的线格式与洗净形、拉取与开关框的入参。
 * 形状本桶自声明(lib/inbox 的 ThreadJson 只抄真读的格;本站接口每格都发,线格式写必填)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */

/**
 * 本人回出去的一封(线格式)。
 */
export type ThreadReplyJson = {
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
 * 收到的一封(线格式)。
 */
export type ThreadMsgJson = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 发件地址。
   */
  fromAddr: string

  /**
   * 发件人名。
   */
  fromName: string

  /**
   * 正文。
   */
  text: string

  /**
   * 收到的时刻(ISO)。
   */
  at: string

  /**
   * 本人回出去的。
   */
  replies: ThreadReplyJson[]
}

/**
 * 发出那一封(线格式)。
 */
export type ThreadAppJson = {
  /**
   * 公司名(邮件预览的收件人)。
   */
  company: string

  /**
   * 回复邮箱。
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
   * 英文姓名。
   */
  senderName: string
}

/**
 * GET /api/inbox/thread 的回包(线格式)。
 */
export type ThreadJson = {
  /**
   * 发出那一封。
   */
  app: ThreadAppJson

  /**
   * 收到的信。
   */
  messages: ThreadMsgJson[]

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
 * 一封回信(洗净;框里一张小块)。
 */
export type ThreadMsg = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 发件人一行(名字,没有名字给地址)。
   */
  from: string

  /**
   * 正文。
   */
  text: string

  /**
   * 收到的时刻('YYYY-MM-DD HH:mm')。
   */
  at: string

  /**
   * 本人回出去的(正文与时刻)。
   */
  replies: ThreadReply[]
}

/**
 * 本人回出去的一封(洗净)。
 */
export type ThreadReply = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 正文。
   */
  text: string

  /**
   * 发出的时刻('YYYY-MM-DD HH:mm')。
   */
  at: string
}

/**
 * 只读投递框要的往来(洗净)。
 */
export type ThreadView = {
  /**
   * 英文姓名(没有给空串)。
   */
  senderName: string

  /**
   * 回复邮箱。
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
   * 邮件预览的收件人(公司名)。
   */
  company: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文。
   */
  body: string

  /**
   * 发出时刻('YYYY-MM-DD HH:mm')。
   */
  sentAt: string

  /**
   * 雇主回信(先来的在前)。
   */
  messages: ThreadMsg[]

  /**
   * 回信同时转到的邮箱(转发关着给空串)。
   */
  forwardTo: string
}

/**
 * `makeLoadThread` 的入参。
 */
export type LoadThreadIn = {
  /**
   * 投递行 id。
   */
  appId: number

  /**
   * 写往来。
   */
  setThread: (v: ThreadView) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * `makeAppHostSync` 的入参(宿主重读地址栏)。
 */
export type AppHostSyncIn = {
  /**
   * 写当前开着的投递行 id(没开给 null)。
   */
  setId: (v: number | null) => void
}

/**
 * 宿主绑事件的收尾函数。
 */
export type UnbindFn = () => void
