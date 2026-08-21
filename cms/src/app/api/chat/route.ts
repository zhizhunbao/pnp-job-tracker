/**
 * POST /api/chat — 对话即产品的唯一入口。
 *
 * 2026-08-21 起只走 `lib/consult` 的 pi 工具循环(P5:`lib/chat` 整域删除,Frank 拍板
 * 「默认就用 pi,不用设置」—— 旧链的 `CHAT_PI` 开关随之退役)。模型自己挑工具,
 * 数字与判定只来自库,答复过出口闸;编排细节全在 `lib/consult`,本路由只管
 * 鉴权 / 限流 / 错误码 / 传输形状 / 留痕。
 *
 * body: { text, lang: 'zh'|'en'|'ko', history?: [{role,content}], context?: 上一轮返回的 slots }
 * 200 SSE : data:{"step":"…"}(工具轨迹,服务端已按用户语种写好,多条)
 *           → data:{answer,slots,facts,followups,activity,thread,degraded}(定稿,整段)
 *           → data:[DONE];中途故障发 data:{"error":码},前端同一套错误码分支照吃。
 *           ⚠️ 正文暂不逐字流:逐句门(一句过闸才发)随旧链退役,新链的逐句门另批再建 ——
 *           宁可少个打字机,不把没过闸的半稿亮给用户(2026-08-08 拍板的红线不变)。
 * 4xx JSON: 前置错误(limit)仍走 JSON + 状态码;流一旦开了就改不回状态码。
 *
 * 🔵 **三层帽只防滥用**(功能全部免费):匿名按 IP、免费登录按账号(freeGate 统一池)、
 *    Pro 按 PRO_CHAT_DAILY(2026-08-18 Frank 点名补的)。多轮记忆不落库:history 由前端传。
 *
 * 🔵 **留痕**(threadId / turnOf / logChat)原是 `lib/chat/log.ts` 的幸存件 —— 只有本路由
 *    一个消费者,按宪法「只有一个消费者的东西不该导出」内联进来,chat_logs 的列形状一字未动
 *    (生产面板与复现率仪表盘都靠它)。铁律照旧:①永不影响回答;②不存能指向人的东西。
 */
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { consult } from '@/lib/consult/server'
import type { Fact, Profile as ConsultProfile, Turn } from '@/lib/consult'
import { isChatError } from '@/lib/error'
import { getUser, isPro } from '@/lib/quota/server'
import { freeGate } from '@/lib/quota/server'
import { checkLimit } from '@/lib/quota/server'
import { PRO_CHAT_DAILY } from '@/lib/quota'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LANGS: Lang[] = ['zh', 'en', 'ko']
const enc = new TextEncoder()
const sse = (o: unknown) => enc.encode(`data: ${JSON.stringify(o)}\n\n`)

// ── 留痕(原 lib/chat/log.ts;列形状不动,别改)──────────────────────────────
const Q_CAP = 2000      // 入口本来就按前端 MAX_TEXT=1200 截过,这里只是兜底
const A_CAP = 8000
const THREAD_SEED = 200 // 首轮提问取前 200 字做哈希:后面再长也不影响同一串的归并

/**
 * 同一串追问的 id = **首轮提问文本**的哈希。不用 IP/UA/session —— 那三样都指向人,
 * 而我们只需要「这几轮是一串」这一个信息。
 */
const threadId = (text: string, history: Turn[] = []): string => {
  const first = history.find((h) => h.role === 'user')?.content ?? text
  return createHash('sha256').update(first.trim().slice(0, THREAD_SEED)).digest('hex').slice(0, 16)
}

/** 本串里的第几轮:history 里的 user 消息数 + 1。 */
const turnOf = (history: Turn[] = []): number =>
  history.filter((h) => h.role === 'user').length + 1

/** 定稿返回体(前端 ChatAnswer 的 Answer 契约按这个写)。slots 只装新链真有的几格。 */
type ChatOut = {
  answer: string
  slots: { noc: string | null; occText: string; provs: string[]; expMonths: number | null; status: string | null; claims: never[] }
  facts: Fact[]
  followups: string[]
  degraded: boolean
}

/**
 * 写一行 chat_logs。fire-and-forget,自己吞异常 —— 留痕是副产品,它挂了用户不该有任何感知。
 */
const logChat = (payload: any, row: { text: string; lang: Lang; history: Turn[]; result?: ChatOut; err?: string; ms: number }): void => {
  if (!payload) return
  const { text, lang, history, result, err, ms } = row
  const facts = result?.facts ?? []
  payload.create({
    collection: 'chat-logs',
    data: {
      thread: threadId(text, history),
      turn: turnOf(history),
      lang,
      question: text.slice(0, Q_CAP),
      answer: result?.answer ? result.answer.slice(0, A_CAP) : null,
      noc: result?.slots?.noc ?? null,
      slots: result?.slots ?? null,
      facts: facts.length ? facts : null,
      tools: facts.length ? [...new Set(facts.map((f) => f.tool))] : null,
      degraded: result?.degraded ?? false,
      err: err ?? null,
      ms: Math.round(ms),
    },
  }).catch((e: unknown) => {
    console.log(`[chatlog] skipped: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`)
  })
}

export async function POST(req: Request) {
  let body: any = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : 'en'
  const history: Turn[] = (Array.isArray(body?.history) ? body.history : [])
    .filter((h: any) => (h?.role === 'user' || h?.role === 'assistant') && typeof h?.content === 'string')
    .slice(-6)
    .map((h: any): Turn => ({ role: h.role, content: h.content.slice(0, 600) }))
  // context 来自上一轮服务端返回的 slots;只取 noc 一格,且进了 consult 还要过采信(boxFor 当场查 TEER)
  const context = body?.context && typeof body.context === 'object' ? body.context : undefined

  const user = await getUser(await headers()).catch(() => null)
  const up = (user as any)?.profile ?? {}
  // 免费池(匿名 IP / 登录账号);402 也当限流处理,前端一个 'limit' 分支就够
  const g = freeGate(user, req as any)
  if (g.block) return Response.json({ error: 'limit' }, { status: 429 })
  // Pro 个人日帽:freeGate 只帽住免费与匿名,Pro 在这条路上原本是敞开的,而每一轮都真调模型
  if (user && isPro(user) && !checkLimit([[`chat:pro:${user.id}`, PRO_CHAT_DAILY]])) {
    return Response.json({ error: 'limit' }, { status: 429 })
  }

  // 真实错误细节只回 @test.local(standalone-dynamic-loads 探针惯例);对外只给错误码
  const dbg = String((user as any)?.email || '').endsWith('@test.local')

  // 档案映射:users.profile 只搬 consult 认的那几格;上一轮 slots 的 noc 优先(多轮职业记忆)
  const profile: ConsultProfile = {
    noc: typeof (context as { noc?: unknown } | undefined)?.noc === 'string'
      ? (context as { noc: string }).noc
      : Array.isArray(up.nocCodes) && typeof up.nocCodes[0] === 'string' ? up.nocCodes[0] : null,
    occText: null,
    provs: Array.isArray(up.targetProvinces) ? up.targetProvinces.filter((p: unknown): p is string => typeof p === 'string') : [],
    // 总经验 = 两格相加(都是他自己报的数,不是官方数字);两格都没有才是 null
    expMonths: up.expCanadaMonths == null && up.expForeignMonths == null
      ? null
      : Number(up.expCanadaMonths ?? 0) + Number(up.expForeignMonths ?? 0),
    status: typeof up.currentStatus === 'string' ? up.currentStatus : null,
  }

  let pl: any = null
  const t0 = Date.now()
  const steps: string[] = []
  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      const send = (o: unknown) => { try { c.enqueue(sse(o)) } catch { /* 客户端已断开 */ } }
      try {
        const payload = await getPayload({ config: await config })
        pl = payload
        const r = await consult({
          db: (payload.db as any).pool, text, lang, profile, history,
          onStep: (s: string) => { steps.push(s); send({ step: s }) },
          onDelta: null,
        })
        // 见客 label 用 quote(引文):consult 的 label 是给模型看的英文说明,永不见客
        const facts = r.facts.map((f): Fact => ({
          tool: f.tool, label: f.quote || f.label, quote: f.quote, value: f.value, valueText: f.valueText,
          unit: f.unit, evidence: f.evidence, availability: f.availability, cited: f.cited,
        }))
        const ok: ChatOut = {
          answer: r.answer,
          slots: { noc: r.noc, occText: '', provs: profile.provs, expMonths: profile.expMonths, status: profile.status, claims: [] },
          facts,
          followups: [],
          degraded: r.degraded,
        }
        logChat(pl, { text, lang, history, result: ok, ms: Date.now() - t0 })
        console.log(`[chat] ok noc=${r.noc} facts=${r.facts.length} ms=${Date.now() - t0} in=${text.length}ch`)
        send({ ...ok, activity: steps, thread: threadId(text, history) })
      } catch (err) {
        const code = err instanceof Error && isChatError<null>(err) ? err.code : 'llm'
        const msg = err instanceof Error ? err.message : String(err)
        logChat(pl, { text, lang, history, err: code, ms: Date.now() - t0 })
        console.log(`[chat] ${code}: ${msg.slice(0, 200)}`)
        send({ error: code, ...(dbg ? { detail: msg.slice(0, 300) } : {}) })
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
