'use client'
/**
 * 域内小件:雇主手机卡(通用件 Card / CardKV / CardAction):标题 + 一格一事实的键值行 + 操作行,
 * 键值随身份档换(与桌面表同一列集)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Card, CardAction, CardKV } from '@/components/card'
import { ID_NOWP, TABLE_PILOT, TEXT_NONE } from './constants'
import { EmpActCell } from './empactcell'
import { EmpBriefCell } from './empbriefcell'
import { EmpHiringCell } from './emphiringcell'
import type { EmpCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张雇主卡。
 *
 * @param props 这一行与身份档。
 * @returns 卡片。
 */
export function EmpCard({ t, row, kind }: EmpCardIn) {
  const kv = []
  kv.push({ k: t('pulse.col.biz'), v: EmpBriefCell(row), wide: true })
  if (kind === ID_NOWP) {
    kv.push({ k: t('se.col.w2'), v: row.lmia2qText })
    kv.push({ k: t('se.col.w4'), v: row.lmia4qText })
  } else if (kind !== TABLE_PILOT) {
    kv.push({ k: t('se.col.verdict'), v: row.verdictText })
  }
  kv.push({ k: t('pulse.col.hiringOcc'), v: EmpHiringCell(row), wide: true })
  kv.push({ k: t('pulse.col.open'), v: <strong>{row.openText}</strong> })
  return (
    <Card>
      <div className={css.empCardTitle}>{row.name}</div>
      {row.alias !== TEXT_NONE && <div className={css.note}>{row.alias}</div>}
      <CardKV items={kv} />
      <CardAction>{EmpActCell(row)}</CardAction>
    </Card>
  )
}
