'use client'
/**
 * me 域的结构:窄屏导航抽屉(nav 桶 NavDrawer 装同一个 MeNav;标题「我的」)。开着才挂。
 *
 * @author Frank
 * @time 2026-11-07 15:30:00
 */
import { NavDrawer } from '@/components/nav'
import { ME_TITLE_KEY } from './constants'
import { MeNav } from './menav'
import type { MeDrawerIn } from './types'

/**
 * 窄屏导航抽屉。
 *
 * @param props 当前节、取词、收件箱未读数、点击回调与关闭回调。
 * @returns 抽屉。
 */
export function MeDrawer({ sec, t, unread, onPick, onClose }: MeDrawerIn) {
  return (
    <NavDrawer title={t(ME_TITLE_KEY)} onClose={onClose}>
      <MeNav sec={sec} t={t} unread={unread} onPick={onPick} />
    </NavDrawer>
  )
}
