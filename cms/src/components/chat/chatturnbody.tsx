'use client'
/**
 * 一轮的结果体:「恰好一种」—— 引导(助手气泡 + 选项卡出口)/ 故障(低调行内一行
 * + 可重试)/ 答复(ChatAnswer + 选项卡)/ 半截流式(与定稿同渲染器)/ 等待行
 * (还没有一条轨迹时才出 —— 有轨迹的话折叠条自己带三点和秒数)。选项卡只挂
 * 最后一轮;引导轮也挂(反问之后要有可点的东西,光一句反问 + 空白 = 死胡同,
 * Frank 08-09 实撞)。
 *
 * @author Frank
 * @time 2026-08-27 03:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, SECS_SUFFIX, WARN_MARK } from './constants'
import { faultKeyOf, isRetryable, makeRetry } from './functions'
import { ChatAnswer } from './chatanswer'
import { ChatOptions } from './chatoptions'
import { ChatText } from './chattext'
import type { ChatTurnBodyIn } from './types'
import css from './chat.module.css'

/**
 * 一轮的结果体。
 *
 * @param props 面板、这一轮、序号与是否最后一轮(逐格注释见下方内联形状)。
 * @returns 结果体;还在等且已有轨迹 = null(折叠条已代表等待)。
 */
export function ChatTurnBody({ p, turn, i, isLast }: ChatTurnBodyIn) {
  if (turn.guide !== '') {
    return (
      <>
        <ChatText text={turn.guide} />
        {isLast && p.busy === false && <ChatOptions p={p} turn={turn} />}
      </>
    )
  }
  if (turn.fault !== '') {
    return (
      <div className={css.cbFault}>
        <span aria-hidden className={css.cbWarnMark}>{WARN_MARK}</span>
        <span className={css.cbMin0}>{p.t(faultKeyOf({ fault: turn.fault }))}</span>
        {isRetryable({ fault: turn.fault }) && p.busy === false && (
          <Button kind={PLAIN_BTN_KIND} className={cssOf(css.cbLink)} onClick={makeRetry({ p, turn, i })}>
            {p.t('chat.retry')}
          </Button>
        )}
      </div>
    )
  }
  if (turn.a != null) {
    return (
      <>
        <ChatAnswer a={turn.a} />
        {isLast && p.busy === false && <ChatOptions p={p} turn={turn} />}
      </>
    )
  }
  if (turn.stream !== '') {
    return <ChatText text={turn.stream} caret />
  }
  if (turn.steps.length === 0) {
    return (
      <div className={css.cbWait}>
        <span className={css.cbDots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={css.cbMin0}>{p.t('chat.waiting')}</span>
        <span className={css.cbSecs}>{p.secs}{SECS_SUFFIX}</span>
      </div>
    )
  }
  return null
}
