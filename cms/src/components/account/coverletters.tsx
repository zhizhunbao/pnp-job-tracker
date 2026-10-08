'use client'
/**
 * 「我的简历」页签下面的「求职信」段(2026-10-08 照 AIApply 的 My Cover Letters):一封一张卡,草稿与发出去的都列;
 * 数据 = 投递表里有信的行(/api/apply/letters),不另建表。一封没有、还没拉回来都不出这一段。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { useCoverLetters } from './hooks'
import { LetterCard } from './lettercard'
import type { CoverLettersIn } from './types'
import css from './account.module.css'

/**
 * 渲染「求职信」段。
 *
 * @param props 取词函数。
 * @returns 段标题 + 卡片网格;没有信给空。
 */
export function CoverLetters({ t }: CoverLettersIn) {
  const p = useCoverLetters()
  if (p.checked === false || p.items.length === 0) {
    return null
  }
  const cards = []
  for (const m of p.items) {
    cards.push(<LetterCard key={m.id} m={m} t={t} />)
  }
  return (
    <div className={css.subSection}>
      <div className={css.secTitle}>{t('rl.title')}</div>
      <div className={css.rfList}>{cards}</div>
    </div>
  )
}
