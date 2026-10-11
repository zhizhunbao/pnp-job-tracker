/**
 * 收件箱域(lib/inbox)的 HTTP 芯:GET /api/inbox(专属地址、转发开关、收到的信)、GET /api/inbox/count(未读数,「收件箱」页签红点)、
 * PATCH /api/inbox/prefs(转发开关)、POST /api/inbox/read(读了一封)、POST /api/inbox/reply(站内回信)、
 * GET /api/inbox/thread?app=(「打开」一条投递:发出那一封 + 往来信)。都只给本人、不缓存;每条 SQL 都按会话里的用户 id 收窄。
 * 收信回调走投递域那个冻结的口 POST /api/apply/inbound(那边转进本域的 receiveInbound)。
 * 本文件是域内边缘:投递域的两个纯函数(测试号收件人换算、发件人显示)在这里注给 functions。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { headers } from 'next/headers'
import { recipientOf, senderFromOf } from '../apply'
import { getDb } from '../db/server'
import { BAD_GATEWAY, BAD_REQUEST, HDR_CACHE_CONTROL, NOT_FOUND, TOO_MANY, UNAUTHORIZED, UNAVAILABLE } from '../http'
import { INBOX_LOG, log } from '../log'
import { WHY_DISABLED } from '../mail'
import { checkLimit, getUserOrNull } from '../quota/server'
import {
  CACHE_PRIVATE, E_AUTH, E_BODY, E_LIMIT, E_MAIL, E_MAIL_OFF, E_NOT_FOUND, P_APP, REPLY_LIMIT_DAILY, REPLY_LIMIT_PREFIX,
} from './constants'
import {
  idOf, loadInbox, loadThread, loadUnread, markRead, saveForward, sendReply, toReadId, toReplyBody,
} from './functions'
import type { PrefsBodyJson, ReadBodyJson, ReplyBodyJson } from './types'

/**
 * GET /api/inbox:本人的收件箱 —— 专属地址(收件箱开通了才懒建)、转发开关、账户邮箱、收到的信(回出去的挂在下面)。
 *
 * @param _req 请求。
 * @returns { address, forward, account, items };未登录 401。
 */
export async function inboxRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const body = await loadInbox({ db: await getDb(), userId: user.id, email: user.email })
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * GET /api/inbox/count:本人几封没读的(「收件箱」页签红点)。
 *
 * @param _req 请求。
 * @returns { unread };未登录 401。
 */
export async function inboxCountRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const unread = await loadUnread({ db: await getDb(), userId: user.id })
  return Response.json({ unread }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * PATCH /api/inbox/prefs {forward}:收到回信同时转到账户邮箱,开 / 关。
 *
 * @param req 请求。
 * @returns { ok, forward };未登录 401、体不合形 400。
 */
export async function inboxPrefsRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: PrefsBodyJson = {}
  try {
    raw = await req.json() as PrefsBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  if (typeof raw.forward !== 'boolean') {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  await saveForward({ db: await getDb(), userId: user.id, forward: raw.forward })
  return Response.json({ ok: true, forward: raw.forward })
}

/**
 * POST /api/inbox/read {id}:读了一封(只改本人的;别人的 id 改不动也不报,回包一样)。
 *
 * @param req 请求。
 * @returns { ok };未登录 401、体不合形 400。
 */
export async function inboxReadRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: ReadBodyJson = {}
  try {
    raw = await req.json() as ReadBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const id = toReadId(raw)
  if (id == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  await markRead({ db: await getDb(), userId: user.id, id })
  return Response.json({ ok: true })
}

/**
 * POST /api/inbox/reply {id, text}:在站内回一封收到的信(经平台发出,回复地址 = 本人专属地址,接上那一串)。
 *
 * @param req 请求。
 * @returns { ok, reply };未登录 401、超限 429、体不合形 400、没有这一封 404、发信没配置 503、发信失败 502。
 */
export async function inboxReplyRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  if (checkLimit([[REPLY_LIMIT_PREFIX + String(user.id), REPLY_LIMIT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let raw: ReplyBodyJson = {}
  try {
    raw = await req.json() as ReplyBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const body = toReplyBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const r = await sendReply({
    db: await getDb(), userId: user.id, userEmail: user.email, id: body.id, text: body.text, mailTo: recipientOf,
    fromOf: senderFromOf,
  })
  if (r.ok) {
    log({ tag: INBOX_LOG.tag, text: INBOX_LOG.replied + user.id })
    return Response.json({ ok: true, reply: r.reply })
  }
  if (r.why === E_NOT_FOUND) {
    return Response.json({ error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  log({ tag: INBOX_LOG.tag, text: INBOX_LOG.replyFailed + user.id + INBOX_LOG.whyFrag + r.why })
  if (r.why === WHY_DISABLED) {
    return Response.json({ error: E_MAIL_OFF }, { status: UNAVAILABLE })
  }
  return Response.json({ error: E_MAIL }, { status: BAD_GATEWAY })
}

/**
 * GET /api/inbox/thread?app=<投递行 id>:「打开」一条投递 —— 发出那一封(收件人只给公司名,雇主邮箱不下发)与挂在上面的往来信。
 *
 * @param req 请求(投递行 id 在查询参数)。
 * @returns { app, messages, forward, account };未登录 401、id 不合形 400、不是本人的 / 还没发 404。
 */
export async function inboxThreadRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const appId = idOf(new URL(req.url).searchParams.get(P_APP))
  if (appId == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const body = await loadThread({ db: await getDb(), userId: user.id, email: user.email, appId })
  if (body == null) {
    return Response.json({ error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  return Response.json(body, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}
