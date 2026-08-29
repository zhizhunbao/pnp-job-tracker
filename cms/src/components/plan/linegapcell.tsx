'use client'
/**
 * plan 域的单元格:你的分与这一轮的线差多少。
 * 通道对不上不给差值(出那根灰横杠)—— 线是事实照摆,但「你」那一栏留空:
 * 拿别的通道的线比你的分是错的对照(2026-08-16 Frank「我的职业是 it 有必要 对比
 * 其他通道的 分数吗」)。差着的那档用灰不用红:加分项还没勾满时那个数随时会变。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 组件体内的 gapCell 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { TEXT_DASH } from './constants'
import { lineGapClsOf, lineGapShownOf, lineGapTextOf } from './functions'
import type { LineGapCellIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个差值格。
 *
 * @param props 这个省的估分与这一轮抽选。
 * @returns 差值(通道对不上就是那根横杠)。
 */
export function LineGapCell({ score, draw }: LineGapCellIn) {
  if (lineGapShownOf({ score, draw }) === false) {
    return <span className={css.lineGapNone}>{TEXT_DASH}</span>
  }
  return <span className={lineGapClsOf({ score, draw })}>{lineGapTextOf({ score, draw })}</span>
}
