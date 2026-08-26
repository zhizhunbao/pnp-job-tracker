'use client'
/**
 * auth 域的表单页脚:态切换钮(登录↔注册 / 忘记密码 / 返回登录 —— #54:
 * 底部单行取代分段 tab)。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import type { AuthFooterIn } from './types'
import {
  BTN_TYPE_BUTTON, KEY_TO_LOGIN, KEY_TO_REG, MODE_FORGOT, MODE_LOGIN, MODE_REGISTER, MODE_RESET,
} from './constants'
import css from './auth.module.css'

/**
 * 页脚钮组(按当前态渲对应的切换钮)。
 *
 * @param props 态与切换回调。
 * @returns 页脚钮组。
 */
export function AuthFooter({ t, mode, sent, onMode }: AuthFooterIn) {
  function toLogin() {
    onMode(MODE_LOGIN)
  }

  function toggle() {
    if (mode === MODE_LOGIN) {
      onMode(MODE_REGISTER)
    } else {
      onMode(MODE_LOGIN)
    }
  }

  function toForgot() {
    onMode(MODE_FORGOT)
  }

  let toggleKey = KEY_TO_LOGIN
  if (mode === MODE_LOGIN) {
    toggleKey = KEY_TO_REG
  }
  return (
    <>
      {(mode === MODE_LOGIN || mode === MODE_REGISTER) && (
        <button type={BTN_TYPE_BUTTON} onClick={toggle} className={css.footToggle}>
          {t(toggleKey)}
        </button>
      )}
      {mode === MODE_LOGIN && (
        <button type={BTN_TYPE_BUTTON} onClick={toForgot} className={css.footForgot}>
          {t('acct.forgot')}
        </button>
      )}
      {(mode === MODE_RESET || (mode === MODE_FORGOT && sent === false)) && (
        <button type={BTN_TYPE_BUTTON} onClick={toLogin} className={css.footBack}>
          {t('acct.backLogin')}
        </button>
      )}
    </>
  )
}
