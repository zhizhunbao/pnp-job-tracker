/**
 * 队列域(lib/queue)的行为:把调度器上报的一个单元现状洗净、upsert 进 etl_units(一单元一行,只留现状)。
 * 管理员队列页 /queue 的读取在页面门里直接走 SQL(同 /funnel 先例),本域只管写。池由调用方注进来(方案 A)。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */
import { SQL } from '../db'
import { NAME_LEN_MAX, NAME_RE, UNIT_STATES } from './constants'
import type { EpochJson, MaybeEpoch, MaybeUnitFact, SaveUnitIn, UnitJson, WriteOut } from './types'

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
  return {
    name: body.name,
    intervalS: body.intervalS,
    state: body.state,
    lastOk,
    startedAt: epochOrNull(body.startedAt),
    endedAt: epochOrNull(body.endedAt),
    nextAt: epochOrNull(body.nextAt),
  }
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
 * 写一行单元现状(没行建行,有行整行改)。
 *
 * @param x 连接与洗净的一行。
 * @returns 无。
 */
export async function saveUnit(x: SaveUnitIn): WriteOut {
  const u = x.unit
  await x.db.query(SQL.QUEUE_UNIT_PUT, [u.name, u.intervalS, u.state, u.lastOk, u.startedAt, u.endedAt, u.nextAt])
}
