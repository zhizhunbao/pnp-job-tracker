'use client'
/**
 * me 域的结构:「我的」左侧导航五项(nav 桶 Nav;每项一个图标,收件箱带红色未读数)。
 * 宽屏放在 NavFrame 左栏,窄屏放进抽屉,两处同一个件。
 * 2026-11-09 Frank「这三个是不是都放到侧边栏比较好」:「我的求职」变成类别,下面三个子项(今日推荐 / 我的收藏 / 我的投递)。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { IconBriefcase, IconCard, IconFile, IconKey, IconMail, IconUser } from '@/components/icons'
import { Nav } from '@/components/nav'
import type { NavItem } from '@/components/nav'
import { COUNT_NONE, ME_JOB_TABS, ME_SECS, ME_TITLE_KEY, SEC_DEFAULT } from './constants'
import { meCountOf } from './functions'
import type { MeNavIn } from './types'

/**
 * 「我的」左侧导航。
 *
 * @param props 当前节、取词、收件箱未读数与点击回调。
 * @returns 导航。
 */
export function MeNav({ sec, t, unread, onPick }: MeNavIn) {
  const icons: Record<string, React.ReactNode> = {
    sjobs: <IconBriefcase />,
    inbox: <IconMail />,
    resume: <IconFile />,
    profile: <IconUser />,
    sub: <IconCard />,
    settings: <IconKey />,
  }
  const jobSubs: NavItem[] = []
  for (const j of ME_JOB_TABS) {
    jobSubs.push({ key: j.tab, label: t(j.labelKey), icon: null, count: COUNT_NONE, href: null, subs: [] })
  }
  const items: NavItem[] = []
  for (const s of ME_SECS) {
    let subs: NavItem[] = []
    if (s.sec === SEC_DEFAULT) {
      subs = jobSubs
    }
    items.push({
      key: s.sec,
      label: t(s.labelKey),
      icon: icons[s.sec],
      count: meCountOf({ sec: s.sec, unread }),
      href: null,
      subs,
    })
  }
  return <Nav items={items} value={sec} onPick={onPick} ariaLabel={t(ME_TITLE_KEY)} />
}
