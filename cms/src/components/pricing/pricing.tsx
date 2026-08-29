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
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
import { AuthModal } from '@/components/auth'
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { PricingCard } from './pricingcard'
import { Shell } from '@/components/shell'
import { AUTH_MODE_REGISTER, SHELL_TOP, URL_START } from './constants'
import { pricingShotOf } from './functions'
import { usePricingPage } from './hooks'
import type { PricingIn } from './types'
import css from './pricing.module.css'

/**
 * 定价页正文。
 *
 * @param props 登录态、Pro 态与档位数(逐格注释见 PricingIn)。
 * @returns 正文(Shell 轨 + 标题两行 + 营销截图 + 三卡价卡)与注册弹框。
 */
export function Pricing({ loggedIn, pro, caps }: PricingIn) {
  const page = usePricingPage()
  return (
    <>
      <Shell top={SHELL_TOP}>
        <div className={css.track}>
          <h1 className={css.h1}>{page.t('price.title')}</h1>
          <p className={css.sub}>{page.t('price.sub')}</p>
          <LinkButton href={URL_START} onClick={page.onShot} className={cssOf(css.shotLink)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 营销截图,换 next/image 需定尺寸与视觉验收,待拍板项(2026-08-27) */}
            <img src={pricingShotOf({ lang: page.lang })}
              alt={page.t('se.title')}
              className={cssOf(css.shot)} />
          </LinkButton>
          <PricingCard t={page.t}
            loggedIn={loggedIn}
            pro={pro}
            caps={caps}
            onRegister={page.onRegister} />
        </div>
      </Shell>
      {page.authOpen && <AuthModal t={page.t}
        mode={AUTH_MODE_REGISTER}
        onClose={page.onAuthClose}
        onDone={page.onAuthDone} />}
    </>
  )
}
