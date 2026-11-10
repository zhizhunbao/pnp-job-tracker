'use client'
/**
 * apply 桶子桶 review 的分块:一段职位描述。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { ONE_SPACE, TAG_BAD, TAG_WARN } from './constants'
import { clsIf, colorOf, isCovered, makePickActive, needKeyOf } from './functions'
import type { JdSegIn } from './types'
import css from './review.module.css'

/**
 * 一段职位描述。
 * 2026-11-10 Frank「这个是不是也需要一个特殊的高亮颜色」:没覆盖的要求也铺底色,和胶囊同一套三态 ——
 * 没有依据的铺浅红加「未覆盖」;有依据、只是某一份没写到的铺浅黄并注明缺哪份。
 *
 * @param props 文字、命中的要求、选中项、手柄与取词。
 * @returns 一段。
 */
export function ReviewJdSeg({ text, req, active, setActive, t }: JdSegIn) {
  if (req == null) {
    return <span>{text}</span>
  }
  if (isCovered(req) === false && req.basis) {
    return (
      <span>
        <span className={cssOf(css.half)}><b className={cssOf(css.num)}>{req.id}</b>{text}</span>
        {ONE_SPACE}
        <Tag variant={TAG_WARN}>{t(needKeyOf(req))}</Tag>
      </span>
    )
  }
  if (isCovered(req) === false) {
    return (
      <span>
        <span className={cssOf(css.miss)}><b className={cssOf(css.num)}>{req.id}</b>{text}</span>
        {ONE_SPACE}
        <Tag variant={TAG_BAD}>{t('tr.notCovered')}</Tag>
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
