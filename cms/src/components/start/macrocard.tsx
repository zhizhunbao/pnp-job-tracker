'use client'
/**
 * 域内小件:地区块的手机卡 —— 卡头只放表 / 趋势两枚图标(名 + 码 + 竞争度在块标题里,卡头不重复;Frank 2026-09-06 生产实拍);
 * 表态每指标一行(最新值 + 灰注),趋势态一张多线指数图(与桌面同一套通用序列件)。
 * Frank 2026-09-06「手机端还是要卡片」。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { SeriesChart, SeriesToolbar, useSeriesView } from '@/components/table'
import { SERIES_VIEW_CHART, SERIES_VIEW_TABLE } from './constants'
import { macroLabelOf, macroValueOf, seriesWordsOf } from './functions'
import { KvRow } from './kvrow'
import { MacroKeyCell } from './macrokeycell'
import { MacroLatestCell } from './macrolatestcell'
import type { MacroCardIn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染一张地区卡。
 *
 * @param props 取词函数与地区块。
 * @returns 卡。
 */
export function MacroCard(x: MacroCardIn) {
  const t = x.t
  const geo = x.geo
  const shown = x.rows
  const v = useSeriesView()
  const words = seriesWordsOf(t)
  const rows = []
  for (const r of shown) {
    rows.push(<KvRow key={r.key} k={MacroKeyCell(r)} v={MacroLatestCell(r)} />)
  }
  return (
    <div className={css.card}>
      <div className={css.provCardHead}>
        <span className={css.headRight}>
          <SeriesToolbar view={v.view} range={v.range} words={words} rangeless
            onTable={v.onTable} onChart={v.onChart} onRecent={v.onRecent} onMore={v.onMore} onAll={v.onAll} />
        </span>
      </div>
      {v.view === SERIES_VIEW_TABLE && <div className={css.provCardBody}>{rows}</div>}
      {v.view === SERIES_VIEW_CHART && (
        <SeriesChart<MacroRow>
          rows={shown}
          pointKeys={geo.years}
          pointLabels={geo.years}
          valueOf={macroValueOf}
          labelOf={macroLabelOf}
          words={words} />
      )}
    </div>
  )
}
