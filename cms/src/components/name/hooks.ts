'use client'
/**
 * name 组件桶的状态机器:「出不出译名」开关的上下文(2026-11-05 Frank「隐藏翻译这个按钮应该放到 查看原贴 左边,
 * 然后控制这个弹框的所有翻译部分」)。职位弹框 / 详情页把标题行「隐藏翻译 / 显示翻译」的状态挂上来,
 * 子树里所有 Name 的灰字与其他译文(公司简介译文等)都读它;不在 Provider 下 = 照常出。
 *
 * @author Frank
 * @time 2026-11-05 21:50:20
 */
import { createContext, useContext } from 'react'

/**
 * 译名开关上下文(react 接缝件,住机器抽屉)。默认出:不在 Provider 下的全站各处不受影响。
 */
const TransCtx = createContext<boolean>(true)

/**
 * TransProvider 组件要用的上下文本体(域内取,不出桶)。
 *
 * @returns 上下文对象。
 */
export function transCtxOf() {
  return TransCtx
}

/**
 * 这里出不出译名(灰字小注与其他译文)。
 *
 * @returns 出 = true;外层开关关着 = false。
 */
export function useShowTrans(): boolean {
  return useContext(TransCtx)
}
