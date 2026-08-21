/**
 * GET/POST /api/triple-verdict?job=<id> — #287 一键三合一判定卡(批D)。
 * **本文件只剩路由外壳**:组装与付费闸都在判定域(同一份 wire 也给 /plan/pr 的 SSR 首屏用,
 * 两处走同一条口径 —— 一处改口径另一处跟不上,是最容易静默漂的那种 bug)。
 */
import { tripleWireOf, type ClientAnswers } from '@/lib/ruling/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  return respond(Number(new URL(req.url).searchParams.get('job')), null)
}

/** 匿名可用(2026-08-12 Frank「匿名也可以访问」):带上本地答案,个人关才判得出来。
 *  登录用户的服务端档案**逐槽优先**,答案只补它缺的那几样 —— 落过档的不被本地旧答案覆盖。 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { job?: unknown; answers?: ClientAnswers } | null
  return respond(Number(body?.job), (body?.answers && typeof body.answers === 'object') ? body.answers : null)
}

async function respond(id: number, answers: ClientAnswers) {
  const wire = await tripleWireOf({ id: id, answers: answers })
  return 'error' in wire
    ? Response.json({ error: wire.error }, { status: wire.status })
    : Response.json(wire)
}
