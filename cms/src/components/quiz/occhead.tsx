'use client'
/**
 * quiz 域的结构:选职业弹层的标题行(题干 + 右上角关闭钮)。只有弹层形态才出 ——
 * 铺在答题卡里的那条路由,题干由页面门自己给(职业是第一题,就该和别的题长一个样,
 * 而不是另开一层;2026-07-31 Frank「选职业和其他问题都放到一个方式」)。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { ARIA_CLOSE, BTN_TYPE, MARK_CLOSE, PLAIN_BTN_KIND } from './constants'
import { QuizTitle } from './quiztitle'
import type { OccHeadIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染弹层标题行。
 *
 * @param props 取词函数与关闭出口。
 * @returns 标题行。
 */
export function OccHead({ t, onClose }: OccHeadIn) {
  return (
    <div className={css.occHead}>
      <QuizTitle>{t('quiz.q2')}</QuizTitle>
      <Button kind={PLAIN_BTN_KIND}
        type={BTN_TYPE}
        onClick={onClose}
        ariaLabel={ARIA_CLOSE}
        className={cssOf(css.closeBtn)}>
        {MARK_CLOSE}
      </Button>
    </div>
  )
}
