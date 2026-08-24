'use client'
/**
 * auth 域的 Google 登录钮 + 「或用邮箱」分隔行(#54 骨架:社交在上;
 * Google 是整页 OAuth 跳转,去处由调用方拼好传进 go)。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { GoogleIcon } from './googleicon'
import type { GoogleButtonIn } from './types'
import css from './auth.module.css'

/**
 * Google 钮与分隔行。
 *
 * @param props 翻译函数与点击。
 * @returns 钮 + 分隔行。
 */
export function GoogleButton({ t, go }: GoogleButtonIn) {
  return (
    <>
      <a href="/api/auth/google" onClick={go} className={css.googleBtn}>
        <GoogleIcon /> {t('acct.google')}
      </a>
      <div className={css.orRow}>
        <span className={css.orLine} />{t('acct.orEmail')}<span className={css.orLine} />
      </div>
    </>
  )
}
