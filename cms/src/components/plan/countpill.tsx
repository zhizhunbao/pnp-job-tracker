'use client'
/**
 * plan 域的小件:计数胶囊(已答 n/N)。答满染浅蓝底 + 品牌蓝字,有欠账用灰底灰字。
 * 摘要卡头、带岗态判定卡②、问卷弹框头共用同一形。
 * 2026-08-28 换装批自 Decision.tsx 的 basicPill / countPills 收拢成一件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import type { CountPillIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一枚计数胶囊。
 *
 * @param props 取词函数与两个数。
 * @returns 计数胶囊。
 */
export function CountPill({ t, done, total }: CountPillIn) {
  let tone = css.pillTodo
  if (done === total) {
    tone = css.pillDone
  }
  return (
    <span className={cssOf(css.pill) + CLS_SEP + cssOf(tone)}>
      {t('dp.basicCount', { done, total })}
    </span>
  )
}
