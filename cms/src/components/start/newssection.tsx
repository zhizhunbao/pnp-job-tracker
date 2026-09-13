'use client'
/**
 * 域内小件:政策动态区(2026-09-12 Frank「全部动态 的 table 也 加过来 之前给删了」:2026-09-04 重构撤掉的段复位)。
 * 住抽选表下面、「全部动态」链接上面;只出最新 NEWS_LIMIT 条,列表形借 news 桶的日分组行
 * NewsDayGroupRows(与 /news 页同一件,通用形态单一出口),全量与筛选在 /news。
 *
 * @author Frank
 * @time 2026-09-12 23:58:00
 */
import { NewsDayGroupRows, dayGroupsOf } from '@/components/news'
import { Updated } from '@/components/time'
import { ID_NEWS } from './constants'
import { Band } from './band'
import { Sec } from './sec'
import type { NewsSectionIn } from './types'

/**
 * 渲染政策动态区。
 *
 * @param props 取词函数、语言、更新时刻、新闻卡与评论计数。
 * @returns 一条色带;没有新闻时 null。
 */
export function NewsSection({ t, lang, updatedAt, news, cmts }: NewsSectionIn) {
  if (news.length === 0) {
    return null
  }
  const groups = []
  for (const g of dayGroupsOf({ items: news })) {
    groups.push(<NewsDayGroupRows key={g.day} t={t} lang={lang} group={g} cmtCounts={cmts} />)
  }
  return (
    <Band id={ID_NEWS}>
      <Sec title={t('home.policy')} right={<Updated iso={updatedAt} t={t} />}>
        {groups}
      </Sec>
    </Band>
  )
}
