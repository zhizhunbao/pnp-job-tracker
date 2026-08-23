/**
 * 外部原料 → 本域形状(第十抽屉)。resume 没有 SQL —— 这个域的「原始行」是**模型输出**:
 * parseLlmJson 收口成一个 JSON 对象,normalizeRows 逐行校验成 MatchRow;
 * 值级判空全部住这儿,functions 拿到的入参一律已有效(2026-08-22 Frank 拍板)。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

import { text } from '../db'
import { BRACE_CLOSE, BRACE_OPEN, NOTE_MAX, REQ_MAX, ROWS_MAX, ROWS_MIN } from './constants'
import { OUT_LANG, OUT_LANG_DEFAULT } from './prompts'
import type { JsonObj, MatchRows, MaybeMatchRows, NocSimDbRow, NocTitleDbRow, NocTitleRow, ParsedJson } from './types'

/**
 * LLM 输出收口·第一步:整体 JSON.parse,且要求结果是对象(模型偶发给裸数组/标量,
 * 对照吃不了,交给第二步截取)。catch 是收口算法的分支切换,不是降级。
 * 体内 `as` 是跨边界断言:JSON.parse 的返回没有形状。
 *
 * @param t 修剪过的模型原文。
 * @returns 一个 JSON 对象;不是对象或坏 JSON 是 null。
 */
function wholeJsonOf(t: string): ParsedJson {
  try {
    const whole = JSON.parse(t) as ParsedJson
    if (whole != null && typeof whole === 'object' && Array.isArray(whole) === false) {
      return whole
    }
    return null
  } catch {
    return null
  }
}

/**
 * LLM 输出收口:先整体 parse(wholeJsonOf),不行再取第一个平衡的大括号块
 * (模型偶发裹说明文字)。最终收不出来返回 null,由调用方给用户报「对照失败」。
 *
 * @param text 模型原文。
 * @returns 一个 JSON 对象;收不出来是 null。
 */
export function parseLlmJson(text: string): ParsedJson {
  const t = text.trim()
  const whole = wholeJsonOf(t)
  if (whole != null) {
    return whole
  }
  const i = t.indexOf(BRACE_OPEN)
  if (i < 0) {
    return null
  }
  let depth = 0
  for (let j = i; j < t.length; j++) {
    if (t[j] === BRACE_OPEN) {
      depth++
    } else if (t[j] === BRACE_CLOSE) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(i, j + 1)) as ParsedJson
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/**
 * 形状不可信(模型输出)→ 逐行校验;脏行丢弃,最多收 ROWS_MAX 行,
 * 少于 ROWS_MIN 条 = 解析失败或 JD 太空,不硬凑,返回 null。
 *
 * @param raw 收口出来的 JSON 对象。
 * @returns 干净的行;不够是 null。
 */
export function normalizeRows(raw: ParsedJson): MaybeMatchRows {
  if (raw == null) {
    return null
  }
  const rowsCell = raw.rows
  if (Array.isArray(rowsCell) === false) {
    return null
  }
  const out: MatchRows = []
  for (const r of rowsCell) {
    if (out.length >= ROWS_MAX) {
      break
    }
    if (r == null || typeof r !== 'object' || Array.isArray(r)) {
      continue
    }
    const row: JsonObj = r
    const req = row.req
    const hit = row.hit
    if (typeof req !== 'string' || req.trim() === '' || typeof hit !== 'boolean') {
      continue
    }
    let note = ''
    if (row.note != null) {
      note = String(row.note).trim().slice(0, NOTE_MAX)
    }
    out.push({ req: req.trim().slice(0, REQ_MAX), hit: hit, note: note })
  }
  if (out.length >= ROWS_MIN) {
    return out
  }
  return null
}

/**
 * 词汇:界面语言码 → 给模型的输出语言名(表里没有落 OUT_LANG_DEFAULT;
 * Record 查表的 undefined 在这一行当场收)。
 *
 * @param lang 界面语言码。
 * @returns 输出语言名。
 */
export function outLangOf(lang: string): string {
  const hit = OUT_LANG[lang]
  if (hit == null) {
    return OUT_LANG_DEFAULT
  }
  return hit
}

/**
 * 一行 trgm 命中（SQL.NOC_BY_TITLE_SIM）→ 职业码（只消费这一格）。
 *
 * @param r 库里的一行。
 * @returns 职业码；缺位空串。
 */
export function toNocCodeCell(r: NocSimDbRow): string {
  return text(r.noc)
}

/**
 * 一行 NOC 官方名（SQL.NOC_TITLES_BY_CODES；多出的三语列不消费）。
 *
 * @param r 库里的一行。
 * @returns 码 + 英文名。
 */
export function toNocTitleRow(r: NocTitleDbRow): NocTitleRow {
  return { noc: text(r.noc), title: text(r.title) }
}
