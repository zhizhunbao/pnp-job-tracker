'use client'
/**
 * 域内小件:一张雇主分表 —— 子标题行 + 表(每页 10 行;身份胶囊行 2026-09-12 Frank
 * 「有工签 和 没工签 用一张表就行了」随两档合并退役)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Updated } from '@/components/time'
import { sponsorGapClsOf } from './functions'
import { EmpBoard } from './empboard'
import { Sec } from './sec'
import type { EmpBoardSecIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张雇主分表。
 *
 * @param props 锚点 id、这张表、表种、间距与更新时刻。
 * @returns 子标题 + 表。
 */
export function EmpBoardSec({ t, anchor, sec, tableKind, gap, updatedAt }: EmpBoardSecIn) {
  return (
    <div id={anchor} className={css.subAnchor}>
      <div className={sponsorGapClsOf({ gap })}>
        <Sec title={sec.title}
          right={<Updated iso={updatedAt} t={t} />}
          sub>
          <EmpBoard t={t} rows={sec.rows} kind={tableKind} />
        </Sec>
      </div>
    </div>
  )
}
