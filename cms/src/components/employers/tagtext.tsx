'use client'
/**
 * 域内小件:渲染一枚已经算好的标签 —— 有值渲一枚 Tag,没值交给 DashText 渲灰色横杠
 * (与文本单元格共用同一套缺数形态)。对比表的「行业」与「AIP 指定」两列用它。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Tag } from '@/components/tag'
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { TagTextIn } from './types'

/**
 * 渲染一枚标签,没有值时渲灰色横杠。
 *
 * @param props 已经算好的这一项。
 * @returns 标签,或灰色横杠。
 */
export function TagText({ v }: TagTextIn) {
  if (v.label === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return <Tag variant={v.variant}>{v.label}</Tag>
}
