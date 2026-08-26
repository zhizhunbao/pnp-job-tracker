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
 * 一个像素占几字节:pdf.js 初始化要的 `ImageData` 平台垫片按 RGBA 四通道各一字节开缓冲区
 * (`new Uint8ClampedArray(w * h * RGBA_BYTES)`)。
 * Canvas 规范定死的数,不是可调参数 —— 本站只抽文本不画图,这块缓冲区实际不落像素,
 * 但尺寸得对,否则 pdf.js 自检当场炸。
 */
export const RGBA_BYTES = 4

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

/**
 * IELTS（G 类）→ CLB：四技能各自换算取最小（IRCC 官方对照；简历极少直接写 CLB）。
 * 一行 = 达到该 CLB 的四项最低分（l/r/w/s = 听/读/写/说），从高到低扫描首个全过的。
 */
export const IELTS_CLB: {
  /**
   * 换算出的 CLB 档。
   */
  clb: number

  /**
   * 听力最低分。
   */
  l: number

  /**
   * 阅读最低分。
   */
  r: number

  /**
   * 写作最低分。
   */
  w: number

  /**
   * 口语最低分。
   */
  s: number
}[] = [
  { clb: 10, l: 8.5, r: 8.0, w: 7.5, s: 7.5 },
  { clb: 9, l: 8.0, r: 7.0, w: 7.0, s: 7.0 },
  { clb: 8, l: 7.5, r: 6.5, w: 6.5, s: 6.5 },
  { clb: 7, l: 6.0, r: 6.0, w: 6.0, s: 6.0 },
  { clb: 6, l: 5.5, r: 5.0, w: 5.5, s: 5.5 },
  { clb: 5, l: 5.0, r: 4.0, w: 5.0, s: 5.0 },
]

/**
 * 送 LLM 的简历正文上限（前两页信息足够）。
 */
export const EXTRACT_CHARS_MAX = 12000

/**
 * 抽取输出的 token 上限。
 */
export const EXTRACT_TOKENS_MAX = 500

/**
 * 抽职名最多取几个。
 */
export const TITLES_N_MAX = 3

/**
 * 单个职名查询串长度上限。
 */
export const TITLE_Q_LEN_MAX = 80

/**
 * 职名太短不查（< 3 字符噪音）。
 */
export const TITLE_Q_LEN_MIN = 3

/**
 * NOC 候选最多几个。
 */
export const NOC_CAND_MAX = 5

/**
 * 简历直写 CLB 的认可区间下限。
 */
export const CLB_MIN = 4

/**
 * 简历直写 CLB 的认可区间上限。
 */
export const CLB_MAX = 10

/**
 * 抽出文本短于它 = 扫描件/空文件（无文本层）。
 */
export const EXTRACT_TEXT_MIN = 120

/**
 * 回填前端粘贴框的文本上限（match 侧另有截断，这里只防离谱大文件）。
 */
export const EXTRACT_OUT_MAX = 20000

/**
 * 全部空白压成单空格（送 LLM 的紧凑形态）。
 */
export const WS_ALL_RE = /\s+/g

/**
 * 回车剔除（回填 textarea 保留换行的清洗链之一）。
 */
export const CR_RE = /\r/g

/**
 * 行内连空格压成一个。
 */
export const SPACES_RE = /[ \t]+/g

/**
 * 三连以上空行压成两个。
 */
export const BLANKS3_RE = /\n{3,}/g

/**
 * 压成的两连空行。
 */
export const BLANKS2 = '\n\n'

/**
 * 单空格（空白压缩的替换目标）。
 */
export const ONE_SPACE = ' '

/**
 * match 的 jd 最短长度（短于它 = 没拿到 JD）。
 */
export const JD_LEN_MIN = 40

/**
 * match 输出 token 上限（Pro）。
 */
export const MATCH_TOKENS_PRO = 1600

/**
 * match 输出 token 上限（免费；不生成 rewrite）。
 */
export const MATCH_TOKENS_FREE = 900

/**
 * match 采样温度（要稳定 JSON 与可复现判定，不要发挥）。
 */
export const MATCH_TEMPERATURE = 0.1

/**
 * match 定向朋友盒子（2026-08-03 Frank「不用 Haiku 用朋友的大模型」；
 * 挂了按错误码报，不静默切云烧钱）。
 */
export const MATCH_PROVIDER = 'friend'

/**
 * rewrite 截断（Pro 才生成）。
 */
export const REWRITE_CAP = 1200

/**
 * 存档简历截断（与 collection 的 maxLength 对齐，服务端截断不信前端）。
 */
export const RESUME_SAVE_CAP = 20000

/**
 * matchUses 账本的日期段长度（YYYY-MM-DD）。
 */
export const DATE_LEN = 10

/**
 * matchUses 账本的分隔（"YYYY-MM-DD:N"）。
 */
export const USES_SEP = ':'

/**
 * 默认语种（body.lang 认不出时）。
 */
export const LANG_FALLBACK_EN = 'en'

/**
 * 真实错误细节只回这个后缀的账号（探针惯例）。
 */
export const TEST_MAIL_SUFFIX = '@test.local'

/**
 * 错误细节回探针账号时的截断。
 */
export const DETAIL_CAP = 300

/**
 * 错误/原文摘要进日志的截断。
 */
export const ERR_LOG_CAP = 200

/**
 * 上传表单里文件字段名。
 */
export const FIELD_FILE = 'file'

/**
 * 错误体：要登录（/api/resume 的文案）。
 */
export const E_LOGIN = 'login'

/**
 * 错误体：要登录（extract/match 的文案）。
 */
export const E_AUTH = 'auth'

/**
 * 错误体：额度撞顶。
 */
export const E_LIMIT = 'limit'

/**
 * 错误体：没带文件。
 */
export const E_NOFILE = 'nofile'

/**
 * 错误体：文件超大。
 */
export const E_SIZE = 'size'

/**
 * 错误体：解析失败。
 */
export const E_PARSE = 'parse'

/**
 * 错误体：扫描件/无文本层。
 */
export const E_SCAN = 'scan'

/**
 * 错误体：模型层挂了。
 */
export const E_LLM = 'llm'

/**
 * 错误体：简历太短。
 */
export const E_TOO_SHORT = 'tooShort'

/**
 * 错误体：没拿到 JD。
 */
export const E_NO_JD = 'noJd'

/**
 * 错误体：输入太长（重试没用要删内容）。
 */
export const E_TOO_LONG = 'tooLong'

/**
 * 错误体：上游超时（重试有用）。
 */
export const E_BUSY = 'busy'

/**
 * 模型错误码：输入超长（isLlmError 的 code 比对值）。
 */
export const CODE_TOO_LONG = 'tooLong'

/**
 * 模型错误码：超时。
 */
export const CODE_TIMEOUT = 'timeout'

/**
 * 日志里的缺位占位（code/x-cache 没有时）。
 */
export const LOG_DASH = '-'

/**
 * meta 的初始链路值（onMeta 没响过就是它；日志里尽量不出现 —— 响过必覆盖）。
 */
export const META_VIA_LEGACY = 'legacy'

/**
 * 取字成功时 err 格的值:空串 = **没有错误**(失败那条路会把真实错误串装进来,
 * 给 @test.local 探针看)。调用方判成没成看的是 `text == null`,不是判它 ——
 * 空串在这里是「无事发生」,不是「不知道」。
 */
export const ERR_NONE = ''

/**
 * 免费档的改写段:空串 = **不插这一段**(付费档才把 MATCH_REWRITE 填进 system 的槽)。
 * 免费不生成 rewrite 是 #102 账单教训里的成本闸之一 —— 少一段指令,输出也短一截。
 */
export const REWRITE_NONE = ''

/**
 * NOC 候选刚入表时的职业名:空串 = **名字还没查到**(不是「这个 NOC 没有名字」)。
 * 候选先只带码收齐,名字随后一条 SQL 批量补 —— 逐个查名会把 5 次往返打成 N 次。
 */
export const TITLE_PENDING = ''

/**
 * `\r` 的替换串:空串 = **直接删掉**。Windows 简历里的换行是 `\r\n`,只留 `\n`
 * 才对得上后面那步压空行:BLANKS3_RE(`/\n{3,}/g`)咬三行以上的空白,换成 BLANKS2
 * (`'\n\n'` —— 那是替换串,不是正则)。`\r` 留着,空行就长成 `\r\n\r\n` 混排,咬不住。
 */
export const CR_DROP = ''

/**
 * 请求体里没给的文本字段(resume / jd)的初值:空串 = 「用户没给」。body 坏了也落回它,
 * 随后被长度闸(MIN_RESUME / JD_LEN_MIN)挡下 → 400 —— 用空串不用 null,是因为下一步
 * 就是 `.length` 比对,少一次判空。
 */
export const BODY_TEXT_NONE = ''

/**
 * 按 jobId 回库兜 JD 的落点:空串 = **没兜到**(库里没有这条岗、或抓正文那步抛了)。
 * 兜到才覆盖用户给的 jd(`jdFromDb !== ''`)—— 兜底失败不许把已有的 jd 冲成空。
 */
export const JD_DB_NONE = ''

/**
 * 计次格(profile.matchUses)缺席时的落点:空串 = **今天还没记过**。
 * 解析时找不到 USES_SEP 分隔符,用量就停在 0,免费额度照常给满。
 */
export const USES_CELL_NONE = ''

/**
 * 模型原文的初值(await 之前):空串 = **还没拿到**。真正的失败走 catch 里的错误码
 * (tooLong/busy/llm),不靠这个空串表达 —— 空串只在「还没开始」那一瞬存在。
 */
export const LLM_TEXT_NONE = ''
