'use client'
/**
 * 哑单元格:题面(真链接进单题页;一行截断;练过的灰掉,类名在展示行里算好)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { TEXT_NONE } from './constants'
import type { PteCellRow } from './types'
import css from './pte.module.css'

/**
 * 渲染题面格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function TextCell(r: PteCellRow) {
  const parts = []
  let i = 0
  for (const p of r.parts) {
    if (p.word === TEXT_NONE) {
      parts.push(<span key={i}>{p.text}</span>)
    } else {
      parts.push(
        <mark key={i} className={p.cls} onClick={r.onHoverWord} data-q={r.qid} data-i={p.sent}>{p.text}</mark>,
      )
    }
    i = i + 1
  }
  return (
    <span className={r.textCls}>
      {r.title !== TEXT_NONE && <b className={css.rowTitle}>{r.title}</b>}
      {parts}
    </span>
  )
}
