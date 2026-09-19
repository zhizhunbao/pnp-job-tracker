'use client'
/**
 * 域内哑单元格:雇主板「类别」列 —— 洗行时算好的一行文字,没有就渲灰色横杠
 * (2026-09-18 雇主板换版:地点一列换成 类别 / 省 / 市 三列;Frank 拍板格子里不要胶囊也不要灰注)。
 * 2026-09-18 晚 Frank「这个不应该叫类别」:「类别」一词让给「EE 类别」那一列,这一列与下拉、公司卡那一行的中文改叫「性质」
 * (联邦机关 / 省政府 / 市镇政府 / 原住民政府 / 公立机构 / 私营企业 说的是单位性质);英文 Type、韩文 유형 不动。
 *
 * @author Frank
 * @time 2026-09-18 14:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染类别格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function SectorCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.sectorText, cls: TEXT_NONE }} />
}
