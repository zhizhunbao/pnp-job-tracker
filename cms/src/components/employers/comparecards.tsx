'use client'
/**
 * 对比页的手机卡片流(E8-08 #121:≤640 一家雇主一张卡)。它是把桌面那张转置表
 * 再转一次:原先的列头(雇主)变成卡标题,原先的维度行变成卡里的键值行 ——
 * 维度数组一份两处复用,零双写。
 * 2026-08-27 换装批自 Compare.tsx 的卡片段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { COMPARE_CARDS_CLS } from './constants'
import { CompareCard } from './comparecard'
import type { CompareViewIn } from './types'

/**
 * 对比页手机卡片流。
 *
 * @param props 展示行与维度行(见 CompareViewIn 逐格注释)。
 * @returns 一家一张卡。
 */
export function CompareCards({ rows, dims }: CompareViewIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<CompareCard key={r.key} r={r} dims={dims} />)
  }
  return (
    <div className={COMPARE_CARDS_CLS}>{cards}</div>
  )
}
