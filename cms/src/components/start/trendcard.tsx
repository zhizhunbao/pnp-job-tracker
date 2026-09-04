'use client'
/**
 * 域内小件:一条趋势线的卡 —— 标题行(名 + 最新在招量)+ 图。图走 stats 桶的 EChart(通用形态单一出口),
 * 主图带坐标轴,行业小图只有线。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { EChart } from '@/components/stats'
import { lineOptionOf, trendCardClsOf, trendHeightOf } from './functions'
import type { TrendCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张趋势卡。
 *
 * @param props 这条线与是否小图。
 * @returns 卡片。
 */
export function TrendCard({ s, small }: TrendCardIn) {
  return (
    <div className={trendCardClsOf({ small })}>
      <div className={css.trendHead}>
        <span className={css.trendName}>{s.title}</span>
        <span className={css.trendVal}>{s.lastText}</span>
      </div>
      <EChart option={lineOptionOf({ s, small })} height={trendHeightOf({ small })} />
    </div>
  )
}
