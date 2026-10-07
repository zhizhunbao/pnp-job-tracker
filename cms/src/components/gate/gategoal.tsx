'use client'
/**
 * 访客向导第一题「你现在的目标是?」:两张整宽大卡(chip 桶 ChipTile 的 card 形,图标在左)—— 找工作(公文包)、拿 PR(证件)。
 * 点了直接进下一题,没有「下一步」钮(钮区只剩「跳过这步」)。两张的图标各不相同,逐张写,不走值表循环。
 * 2026-10-04 访客四题改版立(原第一题是借首访向导单选行的两枚胶囊)。
 * 同日收口:点选手柄借 profile 桶的 makeOptPick(「点了报值」全站一份)。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { ChipTile } from '@/components/chip'
import { cssOf } from '@/components/css'
import { IconBriefcase, IconIdCard } from '@/components/icons'
import { makeOptPick } from '@/components/profile'
import { GOAL_JOBS, GOAL_JOBS_KEY, GOAL_PR, GOAL_PR_KEY, TILE_CARD } from './constants'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 目标题的两张大卡。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 一列两张大卡。
 */
export function GateGoal({ g, t }: GatePartIn) {
  return (
    <div className={cssOf(css.cards)}>
      <ChipTile shape={TILE_CARD}
        icon={<IconBriefcase />}
        active={g.goal === GOAL_JOBS}
        onClick={makeOptPick({ value: GOAL_JOBS, onPick: g.onGoal })}>
        {t(GOAL_JOBS_KEY)}
      </ChipTile>
      <ChipTile shape={TILE_CARD}
        icon={<IconIdCard />}
        active={g.goal === GOAL_PR}
        onClick={makeOptPick({ value: GOAL_PR, onPick: g.onGoal })}>
        {t(GOAL_PR_KEY)}
      </ChipTile>
    </div>
  )
}
