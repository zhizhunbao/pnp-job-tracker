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
 * 2026-11-08 清单第 1 条:已投递一步多一张「新岗推送」卡(PushOffer)。
 * 2026-11-09 Frank 高质量投递:有基础简历就走三屏对照(子桶 review),原三步只剩没有简历时的上传。
 * 2026-11-09 Frank「照此做」(「我的」第一批):21 个投过的人 16 个只投 1 封,已投递一步接一张「接着投这几个」(NextPicks),在推送卡上面。
 * 2026-11-09 Frank 定的投递动线:有基础简历后分三屏 —— 两个选择(免费有额度:点了改写才生成并扣额度)、三屏对照、
 * 基础简历投递(附原件、固定模板的信、不耗额度);开在哪一屏由子桶 entry 按起始态定。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { UpgradeModal } from '@/components/pricing'
import { ReviewFlow } from './review'
import { ApplyBase } from './applybase'
import { ApplyChoose } from './applychoose'
import { ApplyResume } from './applyresume'
import { CARD_MD_CLS, STEP_DONE, TEXT_NONE } from './constants'
import { MODE_BASE, MODE_CHOOSE, MODE_TAILOR } from './entry'
import { useApply } from './hooks'
import { NextPicks } from './nextpicks'
import { PushOffer } from './pushoffer'
import { SentNotice } from './sentnotice'
import type { ApplyPageIn } from './types'

/**
 * 三步本体(2026-10-10 起:当前这一步的分区卡 + 框底钮组;发出后摆已投递一步的成功条)。
 *
 * @param props 起始态、职位名灰字与发出后的回调。
 * @returns 当前步的分区卡与钮组;发出后成功条。
 */
export function ApplyFlow({ start, titleSub, onSent, base }: ApplyPageIn) {
  const p = useApply({ start, titleSub, onSent, base })
  const ready = p.step !== STEP_DONE && p.resumes.length > 0
  return (
    <>
      {p.step !== STEP_DONE && p.resumes.length === 0 && <ApplyResume p={p} />}
      {ready && p.mode === MODE_CHOOSE && <ApplyChoose p={p} />}
      {ready && p.mode === MODE_BASE && <ApplyBase p={p} />}
      {ready && p.mode === MODE_TAILOR && (
        <ReviewFlow jobId={p.job.id}
          title={p.job.title}
          city={p.job.city}
          province={p.job.province}
          company={p.job.company}
          to={p.mail.to}
          name={p.name}
          askName={p.askName}
          onName={p.onName}
          t={p.t}
          onSent={p.onReviewSent}
          onUpsell={p.onReviewUpsell}
          onBase={p.onBase}
          leftText={p.leftText} />
      )}
      {p.step === STEP_DONE && <div className={CARD_MD_CLS}><SentNotice t={p.t} company={p.job.company} /></div>}
      {p.step === STEP_DONE && <NextPicks t={p.t} jobId={p.job.id} />}
      {p.step === STEP_DONE && <PushOffer t={p.t} />}
      {p.upsell !== TEXT_NONE && p.mode !== MODE_BASE && (
        <UpgradeModal t={p.t} onClose={p.onUpsellClose} reason={p.t(p.upsell)} back={p.back} onBase={p.onBase} />
      )}
    </>
  )
}
