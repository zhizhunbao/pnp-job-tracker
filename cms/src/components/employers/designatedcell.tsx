'use client'
/**
 * 域内哑单元格:雇主板「指定雇主」列 —— 命中直接写项目(AIP、RCIP、FCIP;列头已是「指定雇主」,
 * 2026-09-13 Frank「这个胶囊不重复吗」→ 胶囊撤)+ 指定省灰注(「地点在多伦多 也是 AIP?」),非指定渲灰色横杠。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染指定雇主格。
 *
 * @param r 这一行的展示行。
 * @returns 项目清单 + 指定省灰注,或灰色横杠。
 */
export function DesignatedCell(r: EmployerCellRow) {
  return (
    <div>
      <DashText v={{ text: r.designatedText, cls: cssOf(css.ok) }} />
      {r.designatedNote !== TEXT_NONE && <span className={css.sub}>{r.designatedNote}</span>}
    </div>
  )
}
