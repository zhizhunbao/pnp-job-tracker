'use client'
/**
 * 分省概览「省份」列的单元格:通行短名主文案 + 省码灰注,中韩界面下再挂一行译名
 * (#146 站规:英文在前,中韩括注译名;NL 用通行短名,悬停仍显全名)。
 * 2026-08-28 换装批自 Pulse.tsx 的 prov 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { TEXT_NONE } from './constants'
import type { ProvCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染分省概览「省份」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 省名 + 省码,以及非英文界面下的译名行。
 */
export function ProvNameCell(r: ProvCellRow) {
  return (
    <div>
      <span className={css.provName}>{r.name}</span>
      <span className={css.provCode}>{r.code}</span>
      {r.localeName !== TEXT_NONE && <span className={css.note}>{r.localeName}</span>}
    </div>
  )
}
