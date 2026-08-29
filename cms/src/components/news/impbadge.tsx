'use client'
/**
 * 域内小件:AI 重要度徽标(P1d 立、P1f 收窄)—— 只给 5 分挂红「重要」,琥珀「关注」
 * 档 Frank 拍板删(没用)。hover 是一句理由 + 口径声明(AI 评,非资格判定);
 * 「只看重要」筛选取 ≥4 的那条梯队口径已随筛选一起删。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { impTipOf, isImportant } from './functions'
import type { ImpBadgeIn } from './types'
import css from './news.module.css'

/**
 * 渲染重要度徽标;不够分的整枚不渲。
 *
 * @param props 取词函数、界面语言、重要度与理由。
 * @returns 徽标;不够分时给 null。
 */
export function ImpBadge({ t, lang, importance, note }: ImpBadgeIn) {
  if (isImportant({ importance }) === false) {
    return null
  }
  return (
    <span className={css.imp} title={impTipOf({ t, lang, note })}>{t('news.imp')}</span>
  )
}
