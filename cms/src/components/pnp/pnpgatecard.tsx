'use client'
/**
 * 域内小件:省提名弹框的「本岗通道的门槛」卡 —— 标题行(左标题、右来源)+ 一行一条门槛(行名 - 值,通用 Row);
 * 值格点开露出官方原句(PnpGateValue)。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:效果图点头(先上 AB);版式照 Frank 给的公司信息卡(「参考一下这种布局呢」):左列灰字行名、右列值。
 * 内容全取自门槛表(gateCardOf),只陈列官方门槛,不判「你够不够」。
 * 2026-09-27 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」「如果需要提那是之后的时候,在单独用卡片分开」:值格点开看原句(PnpGateValue)与本岗灰字撤掉,值一项一行纯文字。
 *
 * @author Frank
 * @time 2026-09-27 12:40:00
 */
import { Row } from '@/components/row'
import { DrawsHead } from './drawshead'
import type { PnpGateCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗通道的门槛」卡。
 *
 * @param props 洗好的卡。
 * @returns 门槛卡。
 */
export function PnpGateCard({ spec }: PnpGateCardIn) {
  const rows = []
  for (const r of spec.rows) {
    const lines = []
    for (const l of r.lines) {
      lines.push(<span key={l} className={css.gateLine}>{l}</span>)
    }
    rows.push(<Row key={r.key} k={r.label}>{lines}</Row>)
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} />
      {rows}
    </div>
  )
}
