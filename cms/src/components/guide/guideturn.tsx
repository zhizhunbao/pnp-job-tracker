'use client'
/**
 * 一轮:右侧提问气泡 + 向导那行字(等待时三点)+ 卡(打开 X / 留个邮箱)。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { FAULT, TEXT_NONE } from './constants'
import { replyTextOf } from './functions'
import { GuideCards } from './guidecards'
import type { GuideTurnIn } from './types'
import css from './guide.module.css'

/**
 * 一轮。
 *
 * @param props 面板、这一轮与轮位。
 * @returns 一轮整块。
 */
export function GuideTurn({ p, turn, i }: GuideTurnIn) {
  const waiting = turn.reply == null && turn.fault === FAULT.none
  const text = replyTextOf({ t: p.t, turn })
  return (
    <div className={css.cbTurn}>
      <div className={css.cbQ}>{turn.q}</div>
      {waiting && (
        <div className={css.cbWait}>
          <span className={css.cbDots} aria-hidden><i /><i /><i /></span>
          <span className={css.cbMin0}>{p.t('chat.waiting')}</span>
        </div>
      )}
      {text !== TEXT_NONE && <div className={css.cbMsg}><p className={css.cbP}>{text}</p></div>}
      <GuideCards p={p} turn={turn} i={i} />
    </div>
  )
}
