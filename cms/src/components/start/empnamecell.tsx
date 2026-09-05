'use client'
/**
 * 域内哑单元格:雇主表的名字格 —— 英文名主文案,下面一行界面语言的别名灰注(形照 OccNameCell 的职业名 + 英文注;
 * 2026-09-05 Frank「雇主和主营业务下面应该有中文翻译吧」)。别名是数据层的机器音译,没有的不出行。
 *
 * @author Frank
 * @time 2026-09-05 02:40:00
 */
import { TEXT_NONE } from './constants'
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染名字格。
 *
 * @param r 这一行。
 * @returns 名 + 别名注。
 */
export function EmpNameCell(r: EmpCellRow) {
  return (
    <div>
      <span>{r.name}</span>
      {r.alias !== TEXT_NONE && <span className={css.note}>{r.alias}</span>}
    </div>
  )
}
