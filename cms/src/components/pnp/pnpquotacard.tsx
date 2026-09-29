'use client'
/**
 * 域内小件:省提名弹框的「{年} 年配额」卡 —— 标题行(左标题、右来源)+ 一张小表(列 = 总数 / 已发提名 / 剩余,只列官方有的项;
 * 行 = 全省,阿省这类公布到通道的再加「本岗通道」一行)+ 表下「截至 {日期}」。
 * 2026-09-27 Frank 勾「2026 名额小表」「全年名额部分也单独弄个框」:效果图里原是抽选卡标题下的一张小表,Frank 要单独一个框;
 * 标题照「每个框先设计一个 title」那张表(2026 年配额 / 2026 allocation)。内容全取自 pnp_ops_stats(quotaCardOf),官方原数不自己减。
 * 2026-09-27 Frank「这个截止日期放到右下角呢」:截至行挪到右下角;各列日期不一致逐列一行(asOfLinesOf)。
 * 2026-09-28 Frank「日期和全省放到一样吧」「放到一行吧」:表最右加一列,「截至 {日期}」放进第一行(全省)那一格,不再另起一行。
 *
 * @author Frank
 * @time 2026-09-27 03:40:00
 */
import { KEY_SEP, QUOTA_KEY_ASOF, QUOTA_KEY_CORNER, QUOTA_KEY_HEAD, QUOTA_KEY_LABEL } from './constants'
import { DrawsHead } from './drawshead'
import { quotaGridClsOf } from './functions'
import type { PnpQuotaCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「{年} 年配额」卡。
 *
 * @param props 洗好的卡。
 * @returns 配额卡。
 */
export function PnpQuotaCard({ spec }: PnpQuotaCardIn) {
  const asOf = []
  for (const line of spec.asOfLines) {
    asOf.push(<div key={line}>{line}</div>)
  }
  const cells = [<span key={QUOTA_KEY_CORNER} />]
  for (const h of spec.heads) {
    cells.push(<span key={QUOTA_KEY_HEAD + KEY_SEP + h} className={css.quotaHead}>{h}</span>)
  }
  cells.push(<span key={QUOTA_KEY_ASOF} />)
  let first = true
  for (const r of spec.rows) {
    cells.push(<span key={QUOTA_KEY_LABEL + KEY_SEP + r.key} className={css.quotaLabel}>{r.label}</span>)
    for (let i = 0; i < r.cells.length; i += 1) {
      cells.push(<span key={r.key + KEY_SEP + String(i)} className={css.quotaV}>{r.cells[i]}</span>)
    }
    cells.push(<span key={QUOTA_KEY_ASOF + KEY_SEP + r.key} className={css.quotaAsOf}>{first && asOf}</span>)
    first = false
  }
  return (
    <div className={css.card}>
      <DrawsHead title={spec.title} source={spec.source} />
      <div className={quotaGridClsOf(spec.heads.length)}>{cells}</div>
    </div>
  )
}
