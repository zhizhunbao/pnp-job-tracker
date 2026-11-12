'use client'
/**
 * me 桶子桶 jobs 的结构:今日推荐的一句提示(2026-11-11 任务书第 42、45、46 条)—— 没有职业依据时的引导、拿 PR 缺档案项时
 * 「先补哪几项」、只有低档时的说明;带钮的那两种钮在句子后面,点了去补全档案。
 *
 * @author Frank
 * @time 2026-11-11 23:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { OPEN_KIND, TEXT_NONE } from './constants'
import type { PicksNoteIn } from './types'
import css from './jobs.module.css'

/**
 * 一句提示。
 *
 * @param props 提示、钮上的字与点钮。
 * @returns 一行。
 */
export function PicksNote({ text, go, onGo }: PicksNoteIn) {
  return (
    <div className={cssOf(css.picksNote)}>
      <span>{text}</span>
      {go !== TEXT_NONE && <Button kind={OPEN_KIND} sm onClick={onGo}>{go}</Button>}
    </div>
  )
}
