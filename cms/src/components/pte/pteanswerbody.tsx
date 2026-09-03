'use client'
/**
 * 域内小件:答题卡体 —— 按段位与题型出该出的块:题目播放件、题面、打字框(WFD)、录音件、
 * 逐词对照(WFD)、答案(ASQ)、我的录音回放、示范朗读、通知(没麦克风 / 不支持朗读)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { Notice } from '@/components/notice'
import { KIND_LINK, NOTICE_INFO, PHASE_ANSWERING, PHASE_CHECKED, T_WFD, TYPED_ROWS } from './constants'
import { clockOf, isTextShown, origBoxClsOf, recCapOf, wordCountOf } from './functions'
import { PteDiff } from './ptediff'
import { PtePlayer } from './pteplayer'
import { PteRecorder } from './pterecorder'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡体。
 *
 * @param props 同答题卡。
 * @returns 该段该型的块。
 */
export function PteAnswerBody({ t, q, type, a }: PteAnswerPartIn) {
  const wfd = q.type === T_WFD
  const answering = a.phase === PHASE_ANSWERING
  const checked = a.phase === PHASE_CHECKED
  const showText = isTextShown({ audio: type.audio, textShown: a.textShown, phase: a.phase, wfd })
  return (
    <>
      {type.audio && checked === false && (
        <PtePlayer label={t('pte.audio')} playing={a.playing} onClick={a.onPlay} disabled={a.canPlay === false} />
      )}
      {type.audio && a.canPlay === false && (
        <Notice kind={NOTICE_INFO} className={css.notice}>{t('pte.noTts')}</Notice>
      )}
      {showText && <div className={css.text}>{q.text}</div>}
      {type.audio && showText === false && answering && (
        <Button kind={KIND_LINK} onClick={a.onShowText}>{t('pte.showText')}</Button>
      )}
      {wfd && answering && (
        <>
          <textarea className={css.typed} rows={TYPED_ROWS} value={a.typed} onChange={a.onTyped} />
          <div className={css.typedFoot}>
            <span>{t('pte.words', { n: wordCountOf({ s: a.typed }) })}</span>
            <span>{t('pte.timer', { t: clockOf({ seconds: a.elapsed }) })}</span>
          </div>
        </>
      )}
      {wfd === false && a.recording && (
        <PteRecorder t={t} seconds={a.recSeconds} cap={recCapOf({ type: q.type })} onStop={a.onStopRec} />
      )}
      {a.micDenied && <Notice kind={NOTICE_INFO} className={css.notice}>{t('pte.noMic')}</Notice>}
      {checked && wfd && <PteDiff t={t} typed={a.typed} text={q.text} />}
      {checked && q.answer != null && (
        <>
          <div className={css.label}>{t('pte.answer')}</div>
          <div className={origBoxClsOf()}>{q.answer}</div>
        </>
      )}
      {checked && a.recUrl != null && (
        <>
          <div className={css.label}>{t('pte.myRec')}</div>
          <audio controls src={a.recUrl} className={css.player} />
        </>
      )}
      {checked && wfd === false && (
        <PtePlayer label={t('pte.tts')} playing={a.playing} onClick={a.onPlay} disabled={a.canPlay === false} />
      )}
      {checked && wfd === false && (
        <div className={css.verdict}>
          <span className={css.doneNote}>{t('pte.done')}</span>
        </div>
      )}
    </>
  )
}
