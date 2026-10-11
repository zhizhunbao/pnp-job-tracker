'use client'
/**
 * 域内哑单元格:「操作」格 —— 主钮 / 带框次钮(投递、继续、打开、取消收藏)+ 附件链接(2026-10-10 批 2)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { ActList } from './actlist'
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行。
 * @returns 一排钮(+ 附件链接)。
 */
export function ActCell(r: ListRow) {
  return (
    <span className={css.actCell}>
      <ActList acts={r.acts} />
      <ActList acts={r.files} />
    </span>
  )
}
