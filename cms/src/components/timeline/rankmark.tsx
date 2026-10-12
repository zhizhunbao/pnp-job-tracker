'use client'
/**
 * 域内小件:卡片右上角的名次(2026-10-12 抽选页三段式)—— 前三名出奖牌 emoji(Frank「用那个 emoji 的排名 图标吧」),
 * 第 4 名起写灰字 #4。名次在数据层(etl/mart/rank)算好,这里只显示。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import { MEDALS, RANK_HEAD } from './constants'
import type { RankMarkIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染名次记号。
 *
 * @param props 名次。
 * @returns 奖牌或灰字名次。
 */
export function RankMark({ rank }: RankMarkIn) {
  const medal = MEDALS[rank - 1]
  if (medal != null) {
    return <span className={css.medal}>{medal}</span>
  }
  return <span className={css.rank}>{RANK_HEAD}{rank}</span>
}
