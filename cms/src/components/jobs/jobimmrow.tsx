'use client'
/**
 * 职位页移民相关卡的一行(2026-10-02 Frank「这两个应该可以点击弹框吧」「缺灰字啊」):行名 + 主文案(可点的蓝字,点开职位板同一个弹框)
 * + 灰字小注一项一行。形照公司信息卡的 Row 行,可点的字照职位板胶囊(span 点开弹框)。
 *
 * @author Frank
 * @time 2026-10-02 15:30:00
 */
import { cssOf } from '@/components/css'
import { Row } from '@/components/row'
import { LINK_CLS } from './constants'
import { makeOpenImm } from './functions'
import type { JobImmRowIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染移民相关卡的一行。
 *
 * @param props 这一行与打开弹框的写口。
 * @returns 一行。
 */
export function JobImmRow({ row, open }: JobImmRowIn) {
  const subs = []
  for (const s of row.subs) {
    subs.push(<span key={s} className={cssOf(css.immSub)}>{s}</span>)
  }
  return (
    <Row k={row.label}>
      {row.col != null && <span className={LINK_CLS} onClick={makeOpenImm({ open, col: row.col })}>{row.main}</span>}
      {row.col == null && <span>{row.main}</span>}
      {subs}
    </Row>
  )
}
