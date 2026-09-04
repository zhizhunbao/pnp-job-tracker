'use client'
/**
 * 域内小件:阅读题答题体(批五)—— 按载荷 kind 挑:填空(阅读填空 / 读写填空)/ 段落排序 / 阅读单选;
 * 单选先给带高亮的原文再给题干选项。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { KIND_RMCS, KIND_ROP } from './constants'
import { PteBlanks } from './pteblanks'
import { PteChoice } from './ptechoice'
import { PteOrder } from './pteorder'
import { PteText } from './ptetext'
import type { PteBlanksExtra, PteChoiceExtra, PteOrderExtra, PteReadingIn } from './types'

/**
 * 渲染阅读题答题体。
 *
 * @param props 题、载荷、作答面板、是否提交与高亮档。
 * @returns 该型的块。
 */
export function PteReading({ t, q, extra, r, checked, tiers, onHoverWord }: PteReadingIn) {
  if (extra.kind === KIND_ROP) {
    return <PteOrder t={t} extra={extra as PteOrderExtra} r={r} checked={checked} />
  }
  if (extra.kind === KIND_RMCS) {
    return (
      <>
        <PteText text={q.text} tiers={tiers} onHoverWord={onHoverWord} qid={q.qid} />
        <PteChoice extra={extra as PteChoiceExtra} r={r} checked={checked} />
      </>
    )
  }
  return <PteBlanks extra={extra as PteBlanksExtra} r={r} checked={checked} />
}
