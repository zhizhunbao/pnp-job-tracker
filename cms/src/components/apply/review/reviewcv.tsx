'use client'
/**
 * apply 桶子桶 review 的分块:修改简历的右侧栏(2026-11-10 任务书第 33 条)。
 * 能改简介、每段工作的要点和技能;职位、公司和年份只显示,改这些等于改时间线。草稿关了栏也留着,存了才清。
 *
 * @author Frank
 * @time 2026-11-10 21:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Drawer } from '@/components/drawer'
import { Notice } from '@/components/notice'
import { BTN_SECONDARY, CV_ROWS, NEED_IN_COVER, NOTICE_ERR, TEXT_NONE } from './constants'
import { ReviewNeed } from './reviewneed'
import { cvHeadOf } from './cv'
import type { ReviewDrawerIn } from './types'
import css from './review.module.css'

/**
 * 修改简历的右侧栏。
 *
 * @param props 整机与取词。
 * @returns 开着时的右侧栏,否则空。
 */
export function ReviewCv({ p, t }: ReviewDrawerIn) {
  if (p.cvOpen === false || p.cvDraft == null) {
    return null
  }
  const jobs = []
  for (const [i, w] of p.cvDraft.work.entries()) {
    jobs.push(
      <label key={i} className={cssOf(css.field)}>
        <span className={cssOf(css.fieldName)}>{cvHeadOf(w)}</span>
        <textarea className={cssOf(css.area)} rows={CV_ROWS} value={w.desc} onChange={p.cvDescOf(i)} />
      </label>,
    )
  }
  return (
    <Drawer title={t('tr.editResume')}
      onClose={p.onResumeClose}
      foot={(
        <>
          <Button onClick={p.onResumeSave} disabled={p.cvDraft === p.cv}>{t('gate.save')}</Button>
          <Button kind={BTN_SECONDARY} onClick={p.onResumeClose}>{t('pf.cancel')}</Button>
        </>
      )}>
      {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{t(p.err)}</Notice>}
      {p.need != null && (
        <ReviewNeed r={p.need}
          other={p.need.cover}
          otherKey={NEED_IN_COVER}
          onAi={p.onAiFix}
          busy={p.stage !== TEXT_NONE}
          t={t} />
      )}
      <div className={cssOf(css.fillHint)}>{t('tr.cvHint')}</div>
      <label className={cssOf(css.field)}>
        <span className={cssOf(css.fieldName)}>{t('tr.cvSummary')}</span>
        <textarea className={cssOf(css.area)} rows={CV_ROWS} value={p.cvDraft.summary} onChange={p.onCvSummary} />
      </label>
      {jobs}
      <label className={cssOf(css.field)}>
        <span className={cssOf(css.fieldName)}>{t('tr.cvSkills')}</span>
        <textarea className={cssOf(css.area)} rows={CV_ROWS} value={p.cvDraft.skills} onChange={p.onCvSkills} />
      </label>
    </Drawer>
  )
}
