/**
 * /api/account/answers — 问卷答案档(2026-08-15 Frank 拍板「答案入库绑账号」)。
 * 注册闸文案 dp.authGate「注册后答案自动存档」,存的就是这里:users.answers
 * (jsonb,列由 docs/sql/account-answers.sql 手写添加,不走 DB_PUSH)。
 * GET = 取本人档(未登录 401);PUT = 整档覆盖,body={basic,score},服务端补 updatedAt。
 * 合并判新旧(新者胜)在客户端 lib/answers.ts —— 本端点只做存取,不做裁决。
 * 红线:答案是用户隐私,只回本人 —— id 一律取自 cookie 鉴权结果,不收任何参数。
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getUser(await headers()).catch(() => null)
  if (!user) return Response.json({ error: 'auth' }, { status: 401 })
  const payload = await getPayload({ config: await config })
  // payload.auth 的 user 走 JWT 策略,不保证带全字段 —— 档案按 id 回表取,别信缓存形状
  const doc = await payload.findByID({ collection: 'users', id: user.id, depth: 0 }).catch(() => null)
  return Response.json({ answers: (doc as { answers?: unknown } | null)?.answers ?? null })
}

/** 离开页面时的兜底推送走这条(2026-08-16):sendBeacon 只能 POST,而它送的和 PUT 一模一样。
 *  没有它,「答完最后一题就关页面」那一下会丢 —— 先前是靠 localStorage 兜的,现在缓存撤了。 */
export const POST = (req: Request) => PUT(req)

export async function PUT(req: Request) {
  const user = await getUser(await headers()).catch(() => null)
  if (!user) return Response.json({ error: 'auth' }, { status: 401 })
  let body: { basic?: unknown; score?: unknown } | null = null
  try { body = await req.json() } catch { /* 落到下面的校验 */ }
  const basic = body?.basic
  const score = body?.score
  if (!basic || typeof basic !== 'object' || !score || typeof score !== 'object')
    return Response.json({ error: 'bad' }, { status: 400 })
  // 答案档就几十个档位/勾选,64KB 顶天;超限=不是问卷答案,不让人往 users 表塞大对象
  if (JSON.stringify(body).length > 64_000) return Response.json({ error: 'tooBig' }, { status: 413 })
  const updatedAt = new Date().toISOString()
  const payload = await getPayload({ config: await config })
  await payload.update({
    collection: 'users', id: user.id,
    data: { answers: { basic, score, updatedAt } },
  })
  return Response.json({ ok: true, updatedAt })
}
