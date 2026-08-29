'use client'
/**
 * card 域的统一升级卡(G3 起;规范 docs/design/G3-简历对照JD-20260803.md §1,
 * Frank 八轮收敛定稿):单行淡黄底 + 琥珀短句(零符号、超长删词不折行)+ 蓝钮「解锁 Pro」。
 * 全站升级入口一律用它,不再自造。
 * ⚠️ 与 Card 没有关系,名字是历史遗留(2026-08-17 Frank 问过):Card 是白卡壳,
 * 这是琥珀色升级 CTA,不用同一套皮。
 * 2026-08-24 自 ui/Card.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import type { ProCardIn } from './types'
import css from './card.module.css'

/**
 * 升级卡;overlay = 悬浮在打码区正中(LockedRows 内部用)。
 *
 * @param props 短句/钮文字/回调/悬浮开关。
 * @returns 升级卡。
 */
export function ProCard({ text, cta, onClick, overlay = false }: ProCardIn) {
  let cls = css.proCard
  if (overlay) {
    cls = `${css.proCard} ${css.overlay}`
  }
  return (
    <div className={cls}>
      <span className={css.proText}>{text}</span>
      <Button kind={PLAIN_BTN_KIND} className={css.proBtn} onClick={onClick}>{cta}</Button>
    </div>
  )
}
