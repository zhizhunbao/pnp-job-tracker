'use client'
/**
 * 域内哑单元格:城市格 —— 全站城市名格 CityNameCell(界面语言主文案 + 「英文名 省码」灰注,09-11 站规唯一出口);
 * 城市名链到职位板按这个城市筛(同把脉页城市段;2026-10-06 Frank 要两张表照职位板,城市可点)。
 * 2026-10-07 Frank「这个点击跳转去掉」:城市不再链职位板,只出名字与灰注(CityNameCell 的 href 给空串即纯文本)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { CityNameCell } from '@/components/start'
import { TEXT_NONE } from './constants'
import type { MyJobCellRow } from './types'

/**
 * 渲染城市格。
 *
 * @param r 展示行。
 * @returns 城市名与灰注。
 */
export function CityCell(r: MyJobCellRow) {
  return <CityNameCell name={r.cityName} note={r.cityNote} href={TEXT_NONE} onOpen={r.onCity} />
}
