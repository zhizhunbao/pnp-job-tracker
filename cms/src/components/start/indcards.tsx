'use client'
/**
 * 指标表的手机形态:一地区一张小卡(省名 + 最新值带年 + 同比),自适应两列;工具条切表 / 趋势
 * (Frank 2026-09-09「手机端还是用卡片显示比较清晰,不应该用列表」)。
 * 卡名与桌面表同一套三格(通行短名 + 码 + 译名,2026-09-10 Frank「这种是不是应该统一一下」)。
 *
 * @author Frank
 * @time 2026-09-09 03:00:00
 */
import { SeriesChart, SeriesToolbar, useSeriesView } from '@/components/table'
import { MACRO_MORE, MACRO_RECENT, SERIES_VIEW_CHART, SERIES_VIEW_TABLE, TEXT_NONE } from './constants'
import { macroLabelOf, macroValueOf, nonSubRowsOf, seriesWordsOf } from './functions'
import { MacroLatestCell } from './macrolatestcell'
import { MacroRecCell } from './macroreccell'
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
  const shown = nonSubRowsOf(x.rows)
  const v = useSeriesView()
  const words = seriesWordsOf(t)
  const cards = []
  for (const r of shown) {
    cards.push(
      <div key={r.key} className={css.indCard}>
        <div className={css.indName}>
          <span className={css.provName}>{r.label}</span>
          {r.geoCode !== TEXT_NONE && <span className={css.provCode}>{r.geoCode}</span>}
          {r.localeName !== TEXT_NONE && <span className={css.note}>{r.localeName}</span>}
        </div>
        <div className={css.provCardBody}>
          <div>{MacroLatestCell(r)}</div>
          <div>{MacroYoyCell(r)}</div>
          {r.rec !== TEXT_NONE && <div>{MacroRecCell(r)}</div>}
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
          indexed={geo.indexed}
          range={v.range}
          recent={MACRO_RECENT}
          more={MACRO_MORE}
          words={words} />
      )}
    </div>
  )
}
