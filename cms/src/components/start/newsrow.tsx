'use client'
/**
 * 域内小件:政策动态的一条(日期 + 发布方标签 + 标题 + 中文界面下的译名灰注)。
 * 第一条不出上分隔线 —— 白卡自己有描边。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { Tag } from '@/components/tag'
import { TEXT_NONE } from './constants'
import { newsRowClsOf } from './functions'
import type { NewsRowIn } from './types'
import css from './start.module.css'

/**
 * 渲染政策动态的一条。
 *
 * @param props 这一条的展示行与是不是第一条。
 * @returns 整行链接。
 */
export function NewsRow({ row, first }: NewsRowIn) {
  return (
    <LinkButton href={row.href} className={newsRowClsOf({ first })}>
      <span className={css.newsDate}>{row.date}</span>
      <Tag>{row.tag}</Tag>
      <span className={css.newsTitleWrap}>
        <span className={css.ellipsis}>{row.title}</span>
        {row.titleZh !== TEXT_NONE && <span className={css.newsZh}>{row.titleZh}</span>}
      </span>
    </LinkButton>
  )
}
