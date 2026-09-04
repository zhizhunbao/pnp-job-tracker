'use client'
/**
 * 域内小件:一张带子标题与 Top N 下拉的雇主分表(行业组一张)。
 * Top N 住这一件(每表各一把,默认 5 行),切完的行再交给 EmpBoard 出表格与卡片。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { sponsorGapClsOf } from './functions'
import { useTopN } from './hooks'
import { EmpBoard } from './empboard'
import { Sec } from './sec'
import { TopN } from './topn'
import type { EmpBoardSecIn } from './types'

/**
 * 渲染一张雇主分表。
 *
 * @param props 这张表、表种与间距。
 * @returns 子标题 + 表。
 */
export function EmpBoardSec({ t, sec, kind, gap }: EmpBoardSecIn) {
  const p = useTopN()
  return (
    <div className={sponsorGapClsOf({ gap })}>
      <Sec title={sec.title} right={<TopN v={p.n} on={p.onN} max={sec.rows.length} />} sub>
        <EmpBoard t={t} rows={sec.rows.slice(0, p.n)} kind={kind} />
      </Sec>
    </div>
  )
}
