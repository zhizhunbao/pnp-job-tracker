'use client'
/**
 * 访客注册框(2026-10-11 Frank「我应该先注册 再问问题吧。不然回答的问题 存哪里去了」→「需要改」):替掉访客向导(四道题 + 注册屏)——
 * 访客进站、点开职位、点收藏、动筛选时只弹 auth 桶的 AuthModal 注册档(框内照旧能切登录),题目改到登录后由「我的求职」首访弹框问。
 * 开框记 gate-open、登录完先记「这个页面里刚登录过」再交还调用方,机器在 hooks 的 useGateAuth。
 *
 * @author Frank
 * @time 2026-10-11 13:05:59
 */
import { AuthModal } from '@/components/auth'
import { GATE_AUTH_MODE } from './constants'
import { useGateAuth } from './hooks'
import type { GateAuthIn } from './types'

/**
 * 访客注册框。
 *
 * @param props 取词函数、由头、回跳地址、层级与关闭 / 交还两个回调(见 GateAuthIn 逐格注释)。
 * @returns 注册 / 登录弹框。
 */
export function GateAuth({ t, intent, returnTo, z, onClose, onDone }: GateAuthIn) {
  const done = useGateAuth({ intent, onDone })
  return <AuthModal t={t} mode={GATE_AUTH_MODE} z={z} returnTo={returnTo} onClose={onClose} onDone={done} />
}
