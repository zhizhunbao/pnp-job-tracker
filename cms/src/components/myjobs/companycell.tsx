'use client'
/**
 * 域内哑单元格:公司格 —— 公司名点了开公司弹框(同职位板与雇主板);公司表没这一家就是纯文字。
 *
 * @author Frank
 * @time 2026-10-07 00:20:00
 */
import { Button } from '@/components/button'
import { ACT_KIND } from './constants'
import type { MyJobCellRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染公司格。
 *
 * @param r 展示行。
 * @returns 可点的公司名或纯文字。
 */
export function CompanyCell(r: MyJobCellRow) {
  if (r.onCompany == null) {
    return <span>{r.company}</span>
  }
  return <Button kind={ACT_KIND} className={css.coLink} onClick={r.onCompany}>{r.company}</Button>
}
