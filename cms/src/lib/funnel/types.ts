/**
 * 漏斗域的形状 —— 本域自己声明(FunnelStep 与白名单数组同居 constants,派生即护栏)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

// eslint-disable-next-line local/no-import-in-leaf -- FunnelStep 与白名单数组同居 constants(派生即护栏),入库行的 event 格要它
import type { FunnelStep } from './constants'
import type { Db } from '../db'

/**
 * 埋点原料的一格(来自请求体 json:类型不可信,判定在 toFunnelHit)。
 */
export type TrackValue = string | number | boolean | null

/**
 * 入库的一行(步骤 + 低基数分组)。
 */
export type FunnelHit = {
  /**
   * 规范步骤名。
   */
  event: FunnelStep

  /**
   * 低基数分组;没有是空串。
   */
  prop: string
}

/**
 * 入库行或不收(`toFunnelHit` 的返回;白名单外是 null,静默丢弃)。
 */
export type MaybeFunnelHit = FunnelHit | null

/**
 * `toFunnelHit` 的入参。
 */
export type FunnelHitIn = {
  /**
   * 站内埋点名(原料;非字符串按不认识处理)。
   */
  name: TrackValue

  /**
   * 调用方给的低基数分组(原料;可 null)。
   */
  prop: TrackValue
}

/**
 * 各步 → 当期计数。
 */
export type StepCounts = Record<string, number>

/**
 * 相邻转化率序列(分母为 0 的格是 null —— 显示层出「—」,不许出 0% 或 NaN)。
 */
export type RateList = (number | null)[]

/**
 * 一条链的步骤名序列(readonly:链定义是死值)。
 */
export type StepList = readonly string[]

/**
 * `ratesOf` 的入参。
 */
export type RatesOfIn = {
  /**
   * 链的步骤序列。
   */
  steps: StepList

  /**
   * 各步计数。
   */
  counts: StepCounts
}

/**
 * `siteHostOf` 的入参（两个头的原文；路由层取好传进来，纯行为层不碰 Request）。
 */
export type HostHeadersIn = {
  /**
   * Origin 头原文；没有是 null。
   */
  origin: string | null

  /**
   * Host 头原文；没有是 null。
   */
  host: string | null
}

/**
 * `recordHit` 的入参。
 */
export type RecordHitIn = {
  /**
   * 能查的连接（池由路由注进来）。
   */
  db: Db

  /**
   * 白名单归一后的入库行。
   */
  hit: FunnelHit
}

/**
 * `recordHit` 的返回（无值；失败静默吞，理由见函数 JSDoc）。
 */
export type RecordedOut = Promise<void>

/**
 * /api/funnel/track 请求体里本域读的两格（原料：类型不可信，判定在 toFunnelHit）。
 */
export type TrackBody = {
  /**
   * 站内埋点名。
   */
  event: TrackValue

  /**
   * 低基数分组。
   */
  prop: TrackValue
}
