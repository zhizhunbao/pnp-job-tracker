'use client'
/**
 * plan 域的单元格:抽选表的通道列。走查 #297:官方通道名不许截断
 * (「Alberta Express Entry Stream – Priority Sectors (Constructio…」)——
 * 英文界面拿到的就是官方原名,我们**没有权力**给它编个短名,放不下就换行。
 * 2026-08-28 换装批自 Decision.tsx 的 stream 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { DrawCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个通道名格。
 *
 * @param r 这一行展示行。
 * @returns 通道名。
 */
export function DrawStreamCell(r: DrawCellRow) {
  return <span className={css.drawStreamCell}>{r.stream}</span>
}
