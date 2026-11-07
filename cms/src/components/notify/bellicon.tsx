'use client'
/**
 * 铃铛面板里一条前面的种类图标(2026-11-07 效果图):今日推荐 = 公文包(同左侧导航「我的求职」),雇主回信 = 信封
 * (同「收件箱」),退信 = 警示三角,已发出 = 对勾圈。
 *
 * @author Frank
 * @time 2026-11-07 17:00:00
 */
import { IconBriefcase, IconCheckCircle, IconMail, IconWarn } from '@/components/icons'
import { KIND_BOUNCED, KIND_REPLY, KIND_SENT } from './constants'
import type { BellIconIn } from './types'

/**
 * 种类图标(认不出的种类按今日推荐出公文包)。
 *
 * @param props 种类。
 * @returns 一枚图标。
 */
export function BellIcon({ kind }: BellIconIn) {
  if (kind === KIND_REPLY) {
    return <IconMail />
  }
  if (kind === KIND_BOUNCED) {
    return <IconWarn />
  }
  if (kind === KIND_SENT) {
    return <IconCheckCircle />
  }
  return <IconBriefcase />
}
