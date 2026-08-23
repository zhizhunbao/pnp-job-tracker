/**
 * 主线 M2「漏斗五个数」(E7-05)的死值:事件白名单与链定义。
 * 为什么要白名单:埋点调用点几十处,全塞进库等于把一张漏斗表变成垃圾桶,以后没人敢读它。
 *
 * 隐私口径(与 docs/sql/m2-funnel.sql 一致):只记「哪天、哪个事件、哪个低基数分组、多少次」——
 * 没有 IP、没有 UA、没有 user id、没有 session id。prop 只收枚举,不收自由文本。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * 漏斗的规范事件名(库里存的就是这几个)。
 * 前五个 = 旧形态(答题卡 → 报告 → 锁区 → 定价 → 付费),2026-08-04 已摘掉全部站内入口,只剩直达。
 * 六到八 = 对话形态(挂件打开 → 拿到带出处的答复 → 反馈)。**并行量,不混算** —— 设计文档
 * `docs/design/对话即产品-20260803.md` §六:两形态的转化对照才是撤旧页的判据,
 * 塞进同一条链会把两套口径搅成一锅。后接雇主线三步与 PR 评估四步(各自成链)。
 */
export const FUNNEL_STEPS = ['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click', 'chat-open', 'chat-answer', 'chat-feedback', 'modal-pnp', 'pnp-employer-click', 'se-view-jobs', 'dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done'] as const

/**
 * 漏斗步骤名(从白名单数组派生 —— 类型与它派生自的数组同居,派生即护栏:加一步只改数组)。
 */
export type FunnelStep = (typeof FUNNEL_STEPS)[number]

/**
 * 站内既有的埋点名 → 漏斗步骤(调用点一个都不用改名;umami 那边照旧用原名,两套口径互不干扰)。
 * 2026-08-02 收口:详情页的 `jd-report-open`(点了「看报告」)**不再算第 2 步** ——
 * 它是点击不是打开,而且同一次跳转报告页自己也会记一次,留着就是双计。报告态真渲染才算。
 *
 * 对话形态(2026-08-04 起):挂件是全站唯一的对话入口 —— 首页那个内联框同批撤掉了。
 * 为什么必须进第一方表而不是只靠 umami:广告拦截器会挡 umami,而这是现在唯一入口的分母,
 * 挡掉一部分就等于永远读不准转化率。
 * chat-feedback 赞/踩:**通用聊天的点赞是训练信号,我们的点踩是数据缺口报警器** ——
 * 案例复现率 42% 是人肉核 36 个数字换来的;上线后每个点踩都是用户在替我们标注「这里答不好」,
 * 而且按真实频次排好序。prop 是 good|bad(低基数枚举,不收自由文本 —— 那要动隐私页)。
 * 雇主线漏斗(B5,2026-08-08):PNP 弹框打开(分母)→ 点了「该公司在招职位」(分子);
 * se-view-jobs(把脉页橱窗点雇主名)只作参照,不进这条转化率(来源不同的两条路)。
 * PR 评估页(2026-08-11):调用点早就在打,只是没进白名单 —— 于是 Frank 问「有人访问吗」时
 * 第一方表里一条都查不到;四步是一条**自己的链**:打开 → 答完基础卷 → 进估分 → 估分答完。
 */
export const ALIAS: Record<string, FunnelStep> = {
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
  'widget-open': 'chat-open',
  'chat-answer': 'chat-answer',
  'chat-feedback': 'chat-feedback',
  'modal-pnp': 'modal-pnp',
  'pnp-employer-click': 'pnp-employer-click',
  'se-view-jobs': 'se-view-jobs',
  'dp-open': 'dp-open',
  'dp-quiz-done': 'dp-quiz-done',
  'dp-score-start': 'dp-score-start',
  'dp-score-done': 'dp-score-done',
}

/**
 * prop 白名单:低基数枚举才留,其余一律归空 ——
 * 高基数(NOC、公司名、搜索词)会把表撑成明细表。
 */
export const PROP_OK = /^[a-z0-9-]{1,24}$/

/**
 * 事件从哪来的(详情页 / 报告页 / 别处)——
 * 曝光那一步要能分开看,不然 M3 分叉时不知道该改哪个入口。
 */
export const SOURCE: Record<string, string> = {
  'jd-lock-seen': 'jd', 'rpt-lock-seen': 'rpt',
  'plan-pr-report': 'pr', 'plan-job-report': 'job', 'plan-prov-report': 'prov', 'plan-career-report': 'career',
  'upgrade-open': 'upgrade', 'pricing-open': 'pricing',
}

/**
 * 旧形态那条链(答题卡 → 报告 → 锁区 → 定价 → 付费)。相邻转化率**只在这五步之间**算。
 */
export const LEGACY_STEPS = FUNNEL_STEPS.slice(0, 5)

/**
 * 对话形态那条链(挂件打开 → 带出处的答复 → 反馈)。与旧链**并行**,不接在它后面。
 * 显式截到 8(而非开放式 .slice(5))—— 后面追加的雇主线三步不是这条链的延伸,
 * 开放式切片会把它们错误地拖进「挂件→答复→反馈」的相邻转化率计算。
 */
export const CHAT_STEPS = FUNNEL_STEPS.slice(5, 8)

/**
 * PR 评估形态。与上面两条链**并行**,不接在谁后面:它的分母是「打开决策页」,
 * 和职位详情页那条链没有父子关系(拿 jd-open 当它的分母会算出没意义的比值)。
 */
export const DECISION_STEPS = FUNNEL_STEPS.slice(11, 15)

/**
 * 本机来源判定(host 白名单)。
 */
export const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/
