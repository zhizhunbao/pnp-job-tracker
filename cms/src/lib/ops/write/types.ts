/**
 * ops 子桶 write 的形状:调度器上报体(线格式)→ 洗净的一行,与写库的入参。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */
import type { Db } from '@/lib/db'

/**
 * 调度器 POST 来的上报体(线格式:网络来的,每格都可能缺席或类型不对,收下后逐格判)。
 */
export type UnitJson = {
  /**
   * 单元名。
   */
  name?: string

  /**
   * 节奏秒数。
   */
  intervalS?: number

  /**
   * 状态(run / wait / llm)。
   */
  state?: string

  /**
   * 上一轮成败;还没跑完过 = null。
   */
  lastOk?: boolean | null

  /**
   * 开跑时刻(epoch 秒);没有 = null。
   */
  startedAt?: number | null

  /**
   * 上一轮跑完的时刻(epoch 秒);没有 = null。
   */
  endedAt?: number | null

  /**
   * 下一轮最早开跑的时刻(epoch 秒);没有 = null。
   */
  nextAt?: number | null

  /**
   * 刚跑完的这一轮(只在跑完那次带;2026-11-06 起记历史)。
   */
  round?: RoundJson
}

/**
 * 上报体里「刚跑完的这一轮」(线格式)。
 */
export type RoundJson = {
  /**
   * 这一轮成没成。
   */
  ok?: boolean

  /**
   * 失败时本轮最后几行出错行;成功 = null。
   */
  error?: string | null
}

/**
 * 洗净的一轮(开跑 / 跑完时刻取上报体顶层那两格)。
 */
export type RoundFact = {
  /**
   * 开跑时刻(epoch 秒)。
   */
  startedAt: number

  /**
   * 跑完时刻(epoch 秒)。
   */
  endedAt: number

  /**
   * 这一轮成没成。
   */
  ok: boolean

  /**
   * 报错正文;成功或没给 = null。
   */
  error: string | null
}

/**
 * 可能没有的一轮(不是跑完那次的上报、或格子不全 = null)。
 */
export type MaybeRoundFact = RoundFact | null

/**
 * roundOf 的入参:上报体与已洗好的两个时刻。
 */
export type RoundOfIn = {
  /**
   * 上报体里的 round 格。
   */
  round: RoundJson | null

  /**
   * 洗好的开跑时刻。
   */
  startedAt: MaybeEpoch

  /**
   * 洗好的跑完时刻。
   */
  endedAt: MaybeEpoch
}

/**
 * 上报体里的一个时刻格(线格式原样:可能缺席、null 或数)。
 */
export type EpochJson = UnitJson['startedAt']

/**
 * 洗净的一个时刻(epoch 秒);没有 = null。
 */
export type MaybeEpoch = number | null

/**
 * 洗净的一行单元现状(toUnitFact 之后每格都已有效)。
 */
export type UnitFact = {
  /**
   * 单元名。
   */
  name: string

  /**
   * 节奏秒数。
   */
  intervalS: number

  /**
   * 状态(UNIT_STATES 之一)。
   */
  state: string

  /**
   * 上一轮成败;还没跑完过 = null。
   */
  lastOk: boolean | null

  /**
   * 开跑时刻(epoch 秒);没有 = null。
   */
  startedAt: number | null

  /**
   * 上一轮跑完的时刻(epoch 秒);没有 = null。
   */
  endedAt: number | null

  /**
   * 下一轮最早开跑的时刻(epoch 秒);没有 = null。
   */
  nextAt: number | null

  /**
   * 刚跑完的这一轮(要记历史);不是跑完那次 = null。
   */
  round: MaybeRoundFact
}

/**
 * 可能洗不出来的一行(坏体 = null)。
 */
export type MaybeUnitFact = UnitFact | null

/**
 * saveUnit 的入参。
 */
export type SaveUnitIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 洗净的一行。
   */
  unit: UnitFact
}

/**
 * 写库没有返回值。
 */
export type WriteOut = Promise<void>

/**
 * 队列页 POST 来的删除体(线格式,逐格判)。
 */
export type RemoveJson = {
  /**
   * 删哪种(unit / apply / site / alias)。
   */
  kind?: string

  /**
   * 那一条的键(单元名 / 投递 id / 池主键)。
   */
  key?: string
}

/**
 * 洗净的删除请求。
 */
export type RemoveFact = {
  /**
   * 删哪种(DEL_KINDS 之一)。
   */
  kind: string

  /**
   * 那一条的键。
   */
  key: string
}

/**
 * 可能洗不出来的删除请求(坏体 = null)。
 */
export type MaybeRemoveFact = RemoveFact | null

/**
 * removeItem 的入参。
 */
export type RemoveIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 洗净的删除请求。
   */
  item: RemoveFact
}

/**
 * removeItem 的结果:动了几行。
 */
export type RemovedOut = Promise<number>
