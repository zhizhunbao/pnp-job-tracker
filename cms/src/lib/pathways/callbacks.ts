/**
 * 签名归外部定死的函数:`Array.prototype.sort` 的比较器。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import type { PilotQuotaAgg } from './types'

/**
 * 名额聚合的展示序:省码字典序,同省内制度字典序(RCIP 在 FCIP 后?—— localeCompare 定,别手排)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
export function byProvThenType(a: PilotQuotaAgg, b: PilotQuotaAgg): number {
  const prov = a.province.localeCompare(b.province)
  if (prov !== 0) {
    return prov
  }
  return a.type.localeCompare(b.type)
}
