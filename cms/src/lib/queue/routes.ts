/**
 * 队列域(lib/queue)的 HTTP 芯:POST /api/queue/units(本机 docker 各容器的调度器开跑 / 跑完 / 等盒子时上报本单元现状)。
 * 带 x-seed-token 才收(与上传 mart 同一把钥匙);写不成留痕回 500,调度器那头只记一行、照跑。
 *
 * @author Frank
 * @time 2026-11-05 23:10:00
 */
import { getDb } from '../db/server'
import { BAD_REQUEST, HDR_SEED_TOKEN, SERVER_ERROR, TEXT_UNAUTHORIZED, UNAUTHORIZED } from '../http'
import { log, QUEUE_LOG } from '../log'
import { saveUnit, toUnitFact } from './functions'
import type { UnitJson } from './types'

/**
 * POST /api/queue/units:收一个单元的现状。
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
