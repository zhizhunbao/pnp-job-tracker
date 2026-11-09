/**
 * ops 子桶 write 的行为:把调度器上报的一个单元现状洗净、upsert 进 etl_units(一单元一行,只留现状);
 * 管理员在运维页删一条(2026-11-06 Frank「全都加一个删除按钮」:各种排队各有各的「删」,见 removeItem)。
 * 由 lib/queue 搬来(2026-11-08 替换域)。池由调用方注进来(方案 A)。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */
import { SQL } from '../../db'
import {
  DEL_APPLY, DEL_KEY_LEN_MAX, DEL_KINDS, DEL_SITE, NAME_LEN_MAX, NAME_RE, ROUND_ERROR_MAX, UNIT_STATES,
} from './constants'
import type {
  EpochJson, MaybeEpoch, MaybeRemoveFact, MaybeRoundFact, MaybeUnitFact, RemoveIn, RemoveJson, RemovedOut, RoundJson,
  RoundOfIn, SaveUnitIn, UnitJson, WriteOut,
} from './types'

/**
 * 上报体 → 洗净的一行:单元名、节奏、状态三格必须对,时刻与成败格类型不对一律当没有(null)。
 *
 * @param body 网络来的上报体。
 * @returns 洗净的一行;必填格不对 = null(路由回 400)。
 */
export function toUnitFact(body: UnitJson): MaybeUnitFact {
  if (typeof body.name !== 'string' || body.name.length > NAME_LEN_MAX || NAME_RE.test(body.name) === false) {
    return null
  }
  if (typeof body.intervalS !== 'number' || Number.isInteger(body.intervalS) === false || body.intervalS <= 0) {
    return null
  }
  if (typeof body.state !== 'string' || (UNIT_STATES as readonly string[]).includes(body.state) === false) {
    return null
  }
  let lastOk: boolean | null = null
  if (typeof body.lastOk === 'boolean') {
    lastOk = body.lastOk
  }
  const startedAt = epochOrNull(body.startedAt)
  const endedAt = epochOrNull(body.endedAt)
  let round: RoundJson | null = null
  if (typeof body.round === 'object') {
    round = body.round
  }
  return {
    name: body.name,
    intervalS: body.intervalS,
    state: body.state,
    lastOk,
    startedAt,
    endedAt,
    nextAt: epochOrNull(body.nextAt),
    round: roundOf({ round, startedAt, endedAt }),
  }
}

/**
 * 上报体里「刚跑完的这一轮」:成败是布尔、开跑跑完两个时刻都在才算一轮(否则不记历史);报错正文不是串当没有。
 *
 * @param x round 格与洗好的两个时刻。
 * @returns 洗净的一轮;不全 = null。
 */
export function roundOf(x: RoundOfIn): MaybeRoundFact {
  if (x.round == null || typeof x.round.ok !== 'boolean' || x.startedAt == null || x.endedAt == null) {
    return null
  }
  let error: string | null = null
  if (typeof x.round.error === 'string' && x.round.error !== '') {
    error = x.round.error.slice(0, ROUND_ERROR_MAX)
  }
  return { startedAt: x.startedAt, endedAt: x.endedAt, ok: x.round.ok, error }
}

/**
 * 时刻格:有限正数才算一刻,其余(缺席、null、串、NaN)一律当没有。
 *
 * @param v 上报体里的时刻格。
 * @returns epoch 秒;没有 = null。
 */
export function epochOrNull(v: EpochJson): MaybeEpoch {
  if (typeof v !== 'number' || Number.isFinite(v) === false || v <= 0) {
    return null
  }
  return v
}

/**
 * 写一行单元现状(没行建行,有行整行改);带了刚跑完的一轮就再记一行历史、顺手删掉 7 天前的。
 *
 * @param x 连接与洗净的一行。
 * @returns 无。
 */
export async function saveUnit(x: SaveUnitIn): WriteOut {
  const u = x.unit
  await x.db.query(SQL.QUEUE_UNIT_PUT, [u.name, u.intervalS, u.state, u.lastOk, u.startedAt, u.endedAt, u.nextAt])
  if (u.round == null) {
    return
  }
  await x.db.query(SQL.QUEUE_RUN_PUT, [u.name, u.round.startedAt, u.round.endedAt, u.round.ok, u.round.error])
  await x.db.query(SQL.QUEUE_RUN_PRUNE, [])
}

/**
 * 删除体 → 洗净的删除请求:种类必须是三种之一,键非空且不超长。
 *
 * @param body 网络来的删除体。
 * @returns 洗净的请求;不对 = null(路由回 400)。
 */
export function toRemoveFact(body: RemoveJson): MaybeRemoveFact {
  if (typeof body.kind !== 'string' || (DEL_KINDS as readonly string[]).includes(body.kind) === false) {
    return null
  }
  if (typeof body.key !== 'string' || body.key === '' || body.key.length > DEL_KEY_LEN_MAX) {
    return null
  }
  return { kind: body.kind, key: body.key }
}

/**
 * 删一条:待发投递删行、官网队列清阶段、译名队列标跳过。
 *
 * @param x 连接与洗净的删除请求。
 * @returns 动了几行(0 = 那一条已经不在队里了)。
 */
export async function removeItem(x: RemoveIn): RemovedOut {
  let sql = SQL.QUEUE_DEL_ALIAS
  if (x.item.kind === DEL_APPLY) {
    sql = SQL.QUEUE_DEL_APPLY
  } else if (x.item.kind === DEL_SITE) {
    sql = SQL.QUEUE_DEL_SITE
  }
  const res = await x.db.query(sql, [x.item.key])
  let n = 0
  if (res.rowCount != null) {
    n = res.rowCount
  }
  return n
}
