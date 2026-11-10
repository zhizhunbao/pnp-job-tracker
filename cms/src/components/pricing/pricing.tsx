'use client'
/**
 * pricing 域的结构:/pricing 定价页正文(E5-01)。对照表与按钮三态在同域的 PricingCard
 * (单一来源,弹窗版与页面版共用,不许 fork);本页只是 SEO / 直链 / Stripe 回跳用的
 * 页面壳(E8-02 拍板:站内入口一律开定价弹窗)。档位数由服务端 lib/quota 读 env 算好
 * 随 props 传进来 —— 客户端直接 import 拿到的是构建期默认值。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接 useLang。
 * 2026-08-28 换装批自 Pricing.tsx 整体重写成小写件形制(内联样式逐格迁类、散值进
 * constants、状态与埋点进 hooks、语言分支与手柄进 functions);壳件(整页外框 Frame /
 * 顶栏 / 页脚)拼装归页面门(Frank「组装只许在 (frontend) 页面门里」,样张 account),
 * 本件只出 Shell 轨往下的视图。
 * 2026-11-09 Frank「现在有两个定价页,是不是合成一个」→ 看图后「可以」:全站卖会员只留升级框那一种形态 ——
 * 本页的营销截图与 PricingCard 那套大卡撤,换成一张分区卡里铺升级框的正文 UpgradeBody(权益带说明那一行);
 * 网址照旧(外链与收录)。档位数 caps 随对照表早撤后已无人读,这一格一并撤。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Shell } from '@/components/shell'
import { CARD_MD_CLS, SHELL_TOP, URL_ACCOUNT } from './constants'
import { usePricingPage } from './hooks'
import type { PricingIn } from './types'
import { UpgradeBody } from './upgradebody'
import css from './pricing.module.css'

/**
 * 定价页正文。
 *
 * @param props 登录态与 Pro 态(逐格注释见 PricingIn)。
 * @returns 正文(Shell 轨 + 标题两行 + 一张卡里的升级框正文);已是 Pro 时多一个账户页入口。
 */
export function Pricing({ loggedIn, pro }: PricingIn) {
  const page = usePricingPage()
  return (
    <Shell top={SHELL_TOP}>
      <div className={css.track}>
        <h1 className={css.h1}>{page.t('price.title')}</h1>
        <p className={css.sub}>{page.t('price.sub')}</p>
        <div className={`${CARD_MD_CLS} ${css.pageCard}`}>
          <UpgradeBody t={page.t} loggedIn={loggedIn} detail />
        </div>
        {pro && (
          <div className={css.acct}>
            <LinkButton href={URL_ACCOUNT} className={cssOf(css.acctLink)}>{page.t('price.cta.acct')}</LinkButton>
          </div>
        )}
      </div>
    </Shell>
  )
}
