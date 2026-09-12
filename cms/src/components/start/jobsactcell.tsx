'use client'
/**
 * 域内小件:招聘对比表操作格 —— 一枚「看岗位」钮落职位板按省筛(2026-09-12 Frank
 * 「省份和城市也需要 这个 看岗位的功能吧」,照雇主板操作列 EmpActCell 的形)。
 *
 * @author Frank
 * @time 2026-09-12 01:50:00
 */
import { LinkButton } from '@/components/button'
import { NEW_TAB } from './constants'
import type { JobsRow } from './types'
import css from './start.module.css'

/**
 * 渲染招聘对比表的操作格。
 *
 * @param r 一行。
 * @returns 一枚看岗位钮。
 */
export function JobsActCell(r: JobsRow) {
  return (
    <span className={css.acts}>
      <LinkButton href={r.actHref} className={r.actBtnCls} target={NEW_TAB}>
        {r.actText}
      </LinkButton>
    </span>
  )
}
