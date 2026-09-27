'use client'
/**
 * 域内小件:本省抽选卡里本岗那一组(格子写的通道对得上的那组)——组名一行(点它展开全部轮次),
 * 下面一行三格「最近一轮 | 分数线 | 人数」(标签在上、值在下;没公布的格不出),再下一行灰字「近 90 天几轮」「合计多少人」。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头立(原先阿省一框铺满 13 组,本岗那组只是其中琥珀一行)。
 * 三格用通用 Grid 排列(列宽跨格对齐);展开的轮次照抄省抽选表的行(DrawRow)。
 * 同日晚 Frank「这部分怎么改的这么乱了」:整组琥珀字改成琥珀底 + 黑 / 灰两档字(照职业清单本岗那一行);组名灰字改走
 * drawStreamNote,与上面通道卡同一个名字。
 * 同晚 Frank「这个要所有省和通道的格式保持一致吧」:格子改走共用的 FeatCells(三种抽选卡同一件,一行放不下自动折行,末格「来源」)。
 *
 * @author Frank
 * @time 2026-09-26 16:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { DrawRow } from './drawrow'
import { FeatCells } from './featcells'
import { caretOf, drawsClsOf } from './functions'
import type { DrawFeatViewIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本岗那一组。
 *
 * @param props 这一组、展开态与开合手柄。
 * @returns 组名行 + 三格 + 灰字统计 + 展开后的全部轮次。
 */
export function DrawFeatView({ f, open, onToggle }: DrawFeatViewIn) {
  const stats = []
  for (const s of f.stats) {
    stats.push(<span key={s}>{s}</span>)
  }
  const rows = []
  for (const r of f.rows) {
    rows.push(<DrawRow key={r.key} r={r} />)
  }
  return (
    <div className={css.feat}>
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.featHead)} onClick={onToggle}>
        <span className={css.featName}>
          {f.name}
          {f.sub !== TEXT_NONE && <span className={css.zh}>{f.sub}</span>}
        </span>
        <span className={css.featCaret}>{caretOf(open)}</span>
      </Button>
      <FeatCells cells={f.cells} />
      <div className={css.featStats}>{stats}</div>
      {open && <div className={drawsClsOf({ empty: false })}>{rows}</div>}
    </div>
  )
}
