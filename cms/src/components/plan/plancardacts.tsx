'use client'
/**
 * plan 域的小件:手机卡的动作行。动作靠右下(2026-08-16 Frank「按钮放到右下角」):
 * 与卡片右列数字同一条竖线,手指下滑时右边一路都是「可比的数」与「可点的动作」。
 * 2026-08-28 换装批自 Decision.tsx 的手机卡 footer 槽提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { PlanCellRowIn2 } from './types'
import css from './plan.module.css'

/**
 * 渲染手机卡的动作行。
 *
 * @param props 这一行展示行。
 * @returns 一到两颗钮。
 */
export function PlanCardActs({ r }: PlanCellRowIn2) {
  return (
    <span className={css.cardActs}>
      {r.links.jobs != null && (
        <LinkButton href={r.links.jobs}
          onClick={r.acts.go}
          className={cssOf(css.cardActGo)}>
          {r.text.actGo}
        </LinkButton>
      )}
      {r.links.emp != null && (
        <LinkButton href={r.links.emp}
          onClick={r.acts.emp}
          className={cssOf(css.cardActEmp)}>
          {r.text.actEmp}
        </LinkButton>
      )}
    </span>
  )
}
