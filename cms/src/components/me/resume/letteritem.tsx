'use client'
/**
 * me 桶子桶 resume 的结构:手机清单里的一封求职信(职位名一行、公司一行、状态胶囊 + 写于一行;条与条之间一条细线)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { CompanyName } from '@/components/name'
import { Tag } from '@/components/tag'
import { TEXT_NONE } from './constants'
import { LetterTitle } from './lettertitle'
import type { LetterItemIn } from './types'
import css from './resume.module.css'

/**
 * 手机清单里的一封。
 *
 * @param props 展示行。
 * @returns 一条。
 */
export function LetterItem({ row }: LetterItemIn) {
  return (
    <div className={cssOf(css.item)}>
      <LetterTitle title={row.title} href={row.href} draft={row.draft} />
      <div className={cssOf(css.itemMeta)}>
        <CompanyName name={row.company} slug={TEXT_NONE} zh={TEXT_NONE} ko={TEXT_NONE} />
      </div>
      <div className={cssOf(css.itemLine)}>
        <Tag variant={row.tag}>{row.statusText}</Tag>
        <span className={cssOf(css.itemMeta)}>{row.wrote}</span>
      </div>
    </div>
  )
}
