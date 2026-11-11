/**
 * 额度子桶的行为:算会员当期、读额度账、判能不能改写、记一笔、手动重新生成的每日计数。
 * 所有判断在服务端,各入口(/api/tailor/step、/api/apply/letter)读同一本账。
 * 父桶 functions.ts 早已超 1000 行(基线存量),新关注点照 llm/ledger 的形开子桶。
 *
 * @author Frank
 * @time 2026-11-09 21:00:00
 */
import { count, queryRows, SQL } from '../../db'
import {
  CREDIT_FREE_MAX, CREDIT_PERIOD_MS, CREDIT_PRO_MAX, FEATURE_FREE, FEATURE_PRO, PLAN_FREE, PLAN_PRO, RESET_NONE,
} from './constants'
import type {
  CreditDbRow, CreditFact, CreditIn, CreditLeftIn, CreditMarkIn, CreditOfIn, CreditOut, CreditUse, MaybeIso, MaybePeriod,
  PeriodIn, WriteOut,
} from './types'

// =========================================================================
// 1. 额度
// =========================================================================

/**
 * 会员当期。到期日是「购买时刻 + 天数」叠出来的(lib/stripe 的 webhook),所以从到期日往回每 30 天切一刀,
 * 刀口正落在购买日的整期上:30 天包是一期,90 天包是三期,没到期就续的接着原来的刀口。
 *
 * @param x 会员到期日与现在。
 * @returns 当期的起止;不是会员(没买过、已到期、日期读不出)是 null。
 */
export function periodOf(x: PeriodIn): MaybePeriod {
  if (x.proUntil == null) {
    return null
  }
  const until = Date.parse(x.proUntil)
  if (Number.isNaN(until) || until <= x.nowMs) {
    return null
  }
  const periodsLeft = Math.ceil((until - x.nowMs) / CREDIT_PERIOD_MS)
  const start = until - periodsLeft * CREDIT_PERIOD_MS
  return { startIso: new Date(start).toISOString(), endIso: new Date(start + CREDIT_PERIOD_MS).toISOString() }
}

/**
 * 用量 + 会员当期 → 额度账。会员只看当期用量,用完不退回去吃免费那 3 个。
 *
 * @param x 用量与会员当期。
 * @returns 额度账。
 */
export function creditOf(x: CreditOfIn): CreditFact {
  if (x.period == null) {
    return {
      plan: PLAN_FREE, used: x.use.freeUsed, max: CREDIT_FREE_MAX, left: Math.max(0, CREDIT_FREE_MAX - x.use.freeUsed),
      here: x.use.here, resetAt: RESET_NONE,
    }
  }
  return {
    plan: PLAN_PRO, used: x.use.proUsed, max: CREDIT_PRO_MAX, left: Math.max(0, CREDIT_PRO_MAX - x.use.proUsed),
    here: x.use.here, resetAt: x.period.endIso,
  }
}

/**
 * 读一个人对一个职位的额度账。
 *
 * @param x 连接、用户、职位、会员到期日与现在。
 * @returns 额度账;没记过账按用了 0 个算。
 */
export async function loadCredit(x: CreditIn): CreditOut {
  const period = periodOf({ proUntil: x.proUntil, nowMs: x.nowMs })
  let start: MaybeIso = null
  if (period != null) {
    start = period.startIso
  }
  const rows = await queryRows({
    db: x.db, sql: SQL.CREDIT_USED, params: [x.userId, FEATURE_FREE, FEATURE_PRO, x.jobId, start], map: toCreditUse,
  })
  let use = rows[0]
  if (use == null) {
    use = { freeUsed: 0, proUsed: 0, here: false }
  }
  return creditOf({ use, period })
}

/**
 * 额度用量库行 → 额度用量。
 *
 * @param r 库行。
 * @returns 额度用量。
 */
export function toCreditUse(r: CreditDbRow): CreditUse {
  return { freeUsed: count(r.free_used), proUsed: count(r.pro_used), here: r.here === true }
}

/**
 * 还能不能按这一岗改写:这一岗记过账的照写(重开、重新生成都不再扣),没记过的看还剩不剩。
 *
 * @param c 额度账。
 * @returns 能不能写。
 */
export function isCreditOpen(c: CreditFact): boolean {
  return c.here || c.left > 0
}

/**
 * 记一笔额度(同一个职位在同一档名下只记一次;只在模型真写成时调,重试后仍失败的不记)。
 *
 * @param x 连接、用户、职位与额度档。
 * @returns 无。
 */
export async function markCredit(x: CreditMarkIn): WriteOut {
  let feature = FEATURE_FREE
  if (x.plan === PLAN_PRO) {
    feature = FEATURE_PRO
  }
  await x.db.query(SQL.CREDIT_MARK, [x.userId, feature, x.jobId])
}

/**
 * 这一次之后还剩几个额度(回包带给前端)。
 *
 * @param x 动手之前的额度账与这一次记没记账。
 * @returns 还剩几个,不低于 0。
 */
export function creditLeftOf(x: CreditLeftIn): number {
  if (x.marked) {
    return Math.max(0, x.credit.left - 1)
  }
  return x.credit.left
}
