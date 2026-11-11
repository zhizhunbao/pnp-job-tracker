/**
 * ops 域的参数:运维页的页面清单、分区标题、列头、条数上限与状态词(2026-11-08 Frank「把管理员队列页重构成运维页」)。
 * 模块、页面、列与四格的出处逐条见对话定稿清单;加一个观察维度 = 这里加一行 + functions 加一段取数,不用新建页面。
 * 2026-11-10 Frank「内部页也要三语,界面字不进 lib」:页名、列头、标题、四格、胶囊的值都是词条键(`ops.` 开头,
 * 文字住 lib/i18n 三语文件),由 components/ops 取词;功能名、通道名、额度配置是数据,原样显示不翻译。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */

// =========================================================================
// 1. 页面清单
// =========================================================================

/**
 * 总览页:服务报告(SWEBOK 4.5 Service Reporting)。
 */
export const SEC_REPORT = 'report'

/**
 * 调度页。
 */
export const SEC_SCHEDULE = 'schedule'

/**
 * 投递待发页。
 */
export const SEC_APPLY = 'apply'

/**
 * 官网抓取页。
 */
export const SEC_SITES = 'sites'

/**
 * 译名翻译页。
 */
export const SEC_ALIAS = 'alias'

/**
 * 用量页。
 */
export const SEC_USAGE = 'usage'

/**
 * 成本页。
 */
export const SEC_COST = 'cost'

/**
 * 额度页。
 */
export const SEC_BUDGET = 'budget'

/**
 * 事件页(SWEBOK 4.1)。
 */
export const SEC_INCIDENTS = 'incidents'

/**
 * 报警规则页(Azure Monitor alerts)。
 */
export const SEC_RULES = 'rules'

/**
 * 数据新鲜度页(dbt freshness)。
 */
export const SEC_FRESH = 'fresh'

/**
 * 通道状态页(Google SRE 四个黄金信号)。
 */
export const SEC_CHANNELS = 'channels'

/**
 * 功能通道页(Frank 第 2 条要求)。
 */
export const SEC_ROUTES = 'routes'

/**
 * 通道实测页(Claude 文档成功标准)。
 */
export const SEC_EVALS = 'evals'

/**
 * Workspace 和 Key 页(Console)。
 */
export const SEC_KEYS = 'keys'

/**
 * 用户收藏页(2026-11-10 Frank「应该在运维模块能看到全部」)。
 */
export const SEC_SAVED = 'saved'

/**
 * 进 /ops 默认看哪一页。
 */
export const SEC_DEFAULT = SEC_REPORT

/**
 * 全部已上线的页面。
 */
export const SECS: readonly string[] = [
  SEC_REPORT, SEC_INCIDENTS, SEC_RULES, SEC_SCHEDULE, SEC_APPLY, SEC_SITES, SEC_ALIAS, SEC_FRESH, SEC_CHANNELS, SEC_ROUTES, SEC_EVALS,
  SEC_USAGE, SEC_COST, SEC_BUDGET, SEC_KEYS, SEC_SAVED,
]

/**
 * 每页在 banner 上的页名。
 */
export const SEC_NAME: Record<string, string> = {
  /**
   * 总览。
   */
  report: 'ops.sec.report',

  /**
   * 调度。
   */
  schedule: 'ops.sec.schedule',

  /**
   * 投递待发。
   */
  apply: 'ops.sec.apply',

  /**
   * 官网抓取。
   */
  sites: 'ops.sec.sites',

  /**
   * 译名翻译。
   */
  alias: 'ops.sec.alias',

  /**
   * 用量。
   */
  usage: 'ops.sec.usage',

  /**
   * 成本。
   */
  cost: 'ops.sec.cost',

  /**
   * 额度。
   */
  budget: 'ops.sec.budget',

  /**
   * 事件。
   */
  incidents: 'ops.sec.incidents',

  /**
   * 报警规则。
   */
  rules: 'ops.sec.rules',

  /**
   * 数据新鲜度。
   */
  fresh: 'ops.sec.fresh',

  /**
   * 通道状态。
   */
  channels: 'ops.sec.channels',

  /**
   * 功能通道。
   */
  routes: 'ops.sec.routes',

  /**
   * 通道实测。
   */
  evals: 'ops.sec.evals',

  /**
   * Workspace 和 Key。
   */
  keys: 'ops.sec.keys',

  /**
   * 用户收藏。
   */
  saved: 'ops.sec.saved',
}

// =========================================================================
// 2. 单元格
// =========================================================================

/**
 * 单元格的种类。
 */
export const CELL = {
  /**
   * 一段文字。
   */
  text: 'text',

  /**
   * 一到两枚胶囊。
   */
  tags: 'tags',

  /**
   * 删除钮。
   */
  del: 'del',

  /**
   * 复制报错钮。
   */
  copy: 'copy',

  /**
   * 主名加灰字。
   */
  named: 'named',
} as const

/**
 * 胶囊变体。
 */
export const VAR = {
  /**
   * 灰:等待。
   */
  gray: 'gray',

  /**
   * 蓝:进行中。
   */
  info: 'info',

  /**
   * 绿:成功。
   */
  ok: 'ok',

  /**
   * 黄:提醒。
   */
  warn: 'warn',

  /**
   * 红:失败。
   */
  bad: 'bad',
} as const

/**
 * 功能名(用量账本里的功能代码 → 人话)。
 */
export const FEATURE_NAME: Record<string, string> = {
  /**
   * 求职信。
   */
  'apply.letter': 'AI 写求职信',

  /**
   * 简历对照。
   */
  'resume.match': '简历对照职位',

  /**
   * 简历解析。
   */
  'resume.extract': '简历解析',

  /**
   * 站内向导。
   */
  guide: '站内向导',
}

/**
 * 通道名(账本里的通道代码 → 人话)。
 */
export const CHANNEL_NAME: Record<string, string> = {
  /**
   * 朋友的 ngrok 网关。
   */
  friend: '朋友网关',

  /**
   * Claude API。
   */
  anthropic: 'Claude',

  /**
   * 局域网或本地 Ollama。
   */
  ollama: 'Ollama',
}

/**
 * 没有值时显示的横线。
 */
export const DASH = '—'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 还没取到时刻。
 */
export const ISO_NONE = ''

// =========================================================================
// 3. 列头
// =========================================================================

/**
 * 服务报告表:SWEBOK 4.5(对比服务目标、事件和失败、用量、趋势)。
 */
export const REPORT_COLS = [
  { label: 'ops.col.area', wrap: false }, { label: 'ops.col.actual', wrap: true }, { label: 'ops.col.target', wrap: true }, { label: 'ops.col.met', wrap: false },
  { label: 'ops.col.incidents', wrap: false }, { label: 'ops.col.usage', wrap: true }, { label: 'ops.col.trend', wrap: false },
]

/**
 * 调度上表:Azure Data Factory 运行列表的列。
 */
export const UNIT_COLS = [
  { label: 'ops.col.unit', wrap: false }, { label: 'ops.col.status', wrap: false }, { label: 'ops.col.start', wrap: false },
  { label: 'ops.col.dur', wrap: false }, { label: 'ops.col.next', wrap: false }, { label: 'ops.col.trigger', wrap: false },
  { label: 'ops.col.error', wrap: false },
]

/**
 * 调度下表:同上。
 */
export const RUN_COLS = [
  { label: 'ops.col.unit', wrap: false }, { label: 'ops.col.start', wrap: false }, { label: 'ops.col.end', wrap: false },
  { label: 'ops.col.dur', wrap: false }, { label: 'ops.col.status', wrap: false }, { label: 'ops.col.error', wrap: false },
  { label: 'ops.col.runId', wrap: false },
]

/**
 * 投递上表:沿用队列页的列。
 */
export const APPLY_COLS = [
  { label: 'ops.col.user', wrap: true }, { label: 'ops.col.job', wrap: true }, { label: 'ops.col.company', wrap: true },
  { label: 'ops.col.status', wrap: false }, { label: 'ops.col.waited', wrap: false }, { label: 'ops.col.action', wrap: false },
]

/**
 * 投递下表:上表加完成时间。
 */
export const APPLY_DONE_COLS = [
  { label: 'ops.col.user', wrap: true }, { label: 'ops.col.job', wrap: true }, { label: 'ops.col.company', wrap: true },
  { label: 'ops.col.status', wrap: false }, { label: 'ops.col.done', wrap: false },
]

/**
 * 官网抓取上表:沿用队列页的列。
 */
export const SITE_COLS = [
  { label: 'ops.col.company', wrap: true }, { label: 'ops.col.status', wrap: false }, { label: 'ops.col.worker', wrap: false },
  { label: 'ops.col.opens', wrap: false }, { label: 'ops.col.waited', wrap: false }, { label: 'ops.col.reason', wrap: true }, { label: 'ops.col.action', wrap: false },
]

/**
 * 官网抓取下表:上表加完成时间。
 */
export const SITE_DONE_COLS = [
  { label: 'ops.col.company', wrap: true }, { label: 'ops.col.status', wrap: false }, { label: 'ops.col.opens', wrap: false },
  { label: 'ops.col.reason', wrap: true }, { label: 'ops.col.done', wrap: false },
]

/**
 * 译名上表:沿用队列页的列。
 */
export const ALIAS_COLS = [
  { label: 'ops.col.employer', wrap: true }, { label: 'ops.col.listed', wrap: false }, { label: 'ops.col.waited', wrap: false }, { label: 'ops.col.action', wrap: false },
]

/**
 * 译名下表:上表加完成时间。
 */
export const ALIAS_DONE_COLS = [
  { label: 'ops.col.employer', wrap: true }, { label: 'ops.col.status', wrap: false }, { label: 'ops.col.listed', wrap: false }, { label: 'ops.col.done', wrap: false },
]

/**
 * 用量表:Console Usage 页与 Usage and Cost Analytics API。
 */
export const USAGE_COLS = [
  { label: 'ops.col.feature', wrap: false }, { label: 'ops.col.model', wrap: false }, { label: 'ops.col.channel', wrap: false }, { label: 'ops.col.tokensIn', wrap: false },
  { label: 'ops.col.tokensOut', wrap: false }, { label: 'ops.col.cacheRead', wrap: false }, { label: 'ops.col.requests', wrap: false },
]

/**
 * 成本表:Console Cost 页。
 */
export const COST_COLS = [
  { label: 'ops.col.date', wrap: false }, { label: 'ops.col.feature', wrap: false }, { label: 'ops.col.model', wrap: false }, { label: 'ops.col.tokenCost', wrap: false },
  { label: 'ops.col.webCost', wrap: false }, { label: 'ops.col.requests', wrap: false }, { label: 'ops.col.total', wrap: false },
]

/**
 * 额度表:Console Spend limits 与 Promotional credits。
 */
export const BUDGET_COLS = [
  { label: 'ops.col.budget', wrap: false }, { label: 'ops.col.limit', wrap: false }, { label: 'ops.col.used', wrap: false }, { label: 'ops.col.usedPct', wrap: false },
  { label: 'ops.col.alerts', wrap: false }, { label: 'ops.col.scope', wrap: true }, { label: 'ops.col.granted', wrap: false }, { label: 'ops.col.expires', wrap: false },
]

// =========================================================================
// 4. 文字
// =========================================================================

/**
 * 表头标题与空态。
 */
export const TEXT = {
  /**
   * 调度上表(定稿清单的原词)。
   */
  unitsNow: 'ops.tt.unitsNow',

  /**
   * 通用上表。
   */
  running: 'ops.tt.running',

  /**
   * 通用下表。
   */
  history: 'ops.tt.history',

  /**
   * 总览表标题。
   */
  reportTitle: 'ops.tt.report',

  /**
   * 用量表标题。
   */
  usageTitle: 'ops.tt.last30',

  /**
   * 生效中的额度。
   */
  budgetLive: 'ops.tt.budgetLive',

  /**
   * 已到期的额度。
   */
  budgetDone: 'ops.tt.budgetDone',

  /**
   * 条数的单位。
   */
  rows: 'ops.rows',

  /**
   * 天的单位。
   */
  days: 'ops.days',

  /**
   * 百分号。
   */
  pct: '%',

  /**
   * 美元符号。
   */
  usd: '$',
}

/**
 * 四格标题。
 */
export const CARD = {
  /**
   * 服务报告:达标的领域。
   */
  met: 'ops.card.met',

  /**
   * 服务报告:未达标的领域。
   */
  missed: 'ops.card.missed',

  /**
   * 服务报告:事件和失败。
   */
  incidents: 'ops.card.incidents',

  /**
   * 服务报告:Claude 已用。
   */
  claudeUsed: 'ops.card.claudeUsed',

  /**
   * ADF 状态 In Progress。
   */
  running: 'ops.card.running',

  /**
   * ADF 状态 Queued。
   */
  queued: 'ops.card.queued',

  /**
   * ADF 状态 Failed。
   */
  failed: 'ops.card.failed',

  /**
   * ADF 状态 Succeeded。
   */
  succeeded: 'ops.card.succeeded',

  /**
   * SQS Visible。
   */
  waiting: 'ops.card.waiting',

  /**
   * SQS NotVisible。
   */
  working: 'ops.card.working',

  /**
   * SQS Deleted。
   */
  doneToday: 'ops.card.doneToday',

  /**
   * SQS AgeOfOldestMessage。
   */
  oldest: 'ops.card.oldest',

  /**
   * Console Total tokens in。
   */
  tokensIn: 'ops.card.tokensIn',

  /**
   * Console Total tokens out。
   */
  tokensOut: 'ops.card.tokensOut',

  /**
   * API requests。
   */
  requests: 'ops.card.requests',

  /**
   * API cache_read_input_tokens。
   */
  cacheRead: 'ops.card.cacheRead',

  /**
   * Console Total cost。
   */
  totalCost: 'ops.card.totalCost',

  /**
   * Console Total token cost。
   */
  tokenCost: 'ops.card.tokenCost',

  /**
   * Console Total web search cost。
   */
  webCost: 'ops.card.webCost',

  /**
   * Console Daily token cost。
   */
  todayCost: 'ops.card.todayCost',

  /**
   * Console spent。
   */
  used: 'ops.card.used',

  /**
   * Console % used。
   */
  usedPct: 'ops.card.usedPct',

  /**
   * Console Remaining balance。
   */
  remaining: 'ops.card.remaining',

  /**
   * Console Expires on。
   */
  daysLeft: 'ops.card.daysLeft',
}

/**
 * 状态胶囊的文字。
 */
export const TAG = {
  /**
   * 达标。
   */
  met: 'ops.tag.met',

  /**
   * 未达标。
   */
  missed: 'ops.tag.missed',

  /**
   * 没有约定目标,不判达标。
   */
  noTarget: 'ops.notAgreed',

  /**
   * 运行中。
   */
  run: 'ops.tag.run',

  /**
   * 等盒子。
   */
  llm: 'ops.tag.llm',

  /**
   * 排队。
   */
  wait: 'ops.tag.wait',

  /**
   * 过点太久没开跑。
   */
  lost: 'ops.tag.lost',

  /**
   * 上一轮失败。
   */
  lastFail: 'ops.tag.lastFail',

  /**
   * 成功。
   */
  ok: 'ops.tag.ok',

  /**
   * 失败。
   */
  failed: 'ops.tag.failed',

  /**
   * 投递待投。
   */
  queued: 'ops.tag.queued',

  /**
   * 投递正在发。
   */
  sending: 'ops.tag.sending',

  /**
   * 正在发太久。
   */
  stuck: 'ops.tag.stuck',

  /**
   * 已不在雇主板。
   */
  outPool: 'ops.tag.outPool',

  /**
   * 人工核定过。
   */
  curated: 'ops.tag.curated',
}

/**
 * 时长单位。
 */
export const UNIT = {
  /**
   * 秒。
   */
  sec: 'sec',

  /**
   * 分钟。
   */
  min: 'min',

  /**
   * 小时。
   */
  hour: 'hour',

  /**
   * 天。
   */
  day: 'day',
}

/**
 * 工人的名字。
 */
export const WORKER = {
  /**
   * 还没有官网。
   */
  find: 'ops.worker.find',

  /**
   * 已有官网。
   */
  visit: 'ops.worker.visit',
}

/**
 * 官网抓取阶段与历史状态的显示词。
 */
export const STAGE_TEXT: Record<string, string> = {
  /**
   * 排队中。
   */
  queued: 'ops.stage.queued',

  /**
   * 查找官网。
   */
  find: 'ops.stage.find',

  /**
   * 抓取。
   */
  fetch: 'ops.stage.fetch',

  /**
   * 整理。
   */
  facts: 'ops.stage.facts',

  /**
   * 办完。
   */
  done: 'ops.stage.done',

  /**
   * 办完但什么也没有。
   */
  none: 'ops.stage.none',
}

/**
 * 投递与译名历史状态的显示词。
 */
export const DONE_TEXT: Record<string, string> = {
  /**
   * 已发。
   */
  sent: 'ops.done.sent',

  /**
   * 已回复。
   */
  replied: 'ops.done.replied',

  /**
   * 退信。
   */
  bounced: 'ops.done.bounced',

  /**
   * 拒绝。
   */
  declined: 'ops.done.declined',

  /**
   * 译名完成。
   */
  done: 'ops.done.done',

  /**
   * 译名跳过。
   */
  skip: 'ops.done.skip',
}

/**
 * 调度单元状态:正在跑。
 */
export const UNIT_RUN = 'run'

/**
 * 调度单元状态:等模型。
 */
export const UNIT_LLM = 'llm'

/**
 * 投递状态:待投。
 */
export const APPLY_QUEUED = 'queued'

/**
 * 官网阶段:排队中。
 */
export const STAGE_QUEUED = 'queued'

// =========================================================================
// 5. 阈值与上限
// =========================================================================

/**
 * 总览各领域的文字。
 */
export const REPORT = {
  /**
   * 调度领域名。
   */
  schedule: 'ops.rep.schedule',

  /**
   * 投递领域名。
   */
  apply: 'ops.rep.apply',

  /**
   * 官网抓取领域名。
   */
  sites: 'ops.rep.sites',

  /**
   * 译名翻译领域名。
   */
  alias: 'ops.rep.alias',

  /**
   * 费用领域名。
   */
  fee: 'ops.rep.fee',

  /**
   * 没有约定服务目标(SWEBOK 4.5 要求目标是约定的,不替 Frank 拟)。
   */
  noTarget: 'ops.notAgreed',

  /**
   * 费用目标的前缀(上限 Frank 定)。
   */
  targetFee: 'ops.rep.targetFee',

  /**
   * 单元数与失败数一句(插值 n、f)。
   */
  units: 'ops.rep.units',

  /**
   * 待处理条数一句(插值 n)。
   */
  wait: 'ops.rep.wait',

  /**
   * 待处理条数加最久等待一句的键头,后接时长单位(插值 n、d)。
   */
  waitOld: 'ops.rep.waitOld.',

  /**
   * 今日完成一句(插值 n)。
   */
  doneToday: 'ops.rep.doneToday',

  /**
   * 已用一句(插值 v)。
   */
  used: 'ops.rep.used',

  /**
   * 成功数一句(插值 n)。
   */
  ok: 'ops.rep.ok',
}

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 100

/**
 * 过点这么久没开跑算失联(秒)。
 */
export const LOST_S = 3600

/**
 * 正在发这么久算卡住(秒)。
 */
export const STUCK_S = 1800

/**
 * 一分钟的秒数。
 */
export const MINUTE_S = 60

/**
 * 一小时的秒数。
 */
export const HOUR_S = 3600

/**
 * 一天的秒数。
 */
export const DAY_S = 86400

/**
 * 表格里的成本保留几位小数。
 */
export const USD_DIGITS_TABLE = 4

/**
 * 四格里的成本保留几位小数。
 */
export const USD_DIGITS_CARD = 2

/**
 * 千分位的区域。
 */
export const NUM_LOCALE = 'en-CA'

/**
 * 百分比换算。
 */
export const PCT_BASE = 100

/**
 * 额度的 Console 配置(通知阈值、适用范围),按额度名。库里还没有这两格,额度发放页做时进表。
 */
export const BUDGET_NOTE = {
  /**
   * 2026-11-08 赠金。
   */
  'promo-20261108': { alerts: '$90、$144、$162', scope: 'Agent SDK、API、Batch API、Playground、Managed Agents' },
}

// =========================================================================
// 6. 删除
// =========================================================================

/**
 * 删除种类:待发投递。
 */
export const DEL_APPLY = 'apply'

/**
 * 删除种类:官网抓取。
 */
export const DEL_SITE = 'site'

/**
 * 删除种类:译名翻译。
 */
export const DEL_ALIAS = 'alias'

/**
 * 删除时显示名的分隔。
 */
export const DEL_NAME_SEP = ', '

/**
 * 管理员角色。
 */
export const ROLE_ADMIN = 'admin'

/**
 * 非管理员的错误码。
 */
export const E_ADMIN = 'admin'
