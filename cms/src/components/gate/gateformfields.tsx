'use client'
/**
 * gate 域的结构:一页表单的七格(docs/design/我的/我的框架-20261107.md 2.8):目标(两段钮)、专业与想做的工作(已选几个 +
 * 「修改」叠开选择器)、所在地(省下拉 + 城市)、身份(下拉,选填)、教育经历(最近两段,选填)、英文姓名。
 * 城市、教育经历、英文姓名三格直接用向导里同一个件(GateCities / GateEdu / GateName),值与校验同一份。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { Button, SegGroup } from '@/components/button'
import { makeOptPick } from '@/components/profile'
import { Select } from '@/components/select'
import { Tag } from '@/components/tag'
import {
  FIT_WHOS, FORM_NONE_KEY, FORM_SEG_KIND, FROM_NAME, FROM_TAG_KEY, FROM_TAG_V, GOAL_JOBS, GOAL_JOBS_KEY, GOAL_PR,
  GOAL_PR_KEY,
  MATCH_EDU, MATCH_WORK, MODE_DEFAULT, MODE_STRICT,
} from './constants'
import { formProvOptsOf, isFromResume, makeProvLabel, makeWhoLabel } from './functions'
import { GateCities } from './gatecities'
import { GateEdu } from './gateedu'
import { GateField } from './gatefield'
import { GateName } from './gatename'
import { GatePicked } from './gatepicked'
import { GateResumeFill } from './gateresumefill'
import type { GateFormFieldsIn } from './types'

/**
 * 一页表单的七格。
 *
 * @param props 表单状态、叠开选择器的手柄与取词。
 * @returns 七格。
 */
export function GateFormFields({ g, k, t, n, f }: GateFormFieldsIn) {
  return (
    <>
      <GateResumeFill f={f} t={t} />
      <GateField label={t('pf.goal')}>
        <SegGroup>
          <Button kind={FORM_SEG_KIND} active={g.goal === GOAL_JOBS}
            onClick={makeOptPick({ value: GOAL_JOBS, onPick: g.edit.setGoal })}>{t(GOAL_JOBS_KEY)}</Button>
          <Button kind={FORM_SEG_KIND} active={g.goal === GOAL_PR}
            onClick={makeOptPick({ value: GOAL_PR, onPick: g.edit.setGoal })}>{t(GOAL_PR_KEY)}</Button>
        </SegGroup>
      </GateField>
      <GateField label={t('pf.majors')}>
        <GatePicked lines={n.majors} onEdit={k.onMajor} t={t} />
      </GateField>
      <GateField label={t('pf.jobs')}>
        <GatePicked lines={n.jobs} onEdit={k.onJob} t={t} />
      </GateField>
      <GateField label={t('pf.work')}>
        <GatePicked lines={n.works} onEdit={k.onWork} t={t} />
      </GateField>
      <GateField label={t('pf.where')}>
        <Select value={g.provActive} onChange={g.onProv} opts={formProvOptsOf()} all={t(FORM_NONE_KEY)}
          labelOf={makeProvLabel({ t })} />
        <GateCities g={g} t={t} />
      </GateField>
      <GateField label={t('pf.who')} hint={t('pf.optWho')}>
        <Select value={g.edit.who} onChange={g.edit.setWho} opts={FIT_WHOS} all={t(FORM_NONE_KEY)}
          labelOf={makeWhoLabel({ t })} />
      </GateField>
      <GateField label={t('pf.edu')} hint={t('pf.optEdu')}>
        <GateEdu g={g} t={t} />
      </GateField>
      <GateField label={t('pf.matchBy')}>
        <SegGroup>
          <Button kind={FORM_SEG_KIND} active={g.edit.matchBy !== MATCH_EDU}
            onClick={makeOptPick({ value: MATCH_WORK, onPick: g.edit.setMatchBy })}>{t('pf.byWork')}</Button>
          <Button kind={FORM_SEG_KIND} active={g.edit.matchBy === MATCH_EDU}
            onClick={makeOptPick({ value: MATCH_EDU, onPick: g.edit.setMatchBy })}>{t('pf.byEdu')}</Button>
        </SegGroup>
      </GateField>
      <GateField label={t('pf.matchMode')}>
        <SegGroup>
          <Button kind={FORM_SEG_KIND} active={g.edit.matchMode !== MODE_STRICT}
            onClick={makeOptPick({ value: MODE_DEFAULT, onPick: g.edit.setMatchMode })}>{t('pf.modeDefault')}</Button>
          <Button kind={FORM_SEG_KIND} active={g.edit.matchMode === MODE_STRICT}
            onClick={makeOptPick({ value: MODE_STRICT, onPick: g.edit.setMatchMode })}>{t('pf.modeStrict')}</Button>
        </SegGroup>
      </GateField>
      <GateField label={t('pf.name')} hint={t('pf.optName')}>
        <GateName g={g} t={t} />
        {isFromResume({ marks: g.fromResume, field: FROM_NAME, value: g.edit.name.trim() }) && (
          <Tag variant={FROM_TAG_V}>{t(FROM_TAG_KEY)}</Tag>
        )}
      </GateField>
    </>
  )
}
