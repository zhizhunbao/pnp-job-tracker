'use client'
/**
 * 域内哑单元格:雇主板「在招」列 —— 桶内在招岗数(粗体)+ 入门占比灰注(「入门 40%」;无在招或 0 不出)。
 * 设计稿故事一:入门岗大头在 TEER 4/5、移民要 TEER 0-3 —— 两个事实并排摆,不替用户捏合。
 * 2026-09-18 Frank「入门 100% 是什么」「不需要加这个」:入门占比灰注撤掉,格里只剩岗数(只有一个岗的雇主写
 * 「入门 100%」没有信息量;要筛新人友好的雇主,「更多筛选」里有「无经验可投」)。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染在招格。
 *
 * @param r 这一行的展示行。
 * @returns 岗数。
 */
export function OpenCell(r: EmployerCellRow) {
  return (
    <div>
      <span className={css.num}>{r.openText}</span>
    </div>
  )
}
