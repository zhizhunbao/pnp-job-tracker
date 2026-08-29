'use client'
/**
 * plan 域的结构:该职业分省竞争卡的职业切换(2026-08-14 Frank「需要分职业吧」)——
 * 选了几个职业就给几个 chip,单职业不渲(一颗孤 chip 只是噪音);
 * 只切这张表的查询,不动全页职业语境(分值卡/判定的职业不跟着跳)。
 * 2026-08-28 换装批自 Decision.tsx 的职业 chips 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button } from '@/components/button'
import { BTN_TYPE, PLAIN_BTN_KIND } from './constants'
import { makeOccPickOf, occChipClsOf, occNameOf, occTargetOf } from './functions'
import type { OccChipsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染职业切换 chips。
 *
 * @param props 决策页整机。
 * @returns 职业 chips。
 */
export function OccChips({ d }: OccChipsIn) {
  const target = occTargetOf({ noc: d.answers.noc, occNoc: d.occComp.noc })
  const pickOf = makeOccPickOf({ setNoc: d.occComp.setNoc })
  const chips = []
  for (const code of d.answers.bands.nocs) {
    chips.push(
      <Button key={code} type={BTN_TYPE} kind={PLAIN_BTN_KIND}
        className={occChipClsOf({ picked: target === code })}
        onClick={pickOf(code)}>
        {occNameOf({ t: d.t, lang: d.lang, code, titles: d.titles.titles })}
      </Button>,
    )
  }
  return <div className={css.chipRow}>{chips}</div>
}
