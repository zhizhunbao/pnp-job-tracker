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

  /**
   * 链接目标(页内锚点 `#id` 之类,点了照常跳,也照样回调 onPick);null = 这一项是钮,只回调 onPick。
   */
  href: string | null

  /**
   * 子项(2026-11-07 就业把脉侧栏立,照 Fluent 2 Nav「带类别的复杂导航」,最多两层);
   * 空 = 普通一项;非空 = 这一项是类别:点了只展开 / 收起,不跳也不回调。子项不带图标(缩进对齐)。
   */
  subs: NavItem[]
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
   * 右边内容不加内衬(内容自己带正文轨,如就业把脉各段的 Band;2026-11-07 立);缺省加。
   */
  bare?: boolean

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

/**
 * NavRow(普通一项或类别下的子项)的 props。
 */
export type NavRowIn = {
  /**
   * 这一项。
   */
  item: NavItem

  /**
   * 当前项的键。
   */
  value: string

  /**
   * 点了这一项。
   */
  onPick: (key: string) => void

  /**
   * 是不是类别下的子项(子项不出图标、缩进、矮一点)。
   */
  sub: boolean
}

/**
 * NavCat(类别:点了展开 / 收起子项)的 props。
 */
export type NavCatIn = {
  /**
   * 这个类别(subs 非空)。
   */
  item: NavItem

  /**
   * 当前项的键。
   */
  value: string

  /**
   * 点了某个子项。
   */
  onPick: (key: string) => void

  /**
   * 现在是不是展开的。
   */
  open: boolean

  /**
   * 改「用户手动开合过的类别」表。
   */
  setFlips: NavFlipsSetFn
}

/**
 * 「用户手动开合过的类别」表的改写函数(React useState 的 setter 形,外部规定)。
 */
export type NavFlipsSetFn = (next: (prev: Record<string, boolean>) => Record<string, boolean>) => void

/**
 * useNavFlips 的入参。
 */
export type NavFlipsIn = {
  /**
   * 各项,按显示顺序。
   */
  items: NavItem[]

  /**
   * 当前项的键。
   */
  value: string
}

/**
 * holdingKeyOf 的入参。
 */
export type NavHoldingKeyIn = {
  /**
   * 各项,按显示顺序。
   */
  items: NavItem[]

  /**
   * 当前项的键。
   */
  value: string
}

/**
 * useNavFlips 的出参。
 */
export type NavFlipsOut = {
  /**
   * 用户手动开合过的类别:键 = 类别键,值 = 开着没有;没点过的类别不在表里(跟着当前项走)。
   */
  flips: Record<string, boolean>

  /**
   * 改这张表。
   */
  setFlips: NavFlipsSetFn
}

/**
 * makeNavFlip 的入参。
 */
export type NavFlipIn = {
  /**
   * 改「手动开合过的类别」表。
   */
  setFlips: NavFlipsSetFn

  /**
   * 点的是哪个类别。
   */
  key: string

  /**
   * 点之前开着没有(点了就翻过来)。
   */
  open: boolean
}

/**
 * flipsWithOf 的入参。
 */
export type NavFlipsWithIn = {
  /**
   * 原表。
   */
  prev: Record<string, boolean>

  /**
   * 要改的类别。
   */
  key: string

  /**
   * 改成开还是关。
   */
  open: boolean
}

/**
 * navOpenOf 的入参。
 */
export type NavOpenIn = {
  /**
   * 这个类别。
   */
  item: NavItem

  /**
   * 当前项的键。
   */
  value: string

  /**
   * 用户手动开合过的类别。
   */
  flips: Record<string, boolean>
}

/**
 * isNavHolding 的入参。
 */
export type NavHoldIn = {
  /**
   * 这个类别。
   */
  item: NavItem

  /**
   * 当前项的键。
   */
  value: string
}

/**
 * navCatClsOf 的入参。
 */
export type NavCatClsIn = {
  /**
   * 展开着没有。
   */
  open: boolean

  /**
   * 当前项在不在这个类别里。
   */
  holding: boolean
}

/**
 * navRowClsOf 的入参。
 */
export type NavRowClsIn = {
  /**
   * 是不是当前项。
   */
  on: boolean

  /**
   * 是不是子项。
   */
  sub: boolean
}

/**
 * useNavCollapse 的出参。
 */
export type NavCollapseOut = {
  /**
   * 左栏收起了没有。
   */
  collapsed: boolean

  /**
   * 点 « / » 翻转。
   */
  onFlip: () => void
}

/**
 * makeNavBoolFlip 的入参。
 */
export type NavBoolFlipIn = {
  /**
   * 布尔状态的改写函数(React useState 的 setter 形,外部规定)。
   */
  set: (next: (prev: boolean) => boolean) => void
}

/**
 * makeNavBoolSet 的入参。
 */
export type NavBoolSetIn = {
  /**
   * 布尔状态的改写函数(React useState 的 setter 形,外部规定)。
   */
  set: (next: boolean) => void

  /**
   * 设成什么。
   */
  to: boolean
}

/**
 * useNavDrawer 的出参。
 */
export type NavDrawerOut = {
  /**
   * 抽屉开着没有。
   */
  open: boolean

  /**
   * 打开抽屉。
   */
  onOpen: () => void

  /**
   * 关上抽屉。
   */
  onClose: () => void
}

/**
 * NavPick 手机分区条的 props。
 */
export type NavPickBarIn = {
  /**
   * 当前分类。
   */
  head: string

  /**
   * 当前子项;没有是空串。
   */
  sub: string

  /**
   * 抽屉开着没有。
   */
  open: boolean

  /**
   * 拉开抽屉。
   */
  onOpen: () => void
}
