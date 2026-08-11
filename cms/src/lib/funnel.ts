// 主线 M2「漏斗五个数」(E7-05):事件白名单与归一 —— 纯函数,单测锁行为。
// 路由只负责 UPSERT,判断都在这里。为什么要白名单:埋点调用点几十处,
// 全塞进库等于把一张漏斗表变成垃圾桶,以后没人敢读它。
//
// 隐私口径(与 docs/sql/m2-funnel.sql 一致):只记「哪天、哪个事件、哪个低基数分组、多少次」——
// 没有 IP、没有 UA、没有 user id、没有 session id。prop 只收枚举,不收自由文本。

/** 漏斗的规范事件名(库里存的就是这几个)。
 * 前五个 = 旧形态(答题卡 → 报告 → 锁区 → 定价 → 付费),2026-08-04 已摘掉全部站内入口,只剩直达。
 * 后两个 = 对话形态(挂件打开 → 拿到带出处的答复)。**并行量,不混算** —— 设计文档
 * `docs/design/对话即产品-20260803.md` §六:两形态的转化对照才是撤旧页的判据,
 * 塞进同一条链会把两套口径搅成一锅。 */
export const FUNNEL_STEPS = ['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click', 'chat-open', 'chat-answer', 'chat-feedback', 'modal-pnp', 'pnp-employer-click', 'se-view-jobs', 'dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done'] as const
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

// 站内既有的埋点名 → 漏斗步骤(调用点一个都不用改名;umami 那边照旧用原名,两套口径互不干扰)。
// 2026-08-02 收口:详情页的 `jd-report-open`(点了「看报告」)**不再算第 2 步** ——
// 它是点击不是打开,而且同一次跳转报告页自己也会记一次,留着就是双计。报告态真渲染才算。
const ALIAS: Record<string, FunnelStep> = {
  'modal-jd': 'jd-open',
  'jd-open': 'jd-open',
  'plan-pr-report': 'report-open',
  'plan-job-report': 'report-open',
  'plan-prov-report': 'report-open',
  'plan-career-report': 'report-open',
  'jd-lock-seen': 'lock-seen',
  'rpt-lock-seen': 'lock-seen',
  'pricing-open': 'pricing-open',
  'upgrade-open': 'pricing-open',
  'pay-click': 'pay-click',
  // 对话形态(2026-08-04 起)。挂件是全站唯一的对话入口 —— 首页那个内联框同批撤掉了。
  // 为什么必须进第一方表而不是只靠 umami:广告拦截器会挡 umami,而这是现在唯一入口的分母,
  // 挡掉一部分就等于永远读不准转化率。
  'widget-open': 'chat-open',
  'chat-answer': 'chat-answer',
  // 赞/踩。**通用聊天的点赞是训练信号,我们的点踩是数据缺口报警器** ——
  // 案例复现率 42% 是人肉核 36 个数字换来的;上线后每个点踩都是用户在替我们标注「这里答不好」,
  // 而且按真实频次排好序。prop 是 good|bad(低基数枚举,不收自由文本 —— 那要动隐私页)。
  'chat-feedback': 'chat-feedback',
  // 雇主线漏斗(B5,2026-08-08):PNP 弹框打开(分母)→ 点了「该公司在招职位」(分子)。
  // 调用点早就在打(JobsTable AdvisorModal / SponsorLeadCard),只是没进白名单 → 一直只有 umami 那条腿,
  // 广告拦截器一挡就读不出数;三个都是站内既有名,原样收进来,不用改调用点。
  'modal-pnp': 'modal-pnp',
  'pnp-employer-click': 'pnp-employer-click',
  // 三分表(把脉页橱窗)点雇主名 —— 只作参照,不进 modal-pnp→pnp-employer-click 这条转化率
  // (来源不同的两条路,拿橱窗的点击数当 PNP 弹框的分子/分母都不对)。
  'se-view-jobs': 'se-view-jobs',
  // PR 评估页(2026-08-11)。调用点早就在打,只是没进白名单 —— 于是 Frank 问「有人访问吗」时
  // 第一方表里一条都查不到,只能靠登录态 umami 一条条翻 session(它的 API 免费档 401)。
  // 四步是一条**自己的链**:打开 → 答完 6 项基础卷 → 进入各省估分 → 估分答完。
  'dp-open': 'dp-open',
  'dp-quiz-done': 'dp-quiz-done',
  'dp-score-start': 'dp-score-start',
  'dp-score-done': 'dp-score-done',
}

// prop 白名单:低基数枚举才留,其余一律归空 —— 高基数(NOC、公司名、搜索词)会把表撑成明细表
const PROP_OK = /^[a-z0-9-]{1,24}$/

/** 事件从哪来的(详情页 / 报告页 / 别处)—— 曝光那一步要能分开看,不然 M3 分叉时不知道该改哪个入口 */
const SOURCE: Record<string, string> = {
  'jd-lock-seen': 'jd', 'rpt-lock-seen': 'rpt',
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
/** 旧形态那条链(答题卡 → 报告 → 锁区 → 定价 → 付费)。相邻转化率**只在这五步之间**算。 */
export const LEGACY_STEPS = FUNNEL_STEPS.slice(0, 5)
/** 对话形态那条链(挂件打开 → 带出处的答复)。与旧链**并行**,不接在它后面。
 * 显式截到 8(而非开放式 .slice(5))—— 后面追加的雇主线三步不是这条链的延伸,
 * 开放式切片会把它们错误地拖进「挂件→答复→反馈」的相邻转化率计算。 */
export const CHAT_STEPS = FUNNEL_STEPS.slice(5, 8)
/** PR 评估形态。与上面两条链**并行**,不接在谁后面:它的分母是「打开决策页」,
 *  和职位详情页那条链没有父子关系(拿 jd-open 当它的分母会算出没意义的比值)。 */
export const DECISION_STEPS = FUNNEL_STEPS.slice(11, 15)

const ratesOf = (steps: readonly string[], counts: Record<string, number>) =>
  steps.slice(1).map((step, i) => {
    const from = counts[steps[i]] ?? 0
    const to = counts[step] ?? 0
    return from > 0 ? Math.round((to / from) * 1000) / 10 : null
  })

/** 旧五步的相邻转化率(四格)。**对话两步不许接进来** —— 两形态是并行对照,
 * 混算会算出「报告 → 挂件打开」这种没有因果的比值,而这张表就是拿来做撤旧页判断的。 */
export function stepRates(counts: Record<string, number>): (number | null)[] {
  return ratesOf(LEGACY_STEPS, counts)
}

/** 对话链的转化率(一格:打开 → 拿到答复)。 */
export function chatRates(counts: Record<string, number>): (number | null)[] {
  return ratesOf(CHAT_STEPS, counts)
}

/** PR 评估链的转化率(三格:打开 → 答完基础卷 → 进估分 → 估分答完)。 */
export function decisionRates(counts: Record<string, number>): (number | null)[] {
  return ratesOf(DECISION_STEPS, counts)
}

/**
 * 这次计数来自本机开发吗?本地 dev **直连生产库**(2026-07-04 起的约定)——
 * 于是在 localhost 上验一次版式,生产漏斗表就多几条假数(2026-08-02 实撞:当天 report-open 里有 3 条是截图跑出来的)。
 * 漏斗是拿来做 M3 分叉判断的,掺了开发流量比没有数更坏 → 本机来源一律不计。
 */
export const isLocalHost = (host: string): boolean =>
  /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/.test((host || '').trim().toLowerCase())
