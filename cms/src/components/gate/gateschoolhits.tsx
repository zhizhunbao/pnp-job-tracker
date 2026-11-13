'use client'
/**
 * gate 域的结构:教育经历一段里学校格下面搜到的几所学校(2026-11-12):一所一行,校名黑字、下面灰字
 * (中文界面的译名、省码、公立或私立);点一行把校名、所在省、公立私立填进这一段。没搜到就什么都不出(学校照常手填)。
 *
 * @author Frank
 * @time 2026-11-12 19:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { EDU_BTN_KIND } from './constants'
import { schoolSubOf } from './school'
import type { GateSchoolHitsIn } from './types'
import css from './gate.module.css'

/**
 * 搜到的几所学校。
 *
 * @param props 搜学校整机与取词。
 * @returns 一列学校;没搜到 null。
 */
export function GateSchoolHits({ sch, t }: GateSchoolHitsIn) {
  if (sch.hits.length === 0) {
    return null
  }
  const lines = []
  for (const hit of sch.hits) {
    lines.push(
      <Button key={hit.name + hit.prov} kind={EDU_BTN_KIND} className={cssOf(css.schoolHit)} onClick={sch.pickOf(hit)}>
        <span>{hit.name}</span>
        <span className={cssOf(css.schoolSub)}>{schoolSubOf({ hit, lang: sch.lang, t })}</span>
      </Button>,
    )
  }
  return <div className={cssOf(css.schoolHits)}>{lines}</div>
}
