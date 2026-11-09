'use client'
/**
 * me 桶子桶 sub 的提醒表:条件格(2026-11-08 清单第 5 条,出处 Job Bank Job Alerts)。
 *
 * @author Frank
 * @time 2026-11-08 23:30:00
 */
import type { AlertRow } from './types'

/**
 * 条件格。
 *
 * @param r 表行。
 * @returns 提醒名。
 */
export function AlertNameCell(r: AlertRow) {
  return <span>{r.name}</span>
}
