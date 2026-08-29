'use client'
/**
 * auth 域的表单页脚:态切换钮(登录↔注册 / 忘记密码 / 返回登录 —— #54:
 * 底部单行取代分段 tab)。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { Button } from '@/components/button'
import type { AuthFooterIn } from './types'
import {
  BTN_TYPE_BUTTON, KEY_TO_LOGIN, KEY_TO_REG, MODE_FORGOT, MODE_LOGIN, MODE_REGISTER, MODE_RESET, PLAIN_BTN_KIND,
} from './constants'
import { makeAuthFooterHandles } from './functions'
import css from './auth.module.css'

/**
 * 页脚钮组(按当前态渲对应的切换钮)。
 *
 * @param props 态与切换回调。
 * @returns 页脚钮组。
 */
export function AuthFooter({ t, mode, sent, onMode }: AuthFooterIn) {
  const handles = makeAuthFooterHandles({ mode, onMode })
  let toggleKey = KEY_TO_LOGIN
  if (mode === MODE_LOGIN) {
    toggleKey = KEY_TO_REG
  }
  return (
    <>
      {(mode === MODE_LOGIN || mode === MODE_REGISTER) && (
        <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE_BUTTON} onClick={handles.toggle} className={css.footToggle}>
          {t(toggleKey)}
        </Button>
      )}
      {mode === MODE_LOGIN && (
        <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE_BUTTON} onClick={handles.toForgot} className={css.footForgot}>
          {t('acct.forgot')}
        </Button>
      )}
      {(mode === MODE_RESET || (mode === MODE_FORGOT && sent === false)) && (
        <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE_BUTTON} onClick={handles.toLogin} className={css.footBack}>
          {t('acct.backLogin')}
        </Button>
      )}
    </>
  )
}
