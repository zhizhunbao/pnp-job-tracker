'use client'
/**
 * 域内小件:城市段试点/AIP 一块(锚点 + 子标题 + 表)。2026-09-12 Frank「AIP 那个表需要分页吧」:
 * AIP 城市表挂 10 行分页(城按 aipJobs 全量,长);RCIP / FCIP 社区清单短,不挂 ——
 * 原本这段住 CitySection 体内,挂分页分支后超 75 行闸,按域内小件形制提出成文件。
 *
 * @author Frank
 * @time 2026-09-12 12:55:00
 */
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { CARD_PAGE_SIZE, ID_CITY_PILOT, PILOT_AIP } from './constants'
import { boardGapClsOf, pilotRowKeyOf, subIdOf } from './functions'
import { Sec } from './sec'
import type { CityPilotBlockIn, CityPilotRow } from './types'
import css from './start.module.css'

/**
 * 渲染城市段的一张试点(或 AIP)城市/社区表。
 *
 * @param props 这张表、两套列与更新时刻。
 * @returns 锚点块。
 */
export function CityPilotBlock({ t, tb, pilotCols, aipCols, updatedAt }: CityPilotBlockIn) {
  let table = (
    <Table<CityPilotRow> rows={tb.rows}
      cols={pilotCols}
      rowKey={pilotRowKeyOf} />
  )
  if (tb.key === PILOT_AIP) {
    table = (
      <Table<CityPilotRow> rows={tb.rows}
        cols={aipCols}
        rowKey={pilotRowKeyOf}
        pageSize={CARD_PAGE_SIZE} />
    )
  }
  return (
    <div id={subIdOf({ band: ID_CITY_PILOT, key: tb.key })} className={css.subAnchor}>
      <div className={boardGapClsOf({ gap: true })}>
        <Sec title={tb.key} right={<Updated iso={updatedAt} t={t} />} sub>
          {table}
        </Sec>
      </div>
    </div>
  )
}
