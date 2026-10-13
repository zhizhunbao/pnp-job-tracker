/**
 * 我的岗位域(lib/myjobs)的 HTTP 芯:GET /api/myjobs/applied(我的求职)、GET /api/myjobs/saved(我的收藏)、
 * GET /api/myjobs/count(已投几封;2026-10-08 banner 副题)。都只给本人、不缓存。
 * 2026-10-10 批 2:加 GET /api/myjobs/picks(今日推荐;按人按天缓存在域里,响应照旧不让任何一层存)。
 * 2026-10-12 操作列加「删除」:DELETE /api/myjobs/applied?id=、DELETE /api/myjobs/picks?id=(两条 GET 随之带方法词)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, HDR_CACHE_CONTROL, UNAUTHORIZED } from '../http'
import { getUserOrNull, isPro } from '../quota/server'
import { CACHE_PRIVATE, E_AUTH, E_NO_ID, FRESH_ON, P_FRESH, P_PROV, PROV_RE, TEXT_NONE } from './constants'
import { deleteApplied, dismissPick, getPicks, idOf, loadApplied, loadSaved, loadSentCount } from './functions'

/**
 * DELETE /api/myjobs/applied?id=:我的投递「删除」(草稿真删,已发出的只藏起;不是本人的那条什么也不改)。
 *
 * @param req 请求(投递 id 在查询参数)。
 * @returns { ok };未登录 401、没带 id 400。
 */
export async function myjobsAppliedDeleteRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const id = idOf(req.url)
  if (id == null) {
    return Response.json({ error: E_NO_ID }, { status: BAD_REQUEST })
  }
  await deleteApplied({ db: await getDb(), userId: user.id, id })
  return Response.json({ ok: true })
}

/**
 * GET /api/myjobs/applied:本人投过的岗。
 *
 * @param _req 请求。
 * @returns { items };未登录 401。
 */
export async function myjobsAppliedGetRoute(_req: Request): Promise<Response> {
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
 * 2026-10-11 `?fresh=1` = 不用当天缓存、现算一份(「进我的求职先弹五题」答完重拉推荐要按新答案推;只算他自己的一份)。
 *
 * @param req 请求。
 * @returns { picks, more, locked };未登录 401。
 */
export async function myjobsPicksGetRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let prov = TEXT_NONE
  const q = new URL(req.url).searchParams
  const p = q.get(P_PROV)
  if (p != null && PROV_RE.test(p)) {
    prov = p
  }
  const fresh = q.get(P_FRESH) === FRESH_ON
  const body = await getPicks({ db: await getDb(), userId: user.id, prov, pro: isPro(user), fresh })
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * DELETE /api/myjobs/picks?id=:今日推荐「删除」,这一岗以后不再推。
 *
 * @param req 请求(职位 id 在查询参数)。
 * @returns { ok };未登录 401、没带 id 400。
 */
export async function myjobsPicksDeleteRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const id = idOf(req.url)
  if (id == null) {
    return Response.json({ error: E_NO_ID }, { status: BAD_REQUEST })
  }
  await dismissPick({ db: await getDb(), userId: user.id, id })
  return Response.json({ ok: true })
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
