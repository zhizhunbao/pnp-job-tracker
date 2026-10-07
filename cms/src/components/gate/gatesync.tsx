'use client'
/**
 * 访客向导草稿的补交件(无界面,挂在全站骨架上):已登录 + 交接戳没过期 + 本地还有草稿 → 并进答案档(只填空格)。
 * 专治 Google 整页登录:跳走时向导的状态全丢,答案在本地草稿里,回跳到哪一页都由这里补交。
 * 机器在 hooks 的 useGateSync。2026-10-03 付费闭环批 A1 立。
 * 2026-10-04 进站即弹(Frank「进来就要求用户登录注册」→「照这样改」):同一件顺带弹进站向导 —— 全站骨架只挂这一处,
 * 每个页面都跑得到;判哪一页弹、弹没弹过在 hooks 的 useEntryGate。上面「无界面」从此只指补交那一半。
 * 2026-10-04 访客四题改版:随访客向导自 profile 桶迁入 gate 桶,原样搬。
 *
 * @author Frank
 * @time 2026-10-03 20:40:00
 */
import { GATE_INTENT_ENTRY } from './constants'
import { GateWizard } from './gatewizard'
import { useEntryGate, useGateSync } from './hooks'

/**
 * 草稿补交件 + 进站向导。
 *
 * @returns 这一页该弹进站向导时是向导,其余什么都不渲。
 */
export function GateSync() {
  useGateSync()
  const e = useEntryGate()
  if (e.open === false) {
    return null
  }
  return <GateWizard t={e.t} intent={GATE_INTENT_ENTRY} onClose={e.onClose} onDone={e.onDone} />
}
