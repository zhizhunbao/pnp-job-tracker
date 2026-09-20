'use client'
/**
 * 域内哑单元格:雇主板「在招地点」列 —— 在招岗所在的「市, 省码」各一枚胶囊(至多三处,岗多的在前),没有就渲灰色横杠
 * (2026-09-19 Frank「是不是需要加一列,在招岗位所在地」「用胶囊框一下」;胶囊走通用 tag 桶)。
 * 2026-09-20 数据层改给全部在招地点:格里默认露三枚、其余展开才出 —— 形态走通用 tag 桶的 TagFold(开合态住它里面;
 * 列渲染器是被当普通函数调的,放不了状态)。
 *
 * @author Frank
 * @time 2026-09-19 03:30:00
 */
import { TagFold } from '@/components/tag'
import { DASH_MARK, LOCS_FIRST_N, TAG_REGION } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染在招地点格。
 *
 * @param r 这一行的展示行。
 * @returns 一排胶囊,或灰色横杠。
 */
export function PoolLocsCell(r: EmployerCellRow) {
  if (r.locs.length === 0) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return (
    <div className={css.locs}>
      <TagFold items={r.locs}
        first={LOCS_FIRST_N}
        variant={TAG_REGION}
        moreText={r.locsMoreText}
        lessText={r.locsLessText} />
    </div>
  )
}
