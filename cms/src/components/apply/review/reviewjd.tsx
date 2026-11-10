'use client'
/**
 * apply 桶子桶 review 的分块:职位描述面板内容。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { NEWLINE, TEXT_NONE } from './constants'
import { ReviewJdLine } from './reviewjdline'
import type { ReviewJdIn } from './types'

/**
 * 职位描述面板内容。
 *
 * @param props 整机、结果与取词。
 * @returns 各行。
 */
export function ReviewJd({ p, review, t }: ReviewJdIn) {
  const out = []
  for (const [i, line] of p.jd.split(NEWLINE).entries()) {
    if (line.trim() !== TEXT_NONE) {
      out.push(<ReviewJdLine key={i} line={line} reqs={review.reqs} active={p.active} setActive={p.setActive} t={t} />)
    }
  }
  return <>{out}</>
}
