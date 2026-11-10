'use client'
/**
 * gate 域的结构:「我的档案」修改的一页表单(2026-11-07 Frank「按 Azure 的改」:原先一题一屏的向导 GateEdit 换成 Azure 式
 * 右侧编辑面板,七格同在一页,改哪格改哪格,底部「保存」一次存;docs/design/我的/我的框架-20261107.md 2.8)。
 * 状态与保存照旧走 useGateEdit(值、校验、保存链与向导同一份),只是不翻页:目标 / 身份改用直设、保存直接存。
 * 「专业」「想做的工作」两格的长清单叠一层弹框选(MajorPicker / OccRail,同向导那两屏)。
 * 同日 Frank「删了吧」:向导 GateEdit 删,整机瘦成只给本件用的 useGateForm(上面「照旧走 useGateEdit」现指它)。
 * 2026-11-09「我的」第一批:面板顶上多「从简历填写」(只填空着的,保存才入档案);长清单三格显示已选的名字,不再是「已选 N 个」。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { cssOf } from '@/components/css'
import { Button } from '@/components/button'
import { Drawer } from '@/components/drawer'
import { MajorPicker, useMajorPicker } from '@/components/majors'
import { OccRail, useOccPicker } from '@/components/quiz'
import {
  FORM_PICK_JOB, FORM_PICK_MAJOR, FORM_PICK_WORK, FORM_PRIMARY_KIND, FORM_SECONDARY_KIND, FORM_TITLE_KEY, TEXT_NONE,
} from './constants'
import { majorLinesOf, occLinesOf, occMajorOf } from './functions'
import { GateFormFields } from './gateformfields'
import { GatePick } from './gatepick'
import { useGateForm, useGatePick, useResumeFill } from './hooks'
import type { GateFormIn } from './types'
import css from './gate.module.css'

/**
 * 一页表单(右侧面板)。
 *
 * @param props 取词、档案现值、关面板与存好了。
 * @returns 面板 + 叠开的选择器。
 */
export function GateForm({ t, seed, onClose, onSaved }: GateFormIn) {
  const g = useGateForm({ seed, onClose, onSaved })
  const k = useGatePick()
  const picker = useMajorPicker({ value: g.majors, onChange: g.onMajors })
  const occ = useOccPicker({
    t, lang: g.lang, initial: g.nocs, onChange: g.setNocs, onDone: k.onDone, majorCode: occMajorOf(g.majors),
  })
  const work = useOccPicker({
    t, lang: g.lang, initial: g.workNocs, onChange: g.setWorkNocs, onDone: k.onDone, majorCode: occMajorOf(g.majors),
  })
  const f = useResumeFill({ g, onWork: work.onReplace })
  const n = {
    majors: majorLinesOf({ codes: g.majors, rows: picker.picked, lang: g.lang, marks: g.fromResume }),
    jobs: occLinesOf({ picked: occ.picked, titles: occ.titles, marks: [] }),
    works: occLinesOf({ picked: work.picked, titles: work.titles, marks: g.fromResume }),
  }
  const foot = (
    <>
      <Button kind={FORM_PRIMARY_KIND} onClick={g.edit.onSave} busy={g.edit.saving} disabled={g.edit.nameBad}>
        {t('gate.save')}
      </Button>
      <Button kind={FORM_SECONDARY_KIND} onClick={g.onClose}>{t('pf.cancel')}</Button>
      {g.edit.failKey !== TEXT_NONE && <span className={cssOf(css.fail)}>{t(g.edit.failKey)}</span>}
    </>
  )
  return (
    <>
      <Drawer title={t(FORM_TITLE_KEY)} onClose={g.onClose} foot={foot}>
        <GateFormFields g={g} k={k} t={t} n={n} f={f} />
      </Drawer>
      {k.picking === FORM_PICK_MAJOR && (
        <GatePick title={t('pf.majors')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <MajorPicker picker={picker} t={t} lang={g.lang} />
        </GatePick>
      )}
      {k.picking === FORM_PICK_JOB && (
        <GatePick title={t('pf.jobs')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <OccRail t={t} lang={g.lang} d={occ} />
        </GatePick>
      )}
      {k.picking === FORM_PICK_WORK && (
        <GatePick title={t('pf.work')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <OccRail t={t} lang={g.lang} d={work} />
        </GatePick>
      )}
    </>
  )
}
