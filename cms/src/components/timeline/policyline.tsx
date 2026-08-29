'use client'
/**
 * 域内小件:事件卡首行的政策公告那一半 —— 重要徽标 + 站内详情页链接。
 * 政策公告是三路里唯一在站内有详情页的一路,所以标题做成链接;
 * 重要徽标与 /news 列表同一条线(只给满分挂)。
 * 2026-08-28 换装批自 Timeline.tsx 的事件行三目提出成具名小件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { TAG_IMP } from './constants'
import { isImportant, newsHrefOf } from './functions'
import type { PolicyLineIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染政策公告那一半。
 *
 * @param props 取词函数与这一条事件。
 * @returns 徽标与站内链接。
 */
export function PolicyLine({ t, row }: PolicyLineIn) {
  return (
    <>
      {isImportant({ importance: row.importance }) && <Tag variant={TAG_IMP}>{t('tl.imp')}</Tag>}
      <LinkButton href={newsHrefOf({ slug: row.slug })} className={cssOf(css.newsLink)}>{row.title}</LinkButton>
    </>
  )
}
