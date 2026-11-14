/**
 * 对话助手的死值:站内页面清单、类别与模型参数、输入边界、移民话题闸、链接收口正则、限流、探活、串号、错误码。
 * 2026-11-13/14 Frank 定:「接本地大模型」「正常跟用户对话」「就正常收集用户对话」「不用回答加拿大移民」「回答尽量给本站链接」。
 * 🔵 留痕不在这儿:日志字面量在 `lib/log`(ASSISTANT_LOG);SQL 文本在 `lib/db/sql` §42。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

// =========================================================================
// 1. 站内页面清单(回复里的链接只许出自这里;加一页 = 这里加一行 + prompts 的 PAGE_DESC 加一行)
// =========================================================================

/**
 * 页面键 → 站内路径。键给模型看,路径由服务端拼;模型自己写的网址一律删。
 * 2026-11-14 逐条对过 `app/(frontend)/` 下的目录;已搁置的 /start、/plan 不进清单。
 */
export const PAGE_ROUTE: Record<string, string> = {
  /**
   * 职位板(根路径;/jobs 会 301 回根)。
   */
  jobs: '/',

  /**
   * 雇主板。
   */
  employers: '/employers',

  /**
   * 职业页:紧缺职业清单与各职业在招量。
   */
  occupations: '/occupations',

  /**
   * 资讯里的通道页:各省移民通道与门槛。
   */
  streams: '/streams',

  /**
   * 资讯里的申请步骤。
   */
  steps: '/steps',

  /**
   * 官方新闻。
   */
  news: '/news',

  /**
   * 官方资源导航。
   */
  resources: '/resources',

  /**
   * 定价。
   */
  pricing: '/pricing',

  /**
   * 我的档案与简历。
   */
  profile: '/account?sec=profile',

  /**
   * 我的求职:投递过的与收藏的职位。
   */
  applications: '/account?sec=sjobs',

  /**
   * 收件箱:雇主回信。
   */
  inbox: '/account?sec=inbox',

  /**
   * 我的订阅:职位提醒邮件。
   */
  alerts: '/account?sec=sub',

  /**
   * 账户设置:改登录邮箱、改密码。
   */
  settings: '/account?sec=settings',
}

/**
 * 页面键 → 这页认的查询参数名(白名单)。没列的页不带参;模型给了没登记的参数就丢。
 * 参数名对过 components/jobs 的 URL_TO_FILTER、components/employers 与 components/streams 的 P_PROV / P_Q。
 */
export const PAGE_PARAMS: Record<string, string[]> = {
  /**
   * 职位板:省、关键词。
   */
  jobs: ['prov', 'q'],

  /**
   * 雇主板:省、关键词。
   */
  employers: ['prov', 'q'],

  /**
   * 通道页:省。
   */
  streams: ['prov'],

  /**
   * 申请步骤:省。
   */
  steps: ['prov'],
}

/**
 * 查询参数名:省(两位省码)。
 */
export const P_PROV = 'prov'

/**
 * 查询参数名:关键词。
 */
export const P_Q = 'q'

/**
 * 不提供移民建议时给的页:通道、申请步骤、官方资源。
 */
export const REFUSE_PAGES = ['streams', 'steps', 'resources']

/**
 * 答不了(与求职和本站无关)时给的页:职位板。
 */
export const OFF_PAGES = ['jobs']

/**
 * 一条回复最多带几条链接。
 */
export const LINKS_MAX = 3

/**
 * 关键词参数最长多少字。
 */
export const Q_PARAM_MAX = 60

/**
 * 关键词参数里不留的字符(留字母、数字、空格与几个职位名里常见的符号)。
 */
export const Q_STRIP_RE = /[^\p{L}\p{N} .+#&'-]/gu

/**
 * 连续空白。
 */
export const SPACES_RE = /\s+/g

/**
 * 路径上已经有查询串的标志。
 */
export const QUERY_HEAD = '?'

/**
 * 查询串里接下一个参数。
 */
export const QUERY_AND = '&'

/**
 * 参数名与值之间。
 */
export const QUERY_EQ = '='

// =========================================================================
// 2. 类别与模型
// =========================================================================

/**
 * 一轮回复的三类。界面按它决定出什么:answer 出 say;refuse 与 off 的 say 恒为空串,界面出各自固定的一句话。
 */
export const KIND = {
  /**
   * 正常回答。
   */
  answer: 'answer',

  /**
   * 移民话题:不给建议,只给站内页面。
   */
  refuse: 'refuse',

  /**
   * 与求职和本站无关,或模型的回复不能用(想套出提示词、空回复)。
   */
  off: 'off',
} as const

/**
 * 模型通道:朋友网关(盒子上的 qwen,免费)。2026-11-14 Frank 定:不许调付费模型,也不退回付费模型兜底。
 */
export const PROVIDER = 'friend'

/**
 * 用量账本里的功能名。
 */
export const LLM_FEATURE = 'assistant'

/**
 * 模型输出上限(token)。回复封顶 120 词加一段 JSON 外壳,给足余量。
 */
export const MAX_TOKENS = 900

/**
 * 采样温度:要它照规则办,不要发挥。
 */
export const TEMPERATURE = 0.2

/**
 * 消息角色。
 */
export const ROLE = {
  /**
   * 系统提示。
   */
  system: 'system',

  /**
   * 访客。
   */
  user: 'user',

  /**
   * 助手。
   */
  assistant: 'assistant',
} as const

/**
 * 拼给模型的对话稿里,访客那一行的行首。
 */
export const LINE_USER = 'User: '

/**
 * 拼给模型的对话稿里,助手那一行的行首。
 */
export const LINE_ASSISTANT = 'Assistant: '

/**
 * 换行。
 */
export const NL = '\n'

// =========================================================================
// 3. 输入边界
// =========================================================================

/**
 * 单条提问最长多少字。
 */
export const TEXT_MAX = 2000

/**
 * 一段对话之内带最近几轮历史(一轮 = 一问一答)。
 */
export const HISTORY_TURNS = 6

/**
 * 历史里最多几条消息(每轮两条)。
 */
export const HISTORY_MSGS_MAX = 12

/**
 * 历史里单条消息最长多少字。
 */
export const TURN_MAX = 2000

/**
 * 回复正文最长多少字。
 */
export const SAY_MAX = 2000

/**
 * 存进 chat_logs 的答复最长多少字(表上的口径)。
 */
export const ANSWER_MAX = 8000

/**
 * 认的三种语种。
 */
export const LANGS = ['zh', 'en', 'ko']

/**
 * 语种认不出时用英文(访客八成以上看英文界面)。
 */
export const LANG_FALLBACK = 'en'

/**
 * 没有文字。
 */
export const TEXT_NONE = ''

/**
 * 一个空格。
 */
export const SPACE = ' '

// =========================================================================
// 4. 移民话题闸
// =========================================================================

/**
 * 提问里出现这些说法就按移民话题办,不调模型;模型的回复里出现也按移民话题办。
 * 只收指向明确的说法:单独的 PR、points、score 有歧义(公关岗位、简历匹配分),留给模型判。
 */
export const IMMIGRATION_RE = /\b(?:immigrat\w*|immigrants?|permanent\s+residen\w+|provincial\s+nominee\w*|nominee\s+programs?|pnp|oinp|sinp|mpnp|aaip|express\s+entry|crs|comprehensive\s+ranking|visas?|work\s+permits?|study\s+permits?|pgwp|lmia|ircc|citizenship|refugees?|asylum|clb|invitation\s+to\s+apply|(?:get|getting|got|apply\s+for|applying\s+for|qualify\s+for|eligible\s+for|pathways?\s+to|path\s+to|route\s+to|lead\s+to|towards?)\s+(?:a\s+|my\s+|canadian\s+|canada\s+)?pr|pr\s+(?:card|status|application|pathways?|points|eligib\w*|process\w*|programs?))\b|移民|永居|永久居民|枫叶卡|省提名|快速通道|签证|工签|学签|凑分|难民|入籍|이민|영주권|비자|취업\s?허가|워크\s?퍼밋/i

/**
 * 既是移民话题、也可能只是职位或雇主的一个属性的说法(LMIA、签证、工签、担保)。
 * 2026-11-14 Frank「开始做吧」「照表做」:「LMIA jobs in Alberta」「employers with LMIA」这类是找工作,不该直接拒。
 * 把这些说法从一句话里拿掉后还命中 IMMIGRATION_RE 的,才是指向明确的移民话题。
 */
export const JOB_ATTR_RE = /\b(?:lmia|visas?|work\s+permits?|sponsor\w*)\b|工签|签证|担保|비자|취업\s?허가|워크\s?퍼밋|스폰서/gi

/**
 * 在找职位或雇主清单的说法。单独的 work 不算(work permit 里就有)。
 */
export const JOB_SEEK_RE = /\b(?:jobs?|positions?|openings?|vacanc(?:y|ies)|employers?|compan(?:y|ies)|hiring|recruit\w*)\b|职位|岗位|工作|雇主|公司|招聘|일자리|채용|구인|고용주|회사/i

/**
 * 在问自己能不能、要什么条件、多少分、多久、怎么办的说法:带上任何移民字样都按移民话题办,不交给模型。
 * 「can I find / see / search」是在找清单,不算。
 */
export const ELIGIBILITY_RE = /\b(?:can|could|may|will|would|should|do|does|did|am|is|are)\s+(?:i|we|my|me|an?|the|it|this|that)\b(?!\s+(?:find|see|search|filter|browse|look))|\bhow\s+(?:many|much|long|soon|do|can|to|should)\b|\b(?:eligib\w*|qualif\w*|requir\w*|need(?:s|ed)?|points?|scores?|process\w*|expir\w*|renew\w*|extend\w*|apply\s+for|applying\s+for|count|help\s+me)\b|能不能|能否|我能|可以吗|怎么|如何|多少|多久|条件|要求|资格|需要|到期|续|가능|자격|조건|어떻게|얼마나|몇\s?점/i

/**
 * 找带 LMIA 或担保的职位、雇主时,模型的正文里出现这些说法就算在给移民建议(谁够格、保证办得下来)。
 */
export const ADVICE_RE = /\b(?:eligib\w*|qualif\w*|guarantee\w*)\b|资格|保证|符合条件|자격|보장/i

// =========================================================================
// 5. 链接收口(正文里一条链接都不留;链接只在回包的 links 里,由服务端照清单拼)
// =========================================================================

/**
 * Markdown 链接:留方括号里的字,删网址。
 */
export const MD_LINK_RE = /\[([^\]]*)\]\([^)]*\)/g

/**
 * Markdown 链接替换成的内容:方括号里的字。
 */
export const MD_LINK_KEEP = '$1'

/**
 * 带协议头或 www 开头的网址。
 */
export const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi

/**
 * 不带协议头的域名(常见后缀),连同后面的路径。
 */
export const DOMAIN_RE = /\b(?:[a-z0-9-]+\.)+(?:com|ca|org|net|io|gov|edu|co|ai|app|dev|info|me)\b(?:\/[^\s<>"')\]]*)?/gi

/**
 * 单独写出来的站内路径(如 /pricing、/account?sec=profile)。and/or 这类前面紧挨着字的斜杠不算。
 */
export const PATH_RE = /(?<![\w/.:])\/[a-z][\w-]*(?:[/?][^\s<>"')\]]*)?/gi

/**
 * 删网址后留下的空括号。
 */
export const EMPTY_PAREN_RE = /\(\s*\)|\[\s*\]/g

/**
 * 删网址后留下的连续空格与制表符(换行不动)。
 */
export const GAP_RE = /[ \t]{2,}/g

/**
 * 删网址后留下的「空格 + 句读」。
 */
export const SPACE_PUNCT_RE = /[ \t]+([.,;:!?])/g

/**
 * 句读前的空格删掉,句读留着。
 */
export const PUNCT_KEEP = '$1'

/**
 * 回复里连着出现系统提示里这么长的一行原文,就算把提示词抖出来了。
 */
export const LEAK_LINE_MIN = 40

// =========================================================================
// 6. 限流(未登录也能用,所以只按 IP 数;进程内计数,重启清零)
// =========================================================================

/**
 * 每个 IP 每天最多几轮。一段正常的对话十轮上下,60 轮够一个人一天问五六段;盒子是朋友的,不能被一个 IP 占满。
 */
export const IP_DAILY = 60

/**
 * 每个 IP 每分钟最多几轮。人打字加等回复,一分钟到不了 6 轮;到了多半是脚本。
 */
export const IP_MINUTE = 6

/**
 * 每天那一道的计数键前缀。
 */
export const KEY_DAILY = 'assistant:d:'

/**
 * 每分钟那一道的计数键前缀(键尾带分钟序号,过一分钟自然换键)。
 */
export const KEY_MINUTE = 'assistant:m:'

/**
 * 计数键里 IP 与分钟序号之间的分隔。
 */
export const KEY_SEP = '@'

/**
 * 一分钟的毫秒数。
 */
export const MINUTE_MS = 60000

// =========================================================================
// 7. 探活
// =========================================================================

/**
 * 探活结果缓存多久。界面每开一页问一次,这段时间内不再打盒子。
 */
export const READY_TTL_MS = 30000

// =========================================================================
// 8. 串号(沿 chat_logs 的口径:首轮提问文本的哈希,不指向人)
// =========================================================================

/**
 * 取首轮提问前这么多字算哈希(与 lib/guide 同数)。
 */
export const THREAD_SEED_LEN = 200

/**
 * 串号取哈希前这么多位。
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

// =========================================================================
// 9. 错误码与结果码
// =========================================================================

/**
 * 请求体不成形或没有提问。
 */
export const E_BAD = 'bad'

/**
 * 超过限流。
 */
export const E_LIMIT = 'limit'

/**
 * 盒子没配置或连不上,助手不可用。
 */
export const E_OFFLINE = 'offline'

/**
 * 模型没答上来。
 */
export const E_LLM = 'llm'

/**
 * chat_logs 的 err 列:这一轮按移民话题办了(不是出错,方便按列数)。
 */
export const ERR_REFUSE = 'refuse'

/**
 * chat_logs 的 err 列:这一轮按答不了办了。
 */
export const ERR_OFF = 'off'

/**
 * chat_logs 的 err 列:模型没答上来。
 */
export const ERR_LLM = 'llm'
