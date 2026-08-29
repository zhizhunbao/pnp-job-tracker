'use client'
/**
 * 域内小件:政策动态(接在抽选表下面,与它同处 S5 一区 —— S4 拆两区后色带让位,回默认底)。
 * 标题旁挂条数下拉与「全部动态」外链。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { URL_NEWS } from './constants'
import { NewsRow } from './newsrow'
import { TopN } from './topn'
import type { NewsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染政策动态区。
 *
 * @param props 取词函数、已切片的展示行、条数档与总条数。
 * @returns 标题行 + 白卡列表。
 */
export function NewsSection({ t, rows, newsN, onNewsN, total }: NewsSectionIn) {
  const items = []
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]
    if (r != null) {
      items.push(<NewsRow key={r.key} row={r} first={i === 0} />)
    }
  }
  return (
    <div className={css.newsWrap}>
      <h3 className={css.newsH3}>
        {t('home.policy')}
        <span className={css.headRight}>
          <TopN v={newsN} on={onNewsN} max={total} />
          <LinkButton href={URL_NEWS} className={cssOf(css.moreLink)}>{t('home.pulse.all')}</LinkButton>
        </span>
      </h3>
      <div className={css.panel}>{items}</div>
    </div>
  )
}
