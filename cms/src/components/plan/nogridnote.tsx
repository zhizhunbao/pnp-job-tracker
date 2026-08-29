'use client'
/**
 * plan 域的结构:该省没有官方分值表时那句说明。两句话意思相反,分开写 ——
 * 「官方按 EOI 酌情选人、不公布分值表」(带原句出处)与「本站还没收录」。
 * 铁律见 CLAUDE.md「官方不公布是需要举证的断言」:举证 = 一个 URL + 一句官方原句;
 * 举不出来只能落「本站未收录」。搞反 = 拿假前提教用户防中介。
 * 2026-08-28 换装批自 Decision.tsx 的 noGridNote 渲染口提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { NO_POINTS_GRID, TARGET_BLANK, TEXT_SPACE } from './constants'
import { provDispOf } from './functions'
import type { NoGridNoteIn } from './types'
import css from './plan.module.css'

/**
 * 渲染该省没有分值表时那句说明。
 *
 * @param props 决策页整机与省码。
 * @returns 说明(官方不打分那句带出处链接)。
 */
export function NoGridNote({ d, province }: NoGridNoteIn) {
  const prov = provDispOf({ t: d.t, code: province })
  const evidence = NO_POINTS_GRID[province]
  if (evidence == null) {
    return <>{d.t('dp.noGridSite', { prov })}</>
  }
  return (
    <>
      {d.t('dp.noGridOfficial', { prov })}
      {TEXT_SPACE}
      <LinkButton href={evidence.url} target={TARGET_BLANK} className={cssOf(css.srcLink)}>
        {d.t('dp.src')}
      </LinkButton>
    </>
  )
}
