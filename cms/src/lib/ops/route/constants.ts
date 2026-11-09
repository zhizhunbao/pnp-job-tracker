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
export const ROWS_TAIL = ' 条'

/**
 * 表的条数上限。
 */
export const ROWS_MAX = 100

/**
 * 毫秒的单位。
 */
export const MS_TAIL = ' 毫秒'

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
  routes: '各功能',

  /**
   * 实测上表。
   */
  evalRun: '正在运行',

  /**
   * 实测下表。
   */
  evalDone: '历史',

  /**
   * Key 表。
   */
  keys: '全部 Key',
}

/**
 * 四格标题。
 */
export const CARD = {
  /**
   * 功能总数。
   */
  features: '功能总数',

  /**
   * 有备用。
   */
  backup: '有备用',

  /**
   * 无备用。
   */
  noBackup: '无备用',

  /**
   * 今日降级。
   */
  degraded: '今日降级',

  /**
   * 已测功能。
   */
  tested: '已测功能',

  /**
   * 未测功能。
   */
  untested: '未测功能',

  /**
   * 样本数。
   */
  samples: '样本数',

  /**
   * 实测花费。
   */
  spent: '实测花费',

  /**
   * Workspace 数。
   */
  workspaces: 'Workspace 数',

  /**
   * 启用。
   */
  active: '启用',

  /**
   * 停用。
   */
  disabled: '停用',

  /**
   * 30 天内到期。
   */
  expiring: '30 天内到期',
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
export const GIVE_UP_DEGRADE = '降级后仍不通则报错'

/**
 * 都不通时的现状:其余通道直接报错。
 */
export const GIVE_UP_ERROR = '报错'

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
export const KEY_ACTIVE = '启用'

/**
 * Key 状态:停用。
 */
export const KEY_DISABLED = '停用'

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
  { label: '功能', wrap: false }, { label: '主通道', wrap: false }, { label: '模型', wrap: false }, { label: '备用通道', wrap: false },
  { label: '都不通时', wrap: false },
]

/**
 * 通道实测上表:正在跑的批次。
 */
export const EVAL_RUN_COLS = [
  { label: '功能', wrap: false }, { label: '模型', wrap: false }, { label: '样本数', wrap: false }, { label: '开始', wrap: false },
]

/**
 * 通道实测下表。
 */
export const EVAL_COLS = [
  { label: '功能', wrap: false }, { label: '模型', wrap: false }, { label: '任务准确度', wrap: false }, { label: '一致性', wrap: false },
  { label: '语气', wrap: false }, { label: '隐私', wrap: false }, { label: '延迟', wrap: false }, { label: '价格', wrap: false },
  { label: '评分方式', wrap: false }, { label: '样本数', wrap: false },
]

/**
 * Workspace 和 Key 表。
 */
export const KEY_COLS = [
  { label: 'Key', wrap: false }, { label: 'Workspace', wrap: false }, { label: '关联账号', wrap: false }, { label: '状态', wrap: false },
  { label: '到期', wrap: false }, { label: '创建', wrap: false }, { label: '成本', wrap: false },
]

/**
 * 一分数的显示位数。
 */
export const SCORE_DIGITS = 2

/**
 * 表格里的成本保留几位小数。
 */
export const USD_DIGITS = 4
