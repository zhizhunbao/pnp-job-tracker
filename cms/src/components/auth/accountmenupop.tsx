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
import { LinkButton } from '@/components/button'
import {
  ARIA_MENU, PATH_ACCOUNT, PATH_ACCOUNT_FAVS, PATH_ACCOUNT_PROFILE, PATH_ACCOUNT_SAVED, PATH_ACCOUNT_SJOBS,
  PATH_MATCH, QUIZ_PATH,
} from './constants'
import { PRO_LABEL } from './constants'
import { logout } from './functions'
import type { AccountMenuPopIn } from './types'
import css from './auth.module.css'

/**
 * 下拉弹层。
 *
 * @param props 身份与回调(见 AccountMenuPopIn 逐格注释)。
 * @returns 弹层。
 */
export function AccountMenuPop({ t, email, shortName, isPro, proUntil, onUpgrade }: AccountMenuPopIn) {
  return (
    <div role={ARIA_MENU} className={css.menuPop}>
      <LinkButton href={PATH_ACCOUNT} className={css.menuHead}>
        <div className={css.menuName}>
          {shortName}
          <span className={css.menuPlan}>
            {isPro && <span className={css.menuPro}>{PRO_LABEL}</span>}
            {isPro === false && <span className={css.menuFree}>{t('acct.plan.free')}</span>}
          </span>
        </div>
        <div className={css.menuMail}>{email}</div>
        {/* 到期日独占一行(2026-08-24 Frank 拍 A 案):原先是「Pro · 有效期至 X」,
            那个「·」撞全站铁律「禁·杂糅多信息,一行一条」—— 拆行,三语文案同步去点 */}
        {isPro && proUntil !== '' && <div className={css.menuUntil}>{t('acct.plan.pro', { d: proUntil })}</div>}
      </LinkButton>
      <div className={css.menuSect}>{t('menu.sect.job')}</div>
      <LinkButton href={PATH_MATCH} className={css.menuItem}><IconTarget /> {t('mv.entry')}</LinkButton>
      <LinkButton href={QUIZ_PATH} className={css.menuItem}><IconCompass /> {t('plan.pr.title')}</LinkButton>
      <LinkButton href={PATH_ACCOUNT_FAVS} className={css.menuItem}><IconStar /> {t('fav.title')}</LinkButton>
      <LinkButton href={PATH_ACCOUNT_SJOBS} className={css.menuItem}><IconClipboard /> {t('sj.title')}</LinkButton>
      <div className={css.menuHr} />
      <div className={css.menuSect}>{t('menu.sect.manage')}</div>
      <LinkButton href={PATH_ACCOUNT_PROFILE} className={css.menuItem}><IconUser /> {t('prof.title')}</LinkButton>
      <LinkButton href={PATH_ACCOUNT_SAVED} className={css.menuItem}><IconSave /> {t('ss.title')}</LinkButton>
      <LinkButton href={PATH_ACCOUNT} className={css.menuItem}><IconSettings /> {t('nav.acctTab')}</LinkButton>
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
