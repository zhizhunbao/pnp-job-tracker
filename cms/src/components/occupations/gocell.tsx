'use client'
/**
 * 通道表「去职位板」列的单元格:一枚蓝色链接,指向职位板按这个职业码搜索的结果页 ——
 * 清单只回答「哪些职业被点名」,「现在有没有岗」在职位板,这一列是两者之间的桥。
 * 2026-08-28 换装批自 Occupations.tsx 的同名列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { OccCellRow } from './types'
import css from './occupations.module.css'

/**
 * 渲染通道表「去职位板」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 指向职位板搜索结果的链接。
 */
export function GoCell(r: OccCellRow) {
  return (
    <LinkButton href={r.href} className={cssOf(css.goLink)}>{r.goLabel}</LinkButton>
  )
}
