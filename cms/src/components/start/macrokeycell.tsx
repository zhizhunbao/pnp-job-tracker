'use client'
/**
 * 宏观表「指标」列的单元格:行名;「其中」行缩进(来源表号 Frank 2026-09-06「没必要显示给用户」撤);
 * 临时居民那行是折叠钮(Frank 同日「是不是带折叠展开的好一些」),点开下面五条「其中」。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { Button } from '@/components/button'
import { IconChevronDown, IconChevronRight } from '@/components/icons'
import { TOGGLE_BTN_KIND } from './constants'
import type { MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染「指标」单元格。
 *
 * @param r 这一行。
 * @returns 行名。
 */
export function MacroKeyCell(r: MacroRow) {
  if (r.toggle != null) {
    return (
      <Button kind={TOGGLE_BTN_KIND} sm onClick={r.toggle} pressed={r.expanded} className={css.macroToggle}>
        <span className={css.provName}>{r.label}</span>
        {r.expanded && <IconChevronDown />}
        {r.expanded === false && <IconChevronRight />}
      </Button>
    )
  }
  return (
    <div className={r.keyCls}>
      <span className={css.provName}>{r.label}</span>
    </div>
  )
}
