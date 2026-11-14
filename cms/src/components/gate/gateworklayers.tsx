'use client'
/**
 * gate 域的结构:「做过的工作」的两层弹框(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」;
 * 自 gateform.tsx 拆出):下层是一段一个框的工作经历(GateWork),某一段点「修改」职业时上面再叠一层选职业框
 * (一段只挂一个职业,选上就关)。
 *
 * @author Frank
 * @time 2026-11-12 18:30:00
 */
import { cssOf } from '@/components/css'
import { FORM_PICK_WORK, K_WORK_OCC_TITLE } from './constants'
import { GatePick } from './gatepick'
import { GateWork } from './gatework'
import type { GateWorkLayersIn } from './types'
import { WORK_AT_NONE } from './work'
import css from './gate.module.css'

/**
 * 工作经历弹框与选职业框。
 *
 * @param props 表单整机、叠开哪个、取词、各段职业的字、选职业手柄工厂与选职业控件。
 * @returns 两层弹框(各自开着才出)。
 */
export function GateWorkLayers({ g, k, t, names, occOpenOf, rail, full }: GateWorkLayersIn) {
  const w = g.edit.w
  return (
    <>
      {k.picking === FORM_PICK_WORK && (
        <GatePick title={t('pf.work')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <div className={cssOf(css.pickBody)}>
            <GateWork g={g} t={t} names={names} occOpenOf={occOpenOf} full={full} />
          </div>
        </GatePick>
      )}
      {w.occAt !== WORK_AT_NONE && (
        <GatePick title={t(K_WORK_OCC_TITLE)} doneText={t('pf.pickDone')} onDone={w.onOccClose}>
          {rail}
        </GatePick>
      )}
    </>
  )
}
