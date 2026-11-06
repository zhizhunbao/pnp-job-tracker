'use client'
/**
 * name 组件桶的 Provider:把「隐藏翻译 / 显示翻译」开关的状态挂上下文(2026-11-05,机器见 hooks)。
 *
 * @author Frank
 * @time 2026-11-05 21:50:20
 */
import { transCtxOf } from './hooks'
import type { TransProviderIn } from './types'

/**
 * 译名开关 Provider。
 *
 * @param props 出不出译名与子树。
 * @returns Provider 包着的子树。
 */
export function TransProvider({ show, children }: TransProviderIn) {
  const Ctx = transCtxOf()
  return <Ctx.Provider value={show}>{children}</Ctx.Provider>
}
