'use client'
/**
 * 可高亮的身份行(分类卡与地点卡共用):点哪个字段哪一行亮 ——
 * 这是「点哪个字段就显示哪个字段」在「始终出完整卡」下的落地。
 * 2026-08-28 换装批自 Advisor.tsx 的两处同款行提出成件(原先两处逐字重复)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import { hlRowClsOf, kvKeyClsOf } from './functions'
import type { HlRowIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染一行身份行。
 *
 * @param props 标签、高亮、标签列档与值(逐格注释见 HlRowIn)。
 * @returns 身份行。
 */
export function HlRow({ label, on, narrow, children }: HlRowIn) {
  return (
    <div className={hlRowClsOf({ on })}>
      <span className={kvKeyClsOf({ narrow })}>{label}</span>
      <span className={cssOf(css.kvV) + CLS_SEP + cssOf(css.brk)}>{children}</span>
    </div>
  )
}
