'use client'
/**
 * 域内小件:一行都没有时的那句话。匹配视图另给一条「去改档案」的出口 —— 空的匹配视图
 * 不该是死路。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件(表格版与卡片版共用同一句)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { SPACE, TEXT_NONE, URL_ACCOUNT } from './constants'
import type { EmptyNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染空态那句话。
 *
 * @param props 空态正文与「去建档」链接文案。
 * @returns 一句话(匹配视图带出口)。
 */
export function EmptyNote({ text, link }: EmptyNoteIn) {
  return (
    <>
      {text}
      {link !== TEXT_NONE && (
        <>
          {SPACE}
          <LinkButton href={URL_ACCOUNT} className={cssOf(css.emptyLink)}>{link}</LinkButton>
        </>
      )}
    </>
  )
}
