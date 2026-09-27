'use client'
/**
 * 域内小件:省提名弹框的「本岗通道的门槛」卡 —— 标题行(左标题、右来源)+ 一行一条门槛(行名 - 值,通用 Row);
 * 值格点开露出官方原句(PnpGateValue)。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:效果图点头(先上 AB);版式照 Frank 给的公司信息卡(「参考一下这种布局呢」):左列灰字行名、右列值。
 * 内容全取自门槛表(gateCardOf),只陈列官方门槛,不判「你够不够」。
 *
 * @author Frank
 * @time 2026-09-27 12:40:00
 */
import { Row } from '@/components/row'
import { DrawsHead } from './drawshead'
import { PnpGateValue } from './pnpgatevalue'
import type { PnpGateCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗通道的门槛」卡。
 *
 * @param props 洗好的卡、展开着的行与开合手柄工厂。
 * @returns 门槛卡。
 */
export function PnpGateCard({ spec, open, toggleOf }: PnpGateCardIn) {
  const rows = []
  for (const r of spec.rows) {
    rows.push(
      <Row key={r.key} k={r.label}>
        <PnpGateValue row={r} open={open.has(r.key)} onToggle={toggleOf(r.key)} />
      </Row>,
    )
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} />
      {rows}
    </div>
  )
}
