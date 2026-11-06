'use client'
/**
 * queue 域的 hooks:删除确认机(确认框开关、调接口、失败标记)与把拨框手柄发给每颗删除钮的上下文。
 *
 * @author Frank
 * @time 2026-11-06 00:40:00
 */
import { createContext, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { makeDelClose, makeDelOk } from './functions'
import type { DelAskFn, DelSpec, QueueDelPanel } from './types'

/**
 * 拨删除确认框的上下文(null = 不在 Provider 下)。上下文对象是 react 的接缝件,住机器抽屉不住 variables(同 auth 桶)。
 */
const DelCtx = createContext<DelAskFn | null>(null)

/**
 * Queue 挂 Provider 要用的上下文本体(域内取,不出桶)。
 *
 * @returns 上下文对象。
 */
export function delCtxOf() {
  return DelCtx
}

/**
 * 删除钮取拨框手柄。
 *
 * @returns 拨框手柄;不在 Provider 下 = null。
 */
export function useDelAsk(): DelAskFn | null {
  return useContext(DelCtx)
}

/**
 * 删除确认机:等着确认的那一条、确认 / 取消手柄、上一次删除没成的标记;删成了 router.refresh 重取服务端数据。
 *
 * @returns 删除确认机。
 */
export function useQueueDel(): QueueDelPanel {
  const [ask, setAsk] = useState<DelSpec | null>(null)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  return {
    ask,
    setAsk,
    failed,
    onOk: makeDelOk({ ask, setAsk, setFailed, refresh: router.refresh }),
    onCancel: makeDelClose(setAsk),
  }
}
