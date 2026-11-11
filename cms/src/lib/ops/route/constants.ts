/**
 * ops 桶的子桶 route 的常量:功能通道、通道实测与访问登记。
 * 列与四格的出处:功能通道 Frank 第 2 条要求,通道实测 Claude 文档成功标准,Workspace 和 Key 取自 Console。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */

/**
 * 单元格种类。
 */
export const CELL = {
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
   * 灰:停用。
   */
  gray: 'gray',

  /**
   * 绿:启用。
   */
  ok: 'ok',
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
 * 条数的单位。
 */
export const ROWS_KEY = 'ops.rows'

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 100

/**
 * 毫秒的单位。
 */
export const MS_KEY = 'ops.ms'

/**
 * 通道代码:Claude。
 */
export const CH_ANTHROPIC = 'anthropic'

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
 * 表头标题。
 */
export const TITLE = {
  /**
   * 功能通道表。
   */
  routes: 'ops.tt.routes',

  /**
   * 实测上表。
   */
  evalRun: 'ops.tt.running',

  /**
   * 实测下表。
   */
  evalDone: 'ops.tt.history',

  /**
   * Key 表。
   */
  keys: 'ops.tt.keys',
}

/**
 * 四格标题。
 */
export const CARD = {
  /**
   * 功能总数。
   */
  features: 'ops.card.features',

  /**
   * 有备用。
   */
  backup: 'ops.card.backup',

  /**
   * 无备用。
   */
  noBackup: 'ops.card.noBackup',

  /**
   * 今日降级。
   */
  degraded: 'ops.card.degraded',

  /**
   * 已测功能。
   */
  tested: 'ops.card.tested',

  /**
   * 未测功能。
   */
  untested: 'ops.card.untested',

  /**
   * 样本数。
   */
  samples: 'ops.card.samples',

  /**
   * 实测花费。
   */
  spent: 'ops.card.spent',

  /**
   * Workspace 数。
   */
  workspaces: 'ops.card.workspaces',

  /**
   * 启用。
   */
  active: 'ops.card.active',

  /**
   * 停用。
   */
  disabled: 'ops.card.disabled',

  /**
   * 30 天内到期。
   */
  expiring: 'ops.card.expiring',
}

/**
 * 功能通道:现役功能。env 非空表示主通道由这个环境变量决定。
 */
export const ROUTES = [
  { feature: 'apply.letter', name: 'AI 写求职信', env: 'APPLY_LETTER_PROVIDER', main: 'friend' },
  { feature: 'resume.match', name: '简历对照职位', env: '', main: 'friend' },
  { feature: 'resume.extract', name: '简历解析', env: 'LLM_PROVIDER', main: 'ollama' },
]

/**
 * 通往降级的备用通道:只有 Claude 有(额度闸降级到朋友网关)。
 */
export const BACKUP_TEXT = '朋友网关'

/**
 * 都不通时的现状:Claude 通道先降级再报错。
 */
export const GIVE_UP_DEGRADE = 'ops.giveUp.degrade'

/**
 * 都不通时的现状:其余通道直接报错。
 */
export const GIVE_UP_ERROR = 'ops.giveUp.error'

/**
 * 实测状态:进行中。
 */
export const EVAL_RUNNING = 'running'

/**
 * Workspace 列表,2026-11-08 取自 Console(个人账号用不了 Admin API,手工登记)。
 */
export const WORKSPACES: readonly string[] = ['Default', 'offer2pr']

/**
 * Key 状态:启用。
 */
export const KEY_ACTIVE = 'ops.key.active'

/**
 * Key 状态:停用。
 */
export const KEY_DISABLED = 'ops.key.disabled'

/**
 * Key 列表,2026-11-08 取自 Console。只登记名字和末四位,密钥本身不入库、不输出。
 */
export const API_KEYS = [
  { name: 'offer2pr-prod', last4: 'rwAA', workspace: 'offer2pr', account: 'Frank', active: true, created: '2026-11-08' },
  { name: 'pnp-prod', last4: 'dQAA', workspace: 'Default', account: '未关联(旧版 Key)', active: false, created: '2026-07-03' },
  { name: 'solace', last4: '1wAA', workspace: 'Default', account: '未关联(旧版 Key)', active: false, created: '2025-09-06' },
  { name: 'Frank-key', last4: '6gAA', workspace: 'Default', account: '未关联(旧版 Key)', active: false, created: '2025-09-05' },
]

/**
 * 功能通道表。
 */
export const ROUTE_COLS = [
  { label: 'ops.col.feature', wrap: false }, { label: 'ops.col.mainCh', wrap: false }, { label: 'ops.col.model', wrap: false }, { label: 'ops.col.backupCh', wrap: false },
  { label: 'ops.col.giveUp', wrap: false },
]

/**
 * 通道实测上表:正在跑的批次。
 */
export const EVAL_RUN_COLS = [
  { label: 'ops.col.feature', wrap: false }, { label: 'ops.col.model', wrap: false }, { label: 'ops.col.samples', wrap: false }, { label: 'ops.col.start', wrap: false },
]

/**
 * 通道实测下表。
 */
export const EVAL_COLS = [
  { label: 'ops.col.feature', wrap: false }, { label: 'ops.col.model', wrap: false }, { label: 'ops.col.accuracy', wrap: false }, { label: 'ops.col.consistency', wrap: false },
  { label: 'ops.col.tone', wrap: false }, { label: 'ops.col.privacy', wrap: false }, { label: 'ops.col.latency', wrap: false }, { label: 'ops.col.price', wrap: false },
  { label: 'ops.col.method', wrap: false }, { label: 'ops.col.samples', wrap: false },
]

/**
 * Workspace 和 Key 表。
 */
export const KEY_COLS = [
  { label: 'ops.col.key', wrap: false }, { label: 'ops.col.workspace', wrap: false }, { label: 'ops.col.account', wrap: false }, { label: 'ops.col.status', wrap: false },
  { label: 'ops.col.expires', wrap: false }, { label: 'ops.col.created', wrap: false }, { label: 'ops.col.cost', wrap: false },
]

/**
 * 一分数的显示位数。
 */
export const SCORE_DIGITS = 2

/**
 * 表格里的成本保留几位小数。
 */
export const USD_DIGITS = 4
