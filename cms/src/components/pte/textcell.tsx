'use client'
/**
 * 哑单元格:题面(真链接进单题页;一行截断;练过的灰掉,类名在展示行里算好)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { LinkButton } from '@/components/button'
import type { PteCellRow } from './types'

/**
 * 渲染题面格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function TextCell(r: PteCellRow) {
  return <LinkButton href={r.href} className={r.textCls} title={r.text}>{r.text}</LinkButton>
}
