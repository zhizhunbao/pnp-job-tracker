/**
 * menu 域的形状:行内「⋯」更多操作菜单的 props 契约与状态整机。
 *
 * @author Frank
 * @time 2026-11-07 23:10:00
 */

/**
 * 菜单里的一项。
 */
export type MenuItem = {
  /**
   * 渲染键。
   */
  key: string

  /**
   * 显示文字(「删除」之类)。
   */
  text: string

  /**
   * 危险操作(红字,前面挂删除图标)。
   */
  danger: boolean

  /**
   * 点这一项(菜单先收起再调)。
   */
  onClick: () => void
}

/**
 * Menu 的 props。
 */
export type MenuIn = {
  /**
   * 「⋯」按钮的无障碍名与悬停提示(「更多操作」)。
   */
  label: string

  /**
   * 菜单各项。
   */
  items: MenuItem[]
}

/**
 * MenuRow 的 props。
 */
export type MenuRowIn = {
  /**
   * 这一项。
   */
  item: MenuItem

  /**
   * 收起菜单。
   */
  close: () => void
}

/**
 * 菜单根节点的 ref(按钮 + 弹出层)。
 */
export type MenuRef = React.RefObject<HTMLDivElement | null>

/**
 * 菜单的状态整机。
 */
export type MenuPanel = {
  /**
   * 开着没有。
   */
  open: boolean

  /**
   * 点「⋯」:开 / 收。
   */
  onToggle: () => void

  /**
   * 收起。
   */
  close: () => void
}

/**
 * 点一项的入参。
 */
export type PickIn = {
  /**
   * 这一项。
   */
  item: MenuItem

  /**
   * 收起菜单。
   */
  close: () => void
}
