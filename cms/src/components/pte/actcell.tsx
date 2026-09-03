'use client'
/**
 * 哑单元格:操作(「练习」钮,去单题页)。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_SECONDARY } from './constants'
import type { PteCellRow } from './types'

/**
 * 渲染操作格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function ActCell(r: PteCellRow) {
  return <Button kind={KIND_SECONDARY} sm href={r.href}>{r.actText}</Button>
}
