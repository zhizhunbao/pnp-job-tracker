'use client'
/**
 * ops 组件域的左侧导航(形照就业把脉,用通用 Nav)。模块与页面的出处见定稿清单。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import {
  IconBell, IconCard, IconChart, IconClipboard, IconKey, IconMore, IconRefresh, IconStar, IconTable,
} from '@/components/icons'
import { useLang } from '@/components/i18n'
import { Nav } from '@/components/nav'
import { NAV_ARIA } from './constants'
import { navSayOf, opsNavItemsOf } from './functions'
import type { OpsNavIn } from './types'

/**
 * 运维页左侧导航。
 *
 * @param props 当前页与点击回调。
 * @returns 导航。
 */
export function OpsNav({ value, onPick }: OpsNavIn) {
  const [, , t] = useLang()
  const keyed = opsNavItemsOf({
    report: <IconChart />,
    schedule: <IconRefresh />,
    queue: <IconTable />,
    fee: <IconCard />,
    incident: <IconBell />,
    fresh: <IconClipboard />,
    channel: <IconMore />,
    access: <IconKey />,
    saved: <IconStar />,
  })
  return <Nav items={navSayOf({ items: keyed, t })} value={value} onPick={onPick} ariaLabel={t(NAV_ARIA)} />
}
