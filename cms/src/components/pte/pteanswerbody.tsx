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
import { KIND_SECONDARY, NOTICE_INFO, PHASE_ANSWERING, PHASE_CHECKED, T_WFD, TYPED_ROWS } from './constants'
import { clockOf, isTextShown, origBoxClsOf, wordCountOf } from './functions'
import { PteDiff } from './ptediff'
import { PtePlayer } from './pteplayer'
import { PteRecBar } from './pterecbar'
import { PteText } from './ptetext'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡体。
 *
 * @param props 同答题卡。
 * @returns 该段该型的块。
 */
export function PteAnswerBody({ t, q, type, a, tiers, onHoverWord }: PteAnswerPartIn) {
  const wfd = q.type === T_WFD
  const answering = a.phase === PHASE_ANSWERING
  const checked = a.phase === PHASE_CHECKED
  const showText = isTextShown({ audio: type.audio, textShown: a.textShown, phase: a.phase, wfd })
  return (
    <>
      {type.audio && checked === false && (
        <PtePlayer label={t('pte.audio')} src={q.audioUrl} onEnd={a.onAudioEnd}
          speaking={a.playing} onSpeak={a.onPlay} disabled={a.canPlay === false} />
      )}
      {showText && <PteText text={q.text} tiers={tiers} onHoverWord={onHoverWord} qid={q.qid} />}
      {type.audio === false && wfd === false && (
        <PtePlayer label={t('pte.tts')} src={q.audioUrl} onEnd={a.onAudioEnd}
          speaking={a.playing} onSpeak={a.onPlay} disabled={a.canPlay === false} />
      )}
      {type.audio && showText === false && answering && (
        <div className={css.revealRow}>
          <Button kind={KIND_SECONDARY} sm onClick={a.onShowText}>{t('pte.showText')}</Button>
        </div>
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
      {wfd === false && (
        <PteRecBar t={t} recording={a.recording} seconds={a.recSeconds} checked={checked} onMic={a.onMic}
          onRedo={a.onRedo} />
      )}
      {a.micDenied && <Notice kind={NOTICE_INFO} className={css.notice}>{t('pte.noMic')}</Notice>}
      {checked && wfd && <PteDiff t={t} typed={a.typed} text={q.text} />}
      {checked && q.answer != null && a.answerShown === false && (
        <div className={css.revealRow}>
          <Button kind={KIND_SECONDARY} sm onClick={a.onShowAnswer}>{t('pte.showAnswer')}</Button>
        </div>
      )}
      {checked && q.answer != null && a.answerShown && (
        <>
          <div className={css.label}>{t('pte.answer')}</div>
          <div className={origBoxClsOf()}>{q.answer}</div>
        </>
      )}
      {checked && a.recUrl != null && (
        <>
          <div className={css.label}>{t('pte.myRec')}</div>
          <audio controls src={a.recUrl} className={css.recAudio} />
        </>
      )}
    </>
  )
}
