/**
 * 站内向导的死值:目的地目录、模型预算、边界上限、字面量。
 * 设计稿 docs/design/顾问改向导-20260904.md;2026-09-05 批二立域,替换 lib/consult。
 * 🔵 留痕不在这儿:日志字面量在 `lib/log`(GUIDE_LOG);SQL 文本在 `lib/db/sql` §29。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

// =========================================================================
// 1. 目的地目录(向导能带去的页;加一页 = 加一行,模型只许从这里选)
// =========================================================================

/**
 * 目的地键 → 路由。键给模型看,值是站内路径;PTE 与榜单的子路径由 `DEST_SUB` 定。
 */
export const DEST_ROUTE: Record<string, string> = {
  /**
   * 职位板:全加拿大在招岗,按省 / 职业 / 关键词筛。
   */
  jobs: '/jobs',

  /**
   * 职业目录:紧缺清单与各职业在招量。
   */
  occupations: '/occupations',

  /**
   * 在招雇主榜:有担保信号的雇主。
   */
  employers_hiring: '/employers/hiring',

  /**
   * 指定雇主:AIP / RCIP / FCIP 试点名单。
   */
  employers_designated: '/employers/designated',

  /**
   * 雇主对比。
   */
  employers_compare: '/employers/compare',

  /**
   * 把脉页:职业 / 雇主 / LMIA / 省份 / 城市 / 趋势六段。
   */
  pulse: '/start',

  /**
   * PR 决策页:答题出路径。
   */
  plan_pr: '/plan/pr',

  /**
   * PTE 刷题:按题型的机经题单。
   */
  pte: '/pte',

  /**
   * 官方新闻。
   */
  news: '/news',

  /**
   * 案例库。
   */
  cases: '/cases',

  /**
   * 榜单(每日总榜)。
   */
  rankings: '/rankings',

  /**
   * 时间线。
   */
  timeline: '/timeline',

  /**
   * 资料库。
   */
  resources: '/resources',

  /**
   * 定价。
   */
  pricing: '/pricing',

  /**
   * 账户页(档案、收藏、订阅)。
   */
  account: '/account',
}

/**
 * 目的地能带的查询参数:槽位名 → 该页 URL 上的参数名。没列的槽位到了这页就丢弃。
 * 职位板收两位省码或全名(components/jobs `URL_TO_FILTER`),雇主榜收两位省码。
 */
export const DEST_URL_KEYS: Record<string, Record<string, string>> = {
  /**
   * 职位板:职业码、省、关键词。
   */
  jobs: { noc: 'noc', prov: 'prov', q: 'q' },

  /**
   * 在招雇主榜:省、城市、职业码、关键词。
   */
  employers_hiring: { prov: 'prov', city: 'city', noc: 'noc', q: 'q' },

  /**
   * 指定雇主:省。
   */
  employers_designated: { prov: 'prov' },

  /**
   * 把脉页:省。
   */
  pulse: { prov: 'prov' },
}

/**
 * 带子路径的目的地:键 → 合法子路径清单。模型给的 `sub` 不在清单里就落默认(清单第一项)。
 * PTE 十九型照 mart `pte_types` 的 code 小写;榜单只给每日总榜(其余榜名归榜单域,向导不替它列)。
 */
export const DEST_SUB: Record<string, string[]> = {
  /**
   * PTE 题型 slug(/pte/[type])。
   */
  pte: ['ra', 'rs', 'di', 'rts', 'asq', 'swt', 'email', 'rwfib', 'rmcm', 'rop', 'rfib', 'rmcs', 'sst', 'lmcm', 'lfib', 'lmcs', 'smw', 'hiw', 'wfd'],

  /**
   * 榜单 slug(/rankings/[slug])。
   */
  rankings: ['daily-top'],
}

// =========================================================================
// 2. 类别与模型预算
// =========================================================================

/**
 * 四类:带路 / 问题 / 建议 / 闲聊(打招呼、问「你能干什么」—— 不记成问题,但也留一行看频次)。
 */
export const KIND = {
  /**
   * 站上有这一页,带过去。
   */
  nav: 'nav',

  /**
   * 站上没有,记下。
   */
  question: 'question',

  /**
   * 想要站上加什么,记下。
   */
  suggestion: 'suggestion',

  /**
   * 打招呼、问向导能干什么。
   */
  chat: 'chat',
} as const

/**
 * 合法类别清单(校验模型输出用)。
 */
export const KINDS = ['nav', 'question', 'suggestion', 'chat']

/**
 * 模型只出一个小 JSON,300 够;多给只是多花钱。
 */
export const MAX_TOKENS = 300

/**
 * 分类要确定性,温度压到 0(只有 friend 通道认这个参数)。
 */
export const TEMPERATURE = 0

// =========================================================================
// 3. 边界上限(请求体、留痕、线程)
// =========================================================================

/**
 * 提问正文上限(前端 1200 已截,这里兜底)。
 */
export const TEXT_MAX = 1200

/**
 * 提问留痕截断(与 asks.question 列注释一致)。
 */
export const Q_CAP = 2000

/**
 * 多轮上下文只带最近这么多轮(前端传,不落库)。
 */
export const HISTORY_MAX = 6

/**
 * history 每轮内容截断。
 */
export const TURN_CAP = 600

/**
 * 提问时所在页路径留痕截断。
 */
export const PATH_CAP = 300

/**
 * 向导那一句的截断(模型偶发长篇)。
 */
export const SAY_CAP = 400

/**
 * 模型填的职业 / 城市 / 关键词单格截断。
 */
export const SLOT_CAP = 80

/**
 * 同一串追问的 id = 首轮提问前这么多字的哈希。
 */
export const THREAD_SEED = 200

/**
 * 线程 id 取哈希前这么多位。
 */
export const THREAD_ID_LEN = 16

/**
 * 哈希算法。
 */
export const HASH_SHA256 = 'sha256'

/**
 * 哈希输出编码。
 */
export const HASH_HEX = 'hex'

/**
 * 模型原文进日志的截断。
 */
export const RAW_LOG_CAP = 200

/**
 * 错误消息进日志的截断。
 */
export const ERR_LOG_CAP = 200

/**
 * 邮箱上限。
 */
export const EMAIL_MAX = 200

/**
 * 邮箱形状(只求像,不求 RFC 全对:这是用户自愿留的联系方式,错了他收不到而已)。
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 两位省码形状(白名单在 lib/location,这里只拦形状)。
 */
export const PROV_RE = /^[A-Z]{2}$/

/**
 * asks.id 形状(正整数)。
 */
export const ID_RE = /^[1-9]\d{0,9}$/

/**
 * 语种清单。
 */
export const LANGS = ['zh', 'en', 'ko']

/**
 * lang 认不出时的回落。
 */
export const LANG_FALLBACK = 'en' as const

/**
 * 回复语种名(给模型看的英文名)。
 */
export const LANG_NAME: Record<string, string> = {
  /**
   * 中文。
   */
  zh: 'Chinese (Simplified)',

  /**
   * 英文。
   */
  en: 'English',

  /**
   * 韩文。
   */
  ko: 'Korean',
}

/**
 * Pro 个人日帽的限额键前缀(键 = 前缀 + 用户 id)。
 */
export const PRO_LIMIT_PREFIX = 'guide:pro:'

// =========================================================================
// 4. 字面量(functions.ts 里不许有裸字符串)
// =========================================================================

/**
 * 错误码:限流(402 也当限流)。
 */
export const E_LIMIT = 'limit'

/**
 * 错误码:请求体不成形。
 */
export const E_BAD = 'bad'

/**
 * 留痕 err 列:模型没答上来。
 */
export const ERR_LLM = 'llm'

/**
 * 留痕 err 列:模型答了但不是合法 JSON。
 */
export const ERR_PARSE = 'parse'

/**
 * 多轮消息的角色名。
 */
export const ROLE = {
  /**
   * 用户轮。
   */
  user: 'user',

  /**
   * 向导轮。
   */
  assistant: 'assistant',

  /**
   * system 轮(喂模型用)。
   */
  system: 'system',
} as const

/**
 * 空串:「没有」的成语。
 */
export const TEXT_NONE = ''

/**
 * 路径分隔。
 */
export const SLASH = '/'

/**
 * 查询串起头。
 */
export const QS_HEAD = '?'

/**
 * JSON 对象起止。
 */
export const BRACE_OPEN = '{'

/**
 * JSON 对象起止。
 */
export const BRACE_CLOSE = '}'

/**
 * 提示词里各段之间的空行。
 */
export const PARA = '\n\n'

/**
 * 提示词里同段各行之间的换行。
 */
export const NL = '\n'

/**
 * 目录行里键与说明之间的分隔。
 */
export const CAT_SEP = ' — '

/**
 * 目录行里说明与参数之间的分隔。
 */
export const CAT_PARAMS_HEAD = ' (accepts: '

/**
 * 目录行参数段收尾。
 */
export const CAT_PARAMS_TAIL = ')'

/**
 * 目录行参数之间的分隔。
 */
export const CAT_PARAMS_SEP = ', '

/**
 * 子路径清单行的开头。
 */
export const SUB_HEAD = ' sub values: '

/**
 * 模型回包的键名(与 prompts 的 OUTPUT_SHAPE 一致;校验逐键取)。
 */
export const REPLY_KEY = {
  /**
   * 类别。
   */
  kind: 'kind',

  /**
   * 目的地键。
   */
  dest: 'dest',

  /**
   * 英文职业短名。
   */
  occupation: 'occupation',

  /**
   * 两位省码。
   */
  prov: 'prov',

  /**
   * 城市。
   */
  city: 'city',

  /**
   * 关键词。
   */
  q: 'q',

  /**
   * 子路径。
   */
  sub: 'sub',

  /**
   * 向导那一句。
   */
  say: 'say',
}
