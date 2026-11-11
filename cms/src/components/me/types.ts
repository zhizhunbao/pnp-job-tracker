/**
 * me 域的形状:「我的」页框架各件的 props 与状态机器的契约(形状本域自声明,不从 account 取)。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 「我的」的五节(与 constants 的 ME_SECS 一一对应;account 桶 Sec 同一组值)。
 */
export type MeSec = 'sjobs' | 'inbox' | 'resume' | 'profile' | 'sub' | 'settings'

/**
 * 「我的求职」类别下的三个子项(2026-11-09 Frank「这三个是不是都放到侧边栏比较好」:原卡片里的三枚页签挪到侧边栏)。
 */
export type MeJobTab = 'picks' | 'saved' | 'applied'

/**
 * 导航里点得到的键:一节,或「我的求职」下的一个子项。
 */
export type MeKey = MeSec | MeJobTab

/**
 * 窄屏抽屉状态机器的入参。
 */
export type MeFrameIn = {
  /**
   * 换节(页面状态机器给的;抽屉里点了一项 = 换节 + 关抽屉)。
   */
  onPick: (key: MeKey) => void
}

/**
 * 窄屏抽屉状态机器的出参。
 */
export type MeFrameOut = {
  /**
   * 抽屉开着没有。
   */
  drawer: boolean

  /**
   * 拉开抽屉(点窄屏的页标题)。
   */
  onOpen: () => void

  /**
   * 关抽屉。
   */
  onClose: () => void

  /**
   * 导航里点了某一项(左栏与抽屉同一个手柄)。
   */
  onPick: (key: string) => void
}

/**
 * 导航点击手柄工厂的入参。
 */
export type MePickIn = {
  /**
   * 换节。
   */
  onPick: (key: MeKey) => void

  /**
   * 开关抽屉。
   */
  setDrawer: (open: boolean) => void
}

/**
 * 开关抽屉手柄工厂的入参。
 */
export type MeDrawerSetIn = {
  /**
   * 开关抽屉。
   */
  setDrawer: (open: boolean) => void

  /**
   * 手柄按下后抽屉该是开还是关。
   */
  open: boolean
}

/**
 * 某一节文字的取法入参。
 */
export type MeLabelIn = {
  /**
   * 节键。
   */
  sec: string

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 某一项红色计数的取法入参。
 */
export type MeCountIn = {
  /**
   * 节键。
   */
  sec: string

  /**
   * 收件箱没读的封数。
   */
  unread: number
}

/**
 * MeNav 的 props。
 */
export type MeNavIn = {
  /**
   * 当前节。
   */
  sec: string

  /**
   * 取词。
   */
  t: TFn

  /**
   * 收件箱没读的封数(收件箱那一项的红色计数)。
   */
  unread: number

  /**
   * 点了某一项。
   */
  onPick: (key: string) => void
}

/**
 * MeDrawer 的 props:导航那四格 + 关抽屉。
 */
export type MeDrawerIn = {
  /**
   * 当前节。
   */
  sec: string

  /**
   * 取词。
   */
  t: TFn

  /**
   * 收件箱没读的封数。
   */
  unread: number

  /**
   * 点了某一项(换节并关抽屉)。
   */
  onPick: (key: string) => void

  /**
   * 关抽屉(点遮罩、点 ×、按 Esc)。
   */
  onClose: () => void
}

/**
 * MeHead 的 props。
 */
export type MeHeadIn = {
  /**
   * 当前节。
   */
  sec: string

  /**
   * 取词。
   */
  t: TFn

  /**
   * 窄屏(640 及以下):标题本身是拉开抽屉的钮。
   */
  narrow: boolean

  /**
   * 抽屉开着没有(钮上的 aria-expanded)。
   */
  open: boolean

  /**
   * 拉开抽屉。
   */
  onOpen: () => void

  /**
   * 标题右边的动作(主按钮、开关);没有就不出。
   */
  acts?: React.ReactNode
}

/**
 * MeInbox(收件箱一整页)的 props。
 */
export type MeInboxPageIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 导航抽屉开着没有(页标题钮的 aria-expanded)。
   */
  open: boolean

  /**
   * 拉开导航抽屉。
   */
  onOpen: () => void

  /**
   * 打开投递记录框。
   */
  openApp: (appId: number) => void
}

/**
 * 用户档案里页面状态要读的那几格(/api/users/me 的 profile;形状与 lib/jobs 的 ProfileJson 同,本域自抄)。
 */
export type MeProfileJson = {
  /**
   * 分型(海外 / 在读 / 在职 / 求职 / 已 PR);未填为 null。
   */
  currentStatus?: string | null

  /**
   * 想做的工作(NOC 码)。
   */
  nocCodes?: string[] | null

  /**
   * 语言 CLB。
   */
  clb?: number | null

  /**
   * CRS 分。
   */
  crs?: number | null

  /**
   * 目标省份。
   */
  targetProvinces?: string[] | null

  /**
   * 毕业工签剩几个月。
   */
  pgwpMonthsLeft?: number | null

  /**
   * 简历文字存档。
   */
  resumeText?: string | null

  /**
   * 简历存档时刻。
   */
  resumeSavedAt?: string | null
}

/**
 * 当前登录用户(/api/users/me 的 user)。
 */
export type MeUser = {
  /**
   * 用户号。
   */
  id: string | number

  /**
   * 账户邮箱。
   */
  email: string

  /**
   * 角色(admin 之类);没有缺席。
   */
  role?: string

  /**
   * Pro 到期日;没买过为 null 或缺席。
   */
  proUntil?: string | null

  /**
   * 档案;没答过为 null 或缺席。
   */
  profile?: MeProfileJson | null

  /**
   * 昵称。
   */
  displayName?: string | null

  /**
   * 头像。
   */
  avatar?: string | null

  /**
   * 注册来路(email / google;账户设置据此决定给不给改)。
   */
  loginProvider?: string | null

  /**
   * 界面语。
   */
  locale?: string | null
}

/**
 * /api/users/me 的回包。
 */
export type MeRespJson = {
  /**
   * 当前用户;没登录缺席或 null。
   */
  user?: MeUser | null
}

/**
 * 收件箱未读数接口的回包。
 */
export type UnreadRespJson = {
  /**
   * 没读的封数。
   */
  unread: number
}

/**
 * 拉当前用户的入参。
 */
export type RefreshIn = {
  /**
   * 落用户(没登录 null)。
   */
  setMe: (m: MeUser | null) => void

  /**
   * 落「查过了」。
   */
  setChecked: (v: boolean) => void
}

/**
 * 拉未读数的入参。
 */
export type UnreadLoadIn = {
  /**
   * 落未读数。
   */
  setUnread: (n: number) => void
}

/**
 * 投递框发出去了的回调入参(apply 桶 ApplySentSync 给的)。
 */
export type AppliedSentIn = {
  /**
   * 发给了哪家公司。
   */
  company: string
}

/**
 * 「发出去了」手柄工厂的入参。
 */
export type OnAppliedIn = {
  /**
   * 代数 +1(投递表重挂、推荐重拉)。
   */
  setGen: (f: (n: number) => number) => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 代数 +1 手柄工厂的入参。
 */
export type GenBumpIn = {
  /**
   * 代数 setter。
   */
  setGen: (f: (n: number) => number) => void
}

/**
 * Pro 判定的入参。
 */
export type ProOfIn = {
  /**
   * 到期日;没有为 null。
   */
  until: string | null
}

/**
 * 「我的」整页的状态(替 account 桶 useAccountPage;2026-11-07 新域重写,banner 副题「已投 N 封」随横幅撤,不再拉)。
 */
export type MePagePanel = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 窄屏(640 及以下)。
   */
  narrow: boolean

  /**
   * 当前节。
   */
  sec: MeSec

  /**
   * 「我的求职」当前的子项(今日推荐 / 我的收藏 / 我的投递)。
   */
  jobTab: MeJobTab

  /**
   * 导航里亮哪一项(在「我的求职」时是子项,其余是节)。
   */
  nav: MeKey

  /**
   * 当前用户;没登录为 null。
   */
  me: MeUser | null

  /**
   * 登录态查过了没有(查完才渲,免得闪登录跳转)。
   */
  checked: boolean

  /**
   * 换节(或换「我的求职」的子项)。
   */
  onPick: (key: MeKey) => void

  /**
   * 是 Pro。
   */
  pro: boolean

  /**
   * Pro 到期日;没有为 null。
   */
  until: string | null

  /**
   * 投递代数(发出一封 +1:投递表重挂、推荐重拉)。
   */
  appliedGen: number

  /**
   * 投递框发出去了。
   */
  onApplied: (y: AppliedSentIn) => void

  /**
   * 收件箱没读的封数。
   */
  unread: number

  /**
   * 档案代数(五题答完 +1:推荐按新档案重拉)。
   */
  askedGen: number

  /**
   * 档案存好了(「我的档案」修改面板;档案代数 +1)。
   */
  onAsked: () => void

  /**
   * 一进「我的档案」就开着修改面板(「我的求职」的「去补全」点过来;换节就清)。
   */
  autoEdit: boolean

  /**
   * 「我的求职」顶上「补全档案」的「去补全」:切到「我的档案」并开修改面板。
   */
  onFill: () => void
}

/**
 * 各节一整页(档案、简历、订阅、求职)共用的框架三格。
 */
export type MeSecPageIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 窄屏(页标题变拉抽屉的钮)。
   */
  narrow: boolean

  /**
   * 导航抽屉开着没有。
   */
  open: boolean

  /**
   * 拉开导航抽屉。
   */
  onOpen: () => void
}

/**
 * MeSub(我的订阅一整页)的 props:框架三格 + 到期日。
 */
export type MeSubPageIn = MeSecPageIn & {
  /**
   * Pro 到期日;没有为 null。
   */
  until: string | null
}

/**
 * MeSettings(账户设置一整页)的 props:框架三格 + 当前用户。
 */
export type MeSettingsPageIn = MeSecPageIn & {
  /**
   * 当前用户(登录邮箱、注册来路)。
   */
  me: MeUser
}

/**
 * MeJobs(我的求职一整页)的 props:框架三格 + 当前用户与两个代数(2026-11-11 今日推荐不分免费与会员,「是 Pro」撤)。
 */
export type MeJobsPageIn = MeSecPageIn & {
  /**
   * 当前子项(今日推荐 / 我的收藏 / 我的投递;侧边栏点的)。
   */
  tab: MeJobTab

  /**
   * 当前用户(拼分层态用)。
   */
  me: MeUser | null

  /**
   * 投递代数(发出一封 +1:推荐与我的投递重拉)。
   */
  gen: number

  /**
   * 档案代数(五题答完 +1:推荐按新档案重拉)。
   */
  asked: number

  /**
   * 点「补全档案」的「去补全」。
   */
  onFill: () => void
}

/**
 * MeProfile(我的档案一整页)的 props:框架三格 + 一进页就开修改面板否。
 */
export type MeProfilePageIn = MeSecPageIn & {
  /**
   * 一进页就开着修改面板(从「我的求职」顶上「补全档案」的「去补全」过来)。
   */
  autoEdit: boolean

  /**
   * 档案存好了(页面把档案代数 +1)。
   */
  onChanged: () => void
}

/**
 * 换节手柄工厂的入参。
 */
export type SecPickIn = {
  /**
   * 换节。
   */
  setSec: (s: MeSec) => void

  /**
   * 换「我的求职」的子项。
   */
  setJobTab: (v: MeJobTab) => void

  /**
   * 开不开修改面板。
   */
  setAutoEdit: (v: boolean) => void
}

/**
 * 导航亮哪一项(navKeyOf)的入参。
 */
export type NavKeyIn = {
  /**
   * 当前节。
   */
  sec: MeSec

  /**
   * 「我的求职」当前的子项。
   */
  jobTab: MeJobTab
}
