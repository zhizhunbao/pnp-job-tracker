'use client'
/**
 * ops 域的小件:一排状态胶囊。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { useLang } from '@/components/i18n'
import { Tag } from '@/components/tag'
import { sayOf } from './functions'
import type { OpsTagsIn } from './types'
import css from './ops.module.css'

/**
 * 一排胶囊。
 *
 * @param props 胶囊。
 * @returns 一排胶囊。
 */
export function OpsTags({ tags }: OpsTagsIn) {
  const [, , t] = useLang()
  const items = []
  for (const tag of tags) {
    const text = sayOf({ t, s: tag.text })
    items.push(<Tag key={text} variant={tag.variant}>{text}</Tag>)
  }
  return <span className={css.tags}>{items}</span>
}
