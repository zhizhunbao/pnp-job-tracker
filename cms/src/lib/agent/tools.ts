// agent 能碰的三个工具 —— **pi-agent-core 的 `AgentTool`:声明 + execute 一体**。
//
// 为什么用它的形状而不是自己写:参数**在 execute 之前已经按 TypeBox schema 校验过**(它管),
// 循环、批量执行、结果回灌也都是它的(见 planner 的 runAgentLoop)。我们只写「这个工具干什么」。
//
// 与 lib/chat/tools.ts 的分界:那边是取数(SQL 事实,带 evidence),这边**一条事实都不产出** ——
// 它只把「用户在说哪个职业、哪个省」解出来。facts 仍旧由 collectFacts 从那边取。
//
// 🔴 校验归它,**采信归我们**:schema 过了不等于内容可信。NOC 必须出现在
//    search_occupations 真实返回的候选里(acceptNoc),省码必须过九省表(cleanProvs)——
//    「宁可少一个省,不许把 NB 当 NS」是同一条规矩。

import { Type } from '@earendil-works/pi-ai'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { PNP_PROVINCES, suggestOccupations, type OccOption } from '@/lib/chat'
import type { Lang } from '@/lib/i18n'
import { SEARCH_RESULT_HINT } from './prompts'

export type AgentSlots = { noc: string | null; provs: string[]; reason: string }

const PROVS = new Set([...PNP_PROVINCES, 'QC'])

/** 模型给的省码 → 认得出的留下,认不出的丢掉(不猜)。 */
export const cleanProvs = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : [])
    .map((p) => String(p ?? '').trim().toUpperCase())
    .filter((p) => PROVS.has(p))

/** 模型挑的 NOC 只有在**候选里出现过**才算数 —— 它没法用查询结果之外的码蒙混过去。 */
export const acceptNoc = (raw: unknown, candidates: OccOption[]): string | null => {
  const noc = String(raw ?? '').trim()
  if (!/^\d{5}$/.test(noc)) return null
  return candidates.some((c) => c.noc === noc) ? noc : null
}

const say = (t: string) => ({ content: [{ type: 'text' as const, text: t }], details: {} })

/**
 * 一次兜底解析的三个工具。`out` 是这一次运行的收件箱 ——
 * set_slots / give_up 都带 `terminate: true`,循环拿到就收工,不再多问一轮。
 */
export function makeTools(pool: any, lang: Lang, out: { slots: AgentSlots | null; gaveUp: boolean }) {
  const candidates: OccOption[] = []
  return [
    {
      name: 'search_occupations',
      label: '查职业候选',
      description: "Search this site's occupation table by job title or field of study (English or Chinese). "
        + 'Returns candidate 5-digit NOC codes with their official titles. Use this before deciding on a NOC — never invent one.',
      parameters: Type.Object({
        query: Type.String({ description: 'Job title or field of study, e.g. "software developer" / "会计"' }),
      }),
      async execute(_id: string, args: { query: string }) {
        const hits = await suggestOccupations(pool, String(args.query ?? '').trim().slice(0, 80), lang, 5)
          .catch(() => [] as OccOption[])
        candidates.push(...hits)
        return say(hits.length
          ? `${SEARCH_RESULT_HINT}\n${hits.map((h) => `${h.noc} — ${h.title}`).join('\n')}`
          : 'No candidates found.')
      },
    },
    {
      name: 'set_slots',
      label: '记下槽位',
      description: 'Record the resolved slots. Call once you are confident, or with noc=null for questions that do not depend on an occupation.',
      parameters: Type.Object({
        noc: Type.Union([Type.String(), Type.Null()], { description: '5-digit NOC taken from search_occupations results, or null' }),
        provinces: Type.Optional(Type.Array(Type.String(), { description: 'Two-letter province codes the user mentioned, e.g. ["BC","ON"]' })),
        reason: Type.Optional(Type.String({ description: 'One short line: why this NOC / why none is needed' })),
      }),
      async execute(_id: string, args: { noc: string | null; provinces?: string[]; reason?: string }) {
        const noc = acceptNoc(args.noc, candidates)
        if (args.noc !== null && !noc) {   // 编了一个候选里没有的码 —— 不采信,回落反问
          out.gaveUp = true
          return { ...say('Rejected: that NOC is not in the search results. Falling back.'), terminate: true }
        }
        out.slots = { noc, provs: cleanProvs(args.provinces), reason: String(args.reason ?? '').slice(0, 200) }
        return { ...say('Recorded.'), terminate: true }
      },
    },
    {
      name: 'give_up',
      label: '交回反问',
      description: 'No plausible occupation can be found. The pipeline will fall back to asking the user.',
      parameters: Type.Object({ reason: Type.Optional(Type.String()) }),
      async execute(_id: string, args: { reason?: string }) {
        out.gaveUp = true
        return { ...say(`Gave up: ${String(args.reason ?? '')}`.slice(0, 200)), terminate: true }
      },
    },
  ] as unknown as AgentTool[]
}
