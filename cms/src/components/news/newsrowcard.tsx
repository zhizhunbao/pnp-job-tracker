'use client'
/**
 * 域内小件:时间线里的一条(博客式条目 —— 图 + 标签 + 徽标 + 日期 + 标题 + 摘要 +
 * 评论数 + 阅读全文)。行定高 128(Frank「卡片的宽度和高度也应该是固定的」)。
 * 2026-09-30 摘要位改同头条大卡:中 / 韩界面有 AI 速读就显示速读(带「AI 速读」小标),没有退官方摘要(Frank「这个下面也显示 AI 速读」)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { CMT_PREFIX, COMMENTS_ON, REGION_QC, TEXT_NONE } from './constants'
import { heroAiSummaryOf, heroSummaryOf, newsHrefOf, rowClsOf } from './functions'
import { ImpBadge } from './impbadge'
import { ListTile } from './listtile'
import { RegionTag } from './regiontag'
import type { NewsRowCardIn } from './types'
import css from './news.module.css'

/**
 * 渲染时间线里的一条。
 *
 * @param props 取词函数、界面语言、这一条与它的评论数。
 * @returns 整卡链接。
 */
export function NewsRowCard({ t, lang, item, comments }: NewsRowCardIn) {
  const summary = heroSummaryOf({ lang, hero: item })
  const ai = heroAiSummaryOf({ lang, hero: item })
  return (
    <LinkButton href={newsHrefOf({ slug: item.slug })} className={rowClsOf()}>
      <ListTile region={item.region} />
      <div className={css.rowBody}>
        <div className={css.rowMeta}>
          <RegionTag t={t} region={item.region} />
          <ImpBadge t={t} lang={lang} importance={item.importance} note={item.importanceNote} />
          <span className={css.num}>{item.date}</span>
          {item.region === REGION_QC && <span className={css.qc}>{t('news.qcNote')}</span>}
        </div>
        <div className={css.rowTitle}>{item.title}</div>
        {summary !== TEXT_NONE && (
          <div className={css.rowExcerpt}>
            {ai !== TEXT_NONE && <span className={css.aiTag}>{t('news.aiSum')}</span>}
            {summary}
          </div>
        )}
        <div className={css.rowFoot}>
          {COMMENTS_ON && <span>{CMT_PREFIX}{t('news.cmt.n', { n: comments })}</span>}
          <span className={css.readMore}>{t('news.read')}</span>
        </div>
      </div>
    </LinkButton>
  )
}
