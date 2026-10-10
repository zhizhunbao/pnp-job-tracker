'use client'
/**
 * 「投递发出去了」的接收件(无界面;2026-10-09 A 批投递搬进弹框):投递框挂在全站骨架上,「我的」页把它摆进页面门,
 * 收到广播就调页面给的回调(刷新投递表、写成功条)。做成件而不是让 account 桶直接取 hook —— apply 桶已从 account 桶取
 * 成功条与简历预览,反过来取就成环。
 *
 * @author Frank
 * @time 2026-10-09 02:20:00
 */
import { useApplySent } from './hooks'
import type { ApplySentSyncIn } from './types'

/**
 * 接收件。
 *
 * @param props 收到后的回调。
 * @returns 什么都不渲。
 */
export function ApplySentSync({ onSent }: ApplySentSyncIn) {
  useApplySent(onSent)
  return null
}
