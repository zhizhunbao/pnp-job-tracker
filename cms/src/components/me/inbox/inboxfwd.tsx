'use client'
/**
 * me 桶子桶 inbox 的结构:「同时转到 <账户邮箱>」开关(效果图:收件箱页标题右边;原先单独一张卡里的勾选框)。
 * 清单还没回来时不出。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Switch } from '@/components/button'
import type { InboxPartIn } from './types'

/**
 * 转发开关。
 *
 * @param props 收件箱状态与取词。
 * @returns 开关;清单没回来时为 null。
 */
export function InboxFwd({ p, t }: InboxPartIn) {
  if (p.data == null) {
    return null
  }
  return (
    <Switch on={p.data.forward} label={t('ib.forward', { e: p.data.account })} disabled={false}
      onClick={p.onForward} />
  )
}
