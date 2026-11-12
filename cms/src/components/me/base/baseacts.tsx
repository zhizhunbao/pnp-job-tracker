'use client'
/**
 * me 桶子桶 base 的结构:文件名下面那一排钮 —— 下载、替换文件(先弹替换确认框,确认了才开文件选择器)、
 * 删除(红钮;2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)。2026-11-12 自子桶 resume 的
 * ResumePvActs 裁出重写:只留一份,「默认」胶囊与「设为默认」不带(2026-11-11 Frank「只留一份上传的吧。
 * 因为之后都可以按岗位改写」「左边我的档案,右面我的简历」)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DANGER_KIND, SECONDARY_KIND, TARGET_SELF } from './constants'
import { downloadUrlOf } from './functions'
import type { BaseFileIn } from './types'
import css from './base.module.css'

/**
 * 操作排。
 *
 * @param props 「基础简历」整机面板、那一份简历与取词。
 * @returns 一排钮。
 */
export function BaseActs({ b, m, t }: BaseFileIn) {
  return (
    <div className={cssOf(css.acts)}>
      <Button kind={SECONDARY_KIND} sm href={downloadUrlOf(m.id)} target={TARGET_SELF}>{t('rf.download')}</Button>
      <Button kind={SECONDARY_KIND} sm onClick={b.onReplace} busy={b.busy}>{t('rf.replace')}</Button>
      <Button kind={DANGER_KIND} sm onClick={b.onDelete}>{t('rf.delete')}</Button>
    </div>
  )
}
