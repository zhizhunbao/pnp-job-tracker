'use client'
/**
 * 域内小件:填空题面(阅读填空 / 读写填空)—— 题面按 {bN} 切段,空位是下拉(阅读填空选项 = 词库,
 * 读写填空 = 该空自己的选项);提交后空位标绿 / 红并在旁边给正确词。批五 2026-09-04。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { KIND_RFIB, PICK_DASH, PICK_NONE, TEXT_NONE } from './constants'
import { blankPartsOf, blankStateOf } from './functions'
import type { PteBlank, PteBlanksIn } from './types'
import css from './pte.module.css'

/**
 * 渲染填空题面。
 *
 * @param props 载荷、作答面板与是否提交。
 * @returns 题面。
 */
export function PteBlanks({ extra, r, checked }: PteBlanksIn) {
  const byId: Record<number, PteBlank> = {}
  for (const b of extra.blanks) {
    byId[b.id] = b
  }
  const parts = []
  let i = 0
  for (const p of blankPartsOf({ content: extra.content })) {
    if (p.blank === 0) {
      parts.push(<span key={i}>{p.text}</span>)
    } else {
      const blank = byId[p.blank]
      let options = extra.words
      if (extra.kind !== KIND_RFIB && blank != null) {
        options = blank.options
      }
      let answer = TEXT_NONE
      if (blank != null) {
        answer = blank.answer
      }
      let picked = PICK_NONE
      const got = r.fills[p.blank]
      if (got != null) {
        picked = got
      }
      const opts = []
      let k = 0
      for (const o of options) {
        opts.push(<option key={k} value={o}>{o}</option>)
        k = k + 1
      }
      parts.push(
        <span key={i} className={css.blankWrap}>
          <select className={blankStateOf({ picked, answer, checked })}
            value={picked}
            disabled={checked}
            onChange={r.fillOf(p.blank)}>
            <option value={PICK_NONE}>{PICK_DASH}</option>
            {opts}
          </select>
          {checked && picked !== answer && <span className={css.blankAns}>{answer}</span>}
        </span>,
      )
    }
    i = i + 1
  }
  return <div className={css.text}>{parts}</div>
}
