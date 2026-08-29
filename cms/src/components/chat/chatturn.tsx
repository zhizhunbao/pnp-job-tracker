'use client'
/**
 * 一轮的渲染:提问气泡 + 轨迹折叠条 + 「恰好一种」结果(引导 / 故障 / 答复 /
 * 半截流式 / 等待行)。🔴 轨迹**只有这一处**(等待期和落地后同一个受控 details,
 * 不是两套渲染 —— 两套之间隔着组件换型,换型就有换不干净的余地;Frank 实测:
 * 答复落地了,十行轨迹还占着面板一半)。2026-08-04 默认从「等待时展开」改成
 * **一直收起**(取样结论,顺序原来是反的):等待中一行「正在查询… 8s」;
 * 落地后一行「已核查 … 11s ⌄」,点开才看细节。等待态且还没有一条轨迹时才出
 * 等待行 —— 有轨迹的话折叠条自己带三点和秒数,两个都出是同一件事说两遍。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { SECS_DOT, SECS_SUFFIX } from './constants'
import { makeStepsOnToggle } from './functions'
import { ChatActivity } from './chatactivity'
import { ChatTurnBody } from './chatturnbody'
import type { ChatTurnIn } from './types'
import css from './chat.module.css'

/**
 * 一轮。
 *
 * @param props 面板、这一轮与它的序号(逐格注释见下方内联形状)。
 * @returns 一轮的整块。
 */
export function ChatTurn({ p, turn, i }: ChatTurnIn) {
  const live = p.busy && turn.a == null && turn.guide === '' && turn.fault === ''
  const isLast = i === p.turns.length - 1
  let stepsOpen = false
  if (turn.stepsOpen != null) {
    stepsOpen = turn.stepsOpen
  }
  let secsShown = turn.secs
  if (live) {
    secsShown = p.secs
  }
  return (
    <div className={css.cbTurn}>
      <div className={css.cbQ}>{turn.q}</div>
      {turn.steps.length > 0 && (
        <details className={css.cbSteps} open={stepsOpen} onToggle={makeStepsOnToggle({ p, i })}>
          <summary>
            {live && <span className={css.cbDots} aria-hidden><i /><i /><i /></span>}
            {live === false && <span className={css.cbCar} aria-hidden />}
            <span className={css.cbMin0}>{p.t('chat.activity')}</span>
            <span className={css.cbSecs}>{SECS_DOT}{secsShown}{SECS_SUFFIX}</span>
          </summary>
          <ChatActivity p={p} turn={turn} live={live} />
        </details>
      )}
      <ChatTurnBody p={p} turn={turn} i={i} isLast={isLast} />
    </div>
  )
}
