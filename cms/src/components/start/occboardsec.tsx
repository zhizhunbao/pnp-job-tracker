'use client'
/**
 * 域内小件:一张带子标题与 Top N 下拉的职业分表(全职业两榜之一,或一个行业组)。
 * 2026-09-04 重构:Top N 住这一件(每表各一把,默认 5 行),切完的行再交给 OccBoard 出表格与卡片;
 * 原先按榜切列(雷区列 / 通道列 / 平变化)的三个开关随四榜一起撤,全表同一列集。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { boardGapClsOf } from './functions'
import { useTopN } from './hooks'
import { OccBoard } from './occboard'
import { Sec } from './sec'
import { TopN } from './topn'
import type { OccBoardSecIn } from './types'

/**
 * 渲染一张职业分表。
 *
 * @param props 候选行、子标题、间距与可提名省映射。
 * @returns 子标题 + 表。
 */
export function OccBoardSec({ t, lang, nocProvs, rows, title, gap }: OccBoardSecIn) {
  const p = useTopN()
  return (
    <div className={boardGapClsOf({ gap })}>
      <Sec title={title} right={<TopN v={p.n} on={p.onN} max={rows.length} />} sub>
        <OccBoard rows={rows.slice(0, p.n)} t={t} lang={lang} nocProvs={nocProvs} />
      </Sec>
    </div>
  )
}
