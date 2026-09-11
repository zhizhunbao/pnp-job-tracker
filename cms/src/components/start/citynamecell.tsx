'use client'
/**
 * 域内小件:城市段四张表共用的城市名格(2026-09-11 重设计批,设计稿 docs/design/把脉页城市段-20260911.md)。
 * 形照职业榜 OccNameCell:人话名主文案 + 英文名省码灰注,点开落职位板按城市筛(带来源标记 + city-open 埋点);
 * href 为空时只出文本 —— 社区对不上单一城市的行落不了板,不给假链接。
 *
 * @author Frank
 * @time 2026-09-11 16:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { CityLinkRow } from './types'
import css from './start.module.css'

/**
 * 渲染城市名格。
 *
 * @param r 这一行(名字四格)。
 * @returns 名字链接或文本,加灰注。
 */
export function CityNameCell(r: CityLinkRow) {
  return (
    <div>
      {r.href !== TEXT_NONE && (
        <LinkButton href={r.href} onClick={r.onOpen} className={cssOf(css.occLink)}>{r.name}</LinkButton>
      )}
      {r.href === TEXT_NONE && <span>{r.name}</span>}
      {r.note !== TEXT_NONE && <span className={css.note}>{r.note}</span>}
    </div>
  )
}
