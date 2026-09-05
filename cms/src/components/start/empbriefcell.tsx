'use client'
/**
 * 域内哑单元格:雇主表的主营业务格 —— 英文原文作主文案,界面语言的译文作灰注(形照 EmpNameCell 的名 + 别名注,Frank「这两个保持一致」「先英文再中文」;
 * 2026-09-05 Frank「改成中英双语的吗」)。只有一语时不出注行;没有简介时主文案是 DASH_MARK。
 *
 * @author Frank
 * @time 2026-09-05 05:10:00
 */
import { TEXT_NONE } from './constants'
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染主营业务格。
 *
 * @param r 这一行。
 * @returns 主文案 + 另一语灰注。
 */
export function EmpBriefCell(r: EmpCellRow) {
  return (
    <div>
      <span>{r.brief}</span>
      {r.briefNote !== TEXT_NONE && <span className={css.note}>{r.briefNote}</span>}
    </div>
  )
}
