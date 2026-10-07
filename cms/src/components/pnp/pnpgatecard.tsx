'use client'
/**
 * 域内小件:省提名弹框的「本岗通道的门槛」卡 —— 标题行(左标题、右来源)+ 一行一条门槛(行名 - 值,通用 Row);
 * 值格点开露出官方原句(PnpGateValue)。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」:效果图点头(先上 AB);版式照 Frank 给的公司信息卡(「参考一下这种布局呢」):左列灰字行名、右列值。
 * 内容全取自门槛表(gateCardOf),只陈列官方门槛,不判「你够不够」。
 * 2026-09-27 Frank「就门槛就只提门槛就行。不用提原文,不用提本岗」「如果需要提那是之后的时候,在单独用卡片分开」:值格点开看原句(PnpGateValue)与本岗灰字撤掉,值一项一行纯文字。
 * 2026-09-30 魁省门槛卡(看过效果图第三版「可以」):标题下可有一行界面语言名灰字(spec.sub),值格下可有灰字注(法语的考试分数线、
 * 执照的监管机构;row.notes);九省门槛卡这两格为空,样子不变。
 * 同日资讯页「通道与门槛」(通道与门槛批 2):灰字下可有一行条件标签(spec.tags,同通道卡)、没收录门槛的卡写一句(spec.empty);
 * 弹框两种门槛卡这两格为空。值格各项的列表键改按位置(资讯页按 TEER 分档列,不同档可有同字的条目)。

 * 2026-10-01 三弹框统一:行拆去 PnpGateRows(与魁省合并门槛卡共用);标题词条改「申请门槛」。
 *
 * @author Frank
 * @time 2026-09-27 12:40:00
 */
import { TEXT_NONE } from './constants'
import { DrawsHead } from './drawshead'
import { PnpGateRows } from './pnpgaterows'
import type { PnpGateCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗通道的门槛」卡。
 *
 * @param props 洗好的卡。
 * @returns 门槛卡。
 */
export function PnpGateCard({ spec }: PnpGateCardIn) {
  const tags = []
  for (const g of spec.tags) {
    tags.push(<span key={g.key} className={g.cls}>{g.text}</span>)
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} jump={spec.jump} />
      {spec.sub !== TEXT_NONE && <div className={css.drawsBasis}>{spec.sub}</div>}
      {tags.length > 0 && <div className={css.gateTags}>{tags}</div>}
      {spec.empty !== TEXT_NONE && <span className={css.gateNote}>{spec.empty}</span>}
      <PnpGateRows rows={spec.rows} />
    </div>
  )
}
