'use client'
/**
 * 域内小件:「行名 + 几列数 + 最右截至列」的小表 —— 配额卡与「申请步骤」卡的萨省收件窗口共用(2026-10-02 申请步骤批 1 自 PnpQuotaCard 拆出:
 * 同一种小表全站只许一份实现)。左上角可放一格字(收件窗口写「9 月窗口」,配额卡为空);截至日期放第一行最右一格。
 * 同日 Frank「这个日期怎么跑上来了」(萨省配额卡加了三行行业,日期挂在全省那一行就到了右上):改放最后一行最右一格 ——
 * 只有一行的卡样子不变;多行的回到右下角(09-27「放到右下角」),仍不另起一行(09-28「放到一行吧」)。
 *
 * @author Frank
 * @time 2026-10-02 22:30:00
 */
import { KEY_SEP, QUOTA_KEY_ASOF, QUOTA_KEY_CORNER, QUOTA_KEY_HEAD, QUOTA_KEY_LABEL } from './constants'
import { quotaGridClsOf } from './functions'
import type { QuotaGridIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染小表。
 *
 * @param props 左上角、表头、各行与截至日期(放最后一行最右一格)。
 * @returns 小表。
 */
export function QuotaGrid({ corner, heads, rows, asOf }: QuotaGridIn) {
  const asOfLines = []
  for (const line of asOf) {
    asOfLines.push(<div key={line}>{line}</div>)
  }
  const cells = [<span key={QUOTA_KEY_CORNER} className={css.quotaHead}>{corner}</span>]
  for (const h of heads) {
    cells.push(<span key={QUOTA_KEY_HEAD + KEY_SEP + h} className={css.quotaHead}>{h}</span>)
  }
  cells.push(<span key={QUOTA_KEY_ASOF} />)
  let left = rows.length
  for (const r of rows) {
    left -= 1
    cells.push(<span key={QUOTA_KEY_LABEL + KEY_SEP + r.key} className={css.quotaLabel}>{r.label}</span>)
    for (let i = 0; i < r.cells.length; i += 1) {
      cells.push(<span key={r.key + KEY_SEP + String(i)} className={css.quotaV}>{r.cells[i]}</span>)
    }
    cells.push(<span key={QUOTA_KEY_ASOF + KEY_SEP + r.key} className={css.quotaAsOf}>{left === 0 && asOfLines}</span>)
  }
  return <div className={quotaGridClsOf(heads.length)}>{cells}</div>
}
