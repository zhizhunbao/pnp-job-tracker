'use client'
/**
 * 域内小件:头条右列的小卡清单(恒显其余 4 条)。第二条起在上方加一道分隔线。
 * 2026-08-27 换装批自 News.tsx 的 FeaturedGrid 拆出成文件。
 * 2026-10-10 Frank「这部分也加呢」:英文标题下加中文标题灰字(中文界面才出,韩文暂不出)。
 * 2026-09-30 Frank「新开一个选项卡,不要在当前的选项卡」:点开新闻详情一律新选项卡(LinkButton 带 target 自动补 rel)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import { newsHrefOf, rowTitleNoteOf, shortDateOf, sideItemClsOf } from './functions'
import { ImpBadge } from './impbadge'
import { RegionTag } from './regiontag'
import type { HeroSideListIn } from './types'
import css from './news.module.css'

/**
 * 渲染头条右列。
 *
 * @param props 取词函数、界面语言与右列条目。
 * @returns 小标题 + 小卡清单。
 */
export function HeroSideList({ t, lang, items }: HeroSideListIn) {
  const rows = []
  for (let i = 0; i < items.length; i += 1) {
    const s = items[i]
    if (s != null) {
      const note = rowTitleNoteOf({ lang, hero: s })
      rows.push(
        <LinkButton key={s.slug}
          href={newsHrefOf({ slug: s.slug })}
          target={TARGET_BLANK}
          className={sideItemClsOf({ first: i === 0 })}>
          <div className={css.sideTitle}>{s.title}</div>
          {note !== TEXT_NONE && <div className={css.sideTitleNote}>{note}</div>}
          <div className={css.sideMeta}>
            <ImpBadge t={t} lang={lang} importance={s.importance} note={s.importanceNote} />
            <RegionTag t={t} region={s.region} />
            <span className={css.num}>{shortDateOf({ date: s.date })}</span>
          </div>
        </LinkButton>,
      )
    }
  }
  return (
    <div className={css.side}>
      <h3 className={css.sideH}>{t('news.topTitle')}</h3>
      {rows}
    </div>
  )
}
