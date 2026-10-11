'use client'
/**
 * notify 组件桶的状态机器:顶栏铃铛(挂上拉一次清单;开合;点外面关)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { useCallback, useEffect, useState } from 'react'
import { useClickOutside } from '@/components/auth'
import { makeBellToggle, makeLoadNotify } from './functions'
import type { BellHookIn, BellPanel, NotifyFact } from './types'

/**
 * 铃铛整机:挂上拉一次清单(每次整页导航顶栏重挂 = 重拉);开的那一下记「看过了」;点钮与面板以外的地方关。
 * Esc 关挂在面板件里(面板开着才排进 Esc 队,不跟账户下拉、弹框抢)。
 *
 * @param x 钮 + 面板的外框(组件里起的 ref)。
 * @returns 面板。
 */
export function useBell(x: BellHookIn): BellPanel {
  const [data, setData] = useState<NotifyFact | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadNotify({ setData, setFailed })()
  }, [])

  const close = useCallback(function closeBell(): void {
    setOpen(false)
  }, [])
  useClickOutside({ ref: x.ref, open, close })

  return { data, failed, open, toggle: makeBellToggle({ open, setOpen, data, setData }), close }
}
