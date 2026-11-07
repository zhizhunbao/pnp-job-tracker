'use client'
/**
 * me 桶子桶 resume 的结构:手机清单里的一份(效果图 1.4:名字一行、「上传日期, 大小」一行灰字,条与条之间一条细线)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { resumeMetaLineOf } from './functions'
import { ResumeName } from './resumename'
import type { ResumeItemIn } from './types'
import css from './resume.module.css'

/**
 * 手机清单里的一份。
 *
 * @param props 展示行。
 * @returns 一条。
 */
export function ResumeItem({ row }: ResumeItemIn) {
  return (
    <div className={cssOf(css.item)}>
      <ResumeName name={row.name} isDefault={row.isDefault} defaultText={row.defaultText} onOpen={row.onOpen} />
      <div className={cssOf(css.itemMeta)}>{resumeMetaLineOf(row)}</div>
    </div>
  )
}
