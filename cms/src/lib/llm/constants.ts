/**
 * 模型域的参数:三个后端的地址与默认模型、网关的上限与端点、缓存指纹与几处协议字面量。
 * 🔵 **失败与留痕不在这儿**:错误码/话术在 `lib/error`,日志字面量在 `lib/log`(全站各只有一处)。
 *
 * @author Frank
 * @time 2026-08-19 06:32:21
 */

// =========================================================================
// 1. 后端与模型
// =========================================================================

/**
 * 走哪个后端。Render 置 LLM_PROVIDER=friend 即切,回退 = 删该 env(2026-07-19 Frank 拍板初判切本地生态,
 * #102 自动生成后 Haiku 调用量翻倍→账单归零)。
 */
export const PROVIDER = process.env.LLM_PROVIDER || 'ollama'

/**
 * 本地 dev,家里的模型。
 */
export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

/**
 * 本地跑哪个模型。
 */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b'

/**
 * 云后端:Claude Haiku 4.5(单次 1-2k in + ≤500 out ≈ $0.004)。
 * 🔴 **这一行与 `lib/agent/constants.ts` 的 MODEL_ID 是全站仅有的一处重合**(2026-08-19 判定,理由见
 * docs/implementation/文案收拢/14_lib-llm域重构.md §1)。两边读的是**同一个 env key**,`ANTHROPIC_MODEL` 才是单一来源;
 * 只有 env 没设时才各自回落到这个字面量 —— 换模型请在 Render 上设 `ANTHROPIC_MODEL`(两边同时生效),
 * 真要改默认值就两处一起改。不做跨域 import:域之间不互相取常量,为一个字符串新建共享叶子是盖房子。
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'

// =========================================================================
// 2. 朋友网关:地址、上限、端点
// =========================================================================

/**
 * 朋友的模型服务(ngrok FastAPI → qwen3.6)。env 复用 news 懒翻译同款 TRANSLATE_API_*;
 * 未配置 → 各出口按 offline 降级。
 * 🔵 一对 env 供两条链共用:聊天(/v1、/api/chat)与逐行翻译(/api/translate)是同一个网关同一把钥匙 ——
 * 收拢前 friend 与 lineTranslate 各抄了一份一模一样的读法,那是这次真查得出的重复。
 */
export const GATEWAY_BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')

/**
 * 网关的钥匙。聊天和翻译两条链共用同一把。
 */
export const GATEWAY_KEY = process.env.TRANSLATE_API_KEY || ''

/**
 * 网关背后跑的模型名。上游换了,这里跟着换。
 */
export const GATEWAY_MODEL = process.env.TRANSLATE_API_MODEL || 'qwen3.6'

/**
 * 网关硬上限:messages 里所有 content 的字符数之和(2026-08-04 实测 19970 通 / 25000 报 400)。
 */
export const FRIEND_INPUT_MAX = 20000

/**
 * 上游 max_tokens 封顶(不传默认 4096)。
 */
export const FRIEND_MAX_TOKENS = 8192

/**
 * 2026-08-04:主通道换成 OpenAI 兼容端点 `POST {BASE}/v1/chat/completions`。
 * 上游今天上线了标准端点,把我们之前所有的绕法都根治了。**本机实测**(逐条,非听说):
 * ✅ `max_tokens` 真生效:max_tokens=24 → finish_reason="length"、usage.completion_tokens=24。
 * → 原来那条「上游没有长度参数,别再试」的结论**已作废**(旧 /api/chat 的 num_predict 是
 * 写死 4096,请求字段根本没被读;不是我们发错了)。
 * ✅ 缓存键改成哈希完整请求:同 body 两次 = `x-cache: MISS` → `HIT`;
 * 同一段 2915 字符 filler + APPLE/BANANA 两个尾巴 → 各答各的,不再串答。
 * ✅ 输入上限 6000 → 20000 字符(按 messages 所有 content 之和算);19970 字符实测 200,25000 实测
 * 400 `context_length_exceeded`(message 里带实际字符数与上限)。
 * ✅ 标准错误结构 `{"error":{"type","message","param","code"}}`,认它的表在 `lib/error`(ERR_BY_TYPE)。
 * ❌ `/v1` 没有联网搜索(实测发 web_search/search_query 被忽略,答「无法提供实时数据」,回包也没有
 * sources)→ **webSearch 的调用一律走旧 /api/chat**(companyResearch 靠它),不是回退是唯一通道。
 */
export const PATH_V1 = '/v1/chat/completions'

/**
 * 🔴 旧 /api/chat 留作回退(他刚上线,不把全站押上去):/v1 报 upstream_error 或连不上 → 退回旧链。
 * 旧链输入上限今天也一起提到了 20000(实测 19900 通、21000 报
 * `{"detail":"prompt too long (max 20000 chars)"}`),所以回退不会因为长度二次失败。
 */
export const PATH_LEGACY = '/api/chat'

/**
 * 逐行对齐翻译走的端点(同一个网关)。
 */
export const PATH_TRANSLATE = '/api/translate'

/**
 * Ollama 的对话端点(流式与非流式同一个,靠 body 里的 stream 区分)。
 */
export const PATH_OLLAMA = '/api/chat'

/**
 * 请求头名。X-API-Key 只有旧链认;X-No-Cache 只有 /v1 认。
 */
export const HEADER = {
  /**
   * 请求和响应都用这个头名。
   */
  contentType: 'Content-Type',

  /**
   * 我们只发 JSON。
   */
  json: 'application/json',

  /**
   * 主通道的鉴权头名。
   */
  auth: 'Authorization',

  /**
   * 鉴权头的前缀,后面接钥匙。
   */
  bearer: 'Bearer ',

  /**
   * 旧链认的是另一个头名。
   */
  apiKey: 'X-API-Key',

  /**
   * 排查串答时用它绕开上游缓存。
   */
  noCache: 'X-No-Cache',

  /**
   * 上面那个头的开启值。
   */
  noCacheOn: '1',

  /**
   * 上游回的缓存命中头,值是 HIT 或 MISS。
   */
  xCache: 'x-cache',

  /**
   * 响应如果是流,content-type 里会有它。
   */
  sse: 'text/event-stream',
}

// =========================================================================
// 3. 超时与采样
// =========================================================================

/**
 * 网关内部的整通上限(调用方不传就用它)。
 */
export const GATEWAY_TIMEOUT_MS = 60_000

/**
 * 出口这两条链等得起:合成与 JD 整理都是一次调用出整段。
 */
export const FRIEND_CALL_TIMEOUT_MS = 90_000

/**
 * 对话侧的采样温度:出口沿用它,别在各调用点各写一个。
 */
export const FRIEND_STREAM_TEMP = 0.4

/**
 * Ollama 流式(对话)与非流式(抽结构化 JSON)分开:后者要的是稳定,不要发挥。
 */
export const OLLAMA_STREAM_TEMP = 0.4

/**
 * 非流式那条链压到 0.2。它用来抽结构化 JSON,要的是稳定不是发挥。
 */
export const OLLAMA_COMPLETE_TEMP = 0.2

// =========================================================================
// 4. web_fetch 工具(只 anthropic 后端)
// =========================================================================

/**
 * 官网 URL → web_fetch 工具声明(冒烟实测 2026-07-05:haiku-4-5 + web_fetch_20250910 无需 beta 头)。
 * max_uses=1 防多轮抓取,4K tokens 封住输入侧成本。
 * 🔴 `as const` 是必须的:SDK 的 ToolUnion 按 `type`/`name` 两个**字面量**认这把工具,退成 string 就对不上了。
 */
export const WEB_FETCH = {
  /**
   * SDK 按这个版本号认这把工具。
   */
  type: 'web_fetch_20250910',

  /**
   * 模型看到的工具名。
   */
  name: 'web_fetch',

  /**
   * 一轮只许抓一次,免得它反复抓。
   */
  maxUses: 1,

  /**
   * 抓回来的正文封顶,把输入侧成本压住。
   */
  maxContentTokens: 4000,
} as const

// =========================================================================
// 5. 缓存指纹与 Markdown 清理
// =========================================================================

/**
 * 🔵 **[ref:内容指纹] 前缀:/v1 上撤掉、旧 /api/chat 上保留**(2026-08-04 决定)。
 * 理由:新端点缓存键已覆盖完整请求,指纹纯属冗余(占 16 字符还进 prompt 干扰模型)。旧链这次实测
 * 「同 2000 前缀 + 不同尾巴」已经不串答了(缓存键像是全局换了),但**旧链的 bug 我们只有一次抽样**,
 * 而它现在只在回退时才走 —— 保留 16 个字符换「上游万一回滚也不会再泄别人简历」,这个保险买得起。
 * (历史:上游旧缓存键 = prompt 前 ~2000 字符 + system 前 ~512 字符 → 2026-08-04 串答事故,
 * 同一份 2400 字符 JD + 焊工/烘焙两份简历第二次直接返回第一份的分析,Pro 的 rewrite 还会外泄。)
 * 🔴 /api/translate 与 /api/chat 同坑:**上游按 text 的前 ~2000 字符做缓存键**(2026-08-04 实测,
 * 两段只有尾部不同的 2190 字符文本,第二段 cached=true 拿到第一段的译文)。额外字段(cache_key/nonce/
 * fingerprint)上游一律忽略——请求体是无类型 object,不进缓存键,实测无效。
 * 这不是话术是**协议标记**,所以归 constants 不归 i18n:模型不读它,上游的缓存键读它。
 */
export const REF_HEAD = '[ref:'

/**
 * 指纹行的收尾:一个右括号加一个换行,正文从下一行开始。
 */
export const REF_TAIL = ']\n'

/**
 * 指纹里拌进去的那一段与正文之间的分隔符。
 */
export const REF_SALT_SEP = '|'

/**
 * fnv1a 的两个种子 → 各 7 个字母(26^7 > 2^32),拼成 14 字母 ≈ 64 bit 空间。
 */
export const FNV_SEED_A = 0x811c9dc5

/**
 * 第二个种子,取的是黄金比例常数。两个种子不同,拼起来才够 64 bit 空间。
 */
export const FNV_SEED_B = 0x9e3779b9

/**
 * fnv1a 的乘数,算法定死的标准常数。
 */
export const FNV_PRIME = 0x01000193

/**
 * 一个种子摊成几个字母。
 */
export const ALPHA_LEN = 7

/**
 * 摊成字母时的进制,a 到 z 共 26 个。
 */
export const ALPHA_BASE = 26

/**
 * 'a' 的码位。
 */
export const ALPHA_ZERO = 97

/**
 * 译文里的 Markdown 装饰:上游爱加粗、爱起标题,逐行对位不要这些。
 */
export const MD_BOLD = /\*\*(.+?)\*\*/g

/**
 * 行首的 # 标题记号。要逐行匹配,所以带 m。
 */
export const MD_HEADING = /^#+\s*/gm

/**
 * 落单的 `**`,也就是上一条没配对上的那些。
 */
export const MD_STARS = /\*\*/g

// =========================================================================
// 6. 逐行对齐翻译
// =========================================================================

/**
 * 分块 ≤8 行:小批对位可靠得多,也远离 6000 字符 prompt 上限(#181 修「时灵时不灵」的第一条)。
 */
export const TRANSLATE_CHUNK = 8

/**
 * 失败块自动重试一次(吸收 ngrok 抖动)。
 */
export const TRANSLATE_TRIES = 2

/**
 * 源语种固定英文:站里要翻的原文只有英文一种。
 */
export const TRANSLATE_SOURCE = 'en'

/**
 * 按编号切:`[1] …` —— 指纹那行纯字母匹配不到它,天然落在 parts[0] 被丢弃。
 */
export const NUMBERED_SPLIT = /\n?\[(\d+)\]\s*/

/**
 * 编号行的形状。
 */
export const NUMBER_HEAD = '['

/**
 * 编号后面那个「] 」,把编号和正文隔开。
 */
export const NUMBER_TAIL = '] '

// =========================================================================
// 7. 旧链与 SSE 的零碎
// =========================================================================

/**
 * 旧链的来源列表最多留几条。
 */
export const LEGACY_SOURCE_MAX = 6

/**
 * SSE 的块分隔与行首标记。
 */
export const SSE_BLOCK_SEP = '\n\n'

/**
 * 一块之内的行分隔。
 */
export const SSE_LINE_SEP = '\n'

/**
 * SSE 数据行的行首。不是以它开头的行一律跳过。
 */
export const SSE_DATA = 'data:'

/**
 * `data:` 的长度,切掉前缀时用。
 */
export const SSE_DATA_LEN = 5

/**
 * 上游发完时的收尾行,它不是内容。
 */
export const SSE_DONE = '[DONE]'

// =========================================================================
// 5. 字面量(functions.ts 里不许有裸字符串)
// =========================================================================

/**
 * HTTP 方法。三条链发的都是 POST。
 */
export const POST = 'POST'

/**
 * 消息角色。`system` 在三个后端的待遇各不相同(friend 合并成一段、anthropic 拆到顶层参数),
 * 所以判它的地方有好几处 —— 更要收在一个名字下。
 */
export const ROLE = {
  /**
   * 系统提示。
   */
  system: 'system',

  /**
   * 用户轮。
   */
  user: 'user',
} as const

/**
 * 内容块的种类。SDK 回的块里混着工具块,只取文本那一种。
 */
export const BLOCK_TEXT = 'text'

/**
 * 段与段之间。friend 那条链把多轮压成一段 prompt,用它分隔。
 */
export const PARA = '\n\n'

/**
 * 走的是哪条链 —— 只进日志与返回值,给排查用。
 */
export const VIA = {
  /**
   * 主通道,OpenAI 兼容端点。
   */
  v1: 'v1',

  /**
   * 回退的旧链。
   */
  legacy: 'legacy',
} as const

/**
 * 上游 `x-cache` 头命中缓存时的值。
 */
export const CACHE_HIT = 'HIT'

/**
 * 三个后端的名字。`LLM_PROVIDER` 与调用方的 `provider` 参数认的都是它们。
 */
export const BACKEND = {
  /**
   * 朋友的网关。
   */
  friend: 'friend',

  /**
   * 云模型。
   */
  anthropic: 'anthropic',
}

/**
 * 联网抓取只放行这两种协议。别的一律不抓 —— 那是信任边界。
 */
export const PROTOCOL = {
  /**
   * 明文。
   */
  http: 'http:',

  /**
   * 加密。
   */
  https: 'https:',
}

/**
 * SDK 的流事件名。
 */
export const STREAM_EVENT = {
  /**
   * 又来了一段正文。
   */
  text: 'text',

  /**
   * 流完了。
   */
  end: 'end',

  /**
   * 流炸了。
   */
  error: 'error',
} as const

/**
 * 模型自己拒答时上游给的停止原因。**不是我们这侧的错。**
 */
export const STOP_REFUSAL = 'refusal'

/**
 * 去 markdown 时保留第一个捕获组。
 */
export const KEEP_GROUP1 = '$1'

/**
 * 停摆(不是硬超时)。看门狗用它区分两种掐断,报给用户的话也不一样。
 */
export const STALL = 'stall'

/**
 * 缺节行（原样保留不进翻译）。
 */
export const NOT_STATED_RE = /^\(not stated\)$/i

/**
 * 子弹行前缀（JD 整理版；剥下保管只翻正文）。
 */
export const BULLET_RE = /^(-\s+)(.*)$/

/**
 * 剥下的子弹前缀回拼时的写法。
 */
export const BULLET_PREFIX = '- '

/**
 * 译文全部落空 = 服务整体不可用的报错文案。
 */
export const E_TRANSLATE_UNAVAILABLE = 'translate unavailable'

/**
 * 速读最短长度（短于它 = 没内容）。
 */
export const SUMMARY_MIN_LEN = 10

/**
 * 速读喂给模型的正文截断。
 */
export const SUMMARY_BODY_CAP = 8000

/**
 * 新闻翻译的正文预算（与 ETL 同口径：超长稿只翻前 N 整段，尾段只显英文不错位）。
 */
export const NEWS_BODY_CAP = 10000

/**
 * 段落切分（空行分段）。
 */
export const PARA_SPLIT_RE = /\n{2,}/

/**
 * 段间拼回的分隔。
 */
export const PARA_JOIN = '\n\n'

/**
 * 翻译类路由的单次总超时（ms）。
 */
export const TRANSLATE_ROUTE_TIMEOUT_MS = 90000

/**
 * 错误体：翻译链 env 没配（co/jd/noc/summarize 的文案）。
 */
export const E_NOT_CONFIGURED = 'not configured'

/**
 * 错误体：翻译链 env 没配（news-translate 的旧文案，前端分支已在吃）。
 */
export const E_TRANSLATE_NOT_CONFIGURED = 'translate not configured'

/**
 * 错误体：参数形状不对。
 */
export const E_BAD_REQUEST = 'bad request'

/**
 * 错误体：库里没这条。
 */
export const E_NOT_FOUND = 'not found'

/**
 * 错误体：IP 日限撞顶。
 */
export const E_RATE_LIMITED = 'rate limited'

/**
 * 错误体：summary_en 列未建（DDL4 未跑）时英文速读暂不可用。
 */
export const E_COL_NOT_READY = 'column not ready'

/**
 * 翻译目标语白名单（zh/ko；速读另收 en）。
 */
export const TRANS_LANGS: string[] = ['zh', 'ko']

/**
 * 速读语种白名单。
 */
export const SUM_LANGS: string[] = ['zh', 'ko', 'en']

/**
 * 公司简介缓存键里 name 与 lang 的分隔。
 */
export const TRANS_KEY_SEP = ':'
