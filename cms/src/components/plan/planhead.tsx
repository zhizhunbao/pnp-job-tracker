'use client'
/**
 * plan 域的结构:初评卡的标题行。#325 岗位语境零解释句(2026-08-16 Frank
 * 「解释类的文字都删了」):错位信息由条件格的 ⚠ 小标 + 按钮自身文案承载;
 * 动作钮并进标题行右上角(同日「这个放到右上角」)。
 * 2026-08-28 换装批自 Decision.tsx 的初评卡标题提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CLS_SEP, PLAIN_BTN_KIND, TEXT_NONE, TRACK_ADD_JOB_PROV, TRACK_REPICK } from './constants'
import { makeActTrack, makeAddProv, planHeadClsOf, provDispOf, repickHrefOf } from './functions'
import type { PlanHeadIn } from './types'
import css from './plan.module.css'

/**
 * 渲染初评卡的标题行。
 *
 * @param props 决策页整机。
 * @returns 标题行。
 */
export function PlanHead({ d }: PlanHeadIn) {
  const coarse = d.view.plan.coarse
  return (
    <h2 className={planHeadClsOf({ coarse })}>
      {d.t('dp.planTitle')}
      {coarse && <span className={css.planCoarseTag}>{d.t('dp.planCoarse')}</span>}
      {d.tvJob != null && (
        <span className={css.planActions}>
          {d.view.cond.needJobProv && (
            <Button kind={PLAIN_BTN_KIND}
              className={cssOf(css.btn)}
              onClick={makeAddProv({
                answers: d.answers, flow: d.flow, province: d.tvJob.province, event: TRACK_ADD_JOB_PROV,
              })}>
              {d.t('dp.provAdd', { jobProv: provDispOf({ t: d.t, code: d.tvJob.province }) })}
            </Button>
          )}
          {d.view.cond.occMismatch && (
            <LinkButton href={repickHrefOf({ bands: d.answers.bands })}
              onClick={makeActTrack({ event: TRACK_REPICK, rowKey: TEXT_NONE })}
              className={cssOf(css.btn) + CLS_SEP + cssOf(css.btnLink)}>
              {d.t('dp.repick')}
            </LinkButton>
          )}
        </span>
      )}
    </h2>
  )
}
