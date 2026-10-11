'use client'
/**
 * 域内哑单元格:「职位」格 —— 英文职位名(点了叠开职位框)+ 界面语译名灰字;职位删了黑字不可点;已下架挂一枚橙胶囊
 * (2026-10-10 批 2,三张清单网页端表格形,照雇主板列构造样张;手机卡 MjCard 也摆它)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { JobName, Name } from '@/components/name'
import { Tag } from '@/components/tag'
import { CLOSED_TAG, TEXT_NONE } from './constants'
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染职位格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名(+ 已下架胶囊)。
 */
export function TitleCell(r: ListRow) {
  return (
    <span className={css.titleCell}>
      {r.jobId != null && <JobName id={r.jobId} title={r.title} sub={r.titleSub} />}
      {r.jobId == null && <Name en={r.title} sub={r.titleSub} />}
      {r.closedText !== TEXT_NONE && <Tag variant={CLOSED_TAG}>{r.closedText}</Tag>}
    </span>
  )
}
