/**
 * 按职位改写域的常量(2026-11-09 Frank「每个职位都应该重写简历」;一步一请求,进度由前端按回包的 next 往下走)。
 *
 * @author Frank
 * @time 2026-11-09 18:00:00
 */

/**
 * 步骤:从职位描述拆出要求。
 */
export const STEP_PLAN = 'plan'

/**
 * 步骤:写本岗简历。
 */
export const STEP_RESUME = 'resume'

/**
 * 步骤:写本岗求职信。
 */
export const STEP_COVER = 'cover'

/**
 * 步骤:逐条核对并打分。
 */
export const STEP_AUDIT = 'audit'

/**
 * 没有下一步(回包 next)。
 */
export const STEP_DONE = ''

/**
 * 用量账本里的功能名:拆要求。
 */
export const FEATURE_PLAN = 'tailor.plan'

/**
 * 用量账本里的功能名:写简历。
 */
export const FEATURE_RESUME = 'tailor.resume'

/**
 * 用量账本里的功能名:写求职信。
 */
export const FEATURE_COVER = 'tailor.cover'

/**
 * 用量账本里的功能名:核对。
 */
export const FEATURE_AUDIT = 'tailor.audit'

/**
 * 拆要求的输出 token 上限。
 */
export const PLAN_TOKENS_MAX = 900

/**
 * 写简历的输出 token 上限。
 */
export const RESUME_TOKENS_MAX = 2200

/**
 * 写求职信的输出 token 上限。
 */
export const COVER_TOKENS_MAX = 800

/**
 * 核对的输出 token 上限。
 */
export const AUDIT_TOKENS_MAX = 1800

/**
 * 走付费通道(2026-11-09 Frank「用 Sonnet 5.5」:qwen、Haiku 5.5、Sonnet 5.5 对比后定)。
 */
export const TAILOR_PROVIDER = 'anthropic'

/**
 * 按职位改写的模型。
 */
export const TAILOR_MODEL = 'claude-sonnet-5-5'

/**
 * 输出上限之外留给模型思考的额度(思考也占 max_tokens)。
 */
export const THINKING_ROOM = 6000

/**
 * 喂给模型的职位描述上限(字符)。
 */
export const JD_CHARS_MAX = 8000

/**
 * 喂给模型的简历上限(字符)。
 */
export const BASE_CHARS_MAX = 12000

/**
 * 用户补充的经历全文上限(字符)。
 */
export const EXTRA_CHARS_MAX = 4000

/**
 * 用户补充表里「补充经历全文」那一格的键(2026-11-10 起补充经历是一整段文字、写回基础简历;按要求编号的旧格照读)。
 */
export const KEY_EXTRA = 'extra'

/**
 * 一个职位最多拆几条要求。
 */
export const REQ_MAX = 12

/**
 * 要求短名上限(字符)。
 */
export const LABEL_MAX = 40

/**
 * 求职信最短长度:再短算没写成。
 */
export const COVER_MIN_LEN = 200

/**
 * 每份文件自动重试的上限。
 */
export const RETRY_MAX = 2

/**
 * 分数里简历覆盖要求占的分。
 */
export const SCORE_RESUME = 70

/**
 * 分数里求职信回应要求占的分。
 */
export const SCORE_COVER = 30

/**
 * 一句没有依据的话扣几分。
 */
export const SCORE_PENALTY = 4

/**
 * 分数上限里的 0。
 */
export const SCORE_MIN = 0

/**
 * 每人每天调用步骤的上限(只拦脚本)。
 */
export const STEP_USER_DAILY = 200

/**
 * 步骤限流计数键前缀。
 */
export const STEP_USER_PREFIX = 'tailor:'

/**
 * 计数键分隔。
 */
export const KEY_SEP = ':'

/**
 * 空值。
 */
export const TEXT_NONE = ''

/**
 * 空白折叠。
 */
export const WS_RE = /\s+/g

/**
 * 一个空格。
 */
export const ONE_SPACE = ' '

/**
 * 数字串(核对改写有没有新增数字;年份、人数、金额都算)。
 */
export const NUMBER_RE = /\d[\d,.]*/g

/**
 * 数字串末尾的标点。
 */
export const NUMBER_TAIL_RE = /[,.]+$/

/**
 * 工作年限说法(「3 years」「5+ years」):从简历日期算得出的不算新增事实。
 */
export const DURATION_RE = /\b(\d{1,2})\+?(?:\s|-)years?\b/gi

/**
 * 四位年份(核对改写有没有丢掉基础简历里的某段经历)。
 */
export const YEAR_RE = /\b(?:19|20)\d{2}\b/g

/**
 * 错误码:没登录。
 */
export const E_AUTH = 'auth'

/**
 * 错误码:次数超限。
 */
export const E_LIMIT = 'limit'

/**
 * 错误码:请求体不合形。
 */
export const E_BODY = 'body'

/**
 * 错误码:职位不存在。
 */
export const E_JOB = 'job'

/**
 * 错误码:没有基础简历,或读不出文字。
 */
export const E_BASE = 'base'

/**
 * 错误码:试用用完。
 */
export const E_PRO = 'pro'

/**
 * 错误码:职位没有描述。
 */
export const E_NO_JD = 'noJd'

/**
 * 错误码:模型失败。
 */
export const E_LLM = 'llm'

/**
 * 错误码:改写多次仍含基础简历没有的事实,或排不成 PDF。
 */
export const E_RESUME_BAD = 'resumeBad'

/**
 * 错误码:投递已发出,不能再改。
 */
export const E_SENT = 'sent'

/**
 * 错误码:还没生成。
 */
export const E_NONE = 'none'

/**
 * 查询参数:职位。
 */
export const P_JOB = 'job'

/**
 * 查询参数:文件种类。
 */
export const P_KIND = 'kind'

/**
 * 文件种类:求职信。
 */
export const KIND_COVER = 'cover'

/**
 * PDF 的 MIME。
 */
export const MIME_PDF = 'application/pdf'

/**
 * base64。
 */
export const B64 = 'base64'

/**
 * 不许中间层缓存。
 */
export const CACHE_PRIVATE = 'private, no-store'

/**
 * 喂给模型取文字的文件名(只用它的扩展名判类型)。
 */
export const PDF_NAME = 'tailored.pdf'

/**
 * 模型回包的键:要求列表。
 */
export const KEY_REQS = 'reqs'

/**
 * 模型回包的键:引文。
 */
export const KEY_QUOTE = 'quote'

/**
 * 模型回包的键:短名。
 */
export const KEY_LABEL = 'label'

/**
 * 模型回包的键:核对条目。
 */
export const KEY_ITEMS = 'items'

/**
 * 模型回包的键:要求编号。
 */
export const KEY_ID = 'id'

/**
 * 模型回包的键:有没有依据。
 */
export const KEY_BASIS = 'basis'

/**
 * 模型回包的键:简历引文。
 */
export const KEY_RESUME = 'resume'

/**
 * 模型回包的键:求职信引文。
 */
export const KEY_COVER = 'cover'

/**
 * 模型回包的键:无依据的句子。
 */
export const KEY_UNSUPPORTED = 'unsupported'

/**
 * 用户消息的段分隔。
 */
export const MSG_SEP = '\n\n'

/**
 * 用户消息的行分隔。
 */
export const LINE_SEP = '\n'

/**
 * 要求编号后的分隔。
 */
export const NUM_SEP = '. '

/**
 * 要求原文与用户补充之间的分隔。
 */
export const FACT_SEP = ': '

/**
 * 投递状态:草稿(还能改)。
 */
export const STATUS_DRAFT = 'draft'

/**
 * 投递状态:排队中(还能改)。
 */
export const STATUS_QUEUED = 'queued'

/**
 * 重试计数格:简历。
 */
export const FIELD_RETRY_RESUME = 'retryResume'

/**
 * 重试计数格:求职信。
 */
export const FIELD_RETRY_COVER = 'retryCover'

/**
 * 模型消息的角色:系统。
 */
export const ROLE_SYSTEM = 'system'

/**
 * 模型消息的角色:用户。
 */
export const ROLE_USER = 'user'

/**
 * 作废原因:排不成 PDF。
 */
export const BAD_PDF = 'pdf'

/**
 * 拆要求一条的字段。
 */
export const PLAN_FIELDS = ['label', 'quote']

/**
 * 联系方式的字段。
 */
export const CONTACT_FIELDS = ['name', 'email', 'phone', 'city', 'region']

/**
 * 一段工作的字段。
 */
export const WORK_FIELDS = ['title', 'org', 'city', 'region', 'fromY', 'fromM', 'toY', 'toM', 'desc']

/**
 * 一段教育的字段。
 */
export const EDU_FIELDS = ['title', 'org', 'city', 'region', 'fromY', 'fromM', 'toY', 'toM']

/**
 * 一条证书的字段。
 */
export const CRED_FIELDS = ['title', 'org', 'fromY', 'fromM']

/**
 * 补充经历后重写的限流计数键前缀。
 */
export const FILL_PREFIX = 'tailor-fill:'

/**
 * 每人每个职位每天补充经历后重写的上限(一次填完所有红叉,不用反复)。
 */
export const FILL_DAILY = 3

/**
 * 结构种类:对象。
 */
export const SCHEMA_OBJECT = 'object'

/**
 * 结构种类:字符串。
 */
export const SCHEMA_STRING = 'string'

/**
 * 结构种类:数组。
 */
export const SCHEMA_ARRAY = 'array'

/**
 * 结构种类:整数。
 */
export const SCHEMA_INTEGER = 'integer'

/**
 * 结构种类:布尔。
 */
export const SCHEMA_BOOLEAN = 'boolean'

/**
 * 拆要求回包的顶层字段。
 */
export const PLAN_TOP_FIELDS = ['reqs']

/**
 * 核对回包的顶层字段。
 */
export const AUDIT_TOP_FIELDS = ['items', 'unsupported']

/**
 * 核对一条的字段。
 */
export const AUDIT_ITEM_FIELDS = ['id', 'basis', 'resume', 'cover']
