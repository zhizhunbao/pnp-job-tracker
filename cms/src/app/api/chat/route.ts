/**
 * POST /api/chat — 对话即产品的唯一入口(C2;设计 docs/design/对话即产品-20260803.md §二/§三/§四)。
 *
 * body: { text, lang: 'zh'|'en'|'ko', history?: [{role,content}], context?: previousAnswer.slots }
 * 200 SSE : data:{"step":"…"}(工具轨迹,多条) → data:{"delta":"…"}(正文,逐句多条)
 *           → data:{answer,slots,facts,followups}(整段:facts/followups 只能整段给) → data:[DONE]
 *           中途可能插一条 data:{"reset":true} = 前面发出去的正文作废,前端清屏(见下)
 * 200 JSON: 同一份 { answer, slots, facts, followups }(前置阶段就出结果时;前端按 content-type 分流)
 * err : { error: 'tooShort'|'noOcc'|'llm'|'limit'|'guard'|'busy' } + 状态码(**前置错误一律走 JSON**)
 *       busy(503)= 合成等不来字(停摆闸响);不发事实清单,前端出「系统繁忙,稍后再试」+重试钮
 *
 * 🔵 **正文按句流**(2026-08-08 拍板;旧口径「只流轨迹」的理由——「出口校验整段才跑」——已被拆掉):
 *    一句过了逐句门(数字回查 facts / 内部码 / 语言混用 / 两态揉一句)才发,判据见 lib/chat/guards
 *    的 makeSentenceGate。撞了门 → `{"reset":true}` 撤回已发的那截,再走重试/降级,最终整段照旧由
 *    `{answer,…}` 那条事件定稿(前端一律以它为准)。轨迹事件仍全是我们自己构造的字符串(STEP)。
 *
 * 🔵 **闸门**:tooShort / limit / noOcc / 抽槽位挂掉这些**前置**错误必须保住 JSON + 状态码,
 *    可流一旦开了头就再也改不回状态码 —— 所以先跑 orchestrate,拿到「认出职业」那一格(NOC 已定,
 *    noOcc 不可能再发生)才建 Response 开流,之前攒下的事件开流时补发。前置阶段直接失败/出结果的
 *    就照今天的 JSON 回。限流头两条路都在 Response 建立时给(流开了加不上)。
 *
 * 🔵 **登录用户的槽回填档案**(D3,2026-08-09):一轮抽出来的高置信槽**只补空**写进 users.profile,
 *    答复末尾加一行告知(判定与文案在 lib/chat/followups 的 profileFill,本路由只负责登录判定与写库)。
 *    匿名一个字都不存;写库失败当无事发生,答复照旧。
 *
 * 本路由**只管鉴权/限流/错误码/传输形状**,三步流水线全在 lib/chat(可单测,不碰网络鉴权)。
 * 不做付费闸(设计 §五 Frank 未拍板):功能全部免费。**三层帽只防滥用**——匿名按 IP、免费登录按账号
 * (两者都在 freeGate 的统一池里)、Pro 按 PRO_CHAT_DAILY(2026-08-18 Frank 点名补的,此前 Pro 敞开)。
 * 多轮记忆不落库:history 由前端传(设计 §九「v1 不做多轮长记忆」)。
 */
import { headers } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { logChat, threadId } from '@/lib/chat'
import { ChatError, chatProfileContext, orchestrate, profileFill, type ChatResult, type ChatStep, type ChatTurn } from '@/lib/chat'
import { resolveByAgent } from '@/lib/agent'
import { getUser, isPro } from '@/lib/entitlement'
import { freeGate } from '@/lib/freeQuota'
import { checkLimit } from '@/lib/rateLimit'
import { PRO_CHAT_DAILY } from '@/lib/plan'
import { patchProfile } from '@/lib/profile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LANGS: Lang[] = ['zh', 'en', 'ko']
const enc = new TextEncoder()
const sse = (o: unknown) => enc.encode(`data: ${JSON.stringify(o)}\n\n`)

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : 'en'
  const history: ChatTurn[] = (Array.isArray(body?.history) ? body.history : [])
    .filter((h: any) => (h?.role === 'user' || h?.role === 'assistant') && typeof h?.content === 'string')
    .slice(-6)
    .map((h: any): ChatTurn => ({ role: h.role, content: h.content.slice(0, 600) }))
  // context 来自上一轮服务端返回的 slots；编排层仍会逐字段归一，不直接信任客户端形状。
  const context = body?.context && typeof body.context === 'object' ? body.context : undefined

  const user = await getUser(await headers()).catch(() => null)
  // 建档点选卡的「档案已有槽不追问」输入(手填优先;匿名=全 false,三张卡都可能出)
  const up = (user as any)?.profile ?? {}
  const profileKnown = {
    status: !!up.currentStatus,
    provs: Array.isArray(up.targetProvinces) && up.targetProvinces.length > 0,
    clb: up.clb != null,
  }
  // Memory 的消费端：登录档案不只拿来判断「这题问过没」，还作为新会话的结构化兜底上下文。
  // 显式用户原话与本会话上一轮仍优先，合并顺序由 orchestrate.mergeRememberedSlots 守住。
  const profileContext = chatProfileContext(up)
  // 免费池(匿名 IP / 登录账号);本批不设付费墙,402 也当限流处理,前端一个 'limit' 分支就够
  const g = freeGate(user, req as any)
  if (g.block) return Response.json({ error: 'limit' }, { status: 429 })
  // Pro 个人日帽(2026-08-18 Frank「chat 部分,每个用户给限额」):freeGate 只帽住免费与匿名,
  // **Pro 在这条路上原本是敞开的**,而每一轮都真调模型。同 advisor 的 PRO_ADVISOR_DAILY:防滥用,不是卖点。
  if (user && isPro(user) && !checkLimit([[`chat:pro:${user.id}`, PRO_CHAT_DAILY]])) {
    return Response.json({ error: 'limit' }, { status: 429 })
  }

  // 真实错误只回 @test.local(standalone-dynamic-loads 探针惯例);对外只给错误码,不泄内部话术
  const dbg = String((user as any)?.email || '').endsWith('@test.local')
  const fail = (e: unknown) => {
    if (e instanceof ChatError) {
      // busy = 模型那头等不来字 → 503(它是「现在忙,过会儿再来」,不是 502「上游给了个坏回答」)
      const status = e.code === 'tooShort' || e.code === 'noOcc' ? 400 : e.code === 'busy' ? 503 : 502
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
  // 正文增量:合成阶段(write)才可能发,那时流早开了(occ 在它前面)。开不了流就整段给,不攒 —— 攒了也没用
  const emit = (o: unknown) => { if (live.ctrl) { try { live.ctrl.enqueue(sse(o)) } catch { /* 客户端已断开 */ } } }
  const onDelta = (s: string) => emit({ delta: s })
  const onReset = () => emit({ reset: true })

  // 留痕(设计 §1.1):payload 借 run 里那一次 getPayload 捎出来 —— 不为它多建一次实例;
  // getPayload 自己挂了就留 null,logChat 直接跳过(那时用户已经拿到错误码,留痕不值得再抢救)。
  let pl: any = null
  const t0 = Date.now()
  const log = (d: Done) => logChat(pl, {
    text, lang, history, ms: Date.now() - t0,
    ...('ok' in d ? { result: d.ok } : { err: d.err instanceof ChatError ? d.err.code : 'llm' }),
  })

  /**
   * 🔵 **对话槽回填档案**(D3;设计 docs/design/对话闭环总设计-20260809.md §3 批A④)。
   * 判定与文案全在 `profileFill`(纯函数,可单测);这里只做三件事:登录才写、写成了才说、写挂了当无事发生。
   *   - **匿名一个字都不存**(没有 user 直接返回);
   *   - 只补空由 profileFill 保证(手填优先),写入顺带更 `profileUpdatedAt`;
   *   - 尾行接在答复正文末尾 —— SSE 的定稿事件是 `{answer,…}`(前端以它为准),前端不用改。
   */
  const fillProfile = async (r: ChatResult): Promise<ChatResult> => {
    const uid = (user as any)?.id
    if (!uid) return r
    const fill = profileFill(r.slots, (user as any).profile, lang)
    if (!fill) return r
    try {
      await patchProfile(uid, { ...fill.patch, profileUpdatedAt: new Date().toISOString() })
    } catch (e) {
      // 留痕即可:档案没补上不该让他这轮的答复变样(同 logChat 那条「永不影响回答」)
      console.log(`[chat] profile fill failed: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`)
      return r
    }
    console.log(`[chat] profile filled keys=${Object.keys(fill.patch).join(',')}`)
    return r.answer ? { ...r, answer: `${r.answer}\n\n${fill.tail}` } : r
  }

  type Done = { ok: ChatResult } | { err: unknown }
  const run: Promise<Done> = (async (): Promise<Done> => {
    try {
      const payload = await getPayload({ config: await config })
      pl = payload
      return { ok: await orchestrate(
        // rescueOcc:抽不出职业码时让 lib/agent 查一次库再说(默认 env 关着)。
        // 组合放在路由层 —— lib/chat 不认识 lib/agent,依赖方向只有一条。
        (payload.db as any).pool,
        { text, lang, history, context, profileContext, profileKnown, rescueOcc: resolveByAgent },
        { onStep, onDelta, onReset },
      ) }
    } catch (err) { return { err } }
  })()

  // 谁先到:开流闸门(= 已过前置阶段)还是整件事已经结束
  const early = await Promise.race([committed.then(() => null), run])

  // 前置阶段就结束了(tooShort / noOcc / 抽槽位挂掉)→ 照旧 JSON + 状态码,前端老路径原样吃
  if (early) {
    if ('err' in early) { log(early); const f = fail(early.err); return Response.json(f.body, { status: f.status }) }
    const ok = await fillProfile(early.ok)          // 留痕存的是**他真正看到的**那段(含尾行)
    log({ ok })
    console.log(`[chat] ok(json) noc=${ok.slots.noc} facts=${ok.facts.length} in=${text.length}ch`)
    // thread = chat_logs 的同名串 ID(首轮提问哈希,不指向人):面板显示+复制,拿它能从留痕里拉整串对话
    // 纯联邦规则等问题不需要 NOC，流式开闸(phase=occ)不会打开，因此走这条快速 JSON 路径。
    // 但前面真实执行过的 read/tool/write 不能丢：Activity 要展示事实，不该只有职业问题才看得见。
    return Response.json({
      ...ok, activity: buffered.map((s) => s.text), thread: threadId(text, history),
    }, { headers: g.headers })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      live.ctrl = c
      for (const s of buffered) c.enqueue(sse({ step: s.text }))   // 开流前攒下的那两格补发
      const d = await run
      if ('ok' in d) {
        const ok = await fillProfile(d.ok)
        log({ ok })
        console.log(`[chat] ok(sse) noc=${ok.slots.noc} facts=${ok.facts.length} in=${text.length}ch`)
        c.enqueue(sse({ ...ok, thread: threadId(text, history) }))
      } else {
        log(d)
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
