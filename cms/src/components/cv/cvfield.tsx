/**
 * 表单里的一格:标签在上(必填前面一颗红星),控件在下。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import type { CvFieldIn } from './types'
import css from './cv.module.css'

/**
 * 一格。
 *
 * @param props 标签、是否必填与控件。
 * @returns 一格。
 */
export function CvField({ label, req, children }: CvFieldIn) {
  return (
    <div className={css.field}>
      {req && <span className={css.labelReq}>{label}</span>}
      {req === false && <span className={css.label}>{label}</span>}
      {children}
    </div>
  )
}
