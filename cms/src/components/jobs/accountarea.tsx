'use client'
/**
 * 顶栏账户区(E8-01,2026-07-06 归组拍板:登录/注册/Pro 一处)。
 * 未登录 = [登录][注册] 一组(P1 换装:登录 ghost、注册 primary sm —— 每屏唯一主行动);
 * 已登录 = 用户按钮 + 下拉(2026-07-16 用户拍板「用户这部分改成带下拉的按钮」),
 * 菜单本体 2026-08-15 抽成全站共用的 AccountMenu —— 二级页头像先前是直达 /account,
 * 同一个头像两种行为(Frank 实拍),收敛成一个组件。
 * Pro 钮不进 header(#65,Frank:「没有意义」)—— 升级入口 = 横幅 / 升级卡 / 用户菜单 / 定价页,
 * 四处都在。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { AccountMenu, AuthModal } from '@/components/auth'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PricingModal } from '@/components/pricing'
import { BTN_GHOST, BTN_PRIMARY } from './constants'
import { someOf } from './functions'
import { useAccountArea } from './hooks'
import type { AccountAreaIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染顶栏账户区。
 *
 * @param props 取词函数与分层态。
 * @returns 账户区(带它自己的两个弹框)。
 */
export function AccountArea({ t, plan }: AccountAreaIn) {
  const a = useAccountArea(plan)
  return (
    <span className={cssOf(css.acct)}>
      {plan.loggedIn && (
        <AccountMenu t={t} email={a.email}
          displayName={a.displayName}
          avatar={a.avatar}
          isPro={plan.isPro}
          proUntil={a.proUntil}
          onPricing={a.onPricing} />
      )}
      {plan.loggedIn === false && (
        <>
          <Button kind={BTN_GHOST} sm onClick={a.onLogin}>{t('nav.login')}</Button>
          <Button kind={BTN_PRIMARY} sm onClick={a.onRegister}>{t('nav.register')}</Button>
        </>
      )}
      {a.auth !== false && (
        <AuthModal t={t} mode={a.auth} resetToken={someOf(a.resetTok)} onClose={a.onAuthClose}
          onDone={a.onAuthDone} />
      )}
      {a.pricing && (
        <PricingModal t={t} loggedIn={plan.loggedIn} pro={plan.isPro} onClose={a.onPricingClose} />
      )}
    </span>
  )
}
