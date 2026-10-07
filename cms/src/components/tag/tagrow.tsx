'use client'
/**
 * tag 域的已选一行:一排标签(一般是带 × 摘除钮的 pick 档 Tag)定高一行到底,放不下横着滚,名字不截断、不折行;
 * 滚动条藏起来(横向滚动条会占掉一截高,这一行的高就不定了),× 放大的点按区不被横滚区裁掉。挂 data-nodrag:
 * 横着滑这一行不会把弹框拖走。没有标签时整块别渲(由调用方判,本件不收空清单)。
 * 2026-10-05 立(访客第 3 题改左右两栏前先把第 2 题已选专业那一行收进通用桶,通用形态单一出口):
 * 形与样式自 majors 桶 majorpicked.tsx 的外层 div 与 majors.module.css 的 .picked / .picked > span 原样迁来;
 * 它在的时候下面的定高区让出同样的高,见 pane 桶 Pane 的 belowTags 格。
 *
 * 2026-10-05 Frank「这部分要不要加一个 已选 的标识」:行首多一枚灰字小标(专业「已选 2/3」、职业「已选 N 个」),
 * 不另起一行小标题 —— 这一行出现时白卡高度要不变。
 *
 * @author Frank
 * @time 2026-10-05 13:36:47
 */
import { cssOf } from '@/components/css'
import type { TagRowIn } from './types'
import css from './tag.module.css'

/**
 * 已选标签一行。
 *
 * @param props 行首灰字小标与行里的标签(见 TagRowIn)。
 * @returns 定高一行的横滚区。
 */
export function TagRow({ label, children }: TagRowIn) {
  return (
    <div className={cssOf(css.tagRow)} data-nodrag>
      <span className={cssOf(css.tagRowLabel)}>{label}</span>
      {children}
    </div>
  )
}
