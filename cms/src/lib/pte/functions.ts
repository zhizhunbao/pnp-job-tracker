/**
 * pte lib 域的行为:取音频、取/写练过档、并集、从 URL 取 qid。
 *
 * @author Frank
 * @time 2026-09-03 16:00:00
 */
import { SQL, jsonOrNull, queryRows, text } from '../db'
import { B64, DONE_MAX, PATH_SEP, TEXT_NONE } from './constants'
import type {
  DoneKeys, MaybePteAudio, PteAudio, PteAudioDbRow, PteAudioIn, PteAudioOut, PteDoneDbRow, PteDoneDoc, PteDoneIn,
  PteDoneOut, PteDoneSaveIn, Qid, SaveDoneOut, UnionIn,
} from './types'

/**
 * 一题的合成音频;没有给 null。
 *
 * @param x 数据库连接与题键。
 * @returns 音频;查无是 null。
 */
export async function loadPteAudio(x: PteAudioIn): PteAudioOut {
  const rows = await queryRows({ db: x.db, sql: SQL.PTE_AUDIO_ONE, params: [x.qid], map: toPteAudio })
  let out: MaybePteAudio = null
  for (const r of rows) {
    out = r
  }
  return out
}

/**
 * 本人的练过档;没存过给空档。
 *
 * @param x 数据库连接与用户 id。
 * @returns 题键清单。
 */
export async function loadPteDone(x: PteDoneIn): PteDoneOut {
  const rows = await queryRows({ db: x.db, sql: SQL.USER_PTE_DONE, params: [x.userId], map: toPteDone })
  let out: DoneKeys = []
  for (const r of rows) {
    out = r
  }
  return out
}

/**
 * 写回练过档(整档覆盖;并集由调用方算好)。
 *
 * @param x 数据库连接、用户 id 与题键。
 * @returns 无。
 */
export async function savePteDone(x: PteDoneSaveIn): SaveDoneOut {
  const doc: PteDoneDoc = { done: x.done, updatedAt: new Date().toISOString() }
  await x.db.query(SQL.USER_PTE_DONE_SET, [x.userId, JSON.stringify(doc)])
}

/**
 * 两份题键的并集(去重、保序:库里的在前;超上限截断)。
 *
 * @param x 两份清单。
 * @returns 并集。
 */
export function unionOf(x: UnionIn): DoneKeys {
  const seen = new Set<string>()
  const out: DoneKeys = []
  for (const k of x.a.concat(x.b)) {
    if (k === TEXT_NONE || seen.has(k) || out.length >= DONE_MAX) {
      continue
    }
    seen.add(k)
    out.push(k)
  }
  return out
}

/**
 * 从请求 URL 取最后一段当 qid(`/api/pte/audio/<qid>`;解码后交回,没有段给空串)。
 *
 * @param url 请求 URL。
 * @returns qid。
 */
export function qidOfUrl(url: string): Qid {
  const parts = new URL(url).pathname.split(PATH_SEP)
  const last = parts.at(-1)
  if (last == null) {
    return TEXT_NONE
  }
  return decodeURIComponent(last)
}

/**
 * 音频库行 → 音频(base64 解成字节)。
 *
 * @param r 库行。
 * @returns 音频。
 */
export function toPteAudio(r: PteAudioDbRow): PteAudio {
  return { mime: text(r.mime), bytes: new Uint8Array(Buffer.from(text(r.b64), B64)) }
}

/**
 * 练过档库行 → 题键清单(档不在或坏了给空)。
 *
 * @param r 库行。
 * @returns 题键清单。
 */
export function toPteDone(r: PteDoneDbRow): DoneKeys {
  const doc = jsonOrNull<PteDoneDoc>(r.pteDone)
  if (doc == null || Array.isArray(doc.done) === false) {
    return []
  }
  const out: DoneKeys = []
  for (const k of doc.done) {
    if (typeof k === 'string') {
      out.push(k)
    }
  }
  return out
}
