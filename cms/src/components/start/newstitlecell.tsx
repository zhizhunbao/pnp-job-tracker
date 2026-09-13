'use client'
/**
 * 域内小件:政策动态表标题格 —— 官方原题主文案落详情页 + 中文标题灰注(双行形照 CityNameCell;
 * 2026-09-12 Frank「政策动态改成之前的 table 不需要图片」)。
 *
 * @author Frank
 * @time 2026-09-13 00:20:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { NewsCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染标题格。
 *
 * @param r 一条。
 * @returns 标题链接加灰注。
 */
export function NewsTitleCell(r: NewsCellRow) {
  return (
    <div>
      <LinkButton href={r.href} className={cssOf(css.occLink)}>{r.name}</LinkButton>
      {r.note !== TEXT_NONE && <span className={css.note}>{r.note}</span>}
    </div>
  )
}
