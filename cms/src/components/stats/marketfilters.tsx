'use client'
/**
 * stats 域的结构:「更多筛选」展开后那一行(通道 + 右轴档 + 职业三级分类 + 最低在招岗数)。
 * 通道、大中小类只有横轴=职业时才成立,其余轴上整只置灰并挂一句灰字说明。
 * 各档的口径见 functions:通道 chanHitOf、右轴 medPickOf、最低岗数 occHitOf。
 * 2026-08-28 换装批自 charts.tsx 拆出成件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { MarketSelect } from './marketselect'
import type { MarketPanelIn } from './types'
import css from './stats.module.css'

/**
 * 「更多筛选」那一行。
 *
 * @param props 统计主图的整机。
 * @returns 筛选行。
 */
export function MarketFilters({ panel }: MarketPanelIn) {
  return (
    <div className={css.morePanel}>
      <MarketSelect label={panel.t('mkt.chan')}
        value={panel.chan}
        opts={panel.chanOpts}
        onChange={panel.onChan}
        disabled={panel.catDisabled} />
      <MarketSelect label={panel.t('mkt.y2')}
        value={panel.y2}
        opts={panel.y2Opts}
        onChange={panel.onY2} />
      <MarketSelect label={panel.t('mkt.broad')}
        value={panel.fBroad}
        opts={panel.broadOpts}
        onChange={panel.onBroad}
        disabled={panel.catDisabled} />
      <MarketSelect label={panel.t('mkt.mid')}
        value={panel.fMid}
        opts={panel.midOpts}
        onChange={panel.onMid}
        disabled={panel.catDisabled} />
      <MarketSelect label={panel.t('mkt.fine')}
        value={panel.fFine}
        opts={panel.fineOpts}
        onChange={panel.onFine}
        disabled={panel.catDisabled} />
      <MarketSelect label={panel.t('mkt.minJobs')}
        value={panel.minJobs}
        opts={panel.minJobsOpts}
        onChange={panel.onMinJobs} />
      {panel.catDisabled && <span className={css.hint}>{panel.t('mkt.chan.occOnly')}</span>}
    </div>
  )
}
