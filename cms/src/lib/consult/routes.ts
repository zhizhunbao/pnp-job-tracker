/**
 * 对话域的 HTTP 芯(第十一抽屉):/api/consult/chat —— 对话即产品的唯一入口。
 * 只走 pi 工具循环(2026-08-21 Frank「默认就用 pi」);模型自己挑工具,数字与判定只来自库,
 * 答复过出口闸;编排全在 functions 的 consult,这里只管鉴权/限流/错误码/传输形状/留痕。
 * 200 SSE:data:{"step"} 多条 → 定稿整段 → data:[DONE];中途故障发 data:{"error":码}。
 * ⚠️ 正文暂不逐字流:逐句门随旧链退役,另批再建 —— 宁可少个打字机,不把没过闸的半稿亮给用户
 * (2026-08-08 红线)。4xx JSON 只在流开起来之前(流一旦开了就改不回状态码)。
 * 三层帽只防滥用(功能全部免费):匿名按 IP、免费登录按账号(freeGate 统一池)、Pro 按
 * PRO_CHAT_DAILY。多轮记忆不落库:history 由前端传。
 * 留痕(threadIdOf/turnOf/logChat)原是 lib/chat/log.ts 幸存件,单消费者不导出,住本文件;
 * chat_logs 列形状一字不动(生产面板与复现率仪表盘都靠它)。
 * 跨边界断言两处:`await req.json() as ChatBody`(网络 body 先收再逐格验)与
 * `user.profile as ChatUserProfile`(quota 的档案格是递归 json,只读声明的那几格)。
 *
 * @author Frank
 * @time 2026-08-23 07:40:00
 */
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDb } from '../db/server'
import { isChatError } from '../error'
import { HDR_CACHE_CONTROL, HDR_CONTENT_TYPE_LC, TOO_MANY } from '../http'
import type { Lang } from '../i18n'
import { CHAT_LOG, log } from '../log'
import { checkLimit, freeGate, getUser, isPro } from '../quota/server'
import { PRO_CHAT_DAILY } from '../quota'
import {
  A_CAP, ACCEL_NO, CHAT_LANGS, COLLECTION_CHAT_LOGS, CONN_KEEP_ALIVE, DETAIL_CAP, E_LIMIT, E_LLM,
  ERR_LOG_CAP, HASH_HEX, HASH_SHA256, HDR_ACCEL, HDR_CONNECTION, HISTORY_MAX, LANG_FALLBACK,
  PRO_LIMIT_PREFIX, Q_CAP, ROLE, SSE_CACHE_CONTROL, SSE_CONTENT_TYPE, SSE_DONE, SSE_PREFIX, SSE_SUFFIX,
  TEST_MAIL_SUFFIX, THREAD_ID_LEN, THREAD_SEED, TURN_CONTENT_CAP,
} from './constants'
import { consult } from './functions'
import type {
  ChatBody, ChatOut, ChatPayloadHandle, ChatUserProfile, Fact, LogChatIn, Profile, SsePacket, ThreadIdIn, Turn,
} from './types'

/**
 * POST /api/consult/chat:body { text, lang, history?, context? }。
 * 档案映射红线:users.profile 只搬 consult 认的那几格;上一轮 slots 的 noc 优先(多轮职业
 * 记忆),进了 consult 还要过采信(boxFor 当场查 TEER)。总经验 = 两格相加(都是他自己报的数,
 * 不是官方数字),两格都没有才是 null。见客 label 用 quote(引文):consult 的 label 是给
 * 模型看的英文说明,永不见客。
 *
 * @param req 请求。
 * @returns SSE 流;前置限流 429 JSON。
 */
// eslint-disable-next-line local/function-length -- 鉴权→三层帽→档案映射→SSE 流一条握着共同闭包(steps/t0/pl)的入口流水;拆开每段都要把六七个中间量显式穿一串
export async function consultChatRoute(req: Request): Promise<Response> {
  let body: ChatBody | null = null
  try {
    body = await req.json() as ChatBody
  } catch {
    body = null
  }
  let text = ''
  let lang: Lang = LANG_FALLBACK
  let history: Turn[] = []
  let contextNoc: string | null = null
  if (body != null) {
    if (typeof body.text === 'string') {
      text = body.text.trim()
    }
    if (typeof body.lang === 'string' && CHAT_LANGS.includes(body.lang as Lang)) {
      lang = body.lang as Lang
    }
    if (Array.isArray(body.history)) {
      const picked: Turn[] = []
      for (const h of body.history) {
        if (h == null || typeof h.content !== 'string') {
          continue
        }
        if (h.role === ROLE.user || h.role === ROLE.assistant) {
          picked.push({ role: h.role, content: h.content.slice(0, TURN_CONTENT_CAP) })
        }
      }
      history = picked.slice(-HISTORY_MAX)
    }
    if (body.context != null && typeof body.context === 'object' && typeof body.context.noc === 'string') {
      contextNoc = body.context.noc
    }
  }
  const user = await getUser(await headers()).catch(nullUser)
  const g = freeGate({ user: user, headers: req.headers })
  if (g.block != null) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  if (user != null && isPro(user) && checkLimit([[PRO_LIMIT_PREFIX + String(user.id), PRO_CHAT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let dbg = false
  if (user != null && user.email.endsWith(TEST_MAIL_SUFFIX)) {
    dbg = true
  }
  let up: ChatUserProfile = { nocCodes: null, targetProvinces: null, expCanadaMonths: null, expForeignMonths: null, currentStatus: null }
  if (user != null && user.profile != null) {
    up = user.profile as ChatUserProfile
  }
  let noc: string | null = contextNoc
  if (noc == null && Array.isArray(up.nocCodes) && typeof up.nocCodes[0] === 'string') {
    noc = up.nocCodes[0]
  }
  const provs: string[] = []
  if (Array.isArray(up.targetProvinces)) {
    for (const p of up.targetProvinces) {
      if (typeof p === 'string') {
        provs.push(p)
      }
    }
  }
  let expMonths: number | null = null
  if (up.expCanadaMonths != null || up.expForeignMonths != null) {
    let ca = 0
    if (up.expCanadaMonths != null) {
      ca = Number(up.expCanadaMonths)
    }
    let fo = 0
    if (up.expForeignMonths != null) {
      fo = Number(up.expForeignMonths)
    }
    expMonths = ca + fo
  }
  let status: string | null = null
  if (typeof up.currentStatus === 'string') {
    status = up.currentStatus
  }
  const profile: Profile = { noc: noc, occText: null, provs: provs, expMonths: expMonths, status: status }

  let pl: ChatPayloadHandle | null = null
  const t0 = Date.now()
  const steps: string[] = []
  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      function send(o: SsePacket): void {
        try {
          c.enqueue(sseChunk(o))
        } catch {
          return
        }
      }
      try {
        pl = await getPayload({ config: await config })
        const db = await getDb()
        const r = await consult({
          db: db, text: text, lang: lang, profile: profile, history: history,
          onStep: function onStep(s: string): void {
            steps.push(s)
            send({ step: s })
          },
          onDelta: null,
        })
        const facts: Fact[] = []
        for (const f of r.facts) {
          let label = f.label
          if (f.quote !== '') {
            label = f.quote
          }
          facts.push({
            tool: f.tool, label: label, quote: f.quote, value: f.value, valueText: f.valueText,
            unit: f.unit, evidence: f.evidence, availability: f.availability, cited: f.cited,
          })
        }
        const ok: ChatOut = {
          answer: r.answer,
          slots: { noc: r.noc, occText: '', provs: profile.provs, expMonths: profile.expMonths, status: profile.status, claims: [] },
          facts: facts,
          followups: [],
          degraded: r.degraded,
        }
        logChat({ payload: pl, text: text, lang: lang, history: history, result: ok, err: null, ms: Date.now() - t0 })
        log({ tag: CHAT_LOG.tag, text: CHAT_LOG.routeOk + r.noc + CHAT_LOG.facts + r.facts.length + CHAT_LOG.ms + (Date.now() - t0) + CHAT_LOG.inLen + text.length + CHAT_LOG.chSuffix })
        send({
          answer: ok.answer, slots: ok.slots, facts: ok.facts, followups: ok.followups, degraded: ok.degraded,
          activity: steps, thread: threadIdOf({ text: text, history: history }),
        })
      } catch (err) {
        let code = E_LLM
        if (err instanceof Error && isChatError<null>(err)) {
          code = err.code
        }
        let msg = String(err)
        if (err instanceof Error) {
          msg = err.message
        }
        logChat({ payload: pl, text: text, lang: lang, history: history, result: null, err: code, ms: Date.now() - t0 })
        log({ tag: CHAT_LOG.tag, text: code + CHAT_LOG.errSep + msg.slice(0, ERR_LOG_CAP) })
        if (dbg) {
          send({ error: code, detail: msg.slice(0, DETAIL_CAP) })
        } else {
          send({ error: code })
        }
      }
      c.enqueue(new TextEncoder().encode(SSE_DONE))
      c.close()
    },
  })
  const h: Record<string, string> = {
    [HDR_CONTENT_TYPE_LC]: SSE_CONTENT_TYPE,
    [HDR_CACHE_CONTROL.toLowerCase()]: SSE_CACHE_CONTROL,
    [HDR_ACCEL]: ACCEL_NO,
    [HDR_CONNECTION]: CONN_KEEP_ALIVE,
  }
  for (const [k, v] of Object.entries(g.headers)) {
    h[k] = v
  }
  return new Response(stream, { headers: h })
}

/**
 * getUser 抛错当未登录(catch 传具名函数;鉴权层查挂不该把对话入口打成 500)。
 *
 * @param _e 捕到的错。
 * @returns null(未登录,走匿名 IP 帽)。
 */
// eslint-disable-next-line local/routes-shape -- catch 传具名函数,非 HTTP 芯本体
function nullUser(_e: Error): null {
  return null
}

/**
 * 一个对象 → 一包 SSE 字节。
 *
 * @param o 要发的对象。
 * @returns 编码后的一包。
 */
// eslint-disable-next-line local/routes-shape -- SSE 编包小件,非 HTTP 芯本体
function sseChunk(o: SsePacket): Uint8Array {
  return new TextEncoder().encode(SSE_PREFIX + JSON.stringify(o) + SSE_SUFFIX)
}

/**
 * 同一串追问的 id = 首轮提问文本的哈希。不用 IP/UA/session —— 那三样都指向人,
 * 而我们只需要「这几轮是一串」这一个信息。
 *
 * @param input 本轮提问与历史。
 * @returns 16 位十六进制串。
 */
// eslint-disable-next-line local/routes-shape -- 留痕小件(原 lib/chat/log.ts 幸存件,单消费者不导出),非 HTTP 芯本体
function threadIdOf(input: ThreadIdIn): string {
  let first = input.text
  for (const h of input.history) {
    if (h.role === ROLE.user) {
      first = h.content
      break
    }
  }
  return createHash(HASH_SHA256).update(first.trim().slice(0, THREAD_SEED)).digest(HASH_HEX).slice(0, THREAD_ID_LEN)
}

/**
 * 本串里的第几轮:history 里的 user 消息数 + 1。
 *
 * @param history 多轮历史。
 * @returns 轮次(1 起)。
 */
// eslint-disable-next-line local/routes-shape -- 留痕小件,非 HTTP 芯本体
function turnOf(history: Turn[]): number {
  let n = 0
  for (const h of history) {
    if (h.role === ROLE.user) {
      n = n + 1
    }
  }
  return n + 1
}

/**
 * 写一行 chat_logs。fire-and-forget,自己吞异常(swallowChatlogError 留痕)——
 * 留痕是副产品,它挂了用户不该有任何感知;列形状一字不动。
 *
 * @param input 句柄与一轮的问/答/错误码/耗时。
 * @returns 没有返回值(不等写库)。
 */
// eslint-disable-next-line local/routes-shape -- 留痕小件,非 HTTP 芯本体
function logChat(input: LogChatIn): void {
  if (input.payload == null) {
    return
  }
  let answer: string | null = null
  let nocCell: string | null = null
  let slotsCell: ChatOut['slots'] | null = null
  let factsCell: Fact[] | null = null
  let toolsCell: string[] | null = null
  let degraded = false
  if (input.result != null) {
    if (input.result.answer !== '') {
      answer = input.result.answer.slice(0, A_CAP)
    }
    nocCell = input.result.slots.noc
    slotsCell = input.result.slots
    if (input.result.facts.length > 0) {
      factsCell = input.result.facts
      const tools = new Set<string>()
      for (const f of input.result.facts) {
        tools.add(f.tool)
      }
      toolsCell = Array.from(tools)
    }
    degraded = input.result.degraded
  }
  input.payload.create({
    collection: COLLECTION_CHAT_LOGS,
    data: {
      thread: threadIdOf({ text: input.text, history: input.history }),
      turn: turnOf(input.history),
      lang: input.lang,
      question: input.text.slice(0, Q_CAP),
      answer: answer,
      noc: nocCell,
      slots: slotsCell,
      facts: factsCell,
      tools: toolsCell,
      degraded: degraded,
      err: input.err,
      ms: Math.round(input.ms),
    },
  }).catch(swallowChatlogError)
}

/**
 * chat_logs 写库失败的收尾(catch 传具名函数;只留痕不影响用户)。
 *
 * @param e 捕到的错。
 * @returns 没有返回值。
 */
// eslint-disable-next-line local/routes-shape -- 留痕小件,非 HTTP 芯本体
function swallowChatlogError(e: Error): void {
  log({ tag: CHAT_LOG.tag, text: CHAT_LOG.chatlogSkipped + e.message.slice(0, ERR_LOG_CAP) })
}
