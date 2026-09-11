'use client'
/**
 * 指标表的手机形态:一地区一张小卡(省名 + 最新值带年 + 同比 + 近几年「年 × 值」迷你格),自适应两列
 * (Frank 2026-09-09「手机端还是用卡片显示比较清晰,不应该用列表」)。
 * 卡名与桌面表同一套三格(通行短名 + 码 + 译名,2026-09-10 Frank「这种是不是应该统一一下」)。
 * 2026-09-10 Frank「手机用卡片 手机不用显示图」:表 / 趋势工具条与趋势图撤出手机形态,
 * 逐年对比改由卡下缘迷你格承担(效果图点头);「其中」缩进行不出卡(卡上没有省名读不出归属)。
 *
 * @author Frank
 * @time 2026-09-09 03:00:00
 */
import { TEXT_NONE } from './constants'
import { cardPairsOf, nonSubRowsOf } from './functions'
import { MacroLatestCell } from './macrolatestcell'
import { MacroRecCell } from './macroreccell'
import { MacroYoyCell } from './macroyoycell'
import type { IndCardsIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张指标表的手机形态。
 *
 * @param x 取词函数、指标表与要显示的行。
 * @returns 省卡格。
 */
export function IndCards(x: IndCardsIn) {
  const shown = nonSubRowsOf(x.rows)
  const cards = []
  for (const r of shown) {
    const pairs = cardPairsOf(r)
    const cells = []
    for (const p of pairs) {
      cells.push(<span key={p.year} className={css.indYearHead}>{p.year}</span>)
      cells.push(<span key={p.year + p.text} className={css.indYearVal}>{p.text}</span>)
    }
    cards.push(
      <div key={r.key} className={css.indCard}>
        <div className={css.indName}>
          <span className={css.provName}>{r.label}</span>
          {r.localeName !== TEXT_NONE && <span className={css.note}>{r.localeName}</span>}
        </div>
        <div className={css.provCardBody}>
          <div>{MacroLatestCell(r)}</div>
          <div>{MacroYoyCell(r)}</div>
          {r.rec !== TEXT_NONE && <div>{MacroRecCell(r)}</div>}
        </div>
        {pairs.length > 0 && <div className={css.indYears}>{cells}</div>}
      </div>,
    )
  }
  return (
    <div className={css.card}>
      <div className={css.indGrid}>{cards}</div>
    </div>
  )
}
