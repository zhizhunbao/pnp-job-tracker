'use client'
/**
 * 等回复时的「正在输入」:三个点依次亮(Fluent 2 Wait UX 的 Morse code:模仿聊天里的打字点);
 * 等了超过三秒加一句「还在想」(同页 Timing thresholds:超三秒要给一句文字让人安心)。
 * 系统设了「减少动态效果」时三个点不动(样式里管)。读屏听到的是「助手正在输入」那句,三个点不念。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { cssOf } from '@/components/css'
import type { AssistantTypingIn } from './types'
import css from './assistant.module.css'

/**
 * 「正在输入」一行。
 *
 * @param props 是不是等了超过三秒与取词函数。
 * @returns 三个点,外加可能有的一句「还在想」。
 */
export function AssistantTyping({ slow, t }: AssistantTypingIn) {
  return (
    <div className={`${cssOf(css.bubble)} ${cssOf(css.bot)} ${cssOf(css.typing)}`}>
      <span className={cssOf(css.dots)} aria-hidden><i /><i /><i /></span>
      <span className={cssOf(css.sr)}>{t('asst.typing')}</span>
      {slow && <span className={cssOf(css.slow)}>{t('asst.slow')}</span>}
    </div>
  )
}
