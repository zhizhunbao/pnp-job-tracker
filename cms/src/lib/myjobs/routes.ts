/**
 * 我的岗位域(lib/myjobs)的 HTTP 芯:GET /api/myjobs/applied(我的求职)、GET /api/myjobs/saved(我的收藏)。
 * 都只给本人、不缓存。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { HDR_CACHE_CONTROL, UNAUTHORIZED } from '../http'
import { getUserOrNull } from '../quota/server'
import { CACHE_PRIVATE, E_AUTH } from './constants'
import { loadApplied, loadSaved } from './functions'

/**
 * GET /api/myjobs/applied:本人投过的岗。
 *
 * @param _req 请求。
 * @returns { items };未登录 401。
 */
export async function myjobsAppliedRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const items = await loadApplied({ db: await getDb(), userId: user.id })
  return Response.json({ items }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * GET /api/myjobs/saved:本人收藏的岗。
 *
 * @param _req 请求。
 * @returns { items };未登录 401。
 */
export async function myjobsSavedRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const items = await loadSaved({ db: await getDb(), userId: user.id })
  return Response.json({ items }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}
