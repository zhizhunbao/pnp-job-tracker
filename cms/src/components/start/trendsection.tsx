'use client'
/**
 * 域内小件:趋势段(2026-09-04 新段)。Frank「统一的部分,一张全国的先」「趋势也要按行业拆」:
 * 先一张全国在招走势主图,下面 9 个行业各一张小图(只有一条线,零控件 ——
 * 原先那张「在招职位分布」探索器七个控件,留在 /stats)。
 * 逐日数据不够画(TrendPanel 为 null)整段不渲。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Updated } from '@/components/time'
import { ID_TREND } from './constants'
import { Band } from './band'
import { Sec } from './sec'
import { TrendCard } from './trendcard'
import type { TrendSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染趋势段。
 *
 * @param props 全国线 + 行业小图与更新时刻。
 * @returns 一条色带;没数据则 null。
 */
export function TrendSection({ t, updatedAt, trend }: TrendSectionIn) {
  if (trend == null) {
    return null
  }
  const smalls = []
  for (const s of trend.inds) {
    smalls.push(<TrendCard key={s.key} s={s} small />)
  }
  return (
    <Band id={ID_TREND}>
      <Sec title={t('pulse.trend')} right={<Updated iso={updatedAt} t={t} />}>
        <TrendCard s={trend.nat} small={false} />
        {smalls.length > 0 && <div className={css.trendGrid}>{smalls}</div>}
      </Sec>
    </Band>
  )
}
