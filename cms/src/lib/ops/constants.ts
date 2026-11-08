/**
 * ops 域的参数:运维页的页面清单、分区标题、列头、条数上限与状态词(2026-11-08 Frank「把管理员队列页重构成运维页」)。
 * 模块、页面、列与四格的出处逐条见对话定稿清单;加一个观察维度 = 这里加一行 + functions 加一段取数,不用新建页面。
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
 * 进 /ops 默认看哪一页。
 */
export const SEC_DEFAULT = SEC_REPORT

/**
 * 全部已上线的页面。
 */
export const SECS: readonly string[] = [SEC_REPORT, SEC_SCHEDULE, SEC_APPLY, SEC_SITES, SEC_ALIAS, SEC_USAGE, SEC_COST, SEC_BUDGET]

/**
 * 每页在 banner 上的页名。
 */
export const SEC_NAME: Record<string, string> = {
  /**
   * 总览。
   */
  report: '服务报告',

  /**
   * 调度。
   */
  schedule: '调度',

  /**
   * 投递待发。
   */
  apply: '投递待发',

  /**
   * 官网抓取。
   */
  sites: '官网抓取',

  /**
   * 译名翻译。
   */
  alias: '译名翻译',

  /**
   * 用量。
   */
  usage: '用量',

  /**
   * 成本。
   */
  cost: '成本',

  /**
   * 额度。
   */
  budget: '额度',
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
  { label: '领域', wrap: false }, { label: '实际', wrap: true }, { label: '目标', wrap: true }, { label: '是否达标', wrap: false },
  { label: '事件和失败', wrap: false }, { label: '用量', wrap: true }, { label: '趋势', wrap: false },
]

/**
 * 调度上表:Azure Data Factory 运行列表的列。
 */
export const UNIT_COLS = [
  { label: '单元', wrap: false }, { label: '状态', wrap: false }, { label: '开始', wrap: false },
  { label: '时长', wrap: false }, { label: '下一轮', wrap: false }, { label: '触发方式', wrap: false },
  { label: '报错', wrap: false },
]

/**
 * 调度下表:同上。
 */
export const RUN_COLS = [
  { label: '单元', wrap: false }, { label: '开始', wrap: false }, { label: '结束', wrap: false },
  { label: '时长', wrap: false }, { label: '状态', wrap: false }, { label: '报错', wrap: false },
  { label: '运行 ID', wrap: false },
]

/**
 * 投递上表:沿用队列页的列。
 */
export const APPLY_COLS = [
  { label: '用户', wrap: true }, { label: '职位', wrap: true }, { label: '公司', wrap: true },
  { label: '状态', wrap: false }, { label: '等了', wrap: false }, { label: '操作', wrap: false },
]

/**
 * 投递下表:上表加完成时间。
 */
export const APPLY_DONE_COLS = [
  { label: '用户', wrap: true }, { label: '职位', wrap: true }, { label: '公司', wrap: true },
  { label: '状态', wrap: false }, { label: '完成', wrap: false },
]

/**
 * 官网抓取上表:沿用队列页的列。
 */
export const SITE_COLS = [
  { label: '公司', wrap: true }, { label: '状态', wrap: false }, { label: '工人', wrap: false },
  { label: '点开', wrap: false }, { label: '等了', wrap: false }, { label: '由头', wrap: true }, { label: '操作', wrap: false },
]

/**
 * 官网抓取下表:上表加完成时间。
 */
export const SITE_DONE_COLS = [
  { label: '公司', wrap: true }, { label: '状态', wrap: false }, { label: '点开', wrap: false },
  { label: '由头', wrap: true }, { label: '完成', wrap: false },
]

/**
 * 译名上表:沿用队列页的列。
 */
export const ALIAS_COLS = [
  { label: '雇主', wrap: true }, { label: '被列出', wrap: false }, { label: '等了', wrap: false }, { label: '操作', wrap: false },
]

/**
 * 译名下表:上表加完成时间。
 */
export const ALIAS_DONE_COLS = [
  { label: '雇主', wrap: true }, { label: '状态', wrap: false }, { label: '被列出', wrap: false }, { label: '完成', wrap: false },
]

/**
 * 用量表:Console Usage 页与 Usage and Cost Analytics API。
 */
export const USAGE_COLS = [
  { label: '功能', wrap: false }, { label: '模型', wrap: false }, { label: '通道', wrap: false }, { label: '输入 token', wrap: false },
  { label: '输出 token', wrap: false }, { label: '缓存读取', wrap: false }, { label: '请求数', wrap: false },
]

/**
 * 成本表:Console Cost 页。
 */
export const COST_COLS = [
  { label: '日期', wrap: false }, { label: '功能', wrap: false }, { label: '模型', wrap: false }, { label: 'token 成本', wrap: false },
  { label: '联网搜索成本', wrap: false }, { label: '请求数', wrap: false }, { label: '合计', wrap: false },
]

/**
 * 额度表:Console Spend limits 与 Promotional credits。
 */
export const BUDGET_COLS = [
  { label: '额度', wrap: false }, { label: '上限', wrap: false }, { label: '已用', wrap: false }, { label: '已用比例', wrap: false },
  { label: '通知阈值', wrap: false }, { label: '适用范围', wrap: true }, { label: '发放日', wrap: false }, { label: '到期', wrap: false },
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
  unitsNow: '各单元现状',

  /**
   * 通用上表。
   */
  running: '正在运行',

  /**
   * 通用下表。
   */
  history: '历史',

  /**
   * 总览表标题。
   */
  reportTitle: '各领域对比目标',

  /**
   * 通用空态。
   */
  empty: '暂无数据',

  /**
   * 用量表标题。
   */
  usageTitle: '最近 30 天',

  /**
   * 生效中的额度。
   */
  budgetLive: '生效中',

  /**
   * 已到期的额度。
   */
  budgetDone: '已到期',

  /**
   * 条数的单位。
   */
  rowsTail: ' 条',

  /**
   * 天的单位。
   */
  daysTail: ' 天',

  /**
   * 百分号。
   */
  pct: '%',

  /**
   * 美元符号。
   */
  usd: '$',

  /**
   * 之前。
   */
  ago: '前',

  /**
   * 之后。
   */
  after: '后',

  /**
   * 超期多久的前缀。
   */
  late: '过点 ',

  /**
   * 节奏的前缀。
   */
  every: '每 ',
}

/**
 * 四格标题。
 */
export const CARD = {
  /**
   * 服务报告:达标的领域。
   */
  met: '达标',

  /**
   * 服务报告:未达标的领域。
   */
  missed: '未达标',

  /**
   * 服务报告:事件和失败。
   */
  incidents: '事件和失败',

  /**
   * 服务报告:Claude 已用。
   */
  claudeUsed: 'Claude 已用',

  /**
   * ADF 状态 In Progress。
   */
  running: '运行中',

  /**
   * ADF 状态 Queued。
   */
  queued: '排队',

  /**
   * ADF 状态 Failed。
   */
  failed: '失败',

  /**
   * ADF 状态 Succeeded。
   */
  succeeded: '成功',

  /**
   * SQS Visible。
   */
  waiting: '待处理',

  /**
   * SQS NotVisible。
   */
  working: '处理中',

  /**
   * SQS Deleted。
   */
  doneToday: '今日完成',

  /**
   * SQS AgeOfOldestMessage。
   */
  oldest: '最久等待',

  /**
   * Console Total tokens in。
   */
  tokensIn: '输入 token',

  /**
   * Console Total tokens out。
   */
  tokensOut: '输出 token',

  /**
   * API requests。
   */
  requests: '请求数',

  /**
   * API cache_read_input_tokens。
   */
  cacheRead: '缓存读取',

  /**
   * Console Total cost。
   */
  totalCost: '总成本',

  /**
   * Console Total token cost。
   */
  tokenCost: 'token 成本',

  /**
   * Console Total web search cost。
   */
  webCost: '联网搜索成本',

  /**
   * Console Daily token cost。
   */
  todayCost: '今日 token 成本',

  /**
   * Console spent。
   */
  used: '已用',

  /**
   * Console % used。
   */
  usedPct: '已用比例',

  /**
   * Console Remaining balance。
   */
  remaining: '剩余',

  /**
   * Console Expires on。
   */
  daysLeft: '距到期',
}

/**
 * 状态胶囊的文字。
 */
export const TAG = {
  /**
   * 达标。
   */
  met: '达标',

  /**
   * 未达标。
   */
  missed: '未达标',

  /**
   * 没有约定目标,不判达标。
   */
  noTarget: '未约定',

  /**
   * 运行中。
   */
  run: '运行中',

  /**
   * 等盒子。
   */
  llm: '等模型',

  /**
   * 排队。
   */
  wait: '排队',

  /**
   * 过点太久没开跑。
   */
  lost: '失联',

  /**
   * 上一轮失败。
   */
  lastFail: '上轮失败',

  /**
   * 成功。
   */
  ok: '成功',

  /**
   * 失败。
   */
  failed: '失败',

  /**
   * 投递待投。
   */
  queued: '待投',

  /**
   * 投递正在发。
   */
  sending: '正在发',

  /**
   * 正在发太久。
   */
  stuck: '卡住',

  /**
   * 已不在雇主板。
   */
  outPool: '已不在雇主板',

  /**
   * 人工核定过。
   */
  curated: '已核定不取',
}

/**
 * 时长单位。
 */
export const UNIT = {
  /**
   * 秒。
   */
  sec: ' 秒',

  /**
   * 分钟。
   */
  min: ' 分钟',

  /**
   * 小时。
   */
  hour: ' 小时',

  /**
   * 天。
   */
  day: ' 天',
}

/**
 * 工人的名字。
 */
export const WORKER = {
  /**
   * 还没有官网。
   */
  find: '找官网',

  /**
   * 已有官网。
   */
  visit: '抓官网',
}

/**
 * 官网抓取阶段与历史状态的显示词。
 */
export const STAGE_TEXT: Record<string, string> = {
  /**
   * 排队中。
   */
  queued: '排队中',

  /**
   * 查找官网。
   */
  find: '查找官网',

  /**
   * 抓取。
   */
  fetch: '抓取',

  /**
   * 整理。
   */
  facts: '整理',

  /**
   * 办完。
   */
  done: '完成',

  /**
   * 办完但什么也没有。
   */
  none: '未找到',
}

/**
 * 投递与译名历史状态的显示词。
 */
export const DONE_TEXT: Record<string, string> = {
  /**
   * 已发。
   */
  sent: '已发出',

  /**
   * 已回复。
   */
  replied: '已回复',

  /**
   * 退信。
   */
  bounced: '退信',

  /**
   * 拒绝。
   */
  declined: '已拒绝',

  /**
   * 译名完成。
   */
  done: '完成',

  /**
   * 译名跳过。
   */
  skip: '跳过',
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
  schedule: '调度',

  /**
   * 投递领域名。
   */
  apply: '投递',

  /**
   * 官网抓取领域名。
   */
  sites: '官网抓取',

  /**
   * 译名翻译领域名。
   */
  alias: '译名翻译',

  /**
   * 费用领域名。
   */
  fee: '费用',

  /**
   * 没有约定服务目标(SWEBOK 4.5 要求目标是约定的,不替 Frank 拟)。
   */
  noTarget: '未约定',

  /**
   * 费用目标的前缀(上限 Frank 定)。
   */
  targetFee: '不超过 ',

  /**
   * 单元数的单位。
   */
  unitsTail: ' 个单元,',

  /**
   * 失败数的单位。
   */
  failedTail: ' 个失败',

  /**
   * 待处理的前缀。
   */
  waiting: '待处理 ',

  /**
   * 待处理的单位。
   */
  waitingTail: ' 条',

  /**
   * 最久等待的连接。
   */
  oldest: ',最久 ',

  /**
   * 今日完成的前缀。
   */
  doneToday: '今日完成 ',

  /**
   * 已用的前缀。
   */
  used: '已用 ',

  /**
   * 成功的单位。
   */
  okTail: ' 个成功',
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
 * 认得的删除种类。
 */
export const DEL_KINDS: readonly string[] = [DEL_APPLY, DEL_SITE, DEL_ALIAS]

/**
 * 删除键的长度上限。
 */
export const DEL_KEY_LEN_MAX = 300

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
