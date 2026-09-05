'use client'
/**
 * 职位板的计数行小件:库内总数 / 命中省提名清单岗数 / 有外劳记录雇主数,一格一条,
 * 挂在筛选行 Updated 左侧(2026-09-05 Frank 拍板 banner 文字统一:数字全部出 banner
 * 回到表格工具栏那一行;原横幅副标小件 BoardSub 撤编)。空串的格不渲。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { BoardCountsIn } from './types'
import css from './jobs.module.css'

/**
 * 计数行。
 *
 * @param props 三条计数文案(见 BoardCountsIn 逐格注释)。
 * @returns 计数行。
 */
export function BoardCounts({ count, named, lmia }: BoardCountsIn) {
  return (
    <span className={cssOf(css.counts)}>
      <span className={cssOf(css.countItem)}>{count}</span>
      {named !== TEXT_NONE && <span className={cssOf(css.countItem)}>{named}</span>}
      {lmia !== TEXT_NONE && <span className={cssOf(css.countItem)}>{lmia}</span>}
    </span>
  )
}
