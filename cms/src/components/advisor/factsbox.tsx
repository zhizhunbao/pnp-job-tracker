'use client'
/**
 * 一块事实:若干「标签-值」行 + 可选的口径注。
 * Frank 走查#8:卡片底部横线退役(borderBottom + paddingBottom),组间留白靠下边距。
 * 2026-08-17 从退役的 jobs/Facts 收回宿主(一处用的东西不该住在共享叶子里);
 * 2026-08-28 换装批随 Advisor.tsx 整件重写落位本桶。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { FactsBoxIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染一块事实。
 *
 * @param props 各行与口径注(逐格注释见 FactsBoxIn)。
 * @returns 一块事实。
 */
export function FactsBox({ children, note }: FactsBoxIn) {
  return (
    <div className={cssOf(css.factsBox)}>
      {children}
      {note != null && note !== TEXT_NONE && <div className={cssOf(css.factsNote)}>{note}</div>}
    </div>
  )
}
