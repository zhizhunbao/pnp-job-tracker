'use client'
/**
 * 「联系方式」分区卡:姓名粗体、邮箱、电话、「城市, 省份」;卡头「修改」;卡底一句来源(从我的档案带过来)。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { Button } from '@/components/button'
import { BTN_SECONDARY, TEXT_NONE } from './constants'
import { CvCard } from './cvcard'
import { placeOf } from './functions'
import type { CvPartIn } from './types'
import css from './cv.module.css'

/**
 * 联系方式卡。
 *
 * @param props 整机面板。
 * @returns 卡。
 */
export function CvContactCard({ p }: CvPartIn) {
  const c = p.draft.contact
  const place = placeOf(c)
  const acts = <Button kind={BTN_SECONDARY} sm onClick={p.onContactEdit}>{p.t('cv.edit')}</Button>
  return (
    <CvCard head={p.t('cv.sec.contact')} acts={acts}>
      <div className={css.contact}>
        {c.name !== TEXT_NONE && <div className={css.name}>{c.name}</div>}
        {c.name === TEXT_NONE && <div className={css.err}>{p.t('cv.err.name')}</div>}
        {c.email !== TEXT_NONE && <div>{c.email}</div>}
        {c.phone !== TEXT_NONE && <div>{c.phone}</div>}
        {place !== TEXT_NONE && <div>{place}</div>}
      </div>
      <div className={css.note}>{p.t('cv.fromPf')}</div>
    </CvCard>
  )
}
