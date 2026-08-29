'use client'
/**
 * plan 域的结构:竞争卡的年份筛选(2026-08-14 Frank「加上年份筛选」
 * 「看 2024 2025 2026 不同年份」)。点选切年,再点同一个年份回现行口径
 * (现行 = 存量最新 ÷ 当年名额的比值表);默认停在 2025(2026-08-15 Frank
 * 「默认选择 2025 吧」——最近一个名额与流量都齐的年份)。
 * 2026-08-28 换装批自 Decision.tsx 的年份 chips 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button } from '@/components/button'
import { BTN_TYPE, COMP_YEARS, PLAIN_BTN_KIND } from './constants'
import { yearChipClsOf } from './functions'
import type { YearChipsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染年份筛选。
 *
 * @param props 竞争卡年份筛选面板。
 * @returns 年份 chips。
 */
export function YearChips({ compYear }: YearChipsIn) {
  const chips = []
  for (const y of COMP_YEARS) {
    chips.push(
      <Button key={y} type={BTN_TYPE} kind={PLAIN_BTN_KIND}
        className={yearChipClsOf({ picked: compYear.year === y })}
        onClick={compYear.pickOf(y)}>
        {y}
      </Button>,
    )
  }
  return <div className={css.chipRow}>{chips}</div>
}
