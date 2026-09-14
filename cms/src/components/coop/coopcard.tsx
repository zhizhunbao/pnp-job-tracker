'use client'
/**
 * 校内板的一张手机卡(通用 JobCard:职位为题、雇主为副、市在左、工时在右、发布日在右)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { JobCard } from '@/components/card'
import { TEXT_NONE } from './constants'
import type { CoopCardIn } from './types'

/**
 * 渲染一张卡。
 *
 * @param props 这一行的展示行。
 * @returns 职位卡形态的校内帖卡。
 */
export function CoopCard({ r }: CoopCardIn) {
  const title = { text: r.title, href: r.href }
  if (r.company === TEXT_NONE) {
    return (
      <JobCard href={r.href}
        title={title}
        location={r.locText}
        salary={r.kindText}
        date={r.dateText} />
    )
  }
  return (
    <JobCard href={r.href}
      title={title}
      company={{ text: r.company }}
      location={r.locText}
      salary={r.kindText}
      date={r.dateText} />
  )
}
