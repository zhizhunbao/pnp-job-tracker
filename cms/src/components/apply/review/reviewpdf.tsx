'use client'
/**
 * apply 桶子桶 review 的将发出的 PDF:画的就是发信用的那份文件,高亮和序号只叠在预览上。
 *
 * @author Frank
 * @time 2026-11-09 20:00:00
 */
import { cssOf } from '@/components/css'
import { DATA_CV_ON, SHEET_LEFT_PAD } from './constants'
import { useReviewPdf } from './hooks'
import { ReviewHl } from './reviewhl'
import type { ReviewPdfIn } from './types'
import css from './review.module.css'

/**
 * 一份 PDF。
 *
 * @param props 地址、引文、选中项与放大。
 * @returns 预览。
 */
export function ReviewPdf(props: ReviewPdfIn) {
  const { box, rects, size, failed } = useReviewPdf(props)
  if (failed) {
    return <div className={cssOf(css.note)}>{props.t('tr.pdfFail')}</div>
  }
  const out = []
  for (const [i, r] of rects.entries()) {
    out.push(<ReviewHl key={i} r={r} active={props.active} setActive={props.setActive} />)
  }
  return (
    <div ref={box} className={cssOf(css.pdfBox)}>
      <div className={cssOf(css.sheet)}
        // eslint-disable-next-line react/forbid-dom-props -- 尺寸来自 PDF 内容,只能行内写
        style={{
          width: size.w,
          height: size.h,
          marginLeft: SHEET_LEFT_PAD - size.left,
          marginTop: -size.top,
        }}>
        <div data-cv={DATA_CV_ON} />
        {out}
      </div>
    </div>
  )
}
