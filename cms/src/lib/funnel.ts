// 主线 M2「漏斗五个数」(E7-05):事件白名单与归一 —— 纯函数,单测锁行为。
// 路由只负责 UPSERT,判断都在这里。为什么要白名单:埋点调用点几十处,
// 全塞进库等于把一张漏斗表变成垃圾桶,以后没人敢读它。
//
// 隐私口径(与 docs/sql/m2-funnel.sql 一致):只记「哪天、哪个事件、哪个低基数分组、多少次」——
// 没有 IP、没有 UA、没有 user id、没有 session id。prop 只收枚举,不收自由文本。

/** 五步漏斗的规范事件名(库里存的就是这几个) */
export const FUNNEL_STEPS = ['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click'] as const
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

// 站内既有的埋点名 → 漏斗步骤(调用点一个都不用改名;umami 那边照旧用原名,两套口径互不干扰)
const ALIAS: Record<string, FunnelStep> = {
  'modal-jd': 'jd-open',
  'jd-open': 'jd-open',
  'jd-report-open': 'report-open',
  'plan-pr-report': 'report-open',
  'plan-job-report': 'report-open',
  'plan-prov-report': 'report-open',
  'plan-career-report': 'report-open',
  'jd-lock-seen': 'lock-seen',
  'rpt-lock-seen': 'lock-seen',
  'pricing-open': 'pricing-open',
  'upgrade-open': 'pricing-open',
  'pay-click': 'pay-click',
}

// prop 白名单:低基数枚举才留,其余一律归空 —— 高基数(NOC、公司名、搜索词)会把表撑成明细表
const PROP_OK = /^[a-z0-9-]{1,24}$/

/** 事件从哪来的(详情页 / 报告页 / 别处)—— 曝光那一步要能分开看,不然 M3 分叉时不知道该改哪个入口 */
const SOURCE: Record<string, string> = {
  'jd-lock-seen': 'jd', 'rpt-lock-seen': 'rpt', 'jd-report-open': 'jd',
  'plan-pr-report': 'pr', 'plan-job-report': 'job', 'plan-prov-report': 'prov', 'plan-career-report': 'career',
  'upgrade-open': 'upgrade', 'pricing-open': 'pricing',
}

export type FunnelHit = { event: FunnelStep; prop: string }

/**
 * 站内埋点名(+ 可选分组)→ 入库的一行;不在白名单的返回 null(静默丢弃,不报错)。
 * prop 优先用调用方给的低基数枚举,没给就退到「事件来自哪个入口」。
 */
export function toFunnelHit(name: unknown, prop?: unknown): FunnelHit | null {
  if (typeof name !== 'string') return null
  const event = ALIAS[name.trim()]
  if (!event) return null
  const given = typeof prop === 'string' ? prop.trim().toLowerCase() : ''
  const p = given && PROP_OK.test(given) ? given : SOURCE[name.trim()] ?? ''
  return { event, prop: p }
}

/** 五步的相邻转化率;分母为 0 给 null(显示层出「—」,不许出 0% 或 NaN) */
export function stepRates(counts: Record<string, number>): (number | null)[] {
  return FUNNEL_STEPS.slice(1).map((step, i) => {
    const from = counts[FUNNEL_STEPS[i]] ?? 0
    const to = counts[step] ?? 0
    return from > 0 ? Math.round((to / from) * 1000) / 10 : null
  })
}
