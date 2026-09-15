'use client'
/**
 * 域内小件:答题卡体 —— 固定件,整条动线不增不减(Frank 2026-09-04「上面的 section 只显示固定的,
 * 不要中途加一些内容」「用户感觉页面在跳」):题目播放件(听力型,提交后也在)/ 题面 + 示范朗读(朗读型)、
 * 打字框(WFD,未作答只读)、录音件(口语型,提交后中间换成我的录音回放)、通知(没麦克风)。
 * 中途冒出来的(原句 / 对照 / 答案)全在结果卡(pteresult)。阅读题(带载荷)整体走 PteReading。
 * 2026-09-03 初版按段位增减块;2026-09-04 改固定件。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Notice } from '@/components/notice'
import { NOTICE_INFO, PHASE_ANSWERING, PHASE_CHECKED, T_WFD, TYPED_ROWS } from './constants'
import { clockOf, wordCountOf } from './functions'
import { PtePlayer } from './pteplayer'
import { PteReading } from './ptereading'
import { PteRecBar } from './pterecbar'
import { PteText } from './ptetext'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡体。
 *
 * @param props 同答题卡。
 * @returns 该型的固定件。
 */
export function PteAnswerBody({ t, q, type, a, r, tiers, onHoverWord }: PteAnswerPartIn) {
  const wfd = q.type === T_WFD
  const answering = a.phase === PHASE_ANSWERING
  const checked = a.phase === PHASE_CHECKED
  if (q.extra != null) {
    return <PteReading t={t} q={q} extra={q.extra} r={r} checked={checked} tiers={tiers} onHoverWord={onHoverWord} />
  }
  return (
    <>
      {type.audio && (
        <PtePlayer label={t('pte.audio')} src={q.audioUrl} onEnd={a.onAudioEnd}
          speaking={a.playing} onSpeak={a.onPlay} disabled={a.canPlay === false} />
      )}
      {type.audio === false && <PteText text={q.text} tiers={tiers} onHoverWord={onHoverWord} qid={q.qid} />}
      {type.audio === false && wfd === false && (
        <PtePlayer label={t('pte.tts')} src={q.audioUrl} onEnd={a.onAudioEnd}
          speaking={a.playing} onSpeak={a.onPlay} disabled={a.canPlay === false} />
      )}
      {wfd && (
        <>
          <textarea className={css.typed} rows={TYPED_ROWS} value={a.typed} onChange={a.onTyped}
            readOnly={answering === false} />
          <div className={css.typedFoot}>
            <span>{t('pte.words', { n: wordCountOf({ s: a.typed }) })}</span>
            <span>{t('pte.timer', { t: clockOf({ seconds: a.elapsed }) })}</span>
          </div>
        </>
      )}
      {wfd === false && (
        <PteRecBar t={t} recording={a.recording} seconds={a.recSeconds} checked={checked} recUrl={a.recUrl}
          onMic={a.onMic} onRedo={a.onRedo} />
      )}
      {a.micDenied && <Notice kind={NOTICE_INFO} className={css.notice}>{t('pte.noMic')}</Notice>}
    </>
  )
}
