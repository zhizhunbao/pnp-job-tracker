'use client'
/**
 * stats 域的结构:统计主图的常用控件行(搜索 + 横轴 + 簇内分组 + 排序主键 + 高低两向
 * + 「更多筛选」)。控件区重设计(Frank 2026-07-28「加一些搜索和过滤条件」):四行药丸 →
 * **常用一行 + 更多筛选折叠**,与职位板筛选区同一套语言(#59 拍板的形态)。
 * 搜索 + 通道筛选那两样的由来见 functions 的 chanHitOf(Frank「哪些能走 ee pnp aip qc 的
 * 单独通道也需要筛选」)。
 * 2026-08-28 换装批自 charts.tsx 拆出成件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { Button } from '@/components/button'
import { Search } from '@/components/search'
import { PLAIN_BTN_KIND, SEARCH_SIZE } from './constants'
import { moreClsOf, segClsOf, segGroupClsOf } from './functions'
import { MarketSelect } from './marketselect'
import type { MarketPanelIn } from './types'
import css from './stats.module.css'

/**
 * 常用控件行。
 *
 * @param props 统计主图的整机。
 * @returns 控件行。
 */
export function MarketControls({ panel }: MarketPanelIn) {
  const dirs = []
  for (const d of panel.dirOpts) {
    dirs.push(
      <Button key={d.value}
        kind={PLAIN_BTN_KIND}
        onClick={panel.dirPickOf(d.value)}
        className={segClsOf({ on: panel.sortDir === d.value })}>
        {d.label}
      </Button>,
    )
  }
  return (
    <div className={css.ctlRow}>
      <Search value={panel.query}
        onChange={panel.onQuery}
        placeholder={panel.t('mkt.search')}
        size={SEARCH_SIZE} />
      <MarketSelect label={panel.t('mkt.x')}
        value={panel.xKey}
        opts={panel.xOpts}
        onChange={panel.onXKey} />
      <MarketSelect label={panel.t('mkt.g')}
        value={panel.group}
        opts={panel.groupOpts}
        onChange={panel.onGroup} />
      <MarketSelect label={panel.t('mkt.sort')}
        value={panel.sortBy}
        opts={panel.sortOpts}
        onChange={panel.onSortBy} />
      <span className={segGroupClsOf()}>{dirs}</span>
      <Button kind={PLAIN_BTN_KIND} onClick={panel.onMore} className={moreClsOf()}>
        {panel.t('mkt.more')}
        {panel.filterCount > 0 && <span className={css.badge}>{panel.filterCount}</span>}
      </Button>
    </div>
  )
}
