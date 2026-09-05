'use client'
/**
 * 域内哑单元格:职业表「操作」格 —— 看岗位(职位板按该 NOC 筛;与职业名链接同一去处)。
 *
 * @author Frank
 * @time 2026-09-05 01:10:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB } from './constants'
import type { OccCellRow } from './types'

/**
 * 渲染操作格。
 *
 * @param r 这一行。
 * @returns 一个钮。
 */
export function OccActCell(r: OccCellRow) {
  return (
    <LinkButton href={r.href} onClick={r.onView} className={r.actBtnCls} target={NEW_TAB}>{r.actJobsText}</LinkButton>
  )
}
