'use client'
/**
 * 域内小件:地区块的手机卡 —— 卡头 名 + 码 + 竞争度 + 表 / 趋势两枚图标;
 * 表态每指标一行(最新值 + 灰注),趋势态一张多线指数图(与桌面同一套通用序列件)。
 * Frank 2026-09-06「手机端还是要卡片」。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { SeriesChart, SeriesToolbar, useSeriesView } from '@/components/table'
import { SERIES_VIEW_CHART, SERIES_VIEW_TABLE } from './constants'
import { macroLabelOf, macroValueOf, seriesWordsOf } from './functions'
import { GeoTitle } from './geotitle'
import { KvRow } from './kvrow'
import { MacroLatestCell } from './macrolatestcell'
import type { MacroCardIn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染一张地区卡。
 *
 * @param props 取词函数与地区块。
 * @returns 卡。
 */
export function MacroCard({ t, geo }: MacroCardIn) {
  const v = useSeriesView()
  const words = seriesWordsOf(t)
  const rows = []
  for (const r of geo.rows) {
    rows.push(<KvRow key={r.key} k={r.label} v={MacroLatestCell(r)} />)
  }
  return (
    <div className={css.card}>
      <div className={css.provCardHead}>
        <GeoTitle geo={geo} />
        <span className={css.headRight}>
          <SeriesToolbar view={v.view} range={v.range} words={words} rangeless
            onTable={v.onTable} onChart={v.onChart} onRecent={v.onRecent} onAll={v.onAll} />
        </span>
      </div>
      {v.view === SERIES_VIEW_TABLE && <div className={css.provCardBody}>{rows}</div>}
      {v.view === SERIES_VIEW_CHART && (
        <SeriesChart<MacroRow>
          rows={geo.rows}
          pointKeys={geo.years}
          pointLabels={geo.years}
          valueOf={macroValueOf}
          labelOf={macroLabelOf}
          words={words} />
      )}
    </div>
  )
}
