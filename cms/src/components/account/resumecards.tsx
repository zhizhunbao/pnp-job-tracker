'use client'
/**
 * 「我的简历」卡片清单:一份一张(默认那份在最前)。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { ResumeCard } from './resumecard'
import type { ResumeDropIn } from './types'
import css from './account.module.css'

/**
 * 渲染卡片清单。
 *
 * @param props 整机面板与取词函数。
 * @returns 一列卡片。
 */
export function ResumeCards({ p, t }: ResumeDropIn) {
  const cards = []
  for (const m of p.items) {
    cards.push(<ResumeCard key={m.id} meta={m} p={p} t={t} />)
  }
  return <div className={css.rfList}>{cards}</div>
}
