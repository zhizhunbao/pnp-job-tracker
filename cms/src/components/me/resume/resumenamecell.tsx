'use client'
/**
 * me 桶子桶 resume 的哑单元格:简历表的名称格(通用 Table 的 render 收整行)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { ResumeName } from './resumename'
import type { ResumeCellRow } from './types'

/**
 * 名称格。
 *
 * @param r 展示行。
 * @returns 名字 + 胶囊。
 */
export function ResumeNameCell(r: ResumeCellRow) {
  return <ResumeName name={r.name} isDefault={r.isDefault} defaultText={r.defaultText} onOpen={r.onOpen} />
}
