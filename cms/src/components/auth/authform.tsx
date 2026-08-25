'use client'
/**
 * auth 域的主结构:登录/注册/找回/重置四态表单(E3-02;#54 careerbeacon 骨架 ——
 * 品牌头 + 社交钮在上 + 「或用邮箱」分隔 + 单列表单 + 底部切换)。
 * 本组件只做装配:四态机在 hooks(useAuthForm),提交流在 functions,
 * 头部/表单体/页脚/强度条各归各件。
 * 2026-08-24 组件域形制化(原 256 行拆成八件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { Notice } from '@/components/notice'
import { BTN_TYPE_BUTTON, MODE_FORGOT, MODE_LOGIN, MODE_REGISTER, MODE_RESET, NOTICE_OK } from './constants'
import { AuthFields } from './authfields'
import { AuthFooter } from './authfooter'
import { AuthHero } from './authhero'
import { BrandHead } from './brandhead'
import { useAuthForm } from './hooks'
import type { AuthFormIn, AuthMode } from './types'
import css from './auth.module.css'

/**
 * 四态表单。
 *
 * @param props 完成回调与入口参数(见 AuthFormIn 逐格注释)。
 * @returns 表单。
 */
export function AuthForm({ t, onDone, initialMode, resetToken, returnTo, hero }: AuthFormIn) {
  let init: AuthMode = MODE_LOGIN
  if (initialMode != null) {
    init = initialMode
  }
  let token: string | null = null
  if (resetToken != null) {
    token = resetToken
  }
  let rt: string | null = null
  if (returnTo != null) {
    rt = returnTo
  }
  let heroIn: string | null = null
  if (hero != null) {
    heroIn = hero
  }
  const f = useAuthForm({ t, onDone, init, resetToken: token, returnTo: rt })

  return (
    <div>
      <BrandHead />
      {(f.mode === MODE_LOGIN || f.mode === MODE_REGISTER) && (
        <AuthHero t={t} mode={f.mode} hero={heroIn} go={f.goGoogle} />
      )}
      {f.mode === MODE_RESET && <div className={css.resetTitle}>{t('acct.resetTitle')}</div>}
      {f.mode === MODE_FORGOT && f.sent && (
        <div>
          <Notice kind={NOTICE_OK}>{t('acct.forgotSent')}</Notice>
          <button type={BTN_TYPE_BUTTON} onClick={f.backFromSent} className={css.sentBack}>
            {t('acct.backLogin')}
          </button>
        </div>
      )}
      {(f.mode !== MODE_FORGOT || f.sent === false) && (
        <AuthFields t={t}
          mode={f.mode}
          email={f.email}
          pw={f.pw}
          busy={f.busy}
          err={f.err}
          onEmail={f.onEmail}
          onPw={f.onPw}
          onSubmit={f.submit} />
      )}
      <AuthFooter t={t} mode={f.mode} sent={f.sent} onMode={f.switchMode} />
    </div>
  )
}
