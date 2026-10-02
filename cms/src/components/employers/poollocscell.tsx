'use client'
/**
 * 域内哑单元格:雇主板「在招地点」列 —— 在招岗所在的「市, 省码」各一枚胶囊(至多三处,岗多的在前),没有就渲灰色横杠
 * (2026-09-19 Frank「是不是需要加一列,在招岗位所在地」「用胶囊框一下」;胶囊走通用 tag 桶)。
 * 2026-09-20 数据层改给全部在招地点:格里默认露三枚、其余展开才出 —— 形态走通用 tag 桶的 TagFold(开合态住它里面;
 * 列渲染器是被当普通函数调的,放不了状态)。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:TagFold 的开合钮换成 pager 桶 FoldLine,本格递取词函数与量词过去,不再递两枚现成钮面。

 * 2026-10-02 Frank「这种全部默认显示 20 个可以吗?如果小于 20 全部显示?」(拍板「全站所有清单」):默认露 20 枚(原三枚,pager 桶 FOLD_FIRST),不足 20 全露。 *
 * @author Frank
 * @time 2026-09-19 03:30:00
 */
import { FOLD_FIRST } from '@/components/pager'
import { TagFold } from '@/components/tag'
import { DASH_MARK, TAG_REGION } from './constants'
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
        first={FOLD_FIRST}
        variant={TAG_REGION}
        t={r.locsT}
        unit={r.locsUnit} />
    </div>
  )
}
