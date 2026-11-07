/**
 * me 桶子桶 apps 的形状:我的投递清单与 /api/inbox/thread 的线格式、只读投递框要的洗净形、各件 props 与各函数契约(本桶自声明;
 * 本站接口每格都发,线格式写必填)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 我的投递清单的一行(/api/myjobs/applied 的线格式;只声明框里真读的格)。
 */
export type AppItem = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 职位 id;null = 职位已从库里删掉(打不开职位框)。
   */
  jobId: number | null

  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 职位名中文译文(没有 = 空串)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 城市中文译名。
   */
  cityZh: string

  /**
   * 城市韩文译名。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 薪资显示串。
   */
  salary: string

  /**
   * 工时归一值(没标 = 空串)。
   */
  hours: string

  /**
   * 雇佣期归一值(没标 = 空串)。
   */
  term: string

  /**
   * 发布日期(ISO)。
   */
  datePosted: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 投递进度。
   */
  stage: string

  /**
   * 发出时附了求职信(出「求职信」链接的前提;2026-10-10 Frank「两处都改吧」)。
   */
  hasCover: boolean
}

/**
 * 我的投递清单接口的响应体。
 */
export type AppsRespJson = {
  /**
   * 清单;缺席按零条读。
   */
  items?: AppItem[]
}

/**
 * 只读投递框「职位信息」那张卡(洗净):职位两行、公司、地点 + 灰字、薪资、工时、雇佣期、发布 / 截止日期、两份附件地址。
 */
export type AvJob = {
  /**
   * 职位 id(职位删了 = null,职位名黑字不可点)。
   */
  jobId: number | null

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名灰字(界面语译名;英文界面空串)。
   */
  titleSub: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 公司中文译名。
   */
  companyZh: string

  /**
   * 公司韩文译名。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 地点一行。
   */
  address: string

  /**
   * 地点的 Google 地图链接(没有地点 = 空串)。
   */
  addressHref: string

  /**
   * 地点灰字(「市译名,省译名」;英文界面空串)。
   */
  addressSub: string

  /**
   * 薪资(没有 = 空串)。
   */
  salary: string

  /**
   * 工时英文名(没标 = 空串)。
   */
  hoursEn: string

  /**
   * 雇佣期英文名(没标 = 空串)。
   */
  termEn: string

  /**
   * 发布日期(年-月-日;没有 = 空串)。
   */
  posted: string

  /**
   * 截止日期(年-月-日;没有 = 空串)。
   */
  deadline: string

  /**
   * 简历附件地址(草稿 = 空串)。
   */
  resumeHref: string

  /**
   * 求职信附件地址(草稿、没附 = 空串)。
   */
  coverHref: string
}

/**
 * avJobOf 的入参。
 */
export type AvJobOfIn = {
  /**
   * 我的投递清单里那一行。
   */
  item: AppItem

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang
}

/**
 * fileHrefOf 的入参。
 */
export type FileHrefIn = {
  /**
   * 那一行。
   */
  item: AppItem

  /**
   * 附件种类尾。
   */
  tail: string
}

/**
 * itemByIdOf 的入参。
 */
export type ItemByIdIn = {
  /**
   * 我的投递清单。
   */
  items: AppItem[]

  /**
   * 投递行 id。
   */
  id: number
}

/**
 * 拉我的投递清单(makeLoadApps)的入参。
 */
export type LoadAppsIn = {
  /**
   * 写清单。
   */
  setItems: (v: AppItem[]) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

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
   * 本人回出去的。
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
 * 框要的往来(洗净)。
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
 * 拉往来(makeLoadThread)的入参。
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
 * 宿主绑事件(bindAppHost)的入参。
 */
export type AppHostSyncIn = {
  /**
   * 写当前开着的投递行 id。
   */
  setId: (v: number | null) => void
}

/**
 * 解绑函数。
 */
export type UnbindFn = () => void

/**
 * 只读投递框宿主 AppViewHost 的 props。
 */
export type AppViewHostIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * useAppHost 整机的面板:地址栏里开着的投递行与关框。
 */
export type AppHostPanel = {
  /**
   * 开着的投递行 id(没开 = null)。
   */
  id: number | null

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * 只读投递框 AppView 的 props。
 */
export type AppViewIn = {
  /**
   * 投递行 id。
   */
  appId: number

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * useAppView 的入参。
 */
export type AppViewHookIn = {
  /**
   * 投递行 id。
   */
  appId: number
}

/**
 * useAppView 整机的面板:清单里那一行、往来、拉失败了没。
 */
export type AppViewPanel = {
  /**
   * 我的投递清单里那一行(还没拉回来 / 不在清单里 = null)。
   */
  item: AppItem | null

  /**
   * 往来(还没拉回来 = null)。
   */
  thread: ThreadView | null

  /**
   * 两样有一样拉失败了(或那一行不在清单里)。
   */
  failed: boolean
}

/**
 * 「职位信息」卡(AvJobCard)的 props。
 */
export type AvJobCardIn = {
  /**
   * 那一张卡的洗净形。
   */
  j: AvJob

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 「雇主回复」卡里一封回信(AvMsgCard)的 props。
 */
export type AvMsgIn = {
  /**
   * 那一封。
   */
  m: ThreadMsg

  /**
   * 取词函数。
   */
  t: TFn
}

