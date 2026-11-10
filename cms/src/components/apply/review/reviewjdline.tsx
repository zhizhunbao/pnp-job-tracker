'use client'
/**
 * apply 桶子桶 review 的分块:一行职位描述。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { JD_BULLET, ONE_SPACE } from './constants'
import { clsIf, jdSegsOf } from './functions'
import { ReviewJdSeg } from './reviewjdseg'
import type { JdLineIn } from './types'
import css from './review.module.css'

/**
 * 一行职位描述(命中要求的句子带序号,没覆盖的标红)。
 * 2026-11-10 Frank「这部分 title 应该加粗」「这个也需要 bullets」:小标题加粗、补圆点;哪行是哪种由 jdRowsOf 排好递进来。
 *
 * @param props 这一行、是不是小标题、要不要补圆点、要求、选中项、手柄与取词。
 * @returns 一行。
 */
export function ReviewJdLine({ line, head, bullet, reqs, active, setActive, t }: JdLineIn) {
  const out = []
  if (bullet) {
    out.push(<span key={JD_BULLET}>{JD_BULLET}{ONE_SPACE}</span>)
  }
  for (const [i, s] of jdSegsOf({ line, reqs }).entries()) {
    out.push(<ReviewJdSeg key={i} text={s.text} req={s.req} active={active} setActive={setActive} t={t} />)
  }
  return <p className={cssOf(css.line) + ONE_SPACE + clsIf({ on: head, cls: cssOf(css.lineHead) })}>{out}</p>
}
