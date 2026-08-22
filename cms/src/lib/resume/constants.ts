/**
 * 简历域的死值:文件与文本上限、免费闸参数、输入预算、收口参数。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

/**
 * 上传文件字节上限(5MB)。只管 pdf/docx —— md/txt 是文本文件,前端 FileReader 直读,
 * 不必进服务端。
 */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024

/**
 * 免费层可见行数(缺的优先);其余打码(行数=真实剩余数)。
 */
export const FREE_ROWS = 5

/**
 * 每账号每天免费次数(Pro 不限)。
 */
export const DAILY_FREE = 3

/**
 * 简历文本最短字符数(再短对不出东西)。
 */
export const MIN_RESUME = 100

/**
 * 上游网关硬上限(与 friendLlm.FRIEND_INPUT_MAX 同一个数,别改单边)。
 *
 * 输入预算的由来(2026-08-04 重算):朋友的模型网关**曾经**只收 6000 字符,当时的止血是在
 * 路由里把 JD 切 2800、简历切 3100 —— Frank 拿真简历实测必败(真简历 + 真 JD 一合计秒 400
 * 「prompt too long」),根因就是这个上限。后上游换 OpenAI 兼容端点,上限提到 **20000 字符**
 * (按 messages 全部 content 之和算;本机实测 19970 通过、25000 返回 context_length_exceeded)
 * → 那套切法作废,恢复按 CLAMP 走。
 * 算账(pro 分支 system 最长,实测量见 resumeMatch.int.spec):
 * system ≈ 900 + 固定串 "JOB POSTING:(换行)…RESUME:" 26 + JD 8000 + 简历 8000 ≈ 16.9k,
 * 对 20000 留 ~15% 余量 —— 不顶格(上游按字符算,中文/换行都占,顶格等于把 400 的风险留给用户)。
 * 真要撞上限,friendLlm 会本地预检拦下并报 tooLong,不会再变成一句「稍后再试」。
 */
export const GATEWAY_MAX = 20000

/**
 * JD/简历各自的输入上限(字符;#102 账单教训,输入侧封顶)。
 */
export const CLAMP = 8000

/**
 * req 一格的字符上限。
 */
export const REQ_MAX = 80

/**
 * note 一格的字符上限。
 */
export const NOTE_MAX = 120

/**
 * 对照最多收几行(模型再多也不收)。
 */
export const ROWS_MAX = 12

/**
 * 对照至少要几行 —— 少于它 = 解析失败或 JD 太空,不硬凑。
 */
export const ROWS_MIN = 3

/**
 * 留痕时错误串截几个字符。
 */
export const ERR_SLICE = 300

/**
 * 扩展名分隔符。
 */
export const EXT_SEP = '.'

/**
 * PDF 的扩展名。
 */
export const EXT_PDF = 'pdf'

/**
 * docx 的扩展名。
 */
export const EXT_DOCX = 'docx'

/**
 * 不认识的文件类型的失败原因(路由据此给用户报「格式不支持」)。
 */
export const ERR_UNSUPPORTED = 'unsupported'

/**
 * 消息角色:system。
 */
export const ROLE_SYSTEM = 'system' as const

/**
 * 消息角色:user。
 */
export const ROLE_USER = 'user' as const

/**
 * JSON 收口:对象起始符。
 */
export const BRACE_OPEN = '{'

/**
 * JSON 收口:对象闭合符。
 */
export const BRACE_CLOSE = '}'
