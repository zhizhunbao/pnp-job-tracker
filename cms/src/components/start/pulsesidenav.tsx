'use client'
/**
 * 域内小件:就业把脉左侧导航(2026-11-07 Frank「就业把脉 sidebar 先改一下吧」,替两排页签的二级导航条;
 * 设计 docs/design/就业把脉/就业把脉侧栏-20261107.md)。照 Fluent 2 Nav「带类别的复杂导航」:七个分区是类别,
 * 有分表的分区点了展开子项,子项锚到分表;抽选、政策动态没有分表,直接锚到分区。宽屏放 NavFrame 左栏,
 * 窄屏装进抽屉,两处同一个件。
 * 沿用原导航条的决策:滚动跟随点亮当前子项(09-11)、导航用短词与分区 h2 全称错开(#312)。
 *
 * @author Frank
 * @time 2026-11-07 22:40:00
 */
import { IconBriefcase, IconIdCard, IconMap, IconMapPin, IconMedal, IconNews, IconUsers } from '@/components/icons'
import { Nav } from '@/components/nav'
import { ID_BOARDS, ID_CITY, ID_DRAWS, ID_NEWS, ID_PR_BAND, ID_PROV, ID_SE, SIDE_COUNT_NONE } from './constants'
import { navItemsOf, sideHrefOf, sideSubsOf } from './functions'
import type { PulseSideNavIn, SideItem } from './types'

/**
 * 就业把脉左侧导航。
 *
 * @param props 取词函数、当前项与点击回调。
 * @returns 导航。
 */
export function PulseSideNav({ t, value, onPick }: PulseSideNavIn) {
  const icons: Record<string, React.ReactNode> = {
    [ID_BOARDS]: <IconBriefcase />,
    [ID_SE]: <IconUsers />,
    [ID_PROV]: <IconMap />,
    [ID_CITY]: <IconMapPin />,
    [ID_PR_BAND]: <IconIdCard />,
    [ID_DRAWS]: <IconMedal />,
    [ID_NEWS]: <IconNews />,
  }
  const items: SideItem[] = []
  for (const it of navItemsOf({ t })) {
    const subs = sideSubsOf({ t, id: it.id })
    items.push({
      key: it.id,
      label: it.label,
      icon: icons[it.id],
      count: SIDE_COUNT_NONE,
      href: sideHrefOf({ id: it.id, subs }),
      subs,
    })
  }
  return <Nav items={items} value={value} onPick={onPick} ariaLabel={t('pulse.entry')} />
}
