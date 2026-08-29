'use client'
/**
 * quiz 域的结构:每一题的底部动作条。上一题恒在左下、下一题恒在右下,中间那句灰字
 * 只填空隙 —— **不许把按钮挤走**(先前灰字自带 marginRight:auto,和上一题的 auto
 * 平分空隙,有提示的那一题按钮就往中间挪了 250px)。四种题(选职业/单选/多选/数字)
 * 都调这一把:「下一题位置还不统一」的病根是各页各写一遍按钮。
 * 收卷钮的位置:2026-08-16 Frank「这个调换一下位置」——「下一题」在内、「完成」收尾在
 * 最右;答题主动线一路向右点到底,收卷是终点动作,摆在动作条末端。
 * 2026-08-28 换装批自 QuizUI.tsx(本文件的前身,git mv 保历史)整体重写成小写件形制:
 * 两枚内联样式钮迁 quiz.module.css 的类并改经 button 族(裸 <button> 禁令),
 * 其余五件各自拆成一件一文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_TYPE, PLAIN_BTN_KIND, PRIMARY_BTN_KIND, TEXT_NONE } from './constants'
import { barCls, hintCls, nextClsOf } from './functions'
import type { QuizNavIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染一题的动作条。
 *
 * @param props 两颗钮的字与出口、置灰档、中间那句灰字、旁路收卷钮。
 * @returns 动作条。
 */
export function QuizNav({
  prevLabel, nextLabel, onPrev, onNext, nextDisabled = false, hint, doneLabel, onDone,
}: QuizNavIn) {
  return (
    <div className={barCls()}>
      {onPrev != null && (
        <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} onClick={onPrev} className={cssOf(css.prevBtn)}>
          {prevLabel}
        </Button>
      )}
      <span className={hintCls()}>{hint}</span>
      <Button kind={PRIMARY_BTN_KIND}
        disabled={nextDisabled}
        onClick={onNext}
        className={nextClsOf({ on: nextDisabled })}>
        {nextLabel}
      </Button>
      {doneLabel != null && doneLabel !== TEXT_NONE && onDone != null && (
        <Button kind={PLAIN_BTN_KIND} type={BTN_TYPE} onClick={onDone} className={cssOf(css.prevBtn)}>
          {doneLabel}
        </Button>
      )}
    </div>
  )
}
