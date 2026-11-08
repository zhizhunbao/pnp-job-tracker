'use client'
/**
 * ops 组件域的左侧导航(形照就业把脉,用通用 Nav)。模块与页面的出处见定稿清单。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { IconCard, IconChart, IconRefresh, IconTable } from '@/components/icons'
import { Nav } from '@/components/nav'
import { NAV_ARIA } from './constants'
import { opsNavItemsOf } from './functions'
import type { OpsNavIn } from './types'

/**
 * 运维页左侧导航。
 *
 * @param props 当前页与点击回调。
 * @returns 导航。
 */
export function OpsNav({ value, onPick }: OpsNavIn) {
  const items = opsNavItemsOf({
    report: <IconChart />,
    schedule: <IconRefresh />,
    queue: <IconTable />,
    fee: <IconCard />,
  })
  return <Nav items={items} value={value} onPick={onPick} ariaLabel={NAV_ARIA} />
}
