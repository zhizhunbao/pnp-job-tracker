'use client'
/**
 * table 域的序列表趋势态:一张 SVG 多折线指数图(2026-09-06 把脉页省份段契约 §4);
 * 原值模式(indexed=false)画分组柱状图(Frank 2026-09-10「折线要不改成柱状图吧」)。
 * 每行一条线,y = 指数(该行首个有值点 = 100;indexed=false 时画原值),x = 时间点列的 label;
 * 图例在图下方(色块 + 行名 + 最新原值;2026-09-10 Frank「上面的标,放到下面吧」,原在图上方),
 * 每个点带 `<title>` 交代原值。
 * 几何全在 functions 的 seriesPlotOf 算好,这里只把它摆成 JSX。
 *
 * @author Frank
 * @time 2026-09-06 21:00:00
 */
import {
  SERIES_ANCHOR_END, SERIES_BASELINE_MID, SERIES_DASH_BOX, SERIES_DASH_H, SERIES_DASH_W,
  SERIES_DOT_R, SERIES_FILL_NONE, SERIES_KEY_SEP, SERIES_LINE_W, SERIES_PATH_EMPTY, SERIES_SVG_ROLE, SERIES_TICK_Y,
} from './constants'
import { chartWindowOf, seriesPlotOf, tickAnchorOf } from './functions'
import type { SeriesChartIn } from './types'
import css from './table.module.css'

/**
 * 序列表趋势态的图。
 *
 * @param props 刻度文本、时间点 key、行、两枚取值器与图上那行小字。
 * @returns 图。
 */
export function SeriesChart<T>({
  pointKeys, pointLabels, rows, valueOf, labelOf, indexed, range, recent, more, words,
}: SeriesChartIn<T>) {
  const w = chartWindowOf({ pointKeys, pointLabels, range, recent, more })
  const plot = seriesPlotOf({ pointKeys: w.keys, pointLabels: w.labels, rows, valueOf, labelOf, indexed })
  const legend = []
  const marks = []
  for (const line of plot.lines) {
    legend.push(
      <span key={line.label} className={css.legendItem}>
        <svg className={css.legendDash} viewBox={SERIES_DASH_BOX} aria-hidden>
          <rect width={SERIES_DASH_W} height={SERIES_DASH_H} fill={line.color} />
        </svg>
        <span className={css.legendName}>{line.label}</span>
        <span className={css.legendVal}>{line.lastText}</span>
      </span>,
    )
    if (line.path !== SERIES_PATH_EMPTY) {
      marks.push(
        <path key={line.label} d={line.path} fill={SERIES_FILL_NONE} stroke={line.color} strokeWidth={SERIES_LINE_W} />,
      )
    }
    for (const bar of line.bars) {
      marks.push(
        <rect key={line.label + SERIES_KEY_SEP + bar.key}
          x={bar.x} y={bar.y} width={bar.w} height={bar.h} fill={line.color}>
          <title>{bar.title}</title>
        </rect>,
      )
    }
    for (const dot of line.dots) {
      marks.push(
        <circle key={line.label + SERIES_KEY_SEP + dot.key} cx={dot.cx} cy={dot.cy} r={SERIES_DOT_R} fill={line.color}>
          <title>{dot.title}</title>
        </circle>,
      )
    }
  }
  const grid = []
  for (const g of plot.grid) {
    grid.push(
      <g key={g.text}>
        <line className={css.gridLine} x1={plot.left} y1={g.y} x2={plot.right} y2={g.y} />
        <text className={css.axisText}
          x={plot.textX}
          y={g.y}
          textAnchor={SERIES_ANCHOR_END}
          dominantBaseline={SERIES_BASELINE_MID}>{g.text}</text>
      </g>,
    )
  }
  const ticks = []
  for (const t of plot.ticks) {
    ticks.push(
      <text key={t.x} className={css.axisText} x={t.x} y={SERIES_TICK_Y} textAnchor={tickAnchorOf(t)}>{t.text}</text>,
    )
  }
  return (
    <div className={css.chart}>
      {indexed && <div className={css.chartNote}>{words.indexNote}</div>}
      <svg className={css.chartSvg} viewBox={plot.viewBox} role={SERIES_SVG_ROLE} aria-label={words.indexNote}>
        {grid}
        {ticks}
        {marks}
      </svg>
      <div className={css.legend}>{legend}</div>
    </div>
  )
}
