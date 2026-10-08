'use client'
/**
 * 投递四步的本体(简历 → 求职信 → 预览 → 已投递):本岗职位卡、步数行、各步与钮组。2026-10-07 自独立投递页
 * ApplyPage 搬进「我的」页投递一节 —— 正文轨、白卡、返回钮与 H1 随独立页撤(「我的」页有自己的外框与标题)。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { Card } from '@/components/card'
import { OnboardingHead } from '@/components/profile'
import { ApplyFoot } from './applyfoot'
import { ApplyJob } from './applyjob'
import { ApplyLetter } from './applyletter'
import { ApplyPreview } from './applypreview'
import { ApplyResume } from './applyresume'
import { STEP_LETTER, STEP_ORDER, STEP_PREVIEW, STEP_RESUME } from './constants'
import { useApply } from './hooks'
import type { ApplyPageIn } from './types'

/**
 * 四步本体(白卡一张,摆在投递记录表上方;发出后由投递区收起,不再摆「已投递」一步)。
 *
 * @param props 起始态与发出后的回调。
 * @returns 职位卡、步数行、当前步与钮组。
 */
export function ApplyFlow({ start, onSent }: ApplyPageIn) {
  const p = useApply({ start, onSent })
  return (
    <Card>
      <ApplyJob job={p.job} />
      <OnboardingHead step={p.stepIndex} total={STEP_ORDER.length} t={p.t} />
      {p.step === STEP_RESUME && <ApplyResume p={p} />}
      {p.step === STEP_LETTER && <ApplyLetter p={p} />}
      {p.step === STEP_PREVIEW && <ApplyPreview p={p} />}
      <ApplyFoot p={p} />
    </Card>
  )
}
