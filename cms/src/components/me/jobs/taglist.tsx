'use client'
/**
 * me 桶子桶 jobs 的一排胶囊(推荐原因 / 投递状态 / 已下架;tag 桶 Tag,一个信号一枚,能折行)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import type { TagListIn } from './types'
import css from './jobs.module.css'

/**
 * 一排胶囊。
 *
 * @param props 胶囊。
 * @returns 能折行的一排;没有胶囊不渲。
 */
export function TagList({ tags }: TagListIn) {
  if (tags.length === 0) {
    return null
  }
  const out = []
  for (const g of tags) {
    out.push(<Tag key={g.text} variant={g.variant}>{g.text}</Tag>)
  }
  return <span className={cssOf(css.tagList)}>{out}</span>
}
