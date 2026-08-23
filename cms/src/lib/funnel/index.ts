/**
 * 漏斗域的桶(消费方:/api/funnel/track 路由、lib/track 门面、admin 漏斗页)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { CHAT_STEPS, DECISION_STEPS, FUNNEL_STEPS, LEGACY_STEPS } from './constants'
export { chatRates, decisionRates, isLocalHost, stepRates, toFunnelHit } from './functions'
export type { FunnelHit, StepCounts, TrackValue } from './types'
