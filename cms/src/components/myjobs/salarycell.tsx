'use client'
/**
 * 域内哑单元格:薪资格 —— 数据层洗好的薪资串,钱绿色(同职位板与职位卡)。
 *
 * @author Frank
 * @time 2026-10-06 23:50:00
 */
import type { MyJobCellRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染薪资格。
 *
 * @param r 展示行。
 * @returns 薪资(没有就空)。
 */
export function SalaryCell(r: MyJobCellRow) {
  return <span className={css.pay}>{r.salary}</span>
}
