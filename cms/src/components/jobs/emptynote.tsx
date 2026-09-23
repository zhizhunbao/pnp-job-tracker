'use client'
/**
 * 域内小件:一行都没有时的那句话。匹配视图另给一条「去改档案」的出口 —— 空的匹配视图
 * 不该是死路。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件(表格版与卡片版共用同一句)。
 * 2026-09-23 账户页撤了移民档案节:「去改档案」由链 /account 改成钮,就地开档案向导。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, SPACE, TEXT_NONE } from './constants'
import type { EmptyNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染空态那句话。
 *
 * @param props 空态正文与「去建档」链接文案。
 * @returns 一句话(匹配视图带出口)。
 */
export function EmptyNote({ text, link, onOpen }: EmptyNoteIn) {
  return (
    <>
      {text}
      {link !== TEXT_NONE && (
        <>
          {SPACE}
          <Button kind={BTN_GHOST} onClick={onOpen} className={cssOf(css.emptyLink)}>{link}</Button>
        </>
      )}
    </>
  )
}
