'use client'
/**
 * 域内小件:NOC 官方职责或要求的一块(小标题 + 条目列表)。
 * 2026-08-28 换装批自 Jd.tsx 的 NocDutiesView 体内那个 block 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { nonEmptyLinesOf } from './functions'
import type { NocDutiesBlockIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染一块官方描述。
 *
 * @param props 小标题与正文(换行分隔的条目)。
 * @returns 小标题 + 条目列表。
 */
export function NocDutiesBlock({ label, text }: NocDutiesBlockIn) {
  const items = []
  for (const line of nonEmptyLinesOf(text)) {
    items.push(<li key={line}>{line}</li>)
  }
  return (
    <>
      <div className={cssOf(css.nocHead)}>{label}</div>
      <ul className={cssOf(css.nocList)}>{items}</ul>
    </>
  )
}
