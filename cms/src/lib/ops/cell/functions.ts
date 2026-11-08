/**
 * ops 桶的子桶 cell 的行为:单元格、数字卡、表与文字格式。父桶 functions.ts 超 1000 行,照 pathways/fit 的形开子桶。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import {
  CELL, DASH, DAY_S, DONE_TEXT, HOUR_S, MINUTE_S, NUM_LOCALE, PCT_BASE, STAGE_TEXT, TEXT, TEXT_NONE, UNIT, VAR,
} from './constants'
import type {
  AddIntIn, CardOfIn, MaybeInt, MaybeText, OpsCard, OpsCell, OpsTag, PctOfIn, TagsOfIn, UsdOfIn,
} from './types'

/**
 * 文字格。
 *
 * @param text 文字。
 * @returns 单元格。
 */
export function textCell(text: string): OpsCell {
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
  return { value: String(x.value), label: x.label }
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
export function spanOrDashOf(s: MaybeInt): string {
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
export function spanOf(s: number): string {
  if (s >= DAY_S) {
    return Math.floor(s / DAY_S) + UNIT.day
  }
  if (s >= HOUR_S) {
    return Math.floor(s / HOUR_S) + UNIT.hour
  }
  if (s >= MINUTE_S) {
    return Math.floor(s / MINUTE_S) + UNIT.min
  }
  return Math.max(0, Math.floor(s)) + UNIT.sec
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
export function doneTextOf(s: string): string {
  const label = DONE_TEXT[s]
  if (label == null) {
    return s
  }
  return label
}

/**
 * 阶段码 → 显示词。
 *
 * @param s 阶段码。
 * @returns 显示词;表外的原样。
 */
export function stageTextOf(s: string): string {
  const label = STAGE_TEXT[s]
  if (label == null) {
    return s
  }
  return label
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
