'use client'
/**
 * apply 桶子桶 review 的分块:PDF 预览上的一块高亮(只叠在预览上,文件本身不改)。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import {
  NUM_BAD, NUM_CENTER_DIV, NUM_FONT_MAX, NUM_FONT_RATIO, NUM_LEFT_NUDGE, NUM_NONE,
  ONE_SPACE, PX,
} from './constants'
import { clsIf, colorOf, numSizeOf } from './functions'
import { hlDataOf, makeHlPick } from './pick'
import type { ReviewHlIn } from './types'
import css from './review.module.css'

/**
 * 一块高亮(句头那块带序号)。
 *
 * @param props 这一块、选中项与点击手柄。
 * @returns 高亮。
 */
export function ReviewHl({ r, active, setActive }: ReviewHlIn) {
  const dim = clsIf({ on: active !== 0 && active !== r.n, cls: cssOf(css.hlDim) })
  let color = cssOf(css.hlBad)
  if (r.n !== NUM_NONE) {
    color = colorOf(r.n)
  }
  const size = numSizeOf(r.h)
  let label = String(r.n)
  if (r.n === NUM_NONE) {
    label = NUM_BAD
  }
  return (
    <>
      <i data-n={hlDataOf(r)}
        data-q={r.n}
        className={[cssOf(css.hl), color, dim].join(ONE_SPACE)}
        // eslint-disable-next-line react/forbid-dom-props -- 位置来自 PDF 文字层,只能行内写
        style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
        onClick={makeHlPick({ active, n: r.n, setActive })} />
      {r.first && (
        <b className={cssOf(css.hlNum)}
          // eslint-disable-next-line react/forbid-dom-props -- 位置来自 PDF 文字层,只能行内写
          style={{
            left: r.x + NUM_LEFT_NUDGE,
            top: r.y + (r.h - size) / NUM_CENTER_DIV,
            width: size,
            height: size,
            lineHeight: String(size) + PX,
            fontSize: Math.min(NUM_FONT_MAX, r.h * NUM_FONT_RATIO),
          }}>{label}</b>
      )}
    </>
  )
}
