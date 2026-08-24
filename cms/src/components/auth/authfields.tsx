'use client'
/**
 * auth 域的表单体:邮箱/密码字段(按态显隐)+ 强度条 + 报错 + 提交钮。
 * minLength 只管注册与重置(都是设新密码);登录挂长度校验会把老短密码账号
 * 整个拦在门外(2026-07-16 用户实测)—— login 态给 0 等于不拦。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { Button } from '@/components/button'
import { Notice } from '@/components/notice'
import { MODE_FORGOT, MODE_LOGIN, MODE_REGISTER, MODE_RESET, PW_MIN_LEN } from './constants'
import { submitKeyOf } from './functions'
import { PwMeter } from './pwmeter'
import type { AuthFieldsIn } from './types'
import css from './auth.module.css'

/**
 * 表单体。
 *
 * @param props 态/值/回调(见 AuthFieldsIn 逐格注释)。
 * @returns 表单。
 */
export function AuthFields({ t, mode, email, pw, busy, err, onEmail, onPw, onSubmit }: AuthFieldsIn) {
  const showEmail = mode !== MODE_RESET
  const showPw = mode !== MODE_FORGOT
  let minLen = PW_MIN_LEN
  if (mode === MODE_LOGIN) {
    minLen = 0
  }
  let autoComplete = 'new-password'
  if (mode === MODE_LOGIN) {
    autoComplete = 'current-password'
  }
  let submitLabel = t(submitKeyOf(mode))
  if (busy) {
    submitLabel = '…'
  }
  return (
    <form onSubmit={onSubmit}>
      {showEmail && (
        <label className={css.label}>{t('acct.email')}
          <input className={css.input}
            type="email"
            required
            value={email}
            onChange={onEmail}
            autoComplete="email"
            placeholder="you@example.com" />
        </label>
      )}
      {showPw && (
        <>
          {showEmail && <div className={css.fieldGap} />}
          <label className={css.label}>{t('acct.password')}
            <input className={css.input}
              type="password"
              required
              minLength={minLen}
              value={pw}
              onChange={onPw}
              autoComplete={autoComplete}
              placeholder="••••••••" />
          </label>
        </>
      )}
      {(mode === MODE_REGISTER || mode === MODE_RESET) && pw !== '' && <PwMeter t={t} pw={pw} />}
      {err !== '' && <Notice kind="err" className={css.errGap}>{err}</Notice>}
      <Button lg disabled={busy} className={css.submitBtn}>{submitLabel}</Button>
    </form>
  )
}
