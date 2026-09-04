'use client'
/**
 * 域内小件:播放条(照小枫叶「示范朗读」条 —— Frank 2026-09-04「改成这种」):条头 + 进度 + 「0:12 / 0:17」+
 * 倍速胶囊 + 圆形播放钮;直链形态自带 audio 元素(ref 本件持有);没直链只剩圆钮走浏览器朗读。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { useRef } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconPause, IconPlay } from '@/components/icons'
import { INPUT_RANGE, KIND_ICON, KIND_PRIMARY, PRELOAD_META, SEEK_STEP } from './constants'
import { rateTextOf, timeTextOf } from './functions'
import { usePlayer } from './hooks'
import type { PtePlayerIn } from './types'
import css from './pte.module.css'

/**
 * 渲染播放条。
 *
 * @param props 条头、直链、播完回调与朗读兜底。
 * @returns 播放条。
 */
export function PtePlayer({ label, src, onEnd, speaking, onSpeak, disabled }: PtePlayerIn) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const p = usePlayer({ src, onEnd, audioRef })
  if (src == null) {
    let mark = <IconPlay />
    if (speaking) {
      mark = <IconPause />
    }
    return (
      <div className={css.playBar}>
        <span className={css.playLabel}>{label}</span>
        <Button kind={KIND_PRIMARY} onClick={onSpeak} disabled={disabled} ariaLabel={label}
          className={cssOf(css.playRound)}>
          {mark}
        </Button>
      </div>
    )
  }
  let mark = <IconPlay />
  if (p.playing) {
    mark = <IconPause />
  }
  return (
    <div className={css.playBar}>
      <span className={css.playLabel}>{label}</span>
      <input type={INPUT_RANGE} className={css.playRange} min={0} max={p.dur} step={SEEK_STEP} value={p.cur}
        onChange={p.onSeek} />
      <span className={css.playTime}>{timeTextOf({ cur: p.cur, dur: p.dur })}</span>
      <Button kind={KIND_ICON} sm onClick={p.onRate} className={cssOf(css.playRate)}>
        {rateTextOf({ rate: p.rate })}
      </Button>
      <Button kind={KIND_PRIMARY} onClick={p.onToggle} ariaLabel={label} className={cssOf(css.playRound)}>
        {mark}
      </Button>
      <audio ref={audioRef}
        src={src}
        preload={PRELOAD_META}
        onTimeUpdate={p.onTime}
        onLoadedMetadata={p.onMeta}
        onDurationChange={p.onMeta}
        onEnded={p.onEnded}
        onPlay={p.onPlayEv}
        onPause={p.onPauseEv} />
    </div>
  )
}
