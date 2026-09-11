'use client'
/**
 * 域内小件:城市搜索(2026-09-11 重设计批)。段首一个输入框,全量 2,600+ 城本地过滤
 * (数据就是段里那份全量榜,不打接口),建议行照名字格的形(译名主文案 + 英文省码在招灰注),
 * 点建议落职位板按城市筛 —— 旧 400 卡 40 页「渥太华在第 2 页」的翻页寻城从此不存在。
 *
 * @author Frank
 * @time 2026-09-11 16:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CITY_INPUT_TYPE, CITY_KIND_SEARCH, TEXT_NONE } from './constants'
import { cityMatchesOf, makeCityTrack } from './functions'
import { useCityQuery } from './hooks'
import type { CitySearchIn } from './types'
import css from './start.module.css'

/**
 * 渲染城市搜索(输入框 + 命中建议行)。
 *
 * @param props 取词函数、语言与城市全量榜。
 * @returns 搜索块。
 */
export function CitySearch({ t, lang, rows }: CitySearchIn) {
  const s = useCityQuery()
  const onOpen = makeCityTrack(CITY_KIND_SEARCH)
  const items = []
  for (const m of cityMatchesOf({ rows, q: s.q, lang, t })) {
    items.push(
      <div key={m.key} className={css.citySearchItem}>
        <LinkButton href={m.href} onClick={onOpen} className={cssOf(css.occLink)}>{m.name}</LinkButton>
        <span className={css.note}>{m.note}</span>
        {m.pilotText !== TEXT_NONE && <span className={css.momUp}>{m.pilotText}</span>}
      </div>,
    )
  }
  return (
    <div className={css.citySearch}>
      <input type={CITY_INPUT_TYPE}
        className={css.citySearchInput}
        placeholder={t('pulse.city.search')}
        value={s.q}
        onChange={s.onChange} />
      {s.q.trim() !== TEXT_NONE && items.length > 0 && <div className={css.citySearchList}>{items}</div>}
    </div>
  )
}
