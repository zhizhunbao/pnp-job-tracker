'use client'
/**
 * 域内哑单元格:职位状态格 —— 在架 / 已下架(已下架染橙,同职位板)。
 *
 * @author Frank
 * @time 2026-10-07 00:40:00
 */
import type { MyJobCellRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染职位状态格。
 *
 * @param r 展示行。
 * @returns 一个字段。
 */
export function ListingCell(r: MyJobCellRow) {
  if (r.closed) {
    return <span className={css.closed}>{r.listingText}</span>
  }
  return <span>{r.listingText}</span>
}
