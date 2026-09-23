'use client'
/**
 * auth 域的账户下拉弹层(身份头 + 求职/管理两组条目 + 升级/登出)。
 * 2026-08-24 自 AccountMenu 拆出(function-length 闸 81 行超限,按闸拆;
 * 域内小件不出桶)。
 * 2026-09-23 Frank 把账户页撤到三节(「只保留一个 我的简历 我的收藏 我的求职 其他的能删都删了」,
 * 起因是他截图说移民档案节「基本上是完全没法用」;撤的是概览、移民档案、已保存的筛选、升级 Pro
 * 四节):下拉同批删「移民档案」「已保存的筛选」「账户设置」三项;「求职」组补「我的简历」,
 * 顺序改成 匹配、我的简历、我的收藏、我的求职。「管理」组只剩「升级」一项,组标题随之撤掉,
 * 「升级」留在分隔线下 —— 那条分隔线跟着「升级」一起只在免费档出,Pro 档没有「升级」,
 * 不然会和登出上面那条叠成两道线。
 * 2026-09-23「我的匹配」整拆(Frank「我觉得 我的匹配 功能也可以去掉。让用户自己筛 职位 直接 收藏」):
 * 「求职」组的「匹配」一项撤,收藏本就在组里,剩 我的简历、我的收藏、我的求职。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { IconClipboard, IconPaperclip, IconStar } from '@/components/icons'
import { Button, LinkButton } from '@/components/button'
import {
  ARIA_MENU, PATH_ACCOUNT, PATH_ACCOUNT_FAVS, PATH_ACCOUNT_RESUME, PATH_ACCOUNT_SJOBS,
  PLAIN_BTN_KIND, PRO_LABEL,
} from './constants'
import { logout } from './functions'
import type { AccountMenuPopIn } from './types'
import css from './auth.module.css'

/**
 * 下拉弹层。
 * 到期日独占一行(2026-08-24 Frank 拍 A 案):原先是「Pro · 有效期至 X」,
 * 那个「·」撞全站铁律「禁·杂糅多信息,一行一条」—— 拆行,三语文案同步去点。
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
        {isPro && proUntil !== '' && <div className={css.menuUntil}>{t('acct.plan.pro', { d: proUntil })}</div>}
      </LinkButton>
      <div className={css.menuSect}>{t('menu.sect.job')}</div>
      <LinkButton href={PATH_ACCOUNT_RESUME} className={css.menuItem}>
        <IconPaperclip /> {t('rm.arch.title')}
      </LinkButton>
      <LinkButton href={PATH_ACCOUNT_FAVS} className={css.menuItem}><IconStar /> {t('fav.title')}</LinkButton>
      <LinkButton href={PATH_ACCOUNT_SJOBS} className={css.menuItem}><IconClipboard /> {t('sj.title')}</LinkButton>
      {onUpgrade != null && (
        <>
          <div className={css.menuHr} />
          <Button kind={PLAIN_BTN_KIND} onClick={onUpgrade} className={`${css.menuItem} ${css.menuItemPro}`}>
            <IconStar /> {t('up.cta2')}
          </Button>
        </>
      )}
      <div className={`${css.menuHr} ${css.menuHrTight}`} />
      <Button kind={PLAIN_BTN_KIND}
        onClick={logout}
        className={`${css.menuItem} ${css.menuItemDim}`}>{t('acct.logout')}</Button>
    </div>
  )
}
