'use client'
/**
 * me 桶子桶 sub 的结构:「我的订阅」正文(效果图 docs/design/我的/我的框架-20261107.md 1.6 / 2.5):
 * 当前方案 → Pro 包含 → 新岗推送 → 付款记录,一段一张分区卡;页标题右边的钮点开全站同一个定价框(PricingModal)。
 * 2026-10-08 照 AIApply 的 Billing 重设计时定的「付款方式」「到期与退款」「到期不会自动续费」这些解释块不出
 * (Frank 10-07「不需要解释性文字」),新域照旧不出。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { PricingModal } from '@/components/pricing'
import { SubPays } from './subpays'
import { SubPerks } from './subperks'
import { SubPlan } from './subplan'
import { SubPush } from './subpush'
import type { SubPartIn } from './types'

/**
 * 「我的订阅」正文。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 四张分区卡 + 定价框。
 */
export function SubBody({ s, t }: SubPartIn) {
  return (
    <>
      <SubPlan s={s} t={t} />
      <SubPerks s={s} t={t} />
      <SubPush s={s} t={t} />
      <SubPays s={s} t={t} />
      {s.open && <PricingModal t={t} loggedIn pro={s.pro} onClose={s.onClose} />}
    </>
  )
}
