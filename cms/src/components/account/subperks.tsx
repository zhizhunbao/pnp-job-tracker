'use client'
/**
 * 「Pro 包含」(2026-10-08):五条权益只出名字(Frank 10-07「不需要解释性文字」),Pro 态下面一行两档价格。
 * 词条与定价框共用一份(price.perk.*)。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { IconCheck } from '@/components/icons'
import { PRICE } from '@/components/pricing'
import { PERK_KEYS } from './constants'
import type { SubPerksIn } from './types'
import css from './account.module.css'

/**
 * 渲染「Pro 包含」。
 *
 * @param props 取词函数与是不是 Pro。
 * @returns 段标题 + 五条 + 价格一行。
 */
export function SubPerks({ t, pro }: SubPerksIn) {
  const rows = []
  for (const k of PERK_KEYS) {
    rows.push(<div key={k} className={css.subPerk}><span className={css.subCheck}><IconCheck /></span>{t(k)}</div>)
  }
  return (
    <div className={css.subSection}>
      <div className={css.secTitle}>{t('price.incl')}</div>
      <div className={css.subPerks}>{rows}</div>
      {pro && <div className={css.subPrice}>{t('sub.price', { a: PRICE.p30, b: PRICE.p90 })}</div>}
    </div>
  )
}
