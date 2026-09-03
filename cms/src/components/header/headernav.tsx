'use client'
/**
 * header 域的桌面导航排(方案 A,2026-07-17 用户拍板):就业把脉 / 职位 / 拿 PR 评估 /
 * 雇主 + 资料库 ▾ / 资讯 ▾ 两个 hover 下拉。E13-03:开始规划/榜单/地区统计三项合一
 * 为「就业把脉」;「我的账户」独立项 2026-08-09 Frank 摘除(账户入口只留头像);
 * 「雇主」2026-08-16 挂回(有了真雇主板)。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { cssOf } from '@/components/css'
import { IconChart, IconClipboard, IconCompass, IconMedal, IconNews, IconUsers } from '@/components/icons'
import { LinkButton } from '@/components/button'
import {
  A_EMPLOYERS, A_JOBS, A_LIBRARY, A_MATCH, A_NEWS, A_PATHWAYS, A_PTE, A_RANK, A_START, A_STATS, PATH_CASES,
  PATH_EMPLOYERS, PATH_HOME,
  PATH_NEWS, PATH_OCC, PATH_PLAN_PR, PATH_PTE, PATH_RESOURCES, PATH_START, PATH_TIMELINE,
} from './constants'
import { withOn } from './functions'
import { NavDrop } from './navdrop'
import type { HeaderNavIn } from './types'
import css from './header.module.css'

/**
 * 桌面导航排。
 *
 * @param props 翻译函数与高亮键。
 * @returns 导航排。
 */
export function HeaderNav({ t, active }: HeaderNavIn) {
  const onStart = active === A_START || active === A_STATS || active === A_RANK
  const onJobs = active === A_JOBS || active === A_MATCH
  const onNews = active === A_NEWS
  return (
    <div className={css.nav}>
      <LinkButton href={PATH_START} className={withOn({ base: cssOf(css.navLink), on: onStart })}>
        <IconChart /> {t('pulse.entry')}
      </LinkButton>
      <LinkButton href={PATH_HOME} className={withOn({ base: cssOf(css.navLink), on: onJobs })}>
        <IconClipboard /> {t('nav.jobs')}
      </LinkButton>
      <LinkButton href={PATH_PLAN_PR} className={withOn({ base: cssOf(css.navLink), on: active === A_PATHWAYS })}>
        <IconCompass /> {t('plan.pr.title')}
      </LinkButton>
      <LinkButton href={PATH_EMPLOYERS} className={withOn({ base: cssOf(css.navLink), on: active === A_EMPLOYERS })}>
        <IconUsers /> {t('nav.employers')}
      </LinkButton>
      <LinkButton href={PATH_PTE} className={withOn({ base: cssOf(css.navLink), on: active === A_PTE })}>
        <IconMedal /> {t('nav.pte')}
      </LinkButton>
      <NavDrop label={t('nav.library')}
        icon={<IconUsers />}
        highlight={active === A_LIBRARY}
        items={[
          { href: PATH_OCC, label: t('dir.occ.title') },
          { href: PATH_RESOURCES, label: t('res.entry') },
          { href: PATH_CASES, label: t('dp.cases') },
        ]} />
      <NavDrop label={t('nav.info')}
        icon={<IconNews />}
        highlight={onNews}
        items={[
          { href: PATH_NEWS, label: t('news.entry'), active: onNews },
          { href: PATH_TIMELINE, label: t('nav.timeline') },
        ]} />
    </div>
  )
}
