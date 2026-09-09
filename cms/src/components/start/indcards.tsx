'use client'
/**
 * 指标表的手机形态:一地区一张小卡(省名 + 最新值带年 + 同比),自适应两列;工具条切表 / 趋势
 * (Frank 2026-09-09「手机端还是用卡片显示比较清晰,不应该用列表」)。
 *
 * @author Frank
 * @time 2026-09-09 03:00:00
 */
import { SeriesChart, SeriesToolbar, useSeriesView } from '@/components/table'
import { SERIES_VIEW_CHART, SERIES_VIEW_TABLE } from './constants'
import { macroLabelOf, macroValueOf, seriesWordsOf } from './functions'
import { MacroLatestCell } from './macrolatestcell'
import { MacroYoyCell } from './macroyoycell'
import type { IndCardsIn, MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染一张指标表的手机形态。
 *
 * @param x 取词函数、指标表与要显示的行。
 * @returns 工具条 + 省卡格 / 趋势图。
 */
export function IndCards(x: IndCardsIn) {
  const t = x.t
  const geo = x.geo
  const shown = x.rows
  const v = useSeriesView()
  const words = seriesWordsOf(t)
  const cards = []
  for (const r of shown) {
    cards.push(
      <div key={r.key} className={css.indCard}>
        <div className={css.indName}>{r.label}</div>
        <div className={css.provCardBody}>
          <div>{MacroLatestCell(r)}</div>
          <div>{MacroYoyCell(r)}</div>
        </div>
      </div>,
    )
  }
  return (
    <div className={css.card}>
      <div className={css.provCardHead}>
        <span className={css.headRight}>
          <SeriesToolbar view={v.view} range={v.range} words={words} rangeless
            onTable={v.onTable} onChart={v.onChart} onRecent={v.onRecent} onMore={v.onMore} onAll={v.onAll} />
        </span>
      </div>
      {v.view === SERIES_VIEW_TABLE && <div className={css.indGrid}>{cards}</div>}
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
