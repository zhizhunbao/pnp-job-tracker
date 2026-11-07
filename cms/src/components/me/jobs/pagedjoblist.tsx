'use client'
/**
 * me 桶子桶 jobs 的分页壳(「我的收藏」「我的投递」两张表;2026-10-13 Frank「每个 table 都有分页吧」→「都要」):先列 FOLD_FIRST 条,
 * 底下居中「显示更多(还有 N 条)」(N = 还剩几条,配线上原文;2026-11-07 提交后改)一次往下接一步(pager 桶 useFold 的步长),全列完同一位置换「收起 ▴」——
 * 与「今日推荐」同一只 MoreLine,三张表一个样。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { FOLD_FIRST, MoreLine, useFold } from '@/components/pager'
import { TEXT_NONE } from './constants'
import { JobList } from './joblist'
import type { PagedJobListIn } from './types'

/**
 * 渲染分页的表。
 *
 * @param props 展示行、列、空态与取词函数。
 * @returns 表 + 「显示更多 / 收起」行(不到一页不出)。
 */
export function PagedJobList({ rows, cols, empty, t }: PagedJobListIn) {
  const f = useFold({ hidden: Math.max(0, rows.length - FOLD_FIRST) })
  const shown = rows.slice(0, FOLD_FIRST + f.extra)
  const left = rows.length - shown.length
  return (
    <>
      <JobList rows={shown} cols={cols} empty={empty} />
      {rows.length > FOLD_FIRST && (
        <MoreLine shown={shown.length} total={rows.length} loading={false}
          moreText={t('loadMore', { n: left, left })}
          allText={TEXT_NONE} onMore={f.onMore}
          foldText={t('fold.up')} onFold={f.onFold} />
      )}
    </>
  )
}
