'use client'
/**
 * 域内小件:S5 抽选尺子 —— 抽选表(每期配冷解读)+ 政策动态合并一区
 * (S4 拆两区后色带让位,回默认底)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:挂抽选表那一区的标题行右槽
 * (条数下拉与外链之后);政策动态是另一区,不在本批范围。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Updated } from '@/components/time'
import { ID_DRAWS, URL_PLAN_PR } from './constants'
import { toDrawCellRows, toNewsCellRows } from './functions'
import { Band } from './band'
import { DrawBoard } from './drawboard'
import { NewsSection } from './newssection'
import { Sec } from './sec'
import { TopN } from './topn'
import type { DrawsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染抽选尺子区。
 *
 * @param props 两个取词函数、界面语言、更新时刻、两份数据与两处条数档。
 * @returns 色带;两份数据都空时给 null。
 */
export function DrawsSection({
  t, tEn, lang, updatedAt, draws, news, drawsN, onDrawsN, newsN, onNewsN,
}: DrawsSectionIn) {
  if (draws.length === 0 && news.length === 0) {
    return null
  }
  const drawRows = toDrawCellRows({ rows: draws.slice(0, drawsN), t, tEn, lang })
  const newsRows = toNewsCellRows({ rows: news.slice(0, newsN), lang })
  const right = (
    <>
      <TopN v={drawsN} on={onDrawsN} max={draws.length} />
      <LinkButton href={URL_PLAN_PR} className={cssOf(css.moreLink)}>{t('plan.pr.title')}</LinkButton>
      <Updated iso={updatedAt} t={t} />
    </>
  )
  return (
    <Band id={ID_DRAWS}>
      {draws.length > 0 && (
        <Sec title={t('pulse.s5')} right={right}>
          <div className={css.panel}>
            <DrawBoard t={t} rows={drawRows} />
          </div>
        </Sec>
      )}
      {news.length > 0 && (
        <NewsSection t={t} rows={newsRows} newsN={newsN} onNewsN={onNewsN} total={news.length} />
      )}
    </Band>
  )
}
