'use client'
/**
 * 域内小件:结果卡 —— 答题过程中冒出来的内容全住这张独立卡(Frank 2026-09-04「问题,答案,显示原句
 * 是不是下面单独弄个 section」):原句(听力型点了显示原句 / 提交后)、逐词对照(WFD 提交后,含原句)、
 * 答案(提交后点了显示答案)。没内容不渲,上面的固定卡不动。阅读题不用它。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { PHASE_CHECKED, T_WFD } from './constants'
import { isTextShown, origBoxClsOf } from './functions'
import { PteDiff } from './ptediff'
import { PteText } from './ptetext'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染结果卡。
 *
 * @param props 同答题卡。
 * @returns 结果卡;没内容不渲。
 */
export function PteResult({ t, q, type, a, tiers, onHoverWord }: PteAnswerPartIn) {
  if (q.extra != null) {
    return null
  }
  const wfd = q.type === T_WFD
  const checked = a.phase === PHASE_CHECKED
  const diffOut = checked && wfd
  const textOut = type.audio && diffOut === false
    && isTextShown({ audio: type.audio, textShown: a.textShown, phase: a.phase, wfd })
  const answerOut = checked && q.answer != null && a.answerShown
  if (textOut === false && diffOut === false && answerOut === false) {
    return null
  }
  return (
    <div className={css.card}>
      {diffOut && <PteDiff t={t} typed={a.typed} text={q.text} />}
      {textOut && (
        <>
          <div className={css.label}>{t('pte.orig')}</div>
          <PteText text={q.text} tiers={tiers} onHoverWord={onHoverWord} qid={q.qid} />
        </>
      )}
      {answerOut && (
        <>
          <div className={css.label}>{t('pte.answer')}</div>
          <div className={origBoxClsOf()}>{q.answer}</div>
        </>
      )}
    </div>
  )
}
