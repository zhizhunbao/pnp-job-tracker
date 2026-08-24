'use client'
/**
 * header 域的主结构:全站唯一顶栏(#65 header 合一,2026-07-18 Frank「header 合一
 * 也做」「为什么不一样宽」—— 头轨统一 1320px 跟最宽的职位板走)。/jobs 特有件走
 * props(accountArea 完整账户下拉/sticky);二级页缺省 AccountLite。
 * 拆件:导航排 headernav、账户区 accountlite、下拉 navdrop、抽屉 mobiledrawer、
 * 语言切换 langswitch;账户三态机在 hooks 的 useAcct。
 * 2026-08-24 自 app/(frontend)/Header.tsx 迁入成域(一个 tsx 一个组件)。
 *
 * matchButton prop 是历史槽位(「我的匹配」已降为板内视图,入口并进职位高亮),
 * 调用方还在传 —— 撤编随消费页形制化批,这里收下不渲。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { useState } from 'react'

import { IconMenu } from '@/components/icons'

import { PATH_HOME } from './constants'
import { AccountLite } from './accountlite'
import { HeaderNav } from './headernav'
import { LangSwitch } from './langswitch'
import { MobileDrawer } from './mobiledrawer'
import { useAcct } from './hooks'
import type { ActiveKey, HeaderIn } from './types'
import css from './header.module.css'

/**
 * 全站顶栏。
 *
 * @param props 语言/高亮/宿主件(见 HeaderIn 逐格注释)。
 * @returns 顶栏。
 */
export function Header({ lang, setLang, t, active, sticky = false, accountArea, loggedIn }: HeaderIn) {
  let activeIn: ActiveKey | null = null
  if (active != null) {
    activeIn = active
  }
  let logged: boolean | null = null
  if (loggedIn != null) {
    logged = loggedIn
  }
  let hasArea = false
  if (accountArea != null) {
    hasArea = true
  }
  const acct = useAcct({ loggedIn: logged, hasAccountArea: hasArea })
  const [drawer, setDrawer] = useState(false)

  function openDrawer() {
    setDrawer(true)
  }

  function closeDrawer() {
    setDrawer(false)
  }

  let headCls = css.header
  if (sticky) {
    headCls = `${css.header} ${css.sticky}`
  }
  let area = <AccountLite t={t} acct={acct} />
  if (accountArea != null) {
    area = <>{accountArea}</>
  }
  return (
    <header className={headCls}>
      <div className={css.bar}>
        <div className={css.brand}>
          <button className={css.burger} onClick={openDrawer} aria-label={t('nav.menu')}><IconMenu /></button>
          <a href={PATH_HOME} className={`${css.tapY} ${css.logo}`}>🍁 Offer2PR</a>
          <span className={css.tagline}>{t('tagline')}</span>
        </div>
        <div className={css.right}>
          <HeaderNav t={t} active={activeIn} />
          <span className={css.divider} />
          <div className={css.acct}>
            <LangSwitch lang={lang} setLang={setLang} />
            {area}
          </div>
        </div>
      </div>
      {drawer && <MobileDrawer t={t} active={activeIn} onClose={closeDrawer} />}
    </header>
  )
}
