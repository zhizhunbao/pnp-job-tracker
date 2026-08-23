/**
 * NOC 域的 HTTP 芯（第十一抽屉）：/api/noc/translate —— 官方职责/任职要求
 * 懒翻译（分类弹框「显示中文对照」）。数据层只存英文，按需逐行对位翻；
 * 一个 NOC 全站翻一次（进程缓存）—— 刻意不动 DB schema。
 * handler 的 `await req.json() as NocTransBody` 是跨边界断言：逐格判后才用。
 *
 * @author Frank
 * @time 2026-08-23 12:40:00
 */
import { getDb } from '../db/server'
import { BAD_GATEWAY, BAD_REQUEST, NOT_FOUND, TOO_MANY, UNAVAILABLE } from '../http'
import {
  E_BAD_REQUEST, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, TRANS_KEY_SEP, TRANS_LANGS,
  TRANSLATE_ROUTE_TIMEOUT_MS, translatePlainLines, translateReady,
} from '../llm'
import { checkLimit, ipOf } from '../quota/server'
import { NOCTR_IP_DAILY, NOCTR_LIMIT_PREFIX } from './constants'
import { loadNocDuties } from './functions'
import { CACHE } from './variables'
import type { NocTransBody } from './types'

/**
 * POST /api/noc/translate {noc, lang}:NOC 官方职责/任职要求懒翻译(分类弹框)。
 * 数据层只存英文(单语),这里按需逐行对位翻;一个 NOC 全站翻一次(进程缓存,重启按需重暖)
 * —— 刻意不动 DB schema(不碰生产列)。
 *
 * @param req 请求(body 是 { noc, lang })。
 * @returns { ok, duties, requirements, cached };状态码同 co-translate。
 */
export async function nocTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let noc = ''
  let lang = ''
  try {
    const b = await req.json() as NocTransBody
    if (typeof b.noc === 'string') {
      noc = b.noc
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    noc = ''
  }
  if (noc === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = noc + TRANS_KEY_SEP + lang
  const hit = CACHE.dutiesTransBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, duties: hit.duties, requirements: hit.requirements, cached: true })
  }
  const row = await loadNocDuties({ db: await getDb(), noc: noc })
  if (row == null || (row.duties === '' && row.requirements === '')) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (checkLimit([[NOCTR_LIMIT_PREFIX + ipOf(req), NOCTR_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const signal = AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS)
    let duties = { text: '', full: true }
    if (row.duties !== '') {
      duties = await translatePlainLines({ text: row.duties, lang: lang, signal: signal })
    }
    let requirements = { text: '', full: true }
    if (row.requirements !== '') {
      requirements = await translatePlainLines({ text: row.requirements, lang: lang, signal: signal })
    }
    if (duties.full && requirements.full) {
      CACHE.dutiesTransBy.set(ck, { duties: duties.text, requirements: requirements.text })
    }
    return Response.json({ ok: true, duties: duties.text, requirements: requirements.text, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

