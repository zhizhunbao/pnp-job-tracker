'use client'
/**
 * me 桶子桶 resume 的结构:页标题右边的钮(效果图 docs/design/我的/我的框架-20261107.md 2.3:「生成简历」次钮 +
 * 「上传简历」主钮;手机只留「上传简历」)。份数满了两颗钮换成一句「最多 20 份」(同原「添加简历」那一行)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PRIMARY_KIND, SECONDARY_KIND } from './constants'
import { canAddOf } from './functions'
import type { ResumePartIn } from './types'
import css from './resume.module.css'

/**
 * 页标题右边的钮。
 *
 * @param props 「我的简历」整机面板与取词。
 * @returns 一两颗钮或一句满了。
 */
export function ResumeActs({ r, t }: ResumePartIn) {
  const can = canAddOf(r.items.length)
  return (
    <>
      {can && r.narrow === false && <Button kind={SECONDARY_KIND} onClick={r.cv.onOpen}>{t('cv.gen')}</Button>}
      {can && <Button kind={PRIMARY_KIND} onClick={r.onAdd} busy={r.busy}>{t('rf.upTitle')}</Button>}
      {can === false && <span className={cssOf(css.hint)}>{t('rf.full')}</span>}
    </>
  )
}
