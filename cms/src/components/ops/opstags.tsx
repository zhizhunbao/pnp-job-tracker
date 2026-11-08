'use client'
/**
 * ops 域的小件:一排状态胶囊。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { Tag } from '@/components/tag'
import type { OpsTagsIn } from './types'
import css from './ops.module.css'

/**
 * 一排胶囊。
 *
 * @param props 胶囊。
 * @returns 一排胶囊。
 */
export function OpsTags({ tags }: OpsTagsIn) {
  const items = []
  for (const t of tags) {
    items.push(<Tag key={t.text} variant={t.variant}>{t.text}</Tag>)
  }
  return <span className={css.tags}>{items}</span>
}
