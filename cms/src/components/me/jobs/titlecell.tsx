'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「职位」格 —— 英文职位名(点了叠开职位框)+ 界面语译名灰字;职位删了黑字不可点
 * (2026-10-10 批 2 照雇主板列构造样张;手机一条也摆它)。
 * 2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」:打码行(r.locked)职位格挂 data-lock 标记(量打码行上沿用),名字照出。
 * 2026-10-13 Frank「点击 显示更多 表格别变化啊」:打码行职位名不参与列宽(lockTitle),列宽只按真行定。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行撤(锁住的条数改在表下一行说),data-lock 标记与 lockTitle 那一支跟着撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { JobName, Name } from '@/components/name'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染职位格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名。
 */
export function TitleCell(r: ListRow) {
  return (
    <span className={cssOf(css.titleCell)}>
      {r.jobId != null && <JobName id={r.jobId} title={r.title} sub={r.titleSub} />}
      {r.jobId == null && <Name en={r.title} sub={r.titleSub} />}
    </span>
  )
}
