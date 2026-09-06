'use client'
/**
 * table 域的序列表工具条:右对齐一行,左边「近 N 期 · 全部」两态文字,
 * 右边「表 / 趋势」两枚图标钮(亮色 = 当前态);手机卡头传 rangeless 只留两枚图标。
 * 列是时间点的表才有它(2026-09-06 把脉页省份段契约 §4);文案全部由调用方经 words 给,
 * 桶不携词。四枚钮都走 button 桶的幽灵档 + 本域的加倍类 —— 钮形全站只有那一个出口。
 *
 * @author Frank
 * @time 2026-09-06 21:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconTable, IconTrend } from '@/components/icons'
import { SERIES_BTN_KIND, SERIES_RANGE_RECENT, SERIES_RANGE_SEP, SERIES_VIEW_TABLE } from './constants'
import { cls } from './functions'
import type { SeriesToolbarIn } from './types'
import css from './table.module.css'

/**
 * 序列表工具条。
 *
 * @param props 当前两态、四枚钮的字与四枚切换手柄。
 * @returns 工具条。
 */
export function SeriesToolbar({
  view, range, words, rangeless = false, onTable, onChart, onRecent, onAll,
}: SeriesToolbarIn) {
  const recentOn = range === SERIES_RANGE_RECENT
  const tableOn = view === SERIES_VIEW_TABLE
  const showRange = rangeless === false
  return (
    <div className={css.seriesBar}>
      {showRange && (
        <Button kind={SERIES_BTN_KIND} sm onClick={onRecent} pressed={recentOn}
          className={cls(cssOf(css.seriesRange), recentOn && css.seriesRangeOn)}>{words.recent}</Button>
      )}
      {showRange && <span className={css.seriesSep}>{SERIES_RANGE_SEP}</span>}
      {showRange && (
        <Button kind={SERIES_BTN_KIND} sm onClick={onAll} pressed={recentOn === false}
          className={cls(cssOf(css.seriesRange), recentOn === false && css.seriesRangeOn)}>{words.all}</Button>
      )}
      <Button kind={SERIES_BTN_KIND} onClick={onTable} pressed={tableOn} ariaLabel={words.table}
        className={cls(cssOf(css.seriesIcon), tableOn && css.seriesIconOn)}><IconTable /></Button>
      <Button kind={SERIES_BTN_KIND} onClick={onChart} pressed={tableOn === false} ariaLabel={words.chart}
        className={cls(cssOf(css.seriesIcon), tableOn === false && css.seriesIconOn)}><IconTrend /></Button>
    </div>
  )
}
