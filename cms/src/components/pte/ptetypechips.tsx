'use client'
/**
 * 域内小件:题型胶囊排(一页一型的真链接,当前型亮起;人话名主文案,缩写不上胶囊)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { listHrefOf, typeNameOf } from './functions'
import type { PteTypeChipsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染题型胶囊排。
 *
 * @param props 题型维度、当前题型与界面语言。
 * @returns 一排胶囊。
 */
export function PteTypeChips({ types, type, lang }: PteTypeChipsIn) {
  const chips = []
  for (const x of types) {
    chips.push(
      <Chip key={x.code} href={listHrefOf({ type: x.code })} active={x.code === type}>
        {typeNameOf({ type: x, lang })}
      </Chip>,
    )
  }
  return <div className={css.chips}>{chips}</div>
}
