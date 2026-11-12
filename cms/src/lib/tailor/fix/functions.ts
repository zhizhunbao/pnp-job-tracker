/**
 * tailor 子桶 fix 的行为:针对一条要求补写一句时的纯运算。
 * 2026-11-11 按「大于 1000 就拆子桶」:tailor 的 functions.ts 过线,补写一句用到的纯运算切出来。
 * 依赖只许 tailor → 本子桶(经 index.ts);本子桶不取 tailor 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-12 02:00:00
 */
import {
  COVER_FIX_FROM_END, COVER_PARAS_MIN, FULL_STOP, INT_NONE, KEY_DESC, KEY_WORK, LINE_BREAK, ONE_SPACE, PARA_BREAK, TEXT_NONE,
} from './constants'
import { LABEL_BASE, LABEL_COVER, LABEL_FACTS, LABEL_REQ, LABEL_RESUME, LABEL_WORKS } from './prompts'
import type { CellOfIn, FixMsgIn, JsonCell, JsonCells, WithLineIn, WithSentenceIn } from './types'

/**
 * 补写一句时给模型看的字:那条要求、另一份里已有的那句、各段工作(带序号)、基础简历与用户补充。
 *
 * @param x 要求、各段工作、基础简历与用户补充。
 * @returns 用户消息。
 */
export function fixMsgOf(x: FixMsgIn): string {
  const lines = [LABEL_REQ, x.req.jd, TEXT_NONE]
  if (x.req.cover !== TEXT_NONE) {
    lines.push(LABEL_COVER, x.req.cover, TEXT_NONE)
  }
  if (x.req.resume !== TEXT_NONE) {
    lines.push(LABEL_RESUME, x.req.resume, TEXT_NONE)
  }
  if (x.works.length > 0) {
    lines.push(LABEL_WORKS)
    for (const [i, w] of x.works.entries()) {
      lines.push(String(i) + FULL_STOP + ONE_SPACE + JSON.stringify(w))
    }
    lines.push(TEXT_NONE)
  }
  lines.push(LABEL_BASE, x.base, TEXT_NONE, LABEL_FACTS, Object.values(x.facts).join(LINE_BREAK))
  return lines.join(LINE_BREAK)
}

/**
 * 草稿的某一段工作后面加一句要点(原草稿不动,交回一份新的)。
 *
 * @param x 草稿、第几段与那一句。
 * @returns 新草稿。
 */
export function withLineOf(x: WithLineIn): JsonCell {
  const next = JSON.parse(JSON.stringify(x.cv)) as JsonCell
  const w = worksOf(next)[x.at]
  if (w == null || typeof w !== 'object' || Array.isArray(w)) {
    return next
  }
  const old = strOf(cellOf({ obj: w, key: KEY_DESC }))
  if (old === TEXT_NONE) {
    w[KEY_DESC] = x.line
  } else {
    w[KEY_DESC] = old + LINE_BREAK + x.line
  }
  return next
}

/**
 * 本岗简历草稿里的各段工作。
 *
 * @param cv 草稿。
 * @returns 各段;没有给空数组。
 */
export function worksOf(cv: JsonCell): JsonCells {
  const works = cellOf({ obj: cv, key: KEY_WORK })
  if (Array.isArray(works)) {
    return works
  }
  return []
}

/**
 * 对象的某一格。
 *
 * @param x 对象与键。
 * @returns 那一格;不是对象或没有给 null。
 */
function cellOf(x: CellOfIn): JsonCell {
  if (x.obj == null || typeof x.obj !== 'object' || Array.isArray(x.obj)) {
    return null
  }
  const v = x.obj[x.key]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 一格 → 字符串(不是字符串给空串)。
 *
 * @param c 一格。
 * @returns 字符串。
 */
function strOf(c: JsonCell): string {
  if (typeof c === 'string') {
    return c.trim()
  }
  return TEXT_NONE
}

/**
 * 求职信里加一句:接在结尾段和落款之前的最后一段正文后面;段数不够(不是正常的一封信)给空串。
 *
 * @param x 求职信全文与那一句。
 * @returns 新的求职信;加不进去给空串。
 */
export function withSentenceOf(x: WithSentenceIn): string {
  const paras = x.cover.split(PARA_BREAK)
  if (paras.length < COVER_PARAS_MIN) {
    return TEXT_NONE
  }
  const at = paras.length - COVER_FIX_FROM_END
  let line = x.line
  if (line.endsWith(FULL_STOP) === false) {
    line += FULL_STOP
  }
  paras[at] = String(paras[at]).trimEnd() + ONE_SPACE + line
  return paras.join(PARA_BREAK)
}

/**
 * 模型回的一格 → 整数(数字或数字串才算;别的给 INT_NONE)。
 *
 * @param c 一格。
 * @returns 整数。
 */
export function intOf(c: JsonCell): number {
  if (typeof c !== 'number' && typeof c !== 'string') {
    return INT_NONE
  }
  const n = Number(c)
  if (c === TEXT_NONE || Number.isInteger(n) === false) {
    return INT_NONE
  }
  return n
}
