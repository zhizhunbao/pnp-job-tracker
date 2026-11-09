/**
 * ops 域的 HTTP 芯:POST /api/ops/remove(运维页删一条)、POST /api/ops/alert(确认或关闭事件)只认 role=admin 的会话;
 * POST /api/ops/tick(本机调度单元每 5 分钟一轮:探活、判定报警)与 POST /api/queue/units(61 个容器的上报地址,沿用老路径)带 x-seed-token 才收。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, FORBIDDEN, HDR_SEED_TOKEN, SERVER_ERROR, TEXT_UNAUTHORIZED, UNAUTHORIZED } from '../http'
import { probeClaude, probeFriend } from '../llm'
import { log, QUEUE_LOG } from '../log'
import { sendMail } from '../mail'
import { getUserOrNull } from '../quota/server'
import { E_ADMIN, ROLE_ADMIN } from './constants'
import { makeMailNotify, runRules, saveProbes, setAlertState, toAlertAct, toOllamaProbe } from './watch'
import type { AlertActJson, ProbeFact, TickJson } from './watch'
import { removeItem, saveUnit, toRemoveFact, toUnitFact } from './write'
import type { RemoveJson, UnitJson } from './write'

/**
 * POST /api/ops/alert:管理员确认或关闭一条事件。
 *
 * @param req 请求体 `{ id, state }`。
 * @returns `{ ok, n }`;不是管理员 403、坏体 400、写不成 500。
 */
export async function opsAlertRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null || user.role !== ROLE_ADMIN) {
    return Response.json({ error: E_ADMIN }, { status: FORBIDDEN })
  }
  let body: AlertActJson = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  const act = toAlertAct(body)
  if (act == null) {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  try {
    const n = await setAlertState({ db: await getDb(), act })
    return Response.json({ ok: true, n })
  } catch (e) {
    log({ tag: QUEUE_LOG.tag, text: QUEUE_LOG.alertFailed + String(act.id) + QUEUE_LOG.whyFrag + String(e) })
    return Response.json({ ok: false, n: 0 }, { status: SERVER_ERROR })
  }
}

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

/**
 * POST /api/ops/tick:探活 Claude 与朋友网关,收下本机报来的 Ollama 探活,再判定全部报警规则。
 *
 * @param req 请求体 `{ ollama? }`。
 * @returns `{ ok, fired }`;没带钥匙 401、坏体 400、写不成 500。
 */
export async function opsTickRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  let body: TickJson = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, fired: 0 }, { status: BAD_REQUEST })
  }
  try {
    const db = await getDb()
    const probes: ProbeFact[] = [await probeClaude(), await probeFriend()]
    const ollama = toOllamaProbe(body)
    if (ollama != null) {
      probes.push(ollama)
    }
    await saveProbes({ db, probes })
    const fired = await runRules({ db, notify: makeMailNotify({ db, send: sendMail }) })
    return Response.json({ ok: true, fired })
  } catch (e) {
    log({ tag: QUEUE_LOG.tag, text: QUEUE_LOG.tickFailed + String(e) })
    return Response.json({ ok: false, fired: 0 }, { status: SERVER_ERROR })
  }
}

/**
 * POST /api/queue/units:收一个单元的现状(本机 docker 各容器的调度器开跑 / 跑完 / 等盒子时上报)。
 *
 * @param req 请求体 `{ name, intervalS, state, lastOk, startedAt, endedAt, nextAt }`。
 * @returns `{ ok }`;没带钥匙 401、坏体 400、写不成 500。
 */
export async function queueUnitsRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  let body: UnitJson = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const unit = toUnitFact(body)
  if (unit == null) {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  try {
    await saveUnit({ db: await getDb(), unit })
  } catch (e) {
    log({ tag: QUEUE_LOG.tag, text: QUEUE_LOG.unitFailed + unit.name + QUEUE_LOG.whyFrag + String(e) })
    return Response.json({ ok: false }, { status: SERVER_ERROR })
  }
  return Response.json({ ok: true })
}
