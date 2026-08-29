'use client'
/**
 * 域内小件:抽选节奏卡的网格(个人化钩 v1)——省×流的卡在前,联邦 EE 各类别的卡在后。
 * 两种卡长得一样、点了也是同一件事(把事件流筛到这条流),差别只在数据有几格:
 * 省卡报得出平均间隔,EE 卡只报得出距今。
 * 2026-08-28 换装批自 Timeline.tsx 的节奏区提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { TEXT_NONE } from './constants'
import { CadenceCard } from './cadencecard'
import { EeCard } from './eecard'
import type { CadenceGridIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染节奏卡网格。
 *
 * @param props 取词函数、两路节奏数据与点击手柄工厂。
 * @returns 卡片网格。
 */
export function CadenceGrid({ t, cadence, eeCadence, drillOf }: CadenceGridIn) {
  const cards = []
  for (const row of cadence) {
    cards.push(
      <CadenceCard key={row.prov + row.stream}
        t={t}
        row={row}
        onClick={drillOf({ prov: row.prov, stream: row.stream })} />,
    )
  }
  for (const row of eeCadence) {
    cards.push(
      <EeCard key={row.category}
        t={t}
        row={row}
        onClick={drillOf({ prov: TEXT_NONE, stream: row.label })} />,
    )
  }
  return (
    <div className={css.cadenceGrid}>{cards}</div>
  )
}
