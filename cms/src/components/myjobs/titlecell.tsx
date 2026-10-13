'use client'
/**
 * 域内哑单元格:「职位」格 —— 英文职位名(点了叠开职位框)+ 界面语译名灰字;职位删了黑字不可点;已下架挂一枚橙胶囊
 * (2026-10-10 批 2,三张清单网页端表格形,照雇主板列构造样张;手机卡 MjCard 也摆它)。
 * 2026-10-12 Frank「已下架这个应该有个状态列」:已下架胶囊挪进状态列(functions tagsOf),这一格只剩名字。
 * 2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」:打码行(r.locked)职位格挂 data-lock 标记(量打码行上沿用),名字照出。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { JobName, Name } from '@/components/name'
import { LOCK_MARK } from './constants'
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染职位格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名。
 */
export function TitleCell(r: ListRow) {
  return (
    <span className={css.titleCell}>
      {r.locked && <span data-lock={LOCK_MARK}><Name en={r.title} sub={r.titleSub} /></span>}
      {r.locked === false && r.jobId != null && <JobName id={r.jobId} title={r.title} sub={r.titleSub} />}
      {r.locked === false && r.jobId == null && <Name en={r.title} sub={r.titleSub} />}
    </span>
  )
}
