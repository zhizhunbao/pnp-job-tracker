/**
 * ops 域的 HTTP 芯:POST /api/ops/remove(运维页删一条,只认 role=admin 的会话)。
 * 调度器上报仍走 /api/queue/units(本机 61 个容器的地址),等 queue 域退役那一批再切。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, FORBIDDEN, SERVER_ERROR } from '../http'
import { log, QUEUE_LOG } from '../log'
import { getUserOrNull } from '../quota/server'
import { E_ADMIN, ROLE_ADMIN } from './constants'
import { removeItem, toRemoveFact } from './functions'
import type { RemoveJson } from './types'

/**
 * POST /api/ops/remove:管理员删一条。
 *
 * @param req 请求体 `{ kind, key }`。
 * @returns `{ ok, n }`;不是管理员 403、坏体 400、写不成 500。
 */
export async function opsRemoveRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    return Response.json({ error: E_ADMIN }, { status: FORBIDDEN })
  }
  let body: RemoveJson = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  const item = toRemoveFact(body)
  if (item == null) {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  try {
    const n = await removeItem({ db: await getDb(), item })
    return Response.json({ ok: true, n })
  } catch (e) {
    log({ tag: QUEUE_LOG.tag, text: QUEUE_LOG.removeFailed + item.kind + QUEUE_LOG.whyFrag + String(e) })
    return Response.json({ ok: false, n: 0 }, { status: SERVER_ERROR })
  }
}
