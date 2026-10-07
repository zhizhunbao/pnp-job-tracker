'use client'
/**
 * pane 域的定高区:弹框白卡里吃满剩下高度的那一块 —— 左右贴到白卡边、上下各一条细线,想要的高按视口定(夹上下限),
 * 白卡拉高时跟着长、放不下时缩到下限,内容长短变了白卡不跳。装一列行时区内自己滚(list),装自己会滚的件
 * (tabs 桶 RailTabs 两栏)时本区不滚;上面摆着一行已选标签(tag 桶 TagRow)时让出它的高(belowTags)。
 * 挂 data-nodrag:区里按住滚动条拖、在列表里按下不会把整个弹框拖走。
 * 2026-10-05 立(访客第 3 题要改成与第 2 题同一副左右两栏,先把第 2 题两栏外层与在搜时的单列结果收进通用桶,
 * 通用形态单一出口):形与样式自 majors 桶 majorpicker.tsx 那两个外层 div 与 majors.module.css 的
 * .majorPanes / .majorHits / .picker:has(.picked) 原样迁来。尺寸照访客向导白卡写死(见 pane.module.css 头注)。
 *
 * @author Frank
 * @time 2026-10-05 13:36:47
 */
import { paneClsOf } from './functions'
import type { PaneIn } from './types'

/**
 * 定高区。
 *
 * @param props 装不装一列行、上面有没有一行已选标签、要不要播报与区里的内容(见 PaneIn 逐格注释)。
 * @returns 定高区。
 */
export function Pane({ list, belowTags, live, children }: PaneIn) {
  return (
    <div aria-live={live} className={paneClsOf({ list, belowTags })} data-nodrag>
      {children}
    </div>
  )
}
