'use client'
/**
 * ops 组件域的 hooks:删除确认机、拨框上下文、把这一页的取数时刻报给 banner。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { makeDelClose, makeDelOk } from './functions'
import type { DelAskFn, OpsDel, OpsDelPanel, OpsPageIn, OpsPageOut, SetUpdatedFn } from './types'

/**
 * 拨删除确认框的上下文。
 */
const DelCtx = createContext<DelAskFn | null>(null)

/**
 * 报取数时刻的上下文。
 */
const UpdatedCtx = createContext<SetUpdatedFn | null>(null)

/**
 * 取删除上下文本体。
 *
 * @returns 上下文对象。
 */
export function delCtxOf() {
  return DelCtx
}

/**
 * 取时刻上下文本体。
 *
 * @returns 上下文对象。
 */
export function updatedCtxOf() {
  return UpdatedCtx
}

/**
 * 删除钮取拨框手柄。
 *
 * @returns 拨框手柄;不在 Provider 下是 null。
 */
export function useDelAsk(): DelAskFn | null {
  return useContext(DelCtx)
}

/**
 * 删除确认机。
 *
 * @returns 删除确认机。
 */
export function useOpsDel(): OpsDelPanel {
  const [ask, setAsk] = useState<OpsDel | null>(null)
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

/**
 * 手机卡片的分页(桌面表格由通用 Table 自己分页)。
 *
 * @param x 总行数与每页几行。
 * @returns 当前页、总页数与翻页手柄。
 */
export function useOpsPage(x: OpsPageIn): OpsPageOut {
  const [page, setPage] = useState(0)
  const max = Math.max(1, Math.ceil(x.total / x.size))
  return { page: Math.min(page, max - 1), max, onPage: setPage }
}

/**
 * 把这一页的取数时刻报给外框的 banner。
 *
 * @param iso 取数时刻。
 */
export function useReportUpdated(iso: string): void {
  const set = useContext(UpdatedCtx)
  useEffect(function report() {
    if (set != null) {
      set(iso)
    }
  }, [set, iso])
}
