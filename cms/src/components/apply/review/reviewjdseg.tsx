'use client'
/**
 * apply 桶子桶 review 的分块:一段职位描述。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { ONE_SPACE, TAG_BAD } from './constants'
import { clsIf, colorOf, isCovered, makePickActive } from './functions'
import type { JdSegIn } from './types'
import css from './review.module.css'

/**
 * 一段职位描述。
 *
 * @param props 文字、命中的要求、选中项、手柄与取词。
 * @returns 一段。
 */
export function ReviewJdSeg({ text, req, active, setActive, t }: JdSegIn) {
  if (req == null) {
    return <span>{text}</span>
  }
  if (isCovered(req) === false) {
    return (
      <span>
        <span className={cssOf(css.miss)}>{text}</span>{ONE_SPACE}<Tag variant={TAG_BAD}>{t('tr.notCovered')}</Tag>
      </span>
    )
  }
  const dim = clsIf({ on: active !== 0 && active !== req.id, cls: cssOf(css.dim) })
  return (
    <mark data-n={req.id}
      className={[cssOf(css.mark), colorOf(req.id), dim].join(ONE_SPACE)}
      onClick={makePickActive({ active, n: req.id, setActive })}>
      <b className={cssOf(css.num)}>{req.id}</b>{text}
    </mark>
  )
}
