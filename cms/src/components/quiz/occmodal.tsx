'use client'
/**
 * quiz 域的结构:选职业的弹层外壳(职位板与职位详情页从卡片里打开选职业时走这条路;
 * 答题卡里那条路由不套它)。点遮罩关,点弹层内不关。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件;两层容器的内联样式迁 quiz.module.css。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { makeStopClick } from './functions'
import type { OccModalIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染弹层外壳。
 *
 * @param props 关闭出口与弹层内容。
 * @returns 遮罩 + 弹层。
 */
export function OccModal({ onClose, children }: OccModalIn) {
  return (
    <div onClick={onClose} className={css.overlay}>
      <div onClick={makeStopClick()} className={css.modal}>{children}</div>
    </div>
  )
}
