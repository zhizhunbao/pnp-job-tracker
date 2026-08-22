/**
 * SQL 原始行 → 本域形状的构造器 + 时间词汇。体内只许词汇表 + 纯拼装,不许业务判断。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import { numOrNull, text } from '../db'
import type { Row, TimeLike, TlEvent } from './types'

/**
 * 时间格 → YYYY-MM-DD(pg timestamp 回 Date、文本列回字符串,一网收干净;空落空串)。
 *
 * @param v 库回的时间格。
 * @returns 十位日期;没有则空串。
 */
export function day(v: TimeLike): string {
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10)
  }
  if (v == null) {
    return ''
  }
  return String(v).slice(0, 10)
}

/**
 * `PNP_DRAWS_ALL` 一行 → 时间线事件(FED 行 label=类别 key、stream=官方 drawName → 标题取 stream;
 * prov 留空 = 联邦口径不变)。
 *
 * @param r 原始行。
 * @returns 事件。
 */
export function toDrawEvent(r: Row): TlEvent {
  const fed = r.province === 'FED'
  let prov = text(r.province)
  let title = text(r.label)
  if (title === '') {
    title = text(r.stream)
  }
  if (fed) {
    prov = ''
    title = text(r.stream)
    if (title === '') {
      title = text(r.label)
    }
  }
  let kind: TlEvent['kind'] = 'draw'
  if (r.kind === 'notice') {
    kind = 'notice'
  }
  return {
    date: day(r.draw_date), prov: prov, kind: kind,
    title: title, score: numOrNull(r.score), scale: text(r.scale),
    invitations: numOrNull(r.invitations), note: text(r.note),
    importance: null, url: text(r.url), slug: '',
  }
}

/**
 * `NEWS_RECENT` 一行 → 时间线事件(FEDERAL/CA 两种写法都归 '' 联邦)。
 *
 * @param r 原始行。
 * @returns 事件。
 */
export function toNewsEvent(r: Row): TlEvent {
  let region = text(r.region).toUpperCase()
  if (region === 'FEDERAL' || region === 'CA') {
    region = ''
  }
  return {
    date: day(r.date), prov: region, kind: 'policy',
    title: text(r.title), score: null, scale: '', invitations: null, note: '',
    importance: numOrNull(r.importance), url: '', slug: text(r.slug),
  }
}

/**
 * 窄行原样透传(节奏聚合要按原始列分组;照 ruling `passRow` 先例)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passRow(r: Row): Row {
  return r
}
