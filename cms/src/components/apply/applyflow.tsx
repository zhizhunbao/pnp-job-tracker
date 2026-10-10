'use client'
/**
 * 投递四步的本体(简历 → 求职信 → 预览 → 已投递):本岗职位卡、步数行、各步与钮组。2026-10-07 自独立投递页
 * ApplyPage 搬进「我的」页投递一节 —— 正文轨、白卡、返回钮与 H1 随独立页撤(「我的」页有自己的外框与标题)。
 * 2026-10-09 A 批投递搬进弹框:发出后不再收起,切到已投递一步,摆「已发给 <公司>」成功条(与「我的」页同一枚 SentNotice)。
 * 同日 Frank「最好改成 section 布局吧,类似于其他的弹框」:外层那张白卡撤,拆成两个分区 ——「职位信息」(ApplyJob)与
 * 当前这一步(步数行 + 本步 + 钮组),都是公司弹框那种白卡分区。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { SentNotice } from '@/components/account'
import { OnboardingHead } from '@/components/profile'
import { ApplyFoot } from './applyfoot'
import { ApplyJob } from './applyjob'
import { ApplyLetter } from './applyletter'
import { ApplyPreview } from './applypreview'
import { ApplyResume } from './applyresume'
import { CARD_MD_CLS, STEP_DONE, STEP_LETTER, STEP_ORDER, STEP_PREVIEW, STEP_RESUME } from './constants'
import { useApply } from './hooks'
import type { ApplyPageIn } from './types'

/**
 * 四步本体(2026-10-09 起住投递框里:「职位信息」分区 + 当前这一步的分区;发出后摆已投递一步的成功条)。
 *
 * @param props 起始态、职位名灰字与发出后的回调。
 * @returns 职位卡、步数行、当前步与钮组;发出后职位卡与成功条。
 */
export function ApplyFlow({ start, titleSub, onSent }: ApplyPageIn) {
  const p = useApply({ start, titleSub, onSent })
  return (
    <>
      <ApplyJob job={p.job} titleSub={titleSub} />
      <div className={CARD_MD_CLS}>
        {p.step !== STEP_DONE && <OnboardingHead step={p.stepIndex} total={STEP_ORDER.length} t={p.t} />}
        {p.step === STEP_RESUME && <ApplyResume p={p} />}
        {p.step === STEP_LETTER && <ApplyLetter p={p} />}
        {p.step === STEP_PREVIEW && <ApplyPreview p={p} />}
        {p.step === STEP_DONE && <SentNotice t={p.t} company={p.job.company} />}
        <ApplyFoot p={p} />
      </div>
    </>
  )
}
