'use client'
/**
 * peek 组件桶的状态机器:全站宿主持的那一个职位框 / 公司框栈(2026-10-09 N 批)。
 *
 * @author Frank
 * @time 2026-10-09 06:00:00
 */
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useSsrSession } from '@/components/auth'
import { useLang } from '@/components/i18n'
import { useLayerStack, usePeekInbox } from '@/components/modal'
import { applyPeekMsg, ctxListWith, hostNocOf, hostPlanOf } from './functions'
import type { BusCtxMsg, BusMsg, HostCtx, PeekHostPanel, PeekLayer, PeekSeed } from './types'

/**
 * 全站宿主:持唯一一个栈,听弹框总线(各页的代理栈发来的栈操作、各页报件报上来的上下文);
 * 换页(路径变了)全关 —— 宿主挂在骨架上不随页面卸载,开着的框不该跟到新页。
 * 分层态与职业名表用最后报上来那一页的;一页都没报就按会话种子兜分层态、职业名表给空表。
 *
 * @returns 宿主面板。
 */
export function usePeekHost(): PeekHostPanel {
  const stack = useLayerStack<PeekLayer>()
  const [lang] = useLang()
  const ssr = useSsrSession()
  const path = usePathname()
  const [ctxs, setCtxs] = useState<HostCtx[]>([])
  const push = stack.push
  const swapTop = stack.swapTop
  const pop = stack.pop
  const clear = stack.clear
  const onMsg = useCallback(function onPeekMsg(msg: BusMsg): void {
    applyPeekMsg({ msg, stack: { layers: [], push, swapTop, pop, clear } })
  }, [push, swapTop, pop, clear])
  const onCtx = useCallback(function onPeekCtx(msg: BusCtxMsg): void {
    function next(prev: HostCtx[]): HostCtx[] {
      return ctxListWith({ list: prev, msg })
    }
    setCtxs(next)
  }, [])
  usePeekInbox({ onMsg, onCtx })
  useEffect(function closeOnNav() {
    clear()
  }, [path, clear])
  let seed: PeekSeed | null = null
  if (ssr != null) {
    seed = { in: ssr.in, email: ssr.email, displayName: ssr.displayName, avatar: ssr.avatar }
  }
  return { stack, lang, plan: hostPlanOf({ list: ctxs, seed }), nocDesc: hostNocOf(ctxs) }
}
