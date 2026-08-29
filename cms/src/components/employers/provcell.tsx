'use client'
/**
 * 对比表「主要省」行的单元格:渲染省名,后面跟一枚该省的难度档标签
 * (E12-07 stats.difficulty 同源)。难度档未收录时只渲省名 —— 缺数不猜档
 * (红线:摆事实、高亮差异,不下结论)。这家雇主一个在招岗都没有时渲灰色横杠。
 * 2026-08-27 换装批自 Compare.tsx 的 prov 维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Tag } from '@/components/tag'
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { CompareCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表「主要省」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 省名(收录了难度档时带一枚标签),没有主要省时是灰色横杠。
 */
export function ProvCell(r: CompareCellRow) {
  if (r.provName === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <span className={css.provCell}>
      {r.provName}
      {r.diffLabel !== TEXT_NONE && <Tag variant={r.diffVariant}>{r.diffLabel}</Tag>}
    </span>
  )
}
