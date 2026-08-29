'use client'
/**
 * plan 域的小件:「你的条件」下拉里的一个选项。官方档位那几格的分值跟在原文后面,
 * 好让用户核对我们匹的是哪一档。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的 option 循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import type { ScoreOptionItemIn } from './types'

/**
 * 渲染一个下拉选项。
 *
 * @param props 这一项。
 * @returns 选项。
 */
export function ScoreOptionItem({ o }: ScoreOptionItemIn) {
  return <option value={o.value}>{o.text}</option>
}
