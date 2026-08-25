/**
 * 漏斗域的行为:事件归一与转化率 —— 纯函数,单测锁行为(tests/int/funnel)。
 * 路由只负责 UPSERT,判断都在这里;白名单与链定义见 constants 头。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { SQL } from '../db'
import {
  ALIAS, CHAT_STEPS, DECISION_STEPS, HOST_NONE, LEGACY_STEPS, LOCAL_HOST_RE, PROP_OK, SOURCE,
} from './constants'
import type { FunnelHitIn, HostHeadersIn, MaybeFunnelHit, RateList, RatesOfIn, RecordHitIn, RecordedOut, StepCounts } from './types'

/**
 * 站内埋点名(+ 可选分组)→ 入库的一行;不在白名单的返回 null(静默丢弃,不报错)。
 * prop 优先用调用方给的低基数枚举,没给就退到「事件来自哪个入口」。
 *
 * @param input 埋点名与分组原料(来自请求体,类型不可信)。
 * @returns 入库行;不收的是 null。
 */
export function toFunnelHit(input: FunnelHitIn): MaybeFunnelHit {
  if (typeof input.name !== 'string') {
    return null
  }
  const key = input.name.trim()
  const event = ALIAS[key]
  if (event == null) {
    return null
  }
  let given = ''
  if (typeof input.prop === 'string') {
    given = input.prop.trim().toLowerCase()
  }
  let p = ''
  if (given !== '' && PROP_OK.test(given)) {
    p = given
  } else {
    const src = SOURCE[key]
    if (src != null) {
      p = src
    }
  }
  return { event: event, prop: p }
}

/**
 * 一条链的相邻转化率;分母为 0 给 null(显示层出「—」,不许出 0% 或 NaN)。
 *
 * @param input 链与计数。
 * @returns 每相邻两步一格的转化率(百分数,一位小数)。
 */
function ratesOf(input: RatesOfIn): RateList {
  const out: RateList = []
  for (let i = 1; i < input.steps.length; i++) {
    let from = 0
    const f = input.counts[input.steps[i - 1]]
    if (f != null) {
      from = f
    }
    let to = 0
    const tv = input.counts[input.steps[i]]
    if (tv != null) {
      to = tv
    }
    if (from > 0) {
      out.push(Math.round((to / from) * 1000) / 10)
    } else {
      out.push(null)
    }
  }
  return out
}

/**
 * 旧五步的相邻转化率(四格)。**对话两步不许接进来** —— 两形态是并行对照,
 * 混算会算出「报告 → 挂件打开」这种没有因果的比值,而这张表就是拿来做撤旧页判断的。
 *
 * @param counts 各步计数。
 * @returns 四格转化率。
 */
export function stepRates(counts: StepCounts): RateList {
  return ratesOf({ steps: LEGACY_STEPS, counts: counts })
}

/**
 * 对话链的转化率(两格:打开 → 答复 → 反馈)。
 *
 * @param counts 各步计数。
 * @returns 两格转化率。
 */
export function chatRates(counts: StepCounts): RateList {
  return ratesOf({ steps: CHAT_STEPS, counts: counts })
}

/**
 * PR 评估链的转化率(三格:打开 → 答完基础卷 → 进估分 → 估分答完)。
 *
 * @param counts 各步计数。
 * @returns 三格转化率。
 */
export function decisionRates(counts: StepCounts): RateList {
  return ratesOf({ steps: DECISION_STEPS, counts: counts })
}

/**
 * 这次计数来自本机开发吗?本地 dev **直连生产库**(2026-07-04 起的约定)——
 * 于是在 localhost 上验一次版式,生产漏斗表就多几条假数(2026-08-02 实撞:当天 report-open
 * 里有 3 条是截图跑出来的)。漏斗是拿来做 M3 分叉判断的,掺了开发流量比没有数更坏 →
 * 本机来源一律不计。
 *
 * @param host 请求的 host 头。
 * @returns 本机来源 true。
 */
export function isLocalHost(host: string): boolean {
  return LOCAL_HOST_RE.test((host || HOST_NONE).trim().toLowerCase())
}

/**
 * 取请求来源的 host（优先 origin 头；头不合法就按线上算 ——
 * 宁可多记一条，也不静默丢线上流量）。
 *
 * @param input 两个头的原文（没有是 null）。
 * @returns host 串；取不到给空串（空串不是本机）。
 */
export function siteHostOf(input: HostHeadersIn): string {
  try {
    if (input.origin != null && input.origin !== '') {
      return new URL(input.origin).host
    }
    if (input.host != null) {
      return input.host
    }
    return HOST_NONE
  } catch {
    return HOST_NONE
  }
}

/**
 * 记一笔漏斗计数（按天 UPSERT）。库抖动/表还没建静默吞 ——
 * 埋点丢一次比页面报错强（同 track 埋点吞错先例）。
 *
 * @param input 连接与入库行。
 * @returns 无。
 */
export async function recordHit(input: RecordHitIn): RecordedOut {
  try {
    await input.db.query(SQL.FUNNEL_EVENT_UPSERT, [input.hit.event, input.hit.prop])
  } catch {}
}
