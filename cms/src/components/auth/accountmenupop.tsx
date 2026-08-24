'use client'
/**
 * auth 域的账户下拉弹层(身份头 + 求职/管理两组条目 + 升级/登出)。
 * 2026-08-24 自 AccountMenu 拆出(function-length 闸 81 行超限,按闸拆;
 * 域内小件不出桶)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { IconClipboard, IconCompass, IconSave, IconSettings, IconStar, IconTarget, IconUser } from '@/components/icons'
import { logout } from './functions'
import type { AccountMenuPopIn } from './types'
import css from './auth.module.css'

/**
 * 下拉弹层。
 *
 * @param props 身份与回调(见 AccountMenuPopIn 逐格注释)。
 * @returns 弹层。
 */
export function AccountMenuPop({ t, email, shortName, isPro, proText, onUpgrade }: AccountMenuPopIn) {
  return (
    <div role="menu" className={css.menuPop}>
      <a href="/account" className={css.menuHead}>
        <div className={css.menuName}>
          {shortName}
          <span className={css.menuPlan}>
            {isPro && <span className={css.menuPro}>{proText}</span>}
            {isPro === false && <span className={css.menuFree}>{t('acct.plan.free')}</span>}
          </span>
        </div>
        <div className={css.menuMail}>{email}</div>
      </a>
      <div className={css.menuSect}>{t('menu.sect.job')}</div>
      <a href="/?view=match" className={css.menuItem}><IconTarget /> {t('mv.entry')}</a>
      <a href="/plan/pr" className={css.menuItem}><IconCompass /> {t('plan.pr.title')}</a>
      <a href="/account?sec=favs" className={css.menuItem}><IconStar /> {t('fav.title')}</a>
      <a href="/account?sec=sjobs" className={css.menuItem}><IconClipboard /> {t('sj.title')}</a>
      <div className={css.menuHr} />
      <div className={css.menuSect}>{t('menu.sect.manage')}</div>
      <a href="/account?sec=profile" className={css.menuItem}><IconUser /> {t('prof.title')}</a>
      <a href="/account?sec=saved" className={css.menuItem}><IconSave /> {t('ss.title')}</a>
      <a href="/account" className={css.menuItem}><IconSettings /> {t('nav.acctTab')}</a>
      {onUpgrade != null && (
        <button onClick={onUpgrade} className={`${css.menuItem} ${css.menuItemPro}`}>
          <IconStar /> {t('up.cta2')}
        </button>
      )}
      <div className={`${css.menuHr} ${css.menuHrTight}`} />
      <button onClick={logout} className={`${css.menuItem} ${css.menuItemDim}`}>{t('acct.logout')}</button>
    </div>
  )
}
