'use client'
/**
 * auth 域的表单头部区:大标题文案(#54 careerbeacon 式价值前置;register 态可被
 * 调用方语境标题 hero 换掉,登录态照旧)+ Google 区(env 门控)。
 * 只在 login/register 两态渲染,由调用方判。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { GOOGLE_ON, MODE_REGISTER } from './constants'
import { GoogleButton } from './googlebutton'
import type { AuthHeroIn } from './types'
import css from './auth.module.css'

/**
 * 头部区(大标题 + Google 钮)。
 *
 * @param props 态/语境标题/Google 点击。
 * @returns 头部区。
 */
export function AuthHero({ t, mode, hero, go }: AuthHeroIn) {
  let text = t('acct.hero.login')
  let cls = css.hero
  if (mode === MODE_REGISTER) {
    text = t('acct.hero.reg')
    cls = `${css.hero} ${css.heroTight}`
    if (hero != null && hero !== '') {
      text = hero
    }
  }
  return (
    <>
      <div className={cls}>{text}</div>
      {GOOGLE_ON && <GoogleButton t={t} go={go} />}
    </>
  )
}
