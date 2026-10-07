'use client'
/**
 * card 域装一列行的白卡(2026-10-05 访客第 2 题照掌上高考立 —— 热门那一列、只装一个专业的专业类合成的那一列):
 * 没有头行,只给左右内衬与卡间距;叠在全局 .card 白卡壳上(白卡壳全站一份)。行与行之间的细线归行自己(chip 桶 ChipList)。
 *
 * @author Frank
 * @time 2026-10-05 10:40:00
 */
import { cssOf } from '@/components/css'
import { CARD_CLS } from './constants'
import type { ListCardIn } from './types'
import css from './card.module.css'

/**
 * 装一列行的白卡。
 *
 * @param props 卡里的内容(见 ListCardIn)。
 * @returns 白卡。
 */
export function ListCard({ children }: ListCardIn) {
  return <div className={`${CARD_CLS} ${cssOf(css.fold)}`}>{children}</div>
}
