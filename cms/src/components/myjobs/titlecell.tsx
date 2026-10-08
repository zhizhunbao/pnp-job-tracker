'use client'
/**
 * 域内哑单元格:职位格 —— 职位名(链到职位页;职位删了就是纯文字)。
 * 2026-10-06 Frank「拆」:一格一个字段,译名灰注撤(职位板的职位列也只有名字)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { LinkButton } from '@/components/button'
import { TEXT_NONE } from './constants'
import type { MyJobCellRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染职位格。
 *
 * @param r 展示行。
 * @returns 职位名。
 */
export function TitleCell(r: MyJobCellRow) {
  return (
    <div>
      {r.href !== TEXT_NONE && (
        <LinkButton href={r.href} onClick={r.onTitle} className={css.title}>{r.title}</LinkButton>
      )}
      {r.href === TEXT_NONE && <div className={css.title}>{r.title}</div>}
    </div>
  )
}
