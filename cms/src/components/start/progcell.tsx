'use client'
/**
 * 抽选表「项目」列的单元格:省码标签,联邦那几期显 EE。
 * 2026-08-28 换装批自 Pulse.tsx 的 prog 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Tag } from '@/components/tag'
import type { DrawCellRow } from './types'

/**
 * 渲染抽选表「项目」列的一个单元格。
 *
 * @param r 这一期的展示行。
 * @returns 标签。
 */
export function ProgCell(r: DrawCellRow) {
  return <Tag>{r.prog}</Tag>
}
