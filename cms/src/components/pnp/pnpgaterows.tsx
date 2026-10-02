'use client'
/**
 * 域内小件:门槛卡的行(一行一条门槛:行名 - 值,通用 Row;值一项一行,值下可有灰字注)。
 * 2026-10-01 三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」,看过效果图「可以,做吧」)自 PnpGateCard 拆出:
 * 单通道门槛卡与魁省合并门槛卡(PnpGateGroupCard,一通道一小节)共用这一份行,不各写一遍。
 *
 * @author Frank
 * @time 2026-10-01 23:39:28
 */
import { Row } from '@/components/row'
import type { PnpGateRowsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染门槛卡的行。
 *
 * @param props 洗好的行。
 * @returns 一组行。
 */
export function PnpGateRows({ rows }: PnpGateRowsIn) {
  const out = []
  for (const r of rows) {
    const lines = []
    for (const l of r.lines) {
      lines.push(<span key={lines.length} className={css.gateLine}>{l}</span>)
    }
    for (const n of r.notes) {
      lines.push(<span key={lines.length} className={css.gateNote}>{n}</span>)
    }
    out.push(<Row key={r.key} k={r.label}>{lines}</Row>)
  }
  return <>{out}</>
}
