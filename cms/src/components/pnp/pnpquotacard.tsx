'use client'
/**
 * 域内小件:省提名弹框的「{年} 年配额」卡 —— 标题行(左标题、右来源)+ 一张小表(列 = 总数 / 已发提名 / 剩余,只列官方有的项;
 * 行 = 全省,阿省这类公布到通道的再加「本岗通道」一行)+ 表下「截至 {日期}」。
 * 2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」:效果图里原是抽选卡标题下的一张小表,Frank 要单独一个框;
 * 标题照「每个框先设计一个 title」那张表(2026 年配额 / 2026 allocation)。内容全取自 pnp_ops_stats(quotaCardOf),官方原数不自己减。
 * 2026-09-27 Frank「这个截止日期放到右下角呢」:截至行挪到右下角;各列日期不一致逐列一行(asOfLinesOf)。
 * 2026-09-28 Frank「日期和全省放到一样吧」「放到一行吧」:表最右加一列,「截至 {日期}」放进第一行(全省)那一格,不再另起一行。
 * 2026-10-02 申请步骤批 1:小表拆成 QuotaGrid(「申请步骤」卡的萨省收件窗口是同一种小表,全站一份实现)。
 *
 * @author Frank
 * @time 2026-09-27 03:40:00
 */
import { TEXT_NONE } from './constants'
import { DrawsHead } from './drawshead'
import { QuotaGrid } from './quotagrid'
import type { PnpQuotaCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「{年} 年配额」卡。
 *
 * @param props 洗好的卡。
 * @returns 配额卡。
 */
export function PnpQuotaCard({ spec }: PnpQuotaCardIn) {
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} />
      <QuotaGrid corner={TEXT_NONE} heads={spec.heads} rows={spec.rows} asOf={spec.asOfLines} />
    </div>
  )
}
