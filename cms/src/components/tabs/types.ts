/**
 * tabs 域的形状:选项卡三件(Tabs/TabPanel/SectionTabs)的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 一个页签的数据。
 */
export type TabItem = {
  /**
   * 页签身份键(也进 aria id)。
   */
  key: string

  /**
   * 页签文字。
   */
  label: string

  /**
   * 右上角小字(条数之类);没有就不出。
   */
  badge?: string | number
}

/**
 * Tabs 的 props。
 */
export type TabsIn = {
  /**
   * 页签清单。
   */
  items: TabItem[]

  /**
   * 当前选中的 key。
   */
  value: string

  /**
   * 切换回调(参数是目标 key)。
   */
  onChange: (key: string) => void

  /**
   * 这组选项卡的无障碍名(读屏报「xx,第 2 项,共 4 项」)。
   */
  ariaLabel: string

  /**
   * 与面板 id 对应(aria-controls);同页多组选项卡时各给各的前缀。
   */
  idPrefix?: string
}

/**
 * makeTabKeys 的入参。
 */
export type TabKeysIn = {
  /**
   * 页签清单。
   */
  items: TabItem[]

  /**
   * 当前选中的 key。
   */
  value: string

  /**
   * 切换回调。
   */
  onChange: (key: string) => void

  /**
   * 按 key 找页签元素(焦点要跟着切换走);找不到给 null。
   */
  focusOf: (key: string) => HTMLButtonElement | null
}

/**
 * makeTabKeys 交回的键盘手柄。
 */
export type TabKeysFn = (e: React.KeyboardEvent) => void

/**
 * TabPanel 的 props。
 */
export type TabPanelIn = {
  /**
   * 对应页签的 key。
   */
  tabKey: string

  /**
   * 是否当前面(false = hidden,不卸载 —— 面板里挂着答案存本地 state 的部件时,
   * 卸载一次答案就没了,08-12 分值卡弹窗化那次的坑)。
   */
  active: boolean

  /**
   * id 前缀,与 Tabs 的一致。
   */
  idPrefix?: string

  /**
   * 面板内容。
   */
  children: React.ReactNode
}

/**
 * 二级 tab 条的一个页签。
 */
export type SectionTab = {
  /**
   * 去处(当前页不渲 href)。
   */
  href: string

  /**
   * 页签文字。
   */
  label: React.ReactNode

  /**
   * 是否当前页(当前页 = span 不可点)。
   */
  active?: boolean

  /**
   * 还没开的面(渲灰字不可点;2026-09-04 pte「模考」先例)。
   */
  disabled?: boolean
}

/**
 * 模块色档(默认主蓝;teal = 移民动态/时间线的青)。
 */
export type SectionTone = 'teal'

/**
 * SectionTabs 的 props。
 */
export type SectionTabsIn = {
  /**
   * 页签清单。
   */
  tabs: SectionTab[]

  /**
   * 模块色档(可省/null = 主蓝)。
   */
  tone?: SectionTone | null
}

/**
 * 无参无返的钮点击手柄形状(页签点击是这一形)。
 */
export type ClickFn = () => void

/**
 * 收页签元素的回调 ref 形状(React 挂载时交回元素、卸载时交回 null)。
 */
export type TabRefFn = (el: HTMLButtonElement | null) => void

/**
 * useTabKeys(页签焦点机)的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 Tabs 体内的 focusOf / onKey / setRef 三枚一并迁出)。
 */
export type TabKeysHookIn = {
  /**
   * 页签清单。
   */
  items: TabItem[]

  /**
   * 当前选中的 key。
   */
  value: string

  /**
   * 切换回调。
   */
  onChange: (key: string) => void
}

/**
 * useTabKeys 交回的机器面板(页签元素表整台机器自己拿着,不出 hooks 文件 ——
 * 渲染期把 ref 交给普通函数会被 react-hooks/refs 拦,手法同 table 的 thRefOf)。
 */
export type TabKeysHookOut = {
  /**
   * 收表页签元素的回调 ref 工厂(逐枚页签取一枚)。
   */
  refOf: (key: string) => TabRefFn

  /**
   * 键盘导航手柄(挂到每个页签的 onKeyDown)。
   */
  onKey: TabKeysFn
}

/**
 * makeTabClick 的入参(2026-08-26 同批:原 Tabs 循环体内的 click 迁出)。
 */
export type TabClickIn = {
  /**
   * 切换回调。
   */
  onChange: (key: string) => void

  /**
   * 这一枚页签的身份键。
   */
  key: string
}
