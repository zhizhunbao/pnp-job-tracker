'use client'
/**
 * 域内小件:一张雇主分表 —— 子标题行(行业名 + 身份胶囊同一行,2026-09-05 Frank「这两个怎么排版好一些」)+ 表(每页 10 行)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Updated } from '@/components/time'
import { sponsorGapClsOf } from './functions'
import { EmpBoard } from './empboard'
import { IdChips } from './idchips'
import { Sec } from './sec'
import type { EmpBoardSecIn } from './types'

/**
 * 渲染一张雇主分表。
 *
 * @param props 这张表、身份档、切档工厂、出不出胶囊、表种、间距与更新时刻。
 * @returns 子标题 + 胶囊行 + 表。
 */
export function EmpBoardSec({ t, sec, kind, kindPickOf, chips, tableKind, gap, updatedAt }: EmpBoardSecIn) {
  return (
    <div className={sponsorGapClsOf({ gap })}>
      <Sec title={<><span>{sec.title}</span>{chips && <IdChips t={t} kind={kind} kindPickOf={kindPickOf} />}</>}
        right={<Updated iso={updatedAt} t={t} />}
        sub>
        <EmpBoard t={t} rows={sec.rows} kind={tableKind} />
      </Sec>
    </div>
  )
}
