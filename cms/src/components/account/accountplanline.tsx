'use client'
/**
 * account 域的结构:概览节的套餐行 —— Pro 在期显示星标 + 到期日(琥珀),
 * 否则显示免费档(灰)。到期日由 Stripe webhook 拨,前端只读不算。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 迁出(页面「纯拼装门」改造批):
 * 原先的三目改成两支 if/else 各自 return,日期裁到 10 位改用 lib/time 的 ymd
 * (与原先的 `(proUntil || '').slice(0, 10)` 逐字等价:ymd 的空档也是空串)。
 * 域内自用件,不出桶(只有 AccountOverview 在用)。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { IconStar } from '@/components/icons'
import { ymd } from '@/lib/time'
import type { AccountPlanLineIn } from './types'
import css from './account.module.css'

/**
 * 套餐行。
 *
 * @param props Pro 在期标记、到期日、取词函数。
 * @returns 套餐那一行。
 */
export function AccountPlanLine({ pro, until = null, t }: AccountPlanLineIn) {
  if (pro) {
    return (
      <div className={css.plan}>
        <div>
          <span className={css.planPro}><IconStar /> {t('acct.plan.pro', { d: ymd(until) })}</span>
        </div>
      </div>
    )
  }
  return (
    <div className={css.plan}>
      <div>
        <span className={css.planFree}>{t('acct.plan.free')}</span>
      </div>
    </div>
  )
}
