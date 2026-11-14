'use client'
/**
 * gate 域的结构:一页表单的七格(docs/design/我的/我的框架-20261107.md 2.8):目标(两段钮)、专业与想做的工作(已选几个 +
 * 「修改」叠开选择器)、所在地(省下拉 + 城市)、身份(下拉,选填)、教育经历(最近两段,选填)、英文姓名。
 * 城市、教育经历、英文姓名三格直接用向导里同一个件(GateCities / GateEdu / GateName),值与校验同一份。
 * 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:匹配依据、匹配模式两排两段钮
 * 并成一只「匹配规则」下拉(与所在地同一个下拉件,四项),存的还是那两格。
 * 2026-11-12 Frank「这个也需要弹框吧」「这个也弹框修改」:所在地、教育经历两格也改成和专业同形 —— 面板里只摆摘要加「修改」,
 * 省下拉加城市区(GateWhere)、教育经历几段(GateEdu)挪进叠开的弹框(见 gateform.tsx)。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历」:英文姓名后面多电话、链接、技能三格(GateCvFields)。
 * 同日 Frank「教育经历 和 专业是不是重复了」:「专业」那一格撤,专业并进教育经历的每一段(在教育经历弹框里选)。
 * 2026-11-13 Frank「档案的内容 只用来 匹配工作和通道」「生成简历需要填的内容不要放到修改档案那里」:电话、链接、技能三格
 * 与末段「生成简历」搬去生成简历弹框(GateCvBox),这里不再有。
 * 同日 Frank「一起修」:身份、教育经历两格标签后的灰字(「选填,用来算我的通道」「选填,最近两段」)撤 ——
 * 11-12 定了网站上不加解释,后一句还和实际能填的段数对不上。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { Button, SegGroup } from '@/components/button'
import { makeOptPick } from '@/components/profile'
import { Select } from '@/components/select'
import {
  FIT_WHOS, FORM_NONE_KEY, FORM_SEG_KIND, GOAL_JOBS, GOAL_JOBS_KEY, GOAL_PR,
  GOAL_PR_KEY,
  RULE_OPTS,
} from './constants'
import { makeRuleLabel, makeWhoLabel } from './functions'
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
      <GateResumeFill f={f} t={t} label={t('pf.goal')}>
        <SegGroup>
          <Button kind={FORM_SEG_KIND} active={g.goal === GOAL_JOBS}
            onClick={makeOptPick({ value: GOAL_JOBS, onPick: g.edit.setGoal })}>{t(GOAL_JOBS_KEY)}</Button>
          <Button kind={FORM_SEG_KIND} active={g.goal === GOAL_PR}
            onClick={makeOptPick({ value: GOAL_PR, onPick: g.edit.setGoal })}>{t(GOAL_PR_KEY)}</Button>
        </SegGroup>
      </GateResumeFill>
      <GateField label={t('pf.jobs')}>
        <GatePicked lines={n.jobs} onEdit={k.onJob} t={t} />
      </GateField>
      <GateField label={t('pf.work')}>
        <GatePicked lines={n.works} onEdit={k.onWork} t={t} />
      </GateField>
      <GateField label={t('pf.where')}>
        <GatePicked lines={n.where} onEdit={k.onWhere} t={t} />
      </GateField>
      <GateField label={t('pf.who')}>
        <Select value={g.edit.who} onChange={g.edit.setWho} opts={FIT_WHOS} all={t(FORM_NONE_KEY)}
          labelOf={makeWhoLabel({ t })} />
      </GateField>
      <GateField label={t('pf.edu')}>
        <GatePicked lines={n.edu} onEdit={k.onEdu} t={t} />
      </GateField>
      <GateField label={t('pf.rule')}>
        <Select value={g.edit.rule} onChange={g.edit.onRule} opts={RULE_OPTS} all={t('pf.rule.work')}
          labelOf={makeRuleLabel({ t })} />
      </GateField>
      <GateField label={t('pf.name')} hint={t('pf.optName')}>
        <GateName g={g} t={t} />
      </GateField>
    </>
  )
}
