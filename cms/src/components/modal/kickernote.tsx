'use client'
/**
 * 灰色小标里的副段(分组名 / 剩余次数这类;#174 两个「·」退役后改空格灰注)。
 * 2026-09-28 并壳时自 advisor 的 .kickerSub 迁入。
 *
 * @author Frank
 * @time 2026-09-28 04:40:00
 */
import { cssOf } from '@/components/css'
import type { KickerNoteIn } from './types'
import css from './modal.module.css'

/**
 * 渲染小标副段。
 *
 * @param props 副段文字。
 * @returns 副段。
 */
export function KickerNote({ text }: KickerNoteIn) {
  return <span className={cssOf(css.kickerSub)}>{text}</span>
}
