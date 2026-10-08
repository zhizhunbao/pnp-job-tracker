/**
 * 智能投递域(lib/queue)的 HTTP 芯:GET /api/queue/run(跑一轮;seed 成功后由 ETL load 役触发,x-seed-token 鉴权)、
 * GET /api/queue(本人的「今日待投」)、POST /api/queue/decline(跳过一岗)、PATCH /api/queue/prefs(拨开关)。
 * 跨边界断言两处:两个请求体 `await req.json() as XxxBodyJson`(网络 body 先按声明形状收下再验)。
 *
 * @author Frank
 * @time 2026-10-08 14:00:00
 */
import { headers } from 'next/headers'
import { after } from 'next/server'
import { COVER_MAX, isSenderName, loadApplyPrefs, loadApplyResumes, pdfBadCharsOf, saveApplyPrefs } from '../apply'
import { getDb } from '../db/server'
import { BAD_REQUEST, HDR_CACHE_CONTROL, NOT_FOUND, UNAUTHORIZED, UNPROCESSABLE } from '../http'
import { jobDescription, loadApplyUrlById } from '../jobs/server'
import { APPLY_LOG, log } from '../log'
import { getUserOrNull, loadTrial, markTrial, trialOpenOf } from '../quota/server'
import {
  CACHE_PRIVATE, E_AUTH, E_BODY, E_CHARS, E_LONG, E_NAME, E_QUEUE, FIELD_AUTO, HDR_SEED_TOKEN, TEXT_NONE,
} from './constants'
import {
  declineQueued, loadQueueList, loadQueueUser, loadQueueUsers, loadUserNocs, queueForUser, saveAutoQueue, saveQueuedCover,
} from './functions'
import type { AutoBodyJson, CoverBodyJson, DeclineBodyJson, MaybeId, QueueSvc, RunCounts } from './types'

/**
 * GET /api/queue/run:跑一轮(开了开关、填了署名、答了想做的工作、有简历的人,每人最多 5 岗);一个人挂了不影响别人。
 *
 * @param req 触发请求。
 * @returns { ok, counts };token 不对 401。
 */
export async function queueRunRoute(req: Request): Promise<Response> {
  const token = process.env.SEED_TOKEN
  if (token == null || token === TEXT_NONE || req.headers.get(HDR_SEED_TOKEN) !== token) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const db = await getDb()
  const users = await loadQueueUsers({ db })
  const svc: QueueSvc = { loadTrial, markTrial, trialOpen: trialOpenOf, applyUrlOf: loadApplyUrlById, jdOf: jobDescription }
  const counts: RunCounts = { users: 0, queued: 0, ai: 0 }
  for (const user of users) {
    if (user.nocs.length === 0 || user.resumeId == null) {
      continue
    }
    counts.users++
    try {
      const got = await queueForUser({ db, user, svc })
      counts.queued += got.queued
      counts.ai += got.ai
    } catch (e) {
      log({ tag: APPLY_LOG.tag, text: APPLY_LOG.queueFailed + user.userId + APPLY_LOG.whyFrag + String(e) })
    }
  }
  log({ tag: APPLY_LOG.tag, text: APPLY_LOG.queueRan + JSON.stringify(counts) })
  return Response.json({ ok: true, counts })
}

/**
 * GET /api/queue:本人的「今日待投」(队列 + 开关 + 条件齐不齐:答没答想做的工作、有没有署名、有没有简历)。
 *
 * @param _req 请求。
 * @returns QueueView;未登录 401。
 */
export async function queueRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const db = await getDb()
  const prefs = await loadApplyPrefs({ db, userId: user.id })
  const nocs = await loadUserNocs({ db, userId: user.id })
  const resumes = await loadApplyResumes({ db, userId: user.id })
  const items = await loadQueueList({ db, userId: user.id })
  const qu = await loadQueueUser({ db, userId: user.id })
  let lastQueueAt = TEXT_NONE
  if (qu != null) {
    lastQueueAt = qu.lastQueueAt
  }
  return Response.json({
    auto: prefs.autoQueue, hasNocs: nocs.length > 0, hasName: isSenderName(prefs.senderName), hasResume: resumes.length > 0, items,
    lastQueueAt,
  }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * POST /api/queue/decline {jobId}:跳过队列里的一岗(以后不再进队列)。
 *
 * @param req 请求。
 * @returns { ok };未登录 401、体不合形 400、不在队列 404。
 */
export async function queueDeclineRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: DeclineBodyJson = {}
  try {
    raw = await req.json() as DeclineBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const jobId: MaybeId = Number(raw.jobId)
  if (Number.isInteger(jobId) === false || jobId <= 0) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const done = await declineQueued({ db: await getDb(), userId: user.id, jobId })
  if (done === false) {
    return Response.json({ error: E_QUEUE }, { status: NOT_FOUND })
  }
  return Response.json({ ok: true })
}

/**
 * PATCH /api/queue/prefs {autoQueue} 或 {senderName}:拨「智能投递」开关,或在设置清单里就地填英文署名(2026-10-08 UX 批)。
 * 开到开:回包之后(next 的 after)立刻给本人跑一轮队列(2026-10-08 小白走查:开了对着「今天没有新岗」要等到下一次灌库),
 * 条件同每日役;跑挂了只留痕。前端拿 GET /api/queue 的 lastQueueAt 变了 / 有岗了判「跑完了」。
 *
 * @param req 请求。
 * @returns { ok };未登录 401、体不合形 400、署名不合规 422。
 */
export async function queuePrefsRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: AutoBodyJson = {}
  try {
    raw = await req.json() as AutoBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  if (typeof raw.senderName === 'string') {
    const senderName = raw.senderName.trim()
    if (isSenderName(senderName) === false) {
      return Response.json({ error: E_NAME }, { status: UNPROCESSABLE })
    }
    await saveApplyPrefs({ db, userId: user.id, senderName, template: null })
    return Response.json({ ok: true, senderName })
  }
  const on = raw[FIELD_AUTO]
  if (typeof on !== 'boolean') {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  await saveAutoQueue({ db, userId: user.id, on })
  if (on) {
    const qu = await loadQueueUser({ db, userId: user.id })
    if (qu != null && qu.nocs.length > 0 && qu.resumeId != null && isSenderName(qu.senderName)) {
      const svc: QueueSvc = {
        loadTrial, markTrial, trialOpen: trialOpenOf, applyUrlOf: loadApplyUrlById, jdOf: jobDescription,
      }
      after(async function queueNow(): Promise<void> {
        try {
          const got = await queueForUser({ db, user: qu, svc })
          log({ tag: APPLY_LOG.tag, text: APPLY_LOG.queueRan + JSON.stringify({ users: 1, queued: got.queued, ai: got.ai }) })
        } catch (e) {
          log({ tag: APPLY_LOG.tag, text: APPLY_LOG.queueFailed + qu.userId + APPLY_LOG.whyFrag + String(e) })
        }
      })
    }
  }
  return Response.json({ ok: true, autoQueue: on })
}

/**
 * PATCH /api/queue/cover {jobId, cover}:就地改队列里那一岗的信(2026-10-08 UX 批:「改信」不再跳去投递区)。
 *
 * @param req 请求。
 * @returns { ok };未登录 401、体不合形 400、太长 / 有写不进 PDF 的字 422、不在队列 404。
 */
export async function queueCoverRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: CoverBodyJson = {}
  try {
    raw = await req.json() as CoverBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const jobId: MaybeId = Number(raw.jobId)
  if (Number.isInteger(jobId) === false || jobId <= 0 || typeof raw.cover !== 'string' || raw.cover.trim() === TEXT_NONE) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const cover = raw.cover
  if (cover.length > COVER_MAX) {
    return Response.json({ error: E_LONG }, { status: UNPROCESSABLE })
  }
  const chars = pdfBadCharsOf(cover)
  if (chars.length > 0) {
    return Response.json({ error: E_CHARS, chars }, { status: UNPROCESSABLE })
  }
  const done = await saveQueuedCover({ db: await getDb(), userId: user.id, jobId, cover })
  if (done === false) {
    return Response.json({ error: E_QUEUE }, { status: NOT_FOUND })
  }
  return Response.json({ ok: true })
}
