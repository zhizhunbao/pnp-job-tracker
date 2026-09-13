'use client'
/**
 * 域内小件:政策动态表地区格 —— 省码 / IRCC 一枚胶囊(照抽选表 ProgCell 的形;2026-09-12 Frank「政策动态改成之前的 table 不需要图片」)。
 *
 * @author Frank
 * @time 2026-09-13 00:20:00
 */
import { Tag } from '@/components/tag'
import type { NewsCellRow } from './types'

/**
 * 渲染地区格。
 *
 * @param r 一条。
 * @returns 一枚胶囊。
 */
export function NewsTagCell(r: NewsCellRow) {
  return <Tag>{r.tag}</Tag>
}
