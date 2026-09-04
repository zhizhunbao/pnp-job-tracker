/**
 * pte lib 域的 HTTP 芯:/api/pte/audio/[qid](合成音频,带一年 immutable 缓存头)与
 * /api/pte/done(练过档 GET / PUT,登录态,服务端取并集)。
 * `await req.json() as PteDoneBody` 是跨边界断言:网络 body 先按声明形状收下,逐格判后才用。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { BAD_REQUEST, NOT_FOUND, TOO_LARGE, UNAUTHORIZED } from '../http'
import { getUserOrNull } from '../quota/server'
import {
  AUDIO_CACHE, DICT_CACHE, DONE_LEN_MAX, E_AUTH, E_BAD, E_NOT_FOUND, E_TOO_BIG, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE,
} from './constants'
import { loadPteAudio, loadPteDict, loadPteDone, qidOfUrl, savePteDone, unionOf } from './functions'
import type { PteDoneBody } from './types'

/**
 * GET /api/pte/audio/[qid]:一题的合成音频字节。
 *
 * @param req 请求(qid 在路径最后一段)。
 * @returns 音频响应;查无 404。
 */
export async function pteAudioRoute(req: Request): Promise<Response> {
  const qid = qidOfUrl(req.url)
  if (qid === '') {
    return Response.json({ ok: false, error: E_BAD }, { status: BAD_REQUEST })
  }
  const audio = await loadPteAudio({ db: await getDb(), qid })
  if (audio == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  return new Response(audio.bytes, {
    headers: { [HDR_CONTENT_TYPE]: audio.mime, [HDR_CACHE_CONTROL]: AUDIO_CACHE },
  })
}

/**
 * GET /api/pte/dict/[word]:一词的中文释义(2026-09-04 自托管 ECDICT 子集,替掉反复超时的外网接口)。
 *
 * @param req 请求(词在路径最后一段;按小写查)。
 * @returns { ok, word, phonetic, translation, lemma };查无 404。
 */
export async function pteDictRoute(req: Request): Promise<Response> {
  const word = qidOfUrl(req.url).toLowerCase()
  if (word === '') {
    return Response.json({ ok: false, error: E_BAD }, { status: BAD_REQUEST })
  }
  const entry = await loadPteDict({ db: await getDb(), word })
  if (entry == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  return Response.json(
    {
      ok: true, word: entry.word, phonetic: entry.phonetic, translation: entry.translation, lemma: entry.lemma,
      phoneticUk: entry.phoneticUk, phoneticUs: entry.phoneticUs,
    },
    { headers: { [HDR_CACHE_CONTROL]: DICT_CACHE } },
  )
}

/**
 * GET /api/pte/done:本人的练过档。
 *
 * @param _req 请求。
 * @returns { done };未登录 401。
 */
export async function pteDoneGetRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ ok: false, error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const done = await loadPteDone({ db: await getDb(), userId: user.id })
  return Response.json({ ok: true, done })
}

/**
 * PUT /api/pte/done {done: string[]}:与库里的取并集写回,交回并集。
 *
 * @param req 请求(body 是客户端手里的题键)。
 * @returns { done };未登录 401、形状不对 400、太大 413。
 */
export async function pteDonePutRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ ok: false, error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let mine: string[] | null = null
  try {
    const b = await req.json() as PteDoneBody
    if (Array.isArray(b.done)) {
      mine = []
      for (const k of b.done) {
        if (typeof k === 'string') {
          mine.push(k)
        }
      }
    }
  } catch {
    mine = null
  }
  if (mine == null) {
    return Response.json({ ok: false, error: E_BAD }, { status: BAD_REQUEST })
  }
  if (JSON.stringify(mine).length > DONE_LEN_MAX) {
    return Response.json({ ok: false, error: E_TOO_BIG }, { status: TOO_LARGE })
  }
  const db = await getDb()
  const done = unionOf({ a: await loadPteDone({ db, userId: user.id }), b: mine })
  await savePteDone({ db, userId: user.id, done })
  return Response.json({ ok: true, done })
}
