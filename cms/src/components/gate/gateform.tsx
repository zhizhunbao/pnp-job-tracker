'use client'
/**
 * gate 域的结构:「我的档案」修改的一页表单(2026-11-07 Frank「按 Azure 的改」:原先一题一屏的向导 GateEdit 换成 Azure 式
 * 右侧编辑面板,七格同在一页,改哪格改哪格,底部「保存」一次存;docs/design/我的/我的框架-20261107.md 2.8)。
 * 状态与保存照旧走 useGateEdit(值、校验、保存链与向导同一份),只是不翻页:目标 / 身份改用直设、保存直接存。
 * 「专业」「想做的工作」两格的长清单叠一层弹框选(MajorPicker / OccRail,同向导那两屏)。
 * 同日 Frank「删了吧」:向导 GateEdit 删,整机瘦成只给本件用的 useGateForm(上面「照旧走 useGateEdit」现指它)。
 * 2026-11-12 Frank「这个也需要弹框吧」「这个也弹框修改」:所在地、教育经历两格同样叠一层弹框改(GateWhere / GateEdu)。
 * 2026-11-09「我的」第一批:面板顶上多「从简历填写」(只填空着的,保存才入档案);长清单三格显示已选的名字,不再是「已选 N 个」。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」:「做过的工作」的弹框从选职业清单换成一段一个框
 * (GateWork);每段的职业点开再叠一层选职业框(一段只挂一个职业,选上就关)。原先那只选职业控件留着只查名字,不再露面。
 * 同日 Frank「教育经历 和 专业是不是重复了」:「专业」那一格与它的弹框撤,专业在教育经历弹框的每一段里选
 * (点「修改」再叠一层专业选择框,一段只挂一个);原先那只专业选择器留着只查名字。
 * 同日 Frank「最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」:面板末段多「生成简历」(GateCvGen,在七格件里),
 * 生成完叠预览框(GateCvPreview),额度用完叠升级框。
 *
 * @author Frank
 * @time 2026-11-07 19:00:00
 */
import { cssOf } from '@/components/css'
import { Button } from '@/components/button'
import { Drawer } from '@/components/drawer'
import { MajorPicker, useMajorPicker } from '@/components/majors'
import { UpgradeModal } from '@/components/pricing'
import { OccRail, useOccPicker } from '@/components/quiz'
import {
  FORM_PICK_EDU, FORM_PICK_JOB, FORM_PICK_WHERE, FORM_PRIMARY_KIND,
  FORM_SECONDARY_KIND, FORM_TITLE_KEY, K_CV_REASON, TEXT_NONE,
} from './constants'
import { EDU_AT_NONE } from './edu'
import {
  dropCodes, eduLinesOf, eduMajorAtOf, majorNamesOf, occLinesOf, occMajorOf, whereLinesOf,
} from './functions'
import { GateEdu } from './gateedu'
import { GateFormFields } from './gateformfields'
import { GatePick } from './gatepick'
import { GateWhere } from './gatewhere'
import { GateWorkLayers } from './gateworklayers'
import { GateCvPreview } from './gatecvpreview'
import { useCvGen, useGateForm, useGatePick, useResumeFill, useSchoolSearch, useWorkSync } from './hooks'
import { makeWorkOccOpenOf, workLinesOf, workNamesOf } from './work'
import type { GateFormIn } from './types'
import css from './gate.module.css'

/**
 * 一页表单(右侧面板)。
 *
 * @param props 取词、档案现值、关面板与存好了。
 * @returns 面板 + 叠开的选择器。
 */
export function GateForm({ t, seed, onClose, onSaved, autoFill = false }: GateFormIn) {
  const g = useGateForm({ seed, onClose, onSaved })
  const k = useGatePick()
  const picker = useMajorPicker({ value: g.majors, onChange: dropCodes })
  const em = g.edit.em
  const mOne = useMajorPicker({ value: eduMajorAtOf({ rows: g.edit.edu, at: em.at }), onChange: em.onPick })
  const majors = majorNamesOf({ rows: g.edit.edu, picked: picker.picked, lang: g.lang })
  const sch = useSchoolSearch({ rows: g.edit.edu, setRows: g.edit.setEdu, lang: g.lang })
  const occ = useOccPicker({
    t, lang: g.lang, initial: g.nocs, onChange: g.setNocs, onDone: k.onDone, majorCode: occMajorOf(g.majors),
  })
  const w = g.edit.w
  const work = useOccPicker({ t, lang: g.lang, initial: g.workNocs, onDone: k.onDone, majorCode: occMajorOf(g.majors) })
  const one = useOccPicker({
    t, lang: g.lang, initial: [], onChange: w.onWorkOcc, onDone: w.onOccClose, majorCode: occMajorOf(g.majors),
  })
  useWorkSync({ nocs: g.workNocs, onReplace: work.onReplace })
  const f = useResumeFill({ g, auto: autoFill })
  const c = useCvGen({ g })
  const names = workNamesOf({ rows: w.work, titles: work.titles })
  const n = {
    jobs: occLinesOf({ picked: occ.picked, titles: occ.titles, marks: [] }),
    works: workLinesOf({ rows: w.work, names, marks: g.fromResume, t }),
    where: whereLinesOf({ prov: g.provActive, city: g.cities.city, opts: g.cities.opts, t }),
    edu: eduLinesOf({ rows: g.edit.edu, majors, t }),
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
        <GateFormFields g={g} k={k} t={t} n={n} f={f} c={c} />
      </Drawer>
      {k.picking === FORM_PICK_JOB && (
        <GatePick title={t('pf.jobs')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <OccRail t={t} lang={g.lang} d={occ} />
        </GatePick>
      )}
      <GateWorkLayers g={g} k={k} t={t} names={names} rail={<OccRail t={t} lang={g.lang} d={one} />}
        occOpenOf={makeWorkOccOpenOf({ rows: w.work, setAt: w.setOccAt, onReplace: one.onReplace })} />
      {k.picking === FORM_PICK_WHERE && (
        <GatePick title={t('pf.where')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <GateWhere g={g} t={t} />
        </GatePick>
      )}
      {c.doc != null && <GateCvPreview c={c} doc={c.doc} t={t} />}
      {c.upgrade && <UpgradeModal t={t} onClose={c.onUpgradeClose} reason={t(K_CV_REASON)} />}
      {k.picking === FORM_PICK_EDU && (
        <GatePick title={t('pf.edu')} doneText={t('pf.pickDone')} onDone={k.onDone}>
          <div className={cssOf(css.pickBody)}>
            <GateEdu g={g} t={t} majors={majors} sch={sch} />
          </div>
        </GatePick>
      )}
      {em.at !== EDU_AT_NONE && (
        <GatePick title={t('pf.majors')} doneText={t('pf.pickDone')} onDone={em.onClose}>
          <MajorPicker picker={mOne} t={t} lang={g.lang} />
        </GatePick>
      )}
    </>
  )
}
