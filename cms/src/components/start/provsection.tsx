'use client'
/**
 * 域内小件:S4a 分省概览(Frank 2026-08-06「省卡改表格吧 拆两个 section」)——
 * 桌面 = 可排序 Table(10 省 × 混量纲指标,表格才排得动),手机 = 原省卡
 * (站规「电脑表格手机卡片」)。
 * 表格行不可点(E8-08 站规「可点才有态」),切省统一走 S4b 的 chips;手机卡片保留点卡切省。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Table } from '@/components/table'
import { ID_PROV, PH_PROV } from './constants'
import { provColsOf, provRowKeyOf, toProvCellRows } from './functions'
import { Band } from './band'
import { Placeholder } from './placeholder'
import { ProvCard } from './provcard'
import { Sec } from './sec'
import type { ProvCellRow, ProvSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染分省概览区。
 *
 * @param props 取词函数、界面语言、加载态、汇总行、省卡增补、当前省与切省手柄工厂。
 * @returns 色带;数据到了而一行都没有时给 null。
 */
export function ProvSection({ t, lang, loading, rows, provExtra, prov, provPickOf }: ProvSectionIn) {
  if (loading === false && rows.length === 0) {
    return null
  }
  const cells = toProvCellRows({ rows, t, lang, provExtra })
  const cards = []
  for (const c of cells) {
    cards.push(<ProvCard key={c.key} row={c} on={c.key === prov} onPick={provPickOf(c.key)} t={t} />)
  }
  return (
    <Band id={ID_PROV}>
      <Sec title={t('pulse.s4')}>
        {loading && <Placeholder size={PH_PROV} />}
        {cells.length > 0 && (
          <div className={css.table}>
            <Table<ProvCellRow> rows={cells} cols={provColsOf({ t })} rowKey={provRowKeyOf} />
          </div>
        )}
        {cells.length > 0 && (
          <div className={css.cards}>
            <div className={css.provCards}>{cards}</div>
          </div>
        )}
      </Sec>
    </Band>
  )
}
