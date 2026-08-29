'use client'
/**
 * plan 域的结构:问卷弹框右上角的工具排(重置 + 关闭)。重置沿用 IconRefresh 同款
 * (2026-08-12 Frank「改成图标和右上角对齐」)。
 * 2026-08-28 换装批自 Decision.tsx 的弹框工具排提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconRefresh } from '@/components/icons'
import { BTN_TYPE, CLOSE_ARIA, CLOSE_MARK, PLAIN_BTN_KIND } from './constants'
import type { QuizToolsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染弹框工具排。
 *
 * @param props 决策页整机。
 * @returns 工具排。
 */
export function QuizTools({ d }: QuizToolsIn) {
  return (
    <div className={css.quizTools}>
      <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} className={cssOf(css.iconBtn)}
        title={d.t('plan.reset')} ariaLabel={d.t('plan.reset')} onClick={d.acts.resetQuiz}>
        <IconRefresh />
      </Button>
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.iconBtn)}
        ariaLabel={CLOSE_ARIA} onClick={d.acts.closeQuiz}>
        {CLOSE_MARK}
      </Button>
    </div>
  )
}
