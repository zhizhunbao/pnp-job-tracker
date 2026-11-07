/**
 * nav 域的形状:侧边导航、窄屏抽屉与两栏外框的 props 契约。
 *
 * @author Frank
 * @time 2026-11-07 15:10:00
 */

/**
 * 导航里的一项。
 */
export type NavItem = {
  /**
   * 身份键(选中判定与回调都用它)。
   */
  key: string

  /**
   * 文字。
   */
  label: string

  /**
   * 文字前的图标(Fluent 2 Nav 推荐带图标;调用方从 icons 桶取)。
   */
  icon: React.ReactNode

  /**
   * 右边红色计数(未读之类);0 = 不出。
   */
  count: number
}

/**
 * Nav 的 props。
 */
export type NavIn = {
  /**
   * 各项,按显示顺序。
   */
  items: NavItem[]

  /**
   * 当前项的键。
   */
  value: string

  /**
   * 点了某一项。
   */
  onPick: (key: string) => void

  /**
   * 整块导航的无障碍名(nav 地标的 aria-label)。
   */
  ariaLabel: string
}

/**
 * NavDrawer 的 props。
 */
export type NavDrawerIn = {
  /**
   * 抽屉顶上的标题。
   */
  title: string

  /**
   * 关抽屉(点遮罩、点 ×、按 Esc)。
   */
  onClose: () => void

  /**
   * 抽屉里的内容(一般就是一个 Nav)。
   */
  children: React.ReactNode
}

/**
 * NavFrame 的 props。
 */
export type NavFrameIn = {
  /**
   * 左栏(宽屏常驻;窄屏不出,由调用方另开抽屉)。
   */
  nav: React.ReactNode

  /**
   * 右边内容。
   */
  children: React.ReactNode
}

/**
 * 点某一项的手柄工厂入参。
 */
export type NavPickIn = {
  /**
   * 点了某一项。
   */
  onPick: (key: string) => void

  /**
   * 这一项的键。
   */
  key: string
}
