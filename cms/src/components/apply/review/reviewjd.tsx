'use client'
/**
 * apply 桶子桶 review 的分块:职位描述面板内容。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { jdRowsOf } from './functions'
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
  for (const [i, row] of jdRowsOf({ jd: p.jd, reqs: review.reqs }).entries()) {
    out.push(
      <ReviewJdLine key={i}
        line={row.text}
        head={row.head}
        bullet={row.bullet}
        reqs={review.reqs}
        active={p.active}
        setActive={p.setActive}
        fixOf={p.fixOf}
        t={t} />,
    )
  }
  return <>{out}</>
}
