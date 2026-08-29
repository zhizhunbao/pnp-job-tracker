'use client'
/**
 * 域内小件:字段面板里的一列(勾选框 + 列名)。固定列灰着不可取消(职位与操作两列)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { INPUT_CHECKBOX } from './constants'
import { colOptClsOf } from './functions'
import type { ColOptionIn } from './types'

/**
 * 渲染字段面板里的一列。
 *
 * @param props 列名、勾上没、固定列没与开关。
 * @returns 一行勾选。
 */
export function ColOption({ label, checked, always, fixedNote, onToggle }: ColOptionIn) {
  return (
    <label className={colOptClsOf(always)}>
      <input type={INPUT_CHECKBOX} checked={checked} disabled={always} onChange={onToggle} />
      {label}{fixedNote}
    </label>
  )
}
