'use client'
/**
 * me 桶子桶 base 的结构:还没有简历时的上传区内容:上传图标、标题、类型与大小、「选择文件」「生成简历」与「拖到这里也可以」。
 * 虚线框与拖放描边归外层卡身。2026-11-12 自子桶 resume 的 ResumeDrop 照抄重写,为档案与简历并页
 * (2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { PRIMARY_KIND, SECONDARY_KIND } from './constants'
import type { BasePartIn } from './types'
import css from './base.module.css'

/**
 * 渲染上传区内容。
 *
 * @param props 「基础简历」整机面板与取词。
 * @returns 上传区内容。
 */
export function BaseDrop({ b, t }: BasePartIn) {
  return (
    <>
      <div className={cssOf(css.dropIcon)}><IconArrowUp /></div>
      <div className={cssOf(css.dropTitle)}>{t('rf.upTitle')}</div>
      <div className={cssOf(css.dropSub)}>{t('rf.upSub')}</div>
      <div className={cssOf(css.dropActs)}>
        <Button kind={PRIMARY_KIND} onClick={b.onAdd} busy={b.busy} className={cssOf(css.dropBtn)}>
          {t('rf.upBtn')}
        </Button>
        <Button kind={SECONDARY_KIND} onClick={b.cv.onOpen}>{t('cv.gen')}</Button>
        <span className={cssOf(css.hint)}>{t('rf.upDrag')}</span>
      </div>
    </>
  )
}
