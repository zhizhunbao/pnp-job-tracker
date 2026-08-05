/**
 * POST /api/chat — 对话即产品的唯一入口(C2;设计 docs/design/对话即产品-20260803.md §二/§三/§四)。
 *
 * body: { text, lang: 'zh'|'en'|'ko', history?: [{role,content}] }
 * 200 SSE : data:{"step":"…"}(工具轨迹,多条) → data:{answer,slots,facts,followups}(整段) → data:[DONE]
 * 200 JSON: 同一份 { answer, slots, facts, followups }(前置阶段就出结果时;前端按 content-type 分流)
 * err : { error: 'tooShort'|'noOcc'|'llm'|'limit'|'guard' } + 状态码(**前置错误一律走 JSON**)
 *
 * 🔴 **流的是工具轨迹,不是答案**(2026-08-04 拍板,别改):出口五道校验是整段答复落地后才跑的,
 *    违规要重试或降级成 factSheet —— 流答案 = 用户可能读到一个随后被撤回的数字。轨迹事件全是我们
 *    自己构造的字符串(lib/chatOrchestrate 的 STEP),只带工具返回的数字,不掺模型输出。
 *
 * 🔵 **闸门**:tooShort / limit / noOcc / 抽槽位挂掉这些**前置**错误必须保住 JSON + 状态码,
 *    可流一旦开了头就再也改不回状态码 —— 所以先跑 orchestrate,拿到「认出职业」那一格(NOC 已定,
 *    noOcc 不可能再发生)才建 Response 开流,之前攒下的事件开流时补发。前置阶段直接失败/出结果的
 *    就照今天的 JSON 回。限流头两条路都在 Response 建立时给(流开了加不上)。
 *
 * 本路由**只管鉴权/限流/错误码/传输形状**,三步流水线全在 lib/chatOrchestrate(可单测,不碰网络鉴权)。
 * 本批不做付费闸(设计 §五 Frank 未拍板):全部免费,匿名按 IP、登录按账号,只防滥用。
 * 多轮记忆不落库:history 由前端传(设计 §九「v1 不做多轮长记忆」)。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ChatError, orchestrate, type ChatLang, type ChatResult, type ChatStep, type ChatTurn } from '@/lib/chatOrchestrate'
import { getUser } from '@/lib/entitlement'
import { freeGate } from '@/lib/freeQuota'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LANGS: ChatLang[] = ['zh', 'en', 'ko']
const enc = new TextEncoder()
const sse = (o: unknown) => enc.encode(`data: ${JSON.stringify(o)}\n\n`)

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const lang: ChatLang = LANGS.includes(body?.lang) ? body.lang : 'en'
  const history: ChatTurn[] = (Array.isArray(body?.history) ? body.history : [])
    .filter((h: any) => (h?.role === 'user' || h?.role === 'assistant') && typeof h?.content === 'string')
    .slice(-6)
    .map((h: any): ChatTurn => ({ role: h.role, content: h.content.slice(0, 600) }))

  const user = await getUser(await headers()).catch(() => null)
  // 免费池(匿名 IP / 登录账号);本批不设付费墙,402 也当限流处理,前端一个 'limit' 分支就够
  const g = freeGate(user, req as any)
  if (g.block) return Response.json({ error: 'limit' }, { status: 429 })

  // 真实错误只回 @test.local(standalone-dynamic-loads 探针惯例);对外只给错误码,不泄内部话术
  const dbg = String((user as any)?.email || '').endsWith('@test.local')
  const fail = (e: unknown) => {
    if (e instanceof ChatError) {
      const status = e.code === 'tooShort' || e.code === 'noOcc' ? 400 : 502
      console.log(`[chat] ${e.code}: ${e.message.slice(0, 200)}`)
      return { status, body: { error: e.code, ...(e.slots ? { slots: e.slots } : {}), ...(dbg ? { detail: e.message.slice(0, 300) } : {}) } }
    }
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`[chat] unexpected: ${msg.slice(0, 300)}`)
    return { status: 502, body: { error: 'llm', ...(dbg ? { detail: msg.slice(0, 300) } : {}) } }
  }

  const live: { ctrl: ReadableStreamDefaultController<Uint8Array> | null } = { ctrl: null }   // 开流后才有
  const buffered: ChatStep[] = []
  let openStream: (() => void) | null = null
  const committed = new Promise<void>((res) => { openStream = res })
  const onStep = (s: ChatStep) => {
    if (live.ctrl) { try { live.ctrl.enqueue(sse({ step: s.text })) } catch { /* 客户端已断开 */ } return }
    buffered.push(s)                                // 还没开流:先攒着,开流时按原序补发
    if (s.phase === 'occ') openStream?.()            // NOC 已定 = 前置错误全过去了,可以开流
  }

  type Done = { ok: ChatResult } | { err: unknown }
  const run: Promise<Done> = (async (): Promise<Done> => {
    try {
      const payload = await getPayload({ config: await config })
      return { ok: await orchestrate((payload.db as any).pool, { text, lang, history }, { onStep }) }
    } catch (err) { return { err } }
  })()

  // 谁先到:开流闸门(= 已过前置阶段)还是整件事已经结束
  const early = await Promise.race([committed.then(() => null), run])

  // 前置阶段就结束了(tooShort / noOcc / 抽槽位挂掉)→ 照旧 JSON + 状态码,前端老路径原样吃
  if (early) {
    if ('err' in early) { const f = fail(early.err); return Response.json(f.body, { status: f.status }) }
    console.log(`[chat] ok(json) noc=${early.ok.slots.noc} facts=${early.ok.facts.length} in=${text.length}ch`)
    return Response.json(early.ok, { headers: g.headers })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      live.ctrl = c
      for (const s of buffered) c.enqueue(sse({ step: s.text }))   // 开流前攒下的那两格补发
      const d = await run
      if ('ok' in d) {
        console.log(`[chat] ok(sse) noc=${d.ok.slots.noc} facts=${d.ok.facts.length} in=${text.length}ch`)
        c.enqueue(sse(d.ok))
      } else {
        // 开流之后才出的故障(合成挂掉 / guard 无 facts 可退):状态码已经发不出去了,给错误事件,
        // 前端同一套错误码分支照吃(ChatBox 的 readSse 认 {error})
        c.enqueue(sse({ error: fail(d.err).body.error }))
      }
      c.enqueue(enc.encode('data: [DONE]\n\n'))
      c.close()
    },
  })
  return new Response(stream, {
    headers: {
      ...g.headers,                                   // 限流头只能在这儿给(流开了就加不上)
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',      // no-transform:不许中间层改写
      'x-accel-buffering': 'no',                      // 否则 nginx 类中间层攒满才吐,流等于没流
      connection: 'keep-alive',
    },
  })
}
