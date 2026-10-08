'use client'
/**
 * pricing 域的对照三卡 + CTA 三态(未登录 → 注册 / 已登录 → Checkout / 已 Pro → 账户)。
 * **页面版与弹窗版共用这一份代码,不许 fork**:/pricing 页留给直链、SEO 与 Stripe 回跳,
 * 站内入口一律开定价弹窗(E8-02,2026-07-06 用户拍板「定价也是弹窗」)。
 * #64 定价卡片式 v3(Supabase 参考图,效果图 v3 定稿):免费 / Pro90 / Pro30 三卡取代
 * 旧的 10 行对照表;三卡各自成文件,本件只管排布与卡底那一行账户入口。
 * 2026-08-28 换装批自 PricingModal.tsx 整体重写成小写件形制(内联样式逐格迁
 * pricing.module.css、购买流与埋点进 functions、忙态进 hooks、散值进 constants)。
 * 2026-10-07 Frank「这个免费的这个删掉吧」:免费卡撤,剩 Pro 90 / Pro 30 两卡;免费的东西不再列清单。
 * 同日:两卡只放价格与购买钮,Pro 权益清单(PRO_PERKS)挪到两卡下面共用一份 —— 免费卡撤后 30 天卡只剩一句「与 90 天相同」,空了一大块。
 *
 * @author Frank
 * @time 2026-08-28 16:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { PRO_PERKS, URL_ACCOUNT } from './constants'
import { usePricingBuy } from './hooks'
import { PriceSell } from './pricesell'
import { PricingPro30 } from './pricingpro30'
import { PricingPro90 } from './pricingpro90'
import type { PricingCardIn } from './types'
import css from './pricing.module.css'

/**
 * Pro 两卡。
 *
 * @param props 取词函数、登录态、Pro 态、档位数与注册出口(逐格注释见 PricingCardIn)。
 * @returns 两卡、权益清单与已是 Pro 时的账户页入口。
 */
export function PricingCard({ t, loggedIn, pro, onRegister }: PricingCardIn) {
  const buy = usePricingBuy({ loggedIn, onRegister })
  const perks = []
  for (const [head, detail] of PRO_PERKS) {
    perks.push(<PriceSell key={head} head={t(head)} detail={t(detail)} />)
  }
  return (
    <div>
      <div className={css.grid}>
        <PricingPro90 t={t} busy={buy.busy} onBuy={buy.onBuy} />
        <PricingPro30 t={t} busy={buy.busy} onBuy={buy.onBuy} />
      </div>
      <div className={css.perksHead}>{t('price.incl')}</div>
      <ul className={css.perks}>{perks}</ul>
      {pro && (
        <div className={css.acct}>
          <LinkButton href={URL_ACCOUNT} className={cssOf(css.acctLink)}>{t('price.cta.acct')}</LinkButton>
        </div>
      )}
    </div>
  )
}
