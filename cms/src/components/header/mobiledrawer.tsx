'use client'
/**
 * header 域的窄屏侧滑抽屉(E8-07 D 件):条目圆角块,带二级的组 chevron 展开,
 * 遮罩/× 关,当前页高亮;portal 到 body —— 抽屉原来渲在 header 里 = main 内部,
 * main 一 transform 就成了 fixed 的包含块,抽屉会跟着页面一起被推走。
 * 推主页面的机器在 hooks 的 useMainPush。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { cssOf } from '@/components/css'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { IconX } from '@/components/icons'
import { Button, LinkButton } from '@/components/button'

import {
  A_EMPLOYERS, A_JOBS, A_MATCH, A_NEWS, A_PATHWAYS, A_RANK, A_START, A_STATS, BRAND_MARK, GRP_INFO, GRP_LIB,
  GRP_NONE, GRP_PTE, PATH_CASES, PATH_EMPLOYERS, PATH_HOME, PATH_NEWS, PATH_OCC, PATH_PLAN_PR, PATH_PTE, PATH_PTE_ASQ,
  PATH_PTE_RA, PATH_PTE_RS, PATH_PTE_WFD, PATH_RESOURCES, PATH_START, PATH_TIMELINE, PLAIN_BTN_KIND,
} from './constants'
import { makeGroupToggle, stopClick, withOn } from './functions'
import { DrawerGroup } from './drawergroup'
import { useMainPush } from './hooks'
import type { MobileDrawerIn } from './types'
import css from './header.module.css'

/**
 * 侧滑抽屉。
 *
 * @param props 翻译函数/高亮键/关闭回调。
 * @returns portal 到 body 的抽屉。
 */
export function MobileDrawer({ t, active, onClose }: MobileDrawerIn) {
  const [openGrp, setOpenGrp] = useState(GRP_NONE)
  useMainPush()

  const toggleGrp = makeGroupToggle({ openKey: openGrp, noneKey: GRP_NONE, setOpenKey: setOpenGrp })
  const onHome = active == null
  const onStart = active === A_START || active === A_STATS || active === A_RANK
  const onJobs = active === A_JOBS || active === A_MATCH
  const onNews = active === A_NEWS
  return createPortal(
    <div className={css.drawerMask} onClick={onClose}>
      <div className={css.drawer} onClick={stopClick}>
        <div className={css.drawerHead}>
          <span className={css.drawerBrand}>{BRAND_MARK}</span>
          <Button kind={PLAIN_BTN_KIND}
            className={css.drawerClose}
            onClick={onClose}
            ariaLabel={t('nav.menu')}><IconX /></Button>
        </div>
        <nav className={css.drawerNav}>
          <LinkButton href={PATH_HOME} className={withOn({ base: cssOf(css.drawerItem), on: onHome })}>
            {t('detail.crumbHome')}
          </LinkButton>
          <LinkButton href={PATH_START} className={withOn({ base: cssOf(css.drawerItem), on: onStart })}>
            {t('pulse.entry')}
          </LinkButton>
          <LinkButton href={PATH_HOME} className={withOn({ base: cssOf(css.drawerItem), on: onJobs })}>
            {t('nav.jobs')}
          </LinkButton>
          <LinkButton href={PATH_PLAN_PR}
            className={withOn({ base: cssOf(css.drawerItem), on: active === A_PATHWAYS })}>
            {t('plan.pr.title')}
          </LinkButton>
          <LinkButton href={PATH_EMPLOYERS}
            className={withOn({ base: cssOf(css.drawerItem), on: active === A_EMPLOYERS })}>
            {t('nav.employers')}
          </LinkButton>
          <DrawerGroup groupKey={GRP_PTE}
            label={t('nav.pte')}
            openKey={openGrp}
            onToggle={toggleGrp}
            items={[
              { href: PATH_PTE, label: t('pte.nav.home') },
              { href: PATH_PTE_RA, label: t('pte.nav.RA') },
              { href: PATH_PTE_RS, label: t('pte.nav.RS') },
              { href: PATH_PTE_ASQ, label: t('pte.nav.ASQ') },
              { href: PATH_PTE_WFD, label: t('pte.nav.WFD') },
            ]} />
          <DrawerGroup groupKey={GRP_LIB}
            label={t('nav.library')}
            openKey={openGrp}
            onToggle={toggleGrp}
            items={[
              { href: PATH_OCC, label: t('dir.occ.title') },
              { href: PATH_RESOURCES, label: t('res.entry') },
              { href: PATH_CASES, label: t('dp.cases') },
            ]} />
          <DrawerGroup groupKey={GRP_INFO}
            label={t('nav.info')}
            openKey={openGrp}
            onToggle={toggleGrp}
            items={[
              { href: PATH_NEWS, label: t('news.entry'), active: onNews },
              { href: PATH_TIMELINE, label: t('nav.timeline') },
            ]} />
        </nav>
      </div>
    </div>,
    document.body,
  )
}
