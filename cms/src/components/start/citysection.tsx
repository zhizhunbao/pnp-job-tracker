'use client'
/**
 * 域内小件:城市段(2026-09-04 新段,Frank「职业 雇主 省份 城市」四部分)。
 * 卡片形照省卡(ProvCard):名 + 码 + 四行键值;数据来自主图的 city 行(挂载后到),
 * 没到出占位块,到了空表整段不渲。Top N 与别的表同一把下拉。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Updated } from '@/components/time'
import { ID_CITY, PH_PROV } from './constants'
import { toCityCellRows } from './functions'
import { useTopN } from './hooks'
import { Band } from './band'
import { CityCard } from './citycard'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import { TopN } from './topn'
import type { CitySectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染城市段。
 *
 * @param props 城市行、语言与更新时刻。
 * @returns 一条色带;到了数据却一行没有则 null。
 */
export function CitySection({ t, lang, updatedAt, rows }: CitySectionIn) {
  const p = useTopN()
  if (rows != null && rows.length === 0) {
    return null
  }
  const cards = []
  let max = 0
  if (rows != null) {
    max = rows.length
    for (const c of toCityCellRows({ rows: rows.slice(0, p.n), t, lang })) {
      cards.push(<CityCard key={c.key} t={t} row={c} />)
    }
  }
  return (
    <Band white id={ID_CITY}>
      <Sec title={t('pulse.city')} right={<><TopN v={p.n} on={p.onN} max={max} /><Updated iso={updatedAt} t={t} /></>}>
        {rows == null && <Placeholder size={PH_PROV} />}
        {rows != null && <div className={css.provCards}>{cards}</div>}
      </Sec>
    </Band>
  )
}
