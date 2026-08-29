'use client'
/**
 * quiz 域的结构:选职业控件底部的动作条。
 * 动作条**永远在**(2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」):
 * 先前是「选中才出现」——按钮凭空冒出来又把布局顶一下,而且没选中时这一格是空的,
 * 用户翻到底发现无处可点。现在恒在、粘在视口底,没选中时放一句灰字说明,
 * **位置与答题页的「下一题」对齐**(那边同批也改了 sticky),整条决定线的下一步都在
 * 同一个地方。铺在答题卡里时用的就是答题壳那一件 QuizNav —— 不是照着抄的一套样式,
 * 「下一题位置不统一」的病根就是各写各的(Frank「保证所有答题页面一致」)。
 * 按钮文案也恒定:选了几个写在左边灰字里,不塞进按钮 —— 文案变宽 = 按钮跟着挪。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { LEN_ZERO, PRIMARY_BTN_KIND, TEXT_NONE } from './constants'
import { QuizNav } from './quiznav'
import type { OccActionsIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染控件底部的动作条。
 *
 * @param props 取词函数、形态档、已选码、两颗钮的字与两个出口。
 * @returns 铺在答题卡里给答题壳那条动作条;弹层形态给一颗通栏钮(一个都没选时不给)。
 */
export function OccActions({ t, inline, nocs, doneLabel, finishLabel, onNext, onFinish }: OccActionsIn) {
  const none = nocs.length === LEN_ZERO
  if (inline === true) {
    let nextLabel = t('plan.next')
    if (doneLabel != null && doneLabel !== TEXT_NONE) {
      nextLabel = doneLabel
    }
    let hint = TEXT_NONE
    if (none) {
      hint = t('quiz.pickFirst')
    }
    let done = TEXT_NONE
    if (finishLabel != null && none === false) {
      done = finishLabel
    }
    return (
      <QuizNav prevLabel={t('plan.prev')}
        nextLabel={nextLabel}
        nextDisabled={none}
        onNext={onNext}
        hint={hint}
        doneLabel={done}
        onDone={onFinish} />
    )
  }
  if (none) {
    return null
  }
  return (
    <Button kind={PRIMARY_BTN_KIND} onClick={onNext} className={cssOf(css.wideBtn)}>
      {t('quiz.nextN', { n: nocs.length })}
    </Button>
  )
}
