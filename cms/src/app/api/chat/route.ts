/**
 * POST /api/chat — 对话即产品的唯一入口(C2;设计 docs/design/对话即产品-20260803.md §二/§三/§四)。
 *
 * body: { text, lang: 'zh'|'en'|'ko', history?: [{role,content}] }
 * 200 : { answer, slots, facts, followups }
 * err : { error: 'tooShort'|'noOcc'|'llm'|'limit'|'guard' }
 *
 * 本路由**只管鉴权/限流/错误码**,三步流水线全在 lib/chatOrchestrate(可单测,不碰网络鉴权)。
 * 本批不做付费闸(设计 §五 Frank 未拍板):全部免费,匿名按 IP、登录按账号,只防滥用。
 * 多轮记忆不落库:history 由前端传(设计 §九「v1 不做多轮长记忆」)。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { ChatError, orchestrate, type ChatLang, type ChatTurn } from '@/lib/chatOrchestrate'
import { getUser } from '@/lib/entitlement'
import { freeGate } from '@/lib/freeQuota'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LANGS: ChatLang[] = ['zh', 'en', 'ko']

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
  try {
    const payload = await getPayload({ config: await config })
    const out = await orchestrate((payload.db as any).pool, { text, lang, history })
    console.log(`[chat] ok noc=${out.slots.noc} provs=${out.slots.provs.join('/')} facts=${out.facts.length} in=${text.length}ch`)
    return Response.json(out, { headers: g.headers })
  } catch (e) {
    if (e instanceof ChatError) {
      const status = e.code === 'tooShort' || e.code === 'noOcc' ? 400 : 502
      console.log(`[chat] ${e.code}: ${e.message.slice(0, 200)}`)
      return Response.json({ error: e.code, ...(e.slots ? { slots: e.slots } : {}), ...(dbg ? { detail: e.message.slice(0, 300) } : {}) }, { status })
    }
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`[chat] unexpected: ${msg.slice(0, 300)}`)
    return Response.json({ error: 'llm', ...(dbg ? { detail: msg.slice(0, 300) } : {}) }, { status: 502 })
  }
}
