'use client'
/**
 * 「我的简历」卡片下面那一行:「添加简历」+ 份数「2 / 5」;满 5 份钮换成一句「最多 5 份」。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { Button } from '@/components/button'
import { RF_ACT_KIND } from './constants'
import { canAddOf, countLabelOf } from './functions'
import type { ResumeAddIn } from './types'
import css from './account.module.css'

/**
 * 渲染添加一行。
 *
 * @param props 整机面板与取词函数。
 * @returns 一行。
 */
export function ResumeAdd({ p, t }: ResumeAddIn) {
  const n = p.items.length
  return (
    <div className={css.rfAdd}>
      {canAddOf(n) && <Button kind={RF_ACT_KIND} sm onClick={p.onAdd} busy={p.busy}>{t('rf.add')}</Button>}
      {canAddOf(n) === false && <span className={css.rfDropHint}>{t('rf.full')}</span>}
      <span className={css.rfDropHint}>{countLabelOf(n)}</span>
    </div>
  )
}
