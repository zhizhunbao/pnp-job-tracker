'use client'
/**
 * 域内小件:WFD 逐词对照(你写的逐词标红 / 原句 / 对错数 + 已记为练过)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { SPACE } from './constants'
import { diffOf, origBoxClsOf } from './functions'
import type { PteDiffIn } from './types'
import css from './pte.module.css'

/**
 * 渲染逐词对照。
 *
 * @param props 取词函数、你写的与原句。
 * @returns 两个句框与对错行。
 */
export function PteDiff({ t, typed, text }: PteDiffIn) {
  const d = diffOf({ typed, text })
  const words = []
  let i = 0
  for (const tk of d.tokens) {
    if (tk.ok) {
      words.push(<span key={i}>{tk.w}{SPACE}</span>)
    } else {
      words.push(<span key={i} className={css.bad}>{tk.w}{SPACE}</span>)
    }
    i = i + 1
  }
  return (
    <>
      <div className={css.label}>{t('pte.typed')}</div>
      <div className={css.box}>{words}</div>
      <div className={css.label}>{t('pte.orig')}</div>
      <div className={origBoxClsOf()}>{text}</div>
      <div className={css.verdict}>
        <span>{t('pte.diff', { ok: d.ok, bad: d.bad })}</span>
        <span className={css.doneNote}>{t('pte.done')}</span>
      </div>
    </>
  )
}
