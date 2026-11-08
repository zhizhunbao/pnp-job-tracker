'use client'
/**
 * menu 域的状态:开合、点外面收起、Esc 收起。
 * 只在开着时挂监听 —— 一张表每行一个菜单,关着的不该都挂在 document 上。
 * Esc 不走 modal 桶的 Esc 队:那个队按挂上的先后定谁是最上层,每行一个菜单挂上去会把弹框的 Esc 挤掉。
 * 根节点 ref 由组件建好传进来,不放进返回的整机 —— 整机里混着 ref,render 时读开合会被当成读 ref。
 * 点外面:DOM 事件目标是宽类型,contains 要 Node,跨边界断言只收在 onDown 那一行(照 auth 桶 useClickOutside)。
 *
 * @author Frank
 * @time 2026-11-07 23:10:00
 */
import { useEffect, useState } from 'react'
import { EV_KEYDOWN, EV_MOUSEDOWN, KEY_ESC } from './constants'
import type { MenuPanel, MenuRef } from './types'

/**
 * 菜单整机。
 *
 * @param ref 菜单根节点(按钮 + 弹出层),点在它外面就收起。
 * @returns 开合与两个手柄。
 */
export function useMenu(ref: MenuRef): MenuPanel {
  const [open, setOpen] = useState(false)

  function onToggle(): void {
    setOpen(open === false)
  }

  function close(): void {
    setOpen(false)
  }

  useEffect(function bind() {
    if (open === false) {
      return
    }
    function onDown(e: MouseEvent): void {
      const target = e.target as Node
      if (ref.current != null && ref.current.contains(target) === false) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESC) {
        setOpen(false)
      }
    }
    document.addEventListener(EV_MOUSEDOWN, onDown)
    document.addEventListener(EV_KEYDOWN, onKey)
    function off(): void {
      document.removeEventListener(EV_MOUSEDOWN, onDown)
      document.removeEventListener(EV_KEYDOWN, onKey)
    }
    return off
  }, [open, ref])

  return { open, onToggle, close }
}
