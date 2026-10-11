/**
 * 通知域(lib/notify)的 HTTP 芯:GET /api/notify(顶栏铃铛的清单与未读数)、POST /api/notify/seen(打开面板 = 看过了)。
 * 都只给本人、不缓存;每条 SQL 都按会话里的用户 id 收窄。
 * 本文件是域内边缘:今日推荐的取数函数(lib/myjobs 的 getPicks,按人按天缓存)在这里注给 functions。
 * 推荐算不成只少那一条(留痕);清单查不成(notify_seen 表没建、库挂了)留痕回 500,铃铛不出数字。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { HDR_CACHE_CONTROL, SERVER_ERROR, UNAUTHORIZED } from '../http'
import { log, NOTIFY_LOG } from '../log'
import { getPicks } from '../myjobs/server'
import { getUserOrNull, isPro } from '../quota/server'
import { CACHE_PRIVATE, E_AUTH, E_LOAD, P_PROV, PROV_RE, TEXT_NONE } from './constants'
import { countPicks, loadNotify, markSeen } from './functions'

/**
 * GET /api/notify?prov=<省码>:本人的通知清单(新的在前)与几条没看过。
 *
 * @param req 请求(预选省码在查询参数,今日推荐按它算)。
 * @returns { items, unseen };未登录 401、清单查不成 500。
 */
export async function notifyRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let prov = TEXT_NONE
  const p = new URL(req.url).searchParams.get(P_PROV)
  if (p != null && PROV_RE.test(p)) {
    prov = p
  }
  const db = await getDb()
  let picks = 0
  try {
    picks = await countPicks({ arg: { db, userId: user.id, prov, pro: isPro(user), fresh: false }, getPicks })
  } catch (e) {
    log({ tag: NOTIFY_LOG.tag, text: NOTIFY_LOG.picksFailed + user.id + NOTIFY_LOG.whyFrag + String(e) })
  }
  try {
    const body = await loadNotify({ db, userId: user.id, picks })
    return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
  } catch (e) {
    log({ tag: NOTIFY_LOG.tag, text: NOTIFY_LOG.listFailed + user.id + NOTIFY_LOG.whyFrag + String(e) })
    return Response.json({ error: E_LOAD }, { status: SERVER_ERROR })
  }
}

/**
 * POST /api/notify/seen:打开铃铛面板 = 看过了(此刻之前的都不再算未读)。
 *
 * @param _req 请求。
 * @returns { ok };未登录 401、写不成 500。
 */
export async function notifySeenRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  try {
    await markSeen({ db: await getDb(), userId: user.id })
    return Response.json({ ok: true })
  } catch (e) {
    log({ tag: NOTIFY_LOG.tag, text: NOTIFY_LOG.seenFailed + user.id + NOTIFY_LOG.whyFrag + String(e) })
    return Response.json({ error: E_LOAD }, { status: SERVER_ERROR })
  }
}
