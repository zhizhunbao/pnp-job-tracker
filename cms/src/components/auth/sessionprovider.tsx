'use client'
/**
 * auth 域的首帧会话 Provider:照 LangProvider 先例(2026-08-03 语言零闪那一版),
 * 治 SSR 先猜后纠的抖动 —— 值从 layout 的 ssrHasSession() 下来,
 * 只回答「首帧按登录态还是匿名占位」;用户是谁仍归 Header 拉 /api/users/me。
 * (上下文本体与 useSsrSession 在 hooks,这里只是挂 Provider 的组件。)
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { sessionCtxOf } from './hooks'
import type { SessionProviderIn } from './types'

/**
 * 首帧会话 Provider。
 *
 * @param props 首帧登录态与子树。
 * @returns Provider 包着的子树。
 */
export function SessionProvider({ initial, children }: SessionProviderIn) {
  const Ctx = sessionCtxOf()
  return <Ctx.Provider value={initial}>{children}</Ctx.Provider>
}
