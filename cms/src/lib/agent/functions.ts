/**
 * 对话兜底解析:用户原话 → 槽位(采信校验、三个工具、入口);循环交给 pi-agent-core 的 runAgentLoop。
 *
 * @author Frank
 * @time 2026-08-19 03:28:12
 */

import { stream } from '@earendil-works/pi-ai/api/anthropic-messages'
import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { AGENT_FN, AGENT_LOG, log } from '@/lib/log'
import { cleanProvs } from '../location'
import { NOC_LIST_WITH_TITLES } from '../db/sql'
import {
  COST_CACHE_READ, COST_CACHE_WRITE, COST_INPUT, COST_OUTPUT, DASH, FALLBACK_ON, LIKE_ANY, LIKE_ESCAPE,
  LIKE_SPECIAL, MAX_INPUT_CHARS, MAX_QUERY_CHARS, MAX_REASON_CHARS, MAX_TOKENS, MODEL_API, MODEL_BASE_URL,
  MODEL_CONTEXT_WINDOW, MODEL_ID, MODEL_NAME, MODEL_PROVIDER, MODEL_REASONING, NL, NOC_RE, NOISE_RATIO, ROLE,
  SEARCH_LIMIT, SHOWN, TIMEOUT_MS, TOOLS,
} from './constants'
import { RESOLVE_SYSTEM, SEARCH_RESULT_HINT, TOOL_DESC, TOOL_REPLY } from './prompts'
import { GIVE_UP_PARAMS, SEARCH_PARAMS, SET_SLOTS_PARAMS } from './schemas'
import type {
  AcceptNocIn, AcceptNocOut, AgentFallbackOnOut, Candidate, CandidateLineIn, CandidateLineOut, ExecuteGiveUpIn,
  ExecuteGiveUpOut, ExecuteSearchIn, ExecuteSearchOut, ExecuteSetSlotsIn, ExecuteSetSlotsOut, GiveUpToolIn,
  GiveUpToolOut, IgnoreEventsOut, InCandidatesIn, InCandidatesOut, Inbox, MakeToolsIn, MakeToolsOut, ModelOut,
  OnTimeoutOut, PassThroughMessagesIn, PassThroughMessagesOut, ResolveByAgentIn, ResolveByAgentOut, RunLoopIn,
  RunLoopOut, SayIn, SayOut, SearchCandidatesIn, SearchCandidatesOut, SearchDetails, SearchReplyIn,
  SearchReplyOut, SearchToolIn, SearchToolOut, SetSlotsToolIn, SetSlotsToolOut, ToolCallId, TranscriptMessage,
} from './types'

// =========================================================================
// 1. 采信校验
// =========================================================================

/**
 * 这个 NOC 在不在搜索真实返回的候选里。
 *
 * @param input 这一趟的候选清单与要找的那个 NOC。
 * @returns 在不在清单里。
 */
function inCandidates(input: InCandidatesIn): InCandidatesOut {
  for (const c of input.candidates) if (c.noc === input.noc) return true
  return false
}

/**
 * 模型挑的 NOC 只有在**候选里出现过**才算数 —— 它没法用查询结果之外的码蒙混过去。
 *
 * @param input 模型填的 NOC 与这一趟的候选清单。
 * @returns 采信就返回那个码,不采信返回 null。
 */
export function acceptNoc(input: AcceptNocIn): AcceptNocOut {
  const noc = (input.raw ?? '').trim()
  if (!NOC_RE.test(noc)) return null
  return inCandidates({ candidates: input.candidates, noc }) ? noc : null
}

// =========================================================================
// 2. 三个工具
// =========================================================================

/**
 * 拼一条工具回执:给模型看的文字 + 给我们自己读的 details + 这一步要不要收工。
 *
 * @param input 给模型看的文字、给我们自己读的 details、这一步要不要收工。
 * @returns pi 认的工具回执。
 */
function say<T>(input: SayIn<T>): SayOut<T> {
  return { content: [{ type: ROLE.text, text: input.text }], details: input.details, terminate: input.stop }
}

/**
 * 查职业候选:库里真有在招岗位的 NOC(SQL 归 lib/db/sql,本域不自己写 SQL,也不跟对话域借取数函数)。
 * 榜首 10% 以下的当噪音丢掉 —— 它们是被官方要求文本连带捞出来的,进了白名单就是给模型递错答案。
 * 查不动就当没候选:兜底不许把主路径带崩,但错要留痕,catch 里先写一行再回空。
 *
 * @param input 库连接与模型拼的检索词。
 * @returns 候选清单;查不动或一个都没有时是空数组。
 */
async function searchCandidates(input: SearchCandidatesIn): SearchCandidatesOut {
  try {
    const like = `${LIKE_ANY}${input.query.replace(LIKE_SPECIAL, LIKE_ESCAPE)}${LIKE_ANY}`
    const { rows } = await input.pool.query(NOC_LIST_WITH_TITLES, [like, SEARCH_LIMIT])
    const top = Number(rows[0]?.n ?? 0)
    const hits: Candidate[] = []
    for (const r of rows) {
      const noc = String(r.noc ?? '')
      const title = String(r.title ?? '')
      if (noc && title && Number(r.n ?? 0) >= top * NOISE_RATIO) hits.push({ noc, title })
    }
    return hits
  } catch (e) {
    log({ tag: AGENT_LOG.tag, text: `${AGENT_FN.searchCandidates}${AGENT_LOG.failedTail}` + (e instanceof Error ? e.message : String(e)) })
    return []
  }
}

/**
 * 一个候选渲染成一行:`NOC — 职业名`。
 *
 * @param input 一个候选。
 * @returns `NOC — 职业名` 这一行。
 */
function candidateLine(input: CandidateLineIn): CandidateLineOut {
  return `${input.hit.noc}${DASH}${input.hit.title}`
}

/**
 * 回给模型的那段话:候选清单,或者「一个都没有」。
 *
 * @param input 这一趟查到的候选。
 * @returns 回给模型的那段话;一个候选都没有时是「一个都没有」。
 */
function searchReply(input: SearchReplyIn): SearchReplyOut {
  if (!input.hits.length) return TOOL_REPLY.noCandidates
  const lines: string[] = []
  for (const hit of input.hits) lines.push(candidateLine({ hit }))
  return `${SEARCH_RESULT_HINT}${NL}${lines.join(NL)}`
}

/**
 * 查候选那把工具 —— execute 写在里面,因为它要往这一趟的收件箱里攒候选。
 *
 * @param input 库连接与这一趟的收件箱。
 * @returns 查职业候选那把工具。
 */
function searchTool(input: SearchToolIn): SearchToolOut {
  /**
   * 查一次候选,攒进收件箱,并把清单回给模型。
   *
   * ⚠️ 两个参数是 pi 定的(它按位置传 toolCallId、args),第一位我们用不上。
   *
   * @param args 模型拼的检索词。
   * @returns 候选清单,或者一句「一个都没有」。
   */
  async function executeSearch(_id: ToolCallId, args: ExecuteSearchIn): ExecuteSearchOut {
    const query = args.query.trim().slice(0, MAX_QUERY_CHARS)
    const hits = await searchCandidates({ pool: input.pool, query })
    for (const hit of hits) input.out.candidates.push(hit)
    const details: SearchDetails = { candidates: hits }
    return say({ text: searchReply({ hits }), details, stop: false })
  }
  return {
    name: TOOLS.search.name, label: TOOLS.search.label, description: TOOL_DESC.search,
    parameters: SEARCH_PARAMS, execute: executeSearch,
  }
}

/**
 * 记下槽位那把工具。
 *
 * @param input 这一趟的收件箱。
 * @returns 记下槽位那把工具。
 */
function setSlotsTool(input: SetSlotsToolIn): SetSlotsToolOut {
  /**
   * 记下模型填的槽位,并收工。
   *
   * 只记账不判断:采信统一在 §4 做 —— 在回调里判,等于把红线散进三个地方。
   *
   * @param args 模型填的槽位,还没采信。
   * @returns 一句「记下了」,带 terminate。
   */
  async function executeSetSlots(_id: ToolCallId, args: ExecuteSetSlotsIn): ExecuteSetSlotsOut {
    input.out.claim = args
    return say({ text: TOOL_REPLY.recorded, details: args, stop: true })
  }
  return {
    name: TOOLS.setSlots.name, label: TOOLS.setSlots.label, description: TOOL_DESC.setSlots,
    parameters: SET_SLOTS_PARAMS, execute: executeSetSlots,
  }
}

/**
 * 交回反问那把工具。
 *
 * @param input 这一趟的收件箱。
 * @returns 交回反问那把工具。
 */
function giveUpTool(input: GiveUpToolIn): GiveUpToolOut {
  /**
   * 模型自己交回反问 —— 记下来就收工。
   *
   * @param args 模型给的放弃理由,可不填。
   * @returns 一句「放弃了」,带 terminate。
   */
  async function executeGiveUp(_id: ToolCallId, args: ExecuteGiveUpIn): ExecuteGiveUpOut {
    input.out.gaveUp = true
    const text = `${TOOL_REPLY.gaveUp}${args.reason ?? ''}`.slice(0, MAX_REASON_CHARS)
    return say({ text, details: { gaveUp: true }, stop: true })
  }
  return {
    name: TOOLS.giveUp.name, label: TOOLS.giveUp.label, description: TOOL_DESC.giveUp,
    parameters: GIVE_UP_PARAMS, execute: executeGiveUp,
  }
}

/**
 * set_slots / give_up 带 `terminate: true`,循环拿到就收工,不再多问一轮。
 *
 * @param input 库连接与这一趟的收件箱。
 * @returns 三把工具,顺序就是模型看到的顺序。
 */
export function makeTools(input: MakeToolsIn): MakeToolsOut {
  return [
    searchTool({ pool: input.pool, out: input.out }),
    setSlotsTool({ out: input.out }),
    giveUpTool({ out: input.out }),
  ]
}

// =========================================================================
// 3. 入口
// =========================================================================

/**
 * 我们只产 user 消息,pi harness 那 4 种非 LLM 消息一条都不会出现 —— 比对 role 让编译器自己窄化,不必强转。
 *
 * @param ms 循环里流动的全部消息(签名由 pi 的 convertToLlm 定死)。
 * @returns 能喂给模型的那三种,顺序不变。
 */
export function passThroughMessages(ms: PassThroughMessagesIn): PassThroughMessagesOut {
  const kept: PassThroughMessagesOut = []
  for (const m of ms) {
    if (m.role === ROLE.user || m.role === ROLE.assistant || m.role === ROLE.toolResult) kept.push(m)
  }
  return kept
}

/**
 * runAgentLoop 的第 4 个参数是必填的事件回调 —— 我们不订阅,结果走收件箱。
 *
 * @returns 什么都不做。
 */
function ignoreEvents(): IgnoreEventsOut {
  return
}

/**
 * 这一趟用哪个模型;id 允许 env 覆盖,换版本不用改代码。
 *
 * @returns 这一趟用的模型描述符,协议锁死 anthropic-messages。
 */
function model(): ModelOut {
  return {
    id: process.env.ANTHROPIC_MODEL || MODEL_ID,
    name: MODEL_NAME,
    api: MODEL_API,
    provider: MODEL_PROVIDER,
    baseUrl: MODEL_BASE_URL,
    reasoning: MODEL_REASONING,
    input: [ROLE.text],
    contextWindow: MODEL_CONTEXT_WINDOW,
    maxTokens: MAX_TOKENS,
    cost: { input: COST_INPUT, output: COST_OUTPUT, cacheRead: COST_CACHE_READ, cacheWrite: COST_CACHE_WRITE },
  }
}

/**
 * 🔴 兜底失败 = 当它没发生过:任何错都吞掉、回 false,不许把主路径带崩。
 * 但**不许静默** —— 吞掉之前必须留痕,否则下次排查只能靠人肉撞见。
 *
 * @param input 库连接、用户原话、API key、超时信号、收件箱。
 * @returns 跑完了没有;出错吞掉回 false,留痕已经写过。
 */
async function runLoop(input: RunLoopIn): RunLoopOut {
  try {
    const first: TranscriptMessage = {
      role: ROLE.user, content: input.text.slice(0, MAX_INPUT_CHARS), timestamp: Date.now(),
    }
    await runAgentLoop(
      [first],
      { systemPrompt: RESOLVE_SYSTEM, messages: [], tools: makeTools({ pool: input.pool, out: input.out }) },
      { model: model(), apiKey: input.apiKey, maxTokens: MAX_TOKENS, convertToLlm: passThroughMessages },
      ignoreEvents,
      input.signal,
      // pi-ai 的 stream 锁死 anthropic-messages,StreamFn 要通吃所有 Api —— 逆变对不上,只能断言(模型就是 anthropic)。
      stream as StreamFn,
    )
    return true
  } catch (e) {
    log({ tag: AGENT_LOG.tag, text: `${AGENT_FN.runLoop}${AGENT_LOG.failedTail}` + (e instanceof Error ? e.message : String(e)) })
    return false
  }
}

/**
 * 🔴 兜底默认是关着的,`AGENT_FALLBACK=1` 才开。
 * 没开就当这个模块不存在,调用方走它原来的反问,行为与从前逐字相同。
 *
 * @returns 这条兜底路开没开。
 */
function agentFallbackOn(): AgentFallbackOnOut {
  return process.env.AGENT_FALLBACK === FALLBACK_ON
}

/**
 * 用户原话 → 槽位;解不出来就回 null,调用方回到它原来的反问。
 * 🔴 这一层有两条不能破:**永不抛异常**(兜底把主路径搞崩,比兜底不生效更糟,所以最外面这道网什么都接);
 * **只补槽位不产事实**(它给的是「哪个职业、哪些省」,不是任何见客的数字或结论)。
 * 出错同样要留痕:catch 里吞掉之前先写一行。
 *
 * @param input 库连接、用户原话、语种。
 * @returns 解出来的槽位;解不出来、超时、env 关着都回 null。
 */
export async function resolveByAgent(input: ResolveByAgentIn): ResolveByAgentOut {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!agentFallbackOn() || !apiKey) return null

    const t0 = Date.now()
    const ac = new AbortController()

    /**
     * 到点就掐断 —— 兜底不许拖慢反问。
     *
     * @returns 没有返回值。
     */
    function onTimeout(): OnTimeoutOut {
      ac.abort()
    }
    const timer = setTimeout(onTimeout, TIMEOUT_MS)

    const out: Inbox = { candidates: [], claim: null, gaveUp: false }
    const ok = await runLoop({ pool: input.pool, text: input.text, apiKey, signal: ac.signal, out })
    clearTimeout(timer)
    if (!ok) return null

    const ms = Date.now() - t0
    if (out.gaveUp || !out.claim) {
      log({ tag: AGENT_LOG.tag, text: `${AGENT_LOG.noSlots}${out.gaveUp}${AGENT_LOG.ms}${ms}${AGENT_LOG.reask}` })
      return null
    }

    const noc = acceptNoc({ raw: out.claim.noc, candidates: out.candidates })
    if (out.claim.noc !== null && !noc) {   // 编了一个候选里没有的码 —— 不采信,回落反问
      log({ tag: AGENT_LOG.tag, text: `${AGENT_LOG.rejected}${out.claim.noc}${AGENT_LOG.rejectedWhy}${AGENT_LOG.ms}${ms}${AGENT_LOG.reask}` })
      return null
    }

    const provs = cleanProvs({ raw: out.claim.provinces })
    const reason = (out.claim.reason ?? '').slice(0, MAX_REASON_CHARS)
    const shownNoc = noc ?? SHOWN.noNoc
    const shownProvs = provs.join(SHOWN.comma) || SHOWN.none
    log({ tag: AGENT_LOG.tag, text: `${AGENT_LOG.resolved}${shownNoc}${AGENT_LOG.provs}${shownProvs}${AGENT_LOG.ms}${ms}${AGENT_LOG.reason}${reason}` })
    return { noc, provs, reason, ms }
  } catch (e) {
    log({ tag: AGENT_LOG.tag, text: `${AGENT_FN.resolveByAgent}${AGENT_LOG.failedTail}` + (e instanceof Error ? e.message : String(e)) })
    return null
  }
}
