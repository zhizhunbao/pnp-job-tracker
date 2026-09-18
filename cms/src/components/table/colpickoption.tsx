'use client'
/**
 * 字段面板里的一行:勾选框 + 列名;灰着的(固定列、或此刻被筛选带出来的列)不可取消。
 *
 * @author Frank
 * @time 2026-09-18 16:00:00
 */
import { cssOf } from '@/components/css'
import { INPUT_CHECKBOX } from './constants'
import { cls } from './functions'
import type { ColPickOptionIn } from './types'
import css from './table.module.css'

/**
 * 渲染面板里的一行。
 *
 * @param props 这一行与固定列的注字。
 * @returns 一行勾选。
 */
export function ColPickOption({ row, fixedNote }: ColPickOptionIn) {
  return (
    <label className={cls(cssOf(css.pickOpt), row.locked && css.pickOptLocked)}>
      <input type={INPUT_CHECKBOX} checked={row.checked} disabled={row.locked} onChange={row.onToggle} />
      {row.label}{row.fixed && fixedNote}
    </label>
  )
}
