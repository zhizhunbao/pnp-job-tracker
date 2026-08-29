'use client'
/**
 * 域内小件:时间线的一天一组(日期分隔行 + 当天的条目)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { commentCountOf } from './functions'
import { NewsRowCard } from './newsrowcard'
import type { NewsDayGroupRowsIn } from './types'
import css from './news.module.css'

/**
 * 渲染一天一组。
 *
 * @param props 取词函数、界面语言、这一组与评论计数表。
 * @returns 日期分隔行 + 当天条目。
 */
export function NewsDayGroupRows({ t, lang, group, cmtCounts }: NewsDayGroupRowsIn) {
  const rows = []
  for (const item of group.items) {
    rows.push(
      <NewsRowCard key={item.slug}
        t={t}
        lang={lang}
        item={item}
        comments={commentCountOf({ counts: cmtCounts, slug: item.slug })} />,
    )
  }
  return (
    <div>
      <div className={css.day}>
        {group.day}<span className={css.dayLine} />
      </div>
      {rows}
    </div>
  )
}
