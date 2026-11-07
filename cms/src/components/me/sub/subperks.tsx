'use client'
/**
 * me 桶子桶 sub 的结构:「Pro 包含」一段(2026-10-08 立):五条权益只出名字(Frank 10-07「不需要解释性文字」),
 * 词条与定价框共用一份(price.perk.*);Pro 态下面一行两档价格(免费态价格在「当前方案」里)。
 * 2026-11-07 照 Fluent 效果图:网页端两列、手机一列,条目不再加粗,外圈描边框撤(分区卡本身就是框)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import { PRICE } from '@/components/pricing'
import { PERK_KEYS } from './constants'
import { SubSec } from './subsec'
import type { SubPartIn } from './types'
import css from './sub.module.css'

/**
 * 「Pro 包含」。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 一张分区卡。
 */
export function SubPerks({ s, t }: SubPartIn) {
  const rows = []
  for (const k of PERK_KEYS) {
    rows.push(
      <div key={k} className={cssOf(css.perk)}><span className={cssOf(css.check)}><IconCheck /></span>{t(k)}</div>,
    )
  }
  return (
    <SubSec title={t('price.incl')}>
      <div className={cssOf(css.perks)}>{rows}</div>
      {s.pro && <div className={cssOf(css.price)}>{t('sub.price', { a: PRICE.p30, b: PRICE.p90 })}</div>}
    </SubSec>
  )
}
