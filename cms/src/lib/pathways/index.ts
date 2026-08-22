/**
 * 通道域的桶 —— **浏览器也安全的那半**:注册表、按 key 取值的四个函数、全部形状。
 * `plan/pr/Decision.tsx` 是 `'use client'` 且取的是**值**(gateOf / uiOf / regionProvincesOf);
 * functions.ts 不 import payload(池由调用方注入),所以这里可以放心转发。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

export { PATHWAYS } from './registry'
export { aggregatePilotQuota, fieldMatchExemptionOf, gateOf, regionProvincesOf, uiOf } from './functions'
export type {
  FieldMatchExemption, GateBook, GateKey, GateOfIn, GateRule, OutOfProvinceGrad, PathwayKey,
  PathwayStrategy, PathwayUi, PilotQuotaAgg, PilotQuotaCommunityRow, ResolvedUi, StatusAsk,
} from './types'
