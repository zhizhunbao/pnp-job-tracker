'use client'
/**
 * verdict 域的结构:「你的条件」卡右上角那一枚钮。有档案 = 弱操作「改答案」,
 * 没档案 = 主行动「去建档」—— 同一格位置两种分量,靠钮的强弱说清下一步是什么。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的卡②动作位三目提出成件
 * (裸 <button> 改经 button 族,两款配色逐格迁 verdict.module.css)。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import type { AnswerActionIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染「你的条件」卡的动作钮。
 *
 * @param props 取词函数、有没有档案与两只手柄(逐格注释见 AnswerActionIn)。
 * @returns 「改答案」或「去建档」。
 */
export function AnswerAction({ t, hasProfile, onEdit, onBuild }: AnswerActionIn) {
  if (hasProfile) {
    return (
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.ghostBtn)} onClick={onEdit}>
        {t('tv.edit')}
      </Button>
    )
  }
  return (
    <Button kind={PLAIN_BTN_KIND} className={cssOf(css.primaryBtn)} onClick={onBuild}>
      {t('tv.build')}
    </Button>
  )
}
