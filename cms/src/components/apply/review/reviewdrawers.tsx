'use client'
/**
 * apply 桶子桶 review 的分块:右侧栏。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Drawer } from '@/components/drawer'
import { Notice } from '@/components/notice'
import {
  BTN_SECONDARY, COVER_ROWS, FILL_ONE_ROWS, FILL_ROWS, NEED_IN_RESUME, NOTICE_ERR, TEXT_NONE,
} from './constants'
import { filledTextOf, missingReqsOf } from './functions'
import { ReviewCv } from './reviewcv'
import { ReviewMailEdit } from './reviewmailedit'
import { ReviewNeed } from './reviewneed'
import type { ReviewDrawerIn } from './types'
import css from './review.module.css'

/**
 * 补充经历与修改求职信两个右侧栏。
 * 2026-11-10 任务书第 36 条(改判后):补充经历是一个空文本框加一句提示,上面只读列出没有依据的要求;
 * 存下的内容写回基础简历,再开时框里就是已存的那段。
 *
 * @param props 整机与取词。
 * @returns 打开着的那个右侧栏,或空。
 */
export function ReviewDrawers({ p, t }: ReviewDrawerIn) {
  const rows = []
  let ready = false
  if (p.review != null) {
    for (const r of missingReqsOf(p.review.reqs)) {
      let val = p.fills[String(r.id)]
      if (val == null) {
        val = TEXT_NONE
      }
      rows.push(
        <label key={r.id} className={cssOf(css.field)}>
          <span className={cssOf(css.fieldName)}>{r.jd}</span>
          <textarea className={cssOf(css.area)}
            rows={FILL_ONE_ROWS}
            value={val}
            placeholder={t('tr.fillWhat')}
            onChange={p.fillChangeOf(r.id)} />
        </label>,
      )
    }
    const text = filledTextOf({ base: p.extra, fills: p.fills, reqs: p.review.reqs })
    ready = text !== TEXT_NONE && text !== p.saved
  }
  return (
    <>
      {p.fillOpen && p.review != null && (
        <Drawer title={t('tr.fillHead')}
          onClose={p.onFillClose}
          foot={(
            <>
              <Button onClick={p.onFillSave} disabled={ready === false}>{t('tr.fillSave')}</Button>
              <Button kind={BTN_SECONDARY} onClick={p.onFillClose}>{t('pf.cancel')}</Button>
            </>
          )}>
          <div className={cssOf(css.fillHint)}>{t('tr.fillHint')}</div>
          {rows}
          {p.saved !== TEXT_NONE && (
            <label className={cssOf(css.field)}>
              <span className={cssOf(css.fieldName)}>{t('tr.fillOld')}</span>
              <textarea className={cssOf(css.area)} rows={FILL_ROWS} value={p.extra} onChange={p.onExtraText} />
            </label>
          )}
        </Drawer>
      )}
      <ReviewCv p={p} t={t} />
      <ReviewMailEdit p={p} t={t} />
      {p.editing != null && (
        <Drawer title={t('tr.editCover')}
          onClose={p.onCoverClose}
          foot={(
            <>
              <Button onClick={p.onCoverSave}>{t('gate.save')}</Button>
              <Button kind={BTN_SECONDARY} onClick={p.onCoverClose}>{t('pf.cancel')}</Button>
            </>
          )}>
          {p.err !== TEXT_NONE && <Notice kind={NOTICE_ERR}>{t(p.err)}</Notice>}
          {p.need != null && (
            <ReviewNeed r={p.need}
              other={p.need.resume}
              otherKey={NEED_IN_RESUME}
              onAi={p.onAiFix}
              busy={p.stage !== TEXT_NONE}
              t={t} />
          )}
          <textarea className={cssOf(css.area)}
            rows={COVER_ROWS}
            value={p.editing}
            onChange={p.onCoverText}
            aria-label={t('tr.editCover')} />
        </Drawer>
      )}
    </>
  )
}
