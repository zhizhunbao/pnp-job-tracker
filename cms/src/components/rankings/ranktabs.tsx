'use client'
/**
 * 榜单导航(E9-02 分类榜矩阵):只列当天真有数据的榜,当前榜加粗黑。
 * #61(2026-07-19 Frank 拍板「就是那个意思」):从页底挪到页头下方 ——
 * 导航是切换入口不是脚注。
 * 2026-08-28 换装批自 Ranking.tsx 的导航段提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { RankTab } from './ranktab'
import type { RankTabsIn } from './types'
import css from './rankings.module.css'

/**
 * 榜单导航。
 *
 * @param props 导航各格。
 * @returns 一行(窄屏折多行)榜名。
 */
export function RankTabs({ rows }: RankTabsIn) {
  const tabs = []
  for (const r of rows) {
    tabs.push(<RankTab key={r.slug} r={r} />)
  }
  return <div className={css.tabs}>{tabs}</div>
}
