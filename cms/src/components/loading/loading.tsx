'use client'
/**
 * 转圈 + 一句话的加载行(形与几何照 jobs 的 BoardLoading 逐格抄,2026-09-14 立域时那件仍在原地,
 * 收拢批再切它)。
 *
 * @author Frank
 * @time 2026-09-14 14:30:00
 */
import { cssOf } from '@/components/css'
import type { LoadingIn } from './types'
import css from './loading.module.css'

/**
 * 渲染加载行。
 *
 * @param props 转圈旁的一句话。
 * @returns 转圈 + 一句话。
 */
export function Loading({ text }: LoadingIn) {
  return (
    <div className={cssOf(css.loading)}>
      <span className={cssOf(css.spin)} />
      {text}
    </div>
  )
}
