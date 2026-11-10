'use client'
/**
 * apply 桶子桶 review 的分块:一行职位描述。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { jdSegsOf } from './functions'
import { ReviewJdSeg } from './reviewjdseg'
import type { JdLineIn } from './types'
import css from './review.module.css'

/**
 * 一行职位描述(命中要求的句子带序号,没覆盖的标红)。
 *
 * @param props 这一行、要求、选中项、手柄与取词。
 * @returns 一行。
 */
export function ReviewJdLine({ line, reqs, active, setActive, t }: JdLineIn) {
  const out = []
  for (const [i, s] of jdSegsOf({ line, reqs }).entries()) {
    out.push(<ReviewJdSeg key={i} text={s.text} req={s.req} active={active} setActive={setActive} t={t} />)
  }
  return <p className={cssOf(css.line)}>{out}</p>
}
