'use client'
/**
 * 域内小件:政策动态区(2026-09-12 Frank「全部动态 的 table 也 加过来 之前给删了」:2026-09-04 重构撤掉的段复位;
 * 2026-09-12 Frank「政策动态改成之前的 table 不需要图片」:表形 = 日期 / 地区 / 标题双行,不带图)。
 * 住抽选表下面、「全部动态」链接上面;只出最新 NEWS_LIMIT 条,全量与筛选在 /news。
 *
 * @author Frank
 * @time 2026-09-12 23:58:00
 */
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { ID_NEWS } from './constants'
import { newsColsOf, newsRowKeyOf, toNewsCellRows } from './functions'
import { Band } from './band'
import { Sec } from './sec'
import type { NewsCellRow, NewsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染政策动态区。
 *
 * @param props 取词函数、语言、更新时刻与新闻条。
 * @returns 一条色带;没有新闻时 null。
 */
export function NewsSection({ t, lang, updatedAt, news }: NewsSectionIn) {
  if (news.length === 0) {
    return null
  }
  const rows = toNewsCellRows({ rows: news, lang })
  return (
    <Band id={ID_NEWS}>
      <Sec title={t('home.policy')} right={<Updated iso={updatedAt} t={t} />}>
        <div className={css.panel}>
          <Table<NewsCellRow> rows={rows} cols={newsColsOf({ t })} rowKey={newsRowKeyOf} />
        </div>
      </Sec>
    </Band>
  )
}
