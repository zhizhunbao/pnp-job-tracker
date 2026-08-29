'use client'
/**
 * plan 域的单元格:初评表的竞争列。试点行(RCIP/FCIP)无 EOI 池,原「—」换社区名额状态
 * (2026-08-16 Frank「不是有比名额竞争更准确的数据吗」);两件事都要说(同日
 * 「RCIP 先到先得的列哪去了」):发放规则是主文案,官网公布的数字做灰字小注 ——
 * 先前按优先级只显一个,ON 有 153 个剩余名额就把「先到先得」顶没了,
 * 而那正是决定「要不要马上投」的那条规则。
 * 2026-08-28 换装批自 Decision.tsx 的 compCell 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { TEXT_NONE } from './constants'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个竞争格。
 *
 * @param r 这一行展示行。
 * @returns 主文案(带灰字小注),或者灰横杠。
 */
export function PlanCompCell(r: PlanCellRow) {
  if (r.text.comp === TEXT_NONE) {
    return <DashText />
  }
  if (r.text.compSub === TEXT_NONE) {
    return <span className={css.num}>{r.text.comp}</span>
  }
  return (
    <span className={css.compStack}>
      <span className={css.num}>{r.text.comp}</span>
      <span className={css.compSub}>{r.text.compSub}</span>
    </span>
  )
}
