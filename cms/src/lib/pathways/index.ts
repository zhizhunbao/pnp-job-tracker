/**
 * 通道域的桶 —— **浏览器也安全的那半**:注册表、按 key 取值的四个函数、全部形状。
 * `plan/pr/Decision.tsx` 是 `'use client'` 且取的是**值**(gateOf / uiOf / regionProvincesOf);
 * functions.ts 不 import payload(池由调用方注入),所以这里可以放心转发。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 2026-10-13:子桶 fit(按身份与教育经历筛通道的判定)自 components/pnp/fit 搬来,桶门转发 keepStreamOf。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

export { PATHWAYS } from './constants'
export { eduRowsOf, keepStreamOf } from './fit'
export type { EduRow, EduRows, FitsJson, StepsFilter } from './fit'
export { aggregatePilotQuota, fieldMatchExemptionOf, gateOf, regionProvincesOf, uiOf } from './functions'
export { askLabels, gateLabels, pathwayNames } from './constants'
export type {
  FieldMatchExemption, GateBook, GateKey, GateOfIn, GateRule, OutOfProvinceGrad, PathwayKey,
  PathwayStrategy, PathwayUi, PilotQuotaAgg, PilotQuotaCommunityRow, ResolvedUi, StatusAsk,
} from './types'
