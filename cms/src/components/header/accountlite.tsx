'use client'
/**
 * header 域的二级页缺省账户区:loading 占位槽 → 有票据无身份的占位圆(不能让
 * Avatar 拿空 email 兜底成「?」,2026-08-17 Frank「会先变成问号」)→ 登录 =
 * 共用 AccountMenu 下拉(2026-08-15「点这个应该还是下拉啊」)→ 未登录 =
 * 登录/注册钮就地开 AuthModal(2026-08-09「为什么要跳到 jobtable 页面再弹框」;
 * 按需载,header 常驻包不背它)。Pro 钮不进 header(2026-07-18「没有意义」)。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 * ⚠️ 过渡边:PricingModal 2026-08-26 随页面域搬家落户 components/jobs(定价件未域化),
 * 这里点文件不走 jobs 桶 —— 走桶会把 header 与 jobs 焊成环(jobs/Jobs 反过来引 header 桶),
 * import/no-cycle 当场报错。待 pricing 件自己成域后换桶。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { useState } from 'react'
import dynamic from 'next/dynamic'

import { PricingModal } from '@/components/jobs/PricingModal'
import { AccountMenu } from '@/components/auth'
import { Button } from '@/components/button'
import { ACCT_IN, ACCT_LOADING, ARIA_TRUE, AUTH_CLOSED, KIND_LOGIN, KIND_REGISTER } from './constants'
import { loadAuthModal, makeAccountLiteHandles } from './functions'
import type { AccountLiteIn, AuthOpen } from './types'
import css from './header.module.css'

/**
 * 按需载的登录弹框(装载管道在 functions 的 loadAuthModal)。
 */
const AuthModal = dynamic(loadAuthModal, { ssr: false })

/**
 * 二级页账户区。
 *
 * @param props 翻译函数与账户状态。
 * @returns 账户区。
 */
export function AccountLite({ t, acct }: AccountLiteIn) {
  const [auth, setAuth] = useState<AuthOpen>(AUTH_CLOSED)
  const [pricing, setPricing] = useState(false)
  const handles = makeAccountLiteHandles({ setAuth, setPricing })

  if (acct.state === ACCT_LOADING) {
    return <span className={css.acctSlot} />
  }
  if (acct.state === ACCT_IN && acct.u.email === '') {
    return <span className={css.acctSlot}><span className={css.acctDot} aria-hidden={ARIA_TRUE} /></span>
  }
  if (acct.state === ACCT_IN) {
    return (
      <>
        <AccountMenu t={t}
          email={acct.u.email}
          displayName={acct.u.displayName}
          avatar={acct.u.avatar}
          isPro={acct.u.pro}
          onPricing={handles.openPricing} />
        {pricing && <PricingModal t={t} loggedIn pro={acct.u.pro} onClose={handles.closePricing} />}
      </>
    )
  }
  return (
    <>
      <Button kind={KIND_LOGIN} sm className={css.tapY} onClick={handles.openLogin}>{t('nav.login')}</Button>
      <Button kind={KIND_REGISTER} sm className={css.tapY} onClick={handles.openRegister}>{t('nav.register')}</Button>
      {auth !== '' && <AuthModal t={t} mode={auth} onClose={handles.closeAuth} onDone={handles.reload} />}
    </>
  )
}
