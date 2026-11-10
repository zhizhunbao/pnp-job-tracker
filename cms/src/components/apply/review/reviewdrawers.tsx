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
import { BTN_SECONDARY, COVER_ROWS } from './constants'
import { factTextOf, filledFactsOf, missingReqsOf } from './functions'
import { ReviewFillRow } from './reviewfillrow'
import type { ReviewDrawerIn } from './types'
import css from './review.module.css'

/**
 * 补充经历与修改求职信两个右侧栏。
 *
 * @param props 整机与取词。
 * @returns 打开着的那个右侧栏,或空。
 */
export function ReviewDrawers({ p, t }: ReviewDrawerIn) {
  const rows = []
  let ready = false
  if (p.review != null) {
    for (const r of missingReqsOf(p.review.reqs)) {
      rows.push(
        <ReviewFillRow key={r.id}
          r={r}
          value={factTextOf({ facts: p.facts, id: r.id })}
          hint={t('tr.fillWhat')}
          onChange={p.factOf(r.id)} />,
      )
    }
    ready = Object.keys(filledFactsOf({ reqs: p.review.reqs, facts: p.facts })).length > 0
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
        </Drawer>
      )}
      {p.editing != null && (
        <Drawer title={t('tr.editCover')}
          onClose={p.onCoverClose}
          foot={(
            <>
              <Button onClick={p.onCoverSave}>{t('gate.save')}</Button>
              <Button kind={BTN_SECONDARY} onClick={p.onCoverClose}>{t('pf.cancel')}</Button>
            </>
          )}>
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
