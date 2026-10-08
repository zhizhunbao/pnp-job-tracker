'use client'
/**
 * account 域的「我的订阅」节(2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅 可以吗?」):
 * 当前套餐 + 一颗钮 —— 免费档「升级 Pro」、Pro 档「续买」(时长包到期日顺延),两颗都打开全站同一个定价框(PricingModal;
 * 下单只此一处,本节不另造)。账户下拉里原先那一项「升级 Pro」同日撤,升级入口挪到这里。
 * 2026-10-08 照 AIApply 的 Billing 重设计(docs/design/我的模块-照AIApply-20261007.md 故事 16–19):方案卡 → Pro 包含 → 付款记录
 * (懒查 Stripe);「付款方式」「到期与退款」「到期不会自动续费」这些解释块不出(Frank 10-07「不需要解释性文字」)。
 *
 * @author Frank
 * @time 2026-10-04 01:10:00
 */
import { PricingModal } from '@/components/pricing'
import { TEXT_NONE } from './constants'
import { makeFlagSet, proOf } from './functions'
import { useSubscription } from './hooks'
import { SubPayments } from './subpayments'
import { SubPerks } from './subperks'
import { SubPlan } from './subplan'
import type { SubscriptionIn } from './types'

/**
 * 「我的订阅」节。
 *
 * @param props 取词函数与 Pro 到期日(见 SubscriptionIn 逐格注释)。
 * @returns 方案卡、Pro 包含、付款记录(有才出)与定价框。
 */
export function Subscription({ t, until }: SubscriptionIn) {
  let untilIn: string | null = null
  if (until != null) {
    untilIn = until
  }
  const pro = proOf({ until: untilIn })
  let untilText = TEXT_NONE
  if (untilIn != null) {
    untilText = untilIn
  }
  const s = useSubscription()
  return (
    <div>
      <SubPlan t={t} pro={pro} until={untilText} onOpen={makeFlagSet({ set: s.setOpen, v: true })} />
      <SubPerks t={t} pro={pro} />
      {s.payments.length > 0 && <SubPayments t={t} items={s.payments} />}
      {s.open && <PricingModal t={t} loggedIn pro={pro} onClose={makeFlagSet({ set: s.setOpen, v: false })} />}
    </div>
  )
}
