/**
 * 签名归外部库管的函数 —— 比较器的两参一返由 `Array.prototype.sort` 定死,
 * 收在这一个文件里,闸只关一次(one-parameter / typed-signature),`functions.ts` 里零例外。
 * 只许 import `./types`(进了 `functions.ts` 就成环)。
 *
 * @author Frank
 * @time 2026-08-22 12:10:00
 */

import type { ProvCompetition } from './types'

/**
 * 各省名额竞争按比值升序 —— 松 → 紧,决策页第二条免费硬事实的展示序。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 比较值。
 */
export function byRatioAsc(a: ProvCompetition, b: ProvCompetition): number {
  return a.ratio - b.ratio
}
