/**
 * ops 桶的子桶 watch 的常量:报警规则、数据新鲜度、AI 通道与访问登记。
 * 列与四格的出处:事件 SWEBOK 4.1 与 Azure Monitor alerts,报警规则 Azure alerts,数据新鲜度 dbt freshness,
 * 通道状态 Google SRE 四个黄金信号,通道实测 Claude 文档成功标准,Workspace 和 Key 取自 Console。
 * 功能通道、通道实测、Key 在子桶 route。阈值只用已有来源(Console 通知线、Frank 的保鲜标准、老队列页的判据),没有来源的显示「未约定」。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */

// =========================================================================
// 1. 单元格
// =========================================================================

/**
 * 单元格种类。
 */
export const CELL = {
  /**
   * 主名加灰字。
   */
  named: 'named',

  /**
   * 复制报错。
   */
  copy: 'copy',

  /**
   * 事件操作钮。
   */
  act: 'act',
} as const

/**
 * 胶囊变体。
 */
export const VAR = {
  /**
   * 灰:等待或停用。
   */
  gray: 'gray',

  /**
   * 蓝:进行中。
   */
  info: 'info',

  /**
   * 绿:正常。
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
 * 没有值时显示的横线。
 */
export const DASH = '—'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 没有来源的值:不替 Frank 拟。
 */
export const NOT_AGREED = 'ops.notAgreed'

/**
 * 条数的单位。
 */
export const ROWS_KEY = 'ops.rows'

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 100

// =========================================================================
// 2. 报警规则
// =========================================================================

/**
 * 通知方式(Azure alerts 的 Action group,这里只有邮件)。
 */
export const NOTIFY_MAIL = 'ops.notify.mail'

/**
 * 规则:Claude 被降级。
 */
export const R_DEGRADED = 'claude.degraded'

/**
 * 规则:调度单元上轮失败。
 */
export const R_UNIT_FAILED = 'schedule.failed'

/**
 * 规则:调度单元失联。
 */
export const R_UNIT_LOST = 'schedule.lost'

/**
 * 规则:投递卡住。
 */
export const R_APPLY_STUCK = 'apply.stuck'

/**
 * 规则:数据超过警告线。
 */
export const R_FRESH = 'fresh.warn'

/**
 * 通道规则的前缀(后接通道代码)。
 */
export const R_CHANNEL = 'channel.'

/**
 * 规则界面文字的键头(后接规则号与 RULE_PART 的一格,文字住 lib/i18n)。
 */
export const RULE_KEY = 'ops.rule.'

/**
 * 规则界面文字的键尾:哪一格。
 */
export const RULE_PART = {
  /**
   * 规则名。
   */
  name: '.name',

  /**
   * 监控对象。
   */
  target: '.target',

  /**
   * 信号。
   */
  signal: '.signal',

  /**
   * 条件。
   */
  cond: '.cond',

  /**
   * 业务影响。
   */
  impact: '.impact',
}

/**
 * 额度通知线,与 Console 设的三档邮件同值。
 */
export const BUDGET_LINES = [
  { rule: 'budget.90', usd: 90 },
  { rule: 'budget.144', usd: 144 },
  { rule: 'budget.162', usd: 162 },
]

/**
 * 全部规则。条件都是事实判据;严重级别没有来源,显示「未约定」。
 */
export const RULES = [
  { id: 'budget.90', name: 'Claude 额度到 $90', target: 'Claude 额度', signal: '已用金额', condition: '已用不低于 $90', impact: '赠金额度已用一半' },
  { id: 'budget.144', name: 'Claude 额度到 $144', target: 'Claude 额度', signal: '已用金额', condition: '已用不低于 $144', impact: '赠金额度已用八成' },
  { id: 'budget.162', name: 'Claude 额度到 $162', target: 'Claude 额度', signal: '已用金额', condition: '已用不低于 $162', impact: '赠金额度已用九成' },
  { id: R_DEGRADED, name: 'Claude 被降级', target: 'Claude 通道', signal: '账本降级记录', condition: '上一轮以来出现降级', impact: '回答改由 qwen 生成' },
  { id: 'channel.anthropic', name: 'Claude 不可用', target: 'Claude 通道', signal: '探活', condition: '最近一次探活失败', impact: '走 Claude 的功能降级到 qwen' },
  { id: 'channel.friend', name: '朋友网关不可用', target: '朋友网关', signal: '探活', condition: '最近一次探活失败', impact: '求职信和简历对照失败' },
  { id: 'channel.ollama', name: 'Ollama 不可用', target: '局域网 Ollama', signal: '探活', condition: '最近一次探活失败', impact: '翻译和整理任务暂停' },
  { id: R_UNIT_FAILED, name: '调度单元失败', target: '调度', signal: '单元上轮结果', condition: '有单元上轮失败', impact: '对应数据没有更新' },
  { id: R_UNIT_LOST, name: '调度单元失联', target: '调度', signal: '下一轮时刻', condition: '过点超过 1 小时没开跑', impact: '对应数据没有更新' },
  { id: R_APPLY_STUCK, name: '投递卡住', target: '投递待发', signal: '正在发的时长', condition: '正在发超过 30 分钟', impact: '用户的投递没有发出' },
  { id: R_FRESH, name: '数据超过警告线', target: '数据新鲜度', signal: '最新数据时间', condition: '超过警告线', impact: '页面显示的数据偏旧' },
]

/**
 * 过点这么久没开跑算失联(秒;老队列页的判据)。
 */
export const LOST_S = 3600

/**
 * 正在发这么久算卡住(秒;老队列页的判据)。
 */
export const STUCK_S = 1800

/**
 * 判定一轮的间隔(秒),与 etl/opswatch 的 interval 同值。
 */
export const TICK_S = 300

/**
 * 单元状态:等下一轮。
 */
export const UNIT_WAIT = 'wait'

/**
 * 投递状态:正在发。
 */
export const APPLY_SENDING = 'sending'

/**
 * 条件里单元名的连接。
 */
export const NAME_SEP = ', '

/**
 * 条件里单元名最多列几个。
 */
export const NAMES_MAX = 10

/**
 * 条件的连接(后接明细)。
 */
export const COND_SEP = ':'

/**
 * 邮件标题前缀。
 */
export const MAIL_SUBJECT = '[运维报警] '

/**
 * 邮件正文模板。
 */
export const MAIL_HTML = '<p>{cond}</p><p><a href="https://offer2pr.com/ops/incidents">查看事件</a></p>'

/**
 * 邮件正文里条件的占位。
 */
export const MAIL_COND = '{cond}'

/**
 * HTML 转义:和号。
 */
export const ESC_AMP_RE = /&/g

/**
 * 和号的实体。
 */
export const ESC_AMP = '&amp;'

/**
 * HTML 转义:小于号。
 */
export const ESC_LT_RE = /</g

/**
 * 小于号的实体。
 */
export const ESC_LT = '&lt;'

/**
 * HTML 转义:大于号。
 */
export const ESC_GT_RE = />/g

/**
 * 大于号的实体。
 */
export const ESC_GT = '&gt;'

/**
 * 用户响应:新建(Azure New)。
 */
export const US_NEW = 'new'

/**
 * 用户响应:已确认(Azure Acknowledged)。
 */
export const US_ACK = 'ack'

/**
 * 用户响应:已关闭(Azure Closed)。
 */
export const US_CLOSED = 'closed'

/**
 * 认得的用户响应。
 */
export const USER_STATES: readonly string[] = [US_NEW, US_ACK, US_CLOSED]

/**
 * 用户响应的显示词。
 */
export const US_TEXT: Record<string, string> = {
  /**
   * Azure New。
   */
  new: 'ops.us.new',

  /**
   * Azure Acknowledged。
   */
  ack: 'ops.us.ack',

  /**
   * Azure Closed。
   */
  closed: 'ops.us.closed',
}

/**
 * 操作钮文字:确认。
 */
export const ACT_ACK = 'ops.act.ack'

/**
 * 操作钮文字:关闭。
 */
export const ACT_CLOSE = 'ops.act.close'

/**
 * 监视状态:触发中(Azure fired)。
 */
export const TAG_FIRED = 'ops.tag.fired'

/**
 * 监视状态:已恢复(Azure resolved)。
 */
export const TAG_RESOLVED = 'ops.tag.resolved'

// =========================================================================
// 3. 数据新鲜度
// =========================================================================

/**
 * 职位数据集:Frank 2026-09-26「职位小时更新」。
 */
export const FRESH_JOB_UNITS: readonly string[] = ['ats', 'careerbeacon', 'gcjobs', 'jobbank', 'jobboom', 'jobillico']

/**
 * 不产数据集的工人与运维单元。
 */
export const FRESH_SKIP_UNITS: readonly string[] = [
  'backup', 'build', 'citations', 'explore', 'findsite', 'indexing', 'jdformat', 'opswatch', 'visit',
]

/**
 * 职位的更新标准(秒)。
 */
export const FRESH_JOB_S = 3600

/**
 * 其余数据的更新标准(秒):Frank 2026-09-26「其他最次也是日更」。
 */
export const FRESH_DAY_S = 86400

/**
 * 标准之外的余量(秒),用失联判据,免得整点前后来回跳。
 */
export const FRESH_MARGIN_S = 3600

/**
 * 状态:正常。
 */
export const FRESH_OK = 'ops.fresh.ok'

/**
 * 状态:警告。
 */
export const FRESH_WARN = 'ops.fresh.warn'

// =========================================================================
// 4. AI 通道与访问
// =========================================================================

/**
 * 三个通道的代码。
 */
export const CHANNELS: readonly string[] = ['anthropic', 'friend', 'ollama']

/**
 * 通道代码:Claude。
 */
export const CH_ANTHROPIC = 'anthropic'

/**
 * 通道代码:朋友网关。
 */
export const CH_FRIEND = 'friend'

/**
 * 通道代码:Ollama。
 */
export const CH_OLLAMA = 'ollama'

/**
 * 通道名。
 */
export const CHANNEL_NAME: Record<string, string> = {
  /**
   * Claude API。
   */
  anthropic: 'Claude',

  /**
   * 朋友的 ngrok 网关。
   */
  friend: '朋友网关',

  /**
   * 局域网 Ollama。
   */
  ollama: 'Ollama',
}

/**
 * 探活报错最长几个字。
 */
export const PROBE_ERROR_MAX = 200

// =========================================================================
// 5. 列头
// =========================================================================

/**
 * 事件上表。
 */
export const INCIDENT_COLS = [
  { label: 'ops.col.incident', wrap: false }, { label: 'ops.col.priority', wrap: false }, { label: 'ops.col.impact', wrap: true }, { label: 'ops.col.userState', wrap: false },
  { label: 'ops.col.cond', wrap: true }, { label: 'ops.col.fired', wrap: false }, { label: 'ops.col.resolved', wrap: false }, { label: 'ops.col.action', wrap: false },
]

/**
 * 事件下表:再加根因和对策。
 */
export const INCIDENT_DONE_COLS = [
  { label: 'ops.col.incident', wrap: false }, { label: 'ops.col.priority', wrap: false }, { label: 'ops.col.impact', wrap: true }, { label: 'ops.col.userState', wrap: false },
  { label: 'ops.col.cond', wrap: true }, { label: 'ops.col.fired', wrap: false }, { label: 'ops.col.resolved', wrap: false }, { label: 'ops.col.cause', wrap: true },
  { label: 'ops.col.remedy', wrap: true },
]

/**
 * 报警规则上表。
 */
export const RULE_COLS = [
  { label: 'ops.col.ruleName', wrap: false }, { label: 'ops.col.severity', wrap: false }, { label: 'ops.col.monitored', wrap: false }, { label: 'ops.col.signal', wrap: false },
  { label: 'ops.col.cond', wrap: true }, { label: 'ops.col.notify', wrap: false },
]

/**
 * 报警规则下表:最近 30 天的触发。
 */
export const FIRE_COLS = [
  { label: 'ops.col.rule', wrap: false }, { label: 'ops.col.cond', wrap: true }, { label: 'ops.col.userState', wrap: false }, { label: 'ops.col.time', wrap: false },
]

/**
 * 数据新鲜度表。
 */
export const FRESH_COLS = [
  { label: 'ops.col.dataset', wrap: false }, { label: 'ops.col.lastData', wrap: false }, { label: 'ops.col.warnLine', wrap: false },
  { label: 'ops.col.errorLine', wrap: false }, { label: 'ops.col.status', wrap: false },
]

/**
 * 通道状态上表:四个黄金信号。
 */
export const CHANNEL_COLS = [
  { label: 'ops.col.channel', wrap: false }, { label: 'ops.col.availability', wrap: false }, { label: 'ops.col.latency', wrap: false }, { label: 'ops.col.traffic', wrap: false },
  { label: 'ops.col.errorRate', wrap: false }, { label: 'ops.col.saturation', wrap: false },
]

/**
 * 通道状态下表:不可用记录。
 */
export const OUTAGE_COLS = [
  { label: 'ops.col.channel', wrap: false }, { label: 'ops.col.start', wrap: false }, { label: 'ops.col.end', wrap: false }, { label: 'ops.col.cond', wrap: true },
]

// =========================================================================
// 6. 文字
// =========================================================================

/**
 * 表头标题。
 */
export const TITLE = {
  /**
   * 事件上表。
   */
  open: 'ops.tt.open',

  /**
   * 事件下表。
   */
  closed: 'ops.tt.closed',

  /**
   * 规则上表。
   */
  rules: 'ops.tt.rules',

  /**
   * 规则下表。
   */
  fires: 'ops.tt.fires',

  /**
   * 新鲜度表。
   */
  fresh: 'ops.tt.fresh',

  /**
   * 通道上表。
   */
  channels: 'ops.tt.last24',

  /**
   * 通道下表。
   */
  outages: 'ops.tt.outages',
}

/**
 * 四格标题。
 */
export const CARD = {
  /**
   * Azure New。
   */
  fresh: 'ops.card.fresh',

  /**
   * Azure Acknowledged。
   */
  ack: 'ops.card.ack',

  /**
   * Azure fired。
   */
  fired: 'ops.card.fired',

  /**
   * Azure resolved。
   */
  resolved: 'ops.card.resolved',

  /**
   * 规则总数。
   */
  rules: 'ops.card.rules',

  /**
   * 未确认。
   */
  unacked: 'ops.card.unacked',

  /**
   * 数据集总数。
   */
  sets: 'ops.card.sets',

  /**
   * 正常。
   */
  ok: 'ops.card.ok',

  /**
   * 警告。
   */
  warn: 'ops.card.warn',

  /**
   * 错误。
   */
  error: 'ops.card.error',

  /**
   * 黄金信号:延迟。
   */
  latency: 'ops.card.latency',

  /**
   * 黄金信号:流量。
   */
  traffic: 'ops.card.traffic',

  /**
   * 黄金信号:错误率。
   */
  errors: 'ops.card.errors',

  /**
   * 黄金信号:饱和度。
   */
  saturation: 'ops.card.saturation',
}

/**
 * 毫秒的单位。
 */
export const MS_KEY = 'ops.ms'

/**
 * 百分号。
 */
export const PCT = '%'

/**
 * 百分比换算。
 */
export const PCT_BASE = 100

/**
 * 百分比保留几位小数。
 */
export const PCT_DIGITS = 1

/**
 * 警告线的后缀。
 */
export const LINE_HOURS_KEY = 'ops.dur.hour'

/**
 * 一小时的秒数。
 */
export const HOUR_S = 3600
