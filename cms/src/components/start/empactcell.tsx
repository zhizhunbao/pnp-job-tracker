'use client'
/**
 * 域内哑单元格:雇主表「操作」格 —— 看岗位(职位板按雇主筛)/ 看公司(公司页)两个钮
 * (2026-09-04 Frank「需要一个操作列可以跳过去查对应的岗位,或者跳过去查对应的公司信息」)。
 * 钮的类随行带来(actBtnCls),哑单元格不 import functions,免循环依赖。
 *
 * @author Frank
 * @time 2026-09-05 01:10:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB } from './constants'
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染操作格。
 *
 * @param r 这一行。
 * @returns 两个钮。
 */
export function EmpActCell(r: EmpCellRow) {
  return (
    <span className={css.acts}>
      <LinkButton href={r.jobsHref} onClick={r.onView} className={r.actBtnCls} target={NEW_TAB}>
        {r.actJobsText}
      </LinkButton>
      <LinkButton href={r.companyHref} className={r.actBtnCls} target={NEW_TAB}>{r.actCompanyText}</LinkButton>
    </span>
  )
}
