'use client'
/**
 * pricing 域的对照三卡 + CTA 三态(未登录 → 注册 / 已登录 → Checkout / 已 Pro → 账户)。
 * **页面版与弹窗版共用这一份代码,不许 fork**:/pricing 页留给直链、SEO 与 Stripe 回跳,
 * 站内入口一律开定价弹窗(E8-02,2026-07-06 用户拍板「定价也是弹窗」)。
 * #64 定价卡片式 v3(Supabase 参考图,效果图 v3 定稿):免费 / Pro90 / Pro30 三卡取代
 * 旧的 10 行对照表;三卡各自成文件,本件只管排布与卡底那一行账户入口。
 * 2026-08-28 换装批自 PricingModal.tsx 整体重写成小写件形制(内联样式逐格迁
 * pricing.module.css、购买流与埋点进 functions、忙态进 hooks、散值进 constants)。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { URL_ACCOUNT } from './constants'
import { usePricingBuy } from './hooks'
import { PricingFree } from './pricingfree'
import { PricingPro30 } from './pricingpro30'
import { PricingPro90 } from './pricingpro90'
import type { PricingCardIn } from './types'
import css from './pricing.module.css'

/**
 * 对照三卡。
 *
 * @param props 取词函数、登录态、Pro 态、档位数与注册出口(逐格注释见 PricingCardIn)。
 * @returns 三卡与已是 Pro 时的账户页入口。
 */
export function PricingCard({ t, loggedIn, pro, onRegister }: PricingCardIn) {
  const buy = usePricingBuy({ loggedIn, onRegister })
  return (
    <div>
      <div className={css.grid}>
        <PricingFree t={t} loggedIn={loggedIn} pro={pro} onRegister={onRegister} />
        <PricingPro90 t={t} busy={buy.busy} onBuy={buy.onBuy} />
        <PricingPro30 t={t} busy={buy.busy} onBuy={buy.onBuy} />
      </div>
      {pro && (
        <div className={css.acct}>
          <LinkButton href={URL_ACCOUNT} className={cssOf(css.acctLink)}>{t('price.cta.acct')}</LinkButton>
        </div>
      )}
    </div>
  )
}
