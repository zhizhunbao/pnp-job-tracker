/**
 * header 域的形状:顶栏与其四个部件(账户区/下拉/抽屉/语言切换)的 props 契约、
 * 账户三态机与身份接口的响应形状。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */

/**
 * 语言码 —— 本域自声明(宪法 08-25「Lang 三字面量各域自抄」,2026-08-26 撤跨域 import;
 * 与全站三语同集,加语言两处同改)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 2026-08-26 撤跨域 import 本域自抄,同 auth/types 先例;走样当场 tsc 红)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 顶栏高亮键(哪个导航项亮;stats/rank 并入把脉高亮、match 并入职位高亮)。
 */
export type ActiveKey = 'rank' | 'stats' | 'account' | 'pathways' | 'news' | 'employers' | 'start' | 'match' | 'jobs'

/**
 * 账户区三态。
 */
export type AcctPhase = 'loading' | 'out' | 'in'

/**
 * 账户身份四格。
 */
export type AcctUser = {
  /**
   * 邮箱;'' = 有票据但身份还没到。
   */
  email: string

  /**
   * 昵称;null = 未设。
   */
  displayName: string | null

  /**
   * 头像 URL;null = 无。
   */
  avatar: string | null

  /**
   * 是否 Pro(proUntil 在今天之后)。
   */
  pro: boolean
}

/**
 * 账户区状态(三态 + 身份)。
 */
export type AcctState = {
  /**
   * 当前态。
   */
  state: AcctPhase

  /**
   * 身份(out/loading 时为空壳)。
   */
  u: AcctUser
}

/**
 * /api/users/me 的响应形状(只声明本域读的那几格;Payload 的字段可空)。
 */
export type MeJson = {
  /**
   * 用户;匿名给 null/缺席。
   */
  user?: {
    /**
     * 邮箱。
     */
    email?: string

    /**
     * 昵称。
     */
    displayName?: string | null

    /**
     * 头像 URL。
     */
    avatar?: string | null

    /**
     * Pro 到期日(ISO 串);免费号缺席。
     */
    proUntil?: string | null
  } | null
}

/**
 * useAcct 的入参。
 */
export type AcctHookIn = {
  /**
   * 宿主已知登录态(/jobs 走 plan);null = 宿主不知道,走服务端票据/自查。
   */
  loggedIn: boolean | null

  /**
   * 宿主自带账户区(/jobs)—— 不必自查 /api/users/me。
   */
  hasAccountArea: boolean
}

/**
 * Header 的 props。
 */
export type HeaderIn = {
  /**
   * 当前语言。
   */
  lang: Lang

  /**
   * 换语言。
   */
  setLang: (l: Lang) => void

  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 高亮键(可省 = 首页态)。
   */
  active?: ActiveKey

  /**
   * 吸顶(职位板用)。
   */
  sticky?: boolean

  /**
   * /jobs 特有:「我的匹配」切换态钮(不传 = 不渲,入口在职位高亮里)。
   */
  matchButton?: {
    /**
     * 匹配视图开着没。
     */
    active: boolean

    /**
     * 切换回调。
     */
    onClick: () => void
  }

  /**
   * /jobs 特有:带 plan 的完整账户下拉;不传 = 本域 AccountLite。
   */
  accountArea?: React.ReactNode

  /**
   * 宿主已知登录态时传入;不传 = 本组件自查。
   */
  loggedIn?: boolean
}

/**
 * AccountLite(二级页缺省账户区)的 props。
 */
export type AccountLiteIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 账户三态与身份。
   */
  acct: AcctState
}

/**
 * 登录弹框开合:'' = 关;login/register = 以该态开。
 */
export type AuthOpen = '' | 'login' | 'register'

/**
 * 下拉的一个条目。
 */
export type NavDropItem = {
  /**
   * 去处。
   */
  href: string

  /**
   * 条目文字。
   */
  label: React.ReactNode

  /**
   * 是否当前页(蓝底高亮)。
   */
  active?: boolean
}

/**
 * NavDrop(桌面 hover 下拉)的 props。
 */
export type NavDropIn = {
  /**
   * 触发器文字。
   */
  label: React.ReactNode

  /**
   * 触发器图标(可省)。
   */
  icon?: React.ReactNode

  /**
   * 触发器要不要按当前页高亮。
   */
  highlight: boolean

  /**
   * 条目清单。
   */
  items: NavDropItem[]
}

/**
 * useHoverOpen 交回的机器面板。
 */
export type HoverOut = {
  /**
   * 面板开着没。
   */
  open: boolean

  /**
   * 鼠标进入/键盘 focus = 开(清延时)。
   */
  enter: () => void

  /**
   * 鼠标离开 = 延时关。
   */
  leave: () => void

  /**
   * 点击切换(触屏兜底)。
   */
  toggle: () => void

  /**
   * 焦点移出整块 = 关。
   */
  onBlur: (e: React.FocusEvent<HTMLElement>) => void
}

/**
 * HeaderNav(桌面导航排)的 props。
 */
export type HeaderNavIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 高亮键;null = 首页态。
   */
  active: ActiveKey | null
}

/**
 * LangSwitch(语言切换钮组)的 props。
 */
export type LangSwitchIn = {
  /**
   * 当前语言。
   */
  lang: Lang

  /**
   * 换语言。
   */
  setLang: (l: Lang) => void
}

/**
 * MobileDrawer(窄屏侧滑抽屉)的 props。
 */
export type MobileDrawerIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 高亮键;null = 首页态。
   */
  active: ActiveKey | null

  /**
   * 关抽屉。
   */
  onClose: () => void
}

/**
 * DrawerGroup(抽屉里带二级的组)的 props。
 */
export type DrawerGroupIn = {
  /**
   * 组身份键(单开:开着的组 === 自己才展开)。
   */
  groupKey: string

  /**
   * 组标题。
   */
  label: React.ReactNode

  /**
   * 当前展开的组键;'' = 都收着。
   */
  openKey: string

  /**
   * 点组标题:开/收自己。
   */
  onToggle: (key: string) => void

  /**
   * 二级条目。
   */
  items: NavDropItem[]
}

/**
 * withOn(类名 + 当前态)的入参。
 */
export type WithOnIn = {
  /**
   * 基类(css module 值)。
   */
  base: string

  /**
   * 亮不亮。
   */
  on: boolean
}
