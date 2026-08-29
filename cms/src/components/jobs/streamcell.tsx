'use client'
/**
 * 域内小件:省提名「强档」的具名紧缺通道徽章 —— 省点名招,全列唯一加底色的一档。
 * 2026-08-28 换装批自 Table.tsx 的 cellOf 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import type { StreamCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染紧缺通道徽章。
 *
 * @param props 通道名。
 * @returns 一枚琥珀徽章。
 */
export function StreamCell({ text }: StreamCellIn) {
  return (
    <span className={cssOf(css.stream)}>{text}</span>
  )
}
