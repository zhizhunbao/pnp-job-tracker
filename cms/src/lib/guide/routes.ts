/**
 * 站内向导的 HTTP 芯(第十一抽屉):POST /api/guide 一轮带路 / 记下;POST /api/guide/email 给那一轮留邮箱。
 * 这里只管鉴权 / 限流 / 传输形状 / 注入:模型走 lib/llm 的 completeText,职业检索走 lib/jobs 的
 * searchNocByTitle,两者包成函数注给 functions 的 guide(方案 A:functions 不碰模型域与业务域)。
 * 三层帽只防滥用(功能免费):匿名按 IP、免费登录按账号(freeGate 统一池)、Pro 按 PRO_CHAT_DAILY。
 * 体内 `await req.json() as GuideBody` / `as EmailBody` 是跨边界断言:网络 body 先按声明形状收下,
 * 逐格验形在 to* 里做。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, NO_CONTENT, NOT_FOUND, TOO_MANY } from '../http'
import { searchNocByTitle } from '../jobs/server'
import { completeText } from '../llm'
import { checkLimit, freeGate, getUserOrNull, isPro } from '../quota/server'
import { PRO_CHAT_DAILY } from '../quota'
import { E_BAD, E_LIMIT, MAX_TOKENS, PRO_LIMIT_PREFIX, TEMPERATURE, TEXT_NONE } from './constants'
import { attachEmail, guide, toEmailInput, toInput } from './functions'
import type { ChatMessage, EmailBody, GuideBody, NocPick } from './types'

/**
 * POST /api/guide:body { text, lang, path?, history? } → { id, thread, turn, kind, dest, url, say, noc, prov }。
 * 正文空 400;限流 429;模型失败不回错(按问题记下,kind=question)。
 *
 * @param req 请求。
 * @returns JSON。
 */
export async function guideRoute(req: Request): Promise<Response> {
  let body: GuideBody | null = null
  try {
    body = await req.json() as GuideBody
  } catch {
    body = null
  }
  const input = toInput(body)
  if (input.text === TEXT_NONE) {
    return Response.json({ error: E_BAD }, { status: BAD_REQUEST })
  }
  const user = await getUserOrNull(await headers())
  const g = freeGate({ user: user, headers: req.headers })
  if (g.deny != null) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  if (user != null && isPro(user) && checkLimit([[PRO_LIMIT_PREFIX + String(user.id), PRO_CHAT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  const db = await getDb()
  async function complete(messages: ChatMessage[]): Promise<string> {
    return completeText({ messages: messages, maxTokens: MAX_TOKENS, temperature: TEMPERATURE })
  }
  async function resolveNoc(q: string): Promise<NocPick[]> {
    return searchNocByTitle({ db: db, q: q })
  }
  const r = await guide({ db: db, input: input, complete: complete, resolveNoc: resolveNoc })
  return Response.json(r, { headers: g.headers })
}

/**
 * POST /api/guide/email:body { id, thread, email } → 204。三格任一不成形 400;id 与 thread 对不上 404。
 *
 * @param req 请求。
 * @returns 空响应或错误 JSON。
 */
export async function guideEmailRoute(req: Request): Promise<Response> {
  let body: EmailBody | null = null
  try {
    body = await req.json() as EmailBody
  } catch {
    body = null
  }
  const input = toEmailInput(body)
  if (input == null) {
    return Response.json({ error: E_BAD }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const ok = await attachEmail({ db: db, id: input.id, thread: input.thread, email: input.email })
  if (ok === false) {
    return Response.json({ error: E_BAD }, { status: NOT_FOUND })
  }
  return new Response(null, { status: NO_CONTENT })
}
