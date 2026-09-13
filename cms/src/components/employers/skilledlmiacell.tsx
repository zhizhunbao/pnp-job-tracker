'use client'
/**
 * 域内哑单元格:雇主板「技能类 LMIA」列 —— 桶内 TEER 0-3 获批份数(青绿粗体;0 渲横杠)+ 最近获批季灰注。
 * 🔴 口径:技能类才是证据,裸 LMIA 总量永不入板(农业/海产水量霸榜的老病根);历史事实 ≠ 担保承诺。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染技能类 LMIA 格。
 *
 * @param r 这一行的展示行。
 * @returns 份数 + 季度灰注,或灰色横杠。
 */
export function SkilledLmiaCell(r: EmployerCellRow) {
  return (
    <div>
      <DashText v={r.lmia} />
      {r.lmiaNote !== TEXT_NONE && <span className={css.sub}>{r.lmiaNote}</span>}
    </div>
  )
}
