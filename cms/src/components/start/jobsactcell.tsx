'use client'
/**
 * 招聘对比横表「操作」列:看岗位 → 职位板带省(新标签页)。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB } from './constants'
import type { JobsRow } from './types'

/**
 * 渲染「操作」单元格。
 *
 * @param r 这一行。
 * @returns 看岗位钮。
 */
export function JobsActCell(r: JobsRow) {
  return (
    <LinkButton href={r.href} className={r.actBtnCls} target={NEW_TAB}>{r.actText}</LinkButton>
  )
}
