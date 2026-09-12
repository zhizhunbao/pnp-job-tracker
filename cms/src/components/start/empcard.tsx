'use client'
/**
 * 域内小件:雇主手机卡(通用件 Card / CardKV / CardAction):标题 + 一格一事实的键值行 + 操作行,
 * 键值随身份档换(与桌面表同一列集)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Card, CardAction, CardKV } from '@/components/card'
import { TABLE_PILOT, TEXT_NONE } from './constants'
import { EmpActCell } from './empactcell'
import { EmpBriefCell } from './empbriefcell'
import { EmpHiringCell } from './emphiringcell'
import type { EmpCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张雇主卡。
 *
 * @param props 这一行与表种。
 * @returns 卡片。
 * 2026-09-06 Frank「这个卡片需要重新排版吗」:顺序改成 在招职业 → 在招 → 类别 / 门槛 → 主营业务,
 * 主信息在前,简介殿后(简介本身照同日 E 方案双语分主次,不截断)。
 * 2026-09-12 两档合并:行业卡 = 类别 / 门槛 / 近半年 LMIA(与桌面表同列集),没工签专属卡退役。
 */
export function EmpCard({ t, row, kind }: EmpCardIn) {
  const kv = []
  kv.push({ k: t('pulse.col.hiringOcc'), v: EmpHiringCell(row), wide: true })
  kv.push({ k: t('pulse.col.open'), v: <strong>{row.openText}</strong> })
  if (kind === TABLE_PILOT) {
    kv.push({ k: t('pulse.col.sector'), v: row.sectorText })
  } else {
    kv.push({ k: t('pulse.col.sector'), v: row.sectorText })
    kv.push({ k: t('se.col.verdict'), v: row.verdictText })
    kv.push({ k: t('se.col.w2'), v: row.lmia2qText })
  }
  kv.push({ k: t('pulse.col.biz'), v: <div className={css.briefCard}>{EmpBriefCell(row)}</div>, wide: true })
  return (
    <Card>
      <div className={css.empCardTitle}>
        {row.name}
        {row.chainText !== TEXT_NONE && <span className={css.chipGray} title={row.chainTip}>{row.chainText}</span>}
      </div>
      {row.alias !== TEXT_NONE && <div className={css.note}>{row.alias}</div>}
      <CardKV items={kv} />
      <CardAction>{EmpActCell(row)}</CardAction>
    </Card>
  )
}
