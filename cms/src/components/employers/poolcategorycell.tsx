'use client'
/**
 * 域内哑单元格:雇主板「公司分类」列 —— 洗行时算好的分类名(医院 / 大学 / 科技 / 综合行政 …),判不出渲灰色横杠。
 * 2026-09-19 晚 Frank「这两个分类应该是属于职位的分类。应该单独弄一个公司的分类。和雇主类型联动」:顶掉「大分类」列
 * (那一列是在招岗的职位大类,同日已撤);形照 pooleecell。
 *
 * @author Frank
 * @time 2026-09-19 16:30:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染公司分类格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolCategoryCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.categoryText, cls: TEXT_NONE }} />
}
