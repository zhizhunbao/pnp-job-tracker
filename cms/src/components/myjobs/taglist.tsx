'use client'
/**
 * 一排胶囊(2026-10-10 批 2:推荐理由 / 投递状态;tag 桶 Tag,一个信号一枚)。表格「为什么推荐」「状态」格与手机卡底行共用。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { Tag } from '@/components/tag'
import type { TagListIn } from './types'
import css from './myjobs.module.css'

/**
 * 一排胶囊。
 *
 * @param props 胶囊。
 * @returns 能折行的一排。
 */
export function TagList({ tags }: TagListIn) {
  const out = []
  for (const g of tags) {
    out.push(<Tag key={g.text} variant={g.variant}>{g.text}</Tag>)
  }
  return <span className={css.tagList}>{out}</span>
}
