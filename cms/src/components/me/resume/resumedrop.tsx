'use client'
/**
 * me 桶子桶 resume 的结构:一份简历都没有时的上传区内容:上传图标、标题、类型与大小、「选择文件」「生成简历」与「拖到这里也可以」
 * (2026-10-05 立;11-07 「选择文件」旁加「生成简历」:还没有简历的人最用得上)。虚线框与拖放描边归外层清单区。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { PRIMARY_KIND, SECONDARY_KIND } from './constants'
import type { ResumePartIn } from './types'
import css from './resume.module.css'

/**
 * 渲染上传区内容。
 *
 * @param props 「我的简历」整机面板与取词。
 * @returns 上传区内容。
 */
export function ResumeDrop({ r, t }: ResumePartIn) {
  return (
    <>
      <div className={cssOf(css.dropIcon)}><IconArrowUp /></div>
      <div className={cssOf(css.dropTitle)}>{t('rf.upTitle')}</div>
      <div className={cssOf(css.dropSub)}>{t('rf.upSub')}</div>
      <div className={cssOf(css.dropActs)}>
        <Button kind={PRIMARY_KIND} onClick={r.onAdd} busy={r.busy} className={cssOf(css.dropBtn)}>
          {t('rf.upBtn')}
        </Button>
        <Button kind={SECONDARY_KIND} onClick={r.cv.onOpen}>{t('cv.gen')}</Button>
        <span className={cssOf(css.hint)}>{t('rf.upDrag')}</span>
      </div>
    </>
  )
}
