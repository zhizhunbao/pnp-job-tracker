'use client'
/**
 * me 桶子桶 resume 的结构:简历的名字(蓝字,点了开预览框;默认那份右边挂「默认」胶囊 —— 2026-11-07 Frank
 * 「默认是不是别放中间单独占一行了」)。表格名称格与手机清单共用。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { DEFAULT_TAG, PLAIN_BTN_KIND } from './constants'
import type { ResumeNameIn } from './types'
import css from './resume.module.css'

/**
 * 简历的名字。
 *
 * @param props 文件名、默认否、「默认」的字与点击回调。
 * @returns 名字 + 胶囊。
 */
export function ResumeName({ name, isDefault, defaultText, onOpen }: ResumeNameIn) {
  return (
    <span className={cssOf(css.nameRow)}>
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.name)} onClick={onOpen}>{name}</Button>
      {isDefault && <Tag variant={DEFAULT_TAG}>{defaultText}</Tag>}
    </span>
  )
}
