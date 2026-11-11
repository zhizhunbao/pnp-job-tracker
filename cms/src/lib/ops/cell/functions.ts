/**
 * ops 桶的子桶 cell 的行为:单元格、数字卡、表与文字格式。父桶 functions.ts 超 1000 行,照 pathways/fit 的形开子桶。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import {
  CELL, DASH, DAY_S, DONE_TEXT, HOUR_S, MINUTE_S, NUM_LOCALE, PCT_BASE, SPAN, STAGE_TEXT, TEXT, TEXT_NONE, UNIT, VAR,
} from './constants'
import type {
  AddIntIn, CardOfIn, MaybeInt, MaybeText, OpsCard, OpsCell, OpsMsg, OpsTag, OpsText, PctOfIn, SpanAsIn, TagsOfIn, UsdOfIn,
} from './types'

/**
 * 一条不带插值的界面文字。
 *
 * @param key 词条键。
 * @returns 界面文字。
 */
export function sayOf(key: string): OpsMsg {
  return { key, vars: {} }
}

/**
 * 文字格。
 *
 * @param text 数据原文或界面文字。
 * @returns 单元格。
 */
export function textCell(text: OpsText): OpsCell {
  return { kind: CELL.text, text }
}

/**
 * 胶囊格:一枚主胶囊,出事了再挂一枚红的。
 *
 * @param x 主胶囊与红胶囊文字。
 * @returns 单元格。
 */
export function tagsCell(x: TagsOfIn): OpsCell {
  const tags: OpsTag[] = [{ variant: x.variant, text: x.text }]
  if (x.warn !== TEXT_NONE) {
    tags.push({ variant: VAR.bad, text: x.warn })
  }
  return { kind: CELL.tags, tags }
}

/**
 * 一格数字。
 *
 * @param x 数字与标题。
 * @returns 四格之一。
 */
export function cardOf(x: CardOfIn): OpsCard {
  if (typeof x.value === 'number') {
    return { value: String(x.value), label: x.label }
  }
  return { value: x.value, label: x.label }
}

/**
 * 空串显示成横线。
 *
 * @param s 可能为空的文字。
 * @returns 原文或横线。
 */
export function dashOf(s: MaybeText): string {
  if (s == null || s === TEXT_NONE) {
    return DASH
  }
  return s
}

/**
 * 可能为空的秒数 → 时长文字。
 *
 * @param s 秒数。
 * @returns 时长或横线。
 */
export function spanOrDashOf(s: MaybeInt): OpsText {
  if (s == null) {
    return DASH
  }
  return spanOf(s)
}

/**
 * 秒数 → 人读时长。
 *
 * @param s 秒数。
 * @returns 时长文字。
 */
export function spanOf(s: number): OpsMsg {
  return spanAsOf({ s, head: SPAN.dur, vars: {} })
}

/**
 * 秒数 → 「每隔多久」。
 *
 * @param s 秒数。
 * @returns 节奏文字。
 */
export function everyOf(s: number): OpsMsg {
  return spanAsOf({ s, head: SPAN.every, vars: {} })
}

/**
 * 秒数 → 「过点多久」。
 *
 * @param s 秒数。
 * @returns 超期文字。
 */
export function lateOf(s: number): OpsMsg {
  return spanAsOf({ s, head: SPAN.late, vars: {} })
}

/**
 * 秒数 → 「多久之后」。
 *
 * @param s 秒数。
 * @returns 倒计时文字。
 */
export function afterOf(s: number): OpsMsg {
  return spanAsOf({ s, head: SPAN.after, vars: {} })
}

/**
 * 秒数 → 带时长的一句:键 = 键头 + 时长单位,时长的数放进插值 d,另带调用方给的插值。
 * 一句一条词条,不拿「前缀 + 时长」拼接(各语言语序不同)。
 *
 * @param x 秒数、键头与其余插值。
 * @returns 界面文字。
 */
export function spanAsOf(x: SpanAsIn): OpsMsg {
  let unit: string = UNIT.sec
  let d = Math.max(0, Math.floor(x.s))
  if (x.s >= DAY_S) {
    unit = UNIT.day
    d = Math.floor(x.s / DAY_S)
  } else if (x.s >= HOUR_S) {
    unit = UNIT.hour
    d = Math.floor(x.s / HOUR_S)
  } else if (x.s >= MINUTE_S) {
    unit = UNIT.min
    d = Math.floor(x.s / MINUTE_S)
  }
  const vars: OpsMsg['vars'] = { d }
  for (const k of Object.keys(x.vars)) {
    const v = x.vars[k]
    if (v != null) {
      vars[k] = v
    }
  }
  return { key: x.head + unit, vars }
}

/**
 * 金额文字。
 *
 * @param x 金额与小数位。
 * @returns 带美元符号的文字。
 */
export function usdOf(x: UsdOfIn): string {
  return TEXT.usd + x.n.toFixed(x.digits)
}

/**
 * 可能为空的整数 → 千分位文字。
 *
 * @param n 整数。
 * @returns 文字或横线。
 */
export function intOf(n: MaybeInt): string {
  if (n == null) {
    return DASH
  }
  return Number(n).toLocaleString(NUM_LOCALE)
}

/**
 * 状态码 → 显示词。
 *
 * @param s 状态码。
 * @returns 显示词;表外的原样。
 */
export function doneTextOf(s: string): OpsText {
  const label = DONE_TEXT[s]
  if (label == null) {
    return s
  }
  return sayOf(label)
}

/**
 * 阶段码 → 显示词。
 *
 * @param s 阶段码。
 * @returns 显示词;表外的原样。
 */
export function stageTextOf(s: string): OpsText {
  const label = STAGE_TEXT[s]
  if (label == null) {
    return s
  }
  return sayOf(label)
}

/**
 * 已用比例文字。
 *
 * @param x 已用与上限。
 * @returns 百分比;上限为 0 是横线。
 */
export function pctOf(x: PctOfIn): string {
  if (x.limit === 0) {
    return DASH
  }
  return (x.used / x.limit * PCT_BASE).toFixed(1) + TEXT.pct
}

/**
 * 两个可空整数相加:都没报仍是 null,不把「没有」折成 0。
 *
 * @param x 两个数。
 * @returns 和。
 */
export function addIntOf(x: AddIntIn): MaybeInt {
  if (x.b == null) {
    return x.a
  }
  if (x.a == null) {
    return Number(x.b)
  }
  return x.a + Number(x.b)
}
