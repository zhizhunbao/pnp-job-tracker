/**
 * SQL 原始行 → 本域形状的构造器(一条 SQL 一个)+ 两个 json 行的原样透传。
 * 体内只许词汇表 + 纯拼装,不许业务判断 —— difficulty/info 两列 json 的解析是
 * 真会抛的 JSON.parse,归 `functions.ts` 的接缝函数,不进这里。
 *
 * 🔴 数字一律走 db 的 `numOrNull`:pnp_draws 的 score/invitations 与分值表的 points
 * 都是 numeric,pg 直连交回来是**字符串**;并入前经 Payload Local API 拿到的是数字 ——
 * 一套词汇两条路都对(jobs 域老坑:`typeof x === 'number'` 换路后整列静默判 null)。
 *
 * @author Frank
 * @time 2026-08-22 12:10:00
 */

import { count, numOrNull, text } from '../db'
import type { DifficultyDbRow, DrawFact, ProvInfoDbRow, Row, ScoreFactor } from './types'

/**
 * 一行抽选(SQL.DIMS_PNP_DRAWS,列已按 camelCase 起别名)→ 抽选事实。
 * invitations 必须带出来 —— 理由见 `DrawFact` 上那条 2026-08-12 红线。
 *
 * @param r 库里的一行。
 * @returns 洗净的抽选事实。
 */
export function toDrawFact(r: Row): DrawFact {
  return {
    province: text(r.province), kind: text(r.kind), drawDate: text(r.drawDate),
    stream: text(r.stream), streamZh: text(r.streamZh),
    score: numOrNull(r.score), invitations: numOrNull(r.invitations),
  }
}

/**
 * 一行官方分值表(SQL.PNP_SCORE_FACTORS)→ `ScoreFactor`。
 * 档位顺序由 SQL 的 `ORDER BY province, factor, seq` 定死 —— 只按 province 排的话,
 * 同一道题的官方档位顺序随 DB 返回(2026-08-16 Frank 实拍:BC 工作地区出成
 * 「Area 3 / Area 1 / Area 2」),并入时把这条红线从 payload.find 的 sort 参数搬进 SQL 消费侧。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
export function toScoreFactor(r: Row): ScoreFactor {
  return {
    province: text(r.province), system: text(r.system), factor: text(r.factor),
    kind: text(r.kind), seq: count(r.seq), label: text(r.label),
    points: numOrNull(r.points), xorPrev: Boolean(r.xor_prev), rule: text(r.rule),
    factorMax: numOrNull(r.factor_max), factorGroup: text(r.factor_group), groupMax: numOrNull(r.group_max),
    passMark: numOrNull(r.pass_mark), maxTotal: numOrNull(r.max_total),
    guideEffective: text(r.guide_effective), fetched: text(r.fetched), url: text(r.url),
  }
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY_FETCHED)原样透传 —— difficulty json 的解析
 * 在 `functions.ts` 的 `difficultyJsonOf`(照 ruling `passRow` 先例)。
 *
 * @param r 库里的一行。
 * @returns 同一行。
 */
export function passDifficultyRow(r: DifficultyDbRow): DifficultyDbRow {
  return r
}

/**
 * 一行省份维度(SQL.PROVINCES_INFO)原样透传 —— info json 的解析
 * 在 `functions.ts` 的 `provInfoJsonOf`。
 *
 * @param r 库里的一行。
 * @returns 同一行。
 */
export function passProvInfoRow(r: ProvInfoDbRow): ProvInfoDbRow {
  return r
}
