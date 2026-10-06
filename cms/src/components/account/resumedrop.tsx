'use client'
/**
 * 「我的简历」第一次来的上传区:虚线框里一个上传图标、标题、类型与大小、「选择文件」与「拖到这里也可以」。
 * 文件拖到框上方时描边变蓝。
 *
 * @author Frank
 * @time 2026-10-05 22:40:18
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconArrowUp } from '@/components/icons'
import { RF_PICK_KIND } from './constants'
import { dropClsOf } from './functions'
import type { ResumeDropIn } from './types'
import css from './account.module.css'

/**
 * 渲染上传区。
 *
 * @param props 整机面板与取词函数。
 * @returns 上传区。
 */
export function ResumeDrop({ p, t }: ResumeDropIn) {
  return (
    <div className={dropClsOf(p.dragOn)}
      onDragOver={p.onDragOver}
      onDragLeave={p.onDragLeave}
      onDrop={p.onDrop}>
      <div className={css.rfDropIcon}><IconArrowUp /></div>
      <div className={css.rfDropTitle}>{t('rf.upTitle')}</div>
      <div className={css.rfDropSub}>{t('rf.upSub')}</div>
      <div className={css.rfDropActs}>
        <Button kind={RF_PICK_KIND} onClick={p.onAdd} busy={p.busy} className={cssOf(css.rfDropBtn)}>
          {t('rf.upBtn')}
        </Button>
        <span className={css.rfDropHint}>{t('rf.upDrag')}</span>
      </div>
    </div>
  )
}
