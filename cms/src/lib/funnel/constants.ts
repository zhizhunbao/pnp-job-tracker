/**
 * 主线 M2「漏斗五个数」(E7-05)的死值:事件白名单与链定义。
 * 为什么要白名单:埋点调用点几十处,全塞进库等于把一张漏斗表变成垃圾桶,以后没人敢读它。
 *
 * 隐私口径(与 docs/sql/m2-funnel.sql 一致):只记「哪天、哪个事件、哪个低基数分组、多少次」——
 * 没有 IP、没有 UA、没有 user id、没有 session id。prop 只收枚举,不收自由文本。
 * 2026-09-26 /fe Frank:路由为滤机器人会读一眼 UA 头(判定见 lib/http 的 BOT_UA_RE),判完即弃,照旧不落库。
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
 * 2026-09-26 /fe Frank(撤两条死链):旧形态的「报告 / 锁区」两步与对话形态三步,触发点都已不在
 * (报告与锁区的入口 08-04 摘净,挂件 09-23 摘下、面板无处唤出),30 天零计数白占看板 → 撤出白名单;
 * 库里历史行一条不删。上面「前五个 / 六到八」说的是撤前的排法 —— 链自此按名写成显式数组
 * (LEGACY_STEPS / DECISION_STEPS),这里的顺序只管看板行序。
 * 同日尾部追加四个转化计数(apply 投递 / signup 注册成功 / checkout 发起付款 / weekly-optin 周报开关),
 * 只计数不成链,理由见 ALIAS 末段。
 */
export const FUNNEL_STEPS = ['jd-open', 'pricing-open', 'pay-click', 'modal-pnp', 'pnp-employer-click', 'se-view-jobs', 'dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done', 'pulse-card', 'pulse-occ', 'pulse-cta', 'emp-search', 'emp-filter', 'emp-row', 'emp-page', 'pulse-sec', 'pulse-subnav', 'pulse-series', 'city-open', 'apply', 'signup', 'checkout', 'weekly-optin'] as const

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
 * 把脉页三点击(2026-09-04 /fe 评估):脉象卡 / 榜上职业名 / 职位板入口大钮。此前只打 umami,
 * 剔掉 Frank 自己的设备后 30 天全是 0,而 umami 被拦截器吃一截 —— 改版后要拿准数验有没有人点。
 * 同样**追加在尾部**,自成一条并行链;调用点沿用原事件名(下划线),白名单里映射成 kebab 步名。
 *
 * 雇主板四事件(2026-09-04 /fe 雇主模块):搜索 / 换筛选 / 点雇主名 / 翻页。
 * **不是一条转化链,只做计数** —— 四件事互相之间没有父子关系(换个筛选不是搜索的下一步),
 * 排成链算相邻转化率只会算出没有意义的比值,所以它们不进任何 *_STEPS 切片,
 * 与 se-view-jobs 同属**参照**。同样追加在尾部,免得动了前面的下标切片。
 * prop 是低基数枚举:搜索 / 点名 / 翻页记口径(designated|hiring),换筛选记的是**哪一格**
 * (mode|prov|program|city|noc)—— 🔴 搜索词与雇主名永不进 prop,高基数会把日聚合撑成明细表。
 * 城市段一事件(2026-09-11 城市段重设计批):city-open = 从城市段落去职位板,
 * prop 记从哪张表走的(main|industry|pilot|dli|search)—— 旧城市卡零埋点 40 天零交互不可测,
 * 本批四表全部挂点;只计数不成链,城市名永不进 prop(高基数)。
 * 2026-09-26 /fe Frank:报告四卡(plan-*-report)、锁区两处(jd- / rpt-lock-seen)与对话三名
 * (widget-open / chat-answer / chat-feedback)随步骤撤出白名单,旧名再进来一律丢(库里历史行不动)。
 * 同日转化四事件入册:投递(apply)、注册成功(signup)、发起 Stripe Checkout(checkout)、周报开关
 * (weekly-optin)。先前四处调用点绕过 lib/track 直调 window.umami —— 只在 Umami 有数,被拦截器挡掉就没了,
 * 正是当初立第一方表要治的病。**不是一条转化链,只做计数**,与雇主板四事件同属参照:四件事互相之间
 * 没有父子关系(投递不是注册的下一步,周报开关也不接在发起付款后面),排成链算相邻转化率只会算出
 * 没有意义的比值,所以不进任何 *_STEPS。prop 是低基数枚举:投递记方式(email|web)、发起付款记档位、
 * 周报记开关(true|false)、注册不分组 —— 🔴 邮箱、公司名、岗位号永不进 prop。
 */
export const ALIAS: Record<string, FunnelStep> = {
  'modal-jd': 'jd-open',
  'jd-open': 'jd-open',
  'pricing-open': 'pricing-open',
  'upgrade-open': 'pricing-open',
  'pay-click': 'pay-click',
  'modal-pnp': 'modal-pnp',
  'pnp-employer-click': 'pnp-employer-click',
  'se-view-jobs': 'se-view-jobs',
  'dp-open': 'dp-open',
  'dp-quiz-done': 'dp-quiz-done',
  'dp-score-start': 'dp-score-start',
  'dp-score-done': 'dp-score-done',
  'pulse_card_click': 'pulse-card',
  'pulse_occ_click': 'pulse-occ',
  'landing_cta_browse': 'pulse-cta',
  'emp-search': 'emp-search',
  'emp-filter': 'emp-filter',
  'emp-row': 'emp-row',
  'emp-page': 'emp-page',
  'pulse-sec': 'pulse-sec',
  'pulse-subnav': 'pulse-subnav',
  'pulse-series': 'pulse-series',
  'city-open': 'city-open',
  'apply': 'apply',
  'signup': 'signup',
  'checkout': 'checkout',
  'weekly-optin': 'weekly-optin',
}

/**
 * prop 白名单:低基数枚举才留,其余一律归空 ——
 * 高基数(NOC、公司名、搜索词)会把表撑成明细表。
 */
export const PROP_OK = /^[a-z0-9-]{1,24}$/

/**
 * 事件从哪来的(详情页 / 报告页 / 别处)——
 * 曝光那一步要能分开看,不然 M3 分叉时不知道该改哪个入口。
 * 2026-09-26 /fe Frank:锁区两处(jd / rpt)与报告四卡(pr / job / prov / career)随步骤撤出,
 * 只剩定价那一步的两个入口。
 */
export const SOURCE: Record<string, string> = {
  'upgrade-open': 'upgrade', 'pricing-open': 'pricing',
}

/**
 * 旧形态那条链(答题卡 → 报告 → 锁区 → 定价 → 付费)。相邻转化率**只在这五步之间**算。
 * 2026-09-26 /fe Frank:报告、锁区两步撤出白名单,这条链只剩「定价 → 付费」一条真父子边
 * (付费钮只长在价卡上)。jd-open 不再接在链头 —— 定价的来路不止详情页(定价页直链、升级弹框、
 * 账户菜单……),拿它当定价的分母,与看板当年「② 不给比上一步」是同一个理由;它留作全站分母单独看。
 * 链改按名写死(原 `FUNNEL_STEPS.slice(0, 5)`):下标切片一撤步就错位,会把别的步骤拖进链里。
 */
export const LEGACY_STEPS: readonly FunnelStep[] = ['pricing-open', 'pay-click']

/**
 * PR 评估形态。与上面两条链**并行**,不接在谁后面:它的分母是「打开决策页」,
 * 和职位详情页那条链没有父子关系(拿 jd-open 当它的分母会算出没意义的比值)。
 * 2026-09-26 /fe Frank:改按名写死(原 `FUNNEL_STEPS.slice(11, 15)`)。同日撤掉的对话链 CHAT_STEPS
 * (挂件打开 → 带出处的答复 → 反馈,原 `.slice(5, 8)`)当年特意把切片显式截到 8,防后面追加的雇主线三步
 * 被开放式切片拖进「挂件→答复→反馈」的相邻转化率 —— 下标切片的这类坑,正是改成按名列的理由。
 */
export const DECISION_STEPS: readonly FunnelStep[] = ['dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done']

/**
 * 转化率取整前的放大倍数:比值 ×1000。100 是「折成百分数」,再 ×10 是给小数点后留一位 ——
 * 两件事乘在一起才是这一格。与 RATE_ROUND_DIV 成对,改一个另一个必须跟着改。
 */
export const RATE_ROUND_SCALE = 1000

/**
 * 取整之后除回去的那一格:÷10,把 RATE_ROUND_SCALE 多乘的一位小数还原成百分数
 * (例:0.4237 → 423.7 → 424 → 42.4)。
 */
export const RATE_ROUND_DIV = 10

/**
 * 本机来源判定(host 白名单)。
 */
export const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/

/**
 * 取不到请求来源 host 时的那一格,三处共用:`isLocalHost` 收到空 host 的兜底、
 * `siteHostOf` 里 origin 与 host 两个头都没有、`siteHostOf` 里 URL 解析抛错。
 * (origin 缺席但 host 在,走的是「回 host」那一支,落不到这里。)
 * 空串**不匹配** LOCAL_HOST_RE,于是判定落在「不是本机」,这一笔照常计数。
 * 方向是故意的:头缺失时宁可多记一条线上流量,也不静默丢 ——
 * 漏斗是拿来做分叉判断的分母,少记的那条永远补不回来,多记的那条下一轮还看得见。
 */
export const HOST_NONE = ''
