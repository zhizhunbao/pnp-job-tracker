'use client'
/**
 * 字段选择器的浮层:一排快捷钮(核心列 / 全选 / 反选 / 恢复列宽)+ 逐列勾选。
 * match 列是「我的匹配」视图专属(E5-05),勾了也不出列 —— 不进选择器(第 2 轮 #11)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST } from './constants'
import { colPanelRowsOf } from './functions'
import { ColOption } from './coloption'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染字段浮层。
 *
 * @param props 职位板整台状态机。
 * @returns 浮层。
 */
export function ColPanel({ b }: BoardPanelIn) {
  const rows = []
  for (const r of colPanelRowsOf(b)) {
    rows.push(
      <ColOption key={r.k} label={r.label}
        checked={r.checked}
        always={r.always}
        fixedNote={r.fixedNote}
        onToggle={r.onToggle} />,
    )
  }
  return (
    <div className={cssOf(css.colPanel)}>
      <div className={cssOf(css.colHead)}>
        <Button kind={BTN_GHOST} onClick={b.cols.onMain}
          className={`${cssOf(css.colBtn)} ${cssOf(css.colBtnMain)}`}>
          {b.t('fields.main')}
        </Button>
        <Button kind={BTN_GHOST} onClick={b.cols.onAll} className={cssOf(css.colBtn)}>{b.t('fields.all')}</Button>
        <Button kind={BTN_GHOST} onClick={b.cols.onInvert} className={cssOf(css.colBtn)}>
          {b.t('fields.invert')}
        </Button>
        {b.cols.cw.hasManual && (
          <Button kind={BTN_GHOST} onClick={b.cols.cw.reset} className={cssOf(css.colBtn)}>
            {b.t('fields.resetW')}
          </Button>
        )}
      </div>
      {rows}
    </div>
  )
}
