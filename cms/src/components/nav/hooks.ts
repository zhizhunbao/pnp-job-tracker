'use client'
/**
 * nav 域的状态:类别手动开合表、左栏 « » 收起、窄屏抽屉开关(2026-11-07 就业把脉侧栏立)。
 *
 * @author Frank
 * @time 2026-11-07 22:40:00
 */
import { useState } from 'react'
import { KEY_NONE } from './constants'
import { flipsWithOf, holdingKeyOf, makeNavBoolFlip, makeNavBoolSet } from './functions'
import type { NavCollapseOut, NavDrawerOut, NavFlipsIn, NavFlipsOut } from './types'

/**
 * 类别的开合表(没点过的类别不在表里,跟着当前项开合)。
 * 2026-11-07 Frank「我切换的时候,其他项如果是展开就继续展开」:当前项每换到一个类别里,就把那个类别记成「开」,
 * 之后切到别的类别它也不自己收起(用户手动收起照旧)。用「上一次的当前项」比对,在渲染期就地改表,不走 effect。
 *
 * @param x 各项与当前项的键。
 * @returns 表与改表函数。
 */
export function useNavFlips(x: NavFlipsIn): NavFlipsOut {
  const [flips, setFlips] = useState<Record<string, boolean>>({})
  const [seen, setSeen] = useState(KEY_NONE)
  if (x.value !== seen) {
    setSeen(x.value)
    const key = holdingKeyOf({ items: x.items, value: x.value })
    if (key !== KEY_NONE && flips[key] !== true) {
      setFlips(flipsWithOf({ prev: flips, key, open: true }))
    }
  }
  return { flips, setFlips }
}

/**
 * 左栏收起状态(右上角 « 收起,窄边上 » 展开;不记忆,进页默认展开)。
 *
 * @returns 收起了没有与翻转手柄。
 */
export function useNavCollapse(): NavCollapseOut {
  const [collapsed, setCollapsed] = useState(false)
  return { collapsed, onFlip: makeNavBoolFlip({ set: setCollapsed }) }
}

/**
 * 窄屏导航抽屉的开关。
 *
 * @returns 开着没有与开、关两个手柄。
 */
export function useNavDrawer(): NavDrawerOut {
  const [open, setOpen] = useState(false)
  return {
    open,
    onOpen: makeNavBoolSet({ set: setOpen, to: true }),
    onClose: makeNavBoolSet({ set: setOpen, to: false }),
  }
}
