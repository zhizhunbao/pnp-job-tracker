'use client'
/**
 * 投递四步的本体(简历 → 求职信 → 预览 → 已投递):本岗职位卡、步数行、各步与钮组。2026-10-07 自独立投递页
 * ApplyPage 搬进「我的」页投递一节 —— 正文轨、白卡、返回钮与 H1 随独立页撤(「我的」页有自己的外框与标题)。
 * 2026-10-09 A 批投递搬进弹框:发出后不再收起,切到已投递一步,摆「已发给 <公司>」成功条(与「我的」页同一枚 SentNotice)。
 * 同日 Frank「最好改成 section 布局吧,类似于其他的弹框」:外层那张白卡撤,拆成两个分区 ——「职位信息」(ApplyJob)与
 * 当前这一步(步数行 + 本步 + 钮组),都是公司弹框那种白卡分区。
 * 2026-10-10 投递框三步(docs/design/我的/我的求职-20261009.md 16d):「职位信息」分区撤(框头已写职位名,Frank「点投递
 * 还需要再显示一遍 职位信息吗?」);步数行换成每张卡里的三个页签;第 3 步「预览」改「确认」;钮组挪到卡外、框底;
 * 「按职位改写」免费号弹的升级框挂在这里(简历页、求职信页共用)。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { SentNotice } from '@/components/account'
import { UpgradeModal } from '@/components/pricing'
import { ApplyConfirm } from './applyconfirm'
import { ApplyFoot } from './applyfoot'
import { ApplyLetter } from './applyletter'
import { ApplyResume } from './applyresume'
import { CARD_MD_CLS, PRO_REASON_KEY, STEP_CONFIRM, STEP_DONE, STEP_LETTER, STEP_RESUME } from './constants'
import { useApply } from './hooks'
import type { ApplyPageIn } from './types'

/**
 * 三步本体(2026-10-10 起:当前这一步的分区卡 + 框底钮组;发出后摆已投递一步的成功条)。
 *
 * @param props 起始态、职位名灰字与发出后的回调。
 * @returns 当前步的分区卡与钮组;发出后成功条。
 */
export function ApplyFlow({ start, titleSub, onSent }: ApplyPageIn) {
  const p = useApply({ start, titleSub, onSent })
  return (
    <>
      {p.step === STEP_RESUME && <ApplyResume p={p} />}
      {p.step === STEP_LETTER && <ApplyLetter p={p} />}
      {p.step === STEP_CONFIRM && <ApplyConfirm p={p} />}
      {p.step === STEP_DONE && <div className={CARD_MD_CLS}><SentNotice t={p.t} company={p.job.company} /></div>}
      <ApplyFoot p={p} />
      {p.upsell && <UpgradeModal t={p.t} onClose={p.onUpsellClose} reason={p.t(PRO_REASON_KEY)} back={p.back} />}
    </>
  )
}
