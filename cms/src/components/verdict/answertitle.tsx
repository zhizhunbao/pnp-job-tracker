'use client'
/**
 * verdict 域的结构:「你的条件」卡的标题。页面给了计数胶囊(已答 n/N · 估分 n/N,
 * 两段各报各的)就与标题同排,没给就只出标题 —— 不为一个空胶囊留一层容器。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的卡②标题三目提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import type { AnswerTitleIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染「你的条件」卡的标题。
 *
 * @param props 取词函数与计数胶囊(逐格注释见 AnswerTitleIn)。
 * @returns 标题(带胶囊时同排)。
 */
export function AnswerTitle({ t, countPills }: AnswerTitleIn) {
  if (countPills == null) {
    return <>{t('dp.quiz')}</>
  }
  return <span className={css.condTitle}>{t('dp.quiz')}{countPills}</span>
}
