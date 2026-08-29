'use client'
/**
 * 对比表最左那一列的单元格:渲染维度名。对比表是**转置**的(维度当行、雇主当列),
 * 所以这一列渲的不是雇主而是维度名;带口径说明的维度加一条虚下划线,示意可以悬停看。
 * 2026-08-27 换装批自 Compare.tsx 的 dim 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, TEXT_NONE } from './constants'
import type { CompareDim } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表最左一列的一个单元格。
 *
 * @param d 这一行代表的维度。
 * @returns 维度名(有口径说明时带虚下划线与 title)。
 */
export function DimLabelCell(d: CompareDim) {
  const cls = [cssOf(css.dimLabel)]
  if (d.tip !== TEXT_NONE) {
    cls.push(cssOf(css.dimLabelTip))
  }
  return <span title={d.tip} className={cls.join(CLS_SEP)}>{d.label}</span>
}
