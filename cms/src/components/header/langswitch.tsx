'use client'
/**
 * header 域的语言切换钮组(三语并排,当前语言蓝底)。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { cssOf } from '@/components/css'
import { LANGS } from '@/lib/i18n'
import { withOn } from './functions'
import type { LangSwitchIn } from './types'
import css from './header.module.css'

/**
 * 语言切换钮组。
 *
 * @param props 当前语言与换语言。
 * @returns 钮组。
 */
export function LangSwitch({ lang, setLang }: LangSwitchIn) {
  const btns = []
  for (const l of LANGS) {
    function pick() {
      setLang(l.code)
    }

    btns.push(
      <button key={l.code} className={withOn({ base: cssOf(css.langBtn), on: lang === l.code })} onClick={pick}>
        {l.label}
      </button>,
    )
  }
  return <div className={css.langWrap}>{btns}</div>
}
