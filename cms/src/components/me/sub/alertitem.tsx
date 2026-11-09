'use client'
/**
 * me 桶子桶 sub 的提醒列表:窄屏一条一张(同「我的简历」窄屏形)。
 *
 * @author Frank
 * @time 2026-11-08 23:30:00
 */
import { cssOf } from '@/components/css'
import { AlertActCell } from './alertactcell'
import { AlertFreqCell } from './alertfreqcell'
import type { AlertItemIn } from './types'
import css from './sub.module.css'

/**
 * 一条提醒。
 *
 * @param props 表行。
 * @returns 一张窄屏条目。
 */
export function AlertItem({ row }: AlertItemIn) {
  return (
    <div className={cssOf(css.alertItem)}>
      <div>{row.name}</div>
      <div className={cssOf(css.alertActs)}>
        {AlertFreqCell(row)}
        {AlertActCell(row)}
      </div>
    </div>
  )
}
