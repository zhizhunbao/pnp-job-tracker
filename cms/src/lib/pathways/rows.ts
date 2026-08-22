/**
 * SQL 原始行 → 本域形状的构造器。体内只许词汇表 + 纯拼装,不许业务判断。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import { numOrNull, text } from '../db'
import type { PilotQuotaCommunityRow, PilotQuotaDbRow } from './types'

/**
 * `PILOT_QUOTA_COMMUNITIES` 一行 → 干净的社区级行。
 * 🔴 数值格走 `numOrNull` 保 null:官网没写就是没写,折 0 = 替官网编数(「禁 ?? 0」的同族雷)。
 * firstCome 只认真布尔(数据里没有 false,非布尔一律当「官网没写」)。
 *
 * @param r 原始行。
 * @returns 收窄后的社区行。
 */
export function toPilotCommunity(r: PilotQuotaDbRow): PilotQuotaCommunityRow {
  let firstCome: boolean | null = null
  if (typeof r.first_come === 'boolean') {
    firstCome = r.first_come
  }
  return {
    community: text(r.community),
    province: text(r.province),
    type: text(r.type),
    firstCome: firstCome,
    firstComeQuote: text(r.first_come_quote),
    firstComeUrl: text(r.first_come_url),
    perIntake: numOrNull(r.per_intake),
    perIntakeQuote: text(r.per_intake_quote),
    perIntakeUrl: text(r.per_intake_url),
    remaining: numOrNull(r.remaining),
    remainingQuote: text(r.remaining_quote),
    remainingUrl: text(r.remaining_url),
    asOf: text(r.as_of),
  }
}
