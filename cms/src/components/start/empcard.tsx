'use client'
/**
 * 域内小件:雇主手机卡(形照 employers 桶的 SponsorCard:标题链接 + 键值行;通用件 Card / CardKV)。
 * 雇主名只显英文(2026-09-04 Frank:中文别名是机器音译,不上页;公司信息补全归另一批)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { LinkButton } from '@/components/button'
import { Card, CardKV } from '@/components/card'
import { cssOf } from '@/components/css'
import { EMP_KIND_LMIA } from './constants'
import { EmpSignalsCell } from './empsignalscell'
import type { EmpCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张雇主卡。
 *
 * @param props 这一行与表种。
 * @returns 卡片。
 */
export function EmpCard({ t, row, kind }: EmpCardIn) {
  const kv = []
  if (kind === EMP_KIND_LMIA) {
    kv.push({ k: t('dir.col.skilled'), v: row.skilledText })
    kv.push({ k: t('se.col.w1'), v: row.quarterText })
  }
  kv.push({ k: t('pulse.col.open'), v: <strong>{row.openText}</strong> })
  if (kind !== EMP_KIND_LMIA) {
    kv.push({ k: t('pulse.col.signals'), v: EmpSignalsCell(row) })
  }
  kv.push({ k: t('se.col.where'), v: row.provsText })
  return (
    <Card>
      <div className={css.empCardTitle}>
        <LinkButton href={row.href} onClick={row.onView} className={cssOf(css.occLink)}>
          {row.name}
        </LinkButton>
      </div>
      <CardKV items={kv} />
    </Card>
  )
}
