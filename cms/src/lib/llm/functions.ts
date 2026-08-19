/**
 * 模型域的全部行为:内容指纹、看门狗、朋友网关的两条链、三个后端的出口、逐行对齐翻译。
 * 造错、判错、留痕都**不在本文件**:失败在 `@/lib/error`(不用 class,身份挂 name),
 * 日志字面量在 `@/lib/log`。这里只剩「什么时候抛、什么时候记」。
 *
 * @author Frank
 * @time 2026-08-19 06:32:21
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  ERR_DEFAULT, FRIEND_MSG, LLM_MSG, TRANSLATE_TIMEOUT, UPSTREAM_HEAD, gatewayError, gatewayErrorOf,
  isGatewayError, llmError, translateError,
} from '@/lib/error'
import { LLM_FN, LLM_LOG, LOG_MSG_MAX, log } from '@/lib/log'
import {
  ALPHA_BASE, ALPHA_LEN, ALPHA_ZERO, ANTHROPIC_MODEL,
  FNV_PRIME, FNV_SEED_A, FNV_SEED_B, FRIEND_CALL_TIMEOUT_MS, FRIEND_INPUT_MAX, FRIEND_MAX_TOKENS,
  FRIEND_STREAM_TEMP, GATEWAY_BASE, GATEWAY_KEY, GATEWAY_MODEL, GATEWAY_TIMEOUT_MS, HEADER,
  LEGACY_SOURCE_MAX, MD_BOLD, MD_HEADING, MD_STARS,
  NUMBERED_SPLIT, NUMBER_HEAD, NUMBER_TAIL, OLLAMA_COMPLETE_TEMP, OLLAMA_MODEL, OLLAMA_STREAM_TEMP,
  OLLAMA_URL, PATH_LEGACY, PATH_OLLAMA, PATH_TRANSLATE, PATH_V1, PROVIDER, REF_HEAD, REF_SALT_SEP, REF_TAIL,
  SSE_BLOCK_SEP, SSE_DATA, SSE_DATA_LEN, SSE_DONE, SSE_LINE_SEP, TRANSLATE_CHUNK, TRANSLATE_SOURCE,
  TRANSLATE_TRIES, WEB_FETCH,
} from './constants'
import type {
  Alpha7In, Alpha7Out, AnthropicMessage, AnthropicParams, AnthropicStreamIn, AnthropicStreamParams,
  BackendStreamIn, BackendStreamOut, CharCountIn, CharCountOut, CompleteBackendIn, CompleteBackendOut,
  CompleteFriendIn, CompleteTextIn, CompleteTextOut, ContentTagIn, ContentTagOut, Fnv1aIn, Fnv1aOut,
  FriendChatIn, FriendChatMaybeOut, FriendChatOut, FriendLlmReadyOut, FriendResult,
  GatewayMessage, GatewayMessagesIn, GatewayMessagesOut, LegacyRequest, LegacyResponse,
  MakeWatchIn, NumberLinesIn, NumberLinesOut,
  OllamaRequest, OllamaResponse, ParseNumberedIn, ParseNumberedOut, PostJsonIn, PostJsonOut, ReadV1SseIn,
  ReadV1SseOut, RefPromptIn, RefPromptOut, SendV1In, SendV1Out, SourceUrlIn, SourceUrlOut, SplitMessagesIn,
  SplitMessagesOut, StreamChatIn, StreamChatOut, StripMdIn, StripMdOut, SystemOfIn, SystemOfOut, TextOfIn,
  TextOfOut, TranslateChunkIn, TranslateChunkOut, TranslateLinesIn, TranslateLinesOut, TranslateReadyOut,
  TranslateResponse, TurnsOfIn, TurnsOfOut, V1Choice, V1Request, V1Response, Watch, WatchWhy, WebFetchToolIn,
  WebFetchToolOut,
} from './types'

// =========================================================================
// 1. 读回包时的三个兜底
// =========================================================================

/**
 * 回包读不出来时的兜底:详情丢了不该连 HTTP 状态一起盖掉。
 *
 * @returns 空串。
 */
function emptyText(): string {
  return ''
}

/**
 * JSON 解不出来时返回 null,调用方按字段缺失兜底。
 *
 * @returns null。
 */
function nullJson(): null {
  return null
}

/**
 * 取消读流失败无所谓 —— 我们已经在离开了。
 *
 * @returns 什么都不做。
 */
function ignore(): void {
  return
}

// =========================================================================
// 2. 内容指纹
// =========================================================================

/**
 * 自己实现不引依赖;**只用 a-z 不带数字** —— jdformat 的防幻觉校验会拒收原文没有的多位数字,
 * 万一模型把指纹回显出来,纯字母不会误伤那条校验。
 *
 * @param input 要算的内容与种子。
 * @returns 32 位无符号哈希值。
 */
function fnv1a(input: Fnv1aIn): Fnv1aOut {
  let h = input.seed
  for (let i = 0; i < input.text.length; i++) {
    const c = input.text.charCodeAt(i)
    h = Math.imul(h ^ (c & 0xff), FNV_PRIME)
    h = Math.imul(h ^ (c >>> 8), FNV_PRIME)
  }
  return h >>> 0
}

/**
 * 一个 32 位数摊成 7 个字母。
 *
 * @param input 要摊开的那个数。
 * @returns 7 个小写字母。
 */
function alpha7(input: Alpha7In): Alpha7Out {
  let s = ''
  for (let i = 0, x = input.n; i < ALPHA_LEN; i++, x = Math.floor(x / ALPHA_BASE)) {
    s += String.fromCharCode(ALPHA_ZERO + (x % ALPHA_BASE))
  }
  return s
}

/**
 * 两个种子拼成 14 字母 ≈ 64 bit 空间。
 *
 * @param input 要算指纹的内容。
 * @returns 14 个字母的指纹。
 */
export function contentTag(input: ContentTagIn): ContentTagOut {
  return alpha7({ n: fnv1a({ text: input.text, seed: FNV_SEED_A }) })
    + alpha7({ n: fnv1a({ text: input.text, seed: FNV_SEED_B }) })
}

/**
 * 内容指纹钉在 prompt @0:**只给旧 /api/chat 那条链用**(见 constants 第 5 段)。
 * 标记形状与 /api/translate 那侧统一([ref:…]),纯字母不含数字(不误伤 jdformat 的数字防幻觉校验)。
 * 直连 /api/chat 的调用方(news-summarize)也用这个,别各写各的。
 * 🔵 收拢掉的第二处重复:旧链的 `refPrompt(prompt, system)` 与翻译链的 `refLine(text, lang)` 逐字同形
 * —— 差别只是拌进指纹的那一段是 system 还是语种,于是它变成了这里的 salt。
 *
 * @param input 正文,以及拌进指纹但不进正文的那一段。
 * @returns 指纹行加正文,中间隔一个换行。
 */
export function refPrompt(input: RefPromptIn): RefPromptOut {
  const tag = contentTag({ text: input.prompt + REF_SALT_SEP + input.salt })
  return `${REF_HEAD}${tag}${REF_TAIL}${input.prompt}`
}

// =========================================================================
// 3. 看门狗
// =========================================================================

/**
 * 一个 AbortController 同时挂两个闸 —— 硬上限(timeoutMs,只响一次)与停摆(stallMs,每有动静就重置)。
 * 两个闸共用同一个 signal,所以**它管得住整通请求**:等响应头那段、以及读 SSE body 那段。
 *
 * @param input 两个闸的毫秒数;停摆闸不传就不装。
 * @returns 看门狗。整通请求收尾时必须调它的 stop()。
 */
function makeWatch(input: MakeWatchIn): Watch {
  const ctrl = new AbortController()
  let cause: WatchWhy = null
  const hard = setTimeout(function onHard() { cause ??= 'timeout'; ctrl.abort() }, input.timeoutMs)
  let soft: ReturnType<typeof setTimeout> | null = null
  // 给停摆闸上弦。每有动静重上一次;没配 stallMs 时它什么都不做。
  function arm(): void {
    if (!input.stallMs || input.stallMs <= 0) return
    if (soft) clearTimeout(soft)
    soft = setTimeout(function onSoft() { cause ??= 'stall'; ctrl.abort() }, input.stallMs)
  }
  arm()
  return {
    signal: ctrl.signal,
    kick: arm,
    stop() { clearTimeout(hard); if (soft) clearTimeout(soft) },
    why() { return cause },
    label() { return cause === 'stall' ? `stalled ${input.stallMs}ms` : `aborted after ${input.timeoutMs}ms` },
  }
}

// =========================================================================
// 4. 网关传输
// =========================================================================

/**
 * 🔴 定时器**不在这儿 clear**:响应头到手只是开头,body 还要读。
 * 由调用方在整通请求真的收尾时 watch.stop() —— 这正是 112s 那个口子的补法(说明见 types.ts 的 Watch)。
 *
 * @param input 端点、请求体、额外的头、看门狗。
 * @returns 原始响应。连不上或被掐断时抛 GatewayFailure。
 */
async function postJson(input: PostJsonIn): PostJsonOut {
  const headers: Record<string, string> = {
    [HEADER.contentType]: HEADER.json,
    [HEADER.auth]: HEADER.bearer + GATEWAY_KEY,
  }
  for (const name of Object.keys(input.extraHeaders)) headers[name] = input.extraHeaders[name]
  try {
    return await fetch(`${GATEWAY_BASE}${input.path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
      signal: input.watch.signal,
    })
  } catch (e) {
    // abort 与网络错都落这;分开报码,调用方才能「各说各话」(超时可重试 / 掉线别重试)
    if (input.watch.signal.aborted) throw gatewayError({ msg: input.watch.label(), code: 'timeout' })
    throw gatewayError({ msg: `network: ${e instanceof Error ? e.message : String(e)}`, code: 'offline' })
  }
}

/**
 * SSE 解流:`data: {"choices":[{"delta":{"content":"…"}}]}` 逐块 → 累积成整段,同时喂 onDelta。
 * 🔵 2026-08-04 本机实测上游两种形态,都在这一个解析器里吃掉:
 * MISS:几十个块逐字吐(首块 ~650ms,role 那块 content 是空串)、末块 finish_reason=stop、收 `data: [DONE]`;
 * HIT :**照样是 SSE**,但整段答案在**一个** delta 里一次给完(~300ms)。
 * 半块粘包按 `\n\n` 切、剩余留 buf —— 解不动的行直接跳过(宁可少一块,不许把整段扔了)。
 *
 * @param input 响应体、看门狗、可选的增量回调。
 * @returns 拼完的整段答案。被掐断时抛 GatewayFailure。
 */
async function readV1Sse(input: ReadV1SseIn): ReadV1SseOut {
  const reader = input.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let out = ''
  for (; ;) {
    let value: Uint8Array | undefined
    let done: boolean
    try {
      ({ value, done } = await reader.read())
    } catch (e) {
      // 看门狗掐断的流 → 报 timeout(和「一直没等到响应头」同码,调用方一条路降级)
      if (input.watch.signal.aborted) {
        throw gatewayError({ msg: `stream ${input.watch.label()} after ${out.length}ch`, code: 'timeout' })
      }
      throw e
    }
    if (done) break
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split(SSE_BLOCK_SEP)
    buf = blocks.pop() ?? ''
    for (const block of blocks) {
      for (const line of block.split(SSE_LINE_SEP)) {
        if (!line.startsWith(SSE_DATA)) continue
        const raw = line.slice(SSE_DATA_LEN).trim()
        if (!raw || raw === SSE_DONE) continue
        try {
          const parsed: V1Response = JSON.parse(raw)
          const choice: V1Choice | undefined = parsed?.choices?.[0]
          const t = String(choice?.delta?.content ?? choice?.message?.content ?? '')
          // 有真内容才算「出声」:心跳行/空 delta 不喂看门狗,否则一个还在心跳但不出字的流能吊住我们一辈子
          if (t) { out += t; input.onDelta?.(t); input.watch.kick() }
        } catch { /* 半块/心跳行:跳过 */ }
      }
    }
  }
  return out
}

// =========================================================================
// 5. 朋友网关的两条链
// =========================================================================

/**
 * 网关能不能用:地址和钥匙都配了才算。
 *
 * @returns 地址与钥匙都配了就是 true。
 */
export function friendLlmReady(): FriendLlmReadyOut {
  return Boolean(GATEWAY_BASE && GATEWAY_KEY)
}

/**
 * system 与 prompt 各占一条消息 —— 都进同一条链,不拆顶层参数。
 *
 * @param input 正文与可选的 system。
 * @returns 网关认的消息数组,system 排第一条。
 */
function gatewayMessages(input: GatewayMessagesIn): GatewayMessagesOut {
  const messages: GatewayMessage[] = []
  if (input.system) messages.push({ role: 'system', content: input.system })
  messages.push({ role: 'user', content: input.prompt })
  return messages
}

/**
 * 信任边界校验用的字符数:上游按 messages 所有 content 之和算。
 *
 * @param input 整个消息数组。
 * @returns 所有 content 的字符数之和。
 */
function charCount(input: CharCountIn): CharCountOut {
  let n = 0
  for (const m of input.messages) n += m.content.length
  return n
}

/**
 * 发一次 /v1。stream 由调用方定 —— 空答案原地重来那次要的正是「同样的 body、不要流」。
 *
 * @param input 这一趟的调用参数、消息数组、要不要流、看门狗。
 * @returns 原始响应。
 */
function sendV1(input: SendV1In): SendV1Out {
  const body: V1Request = { model: GATEWAY_MODEL, messages: input.messages }
  if (input.stream) body.stream = true
  if (input.call.maxTokens) body.max_tokens = Math.min(input.call.maxTokens, FRIEND_MAX_TOKENS)
  if (input.call.temperature != null) body.temperature = input.call.temperature
  const extraHeaders: Record<string, string> = {}
  if (input.call.noCache) {
    body.cache = false
    extraHeaders[HEADER.noCache] = HEADER.noCacheOn
  }
  return postJson({ path: PATH_V1, body, extraHeaders, watch: input.watch })
}

/**
 * 主通道,走 OpenAI 兼容端点。
 *
 * @param input 调用参数。
 * @returns 这一趟的结果。超限、上游报错、空答案都抛 GatewayFailure。
 */
async function chatV1(input: FriendChatIn): FriendChatOut {
  const messages = gatewayMessages({ prompt: input.prompt, system: input.system })
  // 信任边界校验:超限本地就拦(省一趟网络,且能报出确切字符数)——别等上游 400 再猜
  const chars = charCount({ messages })
  if (chars > FRIEND_INPUT_MAX) {
    throw gatewayError({ msg: `input ${chars} chars > gateway max ${FRIEND_INPUT_MAX}`, code: 'tooLong' })
  }
  let watch = makeWatch({ timeoutMs: input.timeoutMs ?? GATEWAY_TIMEOUT_MS, stallMs: input.stallMs })

  let answer = ''
  let body: V1Response | null = null
  let xCache: string | null = null
  let streamed = false
  try {
    let res = await sendV1({ call: input, messages, stream: Boolean(input.onDelta), watch })
    if (!res.ok) throw gatewayErrorOf({ status: res.status, body: await res.text().catch(emptyText) })
    xCache = res.headers.get(HEADER.xCache)
    // 兜底①:要了流,上游却回 JSON(命中网关缓存时可能直接吐整段)—— 按一次性解,onDelta 补发一次。
    // 兜底②:流解出来是空的 —— **绝不把空答案交出去**,原地非流式重来一次(数据丢失处理不上砧板)。
    const ctype = res.headers.get(HEADER.contentType) || ''
    streamed = Boolean(input.onDelta) && ctype.includes(HEADER.sse) && Boolean(res.body)
    if (streamed && res.body) {
      answer = (await readV1Sse({ body: res.body, watch, onDelta: input.onDelta })).trim()
      if (!answer) {
        log({ tag: LLM_LOG.tag, text: `${LLM_LOG.streamEmptyHead}${xCache ?? LLM_LOG.none}${LLM_LOG.streamEmptyTail}` })
        watch.stop()                                    // 重来一次 = 重新计时,别让第一趟的余额把补救掐死
        watch = makeWatch({ timeoutMs: input.timeoutMs ?? GATEWAY_TIMEOUT_MS, stallMs: input.stallMs })
        res = await sendV1({ call: input, messages, stream: false, watch })
        if (!res.ok) throw gatewayErrorOf({ status: res.status, body: await res.text().catch(emptyText) })
        xCache = res.headers.get(HEADER.xCache)
        body = await res.json().catch(nullJson)
        answer = String(body?.choices?.[0]?.message?.content ?? '').trim()
      }
    } else {
      body = await res.json().catch(nullJson)
      answer = String(body?.choices?.[0]?.message?.content ?? '').trim()
      if (answer) input.onDelta?.(answer)
    }
  } finally {
    watch.stop()
  }
  if (!answer) throw gatewayError({ msg: `empty choices (x-cache=${xCache ?? LLM_LOG.none})`, code: 'empty' })
  const usage = body?.usage
  log({
    tag: LLM_LOG.tag,
    text: `${LLM_LOG.v1Ok}${streamed}${LLM_LOG.xCache}${xCache ?? LLM_LOG.none}${LLM_LOG.in}${chars}${LLM_LOG.ch}`
      + `${LLM_LOG.out}${answer.length}${LLM_LOG.ch}${LLM_LOG.tok}${usage?.prompt_tokens ?? LLM_LOG.missing}`
      + `${LLM_LOG.slash}${usage?.completion_tokens ?? LLM_LOG.missing}`
      + `${LLM_LOG.finish}${body?.choices?.[0]?.finish_reason ?? LLM_LOG.missing}`,
  })
  return { answer, sources: [], cached: xCache === 'HIT', via: 'v1', xCache }
}

/**
 * 上游给对象就取 url,给字符串就用它自己;两者都空 → 空串,被 filter 丢掉。
 *
 * @param input 上游给的一条来源。
 * @returns URL;取不到就是空串。
 */
function sourceUrl(input: SourceUrlIn): SourceUrlOut {
  if (typeof input.source === 'string') return input.source
  return String(input.source?.url || '')
}

/**
 * 旧链 /api/chat:webSearch 的唯一通道 + /v1 挂掉时的回退。[ref:] 指纹在这条链上保留。
 *
 * @param input 调用参数;stallMs 在这条链上没有语义。
 * @returns 这一趟的结果。上游报错或空答案抛 GatewayFailure。
 */
async function chatLegacy(input: FriendChatIn): FriendChatOut {
  // 旧链是一次性 JSON,没有增量可言 → 只挂硬上限,不装停摆闸(stallMs 在这条链上没有语义)。
  // 硬上限一直管到 body 读完:头到手就撤掉看门狗,等于把「读一半卡住」这段又放生了(v1 那边刚补的就是这个)。
  const watch = makeWatch({ timeoutMs: input.timeoutMs ?? GATEWAY_TIMEOUT_MS })
  let body: LegacyResponse | null = null
  try {
    const req: LegacyRequest = { prompt: refPrompt({ prompt: input.prompt, salt: input.system ?? '' }) }
    if (input.system) req.system = input.system
    if (input.webSearch) req.web_search = true
    if (input.searchQuery) req.search_query = input.searchQuery
    const extraHeaders: Record<string, string> = { [HEADER.apiKey]: GATEWAY_KEY }
    const res = await postJson({ path: PATH_LEGACY, body: req, extraHeaders, watch })
    if (!res.ok) throw gatewayErrorOf({ status: res.status, body: await res.text().catch(emptyText) })
    body = await res.json().catch(nullJson)
  } finally {
    watch.stop()
  }
  const answer = String(body?.answer ?? '').trim()
  if (!answer) throw gatewayError({ msg: 'empty answer', code: 'empty' })
  const sources: string[] = []
  if (Array.isArray(body?.sources)) {
    for (const one of body.sources) {
      const url = sourceUrl({ source: one })
      if (url && sources.length < LEGACY_SOURCE_MAX) sources.push(url)
    }
  }
  log({
    tag: LLM_LOG.tag,
    text: `${LLM_LOG.legacyOk}${body?.cached === true}${LLM_LOG.in}${input.prompt.length}${LLM_LOG.ch}`
      + `${LLM_LOG.out}${answer.length}${LLM_LOG.ch}${LLM_LOG.webSearch}${body?.web_search_used === true}`,
  })
  return { answer, sources, cached: body?.cached === true, via: 'legacy', xCache: null }
}

/**
 * 会抛错的版本:失败一律 GatewayFailure(带 code;运行时 name 仍是 `FriendLlmError`),调用方按码各说各话。
 * webSearch → 只走旧链;否则 /v1 优先,upstream/offline 才回退旧链(tooLong/authKey/badRequest 不回退:
 * 旧链同样会失败,退了只是把错误换个说法)。
 *
 * @param input 调用参数。
 * @returns 这一趟的结果。失败一律抛 GatewayFailure(带码)。
 */
export async function friendChatOrThrow(input: FriendChatIn): FriendChatOut {
  if (!friendLlmReady()) throw gatewayError({ msg: 'TRANSLATE_API_BASE/KEY not configured', code: 'offline' })
  if (input.webSearch) return chatLegacy(input)
  try {
    return await chatV1(input)
  } catch (e) {
    const code = e instanceof Error && isGatewayError(e) ? e.code : ERR_DEFAULT
    if (code !== 'upstream' && code !== 'offline') throw e
    // 留痕:回退是异常态,不能静默发生(下次排查得看得见走的哪条链)
    const why = e instanceof Error ? e.message.slice(0, LOG_MSG_MAX) : ''
    log({ tag: LLM_LOG.tag, text: `${LLM_LOG.v1FailHead}${code}${LLM_LOG.paren}${why}${LLM_LOG.parenEnd}${LLM_LOG.v1FailTail}` })
    try {
      return await chatLegacy(input)
    } catch (e2) {
      // 出错留痕(铁律:catch 里不许什么都不留)
      log({
        tag: LLM_LOG.tag,
        text: `${LLM_FN.friendChatOrThrow}${LLM_LOG.failedTail}${LLM_LOG.fallbackFailed}`
          + (e2 instanceof Error ? e2.message.slice(0, LOG_MSG_MAX) : ''),
      })
      throw e2
    }
  }
}

/**
 * 老签名(失败静默 null),现有调用方零改动:jdformat / companyResearch / advisor 的降级路径靠它。
 * 要错误码的调用方(简历对照)用 friendChatOrThrow。留痕在上面那一层已经打过,这里只负责不抛。
 *
 * @param input 调用参数。
 * @returns 这一趟的结果;失败返回 null(留痕在上一层已经打过)。
 */
export async function friendChat(input: FriendChatIn): FriendChatMaybeOut {
  try {
    return await friendChatOrThrow(input)
  } catch {
    return null
  }
}

// =========================================================================
// 6. 三个后端:一条字节流
// =========================================================================

/**
 * friend 通道要的两段:system 合并成一段,其余合并成 prompt。
 *
 * @param input 整轮消息。
 * @returns system 合成一段、其余合成一段。
 */
function splitMessages(input: SplitMessagesIn): SplitMessagesOut {
  const systems: string[] = []
  const turns: string[] = []
  for (const m of input.messages) {
    if (m.role === 'system') systems.push(m.content)
    else turns.push(m.content)
  }
  return { system: systems.join('\n\n') || undefined, prompt: turns.join('\n\n') }
}

/**
 * anthropic 通道:system 拆到顶层参数。
 *
 * @param input 整轮消息。
 * @returns 合并后的 system;一条都没有时是空串。
 */
function systemOf(input: SystemOfIn): SystemOfOut {
  const systems: string[] = []
  for (const m of input.messages) if (m.role === 'system') systems.push(m.content)
  return systems.join('\n\n')
}

/**
 * 除 system 外的轮次,原样带过去。
 *
 * @param input 整轮消息。
 * @returns 除 system 之外的轮次,顺序不变。
 */
function turnsOf(input: TurnsOfIn): TurnsOfOut {
  const turns: TurnsOfOut = []
  for (const m of input.messages) if (m.role !== 'system') turns.push({ role: m.role, content: m.content })
  return turns
}

/**
 * 回包里只要文本块 —— 判 type 就把联合窄化到 TextBlock,不用断言。
 *
 * @param input 回包里的所有内容块。
 * @returns 文本块拼起来的正文。
 */
function textOf(input: TextOfIn): TextOfOut {
  let out = ''
  for (const block of input.blocks) if (block.type === 'text') out += block.text
  return out
}

/**
 * 非法 URL/非 http(s) → 不声明工具(行为同无 URL);域名白名单锁定到该 URL 自己的 host。
 *
 * @param input 要抓的官网 URL,可以不给。
 * @returns 工具声明;没给 URL 或 URL 不合法时返回 null。
 */
function webFetchTool(input: WebFetchToolIn): WebFetchToolOut {
  if (!input.fetchUrl) return null
  try {
    const u = new URL(input.fetchUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return {
      type: WEB_FETCH.type,
      name: WEB_FETCH.name,
      max_uses: WEB_FETCH.maxUses,
      allowed_domains: [u.hostname],
      max_content_tokens: WEB_FETCH.maxContentTokens,
    }
  } catch { return null }
}

/**
 * friend 是非流式后端:整段答案包成单 chunk 流,advisor 路由/前端打字机零改动;fetchUrl grounding 忽略(同 ollama)。
 *
 * @param input 整轮消息与输出上限。
 * @returns 把整段答案包成单块的字节流。网关连不上时抛 LlmFailure。
 */
async function friendStream(input: BackendStreamIn): BackendStreamOut {
  const { system, prompt } = splitMessages({ messages: input.messages })
  // maxTokens 现在真生效(2026-08-04 换 /v1 端点,实测 finish_reason=length);temperature 沿用对话侧的 0.4
  const r = await friendChat({
    prompt, system, timeoutMs: FRIEND_CALL_TIMEOUT_MS, maxTokens: input.maxTokens, temperature: FRIEND_STREAM_TEMP,
  })
  if (!r) throw llmError({ msg: LLM_MSG.friendOffline })
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(r.answer))
      controller.close()
    },
  })
}

/**
 * Ollama:NDJSON /api/chat → 文本增量。
 *
 * @param input 整轮消息与输出上限。
 * @returns 文本增量的字节流。连不上或非 200 时抛 LlmFailure。
 */
async function ollamaStream(input: BackendStreamIn): BackendStreamOut {
  let upstream: Response
  const body: OllamaRequest = {
    model: OLLAMA_MODEL, think: false, stream: true, messages: input.messages,
    options: { temperature: OLLAMA_STREAM_TEMP, num_predict: input.maxTokens },
  }
  try {
    upstream = await fetch(`${OLLAMA_URL}${PATH_OLLAMA}`, {
      method: 'POST',
      headers: { [HEADER.contentType]: HEADER.json },
      body: JSON.stringify(body),
    })
  } catch {
    throw llmError({ msg: LLM_MSG.ollamaOffline })
  }
  if (!upstream.ok || !upstream.body) {
    throw llmError({ msg: `${LLM_MSG.ollamaStatusHead}${upstream.status}${LLM_MSG.ollamaStatusTail}` })
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buf = ''
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) { controller.close(); return }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split(SSE_LINE_SEP)
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed: OllamaResponse = JSON.parse(line)
          const delta = parsed?.message?.content || ''
          if (delta) controller.enqueue(encoder.encode(delta))
        } catch { /* 跳过不完整行 */ }
      }
    },
    cancel() { reader.cancel().catch(ignore) },
  })
}

/**
 * Anthropic:messages.stream → 文本增量(system 从 messages 拆到顶层参数)。
 *
 * @param input 整轮消息、输出上限、可选的官网 URL。
 * @returns 文本增量的字节流。
 */
async function anthropicStream(input: AnthropicStreamIn): BackendStreamOut {
  const client = new Anthropic() // ANTHROPIC_API_KEY 从 env 解析
  const system = systemOf({ messages: input.messages })
  const params: AnthropicStreamParams = {
    model: ANTHROPIC_MODEL,
    max_tokens: input.maxTokens,
    messages: turnsOf({ messages: input.messages }),
  }
  if (system) params.system = system
  const tool = webFetchTool({ fetchUrl: input.fetchUrl })
  if (tool) params.tools = [tool]
  const stream = client.messages.stream(params)
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      // 三个回调的签名是 SDK 定的(库外部规定),我们只把它们提成具名函数。
      function onText(text: string): void {
        controller.enqueue(encoder.encode(text))
      }
      // 上游说完了,关流。
      function onEnd(): void {
        controller.close()
      }
      // 上游报错时,翻成见客话术再关流。
      function onError(e: Error): void {
        controller.error(llmError({ msg: `${LLM_MSG.anthropicHead}${e instanceof Error ? e.message : e}` }))
      }
      stream.on('text', onText)
      stream.on('end', onEnd)
      stream.on('error', onError)
    },
    cancel() { stream.abort() },
  })
}

/**
 * fetchUrl(E6-03):给 anthropic 后端声明服务端 web_fetch 工具,让模型现场抓该 URL(公司官网)做 grounding。
 * 只在 anthropic 生效(ollama 无此能力,忽略);域名白名单锁定到该 URL 自己的 host,输入侧 max_content_tokens 封顶。
 *
 * @param input 整轮消息、输出上限、可选的官网 URL。
 * @returns 文本增量的字节流,三个后端形状一致。
 */
export function streamChat(input: StreamChatIn): StreamChatOut {
  if (PROVIDER === 'friend') return friendStream({ messages: input.messages, maxTokens: input.maxTokens })
  if (PROVIDER === 'anthropic') return anthropicStream(input)
  return ollamaStream({ messages: input.messages, maxTokens: input.maxTokens })
}

// =========================================================================
// 7. 三个后端:非流式整段补全(E11-07 简历解析用:一次调用抽结构化 JSON,不需要流)
// =========================================================================

/**
 * friend 通道走网关,顺带把元信息回传给调用方。
 *
 * @param input 出口的入参(回调与停摆闸都用得上)。
 * @returns 整段答案。失败抛 LlmFailure,话术已按错误码翻好。
 */
async function completeFriend(input: CompleteFriendIn): CompleteBackendOut {
  const { system, prompt } = splitMessages({ messages: input.messages })
  // maxTokens 现在真发出去(旧结论「上游不收长度参数」已随 /v1 端点作废,见 constants 第 2 段)
  const call: FriendChatIn = {
    prompt, system, timeoutMs: FRIEND_CALL_TIMEOUT_MS, maxTokens: input.maxTokens, temperature: input.temperature,
  }
  if (input.onDelta) call.onDelta = input.onDelta
  if (input.stallMs) call.stallMs = input.stallMs
  let r: FriendResult
  try {
    r = await friendChatOrThrow(call)
  } catch (e) {
    // 网关的码翻成给用户看的话;认不出的按「连不上」说(路由再决定 HTTP 状态,见 api/resume-match)
    if (e instanceof Error && isGatewayError(e)) throw llmError({ msg: FRIEND_MSG[e.code], code: e.code })
    throw llmError({ msg: LLM_MSG.friendOffline })
  }
  input.onMeta?.({ cached: r.cached, via: r.via, xCache: r.xCache })
  return r.answer
}

/**
 * anthropic 通道用 SDK 一次性补全,只取回包里的文本块。
 *
 * @param input 整轮消息与输出上限。
 * @returns 整段答案。SDK 报错或模型拒答时抛 LlmFailure。
 */
async function completeAnthropic(input: CompleteBackendIn): CompleteBackendOut {
  const client = new Anthropic() // ANTHROPIC_API_KEY 从 env 解析
  const system = systemOf({ messages: input.messages })
  const params: AnthropicParams = {
    model: ANTHROPIC_MODEL,
    max_tokens: input.maxTokens,
    messages: turnsOf({ messages: input.messages }),
  }
  if (system) params.system = system
  let res: AnthropicMessage
  try {
    res = await client.messages.create(params)
  } catch (e) {
    throw llmError({ msg: `${LLM_MSG.anthropicHead}${e instanceof Error ? e.message : e}` })
  }
  if (res.stop_reason === 'refusal') throw llmError({ msg: LLM_MSG.refusal })
  return textOf({ blocks: res.content })
}

/**
 * ollama 通道在本地一次性补全。
 *
 * @param input 整轮消息与输出上限。
 * @returns 整段答案。连不上或非 200 时抛 LlmFailure。
 */
async function completeOllama(input: CompleteBackendIn): CompleteBackendOut {
  let r: Response
  const body: OllamaRequest = {
    model: OLLAMA_MODEL, think: false, stream: false, messages: input.messages,
    options: { temperature: OLLAMA_COMPLETE_TEMP, num_predict: input.maxTokens },
  }
  try {
    r = await fetch(`${OLLAMA_URL}${PATH_OLLAMA}`, {
      method: 'POST', headers: { [HEADER.contentType]: HEADER.json },
      body: JSON.stringify(body),
    })
  } catch { throw llmError({ msg: LLM_MSG.ollamaOffline }) }
  if (!r.ok) throw llmError({ msg: `${LLM_MSG.ollamaStatusHead}${r.status}${LLM_MSG.ollamaStatusTail}` })
  const parsed: OllamaResponse = await r.json()
  return parsed?.message?.content ?? ''
}

/**
 * 要一整段答案,不需要流。简历解析这类「一次调用抽结构化 JSON」的活走它。
 *
 * 走哪个后端由 input.provider 定,不传就跟全局 LLM_PROVIDER;三条通道的差别对调用方不可见。
 *
 * @param input 整轮消息、输出上限,以及各调用点自己的通道与回调。
 * @returns 整段答案。
 */
export function completeText(input: CompleteTextIn): CompleteTextOut {
  const prov = input.provider || PROVIDER
  if (prov === 'friend') return completeFriend(input)
  if (prov === 'anthropic') return completeAnthropic({ messages: input.messages, maxTokens: input.maxTokens })
  return completeOllama({ messages: input.messages, maxTokens: input.maxTokens })
}

// =========================================================================
// 8. 逐行对齐翻译
// =========================================================================

/**
 * 与 friendLlmReady 判的是同一对 env —— 同一个网关同一把钥匙,别留第二份判断。
 *
 * @returns 翻译链能不能用。
 */
export function translateReady(): TranslateReadyOut {
  return friendLlmReady()
}

/**
 * 上游爱加粗爱起标题,逐行对位不要这些装饰。
 *
 * @param input 一段译文。
 * @returns 去掉加粗与标题记号之后的正文。
 */
function stripMd(input: StripMdIn): StripMdOut {
  return input.text.replace(MD_BOLD, '$1').replace(MD_HEADING, '').replace(MD_STARS, '')
}

/**
 * 按编号解析(部分容错版):返回 编号→译文 映射,缺号/空段就是缺,不抛
 *
 * @param input 上游回来的整段编号译文。
 * @returns 编号到译文的映射;缺号就是缺,不抛。
 */
function parseNumbered(input: ParseNumberedIn): ParseNumberedOut {
  const parts = input.text.split(NUMBERED_SPLIT)
  const d: ParseNumberedOut = new Map()
  for (let i = 1; i + 1 < parts.length + 1; i += 2) {
    const t = stripMd({ text: parts[i + 1] ?? '' }).trim()
    if (t) d.set(Number(parts[i]), t)
  }
  return d
}

/**
 * 一块里的行加上 `[n] ` 编号 —— 对位靠的就是它。
 *
 * @param input 这一块的行。
 * @returns 编好号的一整段,行间用换行。
 */
function numberLines(input: NumberLinesIn): NumberLinesOut {
  const out: string[] = []
  for (let j = 0; j < input.lines.length; j++) out.push(`${NUMBER_HEAD}${j + 1}${NUMBER_TAIL}${input.lines[j]}`)
  return out.join(SSE_LINE_SEP)
}

/**
 * 一块 ≤8 行:失败自动重试一次(吸收 ngrok 抖动);一行都没解析到才算本次失败。
 *
 * @param input 这一块的行、目标语种、总超时。
 * @returns 编号到译文的映射;两次都一行没解到就返回 null。
 */
async function translateChunk(input: TranslateChunkIn): TranslateChunkOut {
  const numbered = numberLines({ lines: input.lines })
  for (let attempt = 0; attempt < TRANSLATE_TRIES; attempt++) {
    try {
      const resp = await fetch(`${GATEWAY_BASE}${PATH_TRANSLATE}`, {
        method: 'POST', signal: input.signal,
        headers: { [HEADER.contentType]: HEADER.json, [HEADER.apiKey]: GATEWAY_KEY },
        body: JSON.stringify({
          text: refPrompt({ prompt: numbered, salt: input.lang }),
          source_lang: TRANSLATE_SOURCE,
          target_lang: input.lang,
        }),
      })
      if (!resp.ok) throw translateError({ msg: `${UPSTREAM_HEAD}${resp.status}`, code: 'upstream' })
      const parsed: TranslateResponse = await resp.json()
      const m = parseNumbered({ text: String(parsed.translated_text || '') })
      if (m.size) return m
    } catch {
      if (input.signal.aborted) throw translateError({ msg: TRANSLATE_TIMEOUT, code: 'timeout' })
    }
  }
  return null
}

/**
 * 逐行翻译:返回与 lines 等长的数组,null=该行没翻到(调用方保留原文)。
 * 全 null = 服务整体不可用,调用方按错误处理。
 * 🔵 #181(Frank「有时候能翻译,有时候失败」):首版各自整块编号翻+缺号整块拒收 —— 朋友 qwen(ngrok)
 * 时通时断、长批(15+ 行)对位易漏号,一个号漏掉全部作废,表现为「时灵时不灵」。修:
 * ① 分块 ≤8 行;② 失败块自动重试一次;③ 部分容错:缺号行=null(调用方保留英文),不再整块拒收
 * —— 编号映射下缺号只是「没翻到」,不构成错行风险(对位红线不破)。
 *
 * @param input 整批要翻的行、目标语种、总超时。
 * @returns 与入参等长的数组,null 表示该行没翻到。
 */
export async function translateLinesAligned(input: TranslateLinesIn): TranslateLinesOut {
  const out: (string | null)[] = new Array(input.lines.length).fill(null)
  for (let i = 0; i < input.lines.length; i += TRANSLATE_CHUNK) {
    const chunk = input.lines.slice(i, i + TRANSLATE_CHUNK)
    const got = await translateChunk({ lines: chunk, lang: input.lang, signal: input.signal })
    if (got) {
      for (let j = 0; j < chunk.length; j++) {
        const t = got.get(j + 1)
        if (t) out[i + j] = t
      }
    }
  }
  return out
}
