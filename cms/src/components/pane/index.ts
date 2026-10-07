/**
 * pane 组件域的桶 —— 弹框白卡里的定高区(吃满剩下的高、贴白卡左右边、上下细线;装一列行时区内自己滚,
 * 上面有一行已选标签时让出它的高)。
 * 边界(2026-10-05 立):本桶答「白卡里那一块多高、贴不贴边、谁来滚」;里面摆什么(两栏、一列行)归装它的件,
 * 两栏本身归 tabs 桶 RailTabs(它只撑满外层,高由本区给),已选一行归 tag 桶 TagRow,白卡外壳与内衬归 modal 桶。
 * 对应 lib 域:无(通用件)。
 * 2026-10-05 加选择器竖排 PaneStack(搜索框、已选一行、定高区自上而下;第 2 题专业、第 3 题职业两个选择器各写一份的竖排外层并来,
 * 块间距与定高区的让高住同一个样式文件)。
 *
 * @author Frank
 * @time 2026-10-05 13:36:47
 */
export { Pane } from './pane'
export { PaneStack } from './panestack'
export type { PaneIn, PaneStackIn } from './types'
