// 兜底解析器 —— **循环、执行、参数校验全是 pi-agent-core 的 `runAgentLoop`**,我们只出工具与判据。
//
// 为什么单独存在:它是**流水线放弃那一格的第二次机会**,不是第二套流水线。
// 触发点只有一个 —— `lib/chat/orchestrate` 抛 `noOcc` 之前(由路由把本函数当 `rescueOcc` 注进去)。
// 命中就把槽位补上、原路走完;不命中就照旧反问,用户体验一分不减。
//
// 为什么用 pi 而不是手写:人家的循环是测过的 —— 工具批量执行、参数按 schema 校验、
// 结果回灌成 toolResult、terminate 提前收工,这些都不该我们再写一遍(手写那版还得自己拼消息)。
// 后端也是它统一的:实测(2026-08-18)Haiku 4.5 1.4s ✅、家里 Ollama 上的 qwen3.6 5-6s ✅
// (Render 到不了,只能本地)、朋友的 ngrok 网关 ❌ —— tools 发过去了、200 回来只有文本,
// 连 `tool_choice:"required"` 都被静默忽略:**是网关不透传,不是模型不会**。等他透传了,这里换一行 model。
//
// 🔴 三条铁律:
//   ① **永不抛异常**。兜底把主路径搞崩,比不兜底糟得多 —— 任何错都 return null 回到反问。
//   ② **只补槽位,不产事实**。它写的字一个都不见客;facts 仍旧由 collectFacts 从工具层取。
//   ③ **默认关着**(env `AGENT_FALLBACK=1` 才开)。花钱的路径不许靠「忘了关」上线。

import { stream } from '@earendil-works/pi-ai/api/anthropic-messages'
import type { Message, Model } from '@earendil-works/pi-ai'
import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { AgentMessage, StreamFn } from '@earendil-works/pi-agent-core'
import type { Lang } from '@/lib/i18n'
import { RESOLVE_SYSTEM } from './prompts'
import { makeTools, type AgentSlots } from './tools'

const MAX_TOKENS = 512
const TIMEOUT_MS = 12000    // 兜底不许拖慢反问:超时就回原路

/** 只有 Haiku。换后端 = 换这里的 `api`/`baseUrl` 与上面那行 stream,pi-ai 把差异都吃掉了。 */
const MODEL: Model<'anthropic-messages'> = {
  id: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5', name: 'haiku',
  api: 'anthropic-messages', provider: 'anthropic', baseUrl: 'https://api.anthropic.com',
  reasoning: false, input: ['text'], contextWindow: 200000, maxTokens: MAX_TOKENS,
  cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
} as Model<'anthropic-messages'>

export const agentFallbackOn = (): boolean => process.env.AGENT_FALLBACK === '1'

/**
 * 用户原话 → 槽位(或 null=agent 也没辙)。
 * 返回 null 的每一条路都必须让调用方回到原来的反问,不能有第二种行为。
 */
export async function resolveByAgent(
  pool: any, text: string, lang: Lang,
): Promise<(AgentSlots & { ms: number }) | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!agentFallbackOn() || !apiKey) return null

  const t0 = Date.now()
  const out: { slots: AgentSlots | null; gaveUp: boolean } = { slots: null, gaveUp: false }
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)

  try {
    await runAgentLoop(
      [{ role: 'user', content: text.slice(0, 1200), timestamp: Date.now() } as AgentMessage],
      { systemPrompt: RESOLVE_SYSTEM, messages: [], tools: makeTools(pool, lang, out) },
      {
        model: MODEL as Model<'anthropic-messages'>, apiKey, maxTokens: MAX_TOKENS,
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
