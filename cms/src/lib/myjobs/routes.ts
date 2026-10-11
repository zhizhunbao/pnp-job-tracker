/**
 * 我的岗位域(lib/myjobs)的 HTTP 芯:GET /api/myjobs/applied(我的求职)、GET /api/myjobs/saved(我的收藏)、
 * GET /api/myjobs/count(已投几封;2026-10-08 banner 副题)。都只给本人、不缓存。
 * 2026-10-10 批 2:加 GET /api/myjobs/picks(今日推荐;按人按天缓存在域里,响应照旧不让任何一层存)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { HDR_CACHE_CONTROL, UNAUTHORIZED } from '../http'
import { getUserOrNull, isPro } from '../quota/server'
import { CACHE_PRIVATE, E_AUTH, P_PROV, PROV_RE, TEXT_NONE } from './constants'
import { getPicks, loadApplied, loadSaved, loadSentCount } from './functions'

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
 * GET /api/myjobs/count:本人真发出去了几封。
 *
 * @param _req 请求。
 * @returns { sent };未登录 401。
 */
export async function myjobsCountRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const sent = await loadSentCount({ db: await getDb(), userId: user.id })
  return Response.json({ sent }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * GET /api/myjobs/picks:今日推荐(免费号看 3 条 + 「更多推荐」的条数与锁住的两条;Pro 全给)。
 * `?prov=` = 浏览器按时区预选的省码(他没答所在省时用;不合形当没给)。
 *
 * @param req 请求。
 * @returns { picks, more, locked };未登录 401。
 */
export async function myjobsPicksRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let prov = TEXT_NONE
  const p = new URL(req.url).searchParams.get(P_PROV)
  if (p != null && PROV_RE.test(p)) {
    prov = p
  }
  const body = await getPicks({ db: await getDb(), userId: user.id, prov, pro: isPro(user) })
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
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
