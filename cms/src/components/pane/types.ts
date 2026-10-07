/**
 * pane 域的形状:定高区的 props 契约与类名预算入参。
 * 2026-10-05 加选择器竖排 PaneStack 的 props(PaneStackIn)。
 *
 * @author Frank
 * @time 2026-10-05 13:36:47
 */

/**
 * 读屏的礼让播报档(WAI-ARIA 定死的词:内容变了念出来,不打断正在念的;本域自抄,types 不许 import)。
 */
export type PaneLive = 'polite'

/**
 * Pane(弹框白卡里的定高区)的 props(2026-10-05 自 majors 桶两栏外层与在搜时的单列结果收来)。
 */
export type PaneIn = {
  /**
   * 装一列行(真 = 区内自己滚,行文字缩回白卡内衬里、行线贯通,如在搜时的单列结果;
   * 假 = 装一个自己会滚的件,本区不滚、内容贴边铺满,如 tabs 桶 RailTabs 两栏)。
   */
  list: boolean

  /**
   * 上面摆着一行已选标签(tag 桶 TagRow):真 = 定高让出它占的高,白卡总高与没有那一行时一样(调用方按那一行渲不渲递)。
   */
  belowTags: boolean

  /**
   * 内容变了念出来(读屏礼让播报;可省 = 不播报,如两栏 —— 换大类不必念)。
   */
  live?: PaneLive

  /**
   * 区里的内容。
   */
  children: React.ReactNode
}

/**
 * PaneStack(选择器竖排:搜索框、已选一行、定高区自上而下)的 props(2026-10-05 自 majors 桶 MajorPicker 与 quiz 桶 OccRail
 * 各写一份的竖排外层收来)。
 */
export type PaneStackIn = {
  /**
   * 调用方叠在竖排上的类:只用来挂各题自己的左栏宽(--rail-w,往下继承给 tabs 桶 RailTabs;如 majors.module.css 的 .picker),
   * 竖排本身的长相仍归本域 —— 传别的类等于绕过竖排规格。
   */
  railCls: string

  /**
   * 竖排里的几块(搜索框、已选一行、定高区)。
   */
  children: React.ReactNode
}

/**
 * paneClsOf 的入参:装不装一列行、上面有没有一行已选标签。
 */
export type PaneClsIn = {
  /**
   * 装一列行(见 PaneIn 的同名格)。
   */
  list: boolean

  /**
   * 上面摆着一行已选标签(见 PaneIn 的同名格)。
   */
  belowTags: boolean
}
