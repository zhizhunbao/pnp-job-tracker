'use client'
/**
 * me 域的结构:「我的」左侧导航五项(nav 桶 Nav;每项一个图标,收件箱带红色未读数)。
 * 宽屏放在 NavFrame 左栏,窄屏放进抽屉,两处同一个件。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { IconBriefcase, IconCard, IconFile, IconMail, IconUser } from '@/components/icons'
import { Nav } from '@/components/nav'
import type { NavItem } from '@/components/nav'
import { ME_SECS, ME_TITLE_KEY } from './constants'
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
  }
  const items: NavItem[] = []
  for (const s of ME_SECS) {
    items.push({
      key: s.sec,
      label: t(s.labelKey),
      icon: icons[s.sec],
      count: meCountOf({ sec: s.sec, unread }),
      href: null,
      subs: [],
    })
  }
  return <Nav items={items} value={sec} onPick={onPick} ariaLabel={t(ME_TITLE_KEY)} />
}
