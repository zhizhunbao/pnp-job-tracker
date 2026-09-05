'use client'
/**
 * 域内小件:城市段(2026-09-04 新段,Frank「职业 雇主 省份 城市」四部分)。
 * 卡片形照省卡(ProvCard):名 + 码 + 四行键值;数据来自主图的 city 行(挂载后到),
 * 没到出占位块,到了空表整段不渲。卡片每页 10 张分页(Frank 同日撤 Top N)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { CARD_PAGE_SIZE, ID_CITY, PH_PROV } from './constants'
import { rowsOrEmpty, toCityCellRows } from './functions'
import { useCardPage } from './hooks'
import { Band } from './band'
import { CityCard } from './citycard'
import { Placeholder } from './placeholder'
import { Updated } from '@/components/time'
import { Pager } from '@/components/pager'
import { Sec } from './sec'
import type { CitySectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染城市段。
 *
 * @param props 城市行、语言与更新时刻。
 * @returns 一条色带;到了数据却一行没有则 null。
 */
export function CitySection({ t, lang, updatedAt, rows }: CitySectionIn) {
  const p = useCardPage({ rows: rowsOrEmpty(rows), pageSize: CARD_PAGE_SIZE })
  if (rows != null && rows.length === 0) {
    return null
  }
  const cards = []
  if (rows != null) {
    const shown = rows.slice(p.page * CARD_PAGE_SIZE, (p.page + 1) * CARD_PAGE_SIZE)
    for (const c of toCityCellRows({ rows: shown, t, lang })) {
      cards.push(<CityCard key={c.key} t={t} row={c} />)
    }
  }
  return (
    <Band id={ID_CITY}>
      <Sec title={t('pulse.city')} right={<Updated iso={updatedAt} t={t} />}>
        {rows == null && <Placeholder size={PH_PROV} />}
        {rows != null && <div className={css.provCards}>{cards}</div>}
        {rows != null && (
          <div className={css.pagerWrap}>
            <Pager page={p.page} max={p.maxPage} onPage={p.onPage} />
          </div>
        )}
      </Sec>
    </Band>
  )
}
