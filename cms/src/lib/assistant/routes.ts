/**
 * 对话助手的 HTTP 芯:POST /api/assistant/chat 一轮问答;GET /api/assistant/ready 探活(界面拿它决定出不出入口)。
 * 这里只管限流、传输形状、注入:模型走 lib/llm 的 completeText(通道钉死朋友网关,见 constants 的 PROVIDER;
 * 2026-11-14 Frank 定不调付费模型、不退回付费模型兜底),收 JSON 走 lib/resume 的 parseLlmJson,探活走 lib/llm 的 probeFriend,
 * 三者包成函数注给 functions(方案 A:functions 不碰模型域)。
 * 未登录也能用(访客是主要用户),所以不认人,只按 IP 过两道限流(每天、每分钟)。
 * 体内 `await req.json() as ChatBody` 是跨边界断言:网络 body 先按声明形状收下,逐格验形在 toInput 里做。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */
import { getDb } from '../db/server'
import { BAD_GATEWAY, BAD_REQUEST, TOO_MANY, UNAVAILABLE } from '../http'
import { completeText, friendLlmReady, probeFriend } from '../llm'
import { checkLimit, ipOf } from '../quota/server'
import { parseLlmJson } from '../resume'
import { E_BAD, E_LIMIT, E_LLM, E_OFFLINE, LLM_FEATURE, MAX_TOKENS, PROVIDER, TEMPERATURE, TEXT_NONE } from './constants'
import { getReady, limitsOf, reply, toInput } from './functions'
import type { ChatBody, CompleteIn } from './types'

/**
 * POST /api/assistant/chat:body { text, lang, history } → { kind, say, links, thread, turn }。
 * 没提问 400;盒子没配置 503;超限 429;模型没答上来 502。
 *
 * @param req 请求。
 * @returns JSON。
 */
export async function assistantChatRoute(req: Request): Promise<Response> {
  let body: ChatBody | null = null
  try {
    body = await req.json() as ChatBody
  } catch {
    body = null
  }
  const input = toInput(body)
  if (input.text === TEXT_NONE) {
    return Response.json({ error: E_BAD }, { status: BAD_REQUEST })
  }
  if (friendLlmReady() === false) {
    return Response.json({ error: E_OFFLINE }, { status: UNAVAILABLE })
  }
  if (checkLimit(limitsOf({ ip: ipOf(req), nowMs: Date.now() })) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  const db = await getDb()
  async function complete(x: CompleteIn): Promise<string> {
    return completeText({
      feature: LLM_FEATURE, db: db, messages: x.messages, maxTokens: MAX_TOKENS, temperature: TEMPERATURE, provider: PROVIDER,
    })
  }
  const r = await reply({ db: db, input: input, complete: complete, parse: parseLlmJson })
  if (r.failed) {
    return Response.json({ error: E_LLM }, { status: BAD_GATEWAY })
  }
  return Response.json({ kind: r.kind, say: r.say, links: r.links, thread: r.thread, turn: r.turn })
}

/**
 * GET /api/assistant/ready → { ready }。盒子真通才是 true;结果在进程内缓存几十秒,不会每个页面请求都打盒子。
 *
 * @returns JSON。
 */
export async function assistantReadyRoute(): Promise<Response> {
  return Response.json(await getReady({ probe: probeFriend, nowMs: Date.now() }))
}
