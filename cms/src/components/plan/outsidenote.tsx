'use client'
/**
 * plan 域的结构:省外更优提示行(#302/#303 重做)。与主排序同一把尺(planRank),
 * 措辞两边对照 —— 不再裸称「更优」,竞争比并排给,搬省的账用户自己算;一键并省照旧。
 * 2026-08-28 换装批自 Decision.tsx 的 outsidePath 分支提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, TRACK_ADD_OUTSIDE_PROV } from './constants'
import { makeAddProv, outsideTextOf, provDispOf } from './functions'
import type { OutsideNoteIn } from './types'
import css from './plan.module.css'

/**
 * 渲染省外更优提示行。
 *
 * @param props 决策页整机与省外更优的那一条。
 * @returns 提示行。
 */
export function OutsideNote({ d, outside }: OutsideNoteIn) {
  const prov = provDispOf({ t: d.t, code: outside.province })
  return (
    <div className={css.outside}>
      <span className={css.outsideText}>{outsideTextOf({ t: d.t, lang: d.lang, outside })}</span>
      <Button kind={PLAIN_BTN_KIND}
        className={cssOf(css.btn)}
        onClick={makeAddProv({
          answers: d.answers, flow: d.flow, province: outside.province, event: TRACK_ADD_OUTSIDE_PROV,
        })}>
        {d.t('dp.provAdd', { jobProv: prov })}
      </Button>
    </div>
  )
}
