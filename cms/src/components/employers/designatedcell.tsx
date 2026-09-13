'use client'
/**
 * 域内哑单元格:雇主板「指定雇主」列 —— 命中出胶囊「指定雇主」+ 项目灰注(AIP、RCIP、FCIP;
 * 站规代码不裸奔:人话名主文案、项目码灰字小注);非指定渲灰色横杠。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染指定雇主格。
 *
 * @param r 这一行的展示行。
 * @returns 胶囊 + 项目灰注,或灰色横杠。
 */
export function DesignatedCell(r: EmployerCellRow) {
  if (r.designatedText === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <div>
      <span className={css.progChip}>{r.designatedText}</span>
      {r.programsNote !== TEXT_NONE && <span className={css.sub}>{r.programsNote}</span>}
    </div>
  )
}
