'use client'
/**
 * 域内小件:表头一格。Frank 走查#23:表头完全显示 —— 去省略截断;#23b(2026-07-26
 * 「header 的宽度不要变」):一律不折行,表头挤不下就把标签本身收短(如「年薪(折算)」→「年薪」,
 * 折算口径挂悬停),不靠换行救。右缘那条竖线:拖动钉死本列宽 / 双击该列回归自动。
 * 操作列是普通末列,不排序。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { headClsOf, sortHintClsOf, styleOrNone } from './functions'
import type { HeadCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染表头一格。
 *
 * @param props 列键、列名、悬停说明、排序态与三个手柄。
 * @returns 一格表头。
 */
export function HeadCell({ h }: HeadCellIn) {
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 冻结列的 sticky 偏移是量出来的运行时数据(累计实宽),不是排版
    <th onClick={h.onSort} title={h.title} style={styleOrNone(h.frozen)}
      className={headClsOf({ active: h.active, sortable: h.sortable })}>
      {h.label}
      {h.sortable && <span className={sortHintClsOf(h.active)}>{h.mark}</span>}
      <span className={cssOf(css.resize)} onMouseDown={h.onResize} onDoubleClick={h.onAutoFit}
        title={h.resizeTip} />
    </th>
  )
}
