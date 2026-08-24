'use client'
/**
 * i18n 组件域的 Provider:把语言状态整机(hooks 的 useLangState)挂上下文。
 * 2026-08-24 组件域形制化(机器进 hooks,文件小写)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { langCtxOf, useLangState } from './hooks'
import type { LangProviderIn } from './types'

/**
 * 语言 Provider。
 *
 * @param props 首帧语言与子树。
 * @returns Provider 包着的子树。
 */
export function LangProvider({ initial, children }: LangProviderIn) {
  const Ctx = langCtxOf()
  const state = useLangState(initial)
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}
