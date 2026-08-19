// 兜底解析:用户原话 → 槽位。循环/校验/结果回灌全是 pi-agent-core 的 runAgentLoop,我们只出工具与判据。
// 触发点唯一 —— lib/chat/orchestrate 抛 noOcc 之前;它只补槽位,facts 仍由 collectFacts 从 lib/chat 取。
// 🔴 三条铁律:① 永不抛异常(兜底搞崩主路径比不兜底糟) ② 只补槽位不产事实 ③ 默认关着(AGENT_FALLBACK=1)。

import { stream } from '@earendil-works/pi-ai/api/anthropic-messages'
import { Type, type Message } from '@earendil-works/pi-ai'
import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { AgentMessage, AgentTool, StreamFn } from '@earendil-works/pi-agent-core'
import { suggestOccupations, type OccOption } from '@/lib/chat'
import type { Lang } from '@/lib/i18n'
import {
  MAX_INPUT_CHARS, MAX_QUERY_CHARS, MAX_REASON_CHARS, MAX_TOKENS, MODEL, NOC_RE, PROVS, SEARCH_LIMIT, TIMEOUT_MS, TOOLS,
} from './constants'
import { RESOLVE_SYSTEM, SEARCH_RESULT_HINT, TOOL_DESC, TOOL_REPLY } from './prompts'
import type { AgentSlots, ResolveOut } from './types'

// =========================================================================
// 1. 采信校验
// =========================================================================
//
// 🔴 校验归它,**采信归我们**:schema 过了不等于内容可信。NOC 必须出现在
//    search_occupations 真实返回的候选里(acceptNoc),省码必须过九省表(cleanProvs)——
//    「宁可少一个省,不许把 NB 当 NS」是同一条规矩。

// 模型给的省码 → 认得出的留下,认不出的丢掉(不猜)。
export const cleanProvs = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [])
    .map((p) => String(p ?? '').trim().toUpperCase())
    .filter((p) => PROVS.has(p))

// 模型挑的 NOC 只有在**候选里出现过**才算数 —— 它没法用查询结果之外的码蒙混过去。
export const acceptNoc = (raw: unknown, candidates: OccOption[]): string | null => {
  const noc = String(raw ?? '').trim()
  if (!NOC_RE.test(noc)) return null
  return candidates.some((c) => c.noc === noc) ? noc : null
}

// =========================================================================
// 2. 三个工具
// =========================================================================
//
// agent 能碰的三个工具 —— **pi-agent-core 的 `AgentTool`:声明 + execute 一体**。
// 为什么用它的形状而不是自己写:参数**在 execute 之前已经按 TypeBox schema 校验过**(它管),
// 循环、批量执行、结果回灌也都是它的(见 planner 的 runAgentLoop)。我们只写「这个工具干什么」。
// 与 lib/chat/tools.ts 的分界:那边是取数(SQL 事实,带 evidence),这边**一条事实都不产出** ——
// 它只把「用户在说哪个职业、哪个省」解出来。facts 仍旧由 collectFacts 从那边取。

const say = (t: string) => ({ content: [{ type: 'text' as const, text: t }], details: {} })

//
// 一次兜底解析的三个工具。`out` 是这一次运行的收件箱 ——
// set_slots / give_up 都带 `terminate: true`,循环拿到就收工,不再多问一轮。
export function makeTools(pool: any, lang: Lang, out: ResolveOut) {
  const candidates: OccOption[] = []
  return [
    {
      ...TOOLS.search,
      description: TOOL_DESC.search,
      parameters: Type.Object({
        query: Type.String({ description: TOOL_DESC.searchQuery }),
      }),
      async execute(_id: string, args: { query: string }) {
        const hits = await suggestOccupations(pool, String(args.query ?? '').trim().slice(0, MAX_QUERY_CHARS), lang, SEARCH_LIMIT)
          .catch(() => [] as OccOption[])
        candidates.push(...hits)
        return say(hits.length
          ? `${SEARCH_RESULT_HINT}\n${hits.map((h) => `${h.noc} — ${h.title}`).join('\n')}`
          : TOOL_REPLY.noCandidates)
      },
    },
    {
      ...TOOLS.setSlots,
      description: TOOL_DESC.setSlots,
      parameters: Type.Object({
        noc: Type.Union([Type.String(), Type.Null()], { description: TOOL_DESC.setSlotsNoc }),
        provinces: Type.Optional(Type.Array(Type.String(), { description: TOOL_DESC.setSlotsProvinces })),
        reason: Type.Optional(Type.String({ description: TOOL_DESC.setSlotsReason })),
      }),
      async execute(_id: string, args: { noc: string | null; provinces?: string[]; reason?: string }) {
        const noc = acceptNoc(args.noc, candidates)
        if (args.noc !== null && !noc) {   // 编了一个候选里没有的码 —— 不采信,回落反问
          out.gaveUp = true
          return { ...say(TOOL_REPLY.rejected), terminate: true }
        }
        out.slots = { noc, provs: cleanProvs(args.provinces), reason: String(args.reason ?? '').slice(0, MAX_REASON_CHARS) }
        return { ...say(TOOL_REPLY.recorded), terminate: true }
      },
    },
    {
      ...TOOLS.giveUp,
      description: TOOL_DESC.giveUp,
      parameters: Type.Object({ reason: Type.Optional(Type.String()) }),
      async execute(_id: string, args: { reason?: string }) {
        out.gaveUp = true
        return { ...say(`${TOOL_REPLY.gaveUp}${String(args.reason ?? '')}`.slice(0, MAX_REASON_CHARS)), terminate: true }
      },
    },
  ] as unknown as AgentTool[]
}

// =========================================================================
// 3. 入口
// =========================================================================
//
// 兜底解析器 —— **循环、执行、参数校验全是 pi-agent-core 的 `runAgentLoop`**,我们只出工具与判据。
// 为什么单独存在:它是**流水线放弃那一格的第二次机会**,不是第二套流水线。
// 触发点只有一个 —— `lib/chat/orchestrate` 抛 `noOcc` 之前(由路由把本函数当 `rescueOcc` 注进去)。
// 命中就把槽位补上、原路走完;不命中就照旧反问,用户体验一分不减。
// 为什么用 pi 而不是手写:人家的循环是测过的 —— 工具批量执行、参数按 schema 校验、
// 结果回灌成 toolResult、terminate 提前收工,这些都不该我们再写一遍(手写那版还得自己拼消息)。
// 后端也是它统一的:实测(2026-08-18)Haiku 4.5 1.4s ✅、家里 Ollama 上的 qwen3.6 5-6s ✅
// (Render 到不了,只能本地)、朋友的 ngrok 网关 ❌ —— tools 发过去了、200 回来只有文本,
// 连 `tool_choice:"required"` 都被静默忽略:**是网关不透传,不是模型不会**。等他透传了,换 `./constants.ts` 里那一行。
// 🔴 三条铁律:
//   ① **永不抛异常**。兜底把主路径搞崩,比不兜底糟得多 —— 任何错都 return null 回到反问。
//   ② **只补槽位,不产事实**。它写的字一个都不见客;facts 仍旧由 collectFacts 从工具层取。
//   ③ **默认关着**(env `AGENT_FALLBACK=1` 才开)。花钱的路径不许靠「忘了关」上线。

export const agentFallbackOn = (): boolean => process.env.AGENT_FALLBACK === '1'

//
// 用户原话 → 槽位(或 null=agent 也没辙)。
// 返回 null 的每一条路都必须让调用方回到原来的反问,不能有第二种行为。
export async function resolveByAgent(
  pool: any, text: string, lang: Lang,
): Promise<(AgentSlots & { ms: number }) | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!agentFallbackOn() || !apiKey) return null

  const t0 = Date.now()
  const out: ResolveOut = { slots: null, gaveUp: false }
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)

  try {
    await runAgentLoop(
      [{ role: 'user', content: text.slice(0, MAX_INPUT_CHARS), timestamp: Date.now() } as AgentMessage],
      { systemPrompt: RESOLVE_SYSTEM, messages: [], tools: makeTools(pool, lang, out) },
      {
        model: MODEL, apiKey, maxTokens: MAX_TOKENS,
        convertToLlm: (ms: AgentMessage[]) => ms as Message[],   // 我们没有自定义消息,原样过
      },
      () => {},                                                  // 事件不订阅:结果走 out
      ac.signal,
      stream as unknown as StreamFn,
    )
  } catch (e) {
    // 铁律①:兜底失败 = 当它没发生过
    console.log(`[agent] error (ignored): ${e instanceof Error ? e.message : String(e)}`)
    return null
  } finally { clearTimeout(timer) }

  if (out.gaveUp || !out.slots) {
    console.log(`[agent] no slots (gaveUp=${out.gaveUp}) ms=${Date.now() - t0} — falling back to reask`)
    return null
  }
  const ms = Date.now() - t0
  console.log(`[agent] resolved noc=${out.slots.noc ?? 'null'} provs=${out.slots.provs.join(',') || '-'} `
    + `ms=${ms} reason=${out.slots.reason}`)
  return { ...out.slots, ms }
}
