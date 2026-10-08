'use client'
/**
 * 「我的简历」顶上那一行(2026-10-08 照 AIApply 的 My Resumes:右上「+ New Resume」):左边份数「简历 3 / 20」,
 * 右边主钮「添加简历」;满了钮换成一句「最多 20 份」。原先在卡片清单最底下(10-06),传第二份要先滚到底。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { Button } from '@/components/button'
import { RF_ADD_KIND } from './constants'
import { canAddOf, countLabelOf } from './functions'
import type { ResumeAddIn } from './types'
import css from './account.module.css'

/**
 * 渲染顶上那一行。
 *
 * @param props 整机面板与取词函数。
 * @returns 一行。
 */
export function ResumeAdd({ p, t }: ResumeAddIn) {
  const n = p.items.length
  return (
    <div className={css.rfHead}>
      <span className={css.rfDropHint}>{t('rf.count', { c: countLabelOf(n) })}</span>
      {canAddOf(n) && <Button kind={RF_ADD_KIND} sm onClick={p.onAdd} busy={p.busy}>{t('rf.add')}</Button>}
      {canAddOf(n) === false && <span className={css.rfDropHint}>{t('rf.full')}</span>}
    </div>
  )
}
