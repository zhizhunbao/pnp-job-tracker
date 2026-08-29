'use client'
/**
 * 职业榜「职业」列的单元格:蓝字职业名链接(点开落到按该 NOC 筛过的职位板 —— 每行可溯源),
 * 名字下面挂一行官方英文名灰注(#309 主次对调:人话名主文案 + 官方名灰注,站规)。
 * Frank 2026-08-06「职业名字要显示完整,右面有很多空间」:不截断不省略,长名自然折行
 * (数字列全 nowrap,表格仍不会横滚;折行只发生在主列自己的宽度里)。
 * 2026-08-28 换装批自 Pulse.tsx 的 occ 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { OccCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染职业榜「职业」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 职业名链接,以及有灰注时的官方英文名。
 */
export function OccNameCell(r: OccCellRow) {
  return (
    <div>
      <LinkButton href={r.href} onClick={r.onView} className={cssOf(css.occLink)}>{r.main}</LinkButton>
      {r.note !== TEXT_NONE && <span className={css.note}>{r.note}</span>}
    </div>
  )
}
