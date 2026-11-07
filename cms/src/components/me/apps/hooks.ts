'use client'
/**
 * me 桶子桶 apps 的状态机器:只读投递框宿主(读地址栏 `?app=`)与框里(拉投递清单找那一行 + 拉往来)
 * (2026-10-10 批 3;2026-11-07 自 myjobs 桶的 useAppHost / useAppView 在新域重写)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { useEffect, useState } from 'react'
import { bindAppHost, closeAppView, itemByIdOf, makeLoadApps, makeLoadThread } from './functions'
import type { AppHostPanel, AppItem, AppViewHookIn, AppViewPanel, ThreadView } from './types'

/**
 * 只读投递框宿主整机:挂上读一次地址栏 `?app=`,开关框与浏览器后退都重读。
 *
 * @returns 开着的投递行与关框。
 */
export function useAppHost(): AppHostPanel {
  const [id, setId] = useState<number | null>(null)
  useEffect(function bindHost() {
    return bindAppHost({ setId })
  }, [])
  return { id, onClose: closeAppView }
}

/**
 * 只读投递框整机:挂上拉我的投递清单(找那一行画「职位信息」)与这一条的往来。
 *
 * @param x 投递行 id。
 * @returns 那一行、往来与拉失败了没。
 */
export function useAppView(x: AppViewHookIn): AppViewPanel {
  const [items, setItems] = useState<AppItem[] | null>(null)
  const [thread, setThread] = useState<ThreadView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(function firstLoad() {
    void makeLoadApps({ setItems, setFailed })()
    void makeLoadThread({ appId: x.appId, setThread, setFailed })()
  }, [x.appId])

  let item: AppItem | null = null
  if (items != null) {
    item = itemByIdOf({ items, id: x.appId })
  }
  return { item, thread, failed: failed || (items != null && item == null) }
}
