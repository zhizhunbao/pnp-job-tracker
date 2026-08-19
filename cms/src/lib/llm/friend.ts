// 朋友的模型服务(ngrok FastAPI → qwen3.6)通用调用:JD 整理(J2)/公司调查(K)/简历对照(G3)共用。
// env 复用 news 懒翻译同款 TRANSLATE_API_BASE / TRANSLATE_API_KEY;未配置 → null(调用方降级)。
// 红线:这里只管传输;内容校验(不得新增数字/URL 等)在各调用方做。
//
// ── 2026-08-04:主通道换成 OpenAI 兼容端点 `POST {BASE}/v1/chat/completions` ──────────────
// 上游今天上线了标准端点,把我们之前所有的绕法都根治了。**本机实测**(逐条,非听说):
//   ✅ `max_tokens` 真生效:max_tokens=24 → finish_reason="length"、usage.completion_tokens=24。
//      → 文件里原来那条「上游没有长度参数,别再试」的结论**已作废**(旧 /api/chat 的 num_predict 是
//        写死 4096,请求字段根本没被读;不是我们发错了)。
//   ✅ 缓存键改成哈希完整请求:同 body 两次 = `x-cache: MISS` → `HIT`;
//      同一段 2915 字符 filler + APPLE/BANANA 两个尾巴 → 各答各的,不再串答。
//   ✅ 输入上限 6000 → 20000 字符(按 messages 所有 content 之和算);19970 字符实测 200,25000 实测
//      400 `context_length_exceeded`(message 里带实际字符数与上限)。
//   ✅ 标准错误结构 `{"error":{"type","message","param","code"}}`,见下面 mapErr。
//   ❌ **/v1 没有联网搜索**(实测发 web_search/search_query 被忽略,答「无法提供实时数据」,回包也没有
//      sources)→ **webSearch 的调用一律走旧 /api/chat**(companyResearch 靠它),不是回退是唯一通道。
//
// 🔵 **流式**(2026-08-04 加,`onDelta`):`stream:true` 上游真支持,本机实测两态 ——
//    MISS 逐字吐(首块 ~650ms,总 1.3s/35 块)、HIT 也走 SSE 但整段在一个 delta 里(~300ms),末尾都有 `data: [DONE]`。
//    仍留「上游回 JSON」的一次性分支兜底(网关版本变了不至于整段丢),外加空答案原地非流式重来一次。
//
// 🔴 **旧 /api/chat 留作回退**(他刚上线,不把全站押上去):/v1 报 upstream_error 或连不上 → 退回旧链,
//    留痕日志 `[friendLlm] v1→legacy`。旧链输入上限今天也一起提到了 20000(实测 19900 通、21000 报
//    `{"detail":"prompt too long (max 20000 chars)"}`),所以回退不会因为长度二次失败。
//
// 🔵 **[ref:内容指纹] 前缀:/v1 上撤掉、旧 /api/chat 上保留**(2026-08-04 决定)。
//    理由:新端点缓存键已覆盖完整请求,指纹纯属冗余(占 16 字符还进 prompt 干扰模型)。旧链这次实测
//    「同 2000 前缀 + 不同尾巴」已经不串答了(缓存键像是全局换了),但**旧链的 bug 我们只有一次抽样**,
//    而它现在只在回退时才走 —— 保留 16 个字符换「上游万一回滚也不会再泄别人简历」,这个保险买得起。
//    contentTag/refPrompt 继续导出:lineTranslate 与 news-summarize 直连旧端点,仍靠它。
//    (历史:上游旧缓存键 = prompt 前 ~2000 字符 + system 前 ~512 字符 → 2026-08-04 串答事故,
//     同一份 2400 字符 JD + 焊工/烘焙两份简历第二次直接返回第一份的分析,Pro 的 rewrite 还会外泄。)

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''
const MODEL = process.env.TRANSLATE_API_MODEL || 'qwen3.6'

export const friendLlmReady = () => Boolean(BASE && KEY)

/** 网关硬上限:messages 里所有 content 的字符数之和(2026-08-04 实测 19970 通 / 25000 报 400)。 */
export const FRIEND_INPUT_MAX = 20000
/** 上游 max_tokens 封顶(不传默认 4096)。 */
const FRIEND_MAX_TOKENS = 8192

export type FriendErrCode =
  | 'offline'      // 未配置 env / 连不上 / DNS 挂了(旧链也没救)
  | 'tooLong'      // 输入超 FRIEND_INPUT_MAX(本地预检 或 上游 context_length_exceeded)
  | 'timeout'      // 我们这侧 abort 或上游 upstream_timeout(504)
  | 'upstream'     // 上游模型炸了(502 upstream_error)——回退也失败才会抛出来
  | 'authKey'      // key 错/缺(401 invalid_api_key)= 运维问题,重试没用
  | 'badRequest'   // 400 invalid_request_error = 我们发的 body 不对,是 bug
  | 'empty'        // 200 但答案是空串

export class FriendLlmError extends Error {
  constructor(public code: FriendErrCode, msg: string) {
    super(msg)
    this.name = 'FriendLlmError'
  }
}

type FriendResult = {
  answer: string
  sources: string[]
  cached: boolean
  /** 走的哪条链:v1 = 新 OpenAI 兼容端点,legacy = 旧 /api/chat(webSearch 或回退) */
  via: 'v1' | 'legacy'
  /** 新端点的 `x-cache` 响应头原值(HIT|MISS);旧链没这个头 → null */
  xCache: string | null
}

// 内容指纹:fnv1a 两个种子 → 各 7 个字母(26^7 > 2^32),拼成 14 字母 ≈ 64 bit 空间。
// 自己实现不引依赖;**只用 a-z 不带数字** —— jdformat 的防幻觉校验会拒收原文没有的多位数字,
// 万一模型把指纹回显出来,纯字母不会误伤那条校验。
function fnv1a(s: string, seed: number): number {
  let h = seed
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h = Math.imul(h ^ (c & 0xff), 0x01000193)
    h = Math.imul(h ^ (c >>> 8), 0x01000193)
  }
  return h >>> 0
}
function alpha7(n: number): string {
  let s = ''
  for (let i = 0, x = n; i < 7; i++, x = Math.floor(x / 26)) s += String.fromCharCode(97 + (x % 26))
  return s
}
export const contentTag = (s: string): string => alpha7(fnv1a(s, 0x811c9dc5)) + alpha7(fnv1a(s, 0x9e3779b9))

// 内容指纹钉在 prompt @0:**只给旧 /api/chat 那条链用**(见文件头 🔵)。
// 标记形状与 /api/translate 那侧统一([ref:…]),纯字母不含数字(不误伤 jdformat 的数字防幻觉校验)。
// 直连 /api/chat 的调用方(news-summarize)也用这个,别各写各的。
export const refPrompt = (prompt: string, system?: string): string =>
  `[ref:${contentTag(prompt + '|' + (system ?? ''))}]\n${prompt}`

type FriendChatOpts = {
  prompt: string
  system?: string
  /** 联网搜索:/v1 不支持 → 强制走旧 /api/chat(见文件头) */
  webSearch?: boolean
  searchQuery?: string
  timeoutMs?: number
  /** 输出长度上限(/v1 真生效;旧链忽略)。不传 = 上游默认 4096 */
  maxTokens?: number
  /** 采样温度(/v1 生效;旧链忽略)。不传 = 上游默认 0.4。要确定性的场景显式传低值 */
  temperature?: number
  /** 绕开上游缓存(排查串答用):/v1 发 X-No-Cache 头 + body cache:false */
  noCache?: boolean
  /**
   * 流式增量回调(**只 /v1 支持**;传了就发 `stream:true`,回调按上游吐的块逐段给)。
   * 传不传都返回完整 answer —— 调用方可以只拿它测首字延迟,不改变返回契约。
   * ⚠️ `stream:true` 进 body = 进上游缓存键,所以流式与非流式各缓存一份(第一次切过去必然 MISS)。
   */
  onDelta?: (chunk: string) => void
  /**
   * 停摆上限:**连着这么久一个字都没吐** → abort 整个请求,报 `timeout`(2026-08-09 加)。
   * 与 timeoutMs 的分工:timeoutMs 是「整通电话最长多久」,stallMs 是「多久没听见对方出声」。
   * 🔴 为什么非有它不可:timeoutMs 只管到**响应头到手**(postJson 的 finally 当场 clearTimeout),
   *    SSE body 那一段此前**一点上限都没有** —— 上游把头发回来再卡住,我们就一直读到天荒地老。
   *    Frank 实撞的 112.7s(chat_logs id132,朋友 qwen 冷启/单队列;热身后 9-11s)就卡在这种「还连着但不出声」上。
   * 不传 = 不装看门狗,行为与今天一字不差。
   */
  stallMs?: number
}

/**
 * 看门狗:一个 AbortController 同时挂两个闸 —— 硬上限(timeoutMs,只响一次)与停摆(stallMs,每有动静就重置)。
 * 两个闸共用同一个 signal,所以**它管得住整通请求**:等响应头那段、以及读 SSE body 那段。
 * `why()` 只为日志分得清是「整通太久」还是「中途没动静」——错误码两者都是 timeout(调用方按同一条路降级)。
 */
type Watch = ReturnType<typeof makeWatch>
function makeWatch(o: { timeoutMs: number; stallMs?: number }) {
  const ctrl = new AbortController()
  let why: 'timeout' | 'stall' | null = null
  const hard = setTimeout(() => { why ??= 'timeout'; ctrl.abort() }, o.timeoutMs)
  let soft: ReturnType<typeof setTimeout> | null = null
  const arm = () => {
    if (!o.stallMs || o.stallMs <= 0) return
    if (soft) clearTimeout(soft)
    soft = setTimeout(() => { why ??= 'stall'; ctrl.abort() }, o.stallMs)
  }
  arm()
  return {
    signal: ctrl.signal,
    /** 收到一块**真内容**就喂一次(心跳/空 delta 不算动静,否则看门狗就白装了) */
    kick: arm,
    stop() { clearTimeout(hard); if (soft) clearTimeout(soft) },
    why: () => why,
    label: () => (why === 'stall' ? `stalled ${o.stallMs}ms` : `aborted after ${o.timeoutMs}ms`),
  }
}

// 上游标准错误结构 → 我们的错误码。认不出的按 HTTP 状态兜底。
function mapErr(status: number, body: string): FriendLlmError {
  let type = ''
  let message = ''
  try {
    const e = JSON.parse(body)?.error
    type = String(e?.type || e?.code || '')
    message = String(e?.message || '')
    // 旧链没换错误结构,还是 {"detail":"prompt too long (max 20000 chars)"} —— 单独认一下,
    // 否则回退链上的超长会被当成 badRequest,用户侧又变回一句笼统的「稍后再试」。
    if (!type) {
      const detail = String(JSON.parse(body)?.detail || '')
      if (/too long/i.test(detail)) { type = 'context_length_exceeded'; message = detail }
    }
  } catch {
    /* 非 JSON 回包,下面按状态兜底 */
  }
  const byType: Record<string, FriendErrCode> = {
    context_length_exceeded: 'tooLong',
    upstream_timeout: 'timeout',
    upstream_error: 'upstream',
    invalid_api_key: 'authKey',
    invalid_request_error: 'badRequest',
  }
  const byStatus: Record<number, FriendErrCode> = { 400: 'badRequest', 401: 'authKey', 403: 'authKey', 502: 'upstream', 504: 'timeout' }
  const code = byType[type] || byStatus[status] || 'upstream'
  return new FriendLlmError(code, `${status} ${type || 'http_error'}${message ? `: ${message.slice(0, 200)}` : ''}`)
}

// 🔴 定时器**不在这儿 clear**:响应头到手只是开头,body 还要读(见 Watch 头上那段)。
//    由调用方在整通请求真的收尾时 watch.stop() —— 这正是 112s 那个口子的补法。
async function postJson(path: string, body: unknown, headers: Record<string, string>, watch: Watch) {
  try {
    return await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, ...headers },
      body: JSON.stringify(body),
      signal: watch.signal,
    })
  } catch (e) {
    // abort 与网络错都落这;分开报码,调用方才能「各说各话」(超时可重试 / 掉线别重试)
    throw new FriendLlmError(watch.signal.aborted ? 'timeout' : 'offline',
      watch.signal.aborted ? watch.label() : `network: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/**
 * SSE 解流:`data: {"choices":[{"delta":{"content":"…"}}]}` 逐块 → 累积成整段,同时喂 onDelta。
 * 2026-08-04 本机实测上游两种形态,都在这一个解析器里吃掉:
 *   MISS：几十个块逐字吐(首块 ~650ms,role 那块 content 是空串)、末块 finish_reason=stop、收 `data: [DONE]`;
 *   HIT ：**照样是 SSE**,但整段答案在**一个** delta 里一次给完(~300ms)。
 * 半块粘包按 `\n\n` 切、剩余留 buf —— 解不动的行直接跳过(宁可少一块,不许把整段扔了)。
 */
async function readV1Sse(body: ReadableStream<Uint8Array>, watch: Watch, onDelta?: (s: string) => void): Promise<string> {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let out = ''
  for (;;) {
    let value: Uint8Array | undefined
    let done: boolean
    try {
      ({ value, done } = await reader.read())
    } catch (e) {
      // 看门狗掐断的流 → 报 timeout(和「一直没等到响应头」同码,调用方一条路降级)
      if (watch.signal.aborted) throw new FriendLlmError('timeout', `stream ${watch.label()} after ${out.length}ch`)
      throw e
    }
    if (done) break
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split('\n\n')
    buf = blocks.pop() ?? ''
    for (const b of blocks) {
      for (const line of b.split('\n')) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          const c = JSON.parse(raw)?.choices?.[0]
          const t = String(c?.delta?.content ?? c?.message?.content ?? '')
          // 有真内容才算「出声」:心跳行/空 delta 不喂看门狗,否则一个还在心跳但不出字的流能吊住我们一辈子
          if (t) { out += t; onDelta?.(t); watch.kick() }
        } catch { /* 半块/心跳行:跳过 */ }
      }
    }
  }
  return out
}

// ── 主通道:OpenAI 兼容端点 ──
async function chatV1(o: FriendChatOpts): Promise<FriendResult> {
  const messages = [
    ...(o.system ? [{ role: 'system', content: o.system }] : []),
    { role: 'user', content: o.prompt },
  ]
  // 信任边界校验:超限本地就拦(省一趟网络,且能报出确切字符数)——别等上游 400 再猜
  const chars = messages.reduce((n, m) => n + m.content.length, 0)
  if (chars > FRIEND_INPUT_MAX) {
    throw new FriendLlmError('tooLong', `input ${chars} chars > gateway max ${FRIEND_INPUT_MAX}`)
  }
  let watch = makeWatch({ timeoutMs: o.timeoutMs ?? 60_000, stallMs: o.stallMs })
  const send = (stream: boolean) => postJson('/v1/chat/completions', {
    model: MODEL,
    messages,
    ...(stream ? { stream: true } : {}),
    ...(o.maxTokens ? { max_tokens: Math.min(o.maxTokens, FRIEND_MAX_TOKENS) } : {}),
    ...(o.temperature != null ? { temperature: o.temperature } : {}),
    ...(o.noCache ? { cache: false } : {}),
  }, o.noCache ? { 'X-No-Cache': '1' } : {}, watch)

  let answer = ''
  let d: any = null
  let xCache: string | null = null
  let streamed = false
  try {
    let res = await send(Boolean(o.onDelta))
    if (!res.ok) throw mapErr(res.status, await res.text().catch(() => ''))
    xCache = res.headers.get('x-cache')
    // 兜底①:要了流,上游却回 JSON(命中网关缓存时可能直接吐整段)—— 按一次性解,onDelta 补发一次。
    // 兜底②:流解出来是空的 —— **绝不把空答案交出去**,原地非流式重来一次(数据丢失处理不上砧板)。
    streamed = Boolean(o.onDelta) && (res.headers.get('content-type') || '').includes('text/event-stream') && !!res.body
    if (streamed) {
      answer = (await readV1Sse(res.body!, watch, o.onDelta)).trim()
      if (!answer) {
        console.log(`[friendLlm] v1 stream empty (x-cache=${xCache ?? '-'}) → retry non-stream`)
        watch.stop()                                    // 重来一次 = 重新计时,别让第一趟的余额把补救掐死
        watch = makeWatch({ timeoutMs: o.timeoutMs ?? 60_000, stallMs: o.stallMs })
        res = await send(false)
        if (!res.ok) throw mapErr(res.status, await res.text().catch(() => ''))
        xCache = res.headers.get('x-cache')
        d = await res.json().catch(() => null)
        answer = String(d?.choices?.[0]?.message?.content ?? '').trim()
      }
    } else {
      d = await res.json().catch(() => null)
      answer = String(d?.choices?.[0]?.message?.content ?? '').trim()
      if (answer) o.onDelta?.(answer)
    }
  } finally {
    watch.stop()
  }
  if (!answer) throw new FriendLlmError('empty', `empty choices (x-cache=${xCache ?? '-'})`)
  const u = d?.usage
  console.log(`[friendLlm] v1 ok stream=${streamed} x-cache=${xCache ?? '-'} in=${chars}ch out=${answer.length}ch tok=${u?.prompt_tokens ?? '?'}/${u?.completion_tokens ?? '?'} fr=${d?.choices?.[0]?.finish_reason ?? '?'}`)
  return { answer, sources: [], cached: xCache === 'HIT', via: 'v1', xCache }
}

// ── 旧链 /api/chat:webSearch 的唯一通道 + /v1 挂掉时的回退。[ref:] 指纹在这条链上保留 ──
async function chatLegacy(o: FriendChatOpts): Promise<FriendResult> {
  // 旧链是一次性 JSON,没有增量可言 → 只挂硬上限,不装停摆闸(stallMs 在这条链上没有语义)。
  // 硬上限一直管到 body 读完:头到手就撤掉看门狗,等于把「读一半卡住」这段又放生了(v1 那边刚补的就是这个)。
  const watch = makeWatch({ timeoutMs: o.timeoutMs ?? 60_000 })
  let d: any = null
  try {
    const res = await postJson('/api/chat', {
      prompt: refPrompt(o.prompt, o.system),
      ...(o.system ? { system: o.system } : {}),
      ...(o.webSearch ? { web_search: true } : {}),
      ...(o.searchQuery ? { search_query: o.searchQuery } : {}),
    }, { 'X-API-Key': KEY }, watch)
    if (!res.ok) throw mapErr(res.status, await res.text().catch(() => ''))
    d = await res.json().catch(() => null)
  } finally {
    watch.stop()
  }
  const answer = String(d?.answer ?? '').trim()
  if (!answer) throw new FriendLlmError('empty', 'empty answer')
  const sources = Array.isArray(d?.sources)
    ? d.sources.map((s: any) => String(s?.url || s || '')).filter(Boolean).slice(0, 6)
    : []
  console.log(`[friendLlm] legacy ok cached=${d?.cached === true} in=${o.prompt.length}ch out=${answer.length}ch websearch=${d?.web_search_used === true}`)
  return { answer, sources, cached: d?.cached === true, via: 'legacy', xCache: null }
}

/**
 * 会抛错的版本:失败一律 FriendLlmError(带 code),调用方按码各说各话。
 * webSearch → 只走旧链;否则 /v1 优先,upstream/offline 才回退旧链(tooLong/authKey/badRequest 不回退:
 * 旧链同样会失败,退了只是把错误换个说法)。
 */
export async function friendChatOrThrow(o: FriendChatOpts): Promise<FriendResult> {
  if (!friendLlmReady()) throw new FriendLlmError('offline', 'TRANSLATE_API_BASE/KEY not configured')
  if (o.webSearch) return chatLegacy(o)
  try {
    return await chatV1(o)
  } catch (e) {
    const code = e instanceof FriendLlmError ? e.code : 'upstream'
    if (code !== 'upstream' && code !== 'offline') throw e
    // 留痕:回退是异常态,不能静默发生(下次排查得看得见走的哪条链)
    console.log(`[friendLlm] v1 fail code=${code} (${e instanceof Error ? e.message.slice(0, 160) : ''}) → fallback legacy /api/chat`)
    try {
      return await chatLegacy(o)
    } catch (e2) {
      console.log(`[friendLlm] legacy fallback also failed: ${e2 instanceof Error ? e2.message.slice(0, 160) : ''}`)
      throw e2
    }
  }
}

/**
 * 老签名(失败静默 null),现有调用方零改动:jdformat / companyResearch / advisor 的降级路径靠它。
 * 要错误码的调用方(简历对照)用 friendChatOrThrow。
 */
export async function friendChat(o: FriendChatOpts): Promise<FriendResult | null> {
  return friendChatOrThrow(o).catch(() => null)
}
