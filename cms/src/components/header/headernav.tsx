'use client'
/**
 * header 域的桌面导航排(方案 A,2026-07-17 用户拍板):就业把脉 / 职位 / 拿 PR 评估 /
 * 雇主 + 资料库 ▾ / 资讯 ▾ 两个 hover 下拉。E13-03:开始规划/榜单/地区统计三项合一
 * 为「就业把脉」;「我的账户」独立项 2026-08-09 Frank 摘除(账户入口只留头像);
 * 「雇主」2026-08-16 挂回(有了真雇主板);「校内板」2026-09-13 挂上(Algonquin HireAC 登录源,Frank「在一级 title 上加呢」)。
 * 2026-08-24 自 Header 拆出(一个 tsx 一个组件)。
 * 2026-09-23 Frank「这几个模块先隐藏掉」:导航先不挂「拿 PR 评估」「PTE 刷题」「资料库」三项(路由照旧在,直链照旧能开);
 * 挂回 = 这里与 mobiledrawer.tsx 各把那三颗 LinkButton 加回来(地址与高亮键仍在 constants)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { cssOf } from '@/components/css'
import { IconChart, IconClipboard, IconNews, IconUsers } from '@/components/icons'
import { LinkButton } from '@/components/button'
import {
  A_EMPLOYERS, A_JOBS, A_MATCH, A_NEWS, A_RANK, A_START, A_STATS,
  PATH_EMPLOYERS, PATH_HOME,
  PATH_NEWS, PATH_START,
} from './constants'
import { withOn } from './functions'
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
      <LinkButton href={PATH_EMPLOYERS} className={withOn({ base: cssOf(css.navLink), on: active === A_EMPLOYERS })}>
        <IconUsers /> {t('nav.employers')}
      </LinkButton>
      <LinkButton href={PATH_NEWS} className={withOn({ base: cssOf(css.navLink), on: onNews })}>
        <IconNews /> {t('nav.info')}
      </LinkButton>
    </div>
  )
}
