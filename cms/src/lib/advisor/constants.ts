/**
 * advisor 域常量:场景分组、截断上限、生成长度档、缓存键与限额键。
 * 2026-08-23 自 api/advisor/route.ts 搬入(数值口径逐字保形,出处注释随行保留)。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */

/**
 * 输出语言名(喂给 system 的 `{lang}` 槽;键 = 前端 lang 参数)。
 */
export const LANG_NAMES: Record<string, string> = {
  /**
   * 中文(简体令另有 ZH_ONLY 段)。
   */
  zh: '简体中文',

  /**
   * 英文。
   */
  en: 'English',

  /**
   * 韩文。
   */
  ko: '한국어',
}

/**
 * 一句话即可的简单字段(不分段、不过度解读;其余移民价值相关走多段分析)。
 */
export const SIMPLE_FIELDS = ['datePosted', 'lastSeen', 'closedAt', 'status', 'country', 'city', 'district', 'address', 'source', 'origin', 'direct', 'wageMedHr', 'wageMedYr']

/**
 * 薪资类字段(中位缺失时要追加 NO_MEDIAN_RULE —— 踩过:模型编出 $72K-$78K)。
 */
export const WAGE_FIELDS = ['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian']

/**
 * 紧缺职业的 NOC 前两位集(E12-08 档位制;与 etl/grades.py grade_channel 同源信号)。
 */
export const INDEMAND_NOC2 = ['21', '22', '31', '32', '72', '73', '42']

/**
 * 海洋四省省码(#161:AIP 雇主驱动通道优先于 EE 标尺)。
 */
export const ATLANTIC_PROVS = ['NL', 'PE', 'NS', 'NB']

/**
 * JD 原文截断上限(控制 prompt 长度;老链 loadJD 同数)。
 */
export const JD_LEN_MAX = 2200

/**
 * 公司简介(库内富化)截断:初判场景。
 */
export const CO_DESC_LEN_MAX = 1200

/**
 * 公司行业串截断:初判场景。
 */
export const CO_SECTORS_LEN_MAX = 200

/**
 * 公司简介截断:事实行与速读场景(jobFacts/coRead 同数)。
 */
export const CO_ABOUT_LEN_MAX = 600

/**
 * 联网调查简报截断(#107 K 调查缓存)。
 */
export const CO_WEB_LEN_MAX = 800

/**
 * 联网调查来源 URL 上限(只带前几条)。
 */
export const CO_SOURCES_MAX = 4

/**
 * 公司名长度上限(超长不当公司名查,防滥用)。
 */
export const CO_NAME_LEN_MAX = 200

/**
 * occRead 官方职责:行数上限。
 */
export const OCC_DUTY_LINES_MAX = 30

/**
 * occRead 官方职责:字符上限。
 */
export const OCC_DUTY_LEN_MAX = 2000

/**
 * occRead 任职要求:行数上限。
 */
export const OCC_REQ_LINES_MAX = 20

/**
 * occRead 任职要求:字符上限。
 */
export const OCC_REQ_LEN_MAX = 1400

/**
 * provRead/cityRead 地点事实块截断。
 */
export const LOC_FACTS_LEN_MAX = 2400

/**
 * 生成长度档:多轮追问(第 15 轮 #36 各档 +40 容纳结尾 ❓ 建议行)。
 */
export const PREDICT_CHAT = 540

/**
 * 生成长度档:简单字段一句话。
 */
export const PREDICT_SIMPLE = 160

/**
 * 生成长度档:公司初判(480→640 实测 web_fetch 后素材变厚截断第四段,E6-03;再 +40)。
 */
export const PREDICT_COMPANY = 680

/**
 * 生成长度档:其余多段场景。
 */
export const PREDICT_DEFAULT = 460

/**
 * 前导话闸缓冲上限(E8-05:吞掉首个【之前的文本;超限原样放行,防误吞无标题的降级回答)。
 */
export const GATE_BUF_MAX = 300

/**
 * 初判缓存键版本(v3=#133 档名口径;v4=2026-08-23 契约换 id 制,旧键天然失效)。
 */
export const CACHE_VER = 'v4'

/**
 * 全局日上限的限额键(成本兜底,真调 LLM 才计)。
 */
export const QUOTA_KEY_GLOBAL = 'adv:__global__'

/**
 * Pro 个人日限的限额键前缀(后接用户 id)。
 */
export const QUOTA_KEY_PRO_PREFIX = 'adv:pro:'

/**
 * 全局日上限的缺省值(环境变量 ADVISOR_DAILY_CAP 可覆盖)。
 */
export const GLOBAL_DAILY_CAP_DEFAULT = 1000

/**
 * 全局日上限的环境变量名。
 */
export const ENV_DAILY_CAP = 'ADVISOR_DAILY_CAP'

/**
 * 场景名:公司初判。
 */
export const F_COMPANY = 'company'

/**
 * 场景名:职业速读。
 */
export const F_OCC_READ = 'occRead'

/**
 * 场景名:省速读。
 */
export const F_PROV_READ = 'provRead'

/**
 * 场景名:市/区速读。
 */
export const F_CITY_READ = 'cityRead'

/**
 * 场景名:职位帖速读。
 */
export const F_JD_READ = 'jdRead'

/**
 * 场景名:公司速读。
 */
export const F_CO_READ = 'coRead'

/**
 * 场景名:初判(旧调用方的名字,兼容保留)。
 */
export const F_TITLE = 'title'

/**
 * 场景名:初判(E8-10 收组后的名字)。
 */
export const F_IMMIGRATION = 'immigration'

/**
 * 场景名:通道档解读(要附 scoreFacts 明细)。
 */
export const F_SCORE = 'score'

/**
 * 语言码:中文(简体令的判据)。
 */
export const LANG_ZH = 'zh'

/**
 * 可抓官网的 URL 形状(company 场景 web_fetch 的门槛)。
 */
export const HTTP_RE = /^https?:\/\//

/**
 * NOC 码的 TEER 位:长度 5 且第二位是数字(与老链 noc[1] 判据同义)。
 */
export const NOC_TEER_RE = /^.(?<teer>\d).{3}$/

/**
 * NOC 紧缺判定取前几位(INDEMAND_NOC2 的键长)。
 */
export const NOC_GROUP_LEN = 2

/**
 * ISO 日期串取前几位(YYYY-MM-DD)。
 */
export const ISO_DATE_LEN = 10

/**
 * 年薪千位换算除数。
 */
export const K_DIV = 1000

/**
 * 换行(functions 不许裸字面量,粘接词收这儿)。
 */
export const NL = '\n'

/**
 * 空行。
 */
export const NL2 = '\n\n'

/**
 * 逗号粘接(地点、雇佣形态)。
 */
export const COMMA_SEP = ', '

/**
 * 分号粘接(证书表、驱动因子)。
 */
export const SEMI_SEP = '; '

/**
 * 斜杠粘接(档案的 NOC/省列表)。
 */
export const SLASH_SEP = '/'

/**
 * 空格粘接(调查来源 URL、句间)。
 */
export const SPACE_SEP = ' '

/**
 * 档案匹配依据行的行首。
 */
export const REASON_PREFIX = '- '

/**
 * 档名引号(scoreFacts 里档名带双引号喂模型,老链口径)。
 */
export const QUOTE = '"'

/**
 * 缓存键的段分隔。
 */
export const KEY_SEP = ':'

/**
 * 缓存键的按人隔离段前缀(后接用户 id)。
 */
export const KEY_PRO_PREFIX = 'p'

/**
 * 模型服务地址(与 consult 同一条环境链:生产=朋友服务器经 ngrok 的网关,
 * 本机可 CHAT_LLM_BASE 直连局域网盒子;尾斜杠掐掉)。
 */
export const BASE = (process.env.CHAT_LLM_BASE || process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')

/**
 * 网关鉴权钥匙(没有就不挂头 —— 裸 Ollama 挂空 Authorization 反被当鉴权失败)。
 */
export const KEY = process.env.CHAT_LLM_KEY || process.env.TRANSLATE_API_KEY || ''

/**
 * pi 必填非空 apiKey 的占位(后端不校验时用)。
 */
export const NO_KEY_PLACEHOLDER = 'local'

/**
 * 模型名(网关实际固定路由,见 consult 域同名常量的注释)。
 */
export const MODEL_ID = process.env.CHAT_LLM_MODEL || process.env.TRANSLATE_API_MODEL || 'glm-4.7-flash'

/**
 * pi 模型描述符的 api 字段。
 */
export const API = 'openai-completions'

/**
 * pi 模型描述符的 provider 字段。
 */
export const PROVIDER = 'openai'

/**
 * OpenAI 兼容端点前缀。
 */
export const V1 = '/v1'

/**
 * 鉴权头名。
 */
export const AUTH_HEADER = 'Authorization'

/**
 * Bearer 前缀(带尾空格)。
 */
export const BEARER = 'Bearer '

/**
 * 上下文窗(与 consult 同口径)。
 */
export const CONTEXT_WINDOW = 262_144

/**
 * pi 事件流里我们唯一认的事件名。
 */
export const MESSAGE_UPDATE = 'message_update'

/**
 * 采样参数:只关思维链(qwen 默认开着,不发这个键=不关)。
 * ⚠️ 不设 temperature —— 顾问是生成文案不是工具派发,老链 streamChat 走后端默认温度,
 * 对拍期保持同口径(consult 的 0 度是工具派发正确性,那是另一回事)。
 */
export const SAMPLING = {
  /**
   * 关思维链(实测开思考多绕一轮还慢一倍,见 consult 同名注释)。
   */
  reasoning_effort: 'none',
}

/**
 * 一趟循环的总预算(公司场景带 web_fetch 一跳,给到 90s;超时掐断)。
 */
export const LOOP_TIMEOUT_MS = 90_000

/**
 * pi 消息里文本块的 type 值。
 */
export const BLOCK_TEXT = 'text'

/**
 * 追问消息的用户角色值。
 */
export const ROLE_USER = 'user'

/**
 * 追问消息的助手角色值。
 */
export const ROLE_ASSISTANT = 'assistant'

/**
 * web_fetch 工具名(prompts 里的措辞点名它,不许改名)。
 */
export const TOOL_WEB_FETCH = 'web_fetch'

/**
 * web_fetch 抓页超时。
 */
export const WEBFETCH_TIMEOUT_MS = 12_000

/**
 * web_fetch 回给模型的正文截断。
 */
export const WEBFETCH_TEXT_MAX = 6000

/**
 * cityRead 的 id 段分隔(前端拼的是 `市|省[|区]`)。
 */
export const ID_SEP = '|'

/**
 * 省码形状(provRead 的 id 验形)。
 */
export const PROV_CODE_RE = /^[A-Za-z]{2}$/

/**
 * 前导话闸认的首段标记(吞掉它之前的过程叙述)。
 */
export const GATE_MARK = '【'

/**
 * 响应头:内容类型。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 纯文本流的内容类型值。
 */
export const CT_TEXT = 'text/plain; charset=utf-8'

/**
 * 响应头:缓存命否。
 */
export const HDR_X_CACHE = 'X-Cache'

/**
 * 缓存命中值。
 */
export const CACHE_HIT = 'hit'

/**
 * 缓存未中值。
 */
export const CACHE_MISS = 'miss'

/**
 * 响应头:这次带没带真实 JD。
 */
export const HDR_X_JD = 'X-JD'

/**
 * X-JD 是。
 */
export const JD_YES = 'yes'

/**
 * X-JD 否。
 */
export const JD_NO = 'no'

/**
 * 错误体:body 不是 JSON。
 */
export const E_BAD_JSON = 'bad json'

/**
 * 错误体:标识对不上一条记录。
 */
export const E_NOT_FOUND = 'not found'

/**
 * 错误体:限流。
 */
export const E_RATE_LIMITED = 'rate limited'

/**
 * 错误体:上游模型不可用(老链 502 同文)。
 */
export const E_LLM_DOWN = '大模型不可用。'

/**
 * 魁北克省码(独立体系判据)。
 */
export const QC_CODE = 'QC'

/**
 * 省情报卡 jsonb 里我们读的键名(与 /stats 面板消费端同一形状)。
 */
export const LOC_KEY = {
  /**
   * 难度因子数组。
   */
  factors: 'factors',

  /**
   * 难度档名。
   */
  tier: 'tier',

  /**
   * 因子的判别键。
   */
  key: 'key',

  /**
   * 竞争比因子。
   */
  comp: 'comp',

  /**
   * 配额同比因子。
   */
  quotaTrend: 'quotaTrend',

  /**
   * 抽选活跃因子。
   */
  activity: 'activity',

  /**
   * 因子主值。
   */
  value: 'value',

  /**
   * 竞争基数(学签+工签持有人)。
   */
  pool: 'pool',

  /**
   * 基数口径年。
   */
  asOf: 'asOf',

  /**
   * 提名配额。
   */
  quota: 'quota',

  /**
   * 配额口径年。
   */
  quotaYear: 'quotaYear',

  /**
   * 邀请数。
   */
  invitations: 'invitations',

  /**
   * 学签体量格。
   */
  study: 'study',

  /**
   * TFWP 体量格。
   */
  tfwp: 'tfwp',

  /**
   * IMP 体量格。
   */
  imp: 'imp',

  /**
   * 提名配额格。
   */
  alloc: 'alloc',

  /**
   * PNP 登陆格。
   */
  pnpPr: 'pnpPr',

  /**
   * 数值。
   */
  n: 'n',

  /**
   * 年份。
   */
  year: 'year',

  /**
   * 2026 配额。
   */
  y2026: 'y2026',

  /**
   * 2025 配额。
   */
  y2025: 'y2025',
}

/**
 * 抓回网页去 script 块。
 */
export const HTML_SCRIPT_RE = /<script[\s\S]*?<\/script>/gi

/**
 * 抓回网页去 style 块。
 */
export const HTML_STYLE_RE = /<style[\s\S]*?<\/style>/gi

/**
 * 抓回网页去标签。
 */
export const HTML_TAG_RE = /<[^>]+>/g

/**
 * 连续空白折一个空格。
 */
export const WS_RE = /\s+/g

/**
 * 百分比换算乘数(配额同比 value 是小数,喂模型前乘 100 取整)。
 */
export const PCT_100 = 100
